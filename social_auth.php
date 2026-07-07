<?php
declare(strict_types=1);

require_once __DIR__ . '/social_auth_bootstrap.php';

function wp_social_auth_status_response(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

    $providers = [];
    foreach (wp_social_auth_provider_labels() as $provider => $label) {
        $providers[$provider] = [
            'label' => $label,
            'enabled' => wp_social_auth_provider_enabled((string)$provider),
        ];
    }

    echo json_encode([
        'ok' => true,
        'providers' => $providers,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function wp_social_auth_safe_next(string $next): string {
    $next = trim($next);
    if ($next === '') {
        return '/main.html';
    }
    if (!preg_match('~^/[a-zA-Z0-9_./?&=%#\\-]*$~', $next)) {
        return '/main.html';
    }
    return $next;
}

function wp_social_auth_safe_target(string $authTarget): string {
    return strtolower(trim($authTarget)) === 'admin' ? 'admin' : 'user';
}

function wp_social_auth_redirect_to_auth(string $mode, string $next, string $source, string $message = '', string $authTarget = 'user') {
    $authTarget = wp_social_auth_safe_target($authTarget);
    $target = $authTarget === 'admin'
        ? '/admin_login.php'
        : ($mode === 'register' ? '/registeruser.php' : '/loginuser.php');
    $query = ['next' => wp_social_auth_safe_next($next)];
    if ($source !== '' && $authTarget !== 'admin') {
        $query['source'] = $source;
    }
    if ($message !== '') {
        $query['social_error'] = $message;
    }

    header('Location: ' . $target . '?' . http_build_query($query));
    exit;
}

function wp_social_auth_google_exchange_message(array $tokenResponse, array $tokenJson, string $redirectUri): string {
    $status = (int)($tokenResponse['status'] ?? 0);
    $curlError = trim((string)($tokenResponse['error'] ?? ''));
    $googleError = trim((string)($tokenJson['error'] ?? ''));
    $description = trim((string)($tokenJson['error_description'] ?? ''));

    error_log(sprintf(
        '[social_auth] google_token_exchange_failed status=%d curl_error=%s google_error=%s description=%s redirect_uri=%s host=%s',
        $status,
        $curlError !== '' ? $curlError : '-',
        $googleError !== '' ? $googleError : '-',
        $description !== '' ? mb_substr($description, 0, 240) : '-',
        $redirectUri,
        (string)($_SERVER['HTTP_HOST'] ?? '')
    ));

    if ($curlError !== '' || $status === 0) {
        return 'Google-ի հետ կապ հաստատել չհաջողվեց։ Խնդրում ենք կրկին փորձել։';
    }

    if (in_array($googleError, ['invalid_client', 'unauthorized_client'], true)) {
        return 'Google Client ID կամ Client Secret-ը սխալ է։ Խնդրում ենք ստուգել կարգավորումները ադմինում։';
    }

    if ($googleError === 'redirect_uri_mismatch' || stripos($description, 'redirect_uri') !== false) {
        return 'Google Redirect URI-ն չի համընկնում։ Ադմինում և Google Console-ում պետք է նույն հասցեն լինի։';
    }

    if ($googleError === 'invalid_grant') {
        return 'Google հաստատման կոդը չընդունվեց։ Ստուգեք Redirect URI-ն և նորից փորձեք մուտք գործել։';
    }

    return 'Google մուտքի փոխանակումը չստացվեց։ Խնդրում ենք կրկին փորձել։';
}

function wp_social_auth_pending(): array {
    $pending = $_SESSION['social_auth_pending'] ?? [];
    return is_array($pending) ? $pending : [];
}

function wp_social_auth_set_pending(array $data): void {
    $_SESSION['social_auth_pending'] = $data;
}

function wp_social_auth_clear_pending(): void {
    unset($_SESSION['social_auth_pending']);
}

function wp_social_auth_complete_admin_login(PDO $pdo, array $pending, array $user): void {
    require_once __DIR__ . '/admin_access.php';

    $config = wp_version_load();
    $authorized = wp_admin_is_authorized($user, $config);

    if (!$authorized && wp_admin_can_bootstrap($user, $config)) {
        if (wp_admin_bootstrap_access($user)) {
            $config = wp_version_load();
            $authorized = wp_admin_is_authorized($user, $config);
        }
    }

    if (!$authorized) {
        wp_social_auth_clear_pending();
        wp_social_auth_redirect_to_auth(
            'login',
            (string)($pending['next'] ?? '/songs.php'),
            (string)($pending['source'] ?? ''),
            'Այս Google օգտահաշիվը admin բաժնի մուտքի իրավունք չունի։',
            'admin'
        );
    }

    wp_social_auth_issue_session($pdo, $user, (string)($pending['source'] ?? ''), !empty($pending['remember']));
    wp_admin_sign_user_in($user, false);
    wp_social_auth_clear_pending();
    header('Location: ' . wp_social_auth_safe_next((string)($pending['next'] ?? '/songs.php')));
    exit;
}

function wp_social_auth_handle_google_start(array $pending) {
    $config = wp_social_auth_provider_config('google');
    if (!wp_social_auth_provider_enabled('google')) {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Google մուտքը դեռ միացված չէ։', (string)($pending['auth_target'] ?? 'user'));
    }

    $query = [
        'client_id' => (string)$config['client_id'],
        'redirect_uri' => wp_social_auth_redirect_uri('google', $config),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'state' => (string)$pending['state'],
        'nonce' => (string)$pending['nonce'],
        'prompt' => 'select_account',
    ];

    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($query));
    exit;
}

function wp_social_auth_handle_google_callback(PDO $pdo, array $pending) {
    $config = wp_social_auth_provider_config('google');
    $authTarget = wp_social_auth_safe_target((string)($pending['auth_target'] ?? 'user'));
    $code = trim((string)($_GET['code'] ?? ''));
    if ($code === '') {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Google մուտքը չհաստատվեց։', $authTarget);
    }

    $redirectUri = wp_social_auth_redirect_uri('google', $config);
    $tokenResponse = wp_social_auth_http_post_form('https://oauth2.googleapis.com/token', [
        'code' => $code,
        'client_id' => (string)$config['client_id'],
        'client_secret' => (string)$config['client_secret'],
        'redirect_uri' => $redirectUri,
        'grant_type' => 'authorization_code',
    ]);

    $tokenJson = json_decode((string)$tokenResponse['body'], true);
    $tokenJson = is_array($tokenJson) ? $tokenJson : [];
    $accessToken = trim((string)($tokenJson['access_token'] ?? ''));
    $idToken = trim((string)($tokenJson['id_token'] ?? ''));

    if ($accessToken === '' && $idToken === '') {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], wp_social_auth_google_exchange_message($tokenResponse, $tokenJson, $redirectUri), $authTarget);
    }

    $userinfo = [];
    if ($accessToken !== '') {
        $userinfoResponse = wp_social_auth_http_get_json('https://openidconnect.googleapis.com/v1/userinfo', [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/json',
        ]);
        $userinfo = $userinfoResponse['json'] ?? [];
    }

    $idPayload = $idToken !== '' ? wp_social_auth_decode_jwt_payload($idToken) : [];
    $issuer = strtolower(trim((string)($idPayload['iss'] ?? '')));
    $audience = trim((string)($idPayload['aud'] ?? ''));
    $nonce = trim((string)($idPayload['nonce'] ?? ''));
    if ($issuer !== '' && !in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)) {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Google մուտքի պատասխանը անվավեր է։', $authTarget);
    }
    if ($audience !== '' && $audience !== (string)$config['client_id']) {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Google մուտքի պատասխանը անվավեր է։', $authTarget);
    }
    if ($nonce !== '' && !hash_equals((string)($pending['nonce'] ?? ''), $nonce)) {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Google մուտքի պատասխանը անվավեր է։', $authTarget);
    }

    $profile = [
        'subject' => trim((string)($userinfo['sub'] ?? $idPayload['sub'] ?? '')),
        'email' => trim((string)($userinfo['email'] ?? $idPayload['email'] ?? '')),
        'name' => trim((string)($userinfo['name'] ?? $idPayload['name'] ?? '')),
        'email_verified' => !empty($userinfo['email_verified']) || !empty($idPayload['email_verified']),
    ];

    if ($profile['subject'] === '') {
        wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Google մուտքի տվյալները ամբողջական չեն։', $authTarget);
    }

    $mode = strtolower(trim((string)($pending['mode'] ?? 'login'))) === 'register' ? 'register' : 'login';
    $user = null;
    $isNewRegistration = false;

    if ($mode === 'login') {
        $link = wp_social_auth_find_link('google', (string)$profile['subject']);
        if (is_array($link) && !empty($link['user_id'])) {
            $linkedUser = wp_social_auth_find_user_by_id($pdo, (int)$link['user_id']);
            if ($linkedUser) {
                $user = $linkedUser;
            }
        }

        if (!$user) {
            $existingEmailUser = !empty($profile['email'])
                ? wp_social_auth_find_user_by_email($pdo, (string)$profile['email'])
                : null;

            if ($existingEmailUser) {
                if (!empty($profile['email_verified'])) {
                    wp_social_auth_store_link('google', (string)$profile['subject'], [
                        'user_id' => (int)($existingEmailUser['id'] ?? 0),
                        'email' => (string)($existingEmailUser['email'] ?? $profile['email']),
                        'name' => (string)($existingEmailUser['name'] ?? ($profile['name'] ?? '')),
                        'username' => (string)($existingEmailUser['username'] ?? ''),
                    ]);
                    $user = $existingEmailUser;
                } else {
                    wp_social_auth_clear_pending();
                    wp_social_auth_redirect_to_auth(
                        'login',
                        (string)$pending['next'],
                        (string)$pending['source'],
                        'Google-ը չի հաստատել այս էլ. փոստը, դրա համար չենք կարող այն կապել առկա հաշվին։',
                        $authTarget
                    );
                }
            }

            if (!$user) {
                wp_social_auth_clear_pending();
                wp_social_auth_redirect_to_auth(
                    'login',
                    (string)$pending['next'],
                    (string)$pending['source'],
                    $authTarget === 'admin'
                        ? 'Այս Google հաշիվը դեռ կապված չէ Worship-ի օգտահաշվին։ Նախ Google-ով գրանցվիր սովորական էջից, հետո նորից փորձիր admin մուտքը։'
                        : 'Այս Google հաշիվը դեռ կապված չէ։ Նախ գրանցվիր Google-ով։',
                    $authTarget
                );
            }
        }
    } else {
        $existingLink = wp_social_auth_find_link('google', (string)$profile['subject']);
        $existingEmailUser = !empty($profile['email'])
            ? wp_social_auth_find_user_by_email($pdo, (string)$profile['email'])
            : null;
        $isNewRegistration = !is_array($existingLink) && !$existingEmailUser;

        $user = wp_social_auth_resolve_user($pdo, 'google', $profile);
        if ($isNewRegistration && function_exists('wp_social_auth_send_registration_notifications')) {
            wp_social_auth_send_registration_notifications($pdo, $user, true);
        }
    }

    if ($authTarget === 'admin') {
        wp_social_auth_complete_admin_login($pdo, $pending, $user);
    }

    wp_social_auth_issue_session($pdo, $user, (string)$pending['source'], !empty($pending['remember']));
    wp_social_auth_clear_pending();
    $targetNext = wp_social_auth_safe_next((string)$pending['next']);
    $sep = strpos($targetNext, '?') === false ? '?' : '&';
    $targetNext .= $sep . 'session_login=' . (!empty($pending['remember']) ? '0' : '1');
    if (!empty($isNewRegistration)) {
        $sep = strpos($targetNext, '?') === false ? '?' : '&';
        $targetNext .= $sep . 'social_registered=1&password_hint=1';
    }

    header('Location: ' . $targetNext);
    exit;
}

