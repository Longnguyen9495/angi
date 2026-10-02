// Vietnamese strings for the "ranch" namespace (source of truth; see src/i18n/index.ts).
const ranch = {
  /** Entry in the "…" menu and the panel title. */
  menu: 'Chuồng trại',
  title: 'Chuồng trại',
  intro:
    'Cho vật nuôi ăn bằng nông sản trong kho, chờ chúng làm việc rồi thu về kho. Chạm vào con vật, tổ ong hay mặt ao để chúng đáp lại.',
  pens: {
    title: 'Chuồng nuôi',
    empty: (animal: string, level: number) => `Chuồng còn trống — ${animal} về ở cấp ${level}.`,
    /** Text twin of the pen picture, for screen readers. */
    summary: (n: number, ready: number, hungry: number) =>
      `${n} con trong chuồng: ${ready} sẵn sàng thu, ${hungry} đang đói.`,
  },
  state: {
    hungry: 'Đói bụng',
    busy: (left: string) => `Đang làm · còn ${left}`,
    ready: 'Sẵn sàng thu',
    locked: (level: number) => `Mở ở cấp ${level}`,
  },
  feed: (feed: string, have: number) => `Cho ăn ${feed} · có ${have}`,
  feedLabel: (animal: string, feed: string, have: number) =>
    `Cho ${animal} ăn 1 ${feed}, trong kho còn ${have}`,
  noFeed: (feed: string) => `Hết ${feed} — thu hoạch hoặc mua ở chợ`,
  collect: (qty: number, product: string) => `Thu ${qty} ${product}`,
  collectLabel: (animal: string, qty: number, product: string) =>
    `Thu ${qty} ${product} của ${animal} vào kho`,
  hive: {
    title: 'Tổ ong',
    locked: (level: number) => `Tổ ong mở ở cấp ${level}.`,
    idle: 'Tổ đang trống — gọi đàn ong về làm mật.',
    filling: (left: string) => `Ong đang làm mật · còn ${left}`,
    ready: 'Mật đầy tổ rồi!',
    start: 'Gọi ong về làm mật',
    collect: 'Lấy mật',
    collectLabel: (list: string) => `Lấy ${list} vào kho`,
    started: (hours: number) => `Đàn ong đã về tổ. ${hours} giờ nữa có mật.`,
    collected: (list: string) => `Đã lấy ${list} vào kho. Ong lại làm mẻ mới.`,
  },
  pond: {
    title: 'Ao nuôi',
    living: (list: string) => `Trong ao có: ${list}.`,
    next: (name: string, level: number) => `${name} về ao ở cấp ${level}.`,
    hint: 'Chạm mặt nước để rắc mồi cho cá. Muốn câu thì ra ao ngoài vườn.',
  },
  boat: {
    title: 'Thuyền đánh cá',
    locked: (level: number) => `Thuyền mở ở cấp ${level}.`,
    docked: 'Thuyền đang neo ở bến.',
    away: (left: string) => `Thuyền đang ra khơi · về sau ${left}`,
    back: 'Thuyền đã về bến, khoang đầy hải sản!',
    send: 'Cho thuyền ra khơi',
    unload: 'Dỡ hàng vào kho',
    sent: (hours: number) => `Thuyền đã ra khơi. ${hours} giờ nữa quay về.`,
    unloaded: (list: string) => `Thuyền mang về: ${list}. Đã cất vào kho.`,
  },
  qty: (n: number, name: string) => `${n} ${name}`,
  and: ' và ',
};

export default ranch;
