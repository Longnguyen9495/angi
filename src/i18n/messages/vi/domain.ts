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
