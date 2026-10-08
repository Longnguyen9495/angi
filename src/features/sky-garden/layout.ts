import { SLOTS_PER_FLOOR } from '../../data/skyGarden';

/*
 * Where everything sits on screen, in CSS px of the scrolling content (plans/vuon-may.md §0.7,
 * §18.4, Q4). Pure functions: the scene lerps between two layouts to zoom from the whole tower
 * (overview) to one floor (focus), so slot ids, pots and plants never change with the layout.
 *
 * - overview: every floor is one row of six pots, floors stacked bottom-up above the village,
 *   scrolled vertically; it is for looking and choosing a floor, pots may be small here.
 * - focus 'row': the chosen floor zoomed in, still one row of six; on a phone it is wider than the
 *   screen and pans sideways, every pot and bug at least MIN_TAP px.
 * - focus 'grid': the chosen floor as two rows of three (the fallback of Q4), no panning.
 */

export type ViewMode = 'overview' | 'focus';
export type FocusShape = 'row' | 'grid';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorLayout {
  /** The cloud platform the pots stand on. */
  platform: Rect;
  /** The machine at the left end of the floor. */
  machine: Rect;
  /** Floor number plate. */
  sign: Rect;
  /** One square box per slot, the pot drawn inside it (bottom edge = where it stands). */
  slots: Rect[];
  /** Grid focus: a second cloud under the upper row of pots (the platform carries the lower one). */
  shelf?: Rect;
}

export interface SceneLayout {
  mode: ViewMode;
  shape: FocusShape;
  /** Scrolling content size; larger than the view on the axis that pans. */
  width: number;
  height: number;
  pan: 'x' | 'y' | 'none';
  /** Side of a pot box. */
  cell: number;
  /** The beanstalk column (left), full content height. */
  stalk: Rect;
  /** Village strip at the foot of the tower (overview only; empty in focus). */
  ground: Rect;
  floors: FloorLayout[];
  /** Focus: the floor in view. */
  focus: number | null;
}

/** Smallest tap target on a phone (§0.7, §14). */
export const MIN_TAP = 44;
/** Above this width the page is a tablet or desktop: wider gutters, the tower centred. */
export const WIDE = 600;
/** Smallest pot box when one floor is zoomed in: pot, plant and bug stay easy to tap. */
export const FOCUS_CELL = 96;
/** The tower never grows wider than this (desktop), it is centred instead. */
const MAX_TOWER = 1100;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function gutter(viewW: number) {
  return viewW >= WIDE ? 24 : 12;
}

/** A floor is this many pot boxes tall: plants, bugs and bubbles rise above the pots. */
const FLOOR_H = 2.15;
/** Platform thickness, in pot boxes. */
const PLATFORM_H = 0.42;

function floorRow(x0: number, top: number, cell: number, machineW: number, right: number) {
  // Pots stand on the platform; the platform's top edge is a little above their bottom edge so
  // they look set into the cloud rather than balanced on it.
  const potY = top + cell * (FLOOR_H - PLATFORM_H - 0.78);
  const rowX = x0 + machineW;
  const slots = Array.from({ length: SLOTS_PER_FLOOR }, (_, i) => ({
    x: rowX + i * cell,
    y: potY,
    w: cell,
    h: cell,
  }));
  const platformTop = potY + cell * 0.8;
  return {
    platform: {
      x: x0 - machineW * 0.15,
      y: platformTop,
      w: right - x0 + machineW * 0.15,
      h: cell * PLATFORM_H,
    },
    machine: { x: x0, y: potY - cell * 0.25, w: machineW, h: machineW },
    sign: {
      x: x0 + machineW * 0.15,
      y: platformTop + cell * PLATFORM_H * 0.35,
      w: cell * 0.42,
      h: cell * 0.42,
    },
    slots,
  } satisfies FloorLayout;
}

/** The whole tower: one row of six per floor, floor 0 at the bottom. */
export function layoutOverview(viewW: number, viewH: number, floorCount: number): SceneLayout {
  const g = gutter(viewW);
  const towerW = Math.min(viewW, MAX_TOWER);
  const left = (viewW - towerW) / 2;
  const stalkW = clamp(towerW * 0.09, 26, 84);
  const machineW = clamp(towerW * 0.15, 40, 150);
  const x0 = left + g + stalkW * 0.55;
  const right = left + towerW - g;
  const cell = (right - x0 - machineW) / SLOTS_PER_FLOOR;
  // Tall enough that the hint and the action bar at the foot cover village, not floor 1.
  const groundH = clamp(viewH * 0.18, 120, 200);
  const skyTop = clamp(viewH * 0.12, 56, 140);
  // On a tall phone a few floors would huddle at the bottom under an empty sky: spread them up
  // to fill the screen, but never further apart than a floor and a half.
  const floorH = clamp(
    (viewH - skyTop - groundH) / floorCount,
    cell * FLOOR_H,
    cell * FLOOR_H * 1.5,
  );
  const height = Math.max(viewH, skyTop + floorCount * floorH + groundH);
  const floors = Array.from({ length: floorCount }, (_, i) =>
    floorRow(x0, height - groundH - (i + 1) * floorH, cell, machineW, right),
  );
  return {
    mode: 'overview',
    shape: 'row',
    width: viewW,
    height,
    pan: height > viewH ? 'y' : 'none',
    cell,
    stalk: { x: left + g, y: 0, w: stalkW, h: height - groundH * 0.35 },
    ground: { x: 0, y: height - groundH, w: viewW, h: groundH },
    floors,
    focus: null,
  };
}

