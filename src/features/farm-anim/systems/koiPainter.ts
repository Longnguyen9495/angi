/**
 * Draws a koi seen from above, in the painting's style: cream body with coloured patches, a
 * dark brown ink outline, translucent fins. The body is built round a flexible spine, so it bends
 * when it swims and curls into turns instead of being a stiff picture that rotates.
 *
 * Local frame: +x is where the fish faces, the spine runs from the nose (s = 0) to the tail (s = 1).
 * The caller squashes y for the 3/4 view, so the fish keeps the right perspective at any heading.
 */

export interface KoiLook {
  length: number;
  base: string;
  /** [s along the body 0..1, across −1..1, radius along (× length), radius across (× half width), colour]. */
  patches: [number, number, number, number, string][];
  fin: string;
}

export const KOI_LOOKS: KoiLook[] = [
  // Kohaku: white with big red patches.
  {
    length: 67,
    base: '#fff6ec',
    patches: [
      [0.12, 0, 0.09, 1.1, '#e64a2e'],
      [0.42, 0.25, 0.14, 1.2, '#e64a2e'],
      [0.7, -0.3, 0.08, 0.9, '#ec5a32'],
    ],
    fin: 'rgba(255,246,236,0.93)',
  },
  // Orange and white with a few ink spots.
  {
    length: 60,
    base: '#fff3e2',
    patches: [
      [0.2, -0.2, 0.12, 1.2, '#ff8a2b'],
      [0.5, 0.35, 0.1, 1, '#ff8a2b'],
      [0.62, -0.5, 0.04, 0.5, '#33302f'],
      [0.32, 0.55, 0.035, 0.45, '#33302f'],
    ],
    fin: 'rgba(255,236,214,0.93)',
  },
  // Golden ogon, lighter along the back.
  {
    length: 63,
    base: '#ffb53c',
    patches: [
      [0.35, 0, 0.3, 0.45, '#ffd27a'],
      [0.1, 0, 0.07, 0.8, '#ffc65a'],
    ],
    fin: 'rgba(255,214,140,0.93)',
  },
  // Sanke: white, orange, black.
  {
    length: 65,
    base: '#fffaf3',
    patches: [
      [0.15, 0.1, 0.08, 1.1, '#ff7a24'],
      [0.46, -0.2, 0.12, 1.15, '#ff7a24'],
      [0.36, 0.5, 0.04, 0.55, '#2e2b2b'],
      [0.72, 0.2, 0.05, 0.6, '#2e2b2b'],
    ],
    fin: 'rgba(255,248,240,0.93)',
  },
  // Small orange one.
  {
    length: 50,
    base: '#ff9a3a',
    patches: [
      [0.4, -0.4, 0.1, 0.9, '#fff3e4'],
      [0.12, 0.2, 0.05, 0.7, '#fff3e4'],
    ],
    fin: 'rgba(255,220,180,0.93)',
  },
];

/** Half width of the body along the spine, × length. */
const PROFILE: [number, number][] = [
  [0, 0.04],
  [0.04, 0.091],
  [0.1, 0.134],
  [0.25, 0.165],
  [0.45, 0.149],
  [0.65, 0.1],
  [0.8, 0.055],
  [0.88, 0.037],
];
function halfWidth(s: number) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [s1, w1] = PROFILE[i]!;
    const [s0, w0] = PROFILE[i - 1]!;
    if (s <= s1) return w0 + ((w1 - w0) * (s - s0)) / (s1 - s0);
  }
  return 0.03;
}

const OUTLINE = '#6b3415';
const N = 14;
const BODY_END = 0.88;

/**
 * @param wag  swim phase (radians), drives the travelling body wave
 * @param amp  wave size 0..1 (faster swimming = bigger)
 * @param curl bend into a turn, −1..1
 */
