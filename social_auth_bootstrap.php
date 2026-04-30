<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
if (is_file(__DIR__ . '/version_config.php')) {
    require_once __DIR__ . '/version_config.php';
}

if (is_file(__DIR__ . '/install_service.php')) {
    require_once __DIR__ . '/install_service.php';
}
if (is_file(__DIR__ . '/lib/PHPMailer/inc/mailer.php')) {
    require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';
}

const WP_SOCIAL_AUTH_LINK_STORE_PATH = __DIR__ . '/social_auth_links_store.php';

function wp_social_auth_provider_labels(): array {
    return [
        'google' => 'Google',
    ];
}

function wp_social_auth_provider_label(string $provider): string {
    $labels = wp_social_auth_provider_labels();
    return (string)($labels[$provider] ?? ucfirst($provider));
}

function wp_social_auth_local_config(): array {
    $local = wp_runtime_local_config();
    $config = $local['social_auth'] ?? [];
    return is_array($config) ? $config : [];
}

function wp_social_auth_base_url(): string {
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';
    $host = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($host === '') {
        $host = 'localhost';
    }
    return $scheme . '://' . $host;
}

function wp_social_auth_provider_config(string $provider): array {
    $provider = strtolower(trim($provider));
    $local = wp_social_auth_local_config();
    $providerLocal = $local[$provider] ?? [];
    $providerLocal = is_array($providerLocal) ? $providerLocal : [];
    $version = function_exists('wp_version_load') ? wp_version_load() : [];

    if ($provider === 'google') {
        return [
            'client_id' => trim((string)wp_runtime_env('WORSHIP_GOOGLE_CLIENT_ID', (string)($version['social_auth_google_client_id'] ?? $providerLocal['client_id'] ?? ''))),
            'client_secret' => trim((string)wp_runtime_env('WORSHIP_GOOGLE_CLIENT_SECRET', wp_runtime_peek_secret('social_auth_google_client_secret') ?: (string)($providerLocal['client_secret'] ?? ''))),
            'redirect_uri' => trim((string)wp_runtime_env('WORSHIP_GOOGLE_REDIRECT_URI', (string)($version['social_auth_google_redirect_uri'] ?? $providerLocal['redirect_uri'] ?? ''))),
        ];
    }

    return [];
}

function wp_social_auth_redirect_uri(string $provider, ?array $config = null): string {
    $config = $config ?? wp_social_auth_provider_config($provider);
    $custom = trim((string)($config['redirect_uri'] ?? ''));
    if ($custom !== '') {
        return $custom;
    }

    return wp_social_auth_base_url() . '/social_auth.php?provider=' . rawurlencode($provider);
}

function wp_social_auth_provider_enabled(string $provider): bool {
    $config = wp_social_auth_provider_config($provider);

    if ($provider === 'google') {
        return trim((string)($config['client_id'] ?? '')) !== ''
            && trim((string)($config['client_secret'] ?? '')) !== '';
    }

    return false;
}

function wp_social_auth_available_providers(): array {
    $providers = [];
    foreach (array_keys(wp_social_auth_provider_labels()) as $provider) {
        if (wp_social_auth_provider_enabled($provider)) {
            $providers[] = $provider;
        }
    }
    return $providers;
}

function wp_social_auth_start_url(string $provider, string $next, string $source = '', string $mode = 'login', bool $remember = false, string $authTarget = 'user'): string {
    $authTarget = strtolower(trim($authTarget)) === 'admin' ? 'admin' : 'user';
    $query = [
        'provider' => strtolower(trim($provider)),
        'mode' => $mode === 'register' ? 'register' : 'login',
        'next' => $next !== '' ? $next : '/main.html',
        'auth_target' => $authTarget,
    ];

    if ($source !== '') {
        $query['source'] = $source;
    }
    if ($remember) {
        $query['remember'] = '1';
    }

    return '/social_auth.php?' . http_build_query($query);
}

function wp_social_auth_column_exists(PDO $pdo, string $table, string $column): bool {
    static $cache = [];
    $key = strtolower($table . '.' . $column);
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
            LIMIT 1
        ");
        $stmt->execute([$table, $column]);
        $cache[$key] = (bool)$stmt->fetchColumn();
    } catch (Throwable $e) {
        $cache[$key] = false;
    }

    return $cache[$key];
}

