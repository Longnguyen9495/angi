import { useEffect, useRef, useState } from 'react';
import './promo.css';

const dishes = [
  { id: 'pho-bo', name: 'Phở bò', note: 'Một tô nóng hổi, một ngày thật vui.' },
  { id: 'com-tam', name: 'Cơm tấm', note: 'Đậm đà, thân quen, ngon đúng ý.' },
  { id: 'bun-bo-hue', name: 'Bún bò Huế', note: 'Đổi vị một chút, vui thêm một chút.' },
] as const;
const image = (id: string) => `/images/dishes/${id}.jpg`;

export function PromoDemo() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clean, setClean] = useState(new URLSearchParams(location.search).has('clean'));
  const [loaded, setLoaded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const scene = time < 4 ? 0 : time < 10 ? 1 : time < 16 ? 2 : 3;
  const selected = dishes[Math.min(2, Math.floor(Math.max(0, time - 10) / 2))] ?? dishes[0];

  useEffect(() => {
    let active = true;
    Promise.all(
      dishes.map(
        (dish) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = image(dish.id);
          }),
      ),
    ).then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setTime((value) => Math.min(20, value + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const end = window.setTimeout(() => setPlaying(false), Math.max(0, 20 - time) * 1000);
    return () => window.clearTimeout(end);
  }, [time, playing]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (loaded) {
          if (time >= 20) setTime(0);
          setPlaying((value) => !value);
        }
      }
      if (event.key === 'Escape') setClean(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [time, loaded]);

  const replay = () => {
    setTime(0);
    setPlaying(true);
  };
  const record = () => {
    setClean(true);
    setTime(0);
    setPlaying(false);
    void stage.current?.requestFullscreen?.().catch(() => {
      /* Clean mode also works without fullscreen. */
    });
  };

  return (
    <main className={`promo-page ${clean ? 'promo-clean' : ''}`}>
      {!clean && (
        <header className="promo-header">
          <span>ĂN GÌ / CREATIVE STUDIO</span>
          <h1>
            Một chút cảm hứng.
            <br />
            Một bữa thật ngon.
          </h1>
          <p>Demo quảng cáo · 20 giây · 9:16 · không âm thanh</p>
        </header>
      )}
      <div className="promo-stage" ref={stage}>
        <div className={`promo-film ${playing ? 'is-playing' : ''}`}>
          <div className="promo-brand">
            <img src="/favicon.svg" alt="" /> Ăn Gì<span>ĂN NGON, KHỎI NGHĨ.</span>
          </div>
          <section
            key={scene}
            className={`promo-scene promo-scene-${scene}`}
            aria-label={`Cảnh ${scene + 1}`}
          >
            {scene === 0 && (
              <>
                <div className="promo-eyebrow">CÂU HỎI KHÓ NHẤT MỖI NGÀY</div>
                <h2>
                  Hôm nay
                  <br />
                  ăn <em>gì?</em>
                </h2>
                <div className="promo-orbit">
                  <img src={image('pho-bo')} alt="Phở bò" />
                  <img src={image('com-tam')} alt="Cơm tấm" />
                  <img src={image('bun-bo-hue')} alt="Bún bò Huế" />
                  <span>🤔</span>
                </div>
                <p>Nghĩ mãi… vẫn chưa chọn được?</p>
                <div className="promo-pill">Để Ăn Gì gợi ý nhé ↗</div>
              </>
            )}
            {scene === 1 && (
              <>
                <div className="promo-eyebrow">BỚT PHÂN VÂN. THÊM NGON MIỆNG.</div>
                <h2>
                  Mở web.
                  <br />
                  <em>Tìm cảm hứng.</em>
                </h2>
                <div className="promo-phone">
                  <div className="promo-address">
                    ● ● ● <span>Ăn Gì — gợi ý món ăn</span>
                  </div>
                  <div className="promo-phone-content">
                    <small>CHÀO BẠN, ĐẾN GIỜ ĂN RỒI!</small>
                    <h3>
                      Bữa nay mình
                      <br />
                      ăn gì nhỉ?
                    </h3>
                    <div className="promo-tags">
                      <span>Món Việt</span>
                      <span>Đổi vị</span>
                      <span>Quen thuộc</span>
                    </div>
                    <img src={image('pho-bo')} alt="Gợi ý phở bò" />
                    <strong>Phở bò</strong>
                    <p>Thơm nóng • Đậm đà • Thân quen</p>
                    <div className="promo-fake-button">Khám phá món ngon →</div>
                  </div>
                  <div className="promo-tap">↖</div>
                </div>
                <p className="promo-scene-caption">Một gợi ý nhỏ, bữa ăn thêm vui.</p>
              </>
            )}
            {scene === 2 && (
              <>
                <div className="promo-eyebrow">HƯƠNG VỊ VIỆT, CẢM HỨNG MỚI</div>
                <h2>
                  Món quen.
                  <br />
                  <em>Vui bất ngờ.</em>
                </h2>
                <div className="promo-food-card" key={selected.id}>
                  <img src={image(selected.id)} alt={selected.name} />
                  <div>
                    <span>GỢI Ý CHO BỮA TIẾP THEO</span>
                    <h3>{selected.name}</h3>
                    <p>{selected.note}</p>
                  </div>
                </div>
                <div className="promo-dots">
                  {dishes.map((dish) => (
                    <i key={dish.id} className={dish.id === selected.id ? 'active' : ''} />
                  ))}
                </div>
                <p>Hôm nay, thử một món khác nhé?</p>
              </>
            )}
            {scene === 3 && (
              <>
                <div className="promo-end-icon">
                  <img src="/favicon.svg" alt="" />
                </div>
                <div className="promo-eyebrow">ĐẾN GIỜ ĂN, MỞ ĂN GÌ</div>
                <h2>
                  Bữa ngon
                  <br />
                  bắt đầu từ
                  <br />
                  <em>một gợi ý.</em>
                </h2>
                <div className="promo-cta">Khám phá Ăn Gì ↗</div>
                <p>Chọn món cho bữa tiếp theo.</p>
                <div className="promo-end-line">Ăn Gì · Cảm hứng món Việt</div>
              </>
            )}
          </section>
          <div className="promo-film-footer">
            <span>MỘT BỮA NGON ĐANG CHỜ BẠN</span>
            <span>✦</span>
          </div>
        </div>
      </div>
      {!clean && (
        <aside className="promo-controls">
          <div className="promo-control-title">
            <strong>Bản dựng thử</strong>
            <span>{time.toFixed(1)} / 20.0s</span>
          </div>
          <input
            aria-label="Tua video"
            type="range"
            min="0"
            max="20"
            step="0.1"
            value={time}
            onChange={(event) => {
              setPlaying(false);
              setTime(Number(event.target.value));
            }}
          />
          <div className="promo-buttons">
            <button
              disabled={!loaded}
              onClick={() => {
                if (time >= 20) setTime(0);
                setPlaying(!playing);
              }}
            >
              {!loaded ? 'Đang tải ảnh…' : playing ? 'Tạm dừng' : 'Phát demo'}
            </button>
            <button disabled={!loaded} onClick={replay}>
              Phát lại
            </button>
            <button disabled={!loaded} onClick={record}>
              Chế độ quay sạch
            </button>
          </div>
          <p>
            Chế độ quay: nhấn Space để bắt đầu/dừng, Esc để hiện điều khiển. Khung luôn giữ tỷ lệ
            9:16; để quay 1080 × 1920, đặt vùng ghi đúng kích thước đó.
          </p>
          <p>
            Giao diện trong video là mô phỏng. Demo chưa có nhạc/lời đọc; không tự xuất video.
            Chuyển động có thể khác nhẹ khi tua đến một cảnh.
          </p>
          <a href="/">← Về website Ăn Gì</a>
        </aside>
      )}
    </main>
  );
}
