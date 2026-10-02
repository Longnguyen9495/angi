// Vietnamese strings for the "data" namespace (source of truth; see src/i18n/index.ts).
// Game data (crops, recipes, regions, market…) reads these at module load.
const data = {
  crops: {
    rice: { name: 'Lúa', seedName: 'Hạt lúa', produceName: 'Gạo' },
    herbs: { name: 'Rau thơm', seedName: 'Hạt rau thơm', produceName: 'Rau thơm' },
    chili: { name: 'Ớt', seedName: 'Hạt ớt', produceName: 'Ớt' },
    scallion: { name: 'Hành', seedName: 'Củ hành giống', produceName: 'Hành' },
    bean: { name: 'Đậu', seedName: 'Hạt đậu', produceName: 'Đậu' },
    tomato: { name: 'Cà chua', seedName: 'Hạt cà chua', produceName: 'Cà chua' },
    lemongrass: { name: 'Sả', seedName: 'Gốc sả giống', produceName: 'Sả' },
    garlic: { name: 'Tỏi', seedName: 'Tép tỏi giống', produceName: 'Tỏi' },
    cucumber: { name: 'Dưa leo', seedName: 'Hạt dưa leo', produceName: 'Dưa leo' },
    lime: { name: 'Chanh', seedName: 'Cây chanh giống', produceName: 'Chanh' },
  },
  recipes: {
    'com-tam': {
      unlockNote: 'Công thức khởi đầu — mở sẵn cho mọi khách.',
      fact: 'Cơm tấm vốn nấu từ hạt gạo vỡ trong lúc xay xát, nay thành đặc sản Sài Gòn.',
    },
    'bun-rieu': {
      unlockNote: 'Mở sẵn — cần ba nguyên liệu.',
      fact: 'Riêu được làm từ cua đồng giã nhỏ, lọc lấy nước rồi đun cho gạch cua kết lại.',
    },
    'bun-bo-hue': {
      unlockNote: 'Mở sẵn — công thức bốn nguyên liệu.',
      fact: 'Nước dùng bún bò Huế thơm nhờ sả và mắm ruốc, sợi bún to hơn bún thường.',
    },
    'goi-cuon': {
      unlockNote: 'Mở cùng Nam Bộ — tôm câu ở ao.',
      fact: 'Gỏi cuốn không chiên: bánh tráng chỉ nhúng nước, cuốn tôm, thịt, bún và rau sống.',
    },
    'banh-xeo': {
      unlockNote: 'Mở cùng Nam Bộ.',
      fact: 'Tên bánh xèo lấy từ tiếng bột gạo xèo lên khi đổ vào chảo nóng.',
    },
    'bo-luc-lac': {
      unlockNote: 'Mở cùng Nam Bộ — cần tỏi và dưa leo.',
      fact: 'Thịt bò cắt hạt lựu được lắc đều trên chảo thật nóng, nên có tên "lúc lắc".',
    },
    'mi-quang': {
      unlockNote: 'Mở cùng Trung Bộ.',
      fact: 'Mì Quảng chỉ chan xâm xấp nước nhưng rất đậm, ăn kèm bánh tráng nướng và đậu phộng.',
    },
    'com-ga-hoi-an': {
      unlockNote: 'Mở cùng Trung Bộ — cần chanh.',
      fact: 'Gạo được nấu bằng nước luộc gà và chút nghệ nên hạt cơm vàng và thơm.',
    },
    'nem-nuong': {
      unlockNote: 'Mở cùng Trung Bộ — cần tỏi và dưa leo.',
      fact: 'Nem được nướng trên than hoa rồi cuốn cùng rau sống, dưa leo và chấm nước sốt gan.',
    },
    'pho-bo': {
      unlockNote: 'Mở cùng Bắc Bộ — cần chanh.',
      fact: 'Nước phở trong nhờ xương bò ninh nhỏ lửa nhiều giờ cùng gừng, hành nướng và hoa hồi.',
    },
    'bun-cha': {
      unlockNote: 'Mở cùng Bắc Bộ — cần tỏi.',
      fact: 'Chả được nướng trên than hoa, thả vào bát nước chấm chua ngọt có tỏi ớt ngâm.',
    },
    'banh-cuon': {
      unlockNote: 'Mở cùng Bắc Bộ.',
      fact: 'Lá bánh được tráng trên khuôn vải căng trên nồi nước sôi, mỏng đến mức nhìn xuyên được.',
    },
    'banh-mi-chao': {
      unlockNote: 'Mở cùng Nam Bộ — cần trứng gà và sữa bò trong vườn.',
      fact: 'Chảo gang nóng xèo xèo: trứng ốp la, pa tê và xíu mại ăn kèm ổ bánh mì giòn, một kiểu điểm tâm của Sài Gòn.',
    },
    'canh-chua-ca': {
      unlockNote: 'Mở cùng Nam Bộ — cá câu ở ao.',
      fact: 'Canh chua miền Tây nấu cá với me, cà chua, dứa và bạc hà, nêm ngò om cho dậy mùi.',
    },
  },
  animals: {
    chicken: 'Gà mái',
    cow: 'Bò sữa',
  },
  animalProduce: {
    egg: 'Trứng gà',
    milk: 'Sữa bò',
  },
  catches: {
    fish: 'Cá rô đồng',
    shrimp: 'Tôm càng',
  },
  regions: {
    north: {
      name: 'Bắc Bộ',
      shortName: 'Bắc',
      tagline: 'Nước dùng thanh, vị cân bằng',
      specialty: 'Phở bò tái chín',
    },
    central: {
      name: 'Trung Bộ',
      shortName: 'Trung',
      tagline: 'Đậm đà, cay nồng, nhiều món nhỏ',
      specialty: 'Bún bò Huế',
    },
    south: {
      name: 'Nam Bộ',
      shortName: 'Nam',
      tagline: 'Ngọt thanh, nhiều rau, phóng khoáng',
      specialty: 'Cơm tấm sườn bì chả',
    },
  },
  chef: {
    name: 'Cô Ba Bếp',
    role: 'Đầu bếp dẫn đường',
  },
  quests: {
    /** Quest titles by what they count; `n` is the target. */
    metric: {
      choose: (n: number) => (n === 1 ? 'Chốt một món' : `Chốt ${n} món`),
      checkin: (n: number) => (n === 1 ? 'Check-in một bữa' : `Check-in ${n} bữa`),
      plant: (n: number) => `Gieo ${n} hạt`,
      water: (n: number) => `Tưới cây ${n} lần`,
      harvest: (n: number) => `Thu hoạch ${n} ô`,
      cook: (n: number) => (n === 1 ? 'Nấu một món' : `Nấu ${n} món`),
      catch: (n: number) => `Câu được ${n} lần`,
      sell: (n: number) => `Bán ${n} nông sản ở chợ`,
      buy: (n: number) => `Mua ${n} gói hạt ở chợ`,
      feed: (n: number) => `Cho vật nuôi ăn ${n} lần`,
      collect: (n: number) => `Thu trứng hoặc sữa ${n} lần`,
      order: (n: number) => `Giao ${n} đơn cho Cô Ba`,
      photo: (n: number) => `Chụp ${n} ảnh bữa ăn`,
      help: (n: number) => `Tưới giúp bạn vườn ${n} lần`,
      steal: (n: number) => `Hái trộm ở vườn bạn ${n} lần`,
      gift: (n: number) => `Tặng bạn vườn ${n} hạt giống`,
    },
    badges: {
      farmer: { name: 'Nhà nông', goal: (n: number) => `Thu hoạch ${n} ô` },
      cook: { name: 'Đầu bếp', goal: (n: number) => `Nấu ${n} món` },
      recipes: { name: 'Sổ bếp đầy', goal: (n: number) => `Nấu ${n} công thức khác nhau` },
      angler: { name: 'Cần thủ', goal: (n: number) => `Câu được ${n} lần` },
      supplier: { name: 'Mối ruột Cô Ba', goal: (n: number) => `Giao ${n} đơn` },
      neighbour: { name: 'Hàng xóm tốt', goal: (n: number) => `Tưới giúp ${n} lần` },
      sneaky: { name: 'Tay hái nhanh', goal: (n: number) => `Hái trộm ${n} lần` },
      generous: { name: 'Hào phóng', goal: (n: number) => `Tặng ${n} hạt giống` },
      explorer: { name: 'Thực khách', goal: (n: number) => `Ăn ${n} món khác nhau` },
    },
  },
  decor: {
    scarecrow: { name: 'Bù nhìn nón lá', note: 'Đứng gác khu vườn, đội nón lá.' },
    lantern: { name: 'Đèn lồng đỏ', note: 'Sáng lên khi trời tối.' },
    jar: { name: 'Chum nước sành', note: 'Chum hứng nước mưa cạnh luống.' },
    fence: { name: 'Hàng rào tre', note: 'Rào tre bao quanh khu vườn.' },
  },
  budgets: {
    low: { label: 'Dưới 40k', hint: 'Tiết kiệm' },
    mid: { label: '40–70k', hint: 'Vừa túi' },
    high: { label: 'Trên 70k', hint: 'Thoải mái' },
    any: { label: 'Sao cũng được', hint: 'Mọi mức giá' },
  },
  moods: {
    quick: 'Nhanh',
    filling: 'No',
    light: 'Nhẹ',
    novel: 'Đổi vị',
  },
  avoid: {
    seafood: 'Hải sản',
    beef: 'Thịt bò',
    pork: 'Thịt heo',
    spicy: 'Đồ cay',
  },
  groups: {
    noodleSoup: 'Món nước',
    noodleDry: 'Bún/mì khô',
    rice: 'Cơm',
    breadRoll: 'Bánh mì & cuốn',
    pancake: 'Bánh',
  },
  /** Cooking steps per dish family, in order (see src/data/cooking.ts). */
  cooking: {
    rice: ['Vo gạo, cho vào nồi', 'Nướng than', 'Hấp cơm', 'Bày đĩa'],
    noodleSoup: ['Cho nguyên liệu vào nồi', 'Ninh nước dùng', 'Nêm nếm', 'Chần bún, chan nước'],
    breadRoll: ['Sơ chế rau', 'Luộc chín', 'Cuốn tay'],
    noodleDry: ['Cho nguyên liệu vào nồi', 'Xào lửa lớn', 'Trụng mì', 'Trộn nước sốt'],
    pancake: ['Pha bột', 'Đổ chảo', 'Chiên giòn', 'Gấp bánh'],
  },
  /** Classic dishes (src/data/dishes.ts); dish names stay as they are. */
  dishes: {
    'pho-bo': {
      imageAlt: 'Tô phở bò với bánh phở, thịt bò tái và hành lá',
      tags: ['Nước dùng thanh', 'Ấm bụng', 'Món nước'],
      reason:
        'Nước dùng ninh xương kỹ, ăn no mà không ngấy — hợp một buổi trưa cần nạp lại năng lượng.',
      seedNote: 'Bánh phở làm từ gạo, nên phở mang về cho bạn một hạt lúa.',
    },
    'bun-cha': {
      imageAlt: 'Bún chả với chả nướng trong bát nước chấm và rổ rau sống',
      tags: ['Nướng than', 'Rau sống', 'Chua ngọt'],
      reason: 'Chả nướng than thơm khói, nước chấm chua ngọt dễ ăn — đổi gió khỏi cơm văn phòng.',
      seedNote: 'Rổ rau sống là linh hồn của bún chả — bạn nhận hạt rau thơm.',
    },
    'bun-rieu': {
      imageAlt: 'Bát bún riêu với riêu cua, cà chua và đậu phụ rán',
      tags: ['Chua thanh', 'Nhẹ bụng', 'Món nước'],
      reason: 'Vị chua thanh của cà chua và riêu cua giúp tỉnh người, ăn xong không buồn ngủ.',
      seedNote: 'Cà chua tạo nên màu và vị chua của riêu — bạn nhận hạt cà chua.',
    },
    'banh-cuon': {
      imageAlt: 'Đĩa bánh cuốn mỏng rắc hành phi, kèm chả lụa',
      tags: ['Mỏng mềm', 'Lên món nhanh', 'Hành phi'],
      reason: 'Tráng tại chỗ, lên món trong vài phút — lựa chọn gọn khi bạn chỉ có ít thời gian.',
      seedNote: 'Hành phi rắc trên bánh cuốn là điểm nhấn — bạn nhận một củ hành giống.',
    },
    'com-dau-phu-sot-ca': {
      imageAlt: 'Đĩa cơm trắng với đậu phụ sốt cà chua và rau luộc',
      tags: ['Món chay', 'Cơm nhà', 'Tiết kiệm'],
      reason: 'Cơm nhà quen vị, no lâu mà vẫn nhẹ túi — phù hợp khi muốn ăn chay đơn giản.',
      seedNote: 'Đậu phụ làm từ đậu nành — bạn nhận một hạt đậu.',
    },
    'bun-bo-hue': {
      imageAlt: 'Tô bún bò Huế nước đỏ cam với chả, bắp bò và ớt',
      tags: ['Cay nồng', 'Sả thơm', 'Món nước'],
      reason: 'Nước dùng sả ớt đậm đà, cay vừa đủ ấm người — khi bạn muốn một bữa thật “đã”.',
      seedNote: 'Sa tế ớt làm nên màu đỏ của bún bò — bạn nhận hạt ớt.',
    },
    'mi-quang': {
      imageAlt: 'Tô mì Quảng sợi vàng với tôm, thịt, bánh tráng mè và rau',
      tags: ['Ít nước', 'Bánh tráng mè', 'Rau sống'],
      reason: 'Ít nước, nhiều topping, bẻ bánh tráng mè giòn — đổi vị thú vị cho ngày thường.',
      seedNote: 'Mì Quảng không thể thiếu rau sống — bạn nhận hạt rau thơm.',
    },
    'com-ga-hoi-an': {
      imageAlt: 'Đĩa cơm vàng nghệ với gà xé, hành tây và rau răm',
      tags: ['Cơm nghệ', 'Gà xé', 'Không cay'],
      reason: 'Cơm nấu nước gà vàng óng, gà xé trộn rau răm — no mà vẫn thanh.',
      seedNote: 'Hành tây trộn gỏi gà giúp món cân vị — bạn nhận một củ hành giống.',
    },
    'banh-beo': {
      imageAlt: 'Khay bánh bèo trong chén nhỏ phủ tôm chấy và tóp mỡ',
      tags: ['Ăn nhẹ', 'Món Huế', 'Chén nhỏ'],
      reason:
        'Từng chén nhỏ mềm mịn, ăn nhẹ nhàng — hợp khi bạn chưa đói lắm nhưng muốn thử vị mới.',
      seedNote: 'Bánh bèo làm từ bột gạo — bạn nhận một hạt lúa.',
    },
    'com-chay-hue': {
      imageAlt: 'Mâm cơm chay với đậu, nấm, rau xào và chả chay',
      tags: ['Món chay', 'Nhiều rau', 'Thanh đạm'],
      reason: 'Ẩm thực chay xứ Huế tinh tế, nhiều món nhỏ — nhẹ bụng cho buổi chiều làm việc.',
      seedNote: 'Đậu là nguồn đạm chính của mâm chay — bạn nhận một hạt đậu.',
    },
    'com-tam': {
      imageAlt: 'Đĩa cơm tấm với sườn nướng, bì, chả trứng và mỡ hành',
      tags: ['Sườn nướng', 'No lâu', 'Mỡ hành'],
      reason: 'Sườn nướng thơm, cơm tấm tơi — lựa chọn chắc bụng cho buổi chiều dài.',
      seedNote: 'Cơm tấm làm từ hạt gạo vỡ — bạn nhận một hạt lúa.',
    },
    'hu-tieu-nam-vang': {
      imageAlt: 'Tô hủ tiếu nước trong với tôm, thịt băm và hẹ',
      tags: ['Nước trong', 'Tôm thịt', 'Món nước'],
      reason: 'Nước dùng ngọt thanh từ xương, topping đầy đặn — một tô là đủ cho cả buổi.',
      seedNote: 'Hẹ và hành phi làm thơm hủ tiếu — bạn nhận một củ hành giống.',
    },
    'banh-mi-thit': {
      imageAlt: 'Ổ bánh mì giòn kẹp thịt, dưa góp, rau mùi và ớt',
      tags: ['Mang đi', 'Siêu nhanh', 'Giòn rụm'],
      reason: 'Cầm đi được, ăn trong năm phút — cứu cánh cho ngày họp dồn dập.',
      seedNote: 'Lát ớt tươi làm ổ bánh mì “tỉnh” hơn — bạn nhận hạt ớt.',
    },
    'goi-cuon-chay': {
      imageAlt: 'Đĩa gỏi cuốn chay trong suốt với rau, bún và đậu, kèm nước chấm',
      tags: ['Món chay', 'Mát', 'Nhiều rau'],
      reason: 'Cuốn tươi mát, nhiều rau — nhẹ nhàng cho ngày nóng hoặc khi muốn ăn thanh.',
      seedNote: 'Rau thơm cuộn trong bánh tráng là chìa khoá — bạn nhận hạt rau thơm.',
    },
    'canh-chua-ca': {
      imageAlt: 'Nồi canh chua cá lóc với cà chua, dứa, bạc hà và giá',
      tags: ['Chua ngọt', 'Cơm nhà', 'Miền Tây'],
      reason:
        'Canh chua me, dứa và cà chua giải nhiệt — bữa cơm kiểu nhà khi bạn ăn cùng đồng nghiệp.',
      seedNote: 'Cà chua góp vị chua ngọt cho nồi canh — bạn nhận hạt cà chua.',
    },
    'banh-xeo': {
      imageAlt: 'Chiếc bánh xèo vàng giòn gập đôi với tôm, thịt, giá đỗ và rau',
      tags: ['Giòn rụm', 'Cuốn rau', 'Ăn chung'],
      reason: 'Vỏ giòn, nhân tôm thịt giá đỗ, cuốn rau chấm mắm — vui miệng khi đi ăn nhóm.',
      seedNote: 'Giá đỗ trong nhân bánh nảy mầm từ hạt đậu xanh — bạn nhận một hạt đậu.',
    },
    'lau-nam-chay': {
      imageAlt: 'Nồi lẩu nấm chay với nhiều loại nấm, đậu hũ và rau xanh',
      tags: ['Món chay', 'Ăn nhóm', 'Nước dùng rau củ'],
      reason: 'Nhiều loại nấm ngọt tự nhiên, ăn nóng mà nhẹ — hợp bữa trưa nhóm muốn ăn chay.',
      seedNote: 'Rau thơm nhúng lẩu làm dậy mùi nấm — bạn nhận hạt rau thơm.',
    },
  },
  /** The reel catalogue and its adapter into the game. */
  reel: {
    /** Dish price, given in thousand VND. */
    price: (thousands: number) => `${thousands}k`,
    regionLabel: {
      north: 'Bắc Bộ',
      central: 'Trung Bộ',
      south: 'Nam Bộ',
      world: 'Thế giới',
    },
    tags: {
      spicy: 'Cay',
      rich: 'Đậm béo',
      fresh: 'Thanh mát',
      crunchy: 'Giòn',
      sweet: 'Ngọt dịu',
      vegetarian: 'Món chay',
    },
    /** Ingredient named in the seed note when a dish has no crop ingredient. */
    seedFallback: 'Rau thơm',
    imageAlt: (name: string, subtitle: string) => `${name} — ${subtitle}`,
    seedNote: (ingredient: string, dish: string, crop: string, seed: string) =>
      `${ingredient} trong ${dish} gắn với cây ${crop.toLowerCase()} — bạn nhận ${seed.toLowerCase()}.`,
  },
};

export default data;