function wp_social_auth_load_store(): array {
    if (!is_file(WP_SOCIAL_AUTH_LINK_STORE_PATH)) {
        return ['google' => []];
    }

    $loaded = include WP_SOCIAL_AUTH_LINK_STORE_PATH;
    if (!is_array($loaded)) {
        return ['google' => []];
    }

    foreach (['google'] as $provider) {
        if (!isset($loaded[$provider]) || !is_array($loaded[$provider])) {
            $loaded[$provider] = [];
        }
    }

    return $loaded;
}

function wp_social_auth_save_store(array $store): bool {
    foreach (['google'] as $provider) {
        if (!isset($store[$provider]) || !is_array($store[$provider])) {
            $store[$provider] = [];
        }
    }

    $export = "<?php\nreturn " . var_export($store, true) . ";\n";
    return @file_put_contents(WP_SOCIAL_AUTH_LINK_STORE_PATH, $export, LOCK_EX) !== false;
}

function wp_social_auth_find_link(string $provider, string $subject): ?array {
    $provider = strtolower(trim($provider));
    $subject = trim($subject);
    if ($provider === '' || $subject === '') {
        return null;
    }

    $store = wp_social_auth_load_store();
    $row = $store[$provider][$subject] ?? null;
    return is_array($row) ? $row : null;
}

function wp_social_auth_store_link(string $provider, string $subject, array $data): void {
    $provider = strtolower(trim($provider));
    $subject = trim($subject);
    if ($provider === '' || $subject === '') {
        return;
    }

    $store = wp_social_auth_load_store();
    $current = $store[$provider][$subject] ?? [];
    $current = is_array($current) ? $current : [];

    $store[$provider][$subject] = array_merge($current, [
        'user_id' => max(0, (int)($data['user_id'] ?? 0)),
        'email' => trim((string)($data['email'] ?? '')),
        'name' => trim((string)($data['name'] ?? '')),
        'username' => trim((string)($data['username'] ?? '')),
        'linked_at' => (string)($current['linked_at'] ?? gmdate('c')),
        'last_used_at' => gmdate('c'),
    ]);

    wp_social_auth_save_store($store);
}

function wp_social_auth_http_request(string $method, string $url, array $headers = [], string $body = ''): array {
    $method = strtoupper($method);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        if ($body !== '' && $method !== 'GET') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $responseBody = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return [
            'status' => $status,
            'body' => is_string($responseBody) ? $responseBody : '',
            'error' => $error,
        ];
    }

    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $body,
            'timeout' => 20,
            'ignore_errors' => true,
        ],
    ]);

    $responseBody = @file_get_contents($url, false, $context);
    $status = 0;
    foreach (($http_response_header ?? []) as $headerLine) {
        if (preg_match('~^HTTP/\\S+\\s+(\\d{3})~', (string)$headerLine, $m)) {
            $status = (int)$m[1];
            break;
        }
    }

    return [
        'status' => $status,
        'body' => $responseBody === false ? '' : $responseBody,
        'error' => $responseBody === false ? 'request_failed' : '',
    ];
}

function wp_social_auth_http_post_form(string $url, array $fields): array {
    return wp_social_auth_http_request('POST', $url, [
        'Content-Type: application/x-www-form-urlencoded',
        'Accept: application/json',
    ], http_build_query($fields));
}

function wp_social_auth_http_get_json(string $url, array $headers = []): array {
    $response = wp_social_auth_http_request('GET', $url, $headers);
    $json = json_decode((string)$response['body'], true);
    return [
        'status' => (int)($response['status'] ?? 0),
        'body' => (string)($response['body'] ?? ''),
        'error' => (string)($response['error'] ?? ''),
        'json' => is_array($json) ? $json : [],
    ];
}

