/* Bếp Việt admin — vanilla JS, talks to /api/admin/*. Every value rendered is escaped. */
(() => {
  'use strict';

  const REGIONS = { north: 'Bắc Bộ', central: 'Trung Bộ', south: 'Nam Bộ', world: 'Thế giới' };
  const TONES = {
    amber: 'Hổ phách · món nước',
    copper: 'Đồng · nướng/xào',
    herb: 'Lá · rau, món chay',
    crimson: 'Đỏ · cay, sốt đỏ',
    ivory: 'Ngà · cháo, sốt kem',
    ocean: 'Biển · hải sản',
    gold: 'Vàng · chiên giòn',
  };
  const CROPS = {
    '': '— không —',
    rice: 'Lúa',
    herbs: 'Rau thơm',
    chili: 'Ớt',
    scallion: 'Hành',
    bean: 'Đậu',
    tomato: 'Cà chua',
  };
  const FLAVORS = { spicy: 'Cay', sweet: 'Ngọt', rich: 'Béo', fresh: 'Thanh', crunchy: 'Giòn' };
  const SOURCES = { ai: 'AI', curated: 'Soạn sẵn', manual: 'Sửa tay' };

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  let csrf = null;
  let user = null;
  let cache = { dishes: null, ingredients: null, stats: null };

  // ——— Utilities ———
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const opts = (map, selected) =>
    Object.entries(map)
      .map(
        ([k, v]) =>
          `<option value="${esc(k)}"${k === (selected ?? '') ? ' selected' : ''}>${esc(v)}</option>`,
      )
      .join('');
  const fmtDate = (s) => (s ? new Date(s.replace(' ', 'T')).toLocaleString('vi-VN') : '—');
  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();

  let toastTimer;
  function toast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('is-error', isError);
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), isError ? 6000 : 3000);
  }

  async function api(path, { method = 'GET', body, form } = {}) {
    const headers = {};
    if (method !== 'GET' && csrf) headers['X-CSRF-Token'] = csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/admin/login') {
      user = null;
      renderLogin();
      throw new Error(data.error || 'Cần đăng nhập.');
    }
    if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
    return data;
  }

  const invalidate = () => (cache = { dishes: null, ingredients: null, stats: null });
  const loadDishes = async () => (cache.dishes ??= (await api('/admin/dishes')).items);
  const loadIngredients = async () =>
    (cache.ingredients ??= (await api('/admin/ingredients')).items);
  const loadStats = async () => (cache.stats ??= await api('/admin/stats'));

  // ——— Shell ———
  let renderGen = 0;

  function shell(active, inner) {
    const n = cache.stats;
    app.innerHTML = `
      <div class="shell">
        <aside class="side">
          <div class="brand"><span class="brand__name">Bếp Việt</span><span class="brand__tag">Quản trị</span></div>
          <nav class="nav" aria-label="Quản trị">
            <a href="#/" class="${active === 'home' ? 'is-active' : ''}">Tổng quan</a>
            <a href="#/dishes" class="${active === 'dishes' ? 'is-active' : ''}">Món ăn <span class="nav__count">${n ? n.dishes : ''}</span></a>
            <a href="#/dishes/new" class="${active === 'new' ? 'is-active' : ''}">Thêm món</a>
            <a href="#/ingredients" class="${active === 'ingredients' ? 'is-active' : ''}">Nguyên liệu <span class="nav__count">${n ? n.ingredients : ''}</span></a>
          </nav>
          <div class="side__foot">
            <span>Đăng nhập: <strong>${esc(user)}</strong></span>
            <a href="/" target="_blank" rel="noopener">Mở web ↗</a>
            <button type="button" class="btn btn--sm" id="logout">Đăng xuất</button>
          </div>
        </aside>
        <main class="main" id="main">${inner}</main>
      </div>`;
    document.getElementById('logout').onclick = async () => {
      await api('/admin/logout', { method: 'POST' }).catch(() => {});
      csrf = null;
      user = null;
      renderLogin();
    };
  }

  // ——— Login ———
  function renderLogin(error = '') {
    app.innerHTML = `
      <div class="login">
        <form id="login-form" autocomplete="on">
          <h1>Bếp Việt Admin</h1>
          <p class="hint">Quản lý món ăn, nguyên liệu và nội dung đọc từ ảnh bằng AI.</p>
          <label class="field">Tên đăng nhập<input id="lg-user" type="text" name="username" autocomplete="username" required value="admin" /></label>
          <label class="field">Mật khẩu<input id="lg-pass" type="password" name="password" autocomplete="current-password" required /></label>
          <p class="error" id="lg-error">${esc(error)}</p>
          <button class="btn btn--primary" type="submit">Đăng nhập</button>
        </form>
      </div>`;
    document.getElementById('lg-pass').focus();
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const s = await api('/admin/login', {
          method: 'POST',
          body: {
            user: document.getElementById('lg-user').value,
            password: document.getElementById('lg-pass').value,
          },
        });
        csrf = s.csrf;
        user = s.user;
        route();
      } catch (err) {
        document.getElementById('lg-error').textContent = err.message;
      }
    };
  }

  // ——— Overview ———
  async function renderHome() {
    const my = ++renderGen;
    invalidate();
    const [s, dishes] = await Promise.all([loadStats(), loadDishes()]);
    const max = Math.max(1, ...Object.values(s.byRegion).map(Number));
    const recent = [...dishes]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 6);
    if (my !== renderGen) return; // a newer page started rendering meanwhile
    shell(
      'home',
      `
      <div class="page-head">
        <div><h1>Tổng quan</h1><p>Dữ liệu web lấy trực tiếp từ database này qua <code>/api/dishes</code>. Sửa ở đây là trang chủ đổi ngay khi tải lại.</p></div>
        <a class="btn btn--primary" href="#/dishes/new">+ Thêm món</a>
      </div>
      <div class="stats">
        <div class="stat"><span class="stat__label">Món ăn</span><span class="stat__value">${s.dishes}</span><span class="stat__note">${s.vegetarian} món chay</span></div>
        <div class="stat"><span class="stat__label">Nguyên liệu</span><span class="stat__value">${s.ingredients}</span><span class="stat__note">${s.unusedIngredients} chưa món nào dùng</span></div>
        <div class="stat"><span class="stat__label">Nội dung AI</span><span class="stat__value">${s.bySource.ai || 0}</span><span class="stat__note">${s.bySource.curated || 0} soạn sẵn · ${s.bySource.manual || 0} sửa tay</span></div>
        <div class="stat"><span class="stat__label">Có video</span><span class="stat__value">${s.withVideo}</span><span class="stat__note">Món còn lại hiện poster</span></div>
      </div>
      <div class="panel">
        <h2>Món theo vùng</h2>
        <div class="bars">${Object.entries(REGIONS)
          .map(([k, label]) => {
            const n = Number(s.byRegion[k] || 0);
            return `<div class="bar"><span>${esc(label)}</span><span class="bar__track"><span class="bar__fill" style="width:${(n / max) * 100}%"></span></span><span class="bar__n">${n}</span></div>`;
          })
          .join('')}</div>
      </div>
      <div class="panel">
        <h2>Sửa gần đây</h2>
        ${dishTable(recent)}
      </div>
      <div class="panel">
        <h2>Đọc ảnh bằng AI hàng loạt</h2>
        <p class="hint">Từng món có nút “Đọc lại bằng AI” trong trang sửa. Để chạy cho nhiều món, dùng lệnh (chạy nền, song song, tự thử lại):</p>
        <pre>php server/bin/ai-enrich.php            # các món chưa đọc bằng AI
php server/bin/ai-enrich.php --all      # đọc lại tất cả
php server/bin/ai-enrich.php --only=pho-bo,bun-moc</pre>
        <p class="hint">Phiên bản dữ liệu hiện tại: <code>${esc(s.version)}</code></p>
      </div>`,
    );
  }

  function dishTable(list) {
    if (!list.length) return '<p class="empty">Không có món nào khớp.</p>';
    return `<div class="table-wrap"><table>
      <thead><tr><th></th><th>Món</th><th>Vùng</th><th class="num">Giá</th><th>Nguyên liệu</th><th>Nội dung</th><th>Cập nhật</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (d) => `<tr>
            <td><img class="thumb" src="${esc(d.thumbnail)}" alt="" loading="lazy" width="48" height="48" /></td>
            <td><div class="dish-name">${esc(d.name)}</div><div class="dish-id">${esc(d.id)} · #${d.position + 1}</div></td>
            <td><span class="badge badge--${esc(d.region)}">${esc(REGIONS[d.region])}</span></td>
            <td class="num">${d.price}k</td>
            <td>${d.ingredients.length}</td>
            <td><span class="badge badge--${esc(d.contentSource)}">${esc(SOURCES[d.contentSource] || d.contentSource)}</span></td>
            <td class="hint">${esc(fmtDate(d.updatedAt))}</td>
            <td><div class="row-actions">
              <a class="btn btn--sm" href="#/dishes/${encodeURIComponent(d.id)}">Sửa</a>
              <a class="btn btn--sm" href="/mon/${encodeURIComponent(d.id)}" target="_blank" rel="noopener" aria-label="Xem ${esc(d.name)} trên web">↗</a>
            </div></td>
          </tr>`,
        )
        .join('')}</tbody></table></div>`;
  }

  // ——— Dish list ———
  async function renderDishes() {
    const my = ++renderGen;
    const dishes = await loadDishes();
    await loadStats();
    if (my !== renderGen) return; // a newer page started rendering meanwhile
    shell(
      'dishes',
      `
      <div class="page-head">
        <div><h1>Món ăn</h1><p>${dishes.length} món, xếp theo thứ tự trên reel.</p></div>
        <a class="btn btn--primary" href="#/dishes/new">+ Thêm món</a>
      </div>
      <div class="toolbar">
        <input id="q" type="search" placeholder="Tìm tên, mã món hoặc nguyên liệu…" aria-label="Tìm món" />
        <select id="f-region" aria-label="Lọc vùng"><option value="">Mọi vùng</option>${opts(REGIONS)}</select>
        <select id="f-source" aria-label="Lọc nguồn nội dung"><option value="">Mọi nguồn</option>${opts(SOURCES)}</select>
      </div>
      <div id="list"></div>`,
    );
    const q = document.getElementById('q');
    const fr = document.getElementById('f-region');
    const fs = document.getElementById('f-source');
    const draw = () => {
      const k = norm(q.value.trim());
      const list = dishes.filter(
        (d) =>
          (!fr.value || d.region === fr.value) &&
          (!fs.value || d.contentSource === fs.value) &&
          (!k ||
            norm(
              `${d.name} ${d.id} ${d.subtitle} ${d.ingredients.map((i) => i.name).join(' ')}`,
            ).includes(k)),
      );
      document.getElementById('list').innerHTML = dishTable(list);
    };
    [q, fr, fs].forEach((el) => el.addEventListener('input', draw));
    draw();
    q.focus();
  }

  // ——— Dish editor ———
  const blankDish = () => ({
    id: '',
    name: '',
    subtitle: '',
    price: 50,
    vegetarian: false,
    region: 'south',
    tone: 'amber',
    story: '',
    flavor: { spicy: 0, sweet: 0, rich: 0, fresh: 0, crunchy: 0 },
    image: '',
    thumbnail: '',
    credit: '',
    video: null,
    ingredients: [],
    contentSource: 'manual',
  });

  async function renderEditor(id) {
    const my = ++renderGen;
    const creating = id === 'new';
    const [library] = await Promise.all([loadIngredients(), loadStats()]);
    let dish = creating ? blankDish() : await api(`/admin/dishes/${encodeURIComponent(id)}`);

    let rows = dish.ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      crop: i.crop,
      lib: true,
    }));
    let pendingFile = null;
    // Photos already stored by the AI identify step (new dishes).
    let uploaded = null;

    const datalist = library
      .map((i) => `<option value="${esc(i.name)}">${esc(i.id)}</option>`)
      .join('');

    if (my !== renderGen) return; // a newer page started rendering meanwhile
    shell(
      creating ? 'new' : 'dishes',
      `
      <div class="page-head">
        <div>
          <h1>${creating ? 'Thêm món mới' : esc(dish.name)}</h1>
          <p>${creating ? 'Chỉ cần tải ảnh: AI nhận diện món và điền mọi ô còn trống — ô bạn đã gõ được giữ nguyên. Chọn nhiều ảnh cùng lúc để AI tạo luôn từng món.' : `Mã <code>${esc(dish.id)}</code> · vị trí #${dish.position + 1} trên reel`}</p>
        </div>
        ${creating ? '' : `<a class="btn" href="/mon/${encodeURIComponent(dish.id)}" target="_blank" rel="noopener">Xem trên web ↗</a>`}
      </div>
      <form id="dish-form" class="editor" novalidate>
        <div class="stack">
          ${
            creating
              ? `<div class="panel stack dropzone">
            <h2>Tạo món từ ảnh</h2>
            <p class="hint">JPG, PNG hoặc WebP. Một ảnh: AI điền form để bạn xem lại. Nhiều ảnh: AI tạo từng món ngay, không cần nhập gì.</p>
            <input id="d-photos" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh món" />
            <label class="check"><input id="d-autosave" type="checkbox" /> Lưu luôn, không cần xem lại</label>
            <ol id="ai-status" class="ai-status" aria-live="polite"></ol>
          </div>`
              : ''
          }
          <div class="panel stack">
            <div class="grid-2">
              <label class="field">Tên món<input id="d-name" type="text" required maxlength="160" value="${esc(dish.name)}" /></label>
              ${creating ? `<label class="field">Mã món (URL) <span class="hint">để trống sẽ tạo từ tên</span><input id="d-id" type="text" maxlength="80" pattern="[a-z0-9-]+" placeholder="vd: bun-cha-ha-noi" /></label>` : `<label class="field">Mô tả phụ<input id="d-subtitle" type="text" maxlength="200" value="${esc(dish.subtitle)}" /></label>`}
            </div>
            ${creating ? `<label class="field">Mô tả phụ<input id="d-subtitle" type="text" maxlength="200" value="" placeholder="vd: Chả nướng • Việt Nam" /></label>` : ''}
            <div class="grid-3">
              <label class="field">Giá tham khảo (nghìn đồng)<input id="d-price" type="number" min="0" step="5" value="${dish.price}" /></label>
              <label class="field">Vùng<select id="d-region">${opts(REGIONS, dish.region)}</select></label>
              <label class="field">Tông màu trang<select id="d-tone">${opts(TONES, dish.tone)}</select></label>
            </div>
            <label class="check"><input id="d-veg" type="checkbox" ${dish.vegetarian ? 'checked' : ''} /> Món chay</label>
            <label class="field">Câu chuyện món (1 câu)<textarea id="d-story" maxlength="400">${esc(dish.story)}</textarea></label>
          </div>

          <div class="panel">
            <h2>Hồ sơ vị</h2>
            <div class="flavors">${Object.entries(FLAVORS)
              .map(
                ([k, label]) =>
                  `<label class="flavor"><span>${label}</span><input type="range" min="0" max="5" step="1" data-flavor="${k}" value="${dish.flavor[k]}" /><output>${dish.flavor[k]}</output></label>`,
              )
              .join('')}</div>
          </div>

          <div class="panel">
            <h2>Thành phần</h2>
            <p class="hint">Chọn từ thư viện (gõ tên để gợi ý) hoặc nhập nguyên liệu mới kèm mô tả. Nguyên liệu có “loại cây” sẽ cho hạt giống tương ứng trong game.</p>
            <ol class="ing-list" id="ing-list"></ol>
            <div class="toolbar">
              <input id="ing-add" type="text" list="ing-lib" placeholder="Thêm nguyên liệu…" aria-label="Thêm nguyên liệu" />
              <datalist id="ing-lib">${datalist}</datalist>
              <button type="button" class="btn btn--sm" id="ing-add-btn">Thêm</button>
            </div>
          </div>

          <div class="panel stack">
            <h2>Video câu chuyện</h2>
            <p class="hint">Chỉ dùng video thật (6–15 giây, MP4/WebM). Không có video thì trang món hiện poster.</p>
            <div class="grid-2">
              <label class="field">Đường dẫn video<input id="d-video" type="text" value="${esc(dish.video?.src ?? '')}" placeholder="/uploads/videos/..." /></label>
              <label class="field">Nguồn / ghi công video<input id="d-video-credit" type="text" value="${esc(dish.video?.credit ?? '')}" /></label>
            </div>
            ${creating ? '' : `<label class="field">Tải video lên<input id="d-video-file" type="file" accept="video/mp4,video/webm" /></label>`}
            <label class="field">Ghi công ảnh<input id="d-credit" type="text" maxlength="255" value="${esc(dish.credit)}" /></label>
          </div>
        </div>

        <aside class="preview">
          <div class="panel stack">
            ${dish.image ? `<img class="preview__img" id="p-img" src="${esc(dish.image)}" alt="Ảnh món" />` : `<div class="preview__none" id="p-img">Chưa có ảnh</div>`}
            ${creating ? '<p class="hint">Ảnh sẽ hiện ở đây sau khi AI nhận diện.</p>' : `<label class="field">Thay ảnh <span class="hint">JPG/PNG/WebP, tự cắt vuông 768 & 384 px</span><input id="d-image" type="file" accept="image/jpeg,image/png,image/webp" /></label>`}
          </div>
          ${
            creating
              ? ''
              : `<div class="panel stack">
            <dl class="meta-list">
              <div><dt>Nguồn nội dung</dt><dd><span class="badge badge--${esc(dish.contentSource)}">${esc(SOURCES[dish.contentSource])}</span></dd></div>
              <div><dt>Model AI</dt><dd>${esc(dish.aiModel || '—')}</dd></div>
              <div><dt>Đọc AI lúc</dt><dd>${esc(fmtDate(dish.aiAt))}</dd></div>
              <div><dt>Cập nhật</dt><dd>${esc(fmtDate(dish.updatedAt))}</dd></div>
            </dl>
            <button type="button" class="btn" id="ai-fill-btn">AI điền chỗ trống</button>
            <button type="button" class="btn" id="ai-btn">Đọc lại bằng AI</button>
            <p class="hint">“Điền chỗ trống” chỉ bổ sung phần còn thiếu. “Đọc lại” viết lại thành phần, câu chuyện, hồ sơ vị, vùng và tông màu; tên, giá và ảnh giữ nguyên.</p>
          </div>`
          }
        </aside>

        <div class="actions-bar" style="grid-column: 1 / -1">
          ${creating ? '' : `<span id="del-zone"><button type="button" class="btn btn--danger" id="del-btn">Xóa món</button></span>`}
          <a class="btn" href="#/dishes">Hủy</a>
          <button type="submit" class="btn btn--primary" id="save-btn">${creating ? 'Tạo món' : 'Lưu thay đổi'}</button>
        </div>
      </form>`,
    );

    // Flavour sliders show their value.
    document.querySelectorAll('[data-flavor]').forEach((r) => {
      r.addEventListener('input', () => (r.nextElementSibling.textContent = r.value));
    });

    const drawRows = () => {
      const ol = document.getElementById('ing-list');
      if (!rows.length) {
        ol.innerHTML = '<li class="hint">Chưa có nguyên liệu nào.</li>';
        return;
      }
      ol.innerHTML = rows
        .map(
          (r, i) => `<li class="ing" data-i="${i}">
            <span class="ing__no">${i + 1}</span>
            ${
              r.lib
                ? `<span><strong>${esc(r.name)}</strong><br /><span class="ing__lib">thư viện · ${esc(r.id)}</span></span>
                   <span class="ing__desc">${esc(r.description)}</span>
                   <span class="hint">${esc(CROPS[r.crop || ''])}</span>`
                : `<input type="text" data-k="name" value="${esc(r.name)}" aria-label="Tên nguyên liệu mới" />
                   <input type="text" data-k="description" value="${esc(r.description)}" placeholder="Mô tả ngắn" aria-label="Mô tả" />
                   <select data-k="crop" aria-label="Loại cây">${opts(CROPS, r.crop || '')}</select>`
            }
            <span class="ing__tools">
              <button type="button" class="btn btn--icon" data-act="up" aria-label="Lên">↑</button>
              <button type="button" class="btn btn--icon" data-act="down" aria-label="Xuống">↓</button>
              <button type="button" class="btn btn--icon" data-act="del" aria-label="Bỏ">✕</button>
            </span>
          </li>`,
        )
        .join('');
    };
    drawRows();

    document.getElementById('ing-list').addEventListener('input', (e) => {
      const li = e.target.closest('.ing');
      if (li && e.target.dataset.k)
        rows[Number(li.dataset.i)][e.target.dataset.k] = e.target.value || null;
    });
    document.getElementById('ing-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const i = Number(btn.closest('.ing').dataset.i);
      if (btn.dataset.act === 'del') rows.splice(i, 1);
      if (btn.dataset.act === 'up' && i > 0) [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
      if (btn.dataset.act === 'down' && i < rows.length - 1)
        [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
      drawRows();
    });
    const addIng = () => {
      const input = document.getElementById('ing-add');
      const name = input.value.trim();
      if (!name) return;
      const hit = library.find((i) => norm(i.name) === norm(name) || i.id === name);
      if (hit && rows.some((r) => r.id === hit.id))
        return toast('Nguyên liệu này đã có trong món.', true);
      rows.push(
        hit ? { ...hit, lib: true } : { id: '', name, description: '', crop: null, lib: false },
      );
      input.value = '';
      drawRows();
    };
    document.getElementById('ing-add-btn').onclick = addIng;
    document.getElementById('ing-add').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addIng();
      }
    });

    document.getElementById('d-image')?.addEventListener('change', (e) => {
      pendingFile = e.target.files[0] || null;
      if (pendingFile) {
        const url = URL.createObjectURL(pendingFile);
        const p = document.getElementById('p-img');
        p.outerHTML = `<img class="preview__img" id="p-img" src="${url}" alt="Ảnh mới (chưa lưu)" />`;
      }
    });

    const collect = () => {
      const flavor = {};
      document
        .querySelectorAll('[data-flavor]')
        .forEach((r) => (flavor[r.dataset.flavor] = Number(r.value)));
      const video = document.getElementById('d-video').value.trim();
      return {
        ...(creating ? { id: document.getElementById('d-id').value.trim() } : {}),
        name: document.getElementById('d-name').value.trim(),
        subtitle: document.getElementById('d-subtitle').value.trim(),
        price: Number(document.getElementById('d-price').value || 0),
        vegetarian: document.getElementById('d-veg').checked,
        region: document.getElementById('d-region').value,
        tone: document.getElementById('d-tone').value,
        story: document.getElementById('d-story').value.trim(),
        credit: document.getElementById('d-credit').value.trim(),
        flavor,
        video: video
          ? {
              src: video,
              poster: dish.image,
              credit: document.getElementById('d-video-credit').value.trim(),
            }
          : null,
        ingredients: rows.map((r) =>
          r.lib
            ? { id: r.id }
            : { name: r.name, description: r.description || '', crop: r.crop || null },
        ),
      };
    };

    // Fills only what is still empty — anything the admin typed wins.
    const applyProposal = (p) => {
      const setIfEmpty = (sel, value) => {
        const el = document.getElementById(sel);
        if (el && !el.value.trim() && value !== null && value !== undefined && value !== '')
          el.value = value;
      };
      setIfEmpty('d-name', p.name);
      setIfEmpty('d-subtitle', p.subtitle);
      setIfEmpty('d-story', p.story);
      const price = document.getElementById('d-price');
      if ((!price.value || Number(price.value) === 0 || Number(price.value) === 50) && p.price)
        price.value = p.price;
      if (p.region) document.getElementById('d-region').value = p.region;
      if (p.tone) document.getElementById('d-tone').value = p.tone;
      if (typeof p.vegetarian === 'boolean')
        document.getElementById('d-veg').checked = p.vegetarian;
      const sliders = [...document.querySelectorAll('[data-flavor]')];
      if (sliders.every((r) => Number(r.value) === 0)) {
        sliders.forEach((r) => {
          r.value = p.flavor?.[r.dataset.flavor] ?? 0;
          r.nextElementSibling.textContent = r.value;
        });
      }
      if (!rows.length) {
        rows = p.ingredients.map((i) =>
          i.library
            ? { id: i.id, name: i.name, description: i.description, crop: i.crop, lib: true }
            : {
                id: '',
                name: i.name,
                description: i.description || '',
                crop: i.crop || null,
                lib: false,
              },
        );
        drawRows();
      }
      uploaded = { image: p.image, thumbnail: p.thumbnail };
      document.getElementById('p-img').outerHTML =
        `<img class="preview__img" id="p-img" src="${esc(p.image)}" alt="Ảnh món" />`;
    };

    const photos = document.getElementById('d-photos');
    if (photos) {
      photos.addEventListener('change', async () => {
        const files = [...photos.files];
        if (!files.length) return;
        const status = document.getElementById('ai-status');
        const auto = document.getElementById('d-autosave').checked || files.length > 1;
        photos.disabled = true;
        if (!auto) {
          status.innerHTML = '<li>AI đang nhận diện món trong ảnh…</li>';
          try {
            const form = new FormData();
            form.append('image', files[0]);
            for (const [k, sel] of [
              ['name', 'd-name'],
              ['subtitle', 'd-subtitle'],
              ['story', 'd-story'],
            ]) {
              form.append(k, document.getElementById(sel).value.trim());
            }
            const r = await api('/admin/ai/identify', { method: 'POST', form });
            applyProposal(r.proposal);
            status.innerHTML = `<li>AI nhận ra <strong>${esc(r.proposal.name || 'món chưa rõ tên')}</strong> — đã điền các ô trống, xem lại rồi bấm “Tạo món”.</li>`;
          } catch (err) {
            status.innerHTML = `<li class="error">${esc(err.message)}</li>`;
          } finally {
            photos.disabled = false;
          }
          return;
        }
        status.innerHTML = files
          .map((f, i) => `<li id="ai-row-${i}">${esc(f.name)} — đang chờ…</li>`)
          .join('');
        let ok = 0;
        for (const [i, file] of files.entries()) {
          const li = document.getElementById(`ai-row-${i}`);
          li.textContent = `${file.name} — AI đang nhận diện…`;
          try {
            const form = new FormData();
            form.append('image', file);
            const d = await api('/admin/dishes/quick', { method: 'POST', form });
            ok++;
            li.innerHTML = `✓ <a href="#/dishes/${encodeURIComponent(d.id)}">${esc(d.name)}</a> · ${esc(REGIONS[d.region])} · ${d.price}k · ${d.ingredients.length} nguyên liệu`;
          } catch (err) {
            li.innerHTML = `<span class="error">✗ ${esc(file.name)}: ${esc(err.message)}</span>`;
          }
        }
        invalidate();
        photos.disabled = false;
        photos.value = '';
        toast(`AI đã tạo ${ok}/${files.length} món.`, ok < files.length);
      });
    }

    document.getElementById('dish-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('save-btn');
      const payload = collect();
      if (!payload.name) return toast('Tên món không được trống.', true);
      if (!payload.ingredients.length) return toast('Món cần ít nhất một nguyên liệu.', true);
      if (creating && !uploaded) return toast('Hãy tải ảnh món lên trước.', true);
      if (uploaded) Object.assign(payload, uploaded);
      if (payload.ingredients.some((i) => i.name !== undefined && !i.name))
        return toast('Nguyên liệu mới cần có tên.', true);
      btn.disabled = true;
      try {
        let saved = creating
          ? await api('/admin/dishes', { method: 'POST', body: payload })
          : await api(`/admin/dishes/${encodeURIComponent(dish.id)}`, {
              method: 'PUT',
              body: payload,
            });
        if (pendingFile) {
          const form = new FormData();
          form.append('image', pendingFile);
          saved = await api(`/admin/dishes/${encodeURIComponent(saved.id)}/image`, {
            method: 'POST',
            form,
          });
        }
        const videoFile = document.getElementById('d-video-file')?.files?.[0];
        if (videoFile) {
          const form = new FormData();
          form.append('video', videoFile);
          const { src } = await api(`/admin/dishes/${encodeURIComponent(saved.id)}/video`, {
            method: 'POST',
            form,
          });
          saved = await api(`/admin/dishes/${encodeURIComponent(saved.id)}`, {
            method: 'PUT',
            body: {
              ...collect(),
              video: {
                src,
                poster: saved.image,
                credit: document.getElementById('d-video-credit').value.trim(),
              },
            },
          });
        }
        invalidate();
        toast(creating ? `Đã tạo món ${saved.name}.` : 'Đã lưu.');
        location.hash = `#/dishes/${encodeURIComponent(saved.id)}`;
        if (!creating) renderEditor(saved.id);
      } catch (err) {
        toast(err.message, true);
      } finally {
        btn.disabled = false;
      }
    };

    const fillBtn = document.getElementById('ai-fill-btn');
    if (fillBtn) {
      fillBtn.onclick = async () => {
        fillBtn.disabled = true;
        fillBtn.textContent = 'AI đang điền…';
        try {
          const saved = await api(`/admin/dishes/${encodeURIComponent(dish.id)}/ai?mode=fill`, {
            method: 'POST',
          });
          invalidate();
          toast(`AI đã điền chỗ trống cho ${saved.name}.`);
          renderEditor(saved.id);
        } catch (err) {
          toast(err.message, true);
          fillBtn.disabled = false;
          fillBtn.textContent = 'AI điền chỗ trống';
        }
      };
    }

    const aiBtn = document.getElementById('ai-btn');
    if (aiBtn) {
      aiBtn.onclick = async () => {
        aiBtn.disabled = true;
        aiBtn.textContent = 'AI đang đọc ảnh…';
        try {
          const saved = await api(`/admin/dishes/${encodeURIComponent(dish.id)}/ai`, {
            method: 'POST',
          });
          invalidate();
          toast(`AI đã viết lại ${saved.name}: ${saved.ingredients.length} thành phần.`);
          renderEditor(saved.id);
        } catch (err) {
          toast(err.message, true);
          aiBtn.disabled = false;
          aiBtn.textContent = 'Đọc lại bằng AI';
        }
      };
    }

    const delBtn = document.getElementById('del-btn');
    if (delBtn) {
      delBtn.onclick = () => {
        const zone = document.getElementById('del-zone');
        zone.innerHTML = `<span class="confirm">Xóa hẳn “${esc(dish.name)}”? <button type="button" class="btn btn--danger btn--sm" id="del-yes">Xóa</button><button type="button" class="btn btn--sm" id="del-no">Giữ lại</button></span>`;
        document.getElementById('del-no').onclick = () => renderEditor(dish.id);
        document.getElementById('del-yes').onclick = async () => {
          try {
            await api(`/admin/dishes/${encodeURIComponent(dish.id)}`, { method: 'DELETE' });
            invalidate();
            toast(`Đã xóa ${dish.name}.`);
            location.hash = '#/dishes';
          } catch (err) {
            toast(err.message, true);
          }
        };
      };
    }
  }

  // ——— Ingredient library ———
  async function renderIngredients() {
    const my = ++renderGen;
    invalidate();
    const [items, allDishes] = await Promise.all([loadIngredients(), loadDishes(), loadStats()]);
    const dishOptions = [...allDishes]
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`)
      .join('');
    if (my !== renderGen) return; // a newer page started rendering meanwhile
    shell(
      'ingredients',
      `
      <div class="page-head">
        <div><h1>Nguyên liệu</h1><p>Thư viện dùng chung: sửa mô tả ở đây là mọi món có nguyên liệu này đều đổi. Chỉ xóa được nguyên liệu không món nào dùng.</p></div>
      </div>
      <div class="toolbar"><input id="q" type="search" placeholder="Tìm nguyên liệu…" aria-label="Tìm nguyên liệu" />
        <select id="f-use" aria-label="Lọc"><option value="">Tất cả</option><option value="unused">Chưa dùng</option></select>
        <select id="f-dish" aria-label="Lọc theo món"><option value="">Mọi món</option>${dishOptions}</select></div>
      <div id="list"></div>`,
    );
    const draw = () => {
      const k = norm(document.getElementById('q').value.trim());
      const unused = document.getElementById('f-use').value === 'unused';
      const dishId = document.getElementById('f-dish').value;
      const list = items.filter(
        (i) =>
          (!k || norm(`${i.name} ${i.id} ${i.description}`).includes(k)) &&
          (!unused || i.usedBy === 0) &&
          (!dishId || i.dishes.some((d) => d.id === dishId)),
      );
      document.getElementById('list').innerHTML = list.length
        ? `<div class="table-wrap"><table><thead><tr><th>Tên</th><th>Mô tả</th><th>Loại cây</th><th>Dùng trong</th><th></th></tr></thead><tbody>${list
            .map(
              (i) => `<tr data-id="${esc(i.id)}">
                <td><input type="text" data-k="name" value="${esc(i.name)}" aria-label="Tên" /><div class="dish-id">${esc(i.id)}</div></td>
                <td><input type="text" data-k="description" value="${esc(i.description)}" aria-label="Mô tả" /></td>
                <td><select data-k="crop" aria-label="Loại cây">${opts(CROPS, i.crop || '')}</select></td>
                <td class="uses">${
                  i.dishes.length
                    ? [...i.dishes]
                        .sort((x, y) => (y.id === dishId) - (x.id === dishId))
                        .slice(0, 3)
                        .map(
                          (d) =>
                            `<a href="#/dishes/${encodeURIComponent(d.id)}">${esc(d.name)}</a>`,
                        )
                        .join(', ') +
                      (i.dishes.length > 3
                        ? ` <span class="hint">+${i.dishes.length - 3} món</span>`
                        : '')
                    : '<span class="hint">chưa dùng</span>'
                }</td>
                <td><div class="row-actions"><button type="button" class="btn btn--sm" data-act="save">Lưu</button>${
                  i.usedBy === 0
                    ? '<button type="button" class="btn btn--sm btn--danger" data-act="del">Xóa</button>'
                    : ''
                }</div></td>
              </tr>`,
            )
            .join('')}</tbody></table></div>`
        : '<p class="empty">Không có nguyên liệu nào khớp.</p>';
    };
    document.getElementById('q').addEventListener('input', draw);
    document.getElementById('f-use').addEventListener('input', draw);
    document.getElementById('f-dish').addEventListener('input', draw);
    document.getElementById('list').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const tr = btn.closest('tr');
      const id = tr.dataset.id;
      try {
        if (btn.dataset.act === 'save') {
          const val = (k) => tr.querySelector(`[data-k="${k}"]`).value;
          await api(`/admin/ingredients/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: { name: val('name'), description: val('description'), crop: val('crop') || null },
          });
          toast('Đã lưu nguyên liệu.');
        } else if (btn.dataset.act === 'del') {
          await api(`/admin/ingredients/${encodeURIComponent(id)}`, { method: 'DELETE' });
          items.splice(
            items.findIndex((i) => i.id === id),
            1,
          );
          draw();
          toast('Đã xóa nguyên liệu.');
        }
      } catch (err) {
        toast(err.message, true);
      }
    });
    draw();
  }

  // ——— Router ———
  async function route() {
    if (!user) return renderLogin();
    const hash = location.hash.replace(/^#/, '') || '/';
    try {
      if (hash === '/') await renderHome();
      else if (hash === '/dishes') await renderDishes();
      else if (hash.startsWith('/dishes/')) await renderEditor(decodeURIComponent(hash.slice(8)));
      else if (hash === '/ingredients') await renderIngredients();
      else await renderHome();
      window.scrollTo(0, 0);
    } catch (err) {
      if (user) toast(err.message, true);
    }
  }

  window.addEventListener('hashchange', route);
  api('/admin/session')
    .then((s) => {
      csrf = s.csrf;
      user = s.user;
      route();
    })
    .catch(() => renderLogin());
})();
