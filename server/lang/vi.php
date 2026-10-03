<?php

declare(strict_types=1);

/*
 * Vietnamese — the source language and the fallback for every other file in
 * server/lang/. Keys are grouped by area; {name} placeholders are filled by __t().
 * To add a language, copy this file to server/lang/<code>.php and translate the values.
 */
return [
    'meta.name' => 'Tiếng Việt',
    'meta.ogLocale' => 'vi_VN',
    'privacy.path' => '/quyen-rieng-tu.html',

    // ——— API ———
    'api.notFound' => 'Không có API này.',
    'api.notSupported' => 'Không hỗ trợ.',
    'api.dbError' => 'Lỗi cơ sở dữ liệu.',
    'api.serverError' => 'Lỗi máy chủ.',
    'api.badJson' => 'Dữ liệu gửi lên không phải JSON hợp lệ.',

    // ——— Guest account ———
    'account.consentRequired' => 'Bạn cần đồng ý với cách lưu dữ liệu để tạo tài khoản.',
    'account.tooManyCodes' => 'Bạn đã yêu cầu nhiều mã quá — đợi khoảng 15 phút rồi thử lại nhé.',
    'account.codeExpired' => 'Mã đã hết hạn — bấm "Gửi lại mã" nhé.',
    'account.tooManyAttempts' => 'Nhập sai quá nhiều lần — hãy gửi mã mới.',
    'account.wrongCode' => 'Mã chưa đúng, bạn còn {left} lần thử.',
    'account.badProgress' => 'Dữ liệu nông trại không hợp lệ.',
    'account.progressTooLarge' => 'Dữ liệu nông trại quá lớn.',
    'account.progressConflict' => 'Nông trại đã thay đổi ở máy khác.',
    'account.notSignedIn' => 'Bạn chưa đăng nhập.',
    'account.badRequest' => 'Yêu cầu không hợp lệ.',
    'account.badEmail' => 'Email chưa đúng định dạng.',
    'account.progressRejected' => 'Bản lưu này không khớp với cách nông trại vận hành — giữ lại nông trại đã lưu gần nhất.',

    'friends.formerFriend' => 'Một người bạn cũ',

    // ——— Friends' gardens ———
    'friends.notFound' => 'Không tìm thấy khu vườn có mã này.',
    'friends.ownCode' => 'Đây là mã khu vườn của chính bạn.',
    'friends.tooManyFriends' => 'Bạn đã có {max} người bạn — bớt một người để thêm mới.',
    'friends.friendFull' => 'Khu vườn này đã đủ bạn rồi.',
    'friends.tooManyAdds' => 'Bạn đã thử quá nhiều mã kết bạn — đợi khoảng một tiếng rồi thử lại nhé.',
    'friends.noWaterNeeded' => 'Ô này không cần tưới lúc này.',
    'friends.alreadyWatered' => 'Hôm nay bạn đã tưới giúp vườn này rồi — mai ghé lại nhé.',
    'friends.helpLimit' => 'Hôm nay bạn đã giúp {max} khu vườn — nghỉ tay thôi!',
    'friends.notFriend' => 'Khu vườn này chưa là bạn của bạn.',
    'friends.codeFailed' => 'Chưa tạo được mã khu vườn, thử lại nhé.',
    'friends.badCode' => 'Mã khu vườn gồm 6 ký tự, ví dụ K7QM2P.',
    'friends.nameTooLong' => 'Tên khu vườn tối đa 40 ký tự.',
    'friends.defaultName' => 'Khu vườn {code}',
    'friends.notRipe' => 'Ô này chưa chín đủ {minutes} phút để hái trộm.',
    'friends.alreadyPicked' => 'Ô này vừa bị hái rồi — để phần còn lại cho chủ vườn nhé.',
    'friends.pickedToday' => 'Hôm nay bạn đã hái ở vườn này rồi — mai ghé lại nhé.',
    'friends.pickLimit' => 'Hôm nay bạn đã hái trộm {max} lần — để mai nhé!',
    'friends.badSeed' => 'Hạt giống này không tặng được.',
    'friends.giftedToday' => 'Hôm nay bạn đã tặng quà cho bạn này rồi.',
    'friends.giftLimit' => 'Hôm nay bạn đã tặng {max} món quà rồi.',
    'friends.noSeed' => 'Bạn không còn hạt giống này để tặng.',

    // ——— Login-code email ———
    'email.subject' => '{code} là mã đăng nhập Ăn gì? của bạn',
    'email.htmlTitle' => 'Mã đăng nhập Ăn gì?',
    'email.textTitle' => 'Ăn gì? — Mã đăng nhập',
    'email.yourCode' => 'Mã của bạn: {code}',
    'email.validity' => 'Mã có hiệu lực trong 10 phút và chỉ dùng được một lần.',
    'email.textEnter' => 'Nhập mã trên trang Ăn gì? đang mở, hoặc bấm link để đăng nhập ngay:',
    'email.preheader' => 'Mã {code} — hiệu lực 10 phút. Nhập mã hoặc bấm “Đăng nhập ngay”.',
    'email.eyebrow' => 'Mã đăng nhập',
    'email.heading' => 'Lưu nông trại của bạn',
    'email.intro' => 'Nhập mã dưới đây trên trang Ăn gì? đang mở để đăng nhập. Mã có hiệu lực trong {validity} và chỉ dùng được một lần.',
    'email.minutes' => '10 phút',
    'email.codeLabel' => 'Mã:',
    'email.button' => 'Đăng nhập ngay',
    'email.buttonHint' => 'Nút này mở Ăn gì? và đăng nhập luôn, không cần nhập mã.',
    'email.notYou' => 'Không phải bạn yêu cầu?',
    'email.notYouText' => 'Cứ bỏ qua email này — không ai đăng nhập được nếu không có mã.',
    'email.neverAsk' => 'Chúng tôi không bao giờ hỏi mã này qua điện thoại hay tin nhắn.',
    'email.why' => 'Bạn nhận email này vì vừa yêu cầu đăng nhập bằng địa chỉ này. Chúng tôi chỉ dùng email để {purpose}.',
    'email.purpose' => 'lưu nông trại của bạn',
    'email.purposeMarketing' => 'lưu nông trại của bạn và gửi tin ưu đãi bạn đã đồng ý nhận',
    'email.tagline' => 'Ăn gì? · Món Việt mỗi ngày',
    'email.privacy' => 'Quyền riêng tư',

    // ——— Share pages (/mon/<slug>) and preview images ———
    'share.title' => '{name} — Ăn gì?',
    'share.description' => '{name} · {subtitle}. Quay món và tìm quán cùng Ăn gì?',
    'share.updating' => 'Trang đang cập nhật, bạn tải lại sau ít phút nhé.',
    'share.notFound' => 'Không có món này.',
    'share.price' => 'khoảng {price}k',
    'region.north' => 'Bắc Bộ',
    'region.central' => 'Trung Bộ',
    'region.south' => 'Nam Bộ',
    'region.world' => 'Thế giới',
];