/**
 * One floor zoomed in. The other floors keep their overview boxes (the scene fades them out),
 * so a transition only moves the floor in focus.
 */
export function layoutFocus(
  viewW: number,
  viewH: number,
  floorCount: number,
  floor: number,
  shape: FocusShape,
): SceneLayout {
  const base = layoutOverview(viewW, viewH, floorCount);
  const g = gutter(viewW);
  const wide = viewW >= WIDE;
  const stalkW = wide ? clamp(viewW * 0.05, 30, 60) : 40;
  // Room left for the HUD bar on top and the action bar at the bottom.
  const top = clamp(viewH * 0.1, 56, 96);
  const bottom = clamp(viewH * 0.14, 72, 120);
  const usableH = viewH - top - bottom;
  let floorLayout: FloorLayout;
  let width = viewW;
  let cell: number;
  if (shape === 'row') {
    const machineW = wide ? clamp(viewW * 0.12, 80, 150) : 76;
    const x0 = g + stalkW * 0.55;
    // A wide screen fits all six when the pots stay big enough; a phone shows about 3⅓ pots
    // and pans sideways.
    const byHeight = usableH / FLOOR_H;
    const fitAll = (viewW - x0 - machineW - g) / SLOTS_PER_FLOOR;
    cell =
      fitAll >= FOCUS_CELL
        ? Math.min(fitAll, byHeight)
        : Math.min(byHeight, Math.max(FOCUS_CELL, (viewW - x0 - g) / 3.4));
    const right = x0 + machineW + cell * SLOTS_PER_FLOOR;
    width = Math.max(viewW, right + g);
    const y = top + (usableH - cell * FLOOR_H) / 2;
    floorLayout = floorRow(x0, y, cell, machineW, right);
  } else {
    // Two rows of three under a header strip (machine + floor plate), the beanstalk on the left.
    const header = 56;
    const x0 = g + stalkW;
    const rowH = 1.75;
    cell = Math.min((viewW - x0 - g) / 3, (usableH - header) / (2 * rowH));
    const gridW = cell * 3;
    const gx = x0 + (viewW - x0 - g - gridW) / 2;
    const y = top + (usableH - header - 2 * rowH * cell) / 2;
    const slots = Array.from({ length: SLOTS_PER_FLOOR }, (_, i) => ({
      x: gx + (i % 3) * cell,
      y: y + header + Math.floor(i / 3) * rowH * cell + cell * (rowH - 1.05),
      w: cell,
      h: cell,
    }));
    floorLayout = {
      platform: {
        x: gx - cell * 0.2,
        y: slots[3]!.y + cell * 0.8,
        w: gridW + cell * 0.4,
        h: cell * PLATFORM_H,
      },
      shelf: {
        x: gx - cell * 0.2,
        y: slots[0]!.y + cell * 0.8,
        w: gridW + cell * 0.4,
        h: cell * PLATFORM_H,
      },
      machine: { x: x0, y, w: header, h: header },
      sign: { x: x0 + header + 8, y: y + 10, w: 36, h: 36 },
      slots,
    };
  }
  const floors = base.floors.map((f, i) => (i === floor ? floorLayout : f));
  return {
    mode: 'focus',
    shape,
    width,
    height: viewH,
    pan: width > viewW ? 'x' : 'none',
    cell,
    stalk: { x: g, y: 0, w: stalkW, h: viewH },
    ground: { x: 0, y: viewH, w: viewW, h: 0 },
    floors,
    focus: floor,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
}

/** A layout part way between two (0 = a, 1 = b), for the zoom between overview and focus. */
export function lerpLayout(a: SceneLayout, b: SceneLayout, t: number): SceneLayout {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    ...b,
    width: lerp(a.width, b.width, t),
    height: lerp(a.height, b.height, t),
    cell: lerp(a.cell, b.cell, t),
    stalk: lerpRect(a.stalk, b.stalk, t),
    ground: lerpRect(a.ground, b.ground, t),
    floors: b.floors.map((f, i) => {
      const s = a.floors[i] ?? f;
      return {
        platform: lerpRect(s.platform, f.platform, t),
        machine: lerpRect(s.machine, f.machine, t),
        sign: lerpRect(s.sign, f.sign, t),
        // A grid's upper shelf grows out of the platform when zooming in, and back into it.
        ...(f.shelf || s.shelf
          ? { shelf: lerpRect(s.shelf ?? s.platform, f.shelf ?? f.platform, t) }
          : {}),
        slots: f.slots.map((r, j) => lerpRect(s.slots[j] ?? r, r, t)),
      };
    }),
  };
}

/** Which slot a content point is in (pots only), or null. */
export function slotAt(l: SceneLayout, floor: number, x: number, y: number): number | null {
  const f = l.floors[floor];
  if (!f) return null;
  const i = f.slots.findIndex(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y - r.h * 0.6 && y <= r.y + r.h,
  );
  return i < 0 ? null : i;
}

/** Which floor a content point is over (its whole band, platform included), or null. */
export function floorAt(l: SceneLayout, x: number, y: number): number | null {
  for (let i = 0; i < l.floors.length; i++) {
    const f = l.floors[i]!;
    const top = f.slots[0]!.y - f.slots[0]!.h * 0.9;
    const bottom = f.platform.y + f.platform.h;
    if (y >= top && y <= bottom && x >= f.machine.x - 10 && x <= f.platform.x + f.platform.w + 10)
      return i;
  }
  return null;
}
