import type { ReelDish } from '../foodReel.types';

export interface StorySource {
  label: string;
  url?: string;
  status: 'catalogue' | 'not-checked';
}
export interface DishNarrative {
  version: 1;
  language: 'vi';
  coverage: 'curated' | 'catalogue';
  origin: string[];
  culture: string[];
  tasting: string[];
  sources: StorySource[];
}
interface Editorial {
  origin: string[];
  culture: string[];
  tasting: string[];
  reference?: { label: string; url: string };
}

/** Editorial context, not a claim of primary-source historical verification.
 * Exact IDs only: a similarly named dish must not silently inherit a history.
 */
export const CURATED_STORIES: Readonly<Record<string, Editorial>> = {
  'pho-bo': {
    origin: [
      'Phở bò gắn với không gian ẩm thực miền Bắc, đặc biệt là Hà Nội và Nam Định. Nơi khai sinh và quá trình định hình phở có nhiều cách giải thích; trang này không xác định một người sáng tạo hay một năm ra đời.',
      'Từ một món nước, phở có nhiều cách phục vụ: thịt chín, tái, gầu hay các phần thịt khác. Một tô trong catalogue là một phiên bản cụ thể, không đại diện cho mọi hàng phở.',
    ],
    culture: [
      'Cái thú của phở nằm ở nhịp ăn: hít mùi nước dùng nóng, nếm trước rồi mới thêm gia vị. Quán phở buổi sáng cũng là một không gian sinh hoạt đời thường, nơi khẩu vị riêng được thể hiện qua từng cách gọi món.',
      'Sự khác nhau giữa các vùng không phải cuộc thi về tính “đúng”. Rau ăn kèm, độ ngọt và gia vị có thể thay đổi theo người nấu và thói quen địa phương.',
    ],
    tasting: [
      'Nếm nước dùng trước khi cho chanh, ớt hoặc tương để nhận ra vị nền. Gắp bánh phở cùng thịt, rồi thử một miếng với hành hoặc rau thơm để cảm nhận sự đổi khác.',
      'Thịt tái cần được làm chín phù hợp; nếu có yêu cầu an toàn thực phẩm, hãy hỏi quán và chọn thịt chín.',
    ],
    reference: {
      label: 'Phở — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/Ph%E1%BB%9F',
    },
  },
  'bun-cha-ha-noi': {
    origin: [
      'Bún chả được nhận diện rõ trong ẩm thực Hà Nội nhờ thịt nướng, bún và bát nước chấm ăn kèm. Tên món mô tả cách kết hợp ấy; không cần gán cho nó một truyền thuyết để hiểu sức hấp dẫn.',
      'Chả miếng và chả viên tạo hai cách cảm nhận thịt nướng. Tỷ lệ thịt, cách ướp và độ đậm của nước chấm thay đổi giữa các quán.',
    ],
    culture: [
      'Bún chả là trải nghiệm tự phối một miếng ăn: bún, thịt, rau và đồ chua nằm cạnh nhau thay vì được trộn sẵn. Người ăn quyết định sự cân bằng trong từng lượt gắp.',
      'Mùi nướng và bữa trưa quán nhỏ là những liên tưởng quen thuộc của món. Đây là mô tả văn hóa ăn uống, không phải bằng chứng về thời điểm món xuất hiện.',
    ],
    tasting: [
      'Thử thịt với một ít nước chấm, sau đó thêm bún và rau. Nếu nước chấm đậm, nhúng từng phần thay vì ngâm toàn bộ bún.',
      'Rau sống và thịt nướng cần được xử lý an toàn; hỏi quán khi có dị ứng hoặc cần tránh một thành phần.',
    ],
    reference: {
      label: 'Bún chả — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_ch%E1%BA%A3',
    },
  },
  'bun-bo-hue': {
    origin: [
      'Tên bún bò Huế gắn món với Huế, nhưng các tô bún ngày nay có nhiều biến thể về phần thịt và đồ ăn kèm. Không nên suy từ tên món rằng mọi nguyên liệu đều có cùng một nguồn gốc.',
      'Sả và gia vị lên men thường tạo nét nhận diện của nước dùng. Cách dùng mắm, độ cay và sự xuất hiện của giò heo tùy công thức; hãy đối chiếu danh sách thành phần của phiên bản đang xem.',
    ],
    culture: [
      'Một tô bún vừa có phần nước thơm vừa có những miếng thịt với kết cấu khác nhau. Ý nghĩa của món trong bữa ăn nằm ở cách kết hợp đó, chứ không chỉ ở mức cay.',
      'Khi món đi khỏi Huế, khẩu vị thường được điều chỉnh. Sự biến đổi là một phần của đời sống món ăn, không đủ để kết luận phiên bản nào là nguyên bản.',
    ],
    tasting: [
      'Nếm nước trước, thêm sa tế từng ít một. Thử bún với rau để cảm nhận tương phản giữa nước nóng và phần rau tươi.',
      'Gia vị lên men có thể chứa hải sản; người dị ứng nên xác nhận với quán thay vì dựa riêng vào tên “bún bò”.',
    ],
    reference: {
      label: 'Bún bò Huế — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_b%C3%B2_Hu%E1%BA%BF',
    },
  },
  'mi-quang-tom-thit': {
    origin: [
      'Mì Quảng gắn với Quảng Nam; phiên bản tôm thịt là một cách phối nguyên liệu quen thuộc, không phải công thức duy nhất. Món cũng có thể được nấu với các loại thịt hoặc hải sản khác.',
      'Điểm đáng chú ý là lượng nước dùng thường vừa phải, đủ bao quanh sợi mì thay vì tạo một tô nước đầy. Sợi mì, rau và phần topping cùng góp vào nhận diện món.',
    ],
    culture: [
      'Mì Quảng cho thấy một món ăn có thể được cảm nhận qua nhiều lớp kết cấu: sợi mì mềm, phần thịt và tôm, rau tươi và đồ ăn kèm giòn nếu có.',
      'Tên vùng là bối cảnh để hiểu món, không phải chứng nhận xuất xứ của tô đang được bán. Phiên bản trong catalogue vẫn cần được đọc qua nguyên liệu thực tế.',
    ],
    tasting: [
      'Trộn nhẹ để nước dùng áo đều sợi mì. Nếu có bánh tráng hoặc đậu phộng, thêm từng phần để giữ độ giòn.',
      'Xác nhận tôm, đậu phộng và gia vị với quán khi có dị ứng; không coi danh mục này là danh sách dị nguyên đầy đủ.',
    ],
    reference: {
      label: 'Mì Quảng — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/M%C3%AC_Qu%E1%BA%A3ng',
    },
  },
  'com-tam-suon-bi-cha': {
    origin: [
      'Gạo tấm là phần hạt gạo bị vỡ trong quá trình xay xát. Cơm tấm biến đặc điểm ấy thành một nền cơm có kết cấu riêng, đi cùng nhiều lựa chọn thức ăn.',
      'Phiên bản sườn, bì, chả đặt ba kết cấu trên cùng một đĩa: thịt nướng, bì thái sợi và chả. Cơm tấm gắn mạnh với đời sống ăn uống Sài Gòn, nhưng trang này không khẳng định niên đại hay câu chuyện về người đầu tiên bán món.',
    ],
    culture: [
      'Một đĩa cơm tấm là bữa ăn có thể tùy chọn: người ăn thêm hoặc bớt phần thịt, chả, đồ chua và nước mắm theo khẩu vị. Cách gọi món ngắn gọn cũng thể hiện nhịp sinh hoạt của quán cơm.',
      'Hạt cơm nhỏ không làm món kém giá trị. Điều đáng khám phá là cách một nguyên liệu bình dị được kết hợp thành bữa ăn phong phú.',
    ],
    tasting: [
      'Thử cơm riêng rồi phối với sườn và chút nước mắm. Xen kẽ đồ chua để nhận ra sự cân bằng giữa vị đậm, béo và chua.',
      'Bì, chả và nước chấm có thể khác giữa các quán. Hỏi trực tiếp nếu cần tránh trứng, thịt heo hoặc gia vị nào đó.',
    ],
    reference: {
      label: 'Cơm tấm — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/C%C6%A1m_t%E1%BA%A5m',
    },
  },
  'banh-xeo': {
    origin: [
      'Tên bánh xèo gợi tiếng bột khi chạm chảo nóng. Bánh có nhiều phiên bản theo vùng về kích thước, phần nhân và cách ăn kèm; không thể suy ra một nguồn gốc duy nhất từ hình ảnh chiếc bánh.',
      'Điểm chung đáng quan sát là lớp vỏ được đổ trên chảo, ôm phần nhân. Màu sắc và độ giòn phụ thuộc công thức bột, nhiệt và cách chiên.',
    ],
    culture: [
      'Bánh xèo thường được chia thành miếng để ăn cùng rau và nước chấm. Động tác cuốn cho phép mỗi người tự cân bằng lớp vỏ béo giòn với rau tươi.',
      'Nếu cùng chia một chiếc bánh, trải nghiệm món cũng nằm ở việc gắp, cuốn và trao đổi khẩu vị. Không phải mọi vùng đều dùng cùng loại rau hay bánh tráng.',
    ],
    tasting: [
      'Ăn khi bánh còn nóng để cảm nhận vỏ giòn. Cuốn miếng vừa ăn với rau, chấm ít rồi điều chỉnh.',
      'Nhân có thể chứa tôm, thịt hoặc giá; kiểm tra với quán khi có dị ứng.',
    ],
    reference: {
      label: 'Bánh xèo — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_x%C3%A8o',
    },
  },
  'com-ga-hoi-an': {
    origin: [
      'Tên cơm gà Hội An gắn món với Hội An, Quảng Nam. Cơm, gà và phần rau ăn kèm tạo nên một đĩa ăn có nhiều lớp hương và kết cấu.',
      'Cách nấu cơm bằng nước gà và cách xé hoặc chặt thịt tùy quán. Trang này mô tả nét nhận diện phổ biến, không xác định một gia đình hay thời điểm khai sinh món.',
    ],
    culture: [
      'Khác với việc đặt một miếng gà lên cơm trắng, món mời người ăn chú ý cả phần cơm và phần rau. Sự hòa hợp của các phần là điều đáng khám phá.',
      'Địa danh trong tên giúp đặt món vào bối cảnh ẩm thực, nhưng không chứng minh nguyên liệu của đĩa ăn được sản xuất tại Hội An.',
    ],
    tasting: [
      'Thử cơm trước, rồi ăn cùng gà và rau để nhận ra độ thơm, độ mềm và độ tươi. Thêm nước chấm từng ít một.',
      'Gà cần chín an toàn; thành phần rau và nước chấm nên được xác nhận tại quán.',
    ],
  },
  'banh-mi-thit-nuong': {
    origin: [
      'Bánh mì Việt Nam kết hợp ổ bánh với các loại nhân và gia vị thành một bữa ăn cầm tay. Phiên bản thịt nướng đặt mùi nướng bên cạnh vỏ bánh giòn và phần rau ăn kèm.',
      'Mối liên hệ của ổ bánh với truyền thống bánh mì Pháp là bối cảnh phổ biến, nhưng không đủ để gán một ngày khai sinh cho bánh mì thịt nướng. Công thức nhân thay đổi rất rộng.',
    ],
    culture: [
      'Một ổ bánh mì được hoàn thiện theo lựa chọn của người ăn: thêm rau, bớt ớt, điều chỉnh sốt. Tính linh hoạt ấy giúp món thích nghi với nhiều bữa ăn và nhịp sống.',
      'Điều tạo bản sắc không chỉ là ổ bánh mà còn là tương phản nóng, giòn, tươi và đậm trong cùng một miếng cắn.',
    ],
    tasting: [
      'Ăn sớm sau khi nhận bánh để vỏ chưa bị sốt làm mềm. Thử một miếng có cả thịt và rau thay vì chỉ phần nhân.',
      'Hỏi quán về sốt, pa-tê hoặc thành phần bổ sung nếu cần tránh dị nguyên; tên món không liệt kê hết những gì nằm trong ổ bánh.',
    ],
    reference: {
      label: 'Bánh mì Việt Nam — bài tổng quan để đọc thêm',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_m%C3%AC_Vi%E1%BB%87t_Nam',
    },
  },
};