$endpointAction = strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? '')));
if ($endpointAction === 'status') {
    wp_social_auth_status_response();
}

$provider = strtolower(trim((string)($_GET['provider'] ?? $_POST['provider'] ?? '')));
if (!in_array($provider, ['google'], true)) {
    wp_social_auth_redirect_to_auth('login', '/main.html', '', 'Սոցիալական մուտքի provider-ը սխալ է։');
}

$pending = wp_social_auth_pending();
$callbackState = trim((string)($_GET['state'] ?? $_POST['state'] ?? ''));
$isCallback = isset($_GET['code'], $_GET['state']) || isset($_POST['code'], $_POST['state']) || isset($_GET['error']) || isset($_POST['error']);

if (!$isCallback) {
    $authTarget = wp_social_auth_safe_target((string)($_GET['auth_target'] ?? 'user'));
    $defaultNext = $authTarget === 'admin' ? '/songs.php' : '/main.html';
    $next = wp_social_auth_safe_next((string)($_GET['next'] ?? $defaultNext));
    $source = strtolower(trim((string)($_GET['source'] ?? '')));
    $mode = strtolower(trim((string)($_GET['mode'] ?? 'login'))) === 'register' ? 'register' : 'login';
    if ($authTarget === 'admin') {
        $mode = 'login';
    }
    $remember = !empty($_GET['remember']);
    $pending = [
        'provider' => $provider,
        'mode' => $mode,
        'next' => $next,
        'source' => $source,
        'auth_target' => $authTarget,
        'remember' => $remember ? 1 : 0,
        'state' => bin2hex(random_bytes(16)),
        'nonce' => bin2hex(random_bytes(16)),
        'created_at' => time(),
    ];
    wp_social_auth_set_pending($pending);

    if ($provider === 'google') {
        wp_social_auth_handle_google_start($pending);
    }
}

