import type { Messages } from '../../types';

// English strings for the "ranch" namespace. Must mirror vi/ranch.ts key for key.
const ranch: Messages['ranch'] = {
  menu: 'Ranch',
  title: 'Ranch',
  intro:
    'Feed your animals with produce from the pantry, let them work, then collect into the pantry. Tap an animal, the hive or the pond and they respond.',
  pens: {
    title: 'Animal pens',
    empty: (animal, level) => `The pen is empty — ${animal} arrives at level ${level}.`,
    summary: (n, ready, hungry) =>
      `${n} ${n === 1 ? 'animal' : 'animals'} in the pen: ${ready} ready to collect, ${hungry} hungry.`,
  },
  state: {
    hungry: 'Hungry',
    busy: (left) => `Working · ${left} left`,
    ready: 'Ready to collect',
    locked: (level) => `Opens at level ${level}`,
  },
  feed: (feed, have) => `Feed ${feed} · ${have} left`,
  feedLabel: (animal, feed, have) => `Feed the ${animal} 1 ${feed}, ${have} in the pantry`,
  noFeed: (feed) => `No ${feed} — harvest some or buy at the market`,
  collect: (qty, product) => `Collect ${qty} ${product}`,
  collectLabel: (animal, qty, product) => `Collect ${qty} ${product} from the ${animal}`,
  hive: {
    title: 'Beehive',
    locked: (level) => `The beehive opens at level ${level}.`,
    idle: 'The hive is empty — call the bees home to make honey.',
    filling: (left) => `The bees are making honey · ${left} left`,
    ready: 'The hive is full of honey!',
    start: 'Call the bees home',
    collect: 'Take the honey',
    collectLabel: (list) => `Take ${list} into the pantry`,
    started: (when) => `The bees are home. Honey in ${when}.`,
    collected: (list) => `Took ${list} into the pantry. The bees start a new batch.`,
  },
  pond: {
    title: 'Fish pond',
    living: (list) => `In the pond: ${list}.`,
    next: (name, level) => `${name} joins the pond at level ${level}.`,
    hint: 'Tap the water to scatter feed for the fish. To fish, use the pond in the garden.',
  },
  boat: {
    title: 'Fishing boat',
    locked: (level) => `The boat opens at level ${level}.`,
    docked: 'The boat is moored at the jetty.',
    away: (left) => `The boat is out at sea · back in ${left}`,
    back: 'The boat is back with a full hold!',
    send: 'Send the boat out',
    unload: 'Unload into the pantry',
    sent: (when) => `The boat has set out. Back in ${when}.`,
    unloaded: (list) => `The boat brought back: ${list}. Stored in the pantry.`,
  },
  qty: (n, name) => `${n} ${name}`,
  and: ' and ',
};

export default ranch;
