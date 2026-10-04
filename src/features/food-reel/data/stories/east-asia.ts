import type { DishStory } from './types';

export const STORIES_EAST_ASIA: Readonly<Record<string, DishStory>> = {
  'sushi-ca-hoi-tong-hop': {
    homeland: 'Edo (Tokyo), Nhật Bản · cá hồi nuôi Na Uy',
    era: 'Nigiri từ thập niên 1820 · sushi cá hồi từ thập niên 1990',
    tagline:
      'Nắm cơm giấm của Edo gặp con cá hồi nuôi ở biển Na Uy: một cặp đôi mới chừng ba mươi năm mà đã thành món quen của cả thế giới.',
    origin: [
      'Tổ tiên xa của sushi (寿司) là narezushi: cá ướp muối vùi trong cơm cho lên men nhiều tháng, một cách giữ cá mà nhiều nhà nghiên cứu cho là bắt nguồn từ vùng trồng lúa nước Đông Nam Á và Nam Trung Hoa. Thời ấy cơm chỉ là chất ủ, ăn cá xong thì bỏ. Người Nhật rút ngắn dần thời gian ủ, bắt đầu ăn luôn phần cơm chua, và đến thời Edo thì trộn thẳng giấm gạo vào cơm, khỏi phải đợi lên men.',
      'Nigiri ra đời ở Edo khoảng thập niên 1820. Cái tên gắn với nó nhiều nhất là Hanaya Yohei, chủ một tiệm sushi ở Ryōgoku, dù có lẽ ông là người làm cho kiểu nắm cơm này nổi tiếng hơn là người duy nhất nghĩ ra. Vắt cơm giấm nắm bằng tay, phủ một lát cá vịnh Edo đã ướp tương, ngâm giấm hoặc luộc sơ, bán ở quầy rong cho dân phố ăn đứng vài miếng rồi đi. Cuộn maki bọc rong nori và sashimi, cá sống thái lát không kèm cơm, cũng thành nếp ăn của thành phố.',
      'Trong suốt lịch sử ấy, cá hồi gần như vắng mặt. Cá hồi hoang Thái Bình Dương, người Nhật gọi là sake, dễ nhiễm ký sinh trùng nên chỉ được nướng hoặc muối. Năm 1985, một phái đoàn Na Uy sang Tokyo, mở đầu chương trình “Project Japan” nhằm bán cá hồi Đại Tây Dương nuôi trong lồng biển lạnh, ít nguy cơ ký sinh trùng, cho thị trường ăn sống, dưới cái tên mượn tiếng Anh “saamon”. Phải đến giữa thập niên 1990, cá hồi mới đứng vững trên băng chuyền sushi; rồi theo các nhà hàng Nhật, nó đến Sài Gòn, Hà Nội như món dễ làm quen nhất trong thực đơn.',
    ],
    timeline: [
      {
        when: 'Thế kỷ VIII',
        what: 'Chữ “sushi” đã có trong văn bản Nhật, chỉ cá ủ lên men cùng cơm (narezushi).',
      },
      {
        when: 'Thập niên 1820',
        what: 'Nigiri nắm tay phổ biến ở Edo, gắn với tên tuổi Hanaya Yohei ở Ryōgoku.',
      },
      {
        when: 'Năm 1958',
        what: 'Quán sushi băng chuyền đầu tiên mở ở Higashi-Osaka, đưa sushi thành món bình dân.',
      },
      {
        when: 'Năm 1985–1986',
        what: 'Na Uy khởi động “Project Japan”, quảng bá cá hồi nuôi để ăn sống tại Nhật.',
      },
      {
        when: 'Giữa thập niên 1990',
        what: 'Sushi cá hồi có chỗ đứng trên băng chuyền Nhật, rồi lan sang các thành phố Việt Nam.',
      },
    ],
    meaning: [
      'Ở Nhật, sushi gắn với ngày vui. Nhà có khách, đứa con thi đỗ, họ hàng tụ về dịp lễ, người ta gọi một khay sushi lớn về đặt giữa bàn. Còn ngồi trước quầy của một itamae, người thợ sushi, là trải nghiệm gần như nghi lễ: từng miếng được nắn rồi đặt ngay trước mặt khách, ăn liền khi cơm còn hơi ấm. Học nghề này mất nhiều năm, riêng việc nấu và trộn cơm cho đúng độ chua, độ dẻo đã là cả một bài học dài.',
      'Miếng sushi cá hồi lại kể chuyện khác: chuyện một nền ẩm thực vốn giữ lề lối khắt khe vẫn mở cửa cho con cá ngoại, để rồi trẻ con Nhật hôm nay xếp nó vào hàng món khoái khẩu nhất trên băng chuyền. Ở Việt Nam, khay sushi cá hồi tổng hợp thường là “cửa ngõ” cho người mới làm quen với đồ Nhật, nhờ thớ cá béo mềm, không tanh, và màu cam nổi bật giữa nền cơm trắng, rong đen.',
    ],
    symbols: [
      {
        name: 'Cá hồi (saamon)',
        meaning:
          'Thái lát dày làm sashimi, nigiri và cuộn; vị béo mềm, là “người mới” trong sushi nhờ nghề nuôi cá ở Na Uy.',
      },
      {
        name: 'Cơm sushi (shari)',
        meaning:
          'Gạo hạt tròn trộn giấm, đường, muối khi còn ấm; thợ sushi coi phần cơm quyết định miếng sushi ngon hay dở.',
      },
      {
        name: 'Rong nori và trứng cá',
        meaning:
          'Nori sấy giòn bọc ngoài maki; trứng cá rắc lên cuộn cho vị mặn biển và tiếng lách tách vui miệng.',
      },
      {
        name: 'Gừng hồng (gari)',
        meaning:
          'Gừng non ngâm giấm ngọt, ăn giữa hai miếng sushi để “xóa” vị cũ, không đặt lên cá để ăn chung.',
      },
      {
        name: 'Wasabi và củ cải bào',
        meaning:
          'Wasabi cay xộc lên mũi rồi tan nhanh; sợi củ cải trắng (tsuma) lót cạnh sashimi để ăn cho mát miệng, không chỉ để trang trí.',
      },
    ],
    tasting: [
      'Nigiri nên bỏ trọn vào miệng một lần. Muốn chấm nước tương, nghiêng miếng sushi cho mặt cá chạm nhẹ vào chén; nhúng phần cơm thì cơm rã và ngấm mặn. Dùng đũa hay dùng tay đều được, nhiều người Nhật vẫn cầm nigiri bằng tay. Ở quán tử tế, thợ đã quệt sẵn một chút wasabi giữa cá và cơm, nên khỏi khuấy cả cục wasabi vào chén tương.',
      'Thứ tự dễ chịu là đi từ vị nhẹ đến vị đậm: sashimi trước, rồi nigiri, cuối cùng là maki có sốt hay trứng cá. Giữa các miếng, nhấm một lát gừng hồng hoặc vài sợi củ cải. Cá sống luôn có rủi ro nhất định, nên phụ nữ mang thai, trẻ nhỏ và người dị ứng hải sản cần cân nhắc.',
    ],
    facts: [
      'Người Nhật phân biệt “saamon” (cá hồi ăn sống, chủ yếu là cá nuôi nhập khẩu) với “sake” hay “shake” (cá hồi hoang thường để nướng, muối).',
      'Phần lớn “wasabi” ở quán bình dân thực ra là cải ngựa trộn mù tạt và phẩm màu xanh, vì củ wasabi thật đắt và khó trồng.',
      'Nigiri thời Edo được mô tả to hơn miếng sushi ngày nay nhiều lần, gần bằng một nắm cơm nhỏ.',
    ],
    reference: { label: 'Sushi — Wikipedia tiếng Anh', url: 'https://en.wikipedia.org/wiki/Sushi' },
  },
  bibimbap: {
    homeland: 'Bán đảo Triều Tiên · nổi tiếng nhất ở Jeonju, Jinju',
    era: 'Ghi chép từ thế kỷ XIX',
    tagline:
      'Bát cơm phủ đủ năm sắc rau, thịt, trứng, rồi một thìa tương ớt: bibimbap chỉ thật sự thành món khi bị trộn tung lên.',
    origin: [
      'Bibimbap (비빔밥) nghĩa đen là “cơm trộn”. Trong các văn bản viết bằng chữ Hán, món này mang tên goldongban (骨董飯), tạm hiểu là cơm lẫn đủ thứ. Công thức sớm nhất còn biết đến nằm trong Siuijeonseo, một cuốn sách nấu ăn khuyết danh cuối thế kỷ XIX. Còn thói quen trộn cơm với rau và thức ăn thừa thì chắc chắn đã có trong căn bếp nhà nông Triều Tiên từ lâu trước khi ai đó nghĩ đến chuyện chép lại.',
      'Về chuyện bibimbap ra đời thế nào, người Hàn kể ít nhất ba giả thuyết. Một gắn nó với lễ cúng tổ tiên jesa: cúng xong, con cháu trộn cơm với các món trên mâm để cùng hưởng lộc. Một cho rằng đêm cuối năm, người ta trộn hết thức ăn còn lại để không mang đồ cũ sang năm mới. Thuyết thứ ba thực tế hơn: mùa gặt bận rộn, nông dân cần một bát lớn ăn ngay ngoài đồng, khỏi bày mâm.',
      'Sang thế kỷ XX, mỗi vùng có kiểu riêng. Jeonju nấu cơm bằng nước hầm xương bò và dùng giá đỗ địa phương nổi tiếng; Jinju phủ thịt bò sống thái mỏng, đẹp đến mức được gọi là hwaban, “bát hoa”. Bát đá dolsot nung nóng phổ biến từ khoảng cuối thập niên 1960. Năm 1997, Korean Air đưa bibimbap lên suất ăn máy bay và năm sau nhận giải Mercury của ngành suất ăn hàng không. Ở Việt Nam, món này có mặt ở hầu hết quán Hàn, thường dọn trong bát đá với quả trứng ở giữa.',
    ],
    timeline: [
      {
        when: 'Thời Joseon',
        what: 'Thói quen trộn cơm với rau và món ăn kèm phổ biến trong bữa ăn thường ngày.',
      },
      {
        when: 'Cuối thế kỷ XIX',
        what: 'Sách Siuijeonseo ghi công thức cơm trộn dưới tên goldongban.',
      },
      {
        when: 'Cuối thập niên 1960',
        what: 'Bibimbap bát đá dolsot nóng bắt đầu phổ biến trong các nhà hàng.',
      },
      {
        when: 'Năm 1997–1998',
        what: 'Korean Air phục vụ bibimbap trên máy bay và nhận giải Mercury năm 1998.',
      },
    ],
    meaning: [
      'Nhìn từ trên xuống, bát bibimbap gợi ngay obangsaek, năm màu truyền thống của Hàn Quốc: xanh, đỏ, vàng, trắng, đen, ứng với ngũ hành và năm phương. Rau xanh, ớt đỏ, lòng đỏ trứng, cơm trắng, nấm hay rong sẫm màu mỗi thứ chiếm một góc, được nêm riêng, đặt cạnh nhau ngay ngắn. Rồi người ăn cầm thìa trộn tất cả lại. Cái đẹp của món nằm đúng ở khoảnh khắc ấy: từng phần rõ ràng trước khi hòa chung một vị.',
      'Trong nhà, bibimbap là món của sự tằn tiện khéo léo. Còn vài đĩa banchan từ bữa trước, một bát cơm nguội, thêm thìa gochujang và vài giọt dầu mè là đủ bữa trưa. Ở Jeonju, nó lại là niềm kiêu hãnh của cả vùng Jeolla, có hẳn lễ hội riêng và được giới thiệu với du khách như tấm danh thiếp ẩm thực của thành phố.',
    ],
    symbols: [
      {
        name: 'Trứng ốp la',
        meaning:
          'Lòng đỏ đặt giữa bát như mặt trời; khi trộn, nó vỡ ra bọc lấy từng hạt cơm cho mịn và béo.',
      },
      {
        name: 'Thịt bò',
        meaning:
          'Bò thái mỏng ướp nước tương, tỏi, đường rồi xào; phần đậm đà nhất, từng là thứ xa xỉ trong bát cơm nhà nông.',
      },
      {
        name: 'Namul: rau bina, giá đỗ, cà rốt, dưa leo',
        meaning:
          'Mỗi loại được chần hoặc xào và trộn dầu mè riêng, giữ màu và độ giòn; sự tỉ mỉ ấy là nét đặc trưng của bếp Hàn.',
      },
      {
        name: 'Kimchi',
        meaning:
          'Vị chua cay lên men kéo cân bằng cho phần thịt béo; với người Hàn, thiếu kimchi thì bữa ăn chưa đủ.',
      },
      {
        name: 'Gochujang và dầu mè',
        meaning:
          'Tương ớt lên men từ ớt, gạo nếp và đậu nành, cùng dầu mè thơm, là chất kết dính mọi hương vị khi trộn.',
      },
    ],
    tasting: [
      'Đừng ăn từng phần riêng lẻ. Cho gochujang vào từ từ, mỗi lần một ít để chỉnh độ cay, rồi dùng thìa trộn từ đáy bát lên cho đến khi cơm ngả màu cam đều. Người Hàn ăn bibimbap bằng thìa, đôi đũa chỉ để gắp kimchi và các món ăn kèm.',
      'Gặp bát đá dolsot thì kiên nhẫn một chút: ép cơm sát thành bát, để nó tiếp tục xèo xèo thành lớp cháy vàng giòn, phần nhiều người mê nhất. Một bát canh nhỏ đi kèm giúp ăn đỡ khô và dịu bớt vị cay. Bát đá giữ nhiệt rất lâu, nhớ đừng chạm tay vào thành bát.',
    ],
    facts: [
      'Năm 1998, Korean Air nhận giải Mercury của Hiệp hội Suất ăn Hàng không Quốc tế cho món bibimbap phục vụ trên máy bay.',
      'Bibimbap Jinju phủ thịt bò sống thái mỏng và được gọi là hwaban, “bát cơm hoa”.',
      'Ở Jeonju, cơm bibimbap truyền thống được nấu bằng nước hầm xương bò thay vì nước lã.',
    ],
    reference: {
      label: 'Bibimbap — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Bibimbap',
    },
  },
  'ramen-tonkotsu': {
    homeland: 'Kurume · Hakata, Fukuoka, Nhật Bản',
    era: 'Từ năm 1937 · nước trắng đục sau Thế chiến II',
    tagline:
      'Xương heo sôi sùng sục nhiều giờ liền cho đến khi nước trắng đục như sữa: tô ramen của dân Kyushu, ăn nhanh, húp mạnh, gọi thêm vắt mì.',
    origin: [
      'Ramen là món mì gốc Hoa, theo các khu phố người Hoa ở Yokohama, Kobe, Nagasaki vào Nhật từ cuối thế kỷ XIX, thuở ấy gọi là shina soba hay chūka soba. Năm 1910, quán Rairaiken ở Asakusa, Tokyo, thuê đầu bếp Hoa từ Yokohama nấu mì nước tương giá rẻ cho dân lao động, và tô mì bắt đầu thành món của người Nhật. Từ đó, mỗi vùng tự nặn cho mình một kiểu ramen riêng.',
      'Tonkotsu (豚骨) nghĩa là “xương heo”. Năm 1937, Miyamoto Tokio dựng một xe mì tên Nankinsenryō ở Kurume, tỉnh Fukuoka, nấu nước dùng từ xương heo; tô mì khi ấy còn khá trong. Câu chuyện nước trắng đục thường được kể từ năm 1947, cũng ở Kurume: Sugino Katsumi, chủ quán Sankyū, để nồi xương sôi quá lửa, collagen và tủy tan ra làm nước đục béo, nhưng khách lại khen. Chi tiết “tình cờ” có thể được kể cho hay, còn nồi nước trắng thì từ đó thành chuẩn mực.',
      'Từ Kurume, phong cách này xuống Hakata, trung tâm Fukuoka. Quanh chợ cá Nagahama đầu thập niên 1950, sợi mì được làm mảnh và thẳng để luộc trong vài chục giây, kịp cho người làm chợ ăn vội giữa ca. Sau này, các chuỗi ramen Kyushu đưa tonkotsu lên Tokyo rồi ra thế giới. Ở Sài Gòn, Hà Nội, tô ramen tonkotsu thường đủ bộ: chashu, trứng lòng đào, mộc nhĩ, măng, giá và lá rong biển.',
    ],
    timeline: [
      { when: 'Năm 1910', what: 'Rairaiken ở Asakusa mở ra trào lưu ramen cho người Tokyo.' },
      {
        when: 'Năm 1937',
        what: 'Xe mì Nankinsenryō ở Kurume bán mì nước xương heo, được coi là khởi đầu của tonkotsu.',
      },
      {
        when: 'Năm 1947',
        what: 'Quán Sankyū ở Kurume được cho là nơi nước dùng trắng đục ra đời.',
      },
      {
        when: 'Đầu thập niên 1950',
        what: 'Ramen Nagahama ở Hakata có sợi mảnh và lệ gọi thêm vắt mì kaedama.',
      },
      {
        when: 'Thập niên 2000',
        what: 'Các chuỗi ramen Kyushu đưa tonkotsu ra khắp thế giới, kể cả Việt Nam.',
      },
    ],
    meaning: [
      'Ở Fukuoka, ramen thuộc về ban đêm. Dọc sông Naka, các quầy yatai thắp đèn bán đến khuya; nhân viên văn phòng tạt vào sau cuộc nhậu, ngồi sát vai người lạ trên băng ghế dài, gọi một tô, ăn chưa đầy mười phút rồi đứng dậy. Không ai cần nghi thức, chỉ cần nồi nước còn nóng và người bán còn thức.',
      'Mỗi vùng Nhật có một kiểu ramen để bênh vực: Tokyo chuộng nước tương, Sapporo có miso, còn Kyushu tự hào với xương heo đậm đặc. Chủ quán có thể mất cả chục năm để chỉnh một nồi nước, giữ kín tỉ lệ xương đầu, xương ống, mỡ lưng và thời gian ninh. Người sành ăn đánh giá quán qua ngụm nước đầu tiên, trước cả khi đụng đũa vào mì.',
    ],
    symbols: [
      {
        name: 'Nước dùng xương heo',
        meaning:
          'Ninh ở lửa lớn nhiều giờ, có quán đến mười mấy tiếng, cho collagen tan ra thành thứ nước đục, béo, bám môi.',
      },
      {
        name: 'Sợi mì ramen',
        meaning:
          'Kiểu Hakata mảnh và thẳng, chín rất nhanh; khách được chọn độ cứng, từ mềm đến gần như còn sống.',
      },
      {
        name: 'Thịt heo chashu',
        meaning:
          'Ba chỉ hoặc nạc vai om nước tương, mirin, thái lát mỏng; gặp nước dùng nóng thì mỡ tan, thịt mềm.',
      },
      {
        name: 'Trứng lòng đào (ajitama)',
        meaning:
          'Luộc vừa tới rồi ngâm sốt cho lòng đỏ sánh như mật; nhiều người nhìn quả trứng để đoán độ chăm chút của quán.',
      },
      {
        name: 'Mộc nhĩ, măng, giá, nori, hành lá',
        meaning:
          'Mộc nhĩ (kikurage) giòn sần sật, măng menma lên men nhẹ, giá và hành tươi giúp tô nước béo không bị ngấy.',
      },
    ],
    tasting: [
      'Húp một ngụm nước trước, khi chưa nêm gì. Rồi cứ hút mì thành tiếng: ở Nhật, đó là cách ăn bình thường, vừa làm sợi nguội bớt vừa kéo theo nước dùng. Sợi Hakata rất mảnh nên mềm nhanh, đừng để tô mì chờ lâu trong lúc chụp ảnh.',
      'Trên bàn các quán Hakata thường có gừng đỏ muối, mè rang, tỏi giã và cải muối cay (karashi takana) để tự gia giảm. Hết mì mà còn nước, gọi “kaedama” để có thêm một vắt mì thả vào. Cải muối cay khá mạnh, nên thêm từ từ kẻo át mất vị nước dùng. Mì làm từ bột mì, người kiêng gluten cần lưu ý.',
    ],
    facts: [
      'Lệ gọi thêm vắt mì “kaedama” được cho là bắt đầu ở các quán ramen khu chợ cá Nagahama, Hakata, vào thập niên 1950.',
      'Quán Hakata thường cho chọn độ cứng của sợi, cứng nhất là “harigane”, nghĩa là “dây kẽm”.',
      'Ở Yokohama có Bảo tàng Ramen Shin-Yokohama, dựng lại phố xá Tokyo cuối thập niên 1950 với quán ramen nhiều vùng.',
    ],
    reference: {
      label: 'Tonkotsu ramen — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Tonkotsu_ramen',
    },
  },
  'mi-udon-bo-tempura': {
    homeland: 'Kagawa (Sanuki) · vùng Kansai, Nhật Bản',
    era: 'Udon phổ biến từ thời Edo · niku udon từ thời Minh Trị',
    tagline:
      'Sợi udon to trắng, thịt bò om ngọt kiểu Kansai và con tôm tempura giòn rụm: một bát mì gom hai món quen thành một bữa no.',
    origin: [
      'Udon (うどん) chỉ cần bột mì, muối và nước, nhưng phải nhồi thật kỹ để sợi vừa mềm vừa có độ đàn hồi mà người Nhật gọi là koshi. Tương truyền, nhà sư Kūkai sau chuyến học đạo ở nhà Đường đầu thế kỷ IX đã mang cách làm mì về quê Sanuki, nay là tỉnh Kagawa. Câu chuyện khó kiểm chứng, nhưng đến thời Edo, udon đã là món bình dân khắp vùng Kansai và đảo Shikoku.',
      'Phần thịt bò kể chuyện của thời Minh Trị, khi lệnh kiêng thịt kéo dài nhiều thế kỷ được nới bỏ. Ở Osaka, Kobe, nói “niku” (thịt) là mặc định thịt bò, nên niku udon là bò thái mỏng om với nước tương, đường, mirin rồi đặt lên bát mì. Tôm tempura thì đến từ một nhánh khác: kỹ thuật chiên bột theo các giáo sĩ, thương nhân Bồ Đào Nha vào Nagasaki thế kỷ XVI, thành món quầy rong ở Edo, rồi được đặt lên mì nóng thành tempura udon.',
      'Bát udon ở các quán Nhật tại Việt Nam gộp cả hai: bò mềm đậm vị và tôm tempura vàng giòn, thêm rau bina, nấm hương, cà rốt và một mảnh rong biển. Ở Nhật, kết hợp kiểu này ít gặp hơn, vì người ta thường gọi riêng niku udon hoặc tempura udon. Nhưng cái tinh thần “thêm topping để bát mì thành bữa chính” thì vẫn rất Nhật.',
    ],
    timeline: [
      {
        when: 'Đầu thế kỷ IX (tương truyền)',
        what: 'Nhà sư Kūkai được cho là mang kỹ thuật làm mì về vùng Sanuki.',
      },
      { when: 'Thế kỷ XVI', what: 'Kỹ thuật chiên bột theo người Bồ Đào Nha đến Nagasaki.' },
      {
        when: 'Thời Edo',
        what: 'Udon và tempura đều thành món ăn bình dân ở các đô thị Nhật.',
      },
      {
        when: 'Thời Minh Trị',
        what: 'Thịt bò được chấp nhận rộng rãi, mở đường cho niku udon ở Kansai.',
      },
      {
        when: 'Năm 2011',
        what: 'Kagawa tự xưng “Udon-ken” (tỉnh Udon) trong chiến dịch quảng bá du lịch.',
      },
    ],
    meaning: [
      'Với người Nhật, udon nóng là món của ngày lạnh, ngày mệt, ngày cảm cúm, gần giống cách người Việt tìm đến bát cháo hành. Sợi to, mềm, dễ nuốt, nước dùng ấm và nhạt vừa phải. Có những bát mang tên rất đời: kitsune udon với miếng đậu phụ chiên ngọt mà dân gian bảo cáo thích ăn, chikara udon thả bánh mochi vào, nghĩa là “udon sức mạnh”, dành cho người cần no lâu.',
      'Bát udon cũng là ranh giới vùng miền thú vị. Phía đông quanh Tokyo chuộng nước dùng sẫm màu, đậm nước tương; phía tây quanh Osaka, Kyoto thích nước trong vắt, thơm tảo kombu và cá bào. Khác biệt rõ đến mức nhiều hãng mì ăn liền bán hai phiên bản cho hai miền, và người Kansai lên Tokyo hay than nước udon ở đây “đen quá”.',
    ],
    symbols: [
      {
        name: 'Sợi udon',
        meaning:
          'To, trắng, mềm mà vẫn đàn hồi; người Kagawa đánh giá sợi mì trước hết bằng độ dai “koshi”.',
      },
      {
        name: 'Tôm tempura',
        meaning:
          'Lớp bột mỏng chiên giòn, chạm nước dùng thì mềm dần; dấu vết của cuộc gặp với người Bồ Đào Nha thế kỷ XVI.',
      },
      {
        name: 'Thịt bò om ngọt',
        meaning:
          'Thái mỏng, om nước tương, đường, mirin; nhân vật chính của niku udon Kansai, nơi “thịt” mặc định là thịt bò.',
      },
      {
        name: 'Nước dùng dashi',
        meaning:
          'Nấu từ tảo kombu và cá bào katsuobushi, vị umami thanh nhẹ, nền chung của hầu hết món mì nước Nhật.',
      },
      {
        name: 'Rau bina, nấm hương, cà rốt, nori',
        meaning:
          'Điểm màu xanh, nâu, cam cho bát mì trắng; nấm hương hút nước dùng, rong nori thêm chút hương biển.',
      },
    ],
    tasting: [
      'Nâng bát lên, húp một ngụm nước dùng trước, rồi hút sợi mì thành tiếng mà không cần ngại. Với tôm tempura có hai trường phái: cắn ngay khi còn giòn, hoặc ấn xuống cho thấm nước dùng mềm ra. Cả hai đều “đúng”, chỉ khác khẩu vị.',
      'Trên bàn thường có shichimi tōgarashi, bột ớt bảy vị, rắc vài lần cho ấm bụng. Thịt bò ngọt nên ăn xen với rau bina để khỏi ngấy. Sợi udon và lớp bột tempura đều làm từ bột mì, người kiêng gluten hoặc dị ứng tôm cần lưu ý.',
    ],
    facts: [
      'Từ năm 2011, Kagawa dùng biệt danh “Udon-ken”, tỉnh Udon, trong các chiến dịch quảng bá du lịch.',
      'Ở Kagawa, bột udon truyền thống được cho vào túi rồi giẫm bằng chân để sợi mì dai hơn.',
      'Một số dòng udon ăn liền nổi tiếng bán hai phiên bản nước dùng khác nhau cho miền đông và miền tây Nhật Bản.',
    ],
    reference: { label: 'Udon — Wikipedia tiếng Anh', url: 'https://en.wikipedia.org/wiki/Udon' },
  },
  'com-ca-ri-heo-chien-xu': {
    homeland: 'Tokyo · Yokosuka, Nhật Bản',
    era: 'Cà ri từ thời Minh Trị · katsu kare thế kỷ XX',
    tagline:
      'Cà ri đến Nhật qua tay người Anh, miếng thịt chiên xù là món Tây kiểu Nhật: một đĩa cơm ngọt dịu mà chở cả trăm năm học hỏi phương Tây.',
    origin: [
      'Cà ri không đến Nhật thẳng từ Ấn Độ mà qua người Anh, vào thời Minh Trị cuối thế kỷ XIX. Bột cà ri đóng lọ của Anh được nấu sệt với roux bột mì như một món hầm, hợp khẩu vị người Nhật hơn hẳn cà ri lỏng, cay nồng. Hải quân Nhật, vốn học theo hải quân Hoàng gia Anh, đưa cơm cà ri vào khẩu phần vì rẻ, nấu được cả nồi lớn và đủ chất; nhiều tài liệu gắn việc này với nỗ lực cải thiện bữa ăn để chống bệnh tê phù trên tàu.',
      'Lính xuất ngũ mang món ăn về làng, và cà ri dần thành món gia đình. Từ thập niên 1950–1960, các hãng thực phẩm bán roux cà ri dạng viên: chỉ cần thả vào nồi hành tây, khoai tây, cà rốt và thịt là xong bữa tối. Vì thế cà ri Nhật ngọt dịu, đặc sánh, ít cay hơn nhiều so với cà ri Ấn hay Thái, và gần như luôn ăn với cơm trắng.',
      'Đặt miếng tonkatsu lên đĩa cơm cà ri là chuyện của thế kỷ XX. Quán Grill Swiss ở Ginza tự nhận là nơi khai sinh katsu kare vào năm 1948: cầu thủ bóng chày Chiba Shigeru của đội Yomiuri Giants, khách quen của quán, ngại ăn hai món riêng nên nhờ đầu bếp gộp làm một. Cũng có ý kiến cho rằng các quán ở Asakusa, Shinjuku đã bán món tương tự từ thập niên 1910–1920. Ở Việt Nam, cơm cà ri katsu là món chủ lực của các chuỗi cơm Nhật.',
    ],
    timeline: [
      {
        when: 'Thời Minh Trị',
        what: 'Cà ri kiểu Anh du nhập vào Nhật qua hải quân và các nhà hàng món Tây.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Cơm cà ri thành món quen trong quân đội rồi lan vào bữa cơm gia đình.',
      },
      {
        when: 'Năm 1948',
        what: 'Grill Swiss ở Ginza phục vụ katsu kare theo yêu cầu của cầu thủ Chiba Shigeru.',
      },
      {
        when: 'Thập niên 1950–1960',
        what: 'Roux cà ri dạng viên giúp mọi gia đình nấu cà ri trong vài chục phút.',
      },
      {
        when: 'Năm 1999',
        what: 'Thành phố cảng Yokosuka tuyên bố là “thành phố cà ri”, gắn với cà ri hải quân.',
      },
    ],
    meaning: [
      'Kare raisu, cơm cà ri, đứng đầu nhiều cuộc khảo sát món ăn trẻ em Nhật yêu thích. Các bà mẹ nấu cả nồi to, ăn liền hai ba bữa, và ai cũng tin cà ri để qua đêm ngon hơn hôm đầu. Đi cắm trại, trại hè, sinh hoạt câu lạc bộ ở trường, tiết mục quen thuộc là cả nhóm cùng gọt khoai, thái cà rốt, nấu chung một nồi cà ri.',
      'Đây là ví dụ đẹp về tài “Nhật hóa” đồ ngoại: một món Ấn qua tay người Anh, đến Nhật thì ngọt hơn, sánh hơn, tiện hơn, và nay chẳng ai coi là món nước ngoài. Thêm miếng katsu giòn lên trên, đĩa cơm thành bữa trưa no căng cho học sinh, dân văn phòng; mà “katsu” lại đồng âm với chữ “thắng”, nên đĩa cơm cũng hay được gọi trước ngày thi hay trận đấu.',
    ],
    symbols: [
      {
        name: 'Sốt cà ri Nhật',
        meaning:
          'Roux bột mì xào với bột cà ri, nấu sánh mượt, ngọt dịu; dấu vết của con đường Ấn Độ, Anh rồi đến Nhật.',
      },
      {
        name: 'Thịt heo chiên xù',
        meaning:
          'Lăn bột mì, trứng, vụn bánh mì panko rồi chiên vàng; độ giòn đối trọng với lớp sốt mềm.',
      },
      {
        name: 'Khoai tây và cà rốt',
        meaning:
          'Cùng hành tây làm thành bộ ba quen mặt trong mọi nồi cà ri gia đình, hầm mềm cho sốt thêm ngọt bùi.',
      },
      {
        name: 'Cơm trắng và xà lách',
        meaning:
          'Cơm hạt tròn dẻo một bên, cà ri một bên; vài lá xà lách hay bắp cải bào giúp đĩa cơm bớt nặng.',
      },
    ],
    tasting: [
      'Cơm cà ri là một trong ít món Nhật ăn bằng thìa. Cắt miếng katsu thành dải, xúc cùng cơm và một chút sốt để miếng nào cũng vừa giòn vừa đậm. Người Nhật thường không trộn cả đĩa mà ăn dần từ chỗ cơm giáp sốt, giữ phần katsu còn giòn cho đến cuối.',
      'Ăn kèm truyền thống là fukujinzuke, dưa muối đỏ ngọt, hoặc củ kiệu ngâm rakkyō để miệng đỡ ngấy. Một đĩa xà lách hoặc bắp cải bào cũng giúp cân bằng vị béo. Sốt cà ri thường làm từ bột mì, người kiêng gluten nên hỏi kỹ.',
    ],
    facts: [
      'Tàu của Lực lượng Phòng vệ Biển Nhật Bản có lệ ăn cà ri vào thứ Sáu, mỗi tàu một công thức riêng.',
      'Grill Swiss ở Ginza đến nay vẫn ghi món katsu kare trong thực đơn kèm tên cầu thủ Chiba Shigeru.',
      'Năm 1999, Yokosuka tuyên bố là “thành phố cà ri” để quảng bá món cà ri hải quân.',
    ],
    reference: {
      label: 'Katsu curry — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Katsu_curry',
    },
  },
  tteokbokki: {
    homeland: 'Seoul, Hàn Quốc · phố Sindang-dong',
    era: 'Ghi chép từ thế kỷ XIX · bản sốt đỏ từ năm 1953',
    tagline:
      'Từ món bánh gạo xào nước tương trong sách nấu ăn cổ đến chảo tteokbokki đỏ rực trước cổng trường: món ăn vặt mang cả tuổi thơ người Hàn.',
    origin: [
      'Tteok (떡) là bánh gạo, thứ không thể vắng trong lễ tết của người Triều Tiên. Ghi chép sớm nhất về tteokbokki nằm trong Siuijeonseo, sách nấu ăn thế kỷ XIX: bánh gạo trắng xào với thịt thăn bò, dầu mè, nước tương, hành, hạt thông và mè rang. Phiên bản không cay ấy ngày nay được gọi là gungjung tteokbokki, “tteokbokki cung đình”, mặn ngọt thanh nhã, hợp với mâm cỗ hơn là quầy hàng rong.',
      'Chảo bánh gạo đỏ rực quen thuộc bắt đầu từ bà Ma Bok-rim ở Sindang-dong, Seoul. Theo câu chuyện được kể lại nhiều nhất, năm 1953 bà dự khai trương một quán ăn Trung Hoa, lỡ làm rơi miếng bánh gạo vào bát mì tương đen và thấy ngon lạ. Từ đó bà thử nấu bánh gạo với gochujang pha chút tương đen chunjang, dựng một quầy nhỏ đầu hẻm với bếp than tổ ong và cái chảo thiếc. Chi tiết “tình cờ” có lẽ đã được tô vẽ, nhưng quán của bà vẫn còn đó, và Sindang-dong thành phố tteokbokki.',
      'Thập niên 1960–1970, khi chính phủ vận động ăn bột mì để tiết kiệm gạo, nhiều quán dùng bánh làm từ bột mì, và tteokbokki thành món bunsik, đồ ăn vặt rẻ tiền trước cổng trường. Chả cá eomuk, trứng luộc, mì gói, phô mai lần lượt được thả vào chảo; thêm mì ramyeon thì thành rabokki. Theo phim ảnh Hàn, món này đến Việt Nam và nay có mặt từ quán vỉa hè đến các tiệm lẩu Hàn.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XIX',
        what: 'Sách Siuijeonseo ghi món bánh gạo xào thịt bò, nước tương, không hề cay.',
      },
      {
        when: 'Năm 1953',
        what: 'Bà Ma Bok-rim bắt đầu bán tteokbokki sốt gochujang ở Sindang-dong, Seoul.',
      },
      {
        when: 'Thập niên 1970–1980',
        what: 'Tteokbokki thành món ăn vặt học đường; quán ở Sindang-dong có cả DJ chơi nhạc.',
      },
      {
        when: 'Năm 2011',
        what: 'Bà Ma Bok-rim qua đời, quán được con cháu tiếp tục giữ lửa.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Tteokbokki phổ biến rộng ở Việt Nam theo làn sóng văn hóa Hàn.',
      },
    ],
    meaning: [
      'Hỏi người Hàn về tteokbokki, nhiều người kể chuyện tan học: mấy đứa bạn đứng quanh xe đẩy, chia nhau một đĩa giấy bánh gạo nóng, xuýt xoa vì cay, tính xem còn đủ tiền mua thêm miếng chả cá không. Đến thập niên 1970–1980, các quán ở Sindang-dong còn mời DJ chơi nhạc theo yêu cầu, biến đĩa bánh gạo thành nơi hẹn hò của tuổi mới lớn. Trên phim Hàn, nhân vật buồn thì ăn tteokbokki, vui cũng ăn tteokbokki.',
      'Con đường từ món cung đình xì dầu đến món vỉa hè cay xé lưỡi cũng là con đường của xã hội Hàn sau chiến tranh: đồ quý tộc trở nên bình dân, nguyên liệu rẻ khơi ra sáng tạo, và vị cay ngọt của gochujang dần thành chữ ký của ẩm thực Hàn hiện đại. Một cuốn tản văn bán chạy của Hàn Quốc còn lấy tên món này làm nhan đề, như thể tteokbokki là lý do nhỏ để níu người ta ở lại với ngày mai.',
    ],
    symbols: [
      {
        name: 'Bánh gạo garae-tteok',
        meaning:
          'Thỏi bánh dài dẻo dai, nhạt vị nên ngấm sốt rất tốt; bánh gạo gắn với lễ tết và sự no đủ của người Hàn.',
      },
      {
        name: 'Tương ớt gochujang',
        meaning:
          'Ớt, gạo nếp, đậu nành lên men; cho sốt màu đỏ, vị cay ngọt và độ sánh bám quanh từng thỏi bánh.',
      },
      {
        name: 'Chả cá eomuk',
        meaning:
          'Chả cá dát mỏng, mềm ngọt, người bạn không thể thiếu của tteokbokki ở mọi xe đẩy.',
      },
      {
        name: 'Trứng luộc',
        meaning: 'Lăn trong sốt cho thấm, dằm ra thì lòng đỏ làm dịu vị cay và giúp no lâu.',
      },
      {
        name: 'Hành lá và mè rang',
        meaning: 'Rắc lên cuối cùng cho mùi tươi và chút bùi, làm sáng màu chảo sốt đỏ.',
      },
    ],
    tasting: [
      'Ăn ngay khi bánh còn nóng, vì nguội đi bánh gạo cứng lại rất nhanh. Người Hàn dùng xiên hoặc đũa, gọi thêm twigim, các món chiên giòn như khoai lang, rau củ, mực, rồi nhúng chúng vào sốt. Bánh gạo dai, nhai chậm thôi.',
      'Cay quá thì dằm trứng luộc vào sốt, hoặc ăn kèm kimbap và một cốc nước lạnh. Ở quán ăn tại chỗ, khi bánh đã hết, nhiều người xin thêm cơm, rong biển vụn để rang luôn với phần sốt còn lại, gọi là bokkeumbap. Chả cá làm từ cá xay, người dị ứng hải sản cần lưu ý.',
    ],
    facts: [
      'Tteokbokki trong sách nấu ăn thế kỷ XIX hoàn toàn không cay, được xào với nước tương và thịt bò.',
      'Bản tteokbokki sốt đỏ được cho là ra đời sau khi một miếng bánh gạo rơi vào bát mì tương đen.',
      'Tập tản văn “I Want to Die but I Want to Eat Tteokbokki” của Baek Se-hee (bản tiếng Hàn năm 2018) được dịch và bán chạy ở nhiều nước.',
    ],
    reference: {
      label: 'Tteok-bokki — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Tteok-bokki',
    },
  },
  'mi-vit-tiem': {
    homeland: 'Chợ Lớn, Sài Gòn · cộng đồng người Hoa ở Việt Nam',
    era: 'Thế kỷ XX',
    tagline:
      'Cái đùi vịt nâu bóng nằm trên vắt mì vàng, chén nước tiềm thơm đương quy, táo đỏ: món mì của những tiệm Hoa lâu năm trong Chợ Lớn.',
    origin: [
      'Mì vịt tiềm là sản phẩm của các tiệm mì người Hoa ở Việt Nam, nhất là quanh Chợ Lớn, nơi người Quảng Đông, Triều Châu, Phúc Kiến, Hải Nam, Hẹ sinh sống qua nhiều thế hệ. Khó chỉ ra một “bản gốc” bên Trung Hoa mang đúng cái tên này. Đúng hơn, đó là cuộc gặp giữa hai thứ người Hoa mang theo khi di cư: tô mì trứng của tiệm mì và nồi hầm thuốc Bắc bồi bổ của bếp nhà.',
      'Tiềm là kiểu hầm chậm, đậy kín cho thịt mềm và ngấm vị, rất gần với các món hầm của người Quảng. Đùi vịt thường được ướp ngũ vị, nhiều tiệm chiên sơ cho da săn lại, rồi mới hầm cùng nước tương, nấm hương và các vị thuốc như đương quy, kỷ tử, táo đỏ, hồi, quế. Nước tiềm sậm màu, ngọt từ xương và táo, thoảng đắng nhẹ của thảo dược.',
      'Không chỉ ở Sài Gòn mới có kiểu ăn này. Ở Singapore, Malaysia, người Hoa cũng bán mì hoặc mì sợi mảnh với đùi vịt hầm thuốc Bắc; ở Penang, món này còn có tên riêng. Nhưng cách dọn của tiệm Chợ Lớn, mì trụng săn, đùi vịt nguyên chiếc, cải thìa xanh và chén nước tiềm múc riêng, là gương mặt mà người Việt quen nhất. Từ Chợ Lớn, món mì lan khắp Sài Gòn và ra cả Hà Nội.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XVIII–XIX',
        what: 'Người Hoa định cư ở Chợ Lớn, mang theo nghề mì sợi và tập quán hầm thuốc Bắc.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Các tiệm mì gia đình người Hoa phát triển mạnh ở Sài Gòn – Chợ Lớn.',
      },
      {
        when: 'Nửa sau thế kỷ XX',
        what: 'Mì vịt tiềm thành món đặc trưng của nhiều tiệm mì Hoa lâu năm.',
      },
      {
        when: 'Ngày nay',
        what: 'Món mì có mặt ở nhiều thành phố Việt Nam, vượt khỏi phạm vi cộng đồng người Hoa.',
      },
    ],
    meaning: [
      'Theo quan niệm ăn uống của người Hoa, thịt vịt tính mát, còn đương quy, quế, táo đỏ tính ấm; hầm chung là để món ăn cân bằng, vừa ngon vừa bổ. Nồi vịt tiềm, gà tiềm vì vậy hay được nấu cho người mới ốm dậy, người già, hay vào những ngày trở trời. Một chén nước tiềm nóng là cách chăm nhau rất kín đáo, không cần nói thành lời.',
      'Ở tiệm mì Chợ Lớn, tô mì vịt tiềm còn là dấu tích của nhiều thế hệ sống chung. Có rau cải, hành ngò, có chén ớt và chai xì dầu để khách tự nêm theo kiểu người Việt; có bảng hiệu chữ Hán, tiếng gọi món lẫn tiếng Quảng, tiếng Việt. Với nhiều người Sài Gòn, ngồi ăn mì vịt tiềm trong một tiệm cũ là cách chạm vào phố Hoa mà không cần đi đâu xa.',
    ],
    symbols: [
      {
        name: 'Đùi vịt tiềm',
        meaning:
          'Nguyên chiếc, da nâu óng, thịt mềm tách khỏi xương; vịt là món bồi bổ quen thuộc trong bếp Hoa.',
      },
      {
        name: 'Mì trứng',
        meaning:
          'Sợi vàng nhỏ, trụng nhanh rồi xả để giữ độ săn giòn, chữ ký của các tiệm mì người Hoa.',
      },
      {
        name: 'Táo đỏ và thuốc Bắc',
        meaning:
          'Táo đỏ cho hậu vị ngọt dịu, đương quy, kỷ tử, quế cho mùi thảo dược ấm, đúng tinh thần “ăn để dưỡng”.',
      },
      {
        name: 'Nấm hương và cải thìa',
        meaning:
          'Nấm ngấm nước tiềm, thơm mùi đất rừng; cải thìa giòn ngọt kéo lại vị đậm của nồi hầm.',
      },
      {
        name: 'Hành lá và rau mùi',
        meaning: 'Thả vào sau cùng cho tô mì dậy mùi, nét Việt hóa quen thuộc của tiệm mì Hoa.',
      },
    ],
    tasting: [
      'Mì vịt tiềm có thể gọi nước, hoặc gọi khô: mì trộn sốt riêng, nước tiềm múc ra chén để húp kèm. Dùng đũa tách thịt vịt khỏi xương, chấm vào chén xì dầu ngâm ớt nếu thích đậm hơn. Đùi vịt to, ăn từ từ, xen với mì và rau.',
      'Mỡ vịt béo, nên nhiều người thêm vài lát ớt tươi, chút tiêu hoặc giấm. Húp nước tiềm khi còn nóng mới thấy rõ mùi đương quy. Phụ nữ mang thai và người đang dùng thuốc nên hỏi kỹ thành phần thuốc Bắc trong nồi tiềm.',
    ],
    facts: [
      'Nhiều tiệm chiên sơ đùi vịt trước khi tiềm để da săn, không bị bở khi hầm lâu.',
      'Ở Penang, Malaysia, đùi vịt hầm thuốc Bắc ăn với mì sợi mảnh là một món hàng rong quen thuộc.',
      'Khách quen ở Chợ Lớn hay gọi mì vịt tiềm “khô”, để nước tiềm riêng cho sợi mì khỏi bị mềm.',
    ],
  },
  kimbap: {
    homeland: 'Hàn Quốc',
    era: 'Định hình trong thế kỷ XX',
    tagline:
      'Cuộn cơm dầu mè bọc rong biển, cắt ra thấy cả vàng, cam, xanh: món mang theo của mọi chuyến dã ngoại tuổi học trò Hàn Quốc.',
    origin: [
      'Kimbap (김밥), ghép từ gim là rong biển và bap là cơm, nghĩa là cơm rong biển. Người Triều Tiên ăn rong biển từ rất sớm. Sách phong tục Yeoryang sesigi năm 1819 đã nhắc đến bokssam, tục gói cơm trong lá rong biển ăn vào dịp rằm tháng Giêng để cầu may. Đó là dấu vết rõ ràng nhất cho thấy chuyện bọc cơm bằng rong biển không phải điều người Hàn phải học từ ai.',
      'Còn kiểu cuộn tròn trên mành tre rồi cắt khoanh thì có nhiều tranh luận. Phần đông nhà nghiên cứu cho rằng nó chịu ảnh hưởng từ norimaki của Nhật trong thời kỳ thuộc địa (1910–1945); nhiều người Hàn nhấn mạnh truyền thống bokssam bản địa. Dù gốc gác ra sao, kimbap đã rẽ hẳn sang đường riêng: cơm trộn dầu mè và muối chứ không trộn giấm, nhân dày đủ trứng, rau, củ cải vàng, thịt, và được coi là bữa ăn chứ không phải món nhắm.',
      'Nửa sau thế kỷ XX, kimbap thành món mang theo trong những chuyến dã ngoại sopung và ngày hội thể thao của học sinh, rồi thành món ăn nhanh bán cả ngày ở các tiệm bình dân. Ở Tongyeong có chungmu gimbap chỉ cuộn cơm trắng, ăn với mực cay; ở chợ Gwangjang có mayak gimbap nhỏ bằng ngón tay. Năm 2023, kimbap đông lạnh cháy hàng ở chuỗi siêu thị Trader Joe’s tại Mỹ. Ở Việt Nam, kimbap có mặt từ quán Hàn, cửa hàng tiện lợi đến hộp cơm mẹ cuộn cho con đi học.',
    ],
    timeline: [
      {
        when: 'Năm 1819',
        what: 'Sách Yeoryang sesigi ghi tục gói cơm bằng rong biển (bokssam) đầu năm.',
      },
      {
        when: 'Nửa đầu thế kỷ XX',
        what: 'Cơm cuộn rong biển cắt khoanh xuất hiện, nguồn gốc còn nhiều tranh luận.',
      },
      {
        when: 'Nửa sau thế kỷ XX',
        what: 'Kimbap thành món mang theo khi dã ngoại và món ăn nhanh hằng ngày.',
      },
      {
        when: 'Năm 2023',
        what: 'Kimbap đông lạnh của Hàn Quốc cháy hàng tại chuỗi Trader Joe’s ở Mỹ.',
      },
    ],
    meaning: [
      'Với người Hàn, mùi dầu mè buổi sớm là mùi của ngày đi dã ngoại. Mẹ dậy từ tờ mờ sáng, rán trứng, xào cà rốt, chần rau, rồi cuộn từng cây kimbap bên mâm, thỉnh thoảng nhét mẩu đầu cuộn vào miệng đứa con đang đứng chờ. Đến trưa, hộp kimbap được mở ra giữa đám bạn, ai cũng nếm thử của nhà người khác. Nhiều người lớn rồi vẫn nói không kimbap ngoài hàng nào ngon bằng kimbap của mẹ.',
      'Ngày nay kimbap còn là bữa ăn của nhịp sống vội: cầm tay được, không cần thìa đũa, đủ cơm, rau, đạm trong một khoanh. Sinh viên ôn thi, tài xế, nhân viên văn phòng đều mua một cuộn mang đi. Mặt cắt nhiều màu của nó gợi đến bát bibimbap, nhưng gói gọn để chia cho cả nhóm, mỗi người một khoanh.',
    ],
    symbols: [
      {
        name: 'Rong biển gim',
        meaning:
          'Lá rong nướng giòn, có khi phết dầu mè, giữ chặt cuộn cơm và mang vị biển mằn mặn.',
      },
      {
        name: 'Cơm trộn dầu mè',
        meaning: 'Điểm khác cốt lõi với maki Nhật: cơm nêm dầu mè và muối, không dùng giấm.',
      },
      {
        name: 'Củ cải vàng muối (danmuji)',
        meaning: 'Dải củ cải vàng tươi, giòn, chua ngọt, gần như có mặt trong mọi cuộn kimbap.',
      },
      {
        name: 'Trứng, rau bina, cà rốt',
        meaning: 'Tạo các mảng vàng, xanh, cam ở mặt cắt; mỗi thứ được nêm riêng trước khi cuộn.',
      },
      {
        name: 'Thịt bò và kimchi',
        meaning:
          'Bò xào nước tương ngọt làm cuộn cơm đầy đặn; kimchi thái nhỏ thêm vị chua cay lên men.',
      },
    ],
    tasting: [
      'Mỗi khoanh kimbap ăn trọn một miếng, bằng đũa hay bằng tay đều được. Cơm và nhân đã nêm đủ, nên không cần chấm nước tương như sushi. Ăn kèm vài miếng kimchi hay củ cải muối cho giòn miệng.',
      'Người Hàn hay gọi kimbap cùng tteokbokki hoặc canh chả cá, rồi chấm khoanh kimbap vào sốt đỏ. Kimbap ngon nhất trong ngày; để tủ lạnh cơm sẽ cứng, khi đó nhúng khoanh kimbap vào trứng đánh rồi áp chảo là có món mới, mềm và nóng trở lại.',
    ],
    facts: [
      'Kimbap trộn cơm với dầu mè và muối chứ không trộn giấm, khác biệt rõ nhất so với maki của Nhật.',
      'Tháng 8 năm 2023, kimbap đông lạnh nhân đậu phụ và rau bán hết ở các cửa hàng Trader Joe’s trên khắp nước Mỹ chỉ trong khoảng hai tuần.',
      'Chungmu gimbap ở Tongyeong chỉ cuộn cơm trắng, phần nhân như mực cay và củ cải được dọn riêng.',
    ],
    reference: {
      label: 'Gimbap — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Gimbap',
    },
  },
  'mi-tron-han-quoc': {
    homeland: 'Hàn Quốc · phiên bản quán Hàn ở Việt Nam',
    era: 'Bibim-guksu từ thế kỷ XIX · mì trộn gói từ năm 1984',
    tagline:
      'Không cần nước dùng, chỉ cần sốt đỏ chua ngọt và đôi đũa đảo thật kỹ: tô mì trộn là cách người Hàn chống nóng giữa mùa hè.',
    origin: [
      'Trong tiếng Hàn, “bibim” là trộn, cùng gốc với bibimbap. Mì trộn bibim-guksu, còn gọi là goldongmyeon, đã có tên trong các sách nấu ăn cuối thế kỷ XIX: sợi mì trộn thịt bò xào, nấm, dưa chuột với nước tương, dầu mè. Về sau, ớt bột và gochujang lấn át, thêm giấm và đường, thành thứ sốt vừa cay vừa chua ngọt mà người Hàn tìm đến mỗi khi trời oi bức.',
      'Đến nửa sau thế kỷ XX, mì trộn gặp mì ăn liền. Gói ramyeon đầu tiên của Hàn Quốc ra đời năm 1963; hai mươi năm sau, năm 1984, Paldo tung ra Bibimmyeon, dòng mì gói không nước đầu tiên: luộc sợi, xả nước lạnh, trộn với gói sốt đỏ. Mì trộn từ đó thành món mùa hè quốc dân, rẻ, nhanh, ai cũng tự làm được trong căn bếp nhỏ.',
      'Tô mì trộn ở các quán Hàn tại Việt Nam là bản “nâng cấp” của gói mì quen thuộc: sợi mì xoăn kiểu ramyeon trộn sốt gochujang, thêm thịt bò, kimchi, nửa quả trứng lòng đào và rau sống như dưa leo, giá, cà rốt. Lượng rau nhiều hơn hẳn so với ở Hàn, hợp thói quen ăn rau của người Việt, và cũng gần với tinh thần bún trộn, gỏi trộn của mình.',
    ],
    timeline: [
      {
        when: 'Cuối thế kỷ XIX',
        what: 'Sách nấu ăn ghi món mì trộn goldongmyeon với thịt, rau và nước tương.',
      },
      { when: 'Năm 1963', what: 'Gói ramyeon đầu tiên được sản xuất tại Hàn Quốc.' },
      {
        when: 'Năm 1984',
        what: 'Paldo Bibimmyeon ra đời, mở đầu dòng mì trộn ăn liền không nước.',
      },
      { when: 'Thập niên 2010', what: 'Mì trộn kiểu Hàn nở rộ trong các quán ăn ở Việt Nam.' },
    ],
    meaning: [
      'Mì trộn cho thấy khẩu vị rất Hàn: chua, ngọt, cay cùng lúc, đậm và rõ ràng, không lấp lửng. Người Hàn coi việc trộn là một phần của bữa ăn chứ chẳng phải khâu chuẩn bị, nên cầm đũa đảo cho đều là thao tác đầu tiên, gần như vô thức. Những trưa tháng Bảy nóng hầm, một bát mì trộn mát lạnh, cay vừa phải là thứ giúp người ta qua được buổi chiều.',
      'Gói mì ăn liền ở Hàn Quốc cũng mang lớp nghĩa xã hội: từ món cứu đói sau chiến tranh, nó thành bữa khuya của sinh viên, bữa vội của người lao động, rồi thành biểu tượng đại chúng xuất hiện dày đặc trên phim ảnh. Với người Việt, tô mì trộn Hàn là cách nếm làn sóng Hàn Quốc gần gũi nhất, vì chính người Việt cũng thuộc nhóm ăn mì gói nhiều nhất thế giới.',
    ],
    symbols: [
      {
        name: 'Sợi mì ăn liền',
        meaning: 'Sợi xoăn, dai, xả nước lạnh cho săn rồi mới trộn; xoăn nên giữ sốt rất tốt.',
      },
      {
        name: 'Sốt gochujang chua ngọt',
        meaning:
          'Tương ớt pha giấm, đường, dầu mè, tỏi; tạo màu đỏ óng và vị đặc trưng của mọi món “bibim”.',
      },
      {
        name: 'Thịt bò và kimchi',
        meaning:
          'Bò xào mềm cho tô mì thành bữa chính; kimchi thái nhỏ trộn cùng, vị chua lên men cân lại sốt ngọt.',
      },
      {
        name: 'Trứng luộc',
        meaning: 'Nửa quả trứng lòng đào đặt trên cùng, dằm vào sốt cho béo và dịu cay.',
      },
      {
        name: 'Dưa leo, giá đỗ, cà rốt',
        meaning:
          'Rau sống, rau chần giòn mát làm món mì nhẹ hẳn đi, dấu ấn khẩu vị nhiều rau của các quán Việt.',
      },
    ],
    tasting: [
      'Như mọi món “bibim”, việc đầu tiên là trộn: dùng đũa đảo từ đáy bát lên, nhấc sợi mì lên cao rồi thả xuống, đến khi sợi nào cũng đỏ đều. Bổ quả trứng ra, để lòng đỏ hòa vào sốt.',
      'Cay quá thì ăn kèm dưa leo hoặc xin thêm chút đường; muốn chua hơn, thêm một thìa nước kimchi. Người Hàn hay ăn mì trộn cùng một bát canh nóng hoặc vài miếng thịt nướng, cái lạnh của mì và cái nóng của canh bù trừ cho nhau.',
    ],
    facts: [
      'Paldo Bibimmyeon, ra đời năm 1984, là thương hiệu mì trộn không nước lâu đời nhất Hàn Quốc.',
      'Trong tiếng Hàn, bibimbap, bibim-guksu và bibim-naengmyeon đều chung chữ “bibim”, nghĩa là trộn.',
      'Hàn Quốc và Việt Nam đều nằm trong nhóm nước ăn mì gói tính theo đầu người cao nhất thế giới.',
    ],
    reference: {
      label: 'Bibim-guksu — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Bibim-guksu',
    },
  },
  'com-ga-teriyaki': {
    homeland: 'Nhật Bản · lan rộng qua Hawaii và bờ Tây nước Mỹ',
    era: 'Kỹ thuật từ thời Edo · cơm gà teriyaki phổ biến thế kỷ XX',
    tagline:
      '“Teri” là ánh bóng, “yaki” là nướng: miếng gà áp chảo phết đi phết lại nước tương, mirin cho đến khi lớp sốt sáng lên như sơn mài.',
    origin: [
      'Teriyaki (照り焼き) là tên một cách nấu chứ không phải tên một món. Thịt hay cá được nướng hoặc áp chảo, vừa nướng vừa phết hỗn hợp nước tương, mirin, rượu sake và đường cho đến khi sốt cô lại, bám thành lớp bóng. Cách làm này thành hình trong thời Edo, khi nước tương và mirin đã thành gia vị phổ thông trong bếp Nhật.',
      'Ở chính nước Nhật, món teriyaki kinh điển là cá: buri teriyaki, cá cam mùa đông béo ngậy, có mặt trong bữa cơm nhà lẫn hộp cơm bento. Gà teriyaki nổi tiếng thế giới phần lớn nhờ người Nhật di cư sang Hawaii và bờ Tây nước Mỹ từ cuối thế kỷ XIX. Ở đó, sốt được làm ngọt hơn, đặc hơn, thêm gừng, tỏi, thậm chí nước dứa, hợp khẩu vị nơi ở mới và hợp với thịt gà, thứ rẻ và dễ mua.',
      'Năm 1976, Kasahara Toshihiro mở Toshi’s Teriyaki ở Seattle, bán cơm gà nướng phết sốt với xà lách trộn, và chẳng bao lâu thành phố có hàng trăm quán teriyaki nhỏ. Trước đó, năm 1973, chuỗi MOS Burger ở Nhật đã bán burger teriyaki, đưa vị sốt cũ vào món ăn nhanh kiểu Mỹ. Ở Việt Nam, cơm gà teriyaki là món dễ gọi nhất của các chuỗi cơm Nhật, cơm hộp văn phòng, hợp cả trẻ con lẫn người lớn tuổi.',
    ],
    timeline: [
      {
        when: 'Thời Edo',
        what: 'Nước tương và mirin phổ biến, kỹ thuật nướng phết sốt bóng thành hình.',
      },
      {
        when: 'Cuối thế kỷ XIX – đầu thế kỷ XX',
        what: 'Người Nhật di cư mang kỹ thuật teriyaki đến Hawaii và bờ Tây nước Mỹ.',
      },
      { when: 'Năm 1973', what: 'MOS Burger ở Nhật tung ra burger teriyaki.' },
      {
        when: 'Năm 1976',
        what: 'Toshi’s Teriyaki mở ở Seattle, khởi đầu làn sóng quán cơm gà teriyaki.',
      },
      {
        when: 'Thập niên 2000',
        what: 'Cơm gà teriyaki phổ biến trong các chuỗi cơm Nhật tại Việt Nam.',
      },
    ],
    meaning: [
      'Teriyaki gói gọn cách nghĩ của bếp Nhật: vài nguyên liệu cơ bản, làm đúng tay thì ra hương vị sâu. Lớp sốt bóng là để ngon, nhưng cũng là để đẹp, vì người Nhật ăn bằng mắt trước. Miếng gà teriyaki nguội vẫn ngon nên rất hợp với hộp bento, món mẹ Nhật hay xếp cho con mang đến trường, cạnh nắm cơm và vài bông súp lơ luộc.',
      'Đi một vòng qua Hawaii, Seattle rồi quay về Nhật dưới dạng chiếc burger, teriyaki cũng là câu chuyện của người Nhật xa xứ. Một kỹ thuật nhà bếp bình thường ở quê đã thành “hương vị Nhật” trong mắt người nước ngoài, đến mức nhiều người trên thế giới tưởng teriyaki là một loại nước sốt đóng chai chứ không phải một động tác của người nấu.',
    ],
    symbols: [
      {
        name: 'Thịt gà áp chảo',
        meaning:
          'Thường dùng đùi gà để mềm và mọng; da được áp chảo vàng giòn trước khi phết sốt cho bóng.',
      },
      {
        name: 'Sốt teriyaki',
        meaning:
          'Nước tương, mirin, sake, đường cô đặc; lớp “teri” sáng bóng là thước đo cách canh lửa.',
      },
      {
        name: 'Bông cải xanh, cà rốt, bắp ngọt, nấm',
        meaning:
          'Rau củ xào hoặc luộc nhiều màu theo kiểu bento, cân bằng dinh dưỡng và làm đĩa cơm tươi tắn.',
      },
      {
        name: 'Xà lách và cà chua',
        meaning:
          'Rau sống mát lạnh đặt cạnh miếng gà nóng, giúp vị ngọt mặn của sốt không bị ngấy.',
      },
      {
        name: 'Cơm trắng',
        meaning:
          'Cơm Nhật hạt tròn dẻo, ngấm phần sốt chảy xuống, nền của mọi phần cơm kiểu teishoku.',
      },
    ],
    tasting: [
      'Gà teriyaki thường được thái sẵn từng miếng vừa đũa. Gắp gà cùng một chút cơm đã ngấm sốt, xen kẽ với rau củ để miệng không bị ngọt quá. Phần sốt đọng dưới đáy đĩa rất đáng giá, hãy để dành cho những miếng cơm cuối.',
      'Người Nhật hay rắc thêm mè rang, hành lá, có người thích chút mayonnaise. Thêm bát súp miso và đĩa dưa muối là thành suất teishoku đầy đủ. Mang theo đi làm cũng được: gà teriyaki ăn nguội trong hộp bento vẫn giữ được vị.',
    ],
    facts: [
      'Ở Nhật, món teriyaki quen thuộc nhất trong bữa cơm nhà là cá cam buri, không phải gà.',
      'Toshi’s Teriyaki mở năm 1976 thường được coi là quán teriyaki đầu tiên của Seattle, nơi nay có hàng trăm quán cùng kiểu.',
      'MOS Burger tung ra burger teriyaki năm 1973; ban đầu khách khá thờ ơ vì nghe “teriyaki” là nghĩ ngay đến cá.',
    ],
    reference: {
      label: 'Teriyaki — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Teriyaki',
    },
  },
  'com-tonkatsu': {
    homeland: 'Ginza · Ueno, Tokyo, Nhật Bản',
    era: 'Katsuretsu từ năm 1899 · tonkatsu dày từ năm 1929',
    tagline:
      'Từ miếng cốt lết mỏng kiểu Âu ở Ginza đến lát thịt heo dày chiên vàng ở Ueno: tonkatsu là món Tây được người Nhật làm lại từ đầu.',
    origin: [
      'Khi Nhật Bản mở cửa thời Minh Trị, các nhà hàng yōshoku, món Tây kiểu Nhật, mọc lên ở Tokyo. Rengatei ở Ginza, mở năm 1895, đưa món “pork katsuretsu” vào thực đơn năm 1899, phỏng theo cốt lết bê kiểu Pháp. Thay vì áp chảo trong bơ, đầu bếp chiên ngập dầu như tempura, một kỹ năng bếp Nhật đã thạo, và miếng thịt giữ được nước bên trong.',
      'Cũng theo lời kể của Rengatei, rau củ nấu chín đi kèm dần được thay bằng bắp cải thái chỉ để sống, nhanh hơn khi bếp thiếu người, thường được gắn với thời chiến tranh Nga – Nhật (1904–1905). Chi tiết thời gian khó kiểm chứng, nhưng đĩa bắp cải bào thì từ đó không rời miếng thịt chiên. Miếng katsuretsu thời ấy còn mỏng, ăn bằng dao nĩa, dọn với bánh mì hoặc cơm trên đĩa kiểu Tây.',
      'Bước ngoặt sang tonkatsu như ngày nay thường được ghi cho quán Ponchiken ở Okachimachi, gần Ueno, năm 1929: thịt heo cắt dày, chiên chậm cho chín đều, thái sẵn thành dải để ăn bằng đũa, dọn cùng cơm, súp miso, dưa muối. Chữ “tonkatsu”, ghép từ “ton” là heo và “katsu” rút gọn từ katsuretsu, có thể đã xuất hiện sớm hơn ở hàng quán, và vài quán khác cũng nhận công đầu. Ở Việt Nam, cơm tonkatsu là món quen của các chuỗi cơm Nhật và quán ăn văn phòng.',
    ],
    timeline: [
      { when: 'Năm 1895', what: 'Nhà hàng món Tây Rengatei mở cửa ở Ginza, Tokyo.' },
      { when: 'Năm 1899', what: 'Rengatei bán “pork katsuretsu”, tiền thân của tonkatsu.' },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Bắp cải thái chỉ thành món ăn kèm quen thuộc của thịt chiên xù.',
      },
      {
        when: 'Năm 1929',
        what: 'Quán Ponchiken ở Okachimachi bán thịt heo chiên dày, thái sẵn, ăn với cơm.',
      },
      {
        when: 'Thập niên 1930',
        what: 'Tonkatsu bùng nổ ở các khu phố bình dân của Tokyo, đặc biệt quanh Ueno.',
      },
    ],
    meaning: [
      'Trong tiếng Nhật, “katsu” đồng âm với 勝つ, nghĩa là thắng. Đêm trước kỳ thi đại học, nhiều bà mẹ Nhật nấu katsudon cho con; vận động viên ăn katsu trước trận đấu, người đi phỏng vấn xin việc cũng thế. Miếng thịt chiên giòn vì vậy mang theo một lời chúc, nghe vừa nghiêm túc vừa có chút hài hước, rất đúng kiểu chơi chữ người Nhật ưa.',
      'Tonkatsu còn là gương mặt tiêu biểu của yōshoku, dòng món Tây đã Nhật hóa đến tận gốc. Đổi cách chiên, cách cắt, cách ăn kèm và cả dụng cụ ăn, người Nhật biến cốt lết châu Âu thành món mà ít ai còn coi là ngoại. Những quán chuyên tonkatsu ở Tokyo tranh nhau từng chi tiết: giống heo, nhiệt độ dầu, độ to của vụn panko, đến cả độ mảnh của sợi bắp cải.',
    ],
    symbols: [
      {
        name: 'Thịt heo chiên xù',
        meaning:
          'Thăn (rōsu) hoặc thăn chuột (hire) cắt dày, áo bột panko; vỏ giòn mà thịt vẫn mọng là thước đo tay nghề.',
      },
      {
        name: 'Bắp cải thái chỉ',
        meaning:
          'Mỏng như sợi chỉ, mát và giòn, cân lại vị béo; nhiều quán ở Nhật cho thêm miễn phí.',
      },
      {
        name: 'Sốt tonkatsu',
        meaning:
          'Sốt nâu sánh, chua ngọt, phát triển từ sốt Worcestershire của Anh, đúng chất món Tây kiểu Nhật.',
      },
      {
        name: 'Dưa leo, cà rốt, xà lách',
        meaning: 'Rau tươi đặt cạnh đĩa cho thêm màu và độ giòn, giúp bữa ăn đỡ nặng.',
      },
      {
        name: 'Cơm trắng',
        meaning: 'Bát cơm nóng hạt tròn, cùng súp miso và dưa muối làm nên suất teishoku trọn vẹn.',
      },
    ],
    tasting: [
      'Tonkatsu được thái sẵn thành dải để ăn bằng đũa. Rưới sốt lên từng miếng khi sắp ăn chứ đừng đổ cả đĩa, kẻo lớp vỏ mềm đi. Ở nhiều quán, khách được đưa cối nhỏ và mè rang để tự nghiền rồi trộn với sốt, mùi mè thơm lên ngay khi chày chạm vào hạt.',
      'Một chút mù tạt vàng karashi, vài giọt chanh và đĩa bắp cải rưới sốt mè là bộ ăn kèm kinh điển. Ăn xen kẽ thịt, cơm, bắp cải để không bị ngấy. Bát súp miso nấu với thịt heo và rau củ, gọi là tonjiru, là thứ các quán tonkatsu hay dọn kèm.',
    ],
    facts: [
      'Vì “katsu” đồng âm với “thắng”, nhiều học sinh Nhật ăn món katsu trước ngày thi.',
      'Nhiều quán tonkatsu ở Nhật cho khách thêm bắp cải, cơm, thậm chí súp miso miễn phí.',
      'Khu Ueno – Okachimachi ở Tokyo thường được gọi là quê hương của tonkatsu, với nhiều quán lâu đời.',
    ],
    reference: {
      label: 'Tonkatsu — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Tonkatsu',
    },
  },
  'com-bo-gyudon': {
    homeland: 'Nihonbashi, Tokyo, Nhật Bản',
    era: 'Thời Minh Trị · Yoshinoya từ năm 1899',
    tagline:
      'Bát cơm bò hành tây sinh ra ở chợ cá Nihonbashi để phu chợ ăn cho nhanh, nay là bữa “ngon, rẻ, nhanh” mở cửa suốt đêm khắp nước Nhật.',
    origin: [
      'Suốt hơn một nghìn năm, ảnh hưởng của Phật giáo và các chiếu lệnh cấm sát sinh khiến người Nhật hầu như không ăn thịt gia súc; lệnh của Thiên hoàng Tenmu năm 675 thường được nhắc như khởi đầu. Thời Minh Trị, ăn thịt bò được cổ vũ như dấu hiệu văn minh, nhất là sau khi chính Thiên hoàng ăn thịt bò năm 1872. Lẩu bò gyūnabe thành mốt ở Tokyo, và người ta bắt đầu múc thịt bò om lên cơm, gọi là gyūmeshi.',
      'Năm 1899, Matsuda Eikichi mở quán Yoshinoya đầu tiên ở chợ cá Nihonbashi, bán cho phu chợ một bát cơm ăn vội mà no: thịt bò thái mỏng om với hành tây trong nước dùng dashi, nước tương, mirin, đường, rồi rưới lên cơm nóng. Sau trận động đất lớn Kantō năm 1923, chợ cá dời về Tsukiji, Yoshinoya đi theo, và gyūdon (牛丼) dần rời khỏi thân phận món của dân lao động để thành món của mọi người.',
      'Từ cuối thập niên 1960, Yoshinoya, Matsuya, rồi Sukiya mở chuỗi khắp nước, nhiều quán sáng đèn hai mươi bốn giờ cạnh nhà ga, với khẩu hiệu “ngon, rẻ, nhanh”. Biến thể quen thuộc là thêm trứng sống hoặc trứng onsen lên trên, rắc gừng đỏ, hành lá. Ở Việt Nam, gyūdon có trong thực đơn hầu hết quán Nhật và chuỗi cơm văn phòng, thường kèm trứng lòng đào và mè rang.',
    ],
    timeline: [
      {
        when: 'Năm 1872',
        what: 'Thiên hoàng Minh Trị ăn thịt bò, lẩu bò gyūnabe thành mốt ở Tokyo.',
      },
      { when: 'Năm 1899', what: 'Yoshinoya mở quán đầu tiên ở chợ cá Nihonbashi, Tokyo.' },
      {
        when: 'Sau năm 1923',
        what: 'Chợ cá dời về Tsukiji sau động đất Kantō; gyūdon phổ biến khắp Tokyo.',
      },
      {
        when: 'Cuối thập niên 1960–1980',
        what: 'Các chuỗi Yoshinoya, Matsuya, Sukiya đưa gyūdon thành món ăn nhanh quốc dân.',
      },
      {
        when: 'Năm 2004',
        what: 'Yoshinoya ngừng bán gyūdon ở Nhật vì lệnh cấm nhập khẩu bò Mỹ sau dịch bò điên.',
      },
    ],
    meaning: [
      'Gyūdon là nhịp thở của đô thị Nhật. Bước vào quán, gọi món qua máy hoặc nói một câu, bát cơm đặt xuống trước mặt chưa đầy một phút, ăn xong trong mười phút rồi đi. Nhân viên văn phòng tăng ca, sinh viên hết tiền cuối tháng, tài xế chạy đêm đều tin vào nó: không cầu kỳ, nhưng ở đâu, giờ nào cũng có và lúc nào cũng y như nhau.',
      'Món ăn còn ghi lại một khúc quanh văn hóa: từ một xã hội gần như kiêng thịt, nước Nhật thời Minh Trị đã đưa thịt bò vào bát cơm hằng ngày chỉ trong vài chục năm. Mỗi lần các chuỗi gyūdon tăng hay giảm giá vài chục yên, báo chí Nhật lại đưa tin, như thể giá một bát cơm bò cũng là một chỉ số đo đời sống người làm công.',
    ],
    symbols: [
      {
        name: 'Thịt bò thái mỏng',
        meaning:
          'Thường là ba chỉ bò có vân mỡ, om nhanh cho mềm; dấu ấn của thời Minh Trị khi thịt bò được chấp nhận.',
      },
      {
        name: 'Hành tây',
        meaning: 'Om mềm trong nước sốt, tiết vị ngọt tự nhiên, phần ngọt dịu làm nền cho cả bát.',
      },
      {
        name: 'Trứng',
        meaning:
          'Trứng sống, trứng onsen hay lòng đào phủ lên thịt, làm vị mặn ngọt tròn và béo hơn.',
      },
      {
        name: 'Gừng hồng (beni shōga)',
        meaning:
          'Gừng ngâm mận muối màu đỏ, chua cay nhẹ, cắt độ ngấy; ở quán gyūdon thường để sẵn trên bàn.',
      },
      {
        name: 'Hành lá và mè rang',
        meaning: 'Rắc lên cuối cùng cho mùi tươi và chút bùi, làm sáng màu bát cơm nâu.',
      },
    ],
    tasting: [
      'Nâng bát lên gần miệng và và cơm cùng thịt bằng đũa, cách ăn bình thường với mọi món donburi ở Nhật. Với trứng, có thể chọc vỡ lòng đỏ cho chảy xuống từ từ, hoặc trộn một góc bát rồi ăn dần, thay vì khuấy tung cả bát ngay từ đầu.',
      'Ở quán Nhật, gọi “tsuyudaku” để có thêm nước sốt ngấm cơm. Rắc chút shichimi tōgarashi cho ấm, thêm gừng hồng sau vài miếng để đổi vị. Trứng sống và trứng lòng đào chưa chín kỹ, ai cần kiêng nên gọi trứng chín.',
    ],
    facts: [
      'Ngày 11 tháng 2 năm 2004, Yoshinoya và hầu hết đối thủ ngừng bán gyūdon ở Nhật vì lệnh cấm nhập khẩu bò Mỹ sau dịch bò điên.',
      'Khẩu hiệu “umai, yasui, hayai”, ngon, rẻ, nhanh, gắn liền với các chuỗi gyūdon Nhật Bản.',
      'Từ “tsuyudaku”, nhiều nước sốt, vốn là ám hiệu nội bộ của nhân viên Yoshinoya từ thập niên 1950 trước khi khách cũng dùng theo.',
    ],
    reference: {
      label: 'Gyūdon — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Gy%C5%ABdon',
    },
  },
  'com-ca-saba-nuong': {
    homeland: 'Nhật Bản · vịnh Wakasa và Kyoto',
    era: 'Truyền thống lâu đời',
    tagline:
      'Miếng cá saba nướng muối cháy xém da, mỡ còn sủi trên thớ thịt: món cá của bữa sáng Nhật và của con đường cá thu dẫn về Kyoto.',
    origin: [
      'Saba là cá thu Nhật, họ hàng với cá bạc má, bơi thành đàn lớn quanh quần đảo Nhật Bản và bán đảo Triều Tiên. Thịt nhiều dầu nên ngon, nhưng cũng hỏng rất nhanh; người Nhật có hẳn câu “saba no ikigusare”, cá thu ươn ngay khi còn tươi. Vì thế từ xưa người ta tìm đủ cách giữ cá: xát muối, ngâm giấm, phơi, nướng. Shioyaki, nướng với muối, là cách giản dị nhất mà cũng làm nổi vị ngọt béo nhất.',
      'Ở vịnh Wakasa, nay thuộc tỉnh Fukui, cá saba đánh lên được xát muối rồi gánh bộ qua núi về kinh đô Kyoto, quãng đường chừng mười tám ri, khoảng bảy mươi cây số. Người gánh cá đi một ngày một đêm; đến nơi thì cá vừa ngấm muối, đem làm saba-zushi, món sushi cá thu ép nổi tiếng của Kyoto. Những ngả đường ấy được gọi chung là Saba Kaidō, “đường cá thu”, và năm 2015 được công nhận là Di sản Nhật Bản.',
      'Ngày nay, saba shioyaki là món quen của suất teishoku và bữa sáng ở các nhà trọ ryokan. Ở Hàn Quốc, cá thu nướng godeungeo-gui cũng là món cơm nhà được ưa chuộng. Đĩa cơm cá saba ở các quán Việt Nam thường pha cả hai: cá nướng kiểu Nhật, đi kèm kimchi, củ cải vàng, rong biển trộn và rau tươi, đúng kiểu quán cơm Nhật – Hàn ở thành phố.',
    ],
    timeline: [
      {
        when: 'Từ xa xưa',
        what: 'Cá saba được đánh bắt và ướp muối dọc các vùng biển Nhật Bản.',
      },
      {
        when: 'Thời trung cổ đến Edo',
        what: 'Cá muối từ vịnh Wakasa được gánh theo Saba Kaidō về kinh đô Kyoto.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Saba nướng muối thành món quen của suất teishoku và bữa sáng gia đình.',
      },
      {
        when: 'Năm 2015',
        what: 'Saba Kaidō và vùng Wakasa được công nhận trong đợt Di sản Nhật Bản đầu tiên.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Cơm cá saba nướng phổ biến ở các quán cơm Nhật – Hàn tại Việt Nam.',
      },
    ],
    meaning: [
      'Bữa cơm truyền thống Nhật theo nếp ichijū sansai, một canh ba món, và con cá nướng thường giữ chỗ trung tâm. Miếng saba cháy cạnh đặt cạnh bát cơm, bát súp miso, đĩa dưa muối và chút củ cải bào là hình ảnh bữa sáng ở các ryokan, giản dị mà đủ. Người Nhật sống bằng biển, và bữa sáng của họ nói điều ấy rõ hơn mọi lời giới thiệu.',
      'Con cá bình dân này còn đi vào lời ăn tiếng nói. “Saba wo yomu”, đếm cá thu, nghĩa là khai gian số liệu; một giả thuyết cho rằng do người bán cá ở chợ đếm vội đếm ẩu cho kịp trước khi cá ươn. Ở vùng Wakasa, câu nói xưa về đường lên kinh đô vẫn được nhắc như một niềm tự hào: cá của làng biển nhỏ đã nuôi cả bếp cung đình và phố thị Kyoto.',
    ],
    symbols: [
      {
        name: 'Cá saba nướng muối',
        meaning:
          'Da cháy giòn, thịt béo ngậy nhiều dầu cá; món cá nhà quen thuộc ở cả Nhật lẫn Hàn.',
      },
      {
        name: 'Chanh',
        meaning:
          'Vắt lên cá ngay trước khi ăn để cắt vị béo, như người Nhật vắt sudachi hay kabosu lên cá nướng.',
      },
      {
        name: 'Kimchi và củ cải vàng',
        meaning:
          'Vị chua giòn kiểu Hàn kéo cân bằng độ béo, nét pha trộn Nhật – Hàn của đĩa cơm ở Việt Nam.',
      },
      {
        name: 'Rong biển trộn',
        meaning:
          'Rong xanh trộn giấm, dầu mè, mềm giòn mát lạnh, gợi lại hương biển nơi con cá ra đời.',
      },
      {
        name: 'Xà lách, cà chua và cơm trắng',
        meaning: 'Rau tươi làm nhẹ đĩa cơm; cơm trắng nóng là người bạn quen của mọi món cá nướng.',
      },
    ],
    tasting: [
      'Dùng đũa gỡ cá theo thớ, men theo xương sống để lấy từng mảng thịt, ăn cùng cơm. Vắt chanh ngay trước khi gắp miếng đầu để giữ mùi thơm. Ở Nhật, cá nướng thường đi với củ cải trắng bào, rưới vài giọt nước tương lên đống củ cải chứ không lên cá.',
      'Ăn khi cá còn nóng, lúc da còn giòn và mỡ còn thơm; phần da cháy cạnh là chỗ nhiều người thích nhất. Xen giữa các miếng cá là kimchi, củ cải vàng và rong biển cho miệng luôn mới. Cá saba là chất gây dị ứng với một số người, ai từng phản ứng với cá nên tránh.',
    ],
    facts: [
      '“Saba wo yomu”, đếm cá thu, là thành ngữ Nhật chỉ việc khai gian con số.',
      '“Saba no ikigusare”, cá thu ươn ngay khi còn tươi, là câu người Nhật dùng để nhắc cá saba hỏng rất nhanh.',
      'Năm 2015, Saba Kaidō nằm trong đợt đầu tiên được công nhận Di sản Nhật Bản; năm 2024 được xếp hạng cao nhất của chương trình.',
    ],
    saying: {
      text: 'Kinh đô tuy xa, cũng chỉ mười tám ri đường.',
      by: 'Câu nói xưa của dân vùng Wakasa về đường cá thu lên Kyoto (京は遠ても十八里)',
    },
    reference: {
      label: 'Saba Kaidō — Wikipedia tiếng Nhật',
      url: 'https://ja.wikipedia.org/wiki/%E9%AF%96%E8%A1%97%E9%81%93',
    },
  },
  'mi-soba-bo': {
    homeland: 'Nhật Bản · Edo và các vùng núi như Shinshū',
    era: 'Sợi soba từ thế kỷ XVI · thịnh hành thời Edo',
    tagline:
      'Sợi kiều mạch nâu xám thơm mùi hạt rang, bát nước dùng ấm và vài lát bò om ngọt: món mì của vùng núi nghèo đã chinh phục cả kinh thành Edo.',
    origin: [
      'Kiều mạch chịu được đất cằn và khí hậu lạnh, nên từ lâu đã được trồng ở các vùng núi Nhật Bản, nơi lúa khó mọc. Ban đầu người ta ăn nó dưới dạng cháo hoặc viên bột nắm. Ghi chép sớm nhất còn biết về “soba-kiri”, bột kiều mạch cán mỏng rồi cắt sợi, là năm 1574, ở một ngôi chùa vùng Kiso, tỉnh Nagano ngày nay. Từ đó, soba (蕎麦) mới dần mang hình hài sợi mì như hôm nay.',
      'Thời Edo, soba bùng nổ ở kinh thành với hàng nghìn quầy rong và quán nhỏ. Dân Edo chuộng nó vì nhanh, rẻ, và vì một lý do mà họ chưa giải thích được: người ăn nhiều gạo trắng hay mắc “bệnh Edo”, tức bệnh tê phù, còn người ăn soba thì ít hơn, nay ta biết là nhờ vitamin B1 trong kiều mạch. Đến giờ, người ta vẫn nói nửa đùa nửa thật rằng phía tây Nhật là đất udon, còn Tokyo là đất soba.',
      'Soba ăn lạnh chấm nước sốt, như zaru soba trên tấm mành tre, hoặc ăn nóng trong nước dùng dashi. Đặt vài lát bò om ngọt lên bát soba nóng là niku soba, món bình dân của các quầy mì đứng ăn cạnh nhà ga. Bát soba ở quán Việt Nam thêm trứng lòng đào, nấm kim châm, nấm hương, rau bina và một mảnh rong biển, đầy đặn hơn, hợp người thích ăn mì nước.',
    ],
    timeline: [
      {
        when: 'Thời cổ đại',
        what: 'Kiều mạch được trồng ở vùng núi, ăn dưới dạng cháo hoặc bột nắm.',
      },
      {
        when: 'Năm 1574',
        what: 'Ghi chép sớm nhất về sợi “soba-kiri” ở một ngôi chùa vùng Kiso.',
      },
      {
        when: 'Thời Edo',
        what: 'Soba thành món ăn nhanh được yêu thích nhất của dân kinh thành.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Quầy soba đứng ăn cạnh nhà ga phổ biến, nhiều biến thể với thịt, tempura ra đời.',
      },
    ],
    meaning: [
      'Soba gắn với những cột mốc trong năm. Đêm giao thừa, người Nhật ăn toshikoshi soba, “soba vượt năm”: có người nói sợi dài cầu sống lâu, có người nói sợi kiều mạch dễ đứt để cắt bỏ vất vả năm cũ. Người Edo còn có tục hikkoshi soba, dọn đến nhà mới thì biếu láng giềng một phần soba, chơi chữ “soba” cũng nghĩa là “ở gần bên”, mong được làm hàng xóm lâu dài.',
      'Bát soba mang tính mộc của vùng núi, nơi cây kiều mạch mọc trên đất nghèo mà vẫn nuôi được người. Nhiều nghệ nhân tự xay bột, nhào, cán, cắt sợi mỗi sáng, coi làm soba là con đường rèn tay nghề cả đời. Ở các làng Shinshū, mời khách một mẹt soba tự làm vẫn là cách tiếp đãi chân thành nhất.',
    ],
    symbols: [
      {
        name: 'Mì soba',
        meaning:
          'Sợi kiều mạch nâu xám, thơm mùi hạt rang; trong đêm giao thừa, nó là lời chúc sống lâu và khởi đầu mới.',
      },
      {
        name: 'Thịt bò om ngọt',
        meaning: 'Bò thái mỏng om nước tương, đường, biến bát soba thanh nhẹ thành bữa no.',
      },
      {
        name: 'Trứng lòng đào',
        meaning: 'Lòng đỏ sánh hòa vào nước dùng, làm vị béo nhẹ và tròn hơn.',
      },
      {
        name: 'Nấm kim châm, nấm hương, rau bina',
        meaning: 'Vị ngọt umami và màu xanh nâu của núi rừng, hợp với cái mộc của sợi kiều mạch.',
      },
      {
        name: 'Hành lá và rong nori',
        meaning: 'Rắc trên mặt bát cho mùi tươi và chút hương biển, gia vị quen của mọi quán soba.',
      },
    ],
    tasting: [
      'Húp soba thành tiếng là chuyện bình thường ở Nhật; người ta còn bảo hút mạnh mới cảm nhận rõ mùi kiều mạch. Rắc chút shichimi tōgarashi và hành lá lên mặt bát trước khi ăn. Sợi soba nóng mềm nhanh hơn udon, nên đừng để bát mì đợi lâu.',
      'Ở quán soba truyền thống, ăn soba lạnh xong khách được mang ra sobayu, nước luộc mì sánh nhẹ, để pha vào phần nước chấm còn lại rồi uống cho ấm bụng. Kiều mạch là chất gây dị ứng khá mạnh với một số người, cần hỏi trước khi gọi món.',
    ],
    facts: [
      'Soba ăn đêm giao thừa ở Nhật gọi là toshikoshi soba, mì “vượt năm”.',
      'Kiểu soba “ni-hachi” trộn hai phần bột mì với tám phần bột kiều mạch cho sợi dễ cán, khó gãy.',
      'Người Edo gọi bệnh tê phù là “Edo wazurai”, bệnh Edo, và tin ăn soba giúp phòng bệnh.',
    ],
    reference: { label: 'Soba — Wikipedia tiếng Anh', url: 'https://en.wikipedia.org/wiki/Soba' },
  },
  'com-luon-nhat': {
    homeland: 'Edo (Tokyo) · Hamamatsu · Nagoya, Nhật Bản',
    era: 'Kabayaki thời Edo · unadon từ đầu thế kỷ XIX',
    tagline:
      'Lươn xẻ dọc, nướng than, phết sốt tare màu hổ phách rồi đặt lên cơm nóng: món người Nhật tìm đến để lấy sức giữa những ngày hè đổ lửa.',
    origin: [
      'Người Nhật ăn lươn từ rất xa xưa; trong tập thơ Man’yōshū thế kỷ VIII đã có bài khuyên ăn lươn cho khỏe vào mùa hè. Nhưng cách nướng kabayaki, xẻ lươn, xiên que, nướng trên than và phết sốt tare ngọt mặn, chỉ hoàn thiện trong thời Edo, khi nước tương và mirin đã phổ biến. Lươn bắt ở sông Sumida và các vùng đầm quanh Edo thành món bổ dưỡng bán ở quầy rong.',
      'Unadon (鰻丼), lươn đặt trên cơm trong bát, thường được kể ra đời khoảng niên hiệu Bunka (1804–1818). Tương truyền, Ōkubo Imasuke, người bỏ vốn cho một nhà hát ở Edo, mê lươn nướng đến mức đặt mang tới rạp, và để lươn khỏi nguội trên đường, ông cho kẹp lươn giữa hai lớp cơm nóng. Cơm ngấm sốt hóa ra ngon không kém lươn. Đã có ghi chép cho thấy kiểu ăn này có thể xuất hiện sớm hơn, nhưng câu chuyện về Imasuke vẫn được kể nhiều nhất.',
      'Mỗi vùng nướng lươn một kiểu. Kanto xẻ lưng, nướng sơ rồi hấp rồi mới nướng lại, nên thịt mềm tan; Kansai xẻ bụng, nướng thẳng không hấp, nên da giòn và đậm hơn. Nagoya có hitsumabushi, lươn thái nhỏ ăn ba cách; Hamamatsu bên hồ Hamana nổi tiếng nghề nuôi lươn. Ở Việt Nam, cơm lươn Nhật là món cao cấp trong thực đơn nhà hàng Nhật, thường kèm trứng, gừng hồng và rau.',
    ],
    timeline: [
      {
        when: 'Thế kỷ VIII',
        what: 'Tập thơ Man’yōshū đã nhắc đến lươn như món ăn bồi bổ mùa hè.',
      },
      { when: 'Thời Edo', what: 'Kỹ thuật kabayaki với sốt tare hoàn thiện ở kinh thành Edo.' },
      {
        when: 'Khoảng 1804–1818',
        what: 'Unadon ra đời, gắn với giai thoại Ōkubo Imasuke và nhà hát ở Edo.',
      },
      {
        when: 'Năm 2014',
        what: 'Lươn Nhật bị Liên minh Bảo tồn Thiên nhiên Quốc tế xếp vào nhóm loài nguy cấp.',
      },
    ],
    meaning: [
      'Lươn gắn chặt với Doyō no Ushi no Hi, ngày Sửu giữa tiết Thổ dụng mùa hè, khi người Nhật ăn lươn để chống mệt vì nóng. Tương truyền, nhà bác học Hiraga Gennai thời Edo đã giúp một quán lươn ế khách treo tấm biển “hôm nay là ngày Sửu”, và tục ăn lươn ngày này lan ra từ đó. Đến giờ, mỗi năm vào dịp ấy, quán lươn và siêu thị đều xếp hàng dài.',
      'Cơm lươn là món của dịp đặc biệt: mừng đỗ đạt, đãi khách quý, tự thưởng sau một mùa làm việc vất vả. Mùi khói lươn nướng phả ra từ những quán lâu đời được người Tokyo coi là mùi mùa hè. Nhưng nguồn lươn hoang dã sụt giảm mạnh, lươn nuôi vẫn phải bắt cá con ngoài tự nhiên, nên mỗi bát cơm lươn giờ cũng kèm theo câu hỏi về chuyện bảo tồn.',
    ],
    symbols: [
      {
        name: 'Lươn nướng kabayaki',
        meaning:
          'Thịt béo mềm, mặt ngoài xém cạnh thơm khói than; món lấy sức mùa hè của người Nhật.',
      },
      {
        name: 'Sốt tare',
        meaning:
          'Nước tương, mirin, đường đun sánh; nhiều quán giữ nồi sốt nhiều chục năm, chỉ châm thêm chứ không đổ đi.',
      },
      {
        name: 'Cơm trắng',
        meaning: 'Cơm nóng ngấm sốt tare, theo giai thoại chính là lý do unadon ra đời.',
      },
      {
        name: 'Trứng và rong nori',
        meaning:
          'Trứng cuộn hoặc trứng thái sợi ngọt nhẹ, rong nori thơm biển, làm dịu vị đậm của lươn.',
      },
      {
        name: 'Gừng hồng, dưa leo, cà rốt, xà lách',
        meaning: 'Vị chua giòn mát xen giữa các miếng lươn béo, giúp miệng luôn nhẹ.',
      },
    ],
    tasting: [
      'Rắc một chút sanshō, tiêu Nhật tê thơm, lên mặt lươn; đó là cách ăn truyền thống để cắt bớt vị béo. Gắp lươn cùng cơm trong mỗi miếng cho sốt ngấm đều. Ở Nhật, cơm lươn thường đi với bát canh trong nấu gan lươn, gọi là kimosui.',
      'Nếu gặp hitsumabushi kiểu Nagoya, hãy chia làm ba: phần đầu ăn nguyên bản, phần hai thêm hành lá, wasabi, rong nori, phần ba chan trà nóng hoặc dashi như cơm chan, rồi phần cuối ăn theo cách mình thích nhất. Gừng hồng và dưa leo xen giữa giúp vị lươn không bị ngấy.',
    ],
    facts: [
      'Lươn Nhật bị Liên minh Bảo tồn Thiên nhiên Quốc tế xếp vào nhóm loài nguy cấp từ năm 2014.',
      'Lươn Nhật đẻ trứng ở vùng biển sâu gần quần đảo Mariana, cách Nhật Bản hàng nghìn cây số.',
      'Ở Kanto, lươn được xẻ lưng; theo một giai thoại là để tránh gợi đến nghi thức mổ bụng của samurai.',
    ],
    reference: { label: 'Unagi — Wikipedia tiếng Anh', url: 'https://en.wikipedia.org/wiki/Unagi' },
  },
  'com-bo-bulgogi': {
    homeland: 'Bán đảo Triều Tiên · Seoul, Eonyang, Gwangyang',
    era: 'Neobiani thời Joseon · tên bulgogi phổ biến thế kỷ XX',
    tagline:
      'Thịt bò thái mỏng ướp lê xay, nước tương, dầu mè rồi áp lên lửa: bulgogi là món đãi khách mang hơi ấm của gian bếp Hàn Quốc.',
    origin: [
      'Bulgogi (불고기) nghĩa đen là “thịt lửa”. Một số sử gia truy về maekjeok, thịt xiên nướng của người Goguryeo cổ đại, dù đó vẫn là giả thuyết. Chắc chắn hơn là neobiani thời Joseon: thịt bò thái mỏng, khứa nhẹ cho mềm, ướp gia vị rồi nướng trên than, món của giới quý tộc và cung đình, nơi thịt bò là thứ hiếm.',
      'Cái tên bulgogi phổ biến trong thế kỷ XX, khi thịt bò dễ mua hơn và quán nướng mọc lên ở Seoul. Nước ướp thường gồm nước tương, đường, dầu mè, tỏi, hành, và lê Hàn xay, thứ vừa ngọt vừa làm mềm thịt. Kiểu Seoul nấu trên chảo vòm có rãnh hứng nước sốt, gần như món lẩu xào; còn Eonyang ở Ulsan và Gwangyang ở Jeolla nổi tiếng với thịt bò nướng thẳng trên than.',
      'Từ bếp nướng giữa bàn, bulgogi được múc lên cơm thành bulgogi deopbap, một suất ăn nhanh gọn. Năm 1992, chuỗi Lotteria ở Hàn Quốc còn tung ra burger bulgogi, đưa vị nước ướp ngọt mặn vào đồ ăn nhanh. Ở Việt Nam, cơm bò bulgogi là món chủ lực của quán Hàn, thường dọn với trứng ốp la, kimchi và vài loại namul như giá, rau bina, cà rốt.',
    ],
    timeline: [
      {
        when: 'Thời Goguryeo (giả thuyết)',
        what: 'Thịt xiên nướng maekjeok được xem là tiền thân xa của bulgogi.',
      },
      {
        when: 'Thời Joseon',
        what: 'Neobiani, bò thái mỏng ướp nướng, phục vụ tầng lớp quý tộc và cung đình.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Tên bulgogi phổ biến, các phong cách Seoul, Eonyang, Gwangyang hình thành.',
      },
      { when: 'Năm 1992', what: 'Lotteria tung ra burger bulgogi tại Hàn Quốc.' },
      {
        when: 'Thập niên 2010',
        what: 'Cơm bò bulgogi thành món quen ở các quán Hàn tại Việt Nam.',
      },
    ],
    meaning: [
      'Trong xã hội nông nghiệp Triều Tiên, con bò là sức kéo, là tài sản lớn nhất của nhà nông, nên thịt bò chỉ xuất hiện vào dịp cưới hỏi, lễ tết hay khi có khách quý. Bulgogi vì thế mang nghĩa hiếu khách: cả nhà quây quanh bếp nướng, người lớn gắp miếng ngon nhất cho khách, cho con trẻ.',
      'Ngày nay bulgogi là món “ngoại giao” của ẩm thực Hàn, vì ngọt mặn dễ ăn và không cay, hợp cả người chưa quen ớt. Vị bulgogi có mặt từ burger, pizza đến cơm hộp tiện lợi. Còn trong ký ức nhiều người Hàn, bulgogi vẫn là cảnh mẹ ướp thịt từ tối hôm trước, để sáng ra cả nhà có bữa cơm sum họp.',
    ],
    symbols: [
      {
        name: 'Thịt bò ướp',
        meaning:
          'Thái mỏng, ướp ngọt mặn, áp chảo hoặc nướng cháy cạnh; từng là món xa xỉ của dịp lễ và đãi khách.',
      },
      {
        name: 'Lê xay trong nước ướp',
        meaning:
          'Men tự nhiên trong lê Hàn làm mềm thớ thịt và cho vị ngọt thanh, bí quyết của nhiều gia đình.',
      },
      {
        name: 'Trứng ốp la',
        meaning: 'Lòng đỏ béo hòa vào cơm và nước sốt, làm suất cơm tròn vị hơn.',
      },
      {
        name: 'Kimchi',
        meaning: 'Vị chua cay lên men kéo lại vị ngọt của thịt, đúng tinh thần bữa cơm Hàn.',
      },
      {
        name: 'Namul: giá đỗ, rau bina, cà rốt, hành lá',
        meaning: 'Rau chần trộn dầu mè, giữ giòn và giữ màu, thêm phần thanh mát cho đĩa cơm thịt.',
      },
    ],
    tasting: [
      'Ở bàn nướng, người Hàn gói bulgogi trong lá xà lách hoặc lá tía tô Hàn, thêm lát tỏi, chút tương ssamjang rồi ăn trọn một miếng, không cắn đôi. Với cơm bulgogi, trộn nhẹ thịt, nước sốt và lòng đỏ trứng vào phần cơm ngay dưới.',
      'Người Hàn ăn cơm bằng thìa, dùng đũa gắp món kèm, và để bát cơm trên bàn chứ không nâng lên như người Nhật. Kimchi, giá trộn, rau bina là banchan kinh điển. Thích cay thì thêm chút gochujang hoặc kimchi lên cơm.',
    ],
    facts: [
      'Lê Hàn xay thường được dùng trong nước ướp bulgogi để làm mềm thịt.',
      'Bulgogi kiểu Seoul nấu trên chảo vòm có rãnh hứng nước sốt, ăn gần như lẩu xào.',
      'Lotteria Hàn Quốc tung ra burger bulgogi năm 1992 và nó trở thành một trong những món bán lâu năm nhất của chuỗi.',
    ],
    reference: {
      label: 'Bulgogi — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Bulgogi',
    },
  },
  'mi-bo-dai-loan': {
    homeland: 'Đài Loan · Cao Hùng và Đài Bắc',
    era: 'Sau năm 1949',
    tagline:
      'Thịt bò hầm nâu đỏ thơm tương đậu và hồi quế: tô mì “quốc dân” của Đài Loan lại ra đời từ nỗi nhớ quê của những người lính bên kia eo biển.',
    origin: [
      'Mì bò (牛肉麵, niúròu miàn) nay được người Đài Loan coi như món quốc dân, nhưng tuổi đời của nó khá ngắn. Trong xã hội nông nghiệp trên đảo, nhiều gia đình kiêng thịt bò, vì trâu bò cùng cày ruộng, gắn bó như người trong nhà. Thói quen ăn bò chỉ rộng ra sau Thế chiến II, khi xã hội và dân cư trên đảo thay đổi mạnh.',
      'Năm 1949, đông đảo binh lính và gia đình từ đại lục theo chính quyền Quốc dân đảng sang Đài Loan. Giả thuyết được nhắc nhiều nhất, do nhà sử học ẩm thực Lu Yaodong (逯耀東) đưa ra, cho rằng mì bò hầm đỏ “kiểu Tứ Xuyên” thực ra ra đời ở Đài Loan: cựu binh gốc Tứ Xuyên ở làng quân nhân Cương Sơn, Cao Hùng, dùng tương đậu cay của địa phương để hầm bò cho đỡ nhớ quê. Quán sớm nhất được ghi nhận theo kiểu này mở ở Cương Sơn năm 1962; còn ở Đài Bắc, một quán mì bò người Sơn Đông đã có từ năm 1951.',
      'Từ những quán nhỏ trong khu quân nhân, mì bò lan khắp đảo với hai trường phái: hồng thiêu, hầm đỏ đậm tương, và thanh đôn, hầm trong thanh vị, chịu ảnh hưởng mì bò của người Hồi từ đại lục sang. Năm 2005, Đài Bắc bắt đầu tổ chức Lễ hội Mì bò Quốc tế. Ở Việt Nam, mì bò Đài Loan có mặt ở các quán Hoa và quán Đài, được ưa vì nước dùng đậm và thịt bò mềm.',
    ],
    timeline: [
      {
        when: 'Trước thế kỷ XX',
        what: 'Nhiều nông dân Đài Loan kiêng thịt bò vì trâu bò là bạn nhà nông.',
      },
      {
        when: 'Năm 1949',
        what: 'Làn sóng di cư từ đại lục mang theo nhiều kiểu hầm bò và làm mì.',
      },
      { when: 'Năm 1951', what: 'Một trong những quán mì bò sớm nhất được ghi nhận mở ở Đài Bắc.' },
      {
        when: 'Năm 1962',
        what: 'Quán mì bò dùng tương đậu cay sớm nhất được ghi nhận mở ở Cương Sơn, Cao Hùng.',
      },
      {
        when: 'Năm 2005',
        what: 'Đài Bắc mở Lễ hội Mì bò Quốc tế, tôn món ăn thành biểu tượng thành phố.',
      },
    ],
    meaning: [
      'Tô mì bò Đài Loan là món của ký ức và bản sắc. Nó mang nỗi nhớ quê của thế hệ người nhập cư năm 1949, những người không bao giờ được trở về, và cách xã hội Đài Loan nhận lấy, pha trộn vị Tứ Xuyên, Sơn Đông, Hồi giáo để làm thành một thứ mới hẳn. Mỗi quán đều tự hào về nồi hầm của mình như một gia sản.',
      'Mì bò cũng là món của đời thường: sinh viên ăn trưa, người lao động ăn khuya, gia đình kéo nhau ra quán cuối tuần. Các cuộc thi tìm tô mì bò ngon nhất Đài Bắc thu hút sự chú ý của cả thành phố, và với du khách, ăn một tô mì bò gần như là “nghi thức” bắt buộc khi đặt chân đến đảo.',
    ],
    symbols: [
      {
        name: 'Thịt bò hầm',
        meaning:
          'Thường là bắp hoặc nạm có gân, hầm lâu với tương đậu, hồi, quế cho mềm mà không nát.',
      },
      {
        name: 'Nước dùng bò',
        meaning:
          'Bản hầm đỏ sậm màu, thơm tương đậu cay; bản hầm trong thanh và ngọt xương, mỗi quán một tay nêm.',
      },
      {
        name: 'Sợi mì lúa mì',
        meaning:
          'Sợi dày, dai, đủ sức đứng vững trong nước dùng đậm; dấu vết của khẩu vị mì miền Bắc Trung Hoa.',
      },
      {
        name: 'Dưa cải chua',
        meaning:
          'Chua mặn giòn, cắt độ béo; ở nhiều quán Đài Loan, khách được tự lấy thêm trên bàn.',
      },
      {
        name: 'Cải thìa, rau mùi, ớt, cà rốt',
        meaning:
          'Màu xanh, đỏ, cam và mùi thơm tươi làm tô mì sáng lên, cân lại vị đậm của nồi hầm.',
      },
    ],
    tasting: [
      'Húp một thìa nước trước để biết nồi hầm đậm đến đâu, rồi mới ăn mì cùng miếng thịt. Người Đài Loan thường thêm dưa cải chua và chút dầu ớt vào giữa bữa để đổi vị. Ở quán bình dân, hút mì thành tiếng không bị coi là bất lịch sự.',
      'Có người còn cắn kèm một tép tỏi sống, thói quen quen thuộc ở các quán mì gốc miền Bắc Trung Hoa. Gọi thêm một đĩa đồ nguội như đậu phụ khô, rong biển trộn, dồi heo là cách ăn đúng kiểu quán Đài. Thịt bò và nước hầm rất nóng, nên thổi nguội từng đũa.',
    ],
    facts: [
      'Nhiều nông dân Đài Loan xưa kiêng thịt bò vì coi trâu bò là bạn đồng hành trên đồng ruộng.',
      'Theo nhà sử học Lu Yaodong, “mì bò Tứ Xuyên” ở Đài Loan thực ra là món ra đời ngay trên đảo.',
      'Từ năm 2005, Đài Bắc tổ chức Lễ hội Mì bò Quốc tế với các cuộc thi chọn tô mì ngon nhất.',
    ],
    reference: {
      label: 'Taiwanese beef noodle soup — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Taiwanese_beef_noodle_soup',
    },
  },
  'mi-lanh-han-quoc': {
    homeland: 'Bình Nhưỡng · Hamhung, bán đảo Triều Tiên',
    era: 'Thời Joseon · phổ biến khắp Hàn Quốc sau năm 1953',
    tagline:
      'Sợi kiều mạch dai trong bát nước bò lạnh lấm tấm đá: naengmyeon vốn là món ăn mùa đông của miền Bắc, nay là món giải nhiệt mùa hè của cả bán đảo.',
    origin: [
      'Naengmyeon (냉면) nghĩa là “mì lạnh”. Món ăn có gốc ở miền Bắc bán đảo, quanh Bình Nhưỡng và Hamhung, nơi kiều mạch và khoai tây dễ trồng hơn lúa. Sách phong tục Dongguk sesigi năm 1849 đã chép naengmyeon là món của tháng mười một âm lịch: người ta ăn bát mì lạnh với nước kimchi củ cải trong căn phòng sưởi nền ondol ấm áp. Củ cải mùa đông ngọt hơn, nước dongchimi vì thế cũng ngon nhất vào mùa lạnh.',
      'Hai phong cách chính tách hẳn nhau. Mul-naengmyeon Bình Nhưỡng dùng sợi kiều mạch, chan nước dùng bò lạnh pha nước dongchimi, vị thanh, nhạt đến mức người mới ăn ngỡ ngàng. Bibim-naengmyeon Hamhung dùng sợi tinh bột khoai tây hoặc khoai lang, dai như dây thun, trộn sốt ớt cay ngọt, có khi phủ gỏi cá sống. Ở Bình Nhưỡng, nhà hàng Okryu-gwan mở năm 1961 nay là địa chỉ mì lạnh nổi tiếng nhất.',
      'Chiến tranh Triều Tiên đẩy hàng trăm nghìn người miền Bắc xuống phía nam, và họ mở quán mì lạnh ở Seoul, Busan. Ở Busan, thiếu kiều mạch, người tị nạn làm sợi bằng bột mì viện trợ, sinh ra milmyeon. Dần dần, naengmyeon thành món mùa hè của cả Hàn Quốc. Ở Việt Nam, mì lạnh có mặt ở các nhà hàng thịt nướng Hàn, thường được gọi sau bữa nướng để làm mát miệng.',
    ],
    timeline: [
      {
        when: 'Thời Joseon',
        what: 'Mì kiều mạch lạnh được ăn vào mùa đông ở miền Bắc bán đảo.',
      },
      {
        when: 'Năm 1849',
        what: 'Sách Dongguk sesigi chép naengmyeon là món ăn của tháng mười một âm lịch.',
      },
      {
        when: 'Thập niên 1950',
        what: 'Người tị nạn từ miền Bắc mở quán mì lạnh ở Seoul và Busan; milmyeon ra đời ở Busan.',
      },
      { when: 'Năm 1961', what: 'Nhà hàng Okryu-gwan mở cửa ở Bình Nhưỡng.' },
      {
        when: 'Năm 2018',
        what: 'Mì lạnh Okryu-gwan được mang đến hội nghị thượng đỉnh liên Triều ở Bàn Môn Điếm.',
      },
    ],
    meaning: [
      'Với nhiều gia đình gốc miền Bắc sống ở Hàn Quốc, bát naengmyeon là vị của quê nhà bị chia cắt. Những quán mì lạnh do người tị nạn mở từ thập niên 1950 thành nơi giữ ký ức; các cụ già vẫn tìm đến, gọi bát mì nhạt thếch mà người trẻ chê, chỉ để nhớ Bình Nhưỡng, Hamhung của tuổi thơ.',
      'Ngày 27 tháng 4 năm 2018, tại hội nghị thượng đỉnh liên Triều ở Bàn Môn Điếm, mì lạnh của Okryu-gwan được mang đến bữa tiệc tối. Ngay hôm ấy, các quán mì lạnh Bình Nhưỡng ở Seoul xếp hàng dài; bát mì thành biểu tượng của mong ước hòa giải. Trong đời thường, nó vẫn là món giải nhiệt mùa hè và món kết thúc quen thuộc sau bữa thịt nướng.',
    ],
    symbols: [
      {
        name: 'Mì kiều mạch',
        meaning: 'Sợi mảnh, dai, hơi xám; gắn với vùng đất lạnh miền Bắc nơi kiều mạch dễ trồng.',
      },
      {
        name: 'Nước dùng bò lạnh',
        meaning:
          'Nước hầm bò để nguội, pha nước kimchi củ cải dongchimi, có khi lấm tấm đá, thanh chua và mát lạnh.',
      },
      {
        name: 'Thịt bò và trứng luộc',
        meaning:
          'Vài lát bò luộc mỏng và nửa quả trứng đặt trên cùng; nhiều người ăn trứng trước như một miếng “lót dạ”.',
      },
      {
        name: 'Củ cải, dưa leo và kimchi',
        meaning: 'Ngâm chua hoặc thái sợi, giòn mát, làm tăng cảm giác sảng khoái của bát mì.',
      },
      {
        name: 'Hành lá',
        meaning: 'Chút xanh tươi và mùi thơm nhẹ, không lấn vị thanh của nước dùng.',
      },
    ],
    tasting: [
      'Sợi naengmyeon rất dai, nên nhân viên thường hỏi có muốn cắt mì bằng kéo không; đồng ý cho dễ ăn cũng chẳng ai cười. Nếm nước dùng trước, rồi mới thêm giấm và mù tạt Hàn (gyeoja) theo khẩu vị. Người Hàn coi việc tự nêm là một phần của món.',
      'Cứ nâng bát lên húp nước trực tiếp, đó là cách thưởng thức trọn vẹn. Ăn sau thịt nướng, cuộn vài sợi mì quanh miếng thịt còn nóng là kết hợp rất được ưa. Nước dùng lạnh và sợi dai, ai răng nhạy cảm hay bụng yếu nên ăn chậm.',
    ],
    facts: [
      'Naengmyeon ban đầu là món ăn mùa đông ở miền Bắc bán đảo, không phải món mùa hè.',
      'Milmyeon của Busan ra đời khi người tị nạn thời chiến thay kiều mạch bằng bột mì viện trợ.',
      'Mì lạnh Bình Nhưỡng từng được phục vụ tại hội nghị thượng đỉnh liên Triều tháng 4 năm 2018.',
    ],
    reference: {
      label: 'Naengmyeon — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Naengmyeon',
    },
  },
  'com-nieu-quang-dong': {
    homeland: 'Quảng Châu · Hồng Kông',
    era: 'Truyền thống Quảng Đông · phổ biến ở quán bình dân thế kỷ XX',
    tagline:
      'Niêu đất nóng rực, lạp xưởng rỉ mỡ thấm xuống từng hạt gạo, lớp cơm cháy giòn dưới đáy: món tối mùa đông của người Quảng Đông.',
    origin: [
      'Cơm niêu Quảng Đông, tiếng Quảng gọi là bou zai faan (煲仔飯), nghĩa là “cơm nồi nhỏ”. Gạo được ngâm rồi nấu thẳng trong niêu đất nhỏ; khi cơm gần cạn nước thì xếp lạp xưởng, thịt gà ướp, sườn hấp tàu xì hay thịt ướp phơi khô lên trên, đậy nắp cho hơi nước và mỡ thịt thấm ngược xuống từng hạt. Nồi cơm chín cùng lúc với phần thịt, không có bước nào làm riêng.',
      'Người Quảng Đông chuộng món này nhất vào mùa thu đông, khi lạp xưởng và thịt ướp phơi gió, gọi chung là lap mei, vừa đến mùa. Ở các quán chuyên, hàng chục niêu đất xếp trên bếp than hoặc bếp gas, đầu bếp xoay niêu liên tục để lớp cơm sát đáy cháy vàng đều mà không khét. Khách thường phải chờ ba bốn chục phút, và khi niêu ra bàn, nước tương ngọt được rưới thẳng lên miệng niêu còn sôi lách tách.',
      'Đừng nhầm món này với cơm niêu đập của Việt Nam, nấu cơm trắng trong niêu rồi đập vỡ niêu tung cơm cho khách. Cơm niêu Quảng Đông đến Việt Nam qua cộng đồng người Hoa và các quán phong cách Hồng Kông, phổ biến ở Chợ Lớn rồi lan ra nhiều thành phố. Phiên bản quen thuộc ở quán Việt có gà, lạp xưởng, cải thìa và chén nước tương riêng.',
    ],
    timeline: [
      {
        when: 'Từ lâu đời',
        what: 'Người Quảng Đông nấu cơm trong niêu đất cùng thịt ướp và lạp xưởng mùa đông.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Cơm niêu thành món đặc trưng của các quán bình dân ở Quảng Châu và Hồng Kông.',
      },
      {
        when: 'Nửa sau thế kỷ XX',
        what: 'Cộng đồng người Hoa đưa cơm niêu Quảng Đông vào các quán ở Chợ Lớn.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Cơm niêu kiểu Hồng Kông phổ biến tại nhiều quán ăn đô thị Việt Nam.',
      },
    ],
    meaning: [
      'Cơm niêu là món của sự chờ đợi. Không làm vội được, mỗi niêu cần một ngọn lửa riêng, một bàn tay xoay riêng. Ở Hồng Kông, người ta sẵn lòng ngồi chen chúc trong quán nhỏ hay ngoài vỉa hè phố đêm những tối se lạnh, đợi gần nửa tiếng chỉ để nghe tiếng xèo khi nước tương chạm vào niêu nóng. Hạt cơm cuối cùng, kể cả lớp cháy, cũng không ai để phí.',
      'Lạp xưởng và thịt ướp trong niêu gắn với mùa đông và Tết của người Quảng: nhà nhà phơi thịt trước hiên, mùi mỡ ngọt, mùi xì dầu bay khắp hẻm. Với những người Quảng sống xa quê, từ Chợ Lớn đến Kuala Lumpur, mùi cơm niêu là mùi của tháng Chạp, của cái Tết sắp đến.',
    ],
    symbols: [
      {
        name: 'Cơm và lớp cơm cháy',
        meaning:
          'Gạo nấu thẳng trong niêu, ngấm mỡ và nước thịt; lớp cháy vàng giòn dưới đáy là phần nhiều người để dành ăn cuối.',
      },
      {
        name: 'Lạp xưởng',
        meaning:
          'Rỉ mỡ thơm thấm xuống cơm; món thịt ướp phơi gió gắn với mùa đông và Tết Quảng Đông.',
      },
      {
        name: 'Thịt gà',
        meaning: 'Ướp xì dầu, gừng, rượu rồi chín cùng cơm hoặc nướng sẵn, vị mặn ngọt hài hòa.',
      },
      {
        name: 'Nước tương ngọt',
        meaning: 'Rưới vào cuối, gặp niêu nóng thì sôi xèo, dậy mùi thơm và nhuộm nâu hạt cơm.',
      },
      {
        name: 'Cải thìa và hành lá',
        meaning: 'Rau xanh chần giòn và chút hành tươi cân lại vị béo của thịt, lạp xưởng.',
      },
    ],
    tasting: [
      'Khi niêu ra bàn, rưới nước tương lên cơm, đậy nắp thêm một chút cho hơi nóng ủ đều, rồi mới trộn thịt, lạp xưởng với cơm. Xúc ra chén nhỏ ăn dần, phần còn lại trong niêu sẽ vẫn nóng. Niêu đất giữ nhiệt rất lâu, nhớ đừng chạm tay vào thành niêu.',
      'Đừng bỏ lớp cơm cháy: dùng thìa cạo từ thành và đáy niêu, ăn giòn rụm, hoặc chan chút canh cho mềm. Thêm chén canh nóng, đĩa rau xanh là đủ bữa kiểu quán Hồng Kông. Đi đông người thì mỗi người một niêu, chia nhau nếm vị của niêu bên cạnh.',
    ],
    facts: [
      'Vì nấu từ gạo sống trong niêu, khách ở quán cơm niêu Hồng Kông thường phải chờ ba bốn chục phút.',
      'Ở Hồng Kông, cơm niêu đắt khách nhất vào mùa đông, khi lạp xưởng và thịt ướp vào mùa.',
      'Cơm niêu Quảng Đông khác hẳn cơm niêu đập của Việt Nam, vốn là cơm trắng đập vỡ niêu khi dọn.',
    ],
    reference: {
      label: 'Claypot rice — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Claypot_rice',
    },
  },
  'com-tempura': {
    homeland: 'Nagasaki · Edo (Tokyo), Nhật Bản',
    era: 'Thế kỷ XVI đến thời Edo',
    tagline:
      'Món chiên học từ người Bồ Đào Nha, được thợ Edo gọt dần cho đến khi lớp áo bột chỉ còn mỏng như ren, nhìn xuyên thấy màu con tôm bên trong.',
    origin: [
      'Thế kỷ XVI, giáo sĩ dòng Tên và thương nhân Bồ Đào Nha cập cảng Nagasaki, mang theo cách nhúng cá, rau vào bột rồi chiên. Cái tên “tempura” có nhiều giả thuyết. Phổ biến nhất cho rằng nó đến từ tiếng Latinh “tempora”, những ngày ăn chay theo lịch Công giáo, khi người Bồ Đào Nha kiêng thịt và ăn cá, rau chiên. Giả thuyết khác truy về chữ “tempero” của tiếng Bồ, nghĩa là gia vị.',
      'Sang thời Edo, tempura xuống phố. Các quầy hàng gần chợ cá và bờ sông chiên tôm, cá nhỏ vịnh Edo xiên que, khách đứng ăn, chấm chung một bát nước sốt. Bột được tối giản còn bột mì, trứng, nước, chiên bằng dầu thực vật thay mỡ, nên nhẹ và giòn hơn hẳn bản gốc. Tempura cùng soba và sushi thành bộ ba món ăn đường phố của Edo. Tương truyền, tướng quân Tokugawa Ieyasu lâm bệnh rồi qua đời năm 1616 sau bữa cá tráp chiên, một giai thoại được kể nhiều nhưng khó kiểm chứng.',
      'Tendon (天丼), tempura đặt lên cơm rưới sốt ngọt mặn, xuất hiện khoảng cuối thời Edo, đầu thời Minh Trị và nhanh chóng thành món quen. Phần cơm tempura ở quán Việt Nam thường dọn tách riêng: tôm, bí ngòi, nấm hương chiên giòn đặt cạnh bát cơm, salad và chén nước chấm tentsuyu hoặc nước tương. Dọn rời như vậy giữ vỏ giòn lâu hơn, hợp khẩu vị người Việt vốn mê đồ chiên giòn.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XVI',
        what: 'Người Bồ Đào Nha đến Nagasaki, mang theo kỹ thuật chiên nhúng bột.',
      },
      { when: 'Thời Edo', what: 'Tempura xiên que thành món ăn đường phố ở kinh thành Edo.' },
      {
        when: 'Cuối thời Edo – đầu Minh Trị',
        what: 'Tendon, tempura đặt lên cơm rưới sốt, dần phổ biến ở các quán.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Tempura thành một trong những món Nhật nổi tiếng nhất thế giới.',
      },
    ],
    meaning: [
      'Tempura là ví dụ điển hình cho cách người Nhật học rồi gọt. Một kỹ thuật ngoại lai được nâng thành nghề riêng: bột pha nước đá, khuấy qua loa cho khỏi ra gân, dầu giữ ở nhiệt độ chính xác, chiên xong đặt ngay trước mặt khách. Có những đầu bếp ở Tokyo cả đời chỉ đứng trước chảo tempura, và khách đến quán họ chủ yếu để ngắm đôi tay ấy làm việc.',
      'Tempura cũng là lịch theo mùa: mùa xuân có rau dại và chồi non, mùa hè có cá nhỏ, mùa thu có nấm và khoai lang. Con tôm lưng cong được người Nhật coi là biểu tượng sống lâu, nên tôm chiên hay có mặt trong mâm năm mới. Một đĩa tempura đẹp vì thế vừa là món ngon, vừa là một lời chúc.',
    ],
    symbols: [
      {
        name: 'Tôm tempura',
        meaning:
          'Khứa bụng cho thẳng, áo bột vàng giòn; con tôm lưng cong là biểu tượng trường thọ trong văn hóa Nhật.',
      },
      {
        name: 'Bột chiên giòn',
        meaning:
          'Pha với nước rất lạnh, trộn qua loa cho nhẹ và xốp; di sản của cuộc gặp với người Bồ Đào Nha.',
      },
      {
        name: 'Bí ngòi, nấm hương, cà rốt',
        meaning:
          'Rau củ theo mùa áo bột mỏng, giữ nguyên vị ngọt bên trong; bếp Nhật để rau tự nói phần mình.',
      },
      {
        name: 'Nước chấm tentsuyu hoặc nước tương',
        meaning: 'Dashi, nước tương, mirin pha nhạt, thả thêm củ cải bào để vị thanh và đỡ ngấy.',
      },
      {
        name: 'Cơm trắng và xà lách',
        meaning: 'Bát cơm nóng làm nền, xà lách tươi mát xen giữa những miếng chiên giòn.',
      },
    ],
    tasting: [
      'Tempura ngon nhất trong vài phút đầu, nên ăn ngay, đừng đợi chụp xong cả mâm. Chấm nhẹ một đầu miếng vào tentsuyu có củ cải bào, hoặc chấm muối tinh, muối trà xanh như ở quán cao cấp để giữ vỏ giòn. Nhúng ngập cả miếng thì lớp áo sẽ mềm ngay.',
      'Với phần cơm tempura, ăn xen kẽ tempura, cơm và salad. Nhiều người ăn rau trước, tôm sau, để vị ngọt đọng lại cuối bữa. Ở Nhật, vụn bột chiên rơi ra (tenkasu) không bị bỏ mà để rắc lên mì udon hay cơm. Người dị ứng tôm hoặc gluten cần lưu ý thành phần.',
    ],
    facts: [
      'Giả thuyết phổ biến nhất cho rằng tên “tempura” bắt nguồn từ chữ Latinh “tempora”, những ngày ăn chay của người Công giáo.',
      'Bột tempura được pha bằng nước rất lạnh và khuấy qua loa để gluten không kịp hình thành, giữ vỏ nhẹ và giòn.',
      'Vụn bột chiên thừa gọi là tenkasu, được người Nhật rắc lên udon, okonomiyaki hay takoyaki.',
    ],
    reference: {
      label: 'Tempura — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Tempura',
    },
  },
  'mi-tuong-den-han-quoc': {
    homeland: 'Phố người Hoa Incheon, Hàn Quốc · gốc Sơn Đông',
    era: 'Đầu thế kỷ XX',
    tagline:
      'Món mì của phu bến cảng người Sơn Đông ở Incheon, nay là bát mì người Hàn gọi giao tận nhà trong ngày dọn nhà, ngày tốt nghiệp, ngày buồn.',
    origin: [
      'Jajangmyeon (짜장면) bắt nguồn từ zhájiàngmiàn (炸醬麵), mì sốt tương chiên của vùng Sơn Đông, Trung Quốc. Năm 1883, cảng Incheon mở cửa, và nhiều thương nhân, phu khuân vác người Sơn Đông vượt biển sang làm ăn, lập nên khu phố người Hoa. Họ mang theo món mì quê nhà: rẻ, nhanh, no lâu, rất hợp với những người cả ngày vác hàng trên bến.',
      'Gonghwachun, mở khoảng năm 1905–1908 ở phố người Hoa Incheon, ban đầu là nhà trọ kiêm quán ăn cho thương nhân Sơn Đông, thường được coi là nơi đầu tiên bán jajangmyeon ở Hàn Quốc. Theo thời gian, sốt đổi khác: tương đậu đen chunjang của Hàn được thêm caramel cho đen bóng và ngọt hơn, xào cùng hành tây, thịt heo, có khi thêm khoai tây, bí. Quán đóng cửa năm 1983; tòa nhà cũ nay là Bảo tàng Jajangmyeon, mở năm 2012.',
      'Sau chiến tranh, những năm 1960–1970 chính phủ vận động ăn bột mì để tiết kiệm gạo, bột mì viện trợ lại rẻ, và jajangmyeon thành món quốc dân, có mặt ở mọi quán Trung Hoa kiểu Hàn và mọi tờ thực đơn giao tận nhà. Ở Việt Nam, mì tương đen nổi tiếng nhờ phim ảnh Hàn; quán thường dọn kèm dưa leo thái sợi, trứng luộc và củ cải vàng.',
    ],
    timeline: [
      {
        when: 'Năm 1883',
        what: 'Cảng Incheon mở cửa, người Hoa Sơn Đông đến lập phố người Hoa.',
      },
      {
        when: 'Khoảng 1905–1908',
        what: 'Gonghwachun mở ở Incheon, được coi là nơi đầu tiên bán jajangmyeon.',
      },
      {
        when: 'Thập niên 1960–1970',
        what: 'Chính sách khuyến khích ăn bột mì giúp jajangmyeon thành món đại chúng.',
      },
      { when: 'Năm 1983', what: 'Quán Gonghwachun đóng cửa.' },
      { when: 'Năm 2012', what: 'Bảo tàng Jajangmyeon mở trong tòa nhà Gonghwachun cũ.' },
    ],
    meaning: [
      'Jajangmyeon gắn với những ngày đặc biệt trong đời người Hàn. Thế hệ lớn lên những năm 1970 nhớ bát mì đen là món “sang” chỉ được ăn ngày tốt nghiệp hay sinh nhật. Ngày chuyển nhà, khi bếp còn ngổn ngang, cả nhà gọi jajangmyeon giao tới, ngồi bệt giữa đống thùng các-tông mà ăn; cảnh ấy xuất hiện trong không biết bao nhiêu bộ phim.',
      'Ngày 14 tháng 4 có “Black Day”: ai không nhận được quà trong ngày Valentine và Ngày Trắng thì mặc đồ đen, rủ nhau đi ăn jajangmyeon, nửa tự giễu nửa an ủi. Món mì của dân nhập cư năm xưa nay là một phần văn hóa đại chúng Hàn Quốc, và cũng là lời nhắc lặng lẽ về đóng góp của cộng đồng người Hoa trong bếp ăn của đất nước này.',
    ],
    symbols: [
      {
        name: 'Tương đậu đen chunjang',
        meaning:
          'Xào với dầu cho dậy mùi; caramel cho màu đen bóng và vị ngọt, nét khác biệt của bản Hàn so với bản Sơn Đông.',
      },
      {
        name: 'Mì sợi',
        meaning:
          'Sợi bột mì dày, dai, ở quán Trung Hoa kiểu Hàn thường được kéo tay ngay trong bếp.',
      },
      {
        name: 'Thịt heo và hành tây',
        meaning: 'Thái hạt lựu xào cùng tương; hành tây chín mềm tiết vị ngọt làm sốt dịu và sánh.',
      },
      {
        name: 'Dưa leo và trứng luộc',
        meaning:
          'Dưa leo thái sợi rắc trên cùng cho mát, trứng luộc thêm béo, cân lại vị đậm của sốt.',
      },
      {
        name: 'Mè rang',
        meaning: 'Rắc nhẹ lên mặt cho chút bùi, điểm sáng trên nền sốt đen.',
      },
    ],
    tasting: [
      'Trộn thật kỹ cho sốt phủ kín từng sợi trước khi ăn, mạnh tay cũng được. Người Hàn ăn jajangmyeon khá nhanh, vì để lâu sợi mì trương và sốt khô lại. Thích cay thì rắc chút bột ớt Hàn, có người thêm vài giọt giấm.',
      'Bạn đồng hành không thể thiếu là củ cải vàng danmuji và hành tây sống chấm chunjang. Đi đông người thì gọi thêm tangsuyuk, thịt heo chiên sốt chua ngọt, hoặc một bát jjamppong cay để đổi vị. Dính sốt đen quanh miệng là chuyện ai cũng gặp, cứ ăn cho vui.',
    ],
    facts: [
      'Năm 2011, cách viết “짜장면” mới được công nhận là chuẩn bên cạnh “자장면” trong tiếng Hàn.',
      'Bảo tàng Jajangmyeon ở Incheon nằm trong chính tòa nhà cũ của quán Gonghwachun.',
      'Black Day ngày 14 tháng 4 là dịp người độc thân Hàn Quốc rủ nhau ăn mì tương đen.',
    ],
    reference: {
      label: 'Jajangmyeon — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Jajangmyeon',
    },
  },
  'dim-sum-thap-cam': {
    homeland: 'Quảng Châu · Hồng Kông',
    era: 'Văn hóa trà lâu phát triển từ thế kỷ XIX',
    tagline:
      'Một ấm trà, vài xửng tre nghi ngút và cả buổi sáng chuyện trò: dim sum là cách người Quảng Đông ăn chậm cùng gia đình.',
    origin: [
      'Dim sum (點心), âm Hán Việt là điểm tâm, chữ nghĩa là “chấm nhẹ vào lòng”, chỉ những món nhỏ ăn kèm trà. Nó gắn với tục yum cha (飲茶), “uống trà”, của người Quảng Đông. Theo cách kể phổ biến, từ rất sớm các quán trà ven đường ở Quảng Châu đã bán bánh nhỏ cho lữ khách dừng chân, và người ta dần nhận ra uống trà với vài miếng bánh thì dễ chịu hơn uống không.',
      'Nửa sau thế kỷ XIX, văn hóa dim sum ở Quảng Châu phát triển rất nhanh. Các trà lâu nhiều tầng mọc lên, khách ăn ở tầng trên, thực đơn từ vài loại bánh bao hấp mở rộng thành hàng chục, rồi hàng trăm món: há cảo tôm vỏ trong, xíu mại, bánh bao xá xíu, chân gà hấp tàu xì, các món chiên giòn. Sang thế kỷ XX, Hồng Kông thành thủ phủ dim sum, nổi tiếng với những xe đẩy chở xửng tre đi quanh bàn mời khách.',
      'Theo chân người Quảng di cư, dim sum có mặt ở Singapore, San Francisco, London và Sài Gòn. Ở Chợ Lớn, nhà hàng người Hoa mở bán từ sáng sớm, và người Việt quen gọi bằng cả hai tên, “điểm tâm” lẫn “dim sum”. Đĩa dim sum thập cẩm, với xíu mại, há cảo, bánh bao xá xíu, chả giò, sủi cảo áp chảo và chân gà, là cách gọn để nếm nhiều món tiêu biểu trong một lần.',
    ],
    timeline: [
      {
        when: 'Thời xa xưa (theo truyền thuyết)',
        what: 'Quán trà ven đường ở Quảng Châu phục vụ bánh nhỏ cho lữ khách.',
      },
      {
        when: 'Nửa sau thế kỷ XIX',
        what: 'Trà lâu nhiều tầng ở Quảng Châu phát triển, yum cha thành nếp sinh hoạt.',
      },
      {
        when: 'Thế kỷ XX',
        what: 'Hồng Kông thành thủ phủ dim sum với hàng trăm món bánh và xe đẩy.',
      },
      {
        when: 'Nửa sau thế kỷ XX',
        what: 'Dim sum phổ biến ở các nhà hàng người Hoa tại Chợ Lớn và khắp thế giới.',
      },
    ],
    meaning: [
      'Yum cha là sinh hoạt gia đình hơn là một bữa sáng. Sáng cuối tuần, ông bà, con cháu ngồi quanh bàn tròn, gọi vài xửng bánh, rót trà cho nhau và trò chuyện hàng giờ. Người Quảng có câu “nhất chung lưỡng kiện”, một chung trà hai món bánh, để tả cái thong thả ấy: ăn ít thôi, chuyện mới là chính.',
      'Bàn dim sum còn giữ những nghi thức nhỏ. Được rót trà, người ta gõ nhẹ hai ngón tay xuống bàn để cảm ơn; tương truyền vua Càn Long vi hành, rót trà cho tùy tùng, và họ gõ tay thay cho quỳ lạy để khỏi lộ thân phận nhà vua. Trẻ con học phép lịch sự ở bàn trà, học cách rót cho người lớn trước, gắp phần bánh ngon cho bà.',
    ],
    symbols: [
      {
        name: 'Há cảo tôm',
        meaning:
          'Vỏ bột trong mỏng ôm tôm tươi; độ mỏng của vỏ và số nếp gấp là thước đo tay nghề đầu bếp dim sum.',
      },
      {
        name: 'Xíu mại',
        meaning:
          'Bánh hở miệng nhân thịt heo tôm, điểm hạt cà rốt hay trứng cua; một trong những món dim sum kinh điển nhất.',
      },
      {
        name: 'Bánh bao xá xíu',
        meaning:
          'Vỏ trắng xốp nứt nhẹ trên đỉnh, nhân xá xíu đỏ ngọt mặn; hương vị đặc trưng của Quảng Đông.',
      },
      {
        name: 'Chân gà hấp tàu xì',
        meaning:
          'Chiên rồi hấp cho da nở mềm, sốt đỏ cay ngọt; người Quảng gọi mỹ miều là “móng phượng”.',
      },
      {
        name: 'Chả giò và sủi cảo áp chảo',
        meaning:
          'Món chiên giòn đáy vàng tạo tương phản với món hấp, điểm thêm ớt và rau mùi cho tươi.',
      },
    ],
    tasting: [
      'Bắt đầu với món hấp thanh nhẹ như há cảo, xíu mại, rồi đến món chiên và chân gà đậm vị. Mỗi chiếc bánh nhỏ ăn trong một hai miếng, chấm chút xì dầu, tương ớt hoặc mù tạt. Há cảo vỏ mỏng dễ rách, gắp nhẹ từ phần chân bánh.',
      'Trà là nửa còn lại của bữa ăn: ô long, phổ nhĩ hay trà hoa cúc giúp đỡ ngấy. Muốn được châm thêm nước nóng, ở nhiều trà lâu chỉ cần mở hé nắp ấm. Rót trà cho người bên cạnh trước khi rót cho mình. Người dị ứng tôm cua nên hỏi nhân bánh.',
    ],
    facts: [
      'Gõ hai ngón tay xuống bàn khi được rót trà là cách cảm ơn quen thuộc ở bàn dim sum.',
      'Ở nhiều trà lâu, mở hé nắp ấm trà là tín hiệu nhờ nhân viên châm thêm nước nóng.',
      'Chân gà hấp tàu xì được người Quảng gọi bằng cái tên mỹ miều “phượng trảo”, tức móng phượng.',
    ],
    saying: {
      text: 'Một chung trà, hai món bánh.',
      by: 'Thành ngữ Quảng Đông về thói quen yum cha (一盅兩件)',
    },
    reference: {
      label: 'Dim sum — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Dim_sum',
    },
  },
  'mi-xao-gion-hai-san': {
    homeland: 'Quảng Đông · Hồng Kông · người Hoa ở Việt Nam',
    era: 'Thế kỷ XX',
    tagline:
      'Vắt mì vàng giòn rụm mềm dần dưới lớp sốt hải sản sánh bóng: món quen của tiệm Hoa, mâm cỗ cưới và bữa liên hoan của người Sài Gòn.',
    origin: [
      'Mì xào giòn thuộc họ mì chiên giòn rưới sốt của người Quảng Đông, ở Hồng Kông gọi là jin min (煎麵), mì áp chảo. Sợi mì trứng mảnh được trụng sơ, để ráo, rồi chiên hoặc áp chảo thành vắt vàng giòn. Phần sốt nấu riêng với hải sản, rau củ, nước dùng và bột năng cho sánh, rưới lên ngay khi dọn. Cái thú của món nằm ở hai trạng thái trên cùng một đĩa: giòn và mềm, khô và sánh.',
      'Mì áp chảo hai mặt không chỉ có ở Quảng Đông; vùng Giang Nam có món “lưỡng diện hoàng”, mì vàng hai mặt, cũng chiên sợi giòn rồi rưới nhân. Nhưng chính người Quảng mang kiểu mì này đi xa nhất. Ở Bắc Mỹ, nó góp phần tạo nên dòng chow mein giòn trong nhà hàng Trung Hoa; ở Việt Nam, tiệm ăn người Hoa ở Chợ Lớn đưa nó vào thực đơn, rồi món ăn bước sang mâm cơm nhà và quán nhậu bình dân.',
      'Mì xào giòn ở Việt Nam đã Việt hóa khá rõ: tôm, mực, cải thìa, cà rốt, nấm hương, ớt chuông, rau mùi, ăn với xì dầu ngâm ớt tươi. Trong nhiều thập niên, đĩa mì giòn rực rỡ này là gương mặt quen của thực đơn tiệc cưới, tiệc thôi nôi ở Sài Gòn và miền Nam, thường dọn sau món gỏi, món súp, trước nồi lẩu.',
    ],
    timeline: [
      {
        when: 'Thế kỷ XIX–XX',
        what: 'Mì áp chảo giòn rưới sốt phổ biến trong ẩm thực Quảng Đông và Hồng Kông.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Người Hoa Quảng Đông mang món mì giòn ra nhiều nước, trong đó có Việt Nam.',
      },
      {
        when: 'Nửa sau thế kỷ XX',
        what: 'Mì xào giòn thành món quen của tiệc cưới, tiệc gia đình ở miền Nam Việt Nam.',
      },
      {
        when: 'Ngày nay',
        what: 'Món ăn có mặt ở quán ăn gia đình và nhà hàng khắp cả nước.',
      },
    ],
    meaning: [
      'Với người Hoa, sợi mì dài là lời chúc trường thọ, nên mì thường có mặt trong tiệc mừng thọ, sinh nhật, ngày vui; người nấu tránh cắt ngắn sợi để giữ trọn ý tốt. Đĩa mì xào giòn vàng óng, phủ đầy tôm mực, lại thêm nghĩa sung túc, rất hợp với không khí cưới hỏi, tiệc tùng.',
      'Ở miền Nam, mì xào giòn là món của những bữa đông người. Một đĩa lớn đặt giữa bàn tiệc, ai cũng bẻ một góc, gắp thêm con tôm, khoanh mực; tiếng vắt mì vỡ lách cách lẫn trong tiếng chúc tụng. Từ tiệm Hoa sang mâm cơm Việt, món ăn đã đi qua nhiều thế hệ sống cạnh nhau, đến mức nhiều người Sài Gòn coi đó là món “nhà mình”.',
    ],
    symbols: [
      {
        name: 'Mì trứng chiên giòn',
        meaning:
          'Sợi mì vàng giòn rụm, ngấm sốt thì mềm dần; sợi mì dài là lời chúc trường thọ của người Hoa.',
      },
      {
        name: 'Tôm và mực',
        meaning: 'Hải sản ngọt và giòn, chín vừa tới, làm đĩa mì sang trọng, hợp mâm tiệc.',
      },
      {
        name: 'Sốt sánh',
        meaning: 'Nước dùng nấu với bột năng, bọc lấy rau và hải sản, thấm từ từ vào vắt mì.',
      },
      {
        name: 'Cải thìa, cà rốt, nấm hương, ớt chuông',
        meaning: 'Rau củ nhiều màu, giữ độ giòn, cân lại vị đậm và làm đĩa mì rực rỡ.',
      },
      {
        name: 'Rau mùi',
        meaning:
          'Vài nhánh rắc lên cuối cùng cho mùi thơm, nét quen của bàn tiệc người Hoa ở Nam Bộ.',
      },
    ],
    tasting: [
      'Ăn ngay khi vừa dọn để nếm cả hai lớp: phần mì phía trên còn giòn rụm, phần dưới đáy đã ngấm sốt mềm. Dùng đũa bẻ vắt mì thành miếng nhỏ, gắp kèm hải sản và rau trong cùng một lần.',
      'Người Việt thường rưới thêm xì dầu ngâm ớt tươi, có người thích vài giọt giấm cho dậy vị. Đĩa mì tiệc nên chia ra chén nhỏ, đừng đảo cả đĩa kẻo phần giòn mềm hết. Món có tôm mực và mì bột mì, người dị ứng hải sản hoặc gluten cần lưu ý.',
    ],
    facts: [
      'Sợi mì trước khi chiên được trụng sơ và để ráo hoàn toàn, nhờ vậy giòn đều và không bắn dầu.',
      'Mì xào giòn từng là món gần như mặc định trong thực đơn tiệc cưới ở Sài Gòn.',
      'Ở Mỹ, kiểu mì chiên giòn rưới sốt thường được gọi là “Hong Kong-style chow mein”.',
    ],
    reference: {
      label: 'Chow mein — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Chow_mein',
    },
  },
  oyakodon: {
    homeland: 'Ningyōchō, Tokyo, Nhật Bản',
    era: 'Cuối thời Minh Trị',
    tagline:
      'Gà và trứng chín cùng một chảo rồi trượt lên bát cơm nóng: cái tên “cha mẹ và con” vừa dịu dàng vừa hơi tinh quái của ẩm thực Nhật.',
    origin: [
      'Oyakodon (親子丼) nghĩa đen là “bát cơm cha mẹ và con”, vì thịt gà và trứng gà nấu chung một chảo. Món ăn thường được gắn với Tamahide ở Ningyōchō, Tokyo, một quán chuyên lẩu gà chọi shamo mà theo lịch sử của quán đã mở từ năm 1760. Khách ăn lẩu xong hay đổ trứng vào phần nước lẩu còn lại rồi ăn với cơm.',
      'Năm 1891, theo câu chuyện của chính Tamahide, bà Toku, vợ đời chủ thứ năm, biến cách ăn ấy thành một món trọn vẹn: gà và trứng nấu trong nước dùng ngọt mặn, đặt lên bát cơm. Ban đầu món chỉ bán mang về, giao tận nhà, rồi được ưa đến mức lan khắp Tokyo và cả nước. Dù vậy, đã có một quảng cáo báo ở Kobe năm 1884 ghép chữ “oyako” với “don”, cho thấy ý tưởng có thể xuất hiện ở nơi khác sớm hơn.',
      'Công thức cơ bản rất giản dị: gà và hành tây nấu nhanh trong dashi, nước tương, mirin, đường, rồi rưới trứng đánh sơ, đậy nắp vài giây để trứng chín vừa, còn sánh, trượt cả lên bát cơm. Tamahide đến nay vẫn mở cửa và trưa nào cũng có hàng người xếp chờ. Ở Việt Nam, oyakodon có mặt trong thực đơn hầu hết quán cơm Nhật, thường rắc thêm hành lá và rong nori.',
    ],
    timeline: [
      { when: 'Năm 1760', what: 'Tamahide mở cửa ở Ningyōchō, theo lịch sử của chính quán.' },
      {
        when: 'Năm 1884',
        what: 'Một quảng cáo báo ở Kobe đã ghép chữ “oyako” với “don”.',
      },
      {
        when: 'Năm 1891',
        what: 'Bà Toku ở Tamahide biến món gà trứng thành bát cơm hoàn chỉnh, ban đầu chỉ bán mang về.',
      },
      {
        when: 'Đầu thế kỷ XX',
        what: 'Oyakodon lan ra nhiều quán ăn, thành món donburi phổ biến.',
      },
      {
        when: 'Ngày nay',
        what: 'Oyakodon là món cơm nhà quen thuộc ở Nhật và ở các quán cơm Nhật tại Việt Nam.',
      },
    ],
    meaning: [
      'Oyakodon là món nhà điển hình ở Nhật: rẻ, nhanh, đủ chất. Mẹ nấu cho con lúc tan học, sinh viên tự nấu trong căn phòng trọ một chảo một bếp, người ốm được nấu cho vì trứng mềm dễ ăn. Chỉ cần một chiếc chảo nhỏ, vài quả trứng, ít thịt gà là có bát cơm ấm trong mười lăm phút, và nhiều người Nhật nhớ món này như nhớ căn bếp tuổi thơ.',
      'Cái tên cho thấy óc hài hước rất Nhật. Từ oyakodon, người ta đặt tiếp tanindon, “bát cơm người dưng”, cho bản dùng thịt bò hoặc heo với trứng gà, vì thịt và trứng không cùng một nhà. Lại có sake oyakodon, cá hồi và trứng cá hồi trên cơm, cũng một cặp “mẹ con”. Trò chơi chữ nhỏ ấy cho thấy người Nhật thích gắn câu chuyện vào cả những món ăn thường ngày nhất.',
    ],
    symbols: [
      {
        name: 'Thịt gà',
        meaning: 'Thường dùng thịt đùi mềm, cắt miếng vừa ăn; phần “cha mẹ” trong tên món.',
      },
      {
        name: 'Trứng gà',
        meaning:
          'Phần “con”, chỉ chín tới, sánh mềm như kem; độ sánh của trứng là thước đo tay nghề người nấu.',
      },
      {
        name: 'Hành tây',
        meaning: 'Nấu mềm, tiết vị ngọt tự nhiên, làm nước sốt tròn vị.',
      },
      {
        name: 'Nước tương và dashi',
        meaning: 'Pha cùng mirin, đường thành nước nấu ngọt mặn, ngấm xuống cơm bên dưới.',
      },
      {
        name: 'Rong nori và hành lá',
        meaning: 'Rắc trên mặt bát cho thơm và đẹp mắt, chút hương biển và chút xanh tươi.',
      },
    ],
    tasting: [
      'Như mọi món donburi, nâng bát lên gần miệng và ăn từ trên xuống bằng đũa, để mỗi miếng có cả gà, trứng và cơm ngấm nước. Không cần trộn đều, vì lớp trứng sánh mềm trên mặt mới là thứ làm nên món.',
      'Rắc thêm chút shichimi tōgarashi, hoặc vài lá mitsuba, rau ngò Nhật, nếu quán có. Thêm bát súp miso và đĩa dưa muối là đủ bữa. Trứng trong oyakodon thường không chín hẳn; ai cần kiêng có thể nhờ quán nấu kỹ hơn.',
    ],
    facts: [
      'Theo lịch sử của chính quán, Tamahide đã mở cửa từ năm 1760.',
      'Bản dùng thịt bò hoặc heo với trứng gà được gọi đùa là tanindon, “bát cơm người dưng”.',
      'Sake oyakodon, cá hồi và trứng cá hồi trên cơm, cũng là một cặp “cha mẹ và con” theo lối chơi chữ của người Nhật.',
    ],
    reference: {
      label: 'Oyakodon — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Oyakodon',
    },
  },
  'mi-ramen-cay-han-quoc': {
    homeland: 'Hàn Quốc',
    era: 'Từ năm 1963 đến nay',
    tagline:
      'Chiếc nồi nhôm vàng sôi sùng sục trên bếp, nước đỏ rực, thêm kimchi, hải sản và một quả trứng: ramyeon là bữa khuya của cả nước Hàn.',
    origin: [
      'Người Hàn gọi mì ăn liền là ramyeon (라면). Cùng gốc chữ với ramen của Nhật, nhưng hai thứ khác hẳn nhau: ramen ở Nhật là tô mì tươi nấu công phu trong quán, còn ramyeon ở Hàn gần như luôn là mì gói. Ngày 15 tháng 9 năm 1963, Samyang tung ra gói ramyeon đầu tiên của Hàn Quốc, với công nghệ học từ Nhật, giữa lúc đất nước còn thiếu ăn sau chiến tranh.',
      'Gói mì đầu tiên có vị khá nhẹ, nước dùng gà. Người Hàn dần đòi vị đậm và cay hơn, các hãng cạnh tranh bằng những gói súp ngày càng đỏ. Năm 1986, Nongshim tung ra Shin Ramyun, gói mì cay về sau thành biểu tượng của ramyeon Hàn ở nước ngoài. Năm 2012, mì gà cay Buldak của Samyang mở ra cả một trào lưu “thử thách độ cay” trên mạng.',
      'Người Hàn hiếm khi ăn ramyeon trơn. Họ thả thêm kimchi, trứng, hành lá, lát phô mai, bánh gạo, hải sản hay xúc xích, tùy những gì còn trong tủ lạnh. Bản có tôm, mực gọi là haemul ramyeon. Tô mì ở quán Hàn tại Việt Nam là một nồi ramyeon “đầy đủ” như thế: thịt bò, tôm, mực, nấm kim châm, kimchi và trứng lòng đào, giữ cái hồn nồi mì nhà nấu nhưng đầy đặn hơn hẳn.',
    ],
    timeline: [
      { when: 'Năm 1963', what: 'Samyang tung ra gói ramyeon đầu tiên của Hàn Quốc.' },
      {
        when: 'Thập niên 1970',
        what: 'Ramyeon phổ biến rộng, thành món ăn nhanh của mọi gia đình.',
      },
      {
        when: 'Năm 1986',
        what: 'Nongshim ra mắt Shin Ramyun, dòng mì cay về sau nổi tiếng toàn cầu.',
      },
      {
        when: 'Năm 2012',
        what: 'Mì gà cay Buldak ra đời, khơi dậy trào lưu thử thách độ cay.',
      },
      {
        when: 'Thập niên 2010',
        what: 'Ramyeon theo phim ảnh Hàn lan khắp châu Á, kể cả Việt Nam.',
      },
    ],
    meaning: [
      'Ramyeon là món của đêm ôn thi, của phòng trọ sinh viên, của người lính và người làm ca đêm. Người Hàn có thói quen nấu mì trong chiếc nồi nhôm vàng nhỏ, bưng cả nồi ra bàn, gắp mì lên nắp nồi cho nguội bớt rồi ăn. Không bát đĩa, không bày biện, thân mật đến mức chia chung một nồi ramyeon đã là dấu hiệu của sự gần gũi.',
      'Trong phim “Mùa xuân qua đi” (One Fine Spring Day, 2001), nhân vật của Lee Young-ae hỏi chàng trai đưa mình về: “Anh có muốn vào ăn mì không?” (라면 먹을래요?). Câu hỏi ấy thành lời mời ẩn ý nổi tiếng nhất của tiếng Hàn hiện đại, đến giờ vẫn được nhắc lại, trêu đùa. Một gói mì rẻ tiền vì thế mang cả sự ấm áp và chút lãng mạn của đời thường.',
    ],
    symbols: [
      {
        name: 'Sợi ramyeon',
        meaning:
          'Sợi xoăn chiên sơ, dai, giữ nước súp tốt; gắn với lịch sử mì gói Hàn Quốc từ năm 1963.',
      },
      {
        name: 'Kimchi',
        meaning:
          'Thêm vị chua lên men và độ giòn, gần như mặc định trong nồi ramyeon của người Hàn.',
      },
      {
        name: 'Tôm, mực và thịt bò',
        meaning: 'Biến nồi mì thành haemul ramyeon đầy đặn, đúng kiểu ramyeon quán xá.',
      },
      {
        name: 'Trứng',
        meaning: 'Đập thẳng vào nồi hoặc luộc lòng đào, làm nước súp béo và dịu cay.',
      },
      {
        name: 'Nấm kim châm và hành lá',
        meaning: 'Sợi nấm giòn mảnh ngấm súp cay, hành lá thả cuối cho mùi tươi.',
      },
    ],
    tasting: [
      'Ăn khi còn thật nóng, vì sợi ramyeon nở rất nhanh. Gắp mì đặt lên nắp nồi hoặc chén nhỏ cho bớt nóng, rồi húp mạnh tay; ở Hàn, húp mì thành tiếng chẳng ai để ý. Nếm nước súp trước khi thêm kimchi để biết độ cay.',
      'Kimchi và củ cải muối là người bạn chuẩn mực. Khi mì đã hết, nhiều người Hàn cho một ít cơm nguội vào phần nước còn lại, ăn cho trọn nồi. Món có hải sản và sợi mì bột mì, người dị ứng tôm mực hoặc gluten cần lưu ý.',
    ],
    facts: [
      'Ở Hàn Quốc, “ramyeon” gần như luôn chỉ mì gói, khác với ramen tươi nấu trong quán ở Nhật.',
      'Nhiều người Hàn ăn ramyeon thẳng từ chiếc nồi nhôm vàng, dùng nắp nồi làm bát.',
      'Câu “라면 먹을래요?” (ăn mì không?) trong phim “Mùa xuân qua đi” (2001) thành lời mời ẩn ý nổi tiếng ở Hàn Quốc.',
    ],
    reference: {
      label: 'Ramyeon — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Ramyeon',
    },
  },
  'mi-cay-han-quoc': {
    homeland: 'Sài Gòn, Việt Nam · lấy cảm hứng Hàn Quốc',
    era: 'Giữa thập niên 2010',
    tagline:
      'Món mì “made in Sài Gòn” khoác áo Hàn Quốc: nồi nước đỏ, xúc xích, hải sản và bảng cấp độ cay để thực khách tự thách mình.',
    origin: [
      'Nói thẳng ngay từ đầu: “mì cay Hàn Quốc” với bảng cấp độ như ở Việt Nam không phải món truyền thống có sẵn ở Hàn. Đây là sáng tạo của các quán ăn ở Sài Gòn, nở rộ vào khoảng giữa thập niên 2010, khi phim ảnh và K-pop khiến giới trẻ Việt muốn nếm những gì thần tượng ăn trên màn ảnh. Không có một “cha đẻ” rõ ràng; nhiều quán cùng làm, cùng học nhau.',
      'Nguyên liệu mượn từ nhiều món Hàn khác nhau: sợi mì kiểu ramyeon, nước súp đỏ từ ớt bột Hàn và kimchi, xúc xích gợi nhớ budae-jjigae, món lẩu ra đời quanh các căn cứ quân sự Mỹ sau chiến tranh, cùng tôm, mực, bò, chả cá, nấm kim châm, dọn trong nồi nhỏ. Còn tinh thần “thử thách độ cay” thì trùng với cơn sốt mì gà cay Buldak lan trên mạng từ năm 2012. Điểm thật sự “Việt” là bảng cấp độ, thường từ 0 đến 7, để khách tự chọn sức chịu đựng.',
      'Các chuỗi mì cay mở rộng nhanh: có chuỗi tự giới thiệu đã có mặt ở Sài Gòn từ năm 2016 rồi phủ ra hàng chục tỉnh thành. Quán mì cay mọc cạnh trường học, khu dân cư, từ Sài Gòn ra Hà Nội. Món ăn là ví dụ rõ về cách người Việt đón văn hóa ngoại: không chép nguyên bản mà lắp ghép, nêm nếm lại cho hợp khẩu vị và túi tiền của mình.',
    ],
    timeline: [
      {
        when: 'Thập niên 2000',
        what: 'Làn sóng Hàn Quốc qua phim ảnh, âm nhạc bùng nổ tại Việt Nam.',
      },
      {
        when: 'Năm 2012',
        what: 'Mì gà cay Buldak ra đời ở Hàn, khơi dậy trào lưu thử thách độ cay trên mạng.',
      },
      {
        when: 'Giữa thập niên 2010',
        what: 'Các quán ở Sài Gòn phổ biến mì cay kiểu Hàn với bảng cấp độ.',
      },
      {
        when: 'Cuối thập niên 2010',
        what: 'Chuỗi mì cay lan ra Hà Nội và nhiều tỉnh thành, thành món của giới trẻ.',
      },
    ],
    meaning: [
      'Với học sinh, sinh viên Việt, ăn mì cay là một cuộc chơi có khán giả. Rủ bạn đi “thử cấp độ”, cả bàn xuýt xoa, đỏ mặt, chụp ảnh, kể lại chiến tích ai ăn được cấp mấy. Cấp độ cay thành đề tài nói chuyện, thành chuyện thách đố, khiến món ăn vui không kém gì ngon. Quán mì cay cạnh trường học là điểm hẹn quen sau giờ tan lớp.',
      'Mì cay cũng cho thấy sức hút của văn hóa Hàn ở Việt Nam và độ linh hoạt của người làm quán Việt. Từ một gói mì và vài cảnh phim, họ dựng nên một món có bản sắc riêng, đủ sống động để nhiều người tin đó là món “chuẩn Hàn”. Người Hàn sang Việt Nam lần đầu gặp món này thường ngạc nhiên, rồi cũng gọi thử một nồi.',
    ],
    symbols: [
      {
        name: 'Nước súp đỏ theo cấp độ',
        meaning:
          'Ớt bột Hàn, kimchi và gia vị; độ cay tăng theo cấp, phần “chơi” làm nên tên tuổi món ăn.',
      },
      {
        name: 'Sợi mì kiểu ramyeon',
        meaning: 'Sợi xoăn dai gợi nhớ mì gói Hàn Quốc, chỗ dựa cho cảm hứng “Hàn” của món.',
      },
      {
        name: 'Tôm, mực và thịt bò',
        meaning: 'Làm nồi mì đầy đặn, đúng kiểu “nhiều topping” mà người Việt ưa thích.',
      },
      {
        name: 'Xúc xích',
        meaning:
          'Mượn từ budae-jjigae, lẩu quân đội của Hàn; chi tiết rẻ mà vui, rất được học sinh chuộng.',
      },
      {
        name: 'Kimchi, nấm kim châm và trứng',
        meaning: 'Kimchi cho chiều sâu chua cay, nấm cho độ giòn, trứng lòng đào để dịu bớt lửa.',
      },
    ],
    tasting: [
      'Lần đầu, hãy chọn cấp thấp rồi tăng dần ở lần sau; độ cay dồn lên theo từng đũa chứ không chỉ ở miếng đầu. Nếm nước súp trước, ăn mì khi còn nóng để sợi khỏi nở, xen kẽ hải sản và xúc xích để miệng được nghỉ.',
      'Sữa, trà sữa, phô mai hay lòng đỏ trứng dịu cay tốt hơn nước lọc, vì chất béo giúp giảm cảm giác bỏng rát. Người đau dạ dày nên chọn cấp nhẹ; người dị ứng hải sản cần báo quán trước.',
    ],
    facts: [
      '“Mì cay Hàn Quốc” kiểu nhiều cấp độ là sáng tạo của các quán Việt, không phải món truyền thống ở Hàn.',
      'Nhiều quán mì cay ở Việt Nam chia độ cay thành các cấp, phổ biến nhất là từ cấp 0 đến cấp 7.',
      'Xúc xích trong nồi mì cay mượn ý từ budae-jjigae, món lẩu ra đời quanh căn cứ quân sự Mỹ ở Hàn sau chiến tranh.',
    ],
  },
  'com-ga-hai-nam': {
    homeland: 'Văn Xương, Hải Nam · Singapore · Malaysia',
    era: 'Gà Văn Xương từ lâu đời · cơm gà Hải Nam thế kỷ XX',
    tagline:
      'Con gà Văn Xương của đảo Hải Nam theo người di cư xuống phương Nam, gặp gạo xào mỡ gà, lá dứa và trở thành niềm tự hào của Singapore.',
    origin: [
      'Cơm gà Hải Nam bắt nguồn từ gà Văn Xương (文昌鸡), giống gà và món gà luộc nổi tiếng của huyện Văn Xương trên đảo Hải Nam, Trung Quốc: gà luộc nguyên con, chấm gừng, tỏi, ăn với cơm. Cuối thế kỷ XIX và đầu thế kỷ XX, nhiều người Hải Nam rời quê xuống vùng Nam Dương, đến Singapore, Malaysia, Thái Lan và Việt Nam để mưu sinh.',
      'Đến muộn hơn các nhóm người Hoa khác, người Hải Nam ở Singapore thường làm đầu bếp cho nhà người Anh, phụ bếp trên tàu, bán hàng rong và mở quán cà phê. Món gà quê nhà được chỉnh theo nguyên liệu địa phương: gạo xào với mỡ gà, gừng, tỏi, có khi thêm lá dứa, rồi nấu bằng nước luộc gà; ăn kèm ba thứ chấm là tương ớt chanh tỏi, gừng giã và xì dầu đen ngọt. Thập niên 1920, Wong Yi Guan bán cơm gà vo viên gói lá chuối; năm 1947, quán Swee Kee của Moh Lee Fei làm món ăn nổi tiếng khắp đảo.',
      'Đến giữa thế kỷ XX, cơm gà Hải Nam thành món quốc dân ở Singapore, và từ năm 1965 Singapore với Malaysia vẫn tranh luận chưa dứt ai làm ngon hơn. Ở Thái Lan, nó thành khao man kai. Ở Việt Nam, cộng đồng người Hải Nam và các quán Hoa ở Sài Gòn đưa món này đến thực khách; cơm gà Hải Nam khác hẳn cơm gà Hội An hay cơm gà Tam Kỳ của miền Trung.',
    ],
    timeline: [
      {
        when: 'Thời nhà Thanh',
        what: 'Gà Văn Xương luộc chấm gừng là món nổi tiếng trên đảo Hải Nam.',
      },
      {
        when: 'Cuối thế kỷ XIX – đầu XX',
        what: 'Người Hải Nam di cư xuống Nam Dương, mang theo món gà quê nhà.',
      },
      {
        when: 'Năm 1947',
        what: 'Quán Swee Kee ở Singapore góp phần làm cơm gà Hải Nam nổi tiếng.',
      },
      {
        when: 'Giữa thế kỷ XX',
        what: 'Cơm gà Hải Nam thành món phổ biến bậc nhất ở Singapore và Malaysia.',
      },
      {
        when: 'Năm 2020',
        what: 'Văn hóa hàng rong Singapore, nơi cơm gà là món tiêu biểu, được UNESCO ghi danh.',
      },
    ],
    meaning: [
      'Cơm gà Hải Nam là chuyện của người tha hương: từ món làng quê, những người đi làm thuê xứ người đã biến nó thành biểu tượng ẩm thực của vùng đất mới. Ở Singapore, món này có ở mọi khu hàng rong hawker, là bữa trưa của công nhân, sinh viên lẫn doanh nhân, người Hoa, người Mã Lai, người Ấn ngồi chung một dãy bàn nhựa.',
      'Trong văn hóa người Hoa, con gà luộc nguyên con là lễ vật không thể thiếu khi cúng tế, mừng lễ, tượng trưng cho sự trọn vẹn. Đĩa cơm gà Hải Nam trông đơn giản mà khó làm: gà phải chín tới, da mướt, thịt mọng; cơm phải tơi, bóng, thơm mỡ gà mà không ngấy. Chính cái khó trong vẻ giản dị ấy khiến người Singapore coi món này như di sản của mình.',
    ],
    symbols: [
      {
        name: 'Thịt gà luộc',
        meaning:
          'Ngâm trong nước gần sôi cho chín tới rồi nhúng nước đá cho da mướt, thịt mọng; con gà nguyên vẹn là biểu tượng sự trọn đầy.',
      },
      {
        name: 'Cơm gà',
        meaning:
          'Gạo xào mỡ gà, gừng, tỏi rồi nấu bằng nước luộc gà, hạt tơi bóng; nhiều người chấm điểm quán qua phần cơm trước cả phần gà.',
      },
      {
        name: 'Gừng',
        meaning:
          'Gừng giã làm nước chấm ấm và thơm, cân lại vị béo; dấu ấn của món gà Văn Xương nguyên bản.',
      },
      {
        name: 'Ớt',
        meaning: 'Tương ớt pha tỏi, chanh, chua cay; phần bổ sung đậm chất Nam Dương.',
      },
      {
        name: 'Dưa leo, cà chua, xà lách, rau mùi',
        meaning: 'Rau tươi xếp cạnh đĩa, làm bữa ăn nhẹ nhàng và mát miệng hơn.',
      },
    ],
    tasting: [
      'Gắp miếng gà, chấm lần lượt vào tương ớt, gừng giã hoặc xì dầu đen, rồi ăn cùng cơm. Nhiều người trộn chút cả ba thứ chấm để nếm đủ cay, thơm, ngọt. Ở Singapore, gà thường được rưới sẵn xì dầu pha dầu mè trước khi dọn.',
      'Một chén nước luộc gà nóng thường đi kèm để húp giữa bữa; dưa leo, rau mùi giúp miệng thanh. Gà thường dọn ở nhiệt độ phòng chứ không nóng hổi, đó là cách giữ thịt mềm, còn cơm thì nên ăn khi còn ấm để mùi mỡ gà, gừng bốc lên rõ nhất.',
    ],
    facts: [
      'Gà luộc xong thường được nhúng nước đá để da săn, mướt và thịt không bị khô.',
      'Tháng 12 năm 2020, văn hóa hàng rong Singapore được UNESCO ghi danh là di sản văn hóa phi vật thể.',
      'Ở chính đảo Hải Nam, món gốc thường được gọi là gà Văn Xương, không phải “cơm gà Hải Nam”.',
    ],
    reference: {
      label: 'Hainanese chicken rice — Wikipedia tiếng Anh',
      url: 'https://en.wikipedia.org/wiki/Hainanese_chicken_rice',
    },
  },
};
