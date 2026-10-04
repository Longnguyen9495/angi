// Vietnamese strings for the "farm" namespace (source of truth; see src/i18n/index.ts).
const farm = {
  /** Shared by the 3D garden and the PlayCanvas corner. */
  common: {
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    resetView: 'Về góc nhìn ban đầu',
    quality: 'Chất lượng hình',
    qualityLevels: { low: 'Nhẹ', medium: 'Vừa', high: 'Đẹp' },
    flat: '2D',
    plot: (id: number) => `Ô ${id}`,
    emptyPlot: 'Ô trống',
    /** Screen-reader list entry for a plot. */
    srPlot: (id: number, crop: string | null, stage: string) =>
      `Ô ${id}: ${crop ? `${crop}, ${stage.toLowerCase()}` : 'trống'}`,
    building: 'Công trình',
    barn: 'Nhà kho',
    chooseSeed: 'Chọn hạt',
    seedChip: (seed: string, count: number) => `${seed} ×${count}`,
    sow: (seed: string | null) => `Gieo ${seed ? seed.toLowerCase() : ''}`,
    ripe: 'Chín rồi! Thu về kho để nấu hoặc giao đơn.',
    harvest: (n: number) => (n > 1 ? `Thu hoạch cả ${n} ô` : 'Thu hoạch'),
    growing: (stage: string, left: string) => `${stage} · còn ${left}`,
    water: (pct: number, cans: number) => `Tưới (−${pct}%) · còn ${cans}`,
    stockItem: (name: string, count: number) => `${name} ×${count}`,
    goMarket: 'Ra chợ quê',
  },
  /** The React Three Fiber island. */
  garden3d: {
    buildings: {
      kitchen: 'Bếp Cô Ba',
      barn: 'Nhà kho',
      well: 'Giếng nước',
      chicken: 'Chuồng gà',
      cow: 'Chuồng bò',
      pond: 'Ao cá',
    },
    close: 'Đóng',
    srList: 'Khu vườn 3D',
    hud: (level: number, into: number, span: number, coins: number) =>
      `Cấp ${level}, ${into}/${span} XP, ${coins} xu`,
    hudLevel: (level: number) => `Cấp ${level}`,
    wateringHint: (cans: number) => `Chạm ô có viền xanh để tưới · còn ${cans} lượt`,
    harvestHint: (n: number) => `Thu hoạch ${n} ô chín`,
    arrange: {
      label: 'Sắp xếp trang trí',
      kicker: 'Sắp xếp',
      pickTitle: 'Chọn một món trang trí',
      moveHint: 'Chạm một ô sáng trên cỏ để dời tới đó.',
      pickHint: 'Chạm vào bù nhìn, đèn lồng hay chum nước trên đảo.',
      putBack: (name: string) => `Đặt lại ${name.toLowerCase()}`,
      rotate: 'Xoay',
      store: 'Cất vào kho',
      done: 'Xong',
    },
    plot: {
      seedsEmpty: 'Khay hạt trống. Mỗi món bạn chốt gửi lại một hạt.',
      wet: ' · đất còn ẩm',
      emptyCan: ' · hết nước hôm nay',
    },
    kitchen: {
      text: 'Cô Ba nấu từ nguyên liệu trong kho. Đủ thì nấu một chạm.',
      recipes: 'Xem công thức',
      orders: 'Đơn của Cô Ba',
    },
    barn: {
      empty: 'Kho còn trống — thu hoạch để có nguyên liệu.',
    },
    well: {
      text: (cans: number, perDay: number, pct: number) =>
        `Còn ${cans}/${perDay} lượt tưới hôm nay. Mỗi lần rút ngắn ${pct}% thời gian còn lại.`,
      stop: 'Cất bình tưới',
      start: 'Múc nước tưới cây',
    },
    pond: {
      idle: (left: number, perDay: number) =>
        `Thả câu, chờ phao chìm rồi giật cần. Hôm nay còn ${left}/${perDay} lượt — cá và tôm vào kho để nấu.`,
      done: 'Hôm nay câu đủ rồi. Mai cá lại cắn câu.',
      waiting: 'Phao đang nổi… chờ cá cắn câu.',
      bite: 'Phao chìm! Giật cần ngay!',
      caught: (kind: string) => `Câu được ${kind.toLowerCase()}! Đã cho vào kho.`,
      missed: 'Cá sổng mất rồi — thả câu lại nhé (không mất lượt).',
      cast: 'Thả câu',
      hook: 'Giật cần!',
      reelIn: 'Thu cần',
    },
    animal: {
      /** What one batch of produce is called; `n` is how many. */
      units: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- English needs the count
        chicken: (_n: number) => 'quả trứng',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        cow: (_n: number) => 'bình sữa',
      },
      locked: (level: number) => `Mở khi lên cấp ${level}.`,
      feedHint: (feed: string, hours: number, n: number, unit: string) =>
        `Cho ăn 1 ${feed.toLowerCase()} → ${hours} giờ sau có ${n} ${unit}.`,
      needFeed: (feed: string) => `Cần 1 ${feed.toLowerCase()} trong kho để cho ăn.`,
      busy: (left: string) => `Đang ăn no · còn ${left}.`,
      ready: (n: number, unit: string) => `Có ${n} ${unit} chờ bạn thu!`,
      feed: 'Cho ăn',
      collect: (product: string) => `Thu ${product.toLowerCase()}`,
    },
    /** Labels floating over the island. */
    signs: {
      unlockAt: (level: number) => `Mở ở cấp ${level}`,
      hungry: 'Chờ cho ăn',
      ready: 'Thu hoạch!',
      kitchen: 'Bếp Cô Ba',
      barn: 'Kho',
      bite: 'Cá cắn câu!',
    },
  },
  /** The plot card on the painted farm: fruit trees and mushroom blocks. */
  plot: {
    /** A fruit tree: harvests so far, and how long it takes to fruit again. */
    tree: (harvests: number, again: string) =>
      harvests > 0
        ? `Thu hoạch lần ${harvests} · ra trái lại sau ${again}`
        : `Cây lâu năm · hái xong ra trái lại sau ${again}`,
    mushroom: (left: number) => `Giá thể nấm · còn ${left} đợt`,
    clearTree: 'Nhổ cây',
    clearBlock: 'Bỏ giá thể',
    confirmTree: (crop: string) => `Nhổ cây ${crop.toLowerCase()}? Cây sẽ mất hẳn.`,
    confirmBlock: (crop: string) => `Bỏ giá thể ${crop.toLowerCase()}? Các đợt còn lại sẽ mất.`,
    confirmYes: 'Đồng ý',
    confirmNo: 'Thôi',
  },
  /** The PlayCanvas corner (experiment). */
  pc: {
    badge: 'PlayCanvas · thử nghiệm',
    loading: 'Đang dựng góc vườn…',
    errors: {
      load: 'Không tải được cảnh 3D (máy có thể chưa hỗ trợ WebGL 2 hoặc mạng bị gián đoạn).',
      timeout: 'Cảnh 3D tải quá lâu.',
      lost: 'Trình duyệt vừa tạm dừng đồ hoạ 3D.',
    },
    errorText: 'Tiến độ vườn vẫn an toàn — chọn cách xem khác hoặc thử lại.',
    retry: 'Thử lại',
    useFlat: 'Dùng vườn 2D',
    useClassic: 'Dùng 3D cũ',
    barLabel: 'Thao tác góc vườn',
    srList: 'Góc vườn 3D',
    deselect: 'Bỏ chọn',
    kicker: 'Góc vườn',
    idleTitle: 'Chạm vào luống hoặc nhà kho',
    statReady: (n: number) => `${n} ô chín`,
    statEmpty: (n: number) => `${n} ô trống`,
    statCans: (cans: number, perDay: number) => `${cans}/${perDay} lượt tưới`,
    barnEmpty: 'Kho còn trống — thu hoạch ô chín để có nguyên liệu.',
    seedsEmpty: 'Khay hạt trống. Mỗi món bạn chốt gửi lại một hạt giống.',
    growProgress: 'Tiến độ lớn',
    planted: (seed: string, plotId: number) => `Đã gieo ${seed.toLowerCase()} vào ô ${plotId}.`,
    watered: (plotId: number) => `Đã tưới ô ${plotId}.`,
    harvested: (n: number) => `Đã thu hoạch ${n} ô về kho.`,
    /** Why a command was not sent. */
    blocks: {
      'no-plot': 'Không tìm thấy ô đất này.',
      occupied: 'Ô này đã có cây.',
      'no-seed': 'Khay đã hết loại hạt này.',
      'not-growing': 'Chỉ tưới được cây đang lớn.',
      wet: 'Đất còn ẩm — tưới lại sau 1 giờ.',
      'empty-can': 'Hết lượt tưới hôm nay.',
      'nothing-ready': 'Chưa có ô nào chín.',
      busy: 'Đang xử lý thao tác trước…',
      rejected: 'Thao tác chưa thực hiện được.',
    },
  },
  /** The painted 2D farm (/farm-animation-test). */
  anim: {
    title: 'Nông trại trên đảo bay',
    loading: 'Đang dựng nông trại…',
    lockLevel: (level: number | string) => `Cấp ${level}`,
    landPrice: (price: number) => `${price} xu`,
    /** Animation showcase panel on /farm-animation-test. */
    showcase: {
      heading: 'Animation showcase',
      hide: 'Ẩn bảng',
      show: 'Bảng điều khiển',
      modes: {
        full: 'Full Farm',
        environment: 'Environment',
        buildings: 'Buildings',
        animals: 'Animals',
        crops: 'Crops',
        water: 'Water',
        particles: 'Particles',
      },
      modeHint: {
        full: 'Cả nông trại chuyển động cùng lúc.',
        environment: 'Mây, cây, cỏ, hoa, lá rơi, bướm và gió. Các nhóm khác đứng yên.',
        buildings: 'Cánh cối xay, khói ống khói, cửa nhà, ánh kính nhà kính, cửa sổ.',
        animals: 'Bò thở, cúi ăn, ve vẩy đuôi; mỗi con gà một nhịp: mổ, đi, vỗ cánh.',
        crops: 'Gieo hạt → nảy mầm → lớn → ra hoa → chín → thu hoạch, lặp lại.',
        water: 'Mặt nước, gợn sóng, cá bơi và nhảy, lá súng, lau sậy.',
        particles: 'Tất cả hiệu ứng hạt, phát lại vài giây một lần.',
      },
      on: 'Bật',
      off: 'Tắt',
      replay: 'Phát lại',
      speed: 'Tốc độ nhóm',
      sliders: {
        animation: 'Animation Speed',
        wind: 'Wind Intensity',
        density: 'Particle Density',
        parallax: 'Parallax Strength',
      },
      gust: 'Gió giật',
      stats: (fps: number, objects: number, wind: number, gust: string) =>
        `${fps} fps · ${objects} vật · gió ${wind} · ${gust}`,
      inspector: 'Sprite',
      inspectHint: 'Bấm vào một vật trong cảnh để xem tên file và các chuyển động của nó.',
      file: 'File',
      group: 'Nhóm',
      animations: 'Chuyển động',
      nothing: 'Không có sprite chuyển động ở chỗ này.',
      particleCounts: 'Hạt đang sống',
      /** Animations each kind of sprite has (sprite inspector). */
      kinds: {
        tree: [
          'Tán lá đung đưa theo gió (lò xo, có trễ)',
          'Các phần tán lệch pha nhau',
          'Lá rơi từ tán',
          'Gió giật lan từ trái sang phải',
        ],
        pine: [
          'Ngọn thông lắc theo gió, biên độ nhỏ hơn cây tán rộng',
          'Lệch pha với cây bên cạnh',
        ],
        bush: ['Lá rung nhẹ theo gió', 'Lệch pha với cây xung quanh'],
        grass: ['Cỏ lay theo gió', 'Run nhanh khi gió giật'],
        flower: [
          'Hoa nghiêng theo gió rồi trở về',
          'Nhún nhẹ',
          'Rung khi bướm bay gần',
          'Phấn hoa bay lên',
        ],
        reed: ['Lau sậy đung đưa theo gió', 'Cây dưới nước lắc chậm, ít theo gió'],
        hay: ['Đống rơm phồng nhẹ theo gió', 'Gió mạnh thổi bay cọng rơm'],
        dock: ['Cầu gỗ đứng yên', 'Dây buộc thuyền đung đưa', 'Gợn nước quanh cọc'],
        cow: [
          'Thở (ngực phồng xẹp)',
          'Cúi đầu ăn cỏ, nhai',
          'Ngẩng đầu nhìn',
          'Lắc đầu đuổi ruồi (tai)',
          'Dồn trọng lượng sang bên',
          'Ve vẩy đuôi',
        ],
        chicken: [
          'Mổ thức ăn 1–3 lần',
          'Đi vài bước rồi dừng (nhún theo bước)',
          'Quay đầu, quay người',
          'Vỗ cánh ngắn',
          'Mỗi con một tính cách và nhịp riêng',
        ],
        goose: ['Thở nhẹ', 'Gật gù đầu', 'Ngó quanh', 'Cúi mổ cỏ 2–3 lần'],
        indoor: ['Cây sau kính khẽ đung đưa, không theo gió'],
        windmill: [
          'Chỉ cánh quạt quay, thân đứng yên',
          'Tốc độ theo gió, có quán tính (tăng tốc, giảm tốc)',
          'Bóng cánh trên thân',
        ],
        chimney: ['Khói bay lên, phồng to, mờ dần', 'Khói nghiêng theo hướng gió'],
        door: ['Cửa mở/đóng khi bấm', 'Thỉnh thoảng tự hé mở'],
        glass: [
          'Vệt sáng phản chiếu trượt trên kính',
          'Không làm rung hay méo nhà kính',
          'Cây bên trong nhà kính khẽ đung đưa',
        ],
        plot: [
          'Gieo hạt: đất văng, hạt rơi',
          'Tưới: giọt nước, đất sẫm màu',
          'Lớn lên: đổi ảnh, bật lên, lấp lánh xanh',
          'Cây đung đưa theo gió',
          'Thu hoạch: cây bay lên, hạt bung, vật phẩm nổi lên',
        ],
        koi: [
          'Bơi theo đường cong, uốn thân',
          'Đổi hướng, dừng nghỉ',
          'Nhảy khỏi mặt nước, bắn nước, rơi lại',
          'Gợn nước khi ngoi lên',
        ],
        lily: ['Lá súng nhấp nhô theo sóng'],
        water: [
          'Vệt sáng mặt nước chạy liên tục',
          'Gợn sóng lan rộng rồi mờ',
          'Vòng ripple ngẫu nhiên',
          'Lấp lánh',
        ],
        cloud: [
          'Mây trôi ngang, mỗi đám một tốc độ',
          'Nhấp nhô lên xuống rất nhẹ',
          'Lặp vòng ngoài khung nhìn',
          'Mây chân đảo đung đưa tại chỗ',
        ],
        fruit: 'Quả đung đưa theo tán (có trễ)',
      },
      reduced: 'Đang bật giảm chuyển động (prefers-reduced-motion): chuyển động được làm dịu.',
    },
  },
};

export default farm;
