import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/*
 * A ~60 s vertical promo (1080×1920, 60 fps) filmed on the real website: the reel, a dish's
 * story, the farm, guests and the autumn event, the market and the cookbook, between a brand
 * intro and outro.
 *
 * Filmed frame by frame on a virtual clock (timeweb): every page timer, requestAnimationFrame,
 * CSS and Web Animation advances exactly 1/60 s between two screenshots, so motion is even
 * however slow the machine is. Smooth scrolls are redone in JS on that clock, and the
 * captions, touches and brand cards are drawn in the page itself (the site's own fonts, so
 * Vietnamese reads right).
 *
 * 1. npx vite-node scripts/promo/promo-save.ts   (a farm worth filming, fresh timers)
 * 2. node scripts/export-promo-video.mjs [site]   (default: the production site)
 *    PROMO_FPS=12 films a quick draft with the same timing.
 *
 * Tools live apart from the app: storage/promo-tools (playwright, ffmpeg-static, timeweb).
 */

const require = createRequire(resolve('storage/promo-tools/package.json'));
const { chromium } = require('playwright');
const ffmpeg = require('ffmpeg-static');
const TIMEWEB = readFileSync(require.resolve('timeweb/dist/timeweb.js'), 'utf8');

const SITE = (process.argv[2] ?? 'https://angi.221-121-1-68.sslip.io').replace(/\/$/, '');
// The address shown on the outro: PROMO_HOST, else the site's host unless it is a raw sslip.io one.
const HOST = process.env.PROMO_HOST ?? (/sslip\.io$/.test(new URL(SITE).host) ? '' : new URL(SITE).host);
const FPS = Number(process.env.PROMO_FPS ?? 60);
const OUT = resolve(FPS === 60 ? 'public/videos/angi-quang-cao-60s.mp4' : 'storage/promo-render/draft.mp4');
const WORK = resolve('storage/promo-render/real');
const FRAMES = join(WORK, 'frames');
const save = JSON.parse(readFileSync('storage/promo-render/save.json', 'utf8'));

