import type { Messages } from '../../types';

// English strings for the "farm" namespace. Must mirror vi/farm.ts key for key.
const plots = (n: number) => (n === 1 ? '1 plot' : `${n} plots`);

const farm: Messages['farm'] = {
  common: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset view',
    quality: 'Graphics quality',
    qualityLevels: { low: 'Light', medium: 'Balanced', high: 'Beautiful' },
    flat: '2D',
    plot: (id) => `Plot ${id}`,
    emptyPlot: 'Empty plot',
    srPlot: (id, crop, stage) =>
      `Plot ${id}: ${crop ? `${crop}, ${stage.toLowerCase()}` : 'empty'}`,
    building: 'Building',
    barn: 'Barn',
    chooseSeed: 'Choose a seed',
    seedChip: (seed, count) => `${seed} ×${count}`,
    sow: (seed) => (seed ? `Sow ${seed.toLowerCase()}` : 'Sow'),
    ripe: 'Ripe! Bring it to the barn to cook or fill orders.',
    harvest: (n) => (n > 1 ? `Harvest all ${n} plots` : 'Harvest'),
    growing: (stage, left) => `${stage} · ${left} left`,
    water: (pct, cans) => `Water (−${pct}%) · ${cans} left`,
    stockItem: (name, count) => `${name} ×${count}`,
    goMarket: 'Go to the market',
  },
  garden3d: {
    buildings: {
      kitchen: 'Cô Ba’s kitchen',
      barn: 'Barn',
      well: 'Well',
      chicken: 'Chicken coop',
      cow: 'Cow shed',
      pond: 'Fish pond',
    },
    close: 'Close',
    srList: '3D garden',
    hud: (level, into, span, coins) =>
      `Level ${level}, ${into}/${span} XP, ${coins} ${coins === 1 ? 'coin' : 'coins'}`,
    hudLevel: (level) => `Level ${level}`,
    wateringHint: (cans) =>
      `Tap a plot with a blue outline to water it · ${cans} ${cans === 1 ? 'can' : 'cans'} left`,
    harvestHint: (n) => `Harvest ${n} ripe ${n === 1 ? 'plot' : 'plots'}`,
    arrange: {
      label: 'Arrange decorations',
      kicker: 'Arrange',
      pickTitle: 'Pick a decoration',
      moveHint: 'Tap a glowing spot on the grass to move it there.',
      pickHint: 'Tap the scarecrow, a lantern or the water jar on the island.',
      putBack: (name) => `Put back the ${name.toLowerCase()}`,
      rotate: 'Rotate',
      store: 'Put in storage',
      done: 'Done',
    },
    plot: {
      seedsEmpty: 'No seeds left. Every dish you pick sends back a seed.',
      wet: ' · soil still damp',
      emptyCan: ' · no water left today',
    },
    kitchen: {
      text: 'Cô Ba cooks with what’s in the barn. When you have enough, it’s one tap.',
      recipes: 'See recipes',
      orders: 'Cô Ba’s orders',
    },
    barn: {
      empty: 'The barn is empty — harvest to get ingredients.',
    },
    well: {
      text: (cans, perDay, pct) =>
        `${cans}/${perDay} waterings left today. Each one cuts ${pct}% off the time remaining.`,
      stop: 'Put the watering can away',
      start: 'Draw water for the plants',
    },
    pond: {
      idle: (left, perDay) =>
        `Cast your line, wait for the float to sink, then pull. ${left}/${perDay} casts left today — fish and shrimp go to the barn for cooking.`,
      done: 'That’s enough fishing for today. The fish will bite again tomorrow.',
      waiting: 'The float is bobbing… waiting for a bite.',
      bite: 'The float sank! Pull now!',
      caught: (kind) => `You caught a ${kind.toLowerCase()}! It’s in the barn.`,
      missed: 'It got away — cast again (you keep your turn).',
      cast: 'Cast',
      hook: 'Pull!',
      reelIn: 'Reel in',
    },
    animal: {
      units: {
        chicken: (n) => (n === 1 ? 'egg' : 'eggs'),
        cow: (n) => (n === 1 ? 'bottle of milk' : 'bottles of milk'),
      },
      locked: (level) => `Unlocks at level ${level}.`,
      feedHint: (feed, hours, n, unit) =>
        `Feed 1 ${feed.toLowerCase()} → ${n} ${unit} in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`,
      needFeed: (feed) => `You need 1 ${feed.toLowerCase()} in the barn to feed them.`,
      busy: (left) => `Full and happy · ${left} left.`,
      ready: (n, unit) => `${n} ${unit} ready to collect!`,
      feed: 'Feed',
      collect: (product) => `Collect ${product.toLowerCase()}`,
    },
    signs: {
      unlockAt: (level) => `Unlocks at level ${level}`,
      hungry: 'Hungry',
      ready: 'Ready!',
      kitchen: 'Cô Ba’s kitchen',
      barn: 'Barn',
      bite: 'A bite!',
    },
  },
  pc: {
    badge: 'PlayCanvas · experiment',
    loading: 'Building the garden corner…',
    errors: {
      load: 'Couldn’t load the 3D scene (your device may not support WebGL 2, or the connection dropped).',
      timeout: 'The 3D scene is taking too long to load.',
      lost: 'The browser paused 3D graphics.',
    },
    errorText: 'Your garden progress is safe — pick another view or try again.',
    retry: 'Try again',
    useFlat: 'Use the 2D garden',
    useClassic: 'Use the classic 3D',
    barLabel: 'Garden corner actions',
    srList: '3D garden corner',
    deselect: 'Deselect',
    kicker: 'Garden corner',
    idleTitle: 'Tap a bed or the barn',
    statReady: (n) => `${n} ripe`,
    statEmpty: (n) => `${n} empty`,
    statCans: (cans, perDay) => `${cans}/${perDay} waterings`,
    barnEmpty: 'The barn is empty — harvest ripe plots to get ingredients.',
    seedsEmpty: 'No seeds left. Every dish you pick sends back a seed.',
    growProgress: 'Growth',
    planted: (seed, plotId) => `Sowed ${seed.toLowerCase()} in plot ${plotId}.`,
    watered: (plotId) => `Watered plot ${plotId}.`,
    harvested: (n) => `Harvested ${plots(n)} into the barn.`,
    blocks: {
      'no-plot': 'Couldn’t find that plot.',
      occupied: 'Something is already growing here.',
      'no-seed': 'You’re out of that seed.',
      'not-growing': 'Only growing plants can be watered.',
      wet: 'The soil is still damp — water again in 1 hour.',
      'empty-can': 'No waterings left today.',
      'nothing-ready': 'Nothing is ripe yet.',
      busy: 'Still working on the last action…',
      rejected: 'That didn’t work.',
    },
  },
  anim: {
    title: 'Farm on a floating island',
    loading: 'Building the farm…',
    lockLevel: (level: number | string) => `Level ${level}`,
  },
};

export default farm;