function wp_social_auth_decode_jwt_payload(string $jwt): array {
    $parts = explode('.', $jwt);
    if (count($parts) < 2) {
        return [];
    }

    $payload = strtr($parts[1], '-_', '+/');
    $padding = strlen($payload) % 4;
    if ($padding > 0) {
        $payload .= str_repeat('=', 4 - $padding);
    }

    $json = base64_decode($payload, true);
    if (!is_string($json) || $json === '') {
        return [];
    }

    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function wp_social_auth_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function wp_social_auth_random_password_hash(): string {
    try {
        $value = bin2hex(random_bytes(32));
    } catch (Throwable $e) {
        $value = hash('sha256', microtime(true) . '|' . mt_rand());
    }
    return password_hash($value, PASSWORD_DEFAULT);
}

function wp_social_auth_username_seed(array $profile): string {
    $email = trim((string)($profile['email'] ?? ''));
    if ($email !== '' && strpos($email, '@') !== false) {
        $seed = strstr($email, '@', true);
        if (is_string($seed) && trim($seed) !== '') {
            return trim($seed);
        }
    }

    $name = trim((string)($profile['name'] ?? ''));
    if ($name !== '') {
        $ascii = preg_replace('/[^a-z0-9]+/i', '.', $name);
        $ascii = trim((string)$ascii, '.');
        if ($ascii !== '') {
            return strtolower($ascii);
        }
    }

    return 'user';
}

function wp_social_auth_unique_username(PDO $pdo, string $seed): string {
    $seed = strtolower(trim($seed));
    if ($seed === '') {
        $seed = 'user';
    }

    $seed = preg_replace('/[^a-z0-9._-]+/i', '.', $seed);
    $seed = trim((string)$seed, '.-_');
    if ($seed === '') {
        $seed = 'user';
    }

    $candidate = $seed;
    $suffix = 1;

    while (true) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $stmt->execute([$candidate]);
        if (!$stmt->fetchColumn()) {
            return $candidate;
        }

        $suffix++;
        $candidate = $seed . '.' . $suffix;
    }
}