if (!$pending || empty($pending['provider']) || (string)$pending['provider'] !== $provider) {
    wp_social_auth_redirect_to_auth('login', '/main.html', '', 'Սոցիալական մուտքի վիճակը կորել է։');
}

if (!empty($pending['created_at']) && (int)$pending['created_at'] < (time() - 900)) {
    wp_social_auth_clear_pending();
    wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Սոցիալական մուտքի փորձը ժամկետանց է։', (string)($pending['auth_target'] ?? 'user'));
}

if ((string)($pending['state'] ?? '') === '' || !hash_equals((string)$pending['state'], $callbackState)) {
    wp_social_auth_clear_pending();
    wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Սոցիալական մուտքի ստուգումը չանցավ։', (string)($pending['auth_target'] ?? 'user'));
}

if (!empty($_GET['error']) || !empty($_POST['error'])) {
    wp_social_auth_clear_pending();
    wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Սոցիալական մուտքը չեղարկվեց։', (string)($pending['auth_target'] ?? 'user'));
}

try {
    $pdo = wp_runtime_open_pdo();
} catch (Throwable $e) {
    wp_social_auth_clear_pending();
    wp_social_auth_redirect_to_auth((string)$pending['mode'], (string)$pending['next'], (string)$pending['source'], 'Շտեմարանին միանալ չհաջողվեց։', (string)($pending['auth_target'] ?? 'user'));
}

if ($provider === 'google') {
    wp_social_auth_handle_google_callback($pdo, $pending);
}
