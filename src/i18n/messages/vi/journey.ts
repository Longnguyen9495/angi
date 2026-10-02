// Vietnamese strings for the "journey" namespace (source of truth; see src/i18n/index.ts).
// The drawer is shown to guests as "Nông trại".
const journey = {
  scene: {
    /** Hero kicker; `brand` is BRAND. */
    kicker: (brand: string) => `${brand} · Nông trại`,
    titleLines: ['Nông trại', 'của bạn'] as string[],
    lede: 'Mỗi bữa ăn thật góp một hạt giống, một con dấu và một chút tiến độ. Không có đếm ngược, không có cây héo — cứ thong thả.',
    navLabel: 'Mục trong Nông trại',
    nav: {
      meal: 'Bữa này',
      garden: 'Khu vườn',
      recipes: 'Công thức',
      orders: 'Đơn Cô Ba',
      market: 'Chợ',
      map: 'Bản đồ',
      missions: 'Nhiệm vụ',
    },
    sections: {
      meal: { title: 'Bữa này' },
      garden: { title: 'Khu vườn' },
      recipes: {
        title: 'Công thức',
        intro:
          'Nguyên liệu thu hoạch được và cây đang lớn đều được tính. Đủ thì nấu bằng một chạm.',
      },
      orders: {
        title: 'Đơn của Cô Ba',
        intro:
          'Mỗi sáng Cô Ba gửi hai đơn nhỏ. Giao nông sản dư để đổi lấy hạt giống, lượt tưới và XP.',
      },
      market: {
        title: 'Chợ quê',
        intro:
          'Bán nông sản dư lấy xu, mua hạt của mọi loại cây đã mở và đồ trang trí cho khu vườn.',
      },
      map: {
        title: 'Bản đồ ẩm thực',
        intro:
          'Mỗi món bạn gieo hạt hoặc check-in được ghi vào album của vùng đó. Chạm vào một món để đọc lại câu chuyện.',
      },
      missions: {
        title: 'Nhiệm vụ & nhật ký',
        today: 'Hôm nay',
        recent: 'Bữa gần đây',
        album: 'Album bữa ăn',
      },
    },
  },

  /** The farm as a full-screen game: HUD, dock and in-game panels. */
  game: {
    level: (lv: number) => `Cấp ${lv}`,
    levelLabel: (lv: number, into: number, span: number) =>
      `Cấp ${lv}, ${into}/${span} XP. Xem thống kê`,
    coins: (n: number) => `${n} xu`,
    menu: 'Thêm',
    dockLabel: 'Các khu trong nông trại',
    dock: {
      meal: 'Bữa này',
      storage: 'Kho',
      kitchen: 'Bếp',
      orders: 'Đơn',
      market: 'Chợ',
      map: 'Bản đồ',
      missions: 'Nhiệm vụ',
      friends: 'Bạn vườn',
      stats: 'Thống kê',
    },
    panel: {
      storage: 'Kho & hạt giống',
      kitchen: 'Bếp',
      friends: 'Bạn vườn',
      stats: 'Thống kê nông trại',
    },
    close: 'Đóng',
    tray: {
      all: (n: number) => `Tất cả hạt (${n})`,
      seedLabel: (seed: string, n: number) => `${seed}, còn ${n}`,
      pickerTitle: 'Chọn hạt giống',
      pickerHint: 'Chạm để chọn, hoặc kéo thả vào ô đất.',
      kinds: { veg: 'Rau, củ & gia vị', tree: 'Cây ăn trái', mushroom: 'Nấm' },
    },
    toField: 'Ruộng',
    toBarn: 'Chuồng & ao',
    toFieldLabel: 'Đưa khung nhìn về ruộng',
    toBarnLabel: 'Đưa khung nhìn sang chuồng và ao',
    dragHint: 'Kéo để xem cả nông trại',
    questHide: 'Thu gọn gợi ý',
    questShow: 'Mở gợi ý tiếp theo',
    harvest: 'Thu hoạch',
    plotsTitle: 'Các ô đất',
    sky: (part: string, weather: string) => `${part}, ${weather}`,
    daypart: { morning: 'Sáng sớm', noon: 'Buổi trưa', evening: 'Chiều tà', night: 'Ban đêm' },
    weather: { clear: 'trời quang', cloudy: 'nhiều mây', rain: 'đang mưa' },
  },

  stats: {
    level: 'Cấp độ',
    levelNote: (into: number, span: number, next: number) => `${into}/${span} XP tới cấp ${next}`,
    streak: 'Chuỗi ngày',
    streakNote: (passes: number) => `${passes} vé nghỉ tuần này · lỡ một ngày chỉ lùi một mốc`,
    stamps: 'Con dấu',
    stampsNote: (need: number, region: string) => `Còn ${need} dấu để mở ${region}`,
    allRegionsOpen: 'Đã mở cả ba miền',
    explored: 'Món đã khám phá',
    exploredNote: 'Gieo hạt hoặc check-in một món để ghi vào sổ',
  },

  savePrompt: {
    title: 'Giữ nông trại này?',
    hasCookbook: 'Bạn đã có món trong sổ bếp.',
    hasStamps: (n: number) => `Bạn đã có ${n} con dấu trong nông trại.`,
    body: 'Lưu bằng email để không mất khi đổi máy — không cần mật khẩu.',
    save: 'Lưu bằng email',
    later: 'Để sau',
  },

  meal: {
    empty: (slot: string) =>
      `Chưa chốt món cho ${slot}. Quay reel, chọn một món — món đó gửi lại một hạt giống cho khu vườn.`,
    spin: 'Quay món',
    chosenFor: (slot: string) => `Đã chốt cho ${slot}`,
    statusLabel: 'Trạng thái bữa này',
    planted: 'Đã gieo hạt',
    seedInTray: 'Hạt đang trong khay',
    checkedIn: 'Đã check-in',
    outcome: { ate: 'đã ăn', swapped: 'đổi món', skipped: 'bỏ bữa' },
    awaitingCheckIn: 'Chờ check-in sau bữa',
    allRewards: 'Bữa này đã nhận đủ thưởng. Hẹn bữa sau!',
    checkIn: 'Check-in bữa này',
  },

  garden: {
    blockWet: 'Đất còn ẩm',
    blockEmptyCan: 'Hết nước hôm nay',
    cropUnlocked: (crop: string, seed: string) =>
      `Lên cấp! Mở khoá ${crop} — tặng 1 ${seed} vào khay.`,
    harvested: (list: string) => `Đã thu hoạch: ${list}.`,
    planted: (seed: string, plot: number) => `Đã gieo ${seed} vào ô ${plot}.`,
    watered: (plot: number, crop: string, left: number) =>
      `Đã tưới ô ${plot}. ${crop} lớn nhanh hơn. Còn ${left} lượt tưới hôm nay.`,
    fed: (animal: string, when: string) => `Đã cho ${animal} ăn. ${when} nữa quay lại thu.`,
    collected: (qty: number, product: string) => `Đã thu ${qty} ${product} vào kho.`,
    caught: (fish: string, xp: number) => `Câu được ${fish}! Đã cho vào kho · +${xp} XP.`,
    noFishingLeft: 'Hết lượt câu hôm nay — mai quay lại nhé.',
    casting: 'Đã thả câu… chờ cá cắn.',
    animalLocked: (animal: string, level: number) => `${animal} mở ở cấp ${level}.`,
    animalBusy: (animal: string, left: string) => `${animal} đang no — còn ${left} nữa thu được.`,
    needFeed: (feed: string, animal: string) => `Cần 1 ${feed} để cho ${animal} ăn.`,
    lede: (ready: number, empty: number) =>
      `${ready} ô sẵn sàng · ${empty} ô trống. Tưới để cây lớn nhanh hơn — không tưới cây vẫn lớn, không bao giờ héo.`,
    waterOn: 'Tưới cây',
    waterOff: 'Xong, cất bình',
    cansLeft: (n: number) => `, còn ${n} lượt hôm nay`,
    harvestAll: (n: number) => `Thu hoạch tất cả${n > 0 ? ` (${n})` : ''}`,
    waterMode: (cut: number) =>
      `Chế độ tưới: chạm vào ô đang lớn. Mỗi lần tưới rút ngắn ${cut}% thời gian còn lại; mỗi ô tưới lại sau 1 giờ.`,
    farmLabel:
      'Nông trại trên đảo bay: chạm ô đất để gieo, tưới hoặc thu hoạch; chạm ao để câu cá; chạm bò hoặc gà để chăm; chạm nhà hoặc chợ để đi tới đó',
    farmSeedsLabel: 'Hạt để gieo khi chạm ô đất',
    farmPlotLocked: (plot: number, level: string) => `Ô ${plot} · mở ở cấp ${level}`,
    farmPlotPlant: (plot: number, seed: string) => `Ô ${plot} · chạm để gieo ${seed}`,
    farmPlotNoSeed: (plot: number) => `Ô ${plot} · trống, chờ hạt`,
    farmPlotHarvest: (plot: number, crop: string) => `Ô ${plot} · ${crop} · chạm để thu hoạch`,
    farmPlotGrowing: (plot: number, crop: string, left: string) =>
      `Ô ${plot} · ${crop} · còn ${left}`,
    farmTapToWater: ' · chạm để tưới',
    animalLockedBubble: (animal: string, level: number) => `${animal} · cấp ${level}`,
    collectBubble: (product: string) => `Thu ${product}`,
    feedBubble: (feed: string) => `Cho ăn ${feed}`,
    plotOpensAt: (plot: number, level: string) => `Ô ${plot} mở khi lên cấp ${level}.`,
    trayEmpty: 'Khay hạt trống — chốt một món để nhận hạt.',
    plotBlocked: (plot: number, note: string) => `Ô ${plot}: ${note}.`,
    cantWater: 'chưa tưới được',
    placeMarket: 'Chợ quê',
    placeMarketText: 'Bán nông sản, mua hạt giống và đồ trang trí.',
    placeHouse: 'Bếp nhà',
    placeHouseText: 'Nấu món từ nguyên liệu trong kho.',
    placeGo: 'Đi tới',
    placeClose: 'Đóng',
    cardPlot: (plot: number) => `Ô ${plot}`,
    cardEmpty: 'Đất trống. Kéo hạt thả vào ô, hoặc chạm vào hạt để gieo.',
    cardNoSeed: 'Khay hạt trống — chốt một món trên reel để nhận hạt.',
    cardGrowing: (crop: string, left: string) => `${crop} đang lớn · còn ${left}`,
    cardWater: 'Tưới nước',
    cardWaterLeft: (n: number) => `còn ${n} lượt hôm nay`,
    cardReady: (crop: string) => `${crop} đã chín!`,
    cardHarvest: 'Thu hoạch',
    cardHarvested: (produce: string) => `Đã thu ${produce} vào kho.`,
    cardCookWith: 'Nấu món với nguyên liệu này:',
    cardCook: 'Nấu',
    cardMissing: (list: string) => `còn thiếu ${list}`,
    cardNoRecipe: 'Chưa có công thức nào dùng nguyên liệu này.',
    cardLocked: (level: string) => `Ô này mở khi lên cấp ${level}.`,
    plotsLabel: 'Các ô đất',
    tapToPlant: 'Chạm để gieo',
    waitingSeed: 'Chờ hạt',
    tapToWater: 'Chạm để tưới',
    timeLeft: (left: string) => ` · còn ${left}`,
    plotNo: (n: number) => `Ô ${n}`,
    empty: 'Trống',
    plantPlot: (plot: number, seed: string) => `Ô ${plot}, trống. Gieo ${seed}`,
    plotNoSeed: (plot: number) => `Ô ${plot}, trống. Khay chưa có hạt`,
    waterPlot: (plot: number, crop: string, stage: string, left: string, block: string) =>
      `Tưới ô ${plot}, ${crop}, ${stage}, còn ${left}${block ? `. ${block}` : ''}`,
    nextPlotLabel: (level: number) => `Ô đất mới mở ở cấp ${level}`,
    comingSoon: 'Sắp mở',
    nextPlotNote: (level: number) => `Lên cấp ${level} để mở rộng vườn`,
    full: 'Ô đất đầy — thu hoạch các ô sẵn sàng để có chỗ gieo tiếp. Cây không bao giờ héo.',
    seedTray: 'Khay hạt giống',
    seedTrayEmpty: 'Khay trống. Mỗi món bạn chốt gửi lại một hạt liên quan.',
    pickSeed: 'Chọn hạt để gieo',
    pantry: 'Kho nguyên liệu',
    pantryEmpty: 'Chưa có nguyên liệu — thu hoạch ô sẵn sàng để nhận.',
    pantryLabel: 'Nguyên liệu trong kho',
  },

  next: {
    kicker: 'Tiếp theo',
    cook: {
      title: (recipe: string) => `Đủ nguyên liệu nấu ${recipe}`,
      body: (xp: number) => `Bếp đã sẵn sàng — nấu ngay để nhận +${xp} XP và mở trang sổ bếp.`,
      action: (recipe: string) => `Nấu ${recipe}`,
    },
    order: {
      title: 'Kho đủ hàng cho đơn của Cô Ba',
      body: 'Giao đơn để đổi lấy hạt giống, lượt tưới và XP.',
      action: 'Xem đơn',
    },
    harvest: {
      title: (n: number) => `${n} ô đã chín`,
      body: 'Thu hoạch để đưa nông sản vào kho và giải phóng ô đất.',
      action: 'Thu hoạch',
    },
    collect: {
      title: (animal: string, product: string) => `${animal} đã có ${product}`,
      body: (qty: number, product: string) =>
        `Thu ${qty} ${product} vào kho, rồi cho ăn để có mẻ tiếp theo.`,
      action: (product: string) => `Thu ${product}`,
    },
    feed: {
      title: (animal: string) => `Cho ${animal} ăn`,
      body: (feed: string, when: string, qty: number, product: string) =>
        `1 ${feed} → sau ${when} có ${qty} ${product} cho công thức.`,
      action: 'Cho ăn',
    },
    fish: {
      title: (recipe: string, fish: string) => `${recipe} còn thiếu ${fish}`,
      body: (left: number) => `Ra ao trong khu vườn thả câu — hôm nay còn ${left} lượt.`,
    },
    plant: {
      title: (seed: string, plot: number) => `Gieo ${seed} vào ô ${plot}`,
      body: (plot: number, crop: string, when: string) =>
        `Khay còn hạt và ô ${plot} đang trống — ${crop} chín sau khoảng ${when}.`,
      action: 'Gieo ngay',
    },
    find: {
      title: (recipe: string, produce: string) => `${recipe} còn thiếu ${produce}`,
      notFromDishes: (crop: string, seed: string) =>
        `${crop} không đến từ món ăn — nhận ${seed} từ đơn của Cô Ba hoặc ở chợ.`,
      seedSpent: (n: number, seed: string) =>
        `Bữa này đã nhận hạt rồi. Bữa sau, chốt một trong ${n} món cho ${seed} để trồng tiếp.`,
      body: (n: number, seed: string, produce: string) =>
        `Chốt một trong ${n} món cho ${seed} — bữa ăn gửi lại hạt, gieo là có ${produce}.`,
      action: (seed: string) => `Quay các món cho ${seed}`,
    },
    wait: {
      title: (recipe: string) => `Cây đang lớn cho ${recipe}`,
      body: (left: string) => `Ô sớm nhất chín sau ${left}. Tưới để nhanh hơn, hoặc cứ thong thả.`,
    },
    full: {
      title: 'Khu vườn đang nghỉ',
      body: 'Chốt một món để nhận hạt mới cho khu vườn.',
    },
  },

  friends: {
    title: 'Bạn vườn',
    invite: (xp: number) =>
      `Kết bạn bằng mã khu vườn: ghé đảo của nhau, tưới giúp mỗi ngày (+${xp} XP) và nhận quà hạt giống của Cô Ba. Cần lưu nông trại bằng email — không ai thấy email của bạn.`,
    saveToFriend: 'Lưu nông trại để kết bạn',
    loadFailed: 'Chưa tải được.',
    added: 'Đã kết bạn vườn! Ghé thăm và tưới giúp nhau nhé.',
    addFailed: 'Chưa kết bạn được.',
    /** Share text; `brand` is BRAND. */
    shareText: (brand: string, code: string) =>
      `Kết bạn vườn với mình trên ${brand} nhé — mã ${code}`,
    shareTitle: (brand: string) => `Khu vườn ${brand}`,
    inviteCopied: 'Đã chép lời mời kết bạn.',
    codeCopied: (code: string) => `Đã chép mã ${code}.`,
    yourCode: (code: string) => `Mã của bạn: ${code}`,
    renameFailed: 'Chưa lưu được tên.',
    confirmRemove: (name: string) => `Bỏ kết bạn với ${name}?`,
    removeFailed: 'Chưa bỏ kết bạn được, thử lại nhé.',
    helpsLeft: (left: number, xp: number) =>
      `Còn ${left} lượt tưới giúp hôm nay · mỗi lượt +${xp} XP cho cả hai.`,
    myCode: 'Mã khu vườn của bạn',
    /** Spoken code, letters spaced out. */
    codeAria: (spaced: string) => `Mã ${spaced}`,
    copyCode: 'Chép mã',
    inviteFriend: 'Mời bạn',
    renameCurrent: (name: string) => `“${name}” · đổi tên`,
    nameGarden: 'Đặt tên cho khu vườn',
    gardenName: 'Tên khu vườn',
    gardenNamePlaceholder: 'Vườn nhà Mây',
    save: 'Lưu',
    addByCode: 'Thêm bạn bằng mã',
    codePlaceholder: 'VD: K7QM2P',
    add: 'Kết bạn',
    limit: (max: number) => `Tối đa ${max} bạn. Chỉ tên khu vườn và cây trồng được chia sẻ.`,
    boardLabel: 'Bảng xếp hạng bạn vườn',
    me: (name: string) => `${name} (bạn)`,
    boardMeta: (level: number, xp: number) => `Cấp ${level} · ${xp} XP`,
    needWater: (n: number) => ` · ${n} ô cần nước`,
    wateredToday: ' · đã tưới hôm nay',
    visit: 'Ghé vườn',
    removeLabel: (name: string) => `Bỏ kết bạn với ${name}`,
    empty: 'Chưa có bạn vườn — gửi mã cho bạn bè để bắt đầu.',
    ripe: (n: number) => ` · ${n} ô chín, hái trộm được`,
    stealsLeft: (left: number) => `Còn ${left} lượt hái trộm hôm nay.`,
    gift: 'Tặng hạt',
    giftLabel: (name: string) => `Tặng hạt giống cho ${name}`,
    giftTitle: (name: string) => `Tặng ${name} một hạt giống`,
    giftNote: (left: number) => `Hạt rời khay của bạn. Còn ${left} lượt tặng hôm nay.`,
    giftNone: 'Bạn chưa có hạt giống nào để tặng. Chốt món hoặc mua hạt ở chợ nhé.',
    giftSeed: (seed: string, n: number) => `${seed} (còn ${n})`,
    giftSent: (seed: string, name: string) => `Đã tặng 1 ${seed} cho ${name}.`,
    giftFailed: 'Chưa tặng được.',
    giftedToday: ' · đã tặng hôm nay',
    inviteAdded: (name: string) => `Đã kết bạn vườn với ${name} qua link mời!`,
    invitePending: 'Lưu nông trại bằng email để kết bạn với người đã mời bạn.',
    referral: {
      title: 'Mời bạn mới',
      intro: (coins: number) =>
        `Gửi link mời cho người chưa chơi. Mỗi khi bạn mới đạt một mốc, cả hai cùng nhận xu — tổng ${coins} xu mỗi người.`,
      milestone: {
        harvest: (n: number) => `Thu hoạch ${n} lần`,
        cook: (n: number) => (n === 1 ? 'Nấu món đầu tiên' : `Nấu ${n} món`),
        level: (n: number) => `Đạt cấp ${n}`,
      },
      coins: (n: number) => `+${n} xu`,
      done: 'đã nhận',
      invitedBy: (name: string) =>
        `${name} đã mời bạn — làm các mốc dưới đây để cả hai cùng nhận xu.`,
      invitedTitle: (n: number, max: number) => `Bạn đã mời ${n}/${max}`,
      invitedMeta: (level: number, done: number, total: number) =>
        `Cấp ${level} · ${done}/${total} mốc`,
      none: 'Chưa có ai vào qua lời mời của bạn.',
      full: (max: number) =>
        `Đã đủ ${max} người — bạn mới vẫn kết bạn được nhưng không còn thưởng mời.`,
      rule: 'Tính khi tài khoản mới (dưới 7 ngày) kết bạn lần đầu với bạn.',
    },
    feed: {
      title: 'Tin bạn vườn',
      empty: 'Chưa có tin nào. Khi bạn bè tưới giúp, hái trộm hay tặng quà, tin sẽ hiện ở đây.',
      water: (from: string, plot: number | null) => `${from} đã tưới giúp ô ${plot ?? ''} của bạn`,
      helped: (from: string) => `Bạn đã tưới giúp ${from}`,
      stolen: (from: string, crop: string) => `${from} đã hái trộm ${crop} của bạn`,
      stole: (from: string, crop: string) => `Bạn đã hái trộm ${crop} ở vườn ${from}`,
      present: (from: string, seed: string) => `${from} tặng bạn 1 ${seed}`,
      sentPresent: (to: string, seed: string) => `Bạn đã tặng ${to} 1 ${seed}`,
      thanks: (from: string) => `${from} cảm ơn bạn`,
      gift: (seed: string) => `Cô Ba gửi 1 ${seed}`,
      referral: (name: string, coins: number) => `Thưởng mời bạn cùng ${name}: +${coins} xu`,
      revenge: 'Trả đũa',
      thank: 'Cảm ơn',
      thanked: 'Đã cảm ơn',
      thankFailed: 'Chưa gửi lời cảm ơn được.',
    },
  },

  visit: {
    loadFailed: 'Chưa ghé được khu vườn này.',
    watered: (plot: number, name: string, xp: number) =>
      `Đã tưới giúp ô ${plot} của ${name}. +${xp} XP cho bạn!`,
    waterFailed: 'Chưa tưới được.',
    loading: 'Đang ghé vườn…',
    description: (level: number, status: string) => `Cấp ${level} · ${status}`,
    helpedToday: 'bạn đã tưới giúp hôm nay',
    canHelp: 'chạm ô có viền xanh để tưới giúp',
    noHelpsLeft: 'hết lượt tưới giúp hôm nay',
    flying: 'Đang bay tới đảo của bạn…',
    plotsLabel: 'Các ô đất của bạn vườn',
    plot: (n: number, crop: string) => `Ô ${n} · ${crop}`,
    empty: 'Trống',
    timeLeft: (left: string) => ` · còn ${left}`,
    helped: 'Đã tưới giúp',
    water: 'Tưới giúp',
    steal: 'Hái trộm',
    stealable: 'chín rồi — hái trộm được',
    stolen: 'Đã bị hái',
    stole: (crop: string, name: string, xp: number) =>
      `Đã hái trộm 1 ${crop} ở vườn ${name}! +${xp} XP`,
    stealFailed: 'Chưa hái được.',
    stealRule: (left: number, minutes: number) =>
      `Ô chín quá ${minutes} phút thì hái trộm được 1 trong 3 phần (chủ vườn vẫn giữ 2). Còn ${left} lượt hôm nay.`,
  },

  recipes: {
    status: { have: 'Có', growing: 'Đang lớn', missing: 'Thiếu', locked: 'Chưa mở' },
    progress: (recipe: string) => `Tiến độ ${recipe}`,
    progressText: (secured: number, total: number, growing: number) =>
      `${secured}/${total} nguyên liệu${growing > 0 ? ` · ${growing} đang lớn` : ''}`,
    cook: (recipe: string) => `Nấu ${recipe}`,
    needLocked: (produce: string, level: number) => `Cần ${produce} — mở ở cấp ${level}.`,
    pickDish: 'Chốt một món có nguyên liệu còn thiếu để nhận hạt.',
    waitGrow: 'Chờ cây lớn rồi thu hoạch là nấu được.',
    cooked: (n: number) => `Đã nấu ×${n}`,
    lockedTitle: (n: number) => `Chưa mở · ${n} công thức`,
    opensWith: (region: string) => `Mở cùng ${region}`,
    stampsLeft: (n: number) => ` · còn ${n} con dấu`,
  },

  cookbook: {
    title: (done: number, total: number) => `Sổ bếp · ${done}/${total} trang`,
    cooked: (n: number) => `Đã nấu ×${n}`,
    notCooked: ' · Chưa nấu',
  },

  cooking: {
    description: 'Bếp của Cô Ba',
    started: (recipe: string) => `Đang nấu ${recipe}.`,
    finished: (recipe: string, xp: number) => `Đã nấu xong ${recipe}. Cộng ${xp} XP.`,
    ingredients: 'Nguyên liệu',
    have: (n: number) => `có ${n}`,
    plan: (steps: number, seconds: number) => `${steps} bước · khoảng ${seconds} giây`,
    start: 'Bắt đầu nấu',
    notEnough: 'Chưa đủ nguyên liệu',
    step: (n: number, total: number) => `Bước ${n}/${total}`,
    stepsLabel: 'Các bước nấu',
    done: (xp: number) => `Đã nấu xong · +${xp} XP`,
    firstPage: 'Trang mới trong sổ bếp — câu chuyện của món trên reel giờ có dấu “Tự nấu”.',
    cookedTimes: (n: number) => `Bạn đã nấu món này ${n} lần.`,
    openCookbook: 'Xem sổ bếp',
  },

  orders: {
    thanks: (xp: number, seeds: string, water: number) =>
      `Cô Ba cảm ơn! +${xp} XP, ${seeds}${water ? `, +${water} lượt tưới` : ''}.`,
    delivered: (chef: string) => `Đã giao đơn cho ${chef}.`,
    big: 'Đơn lớn',
    small: 'Đơn nhỏ',
    needed: 'Cần giao',
    have: (n: number) => ` · có ${n}`,
    reward: 'Phần thưởng',
    water: (n: number) => `+${n} lượt tưới`,
    done: 'Đã giao',
    deliver: 'Giao đơn',
    notEnough: 'Chưa đủ hàng',
  },

  itemFilter: {
    search: 'Tìm vật phẩm',
    placeholder: 'Tìm: cà chua, trứng, mật ong…',
    groups: 'Nhóm',
    all: 'Tất cả',
    noMatch: 'Không có vật phẩm nào khớp — thử tên khác hoặc chọn “Tất cả”.',
  },

  market: {
    tabs: { sell: 'Bán nông sản', seeds: 'Mua hạt', decor: 'Trang trí vườn' },
    coins: 'xu',
    stallsLabel: 'Quầy trong chợ',
    pantryEmpty: 'Kho đang trống — thu hoạch rồi mang ra chợ bán nhé.',
    inPantry: (n: number) => `Trong kho ×${n}`,
    sold: (produce: string, coins: number) => `Đã bán 1 ${produce}, +${coins} xu.`,
    sell: (coins: number) => `Bán 1 · +${coins} xu`,
    seedMeta: (sprout: string, ripe: string, tray: number) =>
      `Nảy mầm sau ${sprout} · chín sau ${ripe} · khay ×${tray}`,
    treeMeta: (first: string, again: string, tray: number) =>
      `Cây lâu năm · trái đầu sau ${first}, rồi ${again}/lần · khay ×${tray}`,
    mushroomMeta: (first: string, again: string, flushes: number, tray: number) =>
      `Phôi nấm · đợt đầu sau ${first}, rồi ${again}/đợt, ${flushes} đợt · khay ×${tray}`,
    soon: 'Sắp mở',
    opensAt: (level: number) => `Mở ở cấp ${level}`,
    boughtSeed: (seed: string) => `Đã mua 1 ${seed}.`,
    buy: (price: number) => `Mua · ${price} xu`,
    owned: 'Đã đặt trong vườn',
    boughtDecor: (decor: string) => `Đã mua ${decor} cho khu vườn.`,
  },

  atlas: {
    tagline: {
      north: 'Nước dùng thanh, vị cân bằng',
      central: 'Đậm đà, cay nồng, nhiều món nhỏ',
      south: 'Ngọt thanh, nhiều rau, phóng khoáng',
      world: 'Món ngoại đã quen trên phố ăn trưa',
    },
    fresh: 'Mới mở!',
    locked: 'Đang khóa',
    open: 'Đang mở',
    dishes: 'món',
    lockedNote: (need: number, have: number, left: number) =>
      `Mở khi có ${need} con dấu (bạn có ${have}, còn ${left}). Vẫn chọn và gieo món vùng này được.`,
    albumLabel: (region: string) => `Món ${region} đã khám phá`,
    readStory: (dish: string) => `Xem câu chuyện ${dish}`,
    rest: (n: number) => `${n} món chưa khám phá`,
  },

  missions: {
    done: '(đã xong)',
    notDone: '(chưa xong)',
    daily: 'Hôm nay',
    dailyNote: 'Nhiệm vụ mới mỗi ngày lúc nửa đêm.',
    weekly: 'Tuần này',
    weeklyNote: (days: number) => (days <= 1 ? 'Đổi mới vào ngày mai.' : `Còn ${days} ngày.`),
    badges: 'Thành tựu',
    claim: 'Nhận',
    claimed: 'Đã nhận',
    progress: (have: number, need: number) => `${have}/${need}`,
    reward: {
      xp: (n: number) => `+${n} XP`,
      coins: (n: number) => `+${n} xu`,
      seeds: (n: number) => `+${n} hạt`,
      water: (n: number) => `+${n} lượt tưới`,
    },
    got: (parts: string) => `Đã nhận ${parts}!`,
    chestTitle: (n: number) => `Rương chuỗi ${n} ngày`,
    chestBody: 'Bạn ghé nông trại đều đặn — mở rương nhận quà nhé.',
    openChest: 'Mở rương',
    chestNext: (n: number, left: number) =>
      `Rương tiếp theo ở chuỗi ${n} ngày (còn ${left} ngày). Chốt món hoặc check-in mỗi ngày để giữ chuỗi.`,
    tier: (n: number, total: number) => `Bậc ${n}/${total}`,
    maxed: 'Đã đạt bậc cao nhất',
    badgeProgress: (have: number, need: number) => `${have}/${need}`,
    logEmpty: 'Chưa có bữa nào được check-in. Check-in đầu tiên sẽ hiện ở đây.',
    outcome: { ate: 'Đã ăn', swapped: 'Đổi món', skipped: 'Bỏ bữa' },
    /** Meal log date, day and month already zero-padded. */
    logDate: (dd: string, mm: string) => `${dd}.${mm}`,
  },

  album: {
    empty:
      'Khi check-in sau bữa, chụp món vừa ăn để lưu album (tuỳ chọn, +5 XP). Ảnh chỉ nằm trên máy này.',
    label: 'Album bữa ăn',
    slot: { breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối' } as Record<string, string>,
    fallbackName: 'Bữa ăn',
    /** "Trưa 30/9": slot label and a formatted date. */
    when: (slot: string, date: string) => `${slot} ${date}`.trim(),
    photoAlt: (name: string, when: string) => `${name}, ${when}`,
    delete: (name: string, when: string) => `Xoá ảnh ${name}, ${when}`,
  },
};

export default journey;
