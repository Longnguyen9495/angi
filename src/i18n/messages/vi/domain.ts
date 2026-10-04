// Vietnamese strings for the "domain" namespace (source of truth; see src/i18n/index.ts).
const domain = {
  /** Cô Ba's daily order lines; one is picked per order by the day's hash. */
  orderLines: [
    'Quán đông khách trưa nay, Cô Ba cần gấp ít nguyên liệu.',
    'Cô Ba đang ninh nồi nước dùng, còn thiếu chút nữa thôi.',
    'Có khách đặt cỗ tối nay — giúp Cô Ba một tay nhé.',
    'Cô Ba muốn thử một món mới, cần nguyên liệu tươi từ vườn.',
    'Chợ sáng hết hàng, Cô Ba nhờ khu vườn của bạn.',
    'Nồi canh chua đang chờ, chỉ thiếu vài thứ từ vườn.',
  ],
  /** Guests who come to the farm's kitchen for a dish; `ask` gets the dish name. */
  guests: [
    {
      id: 'ba-tu',
      name: 'Bà Tư',
      from: 'Chợ Bà Chiểu',
      ask: (dish: string) => `Lâu rồi chưa ăn ${dish} đúng vị, con nấu cho bà một phần nghen.`,
    },
    {
      id: 'chu-hai',
      name: 'Chú Hai xe ôm',
      from: 'đầu hẻm',
      ask: (dish: string) => `Chạy cả buổi sáng đói meo, cho chú một phần ${dish} cho chắc bụng.`,
    },
    {
      id: 'co-lan',
      name: 'Cô giáo Lan',
      from: 'trường làng',
      ask: (dish: string) => `Chiều nay cô dạy thêm, nhờ em nấu giúp cô ${dish} mang theo nhé.`,
    },
    {
      id: 'anh-minh',
      name: 'Anh Minh',
      from: 'văn phòng trên phố',
      ask: (dish: string) =>
        `Cả phòng đặt ${dish} cho bữa trưa, làm giúp anh một phần thật ngon nha.`,
    },
    {
      id: 'ong-bay',
      name: 'Ông Bảy ngư dân',
      from: 'bến cá',
      ask: (dish: string) => `Ra khơi về mệt, ông thèm ${dish} nóng hổi.`,
    },
    {
      id: 'chi-hanh',
      name: 'Chị Hạnh',
      from: 'gánh xôi đầu chợ',
      ask: (dish: string) => `Bán xong gánh xôi rồi, chị muốn đổi vị với một phần ${dish}.`,
    },
    {
      id: 'be-na',
      name: 'Bé Na',
      from: 'nhà bên',
      ask: (dish: string) => `Mẹ cho Na tiền mua ${dish} nè, Na chờ ở đây nha!`,
    },
    {
      id: 'mark',
      name: 'Mark',
      from: 'du khách',
      ask: (dish: string) => `Mình nghe nói ${dish} là phải thử, bạn nấu giúp mình nhé?`,
    },
  ],
  recovery: {
    oldVersion: 'Dữ liệu lưu từ phiên bản cũ nên nông trại được bắt đầu lại.',
    corrupt: 'Dữ liệu lưu trên máy bị lỗi nên nông trại được bắt đầu lại.',
    unreadable: 'Không đọc được dữ liệu lưu trên máy nên nông trại được bắt đầu lại.',
  },
  relax: {
    budget: (label: string) => `Bỏ giới hạn ngân sách “${label}”`,
    vegetarian: 'Tắt lọc “Chỉ món chay”',
    moods: 'Bỏ chọn khẩu vị',
    avoid: (label: string) => `Thôi tránh “${label}”`,
    hidden: 'Hiện lại các món đã ẩn',
  },
  plotStage: {
    empty: 'Ô trống',
    sprout: 'Mầm non',
    young: 'Đang lớn',
    flowering: 'Ra hoa',
    ready: 'Sẵn sàng thu hoạch',
  },
  slot: {
    breakfast: 'bữa sáng',
    lunch: 'bữa trưa',
    dinner: 'bữa tối',
  },
  duration: {
    minutes: (m: number) => `${m} phút`,
    hours: (h: number) => `${h} giờ`,
    hoursMinutes: (h: number, m: number) => `${h} giờ ${m} phút`,
  },
};

export default domain;