export function getDishNarrative(dish: ReelDish): DishNarrative {
  const editorial = CURATED_STORIES[dish.id];
  const name = dish.nameVi || dish.name;
  const catalogue: StorySource = {
    label: `Catalogue hiện tại: ${name} — mô tả và thành phần, không phải tư liệu lịch sử`,
    status: 'catalogue',
  };
  return {
    version: 1,
    language: 'vi',
    coverage: editorial ? 'curated' : 'catalogue',
    origin: editorial?.origin ?? [
      `Chưa có tư liệu nguồn gốc được biên tập riêng cho ${name}. Địa danh hoặc phân loại vùng trong catalogue không đủ để xác định nơi khai sinh, niên đại hay người sáng tạo món.`,
      dish.story || `Catalogue hiện chỉ cung cấp tên ${name} và danh sách thành phần.`,
    ],
    culture: editorial?.culture ?? [
      `Với ${name}, phần có thể tìm hiểu lúc này là cách các thành phần được đặt cạnh nhau: ${dish.ingredients.map((i) => i.nameVi || i.name).join(', ') || 'danh sách đang được bổ sung'}. Đây là mô tả từ catalogue, không phải kết luận về tập quán của một cộng đồng.`,
      'Ý nghĩa văn hóa và câu chuyện địa phương cần tư liệu riêng. Chúng tôi chưa có đủ căn cứ để gán cho món một truyền thuyết, nghi lễ hoặc lịch sử chung theo miền.',
    ],
    tasting: editorial?.tasting ?? [
      `Hãy thử một miếng ${name} trước khi thêm gia vị, rồi so sánh với một miếng có phần ăn kèm. Đây là gợi ý khám phá hương vị, không phải quy tắc ăn truyền thống hay hướng dẫn nấu.`,
      'Khẩu vị và thành phần thực tế tùy nơi bán. Hỏi quán về dị ứng, độ cay và yêu cầu ăn kiêng; dữ liệu catalogue không thay thế xác nhận an toàn thực phẩm.',
    ],
    sources: editorial?.reference
      ? [catalogue, { ...editorial.reference, status: 'not-checked' }]
      : [catalogue],
  };
}
