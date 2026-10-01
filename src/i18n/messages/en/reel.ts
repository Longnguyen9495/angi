import type { Messages } from '../../types';

// English strings for the "reel" namespace. Must mirror vi/reel.ts key for key.
const dishes = (n: number) => (n === 1 ? '1 dish' : `${n} dishes`);

const reel: Messages['reel'] = {
  docTitle: (brand) => `${brand} — What to eat today?`,
  docTitleDish: (brand, dish) => `${dish} — ${brand}`,

  header: {
    tag: 'Food reel',
    navLabel: 'Tools',
    sound: 'Sound',
    soundOn: 'Sound: on. Press to turn off',
    soundOff: 'Sound: off. Press to turn on',
    about: 'About',
    saved: 'Saved',
    savedUnit: (n) => (n === 1 ? 'dish' : 'dishes'),
    farm: 'Farm',
    farmStats: (level, streak) => `Level ${level} · ${streak}-day streak`,
    pendingCheckIn: ', check-in waiting',
    profile: 'Profile and settings',
  },

  stage: {
    label: 'Food reel',
    headline: ['What to eat', 'today?'],
    subCrop: (n, seed) => `${dishes(n)} for the ${seed}`,
    subPool: (n) => `Spin basket · ${n} you picked`,
    subAll: (n) => `${dishes(n)} · three regions & the world`,
    hintHover: 'Drag to explore · Click to read the story',
    hintTouch: 'Swipe to browse · Tap for the story',
  },

  announce: {
    spinPool: (n) => `Spinning the basket: ${dishes(n)}.`,
    spinAll: (n) => `Spinning all ${dishes(n)}.`,
    spinCrop: (seed) => `Spinning the dishes for the ${seed}.`,
    eliminated: (dish, left) => `${dish} is out. Spinning the other ${dishes(left)}.`,
    picked: (dish) => `Picked ${dish}`,
    confirmed: (dish) => `${dish} it is.`,
    poolAdded: (dish) => `Added ${dish} to the spin basket.`,
    poolRemoved: (dish) => `Removed ${dish} from the spin basket.`,
  },

  confirmError:
    'Couldn’t lock it in — the simulated network is failing. Your dish is still here, please try again.',

  empty: {
    title: 'No dishes yet',
    text: 'The menu is empty. Go to the admin page and upload a dish photo — AI will recognise it and fill in the details for you.',
    cta: 'Add the first dish',
  },

  boot: 'Setting the table…',

  saved: {
    title: 'Saved dishes',
    description: 'Kept on this device, no account needed.',
    empty: 'Nothing here yet. Open a dish’s story and press “Save” to keep it here.',
    open: (dish) => `Read the story of ${dish}`,
    remove: (dish) => `Unsave ${dish}`,
  },

  about: {
    title: 'About',
    lead: (n) =>
      ` helps you pick a meal through motion: spin the reel, let ${n} dishes fly past, then stop on one and read its story.`,
    fair: 'The result is decided before the reel moves; the animation only plays out the way there. No sign-in, no ads, no payments.',
    farmBefore: 'Once you lock in a dish, the ',
    farmEm: 'Farm',
    farmAfter:
      ' opens up: seeds, a garden, a food map and an after-meal check-in. Progress stays on your device; to keep it when you switch phones, save it with your email in your Profile (optional).',
    privacy: (brand) => `Privacy — what ${brand} stores and how to delete it`,
    language: 'Language',
    note: 'Dish photos are for illustration only (see the note in each story). Prices are a rough guide; ingredient info is not allergy advice. Story videos are being added bit by bit — dishes without one show a poster.',
  },

  reel: {
    roleDescription: 'dish carousel',
    label: (pooled, n) =>
      `${pooled ? 'Spin basket' : 'Dish universe'}: ${dishes(n)}. Use the arrow keys to change dish, Enter to read the story.`,
    current: (no, dish, region, price) => `Dish ${no}: ${dish}, ${region}, ${price}`,
    itemDetails: (subtitle, region, price) => ` — ${subtitle}, ${region}, about ${price}.`,
    itemOpen: 'Press to read the dish’s story',
    itemCentre: 'Press to bring this dish to the centre',
  },

  spin: {
    label: 'Spin',
    busy: 'Spinning…',
    counter: (current, total) => `Dish ${current} of ${total}`,
  },

  selected: {
    kicker: (pooled, no) => `${pooled ? 'Your basket' : 'The reel'} picked for you · ${no}`,
    region: 'Region',
    price: 'About',
    portion: 'Serving',
    explore: 'Explore this dish',
    eliminate: 'Drop & spin again',
    back: 'Back',
  },

  pool: {
    groupLabel: 'Spin over',
    all: 'All',
    basket: 'Basket',
    pickSome: 'Pick a few',
    edit: 'Edit spin basket',
  },

  picker: {
    title: 'Spin basket',
    description: (min) => `Pick ${min} or more dishes — the reel will only spin between them.`,
    none: 'Nothing picked',
    pickedPrefix: 'Picked ',
    pickedCount: (n) => dishes(n),
    clear: 'Clear all',
    addMore: (n) => `Add ${n} more`,
    spinN: (n) => `Spin ${dishes(n)}`,
    search: 'Search dishes',
    searchPlaceholder: 'Search: phở, bún, cơm…',
    filtersLabel: 'Filter dishes',
    filterAll: 'All',
    filterPicked: 'In basket',
    filterVeg: 'Vegetarian',
    addSaved: (n) => `Add ${n} saved ${n === 1 ? 'dish' : 'dishes'}`,
    noMatch: 'No dishes match.',
    gridLabel: 'Dishes you can add to the basket',
  },

  story: {
    back: 'Back',
    backSuffix: ' to reel',
    saved: 'Saved',
    save: 'Save',
    pool: 'Spin basket',
    poolIn: 'In the spin basket — press to take it out',
    poolAdd: 'Add to spin basket',
    ingredients: 'Ingredients',
    origin: 'Region & origin',
    flavor: 'Flavour profile',
    credit: (credit) => `Photo: ${credit}. Prices are a rough guide.`,
    confirming: 'Locking in…',
    retry: 'Try again',
    confirm: 'Lock in this dish',
    spinOther: 'Spin another',
    cooked: (n) => `Cooked ×${n} on the Farm · `,
    regionStory: {
      north:
        'The North favours clean, balanced flavours: clear broths and just enough seasoning to let the ingredients speak.',
      central:
        'Central Vietnam is bold and fiery: lemongrass, chilli, shrimp paste and the delicate little dishes of the old imperial capital, Huế.',
      south:
        'The South is generous and gently sweet, with plenty of fresh herbs — every meal carries a bit of Mekong cheer.',
      world: 'A dish from kitchens abroad, now a familiar lunch on Vietnamese streets.',
    },
  },

  flavor: {
    spicy: 'Spicy',
    sweet: 'Sweet',
    rich: 'Rich',
    fresh: 'Fresh',
    crunchy: 'Crunchy',
  },

  ingredients: {
    of: (dish) => `Ingredients of ${dish}`,
  },

  epilogue: {
    kicker: (slot) => `Locked in for ${slot}`,
    lede: 'Enjoy your meal. This dish sends a seed back to your Farm — plant it now if you like, or keep it in the tray.',
    saving: 'Saving your choice…',
    openFarm: 'Open the Farm',
    spinNew: 'Spin a new dish',
  },

  journey: {
    dialog: 'Your Farm',
    back: 'Back to reel',
    title: 'Farm',
    loading: 'Opening the Farm…',
  },

  order: {
    title: (dish) => `Find & order · ${dish}`,
    cityLabel: 'ShopeeFood delivers in',
    newTab: ' (opens in a new tab)',
    fine: 'Opens each service’s search with the dish name. Prices and places come from them.',
    nearby: 'Places near you',
    delivery: 'Delivery',
    cities: {
      'ho-chi-minh': 'Ho Chi Minh City',
      'ha-noi': 'Hanoi',
      'da-nang': 'Da Nang',
      'hai-phong': 'Hai Phong',
      'binh-duong': 'Binh Duong',
      'dong-nai': 'Dong Nai',
      hue: 'Huế',
    },
  },

  video: {
    open: (n) => `Watch ${n} ${n === 1 ? 'video' : 'videos'} about this dish`,
    sectionLabel: 'YouTube videos about the dish',
    eyebrow: 'KITCHEN CORNER · YOUTUBE',
    heading: 'One dish, many stories',
    count: (n) => `${n} ${n === 1 ? 'video' : 'videos'}`,
    hint: 'Tap a clip to watch it right here.',
    play: (title) => `Play on YouTube: ${title}`,
    selected: 'Selected',
    clip: (no) => `CLIP ${no}`,
    dialogTitle: (dish) => `Videos about ${dish}`,
    closeLabel: 'Close the video gallery',
    close: 'Close ×',
    loading: 'Connecting to the YouTube player…',
    error: 'The video may be blocked or not allow embedding. You can try another one.',
    loaded: 'The YouTube player has loaded. If it isn’t playing, press Play in the player.',
    help: 'Video won’t play?',
    fallback: 'Try opening it on YouTube ↗',
    posterNote: 'Food story coming soon',
    storyLabel: (dish) => `Story video for ${dish}`,
    pause: 'Pause video',
    playVideo: 'Play video',
    unmute: 'Turn video sound on',
    mute: 'Turn video sound off',
  },
};

export default reel;
