import type { Messages } from '../../types';

// English strings for the "data" namespace. Must mirror vi/data.ts key for key.
const data: Messages['data'] = {
  crops: {
    rice: { name: 'Rice', seedName: 'Rice seed', produceName: 'Rice' },
    herbs: { name: 'Herbs', seedName: 'Herb seed', produceName: 'Herbs' },
    chili: { name: 'Chili', seedName: 'Chili seed', produceName: 'Chili' },
    scallion: { name: 'Scallion', seedName: 'Scallion bulb', produceName: 'Scallion' },
    bean: { name: 'Beans', seedName: 'Bean seed', produceName: 'Beans' },
    tomato: { name: 'Tomato', seedName: 'Tomato seed', produceName: 'Tomato' },
    lemongrass: { name: 'Lemongrass', seedName: 'Lemongrass cutting', produceName: 'Lemongrass' },
    garlic: { name: 'Garlic', seedName: 'Garlic clove', produceName: 'Garlic' },
    cucumber: { name: 'Cucumber', seedName: 'Cucumber seed', produceName: 'Cucumber' },
    lime: { name: 'Lime', seedName: 'Lime sapling', produceName: 'Lime' },
  },
  recipes: {
    'com-tam': {
      unlockNote: 'Starter recipe — open for every guest.',
      fact: 'Cơm tấm was first made from rice grains broken during milling; today it is a Saigon classic.',
    },
    'bun-rieu': {
      unlockNote: 'Open from the start — needs three ingredients.',
      fact: 'Riêu is made from pounded paddy crab, strained and simmered until the crab roe gathers into soft curds.',
    },
    'bun-bo-hue': {
      unlockNote: 'Open from the start — a four-ingredient recipe.',
      fact: 'Bún bò Huế broth gets its aroma from lemongrass and fermented shrimp paste; its noodles are thicker than usual.',
    },
    'goi-cuon': {
      unlockNote: 'Opens with Southern Vietnam — shrimp come from the pond.',
      fact: 'Gỏi cuốn is never fried: rice paper is just dipped in water and rolled around shrimp, pork, noodles and fresh greens.',
    },
    'banh-xeo': {
      unlockNote: 'Opens with Southern Vietnam.',
      fact: 'Bánh xèo is named after the sizzle ("xèo") the rice batter makes as it hits the hot pan.',
    },
    'bo-luc-lac': {
      unlockNote: 'Opens with Southern Vietnam — needs garlic and cucumber.',
      fact: 'Diced beef is tossed around a very hot pan, hence the name "lúc lắc" — "shaking".',
    },
    'mi-quang': {
      unlockNote: 'Opens with Central Vietnam.',
      fact: 'Mì Quảng comes with just a splash of very rich broth, plus toasted rice crackers and peanuts.',
    },
    'com-ga-hoi-an': {
      unlockNote: 'Opens with Central Vietnam — needs lime.',
      fact: 'The rice is cooked in chicken stock with a little turmeric, so it turns golden and fragrant.',
    },
    'nem-nuong': {
      unlockNote: 'Opens with Central Vietnam — needs garlic and cucumber.',
      fact: 'The pork sausage is grilled over charcoal, then rolled with fresh greens and cucumber and dipped in a liver sauce.',
    },
    'pho-bo': {
      unlockNote: 'Opens with Northern Vietnam — needs lime.',
      fact: 'Phở broth stays clear because beef bones simmer gently for hours with ginger, charred onion and star anise.',
    },
    'bun-cha': {
      unlockNote: 'Opens with Northern Vietnam — needs garlic.',
      fact: 'The pork patties are grilled over charcoal and dropped into a sweet-and-sour dipping sauce with pickled garlic and chili.',
    },
    'banh-cuon': {
      unlockNote: 'Opens with Northern Vietnam.',
      fact: 'The rice sheets are steamed on cloth stretched over boiling water, so thin you can see through them.',
    },
    'banh-mi-chao': {
      unlockNote: 'Opens with Southern Vietnam — needs eggs and milk from the garden.',
      fact: 'A sizzling cast-iron pan of fried eggs, pâté and meatballs with a crisp baguette — a Saigon breakfast.',
    },
    'canh-chua-ca': {
      unlockNote: 'Opens with Southern Vietnam — fish come from the pond.',
      fact: 'Mekong Delta sour soup cooks fish with tamarind, tomato, pineapple and elephant-ear stems, finished with rice paddy herb.',
    },
  },
  animals: {
    chicken: 'Hen',
    cow: 'Dairy cow',
  },
  animalProduce: {
    egg: 'Egg',
    milk: 'Milk',
  },
  catches: {
    fish: 'Climbing perch',
    shrimp: 'River prawn',
  },
  regions: {
    north: {
      name: 'Northern Vietnam',
      shortName: 'North',
      tagline: 'Clear broths, balanced flavours',
      specialty: 'Phở bò tái chín',
    },
    central: {
      name: 'Central Vietnam',
      shortName: 'Central',
      tagline: 'Bold, spicy, lots of small dishes',
      specialty: 'Bún bò Huế',
    },
    south: {
      name: 'Southern Vietnam',
      shortName: 'South',
      tagline: 'Gently sweet, full of greens, easy-going',
      specialty: 'Cơm tấm sườn bì chả',
    },
  },
  chef: {
    name: 'Cô Ba Bếp',
    role: 'Your guide in the kitchen',
  },
  quests: {
    metric: {
      choose: (n) => (n === 1 ? 'Pick a dish' : `Pick ${n} dishes`),
      checkin: (n) => (n === 1 ? 'Check in a meal' : `Check in ${n} meals`),
      plant: (n) => `Plant ${n} seeds`,
      water: (n) => `Water crops ${n} times`,
      harvest: (n) => `Harvest ${n} plots`,
      cook: (n) => (n === 1 ? 'Cook a dish' : `Cook ${n} dishes`),
      catch: (n) => `Land ${n} catches`,
      sell: (n) => `Sell ${n} produce at the market`,
      buy: (n) => (n === 1 ? 'Buy a seed at the market' : `Buy ${n} seeds at the market`),
      feed: (n) => `Feed your animals ${n} ${n === 1 ? 'time' : 'times'}`,
      collect: (n) => `Collect eggs or milk ${n} ${n === 1 ? 'time' : 'times'}`,
      order: (n) => `Deliver ${n} ${n === 1 ? 'order' : 'orders'} to Cô Ba`,
      photo: (n) => `Take ${n} meal ${n === 1 ? 'photo' : 'photos'}`,
      help: (n) => `Water a friend's garden ${n} ${n === 1 ? 'time' : 'times'}`,
      steal: (n) => `Sneak a pick from a friend ${n} ${n === 1 ? 'time' : 'times'}`,
      gift: (n) => `Give a friend ${n} ${n === 1 ? 'seed' : 'seeds'}`,
    },
    badges: {
      farmer: { name: 'Farmer', goal: (n) => `Harvest ${n} plots` },
      cook: { name: 'Cook', goal: (n) => `Cook ${n} dishes` },
      recipes: { name: 'Full cookbook', goal: (n) => `Cook ${n} different recipes` },
      angler: { name: 'Angler', goal: (n) => `Land ${n} catches` },
      supplier: { name: "Cô Ba's regular", goal: (n) => `Deliver ${n} orders` },
      neighbour: { name: 'Good neighbour', goal: (n) => `Water friends' plots ${n} times` },
      sneaky: { name: 'Quick hands', goal: (n) => `Sneak ${n} picks` },
      generous: { name: 'Generous', goal: (n) => `Give ${n} seeds` },
      explorer: { name: 'Foodie', goal: (n) => `Eat ${n} different dishes` },
    },
  },
  decor: {
    scarecrow: { name: 'Conical-hat scarecrow', note: 'Guards the garden in a nón lá hat.' },
    lantern: { name: 'Red lantern', note: 'Lights up after dark.' },
    jar: { name: 'Clay water jar', note: 'Catches rainwater beside the beds.' },
    fence: { name: 'Bamboo fence', note: 'A bamboo fence around the garden.' },
  },
  budgets: {
    low: { label: 'Under 40k', hint: 'Thrifty' },
    mid: { label: '40–70k', hint: 'Mid-range' },
    high: { label: 'Over 70k', hint: 'Treat yourself' },
    any: { label: 'Anything goes', hint: 'Any price' },
  },
  moods: {
    quick: 'Quick',
    filling: 'Filling',
    light: 'Light',
    novel: 'Something new',
  },
  avoid: {
    seafood: 'Seafood',
    beef: 'Beef',
    pork: 'Pork',
    spicy: 'Spicy food',
  },
  groups: {
    noodleSoup: 'Noodle soups',
    noodleDry: 'Dry noodles',
    rice: 'Rice dishes',
    breadRoll: 'Bánh mì & rolls',
    pancake: 'Cakes & pancakes',
  },
  cooking: {
    rice: ['Rinse the rice, into the pot', 'Grill over charcoal', 'Steam the rice', 'Plate up'],
    noodleSoup: [
      'Add ingredients to the pot',
      'Simmer the broth',
      'Season to taste',
      'Blanch noodles, ladle broth',
    ],
    breadRoll: ['Prep the greens', 'Boil until cooked', 'Roll by hand'],
    noodleDry: [
      'Add ingredients to the pot',
      'Stir-fry on high heat',
      'Blanch the noodles',
      'Toss with sauce',
    ],
    pancake: ['Mix the batter', 'Pour into the pan', 'Fry until crisp', 'Fold it over'],
  },
  dishes: {
    'pho-bo': {
      imageAlt: 'A bowl of beef phở with rice noodles, rare beef and scallions',
      tags: ['Clear broth', 'Warming', 'Noodle soup'],
      reason:
        'Long-simmered bone broth that fills you up without feeling heavy — perfect for a midday recharge.',
      seedNote: 'Phở noodles are made from rice, so phở brings you a rice seed.',
    },
    'bun-cha': {
      imageAlt: 'Bún chả: grilled pork in dipping sauce with a basket of fresh herbs',
      tags: ['Charcoal-grilled', 'Fresh herbs', 'Sweet & sour'],
      reason:
        'Smoky charcoal-grilled pork and an easy sweet-and-sour sauce — a nice break from the office lunch.',
      seedNote: 'The basket of fresh herbs is the soul of bún chả — you get a herb seed.',
    },
    'bun-rieu': {
      imageAlt: 'A bowl of bún riêu with crab, tomato and fried tofu',
      tags: ['Lightly sour', 'Light', 'Noodle soup'],
      reason: 'The gentle sourness of tomato and crab wakes you up — no post-lunch slump.',
      seedNote: 'Tomato gives riêu its colour and tang — you get a tomato seed.',
    },
    'banh-cuon': {
      imageAlt: 'Thin steamed rice rolls topped with fried shallots, with Vietnamese pork sausage',
      tags: ['Soft & thin', 'Served fast', 'Fried shallots'],
      reason: 'Steamed to order and ready in minutes — a neat choice when you are short on time.',
      seedNote: 'Fried shallots on top are the highlight — you get a scallion bulb.',
    },
    'com-dau-phu-sot-ca': {
      imageAlt: 'White rice with tofu in tomato sauce and boiled greens',
      tags: ['Vegetarian', 'Home-style', 'Budget'],
      reason:
        'Familiar home cooking that keeps you full and is easy on the wallet — simple vegetarian fare.',
      seedNote: 'Tofu is made from soybeans — you get a bean seed.',
    },
    'bun-bo-hue': {
      imageAlt: 'A bowl of orange-red bún bò Huế with pork loaf, beef shank and chili',
      tags: ['Fiery', 'Lemongrass', 'Noodle soup'],
      reason:
        'A bold lemongrass-chili broth with just enough heat — for when you want a really satisfying meal.',
      seedNote: 'Chili sa tế gives bún bò its red colour — you get a chili seed.',
    },
    'mi-quang': {
      imageAlt: 'Yellow mì Quảng noodles with shrimp, pork, sesame rice crackers and greens',
      tags: ['Little broth', 'Sesame crackers', 'Fresh herbs'],
      reason:
        'Little broth, lots of toppings and crunchy sesame crackers to break over — a fun change of pace.',
      seedNote: 'Mì Quảng is nothing without fresh herbs — you get a herb seed.',
    },
    'com-ga-hoi-an': {
      imageAlt: 'Turmeric rice with shredded chicken, onion and Vietnamese coriander',
      tags: ['Turmeric rice', 'Shredded chicken', 'Not spicy'],
      reason:
        'Golden rice cooked in chicken stock, shredded chicken tossed with herbs — filling yet fresh.',
      seedNote: 'Onion in the chicken salad balances the dish — you get a scallion bulb.',
    },
    'banh-beo': {
      imageAlt: 'A tray of little steamed rice cakes topped with dried shrimp and crispy pork fat',
      tags: ['Light bite', 'From Huế', 'Little bowls'],
      reason:
        'Small, silky bowls to nibble on — good when you are not very hungry but want to try something new.',
      seedNote: 'Bánh bèo is made from rice flour — you get a rice seed.',
    },
    'com-chay-hue': {
      imageAlt: 'A vegetarian spread with tofu, mushrooms, stir-fried greens and vegan pork loaf',
      tags: ['Vegetarian', 'Lots of greens', 'Light & clean'],
      reason:
        'Huế’s refined vegetarian cooking, many small dishes — light enough for an afternoon of work.',
      seedNote: 'Beans are the main protein of a vegetarian meal — you get a bean seed.',
    },
    'com-tam': {
      imageAlt:
        'Broken rice with grilled pork chop, shredded pork skin, egg meatloaf and scallion oil',
      tags: ['Grilled pork', 'Keeps you full', 'Scallion oil'],
      reason: 'Fragrant grilled pork over fluffy broken rice — a solid meal for a long afternoon.',
      seedNote: 'Cơm tấm is made from broken rice grains — you get a rice seed.',
    },
    'hu-tieu-nam-vang': {
      imageAlt: 'A clear noodle soup with shrimp, minced pork and garlic chives',
      tags: ['Clear broth', 'Shrimp & pork', 'Noodle soup'],
      reason:
        'A gently sweet bone broth with generous toppings — one bowl keeps you going all afternoon.',
      seedNote: 'Garlic chives and fried shallots perfume hủ tiếu — you get a scallion bulb.',
    },
    'banh-mi-thit': {
      imageAlt: 'A crisp baguette filled with pork, pickles, coriander and chili',
      tags: ['To go', 'Super quick', 'Crunchy'],
      reason: 'Grab it and eat it in five minutes — a lifesaver on a day of back-to-back meetings.',
      seedNote: 'Fresh chili slices give bánh mì its kick — you get a chili seed.',
    },
    'goi-cuon-chay': {
      imageAlt:
        'Translucent vegetarian fresh rolls with greens, noodles and tofu, with dipping sauce',
      tags: ['Vegetarian', 'Refreshing', 'Lots of greens'],
      reason:
        'Cool, fresh rolls full of greens — light for a hot day or when you want to eat clean.',
      seedNote: 'Herbs rolled inside the rice paper are the key — you get a herb seed.',
    },
    'canh-chua-ca': {
      imageAlt:
        'A pot of sour snakehead fish soup with tomato, pineapple, elephant-ear stems and bean sprouts',
      tags: ['Sweet & sour', 'Home-style', 'Mekong Delta'],
      reason:
        'Tamarind, pineapple and tomato soup to cool you down — a home-style meal to share with colleagues.',
      seedNote: 'Tomato brings sweet-sour depth to the soup — you get a tomato seed.',
    },
    'banh-xeo': {
      imageAlt: 'A crisp golden folded pancake with shrimp, pork, bean sprouts and greens',
      tags: ['Crunchy', 'Wrap in greens', 'To share'],
      reason:
        'Crisp shell, shrimp-pork-sprout filling, wrapped in greens and dipped in fish sauce — fun with a group.',
      seedNote: 'The bean sprouts in the filling grow from mung beans — you get a bean seed.',
    },
    'lau-nam-chay': {
      imageAlt: 'A vegetarian mushroom hotpot with many kinds of mushrooms, tofu and greens',
      tags: ['Vegetarian', 'For groups', 'Vegetable broth'],
      reason: 'Naturally sweet mushrooms, hot yet light — a good group lunch for vegetarians.',
      seedNote: 'Herbs dipped in the hotpot lift the mushroom aroma — you get a herb seed.',
    },
  },
  reel: {
    price: (thousands: number) => `${(thousands * 1000).toLocaleString('en-US')} ₫`,
    regionLabel: {
      north: 'Northern Vietnam',
      central: 'Central Vietnam',
      south: 'Southern Vietnam',
      world: 'World',
    },
    tags: {
      spicy: 'Spicy',
      rich: 'Rich',
      fresh: 'Fresh',
      crunchy: 'Crunchy',
      sweet: 'Mildly sweet',
      vegetarian: 'Vegetarian',
    },
    seedFallback: 'Herbs',
    imageAlt: (name: string, subtitle: string) => `${name} — ${subtitle}`,
    seedNote: (ingredient: string, dish: string, crop: string, seed: string) =>
      `${ingredient} in ${dish} comes from the ${crop.toLowerCase()} plant — you get one ${seed.toLowerCase()}.`,
  },
};

export default data;
