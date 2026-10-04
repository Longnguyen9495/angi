import type { DishStory } from './types';

export const STORIES_WORLD: Readonly<Record<string, DishStory>> = {
  'ga-ran': {
    homeland: 'Miền Nam nước Mỹ · gốc Anh – Scotland và Tây Phi',
    era: 'Thế kỷ XVIII – XIX',
    tagline:
      'Chảo mỡ của người Anh – Scotland gặp gia vị Tây Phi trong bếp miền Nam nước Mỹ, rồi miếng gà vỏ giòn đi một vòng quanh thế giới.',
    origin: [
      'Rán thịt trong mỡ vốn là việc quen tay của bếp châu Âu. Cuốn sách nấu ăn của Hannah Glasse in ở London năm 1747 đã có công thức gà tẩm bột rán. Nhiều sử gia ẩm thực cho rằng người Scotland di cư sang Bắc Mỹ mang theo thói quen rán gà trong mỡ heo, trong khi người Anh chuộng quay hoặc luộc. Nhưng món gà rán kiểu Mỹ chỉ thật sự có hồn vía riêng khi kỹ thuật ấy rơi vào tay những người châu Phi bị bắt làm nô lệ: ở quê nhà Tây Phi, họ đã quen tẩm ướp thật đậm rồi rán ngập trong dầu cọ.',
      'Trên các đồn điền Virginia hay Carolina, gà là một trong số ít vật nuôi người nô lệ được phép giữ cho mình. Dù vậy, gà rán khi đó vẫn là món của ngày đặc biệt chứ chưa phải bữa thường. Cụm từ “fried chicken” bắt đầu xuất hiện trên giấy từ thập niên 1830 và dày lên trong sách nấu ăn Mỹ những năm 1860–1870. Sau Nội chiến, ở ga xe lửa thị trấn Gordonsville, Virginia, những phụ nữ da màu đội khay gà rán và bánh mì chạy dọc sân ga, chuyền qua cửa sổ toa tàu cho hành khách. Với nhiều gia đình vừa thoát cảnh nô lệ, mẻ gà ấy là đồng tiền tự do đầu tiên.',
      'Thế kỷ XX kéo gà rán ra khỏi bếp nhà. Harland Sanders bán gà ở một trạm xăng tại Corbin, Kentucky từ năm 1930, dùng nồi áp suất để rút ngắn thời gian rán, rồi nhượng quyền cửa hàng đầu tiên ở Salt Lake City năm 1952. KFC sang Nhật năm 1970 và đến Việt Nam tháng 12 năm 1997, với cửa hàng đầu tiên tại khu Sài Gòn Superbowl, mở đường cho hàng loạt thương hiệu gà rán khác. Mỗi nơi lại rán theo cách của mình: người Hàn rán hai lần rồi phủ sốt cay ngọt, người Nhật có karaage ướp gừng tỏi, còn người Việt thì xé gà chấm tương ớt, ăn cùng cơm trắng.',
    ],
    timeline: [
      {
        when: '1747',
        what: 'Sách nấu ăn của Hannah Glasse ở London in công thức gà tẩm bột rán.',
      },
      {
        when: 'Sau năm 1865',
        what: 'Phụ nữ da màu ở Gordonsville, Virginia bán gà rán qua cửa sổ toa tàu.',
      },
      {
        when: '1930 – 1952',
        what: 'Harland Sanders bán gà ở Corbin, Kentucky, rồi mở cửa hàng nhượng quyền đầu tiên tại Salt Lake City.',
      },
      {
        when: '1974',
        what: 'KFC Nhật Bản tung chiến dịch “Giáng sinh là Kentucky”, khởi đầu tục ăn gà rán đêm Noel.',
      },
      {
        when: 'Tháng 12/1997',
        what: 'Cửa hàng KFC đầu tiên ở Việt Nam mở tại Sài Gòn Superbowl, TP. Hồ Chí Minh.',
      },
    ],
    meaning: [
      'Ở miền Nam nước Mỹ, đĩa gà rán gắn với bữa trưa Chủ nhật sau buổi lễ nhà thờ, với giỏ picnic, đám cưới và cả bữa cơm sau tang lễ. Người Mỹ gốc Phi coi đó là một phần di sản của mình, nhưng món ăn cũng mang vết thương: từ cuối thế kỷ XIX, hình ảnh người da đen ăn gà rán bị biếm họa trên báo, trên sân khấu và màn ảnh để chế giễu. Vì thế, câu chuyện về miếng gà giòn ở Mỹ luôn có hai mặt, vừa ấm áp vừa nhạy cảm.',
      'Sang châu Á, gà rán khoác áo mới. Ở Nhật, nhiều gia đình đặt trước xô gà từ nhiều tuần để ăn đêm Giáng sinh. Ở Việt Nam những năm 2000, được bố mẹ dẫn đi ăn gà rán là phần thưởng sau kỳ thi, là bữa tiệc sinh nhật trong mơ của trẻ con. Đến nay, món ăn đã bình dân hơn nhiều, nhưng tiếng vỏ gà vỡ rôm rốp và những ngón tay dính dầu vẫn gợi cảm giác được chiều chuộng một chút sau những ngày mệt nhoài.',
    ],
    symbols: [
      {
        name: 'Thịt gà',
        meaning:
          'Đùi và cánh nhiều mỡ, giữ nước tốt nên mọng nhất; ức gà dễ khô, cần ướp kỹ hoặc ngâm sữa trước khi rán.',
      },
      {
        name: 'Bột chiên giòn',
        meaning:
          'Lớp áo xù khóa hơi nước bên trong; công thức gia vị trộn vào bột thường là bí mật riêng của từng nhà, từng hãng.',
      },
      {
        name: 'Xà lách',
        meaning:
          'Lót dưới miếng gà để thấm bớt dầu, ăn kèm cho mát miệng, kiểu “phải có rau” rất Việt Nam.',
      },
      {
        name: 'Cà chua',
        meaning:
          'Vài lát chua thanh xen giữa những miếng gà béo, làm việc mà ở Mỹ món xà lách bắp cải coleslaw vẫn làm.',
      },
    ],
    tasting: [
      'Gà rán ngon nhất trong mười phút đầu, khi vỏ còn kêu lách tách. Người miền Nam nước Mỹ cầm tay ăn, kèm bánh quy bơ biscuit, khoai nghiền rưới nước sốt gravy hay coleslaw. Ở Việt Nam, gà thường đi với tương ớt, tương cà, một chén cơm trắng hoặc khoai tây chiên, và nhiều người vẫn quen xé gà chấm muối tiêu chanh như ăn gà luộc.',
      'Gà vừa vớt ra nên để chừng năm phút cho nước thịt lắng, cắn sẽ không bỏng miệng. Đùi và má đùi hợp ăn đầu tiên khi còn nóng, cánh để sau vẫn giòn. Một ly nước ngọt có ga, trà đá hay trà chanh là đủ. Bột chiên thường có lúa mì, người dị ứng gluten nên hỏi trước.',
    ],
    facts: [
      'Harland Sanders được gọi là “Colonel” nhờ danh hiệu danh dự do Thống đốc Kentucky trao năm 1935, chứ ông chưa từng mang quân hàm đại tá.',
      'Chiến dịch “Kentucky wa Kurisumasu” năm 1974 khiến gà rán thành món Giáng sinh ở Nhật đến tận ngày nay.',
      'Ở Hàn Quốc, gà rán ăn kèm bia nhiều đến mức có hẳn một từ ghép: “chimaek” (chicken + maekju).',
    ],
    reference: {
      label: 'Fried chicken — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Fried_chicken',
    },
  },

  'pizza-hai-san': {
    homeland: 'Napoli, Ý · biến tấu châu Á',
    era: 'Thế kỷ XVIII – nay',
    tagline:
      'Thành phố cảng Napoli sinh ra pizza, nhưng phải đến những bàn ăn châu Á, tôm và phô mai mới chịu nằm chung trên một chiếc bánh.',
    origin: [
      'Pizza thành hình ở Napoli khoảng thế kỷ XVIII: miếng bột dẹt nướng thật nhanh, bán ngoài phố cho dân lao động nghèo, ăn đứng, trả vài đồng xu. Cà chua, thứ quả đến từ châu Mỹ, dần được phết lên mặt bánh. Chiếc bánh lâu đời nhất còn giữ tên là marinara, nghĩa là “của người đi biển”, chỉ có cà chua, tỏi, oregano và dầu ô liu. Tên gọi được giải thích nhiều cách, từ món vợ ngư dân làm cho chồng đến thứ bánh đủ bền để mang lên thuyền, nhưng trên mặt bánh không có lấy một con tôm.',
      'Ở các thị trấn ven biển nước Ý, pizza ai frutti di mare phủ vẹm, nghêu, mực và tôm, và thường không có phô mai. Người Ý có một quy tắc ngầm khá chặt: phô mai sẽ đè mất vị ngọt mong manh của hải sản. Còn chuyện chiếc pizza Margherita được làm để dâng hoàng hậu Margherita năm 1889 thì chỉ là giai thoại, các sử gia đến nay vẫn chưa tìm được bằng chứng chắc chắn. Khi pizza theo chân người di cư sang Mỹ rồi đi khắp thế giới, những quy tắc ấy lỏng dần, và lớp mozzarella kéo sợi bắt đầu xuất hiện trên bánh có tôm.',
      'Châu Á biến pizza hải sản thành món ruột: Nhật thêm sốt mayonnaise, Hàn phủ khoai lang nghiền, Thái rưới tương ớt ngọt. Pizza đến Việt Nam theo các chuỗi quốc tế từ giữa thập niên 2000, rồi có thêm những tiệm làm bánh lò củi như Pizza 4P’s mở ở Sài Gòn năm 2011. Phiên bản ở đây là kiểu “thập cẩm” mà người Ý truyền thống sẽ lắc đầu: tôm nằm cạnh pepperoni, nấm mỡ, ớt chuông và ô liu đen dưới một lớp mozzarella dày. Nhưng chính sự hào phóng ấy lại hợp bữa ăn đông người của người Việt.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XVIII',
        what: 'Pizza marinara và các loại bánh dẹt nướng lò thành món ăn đường phố ở Napoli.',
      },
      {
        when: '1889',
        what: 'Tương truyền pizza Margherita ra đời để dâng hoàng hậu Ý; giai thoại chưa được kiểm chứng.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Pizza theo người di cư sang Mỹ, thành món toàn cầu và dần chấp nhận cả hải sản lẫn phô mai.',
      },
      {
        when: '2011',
        what: 'Pizza 4P’s mở tiệm đầu tiên ở Sài Gòn, góp phần làm pizza lò củi quen thuộc với người Việt.',
      },
      {
        when: '2017',
        what: 'UNESCO ghi danh nghề làm pizza của thợ bánh Napoli là di sản văn hóa phi vật thể.',
      },
    ],
    meaning: [
      'Ở Napoli, người thợ pizza, “pizzaiuolo”, được nể như một nghệ nhân. Năm 2017, UNESCO ghi danh nghề này là di sản văn hóa phi vật thể, từ cách nhồi bột, vỗ bánh bằng tay đến nhịp nướng chỉ chừng một phút rưỡi trong lò củi nóng gần 500 độ. Nghề được truyền trong gia đình và trong khu phố, tiệm bánh nhỏ là nơi hàng xóm tụ lại, chuyện trò và ăn uống.',
      'Về đến Việt Nam, chiếc pizza hải sản mang một nghĩa rất đời: chia. Chiếc bánh tròn cắt tám miếng đặt giữa bàn, ai cũng có phần, giống tinh thần mâm cơm chung. Trong tiệc sinh nhật, buổi liên hoan văn phòng hay tối cuối tuần ở nhà, có tôm trên mặt bánh nghĩa là bữa ăn “có tôm có cá”, đầy đặn và chu đáo hơn một chút.',
    ],
    symbols: [
      {
        name: 'Tôm',
        meaning:
          'Ngọt và dai, chín rất nhanh trong lò; với người Việt, có tôm là bữa ăn đã có phần sang.',
      },
      {
        name: 'Phô mai mozzarella',
        meaning:
          'Lớp phô mai kéo sợi gắn các loại nhân lại với nhau, điều mà pizza hải sản kiểu Ý thường cố tình bỏ qua.',
      },
      {
        name: 'Xúc xích pepperoni',
        meaning:
          'Chút cay mặn của xúc xích Ý – Mỹ khiến chiếc bánh thành kiểu “thập cẩm”, ai kén hải sản vẫn có cái để ăn.',
      },
      {
        name: 'Ớt chuông, nấm mỡ và ô liu đen',
        meaning:
          'Ngọt giòn, thơm dịu và mặn đắng nhẹ, ba vị rau quả quen của Địa Trung Hải làm mặt bánh bớt ngấy.',
      },
      {
        name: 'Đế pizza',
        meaning:
          'Bột lên men nướng phồng viền, hậu duệ của thứ bánh dẹt bán rong cho người lao động Napoli.',
      },
    ],
    tasting: [
      'Pizza chỉ thật ngon trong vài phút đầu sau khi ra lò, nhất là pizza có tôm, vì tôm nguội nhanh dai lại. Ở Napoli, dân bán rong gấp chiếc bánh nhỏ làm tư như gấp ví, gọi là “a portafoglio”, để vừa đi vừa ăn. Ở nhà hàng, cứ dùng dao nĩa hoặc cầm tay đều được.',
      'Người Việt hay rắc thêm ớt khô, lá oregano hoặc chấm tương ớt, và phần viền bánh còn lại thường được chấm nốt sốt tỏi. Một đĩa salad xanh, ly nước có ga hoặc trà đào là đủ. Món có hải sản có vỏ, sữa và gluten, người dị ứng nên lưu ý.',
    ],
    facts: [
      'Pizza marinara mang tên người đi biển nhưng công thức truyền thống không có hải sản.',
      'Ở Ý, pizza hải sản thường không rắc phô mai, vì nhiều người cho rằng phô mai át vị biển.',
      'Bánh “a portafoglio” là pizza nhỏ gấp làm tư như chiếc ví, món ăn vỉa hè quen thuộc ở Napoli.',
    ],
    reference: {
      label: 'Pizza — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Pizza',
    },
  },

  'com-chay-thap-cam': {
    homeland: 'Việt Nam',
    era: 'Từ thời Lý – Trần đến nay',
    tagline:
      'Một đĩa cơm, vài món rau đậu nấm bày cạnh nhau: bữa chay của người Việt giản dị như chính ý nghĩa của nó, ăn để lòng nhẹ đi.',
    origin: [
      'Ăn chay ở Việt Nam gắn với Phật giáo Đại thừa. Ở Trung Hoa, đầu thế kỷ VI, Lương Vũ Đế ban lệnh khuyên tăng ni bỏ rượu thịt, và từ đó tu sĩ Phật giáo khắp vùng Đông Á giữ trường chay. Phật giáo vào nước ta từ rất sớm, cực thịnh dưới các triều Lý, Trần, và bếp nhà chùa trở thành nơi giữ gìn cách nấu không cần thịt cá: rau, đậu, nấm, tương, chao. Chữ “chay” thường được cho là gốc từ chữ Hán “trai” (齋), vốn chỉ việc giữ mình thanh tịnh.',
      'Người tại gia không cần ăn chay trọn đời. Phổ biến nhất là ăn chay kỳ: ngày rằm và mùng một âm lịch, có người giữ bốn, sáu hay mười ngày mỗi tháng, có người ăn trọn tháng Bảy Vu Lan. Huế, nơi chùa chiền dày đặc và từng là kinh đô nhà Nguyễn, nổi tiếng với bếp chay khéo léo, nhất là các món “chay giả mặn” nặn từ đậu hũ, tàu hũ ky, mì căn và nấm thành hình chả, nem, thịt kho, tôm.',
      'Cơm chay thập cẩm là dạng gần gũi nhất: một đĩa cơm, khách chỉ tay vào tủ kính chọn vài món, đậu hũ chiên, nấm xào, rau luộc, củ quả kho. Quán chay bình dân giờ có ở gần như mọi con phố, và không ít nơi bán cơm chay giá vài nghìn đồng hoặc phát miễn phí cho người nghèo. Phiên bản ở đây mang dáng dấp mới hơn: đậu hũ áp chảo vàng cạnh, nấm xào săn, cải thìa chần, bông cải xào ớt chuông, cà rốt bào và vài lát dưa leo.',
    ],
    timeline: [
      {
        when: 'Đầu thế kỷ VI',
        what: 'Lương Vũ Đế ở Trung Hoa khuyên tăng ni Phật giáo bỏ hẳn rượu thịt.',
      },
      {
        when: 'Thời Lý – Trần',
        what: 'Phật giáo hưng thịnh ở Đại Việt, bếp chùa trở thành nơi gìn giữ cách nấu chay.',
      },
      {
        when: 'Thời Nguyễn',
        what: 'Huế phát triển nghệ thuật nấu chay tinh xảo gắn với chùa chiền và hoàng tộc.',
      },
      {
        when: 'Thế kỷ XXI',
        what: 'Quán cơm chay bình dân, quán chay từ thiện và nhà hàng chay hiện đại nở rộ ở các đô thị.',
      },
    ],
    meaning: [
      'Với người theo đạo Phật, ăn chay là giữ giới không sát sinh và nuôi lòng từ. Sáng rằm, mùng một, nhiều nhà cùng ăn chay, thắp nhang, đi chùa, làm một việc thiện nhỏ. Bữa cơm chay vì vậy giống một khoảng lặng trong tháng: ăn chậm hơn, nói ít hơn, và nhớ rằng mình đang sống nhờ biết bao công sức của người khác.',
      'Cơm chay còn là ký ức cộng đồng: mâm cỗ chay sau buổi lễ chùa, nồi cơm từ thiện trước cổng bệnh viện, hộp cơm chay giá rẻ cho sinh viên cuối tháng. Ngày nay, nhiều người trẻ tìm đến món chay vì sức khỏe hay vì môi trường, không hẳn vì tín ngưỡng. Lý do có khác, nhưng đĩa cơm thập cẩm vẫn nói cùng một điều: ăn vừa đủ, ăn lành, và sống tử tế.',
    ],
    symbols: [
      {
        name: 'Đậu hũ',
        meaning:
          'Nguồn đạm chính của bữa chay, áp chảo vàng cạnh cho béo, dễ thấm nước tương và chao.',
      },
      {
        name: 'Nấm hỗn hợp',
        meaning:
          'Xào săn để dậy vị ngọt tự nhiên, thứ “vị thịt” mà bếp chay dựa vào thay xương hầm.',
      },
      {
        name: 'Cơm trắng',
        meaning: 'Nền của mọi bữa ăn Việt, ở đây là chỗ dựa cho các món rau nấm nhạt vị.',
      },
      {
        name: 'Cải thìa và bông cải xanh',
        meaning:
          'Chần hoặc xào nhanh cho giữ màu, đúng tinh thần bếp chay: ít dầu, giữ nguyên vị rau.',
      },
      {
        name: 'Cà rốt, ớt chuông và dưa leo',
        meaning: 'Ba sắc cam, đỏ, xanh làm đĩa cơm tươi tắn, ăn kèm cho giòn và mát.',
      },
    ],
    tasting: [
      'Cơm chay ăn nóng, chấm nước tương pha ớt hoặc chao đánh nhuyễn. Nên nếm từng món riêng trước để nhận ra vị đậu, vị nấm, vị rau, rồi mới trộn. Nếu dùng bữa ở chùa, giữ giọng nhỏ, lấy vừa đủ ăn và không bỏ thừa; bữa ăn chính thức của chư tăng gọi là “quá đường”, có nghi thức riêng.',
      'Một bát canh rau ngót, canh nấm hay canh bí là đủ để bữa ăn trọn vẹn. Người giữ chay nghiêm thường kiêng cả hành, tỏi, hẹ, kiệu, nên khi nấu mời họ, hãy hỏi trước. Trà xanh hoặc nước sâm mát hợp hơn nước ngọt.',
    ],
    facts: [
      'Hành, tỏi, hẹ, kiệu và hưng cừ được nhà Phật gọi là “ngũ vị tân” và thường kiêng trong bữa chay.',
      'Người Việt ăn chay kỳ phổ biến nhất vào ngày rằm và mùng một âm lịch, tức hai ngày mỗi tháng.',
      'Món chay giả mặn có thể mô phỏng cả chả lụa, thịt kho, tôm rim, chỉ từ đậu hũ, nấm và bột mì.',
    ],
    reference: {
      label: 'Buddhist cuisine — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Buddhist_cuisine',
    },
  },

  'mi-xao-bo': {
    homeland: 'Quảng Đông, Trung Quốc · Chợ Lớn',
    era: 'Thế kỷ XIX – XX',
    tagline:
      'Ngọn lửa phụt lên quanh chiếc chảo gang, vài cái đảo tay là xong đĩa mì: món ăn người Hoa xa xứ mang theo đến khắp phố phường Việt Nam.',
    origin: [
      'Sợi mì có tuổi đời rất dài ở Trung Hoa: năm 2005, các nhà khảo cổ công bố một bát mì làm từ hạt kê khoảng 4.000 năm tuổi ở di chỉ Lạt Gia, tỉnh Thanh Hải. Mì bột mì phổ biến dần từ thời Hán. Chữ “chow mein” trong tiếng Anh là cách đọc của người Đài Sơn, Quảng Đông, cho hai chữ “xào mì”. Thế kỷ XIX, dân Đài Sơn đi phu đào vàng, làm đường sắt ở Mỹ, và món mì xào theo họ thành một trong những món Hoa đầu tiên người phương Tây biết đến.',
      'Cái khó của mì xào nằm ở lửa. Người Quảng Đông gọi mùi thơm hơi khói sinh ra khi sợi mì, thịt và nước tương chạm vào chảo gang nóng rực là “wok hei”, tạm dịch là hơi chảo. Đầu bếp phải đảo liên tục để mì không cháy, rồi tung lên cho lửa liếm qua. Thịt bò thái mỏng ngang thớ, ướp nước tương, chút dầu hào và bột năng, “chạy” qua dầu nóng vài giây cho áo một lớp mỏng, nhờ vậy xào xong vẫn mềm. Sợi mì vàng có được màu ấy nhờ trứng và nước tro tàu.',
      'Ở Việt Nam, người Hoa từ Chợ Lớn, Hội An đến Hải Phòng đưa mì xào vào các tiệm ăn gia đình. Sài Gòn có hai trường phái: mì xào giòn, sợi mì chiên phồng rưới xốt sệt cùng thịt và rau, và mì xào mềm, sợi mì luộc rồi đảo cùng nhân. Phiên bản ở đây là mì xào mềm: mì trứng xào săn với bò, cải thìa, cà rốt, hành tây và nước tương, một đĩa no bụng của quán cơm trưa và cả bữa cơm nhà.',
    ],
    timeline: [
      {
        when: 'Khoảng 4.000 năm trước',
        what: 'Bát mì kê ở di chỉ Lạt Gia, Thanh Hải là dấu tích sợi mì cổ nhất được biết đến.',
      },
      {
        when: 'Cuối thế kỷ XVIII',
        what: 'Người Hoa lập phố Chợ Lớn, sau này là cái nôi của các tiệm mì Hoa ở Sài Gòn.',
      },
      {
        when: 'Thế kỷ XIX',
        what: 'Người di cư Đài Sơn mang “chow mein” đến châu Mỹ và Đông Nam Á.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Mì xào giòn, mì xào mềm thành món quen của quán ăn và bữa cơm Việt.',
      },
    ],
    meaning: [
      'Trong văn hóa Hoa, sợi mì dài là lời chúc sống lâu. Mì có mặt trong tiệc mừng thọ, sinh nhật và dịp đầu năm, và người ta kiêng cắt đứt sợi mì như kiêng “cắt ngắn” tuổi thọ. Một đĩa mì xào với sợi mì nguyên vẹn quyện cùng thịt rau mang lời chúc ấy vào bữa ăn thường ngày, không cần dịp gì đặc biệt.',
      'Ở Việt Nam, mì xào bò gợi ngay tiếng chảo xèo xèo và ngọn lửa bùng lên sau quầy bếp tiệm Hoa. Đó là món của sự pha trộn: kỹ thuật Quảng Đông, rau và thịt chợ Việt, khẩu vị chỉnh dần qua nhiều thế hệ. Người đi làm gọi một đĩa cho bữa trưa vội, gia đình gọi thêm một đĩa đặt giữa bàn cho cả nhà cùng gắp.',
    ],
    symbols: [
      {
        name: 'Mì trứng',
        meaning: 'Sợi vàng, dai nhờ trứng và nước tro tàu, mang lời chúc trường thọ của người Hoa.',
      },
      {
        name: 'Thịt bò',
        meaning: 'Thái mỏng ngang thớ, xào rất nhanh trên lửa lớn; bò dai là lộ tay nghề ngay.',
      },
      {
        name: 'Nước tương',
        meaning: 'Gia vị lên men lâu đời của Á Đông, cho sợi mì màu nâu óng và vị mặn ngọt sâu.',
      },
      {
        name: 'Cải thìa',
        meaning: 'Xanh giòn, cho vào sau cùng để giữ màu, giúp đĩa mì bớt ngấy dầu.',
      },
      {
        name: 'Hành tây và cà rốt',
        meaning: 'Vị ngọt rau củ làm nền, thêm màu cam và độ giòn cho đĩa mì.',
      },
    ],
    tasting: [
      'Mì xào phải ăn khi còn bốc khói, để lâu sợi mì hút hết nước sốt và bết lại. Người Sài Gòn hay ăn kèm ớt ngâm giấm, xì dầu ớt hoặc chút tiêu xay. Với mì xào giòn, nên để xốt ngấm vài phút cho phần mì dưới mềm, phần trên vẫn giòn, ăn sẽ có hai lớp thú vị.',
      'Gắp mì cùng một miếng bò và lá cải trong một lần để đủ vị. Ăn chung thì mỗi người gắp ra chén riêng. Một ấm trà nóng hoặc ly trà đá là hợp nhất. Mì trứng và nước tương có gluten, trứng và đậu nành.',
    ],
    facts: [
      'Từ “chow mein” bắt nguồn từ cách đọc của tiếng Đài Sơn, Quảng Đông.',
      'Màu vàng của nhiều loại mì châu Á đến từ nước tro tàu có tính kiềm, trứng chỉ góp một phần.',
      '“Wok hei” chỉ có được khi chảo đủ nóng, rất khó tạo ra trên bếp gia đình công suất thấp.',
    ],
    reference: {
      label: 'Chow mein — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Chow_mein',
    },
  },

  'cheeseburger-bo': {
    homeland: 'California, Hoa Kỳ',
    era: 'Thập niên 1920 – 1930',
    tagline:
      'Chỉ thêm một lát phô mai lên miếng bò đang xèo trên vỉ, nhưng không ai chắc ai là người làm điều đó trước tiên.',
    origin: [
      'Đến thập niên 1920, hamburger đã có mặt ở khắp nước Mỹ, nên việc ai đó thả một lát phô mai lên miếng thịt đang nướng gần như sớm muộn cũng xảy ra. Câu chuyện hay được kể nhất thuộc về Lionel Sternberger, cậu thiếu niên 16 tuổi đứng bếp ở quán sandwich The Rite Spot của cha mình tại Pasadena, California. Theo lời kể lại, khoảng năm 1924–1926, cậu thử đặt một lát phô mai Mỹ lên miếng bò đang xèo và thấy ngon. Câu chuyện này chủ yếu dựa vào lời kể, không có giấy tờ cùng thời.',
      'Bằng chứng trên giấy sớm nhất lại đến từ Los Angeles: thực đơn năm 1928 của quán O’Dell’s có món cheeseburger phủ chili, giá 25 xu. Năm 1934, quán Kaelin’s ở Louisville, Kentucky, cũng nhận là nơi nghĩ ra món này. Một năm sau, Louis Ballast, chủ quán Humpty Dumpty Drive-In ở Denver, Colorado, được cho là đã đăng ký nhãn hiệu cho cái tên “cheeseburger”. Nhiều khả năng, mỗi nơi tự nghĩ ra cùng một ý tưởng hiển nhiên.',
      'Thứ giúp cheeseburger lan nhanh là phô mai chế biến, được James L. Kraft cấp bằng sáng chế năm 1916: tan đều, không tách dầu, để được lâu. Sau Thế chiến II, phô mai lát đóng gói sẵn và các chuỗi thức ăn nhanh biến cheeseburger thành món chuẩn hóa. Ở Việt Nam, Lotteria mở từ năm 1998, Burger King năm 2012, McDonald’s năm 2014, rồi đến làn sóng quán burger thủ công dùng cheddar thật và thịt xay tại chỗ.',
    ],
    timeline: [
      {
        when: '1916',
        what: 'James L. Kraft được cấp bằng sáng chế phô mai chế biến, loại tan chảy đều trên burger.',
      },
      {
        when: 'Khoảng 1924 – 1926',
        what: 'Theo lời kể, Lionel Sternberger đặt phô mai lên burger tại quán The Rite Spot, Pasadena.',
      },
      {
        when: '1928',
        what: 'Thực đơn quán O’Dell’s ở Los Angeles có cheeseburger phủ chili, bằng chứng văn bản sớm nhất.',
      },
      {
        when: '1934 – 1935',
        what: 'Quán Kaelin’s ở Louisville tự nhận là cha đẻ; Humpty Dumpty Drive-In ở Denver được cho là đăng ký tên gọi.',
      },
      {
        when: '2014',
        what: 'McDonald’s mở cửa hàng đầu tiên tại TP. Hồ Chí Minh, cheeseburger thành món quen của giới trẻ.',
      },
    ],
    meaning: [
      'Lát phô mai là một nâng cấp nhỏ mà người Mỹ rất chuộng: thêm vài xu là có miếng burger béo hơn, mặn hơn, “đã” hơn. Cheeseburger gắn với quán ăn ven xa lộ, quầy drive-in, ghế da đỏ và những chuyến đi xuyên bang bằng xe hơi. Ca sĩ Jimmy Buffett còn có hẳn một bài hát năm 1978 tên “Cheeseburger in Paradise”, coi món này như thiên đường của kẻ thèm đồ ăn quen sau chuyến đi biển dài.',
      'Với nhiều người Việt, phô mai từng là thứ xa lạ, quen nhất có lẽ là miếng phô mai tam giác của con bò cười. Cheeseburger là lần đầu không ít người thấy phô mai tan chảy trên thịt nóng. Từ món “ăn thử cho biết”, nó thành bữa trưa nhanh của dân văn phòng, phần thưởng của học sinh, và ở các quán thủ công, thành chuyện so xem quán nào dùng cheddar ủ lâu hơn.',
    ],
    symbols: [
      {
        name: 'Phô mai cheddar',
        meaning:
          'Lát phô mai làm nên chữ “cheese”; cheddar mang tên làng Cheddar ở Anh, còn chuỗi thức ăn nhanh thường dùng phô mai chế biến.',
      },
      {
        name: 'Thịt bò',
        meaning: 'Miếng bò xay nướng xém cạnh, đủ nóng để làm phô mai chảy xuống hai bên.',
      },
      {
        name: 'Vỏ bánh burger',
        meaning: 'Bánh mì tròn mềm rắc mè, nướng mặt cắt cho khỏi thấm nước thịt.',
      },
      {
        name: 'Khoai tây chiên và tương cà',
        meaning: 'Cặp đôi đi kèm không thể thiếu của một phần “combo” kiểu Mỹ.',
      },
      {
        name: 'Xà lách, cà chua, hành tây',
        meaning: 'Lớp rau tươi giòn cắt ngang vị béo, giữ cho chiếc bánh không bị nặng.',
      },
    ],
    tasting: [
      'Cheeseburger nên ăn ngay khi phô mai còn mềm chảy; nguội đi, lát phô mai đông lại và mất nửa phần thú vị. Cầm bằng hai tay, ép nhẹ cho các lớp dính vào nhau, giữ giấy gói quanh đáy bánh để nước thịt không chảy ra tay.',
      'Khoai tây chiên chấm tương cà là cách Mỹ; người Việt hay thêm tương ớt hoặc chấm cả vào mayonnaise. Uống kèm nước ngọt có ga, sữa lắc hay trà đào đều hợp. Món có sữa, gluten và mè; quán thủ công thường hỏi khách muốn thịt chín vừa hay chín kỹ.',
    ],
    facts: [
      'Thực đơn năm 1928 của quán O’Dell’s ở Los Angeles bán cheeseburger phủ chili giá 25 xu.',
      'Ở Mỹ, ngày 18 tháng 9 hằng năm được gọi vui là Ngày Cheeseburger quốc gia.',
      'Phô mai cheddar mang tên ngôi làng Cheddar ở hạt Somerset, nước Anh.',
    ],
    reference: {
      label: 'Cheeseburger — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Cheeseburger',
    },
  },

  'pad-thai': {
    homeland: 'Bangkok, Thái Lan',
    era: 'Thập niên 1930 – 1940',
    tagline:
      'Một đĩa bánh phở xào chua ngọt ra đời giữa lúc Xiêm đổi tên thành Thái Lan, và mang luôn chữ “Thái” trong tên gọi.',
    origin: [
      'Mì và bánh phở xào đã có ở Xiêm từ lâu qua các cộng đồng người Hoa dọc sông Chao Phraya; ngay chữ “kuaitiao” trong tiếng Thái cũng mượn từ tiếng Triều Châu. Tên đầy đủ của món, “kuaitiao phat Thai”, nghĩa là bánh phở xào kiểu Thái, như để phân biệt với kiểu Hoa. Món ăn thường được gắn với Thống chế Plaek Phibunsongkhram, người cầm quyền khi nước Xiêm đổi tên thành Thái Lan ngày 24 tháng 6 năm 1939 và đẩy mạnh một chiến dịch xây dựng bản sắc dân tộc.',
      'Câu chuyện quen thuộc kể rằng trong Thế chiến II, khi gạo khan hiếm vì chiến tranh và lũ lụt, chính phủ khuyến khích dân ăn bánh phở và mở hàng bán rong, và Pad Thai, dùng sợi “sen chan” của tỉnh Chanthaburi, được quảng bá như món ăn quốc gia. Tuy vậy, tư liệu gốc về việc chính phủ trực tiếp “phát minh” ra món này khá mỏng. Một số nhà nghiên cứu cho rằng chính người Thái gốc Hoa đã nghĩ ra nó, kết hợp kỹ thuật xào chảo với vị chua ngọt của miền Trung.',
      'Một đĩa Pad Thai chuẩn có sợi gạo, nước me, đường thốt nốt, nước mắm, tôm khô, đậu hũ ép, củ cải muối, trứng, giá và hẹ, rắc đậu phộng giã. Từ món ăn đường phố Bangkok, nó ra thế giới khi chính phủ Thái Lan khởi động chương trình “Global Thai” khoảng năm 2001–2002 để nhân số nhà hàng Thái ở nước ngoài. Ở Việt Nam, Pad Thai có trong thực đơn nhà hàng Thái lẫn quán vỉa hè, thường với tôm tươi, trứng, giá, hành lá và rau mùi.',
    ],
    timeline: [
      {
        when: 'Trước thế kỷ XX',
        what: 'Người Hoa đưa các món bánh phở, mì xào vào đời sống ẩm thực Xiêm.',
      },
      {
        when: '24/6/1939',
        what: 'Xiêm chính thức đổi tên thành Thái Lan dưới thời Thống chế Phibunsongkhram.',
      },
      {
        when: 'Thập niên 1940',
        what: 'Theo câu chuyện phổ biến, bánh phở xào kiểu Thái được khuyến khích như một món ăn dân tộc.',
      },
      {
        when: 'Khoảng 2001 – 2002',
        what: 'Chương trình “Global Thai” thúc đẩy nhà hàng Thái ở nước ngoài, Pad Thai thành món đại diện.',
      },
    ],
    meaning: [
      'Pad Thai là một ví dụ hiếm thấy về món ăn được “đặt tên” cho một quốc gia. Kỹ thuật xào chảo có gốc Hoa, nhưng đĩa mì được nêm theo vị mà người Thái muốn thế giới nhận ra: chua từ me, ngọt từ đường thốt nốt, mặn từ nước mắm, cay từ ớt bột. Bốn vị đứng cạnh nhau, không vị nào được phép lấn át.',
      'Ở Bangkok, đó là món vỉa hè làm ngay trên chảo lớn trước mắt khách, ăn trưa, ăn tối hay ăn khuya đều được. Với du khách, đó là đĩa đầu tiên gọi khi chưa biết gọi gì. Người Việt thấy quen ngay vì bánh phở, giá, đậu phộng, chanh đều là thứ nhà mình có, chỉ lạ ở vị me ngọt chua và cái thói tự nêm lại tại bàn.',
    ],
    symbols: [
      {
        name: 'Bánh phở',
        meaning:
          'Sợi gạo dẹt mềm dai; bản truyền thống dùng sợi “sen chan” của tỉnh Chanthaburi, ngâm mềm rồi mới xào.',
      },
      {
        name: 'Tôm',
        meaning:
          'Tôm tươi cho vị ngọt, còn tôm khô giã nhỏ trong nước sốt là cái nền mặn mà ít ai nhận ra.',
      },
      {
        name: 'Trứng gà',
        meaning: 'Đập thẳng vào chảo, đánh tơi để quyện vào sợi phở, làm món ăn béo và no hơn.',
      },
      {
        name: 'Giá đỗ, hành lá và rau mùi',
        meaning:
          'Phần giòn tươi, một nửa xào cùng, một nửa để sống bên cạnh đĩa cho khách tự thêm.',
      },
      {
        name: 'Đậu phộng và chanh',
        meaning: 'Rắc và vắt ngay trước khi ăn, thêm độ bùi và vị chua sáng cho đĩa mì ngọt.',
      },
    ],
    tasting: [
      'Ở quầy Pad Thai nào cũng có bộ gia vị “khrueang prung”: đường, ớt bột, nước mắm và giấm ngâm ớt. Người Thái nếm trước rồi mới nêm lại, ít ai ăn nguyên vị như đầu bếp xào. Vắt chanh, trộn đều đậu phộng và giá rồi hẵng ăn.',
      'Đĩa Pad Thai ở Bangkok thường kèm một nắm hẹ tươi và miếng hoa chuối sống để cắn xen kẽ cho mát miệng. Người Thái ăn bằng nĩa và thìa, dùng đũa cũng được. Món có đậu phộng, tôm, trứng và nước mắm; một ly trà sữa Thái hoặc nước sả mát rất hợp.',
    ],
    facts: [
      'Tên “kuaitiao phat Thai” nghĩa là bánh phở xào kiểu Thái; chữ “kuaitiao” lại mượn từ tiếng Triều Châu.',
      'Sợi “sen chan” làm Pad Thai mang tên tỉnh Chanthaburi, vùng nổi tiếng với nghề làm bánh phở.',
      'Xiêm đổi tên thành Thái Lan năm 1939, đúng giai đoạn Pad Thai được cho là ra đời.',
    ],
    reference: {
      label: 'Pad Thai — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Pad_thai',
    },
  },

  'mi-y-sot-bo-bam': {
    homeland: 'Bologna, Ý · biến tấu toàn cầu',
    era: 'Cuối thế kỷ XVIII – XX',
    tagline:
      'Nồi ragù sôi lăn tăn nhiều giờ ở Bologna đi qua bao nhiêu căn bếp xa xứ, để về đến ta thành đĩa spaghetti sốt đỏ quen thuộc.',
    origin: [
      'Gốc của món này là ragù, chữ người Ý mượn từ “ragoût” của Pháp, chỉ thịt hầm sánh. Công thức ragù ăn với mì sớm nhất còn ghi lại thuộc về Alberto Alvisi, đầu bếp của hồng y Chiaramonti, sau này là Giáo hoàng Piô VII, ở Imola gần Bologna cuối thế kỷ XVIII. Năm 1891, Pellegrino Artusi in món “maccheroni alla bolognese” trong cuốn sách nấu ăn nổi tiếng của ông: thịt bê nạc, pancetta, bơ, hành và cà rốt, gần như không có cà chua, ăn với mì ống ngắn.',
      'Ở Bologna ngày nay, ragù được nấu từ thịt bò xay, pancetta, hành, cà rốt, cần tây, rượu vang trắng, cà chua xay và một chén sữa, liu riu ít nhất hai giờ. Ngày 17 tháng 10 năm 1982, Học viện Ẩm thực Ý gửi công thức ấy vào lưu trữ ở Phòng Thương mại Bologna, rồi cập nhật lại năm 2023. Người Bologna ăn ragù với tagliatelle trứng sợi dẹt hoặc dùng làm lasagna, hầu như không bao giờ với spaghetti, và ragù gốc cũng không có tỏi.',
      'Món “spaghetti bolognese” mà thế giới biết được định hình ở Anh, Mỹ, Úc trong thế kỷ XX: nhiều cà chua hơn, thêm tỏi, rắc ngò tây, và dùng spaghetti vì dễ mua. Năm 2019, thị trưởng Bologna còn tuyên bố “spaghetti bolognese không tồn tại”. Ở Việt Nam, món này gọi gọn là “mì Ý”, có mặt từ nhà hàng Âu đến hộp cơm trưa, thường ngọt và chua hơn vì nêm thêm tương cà cho hợp vị trẻ con.',
    ],
    timeline: [
      {
        when: 'Cuối thế kỷ XVIII',
        what: 'Alberto Alvisi ở Imola ghi công thức ragù ăn với mì sớm nhất còn được biết đến.',
      },
      {
        when: '1891',
        what: 'Pellegrino Artusi in món “maccheroni alla bolognese” với thịt bê, pancetta và bơ.',
      },
      {
        when: 'Giữa thế kỷ XX',
        what: 'Spaghetti bolognese nhiều cà chua phổ biến ở Anh, Mỹ và Úc.',
      },
      {
        when: '1982',
        what: 'Học viện Ẩm thực Ý lưu công thức ragù tại Phòng Thương mại Bologna, có cả vang trắng và sữa.',
      },
      {
        when: '2023',
        what: 'Học viện cập nhật công thức, giảm pancetta và cho phép dầu ô liu.',
      },
    ],
    meaning: [
      'Ở Emilia-Romagna, nồi ragù là chuyện của sáng Chủ nhật. Bà hay mẹ bắt bếp từ sớm, cả căn nhà thơm mùi thịt và rượu vang, đến trưa mới dọn ra cùng tagliatelle cán tay. Bologna có biệt danh “la Grassa”, thành phố béo, vì bếp ở đây chẳng tiếc bơ, thịt muối và phô mai. Với họ, ragù đúng điệu là chuyện danh dự của gia đình.',
      'Ra thế giới, ragù bị giản lược đến mức người Bologna phải cau mày, nhưng chính phiên bản dễ dãi ấy lại thành cánh cửa đầu tiên dẫn người ta đến với ẩm thực Ý. Ở Việt Nam, đĩa mì Ý sốt bò bằm là món cuối tuần mà trẻ con đòi, người lớn cũng không chê, kiểu món “Tây” mà mẹ nào cũng nấu được.',
    ],
    symbols: [
      {
        name: 'Thịt bò',
        meaning: 'Bò xay hầm lâu cho mềm và ngọt; bản gốc Bologna trộn thêm pancetta cho béo.',
      },
      {
        name: 'Cà chua',
        meaning: 'Bản quốc tế dùng nhiều cà chua cho đỏ và chua, bản Bologna chỉ cho vừa đủ.',
      },
      {
        name: 'Tỏi và ngò tây',
        meaning:
          'Hai thứ người Bologna không cho vào ragù, nhưng lại là dấu hiệu của bản spaghetti quốc tế.',
      },
      {
        name: 'Phô mai Parmesan',
        meaning:
          'Parmigiano Reggiano được làm ngay tại Emilia-Romagna, bào lên cuối cùng cho mặn béo.',
      },
      {
        name: 'Mì spaghetti',
        meaning: 'Sợi tròn dài là lựa chọn của thế giới, còn người Bologna chuộng tagliatelle.',
      },
    ],
    tasting: [
      'Trộn đều sốt với mì trước khi ăn, rắc Parmesan, rồi dùng nĩa xoay một lượng vừa miệng. Người Ý không cắt sợi mì và không dùng thìa đỡ; xoay mì trên thìa là thói quen của người Mỹ gốc Ý.',
      'Ăn kèm salad rau trộn dầu giấm và một miếng bánh mì để vét sốt. Người lớn có thể uống chút vang đỏ nhẹ, trẻ con thì nước ép. Phiên bản Việt có thể rắc tiêu hoặc thêm tương ớt. Món có gluten và sữa; cho bé ăn có thể bẻ đôi sợi mì, dù người Ý sẽ nhíu mày.',
    ],
    facts: [
      'Ở Bologna, ragù gần như chỉ ăn với tagliatelle hoặc làm lasagna, hiếm khi với spaghetti.',
      'Công thức ragù năm 1982 dùng vang trắng chứ không phải vang đỏ, và có một chén sữa.',
      'Năm 2019, thị trưởng Bologna tuyên bố “spaghetti bolognese không tồn tại”.',
    ],
    reference: {
      label: 'Bolognese sauce — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Bolognese_sauce',
    },
  },

  'mi-tom-yum-hai-san': {
    homeland: 'Miền Trung Thái Lan · khắp Đông Nam Á',
    era: 'Canh từ thế kỷ XIX · mì gói từ thập niên 1970',
    tagline:
      'Nồi canh chua cay Tom Yum gặp gói mì ăn liền, thành tô mì khuya sực mùi sả, riềng và lá chanh của cả Đông Nam Á.',
    origin: [
      'Tom Yum là món canh chua cay của vùng đồng bằng miền Trung Thái Lan, nơi kênh rạch chằng chịt và tôm cá có sẵn ngay sau nhà. “Tom” nghĩa là đun sôi, “yam” là trộn, cũng là tên gọi chung của các món gỏi chua cay Thái. Nước dùng nấu với sả, riềng, lá chanh Thái đập dập, ớt, nước mắm, vắt chanh khi tắt bếp. Theo hồ sơ Thái Lan gửi UNESCO, bản nấu cá đã được ghi lại từ năm 1889, còn Tom Yum Kung nấu tôm xuất hiện trong một sách dạy nấu ăn hoàng gia năm 1964.',
      'Có hai kiểu chính: “nam sai” nước trong, chua cay thanh, và “nam khon” nước sánh, thêm sữa đặc không đường hoặc bột kem, phổ biến từ khoảng thập niên 1980. Kiểu nào cũng có thể khuấy thêm nam phrik phao, tương ớt rang ngọt mặn, cho nước dùng màu cam. Tháng 12 năm 2024, UNESCO ghi danh Tom Yum Kung vào danh sách di sản văn hóa phi vật thể đại diện của nhân loại.',
      'Mì ăn liền ra đời ở Nhật năm 1958 dưới tay Momofuku Ando. Ở Thái, thương hiệu MAMA có mặt từ đầu thập niên 1970 và nhanh chóng đưa vị Tom Yum vào gói gia vị. Ở Việt Nam, Hảo Hảo vị tôm chua cay ra mắt năm 2000 và thành hương vị mì gói của cả một thế hệ. Quán ăn và bếp nhà nâng cấp gói mì ấy bằng tôm, vẹm xanh, mực, nấm và cà chua, nấu trong nước dùng sả riềng, rắc rau mùi.',
    ],
    timeline: [
      {
        when: '1889',
        what: 'Theo hồ sơ UNESCO của Thái Lan, canh Tom Yum nấu cá đã được ghi chép.',
      },
      {
        when: '1958',
        what: 'Momofuku Ando bán gói mì ăn liền đầu tiên ở Nhật Bản.',
      },
      {
        when: 'Thập niên 1970',
        what: 'Mì MAMA ra đời ở Thái Lan; vị Tom Yum thành hương vị mì gói quen thuộc.',
      },
      {
        when: '2000',
        what: 'Mì Hảo Hảo vị tôm chua cay ra mắt tại Việt Nam.',
      },
      {
        when: 'Tháng 12/2024',
        what: 'UNESCO ghi danh Tom Yum Kung là di sản văn hóa phi vật thể đại diện của nhân loại.',
      },
    ],
    meaning: [
      'Hồ sơ UNESCO mô tả Tom Yum Kung như món ăn của các làng nông bên sông và kênh rạch: tôm sông bắt quanh nhà, thảo mộc hái trong vườn, công thức truyền miệng từ mẹ sang con. Trong bữa cơm Thái, nồi canh đặt giữa mâm cho mọi người cùng múc, ăn với cơm chứ không ăn riêng. Nhiều người tin sả, riềng, lá chanh giúp ấm người những ngày mưa.',
      'Còn mì gói là ký ức của những đêm ôn thi, những ngày cuối tháng, bữa ăn vội sau ca làm. Gộp hai thứ lại, tô mì Tom Yum hải sản vừa bình dân vừa sang hơn một bậc: vẫn là sợi mì xoăn quen thuộc, nhưng có tôm, có vẹm, có mực, đủ để một tô mì khuya trở thành bữa ăn tử tế.',
    ],
    symbols: [
      {
        name: 'Tôm',
        meaning: 'Chữ “kung” trong Tom Yum Kung; tôm cho nước dùng vị ngọt, đầu tôm cho màu cam.',
      },
      {
        name: 'Vẹm xanh và mực',
        meaning: 'Thêm vị mặn mòi của biển, biến tô mì thành bữa hải sản đầy đặn.',
      },
      {
        name: 'Mì ăn liền',
        meaning: 'Sợi mì xoăn chín trong ba phút, hút trọn nước dùng chua cay.',
      },
      {
        name: 'Nấm và cà chua',
        meaning:
          'Nấm cho vị ngọt, cà chua cho vị chua dịu, hai thứ không thể thiếu của nồi Tom Yum.',
      },
      {
        name: 'Chanh và rau mùi',
        meaning: 'Vắt chanh khi đã tắt bếp cho vị chua tươi, rắc rau mùi cho thơm.',
      },
    ],
    tasting: [
      'Tô mì phải ăn ngay, trước khi sợi mì trương lên. Nếm nước dùng trước rồi mới thêm chanh, ớt. Chanh vắt vào nồi đang sôi sẽ bị đắng, nên luôn vắt khi đã nhấc ra. Sả, riềng và lá chanh chỉ để lấy mùi, cứ gạt sang một bên, không ai nhai chúng.',
      'Uống kèm trà đá, nước dừa hay nước chanh sả để dịu cay. Vỏ vẹm, vỏ tôm nên có đĩa riêng. Món chứa hải sản có vỏ và thường khá cay; ai không ăn được cay nên dặn bếp bớt ớt từ đầu.',
    ],
    facts: [
      'Ở Thái Lan, “mama” vốn là tên một thương hiệu nhưng đã thành từ gọi chung cho mì ăn liền.',
      'Kiểu Tom Yum nước sánh “nam khon” chỉ phổ biến từ khoảng thập niên 1980.',
      'Việt Nam thường đứng trong nhóm đầu thế giới về số gói mì ăn liền tiêu thụ trên mỗi người.',
    ],
    reference: {
      label: 'Tom yum — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Tom_yum',
    },
  },

  'salad-ga-nuong': {
    homeland: 'Hoa Kỳ · Tijuana, Mexico',
    era: 'Thập niên 1920 – nay',
    tagline:
      'Khi người Mỹ quyết định rau xanh cũng có thể làm bữa chính, miếng ức gà nướng đã chen vào giữa đĩa salad.',
    origin: [
      'Chữ “salad” đến từ tiếng Latin “herba salata”, rau trộn muối: người La Mã ăn rau sống chấm muối, dầu và giấm. Suốt nhiều thế kỷ, salad chỉ là đĩa nhỏ bên cạnh món thịt. Đầu thế kỷ XX, nước Mỹ bắt đầu nghĩ khác, với những đĩa salad to có thịt, trứng, phô mai, đủ để làm bữa trưa của các quý bà, của người đi làm.',
      'Hai món góp công lớn nhất đều có giai thoại. Caesar salad được cho là ra đời ở Tijuana, Mexico, ngày 4 tháng 7 năm 1924, khi Caesar Cardini, chủ nhà hàng người Ý, trộn tại bàn những gì còn lại trong bếp: xà lách romaine, bánh mì nướng giòn, Parmesan, trứng và sốt Worcestershire. Bản gốc không có gà, cũng không có cá cơm. Cobb salad thì tương truyền do Robert Cobb ở nhà hàng Brown Derby, Hollywood, nghĩ ra năm 1937, xếp gà, trứng, cà chua, thịt xông khói thành từng hàng.',
      'Từ thập niên 1980–1990, trào lưu ăn ít béo biến ức gà nướng thành nguồn đạm được chuộng nhất, và “chicken Caesar” cùng các loại salad gà có mặt khắp quán cà phê, căng tin và phòng gym. Ở Việt Nam, salad gà nướng phổ biến cùng làn sóng ăn sạch những năm 2010. Đĩa salad ở đây gần với kiểu Cobb hơn: gà nướng, trứng lòng đào, bắp ngọt, cà chua, dưa leo, cà rốt và hành tây trên nền xà lách.',
    ],
    timeline: [
      {
        when: 'Thời La Mã',
        what: 'Người La Mã ăn rau sống chấm muối và dầu, gốc của chữ “salad”.',
      },
      {
        when: '4/7/1924',
        what: 'Caesar Cardini được cho là trộn món Caesar salad đầu tiên ở Tijuana, chưa có gà.',
      },
      {
        when: '1937',
        what: 'Tương truyền Cobb salad ra đời tại nhà hàng Brown Derby ở Hollywood.',
      },
      {
        when: 'Thập niên 1980 – 1990',
        what: 'Trào lưu ăn ít béo đưa ức gà nướng lên đĩa salad, thành bữa chính quen thuộc.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Salad gà nướng phổ biến ở các thành phố lớn Việt Nam cùng xu hướng ăn sạch.',
      },
    ],
    meaning: [
      'Salad gà nướng là dấu hiệu của một quan niệm mới về bữa ăn: không cần nhiều món, chỉ cần đủ chất, nhiều màu và không làm buồn ngủ sau giờ trưa. Nó vừa vặn với nhịp sống văn phòng, có thể làm từ tối hôm trước, cho vào hộp mang theo, và ăn ngay tại bàn làm việc.',
      'Người Việt vốn ăn rau sống gần như bữa nào cũng có, nên salad chẳng xa lạ. Điều mới chỉ là đảo vai: rau lên làm món chính, thịt lùi xuống làm phần đi kèm, nước mắm nhường chỗ cho dầu giấm hay sốt mè rang. Một đĩa salad gà nướng vì thế vừa rất Tây, vừa rất gần với thói quen “phải có rau” của bữa cơm nhà.',
    ],
    symbols: [
      {
        name: 'Thịt gà',
        meaning: 'Ức hoặc đùi gà nướng, thái lát, mang phần đạm biến salad thành bữa chính.',
      },
      {
        name: 'Xà lách',
        meaning: 'Nền rau giòn mát; Caesar gốc dùng romaine lá dài, chắc, không úng sốt.',
      },
      {
        name: 'Trứng lòng đào',
        meaning: 'Lòng đỏ chảy ra như một loại sốt tự nhiên, dấu vết của Caesar và Cobb.',
      },
      {
        name: 'Bắp ngọt',
        meaning: 'Hạt vàng ngọt giòn, một nét rất Mỹ trong đĩa salad hiện đại.',
      },
      {
        name: 'Cà chua, dưa leo, cà rốt và hành tây',
        meaning: 'Rau củ nhiều nước và nhiều màu, giữ cho đĩa salad tươi và giòn.',
      },
    ],
    tasting: [
      'Rưới sốt và trộn ngay trước khi ăn để rau không úng. Dầu giấm, sốt mè rang hay sốt Caesar đều hợp; ai thích kiểu Việt có thể pha chút nước mắm chanh tỏi. Cố gắp mỗi miếng có đủ rau, gà và chút trứng.',
      'Nếu mang đi làm, đựng sốt riêng, để trứng và gà ở ngăn khác. Một lát bánh mì nướng giúp no lâu hơn. Gà phải nướng chín kỹ, trứng lòng đào nên dùng trứng tươi. Uống kèm nước ép, trà thảo mộc hoặc nước lọc có lát chanh.',
    ],
    facts: [
      'Caesar salad ra đời ở Mexico, và bản gốc của Cardini không có cá cơm lẫn thịt gà.',
      'Chữ “salad” đến từ “herba salata”, rau trộn muối trong tiếng Latin.',
      'Cobb salad truyền thống xếp từng loại nguyên liệu thành hàng song song trên đĩa.',
    ],
    reference: {
      label: 'Caesar salad — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Caesar_salad',
    },
  },

  'mi-y-carbonara': {
    homeland: 'Roma, Ý',
    era: 'Thập niên 1940 – 1950',
    tagline:
      'Trứng, phô mai, thịt muối và tiêu: carbonara ít thứ đến mức tưởng cổ xưa, nhưng thật ra là một trong những món Roma trẻ nhất.',
    origin: [
      'Carbonara là một trong bốn món mì kinh điển của Roma, cùng cacio e pepe, gricia và amatriciana. Bản chuẩn của người Roma hôm nay chỉ có guanciale (má heo muối), lòng đỏ trứng, pecorino romano và tiêu đen. Không kem, không tỏi. Độ sánh mịn đến từ việc nhấc chảo khỏi lửa, trộn trứng và phô mai với mì nóng và một ít nước luộc mì, sao cho trứng chín vừa đủ thành kem chứ không vón cục.',
      'Nguồn gốc của món vẫn còn tranh cãi. Không có công thức carbonara nào trước Thế chiến II; công thức in sớm nhất xuất hiện năm 1952 trong một sách hướng dẫn nhà hàng ở Chicago, còn ở Ý là năm 1954 trên tạp chí La Cucina Italiana, với pancetta, tỏi và phô mai Gruyère. Giả thuyết được nhiều sử gia ủng hộ cho rằng món ra đời sau khi quân Đồng minh vào Roma tháng 6 năm 1944, khi lính Mỹ tìm “trứng và thịt xông khói” trong quán Ý. Đầu bếp Renato Gualandi kể rằng ông đã nấu món này cho sĩ quan Đồng minh năm 1944, bằng trứng bột, bacon và cả kem.',
      'Thuyết khác gắn tên món với “carbonari”, thợ đốt than vùng Apennine, hay với món mì “cacio e uova” trứng phô mai của Napoli được ghi lại từ năm 1839, nhưng đều chưa có bằng chứng. Guanciale và pecorino chỉ dần thay thế vào cuối thập niên 1950–1960, còn kem bị loại khỏi công thức Ý chủ yếu từ thập niên 1990. Vì vậy bản sốt kem với thịt xông khói và nấm mỡ ở các nhà hàng Việt Nam thực ra gần với carbonara quốc tế những năm 1970–1980 hơn là “làm sai”.',
    ],
    timeline: [
      {
        when: '1839',
        what: 'Món mì trứng phô mai “cacio e uova” của Napoli được ghi lại, có thể là tiền thân của carbonara.',
      },
      {
        when: '1944',
        what: 'Quân Đồng minh vào Roma; theo giả thuyết phổ biến, carbonara ra đời từ trứng và bacon của lính Mỹ.',
      },
      {
        when: '1952 – 1954',
        what: 'Công thức carbonara in sớm nhất ở Chicago, rồi trên tạp chí La Cucina Italiana ở Ý.',
      },
      {
        when: 'Thập niên 1990',
        what: 'Bếp Ý loại hẳn kem khỏi carbonara, chốt lại bản guanciale, trứng, pecorino và tiêu.',
      },
      {
        when: '2017',
        what: 'Ngày 6 tháng 4 bắt đầu được giới làm mì Ý chọn làm “Carbonara Day”.',
      },
    ],
    meaning: [
      'Với người Roma, carbonara là niềm tự hào và là chuyện cãi nhau không dứt. Món ăn thể hiện đúng tính cách bếp Roma: nguyên liệu rẻ, ít thứ, nhưng chỉ cần lửa quá tay một chút là trứng thành trứng chưng. Thêm kem, thêm tỏi hay dùng bacon thay guanciale thường đủ để người Ý lên tiếng, và mỗi lần một đầu bếp nổi tiếng “sáng tạo” carbonara là mạng xã hội Ý lại dậy sóng.',
      'Nhưng chính sự dễ biến tấu lại giúp carbonara đi khắp thế giới. Ở Việt Nam, đĩa mì sốt kem béo với thịt xông khói giòn là món quen của buổi hẹn hò đầu tiên, bữa tối sinh nhật ở nhà hàng Âu. Nó khác xa bản Roma, nhưng vẫn giữ cái cảm giác ấm bụng, no nê của một đĩa mì Ý tử tế.',
    ],
    symbols: [
      {
        name: 'Thịt xông khói',
        meaning:
          'Thay cho guanciale của Roma; vị mặn khói ấy cũng nhắc lại giả thuyết về khẩu phần lính Mỹ.',
      },
      {
        name: 'Kem tươi',
        meaning:
          'Cho sốt béo và dễ làm; có trong nhiều công thức đời đầu, nay người Roma không dùng.',
      },
      {
        name: 'Phô mai Parmesan',
        meaning: 'Vị mặn thơm hạt, thường thay cho pecorino romano gắt hơn trong bản quốc tế.',
      },
      {
        name: 'Nấm mỡ',
        meaning: 'Thêm vị ngọt và độ mềm, một biến tấu ngoài nước Ý rất được ưa ở châu Á.',
      },
      {
        name: 'Mì spaghetti và ngò tây',
        meaning: 'Spaghetti là sợi hay dùng nhất cho carbonara; ngò tây chỉ để rắc cho đẹp.',
      },
    ],
    tasting: [
      'Carbonara phải ăn ngay, vì sốt trứng hay sốt kem đều đặc lại rất nhanh khi nguội. Dùng nĩa xoay mì, xay thêm tiêu đen và bào phô mai tùy thích. Người Roma coi món này đã đủ đậm, nên không ăn kèm bánh mì bơ tỏi.',
      'Bản sốt kem khá nặng, hai người gọi một đĩa kèm một đĩa salad rau trộn chanh là vừa. Người lớn có thể dùng vang trắng, còn không thì nước khoáng có ga cũng giúp nhẹ miệng. Món có sữa, trứng và gluten.',
    ],
    facts: [
      'Công thức carbonara đầu tiên in ở Ý năm 1954 có pancetta, tỏi và phô mai Gruyère.',
      'Guanciale làm từ má heo, còn pancetta làm từ thịt bụng.',
      'Kem tươi chỉ bị loại hẳn khỏi carbonara ở Ý từ khoảng thập niên 1990.',
    ],
    reference: {
      label: 'Carbonara — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Carbonara',
    },
  },

  'lasagna-bo-bam': {
    homeland: 'Emilia-Romagna · Campania, Ý',
    era: 'Thời Trung cổ – nay',
    tagline:
      'Một khay nướng cao năm, sáu tầng mì, sốt thịt và phô mai, lasagna là món người Ý chỉ làm khi nhà có dịp.',
    origin: [
      'Lasagna thuộc hàng mì cổ nhất nước Ý. Tên gọi thường được cho là gốc từ chữ Hy Lạp “laganon”, tấm bột mỏng cắt dải; một giả thuyết khác lần về chữ Latin “lasanum”, cái nồi nấu. Công thức đầu tiên còn ghi lại nằm trong “Liber de Coquina”, sách nấu ăn tiếng Latin đầu thế kỷ XIV gắn với triều đình Napoli: những tấm bột lên men cán mỏng, luộc chín, rắc phô mai và gia vị, rồi ăn bằng một que nhọn.',
      'Dần dần hình thành hai trường phái. Ở Napoli, lasagne di Carnevale làm cho mùa lễ hội trước Mùa Chay, xếp ricotta, mozzarella, thịt viên nhỏ, xúc xích, trứng luộc với ragù Napoli. Ở Bologna, lasagne verdi dùng lá mì trứng nhồi rau bina nên màu xanh, xếp ragù bò, sốt béchamel và Parmigiano Reggiano. Cà chua chỉ vào lasagna sau khi được người Ý dùng rộng rãi, khoảng thế kỷ XIX.',
      'Sang Mỹ, người di cư Ý làm lasagna phủ thật nhiều mozzarella và ricotta, mặt bánh vàng xém kéo sợi, rồi kiểu ấy đi khắp thế giới. Ở Việt Nam, bếp nhà xưa không có lò nướng, nên lasagna chủ yếu ở nhà hàng Ý. Từ khi lò điện và nồi chiên không dầu vào bếp gia đình, nhiều người tự làm. Khay ở đây là kiểu Ý – Mỹ: lá mì, bò bằm xào tỏi, sốt cà chua, mozzarella và Parmesan, rắc ngò tây.',
    ],
    timeline: [
      {
        when: 'Thời cổ đại',
        what: 'Người Hy Lạp và La Mã làm những tấm bột mỏng gọi là laganon, lagana.',
      },
      {
        when: 'Đầu thế kỷ XIV',
        what: 'Sách “Liber de Coquina” ghi công thức lá mì luộc rắc phô mai, tiền thân của lasagna.',
      },
      {
        when: 'Khoảng 1390',
        what: 'Sách nấu ăn Anh “The Forme of Cury” có món “loseyns” xếp lá bột với phô mai.',
      },
      {
        when: 'Thế kỷ XIX – XX',
        what: 'Lasagna alla bolognese với ragù và béchamel định hình ở Emilia-Romagna.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Người Mỹ gốc Ý phổ biến lasagna phủ nhiều mozzarella, rồi lan ra thế giới.',
      },
    ],
    meaning: [
      'Ở Ý, lasagna là món của ngày có dịp: bữa trưa Chủ nhật, lễ Phục sinh, mùa Carnevale ở Napoli. Làm một khay mất gần cả ngày, từ hầm ragù, khuấy béchamel đến cán lá mì, nên thường cả nhà cùng xắn tay. Khay lasagna nóng hổi đặt giữa bàn là cách chủ nhà nói rằng mình quý khách.',
      'Lasagna cũng là món của sự chia đều. Một khay lớn cắt thành từng ô vuông, ai cũng có phần, và góc khay cháy xém thì luôn có người giành. Ở Việt Nam, món ăn mang đúng tinh thần ấy trong tiệc sinh nhật, họp lớp hay buổi tân gia, khi người nấu muốn đãi một món “cầu kỳ” mà vẫn ấm áp như đồ nhà làm.',
    ],
    symbols: [
      {
        name: 'Lá mì lasagna',
        meaning: 'Những tấm mì rộng, hậu duệ của laganum cổ, tạo nên cấu trúc nhiều tầng.',
      },
      {
        name: 'Bò bằm',
        meaning: 'Xào và hầm thành ragù đậm, lớp nhân chính đem vị Bologna vào từng tầng.',
      },
      {
        name: 'Sốt cà chua và tỏi',
        meaning: 'Nền chua ngọt kiểu Napoli và Ý – Mỹ, phủ đều để lá mì mềm khi nướng.',
      },
      {
        name: 'Phô mai mozzarella',
        meaning: 'Lớp mặt kéo sợi vàng xém, dấu ấn của lasagna Ý – Mỹ.',
      },
      {
        name: 'Phô mai Parmesan',
        meaning: 'Rắc giữa các tầng cho vị mặn sâu, đặc sản của chính quê hương lasagna bolognese.',
      },
    ],
    tasting: [
      'Ra lò, hãy để lasagna nghỉ chừng mười lăm phút. Cắt ngay thì các tầng trượt, nhân chảy tràn; chờ một chút thì miếng bánh đứng thẳng, nhìn rõ từng lớp. Dùng dao nĩa, xắn từ trên xuống để mỗi miếng có đủ mì, thịt và phô mai.',
      'Một đĩa salad xanh trộn dầu giấm là đủ cân lại độ béo; người lớn có thể dùng chút vang đỏ. Lasagna để qua đêm trong tủ lạnh thường được khen ngon hơn, vì các tầng đã ngấm vào nhau. Món có sữa, gluten và có thể có trứng.',
    ],
    facts: [
      'Trong “Liber de Coquina”, món lasagna đầu tiên được ăn bằng một que nhọn chứ không phải nĩa.',
      'Lasagna xanh của Bologna có màu nhờ rau bina nhồi vào bột.',
      'Lasagna là món khoái khẩu nổi tiếng của chú mèo hoạt hình Garfield.',
    ],
    reference: {
      label: 'Lasagna — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Lasagna',
    },
  },

  'burger-bo-pho-mai': {
    homeland: 'Hamburg, Đức · Hoa Kỳ',
    era: 'Cuối thế kỷ XIX – đầu thế kỷ XX',
    tagline:
      'Miếng bò băm mang tên một thành phố cảng nước Đức, kẹp vào chiếc bánh mì tròn ở Mỹ, đã thành bữa ăn cầm tay của cả thế giới.',
    origin: [
      'Burger bắt đầu từ “Hamburg steak”, miếng bò băm nặn dẹt rồi áp chảo, món quen của người Đức. Thế kỷ XIX, hàng triệu người Đức di cư sang Mỹ, nhiều người lên những chuyến tàu xuất phát từ cảng Hamburg. Các quán ăn ở New York bắt đầu ghi “Hamburg steak” trên thực đơn như món thịt rẻ, dễ nhai, hợp với người lao động.',
      'Ai đầu tiên kẹp miếng thịt ấy vào bánh mì thì không ai chắc. Charlie Nagreen ở hội chợ Seymour, Wisconsin, anh em nhà Menches ở hội chợ Hamburg, New York, cùng nhận năm 1885; quán Louis’ Lunch ở New Haven nói họ kẹp thịt giữa hai lát bánh mì nướng từ năm 1900; Fletcher Davis ở Texas được cho là bán ở Hội chợ Thế giới St. Louis năm 1904. Điều chắc chắn hơn: năm 1921, White Castle mở ở Wichita, Kansas, bán burger 5 xu, thường được coi là chuỗi hamburger đầu tiên.',
      'Năm 1948, anh em nhà McDonald ở San Bernardino, California, cắt thực đơn, chia việc như dây chuyền và giao burger trong vài chục giây. Mô hình ấy đưa burger ra toàn cầu. Từ thập niên 2000, làn sóng burger thủ công quay lại với thịt xay tại chỗ, bánh nướng bơ và phô mai ngon. Ở Việt Nam, những quán burger nhỏ của người trẻ ở Hà Nội, Sài Gòn mọc lên từ thập niên 2010, làm burger thành chỗ hẹn hò quen.',
    ],
    timeline: [
      { when: 'Thế kỷ XIX', what: 'Người di cư Đức mang món bò băm Hamburg steak đến nước Mỹ.' },
      {
        when: '1885 – 1904',
        what: 'Nhiều người bán hàng ở hội chợ và quán ăn Mỹ cùng nhận là người đầu tiên kẹp thịt băm vào bánh mì.',
      },
      {
        when: '1921',
        what: 'White Castle mở ở Wichita, Kansas, thường được coi là chuỗi hamburger đầu tiên.',
      },
      {
        when: '1948',
        what: 'Anh em nhà McDonald áp dụng quy trình phục vụ nhanh kiểu dây chuyền ở California.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Quán burger thủ công nở rộ ở các đô thị Việt Nam.',
      },
    ],
    meaning: [
      'Burger là món của nước Mỹ công nghiệp: làm nhiều, đi nhiều, cần bữa ăn nhanh, rẻ, no. Nó còn là món của ngày 4 tháng 7, khi vỉ than được kéo ra sân sau, ông bố đứng lật burger, hàng xóm mang bia sang. Chuyện White Castle cố tình xây quầy bếp sáng trắng cho khách nhìn thấy, để người Mỹ thôi ngờ vực thịt băm, cũng cho thấy chiếc burger đã phải “giành lòng tin” thế nào.',
      'Ở Việt Nam, burger không chiếm chỗ của bánh mì mà sống cạnh nó. Bánh mì là bữa sáng vội bên vỉa hè; burger thường gắn với quán có nhạc, có đèn vàng, những cuộc nói chuyện kéo dài. Gọi một chiếc burger, với nhiều người trẻ, là cách nếm thử thế giới mà chẳng cần rời thành phố mình.',
    ],
    symbols: [
      {
        name: 'Vỏ bánh burger',
        meaning: 'Bánh mì tròn mềm rắc mè, thứ biến miếng thịt băm thành món cầm tay ăn được.',
      },
      {
        name: 'Thịt bò',
        meaning: 'Hậu duệ của Hamburg steak, ép mỏng và áp vỉ thật nóng cho xém cạnh.',
      },
      {
        name: 'Phô mai cheddar',
        meaning: 'Lát phô mai mặn béo tan trên thịt, biến burger thường thành bản “có phô mai”.',
      },
      {
        name: 'Hành tây, xà lách và cà chua',
        meaning: 'Hành ngọt hăng, xà lách giòn, cà chua mọng: ba lớp rau quen của quầy burger Mỹ.',
      },
      {
        name: 'Khoai tây chiên và tương cà',
        meaning: 'Phần ăn kèm đặt giữa bàn cho cả nhóm cùng chấm.',
      },
    ],
    tasting: [
      'Cầm burger bằng hai tay, ngón cái đỡ đáy, các ngón còn lại giữ nắp, ép nhẹ rồi cắn dứt khoát. Có người còn lật ngược chiếc bánh để nắp dày ở dưới, đáy mỏng khỏi bị nước thịt làm nhũn. Quán thủ công có thể đưa dao nĩa, nhưng ăn bằng tay vẫn ngon hơn.',
      'Khoai tây chiên chấm tương cà, mayonnaise hoặc tương ớt kiểu Việt. Burger hợp với nước ngọt có ga, sữa lắc, hay bia thủ công cho người lớn. Món có gluten, sữa và mè; ai cần thịt chín kỹ nên dặn trước.',
    ],
    facts: [
      'Chữ “ham” trong hamburger chỉ thành phố Hamburg, không liên quan gì đến giăm bông.',
      'White Castle bán burger giá 5 xu khi mới mở năm 1921.',
      'Quán Louis’ Lunch ở New Haven đến nay vẫn kẹp thịt bằng bánh mì nướng và không phục vụ tương cà.',
    ],
    reference: {
      label: 'Hamburger — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Hamburger',
    },
  },

  'pizza-pepperoni': {
    homeland: 'New York, Hoa Kỳ · gốc Ý',
    era: 'Đầu – giữa thế kỷ XX',
    tagline:
      'Lát xúc xích đỏ cong vành trên phô mai kéo sợi: món của người Ý xa xứ, và là chiếc pizza nước Mỹ gọi nhiều nhất.',
    origin: [
      'Đến Ý gọi “pizza peperoni”, bạn có thể nhận về chiếc bánh phủ ớt chuông, vì “peperoni” trong tiếng Ý là ớt chuông. Pepperoni thực ra là xúc xích khô kiểu Mỹ, do người Mỹ gốc Ý làm từ thịt heo trộn bò, ướp paprika và ớt, lên men rồi phơi khô, lấy cảm hứng từ các loại salame cay của miền Nam nước Ý. Tư liệu cho thấy pepperoni đã được bán ở New York ít nhất từ năm 1919.',
      'Cùng thời, các tiệm pizza đầu tiên mọc lên ở Little Italy, New York. Lombardi’s ở phố Spring thường được giới thiệu là tiệm pizza có giấy phép đầu tiên của Mỹ, từ năm 1905. Nhưng năm 2019, nhà nghiên cứu Peter Regas chỉ ra rằng tờ giấy phép ấy chưa bao giờ được tìm thấy, Gennaro Lombardi đến Mỹ cuối năm 1904 như một lao động phổ thông, và tiệm nhiều khả năng do Filippo Milone mở trước đó.',
      'Sau Thế chiến II, những người lính từng đóng quân ở Ý về nước mang theo cơn thèm pizza; các chuỗi như Pizza Hut (1958) nối nhau ra đời, và pepperoni, dễ bảo quản, dễ thái, nướng lên thơm lừng, thành loại nhân phổ biến nhất. Một số liệu năm 2009 cho thấy khoảng 36% pizza bán ở Mỹ có pepperoni. Ở Việt Nam, đây là chiếc bánh trẻ con hay chọn đầu tiên trên thực đơn: chỉ có pepperoni, mozzarella, sốt cà chua và lá oregano, đơn giản mà đậm.',
    ],
    timeline: [
      {
        when: 'Cuối thế kỷ XIX',
        what: 'Làn sóng di cư từ miền Nam nước Ý mang nghề làm salame cay đến Mỹ.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Các tiệm pizza đầu tiên mở ở Little Italy, New York; ngày mở cửa của Lombardi’s vẫn còn tranh cãi.',
      },
      {
        when: '1919',
        what: 'Pepperoni được ghi nhận có bán ở New York trong các cửa hàng thịt nguội của người Ý.',
      },
      {
        when: '1958',
        what: 'Pizza Hut ra đời ở Wichita, mở đầu thời của các chuỗi pizza.',
      },
      {
        when: 'Sau Thế chiến II – nay',
        what: 'Pepperoni thành loại nhân pizza được gọi nhiều nhất nước Mỹ.',
      },
    ],
    meaning: [
      'Pizza pepperoni là món của người Ý – Mỹ đúng nghĩa: không thuộc hẳn về nước Ý, cũng không hẳn của nước Mỹ, mà sinh ra từ cuộc sống của những người ở giữa. Nó kể chuyện một cộng đồng xa xứ giữ vị quê bằng những gì kiếm được ở nơi mới, rồi vô tình tạo ra một thứ quê nhà chưa từng có.',
      'Ở Mỹ, chiếc hộp pizza pepperoni gắn với tối thứ Sáu xem phim, trận bóng bầu dục Super Bowl, tiệc ngủ của bọn trẻ và đêm làm việc muộn ở văn phòng. Ở Việt Nam, nó là chiếc bánh “an toàn” khi gọi cho cả nhóm: không ai kén, ai cũng ăn được, và lát nào cũng có đủ nhân.',
    ],
    symbols: [
      {
        name: 'Xúc xích pepperoni',
        meaning:
          'Cay nhẹ, mặn, khói; nướng lên tiết ra lớp mỡ đỏ cam thấm vào phô mai, sáng tạo của người Mỹ gốc Ý.',
      },
      {
        name: 'Phô mai mozzarella',
        meaning: 'Nền béo kéo sợi, làm dịu vị cay mặn của xúc xích.',
      },
      {
        name: 'Sốt cà chua',
        meaning: 'Lớp chua ngọt đỏ tươi, di sản trực tiếp của những chiếc pizza Napoli đầu tiên.',
      },
      {
        name: 'Lá oregano',
        meaning: 'Mùi thảo mộc ấm, hơi đắng, thứ mà người Mỹ gần như mặc định là “mùi pizza”.',
      },
      {
        name: 'Đế pizza',
        meaning: 'Đế kiểu New York mỏng, rộng, đủ dẻo để gập đôi mà không gãy.',
      },
    ],
    tasting: [
      'Ở New York, người ta gập đôi lát pizza theo chiều dọc để mỡ không nhỏ xuống tay, rồi vừa đi vừa ăn. Rắc thêm ớt khô, Parmesan hoặc chấm tương ớt theo kiểu Việt đều được. Phần viền còn lại, nhiều người chấm sốt tỏi hoặc mật ong.',
      'Uống kèm nước ngọt có ga, trà chanh hoặc bia cho người lớn; một đĩa salad xanh giúp bớt mặn. Pizza nguội nên hâm lại trên chảo khô có nắp, đế sẽ giòn lại mà phô mai vẫn chảy. Món có gluten, sữa và thịt heo.',
    ],
    facts: [
      'Ở Ý, muốn ăn bánh gần giống pizza pepperoni thì gọi pizza “diavola” với salame cay.',
      'Lát pepperoni có vỏ tự nhiên cong lên như chiếc cốc khi nướng, kiểu người Mỹ gọi là “cup and char”.',
      'Theo số liệu năm 2009, khoảng 36% pizza bán ở Mỹ có pepperoni.',
    ],
    reference: {
      label: 'Pepperoni — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Pepperoni',
    },
  },

  'ca-ri-do-thai-ga': {
    homeland: 'Miền Trung Thái Lan',
    era: 'Từ thế kỷ XVI đến nay',
    tagline:
      'Tiếng chày giã ớt khô, sả, riềng trong cối đá là khởi đầu của nồi cà ri đỏ, món cay béo kể lại cả lịch sử giao thương Đông Nam Á.',
    origin: [
      'Trong tiếng Thái, “kaeng” chỉ chung các món có nước, từ canh đến cà ri; cà ri đỏ là “kaeng phet”, nghĩa đen là món cay. Khác cà ri Ấn dùng nhiều bột gia vị khô, cà ri Thái bắt đầu từ một khối gia vị tươi giã nhuyễn trong cối đá: ớt đỏ khô, sả, riềng, tỏi, hành tím, vỏ chanh Thái, rễ ngò, chút hạt ngò, thì là và mắm tôm. Khối gia vị ấy được xào trong phần cốt dừa đặc nhất cho đến khi dầu dừa tách ra, đỏ óng, rồi mới cho thịt và nước dừa.',
      'Ớt, thứ làm nên màu đỏ, vốn từ châu Mỹ. Người Bồ Đào Nha đến kinh đô Ayutthaya năm 1511 và cùng các thương nhân châu Âu đưa ớt vào Đông Nam Á trong thế kỷ XVI. Trước đó, vị cay của bếp Thái đến từ tiêu và các loại củ rễ. Ayutthaya là thương cảng lớn, đón thương nhân Ba Tư, Ấn Độ, Trung Hoa, và mỗi luồng giao thương để lại dấu vết trên nồi cà ri; món cà ri đỏ vịt quay với dứa, vải là một ví dụ của bếp Hoa – Thái.',
      'Truyền thống, kaeng phet nấu với gà, vịt hoặc bò, thêm cà tím Thái tròn, măng, lá chanh và húng quế Thái. Ra nước ngoài, món được nấu bằng thứ dễ mua hơn. Phiên bản ở đây có khoai tây miếng lớn và ớt chuông, gần với khẩu vị Việt quen cà ri gà Nam Bộ, món mang ảnh hưởng Ấn Độ, ăn với bánh mì. Ăn kèm cơm trắng, rau thơm, ớt tươi và một miếng chanh.',
    ],
    timeline: [
      {
        when: '1511',
        what: 'Người Bồ Đào Nha đặt chân đến Ayutthaya, mở đầu giao thương với châu Âu.',
      },
      {
        when: 'Thế kỷ XVI',
        what: 'Ớt từ châu Mỹ theo tàu buôn đến Đông Nam Á và dần vào bếp Thái.',
      },
      {
        when: 'Thế kỷ XVII – XVIII',
        what: 'Thương cảng Ayutthaya đón thương nhân Ba Tư, Ấn, Hoa, làm phong phú các món kaeng.',
      },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Gia vị cà ri đóng gói và nhà hàng Thái đưa cà ri đỏ ra thế giới, kể cả Việt Nam.',
      },
    ],
    meaning: [
      'Trong nhà Thái, giã gia vị cà ri từng là việc mỗi sáng, và tiếng chày đều đều trong cối đá là âm thanh quen của nhiều căn bếp. Một nồi cà ri không bao giờ là phần riêng của ai: nó được đặt giữa mâm cùng cơm, trứng chiên, rau xào, mỗi người múc một ít, ăn cùng các món khác.',
      'Cà ri đỏ cũng là bài học cân vị: cay của ớt, béo của dừa, mặn của nước mắm, ngọt nhẹ của đường thốt nốt, thơm của lá chanh và húng quế. Người Việt đón món này rất tự nhiên, vì đã quen cà ri gà nước cốt dừa, nhưng vẫn thấy lạ ở mùi sả, riềng và lá chanh Thái đậm hơn hẳn.',
    ],
    symbols: [
      {
        name: 'Nước cốt dừa',
        meaning: 'Tạo độ béo, làm dịu vị cay; phần cốt đặc nhất dùng để xào gia vị cho thơm.',
      },
      {
        name: 'Ớt',
        meaning: 'Ớt khô cho màu đỏ, ớt tươi cho vị cay sắc, nhắc lại con đường ớt đi từ châu Mỹ.',
      },
      {
        name: 'Thịt gà',
        meaning: 'Loại thịt phổ biến nhất trong kaeng phet nhà làm, thấm cà ri mà không át vị.',
      },
      {
        name: 'Khoai tây và ớt chuông',
        meaning: 'Biến tấu cho thêm bùi và ngọt, gần với nồi cà ri gà quen thuộc của người Việt.',
      },
      {
        name: 'Rau thơm và chanh',
        meaning: 'Húng, lá thơm và chút chanh vắt giúp món cà ri béo trở nên nhẹ và tươi.',
      },
    ],
    tasting: [
      'Người Thái ăn cà ri với cơm trắng bằng thìa và nĩa: nĩa đẩy thức ăn lên thìa, thìa đưa vào miệng. Mỗi lần chỉ múc một ít cà ri rưới lên một góc cơm, không chan ướt cả đĩa, để cơm chỗ khác còn dùng cho món khác.',
      'Dưa leo tươi, trứng chiên hay vài lát chanh giúp mát miệng. Ở Việt Nam, nhiều người thích chấm bánh mì nóng vào nước cà ri. Uống trà đá, nước dừa hoặc trà sữa Thái để dịu cay. Gia vị cà ri truyền thống có mắm tôm, nên không hợp người ăn chay hay dị ứng hải sản.',
    ],
    facts: [
      '“Phet” trong tiếng Thái nghĩa là cay, nên tên gốc của cà ri đỏ chỉ đơn giản là “món cay”.',
      'Ớt, nguyên liệu tạo màu đỏ, không có ở châu Á trước thế kỷ XVI.',
      'Cà ri xanh Thái thường được xem là cay hơn cà ri đỏ vì dùng ớt xanh tươi.',
    ],
    reference: {
      label: 'Red curry — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Red_curry',
    },
  },

  'salad-ca-ngu': {
    homeland: 'California, Hoa Kỳ',
    era: 'Đầu thế kỷ XX – nay',
    tagline:
      'Một mùa cá mòi thất bát ở California năm 1903 đã sinh ra hộp cá ngừ, và từ đó đĩa salad cá ngừ có mặt trên bàn ăn nhiều nước.',
    origin: [
      'Ngư dân Địa Trung Hải đã đánh bắt cá ngừ từ thời cổ: ở Sicily, những hệ thống lưới cố định gọi là “tonnara” chờ đàn cá di cư mỗi mùa xuân, và cá ngừ ngâm dầu là món dự trữ quen thuộc. Nhưng salad cá ngừ kiểu hiện đại lại bắt đầu ở California, từ một tai nạn nghề nghiệp.',
      'Năm 1903, mùa cá mòi ngoài khơi miền Nam California thất bát. Albert P. Halfhill, chủ một xưởng đồ hộp ở San Pedro, thử đóng hộp cá ngừ albacore, loài cá người ta chê là cá tạp. Ông phát hiện cá ngừ hấp lên trắng và vị dịu như thịt gà. Năm đầu chỉ bán được khoảng 700 thùng, nhưng đến 1914 đã hơn 400.000 thùng. Một thương hiệu còn lấy luôn tên “Chicken of the Sea”, gà của biển.',
      'Giữa thế kỷ XX, cá ngừ hộp trộn mayonnaise, cần tây, hành tây kẹp bánh mì thành bữa trưa trong hộp cơm của học sinh và người đi làm Mỹ. Cuối thế kỷ, trào lưu ăn ít tinh bột đưa salad cá ngừ ra khỏi bánh mì, lên nền rau xanh. Ở Việt Nam, nơi Phú Yên, Bình Định nổi tiếng với cá ngừ đại dương, salad cá ngừ vẫn chủ yếu dùng cá hộp, trộn xà lách, trứng, bắp ngọt, ô liu đen, dưa leo, cà chua và hành tây.',
    ],
    timeline: [
      {
        when: 'Thời cổ đại',
        what: 'Ngư dân Địa Trung Hải giăng lưới “tonnara” đón đàn cá ngừ di cư.',
      },
      {
        when: '1903',
        what: 'Albert P. Halfhill đóng hộp cá ngừ albacore ở San Pedro, California khi thiếu cá mòi.',
      },
      {
        when: '1914',
        what: 'Cá ngừ hộp bán hơn 400.000 thùng mỗi năm, thương hiệu “Chicken of the Sea” ra đời.',
      },
      {
        when: 'Giữa thế kỷ XX',
        what: 'Salad cá ngừ trộn mayonnaise thành bữa trưa quen thuộc của gia đình Mỹ.',
      },
      {
        when: 'Thế kỷ XXI',
        what: 'Salad cá ngừ ít tinh bột phổ biến trong thực đơn ăn sạch ở Việt Nam.',
      },
    ],
    meaning: [
      'Salad cá ngừ là món của đô thị thế kỷ XX: nhiều phụ nữ đi làm hơn, ít thời gian đi chợ hơn, và gia đình cần những thứ nhanh, rẻ, đủ chất. Hộp cá ngừ trên kệ bếp trở thành phao cứu sinh cho bữa trưa vội, chuyến dã ngoại hay buổi tối tủ lạnh trống trơn.',
      'Ngày nay, nó mang nghĩa khác: chăm sóc bản thân. Với nhiều người trẻ Việt, hộp salad cá ngừ mang đi làm là lời tự hứa ăn uống tử tế hơn giữa tuần bận rộn. Món ăn cũng nhắc rằng bữa ngon không cần cầu kỳ, chỉ cần vài thứ tươi và một hộp cá được chọn kỹ.',
    ],
    symbols: [
      {
        name: 'Cá ngừ',
        meaning:
          'Thịt cá tơi, nhiều đạm, từ “cá tạp” của California thành món dự trữ của mọi căn bếp.',
      },
      {
        name: 'Bắp ngọt',
        meaning: 'Hạt vàng ngọt giòn, nét rất Mỹ mà người Nice làm salade niçoise cực kỳ phản đối.',
      },
      {
        name: 'Ô liu đen',
        meaning: 'Vị mặn bùi gợi nhớ quê hương Địa Trung Hải của nghề đánh cá ngừ.',
      },
      {
        name: 'Trứng luộc',
        meaning: 'Thêm đạm và độ béo, giúp đĩa salad no lâu hơn.',
      },
      {
        name: 'Xà lách, dưa leo, cà chua và hành tây',
        meaning: 'Phần rau giòn mát, hành tây cho chút hăng cắt bớt vị tanh của cá.',
      },
    ],
    tasting: [
      'Cá ngừ hộp nên để ráo dầu hoặc nước trước khi trộn, nếu không salad sẽ nhão. Dầu ô liu với chanh, sốt mè rang hay một thìa mayonnaise đều hợp; người Việt hay rắc thêm tiêu hoặc vài lát ớt.',
      'Muốn no hơn thì kẹp salad vào bánh mì sandwich hoặc ăn cùng bánh mì nướng. Uống kèm trà xanh hoặc nước ép. Phụ nữ mang thai và trẻ nhỏ nên ăn cá ngừ ở mức vừa phải vì cá lớn có thể tích thủy ngân.',
    ],
    facts: [
      'Trước năm 1903, cá ngừ albacore ở California bị coi là cá tạp, ít người muốn mua.',
      'Cá ngừ là một trong số ít loài cá giữ được thân nhiệt cao hơn nước biển xung quanh.',
      'Ngư dân Phú Yên câu cá ngừ đại dương bằng tay vào ban đêm, dùng đèn để dụ cá.',
    ],
    reference: {
      label: 'Tuna salad — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Tuna_salad',
    },
  },

  'salad-ca-ngu-trung': {
    homeland: 'Nice, Pháp',
    era: 'Cuối thế kỷ XIX – XX',
    tagline:
      'Theo dáng salade niçoise của Nice: cà chua, trứng, cá ngừ, dầu ô liu, và những trận cãi nhau không dứt về chuyện được thêm gì.',
    origin: [
      'Salade niçoise sinh ra ở Nice, thành phố bên bờ Địa Trung Hải, như món ăn của người nghèo. Cuối thế kỷ XIX, nó gần như chỉ có cà chua, cá cơm muối và dầu ô liu. Một công thức năm 1903 của Henri Heyraud thêm atisô, ớt chuông đỏ và ô liu đen nhỏ, nhưng vẫn chưa có cá ngừ, chưa có cả xà lách. Ở Nice ngày xưa, cá cơm rẻ và sẵn hơn cá ngừ nhiều.',
      'Auguste Escoffier, đầu bếp lừng danh sinh ra ngay gần Nice, đã thêm khoai tây và đậu que luộc. Nhà hàng khắp thế giới theo bản này, nhưng người Nice thì không. Jacques Médecin, thị trưởng Nice, trong cuốn sách nấu ăn năm 1972 đã viết như van nài: đừng bao giờ cho khoai tây luộc hay bất kỳ rau luộc nào vào salade niçoise. Theo ông, món này dùng cá cơm hoặc cá ngừ hộp, không bao giờ cả hai.',
      'Ngày nay, hội Cercle de la Capelina d’Or ở Nice vẫn đứng ra bảo vệ bản truyền thống, gạch tên đậu que, khoai tây, bắp ngọt, mayonnaise và cả nước chanh. Phiên bản cá ngừ trứng ở đây không có rau luộc, gần với tinh thần của Médecin, chỉ khác là lót thêm xà lách và dùng trứng lòng đào thay trứng luộc chín cắt tư, cùng cà chua, ớt chuông, dưa leo và hành tây.',
    ],
    timeline: [
      {
        when: 'Cuối thế kỷ XIX',
        what: 'Cà chua, cá cơm và dầu ô liu là bữa ăn bình dân của người lao động ở Nice.',
      },
      {
        when: '1903',
        what: 'Công thức của Henri Heyraud thêm atisô, ớt chuông và ô liu, vẫn chưa có cá ngừ.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Escoffier thêm khoai tây và đậu que, tạo bản salad được nhà hàng thế giới ưa chuộng.',
      },
      {
        when: '1972',
        what: 'Jacques Médecin, thị trưởng Nice, khẳng định salade niçoise không có rau luộc.',
      },
      {
        when: 'Thế kỷ XXI',
        what: 'Salad cá ngừ trứng kiểu niçoise thành món ăn trưa nhẹ quen thuộc ở Việt Nam.',
      },
    ],
    meaning: [
      'Với người Nice, salade niçoise là chuyện bản sắc. Nó gói gọn mùa hè vùng Riviera: cà chua chín nắng, ô liu nhỏ đen nhánh, dầu ô liu xanh, ăn chậm trên ban công hay dưới giàn cây. Médecin từng viết rằng món này phải “rực rỡ vị giòn ngọt của rau quả miền Nam”, và người Nice vẫn nhắc câu ấy mỗi khi thấy khoai tây trong đĩa salad.',
      'Về đến Việt Nam, món ăn mất bớt phần cãi vã nhưng giữ lại sự nhẹ nhõm. Quả trứng lòng đào cắt đôi, lòng đỏ chảy xuống rau và cá, đủ để đĩa salad văn phòng không còn là món ăn kiêng khô khốc mà thành một bữa trưa ngon thật sự.',
    ],
    symbols: [
      {
        name: 'Trứng',
        meaning: 'Thành phần gần như không thể thiếu; lòng đỏ mềm hòa vào dầu ô liu thành sốt.',
      },
      {
        name: 'Cá ngừ',
        meaning: 'Từng là thứ đắt hơn cá cơm ở Nice, nay là trung tâm của đĩa salad.',
      },
      {
        name: 'Cà chua',
        meaning: 'Thành phần cổ nhất của món, người Nice ướp muối trước cho ra nước ngọt.',
      },
      {
        name: 'Ớt chuông và dưa leo',
        meaning: 'Rau sống giòn ngọt, đúng tinh thần “không rau luộc” của Nice.',
      },
      {
        name: 'Hành tây',
        meaning: 'Vài khoanh mỏng cho chút hăng, người Nice thường dùng hành tím non hoặc hành lá.',
      },
    ],
    tasting: [
      'Người Nice chỉ trộn dầu ô liu nguyên chất, chút muối và tiêu, không sốt đặc, không vắt chanh. Cà chua nên rắc muối trước vài phút. Cắt đôi trứng ngay trên đĩa để lòng đỏ chảy vào rau. Món thường bày trên đĩa lớn rồi chia, như bữa trưa ngoài trời miền Nam nước Pháp.',
      'Ăn kèm bánh mì baguette giòn để vét chỗ dầu đọng dưới đáy đĩa; người lớn có thể uống vang hồng mát. Trứng lòng đào chưa chín hẳn, người có sức đề kháng yếu nên chọn trứng chín kỹ.',
    ],
    facts: [
      'Ở Nice có món pan bagnat, về cơ bản là salade niçoise kẹp trong bánh mì tròn tẩm dầu.',
      'Jacques Médecin cho rằng salade niçoise dùng cá cơm hoặc cá ngừ, không bao giờ cả hai.',
      'Hội bảo vệ món ăn ở Nice xếp bắp ngọt vào danh sách cấm của salade niçoise.',
    ],
    reference: {
      label: 'Salade niçoise — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Salade_ni%C3%A7oise',
    },
  },

  'salad-quinoa-dau-ga': {
    homeland: 'Dãy Andes · Trăng lưỡi liềm màu mỡ',
    era: 'Cổ đại · trào lưu thế kỷ XXI',
    tagline:
      'Hạt quinoa từ cao nguyên Andes và đậu gà từ vùng Trăng lưỡi liềm màu mỡ, hai thứ hạt rất cổ gặp nhau trên một đĩa salad rất mới.',
    origin: [
      'Quinoa được thuần hóa quanh hồ Titicaca, trên vùng cao nguyên Andes giữa Peru và Bolivia ngày nay. Người Andes dùng nó làm thức ăn gia súc từ 5.000–7.000 năm trước và làm lương thực cho người từ khoảng 3.000–4.000 năm trước. Người Inca gọi quinoa là “chisiya mama”, mẹ của mọi loại hạt. Cây chịu được rét, khô hạn và đất nghèo ở độ cao gần 4.000 mét, nơi lúa mì hay ngô khó sống.',
      'Đậu gà còn già hơn: nó được thuần hóa khoảng 10.000 năm trước ở vùng nay là đông nam Thổ Nhĩ Kỳ và Syria, cùng thời với lúa mì, lúa mạch, đậu lăng. Từ đó đậu gà đi khắp Trung Đông, Địa Trung Hải và Ấn Độ, thành hummus, falafel, chana masala. Người La Mã đặt tên khoa học gợi đến đầu con cừu đực, còn người Việt gọi là đậu gà, có lẽ vì hạt đậu có chỏm nhọn như mỏ gà con.',
      'Đầu thế kỷ XXI, quinoa thành “siêu thực phẩm” ở Bắc Mỹ, châu Âu. Liên Hợp Quốc chọn năm 2013 là Năm Quốc tế Quinoa, nhưng giá hạt tăng gần gấp ba trong những năm 2006–2014 cũng khiến người ta tranh luận liệu nông dân Andes có còn đủ tiền ăn chính hạt mình trồng. Salad quinoa đậu gà, kiểu Trung Đông với ngò tây, dưa leo, cà chua, ớt chuông và hành tây, đến Việt Nam cùng các quán chay và quán ăn lành mạnh.',
    ],
    timeline: [
      {
        when: 'Khoảng 10.000 năm trước',
        what: 'Đậu gà được thuần hóa ở vùng đông nam Thổ Nhĩ Kỳ và Syria ngày nay.',
      },
      {
        when: '3.000 – 4.000 năm trước',
        what: 'Người dân quanh hồ Titicaca bắt đầu trồng quinoa làm lương thực.',
      },
      {
        when: '2006 – 2014',
        what: 'Giá quinoa tăng gần gấp ba khi “siêu thực phẩm” này được săn đón toàn cầu.',
      },
      { when: '2013', what: 'Liên Hợp Quốc chọn đây là Năm Quốc tế Quinoa.' },
      {
        when: 'Thập niên 2010',
        what: 'Salad quinoa có mặt trong thực đơn quán chay và quán ăn lành mạnh ở Việt Nam.',
      },
    ],
    meaning: [
      'Với người Andes, quinoa là di sản, gắn với nghi lễ mùa vụ và bữa cơm cộng đồng. Cơn sốt toàn cầu đem lại thu nhập cho nông dân, nhưng cũng đặt ra câu hỏi khó: khi cả thế giới muốn ăn thứ hạt của bạn, ai được ăn nó trước?',
      'Salad quinoa đậu gà là món của người ăn chay hiện đại: hai nguồn đạm thực vật, nhiều rau, không cần thịt mà vẫn no. Ở Việt Nam, đĩa salad này gợi lại sự thanh đạm quen thuộc của bữa cơm chay, chỉ khác là được kể bằng ngôn ngữ của những vùng đất rất xa: dãy Andes và vùng Levant.',
    ],
    symbols: [
      {
        name: 'Hạt quinoa',
        meaning: 'Hạt nhỏ, nhiều đạm, khi chín lộ một vòng mầm trắng như sợi chỉ.',
      },
      {
        name: 'Đậu gà',
        meaning: 'Bùi và béo, nguồn đạm thực vật lâu đời của Trung Đông, Địa Trung Hải và Ấn Độ.',
      },
      {
        name: 'Ngò tây',
        meaning: 'Băm nhiều như trong món tabbouleh của vùng Levant, cho hương thơm tươi.',
      },
      {
        name: 'Dưa leo và cà chua',
        meaning: 'Rau quả mọng nước làm đĩa salad mát, hợp khí hậu nóng.',
      },
      {
        name: 'Ớt chuông và hành tây',
        meaning: 'Ngọt giòn và hăng nhẹ, làm vị đĩa salad sắc nét hơn.',
      },
    ],
    tasting: [
      'Quinoa nên vo kỹ trước khi nấu để bớt vị đắng, nấu xong xới tơi để nguội. Salad ăn lạnh hoặc ở nhiệt độ phòng, trộn với dầu ô liu, nước cốt chanh, muối, tiêu là đủ. Dùng thìa để xúc được cả hạt nhỏ lẫn đậu.',
      'Ăn kèm bánh mì pita, sữa chua hoặc vài lát bơ cho béo. Salad giữ được ba, bốn ngày trong tủ lạnh, tiện chuẩn bị cho cả tuần. Món thuần chay, quinoa và đậu gà không có gluten tự nhiên, nhưng nên kiểm tra sốt nếu ăn kiêng nghiêm ngặt.',
    ],
    facts: [
      'Quinoa không phải ngũ cốc mà là hạt của cây họ Dền, cùng họ với rau bina.',
      'Hạt quinoa có lớp saponin đắng tự nhiên, giúp cây tránh bị chim ăn.',
      'Tên khoa học của đậu gà, Cicer arietinum, gợi đến hình đầu con cừu đực.',
    ],
    reference: {
      label: 'Quinoa — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Quinoa',
    },
  },

  'bit-tet-bo': {
    homeland: 'Anh · Pháp · Việt Nam',
    era: 'Thế kỷ XVIII – XX',
    tagline:
      'Từ “beefsteak” của người Anh thành “bifteck” của người Pháp rồi thành “bít tết” của người Việt, miếng bò áp chảo đã đổi tên hai lần.',
    origin: [
      'Chữ “steak” gốc từ tiếng Bắc Âu cổ “steik”, liên quan đến việc xiên thịt nướng. Ở London năm 1735, một nhóm nghệ sĩ, chính khách lập ra “Hội Bít tết Cao quý”, mỗi tuần họp ăn bò nướng dưới khẩu hiệu “Thịt bò và Tự do”. Miếng bò dày trở thành niềm tự hào của bếp Anh. Người Pháp mượn chữ “beefsteak” thành “bifteck”, và đến thế kỷ XIX, steak frites, bít tết ăn với khoai tây chiên, đã là món quen của quán bistro.',
      'Người Pháp đưa bít tết sang Việt Nam thời thuộc địa, và tiếng Việt giữ lại gần nguyên âm “bifteck”. Qua tay người Việt, món ăn đổi khác: thịt bò thái mỏng hơn, ướp tỏi, dầu hào, áp trên chảo gang nóng hình con bò, ăn với trứng ốp la, pa tê, xúc xích, khoai tây chiên và bánh mì. Ở Sài Gòn, bò né là bữa sáng mỡ bắn xèo xèo, tên gọi được giải thích vui là thực khách phải “né” dầu.',
      'Từ những năm 2000, các nhà hàng steakhouse đem bò Úc, bò Mỹ nhập khẩu và chuyện chọn độ chín đến với khách Việt. Đĩa bít tết ở đây đứng giữa hai thế giới: miếng bò áp chảo rưới sốt tiêu đen kiểu steak au poivre của Pháp, món kinh điển mà nguồn gốc chính xác chưa ai xác định, ăn kèm khoai tây chiên, bông cải, cà rốt, xà lách và cà chua như một đĩa cơm Tây Sài Gòn.',
    ],
    timeline: [
      {
        when: '1735',
        what: '“Hội Bít tết Cao quý” ra đời ở London với khẩu hiệu “Thịt bò và Tự do”.',
      },
      {
        when: 'Thế kỷ XVIII – XIX',
        what: 'Người Pháp mượn “beefsteak” thành “bifteck”; steak frites thành món bistro quen thuộc.',
      },
      {
        when: 'Cuối thế kỷ XIX',
        what: 'Bít tết theo người Pháp vào Việt Nam thời thuộc địa.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bò bít tết chảo gang và bò né thành món ăn sáng, ăn tối quen thuộc ở Sài Gòn.',
      },
      {
        when: 'Thập niên 2000',
        what: 'Nhà hàng steakhouse với bò nhập khẩu phổ biến ở các thành phố lớn Việt Nam.',
      },
    ],
    meaning: [
      'Ở phương Tây, miếng bít tết dày là dấu hiệu của sự sung túc và những dịp đáng nhớ: kỷ niệm ngày cưới, mừng thăng chức, bữa tối hẹn hò. Người Pháp và người Bỉ đều coi steak frites là món ăn quốc dân, và việc chọn độ chín, chọn sốt là một nghi thức nhỏ để mỗi người tự nói ra khẩu vị của mình.',
      'Ở Việt Nam, bít tết từng là món “đi ăn Tây” sang trọng của những năm 1990. Rồi nó tách làm hai: một nhánh thành chảo bò sáng sớm ăn với bánh mì, bình dân và ồn ào; nhánh kia thành món chính của nhà hàng, có dao nĩa, có rượu vang. Cả hai đều mang dấu một thời giao thoa văn hóa, đã được Việt hóa đến tự nhiên.',
    ],
    symbols: [
      {
        name: 'Thịt bò',
        meaning: 'Áp chảo lửa lớn cho mặt ngoài xém nâu, bên trong còn hồng và ngọt.',
      },
      {
        name: 'Sốt tiêu đen',
        meaning: 'Tiêu đập dập, bơ, kem và nước thịt trong chảo, di sản của steak au poivre Pháp.',
      },
      {
        name: 'Khoai tây chiên',
        meaning: 'Nửa còn lại của steak frites, món mà cả Pháp và Bỉ đều nhận là của mình.',
      },
      {
        name: 'Bông cải xanh và cà rốt',
        meaning: 'Rau củ xào hay luộc, cân lại vị đậm của thịt và sốt.',
      },
      {
        name: 'Xà lách và cà chua',
        meaning: 'Đĩa rau sống bên cạnh, cách người Việt làm nhẹ một bữa nhiều thịt.',
      },
    ],
    tasting: [
      'Miếng bò áp chảo xong nên nghỉ vài phút cho nước thịt lắng, cắt mới không chảy hết ra đĩa. Cắt ngang thớ, từng miếng nhỏ, cắt đến đâu ăn đến đó để thịt giữ ấm. Độ chín tái, vừa hay chín kỹ tùy người; bò nhập khẩu thường ngon nhất ở mức chín vừa.',
      'Chấm thịt và khoai vào sốt tiêu, xé bánh mì vét nốt chỗ sốt còn lại. Với chảo gang kiểu Sài Gòn, cẩn thận dầu bắn và đừng chạm tay vào chảo. Vang đỏ hợp với người lớn; buổi sáng thì một ly cà phê sữa đá. Sốt tiêu thường có bơ và kem sữa.',
    ],
    facts: [
      'Từ “bít tết” bắt nguồn từ “bifteck” của tiếng Pháp, vốn mượn từ “beefsteak” của tiếng Anh.',
      'Tên món bò né thường được giải thích vui là thực khách phải né dầu mỡ bắn từ chảo nóng.',
      'Hội Bít tết Cao quý ở London năm 1735 chỉ có 24 thành viên, họp ăn bò mỗi tuần.',
    ],
    reference: {
      label: 'Bít tết — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%ADt_t%E1%BA%BFt',
    },
  },

  'ca-hoi-ap-chao-rau-cu': {
    homeland: 'Na Uy · Bắc Âu',
    era: 'Truyền thống lâu đời · nuôi biển từ năm 1970',
    tagline:
      'Miếng cá hồi da giòn bên khay rau củ nướng mang theo hơi lạnh của các vịnh hẹp Na Uy, nơi con cá này nuôi sống cả vùng ven biển.',
    origin: [
      'Cá hồi Đại Tây Dương từ lâu là món ăn của các dân tộc ven biển Bắc Âu, Scotland và Ireland. Mỗi năm, đàn cá bơi ngược sông về nơi chúng sinh ra, và người ta đánh bắt để ăn tươi, hun khói hay ướp muối dự trữ cho mùa đông. Ngư dân Bắc Âu thời Trung cổ còn ướp cá hồi bằng muối rồi vùi xuống cát cho lên men nhẹ; “gravlax” nghĩa đen là cá hồi chôn, nay chỉ còn là cá ướp muối, đường và thì là.',
      'Ngày 28 tháng 5 năm 1970, trên đảo Hitra, hai anh em Ove và Sivert Grøntvedt thả 16.000 con cá giống vào lồng lưới nổi giữa biển, và lứa cá ấy trở thành thế hệ cá hồi nuôi thương mại thành công đầu tiên. Nước lạnh, sạch và dòng chảy ổn định của các vịnh hẹp fjord hợp với cá hồi đến mức chỉ vài thập niên sau, Na Uy đã là nước sản xuất cá hồi nuôi lớn nhất thế giới, đưa loài cá từng xa xỉ đến bàn ăn khắp nơi.',
      'Áp chảo là cách đơn giản nhất để tôn miếng cá hồi tươi: đặt mặt da xuống chảo nóng, ấn nhẹ cho da phẳng, để yên đến khi da giòn rụm còn thịt bên trong vẫn hồng. Phiên bản ở đây ăn kèm măng tây, bông cải, khoai tây, cà rốt, cà chua và xà lách, vắt chanh. Ở Việt Nam, cá hồi Na Uy nhập khẩu phổ biến từ những năm 2000, thành món quen của nhà hàng Âu và bữa ăn lành mạnh.',
    ],
    timeline: [
      {
        when: 'Thời Trung cổ',
        what: 'Ngư dân Bắc Âu ướp cá hồi, vùi xuống cát để bảo quản, khởi đầu món gravlax.',
      },
      {
        when: '28/5/1970',
        what: 'Anh em Grøntvedt thả lứa cá hồi nuôi lồng thành công đầu tiên ở đảo Hitra, Na Uy.',
      },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Na Uy thành nước sản xuất cá hồi nuôi lớn nhất thế giới, cá hồi rẻ dần.',
      },
      {
        when: 'Thế kỷ XXI',
        what: 'Cá hồi áp chảo kèm rau củ thành món quen của nhà hàng Âu và bữa ăn lành mạnh ở Việt Nam.',
      },
    ],
    meaning: [
      'Ở Na Uy, cá hồi là chuyện kinh tế, chuyện vùng miền và chuyện bữa tối. Từ làng chài nhỏ đến những trang trại biển hiện đại, nó nuôi sống nhiều thế hệ ven biển. Một bữa tối cá hồi áp chảo với khoai tây luộc rắc thì là và chút kem chua là chuyện thường ngày trong gia đình Na Uy, chẳng có gì cầu kỳ.',
      'Ở Việt Nam, cá hồi từng là món sang, chỉ gọi ở nhà hàng. Giờ nó gần gũi hơn, thành món người ta tự thưởng cuối tuần: đĩa cá hồng cam, rau củ xanh vàng, ít dầu mỡ, đẹp mắt và đủ chất. Với nhiều người, gọi cá hồi áp chảo là cách nói “tuần này mình đã ăn uống tử tế”.',
    ],
    symbols: [
      {
        name: 'Cá hồi',
        meaning: 'Thịt béo mềm giàu omega-3, da áp chảo giòn như bánh tráng.',
      },
      {
        name: 'Măng tây',
        meaning: 'Rau mùa xuân được người châu Âu rất quý, áp chảo cho xanh giòn, ngọt thanh.',
      },
      {
        name: 'Khoai tây',
        meaning: 'Người bạn quen của cá trong bữa ăn Bắc Âu, luộc hay nướng đều no và ấm bụng.',
      },
      {
        name: 'Chanh',
        meaning: 'Vắt lên cá ngay trước khi ăn để cắt bớt vị béo, dậy mùi thơm.',
      },
      {
        name: 'Bông cải, cà rốt, cà chua và xà lách',
        meaning: 'Rau củ nhiều màu, nướng hoặc để sống, làm đĩa cá nhẹ nhàng.',
      },
    ],
    tasting: [
      'Ăn phần da trước khi còn nóng, kẻo hơi nước làm mềm mất. Dùng nĩa tách thịt cá theo thớ, vắt chút chanh, ăn kèm một miếng rau. Cá hồi tươi có thể để giữa còn hồng; ai thích chín kỹ thì dặn bếp, nhưng chín quá cá sẽ khô.',
      'Chút muối hạt rắc lên mặt da làm vị cá rõ hơn. Có thể thêm sốt bơ chanh hoặc sốt kem thì là kiểu Bắc Âu. Người lớn dùng vang trắng khô, còn không thì nước khoáng hoặc trà thảo mộc.',
    ],
    facts: [
      'Màu cam hồng của thịt cá hồi đến từ sắc tố astaxanthin trong thức ăn của chúng.',
      'Cá hồi Sa Pa phần lớn là cá hồi vân, một loài khác với cá hồi Đại Tây Dương.',
      '“Gravlax” nghĩa đen là “cá hồi chôn”, vì xưa cá được vùi xuống cát cho lên men.',
    ],
    reference: {
      label: 'Salmon as food — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Salmon_as_food',
    },
  },

  'com-ca-hoi-ap-chao': {
    homeland: 'Nhật Bản · biến tấu châu Á',
    era: 'Cuối thế kỷ XX – nay',
    tagline:
      'Người Nhật ăn cá hồi nướng muối với cơm từ lâu, nhưng chính một chiến dịch của Na Uy mới khiến cá hồi thành món ruột của bếp Nhật.',
    origin: [
      'Người Nhật đã ăn cá hồi từ rất lâu, nhưng gần như chỉ ở dạng nướng muối, gọi là shiozake. Một lát cá hồi muối nướng, bát cơm trắng, bát súp miso và đĩa dưa muối là bữa sáng kiểu Nhật quen thuộc. Cá hồi Thái Bình Dương đánh bắt tự nhiên dễ nhiễm ký sinh trùng, nên không ai dám ăn sống, và trong sushi cá hồi gần như vắng mặt.',
      'Năm 1986, Na Uy khởi động “Project Japan” để tìm thị trường cho lượng cá hồi nuôi dư thừa. Bjørn Eirik Olsen, người dẫn đầu, nhận ra cá hồi nuôi sạch ký sinh trùng nên có thể bán vào thị trường cá sống đắt đỏ, và đề nghị gọi nó là “sāmon” thay vì “sake” để tách hẳn khỏi cá hồi nướng muối. Từ thập niên 1990, sushi cá hồi bùng nổ, và nhiều khảo sát sau này xếp cá hồi là loại sushi người Nhật thích nhất.',
      'Cùng lúc ấy, cá hồi áp chảo rưới sốt kiểu teriyaki, nước tương, mirin, đường, vào cơm hộp bento, các suất cơm phần teishoku và nhà hàng gia đình. Từ Nhật, kiểu cơm cá hồi này lan khắp châu Á. Ở Việt Nam, suất cơm cá hồi áp chảo kèm đậu hũ, nấm mỡ, bông cải, cà rốt, xà lách và hành lá là món quen của quán cơm healthy và cơm văn phòng.',
    ],
    timeline: [
      {
        when: 'Nhiều thế kỷ trước',
        what: 'Người Nhật ăn cá hồi nướng muối shiozake cùng cơm trắng.',
      },
      {
        when: '1986',
        what: 'Na Uy khởi động “Project Japan”, đưa cá hồi nuôi vào thị trường cá sống Nhật Bản.',
      },
      {
        when: 'Thập niên 1990',
        what: 'Sushi cá hồi bùng nổ ở Nhật; cá hồi áp chảo sốt teriyaki phổ biến trong bento.',
      },
      {
        when: 'Thế kỷ XXI',
        what: 'Cơm cá hồi áp chảo thành món quen của quán cơm healthy tại Việt Nam.',
      },
    ],
    meaning: [
      'Trong bếp Nhật, một bữa cơm cân bằng theo công thức “ichiju sansai”, một canh ba món: cơm, canh, món chính và rau. Suất cơm cá hồi kế thừa tinh thần ấy: ít dầu, nhiều màu, mỗi thứ một góc gọn gàng. Hộp cơm bento còn là cách người Nhật gửi sự quan tâm cho con cái và người thân, xếp sao cho mở ra là thấy đẹp.',
      'Ở Việt Nam, món ăn hợp ngay với thói quen ăn cơm. Hạt cơm nóng, miếng cá béo mềm, đậu hũ vàng và rau luộc gợi lại mâm cơm nhà, chỉ là gọn hơn, hợp với giờ nghỉ trưa ngắn. Một suất cơm cá hồi cho thấy bữa trưa vội vẫn có thể đầy đủ và chỉn chu.',
    ],
    symbols: [
      {
        name: 'Cá hồi',
        meaning: 'Áp chảo cho da giòn, phết sốt nước tương ngọt bóng, trung tâm của suất cơm.',
      },
      {
        name: 'Cơm trắng',
        meaning: 'Nền của cả bữa ăn Nhật lẫn Việt, hút trọn nước sốt thơm ngọt.',
      },
      {
        name: 'Đậu hũ và nấm mỡ',
        meaning: 'Đạm thực vật và vị ngọt của nấm, quen thuộc với cả hai nền ẩm thực.',
      },
      {
        name: 'Bông cải xanh, cà rốt và xà lách',
        meaning: 'Phần rau ba màu giúp suất cơm cân bằng, đúng tinh thần “một canh ba món”.',
      },
      {
        name: 'Hành lá',
        meaning: 'Rắc sau cùng cho thơm và thêm chút xanh trên miếng cá.',
      },
    ],
    tasting: [
      'Dùng đũa tách một miếng cá, gắp cùng chút cơm và rau trong một lần. Theo phép lịch sự Nhật, nâng bát cơm lên gần miệng thay vì cúi xuống bàn, và không cắm đũa thẳng đứng vào bát cơm.',
      'Một bát súp miso hoặc canh rong biển và chút dưa muối làm bữa ăn trọn vẹn. Uống trà xanh nóng hay trà lúa mạch lạnh. Nếu mang đi làm, để sốt riêng và rưới khi ăn để cơm không nhão. Sốt teriyaki có nước tương, chứa đậu nành và gluten.',
    ],
    facts: [
      '“Teri” trong tiếng Nhật là độ bóng, “yaki” là nướng: tên gọi tả lớp sốt óng trên miếng cá.',
      'Người Na Uy cố tình gọi cá hồi nuôi là “sāmon” để người Nhật không liên tưởng đến cá hồi nướng muối “sake”.',
      'Trước thập niên 1990, cá hồi gần như không xuất hiện trong sushi Nhật.',
    ],
    reference: {
      label: 'Teriyaki — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Teriyaki',
    },
  },

  'poke-ca-hoi': {
    homeland: 'Hawaii, Hoa Kỳ',
    era: 'Truyền thống bản địa · phổ biến từ thập niên 1970',
    tagline:
      'Từ những mẩu cá vụn trộn muối biển của ngư dân Hawaii đến bát poke sặc sỡ khắp thế giới, câu chuyện bắt đầu chỉ bằng một nhát dao.',
    origin: [
      'Trong tiếng Hawaii, “poke” nghĩa là cắt ngang thành miếng. Người Hawaii xưa ăn những phần cá vụn còn lại sau mẻ lưới, cắt khúc, trộn muối biển, rong biển “limu” và “ʻinamona”, hạt kukui rang giã với muối, đôi khi trộn cả chút máu ở mang cá. Đó là món ăn vặt của ngư dân, làm ngay trên bãi biển, không cần bếp lửa.',
      'Từ giữa thế kỷ XIX, lao động Nhật Bản, Trung Hoa và nhiều nơi khác đến làm việc trên các đồn điền mía Hawaii, mang theo nước tương, dầu mè và hành. Tàu buôn phương Tây thì mang đến cá hồi muối, thứ cá không sống ở vùng biển nhiệt đới này, sinh ra món “lomi salmon”. Poke dần có vị châu Á. Dạng poke hiện đại, với cá ngừ vây vàng “ahi” cắt khối trộn nước tương, phổ biến từ khoảng thập niên 1970; năm 1992, đầu bếp Sam Choy mở hẳn một lễ hội poke.',
      'Khoảng năm 2012, poke bắt đầu đổ bộ vào lục địa Mỹ; chỉ trong hai năm 2014–2016, số nhà hàng Hawaii trên ứng dụng Foursquare tăng từ 342 lên 700. Poke bowl thành món ăn nhanh lành mạnh: khách tự chọn nền, cá, sốt và topping. Cá hồi thành lựa chọn phổ biến bên cạnh cá ngừ. Phiên bản ở đây đặt cá hồi trên nền quinoa, cùng bơ, rong biển trộn, dưa leo, đậu Hà Lan, cà rốt và cà chua.',
    ],
    timeline: [
      {
        when: 'Thời cổ truyền',
        what: 'Người Hawaii bản địa ăn cá sống cắt khúc trộn muối biển, rong limu và ʻinamona.',
      },
      {
        when: 'Giữa thế kỷ XIX',
        what: 'Lao động châu Á đến Hawaii, mang nước tương, dầu mè và hành vào món poke.',
      },
      {
        when: 'Thập niên 1970',
        what: 'Poke cá ngừ ahi trộn nước tương thành món quen khắp quần đảo.',
      },
      {
        when: '1992',
        what: 'Đầu bếp Sam Choy tổ chức lễ hội poke, đưa món ăn vào nhà hàng sang.',
      },
      {
        when: 'Khoảng 2012 – 2016',
        what: 'Poke bowl bùng nổ ở lục địa Mỹ rồi lan ra thế giới, kể cả Việt Nam.',
      },
    ],
    meaning: [
      'Ở Hawaii, poke là món của biển và của cộng đồng. Nó có mặt trong tiệc luau, đám cưới, buổi tụ tập cuối tuần; người ta ghé quầy hải sản ở siêu thị, mua vài lạng poke đựng hộp rồi mang ra bãi biển. Với người bản địa, món ăn gắn với đại dương, nguồn sống của người dân đảo qua nhiều thế hệ.',
      'Khi thành “bowl” ở lục địa, poke vừa nổi tiếng vừa bị tranh cãi. Nhiều người Hawaii thấy món ăn của họ bị biến thành mốt, thậm chí bị đăng ký nhãn hiệu. Ở Việt Nam, bát poke rực rỡ là lựa chọn của người trẻ thích món tươi, nhanh và đẹp mắt, một cách nếm thử Hawaii giữa phố.',
    ],
    symbols: [
      {
        name: 'Cá hồi',
        meaning: 'Thịt béo mềm, lựa chọn hiện đại bên cạnh cá ngừ ahi truyền thống của Hawaii.',
      },
      {
        name: 'Hạt quinoa',
        meaning: 'Thay cơm trắng làm nền bát, dấu hiệu của trào lưu ăn lành mạnh toàn cầu.',
      },
      {
        name: 'Quả bơ',
        meaning: 'Béo mịn, xanh mát, nét đặc trưng của kiểu poke bowl California.',
      },
      {
        name: 'Rong biển trộn',
        meaning: 'Gợi lại rong limu trong món poke cổ truyền của người Hawaii.',
      },
      {
        name: 'Dưa leo, đậu Hà Lan, cà rốt và cà chua',
        meaning: 'Rau củ giòn ngọt, nhiều màu, cho bát poke tươi và đủ chất.',
      },
    ],
    tasting: [
      'Ở Hawaii, poke thường ăn không, kèm bia lạnh, hoặc đặt lên bát cơm nóng. Với poke bowl, trộn đều nền, cá và sốt rồi mới ăn, mỗi thìa có đủ cá, hạt và rau. Nhiều quán cho chọn sốt mè, sốt cay hay ponzu, cứ nếm thử để tìm vị hợp mình.',
      'Ăn ngay sau khi trộn, để cá còn mát và rau chưa héo. Uống kèm trà xanh, nước dừa hay nước ép. Cá hồi ăn sống phải mua từ nguồn đạt chuẩn; phụ nữ mang thai và người có sức đề kháng yếu nên cân nhắc.',
    ],
    facts: [
      'Cá hồi không sống ở vùng biển Hawaii; món “lomi salmon” dùng cá hồi muối do tàu phương Tây mang đến.',
      '“ʻInamona” là hạt kukui rang giã với muối, gia vị chủ đạo của poke cổ truyền.',
      'Ở Hawaii, poke thường được bán theo cân ở quầy hải sản và siêu thị.',
    ],
    reference: {
      label: 'Poke (dish) — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Poke_%28dish%29',
    },
  },

  'spaghetti-hai-san': {
    homeland: 'Ven biển Campania và Sicily, Ý',
    era: 'Thế kỷ XIX – XX',
    tagline:
      'Mì “của ghềnh đá”: vẹm, tôm, mực vừa lên thuyền đã vào chảo với tỏi, dầu ô liu và cà chua ở các làng chài miền Nam nước Ý.',
    origin: [
      'Mì khô có mặt ở Sicily từ rất sớm: giữa thế kỷ XII, nhà địa lý al-Idrisi đã ghi rằng vùng Trabia làm “itriyya”, một loại mì sợi, để bán khắp nơi. Đến thế kỷ XVII, nghề làm mì lan sang Napoli. Người Napoli trước đó bị gọi đùa là “mangiafoglie”, kẻ ăn lá, vì ăn nhiều rau; khi mì rẻ và phổ biến, họ thành “mangiamaccheroni”, kẻ ăn mì. Chữ “spaghetti” là số nhiều giảm nhẹ của “spago”, sợi dây, tức là “những sợi dây nhỏ”.',
      'Cà chua đến từ châu Mỹ, nhưng phải đến thế kỷ XIX mì sốt cà chua mới thành món thường ngày; năm 1839, sách của Ippolito Cavalcanti ở Napoli đã có công thức vermicelli với cà chua. Dọc bờ biển Campania, Sicily, Puglia, ngư dân trộn mì với chính mẻ hải sản của mình. Món “spaghetti allo scoglio”, mì của ghềnh đá, dùng vẹm, nghêu, tôm, mực, những thứ sống quanh các mỏm đá ven bờ, xào nhanh với tỏi, dầu ô liu, vang trắng và cà chua, rồi đảo cùng mì còn hơi cứng.',
      'Trong thế kỷ XX, spaghetti hải sản thành món quen của nhà hàng Ý khắp thế giới. Ở Việt Nam, đất nước có đường bờ biển dài hơn ba nghìn cây số, món này được đón nhận dễ dàng. Phiên bản ở đây có tôm, vẹm xanh, mực, sốt cà chua, ngò tây và cả Parmesan bào, thứ phô mai mà người Ý thường không rắc lên hải sản, nhưng nhiều thực khách Việt lại thích.',
    ],
    timeline: [
      {
        when: 'Giữa thế kỷ XII',
        what: 'Al-Idrisi ghi lại nghề làm mì khô “itriyya” ở Trabia, Sicily.',
      },
      {
        when: 'Thế kỷ XVII',
        what: 'Nghề làm mì lan sang Napoli; người Napoli dần được gọi là “kẻ ăn mì”.',
      },
      {
        when: '1839',
        what: 'Sách nấu ăn của Ippolito Cavalcanti ở Napoli ghi công thức mì với cà chua.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Spaghetti allo scoglio thành món của các quán ven biển rồi đi khắp thế giới.',
      },
    ],
    meaning: [
      'Ở miền Nam nước Ý, spaghetti hải sản là bữa trưa mùa hè dưới mái hiên nhìn ra biển, hải sản sáng nay vẫn còn bơi. Món ăn thể hiện triết lý của bếp ven biển: nguyên liệu tươi thì không cần nhiều gia vị. Đêm Giáng sinh, nhiều gia đình miền Nam Ý ăn hải sản thay thịt, và một đĩa mì nghêu vẹm thường có mặt trên bàn.',
      'Người Việt vốn mê hải sản, nên spaghetti hải sản là cánh cửa dễ nhất để bước vào bếp Ý. Vị ngọt của tôm mực quyện trong sốt cà chua chua nhẹ gợi nhớ món mực xào cà chua, chỉ khác là sợi mì Ý và mùi tỏi, dầu ô liu của Địa Trung Hải.',
    ],
    symbols: [
      {
        name: 'Vẹm xanh',
        meaning:
          'Nhân vật chính của món “mì ghềnh đá”, mở vỏ trong chảo và nhả nước biển ngọt vào sốt.',
      },
      {
        name: 'Tôm và mực',
        meaning: 'Xào nhanh để giữ độ giòn ngọt, quen thuộc với cả bếp Ý lẫn bếp Việt.',
      },
      {
        name: 'Sốt cà chua',
        meaning: 'Nền chua ngọt nối mì với hải sản, di sản của bếp Napoli.',
      },
      {
        name: 'Ngò tây',
        meaning: 'Băm nhỏ rắc cuối cùng, gần như bắt buộc với hải sản kiểu Ý.',
      },
      {
        name: 'Phô mai Parmesan',
        meaning: 'Biến tấu hợp khẩu vị Việt, dù người Ý truyền thống tránh phô mai với hải sản.',
      },
    ],
    tasting: [
      'Ăn ngay khi vừa ra chảo, vì hải sản nguội rất nhanh mất ngọt. Dùng nĩa xoay mì, tách vỏ vẹm bằng tay hoặc nĩa, đặt sẵn một đĩa nhỏ đựng vỏ. Con vẹm nào không mở miệng sau khi nấu thì bỏ qua.',
      'Cuối bữa, người Ý xé một mẩu bánh mì vét sạch sốt, gọi là “fare la scarpetta”, làm chiếc giày nhỏ. Món hợp với vang trắng khô hoặc nước chanh có ga, thêm một đĩa salad rau trộn chanh. Món có hải sản có vỏ, gluten và sữa.',
    ],
    facts: [
      '“Spaghetti” nghĩa là “những sợi dây nhỏ”, từ chữ “spago” trong tiếng Ý.',
      '“Allo scoglio” nghĩa là “của ghềnh đá”, chỉ những loại hải sản sống quanh mỏm đá ven bờ.',
      'Người Napoli từng bị gọi là “kẻ ăn lá” trước khi thành “kẻ ăn mì”.',
    ],
    reference: {
      label: 'Spaghetti — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Spaghetti',
    },
  },

  'suon-nuong-bbq': {
    homeland: 'Miền Nam nước Mỹ',
    era: 'Thế kỷ XVI – XX',
    tagline:
      'Than nhỏ, khói gỗ và vài tiếng đồng hồ chờ đợi: sườn BBQ là món của người biết kiên nhẫn, ăn bằng tay và không ngại dính sốt.',
    origin: [
      'Chữ “barbecue” bắt nguồn từ “barbacoa”, tên người Tây Ban Nha gọi giàn gỗ nướng thịt của người Taíno ở vùng Caribe, được ghi lại từ đầu thế kỷ XVI. Kỹ thuật nướng chậm trên lửa nhỏ theo chân người châu Âu lên Bắc Mỹ. Ở miền Nam, nơi heo được thả rông khắp rừng, nướng nguyên con trên hố than trở thành dịp tụ họp của cả làng, cả nhà thờ, cả buổi vận động tranh cử.',
      'Người đứng bên hố than suốt đêm thường là người châu Phi bị bắt làm nô lệ, và chính họ giữ nghề nướng chậm qua nhiều thế hệ. Sau giải phóng, nhiều người mở quán riêng. Henry Perry, người từ vùng Memphis, bắt đầu bán thịt hun khói trong một con hẻm ở Kansas City năm 1908 và được coi là cha đẻ của BBQ Kansas City. Làn sóng Đại di cư đầu thế kỷ XX mang nghề này lên Chicago, Detroit và nhiều thành phố phương Bắc.',
      'Mỗi vùng giữ một kiểu: Kansas City sốt cà chua và mật mía đặc sánh, Memphis xoa gia vị khô, Carolina chuộng sốt giấm hoặc mù tạt, Texas nướng ức bò. Năm 1948, Charlie Vergos biến một ống thông gió cũ dưới tầng hầm thành lò than, khai sinh sườn “khô” nổi tiếng của quán Rendezvous ở Memphis. Đĩa sườn ở đây, bóng sốt ngọt khói, gần với kiểu Kansas City, ăn kèm khoai tây chiên, xà lách, cà chua và cà rốt.',
    ],
    timeline: [
      {
        when: 'Đầu thế kỷ XVI',
        what: 'Người Tây Ban Nha ghi lại giàn nướng barbacoa của người Taíno ở Caribe.',
      },
      {
        when: 'Thế kỷ XIX',
        what: 'Nướng heo nguyên con thành dịp tụ họp cộng đồng ở miền Nam nước Mỹ.',
      },
      {
        when: '1908',
        what: 'Henry Perry bán thịt nướng ở Kansas City, mở đầu truyền thống BBQ của thành phố.',
      },
      {
        when: '1948',
        what: 'Quán Rendezvous ở Memphis khai sinh kiểu sườn nướng xoa gia vị khô.',
      },
      {
        when: 'Thế kỷ XXI',
        what: 'Sườn BBQ kiểu Mỹ phổ biến ở nhà hàng và quán nướng tại Việt Nam.',
      },
    ],
    meaning: [
      'Ở Mỹ, barbecue là một nghi lễ xã hội. Ngày Quốc khánh, các buổi họp mặt nhà thờ, những cuộc thi nướng thịt như lễ hội Memphis in May đều xoay quanh khói và than. Người “pitmaster” giỏi được nể như nghệ nhân, và nghề canh lửa nhiều giờ được truyền từ cha sang con như một niềm tự hào, nhất là trong cộng đồng người Mỹ gốc Phi.',
      'Người Việt quen sườn nướng từ đĩa cơm tấm Sài Gòn: sườn cốt lết mỏng, ướp mật ong, nướng than nhanh. Sườn BBQ kiểu Mỹ thì ngược lại: cả tảng sườn to, nướng chậm hàng giờ, ăn bằng tay giữa đám bạn. Đó là món của những buổi tụ tập ồn ào, nơi chẳng ai ngại ngón tay dính đầy sốt.',
    ],
    symbols: [
      {
        name: 'Sườn heo nướng',
        meaning: 'Nướng chậm nhiều giờ cho mỡ tan và thịt mềm, cắn nhẹ là rời xương.',
      },
      {
        name: 'Sốt BBQ',
        meaning: 'Cà chua, mật mía, giấm và khói, đặc trưng của kiểu Kansas City.',
      },
      {
        name: 'Khoai tây chiên',
        meaning: 'Món kèm chắc bụng, đậm chất quán ăn Mỹ.',
      },
      {
        name: 'Xà lách, cà chua và cà rốt',
        meaning: 'Rau tươi giòn giúp bớt ngấy, làm việc của đĩa coleslaw trong quán BBQ Mỹ.',
      },
    ],
    tasting: [
      'Sườn BBQ ăn bằng tay: cầm hai đầu xương, cắn phần thịt ở giữa. Đừng ngại dính sốt, quán nào cũng chuẩn bị khăn ướt. Ở Mỹ, sườn thường bày nguyên tảng trên khay gỗ, mỗi người tự cắt theo khe xương rồi quết thêm sốt theo ý.',
      'Uống kèm bia lạnh, nước ngọt có ga hoặc trà đá. Quán BBQ miền Nam nước Mỹ thường ăn kèm bánh mì bắp, đậu hầm, xà lách bắp cải hay dưa chua. Thịt heo phải nướng chín kỹ; sốt BBQ khá ngọt và có thể chứa mù tạt.',
    ],
    facts: [
      'Chữ “barbecue” bắt nguồn từ ngôn ngữ của người Taíno ở vùng Caribe.',
      'Henry Perry, cha đẻ của BBQ Kansas City, bắt đầu bán thịt nướng trong một con hẻm năm 1908.',
      'Ở các cuộc thi BBQ Mỹ, sườn “rời xương” lại thường bị chấm là nướng quá tay; thịt chuẩn phải cần một cú giật nhẹ mới rời xương.',
    ],
    reference: {
      label: 'Barbecue in the United States — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Barbecue_in_the_United_States',
    },
  },

  'mi-lau-nam-chay': {
    homeland: 'Trung Hoa · Việt Nam',
    era: 'Lẩu cổ truyền · lẩu nấm chay từ thập niên 2010',
    tagline:
      'Nồi nước nấm sôi lục bục, nấm hương, kim châm, đậu hũ thả vào từng đợt, và gói mì cuối cùng để ai nấy đều no.',
    origin: [
      'Lẩu, tiếng Hán gọi là “hỏa oa”, nồi lửa, có lịch sử rất dài ở Trung Hoa. Thời Tống, Lâm Hồng chép trong “Sơn gia thanh cung” cách nhúng thịt thỏ thái mỏng vào nồi nước sôi đặt ngay trên bàn, ông gọi vui là “bát hà cung”. Theo thời gian, lẩu lan khắp Trung Hoa với đủ phong cách, từ lẩu cay Tứ Xuyên đến lẩu thanh Quảng Đông, rồi đến Việt Nam. Chữ “lẩu” thường được cho là đọc theo âm Quảng Đông của chữ 爐, cái lò.',
      'Người Việt nhanh chóng làm lẩu thành món của mình: lẩu mắm miền Tây, lẩu riêu cua, lẩu cá kèo, lẩu dê. Nồi lẩu chay thì có từ lâu trong bếp chùa và các quán chay, nước dùng ninh từ rau củ và nấm. Nấm hương được trồng ở Trung Hoa từ thời Tống, ghi chép sớm nhất năm 1209 ở huyện Long Tuyền. Phơi khô, nấm hương còn đậm vị ngọt hơn, đủ để nồi nước chay không cần xương thịt mà vẫn sâu vị.',
      'Những năm 2010, lẩu nấm thành trào lưu ở Hà Nội, Sài Gòn: nồi nước dùng ninh từ cả chục loại nấm, khách nhúng thêm nấm tươi, đậu hũ, rau. Thói quen thả gói mì vào nồi lẩu cuối bữa, rất Việt Nam, sinh ra món mì lẩu nấm chay gọn gàng cho một người. Nồi ở đây có mì, nấm hương, nấm kim châm, đậu hũ áp chảo, cải thìa, cà rốt, rau mùi và vài lát ớt đỏ.',
    ],
    timeline: [
      {
        when: 'Thời Tống',
        what: 'Lâm Hồng mô tả cách nhúng thịt vào nồi nước sôi trên bàn trong “Sơn gia thanh cung”.',
      },
      {
        when: '1209',
        what: 'Ghi chép sớm nhất về việc trồng nấm hương ở huyện Long Tuyền, Trung Hoa.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Lẩu thành món tụ họp của người Việt với hàng chục biến tấu theo vùng miền.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Lẩu nấm và mì lẩu chay thành trào lưu ăn uống lành mạnh ở các đô thị Việt Nam.',
      },
    ],
    meaning: [
      'Lẩu là món của sự quây quần: mọi người ngồi quanh một nồi nước sôi, cùng nhúng, cùng gắp, cùng chờ. Người Việt gắn lẩu với tối cuối tuần, ngày mưa rét, đêm giao thừa hay buổi họp lớp. Nhiều khi cái ấm áp quanh nồi lẩu còn đáng nhớ hơn món ăn.',
      'Mì lẩu nấm chay thêm vào đó sự thanh đạm của nhà Phật. Món ăn hợp ngày rằm, mùng một, hợp với người muốn bớt thịt mà vẫn thèm một bữa nóng hổi, đậm đà. Nồi nước nấm ngọt thanh cho thấy món chay không nhất thiết phải nhạt.',
    ],
    symbols: [
      {
        name: 'Nấm hương',
        meaning:
          'Cho nước dùng vị ngọt sâu, thứ thay xương hầm quan trọng nhất của bếp chay Á Đông.',
      },
      {
        name: 'Nấm kim châm',
        meaning: 'Chùm sợi nấm dai giòn, thấm nước dùng, món nhúng được tranh nhau trong nồi lẩu.',
      },
      {
        name: 'Đậu hũ',
        meaning: 'Áp chảo vàng cạnh rồi thả vào nồi, mềm béo và hút trọn vị ngọt của nấm.',
      },
      {
        name: 'Mì ăn liền',
        meaning: 'Thả vào sau cùng cho bữa lẩu no bụng, thói quen rất riêng của người Việt.',
      },
      {
        name: 'Cải thìa, cà rốt, rau mùi và ớt',
        meaning: 'Rau xanh cho ngọt mát, cà rốt cho màu, rau mùi cho thơm, ớt cho ai thích cay.',
      },
    ],
    tasting: [
      'Nếm một thìa nước dùng trước, rồi nhúng nấm và đậu hũ, sau đó mới đến rau. Nấm kim châm phải nấu chín kỹ, không ăn tái. Mì thả sau cùng, khi nước đã ngọt nhất, và vớt ra ngay khi vừa mềm để sợi không nở bết.',
      'Chấm nấm với nước tương ớt hoặc chao. Trà nóng hay nước sâm mát đều hợp. Người giữ chay nghiêm nên xem kỹ gói gia vị mì, vì nhiều loại có chiết xuất thịt, hành hoặc tỏi.',
    ],
    facts: [
      'Nấm kim châm mọc tự nhiên có màu nâu vàng; loại trắng muốt ở chợ được trồng trong tối.',
      'Nấm hương phơi khô thường cho vị ngọt đậm hơn nấm tươi.',
      'Năm 2020, Mỹ thu hồi nhiều lô nấm kim châm nhiễm khuẩn Listeria, nên loại nấm này luôn cần nấu chín.',
    ],
    reference: {
      label: 'Hot pot — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Hot_pot',
    },
  },
};
