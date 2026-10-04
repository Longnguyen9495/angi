import type { Messages } from '../../types';

// English strings for the "domain" namespace. Must mirror vi/domain.ts key for key.
const domain: Messages['domain'] = {
  orderLines: [
    'The eatery is packed at lunch — Cô Ba urgently needs a few ingredients.',
    'Cô Ba is simmering a pot of broth and is just a little short.',
    'Guests booked a feast for tonight — lend Cô Ba a hand!',
    'Cô Ba wants to try a new dish and needs fresh produce from the garden.',
    'The morning market sold out, so Cô Ba is counting on your garden.',
    'A pot of sour soup is waiting — it only needs a few things from the garden.',
  ],
  guests: [
    {
      id: 'ba-tu',
      name: 'Grandma Tư',
      from: 'Bà Chiểu market',
      ask: (dish) => `I haven't had proper ${dish} in ages — would you cook me a bowl, dear?`,
    },
    {
      id: 'chu-hai',
      name: 'Uncle Hai, motorbike taxi',
      from: 'the alley corner',
      ask: (dish) => `Riding all morning on an empty stomach — a plate of ${dish}, please.`,
    },
    {
      id: 'co-lan',
      name: 'Teacher Lan',
      from: 'the village school',
      ask: (dish) => `I teach again this afternoon; could you make me some ${dish} to take along?`,
    },
    {
      id: 'anh-minh',
      name: 'Minh',
      from: 'an office in town',
      ask: (dish) => `The whole office ordered ${dish} for lunch — make mine a good one!`,
    },
    {
      id: 'ong-bay',
      name: 'Old Bảy the fisherman',
      from: 'the jetty',
      ask: (dish) => `Back from the sea and worn out — I'd love some hot ${dish}.`,
    },
    {
      id: 'chi-hanh',
      name: 'Hạnh',
      from: 'the sticky-rice stall',
      ask: (dish) => `Sold all my sticky rice; time for a change — some ${dish}, please.`,
    },
    {
      id: 'be-na',
      name: 'Little Na',
      from: 'next door',
      ask: (dish) => `Mum gave me money for ${dish}! I'll wait right here!`,
    },
    {
      id: 'mark',
      name: 'Mark',
      from: 'a traveller',
      ask: (dish) => `Everyone says I have to try ${dish} — could you cook it for me?`,
    },
  ],
  recovery: {
    oldVersion: 'Your saved data came from an older version, so the farm has started over.',
    corrupt: 'The data saved on this device was damaged, so the farm has started over.',
    unreadable: 'The data saved on this device could not be read, so the farm has started over.',
  },
  relax: {
    budget: (label: string) => `Remove the “${label}” budget limit`,
    vegetarian: 'Turn off “Vegetarian only”',
    moods: 'Clear the mood choices',
    avoid: (label: string) => `Stop avoiding “${label}”`,
    hidden: 'Show hidden dishes again',
  },
  plotStage: {
    empty: 'Empty plot',
    sprout: 'Sprout',
    young: 'Growing',
    flowering: 'Flowering',
    ready: 'Ready to harvest',
  },
  slot: {
    breakfast: 'breakfast',
    lunch: 'lunch',
    dinner: 'dinner',
  },
  duration: {
    minutes: (m: number) => `${m} min`,
    hours: (h: number) => (h === 1 ? '1 hour' : `${h} hours`),
    hoursMinutes: (h: number, m: number) => `${h} h ${m} min`,
  },
};

export default domain;
