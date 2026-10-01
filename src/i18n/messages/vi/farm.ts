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
  },
};

export default farm;
