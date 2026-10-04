import type { DishStory } from './types';

export const STORIES_NORTH_CENTRAL: Readonly<Record<string, DishStory>> = {
  'pho-bo': {
    homeland: 'Hà Nội · Nam Định',
    era: 'Đầu thế kỷ XX',
    tagline:
      'Sáng Hà Nội bắt đầu từ một nồi xương ninh suốt đêm: nước trong, thịt tái hồng dần trong bát, hương hồi quế len ra tận ngõ.',
    origin: [
      'Phở thành hình ở đồng bằng Bắc Bộ trong khoảng đầu thế kỷ XX, và cho đến nay vẫn chưa ai chốt được nó ra đời ở đâu trước. Nam Định có làng Vân Cù, nơi các dòng họ Cồ, Vũ làm phở từ đầu thế kỷ trước rồi gánh lên Hà Nội, ra Hải Phòng kiếm sống; làng nay thuộc xã Nam Đồng, tỉnh Ninh Bình sau đợt sáp nhập năm 2025. Hà Nội thì là nơi gánh phở thành hàng, thành hiệu, và cũng là nơi chữ “phở” sớm đi vào sách báo.',
      'Gốc gác của cái tên và công thức có ít nhất ba giả thuyết. Một thuyết cho rằng phở mọc ra từ món xáo trâu ăn với bánh bún của người Bắc, khi thịt trâu dần được thay bằng thịt bò. Thuyết khác nối chữ “phở” với chữ “phấn” trong ngưu nhục phấn, món bò nấu bánh gạo của người Quảng Đông ở Hà Nội. Thuyết thứ ba nhắc đến pot-au-feu của người Pháp, cùng chuyện lò mổ thời thuộc địa bán rẻ xương bò. Ba dòng ấy có thể cùng góp vào một nồi, còn cách nêm thì đã là của người Việt.',
      'Từ chiếc gánh một đầu nồi nước dùng đỏ lửa, một đầu bánh phở và thịt, phở vào cửa hiệu trong thập niên 1930 và chữ “phở” có mặt trong Việt Nam tự điển của Hội Khai Trí Tiến Đức. Hà Nội giữ lối ăn kiệm: bánh, thịt, hành, rau mùi, không đĩa rau sống. Sau năm 1954, phở theo người Bắc di cư vào Sài Gòn, nước ngọt hơn, kèm giá, húng quế, ngò gai, tương đen. Phở Nam Định thường được tả là đậm vị nước mắm hơn phở Hà Nội. Bát tái chín là kiểu gọi kinh điển của phố cổ.',
    ],
    timeline: [
      {
        when: 'Đầu thế kỷ XX',
        what: 'Gánh phở xuất hiện ở Nam Định và Hà Nội; người làng Vân Cù đem nghề đi khắp các đô thị miền Bắc.',
      },
      {
        when: 'Sau năm 1954',
        what: 'Người Bắc di cư mang phở vào Sài Gòn, nơi bát phở có thêm rau thơm, giá và tương đen.',
      },
      {
        when: 'Thời bao cấp',
        what: 'Cửa hàng phở mậu dịch bán theo tem phiếu; bát chỉ có bánh và nước được gọi đùa là “phở không người lái”.',
      },
      {
        when: '12/12/2017',
        what: 'Ngày của Phở lần đầu được tổ chức theo sáng kiến của báo Tuổi Trẻ.',
      },
      {
        when: 'Tháng 8/2024',
        what: 'Bộ Văn hóa, Thể thao và Du lịch đưa phở Hà Nội và phở Nam Định vào danh mục di sản văn hóa phi vật thể quốc gia.',
      },
    ],
    meaning: [
      'Người Hà Nội ăn phở như giữ một thói quen của phố. Ai cũng có một hàng quen, một cách gọi riêng: tái lăn, chín nạm, nhiều hành, thêm nước béo. Tranh luận nồi nào trong hơn, quán nào nêm khéo hơn có thể kéo dài cả buổi trà. Thạch Lam trong “Hà Nội băm sáu phố phường” gọi phở là “thứ quà đặc biệt của Hà Nội”, Nguyễn Tuân viết hẳn một tùy bút, Vũ Bằng dành cho phở những trang văn thèm thuồng trong “Miếng ngon Hà Nội”. Ít món ăn đường phố nào được văn chương chiều chuộng đến vậy.',
      'Bát phở cũng đi qua đủ thăng trầm của thế kỷ XX: thời thuộc địa, chiến tranh, những năm xếp hàng cầm phiếu, rồi theo thuyền nhân và du học sinh ra khắp thế giới. Ở Paris, Houston hay Melbourne, quán phở thường là nơi người Việt xa nhà tìm về đầu tiên. Cái khó của phở nằm ở chỗ nó trông quá giản dị. Chỉ bánh, thịt và nước, nhưng nồi nước phải canh lửa nhiều giờ, hớt bọt không sót, thế nên người ta nói nhìn bát phở là biết tay người nấu.',
    ],
    symbols: [
      {
        name: 'Nước dùng bò',
        meaning:
          'Xương ống ninh nhiều giờ với gừng và hành nướng, thêm quế, hồi, thảo quả. Nước trong mà vẫn ngọt sâu là thước đo tay nghề.',
      },
      {
        name: 'Thịt bò tái chín',
        meaning:
          'Tái thái mỏng, chín dần khi gặp nước sôi; chín là nạm, gầu hay bắp đã ninh mềm. Hai độ chín trong một bát cho hai cảm giác nhai khác hẳn.',
      },
      {
        name: 'Bánh phở',
        meaning:
          'Bột gạo tráng mỏng rồi thái sợi, phải là bánh tươi trong ngày mới mềm, mượt và không chua.',
      },
      {
        name: 'Hành tây, hành lá',
        meaning:
          'Hành tây thái mỏng giòn ngọt, hành lá thái nhỏ dậy mùi khi gặp nước nóng. Dân sành còn gọi riêng một bát hành trần.',
      },
      {
        name: 'Rau mùi, ớt',
        meaning:
          'Vài cọng mùi tạo hương, lát ớt tươi để ai thích cay tự thêm. Người Hà Nội nếm nước trước, rồi mới động đến gia vị.',
      },
    ],
    tasting: [
      'Ăn phở Hà Nội thì ăn sớm, lúc nồi nước vừa tới và quán còn mù hơi nóng. Húp một thìa nước nguyên bản trước, sau đó mới vắt chút chanh, thêm vài lát ớt hay giấm tỏi. Quẩy giòn xé nhỏ thả vào bát là kiểu ăn quen của dân phố cổ. Thịt tái chỉ chần chín tới, ai có sức đề kháng yếu nên gọi chín.',
      'Đừng để bát nguội: bánh sẽ nở, thịt tái chín quá tay. Ở nhiều hàng Hà Nội không có rau sống trên bàn, và tương đen, tương ớt cho thẳng vào bát thường bị xem là làm đục nước. Vào Sài Gòn thì khác: một đĩa giá, húng quế, ngò gai bày sẵn, cứ thế mà ăn theo cách của người miền Nam.',
    ],
    facts: [
      'Ngày 12 tháng 12 được chọn làm “Ngày của Phở” từ năm 2017, theo sáng kiến của báo Tuổi Trẻ.',
      'Tùy bút “Phở” của Nguyễn Tuân in trên báo Văn tháng 5 năm 1957, nổi tiếng với cả đoạn bàn về miếng “xương xẩu”.',
      'Thời bao cấp, bát phở mậu dịch không có thịt bị gọi đùa là “phở không người lái”.',
    ],
    reference: {
      label: 'Phở — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Ph%E1%BB%9F',
    },
  },

  'pho-ga': {
    homeland: 'Hà Nội',
    era: 'Khoảng năm 1939',
    tagline:
      'Nước gà trong veo, da vàng óng và mấy sợi lá chanh thái chỉ: phở gà là giọng nhẹ nhất trong dàn đồng ca của phở Hà Nội.',
    origin: [
      'Phở gà ra đời sau phở bò, và lý do được nhắc nhiều nhất là chuyện hàng thịt. Theo nhiều tài liệu, vào cuối thập niên 1930, Hà Nội có quy định đóng cửa hàng bò hai ngày mỗi tuần, thường là thứ Hai và thứ Sáu. Những ngày không có bò, hàng phở đành nấu gà để giữ khách, và mốc khoảng năm 1939 thường được coi là lúc phở gà xuất hiện. Một giải pháp chữa cháy rốt cuộc lại thành một món có chỗ đứng riêng.',
      'Thuở đầu, dân sành phở bò bĩu môi gọi phở gà là thứ phở “ngoại đạo”. Nhưng con gà ta Bắc Bộ, nuôi thả, da vàng, thịt săn, cho nồi nước ngọt theo kiểu khác hẳn: thanh, nhẹ, không cần nhiều hồi quế. Vũ Bằng, trong “Miếng ngon Hà Nội”, dành riêng cho phở gà một bài bên cạnh phở bò, đủ thấy đến giữa thế kỷ XX nó đã được nhìn nhận như một thứ quà độc lập.',
      'Bát phở gà xé quen thuộc gồm bánh phở, thịt gà luộc xé hoặc thái miếng, hành và rau mùi, chan nước dùng ninh từ xương gà. Điểm Hà Nội nhất là nhúm lá chanh thái chỉ rắc lên trên. Về sau còn có phở gà trộn, chan nước sốt chua ngọt, rắc lạc rang và hành phi, được giới trẻ ưa. Còn chuẩn của người khó tính thì vẫn vậy: nước không váng mỡ, thịt gà không bở, bánh không chua.',
    ],
    timeline: [
      {
        when: 'Đầu thế kỷ XX',
        what: 'Phở bò định hình ở Nam Định và Hà Nội.',
      },
      {
        when: 'Khoảng năm 1939',
        what: 'Những ngày không được bán thịt bò khiến các hàng phở Hà Nội chuyển sang nấu gà.',
      },
      {
        when: 'Giữa thế kỷ XX',
        what: 'Phở gà có hàng chuyên ở phố cổ và được Vũ Bằng viết riêng thành một bài trong “Miếng ngon Hà Nội”.',
      },
      {
        when: 'Gần đây',
        what: 'Phở gà trộn và nhiều biến tấu mới làm phong phú thêm gia đình phở gà.',
      },
    ],
    meaning: [
      'Câu chuyện phở gà là câu chuyện xoay xở của người Hà Nội. Thiếu thịt bò, họ không bỏ gánh phở mà tìm một nguyên liệu khác, rồi mài giũa đến khi món tạm thời ấy có chuẩn mực riêng. Con gà vốn quen thuộc với làng Bắc Bộ: gà luộc đặt mâm cúng rằm, cúng giao thừa, nồi nước luộc gà nấu canh miến cho cả nhà. Đưa gà vào phở là đưa mùi bếp nhà ra hàng quán.',
      'Ngày nay phở gà thường là lựa chọn cho người vừa ốm dậy, người già, trẻ nhỏ, hay đơn giản là những sáng muốn ăn nhẹ. Nhiều nhà vẫn tự nấu phở gà sau ngày giỗ, tận dụng con gà cúng và nồi nước luộc còn ngọt. Vì vậy, nếu phở bò mang dáng dấp phố xá, thì phở gà gần với bàn ăn gia đình hơn: ít hơi khói, nhiều sự chăm chút.',
    ],
    symbols: [
      {
        name: 'Thịt gà ta',
        meaning:
          'Gà nuôi thả, da vàng, thịt chắc; luộc vừa tới rồi xé hay thái miếng. Thịt không bở là dấu hiệu của con gà tốt.',
      },
      {
        name: 'Nước dùng gà',
        meaning:
          'Ninh từ xương gà với gừng và hành nướng, gia vị dè dặt hơn phở bò để vị ngọt của gà nổi lên.',
      },
      {
        name: 'Lá chanh thái chỉ',
        meaning:
          'Chi tiết gần như bắt buộc của phở gà Hà Nội: mảnh như sợi chỉ, thơm mát, át mùi gà.',
      },
      {
        name: 'Bánh phở',
        meaning: 'Sợi bánh mềm, mỏng, thấm nước dùng thanh mà không bị lấn vị.',
      },
      {
        name: 'Hành, rau mùi, ớt',
        meaning: 'Hành lá, hành tây và rau mùi làm bát phở tươi; ớt để mỗi người tự chỉnh độ cay.',
      },
    ],
    tasting: [
      'Phở gà hợp với vài giọt chanh, ớt tươi hoặc chút tương ớt, nhưng người quen ăn chỉ cho rất ít để nước vẫn trong vị. Muốn bát đầy hơn thì gọi thêm lòng mề, trứng non, hay chọn phần đùi, lườn, da tùy thích. Quẩy chấm nước phở vẫn là bạn đồng hành quen.',
      'Trước khi ăn, khuấy nhẹ cho sợi lá chanh chìm xuống, hương sẽ tỏa đều cả bát. Phở gà ngon nhất buổi sáng, nhưng ở Hà Nội không thiếu hàng bán đến khuya vào mùa rét. Giá đỗ hay tương đen thì hiếm ai cho vào phở gà.',
    ],
    facts: [
      'Lý do phổ biến nhất được nhắc cho sự ra đời của phở gà là việc Hà Nội cấm bán thịt bò hai ngày mỗi tuần vào cuối thập niên 1930.',
      'Vũ Bằng viết riêng một bài về phở gà trong “Miếng ngon Hà Nội”, đặt ngay sau bài về phở bò.',
      'Trứng non, tức trứng chưa thành vỏ trong bụng gà mái, là phần ăn kèm được nhiều thực khách Hà Nội săn.',
    ],
    reference: {
      label: 'Phở — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Ph%E1%BB%9F',
    },
  },

  'bun-cha-ha-noi': {
    homeland: 'Hà Nội',
    era: 'Đầu thế kỷ XX',
    tagline:
      'Giờ trưa, khói than hoa trùm cả góc phố và tiếng quạt nan phành phạch: bún chả là bữa trưa đặc sệt chất Hà Nội.',
    origin: [
      'Bún chả không có ngày sinh, nhưng có dấu vết. Đến đầu thập niên 1940, khi Thạch Lam viết “Hà Nội băm sáu phố phường”, bún chả đã là thứ quà đủ quen để ông tả đến từng giọt mỡ rơi trên than. Những gánh bún chả thuở ấy gọn trong hai đầu đòn gánh: một bên lò than và vỉ chả, một bên thúng bún, vại nước chấm. Bún là thứ sẵn có của đồng bằng, thịt lợn nướng than là cách nấu dân dã, gặp nhau ở phố thành một bữa no.',
      'Theo thời gian, gánh rong lùi vào ngõ, lên vỉa hè, thành những quán nhỏ bày ghế nhựa thấp. Mỗi nhà một lối ướp, nhưng nền chung vẫn là nước mắm, hành khô, đường, tiêu, thêm chút nước hàng hay mật ong cho thịt lên màu cánh gián. Thịt được kẹp trong gắp tre hoặc vỉ sắt, người bán lật cả mẻ trên bếp than hoa, vừa nướng vừa quạt cho khói bay ra phố.',
      'Một suất chuẩn có hai loại chả: chả miếng từ ba chỉ hoặc nạc vai thái mỏng, và chả băm vo viên dẹt. Chả nướng xong được thả vào bát nước chấm ấm, pha loãng, có đu đủ xanh và cà rốt thái lát. Bát nước ấy để húp được, khác hẳn kiểu nước mắm chấm đậm của bún thịt nướng miền Nam. Ăn kèm là đĩa bún rối, rổ rau sống và thường thêm vài chiếc nem.',
    ],
    timeline: [
      { when: 'Đầu thế kỷ XX', what: 'Gánh bún chả rong xuất hiện trên phố Hà Nội.' },
      {
        when: 'Năm 1943',
        what: '“Hà Nội băm sáu phố phường” của Thạch Lam được in, với những dòng tả khói bún chả nổi tiếng.',
      },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Bún chả thành bữa trưa quen thuộc của dân công sở và học sinh Hà Nội.',
      },
      {
        when: '23/5/2016',
        what: 'Tổng thống Mỹ Barack Obama và Anthony Bourdain ăn bún chả ở quán Hương Liên, phố Lê Văn Hưu, cho chương trình “Parts Unknown”.',
      },
    ],
    meaning: [
      'Nếu phở giữ buổi sáng thì bún chả giữ buổi trưa của Hà Nội. Khoảng mười một giờ, khói than từ các quán bắt đầu lan ra, và người đi làm, học sinh, thợ thuyền chen nhau trên những chiếc ghế nhựa thấp. Ở đó chẳng ai phân biệt sang hèn: cùng một mẻ chả, cùng một bát nước, cùng chờ người bán gắp thêm. Người Hà Nội đi xa nhớ mùi khói ấy như nhớ một góc phố.',
      'Bữa bún chả cũng là một bài học cân bằng kiểu Bắc Bộ: thịt nướng béo đi cùng bún thanh, rau sống mát, đồ chua giòn và nước chấm chua ngọt vừa phải. Sau bữa trưa năm 2016, chiếc bàn Obama và Bourdain từng ngồi được quán Hương Liên lồng kính giữ lại, và suất bún chả kèm nem, chai bia Hà Nội được khách gọi là “combo Obama”. Một món ăn vỉa hè bỗng thành điểm hẹn của du khách quốc tế.',
    ],
    symbols: [
      {
        name: 'Chả viên và chả miếng',
        meaning:
          'Chả băm vo viên mềm, ngậm nước; chả miếng có mỡ cháy cạnh. Hai thứ chả trong một bát là dấu hiệu của bún chả Hà Nội.',
      },
      {
        name: 'Than hoa',
        meaning:
          'Than cho mùi khói mà bếp ga không thay được, cũng là lý do bún chả gắn với vỉa hè và chiếc quạt nan.',
      },
      {
        name: 'Nước chấm',
        meaning:
          'Nước mắm pha loãng với giấm, đường, tỏi, ớt, đủ nhẹ để húp như canh, giữ ấm cho chả.',
      },
      {
        name: 'Đồ chua',
        meaning:
          'Đu đủ xanh, cà rốt ngâm chua ngọt thả ngay trong bát nước, giòn miệng và cắt bớt độ béo.',
      },
      {
        name: 'Bún và rau sống',
        meaning:
          'Bún rối sợi nhỏ cùng xà lách, rau mùi, kinh giới, tía tô làm bữa ăn mát, đỡ ngấy.',
      },
    ],
    tasting: [
      'Gắp một nhúm bún, nhúng vào bát nước có chả, kèm vài lá rau, rồi ăn cùng miếng chả: thế là đúng nhịp. Tỏi băm và ớt tươi để sẵn, cho thêm vào bát tùy ý. Phần lớn quán bán kèm nem rán hoặc nem cua bể, gọi thêm một đĩa là bữa trọn vẹn.',
      'Ăn vào giờ trưa, khi chả vừa rời bếp còn xèo xèo mỡ. Đừng trút cả đĩa bún vào bát nước một lúc, bún sẽ nhạt và nát; cứ nhúng từng gắp. Một cốc trà đá vỉa hè sau bữa là cái kết rất Hà Nội.',
    ],
    facts: [
      'Bữa bún chả của Barack Obama và Anthony Bourdain ngày 23/5/2016 tốn chưa đến 10 đô la, Bourdain là người trả tiền.',
      'Quán Hương Liên giữ nguyên bộ bàn ghế hai người từng ngồi trong một tủ kính.',
      'Nước chấm bún chả Hà Nội pha loãng để húp được, khác với nước mắm chấm đậm của bún thịt nướng miền Nam.',
    ],
    saying: {
      text: 'Khói lam cuộn như sương mờ ở sườn núi, giọt mỡ chả xèo trên than hồng như một tiếng thở dài.',
      by: 'Thạch Lam, “Hà Nội băm sáu phố phường”',
    },
    reference: {
      label: 'Bún chả — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_ch%E1%BA%A3',
    },
  },

  'com-rang-dua-bo': {
    homeland: 'Hà Nội',
    era: 'Cuối thế kỷ XX',
    tagline:
      'Chảo gang đỏ lửa, cơm nguội tơi từng hạt, dưa cải chua giòn và thịt bò chín tới: cơm rang dưa bò là món của Hà Nội về đêm.',
    origin: [
      'Rang lại cơm nguội là việc bếp Việt làm từ lâu, đơn giản vì không ai nỡ đổ đi một hạt cơm. Kỹ thuật đảo cơm trong chảo lửa thật lớn cho từng hạt săn, tơi thường được cho là học từ các quán ăn người Hoa. Ở Hà Nội, cái chảo ấy gặp một thứ rất Bắc: vại dưa cải muối chua. Cơm rang dưa bò thành hình từ cuộc gặp gỡ đó, chua nhẹ, mặn mòi, ăn một miếng muốn thêm miếng nữa.',
      'Món này nở rộ trong những thập niên cuối thế kỷ XX, cùng với các quán cơm rang, phở xào, mì xào bán đến khuya. Người đầu bếp đứng trước chảo gang rực lửa, tay đảo không nghỉ, tiếng xẻng va chảo vang cả dãy phố. Cơm phải là cơm nguội, khô hạt; cơm mới nấu cho vào chảo sẽ dính thành tảng. Trứng thường được đảo cùng cho hạt cơm vàng đều.',
      'Dưa cải bẹ muối vàng được thái khúc, vắt kiệt nước, xào riêng cho dậy mùi rồi mới trộn vào. Thịt bò thái mỏng, ướp tỏi, tiêu, xào thật nhanh trên lửa lớn để giữ độ mềm. Mỗi quán một tỉ lệ: có nơi nhiều dưa cho chua, có nơi nhiều bò cho đậm. Bày ra đĩa, rắc hành lá, vài lát ớt đỏ, thêm dưa chuột thái và một bát nước dùng là đủ bữa.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Cơm nguội rang mỡ hành là món tiết kiệm trong nhiều gia đình Việt.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Lối xào lửa lớn trong chảo gang phổ biến ở các quán ăn đô thị, nhiều người cho là từ bếp người Hoa.',
      },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Quán cơm rang, phở xào ở Hà Nội đưa cơm rang dưa bò thành món quen.',
      },
      {
        when: 'Gần đây',
        what: 'Món ăn có mặt trong hộp cơm văn phòng và trên các ứng dụng giao đồ ăn.',
      },
    ],
    meaning: [
      'Đĩa cơm rang dưa bò kể chuyện tằn tiện một cách khéo léo: không bỏ hạt cơm nguội, không phí vại dưa trong nhà. Dưa cải muối là món dân dã của mọi gia đình Bắc Bộ, gắn với mùa đông, khi bẹ cải được muối trong vại sành để ăn dần. Đặt dưa bên cạnh thịt bò, thứ từng là món đắt, người Hà Nội biến bữa cơm tận dụng thành một đĩa ăn ra món.',
      'Đây còn là món của những giờ muộn. Sinh viên ôn thi, người làm ca đêm, nhóm bạn tan cuộc hẹn đều có thể tạt vào quán cơm rang ven đường. Tiếng xèo xèo, mùi dưa xào quyện mùi khói chảo, chiếc ghế thấp kê sát nhau, bát nước dùng nóng gọi thêm: đó là không khí bình dân mà ấm, một mặt rất khác của Hà Nội lúc đèn đường đã vàng.',
    ],
    symbols: [
      {
        name: 'Dưa cải chua',
        meaning:
          'Cải bẹ muối chua, xào riêng cho thơm. Vị chua của dưa cắt độ ngấy của dầu mỡ và làm thịt bò đậm hơn.',
      },
      {
        name: 'Thịt bò',
        meaning: 'Thái mỏng, xào nhanh lửa lớn, chín tới để còn mềm và ngọt.',
      },
      {
        name: 'Cơm nguội',
        meaning: 'Hạt cơm khô ráo sau vài giờ hoặc qua đêm mới rang được săn, tơi, không dính.',
      },
      {
        name: 'Trứng gà',
        meaning: 'Đánh tan rồi đảo cùng cơm, bọc lấy từng hạt cho màu vàng và vị béo.',
      },
      {
        name: 'Hành lá, ớt',
        meaning: 'Hành lá rắc lúc cuối cho thơm, ớt tươi để thêm cay tùy khẩu vị.',
      },
    ],
    tasting: [
      'Người Hà Nội ăn cơm rang dưa bò với vài lát dưa chuột và một bát canh nóng, thường là nước dùng bò hoặc canh cải. Ai thích có thể chấm thêm tương ớt, hay rưới chút xì dầu ngâm ớt.',
      'Ăn ngay khi đĩa cơm còn bốc khói, vì để nguội hạt cơm sẽ cứng lại và dưa mất mùi thơm. Món này hợp nhất vào bữa tối hay bữa khuya trời se lạnh, kèm một cốc trà đá hoặc trà nóng.',
    ],
    facts: [
      'Cơm để rang ngon nhất là cơm đã để nguội vài giờ hoặc qua đêm, vì hạt khô hơn và không dính chảo.',
      'Dưa cải thường được vắt kiệt nước và xào riêng trước, để không làm ướt cơm.',
      'Ở Hà Nội, cơm rang dưa bò thường bán chung với phở xào, mì xào trong cùng một quán có chảo lửa lớn.',
    ],
    reference: {
      label: 'Cơm rang — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/C%C6%A1m_rang',
    },
  },

  'banh-cuon-cha-lua': {
    homeland: 'Hà Nội · Thanh Trì',
    era: 'Từ lâu đời, phổ biến đầu thế kỷ XX',
    tagline:
      'Lá bánh mỏng như lụa vừa bóc khỏi nồi hơi, vài lát chả thơm lá chuối và bát nước chấm ấm: một bữa sáng rất nhẹ tay của người Bắc.',
    origin: [
      'Bánh cuốn sinh ra từ nghề xay gạo của các làng đồng bằng Bắc Bộ. Gạo ngâm, xay thành bột nước, tráng một lớp mỏng trên tấm vải căng miệng nồi nước sôi, đậy vung chừng vài giây rồi dùng que tre lừa lá bánh ra. Động tác nghe đơn giản nhưng phải luyện lâu: lá bánh phải mỏng, dẻo mà không rách. Không ai biết bánh cuốn có từ bao giờ, chỉ biết nó là món quà của nhiều làng từ rất xa xưa.',
      'Nổi tiếng nhất là bánh cuốn làng Thanh Trì, ven sông Hồng phía nam nội thành Hà Nội. Bánh Thanh Trì không có nhân, mỏng đến mức nhìn thấu, rắc hành phi, ăn với chả. Trong phố thì quen bánh cuốn nóng nhân thịt mộc nhĩ, tráng tại chỗ. Lên Cao Bằng, Lạng Sơn, bánh cuốn lại được ăn với bát nước dùng xương nóng, có khi đập thêm quả trứng vào lá bánh. Một thứ bột gạo, mỗi vùng một cách ăn.',
      'Chả lụa, người Bắc gọi là giò lụa, là thịt lợn nạc giã nhuyễn với nước mắm, gói lá chuối rồi luộc chín. Làng Ước Lễ ở Thanh Oai nổi tiếng với nghề giò chả lâu đời. Giò lụa vốn là món của mâm cỗ Tết, và khi được thái từng khoanh đặt cạnh đĩa bánh cuốn, nó biến bữa sáng thường ngày thành một bữa có chút đủ đầy. Bánh mềm mướt, chả dai giòn, bổ sung cho nhau rất khéo.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Kỹ thuật tráng bánh gạo trên nồi hơi hình thành ở các làng Bắc Bộ.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Phụ nữ làng Thanh Trì gánh bánh cuốn vào nội thành Hà Nội bán rong mỗi sáng.',
      },
      {
        when: 'Giữa thế kỷ XX',
        what: 'Hàng bánh cuốn nóng nhân thịt mộc nhĩ tráng tại chỗ trở nên quen thuộc ở phố cổ.',
      },
      {
        when: 'Ngày nay',
        what: 'Bánh cuốn có mặt khắp cả nước, với nhiều biến thể như bánh cuốn trứng Cao Bằng, Lạng Sơn.',
      },
    ],
    meaning: [
      'Bánh cuốn là món của đôi tay phụ nữ làng quê. Ngày trước, người bán bánh Thanh Trì dậy từ ba bốn giờ sáng để xay gạo, tráng bánh, rồi gánh bộ vào phố cho kịp buổi chợ. Từng lá bánh xếp lớp trong thúng là kết quả của nhiều năm luyện tay, và độ mỏng của nó đủ để người mua nhận ra bánh của làng nào. Một món nhìn đơn sơ nhưng chứa rất nhiều công phu.',
      'Với người Hà Nội, bánh cuốn là bữa sáng hợp với cả cụ già lẫn trẻ con: mềm, ấm, dễ ăn. Trong nhiều gia đình, buổi tráng bánh cuốn tại nhà là dịp cả nhà quây quanh nồi hơi, người tráng, người cuộn, ăn nóng ngay tại bếp. Còn khoanh chả lụa đi kèm mang theo chút không khí ngày Tết, như một cách nâng niu bữa ăn thường nhật.',
    ],
    symbols: [
      {
        name: 'Lá bánh cuốn',
        meaning:
          'Bột gạo tráng mỏng trên nồi hơi, dẻo và trong. Lá bánh càng mỏng càng chứng tỏ tay nghề người tráng.',
      },
      {
        name: 'Chả lụa',
        meaning:
          'Giò lụa thơm mùi lá chuối, thái khoanh dày, vốn là món của mâm cỗ Tết, gợi ý đủ đầy.',
      },
      {
        name: 'Thịt lợn',
        meaning:
          'Thịt băm xào với mộc nhĩ, hành khô làm nhân, hoặc thịt luộc thái mỏng bày kèm cho bữa thêm chắc dạ.',
      },
      {
        name: 'Hành phi',
        meaning: 'Hành khô phi vàng rắc lên lá bánh, mùi thơm bùi là dấu hiệu của bánh Thanh Trì.',
      },
      {
        name: 'Giá đỗ, rau mùi',
        meaning: 'Giá chần và rau mùi làm bữa ăn mát, cân với chả và thịt.',
      },
    ],
    tasting: [
      'Bánh cuốn chấm nước mắm pha loãng, hơi ấm, chua ngọt nhẹ; nhiều hàng thả sẵn vài lát chả vào bát nước. Người Hà Nội xưa còn nhỏ một giọt tinh dầu cà cuống vào nước chấm, thứ hương nay đã hiếm. Ớt tươi, tỏi, chanh để bên cạnh, thêm tùy ý.',
      'Ngon nhất là bánh vừa bóc khỏi nồi, còn hơi nóng, nên hàng nào tráng tại chỗ thường đông. Ăn nhanh khi bánh còn mềm, vì để lâu lá bánh sẽ se lại và dính vào nhau. Bánh cuốn hợp với bữa sáng hoặc bữa trưa nhẹ những ngày trời mát.',
    ],
    facts: [
      'Bánh cuốn Thanh Trì truyền thống không có nhân, chỉ rắc hành phi và ăn kèm chả.',
      'Ở Cao Bằng và Lạng Sơn, bánh cuốn được ăn với bát nước dùng xương nóng thay vì nước mắm chấm.',
      'Tinh dầu cà cuống từng là gia vị quý của nước chấm bánh cuốn Hà Nội, một giọt nhỏ đã thơm cả bát.',
    ],
    reference: {
      label: 'Bánh cuốn — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_cu%E1%BB%91n',
    },
  },

  'banh-da-cua': {
    homeland: 'Hải Phòng',
    era: 'Thế kỷ XX',
    tagline:
      'Sợi bánh đa nâu đỏ bản to, riêu cua đồng nổi từng mảng vàng và rổ rau muống xanh: hương vị mà dân đất Cảng nhớ đầu tiên khi xa nhà.',
    origin: [
      'Hải Phòng là thành phố cảng, nhưng món ăn tiêu biểu nhất của nó lại đến từ ruộng lúa. Cua đồng bắt ngoài ruộng được giã nhuyễn, lọc lấy nước, đun lửa vừa cho thịt và gạch cua đóng thành mảng nổi lên, gọi là riêu. Sợi bánh đa đỏ thì làm từ bột gạo, tráng, phơi trên giàn tre rồi thái bản to. Hai thứ dân dã ấy gặp nhau trong một bát, thành món mà người Hải Phòng nhận là của riêng mình.',
      'Màu nâu đỏ của bánh đa đến từ đường mía nấu thành nước màu rồi trộn vào bột, chứ không phải từ gạo. Phường Dư Hàng Kênh là nơi làm bánh đa đỏ có tiếng, nghề ở đây đã gần trăm năm; thập niên 1980, 1990 cả phường từng có cả trăm hộ tráng bánh, nay chỉ còn ít nhà giữ nghề. Sợi bánh đa dai, chắc, ngâm lâu trong nước nóng mà vẫn không nát, khác hẳn bún hay bánh phở.',
      'Một bát bánh đa cua Hải Phòng đầy ắp: riêu cua, chả cua hoặc chả lá lốt, đậu phụ rán, rau muống hay rau rút chần, vài lát cà chua, có quán thêm giò tai, tóp mỡ. Nước dùng ninh từ xương, thêm tôm khô cho ngọt. Mỗi quán có thêm chút riêng, có nơi thả mộc nhĩ thái sợi cho giòn, rắc hành phi cho thơm, nhưng vị ngọt mát của cua đồng thì nơi nào cũng phải giữ.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Cua đồng là nguồn đạm quen thuộc của nông dân đồng bằng ven biển Bắc Bộ.',
      },
      {
        when: 'Khoảng thập niên 1920–1930',
        what: 'Nghề làm bánh đa đỏ ở Dư Hàng Kênh hình thành, theo lời kể của địa phương.',
      },
      {
        when: 'Thập niên 1980–1990',
        what: 'Dư Hàng Kênh có khoảng một trăm hộ tráng và phơi bánh đa đỏ.',
      },
      {
        when: 'Ngày nay',
        what: 'Bánh đa đỏ được đóng gói bán khắp cả nước; bánh đa cua là món đầu tiên du khách tìm khi đến Hải Phòng.',
      },
    ],
    meaning: [
      'Người Hải Phòng hay nói: về nhà là phải làm bát bánh đa cua đã. Món ăn ấy mang theo hình ảnh cánh đồng, con cua, sợi bánh phơi trên giàn tre, tức là một Hải Phòng rất nông thôn nằm ngay sau lưng cảng biển và nhà máy. Với người xa quê, nó là mùi bếp mẹ, là bữa sáng trước giờ đi học, là quán quen đầu ngõ đã bán qua mấy chục năm.',
      'Bát bánh đa cua cũng mang chút tính khí đất Cảng: thẳng, mộc, không màu mè, nhưng đầy đặn. Bát không cần bày đẹp, chỉ cần nhiều riêu, nhiều rau, nước nóng bỏng. Từ hàng vỉa hè đến cửa hàng lâu năm, quán bánh đa cua mở từ sáng sớm đến tối, và ai cũng có một quán để bênh vực khi tranh luận với bạn bè.',
    ],
    symbols: [
      {
        name: 'Bánh đa đỏ',
        meaning:
          'Sợi bánh bản rộng, dai, màu nâu đỏ nhờ đường mía nấu trộn vào bột gạo. Nhìn sợi bánh là biết món của Hải Phòng.',
      },
      {
        name: 'Riêu cua đồng',
        meaning:
          'Thịt và gạch cua đóng thành mảng nổi trên mặt nồi, cho vị ngọt thanh và mùi thơm đồng ruộng.',
      },
      {
        name: 'Chả cua, đậu phụ rán',
        meaning: 'Chả cua thơm, đậu rán vàng ngậm nước dùng, làm bát bánh đa chắc dạ hơn.',
      },
      {
        name: 'Rau muống, cà chua',
        meaning: 'Rau chần giòn xanh và cà chua chua nhẹ cân lại vị béo của gạch cua.',
      },
      {
        name: 'Mộc nhĩ, hành phi',
        meaning: 'Mộc nhĩ thái sợi giòn sần sật, hành phi thơm, những nét thêm tùy quán.',
      },
    ],
    tasting: [
      'Trước khi ăn, khuấy nhẹ để gạch cua tan vào nước dùng. Người Hải Phòng thêm chanh, ớt tươi, tương ớt, có người cho thêm chút mắm tôm cho đậm. Ăn lúc nóng, khi rau vừa chần còn giòn. Ai dị ứng giáp xác nên tránh món này.',
      'Bánh đa cua là món sáng, nhưng ở Hải Phòng quán mở cả ngày, trưa hay tối đều có người ngồi. Gọi thêm chả lá lốt nếu quán có, và kết thúc bằng một cốc trà đá: bữa ăn giản dị đúng kiểu đất Cảng.',
    ],
    facts: [
      'Màu nâu đỏ của bánh đa Hải Phòng có được nhờ đường mía nấu thành nước màu trộn vào bột gạo.',
      'Bánh đa đỏ Dư Hàng Kênh được người làm nghề khẳng định không dùng phụ gia; nghề ở đây có gần một trăm năm.',
      'Rau rút, một loại rau mọc dưới nước, cũng thường được dùng trong bánh đa cua bên cạnh rau muống.',
    ],
    reference: {
      label: 'Bánh đa cua — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_%C4%91a_cua',
    },
  },

  'bun-dau-mam-tom': {
    homeland: 'Hà Nội · Bắc Bộ',
    era: 'Thế kỷ XX',
    tagline:
      'Mẹt tre lót lá chuối, bún lá cắt miếng, đậu rán vàng giòn và bát mắm tôm đánh sủi bọt: một bữa quê bày ngay giữa phố.',
    origin: [
      'Bún đậu mắm tôm ghép từ ba thứ có sẵn trong mọi làng Bắc Bộ: bún gạo, đậu phụ và mắm tôm. Thuở đầu đây chỉ là món quà vặt rẻ tiền do các bà, các chị gánh đi bán trong phố, một mẹt bún, rổ đậu, lọ mắm. Không ai ghi lại năm món ăn xuất hiện, nhưng nó gắn với phố phường Hà Nội từ nhiều chục năm trước và chưa bao giờ rời khỏi vỉa hè.',
      'Đậu phải là đậu mềm, béo, rán lên vỏ giòn mà ruột vẫn trắng mịn. Làng Mơ, nay ở phía nam Hà Nội, nổi tiếng với nghề làm đậu, nên “đậu Mơ” thành cách gọi đậu ngon. Bún dùng ở đây là bún lá, ép thành tấm rồi cắt miếng vuông nhỏ, tiện gắp tiện chấm. Mắm tôm làm từ con moi, ruốc ủ muối lên men, mùi nồng đến mức người lạ thường lùi lại một bước.',
      'Từ món quà vặt, mẹt bún đậu dày dần thành bữa no: thịt chân giò luộc, chả cốm rán, nem chua rán, dồi, lòng. Chả cốm là thứ đậm chất Hà Nội nhất, thịt lợn giã quyện với cốm non mùa thu. Ngày nay hầu hết quán bày cả mẹt trên lá chuối, thêm dưa chuột, rau kinh giới, tía tô, và luôn hỏi khách một câu quen thuộc: ăn mắm tôm hay nước mắm?',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Đậu phụ, bún và mắm tôm là thực phẩm thường ngày của làng quê Bắc Bộ.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Gánh bún đậu rong xuất hiện trên phố Hà Nội như một món quà vặt.',
      },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Mẹt bún đậu có thêm thịt luộc, chả cốm, nem chua rán, thành bữa ăn no.',
      },
      { when: 'Thế kỷ XXI', what: 'Quán bún đậu mở khắp cả nước và thành điểm đến của du khách.' },
    ],
    meaning: [
      'Bún đậu là món của sự quây quần. Cả nhóm ngồi quanh một mẹt chung, chấm vào cùng một bát mắm, chia nhau từng miếng đậu nóng vừa ra chảo. Buổi trưa của đồng nghiệp, buổi chiều của nhóm bạn, bữa ăn vội của gia đình, mẹt bún đậu đều vừa vặn. Cái mộc của nó khiến người ta cởi mở, ăn bốc, nói to, cười nhiều, như đang ngồi một bữa cơm quê.',
      'Còn mắm tôm thì gần như là phép thử. Người Bắc lớn lên với mùi mắm ấy trong bát canh cua, đĩa thịt luộc, bát bún riêu; người nơi khác thì lần đầu ngửi thường nhăn mặt. Thế nên khi một người bạn phương xa chịu chấm miếng đậu vào bát mắm tôm và gật đầu khen, người Hà Nội coi như đã kết nạp thêm một người hiểu mình.',
    ],
    symbols: [
      {
        name: 'Mắm tôm',
        meaning:
          'Moi, ruốc ủ muối lên men; khi ăn được đánh với quất hoặc chanh, đường, ớt đến lúc sủi bọt.',
      },
      {
        name: 'Đậu phụ rán',
        meaning:
          'Đậu mềm béo rán vàng giòn, nhân vật chính của mẹt. “Đậu Mơ” từng là chuẩn đậu ngon.',
      },
      {
        name: 'Chả cốm',
        meaning: 'Thịt lợn giã trộn cốm non rán vàng, mang hương lúa mới của mùa thu Hà Nội.',
      },
      {
        name: 'Bún lá, thịt luộc',
        meaning: 'Bún ép miếng vuông dễ gắp, thịt chân giò luộc thái mỏng có cả bì giòn.',
      },
      {
        name: 'Rau thơm, dưa chuột',
        meaning:
          'Kinh giới, tía tô và dưa chuột thái lát làm dịu vị nồng của mắm và độ béo của đậu.',
      },
    ],
    tasting: [
      'Mắm tôm cần được đánh kỹ với quất hoặc chanh, chút đường và ớt cho đến khi nổi bọt, có người nhỏ thêm vài giọt rượu trắng hay chút mỡ nóng. Ai chưa quen cứ gọi nước mắm chua ngọt, không ai trách. Người dị ứng tôm nên tránh mắm tôm.',
      'Ăn vào bữa trưa hay xế chiều, lúc đậu vừa rán còn kêu lách tách. Gắp một miếng bún, một miếng đậu, chấm mắm, thêm lá kinh giới và lát dưa chuột. Đi cùng là cốc trà đá, hoặc vào mùa hè thì cốc nước sấu ngâm.',
    ],
    facts: [
      'Bún lá được ép thành tấm phẳng rồi cắt vuông, khác với bún rối dùng trong bún chả.',
      'Làng Mơ ở phía nam Hà Nội nổi tiếng với nghề làm đậu, nên “đậu Mơ” từng là danh hiệu của đậu ngon.',
      'Hầu hết quán bún đậu hỏi khách chọn mắm tôm hay nước mắm, để chiều cả người chưa quen mùi mắm.',
    ],
    reference: {
      label: 'Bún đậu mắm tôm — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_%C4%91%E1%BA%ADu_m%E1%BA%AFm_t%C3%B4m',
    },
  },

  'bun-ca-ha-noi': {
    homeland: 'Hà Nội',
    era: 'Thế kỷ XX',
    tagline:
      'Miếng cá rán còn giòn cạnh nằm giữa nước dùng chua nhẹ, cà chua đỏ và một nhúm thì là xanh: bún cá mang mùi sông hồ vào phố.',
    origin: [
      'Hà Nội là đất của sông, hồ, đầm, ao, và cá nước ngọt luôn có mặt trong bữa ăn của người kinh kỳ. Cá kho, canh chua, chả cá đều quen, và cặp đôi cá với thì là thì đã thành dấu ấn từ món chả cá Lã Vọng nổi tiếng. Bún cá đi theo lối ấy nhưng bình dân hơn nhiều: một bát bún nóng cho bữa sáng, bữa trưa ở những quán nhỏ trong ngõ.',
      'Người ta không ghi lại thời điểm bún cá xuất hiện. Nhiều khả năng nó lớn lên dần từ bát canh cá nấu chua với cà chua, thì là, mẻ hoặc giấm bỗng trong bữa cơm người Bắc. Thêm bún vào, bát canh nhà thành món quà ngoài phố. Cá thường dùng là cá rô đồng, cá trắm hay cá quả, lọc lấy thịt, ướp nghệ, gừng rồi rán vàng để miếng cá chắc, không tanh và không vỡ khi gặp nước nóng.',
      'Nước dùng bún cá ninh từ xương cá và xương ống, nêm chua thanh. Thì là và hành lá thả vào bát ngay trước khi chan nước, nên hương còn nguyên. Hà Nội có những phố quen với bún cá rán, ăn kèm rau cần, xà lách, kinh giới. Xuống Hải Phòng thì gặp bún cá cay, nước đỏ ớt, cá thu hay cá rô; vào Nha Trang lại có bún cá sứa. Mỗi vùng giữ một kiểu cá của mình.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Canh cá nấu chua với thì là quen thuộc trong bữa cơm người Bắc.',
      },
      { when: 'Thế kỷ XX', what: 'Bún cá xuất hiện ở các quán ăn bình dân Hà Nội.' },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Bún cá rán thành món sáng quen thuộc, bên cạnh phở và bún riêu.',
      },
      {
        when: 'Ngày nay',
        what: 'Bún cá có nhiều biến thể, như bún cá cay Hải Phòng hay bún chả cá miền Trung.',
      },
    ],
    meaning: [
      'Bún cá là lựa chọn của những ngày muốn ăn nhẹ. Phở và bún bò đậm mùi thịt xương, còn bún cá chua thanh, thơm mát, rất hợp với mùa hè Hà Nội oi nồng. Người ta chọn bát bún cá khi đã ngán dầu mỡ, khi trời nóng không nuốt nổi món nặng, hay khi chỉ thèm mùi thì là quyện với cá rán.',
      'Món ăn cũng cho thấy người Bắc gắn bó với cá nước ngọt và rau thơm đến mức nào. Thì là vốn có gốc ở vùng Địa Trung Hải và Tây Á, vậy mà ở Hà Nội nó đã thành thứ rau đi liền với cá, thiếu là thấy hụt. Một bát bún cá giản dị vì thế cũng chở một câu chuyện nhỏ về cách người Việt tiếp nhận một hương vị từ xa và biến nó thành của nhà.',
    ],
    symbols: [
      {
        name: 'Cá rán',
        meaning: 'Cá lọc thịt, ướp nghệ gừng rồi rán vàng: ngoài giòn, trong mềm, không tanh.',
      },
      {
        name: 'Thì là',
        meaning: 'Rau thơm đi liền với cá trong bếp Hà Nội, khử tanh và để lại mùi thơm ấm.',
      },
      {
        name: 'Cà chua',
        meaning: 'Cho màu đỏ và vị chua ngọt tự nhiên, làm nước dùng thanh.',
      },
      {
        name: 'Nước dùng cá',
        meaning: 'Ninh từ xương cá và xương ống, nêm chua nhẹ bằng mẻ hoặc giấm bỗng.',
      },
      {
        name: 'Rau thơm, hành lá',
        meaning: 'Hành lá cùng rau sống ăn kèm làm bát bún tươi và nhẹ.',
      },
    ],
    tasting: [
      'Bún cá ăn với ớt tươi, chanh, thêm chút mắm tôm hoặc tương ớt tùy người. Đĩa rau đi kèm thường có xà lách, kinh giới, rau cần chần. Gắp cá cùng bún và một ít thì là, ba thứ trong một miếng mới đủ vị.',
      'Ăn khi cá còn giòn, đừng để ngâm lâu trong nước dùng. Bún cá hợp bữa sáng và bữa trưa, nhất là mùa hè. Cá lọc vẫn có thể còn xương dăm, nên cẩn thận khi cho trẻ nhỏ ăn.',
    ],
    facts: [
      'Thì là gắn với rất nhiều món cá của Hà Nội, từ chả cá Lã Vọng đến bún cá.',
      'Hải Phòng có bún cá cay, nước dùng đỏ ớt, khác hẳn bát bún cá thanh nhẹ của Hà Nội.',
      'Nhiều quán bún cá Hà Nội dùng mẻ hoặc giấm bỗng để tạo vị chua tự nhiên cho nước dùng.',
    ],
    reference: {
      label: 'Bún — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn',
    },
  },

  'chao-suon': {
    homeland: 'Hà Nội',
    era: 'Thế kỷ XX',
    tagline:
      'Cháo sánh mịn như kem, sườn non ninh nhừ, hành phi và quẩy giòn: món quà chiều mà nhiều thế hệ học sinh Hà Nội nhớ mãi.',
    origin: [
      'Cháo có mặt trong mọi gia đình trồng lúa nước, từ bữa thường đến lúc ốm đau, từ mâm cúng đến bát cháo đêm. Hà Nội giữ món ấy nhưng làm theo kiểu của mình. Khác với cháo hạt ở nhiều nơi, cháo sườn Hà Nội nấu từ gạo xay hoặc bột gạo, quấy liên tục và ninh lâu cho đến khi mịn như kem, gần như không còn thấy hạt.',
      'Nồi cháo được nấu bằng nước ninh sườn lợn, nên thìa nào cũng ngọt thanh. Sườn non, sườn sụn ninh đến mức gỡ thịt dễ dàng. Theo hồi ức của nhiều người Hà Nội, gánh cháo sườn và những hàng cháo trong ngõ phố cổ đã quen thuộc từ khoảng giữa thế kỷ XX, bán vào sáng sớm và nhất là buổi chiều, lúc học sinh tan trường đói bụng.',
      'Bát cháo sườn chuẩn Hà Nội được rắc ruốc thịt, hành phi, hành lá, rau mùi, thêm mấy khúc quẩy giòn cắt nhỏ. Sức hút của nó nằm ở sự tương phản: cháo mịn mượt, quẩy giòn, ruốc tơi, hành thơm. Ngày nay nhiều hàng còn bán thêm sườn riêng, trứng bắc thảo hay pa tê chấm, nhưng nền móng vẫn là nồi cháo sánh và miếng sườn mềm.',
    ],
    timeline: [
      { when: 'Từ lâu đời', what: 'Cháo gạo là món quen thuộc trong mọi gia đình trồng lúa.' },
      { when: 'Giữa thế kỷ XX', what: 'Gánh và hàng cháo sườn xuất hiện trong ngõ phố Hà Nội.' },
      { when: 'Cuối thế kỷ XX', what: 'Cháo sườn thành món quà chiều quen thuộc của học sinh.' },
      { when: 'Ngày nay', what: 'Cháo sườn có mặt ở các hàng quà sáng, quà chiều khắp cả nước.' },
    ],
    meaning: [
      'Trong văn hóa Việt, cháo là món của sự chăm sóc. Người ta nấu cháo cho người ốm, người già, trẻ nhỏ, và nấu cháo trắng cúng chúng sinh trong ngày rằm tháng Bảy. Cháo sườn mang tinh thần ấy ra phố: nhẹ, dễ tiêu, ấm bụng, ai ăn cũng được. Với nhiều người Hà Nội, nó còn là ký ức tuổi học trò, mấy đồng tiền quà kẹp trong túi áo và hàng cháo đầu ngõ trường.',
      'Món ăn cũng cho thấy người Hà Nội kỹ đến đâu với một thứ giản dị. Gạo xay sao cho mịn, sườn ninh sao cho ngọt mà nước không đục, ruốc, hành phi và quẩy rắc vào lúc nào cho còn giòn, chi tiết nào cũng được tính. Một bát cháo sườn nóng giữa chiều mưa phùn tháng Chạp là thứ niềm vui nhỏ mà nhiều người mang theo đến tận lúc trưởng thành.',
    ],
    symbols: [
      {
        name: 'Cháo gạo xay',
        meaning: 'Gạo xay nhỏ, ninh mịn như kem, nét riêng của cháo sườn Hà Nội so với cháo hạt.',
      },
      {
        name: 'Sườn non',
        meaning: 'Sườn sụn ninh mềm, vừa tạo vị ngọt cho nồi cháo, vừa là phần ăn chính.',
      },
      {
        name: 'Hành phi',
        meaning: 'Hành khô phi vàng giòn, mùi thơm bùi lan ngay khi rắc lên mặt cháo nóng.',
      },
      {
        name: 'Hành lá, rau mùi',
        meaning: 'Chút xanh và vị hăng nhẹ giúp bát cháo tươi, đỡ ngấy.',
      },
      {
        name: 'Quẩy, ruốc',
        meaning: 'Quẩy giòn và ruốc thịt tơi xốp tạo độ tương phản với cháo mịn.',
      },
    ],
    tasting: [
      'Cháo sườn ăn với quẩy cắt khúc, ruốc thịt, chút tiêu xay và vài giọt nước mắm hoặc xì dầu. Thích cay thì thêm ớt tươi, tương ớt. Khuấy nhẹ cho hành và ruốc quyện đều, nhưng thả quẩy sau cùng để còn giòn.',
      'Ngon nhất vào sáng sớm hoặc chiều muộn, nhất là mùa đông và những ngày mưa lạnh. Ăn khi cháo còn nóng để cảm nhận độ mịn và mùi hành phi. Cháo sườn cũng là món nhẹ bụng cho người vừa ốm dậy hay trẻ nhỏ.',
    ],
    facts: [
      'Cháo sườn Hà Nội nấu từ gạo xay hoặc bột gạo, nên mịn hơn nhiều so với cháo hạt.',
      'Quẩy giòn gần như là bạn đồng hành bắt buộc của cháo sườn, tạo sự đối lập về kết cấu.',
      'Với nhiều thế hệ học sinh Hà Nội, cháo sườn là món quà chiều quen thuộc sau giờ tan học.',
    ],
    reference: {
      label: 'Cháo — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Ch%C3%A1o',
    },
  },

  'bun-rieu-cua': {
    homeland: 'Bắc Bộ',
    era: 'Từ lâu đời',
    tagline:
      'Gạch cua đồng nổi vàng trên nước dùng đỏ au cà chua: bún riêu là bát canh cua của bữa cơm quê được mang ra phố.',
    origin: [
      'Bún riêu cua bắt nguồn từ đời sống ruộng đồng Bắc Bộ, nơi cua đồng sống dày trong ruộng lúa và bờ mương. Người nông dân bắt cua về giã bằng cối đá, lọc lấy nước, đun lửa vừa cho thịt và gạch cua kết thành mảng nổi lên mặt nồi, gọi là riêu. Canh cua nấu với rau đay, mồng tơi, mướp là món canh mùa hè kinh điển; bún riêu chính là bát canh ấy khi được ăn với bún.',
      'Không ai biết bún riêu xuất hiện từ bao giờ, chỉ biết nó thuộc lớp món bún lâu đời và phổ biến nhất của người Bắc. Nước dùng được nêm chua bằng giấm bỗng, mẻ hay quả dọc, cà chua phi hành mỡ cho màu đỏ đẹp. Ở Hà Nội, bát bún riêu thường có thêm đậu rán, huyết lợn, có hàng cho cả bò tái hay ốc. Người ta ăn quanh năm, nhưng đông khách nhất vẫn là những trưa hè.',
      'Theo chân người Bắc di cư năm 1954, bún riêu vào miền Nam và đổi khác: thêm chả lụa, giò heo, có nơi viên riêu được trộn trứng, đánh thành khối dày, rau sống bày kèm nhiều hơn. Dù vậy, cái nền vẫn giống nhau từ Bắc vào Nam: vị ngọt mát của cua đồng hòa với vị chua dịu của cà chua, thêm chút mắm tôm cho đậm.',
    ],
    timeline: [
      { when: 'Từ lâu đời', what: 'Canh riêu cua đồng là món ăn mùa hè của nông dân Bắc Bộ.' },
      {
        when: 'Thế kỷ XX',
        what: 'Bún riêu cua thành món quà phố phổ biến ở Hà Nội và các tỉnh.',
      },
      { when: 'Sau năm 1954', what: 'Bún riêu theo người Bắc vào Nam và có thêm nhiều biến thể.' },
      {
        when: 'Ngày nay',
        what: 'Bún riêu có mặt khắp cả nước và ở các quán ăn Việt ở nước ngoài.',
      },
    ],
    meaning: [
      'Bún riêu là món của làng quê. Con cua đồng, chiếc cối đá giã cua, tiếng chày thình thịch buổi trưa hè gắn với tuổi thơ của nhiều thế hệ người Bắc. Con cua nhỏ bé, rẻ tiền, chỉ cần lọc khéo và đun đúng lửa là thành bát canh ngọt, giàu chất. Bún riêu giữ lại đúng tinh thần ấy: lấy cái sẵn có quanh nhà, nấu thành bữa ngon.',
      'Ngày nay bún riêu là bữa sáng, bữa trưa quen thuộc ở Hà Nội và khắp các tỉnh. Vị chua thanh, mát của nó hợp mùa nóng, còn mùi cua thì đủ để người xa quê nghĩ đến đồng ruộng, đến bát canh cua rau đay mẹ nấu, đến cái nắng hè quê Bắc. Một bát bún riêu ngon, với người Bắc, đôi khi là cách nhanh nhất để thấy mình đang ở nhà.',
    ],
    symbols: [
      {
        name: 'Riêu cua đồng',
        meaning: 'Thịt và gạch cua đóng thành mảng, cho vị ngọt và béo của đồng ruộng.',
      },
      {
        name: 'Cà chua',
        meaning: 'Phi với hành mỡ cho nước dùng màu đỏ và vị chua ngọt hài hòa.',
      },
      {
        name: 'Đậu phụ rán',
        meaning: 'Đậu vàng ngậm nước dùng, thêm độ béo và làm bát bún đầy đặn.',
      },
      {
        name: 'Huyết lợn',
        meaning: 'Huyết luộc cắt miếng vuông, mềm mượt, thành phần quen của bún riêu Hà Nội.',
      },
      {
        name: 'Rau thơm, giá đỗ',
        meaning: 'Rau sống, giá và hành lá làm mát, cân lại vị béo của riêu cua.',
      },
    ],
    tasting: [
      'Người Bắc ăn bún riêu với chút mắm tôm, ớt tươi, chanh, kèm rau kinh giới, tía tô, rau muống chẻ. Nếm nước trước rồi hẵng nêm. Ai dị ứng giáp xác nên thận trọng.',
      'Bún riêu ngon nhất vào sáng hoặc trưa hè, lúc vị chua thanh dịu bớt cái nóng. Gắp riêu cùng bún và rau để đủ vị trong một miếng. Người sành thường nhìn mặt nồi trước khi ngồi: riêu nổi dày, vàng đều là quán đáng ăn.',
    ],
    facts: [
      'Khi nước cua lọc được đun nóng, thịt và gạch cua tự kết thành mảng nổi lên, đó chính là “riêu”.',
      'Bún riêu miền Nam thường có thêm chả lụa, giò heo và nhiều rau sống hơn bát bún riêu Bắc.',
      'Canh cua nấu rau đay, mồng tơi là món canh mùa hè kinh điển của người Bắc, gốc gác của bún riêu.',
    ],
    reference: {
      label: 'Bún riêu — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_ri%C3%AAu',
    },
  },

  'bun-moc': {
    homeland: 'Hà Nội',
    era: 'Thế kỷ XX',
    tagline:
      'Viên mọc dai giòn lấm tấm mộc nhĩ, nấm hương trong nồi nước xương trong ngọt: bún mọc là bữa sáng kín đáo, thanh nhã của Hà Nội.',
    origin: [
      'Mọc là giò sống, tức thịt lợn nạc giã nhuyễn với nước mắm, trộn nấm hương, mộc nhĩ băm, rồi vo viên thả vào nồi nước sôi. Kỹ thuật giã giò là nghề quen của bếp Bắc Bộ, nơi giò lụa là món sang của mâm cỗ Tết. Người Hà Nội đem phần giò sống ấy vo thành viên, nấu với nước xương và bún, thế là có bún mọc, một món quà sáng nhẹ nhàng của phố.',
      'Không có tư liệu nào nói rõ bún mọc có từ năm nào, nhưng nó đã nằm trong thực đơn quà sáng của Hà Nội nhiều chục năm. Nước dùng ninh từ xương ống lợn, hớt bọt kỹ để giữ màu trong. Cái khó nằm ở viên mọc: phải dai mà không cứng, mềm mà không bở, thơm mùi nấm hương mà không át vị thịt. Mỗi hàng giữ một bí quyết riêng về tỉ lệ nạc mỡ và cách giã.',
      'Bát bún mọc ngày nay thường đầy hơn xưa: ngoài viên mọc còn có sườn sụn, chả quế, giò lụa, có hàng thêm thịt bắp, móng giò. Kiểu khác thì thả đậu rán, thịt lợn luộc, vài lát cà chua cho nước dùng chua nhẹ, rắc hành phi lên trên. Dù nhiều hay ít món kèm, viên mọc vẫn là thứ người ăn tìm đầu tiên.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Giò sống, giò lụa là kỹ thuật chế biến thịt quen thuộc của Bắc Bộ.',
      },
      { when: 'Thế kỷ XX', what: 'Bún mọc xuất hiện ở các hàng quà sáng Hà Nội.' },
      { when: 'Cuối thế kỷ XX', what: 'Bún mọc thành món quà sáng phổ biến của người Hà Nội.' },
      { when: 'Ngày nay', what: 'Bát bún mọc có thêm sườn, chả quế, giò, bày biện đầy đặn hơn.' },
    ],
    meaning: [
      'Giữa các món bún Hà Nội, bún mọc là giọng trầm nhất. Không đậm như bún bò, không chua như bún riêu, nó chỉ có vị ngọt của xương và thịt, thoảng mùi nấm hương. Người chọn bún mọc thường là người thích bữa sáng gọn gàng, ăn xong vẫn nhẹ bụng, hoặc là người già, trẻ nhỏ cần một bát nước dễ chịu.',
      'Món ăn cũng là một ví dụ về cách người Hà Nội đem kỹ thuật của mâm cỗ vào bữa thường ngày. Giò sống vốn để gói giò lụa cho ngày Tết, nay được vo viên cho bữa sáng mỗi ngày. Thứ tưởng cầu kỳ hóa ra rất gần, và bát bún mọc vì thế có cái thanh lịch rất kín đáo của phố cũ.',
    ],
    symbols: [
      {
        name: 'Viên mọc',
        meaning: 'Giò sống trộn nấm hương, mộc nhĩ, vo viên luộc chín: dai giòn và thơm.',
      },
      {
        name: 'Nước dùng xương',
        meaning: 'Ninh từ xương ống lợn, hớt bọt kỹ cho trong và ngọt thanh.',
      },
      {
        name: 'Mộc nhĩ',
        meaning: 'Băm trong viên mọc hoặc thái sợi thả vào bát, tạo độ giòn sần sật.',
      },
      {
        name: 'Đậu rán, thịt lợn, cà chua',
        meaning: 'Đậu vàng, thịt luộc thái mỏng và cà chua đỏ làm bát bún đầy đặn, chua nhẹ.',
      },
      {
        name: 'Hành phi, rau mùi',
        meaning: 'Hành phi thơm bùi và rau mùi tươi điểm lên mặt nước trong.',
      },
    ],
    tasting: [
      'Bún mọc ăn với chanh, ớt tươi, chút giấm tỏi hoặc tương ớt; rau thơm, giá chần thêm tùy thích. Nếm nước trước khi nêm để biết nồi xương ngọt đến đâu.',
      'Đây là món sáng hợp nhất những ngày se lạnh. Cắn viên mọc khi còn nóng để thấy độ dai giòn và mùi nấm hương. Những hàng bún mọc ngon thường đông từ sớm và hết nồi trước giờ trưa.',
    ],
    facts: [
      'Mọc làm từ giò sống, cùng nguyên liệu với giò lụa, nhưng vo viên và nấu trong nước dùng.',
      'Nấm hương băm trong viên mọc tạo mùi thơm đặc trưng mà người Hà Nội rất chuộng.',
      'Nhiều hàng bún mọc Hà Nội bán kèm sườn sụn và chả quế cho bát bún thêm đầy.',
    ],
    reference: {
      label: 'Bún mọc — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_m%E1%BB%8Dc',
    },
  },

  'mien-ga': {
    homeland: 'Hà Nội · Bắc Bộ',
    era: 'Thế kỷ XX',
    tagline:
      'Sợi miến dong trong veo, thịt gà ta xé và mùi nấm hương ấm áp: miến gà là bát canh mâm cỗ Tết đi ra hàng quà mùa đông.',
    origin: [
      'Miến dong làm từ tinh bột củ dong riềng, loại cây trồng nhiều ở trung du và miền núi phía Bắc. Người làm miến mài củ, lọc bột, tráng thành bánh, phơi se rồi thái sợi, phơi khô. Làng So ở Quốc Oai, ngoại thành Hà Nội, là làng miến nổi tiếng nhất, bên cạnh miến Bình Liêu của Quảng Ninh và miến của đồng bào Dao ở Na Rì, Bắc Kạn cũ. Sợi miến dong tốt dai, trong, nấu lâu không nát.',
      'Trước khi là món quà phố, miến gà là bát canh trên mâm cỗ. Ngày Tết, ngày giỗ, người Bắc luộc gà cúng rồi dùng chính nồi nước luộc nấu canh miến, thả thêm nấm hương, mộc nhĩ, lòng gà. Bát canh miến có mặt trong mâm cỗ truyền thống của nhiều gia đình. Từ căn bếp ấy, miến gà ra phố, thành món bán buổi sáng và buổi tối ở Hà Nội.',
      'Một bát miến gà quen thuộc gồm miến dong trụng mềm, thịt gà xé đặt lên trên, nước dùng ninh từ xương gà và nấm hương thái lát, thêm chút cà rốt bào sợi cho màu, rắc hành lá, rau mùi và hành phi. Có hàng bán kèm lòng mề, trứng non như hàng phở gà. Vị chung là ngọt thanh, nhẹ, ấm, một thứ quà rất hợp những sáng gió mùa.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Nghề làm miến dong phát triển ở các làng nghề Bắc Bộ và miền núi phía Bắc.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Canh miến nấu nước luộc gà quen mặt trên mâm cỗ Tết và ngày giỗ của người Bắc.',
      },
      { when: 'Cuối thế kỷ XX', what: 'Miến gà thành món quà phố phổ biến ở Hà Nội.' },
      {
        when: 'Ngày nay',
        what: 'Miến dong làng nghề được đóng gói, đặc biệt đắt hàng mỗi dịp cuối năm.',
      },
    ],
    meaning: [
      'Với nhiều nhà miền Bắc, mùi miến gà là mùi của những ngày cuối năm. Nồi nước luộc gà sau lễ cúng tất niên, bát canh miến có nấm hương, mộc nhĩ trên mâm cỗ, cả nhà ngồi quây quần: đó là ký ức mà một bát miến gà ngoài hàng có thể gợi lại chỉ sau một thìa nước. Món ăn vì thế mang hương vị của sự sum họp.',
      'Ngoài ngày lễ, miến gà là bữa thường ngày dễ chịu: nhẹ bụng, dễ tiêu, ai cũng ăn được. Sợi miến dong còn mang theo câu chuyện của các làng nghề, nơi mỗi mùa hanh khô người ta phơi miến kín sân, kín ngõ. Cầm bát miến gà nóng, người ăn cầm cả một mùa thu hoạch củ dong và bàn tay của những người làm miến.',
    ],
    symbols: [
      {
        name: 'Miến dong',
        meaning:
          'Sợi làm từ tinh bột củ dong riềng, dai và trong, sản phẩm của nhiều làng nghề phía Bắc.',
      },
      {
        name: 'Thịt gà ta',
        meaning: 'Gà luộc xé sợi, ngọt và chắc, gắn với con gà cúng ngày Tết, ngày giỗ.',
      },
      {
        name: 'Nước dùng gà',
        meaning: 'Ninh từ xương gà, trong và ngọt thanh, làm nền cho cả bát miến.',
      },
      {
        name: 'Nấm hương',
        meaning: 'Thái lát thả vào nước, cho mùi thơm đặc trưng và vị ngọt sâu.',
      },
      {
        name: 'Cà rốt, hành, rau mùi',
        meaning: 'Cà rốt bào sợi thêm màu, hành lá, hành phi và rau mùi làm bát miến thơm.',
      },
    ],
    tasting: [
      'Miến gà ăn với chanh, ớt tươi và một chút tiêu xay. Gọi thêm lòng gà hay trứng non nếu hàng có. Nếm nước trước để cảm nhận vị ngọt của gà và nấm hương.',
      'Ngon nhất vào mùa đông, lúc bát miến bốc hơi nghi ngút. Ăn nhanh khi sợi miến còn dai, vì để lâu miến hút nước, nở mềm. Đây là món hợp cả bữa sáng lẫn bữa tối nhẹ.',
    ],
    facts: [
      'Miến dong làm từ tinh bột củ dong riềng, khác với miến đậu xanh thường gặp ở nhiều nước châu Á.',
      'Làng So ở Quốc Oai, Hà Nội, là một trong những làng miến dong nổi tiếng nhất miền Bắc.',
      'Ở Bắc Kạn cũ, đồng bào Dao ở Na Rì và Ba Bể là những người giữ nghề làm miến dong lâu đời.',
    ],
    reference: {
      label: 'Miến — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Mi%E1%BA%BFn',
    },
  },

  'chao-long': {
    homeland: 'Bắc Bộ',
    era: 'Từ lâu đời',
    tagline:
      'Nồi cháo sôi lục bục bên mẹt lòng thái sẵn, dồi, gan, hành phi thơm lừng: cháo lòng là bữa sáng no nê của chợ quê và vỉa hè.',
    origin: [
      'Cháo lòng mọc lên từ tục mổ lợn ở làng quê. Mỗi dịp Tết, giỗ, cưới, khi cả xóm góp tay mổ một con lợn, người ta tận dụng nồi nước luộc lòng để nấu một nồi cháo lớn chia nhau ăn ngay trong sân. Lòng non, dạ dày, tim, cật, gan, dồi đều luộc chín, thái lát, chẳng bỏ phí phần nào. Bát cháo ấy là phần thưởng sau một buổi sáng làm cỗ.',
      'Từ bữa ăn trong làng, cháo lòng ra chợ, ra phố. Hàng cháo lòng thường dọn từ sáng sớm hoặc xế chiều, bên cạnh mẹt lòng luộc bày sẵn. Nồi cháo ngon nhờ nước ninh xương hòa với nước luộc lòng, gạo được rang sơ hoặc nấu cho hạt vừa nở bung. Có nơi cho thêm huyết vào nồi để cháo ngả màu nâu, có nơi giữ cháo trắng và để huyết riêng.',
      'Một bát cháo lòng đầy đủ có lòng, gan, dồi, rắc hành lá, rau mùi, hành phi, thêm ít ớt. Dồi lợn là phần được săn nhất: ruột non nhồi tiết, mỡ, thịt băm, đậu xanh hoặc rau thơm, luộc chín rồi thái khoanh, nhiều hàng còn nướng sơ cho thơm. Từ Bắc vào Nam, cháo lòng mỗi vùng mỗi khác, nhưng ở đâu cũng là món bình dân, rẻ và no.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Cháo nấu từ nước luộc lòng là bữa ăn chung trong dịp mổ lợn ở làng quê.',
      },
      { when: 'Thế kỷ XX', what: 'Hàng cháo lòng xuất hiện ở chợ và phố Hà Nội.' },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Cháo lòng thành món ăn bình dân phổ biến ở các thành phố trên cả nước.',
      },
      { when: 'Ngày nay', what: 'Cháo lòng vẫn là món quen của chợ, vỉa hè và các quán ăn sáng.' },
    ],
    meaning: [
      'Cháo lòng là món của sự sẻ chia. Ngày xưa, mỗi lần mổ lợn là một dịp vui của cả xóm: người lo nước sôi, người lo lòng, người canh nồi cháo, và ai có mặt cũng có một bát. Món ăn mang tinh thần không lãng phí và tính hiếu khách của người nông dân, nơi phần rẻ nhất của con lợn vẫn được nấu chu đáo để mời nhau.',
      'Ra đến phố, cháo lòng giữ nguyên cái chất bình dân ấy. Bát cháo đậm, ấm bụng, rẻ tiền, hợp với buổi sáng rét hay chiều mưa. Người lao động ăn để có sức, dân văn phòng ăn vì thèm, nhóm bạn ngồi cạnh nồi cháo bốc khói thì có cớ để trò chuyện lâu hơn. Đơn giản, nhưng khó thay.',
    ],
    symbols: [
      {
        name: 'Lòng lợn',
        meaning: 'Lòng non, dạ dày, tim, cật luộc chín, thái lát; phải làm sạch kỹ mới giòn, thơm.',
      },
      {
        name: 'Dồi lợn',
        meaning:
          'Ruột non nhồi tiết và thịt băm, luộc chín thái khoanh, béo ngậy, phần được săn nhất.',
      },
      { name: 'Gan lợn', meaning: 'Gan luộc vừa chín, bùi béo, thêm vị đậm cho bát cháo.' },
      {
        name: 'Cháo gạo',
        meaning: 'Nấu bằng nước ninh xương và nước luộc lòng, hạt nở bung, ngọt đậm.',
      },
      {
        name: 'Hành, rau mùi, ớt',
        meaning: 'Hành lá, hành phi, rau mùi và ớt át mùi lòng và làm bát cháo thơm hơn.',
      },
    ],
    tasting: [
      'Cháo lòng ăn với quẩy, hành lá, rau mùi, tiêu xay, ớt và chanh. Nhiều người gọi lòng bày riêng ra đĩa để chấm mắm tôm hoặc nước mắm gừng. Chọn hàng sạch sẽ, lòng phải làm kỹ và luộc chín.',
      'Ngon nhất vào sáng sớm hoặc chiều tối, nhất là khi trời lạnh. Ăn lúc cháo còn nóng để thấy vị ngọt của nước luộc lòng và độ giòn của lòng non. Một bát cháo kèm vài miếng quẩy là đủ no đến trưa.',
    ],
    facts: [
      'Cháo lòng gắn với tục mổ lợn ngày Tết ở làng quê, khi nồi nước luộc lòng được dùng để nấu cháo chia cả xóm.',
      'Có hàng cho huyết vào nồi để cháo ngả màu nâu, có hàng giữ cháo trắng và để huyết riêng.',
      'Dồi lợn có thể nhồi thêm đậu xanh, mỡ hoặc rau thơm, mỗi vùng một công thức.',
    ],
    reference: {
      label: 'Cháo lòng — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Ch%C3%A1o_l%C3%B2ng',
    },
  },

  'com-ga-hoi-an': {
    homeland: 'Hội An · xứ Quảng',
    era: 'Khoảng giữa thế kỷ XX',
    tagline:
      'Hạt cơm vàng nấu bằng nước luộc gà, gà xé trộn rau răm, hành tây và đu đủ chua: bữa trưa quen của phố Hội.',
    origin: [
      'Hội An từng là thương cảng sầm uất từ thế kỷ XVI đến XVIII, nơi thuyền buôn Nhật Bản, Trung Hoa và phương Tây cập bến. Cộng đồng người Hoa định cư lâu đời ở đây mang theo nhiều món ăn, và nhiều người cho rằng cách nấu cơm bằng nước luộc gà của cơm gà Hội An có họ hàng với cơm gà Hải Nam. Giả thuyết ấy chưa có tư liệu xác nhận, nhưng bàn tay người Quảng thì nhìn thấy rõ trên đĩa cơm.',
      'Mốc dễ kiểm chứng hơn là quầy hàng của bà Buội: theo nhiều nguồn, từ thập niên 1950 bà đã gánh cơm gà bán ở chợ Hội An, sau mở quán trên đường Phan Châu Trinh và thành địa chỉ lâu năm của phố cổ. Gạo thường là gạo cũ, nấu bằng nước luộc gà, có thêm nghệ hoặc mỡ gà cho hạt vàng, tơi. Gà ta nuôi thả, nhiều quán chọn gà mái tơ, luộc vừa chín.',
      'Gà được xé hoặc chặt miếng, rồi trộn với hành tây thái mỏng, rau răm, muối tiêu, chút chanh. Đĩa cơm đi kèm đu đủ ngâm chua, bát canh nước gà và chén tương ớt nhà làm. Cách ngoài phố cổ không xa, Tam Kỳ có cơm gà cũng nổi tiếng không kém, người Quảng hay đem ra so sánh. Từ tháng 7/2025, phố cổ Hội An thuộc thành phố Đà Nẵng mới.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XVI–XVIII',
        what: 'Hội An là thương cảng quốc tế, nơi cộng đồng người Hoa định cư.',
      },
      {
        when: 'Thập niên 1950',
        what: 'Bà Buội bán cơm gà ở chợ Hội An, theo lời kể của gia đình và nhiều tư liệu báo chí.',
      },
      {
        when: 'Tháng 12/1999',
        what: 'Phố cổ Hội An được UNESCO công nhận là Di sản Văn hóa Thế giới.',
      },
      {
        when: 'Ngày nay',
        what: 'Cơm gà là một trong những món du khách tìm đầu tiên khi đến phố cổ.',
      },
    ],
    meaning: [
      'Đĩa cơm gà kể lại lịch sử của một thương cảng. Từ một kiểu cơm gà mà nhiều người cho là có gốc người Hoa, người Quảng thêm rau răm, hành tây, nghệ, đu đủ chua và tương ớt, tạo ra một phiên bản vừa quen vừa lạ. Đó là cách Hội An vẫn làm suốt mấy trăm năm: nhận lấy cái của người, rồi nêm lại cho hợp khẩu vị nhà mình.',
      'Với người phố Hội, cơm gà đơn giản là bữa trưa: một đĩa cơm, một bát canh, ăn nhanh rồi về nghỉ trưa trước khi phố đông khách. Với du khách, nó là một phần của khung cảnh: tường vàng, mái ngói rêu, đèn lồng treo dọc hiên và một quán cơm gà đông người. Món ăn đi giữa hai vai trò ấy mà không mất chất.',
    ],
    symbols: [
      {
        name: 'Cơm nghệ',
        meaning: 'Gạo cũ nấu bằng nước luộc gà, thêm nghệ hoặc mỡ gà cho hạt vàng, tơi và thơm.',
      },
      {
        name: 'Gà xé',
        meaning: 'Gà ta luộc vừa chín, xé sợi hoặc chặt miếng, giữ độ ngọt và chắc.',
      },
      {
        name: 'Rau răm, hành tây',
        meaning: 'Rau răm cay nồng và hành tây giòn ngọt trộn cùng gà, làm nên vị tươi của món.',
      },
      { name: 'Đồ chua', meaning: 'Đu đủ, cà rốt ngâm chua giúp cân lại vị béo của cơm và gà.' },
      {
        name: 'Tương ớt, chanh',
        meaning: 'Tương ớt Hội An và miếng chanh để mỗi người tự chỉnh vị chua cay.',
      },
    ],
    tasting: [
      'Trộn gà với rau răm, hành tây cho đều, rồi ăn cùng cơm và đồ chua. Một chén canh nước gà nóng luôn đi kèm, có thể gọi thêm lòng mề gà luộc. Tương ớt Hội An để thêm cay, hành phi rắc thêm cho thơm.',
      'Cơm gà hợp nhất buổi trưa, dù nhiều quán ở Hội An bán cả ngày. Vắt chút chanh lên gà trước khi ăn, và ăn khi cơm còn nóng để thấy hạt cơm dẻo tơi và thơm mùi nước gà.',
    ],
    facts: [
      'Cơm gà Hội An được nấu bằng nước luộc gà, thêm nghệ hoặc mỡ gà nên hạt cơm có màu vàng.',
      'Quán cơm gà Bà Buội trên đường Phan Châu Trinh có gốc từ gánh cơm gà bán ở chợ Hội An từ thập niên 1950.',
      'Tam Kỳ, cách Hội An không xa, có cơm gà nổi tiếng không kém, với cách bày và nêm nếm riêng.',
    ],
    reference: {
      label: 'Cơm gà — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/C%C6%A1m_g%C3%A0',
    },
  },

  'bun-bo-hue': {
    homeland: 'Huế',
    era: 'Khoảng thế kỷ XIX–XX',
    tagline:
      'Tô bún nước đỏ ánh dầu điều, thơm sả và mắm ruốc, đầy bắp bò và khoanh giò heo: bún bò là món khiến người Huế nhớ nhà nhất.',
    origin: [
      'Bún bò lớn lên ở Huế, kinh đô của triều Nguyễn từ năm 1802, nhưng nó là món của dân gian chứ không phải của cung đình. Thời điểm ra đời không được ghi chép rõ. Một số người kể rằng trước khi có nghề bún, trong các dịp tế lễ ở làng xã xứ Huế, người ta nấu thịt bò thành món xáo ăn với xôi, về sau bún thay chỗ cho xôi. Cũng có giai thoại về một người con gái làng bún nghĩ ra nồi nước có mắm ruốc, ớt, nhưng đó chỉ là truyền thuyết.',
      'Sợi bún là nửa câu chuyện. Làng Vân Cù, cách trung tâm Huế không xa, làm bún hơn bốn trăm năm, và là nơi duy nhất ở miền Trung còn tế Bà tổ nghề bún vào ngày 22 tháng Giêng âm lịch. Nghề làm bún Vân Cù được công nhận di sản văn hóa phi vật thể quốc gia năm 2024. Sợi bún bò Huế to, dai, ngả màu ngà, ngâm trong nước nóng mà không bở.',
      'Nước dùng ninh từ xương bò, xương heo, nêm sả đập dập và mắm ruốc, rồi tưới dầu điều phi ớt lên mặt cho đỏ. Trong tô có bắp bò, giò heo, chả Huế, có nơi thêm chả cua và huyết. Ở Huế, người ta chỉ gọi là “bún bò” hay “bún bò giò heo”; cái tên “bún bò Huế” trở nên phổ biến khi món ăn đi xa, nhất là từ sau năm 1975. Tháng 6/2025, tri thức dân gian về bún bò Huế được ghi danh di sản quốc gia.',
    ],
    timeline: [
      {
        when: 'Năm 1802',
        what: 'Huế trở thành kinh đô của triều Nguyễn, trung tâm văn hóa và ẩm thực của cả nước.',
      },
      { when: 'Thế kỷ XIX–XX', what: 'Bún bò hình thành và lan khắp Huế qua các gánh bún rong.' },
      {
        when: 'Sau năm 1975',
        what: 'Người Huế đi xa mang theo bún bò, cái tên “bún bò Huế” phổ biến khắp nơi.',
      },
      {
        when: '10/12/2024',
        what: 'Nghề làm bún Vân Cù được công nhận di sản văn hóa phi vật thể quốc gia.',
      },
      {
        when: '27/6/2025',
        what: 'Tri thức dân gian về bún bò Huế được đưa vào danh mục di sản văn hóa phi vật thể quốc gia.',
      },
    ],
    meaning: [
      'Bún bò mang tính khí của đất Huế nhiều hơn vẻ trầm mặc người ta thường gán cho cố đô. Vị mặn của mắm ruốc, mùi nồng của sả, cái cay nhức của ớt cho thấy khẩu vị người miền Trung: chuộng đậm, chuộng cay, như để chống lại mưa dầm và nắng gắt. Đó là món của bà gánh bún đầu dốc, của quán nhỏ trong kiệt, chứ không phải món ngự thiện.',
      'Ở Huế, ăn bún bò buổi sáng là chuyện thường như uống nước. Đi xa thì khác: người Huế ở Sài Gòn, Hà Nội hay California đều nhắc đến một quán bún quen ở quê và lắc đầu bảo ở đây không giống. Việc món ăn được ghi danh di sản quốc gia năm 2025 chỉ chính thức hóa điều người Huế vẫn nghĩ từ lâu: tô bún ấy là một phần căn cước của họ.',
    ],
    symbols: [
      {
        name: 'Sả và mắm ruốc',
        meaning:
          'Sả đập dập cho mùi nồng, mắm ruốc cho vị mặn sâu: hai thứ làm nên nồi nước bún bò.',
      },
      {
        name: 'Bắp bò, giò heo',
        meaning: 'Bắp bò thái lát và khoanh giò heo ninh mềm, da béo, gân giòn.',
      },
      {
        name: 'Chả Huế',
        meaning: 'Chả lụa kiểu Huế nhiều tiêu, thái miếng dày, quen mặt trong tô bún bò.',
      },
      {
        name: 'Ớt, dầu điều',
        meaning:
          'Ớt phi trong dầu điều cho màu đỏ và vị cay, thể hiện khẩu vị ưa cay của người Huế.',
      },
      {
        name: 'Sợi bún Vân Cù',
        meaning: 'Sợi to, dai, màu ngà từ làng bún hơn bốn trăm năm tuổi ven Huế.',
      },
    ],
    tasting: [
      'Người Huế ăn bún bò với rổ rau gồm bắp chuối bào, rau muống chẻ, giá, rau thơm, thêm chanh, ớt tươi và chút mắm ruốc cho ai thích đậm. Nếm nước trước rồi hẵng nêm. Mắm ruốc làm từ ruốc biển, người dị ứng tôm nên lưu ý.',
      'Bún bò ngon nhất buổi sáng, khi nồi nước vừa tới và quán còn thơm mùi sả. Ăn lúc tô còn nóng, hành lá vừa chín, để thấy hết cái cay nồng. Ở Huế, nhiều quán bán từ tờ mờ sáng và hết nồi trước trưa.',
    ],
    facts: [
      'Ở Huế, món ăn thường chỉ được gọi là “bún bò” hay “bún bò giò heo”, không kèm chữ “Huế”.',
      'Làng bún Vân Cù tế Bà tổ nghề bún vào ngày 22 tháng Giêng âm lịch, lễ duy nhất như thế ở miền Trung.',
      'Theo Quyết định 2203/QĐ-BVHTTDL ngày 27/6/2025, tri thức dân gian về bún bò Huế là di sản văn hóa phi vật thể quốc gia.',
    ],
    reference: {
      label: 'Bún bò Huế — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn_b%C3%B2_Hu%E1%BA%BF',
    },
  },

  'mi-quang-tom-thit': {
    homeland: 'Quảng Nam · Đà Nẵng',
    era: 'Từ lâu đời',
    tagline:
      'Sợi mì vàng bản to, một vá nước nhân sánh đậm, tôm thịt rim đỏ và miếng bánh tráng mè bẻ giòn tan: mì Quảng là món người Quảng mang theo khắp nơi.',
    origin: [
      'Mì Quảng là món của xứ Quảng, vùng đất nay gồm thành phố Đà Nẵng mới sau khi tỉnh Quảng Nam sáp nhập năm 2025. Không có tư liệu xác định món ăn ra đời khi nào, chỉ biết nó đã gắn với đời sống người Quảng qua nhiều thế hệ. Chữ “mì” khiến một số người nghĩ đến ảnh hưởng của mì người Hoa, nhưng sợi mì Quảng làm từ gạo, và cách ăn ít nước của nó thì không giống món nào khác.',
      'Gạo được xay thành bột nước, tráng thành bánh, hấp chín rồi thái sợi bản rộng chừng nửa đến một đốt ngón tay. Màu vàng có được nhờ nghệ hoặc hạt dành dành, có nơi thêm trứng. Điểm làm nên tên tuổi của mì Quảng là “nước nhân”: thứ nước dùng ít và đậm, chỉ chan xâm xấp đủ thấm sợi mì. Làng Phú Chiêm ở Điện Bàn hay Túy Loan ở Đà Nẵng là những nơi người ta hay nhắc tới khi nói về mì ngon.',
      'Nhân mì đổi theo mùa và theo nhà: tôm thịt, gà, cá lóc, ếch, bò, có nơi cả lươn. Tôm thịt là kiểu phổ biến nhất, tôm và thịt ba chỉ rim với nước mắm, hành, tỏi, ớt cho đỏ au. Tô mì rắc đậu phộng rang, hành lá, kèm trứng luộc, giá, rau sống và chiếc bánh tráng mè nướng. Tháng 8/2024, tri thức dân gian mì Quảng được ghi danh di sản văn hóa phi vật thể quốc gia.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Mì Quảng hình thành ở vùng nông thôn Quảng Nam, gắn với nghề xay bột, tráng bánh.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Mì Quảng phổ biến ở Đà Nẵng và các đô thị miền Trung.',
      },
      { when: 'Sau năm 1975', what: 'Người Quảng đi làm ăn xa mở quán mì Quảng khắp cả nước.' },
      {
        when: '9/8/2024',
        what: 'Tri thức dân gian mì Quảng ở tỉnh Quảng Nam được đưa vào danh mục di sản văn hóa phi vật thể quốc gia.',
      },
    ],
    meaning: [
      'Mì Quảng là món người Quảng tự hào nhất. Nó có mặt ở bữa sáng thường ngày, trong đám giỗ, đám cưới, ngày Tết, ở mâm cơm đãi khách quý lẫn gánh hàng ngoài chợ. Cái chất chân chất, ít điệu đà mà đậm đà của tô mì cũng là cái chất người ta hay gán cho người Quảng: thẳng thắn, cần cù, ăn nói bộc trực mà thật bụng.',
      'Sự đa dạng của nhân mì phản ánh sản vật của vùng đất có đủ biển, sông, đồng ruộng và núi: tôm biển, cá lóc đồng, gà vườn, ếch ruộng. Người Quảng đi xa đem mì theo như đem giọng nói quê nhà, và ở đâu có người Quảng, sớm muộn sẽ có một quán mì Quảng mở cửa. Với họ, ngồi trước tô mì là cách nhanh nhất để thấy mình chưa rời quê.',
    ],
    symbols: [
      {
        name: 'Sợi mì vàng',
        meaning: 'Bột gạo tráng, thái bản to, nhuộm vàng bằng nghệ hoặc hạt dành dành, mềm mà dai.',
      },
      {
        name: 'Nước nhân',
        meaning: 'Nước dùng ít nhưng đậm, chỉ đủ thấm sợi mì: đặc trưng không lẫn của mì Quảng.',
      },
      {
        name: 'Tôm và thịt heo',
        meaning: 'Tôm và thịt ba chỉ rim nước mắm đỏ au, kiểu nhân phổ biến nhất.',
      },
      {
        name: 'Bánh tráng mè nướng',
        meaning: 'Bẻ vụn vào tô hoặc cầm cắn kèm, cho tiếng giòn và mùi mè thơm.',
      },
      {
        name: 'Đậu phộng, trứng luộc',
        meaning: 'Đậu phộng rang giã dập thơm bùi, nửa quả trứng luộc làm tô mì chắc dạ.',
      },
    ],
    tasting: [
      'Người Quảng ăn mì với rau sống như xà lách, húng quế, rau răm, bắp chuối bào, giá, kèm chanh, ớt và bánh tráng nướng. Trộn đều sợi mì với nước nhân và rau trước khi ăn. Ai dị ứng tôm hoặc đậu phộng nên hỏi kỹ.',
      'Mì Quảng là món sáng, nhưng ăn lúc nào trong ngày cũng được. Ăn khi mì còn ấm và bánh tráng còn giòn. Nhiều người Quảng thích cắn kèm một trái ớt xanh, cay đến chảy nước mắt mới là đã.',
    ],
    facts: [
      'Mì Quảng chỉ có một ít nước dùng gọi là “nước nhân”, khác hẳn những món bún, phở nhiều nước.',
      'Màu vàng của sợi mì Quảng thường đến từ nghệ hoặc hạt dành dành.',
      'Quyết định 2327/QĐ-BVHTTDL ngày 9/8/2024 đưa tri thức dân gian mì Quảng vào danh mục di sản quốc gia.',
    ],
    reference: {
      label: 'Mì Quảng — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/M%C3%AC_Qu%E1%BA%A3ng',
    },
  },

  'nem-nuong-nha-trang': {
    homeland: 'Ninh Hòa · Nha Trang, Khánh Hòa',
    era: 'Thế kỷ XX',
    tagline:
      'Xiên nem nướng xém cạnh trên than hồng, cuốn bánh tráng với rau sống và chấm bát nước sốt sánh đặc: đặc sản của Ninh Hòa, nổi danh ở Nha Trang.',
    origin: [
      'Nem nướng có ở nhiều vùng, nhưng cái tên được nhắc đầu tiên thường là Ninh Hòa, vùng đất cách Nha Trang chừng 30 km về phía bắc. Nguồn gốc chính xác của món ăn chưa ai xác định. Các bậc cao niên ở đây kể rằng nghề làm nem do những người di cư từ Thanh Hóa mang vào, và được truyền tay qua các thế hệ chừng một trăm năm nay. Ninh Hòa nổi tiếng với cả nem chua lẫn nem nướng.',
      'Thịt làm nem phải là thịt heo nạc còn nóng, vừa mổ xong, giã thật dẻo với tỏi, đường, nước mắm, trộn thêm mỡ thái hạt lựu rồi quấn lên que tre hoặc nắn thành thỏi, nướng trên than hồng đến khi xém cạnh. Nhưng thứ quyết định một hàng nem là bát nước chấm. Mỗi nhà một công thức, thường có gạo nếp hoặc xôi, gan heo, thịt nạc, tôm, đậu phộng, tương, tỏi, ớt, nấu nhiều giờ đến khi sánh đặc.',
      'Từ Ninh Hòa, nem nướng xuống Nha Trang và thành món mà du khách nhất định phải thử ở thành phố biển. Ở Khánh Hòa, nem được cuốn trong bánh tráng mềm với xà lách, rau thơm, dưa leo, đồ chua, khế, xoài xanh và một miếng bánh tráng chiên giòn, nhiều quán thêm bún. Ra Bắc vào Nam, nem nướng lại đi với bún hay bánh hỏi, mỗi nơi một kiểu cuốn.',
    ],
    timeline: [
      {
        when: 'Khoảng đầu thế kỷ XX',
        what: 'Nghề làm nem hình thành ở Ninh Hòa, theo lời kể người cao niên là do người Thanh Hóa mang vào.',
      },
      { when: 'Thế kỷ XX', what: 'Nem nướng Ninh Hòa lan xuống Nha Trang và các vùng lân cận.' },
      { when: 'Cuối thế kỷ XX', what: 'Nem nướng thành đặc sản gắn với du lịch Nha Trang.' },
      {
        when: 'Ngày nay',
        what: 'Quán nem nướng Ninh Hòa, Nha Trang có mặt ở nhiều thành phố trên cả nước.',
      },
    ],
    meaning: [
      'Nem nướng là món phải ăn đông người mới vui. Mâm nem bày giữa bàn, ai cũng tự tay cuốn cho mình: một lá bánh tráng, vài cọng rau, miếng dưa leo, thanh bánh tráng chiên, xiên nem nóng, rồi chấm ngập vào bát nước sốt. Tay bận, miệng nói, bữa ăn kéo dài cả buổi chiều mà không ai thấy lâu.',
      'Món ăn cũng cho thấy thói quen ăn cuốn của miền Trung và Nam Trung Bộ, nơi gần như món nào cũng có thể gói vào bánh tráng với rau sống. Vị đậm của thịt nướng, cái mát của rau, cái giòn của bánh tráng chiên và vị béo bùi của nước chấm ăn ý với nhau trong một cuốn. Người Khánh Hòa đi xa nhớ nem nướng vì vị một phần, phần nữa vì cái không khí ngồi cuốn cùng nhau.',
    ],
    symbols: [
      {
        name: 'Nem nướng',
        meaning:
          'Thịt heo nạc giã dẻo, trộn mỡ hạt lựu, quấn que tre nướng trên than đến xém cạnh.',
      },
      {
        name: 'Nước chấm sánh',
        meaning:
          'Nấu từ xôi hoặc gạo nếp, gan heo, tôm, đậu phộng, tương, tỏi, mỗi nhà một bí quyết.',
      },
      {
        name: 'Bánh tráng',
        meaning: 'Bánh tráng mềm để cuốn, bánh tráng chiên giòn gói bên trong tạo tiếng giòn.',
      },
      {
        name: 'Rau sống, dưa leo, đồ chua',
        meaning: 'Xà lách, rau thơm, dưa leo, đồ chua cân lại vị đậm của thịt nướng.',
      },
      {
        name: 'Bún, đậu phộng',
        meaning: 'Bún tươi cho cuốn chắc tay, đậu phộng rang rắc lên nước chấm cho thơm bùi.',
      },
    ],
    tasting: [
      'Trải bánh tráng, xếp rau sống, dưa leo, đồ chua, một miếng bánh tráng chiên, ít bún, đặt xiên nem đã tuốt que, cuốn chặt rồi chấm ngập nước sốt. Thêm ớt tươi, tỏi tùy vị. Nước chấm thường có đậu phộng và tôm, người dị ứng nên hỏi trước.',
      'Nem nướng ăn bữa nào cũng được, nhưng hợp nhất là chiều tối khi bạn bè tụ tập. Gọi nem vừa ra lò để còn nóng giòn. Cứ tự tay cuốn, vụng một chút cũng được, đó mới là cách ăn của người địa phương.',
    ],
    facts: [
      'Nước chấm nem nướng Ninh Hòa có thể được nấu từ hơn chục nguyên liệu, liu riu nhiều giờ cho sánh lại.',
      'Ninh Hòa cách Nha Trang khoảng 30 km về phía bắc và nổi tiếng với cả nem chua lẫn nem nướng.',
      'Trong cuốn nem nướng Khánh Hòa thường có một thanh bánh tráng chiên giòn, tạo tiếng giòn đặc trưng.',
    ],
    reference: {
      label: 'Nem nướng — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Nem_n%C6%B0%E1%BB%9Bng',
    },
  },

  'mien-luon-nuoc': {
    homeland: 'Nghệ An · Hà Nội',
    era: 'Thế kỷ XX',
    tagline:
      'Lươn chiên giòn rụm trên sợi miến dong, nước dùng ngọt từ xương lươn và nắm rau răm cay nồng: một bát quà của đồng chiêm trũng.',
    origin: [
      'Lươn đồng sống trong ruộng lúa, bờ ao khắp Bắc Bộ và Bắc Trung Bộ, từng là món ăn của nhà nông trước khi lên bàn quán phố. Nghệ An là nơi biến con lươn thành cả một nền ẩm thực: súp lươn, cháo lươn, miến lươn, lươn om chuối đậu, lươn xào sả nghệ. Ở thành phố Vinh, hàng lươn mở từ sáng đến khuya, và súp lươn ăn với bánh mì hay bánh mướt là thứ người xứ Nghệ nhắc đầu tiên.',
      'Lươn kiểu Nghệ thường được lọc xương, chẻ đôi, xào với nghệ, hành, ớt, mắm, rồi rắc rau răm cho thơm. Hà Nội thì quen miến lươn ở phố Hàng Điếu và nhiều ngõ khác, bán cả miến nước lẫn miến trộn. Về sau, nhiều hàng Hà Nội dùng lươn lọc thái sợi, phơi se rồi chiên giòn, để miếng lươn xốp tan trong miệng, kiểu này nay lan sang cả các quán ở Vinh.',
      'Bát miến lươn nước gồm miến dong trụng mềm, lươn chiên giòn đặt lên trên, nước dùng ninh từ xương lươn, có nơi thêm xương lợn cho ngọt. Rắc hành phi, hành lá, rau răm, thêm giá trụng và vài lát ớt. Rau răm gần như bắt buộc, vì nó khử tanh và hợp với mùi lươn. Miến trộn thì lươn xào với miến, mộc nhĩ, giá, rưới chút nước dùng.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Lươn đồng là thực phẩm quen thuộc của nông dân Bắc Bộ, Bắc Trung Bộ.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Súp lươn, cháo lươn, miến lươn phổ biến ở Vinh; miến lươn có hàng chuyên ở phố cổ Hà Nội.',
      },
      {
        when: 'Gần đây',
        what: 'Lươn chiên giòn thành kiểu chế biến quen thuộc của các quán miến lươn Hà Nội.',
      },
      {
        when: 'Ngày nay',
        what: 'Miến lươn có mặt ở nhiều thành phố, với cả kiểu Nghệ An lẫn kiểu Hà Nội.',
      },
    ],
    meaning: [
      'Con lươn là sản vật mộc mạc nhất của đồng ruộng, có ngay dưới chân người cấy. Qua tay người nấu xứ Nghệ, nó thành món vừa ngon vừa được tin là bổ, thường nấu cho người ốm, người mới ốm dậy. Bát miến lươn vì thế có chút ý nghĩa của sự chăm sóc, bên cạnh cái no và cái ấm bụng.',
      'Với người Nghệ An, các món lươn là niềm tự hào quê nhà; ai đi xa về Vinh cũng muốn ăn một bát súp hay cháo lươn trước tiên. Ở Hà Nội, miến lươn lại là món quà sáng, quà chiều quen thuộc của phố cổ, mang mùi đồng chiêm vào lòng phố chật. Hai cách nấu, hai nhịp sống, cùng một con lươn và nhúm rau răm.',
    ],
    symbols: [
      {
        name: 'Lươn chiên giòn',
        meaning: 'Lươn lọc xương, thái sợi chiên vàng, giòn xốp, ăn nhanh khi chưa ngấm nước.',
      },
      { name: 'Miến dong', meaning: 'Sợi miến dai và trong, thấm nước dùng mà không nát.' },
      {
        name: 'Rau răm',
        meaning: 'Rau thơm cay nồng, khử mùi tanh, gần như không thể thiếu trong các món lươn.',
      },
      {
        name: 'Nước dùng xương lươn',
        meaning: 'Ninh từ xương lươn, có nơi thêm xương lợn, cho vị ngọt đậm.',
      },
      {
        name: 'Hành phi, giá, ớt',
        meaning: 'Hành phi, hành lá thơm, giá trụng giòn và ớt tươi cho thêm cay.',
      },
    ],
    tasting: [
      'Miến lươn ăn với chanh, ớt tươi, tiêu xay và thật nhiều rau răm. Ăn miếng lươn chiên khi còn giòn, đừng để ngâm lâu trong nước dùng. Ở Hà Nội, quẩy giòn là món kèm quen.',
      'Đây là món ăn sáng hoặc trưa, ngon nhất vào mùa đông. Nếu ghé Vinh, đừng chỉ ăn miến: gọi thêm bát súp lươn chấm bánh mì hay bánh mướt, nhiều ớt, nhiều tiêu, đúng kiểu xứ Nghệ.',
    ],
    facts: [
      'Súp lươn xứ Nghệ là nước dùng trong, ăn kèm bánh mì hoặc bánh mướt, khác hẳn kiểu súp đặc của phương Tây.',
      'Món lươn Nghệ An thường dùng nghệ, mắm, tiêu và rau răm làm gia vị chủ đạo.',
      'Lươn chiên giòn trong miến lươn Hà Nội thường được lọc, thái sợi, phơi se trước khi chiên để giòn lâu hơn.',
    ],
    reference: {
      label: 'Miến lươn — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Mi%E1%BA%BFn_l%C6%B0%C6%A1n',
    },
  },

  'bun-heo-quay': {
    homeland: 'Việt Nam',
    era: 'Thế kỷ XX',
    tagline:
      'Miếng heo quay da nổ giòn rụm trên bún mát, rau thơm và nước mắm chua ngọt: món của mâm cỗ đi vào bữa trưa bình thường.',
    origin: [
      'Heo quay ở Việt Nam có nhiều gốc. Ở các phố người Hoa, lò quay của người Quảng Đông làm ra món heo quay da giòn, xăm da, xát muối, quay lửa lớn cho bì nổ bông. Trên vùng núi phía Bắc, người Tày, Nùng ở Lạng Sơn có lợn quay lá mắc mật, nhồi lá vào bụng cho thơm. Còn ở làng quê miền Nam, con heo quay nguyên con là mâm lễ của đám hỏi, đám giỗ, ngày khai trương.',
      'Bún heo quay là cách đem miếng thịt của ngày lễ vào bữa thường. Món ăn này phổ biến từ Bắc vào Nam, nhưng quen nhất có lẽ ở Sài Gòn và miền Tây, nơi heo quay được trộn với bún, rau sống, đồ chua, chan nước mắm chua ngọt theo lối bún thịt nướng. Cùng họ với nó là bánh hỏi heo quay, cơm tấm heo quay, những món tận dụng một mẻ thịt ra lò buổi sáng.',
      'Bí quyết của cả món nằm ở miếng thịt. Thịt ba chỉ được luộc sơ, xăm thật dày lên bì, xát muối, giấm, ướp ngũ vị, tỏi, rồi quay hoặc nướng đến khi lớp da phồng lên như bánh đa, gõ vào nghe cộp cộp. Cắt miếng, đặt lên bún tươi cùng xà lách, rau thơm, dưa leo, đồ chua cà rốt củ cải, hành lá, rồi rưới nước mắm vừa đủ để da còn giòn.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Kỹ thuật quay heo có mặt ở nhiều cộng đồng, từ người Hoa đến người Tày, Nùng.',
      },
      { when: 'Thế kỷ XX', what: 'Lò heo quay da giòn phổ biến ở các thành phố Việt Nam.' },
      {
        when: 'Cuối thế kỷ XX',
        what: 'Bún heo quay thành món quen ở các quán ăn bình dân, nhất là phía Nam.',
      },
      { when: 'Ngày nay', what: 'Bún heo quay có mặt khắp cả nước với nhiều cách bày khác nhau.' },
    ],
    meaning: [
      'Heo quay vốn gắn với những ngày trọng: đám hỏi, đám giỗ, khai trương, cúng thần tài. Con heo quay đỏ au đặt giữa mâm là hình ảnh của sung túc, may mắn và thành ý của gia chủ. Khi miếng heo quay rời mâm lễ để nằm trên tô bún giá bình dân, người ăn thường ngày cũng được hưởng chút không khí hội hè ấy.',
      'Món ăn còn cho thấy cách ẩm thực Việt pha trộn: kỹ thuật quay của bếp người Hoa, cách ăn bún với rau sống và nước mắm của người Việt, gặp nhau mà không gượng ép. Kết quả là một tô bún giòn, béo, mát, chua ngọt trong cùng một đũa, dễ ăn đến mức người ta ít khi nghĩ nó đã đi qua bao nhiêu nền bếp.',
    ],
    symbols: [
      {
        name: 'Heo quay da giòn',
        meaning: 'Bì nổ giòn, thịt mềm thấm vị; lễ vật quen của mâm cỗ, biểu tượng của sung túc.',
      },
      { name: 'Bún tươi', meaning: 'Sợi bún mềm mát cân lại vị béo của thịt quay.' },
      {
        name: 'Nước mắm chua ngọt',
        meaning: 'Nước mắm pha chanh, đường, tỏi, ớt, kết nối mọi thứ trong tô.',
      },
      {
        name: 'Rau thơm, xà lách, dưa leo',
        meaning: 'Rau sống tươi mát giúp đỡ ngấy và làm món ăn nhẹ hơn.',
      },
      { name: 'Đồ chua', meaning: 'Cà rốt, củ cải ngâm chua ngọt tạo độ giòn và cân vị.' },
    ],
    tasting: [
      'Rưới nước mắm chua ngọt vừa đủ, trộn đều bún với rau sống, đồ chua, rắc thêm hành phi hay đậu phộng nếu quán có. Ớt tươi, tỏi thêm tùy ý. Ăn miếng heo quay trước khi bì kịp ngấm nước mắm, đó là lúc nó giòn nhất.',
      'Bún heo quay hợp bữa trưa, nhất là ngày nắng nóng, khi bún mát và rau sống giúp dễ chịu hơn. Một ly trà đá đi kèm là đủ.',
    ],
    facts: [
      'Lợn quay lá mắc mật của người Tày, Nùng ở Lạng Sơn là một trong những món heo quay nổi tiếng nhất Việt Nam.',
      'Để bì heo quay nổ giòn, người làm xăm da thành rất nhiều lỗ nhỏ và xát muối trước khi quay.',
      'Ở miền Nam, mâm heo quay nguyên con là lễ vật quen thuộc trong đám hỏi và lễ khai trương.',
    ],
    reference: {
      label: 'Heo quay — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Heo_quay',
    },
  },
};
