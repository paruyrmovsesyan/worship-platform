<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/admin_i18n.php';

function wp_admin_cookie_secure(): bool {
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

function wp_admin_cookie_name(): string {
    return 'WORSHIPADMIN';
}

function wp_admin_cookie_secret(): string {
    return wp_runtime_admin_cookie_secret();
}

function wp_admin_cookie_payload(array $user): string {
    $id = (int)($user['id'] ?? 0);
    $email = strtolower(trim((string)($user['email'] ?? '')));
    return $id . '|' . $email;
}

function wp_admin_cookie_signature(array $user): string {
    return hash_hmac('sha256', wp_admin_cookie_payload($user), wp_admin_cookie_secret());
}

function wp_admin_set_access_cookie(array $user): void {
    $value = rtrim(strtr(base64_encode(wp_admin_cookie_payload($user) . '|' . wp_admin_cookie_signature($user)), '+/', '-_'), '=');
    setcookie(wp_admin_cookie_name(), $value, [
        'expires' => time() + (86400 * 30),
        'path' => '/',
        'domain' => '',
        'secure' => wp_admin_cookie_secure(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[wp_admin_cookie_name()] = $value;
}

function wp_admin_clear_access_cookie(): void {
    setcookie(wp_admin_cookie_name(), '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => wp_admin_cookie_secure(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    setcookie(wp_admin_cookie_name(), '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => !wp_admin_cookie_secure(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    unset($_COOKIE[wp_admin_cookie_name()]);
}

function wp_admin_logout_lock_key(): string {
    return 'admin_logout_lock_user_id';
}

function wp_admin_set_logout_lock(?array $user = null): void {
    $userId = 0;
    if ($user && !empty($user['id'])) {
        $userId = (int)$user['id'];
    } elseif (!empty($_SESSION['user_id'])) {
        $userId = (int)$_SESSION['user_id'];
    }

    $_SESSION[wp_admin_logout_lock_key()] = $userId;
}

function wp_admin_has_logout_lock(?array $user): bool {
    if (!isset($_SESSION[wp_admin_logout_lock_key()])) {
        return false;
    }

    $lockedUserId = (int)($_SESSION[wp_admin_logout_lock_key()] ?? 0);
    $currentUserId = (int)($user['id'] ?? $_SESSION['user_id'] ?? 0);

    if ($lockedUserId === 0) {
        return true;
    }

    return $currentUserId > 0 && $lockedUserId === $currentUserId;
}

function wp_admin_clear_logout_lock(): void {
    unset($_SESSION[wp_admin_logout_lock_key()]);
}

function wp_admin_decode_access_cookie(): ?array {
    if (empty($_COOKIE[wp_admin_cookie_name()])) {
        return null;
    }

    $encoded = strtr((string)$_COOKIE[wp_admin_cookie_name()], '-_', '+/');
    $padding = strlen($encoded) % 4;
    if ($padding > 0) {
        $encoded .= str_repeat('=', 4 - $padding);
    }

    $raw = base64_decode($encoded, true);
    if ($raw === false) {
        return null;
    }

    $parts = explode('|', $raw, 3);
    if (count($parts) !== 3) {
        return null;
    }

    return [
        'id' => (int)$parts[0],
        'email' => strtolower(trim((string)$parts[1])),
        'sig' => (string)$parts[2],
    ];
}

function wp_admin_has_valid_access_cookie(?array $user): bool {
    if (!$user) {
        return false;
    }

    $decoded = wp_admin_decode_access_cookie();
    if (!$decoded) {
        return false;
    }

    $expectedPayload = wp_admin_cookie_payload($user);
    $actualPayload = ((int)$decoded['id']) . '|' . strtolower(trim((string)$decoded['email']));

    if (!hash_equals($expectedPayload, $actualPayload)) {
        return false;
    }

    return hash_equals(wp_admin_cookie_signature($user), (string)$decoded['sig']);
}

function wp_admin_has_session_ticket(?array $user): bool {
    if (!$user) {
        return false;
    }

    if (empty($_SESSION['admin_authenticated_user_id'])) {
        return false;
    }

    return (int)$_SESSION['admin_authenticated_user_id'] === (int)($user['id'] ?? 0);
}

function wp_admin_safe_next($next, string $fallback = '/songs.php'): string {
    $next = trim((string)$next);
    if ($next === '') {
        return $fallback;
    }

    if (!preg_match('~^/[a-zA-Z0-9_./?=&%-]*$~', $next)) {
        return $fallback;
    }

    return $next;
}

function wp_admin_redirect_to_login(string $next = '/songs.php'): void {
    $next = wp_admin_safe_next($next, '/songs.php');
    header('Location: /admin_login.php?next=' . urlencode($next));
    exit;
}

function wp_admin_get_pdo(): ?PDO {
    if (function_exists('wp_auth_open_pdo')) {
        return wp_auth_open_pdo();
    }

    try {
        return wp_runtime_open_pdo();
    } catch (Throwable $e) {
        return null;
    }
}

function wp_admin_column_exists(PDO $pdo, string $table, string $column): bool {
    static $cache = [];
    $key = $table . ':' . $column;

    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

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

    return $cache[$key];
}

function wp_admin_user_columns(PDO $pdo): array {
    $columns = ['id', 'email', 'name', 'password_hash'];

    if (wp_admin_column_exists($pdo, 'users', 'role')) {
        $columns[] = 'role';
    }

    if (wp_admin_column_exists($pdo, 'users', 'is_admin')) {
        $columns[] = 'is_admin';
    }

    return $columns;
}

function wp_admin_get_current_user(): ?array {
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $pdo = wp_admin_get_pdo();
    if (!$pdo) {
        return [
            'id' => (int)$_SESSION['user_id'],
            'email' => (string)($_SESSION['email'] ?? ''),
            'name' => (string)($_SESSION['name'] ?? 'User'),
        ];
    }

    $columns = wp_admin_user_columns($pdo);
    $sql = 'SELECT ' . implode(', ', $columns) . ' FROM users WHERE id = ? LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([(int)$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

function wp_admin_find_user_by_login(PDO $pdo, string $login): ?array {
    $login = trim($login);
    if ($login === '') {
        return null;
    }

    $columns = wp_admin_user_columns($pdo);
    $sql = 'SELECT ' . implode(', ', $columns) . ' FROM users WHERE name = ? OR LOWER(email) = ? LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$login, strtolower($login)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

function wp_admin_find_user_by_id(PDO $pdo, int $userId): ?array {
    if ($userId <= 0) {
        return null;
    }

    $columns = wp_admin_user_columns($pdo);
    $sql = 'SELECT ' . implode(', ', $columns) . ' FROM users WHERE id = ? LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return is_array($row) ? $row : null;
}

function wp_admin_restore_user_from_access_cookie(): ?array {
    $decoded = wp_admin_decode_access_cookie();
    if (!$decoded || empty($decoded['id']) || empty($decoded['email'])) {
        return null;
    }

    $pdo = wp_admin_get_pdo();
    if (!$pdo) {
        return null;
    }

    $user = wp_admin_find_user_by_id($pdo, (int)$decoded['id']);
    if (!$user) {
        return null;
    }

    $userEmail = strtolower(trim((string)($user['email'] ?? '')));
    if ($userEmail === '' || !hash_equals($userEmail, (string)$decoded['email'])) {
        return null;
    }

    if (!wp_admin_has_valid_access_cookie($user)) {
        return null;
    }

    return $user;
}

function wp_admin_is_authorized(?array $user, array $config): bool {
    if (!$user) {
        return false;
    }

    if (array_key_exists('is_admin', $user) && !empty($user['is_admin'])) {
        return true;
    }

    $role = strtolower(trim((string)($user['role'] ?? '')));
    if (in_array($role, ['admin', 'superadmin', 'super_admin', 'owner'], true)) {
        return true;
    }

    $email = strtolower(trim((string)($user['email'] ?? '')));
    $adminEmails = array_map('strtolower', (array)($config['admin_emails'] ?? []));

    return $email !== '' && in_array($email, $adminEmails, true);
}

function wp_admin_user_section_permissions(?array $user, array $config): array {
    $defaults = wp_version_default_admin_permissions();
    if (!$user) {
        return $defaults;
    }

    $email = strtolower(trim((string)($user['email'] ?? '')));
    if ($email === '') {
        return $defaults;
    }

    $configured = $config['admin_user_permissions'] ?? [];
    if (!is_array($configured) || !isset($configured[$email]) || !is_array($configured[$email])) {
        return $defaults;
    }

    $resolved = [];
    foreach ($defaults as $section => $enabled) {
        $resolved[$section] = array_key_exists($section, $configured[$email])
            ? !empty($configured[$email][$section])
            : $enabled;
    }

    return $resolved;
}

function wp_admin_user_can_section(?array $user, array $config, string $section): bool {
    $permissions = wp_admin_user_section_permissions($user, $config);
    return !empty($permissions[$section]);
}

function wp_admin_can_bootstrap(array $user, array $config): bool {
    if (!empty($config['admin_emails'])) {
        return false;
    }

    return trim((string)($user['email'] ?? '')) !== '';
}

function wp_admin_bootstrap_access(array $user): bool {
    $email = strtolower(trim((string)($user['email'] ?? '')));
    if ($email === '') {
        return false;
    }

    return wp_version_save([
        'admin_emails' => [$email],
    ], [
        'actor' => $email,
        'ip' => wp_runtime_remote_ip(),
        'action' => 'bootstrap_admin',
    ]);
}

function wp_admin_sign_user_in(array $user, bool $regenerateSession = true): void {
    if ($regenerateSession) {
        session_regenerate_id(true);
    }
    $_SESSION['user_id'] = (int)($user['id'] ?? 0);
    $_SESSION['email'] = (string)($user['email'] ?? '');
    $_SESSION['name'] = trim((string)($user['name'] ?? '')) ?: (string)($user['email'] ?? 'Admin');
    $_SESSION['username'] = $_SESSION['name'];
    $_SESSION['auth_via_remember'] = 0;
    $_SESSION['admin_access_granted'] = 1;
    $_SESSION['admin_authenticated_at'] = date('c');
    $_SESSION['admin_authenticated_user_id'] = (int)($user['id'] ?? 0);
    wp_admin_clear_logout_lock();
    wp_admin_set_access_cookie($user);
}

function wp_admin_require_access(string $next = '/songs.php'): array {
    $config = wp_version_load();
    $user = wp_admin_get_current_user();

    if (!$user && !wp_admin_has_logout_lock(null)) {
        $restoredUser = wp_admin_restore_user_from_access_cookie();
        if ($restoredUser && wp_admin_is_authorized($restoredUser, $config)) {
            wp_admin_sign_user_in($restoredUser);
            $user = wp_admin_get_current_user() ?: $restoredUser;
        }
    }

    if (empty($_SESSION['user_id']) || !$user) {
        wp_admin_redirect_to_login($next);
    }

    if (wp_admin_has_logout_lock($user)) {
        unset($_SESSION['admin_access_granted'], $_SESSION['admin_authenticated_at'], $_SESSION['admin_authenticated_user_id']);
        wp_admin_clear_access_cookie();
        wp_admin_redirect_to_login($next);
    }

    if (!$user || !wp_admin_is_authorized($user, $config)) {
        unset($_SESSION['admin_access_granted'], $_SESSION['admin_authenticated_at'], $_SESSION['admin_authenticated_user_id']);
        wp_admin_clear_access_cookie();
        $target = wp_admin_safe_next($next, '/songs.php');
        header('Location: /admin_login.php?next=' . urlencode($target) . '&denied=1');
        exit;
    }

    if (empty($_SESSION['admin_access_granted'])) {
        $hasCookieTicket = wp_admin_has_valid_access_cookie($user);
        $hasSessionTicket = wp_admin_has_session_ticket($user);

        if (!$hasCookieTicket && !$hasSessionTicket) {
            wp_admin_redirect_to_login($next);
        }

        $_SESSION['admin_access_granted'] = 1;
        $_SESSION['admin_authenticated_at'] = date('c');
        $_SESSION['admin_authenticated_user_id'] = (int)($user['id'] ?? 0);
    }

    wp_admin_set_access_cookie($user);

    $user['access_mode'] = 'modern';
    $permissions = wp_admin_user_section_permissions($user, $config);
    $user['admin_section_permissions'] = $permissions;

    return [
        'user' => $user,
        'config' => $config,
        'permissions' => $permissions,
    ];
}