rmSync(WORK, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync('public/videos', { recursive: true });

// ——— Smooth scrolling on the virtual clock (the browser's own runs on real time) ———
const SCROLL = `
(() => {
  const E = Element.prototype;
  const nTo = E.scrollTo, nBy = E.scrollBy, nInto = E.scrollIntoView;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const runs = new WeakMap();
  const root = () => document.scrollingElement || document.documentElement;
  const clamp = (v, m) => Math.max(0, Math.min(v, m));
  const anim = (el, top, left, dur) => {
    top = clamp(top, el.scrollHeight - el.clientHeight);
    left = clamp(left, el.scrollWidth - el.clientWidth);
    const t0 = el.scrollTop, l0 = el.scrollLeft;
    if (Math.abs(top - t0) < 1 && Math.abs(left - l0) < 1) return;
    const d = dur ?? window.__scrollMs ?? Math.min(1000, 480 + Math.hypot(top - t0, left - l0) * 0.45);
    const tok = {};
    runs.set(el, tok);
    const snap = el.style.scrollSnapType;
    el.style.scrollSnapType = 'none';
    const start = performance.now();
    const step = () => {
      if (runs.get(el) !== tok) return;
      const p = Math.min(1, (performance.now() - start) / d);
      const e = ease(p);
      nTo.call(el, { top: t0 + (top - t0) * e, left: l0 + (left - l0) * e, behavior: 'instant' });
      if (p < 1) requestAnimationFrame(step);
      else { el.style.scrollSnapType = snap; runs.delete(el); }
    };
    requestAnimationFrame(step);
  };
  const smooth = (o) => !!o && typeof o === 'object' && o.behavior === 'smooth';
  E.scrollTo = function (o) {
    if (!smooth(o)) return nTo.apply(this, arguments);
    anim(this, o.top ?? this.scrollTop, o.left ?? this.scrollLeft);
  };
  E.scrollBy = function (o) {
    if (!smooth(o)) return nBy.apply(this, arguments);
    anim(this, this.scrollTop + (o.top ?? 0), this.scrollLeft + (o.left ?? 0));
  };
  const wTo = window.scrollTo, wBy = window.scrollBy;
  window.scrollTo = function (o) {
    if (!smooth(o)) return wTo.apply(window, arguments);
    anim(root(), o.top ?? root().scrollTop, o.left ?? root().scrollLeft);
  };
  window.scrollBy = function (o) {
    if (!smooth(o)) return wBy.apply(window, arguments);
    anim(root(), root().scrollTop + (o.top ?? 0), root().scrollLeft + (o.left ?? 0));
  };
  // Let the browser work out where everything ends, put it back, then glide there.
  E.scrollIntoView = function (o) {
    if (!smooth(o)) return nInto.apply(this, arguments);
    const chain = [];
    for (let p = this.parentElement; p; p = p.parentElement) chain.push(p);
    if (!chain.includes(root())) chain.push(root());
    const before = chain.map((el) => [el.scrollTop, el.scrollLeft]);
    nInto.call(this, { ...o, behavior: 'instant' });
    chain.forEach((el, i) => {
      const [t, l] = before[i];
      const nt = el.scrollTop, nl = el.scrollLeft;
      if (nt !== t || nl !== l) {
        nTo.call(el, { top: t, left: l, behavior: 'instant' });
        anim(el, nt, nl);
      }
    });
  };
  window.__smoothScroll = anim;
})();
`;

// ——— In-page overlay: captions, touches and the brand cards, installed on every page load ———
const OVERLAY = `
(() => {
  const css = \`
  #promo-scrim { position: fixed; left: 0; right: 0; top: 0; height: 36%; z-index: 2147482999; pointer-events: none; opacity: 0;
    background: linear-gradient(180deg, rgba(10,7,4,.88) 0%, rgba(10,7,4,.72) 48%, rgba(10,7,4,0) 100%); }
  #promo-cap { position: fixed; left: 20px; right: 20px; top: 10%; z-index: 2147483000; pointer-events: none;
    font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #fff; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
  #promo-cap .tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px 5px 8px; border-radius: 5px;
    background: #ef5a2a; font: 800 10px/1 'Be Vietnam Pro', system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; }
  #promo-cap .tag i { width: 5px; height: 5px; border-radius: 1px; background: #fff; transform: rotate(45deg); }
  #promo-cap .hl { margin-top: 8px; max-width: 300px; font: 800 18px/1.5 'Be Vietnam Pro', system-ui, sans-serif; letter-spacing: -.005em;
    text-wrap: balance; }
  #promo-cap .strip { padding: .25em .42em; border-radius: 5px; -webkit-box-decoration-break: clone; box-decoration-break: clone;
    background: linear-gradient(rgba(16,11,7,.96), rgba(16,11,7,.96)) no-repeat 0 0 / 100% 100%; }
  #promo-cap .wm { display: inline-block; overflow: hidden; vertical-align: top; padding: .04em .02em .14em; margin: -.04em -.02em -.14em; }
  #promo-cap .w { display: inline-block; }
  #promo-cap b { font-weight: 800; padding: .04em .22em .06em; margin: 0 -.06em; border-radius: 4px;
    background: linear-gradient(#ef5a2a, #ef5a2a) no-repeat 0 0 / 100% 100%; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .fj-next, .fg-hint, .fr-headline__title { visibility: hidden !important; }
  .fg-panel { max-height: 63dvh !important; }
  .promo-dot, .promo-ring { position: fixed; z-index: 2147483002; width: 44px; height: 44px; margin: -22px 0 0 -22px;
    border-radius: 50%; pointer-events: none; opacity: 0; }
  .promo-dot { background: radial-gradient(circle, rgba(255,255,255,.96) 0 34%, rgba(255,255,255,.62) 36% 100%);
    box-shadow: 0 0 0 1.5px rgba(30,20,12,.22), 0 8px 22px rgba(0,0,0,.32); }
  .promo-ring { border: 2.5px solid rgba(255,255,255,.95); box-shadow: 0 0 0 1px rgba(30,20,12,.15); }
  #promo-card { position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center; text-align: center;
    overflow: hidden; background: linear-gradient(170deg, #fdf6e9 0%, #fbe9d2 60%, #fde2c4 100%); color: #1b3a2c;
    font-family: 'Be Vietnam Pro', system-ui, sans-serif; transform: translateY(100%); pointer-events: none; }
  #promo-card .blob { position: absolute; border-radius: 50%; filter: blur(30px); }
  #promo-card .b1 { width: 300px; height: 300px; right: -90px; top: -60px; background: #dfe9c8; }
  #promo-card .b2 { width: 260px; height: 260px; left: -100px; bottom: -40px; background: #f9cfa4; opacity: .75; }
  #promo-card .inner { position: relative; padding: 0 28px; }
  #promo-card .brand { display: flex; align-items: center; gap: 10px; justify-content: center; font-weight: 800; font-size: 22px; }
  #promo-card .brand img { width: 40px; height: 40px; border-radius: 10px; }
  #promo-card .eyebrow { margin-top: 34px; font-size: 12px; font-weight: 700; letter-spacing: .22em; }
  #promo-card h1 { margin: 14px 0 0; font: 600 64px/0.98 'Fraunces Variable', Georgia, serif; letter-spacing: -.02em; }
  #promo-card .line { display: block; overflow: hidden; padding: 0 .06em .1em; margin-bottom: -.1em; }
  #promo-card .line > span { display: inline-block; }
  #promo-card h1 em { position: relative; color: #e8663d; font-style: italic; }
  #promo-card .swash { position: absolute; left: -4%; right: -4%; bottom: -.12em; width: 108%; height: .3em; overflow: visible; }
  #promo-card .swash path { fill: none; stroke: #e8663d; stroke-width: 5; stroke-linecap: round; opacity: .85; }
  #promo-card p { margin: 18px 0 0; font-size: 17px; line-height: 1.5; color: #3d5246; }
  #promo-card .pill { position: relative; display: inline-block; overflow: hidden; margin-top: 26px; padding: 13px 22px;
    border-radius: 999px; background: #1b3a2c; color: #fff8ec; font-weight: 700; font-size: 16px;
    box-shadow: 0 14px 30px -12px rgba(27,58,44,.7); }
  #promo-card .shine { position: absolute; top: -20%; bottom: -20%; left: 0; width: 40%;
    background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); transform: translateX(-160%) skewX(-18deg); }
  #promo-card .url { margin-top: 18px; font-size: 13px; letter-spacing: .04em; color: #3d5246; }
  \`;
  const OUT = 'cubic-bezier(.16,1,.3,1)';
  const CURTAIN = 'cubic-bezier(.76,0,.24,1)';
  const ready = () => {
    if (document.getElementById('promo-style')) return;
    const style = document.createElement('style');
    style.id = 'promo-style';
    style.textContent = css;
    document.head.appendChild(style);
    for (const id of ['promo-scrim', 'promo-cap', 'promo-card']) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  };
  const $ = (id) => (ready(), document.getElementById(id));
  const stop = (el) => el.getAnimations().forEach((a) => a.cancel());
  const words = (root) => {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walk.nextNode()) texts.push(walk.currentNode);
    const out = [];
    for (const t of texts) {
      const frag = document.createDocumentFragment();
      for (const part of t.data.split(/(\\s+)/)) {
        if (!part) continue;
        if (/^\\s+$/.test(part)) { frag.append(part); continue; }
        const m = document.createElement('span');
        const s = document.createElement('span');
        m.className = 'wm';
        s.className = 'w';
        s.textContent = part;
        m.append(s);
        frag.append(m);
        out.push(s);
      }
      t.replaceWith(frag);
    }
    return out;
  };
  // Every reveal: hidden → in place, with the hidden state held through its delay.
  const rise = (el, delay, from = 'translateY(18px)', dur = 760) =>
    el.animate([{ opacity: 0, transform: from, filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
      { duration: dur, delay, easing: OUT, fill: 'backwards' });
  const reveal = (card) => {
    let at = 0;
    card.querySelectorAll('.blob').forEach((b, i) =>
      b.animate([{ transform: 'translate(0,0) scale(.9)' }, { transform: i ? 'translate(30px,-24px) scale(1.08)' : 'translate(-26px,30px) scale(1.1)' }],
        { duration: 7000, easing: 'ease-in-out', fill: 'forwards' }));
    card.querySelectorAll('[data-pop]').forEach((el) =>
      el.animate([{ opacity: 0, transform: 'scale(.3) rotate(-14deg)' }, { opacity: 1, transform: 'none' }],
        { duration: 720, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    for (const el of card.querySelectorAll('[data-r], .line > span')) {
      at += el.matches('.line > span') ? 110 : 120;
      if (el.matches('.line > span'))
        el.animate([{ transform: 'translateY(108%) rotate(3deg)' }, { transform: 'none' }], { duration: 950, delay: at, easing: OUT, fill: 'backwards' });
      else rise(el, at);
    }
    card.querySelectorAll('.swash path').forEach((p) =>
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700, delay: at + 250, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' }));
    card.querySelectorAll('.shine').forEach((s) =>
      s.animate([{ transform: 'translateX(-160%) skewX(-18deg)' }, { transform: 'translateX(320%) skewX(-18deg)' }],
        { duration: 1100, delay: at + 700, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'both' }));
    card.querySelectorAll('.pill').forEach((p) =>
      p.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        { duration: 900, delay: at + 1900, easing: 'ease-in-out', iterations: 2 }));
  };
  window.__promo = {
    // A small tag and a headline: the tag wipes in, words rise out of their slots, keywords get a marker.
    caption(html, tag = '') {
      const cap = $('promo-cap');
      const scrim = $('promo-scrim');
      const keepTag = !!html && !!tag && cap.dataset.tag === tag && !!cap.querySelector('.tag');
      const show = () => {
        stop(cap);
        cap.innerHTML = '';
        cap.dataset.tag = html ? tag : '';
        if (!html) {
          scrim.style.opacity = '0';
          scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
          return;
        }
        if (scrim.style.opacity !== '1') {
          scrim.style.opacity = '1';
          scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
        }
        cap.innerHTML = (tag ? '<div class="tag"><i></i><span></span></div>' : '') + '<div class="hl"></div>';
        if (tag) cap.querySelector('.tag span').textContent = tag;
        cap.querySelector('.hl').innerHTML = '<span class="strip">' + html + '</span>';
        const t = cap.querySelector('.tag');
        if (t && !keepTag) {
          t.animate([{ clipPath: 'inset(0 100% 0 0 round 5px)' }, { clipPath: 'inset(0 0 0 0 round 5px)' }], { duration: 480, easing: OUT });
          t.querySelector('span').animate([{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }],
            { duration: 460, delay: 120, easing: OUT, fill: 'backwards' });
          t.querySelector('i').animate([{ transform: 'rotate(-135deg) scale(0)' }, { transform: 'rotate(45deg) scale(1)' }],
            { duration: 560, delay: 60, easing: OUT, fill: 'backwards' });
        }
        const ws = words(cap.querySelector('.hl'));
        cap.querySelector('.strip').animate([{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }],
          { duration: 460, delay: 60, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' });
        const at = (i) => 220 + i * 45;
        ws.forEach((w, i) =>
          w.animate([{ transform: 'translateY(112%)' }, { transform: 'none' }], { duration: 600, delay: at(i), easing: OUT, fill: 'backwards' }));
        cap.querySelectorAll('b').forEach((b) => {
          const first = ws.indexOf(b.querySelector('.w'));
          b.animate([{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }],
            { duration: 420 + b.textContent.length * 12, delay: at(first) + 60, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' });
        });
      };
      const old = [...cap.querySelectorAll('.w')];
      if (!old.length) return show();
      // Out: words slip up out of their slots, the tag and the marker wipe away to the right.
      stop(cap);
      old.forEach((w, i) =>
        w.animate([{ transform: 'none' }, { transform: 'translateY(-112%)' }], { duration: 260, delay: i * 16, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }));
      if (!keepTag) cap.querySelector('.tag')?.animate([{ clipPath: 'inset(0 0 0 0 round 5px)' }, { clipPath: 'inset(0 0 0 100% round 5px)' }],
        { duration: 300, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      cap.querySelectorAll('b, .strip').forEach((b) =>
        b.animate([{ backgroundSize: '100% 100%', backgroundPosition: '100% 0' }, { backgroundSize: '0% 100%', backgroundPosition: '100% 0' }],
          { duration: 300, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }));
      setTimeout(show, 280 + old.length * 16);
    },
    // A fingertip: lands, presses at ~300 ms (when the script clicks), lifts with a ripple.
    touch(x, y) {
      ready();
      const dot = document.createElement('div');
      const ring = document.createElement('div');
      dot.className = 'promo-dot';
      ring.className = 'promo-ring';
      for (const el of [ring, dot]) { el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); }
      dot.animate([
        { opacity: 0, transform: 'scale(1.6)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.22 },
        { opacity: 1, transform: 'scale(.78)', offset: 0.34 },
        { opacity: 1, transform: 'scale(1)', offset: 0.5 },
        { opacity: 1, transform: 'scale(1)', offset: 0.72 },
        { opacity: 0, transform: 'scale(.9)' },
      ], { duration: 950, easing: 'ease-out', fill: 'forwards' });
      ring.animate([{ opacity: 0.9, transform: 'scale(.7)' }, { opacity: 0, transform: 'scale(2.5)' }],
        { duration: 650, delay: 300, easing: OUT, fill: 'both' });
      setTimeout(() => { dot.remove(); ring.remove(); }, 1100);
    },
    // A finger dragging from one point to another over the same time as the scroll it drives.
    swipe(x0, y0, x1, y1, dur) {
      ready();
      const dot = document.createElement('div');
      dot.className = 'promo-dot';
      dot.style.left = x0 + 'px';
      dot.style.top = y0 + 'px';
      document.body.appendChild(dot);
      const dx = x1 - x0, dy = y1 - y0;
      dot.animate([
        { opacity: 0, transform: 'translate(0,0) scale(1.4)' },
        { opacity: 1, transform: 'translate(0,0) scale(.9)', offset: 0.12 },
        { opacity: 1, transform: \`translate(\${dx}px,\${dy}px) scale(.9)\`, offset: 0.86 },
        { opacity: 0, transform: \`translate(\${dx}px,\${dy}px) scale(1)\` },
      ], { duration: dur * 1.3, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      setTimeout(() => dot.remove(), dur * 1.3 + 50);
    },
    scroll(sel, by, dur) {
      const el = document.querySelector(sel);
      if (!el) return;
      window.__smoothScroll(el, el.scrollTop + by, el.scrollLeft, dur);
      const w = innerWidth, h = innerHeight;
      this.swipe(w * 0.62, h * 0.74, w * 0.6, h * 0.74 - Math.min(by, h * 0.5) * 0.7, dur * 0.85);
    },
    into(sel, dur) {
      const el = document.querySelector(sel);
      if (!el) return;
      window.__scrollMs = dur;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.__scrollMs = undefined;
      const w = innerWidth, h = innerHeight;
      this.swipe(w * 0.62, h * 0.76, w * 0.6, h * 0.46, dur * 0.85);
    },
    // Cards: 'now' puts it up at once (its reveal still plays), 'curtain' slides it up over the page.
    card(html, enter = 'curtain') {
      const card = $('promo-card');
      stop(card);
      card.innerHTML = html;
      card.style.transform = 'none';
      if (enter === 'curtain') {
        card.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 820, easing: CURTAIN });
        card.querySelector('.inner')?.animate([{ transform: 'translateY(-34%)' }, { transform: 'none' }], { duration: 820, easing: CURTAIN });
        setTimeout(() => reveal(card), 330);
      } else reveal(card);
    },
    hideCard() {
      const card = $('promo-card');
      card.style.transform = 'translateY(-100%)';
      card.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }], { duration: 860, easing: CURTAIN });
      card.querySelector('.inner')?.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(42%)', opacity: 0.3 }],
        { duration: 860, easing: CURTAIN, fill: 'forwards' });
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
`;

// The farm to film: seeded once per run (sessionStorage remembers it across reloads).
const SEED = `
(() => {
  try {
    if (!sessionStorage.getItem('promo-seeded')) {
      localStorage.setItem(${JSON.stringify(save.key)}, ${JSON.stringify(save.value)});
      sessionStorage.setItem('promo-seeded', '1');
    }
  } catch {}
})();
`;

const BLOBS = '<div class="blob b1"></div><div class="blob b2"></div>';
const BRAND = '<div class="brand"><img data-pop src="/favicon.svg" alt=""><span data-r>Ăn Gì</span></div>';
const SWASH = '<svg class="swash" viewBox="0 0 120 12" preserveAspectRatio="none"><path pathLength="1" stroke-dasharray="1" d="M3 9 C 32 2, 78 2, 117 7"/></svg>';
const INTRO = `${BLOBS}
  <div class="inner">
    ${BRAND}
    <div class="eyebrow" data-r>CÂU HỎI KHÓ NHẤT MỖI NGÀY</div>
    <h1><span class="line"><span>Hôm nay</span></span><span class="line"><span>ăn <em>gì?${SWASH}</em></span></span></h1>
    <p data-r>Để Ăn Gì chọn giúp — từ món ngon ba miền<br>đến nông trại của riêng bạn.</p>
  </div>`;
const BRIDGE = `${BLOBS}
  <div class="inner">
    ${BRAND}
    <h1 style="font-size:50px"><span class="line"><span>Ăn xong…</span></span><span class="line"><span>ra <em>vườn!${SWASH}</em></span></span></h1>
  </div>`;
const OUTRO = (host) => `${BLOBS}
  <div class="inner">
    ${BRAND}
    <h1 style="font-size:56px"><span class="line"><span>Ăn ngon,</span></span><span class="line"><span><em>khỏi nghĩ.${SWASH}</em></span></span></h1>
    <p data-r>Quay món · Đọc chuyện món · Tự trồng, tự nấu</p>
    <div data-r><div class="pill">Mở Ăn Gì ngay ↗<span class="shine"></span></div></div>
    ${host ? `<div class="url" data-r>${host}</div>` : ''}
  </div>`;

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
// Keep the laptop usable while it films.
const pid = browser.process?.()?.pid;
if (pid) spawnSync('wmic', ['process', 'where', `processid=${pid}`, 'CALL', 'setpriority', '16384']);

const context = await browser.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'vi-VN',
  reducedMotion: 'no-preference',
});
for (const script of [TIMEWEB, SCROLL, SEED, OVERLAY]) await context.addInitScript(script);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// ——— The virtual clock: film(ms) advances it one frame at a time and shoots each frame ———
const STEP = 1000 / FPS;
let clock = 0; // ms on this document's timeline (each page load starts again at 0)
let shot = 0;
const tick = async () => {
  clock += STEP;
  await page.evaluate((t) => window.timeweb.goTo(t), clock);
};
const shoot = async () => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 98, optimizeForSpeed: true });
  writeFileSync(join(FRAMES, `f${String(shot++).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
};
const film = async (ms) => {
  for (let i = Math.round(ms / STEP); i > 0; i--) {
    await tick();
    await shoot();
  }
};
// Time passes without filming: only behind a card, before the first frame of a page.
const settle = async (ms) => {
  for (let i = Math.round(ms / STEP); i > 0; i--) await tick();
};
const filmUntil = async (check, max = 4000) => {
  for (let t = 0; t < max; t += STEP) {
    if (await check().catch(() => false)) return true;
    await tick();
    await shoot();
  }
  return false;
};

const promo = {
  caption: (html, tag) => page.evaluate(([h, t]) => window.__promo.caption(h, t), [html, tag]),
  card: (html, enter) => page.evaluate(([h, e]) => window.__promo.card(h, e), [html, enter]),
  hideCard: () => page.evaluate(() => window.__promo.hideCard()),
  scroll: (sel, by, dur = 900) => page.evaluate(([s, b, d]) => window.__promo.scroll(s, b, d), [sel, by, dur]),
  into: (sel, dur = 900) => page.evaluate(([s, d]) => window.__promo.into(s, d), [sel, dur]),
};
// Show the fingertip on the control, click as it presses down.
const press = async (locator) => {
  if (!(await filmUntil(() => locator.isVisible(), 5000))) throw new Error(`Not visible: ${locator}`);
  const box = await locator.boundingBox();
  await page.evaluate(([x, y]) => window.__promo.touch(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
  await film(300);
  await locator.click({ timeout: 4000 });
};
const button = (name) => page.getByRole('button', { name }).first();
const closePanel = async () => {
  const close = page.getByRole('button', { name: 'Đóng' }).last();
  if (await close.isVisible().catch(() => false)) await press(close).catch(() => page.keyboard.press('Escape'));
  else await page.keyboard.press('Escape');
};
const reelSwipe = async () => {
  await page.evaluate(() => window.__promo.swipe(innerWidth * 0.78, innerHeight * 0.4, innerWidth * 0.22, innerHeight * 0.42, 340));
  await film(120);
  await page.keyboard.press('ArrowRight');
};

try {
  // ——— Home: load it, put the intro card up, start filming as its titles come in ———
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await button('Quay món').waitFor({ timeout: 20000 });
  await settle(1500);

  // 1. Intro (≈4 s)
  await promo.card(INTRO, 'now');
  await film(3800);
  await promo.hideCard();
  await film(500);

  // 2. The reel (≈10 s)
  await promo.caption('<b>95 món ngon</b><br>ba miền & thế giới', 'Thực đơn');
  await film(1100);
  for (let i = 0; i < 3; i++) {
    await reelSwipe();
    await film(520);
  }
  await promo.caption('Không biết ăn gì? <b>Quay một vòng!</b>', 'Quay món');
  await film(900);
  await press(button('Quay món'));
  await film(3800);
  await promo.caption('Ra món rồi! Mở <b>câu chuyện</b> của món', 'Ra món');
  await film(2000);

  // 3. The dish's story (≈12 s)
  await press(button('Khám phá món này'));
  await film(1100);
  await promo.caption('Ảnh thật ·<br><b>tìm quán & đặt món</b> ngay', 'Đặt món');
  await film(2300);
  await promo.scroll('.fr-story__scroll', 420);
  await film(1000);
  await promo.scroll('.fr-story__scroll', 560, 1000);
  await film(400);
  await promo.caption('<b>Nguồn gốc</b> của từng món ăn', 'Câu chuyện');
  await film(2000);
  await promo.scroll('.fr-story__scroll', 640, 1000);
  await film(400);
  await promo.caption('<b>Dòng thời gian</b> & ý nghĩa văn hoá', 'Lịch sử');
  await film(2000);
  await promo.scroll('.fr-story__scroll', 900, 1100);
  await film(450);
  await promo.caption('<b>Nguyên liệu</b> & cách thưởng thức', 'Thưởng thức');
  await film(1950);

  // 4. Bridge to the farm: the card slides up, the farm loads behind it (not filmed)
  await promo.caption('');
  await promo.card(BRIDGE, 'curtain');
  await film(2300);
  await page.goto(`${SITE}/journey?sky=noon,clear`, { waitUntil: 'networkidle' });
  clock = 0;
  await page.evaluate(() => document.fonts.ready);
  await promo.card(BRIDGE, 'now');
  // Built: the scene is up and its "building the farm…" note has gone.
  const built = () => page.evaluate(() => !!document.querySelector('.fa-scene') && !document.querySelector('.fa-loading'));
  for (let i = 0; i < 300 && !(await built()); i++) await settle(100);
  if (!(await built())) throw new Error('The farm never finished building');
  await settle(2600);

  // 5. The farm, then a pan to the barn and the pond (≈10 s)
  await promo.hideCard();
  await film(450);
  await promo.caption('<b>Tự trồng, tự nuôi</b> trên nông trại riêng', 'Nông trại');
  await film(2000);
  await press(button(/^Thu hoạch/)).catch(() => {});
  await film(1300);
  await promo.caption('Trang trí vườn,<br><b>khai hoang</b> thêm đất', 'Nông trại');
  await film(2100);
  await press(page.locator('.fg-pan--right').first()).catch(() => {});
  await film(500);
  await promo.caption('<b>Chuồng & ao cá</b> cho thịt, trứng, hải sản', 'Chăn nuôi');
  await film(2600);

  // 6. Guests and the event (≈6 s)
  await promo.caption('');
  await film(400);
  await press(button(/^Đơn$/));
  await film(450);
  await promo.caption('Khách ghé <b>gọi món</b> và sự kiện theo mùa', 'Thực khách');
  await film(1500);
  await promo.into('.fj-event');
  await film(2000);
  await promo.into('.fj-order--guest');
  await film(1600);
  await promo.caption('');
  await closePanel();
  await film(450);

  // 7. Market and cookbook (≈8 s)
  await promo.caption('');
  await film(350);
  await press(button(/^Chợ$/));
  await film(450);
  await promo.caption('<b>Bán nông sản</b> và nâng cấp nông trại', 'Chợ quê');
  await film(500);
  await press(page.getByRole('tab', { name: /^Nâng cấp$/ }).first());
  await film(600);
  await promo.into('.fj-stall');
  await film(1800);
  await promo.caption('');
  await closePanel();
  await film(350);
  await press(button(/Bếp$/));
  await film(450);
  await promo.caption('Sưu tầm món, lên <b>danh hiệu đầu bếp</b>', 'Nhà bếp');
  await film(150);
  await promo.into('#bo-suu-tap', 1000);
  await film(2900);

  // 8. Outro (≈5 s)
  await promo.caption('');
  await promo.card(OUTRO(HOST), 'curtain');
  await film(6150);
} finally {
  await context.close();
  await browser.close();
}

// ——— Frames → H.264, one frame per 1/FPS s ———
if (shot < 10) throw new Error(`Only ${shot} frames filmed`);
const enc = spawnSync(
  ffmpeg,
  [
    '-y', '-framerate', String(FPS), '-i', join(FRAMES, 'f%05d.jpg'),
    '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-r', String(FPS),
    '-movflags', '+faststart', '-an', OUT,
  ],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (enc.status !== 0) throw new Error(enc.stderr.slice(-3000));
const music = ['mp3', 'm4a', 'wav'].map((x) => resolve(`storage/promo-tools/music.${x}`)).find(existsSync);
if (music) {
  const len = shot / FPS;
  const silent = OUT.replace(/\.mp4$/, '.silent.mp4');
  rmSync(silent, { force: true });
  renameSync(OUT, silent);
  const mux = spawnSync(ffmpeg, [
    '-y', '-i', silent, '-i', music, '-filter_complex',
    `[1:a]atrim=0:${len.toFixed(2)},afade=t=in:d=1,afade=t=out:st=${(len - 2).toFixed(2)}:d=2[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT,
  ], { encoding: 'utf8' });
  if (mux.status !== 0) throw new Error(mux.stderr.slice(-3000));
  rmSync(silent, { force: true });
}
const probe = spawnSync(ffmpeg, ['-i', OUT], { encoding: 'utf8' }).stderr;
const duration = probe.match(/Duration: ([\d:.]+)/)?.[1];
writeFileSync(join(WORK, 'report.json'), JSON.stringify({ site: SITE, out: OUT, fps: FPS, frames: shot, duration, errors }, null, 2));
// A contact sheet (one frame every 2.5 s) to check the cut without playing it.
spawnSync(ffmpeg, ['-y', '-i', OUT, '-vf', 'fps=0.4,scale=216:384,tile=8x3', '-frames:v', '1', join(WORK, 'sheet.png')]);
if (errors.length) console.warn('Page errors:', errors);
console.log(`Video exported: ${OUT} (${duration}, ${shot} frames at ${FPS} fps)`);
if (!existsSync(OUT)) process.exit(1);