export function drawKoi(
  ctx: CanvasRenderingContext2D,
  look: KoiLook,
  wag: number,
  amp: number,
  curl: number,
) {
  const L = look.length;
  // Spine: from nose (+L/2) back to the tail; the wave grows towards the tail and the whole body
  // curls into a turn.
  const pts: [number, number, number, number][] = []; // x, y, nx, ny
  let px = L / 2;
  let py = 0;
  const step = (L * BODY_END) / N;
  const spine: [number, number][] = [[px, py]];
  for (let i = 1; i <= N + 3; i++) {
    const s = i / N;
    const wave = Math.sin(wag - s * 4.4) * 0.17 * amp * s;
    const ang = curl * 0.5 * s + wave;
    px -= Math.cos(ang) * step;
    py -= Math.sin(ang) * step;
    spine.push([px, py]);
  }
  for (let i = 0; i <= N; i++) {
    const [x0, y0] = spine[Math.max(0, i - 1)]!;
    const [x1, y1] = spine[Math.min(spine.length - 1, i + 1)]!;
    const dx = x0 - x1;
    const dy = y0 - y1;
    const l = Math.hypot(dx, dy) || 1;
    const [x, y] = spine[i]!;
    pts.push([x, y, -dy / l, dx / l]);
  }
  const sOf = (i: number) => (i / N) * BODY_END;

  // Pectoral fins (under the body), paddling a little.
  const [fx, fy, fnx, fny] = pts[Math.round(N * 0.22)]!;
  const paddle = Math.sin(wag * 0.7) * 0.25;
  ctx.fillStyle = look.fin;
  ctx.strokeStyle = 'rgba(107,52,21,0.45)';
  ctx.lineWidth = 0.6;
  const hwFin = halfWidth(0.22) * L;
  for (const side of [-1, 1]) {
    // Fin root on the flank; the fin sweeps back and out, and paddles.
    const cx = fx + fnx * hwFin * side * 1.05 - L * 0.045;
    const cy = fy + fny * hwFin * side * 1.05;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy + side * L * 0.025,
      L * 0.085,
      L * 0.038,
      side * (0.75 + paddle),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }

  // Tail fin: a translucent fan off the last spine points, swinging after the body.
  const tail = spine[N]!;
  const tip = spine[spine.length - 1]!;
  const tdx = tip[0] - tail[0];
  const tdy = tip[1] - tail[1];
  const tl = Math.hypot(tdx, tdy) || 1;
  const ux = tdx / tl;
  const uy = tdy / tl;
  const spread = L * 0.13;
  const reach = L * 0.24;
  const lobe = (side: number): [number, number] => [
    tail[0] + ux * reach - uy * spread * side,
    tail[1] + uy * reach + ux * spread * side,
  ];
  const [ax, ay] = lobe(1);
  const [bx, by] = lobe(-1);
  ctx.fillStyle = look.fin;
  ctx.strokeStyle = 'rgba(107,52,21,0.6)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(tail[0] - uy * L * 0.02, tail[1] + ux * L * 0.02);
  ctx.quadraticCurveTo(
    tail[0] + ux * reach * 0.5 - uy * spread * 1.1,
    tail[1] + uy * reach * 0.5 + ux * spread * 1.1,
    ax,
    ay,
  );
  ctx.quadraticCurveTo(tail[0] + ux * reach * 0.55, tail[1] + uy * reach * 0.55, bx, by);
  ctx.quadraticCurveTo(
    tail[0] + ux * reach * 0.5 + uy * spread * 1.1,
    tail[1] + uy * reach * 0.5 - ux * spread * 1.1,
    tail[0] + uy * L * 0.02,
    tail[1] - ux * L * 0.02,
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Fin rays.
  ctx.strokeStyle = 'rgba(200,120,70,0.35)';
  ctx.lineWidth = 0.5;
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(tail[0], tail[1]);
    ctx.lineTo(
      tail[0] + ux * reach * 0.85 - uy * spread * k,
      tail[1] + uy * reach * 0.85 + ux * spread * k,
    );
    ctx.stroke();
  }

  // Body outline: one side down, the other back, smoothed through midpoints.
  const side = (sg: number) =>
    pts.map(
      ([x, y, nx, ny], i) =>
        [x + nx * halfWidth(sOf(i)) * L * sg, y + ny * halfWidth(sOf(i)) * L * sg] as [
          number,
          number,
        ],
    );
  const left = side(1);
  const right = side(-1).reverse();
  const ring = [...left, ...right];
  const body = new Path2D();
  const first = ring[0]!;
  body.moveTo(first[0], first[1]);
  for (let i = 1; i < ring.length; i++) {
    const [x0, y0] = ring[i]!;
    const [x1, y1] = ring[(i + 1) % ring.length]!;
    body.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  body.closePath();
  ctx.fillStyle = look.base;
  ctx.fill(body);

  // Patches follow the spine, clipped to the body.
  ctx.save();
  ctx.clip(body);
  for (const [s, across, rs, ra, color] of look.patches) {
    const i = Math.min(N, Math.max(0, Math.round((s / BODY_END) * N)));
    const [x, y, nx, ny] = pts[i]!;
    const hw = halfWidth(s) * L;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x + nx * hw * across,
      y + ny * hw * across,
      rs * L,
      ra * hw,
      Math.atan2(-nx, ny),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // Soft shading on the flanks and a sheen down the back.
  ctx.strokeStyle = 'rgba(120,60,30,0.16)';
  ctx.lineWidth = L * 0.06;
  ctx.stroke(body);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = L * 0.025;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 1; i < N - 3; i++) {
    const [x, y, nx, ny] = pts[i]!;
    const o = halfWidth(sOf(i)) * L * 0.25;
    if (i === 1) ctx.moveTo(x + nx * o, y + ny * o);
    else ctx.lineTo(x + nx * o, y + ny * o);
  }
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = 'round';
  ctx.stroke(body);

  // Eyes near the nose, on both sides of the head.
  const [ex, ey, enx, eny] = pts[1]!;
  const eo = halfWidth(sOf(1)) * L * 0.62;
  ctx.fillStyle = '#2b1a10';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(ex + enx * eo * sg, ey + eny * eo * sg, L * 0.016, 0, Math.PI * 2);
    ctx.fill();
  }
}