function wp_social_auth_find_user_by_email(PDO $pdo, string $email): ?array {
    $email = trim($email);
    if ($email === '' || !wp_social_auth_column_exists($pdo, 'users', 'email')) {
        return null;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return is_array($row) ? $row : null;
}

function wp_social_auth_find_user_by_id(PDO $pdo, int $userId): ?array {
    if ($userId <= 0) {
        return null;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return is_array($row) ? $row : null;
}

function wp_social_auth_send_registration_notifications(PDO $pdo, array $user, bool $showPasswordHint = false): void {
    $userId = (int)($user['id'] ?? 0);
    $email = trim((string)($user['email'] ?? ''));
    if ($userId <= 0 || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return;
    }

    $name = trim((string)($user['name'] ?? ''));
    $username = trim((string)($user['username'] ?? ''));
    $displayName = $name !== '' ? $name : ($username !== '' ? $username : $email);

    if (function_exists('send_registration_email')) {
        try {
            send_registration_email($email, $displayName, $showPasswordHint);
        } catch (Throwable $e) {
            // Do not block registration if mail fails.
        }
    }

    if (!empty($user['email_verified_at']) || !function_exists('send_verify_email')) {
        return;
    }

    if (
        !wp_social_auth_column_exists($pdo, 'users', 'email_verify_token_hash') ||
        !wp_social_auth_column_exists($pdo, 'users', 'email_verify_expires_at')
    ) {
        return;
    }

    try {
        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $expiresAt = (new DateTime('+30 minutes'))->format('Y-m-d H:i:s');

        $updateSql = "UPDATE users SET email_verify_token_hash = ?, email_verify_expires_at = ?";
        $params = [$hash, $expiresAt];

        if (wp_social_auth_column_exists($pdo, 'users', 'email_last_verification_sent_at')) {
            $updateSql .= ", email_last_verification_sent_at = NOW()";
        }

        $updateSql .= " WHERE id = ?";
        $params[] = $userId;

        $upd = $pdo->prepare($updateSql);
        $upd->execute($params);

        $link = wp_social_auth_base_url() . '/verify_email_confirm.php?token=' . urlencode($token);
        send_verify_email($email, $displayName, $link);
    } catch (Throwable $e) {
        // Do not block registration if verification mail fails.
    }
}

function wp_social_auth_create_user(PDO $pdo, array $profile): array {
    $hasUsername = wp_social_auth_column_exists($pdo, 'users', 'username');
    $hasEmail = wp_social_auth_column_exists($pdo, 'users', 'email');
    $hasName = wp_social_auth_column_exists($pdo, 'users', 'name');
    $hasPasswordHash = wp_social_auth_column_exists($pdo, 'users', 'password_hash');
    $hasEmailVerifiedAt = wp_social_auth_column_exists($pdo, 'users', 'email_verified_at');

    $email = trim((string)($profile['email'] ?? ''));
    $name = trim((string)($profile['name'] ?? ''));
    $emailVerified = !empty($profile['email_verified']);
    $username = $hasUsername ? wp_social_auth_unique_username($pdo, wp_social_auth_username_seed($profile)) : '';

    $columns = [];
    $placeholders = [];
    $params = [];

    if ($hasUsername) {
        $columns[] = 'username';
        $placeholders[] = '?';
        $params[] = $username;
    }

    if ($hasEmail && $email !== '') {
        $columns[] = 'email';
        $placeholders[] = '?';
        $params[] = $email;
    }

    if ($hasName) {
        $columns[] = 'name';
        $placeholders[] = '?';
        $params[] = $name !== '' ? $name : ($email !== '' ? $email : $username);
    }

    if ($hasPasswordHash) {
        $columns[] = 'password_hash';
        $placeholders[] = '?';
        $params[] = wp_social_auth_random_password_hash();
    }

    if ($hasEmailVerifiedAt && $emailVerified && $email !== '') {
        $columns[] = 'email_verified_at';
        $placeholders[] = 'NOW()';
    }

    if (!$columns) {
        throw new RuntimeException('social_user_create_failed');
    }

    $sql = 'INSERT INTO users (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $userId = (int)$pdo->lastInsertId();
    $row = wp_social_auth_find_user_by_id($pdo, $userId);
    if (!$row) {
        throw new RuntimeException('social_user_fetch_failed');
    }

    return $row;
}

function wp_social_auth_resolve_user(PDO $pdo, string $provider, array $profile): array {
    $subject = trim((string)($profile['subject'] ?? ''));
    if ($subject === '') {
        throw new RuntimeException('social_subject_missing');
    }

    $link = wp_social_auth_find_link($provider, $subject);
    if (is_array($link) && !empty($link['user_id'])) {
        $linkedUser = wp_social_auth_find_user_by_id($pdo, (int)$link['user_id']);
        if ($linkedUser) {
            return $linkedUser;
        }
    }

    $email = trim((string)($profile['email'] ?? ''));
    $user = $email !== '' ? wp_social_auth_find_user_by_email($pdo, $email) : null;
    if (!$user) {
        $user = wp_social_auth_create_user($pdo, $profile);
    }

    wp_social_auth_store_link($provider, $subject, [
        'user_id' => (int)($user['id'] ?? 0),
        'email' => (string)($user['email'] ?? $email),
        'name' => (string)($user['name'] ?? ($profile['name'] ?? '')),
        'username' => (string)($user['username'] ?? ''),
    ]);

    return $user;
}

function wp_social_auth_session_origin_key(string $source): string {
    $source = strtolower(trim($source));
    if ($source === 'pwa') {
        return 'app';
    }
    if ($source === 'admin-app') {
        return 'admin-app';
    }
    return 'web';
}

function wp_social_auth_sync_install_identity(array $user, string $source): void {
    if (!function_exists('wp_install_register') || !function_exists('wp_install_expected_source')) {
        return;
    }

    $source = strtolower(trim($source));
    if (!in_array($source, ['pwa', 'admin-app'], true)) {
        return;
    }

    $scope = $source === 'admin-app' ? 'admin' : 'main';
    $cookieName = $scope === 'admin' ? 'wp_admin_install_device_id' : 'wp_install_device_id';
    $deviceId = function_exists('wp_install_sanitize_device_id')
        ? wp_install_sanitize_device_id((string)($_COOKIE[$cookieName] ?? ''))
        : trim((string)($_COOKIE[$cookieName] ?? ''));

    if ($deviceId === '') {
        return;
    }

    $name = trim((string)($user['name'] ?? ''));
    $username = trim((string)($user['username'] ?? ''));
    $email = trim((string)($user['email'] ?? ''));

    if ($name === '') {
        $name = $username !== '' ? $username : $email;
    }

    wp_install_register($scope, $deviceId, [
        'verified_source' => wp_install_expected_source($scope),
        'user_id' => max(0, (int)($user['id'] ?? 0)),
        'user_name' => $name,
        'user_username' => $username,
        'user_email' => $email,
        'ip_address' => function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? ''),
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
}

function wp_social_auth_current_remember_selector(): ?string {
    $raw = trim((string)($_COOKIE['remember_me'] ?? ''));
    if ($raw === '') {
        return null;
    }

    $parts = explode(':', $raw, 2);
    if (count($parts) !== 2) {
        return null;
    }

    $selector = trim((string)$parts[0]);
    return $selector !== '' ? $selector : null;
}

function wp_social_auth_find_existing_device_session_id(PDO $pdo, int $userId, array $meta, string $deviceName): int {
    if ($userId <= 0) {
        return 0;
    }

    $browser = trim((string)($meta['browser'] ?? ''));
    $platform = trim((string)($meta['platform'] ?? ''));
    $userAgent = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);

    if ($deviceName === '' || $browser === '' || $platform === '' || $userAgent === '') {
        return 0;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT id
            FROM user_sessions
            WHERE user_id = ?
              AND device_name = ?
              AND browser = ?
              AND platform = ?
              AND user_agent = ?
            ORDER BY
              CASE WHEN session_key = ? THEN 0 ELSE 1 END,
              COALESCE(last_used_at, created_at) DESC,
              id DESC
            LIMIT 1
        ");
        $stmt->execute([
            $userId,
            $deviceName,
            $browser,
            $platform,
            $userAgent,
            session_id(),
        ]);

        return (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

function wp_social_auth_prune_duplicate_sessions(PDO $pdo, array $user, array $meta, string $deviceName, int $keepSessionId = 0): void {
    $userId = (int)($user['id'] ?? 0);
    if ($userId <= 0) {
        return;
    }

    $conditions = ['user_id = ?'];
    $params = [$userId];

    $deviceName = trim($deviceName);
    if ($deviceName !== '') {
        $conditions[] = 'device_name = ?';
        $params[] = $deviceName;
    }

    $browser = trim((string)($meta['browser'] ?? ''));
    if ($browser !== '') {
        $conditions[] = 'browser = ?';
        $params[] = $browser;
    }

    $platform = trim((string)($meta['platform'] ?? ''));
    if ($platform !== '') {
        $conditions[] = 'platform = ?';
        $params[] = $platform;
    }

    $userAgent = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
    if ($userAgent !== '') {
        $conditions[] = 'user_agent = ?';
        $params[] = $userAgent;
    }

    if ($keepSessionId > 0) {
        $conditions[] = 'id <> ?';
        $params[] = $keepSessionId;
    }

    $sql = 'DELETE FROM user_sessions WHERE ' . implode(' AND ', $conditions);

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } catch (Throwable $e) {
        // ignore and continue with the new session insert
    }
}

function wp_social_auth_issue_session(PDO $pdo, array $user, string $source = '', bool $remember = false): void {
    $oldSessionKey = session_id();
    $oldSelector = wp_social_auth_current_remember_selector();
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $ip = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $meta = function_exists('wp_auth_detect_device_meta')
        ? wp_auth_detect_device_meta($ua)
        : ['browser' => 'Unknown', 'platform' => 'Unknown', 'device_name' => 'Unknown'];
    $deviceName = function_exists('wp_auth_merge_device_name_with_origin')
        ? wp_auth_merge_device_name_with_origin((string)$meta['device_name'], wp_social_auth_session_origin_key($source))
        : (string)$meta['device_name'];
    $existingSessionId = wp_social_auth_find_existing_device_session_id($pdo, (int)($user['id'] ?? 0), $meta, $deviceName);

    session_regenerate_id(true);

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['email'] = (string)($user['email'] ?? '');
    $_SESSION['name'] = trim((string)($user['name'] ?? '')) ?: (string)($user['email'] ?? 'User');
    $_SESSION['username'] = trim((string)($user['username'] ?? '')) ?: $_SESSION['name'];
    $_SESSION['auth_via_remember'] = $remember ? 1 : 0;

    $selector = null;
    $tokenHash = null;
    $expiresTs = $remember ? time() + 60 * 60 * 24 * 30 : time() + 60 * 60 * 12;
    $expiresAt = date('Y-m-d H:i:s', $expiresTs);
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    if ($remember) {
        $selector = bin2hex(random_bytes(12));
        $validator = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $validator);

        setcookie('remember_me', $selector . ':' . $validator, [
            'expires' => $expiresTs,
            'path' => '/',
            'secure' => $https,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        wp_auth_clear_remember_cookie();
    }

    $keepSessionId = $existingSessionId;

    try {
        if ($oldSessionKey !== '') {
            if ($existingSessionId > 0) {
                $deleteOldKey = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_key = ? AND id <> ?");
                $deleteOldKey->execute([(int)$user['id'], $oldSessionKey, $existingSessionId]);
            } else {
                $deleteOldKey = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_key = ?");
                $deleteOldKey->execute([(int)$user['id'], $oldSessionKey]);
            }
        }

        if ($oldSelector !== null && $oldSelector !== '') {
            if ($existingSessionId > 0) {
                $deleteOldSelector = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND selector = ? AND id <> ?");
                $deleteOldSelector->execute([(int)$user['id'], $oldSelector, $existingSessionId]);
            } else {
                $deleteOldSelector = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND selector = ?");
                $deleteOldSelector->execute([(int)$user['id'], $oldSelector]);
            }
        }
    } catch (Throwable $e) {
        // keep going; the upsert/prune below still protects the new session row
    }

    if ($existingSessionId > 0) {
        $update = $pdo->prepare("
            UPDATE user_sessions
            SET
                selector = ?,
                token_hash = ?,
                remembered = ?,
                device_name = ?,
                browser = ?,
                platform = ?,
                ip_address = ?,
                user_agent = ?,
                session_key = ?,
                last_used_at = NOW(),
                expires_at = ?
            WHERE id = ?
              AND user_id = ?
            LIMIT 1
        ");
        $update->execute([
            $selector,
            $tokenHash,
            $remember ? 1 : 0,
            $deviceName,
            (string)($meta['browser'] ?? 'Unknown'),
            (string)($meta['platform'] ?? 'Unknown'),
            $ip,
            mb_substr($ua, 0, 255),
            session_id(),
            $expiresAt,
            $existingSessionId,
            (int)$user['id'],
        ]);
        if ($update->rowCount() < 1) {
            $existingSessionId = 0;
        }
    }

    if ($existingSessionId <= 0) {
        $insert = $pdo->prepare("
            INSERT INTO user_sessions
            (user_id, selector, token_hash, remembered, device_name, browser, platform, ip_address, user_agent, session_key, last_used_at, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
        ");
        $insert->execute([
            (int)$user['id'],
            $selector,
            $tokenHash,
            $remember ? 1 : 0,
            $deviceName,
            (string)($meta['browser'] ?? 'Unknown'),
            (string)($meta['platform'] ?? 'Unknown'),
            $ip,
            mb_substr($ua, 0, 255),
            session_id(),
            $expiresAt,
        ]);
        $keepSessionId = (int)$pdo->lastInsertId();
    } else {
        $keepSessionId = $existingSessionId;
    }

    wp_social_auth_prune_duplicate_sessions($pdo, $user, $meta, $deviceName, $keepSessionId);

    $_SESSION['user_session_row_id'] = $keepSessionId;

    wp_social_auth_sync_install_identity([
        'id' => (int)$user['id'],
        'name' => (string)$_SESSION['name'],
        'username' => (string)$_SESSION['username'],
        'email' => (string)$_SESSION['email'],
    ], $source);
}
