import type { DishStory } from './types';

export const STORIES_MORE_CENTRAL: Readonly<Record<string, DishStory>> = {
  'com-am-phu': {
    homeland: 'Huế',
    era: 'Khoảng đầu thế kỷ XX',
    tagline:
      'Cái tên nghe rợn người nhưng đĩa cơm thì rực rỡ bảy sắc: cơm âm phủ là trò đùa tinh nghịch của dân ăn đêm xứ Huế.',
    origin: [
      'Cơm âm phủ là một món cơm đĩa của Huế, gắn với những quán ăn mở về đêm trong lòng cố đô. Người Huế thường kể món này đã có từ khoảng đầu thế kỷ XX, khi một quán cơm nhỏ chỉ bán lúc trời tối, thắp đèn dầu leo lét, khách ngồi lố nhố trong ánh sáng mờ. Không có tư liệu thành văn nào ghi rõ năm ra đời hay người đầu tiên bán, nên mốc thời gian chỉ nên hiểu là ước lệ.',
      'Chuyện cái tên thì có nhiều giai thoại. Phổ biến nhất là chuyện một đêm quán mất đèn, khách vẫn ngồi ăn trong bóng tối và có người buột miệng ví bữa ăn ấy như ăn cơm dưới âm phủ. Một giai thoại khác, đậm màu sắc truyền miệng hơn, gắn món cơm với một vị vua triều Nguyễn vi hành ban đêm, ăn xong khen ngon và hỏi tên quán. Những câu chuyện ấy được kể lại nhiều nhưng không có bằng chứng, nên chỉ nên xem là tương truyền.',
      'Điều chắc chắn hơn là cấu trúc của đĩa cơm. Cơm trắng nóng được bày giữa đĩa, xung quanh là thịt heo nướng, lạp xưởng, chả, trứng chiên thái sợi, tôm chấy hoặc ruốc, dưa leo, đồ chua, rau thơm và đậu phộng rang. Tất cả được chan chút nước mắm pha rồi trộn đều. Vì nhiều màu sắc, người ta còn gọi đây là cơm bảy sắc, một cách gọi dễ nghe hơn cho khách phương xa. Ngày nay món cơm không còn chỉ bán về đêm, nhưng cái tên thì vẫn giữ nguyên như một lời trêu đùa với người lạ.',
    ],
    timeline: [
      {
        when: 'Khoảng đầu thế kỷ XX',
        what: 'Theo lời kể của người Huế, những quán cơm bán đêm trong cố đô bắt đầu dọn loại cơm trộn nhiều món này.',
      },
      {
        when: 'Giữa thế kỷ XX',
        what: 'Cái tên “cơm âm phủ” trở nên quen thuộc, đi kèm nhiều giai thoại truyền miệng về đêm mất đèn và vị vua vi hành.',
      },
      {
        when: 'Những thập niên gần đây',
        what: 'Món cơm vào thực đơn nhà hàng và lễ hội ẩm thực, được giới thiệu với du khách bằng tên gọi cơm bảy sắc.',
      },
    ],
    meaning: [
      'Cơm âm phủ cho thấy khiếu hài hước rất riêng của người Huế. Xứ sở vốn được nhìn như trầm mặc, nhiều đền đài lăng tẩm, lại đặt cho một đĩa cơm cái tên ma mị nhất có thể, như để trêu khách lạ và giữ chút bí ẩn cho món ăn. Người địa phương gọi tên ấy tỉnh bơ, còn du khách thì thường phải hỏi lại một lần mới dám gọi món.',
      'Đằng sau cái tên là một triết lý quen của bếp Huế: nhiều thứ nhỏ, mỗi thứ một chút, xếp cho đẹp rồi mới ăn. Một đĩa cơm bình thường được nâng lên bằng sự cầu kỳ trong khâu thái, khâu bày, giống cách người Huế bày mâm cỗ hay đĩa bánh. Món ăn cũng gắn với đời sống về đêm của thành phố, khi người đi làm muộn, người đi chơi khuya cần một bữa no, nóng và đủ vị trước khi về nhà.',
    ],
    symbols: [
      {
        name: 'Cơm trắng',
        meaning:
          'Nền trung tính để các màu và vị xung quanh nổi lên; phải là cơm nóng, hạt rời, đủ dẻo để trộn mà không nát.',
      },
      {
        name: 'Thịt heo nướng, lạp xưởng',
        meaning:
          'Phần mặn và thơm khói của đĩa cơm. Thịt ướp sả, nước mắm nướng than, lạp xưởng thái mỏng cho vị ngọt béo.',
      },
      {
        name: 'Trứng gà',
        meaning:
          'Thường được tráng mỏng rồi thái sợi, tạo dải vàng tươi, cũng là một trong những “sắc” làm nên tên gọi cơm bảy sắc.',
      },
      {
        name: 'Đồ chua, dưa leo',
        meaning: 'Cân lại vị béo của thịt và lạp xưởng, thêm độ giòn mát cho mỗi miếng.',
      },
      {
        name: 'Đậu phộng, rau thơm',
        meaning:
          'Đậu phộng rang giã dập cho vị bùi, rau thơm cho hương tươi; hai thứ nhỏ nhưng khiến đĩa cơm có chiều sâu.',
      },
    ],
    tasting: [
      'Khi đĩa cơm được dọn ra, người Huế thường ngắm một chút rồi mới chan nước mắm pha và trộn đều tay. Mục đích là để mỗi muỗng có đủ cơm, thịt, trứng, rau và chút đồ chua. Ai ăn cay thì thêm ớt tươi hoặc ớt màu, vốn là thứ gia vị gần như không thể thiếu trên bàn ăn Huế.',
      'Món cơm hợp nhất là vào buổi tối, đúng với tinh thần của cái tên. Đi kèm thường có một chén canh nóng để chan hoặc húp xen kẽ cho đỡ khô. Nếu muốn thử theo kiểu người địa phương, đừng ngại hỏi chủ quán về những món ăn kèm có sẵn trong ngày, vì mỗi quán bày đĩa cơm một kiểu.',
    ],
    facts: [
      'Cái tên “cơm âm phủ” được giải thích bằng nhiều giai thoại khác nhau, nhưng không có tư liệu nào xác nhận câu chuyện nào là thật.',
      'Món ăn còn được gọi là cơm bảy sắc vì các thành phần nhiều màu bày quanh phần cơm trắng.',
      'Dù tên gắn với bóng đêm, ngày nay nhiều quán ở Huế bán món này cả vào buổi trưa.',
    ],
    reference: {
      label: 'Ẩm thực Việt Nam — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/%E1%BA%A8m_th%E1%BB%B1c_Vi%E1%BB%87t_Nam',
    },
  },

  'cao-lau': {
    homeland: 'Hội An',
    era: 'Có nhiều giả thuyết, thường gắn với thương cảng thế kỷ XVII',
    tagline:
      'Sợi mì vàng dai nhuốm mùi tro, xá xíu thơm và rau Trà Quế: cao lầu là món ăn khó mang đi nhất của phố cổ Hội An.',
    origin: [
      'Cao lầu là món mì đặc trưng của Hội An, đô thị cổ bên sông Thu Bồn, nay thuộc thành phố Đà Nẵng sau đợt sắp xếp đơn vị hành chính năm 2025. Từ khoảng thế kỷ XVI đến XVIII, Hội An là thương cảng sầm uất, nơi thương nhân Nhật Bản, Trung Hoa, Bồ Đào Nha và Hà Lan đến buôn bán, người Nhật và người Hoa còn lập phố riêng. Vì thế, câu hỏi cao lầu sinh ra từ đâu thường được đặt trong bối cảnh giao thoa ấy.',
      'Có nhiều giả thuyết về nguồn gốc. Một thuyết cho rằng sợi cao lầu chịu ảnh hưởng của mì udon do người Nhật mang tới; thuyết khác cho rằng món ăn có gốc từ bếp người Hoa, với miếng xá xíu và mảnh da hoành thánh chiên. Chưa có tư liệu nào đủ chắc để khẳng định. Cái tên cũng được giải thích theo nhiều cách, phổ biến nhất là chuyện ngày trước món này được bán và ăn trên lầu cao của các quán ăn, nên gọi là cao lầu.',
      'Dù gốc gác còn tranh luận, cách làm sợi cao lầu thì rất riêng. Gạo được ngâm với nước tro, theo lời kể của người làm nghề là tro củi từ một số loại cây ở Cù Lao Chàm, rồi xay, nhồi, hấp, cán và cắt sợi. Nhờ vậy sợi có màu vàng nhạt, dai và có mùi tro thoang thoảng. Người Hội An còn truyền nhau rằng phải dùng nước giếng Bá Lễ mới ra sợi chuẩn, một chi tiết nên hiểu như niềm tự hào địa phương hơn là quy tắc khoa học. Món ăn gần như không có nước, chỉ chan ít nước xá xíu sánh, khác hẳn mì Quảng của vùng lân cận.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XVI – XVIII',
        what: 'Hội An là thương cảng quốc tế, nơi người Nhật và người Hoa lập phố, tạo bối cảnh cho các giả thuyết về nguồn gốc cao lầu.',
      },
      {
        when: 'Thế kỷ XIX – XX',
        what: 'Cao lầu dần trở thành món ăn quen của phố cổ, sợi được làm thủ công bởi một số gia đình theo cách ngâm nước tro.',
      },
      {
        when: 'Năm 1999',
        what: 'Phố cổ Hội An được UNESCO công nhận là Di sản Văn hóa Thế giới, kéo theo làn sóng du khách tìm đến cao lầu.',
      },
      {
        when: 'Năm 2025',
        what: 'Hội An trở thành một phần của thành phố Đà Nẵng sau đợt sáp nhập đơn vị hành chính.',
      },
    ],
    meaning: [
      'Với người Hội An, cao lầu là món ăn của riêng phố. Họ hay nói cao lầu ngon nhất là ăn ngay tại Hội An, vì sợi làm theo lối cũ khó giữ được độ dai khi mang đi xa, và vì nguyên liệu như rau Trà Quế gắn với một làng rau cụ thể. Chính tính “khó mang đi” ấy khiến món ăn trở thành một lý do để người ta phải tìm đến tận nơi.',
      'Cao lầu cũng là một bằng chứng sống của lịch sử giao thương. Trong một tô nhỏ có thể thấy dấu vết của nhiều nền bếp: miếng xá xíu gợi bếp người Hoa, sợi mì dày gợi những liên tưởng đến Nhật Bản, còn rau sống, nước mắm và cách ăn trộn lại hoàn toàn Việt. Dù không ai chứng minh được giả thuyết nào, cuộc tranh luận ấy tự nó đã nói lên Hội An từng là nơi gặp gỡ của nhiều dòng người.',
    ],
    symbols: [
      {
        name: 'Sợi cao lầu',
        meaning:
          'Sợi gạo ngâm nước tro, dày và dai, màu vàng nhạt. Đây là linh hồn của món ăn và cũng là thứ khó làm nhất.',
      },
      {
        name: 'Thịt xá xíu',
        meaning:
          'Thịt heo ướp ngũ vị, đường và nước tương rồi rim hoặc nướng; nước rim sánh được dùng làm phần nước chan.',
      },
      {
        name: 'Hoành thánh chiên',
        meaning:
          'Những miếng da hoành thánh hay bánh tráng chiên giòn rắc lên trên, tạo tiếng giòn tương phản với sợi mì dai.',
      },
      {
        name: 'Rau thơm, giá đỗ',
        meaning:
          'Rau sống Trà Quế với húng, diếp cá, tần ô và giá chần lót dưới đáy tô, mang hương tươi của làng rau ven sông.',
      },
      {
        name: 'Hành phi',
        meaning: 'Rắc một nhúm cuối cùng để dậy mùi, làm phần nước xá xíu thơm và béo hơn.',
      },
    ],
    tasting: [
      'Cao lầu được ăn như một món trộn: dùng đũa đảo đều từ đáy tô để rau, sợi mì, xá xíu và chút nước chan quyện vào nhau. Người Hội An thích thêm một muỗng ớt tương hoặc ớt xanh và vắt vài giọt chanh. Đừng chờ có nước lèo như ăn phở, vì lượng nước ít là đúng kiểu.',
      'Nên ăn ngay khi tô vừa dọn ra, lúc miếng hoành thánh còn giòn và rau còn tươi. Ăn sáng hay trưa đều hợp, nhưng ngồi một quán nhỏ trong phố cổ, nhìn mái ngói rêu phong, là cách ăn được nhiều người nhớ nhất.',
    ],
    facts: [
      'Sợi cao lầu truyền thống được làm từ gạo ngâm nước tro, khác với nhiều loại sợi gạo khác ở Việt Nam.',
      'Người Hội An truyền nhau rằng nước giếng Bá Lễ là bí quyết làm sợi, dù đây là niềm tin địa phương hơn là điều đã được kiểm chứng.',
      'Rau ăn kèm cao lầu thường được nhắc gắn với làng rau Trà Quế, một làng trồng rau lâu đời ở Hội An.',
    ],
    reference: {
      label: 'Cao lầu — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/Cao_l%E1%BA%A7u',
    },
  },

  'bun-cha-ca-da-nang': {
    homeland: 'Đà Nẵng',
    era: 'Thế kỷ XX',
    tagline:
      'Cá biển xay quết thành chả, nước dùng ngọt từ xương và bí đỏ: bún chả cá là bữa sáng mặn mòi của thành phố biển Đà Nẵng.',
    origin: [
      'Bún chả cá là món ăn quen của dải ven biển Nam Trung Bộ, và Đà Nẵng là nơi món này phổ biến đến mức gần như phố nào cũng có quán. Không có mốc ghi chép rõ ràng về thời điểm ra đời; người ta chỉ có thể nói món ăn lớn lên từ nghề cá và nghề làm chả cá vốn có từ lâu ở các làng chài miền Trung, rồi theo người bán gánh vào phố trong thế kỷ XX.',
      'Chả cá ở Đà Nẵng thường làm từ các loại cá biển như cá thu, cá mối, cá nhồng, cá chuồn, tùy mùa và tùy nhà. Thịt cá được lóc, giã hoặc quết thật kỹ với tiêu, hành, tỏi và chút nước mắm cho đến khi dẻo, rồi đem hấp hoặc chiên. Có nơi làm hai loại: chả hấp trắng mềm và chả chiên vàng dai, thái lát xếp chung trong tô. Quy Nhơn và Nha Trang cũng nổi tiếng với bún chả cá, mỗi nơi một kiểu nêm.',
      'Điểm làm nên giọng Đà Nẵng nằm ở nồi nước dùng. Xương cá, xương heo được ninh cùng bí đỏ, cà chua, thơm, cho nước có vị ngọt thanh và màu vàng cam nhẹ. Bí đỏ thái miếng được ninh mềm, thường có trong tô như một phần của món chứ không chỉ là nguyên liệu nấu nước. Bún tươi sợi nhỏ, hành lá, ớt, cùng đĩa rau sống và chén mắm ruốc đặt trên bàn đã hoàn tất một tô bún rất riêng của thành phố biển.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Các làng chài miền Trung làm chả cá để tận dụng và bảo quản cá biển đánh bắt được.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bún chả cá trở thành món ăn sáng quen thuộc ở các đô thị ven biển như Đà Nẵng, Quy Nhơn, Nha Trang.',
      },
      {
        when: 'Những năm gần đây',
        what: 'Bún chả cá Đà Nẵng được giới thiệu rộng rãi như một đặc sản của thành phố, xuất hiện nhiều trong cẩm nang du lịch.',
      },
    ],
    meaning: [
      'Bún chả cá phản ánh mối quan hệ gắn bó giữa người miền Trung và biển. Cá đánh được nhiều thì làm chả, chả làm ra thì nấu bún, mọi thứ quay vòng quanh con thuyền và chợ cá buổi sớm. Một tô bún vì thế không chỉ là bữa sáng mà còn là sản phẩm của cả một chuỗi công việc: người đi biển, người làm chả, người nấu nước dùng.',
      'Với người Đà Nẵng, bún chả cá là món ăn của nhịp sống hằng ngày, rẻ, nhanh và no. Nó cũng là món mà người xa quê hay nhớ nhất, bởi vị ngọt của cá biển tươi rất khó tìm lại ở nơi khác. Nhiều gia đình vẫn đặt chả cá ở một lò quen, dùng không chỉ để nấu bún mà còn để kho, để cuốn bánh tráng hay đem làm quà.',
    ],
    symbols: [
      {
        name: 'Chả cá',
        meaning:
          'Cá biển quết dẻo rồi hấp hoặc chiên; chả ngon có độ dai giòn, thơm cá mà không tanh.',
      },
      {
        name: 'Bún tươi',
        meaning: 'Sợi bún nhỏ, mềm, trụng qua nước sôi để giữ độ nóng cho cả tô.',
      },
      {
        name: 'Bí đỏ',
        meaning: 'Vừa làm ngọt nước dùng vừa là một phần ăn trong tô, mềm bùi và mang màu ấm.',
      },
      {
        name: 'Cà chua',
        meaning: 'Cho nước dùng chút chua dịu và sắc đỏ, cân lại vị ngọt của xương và bí.',
      },
      {
        name: 'Hành lá, ớt',
        meaning: 'Hành cho hương, ớt cho cái cay nồng mà người miền Trung khó lòng bỏ qua.',
      },
    ],
    tasting: [
      'Người Đà Nẵng ăn bún chả cá với một đĩa rau sống gồm xà lách, bắp chuối bào, rau thơm, và nhất định phải có chén mắm ruốc trên bàn. Chỉ thêm một chút mắm ruốc vào tô là nước dùng đậm hẳn lên. Ớt tươi hoặc ớt sa tế tùy khẩu vị, chanh vắt vừa phải.',
      'Hãy húp nước trước để cảm nhận vị ngọt của cá và bí, sau đó mới nêm thêm. Chả cá nên ăn khi còn nóng để giữ độ dai. Món này hợp nhất vào buổi sáng, ở một quán nhỏ gần chợ, khi chả vừa được giao từ lò.',
    ],
    facts: [
      'Chả cá dùng cho bún ở Đà Nẵng có thể làm từ nhiều loại cá biển, tùy theo mùa đánh bắt.',
      'Bí đỏ trong nồi nước dùng là chi tiết giúp phân biệt bún chả cá Đà Nẵng với nhiều nơi khác.',
      'Quy Nhơn và Nha Trang cũng có bún chả cá nổi tiếng, mỗi nơi một cách nấu nước và làm chả.',
    ],
    reference: {
      label: 'Bún — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%BAn',
    },
  },

  'banh-beo-hue': {
    homeland: 'Huế',
    era: 'Thế kỷ XIX – XX',
    tagline:
      'Mỗi chén sành nhỏ một lớp bột gạo mỏng, rắc tôm chấy và tóp mỡ: bánh bèo là thứ quà chiều nhỏ nhắn, tinh tế của Huế.',
    origin: [
      'Bánh bèo là một trong những món bánh tiêu biểu của Huế, thường được xếp chung trong bộ ba bánh bèo, bánh nậm, bánh lọc mà người Huế gọi chung là bánh Huế. Tên gọi được giải thích khá thống nhất: hình dáng chiếc bánh mỏng, tròn, hơi trũng ở giữa trông như chiếc lá bèo nổi trên mặt ao. Không có ghi chép nào xác định thời điểm ra đời, nhưng món bánh đã rất quen thuộc với đời sống Huế ít nhất từ thời Huế còn là kinh đô nhà Nguyễn.',
      'Có ý kiến cho rằng bánh bèo xuất phát từ bếp dân gian rồi được tinh chỉnh dưới ảnh hưởng của lối ăn cầu kỳ nơi kinh thành, nơi món ăn phải nhỏ, đẹp và nhiều món. Đây là cách giải thích hợp lý nhưng chưa có tài liệu khẳng định. Điều có thể nói chắc là kiểu bánh bèo chén, đổ trong những chiếc chén sành nhỏ rồi hấp, bày cả mâm chén cho khách tự ăn, là nét riêng của Huế.',
      'Bột gạo được ngâm, xay, pha loãng rồi đổ vào chén, hấp đến khi mặt bánh trắng đục và mịn. Trên mặt rắc tôm chấy, tức tôm giã nhỏ rang khô đến khi tơi và cam đỏ, thêm tóp mỡ hoặc da heo chiên giòn, mỡ hành. Chén nước mắm pha ngọt, cay được rưới lên trước khi ăn. Bánh bèo cũng có mặt ở Quảng Nam, Bình Định hay miền Nam, nhưng mỗi nơi một dáng bánh, một loại nhân và một kiểu nước chấm.',
    ],
    timeline: [
      {
        when: 'Thời nhà Nguyễn (1802 – 1945)',
        what: 'Huế là kinh đô, lối ăn nhiều món nhỏ, cầu kỳ góp phần định hình các loại bánh Huế.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bánh bèo chén trở thành thứ quà quen của các quán bánh Huế, thường bán kèm bánh nậm, bánh lọc.',
      },
      {
        when: 'Những thập niên gần đây',
        what: 'Bánh bèo Huế được giới thiệu rộng rãi tới du khách, có mặt trong các lễ hội ẩm thực và Festival Huế.',
      },
    ],
    meaning: [
      'Bánh bèo nói lên cái tinh tế của người Huế trong ăn uống. Một chén bánh chỉ vài muỗng, nhưng người ta không ăn một chén mà ăn cả mâm, chậm rãi, vừa ăn vừa chuyện trò. Đó là món của buổi chiều, của những cuộc hẹn bạn bè, của những lần về quê được mẹ đãi một mâm bánh nhỏ.',
      'Cách ăn bánh bèo cũng gợi tính tiết kiệm và khéo léo. Bột gạo, tôm đồng và chút mỡ heo đều là thứ sẵn có, không đắt đỏ, nhưng qua bàn tay người Huế lại thành món ăn trông duyên dáng như một món quà. Vì vậy bánh bèo thường được xem là ví dụ điển hình cho câu nói rằng ẩm thực Huế biến cái giản dị thành cái thanh tao.',
    ],
    symbols: [
      {
        name: 'Bánh bèo',
        meaning:
          'Lớp bột gạo hấp trong chén nhỏ, mỏng và mềm, mặt hơi trũng giữ lấy nhân và nước mắm.',
      },
      {
        name: 'Tôm chấy',
        meaning:
          'Tôm giã nhỏ rang khô đến khi tơi màu cam, cho vị ngọt mặn và sắc màu nổi bật trên nền trắng.',
      },
      {
        name: 'Da heo chiên giòn',
        meaning: 'Tóp mỡ hay da heo chiên giòn tạo độ béo và tiếng giòn, tương phản với bánh mềm.',
      },
      {
        name: 'Hành lá',
        meaning: 'Thường được phi với mỡ thành mỡ hành, phết lên mặt bánh cho thơm và bóng.',
      },
      {
        name: 'Nước mắm, ớt',
        meaning: 'Nước mắm pha ngọt nhẹ, cay rõ, rưới thẳng vào từng chén là cái hồn của món.',
      },
    ],
    tasting: [
      'Người Huế ăn bánh bèo chén bằng một chiếc que tre hoặc thìa nhỏ, rưới nước mắm vào chén rồi gạt nhẹ một vòng cho bánh rời khỏi thành chén, xúc ăn từng miếng. Ăn hết chén này mới chuyển sang chén khác, nên một mâm bánh có thể kéo dài khá lâu.',
      'Muốn ăn đúng kiểu Huế thì đừng ngại cay, vì nước mắm ở đây thường được pha khá nhiều ớt. Bánh bèo hợp với buổi chiều hoặc làm món ăn chơi, và thường được gọi kèm bánh nậm, bánh lọc để có đủ ba vị bánh Huế trong một bữa.',
    ],
    facts: [
      'Tên bánh bèo xuất phát từ hình dáng chiếc bánh giống lá bèo nổi trên mặt nước.',
      'Bánh bèo Huế thường được đổ và dọn ngay trong những chiếc chén sành nhỏ, mỗi người ăn cả mâm chén.',
      'Ở miền Nam, bánh bèo thường được ăn với nước cốt dừa, đậu xanh và nhân tôm, khác hẳn kiểu Huế.',
    ],
    reference: {
      label: 'Bánh bèo — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_b%C3%A8o',
    },
  },

  'banh-nam': {
    homeland: 'Huế',
    era: 'Thế kỷ XIX – XX',
    tagline:
      'Mỏng như tờ giấy trong lớp lá chuối, mềm tan ở đầu lưỡi: bánh nậm là món bánh kín đáo và dịu dàng nhất của Huế.',
    origin: [
      'Bánh nậm là món bánh hấp của Huế, làm từ bột gạo pha loãng, trải thật mỏng trên lá chuối, rắc nhân tôm thịt rồi gấp lại thành hình chữ nhật dẹt và đem hấp chín. Cùng với bánh bèo và bánh lọc, bánh nậm thuộc nhóm bánh mà người Huế gọi chung là bánh Huế, thường được bán ở cùng một quán, dọn cùng một mâm.',
      'Nguồn gốc cụ thể của bánh nậm không được ghi chép rõ. Người ta chỉ biết đây là món bánh dân gian lâu đời của vùng Huế, được làm cả trong gia đình lẫn ngoài hàng quán, và phổ biến từ khoảng thời Huế là kinh đô. Tên gọi “nậm” cũng chưa có giải thích thống nhất; một số người cho rằng nó liên quan đến hình dáng hay cách gói, nhưng chưa có cơ sở chắc chắn, nên tốt hơn là để ngỏ.',
      'Điều làm bánh nậm khác biệt là độ mỏng. Bột gạo, có khi pha thêm chút bột năng, được khuấy trên lửa đến khi sệt rồi trải một lớp rất mỏng lên lá chuối đã lau sạch. Nhân là tôm và thịt heo băm nhỏ, xào với hành, nêm nước mắm, tiêu, có nơi dùng tôm chấy. Sau khi hấp, bánh mềm, trong trong, thoảng mùi lá chuối. Ở Quảng Nam và một số nơi miền Trung cũng có bánh nậm, nhưng kiểu Huế vẫn được nhắc đến như chuẩn mực.',
    ],
    timeline: [
      {
        when: 'Thời nhà Nguyễn (1802 – 1945)',
        what: 'Bánh nậm cùng các loại bánh hấp khác trở nên phổ biến trong đời sống kinh đô Huế.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bánh nậm được bán ở các quán bánh Huế, thường cùng mâm với bánh bèo và bánh lọc.',
      },
      {
        when: 'Hiện nay',
        what: 'Bánh nậm được làm sẵn, đóng gói và mang đi xa, trở thành món quà quê của người Huế.',
      },
    ],
    meaning: [
      'Bánh nậm mang dáng vẻ kín đáo, giống tính cách thường được gán cho người Huế. Chiếc bánh không phô ra màu sắc rực rỡ mà nằm gọn trong lá chuối, phải mở ra mới thấy lớp bánh trắng mỏng và nhân tôm thịt hồng nhạt bên trong. Cái ngon của nó cũng nhẹ nhàng, không đậm đà ngay mà thấm dần theo từng miếng.',
      'Làm bánh nậm đòi hỏi sự khéo tay và kiên nhẫn: trải bột đều mà không rách, gói cho gọn, hấp vừa lửa. Vì thế, trong nhiều gia đình Huế, làm bánh là dịp để các thế hệ phụ nữ ngồi bên nhau, người lớn chỉ dạy người nhỏ. Mâm bánh nậm cũng thường xuất hiện trong những buổi họp mặt, đám giỗ, như một món ăn nhẹ để tiếp khách.',
    ],
    symbols: [
      {
        name: 'Bột gạo',
        meaning:
          'Nấu sệt rồi trải mỏng trên lá chuối; độ mỏng và mịn là thước đo tay nghề người làm bánh.',
      },
      {
        name: 'Tôm',
        meaning: 'Tôm băm hoặc giã nhỏ, xào săn, cho vị ngọt và màu hồng trên nền bánh trắng.',
      },
      {
        name: 'Thịt heo',
        meaning: 'Thịt băm xào cùng tôm, thêm vị béo và độ đầy đặn cho phần nhân mỏng.',
      },
      {
        name: 'Hành lá',
        meaning: 'Phi thơm trong nhân hoặc rắc lên mặt bánh trước khi gấp lá, cho mùi dịu.',
      },
      {
        name: 'Nước mắm',
        meaning: 'Pha ngọt, cay, có thể thêm tỏi; chấm hoặc rưới lên từng miếng bánh khi ăn.',
      },
    ],
    tasting: [
      'Khi ăn, bóc lớp lá chuối, dùng đũa hoặc thìa gạt chiếc bánh ra, rồi chấm hoặc rưới nước mắm ngọt pha ớt. Bánh mỏng nên ăn rất nhanh, một người có thể ăn cả chục chiếc mà không thấy ngán.',
      'Bánh nậm ngon nhất khi còn ấm, lúc lớp bột vẫn mềm và mùi lá chuối còn rõ. Nếu ghé quán bánh Huế, hãy gọi một mâm thập cẩm để so cái mỏng của bánh nậm với cái dai của bánh lọc và cái mềm của bánh bèo.',
    ],
    facts: [
      'Bánh nậm thường được gói dẹt hình chữ nhật trong lá chuối, khác với nhiều loại bánh gói lá khác có dạng dày.',
      'Lớp bột của bánh nậm được trải rất mỏng, đến mức nhìn qua lá có thể thấy màu nhân bên trong.',
      'Bánh nậm, bánh bèo và bánh lọc thường được bán chung trong một quán, gọi chung là bánh Huế.',
    ],
    reference: {
      label: 'Bánh nậm — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_n%E1%BA%ADm',
    },
  },

  'banh-bot-loc': {
    homeland: 'Huế · Quảng Bình',
    era: 'Thế kỷ XIX – XX',
    tagline:
      'Lớp bột năng trong suốt để lộ con tôm đỏ au còn nguyên vỏ: bánh bột lọc là món bánh vừa dai vừa duyên của xứ Huế.',
    origin: [
      'Bánh bột lọc, người Huế gọi ngắn là bánh lọc, là món bánh làm từ bột năng, tức tinh bột chiết từ củ khoai mì. Khi hấp hoặc luộc chín, bột năng chuyển từ trắng đục sang trong suốt, để lộ nhân tôm thịt bên trong. Tên “bột lọc” được giải thích là từ công đoạn lọc tinh bột để lấy bột trắng mịn. Huế là nơi món bánh nổi tiếng nhất, nhưng Quảng Bình, Quảng Trị và nhiều tỉnh miền Trung cũng có kiểu riêng.',
      'Không có tài liệu nào cho biết chính xác bánh bột lọc xuất hiện từ khi nào. Khoai mì vốn là cây trồng du nhập vào châu Á qua các tuyến giao thương từ châu Mỹ, rồi trở nên phổ biến ở Việt Nam, nên món bánh dùng bột năng nhiều khả năng hình thành muộn hơn các loại bánh bột gạo. Dù vậy, bánh lọc đã đi vào đời sống ẩm thực Huế lâu đến mức được xem là món bánh truyền thống.',
      'Bánh lọc Huế có hai kiểu chính. Bánh lọc gói lá chuối được gói thành thỏi dài, dẹt rồi hấp; bánh lọc trần thì nặn tròn hoặc hình bán nguyệt, luộc trực tiếp và thường ăn kèm mỡ hành. Nhân truyền thống là tôm để nguyên vỏ, rim mặn ngọt với nước mắm cùng miếng thịt ba chỉ. Để nguyên vỏ giúp con tôm giữ màu đỏ đẹp và vị ngọt đậm. Một số nơi bóc vỏ cho dễ ăn, nhưng người sành vẫn chuộng kiểu cũ.',
    ],
    timeline: [
      {
        when: 'Khoảng thế kỷ XIX',
        what: 'Khoai mì và bột năng trở nên phổ biến hơn ở miền Trung, tạo nguyên liệu cho các loại bánh dai, trong.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bánh lọc trở thành món quen của quán bánh Huế, có hai dạng gói lá và trần.',
      },
      {
        when: 'Hiện nay',
        what: 'Bánh lọc được bán khắp cả nước, nhiều nơi đóng gói cấp đông làm quà từ Huế và Quảng Bình.',
      },
    ],
    meaning: [
      'Bánh lọc là món bánh của người Huế bình dân, rẻ, no và dễ làm, nhưng vẫn mang tính thẩm mỹ cao. Lớp bột trong như thủy tinh, con tôm đỏ nằm giữa, chấm thêm hành xanh: chỉ nhìn thôi cũng thấy được sự chăm chút. Không ít người Huế xa quê kể rằng hương vị bánh lọc gợi nhớ những buổi chiều mưa ngồi ăn bánh với gia đình.',
      'Món bánh cũng gắn với các dịp giỗ chạp, họp mặt ở miền Trung. Một mâm bánh lọc gói lá có thể chuẩn bị từ sớm, hấp lại khi khách đến, tiện mà vẫn tươm tất. Ở Quảng Bình, bánh lọc còn là món ăn vặt quen thuộc của trẻ em sau giờ học, cho thấy món bánh đã vượt khỏi phạm vi một thành phố để thành ký ức chung của cả dải đất miền Trung.',
    ],
    symbols: [
      {
        name: 'Bột năng',
        meaning:
          'Tinh bột khoai mì nhào với nước sôi, khi chín trong suốt và dai, tạo nên vẻ ngoài đặc trưng của bánh.',
      },
      {
        name: 'Tôm',
        meaning: 'Theo kiểu Huế thường để nguyên vỏ, rim với nước mắm cho đậm và giữ màu đỏ au.',
      },
      {
        name: 'Thịt heo',
        meaning: 'Miếng thịt ba chỉ nhỏ rim cùng tôm, cho vị béo cân bằng với vỏ bánh thanh.',
      },
      {
        name: 'Hành lá, hành phi',
        meaning: 'Mỡ hành rưới lên bánh lọc trần, hành phi rắc lên cho thơm và thêm vị bùi.',
      },
      {
        name: 'Nước mắm',
        meaning: 'Pha ngọt, cay, dùng để chấm hoặc chan; vị mặn ngọt làm bánh bớt nhạt.',
      },
    ],
    tasting: [
      'Với bánh lọc gói lá, bóc lá rồi chấm bánh vào nước mắm ớt; với bánh lọc trần, rưới mỡ hành và nước mắm ngay trên đĩa. Người Huế nhai cả con tôm lẫn vỏ, vì vỏ đã được rim mềm và đậm vị.',
      'Bánh lọc ngon nhất khi còn nóng hoặc ấm, vì để nguội lâu bột năng sẽ cứng và mất độ trong. Nếu mua làm quà, hãy hấp lại vài phút trước khi ăn để bánh dai mềm như vừa ra lò.',
    ],
    facts: [
      'Bột năng được làm từ củ khoai mì, loại cây có nguồn gốc từ châu Mỹ.',
      'Bánh lọc Huế truyền thống dùng tôm để nguyên vỏ, nhai giòn sần sật.',
      'Bánh lọc có hai kiểu chính: gói trong lá chuối để hấp và bánh trần luộc trực tiếp.',
    ],
    reference: {
      label: 'Bánh bột lọc — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_b%E1%BB%99t_l%E1%BB%8Dc',
    },
  },

  'com-hen': {
    homeland: 'Huế (Cồn Hến)',
    era: 'Lâu đời, không rõ mốc',
    tagline:
      'Cơm nguội, hến xào, nước hến nóng và một thìa ớt đỏ: cơm hến là món ăn của người nghèo đã thành đặc sản xứ Huế.',
    origin: [
      'Cơm hến gắn liền với Cồn Hến, một cồn đất nổi giữa sông Hương, nằm về phía Vĩ Dạ. Người dân nơi đây từ lâu sống bằng nghề cào hến dưới lòng sông, và hến trở thành nguyên liệu chính trong bữa ăn hằng ngày. Từ thứ hải sản nhỏ bé, rẻ tiền ấy, người Cồn Hến làm nên cơm hến, bún hến, mì hến rồi gánh đi bán khắp các ngả đường Huế.',
      'Không có ghi chép nào xác định chính xác cơm hến ra đời khi nào; người Huế chỉ nói đây là món ăn lâu đời của dân lao động. Điều thú vị là món này thường dùng cơm nguội chứ không phải cơm nóng. Theo cách giải thích phổ biến, đó là thói quen tận dụng cơm thừa của các gia đình nghèo, trộn với hến và rau để có bữa ăn no mà tiết kiệm. Từ món ăn cứu đói, cơm hến dần trở thành đặc sản.',
      'Một bát cơm hến truyền thống có rất nhiều thành phần: cơm nguội, hến xào, rau sống thái nhỏ như bắp chuối, rau thơm, giá, khế, thêm đậu phộng rang, tóp mỡ hoặc da heo chiên, bánh tráng nướng bóp vụn, mắm ruốc, ớt và tiêu. Nước luộc hến được giữ nóng, chan vào khi ăn hoặc húp riêng. Sự kết hợp giữa cơm nguội và nước hến nóng, giữa giòn, cay, chua, bùi tạo nên cái vị khó lẫn của món ăn.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Cư dân Cồn Hến sống bằng nghề cào hến trên sông Hương, dùng hến làm món ăn hằng ngày.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Gánh cơm hến, bún hến từ Cồn Hến đi khắp phố phường Huế, trở thành món quà sáng quen thuộc.',
      },
      {
        when: 'Những thập niên gần đây',
        what: 'Cơm hến được giới thiệu như một đặc sản tiêu biểu của Huế, xuất hiện trong các hội chợ và lễ hội ẩm thực.',
      },
    ],
    meaning: [
      'Cơm hến là câu chuyện về sự khéo léo trong thiếu thốn. Hến là thứ có sẵn dưới sông, cơm nguội là thứ còn lại sau bữa, rau là rau vườn, vậy mà người Huế biến chúng thành một món ăn nhiều tầng hương vị. Nhiều người Huế coi cơm hến như biểu tượng của tinh thần bình dân, gần gũi trong ẩm thực cố đô, bên cạnh những món cầu kỳ của bếp cung đình.',
      'Với người Huế, cơm hến còn là bài kiểm tra khả năng ăn cay. Ớt trong cơm hến thường rất nhiều, và người địa phương có thể ăn xuýt xoa mà vẫn khen ngon. Món ăn vì thế cũng thường được nhắc tới khi nói về cá tính ẩm thực Huế: nhỏ nhẹ trong cách bày nhưng đậm và cay trong vị.',
    ],
    symbols: [
      {
        name: 'Hến',
        meaning: 'Hến sông Hương nhỏ, ngọt, xào với gia vị; nước luộc hến dùng làm phần nước chan.',
      },
      {
        name: 'Cơm trắng',
        meaning: 'Truyền thống dùng cơm nguội, giữ hạt rời và tạo độ tương phản với nước hến nóng.',
      },
      {
        name: 'Rau thơm, giá đỗ',
        meaning: 'Bắp chuối, rau thơm, giá và khế thái nhỏ, cho độ tươi, giòn và chút chua chát.',
      },
      {
        name: 'Đậu phộng, da heo chiên giòn',
        meaning: 'Hai thứ tạo độ bùi và giòn, giúp bát cơm có nhiều lớp kết cấu.',
      },
      {
        name: 'Ớt',
        meaning:
          'Ớt bột, ớt tươi hay ớt màu, phần không thể thiếu và thường được cho rất mạnh tay.',
      },
    ],
    tasting: [
      'Trộn đều bát cơm cho hến, rau, đậu phộng và mắm ruốc quyện vào nhau, sau đó ăn kèm hoặc chan một chút nước hến nóng. Nếu chưa quen cay, hãy dặn trước người bán bớt ớt, vì phần ớt tiêu chuẩn của Huế có thể khiến người lạ chảy nước mắt.',
      'Cơm hến được ăn quanh năm, từ sáng đến tối. Thử ngồi ở một quán nhỏ gần Cồn Hến hoặc trên các con đường ven sông Hương để có không khí đúng nhất. Đừng bỏ qua miếng bánh tráng nướng, bóp vụn rắc vào để có tiếng giòn.',
    ],
    facts: [
      'Cơm hến truyền thống dùng cơm nguội, trái với thói quen ăn cơm nóng của phần lớn các món cơm khác.',
      'Cồn Hến là cồn đất giữa sông Hương, nơi gắn với nghề cào hến và món cơm hến.',
      'Ngoài cơm hến, từ hến người Huế còn làm bún hến, mì hến và bánh tráng xúc hến.',
    ],
    reference: {
      label: 'Cơm hến — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/C%C6%A1m_h%E1%BA%BFn',
    },
  },

  'banh-canh-ca-loc': {
    homeland: 'Quảng Trị · Huế',
    era: 'Thế kỷ XX',
    tagline:
      'Sợi bánh canh dẻo trong nồi nước sánh, cá lóc đồng ngọt chắc và váng ớt đỏ: bánh canh cá lóc là món ấm lòng của dải đất gió Lào.',
    origin: [
      'Bánh canh là món ăn có mặt ở khắp Việt Nam, nhưng bánh canh cá lóc gắn chặt nhất với vùng Quảng Trị và Huế. Ở đây, cá lóc đồng từ ruộng lúa, kênh mương là nguồn thực phẩm quen thuộc, và nấu cá với sợi bánh canh là cách tạo nên một món ăn nóng, no, giá phải chăng. Không có ghi chép về thời điểm ra đời; món ăn được xem là sản phẩm của bếp dân gian, phổ biến rộng rãi trong thế kỷ XX.',
      'Sợi bánh canh miền Trung thường làm từ bột gạo, có khi pha thêm bột năng, cán dày rồi cắt sợi. Khi nấu trực tiếp trong nồi nước, bột tiết ra làm nước dùng hơi sánh, đặc trưng của các món bánh canh vùng này. Có nơi làm sợi to, dai; có nơi làm sợi mềm, gần như tan trong miệng. Tên gọi “bánh canh” được hiểu đơn giản là bánh nấu thành canh, phản ánh cách chế biến.',
      'Cá lóc được làm sạch, lọc lấy phi lê, ướp nước mắm, tiêu, hành, rồi xào săn hoặc luộc chín. Xương và đầu cá dùng ninh nước dùng cùng hành tím, có nơi thêm cà chua. Phần dầu ớt hoặc ớt màu nổi đỏ trên mặt nồi là chi tiết khiến món ăn mang đậm dấu ấn miền Trung. Ở Quảng Trị, nhiều quán còn nấu nồi bánh canh to, khách đến thì múc ra từng tô, ăn kèm bánh ướt hoặc quẩy.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Cá lóc đồng là nguồn thực phẩm phổ biến của các vùng trồng lúa miền Trung.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bánh canh cá lóc trở thành món ăn sáng và chiều quen thuộc ở Quảng Trị và Huế.',
      },
      {
        when: 'Những năm gần đây',
        what: 'Bánh canh cá lóc theo người miền Trung vào Nam ra Bắc, có mặt trong nhiều quán ăn ở các thành phố lớn.',
      },
    ],
    meaning: [
      'Bánh canh cá lóc là món ăn của những ngày mưa dầm gió bấc. Ở dải đất chịu nhiều thiên tai, một tô bánh canh nóng, cay và ngọt cá là thứ giúp người ta ấm lại sau những buổi làm việc ngoài đồng. Món ăn mang tính chất mộc mạc, không cầu kỳ, nhưng chắc bụng và đậm vị, như chính tính cách của người dân vùng đất này.',
      'Trong đời sống hằng ngày, bánh canh cá lóc là bữa sáng phổ biến, nhưng cũng là món ăn chiều hay bữa xế. Nhiều gia đình nấu cho người ốm, người già vì cá lóc được tin là bổ, dễ ăn. Với người Quảng Trị xa quê, tô bánh canh cá lóc thường được nhắc tới như một món mang mùi vị quê nhà khó tìm được ở nơi khác.',
    ],
    symbols: [
      {
        name: 'Sợi bánh canh',
        meaning: 'Bột gạo pha bột năng, nấu thẳng trong nồi để nước dùng sánh lại.',
      },
      {
        name: 'Phi lê cá',
        meaning:
          'Cá lóc đồng thịt chắc, ngọt, ướp tiêu và nước mắm rồi xào săn trước khi cho vào tô.',
      },
      {
        name: 'Cà chua',
        meaning: 'Thêm vị chua nhẹ và màu sắc cho nước dùng, giảm vị tanh của cá.',
      },
      {
        name: 'Hành lá, rau mùi',
        meaning: 'Rắc lên khi múc ra tô, tạo hương thơm tươi mát.',
      },
      {
        name: 'Tiêu đen',
        meaning: 'Rắc nhiều để khử tanh và cho vị cay ấm, hợp với những ngày trời lạnh.',
      },
    ],
    tasting: [
      'Bánh canh cá lóc nên ăn khi còn nóng bỏng, rắc thêm tiêu, hành và một thìa ớt màu hoặc ớt tươi. Vắt chút chanh nếu thích, nhưng người địa phương thường để vị nguyên bản để cảm nhận rõ độ ngọt của cá.',
      'Nhiều người ăn kèm quẩy hoặc bánh ướt nhúng vào nước dùng. Hãy khuấy nhẹ trước khi ăn để phần ớt và tiêu hòa đều. Nếu đến Quảng Trị, ghé một quán ven đường vào buổi sáng sớm là cách thưởng thức chân thực nhất.',
    ],
    facts: [
      'Nước dùng bánh canh miền Trung thường hơi sánh vì sợi bánh được nấu trực tiếp trong nồi.',
      'Cá lóc dùng trong món này thường là cá đồng, thịt chắc và ngọt hơn cá nuôi.',
      'Bánh canh cá lóc thường có lớp ớt màu đỏ nổi trên mặt, dấu hiệu dễ nhận biết của món ăn miền Trung.',
    ],
    reference: {
      label: 'Bánh canh — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_canh',
    },
  },

  'banh-hoi-long-heo': {
    homeland: 'Bình Định',
    era: 'Thế kỷ XX',
    tagline:
      'Những phên bánh hỏi trắng mịn, đĩa lòng heo nóng và bát cháo sánh: bữa sáng đất võ Bình Định có một bộ đôi khó tách rời.',
    origin: [
      'Bánh hỏi là loại bánh làm từ bột gạo, ép thành những sợi rất mảnh, đan lại thành từng phên nhỏ. Món bánh có mặt từ miền Trung vào miền Nam, nhưng Bình Định, vùng đất nay thuộc tỉnh Gia Lai sau đợt sáp nhập năm 2025, là nơi bánh hỏi gắn với bữa sáng hằng ngày rõ nét nhất. Tại đây, bánh hỏi thường được ăn kèm lòng heo và cháo lòng, tạo nên bộ đôi “bánh hỏi cháo lòng” nổi tiếng.',
      'Không có tài liệu nào ghi rõ món ăn bắt đầu từ khi nào. Nghề làm bánh hỏi ở Bình Định được xem là nghề truyền thống, nhiều làng có gia đình làm bánh từ đời này qua đời khác. Gạo được ngâm, xay, ủ, nấu thành khối bột rồi ép qua khuôn có nhiều lỗ nhỏ, sợi bánh sau đó được hấp và xếp thành phên. Công đoạn đòi hỏi sự khéo léo để sợi đều, không bị đứt hay dính.',
      'Lòng heo dùng ăn kèm gồm dồi, gan, tim, bao tử, lòng non, thường được luộc chín, thái lát và bày đẹp mắt trên đĩa. Bát cháo lòng nấu từ nước luộc lòng, sánh nhẹ, thêm hành và tiêu. Đi cùng là đĩa rau sống, dưa leo, chén nước mắm pha ớt và hành phi. Có thể nói đây là một bữa sáng đầy đủ, vừa có tinh bột, vừa có đạm, vừa có món nước.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Nghề làm bánh hỏi phát triển ở Bình Định và nhiều tỉnh Nam Trung Bộ.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bánh hỏi cháo lòng trở thành bữa sáng quen thuộc của người Quy Nhơn và các vùng lân cận.',
      },
      {
        when: 'Năm 2025',
        what: 'Bình Định được sáp nhập với Gia Lai thành tỉnh Gia Lai mới, nhưng bánh hỏi vẫn được xem là đặc sản vùng đất này.',
      },
    ],
    meaning: [
      'Với người Bình Định, bánh hỏi lòng heo không chỉ là bữa sáng mà còn là nét văn hóa thường ngày. Quán bánh hỏi cháo lòng thường đông khách từ sáng sớm, mọi người ngồi quây quần, gọi một mẹt bánh và đĩa lòng chung. Đây là bữa ăn của người lao động, nhưng cũng là nơi bạn bè gặp gỡ, trò chuyện trước khi bắt đầu ngày làm việc.',
      'Bánh hỏi cũng xuất hiện trong mâm cỗ, đám giỗ hay lễ tết của nhiều gia đình Nam Trung Bộ. Những sợi bánh nhỏ, đan thành phên đều đặn tượng trưng cho sự khéo léo, kiên nhẫn của người làm bánh. Ăn bánh hỏi đúng kiểu Bình Định là thấy được sự hào sảng của vùng đất võ trong một bữa sáng no đủ, nhiều món, nhiều vị.',
    ],
    symbols: [
      {
        name: 'Bánh hỏi',
        meaning: 'Sợi bột gạo mảnh như sợi chỉ, đan thành phên, mềm và thơm mùi gạo.',
      },
      {
        name: 'Lòng heo',
        meaning: 'Dồi, gan, tim, bao tử luộc chín thái lát, cho vị béo, giòn và đậm.',
      },
      {
        name: 'Cháo gạo',
        meaning: 'Nấu từ nước luộc lòng, sánh nhẹ, ăn kèm để làm ấm bụng.',
      },
      {
        name: 'Rau thơm, xà lách, dưa leo',
        meaning: 'Đĩa rau sống giúp cân bằng vị béo của lòng và làm bữa ăn thanh hơn.',
      },
      {
        name: 'Nước mắm, hành phi',
        meaning: 'Nước mắm pha ớt để chấm, hành phi rắc lên bánh cho thơm.',
      },
    ],
    tasting: [
      'Lấy một miếng bánh hỏi, cuốn cùng rau sống và lát lòng, chấm vào nước mắm ớt rồi ăn. Xen giữa các miếng là vài thìa cháo nóng. Một số người thích chan thẳng cháo lên bánh hỏi để bánh mềm hơn.',
      'Bánh hỏi cháo lòng hợp nhất vào buổi sáng, khi lòng vừa luộc xong và cháo còn bốc hơi. Đến Quy Nhơn, tìm một quán đông khách địa phương là cách chắc chắn để được ăn đúng hương vị.',
    ],
    facts: [
      'Bánh hỏi được làm bằng cách ép bột gạo qua khuôn nhiều lỗ nhỏ, tạo sợi rất mảnh.',
      'Ở Bình Định, bánh hỏi thường đi cặp với cháo lòng thành món “bánh hỏi cháo lòng”.',
      'Ở miền Nam, bánh hỏi thường ăn kèm heo quay hoặc thịt nướng, khác với kiểu ăn Bình Định.',
    ],
    reference: {
      label: 'Bánh hỏi — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_h%E1%BB%8Fi',
    },
  },

  'banh-trang-cuon-thit-heo': {
    homeland: 'Đà Nẵng · Quảng Nam',
    era: 'Thế kỷ XX',
    tagline:
      'Bánh tráng mỏng cuốn thịt luộc, rau rừng, dứa và chấm mắm nêm: món cuốn bình dị mà khiến người xa Đà Nẵng nhớ mãi.',
    origin: [
      'Bánh tráng cuốn thịt heo là món ăn quen của vùng Đà Nẵng và Quảng Nam. Bánh tráng ở đây làm từ bột gạo, tráng mỏng, phơi khô, và nghề làm bánh tráng có từ lâu đời ở nhiều làng như Túy Loan. Thịt heo luộc là món dân dã của mọi gia đình, nên việc cuốn chúng chung với rau là điều tự nhiên. Không có mốc ghi chép rõ ràng về thời điểm món ăn hình thành; nó được xem là sản phẩm của bếp gia đình xứ Quảng.',
      'Trong thế kỷ XX, món cuốn này dần ra khỏi bếp nhà để vào quán. Ở Đà Nẵng, nhiều quán chuyên bánh tráng cuốn thịt heo trở nên nổi tiếng, khách đến chủ yếu để được tự tay cuốn những lát thịt mỏng cùng rau sống, chấm với chén mắm nêm đặc trưng. Món ăn cũng trở thành điểm đến quen thuộc của du khách khi ghé thành phố biển.',
      'Thịt dùng cuốn thường là thịt heo ba chỉ hoặc thịt đùi, luộc chín vừa tới, thái lát mỏng để có cả nạc lẫn mỡ. Rau ăn kèm rất phong phú: xà lách, rau thơm, rau muống, cải con, dưa leo, chuối chát, khế, giá. Điểm then chốt là chén mắm nêm pha với dứa xay, tỏi, ớt, đường và chanh. Một số nơi dùng bánh tráng phơi sương, một số dùng bánh tráng mềm được nhúng nước nhẹ, tùy thói quen từng quán.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Các làng nghề bánh tráng ở Quảng Nam và Đà Nẵng cung cấp bánh tráng cho các món cuốn.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Bánh tráng cuốn thịt heo trở thành món ăn phổ biến trong bữa cơm và các quán ăn Đà Nẵng.',
      },
      {
        when: 'Những năm gần đây',
        what: 'Món ăn được giới thiệu rộng rãi như đặc sản Đà Nẵng, có mặt trong nhiều cẩm nang du lịch.',
      },
    ],
    meaning: [
      'Bánh tráng cuốn thịt heo là món ăn của sự quây quần. Cả bàn ngồi chung, mỗi người tự cuốn, tự chấm theo ý mình, vừa ăn vừa trò chuyện. Cách ăn này khiến bữa ăn trở nên thân mật, phù hợp với những buổi họp mặt gia đình, bạn bè hay tiếp khách phương xa.',
      'Món ăn còn thể hiện sự cân bằng trong bữa ăn của người miền Trung: thịt béo được cân lại bởi rất nhiều rau xanh, vị mặn của mắm nêm được làm dịu bởi dứa và chuối chát. Với người xứ Quảng xa quê, chỉ cần nhắc đến chén mắm nêm là đủ gợi nhớ về những bữa cơm bên gia đình.',
    ],
    symbols: [
      {
        name: 'Thịt heo',
        meaning: 'Ba chỉ hoặc đùi luộc vừa tới, thái mỏng để có cả nạc và mỡ trong mỗi cuốn.',
      },
      {
        name: 'Bánh tráng',
        meaning: 'Bánh gạo mỏng, dẻo vừa phải, là lớp áo ngoài ôm trọn mọi thứ bên trong.',
      },
      {
        name: 'Xà lách, rau thơm, dưa leo',
        meaning: 'Rau sống nhiều loại cho độ tươi, mát và cân lại vị béo của thịt.',
      },
      {
        name: 'Dứa, giá đỗ',
        meaning: 'Dứa cho vị chua ngọt, giá cho độ giòn; dứa cũng thường được xay vào mắm nêm.',
      },
      {
        name: 'Mắm nêm',
        meaning:
          'Mắm cá cơm lên men pha với dứa, tỏi, ớt; linh hồn của món ăn và đặc trưng của xứ Quảng.',
      },
    ],
    tasting: [
      'Trải một lá bánh tráng, xếp rau, dưa leo, vài lát thịt và một miếng dứa, cuốn chặt tay rồi chấm thật đẫm mắm nêm. Người địa phương thường cuốn khá to và ăn bằng tay, đừng ngại rơi vãi một chút.',
      'Nếu lần đầu ăn mắm nêm, có thể thử với lượng nhỏ trước vì mùi khá đậm. Món này hợp với bữa trưa hoặc bữa tối, ngồi đông người để cùng cuốn, cùng chia nhau từng đĩa thịt.',
    ],
    facts: [
      'Mắm nêm là loại mắm lên men từ cá, thường được pha thêm dứa, tỏi và ớt khi ăn.',
      'Làng Túy Loan ở Đà Nẵng nổi tiếng với nghề làm bánh tráng.',
      'Thịt heo dùng để cuốn thường được thái rất mỏng để dễ cuốn và ăn cùng rau.',
    ],
    reference: {
      label: 'Bánh tráng — Wikipedia tiếng Việt',
      url: 'https://vi.wikipedia.org/wiki/B%C3%A1nh_tr%C3%A1ng',
    },
  },

  'sup-luon-nghe-an': {
    homeland: 'Vinh, Nghệ An',
    era: 'Thế kỷ XX',
    tagline:
      'Lươn đồng xào nghệ vàng óng, nước súp sánh cay, thêm rau răm và miếng bánh mì giòn: súp lươn là hương vị mùa đông của xứ Nghệ.',
    origin: [
      'Súp lươn là món ăn gắn với thành phố Vinh và vùng Nghệ An. Lươn đồng vốn là nguồn thực phẩm phổ biến ở các cánh đồng lúa xứ Nghệ, nên người dân đã có nhiều cách chế biến lươn từ lâu như cháo lươn, miến lươn, lươn xào. Súp lươn là một trong những biến thể nổi bật nhất, với nước dùng sánh và vị cay nồng đặc trưng.',
      'Không có tài liệu nào xác định súp lươn ra đời từ khi nào. Chữ “súp” nhiều khả năng mượn từ tiếng Pháp “soupe”, và việc ăn kèm bánh mì cũng gợi đến ảnh hưởng của thời kỳ thuộc địa, nhưng đây chỉ là suy đoán dựa trên từ ngữ, chưa có bằng chứng cụ thể. Người Vinh thường chỉ nói rằng súp lươn đã là món quen thuộc của thành phố trong nhiều thập kỷ, phổ biến rộng rãi trong nửa sau thế kỷ XX.',
      'Lươn được làm sạch nhớt, luộc hoặc hấp chín, gỡ lấy thịt rồi xào với nghệ, hành tím, sả, ớt cho thơm và vàng óng. Xương lươn dùng ninh nước dùng, sau đó nước được làm sánh lại. Khi ăn, thịt lươn xào được đặt lên trên bát súp nóng, rắc rau răm, hành lá, tiêu và ớt. Nhiều quán còn cho thêm trứng chim cút hoặc nấm. Bánh mì giòn, bánh đa hoặc bánh mướt thường được ăn kèm để chấm vào súp.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Lươn đồng là nguồn thực phẩm phổ biến ở các vùng ruộng lúa Nghệ An.',
      },
      {
        when: 'Nửa sau thế kỷ XX',
        what: 'Súp lươn trở thành món ăn quen thuộc ở thành phố Vinh, cùng với cháo lươn và miến lươn.',
      },
      {
        when: 'Những năm gần đây',
        what: 'Súp lươn xứ Nghệ được bán ở Hà Nội và nhiều thành phố khác, nhờ người Nghệ đi làm ăn xa mang theo.',
      },
    ],
    meaning: [
      'Súp lươn phản ánh tính cách ẩm thực xứ Nghệ: đậm đà, cay nồng và mộc mạc. Ở vùng đất khí hậu khắc nghiệt, mùa đông lạnh và mùa hè có gió Lào, những món ăn nóng, cay như súp lươn giúp người ta chống chọi thời tiết. Món ăn cũng tận dụng tối đa sản vật đồng ruộng, không cầu kỳ nhưng đầy đủ dinh dưỡng.',
      'Với người Nghệ, súp lươn còn là món để tiếp đãi bạn bè phương xa đến Vinh. Nhiều người lớn lên ở Vinh kể rằng những bát súp lươn vào buổi tối lạnh là ký ức khó quên. Khi đi xa, người Nghệ mở quán súp lươn, cháo lươn ở các thành phố lớn, mang theo một phần hương vị quê nhà đến với người khác.',
    ],
    symbols: [
      {
        name: 'Lươn',
        meaning: 'Lươn đồng thịt chắc, ngọt; được làm sạch kỹ rồi xào săn cho thơm.',
      },
      {
        name: 'Nước dùng lươn',
        meaning: 'Ninh từ xương lươn, được làm sánh lại, đậm ngọt và nóng hổi.',
      },
      {
        name: 'Nghệ',
        meaning: 'Tạo màu vàng đẹp mắt và giúp khử mùi tanh của lươn.',
      },
      {
        name: 'Rau răm',
        meaning: 'Hương thơm cay nồng đặc trưng, gần như bắt buộc khi ăn các món lươn.',
      },
      {
        name: 'Bánh mì, ớt',
        meaning: 'Bánh mì giòn để chấm vào súp, ớt tươi hoặc ớt bột cho vị cay đậm kiểu xứ Nghệ.',
      },
    ],
    tasting: [
      'Khuấy nhẹ cho lươn xào hòa vào nước súp, rắc thêm rau răm, tiêu và ớt rồi ăn ngay khi còn nóng. Bẻ bánh mì giòn thành miếng nhỏ, chấm vào súp để bánh thấm vị sánh, cay.',
      'Súp lươn hợp nhất vào buổi sáng hoặc tối trời se lạnh. Người Vinh thường ăn rất cay, nên nếu không quen, hãy dặn người bán bớt ớt. Thêm một quả trứng chim cút hoặc gọi thêm bánh đa là kiểu ăn quen của nhiều thực khách.',
    ],
    facts: [
      'Chữ “súp” trong tên món ăn được cho là bắt nguồn từ tiếng Pháp “soupe”.',
      'Ngoài súp lươn, Nghệ An còn nổi tiếng với cháo lươn và miến lươn.',
      'Rau răm là loại rau thơm gần như không thể thiếu trong các món lươn xứ Nghệ.',
    ],
    reference: {
      label: 'Asian swamp eel — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Asian_swamp_eel',
    },
  },
};
