// Vietnamese strings for the "reel" namespace (source of truth; see src/i18n/index.ts).
// The brand is passed in (`brand`) rather than imported, so this file never depends on i18n/index.
const reel = {
  docTitle: (brand: string) => `${brand} — Quay món, tìm quán ngay`,
  docTitleDish: (brand: string, dish: string) => `${dish} — ${brand}`,

  header: {
    tag: 'Food reel',
    navLabel: 'Tiện ích',
    sound: 'Âm thanh',
    soundOn: 'Âm thanh: bật. Nhấn để tắt',
    soundOff: 'Âm thanh: tắt. Nhấn để bật',
    about: 'Về dự án',
    saved: 'Đã lưu',
    // Vietnamese nouns do not inflect; English needs the count.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    savedUnit: (_n: number) => 'món',
    farm: 'Nông trại',
    farmStats: (level: number, streak: number) => `Cấp ${level} · ${streak} ngày`,
    pendingCheckIn: ', chờ check-in',
    profile: 'Hồ sơ và cài đặt',
  },

  stage: {
    label: 'Food reel',
    headline: ['Ăn', 'gì?'],
    subCrop: (n: number, seed: string) => `${n} món cho ${seed}`,
    subPool: (n: number) => `Rổ quay · ${n} món bạn chọn`,
    subAll: (n: number) => `${n} món · ba miền & thế giới`,
    hintHover: 'Kéo để khám phá · Nhấn để xem câu chuyện',
    hintTouch: 'Vuốt để lướt · Chạm để xem chuyện',
  },

  announce: {
    spinPool: (n: number) => `Quay trong rổ: ${n} món.`,
    spinAll: (n: number) => `Quay trong tất cả ${n} món.`,
    spinCrop: (seed: string) => `Quay giữa các món cho ${seed}.`,
    eliminated: (dish: string, left: number) => `Đã loại ${dish}. Quay tiếp ${left} món.`,
    picked: (dish: string) => `Đã chọn ${dish}`,
    confirmed: (dish: string) => `Đã chốt ${dish}.`,
    poolAdded: (dish: string) => `Đã thêm ${dish} vào rổ quay.`,
    poolRemoved: (dish: string) => `Đã bỏ ${dish} khỏi rổ quay.`,
  },

  confirmError: 'Chưa chốt được — mạng giả lập đang lỗi. Món vẫn ở đây, bạn thử lại nhé.',

  empty: {
    title: 'Chưa có món nào',
    text: 'Thực đơn đang trống. Vào trang quản trị, tải ảnh món ăn lên — AI sẽ nhận diện và điền thông tin giúp bạn.',
    cta: 'Thêm món đầu tiên',
  },

  boot: 'Đang bày món…',

  saved: {
    title: 'Món đã lưu',
    description: 'Lưu trên thiết bị này, không cần tài khoản.',
    empty: 'Chưa có món nào. Mở câu chuyện một món và nhấn “Lưu món” để giữ lại ở đây.',
    open: (dish: string) => `Xem câu chuyện ${dish}`,
    remove: (dish: string) => `Bỏ lưu ${dish}`,
  },

  about: {
    title: 'Về dự án',
    lead: (n: number) =>
      ` là một trải nghiệm chọn món bằng chuyển động: quay reel, để ${n} món lướt qua, rồi dừng lại ở một món để đọc câu chuyện của nó.`,
    fair: 'Kết quả quay được quyết định trước khi reel chuyển động; hiệu ứng chỉ trình diễn quãng đường đến món đó. Không có đăng nhập, không có quảng cáo hay thanh toán.',
    farmBefore: 'Sau khi chốt món, phần ',
    farmEm: 'Nông trại',
    farmAfter:
      ' mở ra: hạt giống, khu vườn, bản đồ ẩm thực và check-in sau bữa. Tiến trình lưu trên thiết bị của bạn; muốn giữ khi đổi máy thì lưu bằng email trong Hồ sơ (không bắt buộc).',
    privacy: (brand: string) => `Quyền riêng tư — ${brand} lưu những gì và cách xoá`,
    language: 'Ngôn ngữ',
    note: 'Ảnh món chỉ mang tính minh hoạ (xem ghi chú trong từng câu chuyện). Giá chỉ mang tính tham khảo; thông tin thành phần không thay thế tư vấn dị ứng. Mỗi món có câu chuyện về nguồn gốc và ý nghĩa — mở món để đọc.',
  },

  reel: {
    roleDescription: 'băng chuyền món ăn',
    label: (pooled: boolean, n: number) =>
      `${pooled ? 'Rổ quay' : 'Vũ trụ món ăn'}: ${n} món. Dùng phím mũi tên để đổi món, Enter để xem câu chuyện.`,
    current: (no: number, dish: string, region: string, price: string) =>
      `Đang ở món ${no}: ${dish}, ${region}, ${price}`,
    itemDetails: (subtitle: string, region: string, price: string) =>
      ` — ${subtitle}, ${region}, khoảng ${price}.`,
    itemOpen: 'Nhấn để xem câu chuyện món ăn',
    itemCentre: 'Nhấn để đưa món ra giữa',
  },

  spin: {
    label: 'Quay món',
    busy: 'Đang quay…',
    counter: (current: number, total: number) => `Món ${current} trên ${total}`,
  },

  /** Lượt quay: free per day, then bought (server/lib/Spins.php). */
  quota: {
    badge: (free: number, credits: number) =>
      credits > 0
        ? `Còn ${free} lượt miễn phí hôm nay và ${credits} lượt đã mua`
        : `Còn ${free} lượt quay miễn phí hôm nay`,
    title: 'Hết lượt quay hôm nay',
    lead: (free: number, resetIn: string) =>
      `Mỗi ngày bạn có ${free} lượt quay miễn phí — lượt mới có lại sau ${resetIn}.`,
    networkFull:
      'Mạng bạn đang dùng đã hết lượt miễn phí dành cho khách. Đăng nhập để dùng lượt của riêng bạn.',
    signInLead: 'Đăng nhập (chỉ cần email) để nhận lượt miễn phí của riêng bạn và mua thêm lượt.',
    signIn: 'Đăng nhập để quay tiếp',
    buyTitle: 'Mua thêm lượt quay',
    perSpin: (price: string) => `${price} / lượt — dùng dần, không hết hạn`,
    pack: (n: number) => `${n} lượt`,
    paymentsOff: 'Hiện chưa mở mua thêm lượt — quay lại vào ngày mai nhé.',
    payTitle: (n: number) => `Chuyển khoản để nhận ${n} lượt`,
    scan: 'Mở app ngân hàng và quét mã — số tiền và nội dung đã điền sẵn.',
    qrLabel: (amount: string, memo: string) => `Mã VietQR chuyển ${amount}, nội dung ${memo}`,
    bank: 'Ngân hàng',
    account: 'Số tài khoản',
    holder: 'Chủ tài khoản',
    amount: 'Số tiền',
    memo: 'Nội dung',
    memoHint: 'Giữ nguyên nội dung chuyển khoản để hệ thống nhận ra đơn của bạn.',
    copy: 'Chép',
    copied: 'Đã chép',
    waiting: 'Đang chờ xác nhận thanh toán — thường chỉ vài phút.',
    paid: (n: number) => `Đã nhận thanh toán — cộng ${n} lượt quay!`,
    expired: 'Đơn này đã hết hạn — chọn gói để tạo đơn mới nhé.',
    otherPack: 'Chọn gói khác',
    later: 'Để sau',
    orderFailed: 'Chưa tạo được đơn, thử lại nhé.',
    hours: (h: number, m: number) => (h > 0 ? `${h} giờ ${m} phút` : `${m} phút`),
  },

  selected: {
    kicker: (pooled: boolean, no: string) => `${pooled ? 'Rổ' : 'Reel'} chọn cho bạn · ${no}`,
    region: 'Vùng',
    price: 'Tham khảo',
    portion: 'Phần',
    explore: 'Khám phá món này',
    eliminate: 'Loại & quay tiếp',
    back: 'Quay lại',
  },

  pool: {
    groupLabel: 'Quay trong',
    all: 'Tất cả',
    basket: 'Rổ',
    pickSome: 'Chọn vài món',
    edit: 'Sửa rổ quay',
  },

  picker: {
    title: 'Rổ quay',
    description: (min: number) => `Chọn từ ${min} món trở lên — reel sẽ chỉ quay giữa các món này.`,
    none: 'Chưa chọn món',
    pickedPrefix: 'Đã chọn ',
    pickedCount: (n: number) => `${n} món`,
    clear: 'Bỏ hết',
    addMore: (n: number) => `Thêm ${n} món`,
    spinN: (n: number) => `Quay ${n} món`,
    search: 'Tìm món',
    searchPlaceholder: 'Tìm món: phở, bún, cơm…',
    filtersLabel: 'Lọc món',
    filterAll: 'Tất cả',
    filterPicked: 'Trong rổ',
    filterVeg: 'Món chay',
    addSaved: (n: number) => `Thêm ${n} món đã lưu`,
    noMatch: 'Không có món nào khớp.',
    gridLabel: 'Món có thể thêm vào rổ',
  },

  story: {
    back: 'Quay lại',
    backSuffix: ' reel',
    saved: 'Đã lưu',
    save: 'Lưu món',
    pool: 'Rổ quay',
    poolIn: 'Đang trong rổ quay — nhấn để bỏ ra',
    poolAdd: 'Thêm vào rổ quay',
    ingredients: 'Thành phần',
    origin: 'Vùng miền & xuất xứ',
    flavor: 'Hồ sơ vị',
    credit: (credit: string) => `Ảnh món: ${credit}. Giá chỉ mang tính tham khảo.`,
    confirming: 'Đang chốt…',
    retry: 'Thử chốt lại',
    confirm: 'Chốt món này',
    spinOther: 'Quay món khác',
    cooked: (n: number) => `Tự nấu ×${n} ở Nông trại · `,
    regionStory: {
      north:
        'Bắc Bộ chuộng vị thanh và cân bằng: nước dùng trong, gia vị vừa đủ để nguyên liệu tự lên tiếng.',
      central:
        'Trung Bộ đậm đà và nồng nàn: sả, ớt, mắm ruốc và những món nhỏ tinh tế của đất cố đô.',
      south:
        'Nam Bộ phóng khoáng, ngọt thanh, nhiều rau sống — bữa ăn luôn có chút vui của sông nước.',
      world: 'Một món từ bếp thế giới, đã quen thuộc trên những con phố ăn trưa ở Việt Nam.',
    },
  },

  flavor: {
    spicy: 'Cay',
    sweet: 'Ngọt',
    rich: 'Béo',
    fresh: 'Thanh',
    crunchy: 'Giòn',
  },

  ingredients: {
    of: (dish: string) => `Thành phần của ${dish}`,
  },

  epilogue: {
    kicker: (slot: string) => `Đã chốt cho ${slot}`,
    lede: 'Chúc bạn ngon miệng. Món này gửi lại một hạt giống cho Nông trại — gieo ngay nếu thích, hoặc cứ để trong khay.',
    saving: 'Đang ghi lại lựa chọn của bạn…',
    openFarm: 'Mở Nông trại',
    spinNew: 'Quay món mới',
  },

  journey: {
    dialog: 'Nông trại của bạn',
    back: 'Về reel',
    title: 'Nông trại',
    loading: 'Đang mở Nông trại…',
  },

  order: {
    title: (dish: string) => `Tìm quán & đặt món · ${dish}`,
    cityLabel: 'ShopeeFood giao ở',
    newTab: ' (mở tab mới)',
    fine: 'Mở trang tìm kiếm của từng dịch vụ với tên món. Giá và quán do họ cung cấp.',
    nearby: 'Quán gần bạn',
    delivery: 'Giao tận nơi',
    cities: {
      'ho-chi-minh': 'TP. HCM',
      'ha-noi': 'Hà Nội',
      'da-nang': 'Đà Nẵng',
      'hai-phong': 'Hải Phòng',
      'binh-duong': 'Bình Dương',
      'dong-nai': 'Đồng Nai',
      hue: 'Huế',
    },
  },
};

export default reel;
