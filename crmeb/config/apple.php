<?php

use think\facade\Env;

return [
    // Set [APPLE] CLIENT_ID in .env to the signed iOS app's Apple Bundle ID.
    // This is NOT the manifest's __UNI__ appid. An empty value disables Apple login.
    'client_id' => Env::get('apple.client_id', ''),
];
