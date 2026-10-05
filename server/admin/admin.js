/* Ăn gì? admin — vanilla JS, talks to /api/admin/*. Every value rendered is escaped. */
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
  /** The server asks for an authenticator code at login (ADMIN_TOTP_SECRET is set). */
  let mfa = false;
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

  // ——— Toasts: stacked, one look per kind, countdown pauses on hover ———
  const TOAST_ICON = {
    success: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.7 2.7L16.2 9.6"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
    warning: '<path d="M12 3.6L21 19.4H3Z"/><path d="M12 9.8v4.2M12 16.9h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.9h.01"/>',
  };
  const TOAST_MS = { success: 3200, info: 3600, warning: 5000, error: 6500 };

  /** kind: 'success' | 'info' | 'warning' | 'error'; `true` means error (older calls). */
  function toast(msg, kind = 'success') {
    const tone = kind === true ? 'error' : kind || 'success';
    const ms = TOAST_MS[tone] ?? 3600;
    toastEl.hidden = false;
    const card = document.createElement('div');
    card.className = `tcard tcard--${tone}`;
    card.style.setProperty('--ms', `${ms}ms`);
    card.innerHTML = `<span class="tcard__ico" aria-hidden="true"><svg viewBox="0 0 24 24">${TOAST_ICON[tone] ?? TOAST_ICON.info}</svg></span>
      <p>${esc(msg)}</p>
      <button type="button" aria-label="Đóng thông báo">✕</button>
      <span class="tcard__timer" aria-hidden="true"></span>`;
    toastEl.appendChild(card);
    while (toastEl.children.length > 3) toastEl.firstElementChild.remove();

    let left = ms;
    let due = Date.now() + ms;
    let timer = setTimeout(leave, ms);
    function leave() {
      clearTimeout(timer);
      card.classList.add('is-leaving');
      setTimeout(() => card.remove(), 280);
    }
    card.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      left = Math.max(0, due - Date.now());
      card.classList.add('is-paused');
    });
    card.addEventListener('mouseleave', () => {
      due = Date.now() + left;
      timer = setTimeout(leave, left);
      card.classList.remove('is-paused');
    });
    card.querySelector('button').onclick = leave;
  }

  async function api(path, { method = 'GET', body, form } = {}) {
    const headers = {};
    if (method !== 'GET') {
      // Same-origin marker the server requires on every write, login and logout included.
      headers['X-Bepviet'] = '1';
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
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
  // Content languages besides Vietnamese (one per server/lang/<code>.php); survives invalidate().
  let locales = null;
  const loadLocales = async () =>
    (locales ??= await api('/admin/locales').catch(() => ({ base: 'vi', locales: [], extra: [] })));
  const localeName = (code) => locales?.locales.find((l) => l.code === code)?.name ?? code;
  const trOf = (item, code) => item?.translations?.[code] ?? {};
  /** Reads every [data-tr-locale][data-tr-field] input inside root into { code: { field: text } }. */
  const readTranslations = (root, fields) =>
    Object.fromEntries(
      (locales?.extra ?? []).map((code) => [
        code,
        Object.fromEntries(
          fields.map((f) => [
            f,
            root.querySelector(`[data-tr-locale="${code}"][data-tr-field="${f}"]`)?.value.trim() ?? '',
          ]),
        ),
      ]),
    );

  // ——— Shell ———
  let renderGen = 0;

  function shell(active, inner) {
    const n = cache.stats;
    app.innerHTML = `
      <div class="shell">
        <aside class="side">
          <div class="brand"><span class="brand__name">Ăn gì?</span><span class="brand__tag">Quản trị</span></div>
          <nav class="nav" aria-label="Quản trị">
            <a href="#/" class="${active === 'home' ? 'is-active' : ''}">Tổng quan</a>
            <a href="#/dishes" class="${active === 'dishes' ? 'is-active' : ''}">Món ăn <span class="nav__count">${n ? n.dishes : ''}</span></a>
            <a href="#/dishes/new" class="${active === 'new' ? 'is-active' : ''}">Thêm món</a>
            <a href="#/ingredients" class="${active === 'ingredients' ? 'is-active' : ''}">Nguyên liệu <span class="nav__count">${n ? n.ingredients : ''}</span></a>
            <a href="#/users" class="${active === 'users' ? 'is-active' : ''}">Người dùng ${usersOnline ? `<span class="nav__count nav__count--live" title="Đang online">${usersOnline}</span>` : ''}</a>
            <a href="#/payments" class="${active === 'payments' ? 'is-active' : ''}">Lượt quay & thanh toán ${n?.ordersPending ? `<span class="nav__count" title="Đơn chờ thanh toán">${n.ordersPending}</span>` : ''}</a>
            <a href="#/fairplay" class="${active === 'fairplay' ? 'is-active' : ''}">Gian lận ${n?.alertsUnseen ? `<span class="nav__count nav__count--alert" title="Cảnh báo chưa xem">${n.alertsUnseen}</span>` : ''}</a>
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
          <h1>Ăn gì? Admin</h1>
          <p class="hint">Quản lý món ăn, nguyên liệu và nội dung đọc từ ảnh bằng AI.</p>
          <label class="field">Tên đăng nhập<input id="lg-user" type="text" name="username" autocomplete="username" required value="admin" /></label>
          <label class="field">Mật khẩu<input id="lg-pass" type="password" name="password" autocomplete="current-password" required /></label>
          ${mfa ? '<label class="field">Mã xác thực (6 số)<input id="lg-otp" type="text" name="otp" inputmode="numeric" autocomplete="one-time-code" required /></label>' : ''}
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
            otp: document.getElementById('lg-otp')?.value ?? '',
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

  // How the farm game cooks a dish, as two text fields: one step per line
  // "Tên bước | lửa | độ dài | English", and pantry items "rice×2, shrimp×1".
  const cookStepsText = (cook) =>
    (cook?.steps ?? [])
      .map((s) => [s.label, s.heat, s.weight, s.translations?.en ?? ''].join(' | '))
      .join('\n');
  const cookProduceText = (cook) =>
    (cook?.produce ?? []).map((p) => `${p.id}×${p.qty}`).join(', ');
  /** { cook } (null = remove: both fields empty) or { error } — the server re-checks every id. */
  const readCook = (stepsText, produceText) => {
    const lines = stepsText.split('\n').map((l) => l.trim()).filter(Boolean);
    const items = produceText.split(',').map((p) => p.trim()).filter(Boolean);
    if (!lines.length && !items.length) return { cook: null };
    const steps = lines.map((l) => {
      const [label = '', heat = 'mid', weight = '2', en = ''] = l.split('|').map((x) => x.trim());
      return { label, heat, weight: Number(weight) || 2, translations: en ? { en } : {} };
    });
    if (steps.length < 3 || steps.length > 5 || steps.some((st) => !st.label))
      return { error: 'Cách nấu cần 3–5 bước, mỗi dòng một bước có tên.' };
    if (steps.some((st) => !['low', 'mid', 'high'].includes(st.heat)))
      return { error: 'Lửa của mỗi bước là low, mid hoặc high.' };
    const produce = items.map((p) => {
      const [id, qty = '1'] = p.split(/\s*[×x*]\s*/);
      return { id: id.trim(), qty: Number(qty) || 1 };
    });
    if (!produce.length) return { error: 'Cách nấu cần ít nhất một nông sản.' };
    return { cook: { steps, produce } };
  };
  const cookFields = () =>
    readCook(
      document.getElementById('d-cook-steps').value,
      document.getElementById('d-cook-produce').value,
    );

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
    const [library] = await Promise.all([loadIngredients(), loadStats(), loadLocales()]);
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
${locales.extra
  .map((code) => {
    const t = trOf(dish, code);
    const tag = `<span class="lang-tag">${esc(code)}</span>`;
    return `<div class="panel stack translation" data-locale="${esc(code)}">
            <h2>Bản dịch · ${esc(localeName(code))} ${tag}</h2>
            <p class="hint">Cho khách dùng giao diện ${esc(localeName(code))}. Ô nào để trống sẽ hiện bản tiếng Việt. Giữ nguyên tên món Việt nếu hợp (vd: Phở bò), giải thích ở mô tả phụ.</p>
            <div class="grid-2">
              <label class="field">Tên món ${tag}<input type="text" maxlength="160" lang="${esc(code)}" data-tr-locale="${esc(code)}" data-tr-field="name" value="${esc(t.name ?? '')}" placeholder="${esc(dish.name)}" /></label>
              <label class="field">Mô tả phụ ${tag}<input type="text" maxlength="200" lang="${esc(code)}" data-tr-locale="${esc(code)}" data-tr-field="subtitle" value="${esc(t.subtitle ?? '')}" placeholder="${esc(dish.subtitle)}" /></label>
            </div>
            <label class="field">Câu chuyện món ${tag}<textarea maxlength="400" lang="${esc(code)}" data-tr-locale="${esc(code)}" data-tr-field="story" placeholder="${esc(dish.story)}">${esc(t.story ?? '')}</textarea></label>
          </div>`;
  })
  .join('')}

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
            <h2>Cách nấu trong game</h2>
            <p class="hint">Món có cách nấu sẽ thành công thức trong Sổ bếp của nông trại. Mỗi dòng một bước: <code>Tên bước | lửa (low/mid/high) | độ dài 1–5 | tên tiếng Anh</code>. Nông sản là id trong kho game kèm số lượng, ví dụ <code>rice×2, shrimp×1, herbs×1</code> (game không có thịt). Để trống cả hai ô thì món không nấu được. AI tự viết phần này khi tạo món hoặc khi “Đọc lại bằng AI”.</p>
            <label class="field">Các bước (3–5)<textarea id="d-cook-steps" rows="5" placeholder="Nấu nước me chua | high | 3 | Boil water with tamarind">${esc(cookStepsText(dish.cook))}</textarea></label>
            <label class="field">Nông sản cần<input id="d-cook-produce" type="text" value="${esc(cookProduceText(dish.cook))}" placeholder="fish×1, tomato×2, herbs×2" /></label>
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
        translations: readTranslations(document.getElementById('dish-form'), [
          'name',
          'subtitle',
          'story',
        ]),
        // Unreadable fields send no `cook` key, so the saved recipe stays as it was.
        ...(cookFields().error ? {} : { cook: cookFields().cook }),
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
      const stepsEl = document.getElementById('d-cook-steps');
      if (p.cook && !stepsEl.value.trim()) {
        stepsEl.value = cookStepsText(p.cook);
        document.getElementById('d-cook-produce').value = cookProduceText(p.cook);
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
      const cookCheck = cookFields();
      if (cookCheck.error) return toast(cookCheck.error, true);
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
    const [items, allDishes] = await Promise.all([
      loadIngredients(),
      loadDishes(),
      loadStats(),
      loadLocales(),
    ]);
    // Extra-language inputs under the Vietnamese one, e.g. English name / description.
    const trInputs = (i, field, label) =>
      locales.extra
        .map(
          (code) =>
            `<label class="tr-input"><span class="lang-tag">${esc(code)}</span><input type="text" maxlength="${field === 'name' ? 120 : 400}" lang="${esc(code)}" data-tr-locale="${esc(code)}" data-tr-field="${field}" value="${esc(trOf(i, code)[field] ?? '')}" placeholder="${esc(localeName(code))}" aria-label="${esc(label)} (${esc(localeName(code))})" /></label>`,
        )
        .join('');
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
          (!k ||
            norm(
              `${i.name} ${i.id} ${i.description} ${Object.values(i.translations ?? {})
                .map((t) => `${t.name ?? ''} ${t.description ?? ''}`)
                .join(' ')}`,
            ).includes(k)) &&
          (!unused || i.usedBy === 0) &&
          (!dishId || i.dishes.some((d) => d.id === dishId)),
      );
      document.getElementById('list').innerHTML = list.length
        ? `<div class="table-wrap"><table><thead><tr><th>Tên</th><th>Mô tả</th><th>Loại cây</th><th>Dùng trong</th><th></th></tr></thead><tbody>${list
            .map(
              (i) => `<tr data-id="${esc(i.id)}">
                <td><input type="text" data-k="name" value="${esc(i.name)}" aria-label="Tên" />${trInputs(i, 'name', 'Tên')}<div class="dish-id">${esc(i.id)}</div></td>
                <td><input type="text" data-k="description" value="${esc(i.description)}" aria-label="Mô tả" />${trInputs(i, 'description', 'Mô tả')}</td>
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
          const body = {
            name: val('name'),
            description: val('description'),
            crop: val('crop') || null,
            translations: readTranslations(tr, ['name', 'description']),
          };
          await api(`/admin/ingredients/${encodeURIComponent(id)}`, { method: 'PUT', body });
          // Keep the in-memory row in step so filtering/redrawing shows the saved values.
          const item = items.find((x) => x.id === id);
          if (item) {
            const kept = Object.entries(body.translations)
              .map(([code, t]) => [code, Object.fromEntries(Object.entries(t).filter(([, v]) => v))])
              .filter(([, t]) => Object.keys(t).length);
            Object.assign(item, body, { translations: Object.fromEntries(kept) });
          }
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

  // ——— Users (guest accounts) ———
  const USERS_POLL_MS = 20000;
  let usersPoll = null;
  let usersOnline = null;

  const fmtUnix = (t) => (t ? new Date(t * 1000).toLocaleString('vi-VN') : '—');
  function ago(t, now) {
    if (!t) return 'chưa từng';
    const s = Math.max(0, now - t);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
    if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
    if (s < 30 * 86400) return `${Math.floor(s / 86400)} ngày trước`;
    return new Date(t * 1000).toLocaleDateString('vi-VN');
  }

  /** Numbers roll up to their new value instead of jumping. */
  function countUp(el, to) {
    const from = Number(el.dataset.n || 0);
    el.dataset.n = String(to);
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(to);
      return;
    }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      el.textContent = String(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Promise-based confirm in a styled <dialog>; resolves true on confirm. */
  function confirmBox({ title, text, ok, danger = false }) {
    return new Promise((resolve) => {
      const d = document.createElement('dialog');
      d.className = 'confirm';
      d.innerHTML = `
        <form method="dialog">
          <h2>${esc(title)}</h2>
          <p>${esc(text)}</p>
          <div class="confirm__actions">
            <button class="btn" value="no" autofocus>Huỷ</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" value="yes">${esc(ok)}</button>
          </div>
        </form>`;
      document.body.appendChild(d);
      d.addEventListener('close', () => {
        resolve(d.returnValue === 'yes');
        d.remove();
      });
      d.showModal();
    });
  }

  function userRow(u, now) {
    const p = u.progress;
    return `<tr data-id="${u.id}" class="${u.online ? 'is-online' : ''}">
      <td><div class="user-cell">
        <span class="presence ${u.online ? 'presence--on' : u.lastSeen >= now - 86400 ? 'presence--day' : ''}" title="${u.online ? 'Đang online' : 'Ngoại tuyến'}"></span>
        <div><div class="dish-name">${esc(u.email)}${u.bannedUntil ? ` <span class="badge badge--lock" title="Nông trại bị khoá đến ${esc(fmtUnix(u.bannedUntil))}">🔒 khoá</span>` : ''}</div>
        <div class="dish-id">${u.gardenName ? esc(u.gardenName) + ' · ' : ''}${u.friendCode ? 'Mã ' + esc(u.friendCode) : 'Chưa có mã vườn'}</div></div>
      </div></td>
      <td class="num">${p ? `Cấp ${p.level}<div class="dish-id">${p.xp} XP</div>` : '<span class="hint">—</span>'}</td>
      <td class="num">${p ? p.coins : '—'}</td>
      <td class="num">${p ? p.streak : '—'}</td>
      <td class="num">${u.friends}</td>
      <td class="num">${u.sessions}</td>
      <td><span class="${u.online ? 'live-text' : 'hint'}">${u.online ? 'Đang online' : esc(ago(u.lastSeen, now))}</span></td>
      <td class="hint">${esc(ago(u.createdAt, now))}</td>
      <td><div class="row-actions">
        <button type="button" class="btn btn--sm" data-act="view">Chi tiết</button>
        <button type="button" class="btn btn--sm" data-act="logout" ${u.sessions ? '' : 'disabled'} title="Đăng xuất mọi thiết bị">Đăng xuất</button>
        <button type="button" class="btn btn--sm btn--danger" data-act="delete" aria-label="Xoá ${esc(u.email)}">Xoá</button>
      </div></td>
    </tr>`;
  }

  async function renderUsers() {
    const my = ++renderGen;
    const [data] = await Promise.all([api('/admin/users'), loadStats()]);
    if (my !== renderGen) return; // a newer page started rendering meanwhile
    usersOnline = data.summary.online;
    shell(
      'users',
      `
      <div class="page-head">
        <div><h1>Người dùng</h1><p>Tài khoản khách đã lưu nông trại bằng email. Khách chưa lưu chỉ có tiến trình trên máy họ nên không hiện ở đây.</p></div>
        <div class="live"><span class="presence presence--on"></span><span id="u-sync" class="hint">Tự cập nhật mỗi ${USERS_POLL_MS / 1000} giây</span><button type="button" class="btn btn--sm" id="u-refresh">Làm mới</button></div>
      </div>
      <div class="stats">
        <div class="stat stat--live"><span class="stat__label">Đang online</span><span class="stat__value" id="s-online">0</span><span class="stat__note">Hoạt động trong ${Math.round(data.summary.onlineWindow / 60)} phút qua</span></div>
        <div class="stat"><span class="stat__label">24 giờ qua</span><span class="stat__value" id="s-day">0</span><span class="stat__note">Đã ghé ít nhất một lần</span></div>
        <div class="stat"><span class="stat__label">7 ngày qua</span><span class="stat__value" id="s-week">0</span><span class="stat__note">Người dùng hoạt động</span></div>
        <div class="stat"><span class="stat__label">Tổng tài khoản</span><span class="stat__value" id="s-total">0</span><span class="stat__note" id="s-new"></span></div>
      </div>
      <div class="toolbar">
        <input id="uq" type="search" placeholder="Tìm email, mã vườn, tên vườn…" aria-label="Tìm người dùng" />
        <div class="seg" role="group" aria-label="Lọc theo hoạt động">
          <button type="button" data-f="all" aria-pressed="true">Tất cả</button>
          <button type="button" data-f="online" aria-pressed="false">Đang online</button>
          <button type="button" data-f="day" aria-pressed="false">24 giờ</button>
          <button type="button" data-f="week" aria-pressed="false">7 ngày</button>
        </div>
      </div>
      <div id="u-list"></div>`,
    );

    let current = data;
    let filter = 'all';
    const q = document.getElementById('uq');
    const list = document.getElementById('u-list');

    const draw = () => {
      const now = current.now;
      const s = current.summary;
      countUp(document.getElementById('s-online'), s.online);
      countUp(document.getElementById('s-day'), s.day);
      countUp(document.getElementById('s-week'), s.week);
      countUp(document.getElementById('s-total'), s.total);
      document.getElementById('s-new').textContent = `${s.newWeek} tài khoản mới trong tuần`;
      const since = { online: now - s.onlineWindow, day: now - 86400, week: now - 7 * 86400 }[filter];
      const k = norm(q.value.trim());
      const rows = current.items.filter(
        (u) =>
          (since === undefined || u.lastSeen >= since) &&
          (!k || norm(`${u.email} ${u.friendCode} ${u.gardenName}`).includes(k)),
      );
      list.innerHTML = rows.length
        ? `<div class="table-wrap"><table class="users">
            <thead><tr><th>Người dùng</th><th class="num">Cấp</th><th class="num">Xu</th><th class="num">Chuỗi</th><th class="num">Bạn</th><th class="num">Thiết bị</th><th>Hoạt động</th><th>Tham gia</th><th></th></tr></thead>
            <tbody>${rows.map((u) => userRow(u, now)).join('')}</tbody></table></div>`
        : '<p class="empty">Không có người dùng nào khớp.</p>';
      if (current.truncated) {
        list.insertAdjacentHTML('beforeend', '<p class="hint">Đang hiện 100 tài khoản hoạt động gần nhất — tìm theo email hoặc mã vườn để thấy người khác.</p>');
      }
    };

    const refresh = async () => {
      const sync = document.getElementById('u-sync');
      sync?.classList.add('is-syncing');
      try {
        // The server filters, searches and pages (100 at a time, most recently active first).
        const params = new URLSearchParams({ filter, q: q.value.trim() });
        current = await api(`/admin/users?${params}`);
        usersOnline = current.summary.online;
        draw();
        if (sync) sync.textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}`;
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        sync?.classList.remove('is-syncing');
      }
    };

    let searchTimer = 0;
    q.addEventListener('input', () => {
      draw();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refresh, 350);
    });
    document.querySelectorAll('.seg button').forEach((b) =>
      b.addEventListener('click', () => {
        filter = b.dataset.f;
        document
          .querySelectorAll('.seg button')
          .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        draw();
        refresh();
      }),
    );
    document.getElementById('u-refresh').onclick = refresh;

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = Number(btn.closest('tr').dataset.id);
      const u = current.items.find((x) => x.id === id);
      if (!u) return;
      if (btn.dataset.act === 'view') return showUser(id, refresh);
      if (btn.dataset.act === 'logout') {
        if (!(await confirmBox({ title: 'Đăng xuất mọi thiết bị?', text: `${u.email} sẽ phải đăng nhập lại bằng mã email. Tiến trình vẫn được giữ.`, ok: 'Đăng xuất' }))) return;
        try {
          const r = await api(`/admin/users/${id}/logout`, { method: 'POST' });
          toast(`Đã kết thúc ${r.ended} phiên của ${u.email}.`, 'success');
          refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      if (btn.dataset.act === 'delete') {
        if (!(await confirmBox({ title: 'Xoá tài khoản này?', text: `Xoá vĩnh viễn ${u.email}: tiến trình, vườn, bạn bè và mọi phiên đăng nhập. Không hoàn tác được.`, ok: 'Xoá vĩnh viễn', danger: true }))) return;
        try {
          const row = btn.closest('tr');
          row.classList.add('is-removing');
          await api(`/admin/users/${id}`, { method: 'DELETE' });
          toast(`Đã xoá tài khoản ${u.email}.`, 'warning');
          setTimeout(refresh, 320);
        } catch (err) {
          toast(err.message, 'error');
          refresh();
        }
      }
    });

    draw();
    usersPoll = setInterval(() => {
      if (!document.hidden && !document.querySelector('dialog[open]')) refresh();
    }, USERS_POLL_MS);
  }

  async function showUser(id, onChange) {
    let u;
    try {
      u = await api(`/admin/users/${id}`);
    } catch (err) {
      return toast(err.message, 'error');
    }
    const now = Math.floor(Date.now() / 1000);
    const p = u.progress;
    const d = document.createElement('dialog');
    d.className = 'drawer';
    d.setAttribute('aria-label', `Người dùng ${u.email}`);
    const kv = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
    d.innerHTML = `
      <div class="drawer__head">
        <span class="presence ${u.online ? 'presence--on' : ''}"></span>
        <div><h2>${esc(u.email)}</h2><p class="hint">${u.online ? 'Đang online' : 'Hoạt động ' + esc(ago(u.lastSeen, now))} · ID ${u.id}</p></div>
        <button type="button" class="btn btn--sm btn--icon" data-close aria-label="Đóng">✕</button>
      </div>
      <div class="drawer__body">
        <section><h3>Tiến trình</h3>${
          p
            ? `<dl class="kv">${kv('Cấp', `${p.level} <span class="hint">(${p.xp} XP)</span>`)}${kv('Xu', p.coins)}${kv('Chuỗi ngày', p.streak)}${kv('Món đã ăn', p.eaten)}${kv('Lần nấu', p.cooked)}${kv('Check-in', p.checkIns)}${kv('Ô vườn', `${p.growing}/${p.plots} đang trồng`)}${kv('Vùng mở', p.regions)}</dl>
               <p class="hint">Đồng bộ lần cuối ${esc(fmtUnix(u.progressAt))} · bản ${u.progressVersion} · ${(u.progressBytes / 1024).toFixed(1)} KB</p>`
            : '<p class="hint">Chưa đồng bộ tiến trình.</p>'
        }</section>
        ${userExtras(u, now)}
        <section><h3>Tài khoản</h3><dl class="kv">
          ${kv('Tham gia', esc(fmtUnix(u.createdAt)))}
          ${kv('Vườn', u.friendCode ? `${esc(u.gardenName || '—')} · <code>${esc(u.friendCode)}</code>` : '—')}
          ${kv('Nhận tin', u.marketing ? 'Có' : 'Không')}
          ${kv('Điều khoản', `${esc(u.consentVersion)} <span class="hint">${esc(fmtUnix(u.consentAt))}</span>`)}
          ${kv('Sự kiện vườn', `${u.events.received} nhận · ${u.events.sent} gửi`)}
        </dl></section>
        <section><h3>Thiết bị đang đăng nhập (${u.sessionList.length})</h3>${
          u.sessionList.length
            ? `<ul class="sessions">${u.sessionList
                .map(
                  (s) => `<li><span class="presence ${s.online ? 'presence--on' : ''}"></span>
                    <span>Đăng nhập ${esc(fmtUnix(s.createdAt))}<br /><span class="hint">Hoạt động ${esc(ago(s.lastSeen, now))} · hết hạn ${esc(new Date(s.expiresAt * 1000).toLocaleDateString('vi-VN'))}</span></span></li>`,
                )
                .join('')}</ul>`
            : '<p class="hint">Không có phiên nào còn hiệu lực.</p>'
        }</section>
        <section><h3>Bạn vườn (${u.friendList.length})</h3>${
          u.friendList.length
            ? `<ul class="sessions">${u.friendList
                .map((f) => `<li><code>${esc(f.code)}</code><span>${esc(f.name || 'Khu vườn')} <span class="hint">· từ ${esc(new Date(f.since * 1000).toLocaleDateString('vi-VN'))}</span></span></li>`)
                .join('')}</ul>`
            : '<p class="hint">Chưa kết bạn ai.</p>'
        }</section>
      </div>
      <div class="drawer__foot">
        <button type="button" class="btn" data-act="logout" ${u.sessionList.length ? '' : 'disabled'}>Đăng xuất mọi thiết bị</button>
        <button type="button" class="btn btn--danger" data-act="delete">Xoá tài khoản</button>
      </div>`;
    document.body.appendChild(d);
    const close = () => {
      d.classList.add('is-closing');
      setTimeout(() => d.close(), 220);
    };
    d.addEventListener('close', () => d.remove());
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
    d.addEventListener('click', async (e) => {
      if (e.target === d || e.target.closest('[data-close]')) return close();
      const act = e.target.closest('[data-act]')?.dataset.act;
      const after = (msg, kind = 'success') => {
        toast(msg, kind);
        close();
        onChange();
        setTimeout(() => showUser(u.id, onChange), 260);
      };
      if (act === 'ban') {
        const hours = Number(d.querySelector('#ban-hours').value);
        const reason = d.querySelector('#ban-reason').value.trim();
        if (!(await confirmBox({ title: 'Khoá nông trại?', text: `${u.email} sẽ không lưu được nông trại và không tương tác vườn bạn bè trong ${hoursText(hours)}. Quay món vẫn dùng được.`, ok: 'Khoá', danger: true }))) return;
        try {
          await api(`/admin/users/${u.id}/ban`, { method: 'POST', body: { hours, reason } });
          after(`Đã khoá nông trại ${hoursText(hours)}.`, 'warning');
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      if (act === 'unban') {
        try {
          await api(`/admin/users/${u.id}/unban`, { method: 'POST' });
          after('Đã gỡ khoá nông trại.');
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      if (act === 'gift') {
        const spins = Number(d.querySelector('#gift-spins').value);
        try {
          const r = await api(`/admin/users/${u.id}/spins`, { method: 'POST', body: { spins } });
          after(`Đã ${spins > 0 ? 'tặng' : 'trừ'} ${Math.abs(spins)} lượt — còn ${r.credits} lượt đã mua.`);
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      if (act === 'logout') {
        if (!(await confirmBox({ title: 'Đăng xuất mọi thiết bị?', text: `${u.email} sẽ phải đăng nhập lại. Tiến trình vẫn được giữ.`, ok: 'Đăng xuất' }))) return;
        try {
          const r = await api(`/admin/users/${u.id}/logout`, { method: 'POST' });
          toast(`Đã kết thúc ${r.ended} phiên.`, 'success');
          close();
          onChange();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      if (act === 'delete') {
        if (!(await confirmBox({ title: 'Xoá tài khoản này?', text: `Xoá vĩnh viễn ${u.email} cùng tiến trình, vườn và bạn bè. Không hoàn tác được.`, ok: 'Xoá vĩnh viễn', danger: true }))) return;
        try {
          await api(`/admin/users/${u.id}`, { method: 'DELETE' });
          toast(`Đã xoá tài khoản ${u.email}.`, 'warning');
          close();
          onChange();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    });
    d.showModal();
  }

  // ——— Spins, payments & fair play ———
  const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
  /** 6 → "6 giờ", 72 → "3 ngày", 30 → "1 ngày 6 giờ". */
  const hoursText = (h) => {
    h = Number(h || 0);
    if (!h) return 'chỉ cảnh báo';
    const d = Math.floor(h / 24);
    const r = h % 24;
    return [d ? `${d} ngày` : '', r ? `${r} giờ` : ''].filter(Boolean).join(' ');
  };
  const ORDER_STATUS = { pending: 'Chờ thanh toán', paid: 'Đã thanh toán', expired: 'Hết hạn', cancelled: 'Đã huỷ' };
  const CODE_NAMES = {
    clock: 'Đổi giờ máy',
    owned: 'Vườn của tài khoản khác',
    import: 'Nhập vườn quá mức',
    gap: 'Mất lịch sử',
    gift_debit: 'Quà gửi bạn',
    shape: 'Dữ liệu méo',
    rule: 'Sai luật chơi',
    balance: 'Sửa số dư',
    replay: 'Nhận thưởng hai lần',
  };
  /** Lock lengths offered in the user drawer (hours). */
  const BAN_CHOICES = [1, 6, 24, 72, 168, 336, 720];

  const levelBadge = (lv) =>
    `<span class="badge badge--level badge--lv${Math.min(4, lv)}">Mức ${lv}</span>`;
  const banText = (b, now) =>
    `Khoá đến ${esc(fmtUnix(b.until))} <span class="hint">(${esc(b.source === 'admin' ? 'admin ' + (b.by || '') : 'tự động')} · còn ${esc(hoursText(Math.max(1, Math.round((b.until - now) / 3600))))})</span>`;

  async function renderPayments() {
    const my = ++renderGen;
    invalidate();
    const [settings] = await Promise.all([api('/admin/settings'), loadStats()]);
    if (my !== renderGen) return;
    const sp = settings.spins;
    const bank = settings.bank;
    shell(
      'payments',
      `
      <div class="page-head">
        <div><h1>Lượt quay & thanh toán</h1><p>Mỗi tài khoản (hoặc trình duyệt của khách) có số lượt quay miễn phí mỗi ngày theo giờ Việt Nam; hết lượt thì mua thêm bằng chuyển khoản VietQR. Nội dung chuyển khoản là mã đơn.</p></div>
      </div>
      <div class="stats" id="o-stats"></div>
      <form class="panel" id="spin-form">
        <h2>Lượt quay</h2>
        <div class="grid-3">
          <label class="field">Lượt miễn phí mỗi ngày<input type="number" min="0" max="1000" name="freePerDay" value="${esc(sp.freePerDay)}" /></label>
          <label class="field">Giá mỗi lượt (đồng)<input type="number" min="1000" step="500" name="price" value="${esc(sp.price)}" /></label>
          <label class="field">Các gói bán (số lượt, cách nhau dấu phẩy)<input type="text" name="packs" value="${esc(sp.packs.join(', '))}" /></label>
          <label class="field">Trần lượt miễn phí cho khách trên một mạng/ngày<input type="number" min="0" name="guestNetworkCap" value="${esc(sp.guestNetworkCap)}" /><span class="hint">Khách chưa đăng nhập dùng chung một mạng (văn phòng, quán cà phê). 0 = không giới hạn.</span></label>
        </div>
        <h2 class="panel__sub">Tài khoản nhận tiền (VietQR)</h2>
        <div class="grid-2">
          <label class="field">Mã BIN ngân hàng (6 số)<input type="text" inputmode="numeric" name="bin" value="${esc(bank.bin)}" placeholder="970436" /><span class="hint">Ví dụ: Vietcombank 970436, Techcombank 970407, MB 970422, ACB 970416, VPBank 970432, BIDV 970418, VietinBank 970415.</span></label>
          <label class="field">Tên ngân hàng (hiện cho khách)<input type="text" name="name" value="${esc(bank.name)}" placeholder="Vietcombank" /></label>
          <label class="field">Số tài khoản<input type="text" name="account" value="${esc(bank.account)}" /></label>
          <label class="field">Chủ tài khoản (không dấu)<input type="text" name="holder" value="${esc(bank.holder)}" placeholder="NGUYEN VAN A" /></label>
        </div>
        <p class="hint">${
          settings.webhook
            ? '✓ Webhook SePay đã bật (<code>SEPAY_API_KEY</code>): chuyển khoản đúng mã đơn và đủ tiền sẽ tự cộng lượt.'
            : 'Chưa bật xác nhận tự động. Đặt <code>SEPAY_API_KEY</code> trong <code>.env</code> và trỏ webhook SePay tới <code>/api/pay/sepay</code> để tự cộng lượt — nếu không, xác nhận từng đơn ở bảng dưới.'
        }</p>
        <div class="form-actions"><button class="btn btn--primary" type="submit">Lưu cài đặt</button></div>
      </form>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Lọc đơn" id="o-seg">
          ${['pending', 'paid', 'expired', 'cancelled', 'all']
            .map((k) => `<button type="button" data-s="${k}" aria-pressed="${k === 'pending'}">${k === 'all' ? 'Tất cả' : ORDER_STATUS[k]}</button>`)
            .join('')}
        </div>
      </div>
      <div id="o-list"></div>`,
    );

    document.getElementById('spin-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api('/admin/settings', {
          method: 'PUT',
          body: {
            spins: {
              freePerDay: Number(f.get('freePerDay')),
              price: Number(f.get('price')),
              packs: String(f.get('packs')).split(/[^0-9]+/).filter(Boolean).map(Number),
              guestNetworkCap: Number(f.get('guestNetworkCap')),
            },
            bank: { bin: f.get('bin'), name: f.get('name'), account: f.get('account'), holder: f.get('holder') },
          },
        });
        toast('Đã lưu cài đặt lượt quay.', 'success');
        renderPayments();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    let status = 'pending';
    const list = document.getElementById('o-list');
    const load = async () => {
      const data = await api(`/admin/orders?status=${status}`);
      const s = data.summary;
      const stat = (k, label) =>
        `<div class="stat"><span class="stat__label">${label}</span><span class="stat__value">${s[k]?.n ?? 0}</span><span class="stat__note">${vnd(s[k]?.amount ?? 0)}</span></div>`;
      document.getElementById('o-stats').innerHTML =
        stat('pending', 'Chờ thanh toán') + stat('paid', 'Đã thanh toán') + stat('expired', 'Hết hạn');
      list.innerHTML = data.items.length
        ? `<div class="table-wrap"><table class="users">
            <thead><tr><th>Mã đơn</th><th>Người mua</th><th class="num">Lượt</th><th class="num">Số tiền</th><th>Trạng thái</th><th>Tạo lúc</th><th></th></tr></thead>
            <tbody>${data.items
              .map(
                (o) => `<tr data-code="${esc(o.code)}">
                  <td><code>${esc(o.code)}</code></td>
                  <td>${o.userId ? `<a href="#/users" data-user="${o.userId}">${esc(o.email)}</a>` : '<span class="hint">(tài khoản đã xoá)</span>'}</td>
                  <td class="num">${o.spins}</td>
                  <td class="num">${vnd(o.amount)}</td>
                  <td><span class="badge badge--order-${esc(o.status)}">${esc(ORDER_STATUS[o.status] || o.status)}</span>${
                    o.paidAt ? `<div class="hint">${esc(fmtUnix(o.paidAt))} · ${esc(o.paidVia === 'sepay' ? 'SePay' : 'admin')}${o.bankRef ? ' · ' + esc(o.bankRef) : ''}</div>` : ''
                  }</td>
                  <td class="hint">${esc(fmtUnix(o.createdAt))}</td>
                  <td><div class="row-actions">${
                    o.status === 'paid' || o.status === 'cancelled'
                      ? ''
                      : `<button type="button" class="btn btn--sm btn--primary" data-act="confirm">Đã nhận tiền</button>
                         <button type="button" class="btn btn--sm" data-act="cancel">Huỷ</button>`
                  }</div></td>
                </tr>`,
              )
              .join('')}</tbody></table></div>`
        : '<p class="empty">Không có đơn nào.</p>';
    };
    document.getElementById('o-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-s]');
      if (!b) return;
      status = b.dataset.s;
      document.querySelectorAll('#o-seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      load().catch((err) => toast(err.message, 'error'));
    });
    list.addEventListener('click', async (e) => {
      const link = e.target.closest('a[data-user]');
      if (link) {
        e.preventDefault();
        return showUser(Number(link.dataset.user), load);
      }
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const code = btn.closest('tr').dataset.code;
      const confirmPay = btn.dataset.act === 'confirm';
      if (
        !(await confirmBox(
          confirmPay
            ? { title: `Xác nhận đơn ${code}?`, text: 'Chỉ xác nhận khi tài khoản ngân hàng đã nhận đủ tiền với nội dung là mã đơn này. Lượt quay sẽ được cộng ngay.', ok: 'Đã nhận tiền' }
            : { title: `Huỷ đơn ${code}?`, text: 'Khách sẽ không nhận được lượt cho đơn này.', ok: 'Huỷ đơn', danger: true },
        ))
      )
        return;
      try {
        const r = await api(`/admin/orders/${code}/${btn.dataset.act}`, { method: 'POST' });
        toast(confirmPay ? (r.credited ? `Đã cộng lượt cho đơn ${code}.` : `Đơn ${code} đã được thanh toán trước đó.`) : `Đã huỷ đơn ${code}.`, confirmPay ? 'success' : 'warning');
        load();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    await load();
  }

  async function renderFairPlay() {
    const my = ++renderGen;
    invalidate();
    const [data] = await Promise.all([api('/admin/fairplay'), loadStats()]);
    if (my !== renderGen) return;
    const fp = data.settings;
    const now = data.now;
    shell(
      'fairplay',
      `
      <div class="page-head">
        <div><h1>Gian lận</h1><p>Mỗi bản lưu bị từ chối cộng điểm theo loại vi phạm (cùng loại và lý do trong một giờ chỉ tính một lần). Điểm cộng dồn trong ${fp.windowDays} ngày; chạm mức mới thì báo ở đây${data.settings.autoBan ? ' và tự khoá nông trại theo thời hạn của mức đó' : ''}. Khi bị khoá, tài khoản vẫn quay món được nhưng không lưu được nông trại và không tương tác vườn bạn bè.</p></div>
        <button type="button" class="btn btn--sm" id="fp-seen" ${data.unseen ? '' : 'disabled'}>Đánh dấu đã xem (${data.unseen})</button>
      </div>
      <div class="stats">
        <div class="stat"><span class="stat__label">Cảnh báo chưa xem</span><span class="stat__value">${data.unseen}</span><span class="stat__note">${data.alerts.length} cảnh báo gần nhất</span></div>
        <div class="stat"><span class="stat__label">Đang bị khoá</span><span class="stat__value">${data.bans.length}</span><span class="stat__note">Tài khoản không chơi được nông trại</span></div>
        <div class="stat"><span class="stat__label">Bản lưu bị từ chối</span><span class="stat__value">${data.refusedWeek.reduce((a, r) => a + r.n, 0)}</span><span class="stat__note">7 ngày qua · ${esc(data.refusedWeek.map((r) => `${CODE_NAMES[r.code] || r.code} ${r.n}`).join(' · ') || 'không có')}</span></div>
      </div>
      <div class="panel">
        <h2>Cảnh báo</h2>
        ${
          data.alerts.length
            ? `<div class="table-wrap"><table class="users">
              <thead><tr><th>Tài khoản</th><th>Mức</th><th class="num">Điểm</th><th>Vi phạm</th><th>Trạng thái</th><th>Lúc</th><th></th></tr></thead>
              <tbody>${data.alerts
                .map(
                  (a) => `<tr data-id="${a.userId}" class="${a.seen ? '' : 'is-unseen'}">
                    <td><div class="dish-name">${esc(a.email)}</div><div class="dish-id">${a.garden ? esc(a.garden) + ' · ' : ''}${a.code ? 'Mã ' + esc(a.code) : ''}</div></td>
                    <td>${levelBadge(a.level)}</td>
                    <td class="num">${a.points}</td>
                    <td>${esc(a.detail)}</td>
                    <td>${a.activeBan ? `<span class="badge badge--lock">🔒 ${esc(fmtUnix(a.activeBan.until))}</span>` : a.banned ? '<span class="hint">Đã hết khoá</span>' : '<span class="hint">Chỉ cảnh báo</span>'}</td>
                    <td class="hint">${esc(ago(a.at, now))}</td>
                    <td><div class="row-actions"><button type="button" class="btn btn--sm" data-act="view">Chi tiết</button></div></td>
                  </tr>`,
                )
                .join('')}</tbody></table></div>`
            : '<p class="empty">Chưa có cảnh báo nào.</p>'
        }
      </div>
      <div class="panel">
        <h2>Đang bị khoá (${data.bans.length})</h2>
        ${
          data.bans.length
            ? `<ul class="sessions">${data.bans
                .map(
                  (b) => `<li data-id="${b.userId}"><span class="presence"></span><span><strong>${esc(b.email)}</strong> · ${banText(b, now)}<br /><span class="hint">${esc(b.reason)}</span></span>
                    <span class="row-actions"><button type="button" class="btn btn--sm" data-act="view">Chi tiết</button><button type="button" class="btn btn--sm" data-act="unban">Gỡ khoá</button></span></li>`,
                )
                .join('')}</ul>`
            : '<p class="hint">Không có tài khoản nào đang bị khoá.</p>'
        }
      </div>
      <form class="panel" id="fp-form">
        <h2>Mức xử lý</h2>
        <p class="hint">Mỗi mức: đạt bao nhiêu điểm thì báo, và khoá nông trại bao lâu (0 = chỉ cảnh báo). Tối đa 90 ngày.</p>
        <div class="levels" id="fp-levels">${fp.levels
          .map(
            (l, i) => `<div class="level-row">
              <span class="level-row__n">Mức ${i + 1}</span>
              <label class="field">Từ điểm<input type="number" min="1" name="lp" value="${l.points}" /></label>
              <label class="field">Khoá (giờ)<input type="number" min="0" max="2160" name="lh" value="${l.hours}" /><span class="hint" data-h>${esc(hoursText(l.hours))}</span></label>
              <button type="button" class="btn btn--sm" data-act="drop" aria-label="Bỏ mức ${i + 1}">✕</button>
            </div>`,
          )
          .join('')}</div>
        <button type="button" class="btn btn--sm" id="fp-add">+ Thêm mức</button>
        <h2 class="panel__sub">Điểm cho mỗi loại vi phạm</h2>
        <div class="grid-3">${Object.entries(fp.weights)
          .map(
            ([code, w]) => `<label class="field">${esc(CODE_NAMES[code] || code)} <code>${esc(code)}</code><input type="number" min="0" max="50" name="w:${esc(code)}" value="${w}" /></label>`,
          )
          .join('')}</div>
        <div class="grid-3">
          <label class="field">Cộng dồn điểm trong (ngày)<input type="number" min="1" max="90" name="windowDays" value="${fp.windowDays}" /></label>
          <label class="check"><input type="checkbox" name="autoBan" ${fp.autoBan ? 'checked' : ''} /> Tự động khoá khi chạm mức có thời hạn</label>
        </div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">Lưu mức xử lý</button></div>
      </form>`,
    );

    const levels = document.getElementById('fp-levels');
    const renumber = () =>
      levels.querySelectorAll('.level-row__n').forEach((el, i) => (el.textContent = `Mức ${i + 1}`));
    levels.addEventListener('input', (e) => {
      if (e.target.name === 'lh') e.target.parentElement.querySelector('[data-h]').textContent = hoursText(e.target.value);
    });
    levels.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="drop"]') && levels.children.length > 1) {
        e.target.closest('.level-row').remove();
        renumber();
      }
    });
    document.getElementById('fp-add').onclick = () => {
      const last = levels.lastElementChild;
      const row = last.cloneNode(true);
      const lp = row.querySelector('[name="lp"]');
      lp.value = Number(last.querySelector('[name="lp"]').value || 0) * 2 || 1;
      levels.appendChild(row);
      renumber();
    };
    document.getElementById('fp-form').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const weights = {};
      form.querySelectorAll('input[name^="w:"]').forEach((i) => (weights[i.name.slice(2)] = Number(i.value)));
      const body = {
        fairPlay: {
          weights,
          windowDays: Number(form.windowDays.value),
          autoBan: form.autoBan.checked,
          levels: [...levels.querySelectorAll('.level-row')].map((r) => ({
            points: Number(r.querySelector('[name="lp"]').value),
            hours: Number(r.querySelector('[name="lh"]').value),
          })),
        },
      };
      try {
        await api('/admin/settings', { method: 'PUT', body });
        toast('Đã lưu mức xử lý.', 'success');
        renderFairPlay();
      } catch (err) {
        toast(err.message, 'error');
      }
    };
    document.getElementById('fp-seen').onclick = async () => {
      try {
        await api('/admin/fairplay/seen', { method: 'POST', body: { all: true } });
        renderFairPlay();
      } catch (err) {
        toast(err.message, 'error');
      }
    };
    document.getElementById('main').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act="view"], [data-act="unban"]');
      const holder = btn?.closest('[data-id]');
      if (!btn || !holder) return;
      const id = Number(holder.dataset.id);
      if (btn.dataset.act === 'view') return showUser(id, renderFairPlay);
      if (!(await confirmBox({ title: 'Gỡ khoá nông trại?', text: 'Tài khoản chơi và lưu nông trại lại được ngay.', ok: 'Gỡ khoá' }))) return;
      try {
        await api(`/admin/users/${id}/unban`, { method: 'POST' });
        toast('Đã gỡ khoá.', 'success');
        renderFairPlay();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  /** The fair-play and spins sections of the user drawer. */
  function userExtras(u, now) {
    const fp = u.fairPlay;
    const sp = u.spins;
    const kv = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
    return `
      <section><h3>Gian lận</h3><dl class="kv">
        ${kv('Điểm vi phạm', `${fp.points} <span class="hint">(${fp.windowDays} ngày qua${fp.level ? ' · mức ' + fp.level : ''})</span>`)}
        ${kv('Nông trại', fp.ban ? `<span class="badge badge--lock">🔒</span> ${banText(fp.ban, now)}` : 'Đang mở')}
      </dl>
      ${
        fp.refusals.length
          ? `<ul class="refusals">${fp.refusals
              .slice(0, 10)
              .map((r) => `<li><span class="badge">${esc(CODE_NAMES[r.code] || r.code)}</span> <span>${esc(r.detail)}</span> <span class="hint">${esc(ago(r.at, now))}</span></li>`)
              .join('')}</ul>`
          : '<p class="hint">Không có bản lưu nào bị từ chối gần đây.</p>'
      }
      ${
        fp.bans.length
          ? `<details class="past-bans"><summary class="hint">Lịch sử khoá (${fp.bans.length})</summary><ul class="refusals">${fp.bans
              .map((b) => `<li><span>${esc(fmtUnix(b.since))} → ${esc(fmtUnix(b.until))}</span> <span class="hint">${esc(b.reason)}${b.liftedAt ? ` · gỡ bởi ${esc(b.liftedBy || '')} lúc ${esc(fmtUnix(b.liftedAt))}` : ''}</span></li>`)
              .join('')}</ul></details>`
          : ''
      }
      <div class="inline-form">
        <select id="ban-hours" aria-label="Thời gian khoá">${BAN_CHOICES.map((h) => `<option value="${h}"${h === 24 ? ' selected' : ''}>${esc(hoursText(h))}</option>`).join('')}</select>
        <input type="text" id="ban-reason" maxlength="200" placeholder="Lý do (không bắt buộc)" aria-label="Lý do khoá" />
        <button type="button" class="btn btn--sm btn--danger" data-act="ban">Khoá nông trại</button>
        ${fp.ban ? '<button type="button" class="btn btn--sm" data-act="unban">Gỡ khoá</button>' : ''}
      </div></section>
      <section><h3>Lượt quay</h3><dl class="kv">
        ${kv('Lượt đã mua còn lại', sp.credits)}
        ${kv('Miễn phí đã dùng hôm nay', sp.freeUsedToday)}
        ${kv('Đã thanh toán', `${sp.ordersPaid} đơn · ${vnd(sp.amountPaid)}`)}
      </dl>
      ${
        sp.ledger.length
          ? `<details class="past-bans"><summary class="hint">Biến động gần đây</summary><ul class="refusals">${sp.ledger
              .map((l) => `<li><strong>${l.delta > 0 ? '+' : ''}${l.delta}</strong> <span>${esc({ topup: 'Nạp', spin: 'Quay', admin: 'Admin' }[l.reason] || l.reason)}${l.ref ? ' · ' + esc(l.ref) : ''}</span> <span class="hint">${esc(ago(l.at, now))}</span></li>`)
              .join('')}</ul></details>`
          : ''
      }
      <div class="inline-form">
        <input type="number" id="gift-spins" min="-1000" max="1000" value="5" aria-label="Số lượt" />
        <button type="button" class="btn btn--sm" data-act="gift">Tặng / trừ lượt</button>
      </div></section>`;
  }

  // ——— Router ———
  async function route() {
    if (!user) return renderLogin();
    const hash = location.hash.replace(/^#/, '') || '/';
    clearInterval(usersPoll);
    usersPoll = null;
    try {
      if (hash === '/') await renderHome();
      else if (hash === '/dishes') await renderDishes();
      else if (hash.startsWith('/dishes/')) await renderEditor(decodeURIComponent(hash.slice(8)));
      else if (hash === '/ingredients') await renderIngredients();
      else if (hash === '/users') await renderUsers();
      else if (hash === '/payments') await renderPayments();
      else if (hash === '/fairplay') await renderFairPlay();
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
      mfa = !!s.mfa;
      route();
    })
    .catch(() => renderLogin());
})();
