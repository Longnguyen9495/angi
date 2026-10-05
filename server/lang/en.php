<?php

declare(strict_types=1);

// English. Same keys as vi.php (the source); a missing key falls back to Vietnamese.
return [
    'meta.name' => 'English',
    'meta.ogLocale' => 'en_US',
    'privacy.path' => '/privacy.html',

    // ——— API ———
    'api.notFound' => 'No such API.',
    'api.notSupported' => 'Not supported.',
    'api.dbError' => 'Database error.',
    'api.serverError' => 'Server error.',
    'api.badJson' => 'The request body is not valid JSON.',

    // ——— Guest account ———
    'account.consentRequired' => 'Please agree to how we store your data to create an account.',
    'account.tooManyCodes' => 'You have asked for too many codes — please wait about 15 minutes and try again.',
    'account.codeExpired' => 'This code has expired — tap "Resend code" to get a new one.',
    'account.tooManyAttempts' => 'Too many wrong tries — please ask for a new code.',
    'account.wrongCode' => fn (array $p) => (int) ($p['left'] ?? 0) === 1
        ? 'That code is not right — 1 try left.'
        : 'That code is not right — ' . (int) ($p['left'] ?? 0) . ' tries left.',
    'account.badProgress' => 'The farm data is not valid.',
    'account.progressTooLarge' => 'The farm data is too large.',
    'account.progressConflict' => 'Your farm was changed on another device.',
    'account.notSignedIn' => 'You are not signed in.',
    'account.badRequest' => 'Invalid request.',
    'account.badEmail' => 'That email address does not look right.',
    'account.progressRejected' => 'This save does not match how the farm plays — the last saved farm is kept.',

    // ——— Spins & fair play ———
    'spins.noneLeft' => 'You have used all of today’s spins — buy more or come back tomorrow.',
    'spins.signInForMore' => 'Free spins are used up — sign in to keep spinning or buy more.',
    'spins.paymentsOff' => 'Buying spins is not open yet — check back later.',
    'spins.tooManyOrders' => 'You have a few orders waiting for payment — pay one or let them expire first.',
    'fairPlay.locked' => 'Your farm is locked for invalid saves until {until}.',

    'friends.formerFriend' => 'A former friend',

    // ——— Friends' gardens ———
    'friends.notFound' => 'No garden has this code.',
    'friends.ownCode' => 'This is your own garden code.',
    'friends.tooManyFriends' => 'You already have {max} friends — remove one to add someone new.',
    'friends.friendFull' => 'This garden already has as many friends as it can.',
    'friends.tooManyAdds' => 'Too many friend codes tried for now — please try again in an hour.',
    'friends.noWaterNeeded' => 'This plot does not need water right now.',
    'friends.alreadyWatered' => 'You already watered this garden today — come back tomorrow.',
    'friends.helpLimit' => 'You have helped {max} gardens today — time for a break!',
    'friends.notFriend' => 'This garden is not on your friends list.',
    'friends.codeFailed' => 'Could not create a garden code — please try again.',
    'friends.badCode' => 'A garden code has 6 characters, e.g. K7QM2P.',
    'friends.nameTooLong' => 'A garden name can be at most 40 characters.',
    'friends.defaultName' => 'Garden {code}',
    'friends.notRipe' => 'This plot has not been ripe for {minutes} minutes yet.',
    'friends.alreadyPicked' => 'Someone just picked this one — leave the rest for the owner.',
    'friends.pickedToday' => 'You already picked from this garden today — come back tomorrow.',
    'friends.pickLimit' => 'You have made {max} sneaky picks today — save some for tomorrow!',
    'friends.badSeed' => 'That seed cannot be sent.',
    'friends.giftedToday' => 'You already sent this friend a gift today.',
    'friends.giftLimit' => 'You have sent {max} gifts today.',
    'friends.noSeed' => 'You have no seed of this kind to send.',

    // ——— Login-code email ———
    'email.subject' => '{code} is your Ăn gì? sign-in code',
    'email.htmlTitle' => 'Your Ăn gì? sign-in code',
    'email.textTitle' => 'Ăn gì? — Sign-in code',
    'email.yourCode' => 'Your code: {code}',
    'email.validity' => 'The code works for 10 minutes and can be used only once.',
    'email.textEnter' => 'Enter the code on the Ăn gì? page you have open, or use this link to sign in right away:',
    'email.preheader' => 'Code {code} — valid for 10 minutes. Enter it or tap “Sign in now”.',
    'email.eyebrow' => 'Sign-in code',
    'email.heading' => 'Save your farm',
    'email.intro' => 'Enter the code below on the Ăn gì? page you have open to sign in. It works for {validity} and can be used only once.',
    'email.minutes' => '10 minutes',
    'email.codeLabel' => 'Code:',
    'email.button' => 'Sign in now',
    'email.buttonHint' => 'This button opens Ăn gì? and signs you in — no need to type the code.',
    'email.notYou' => 'Didn’t ask for this?',
    'email.notYouText' => 'Just ignore this email — nobody can sign in without the code.',
    'email.neverAsk' => 'We will never ask you for this code by phone or message.',
    'email.why' => 'You are getting this email because someone asked to sign in with this address. We only use your email to {purpose}.',
    'email.purpose' => 'save your farm',
    'email.purposeMarketing' => 'save your farm and send the offers you agreed to receive',
    'email.tagline' => 'Ăn gì? · Vietnamese food, every day',
    'email.privacy' => 'Privacy',

    // ——— Share pages (/mon/<slug>) and preview images ———
    'share.title' => '{name} — Ăn gì?',
    'share.description' => '{name} · {subtitle}. Spin for a dish and find where to eat it with Ăn gì?',
    'share.updating' => 'The site is updating — please reload in a few minutes.',
    'share.notFound' => 'No such dish.',
    'share.price' => 'about {price}k VND',
    'share.more' => 'Spin for more dishes on Ăn gì?',
    'region.north' => 'Northern Vietnam',
    'region.central' => 'Central Vietnam',
    'region.south' => 'Southern Vietnam',
    'region.world' => 'World',
];
