<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

/*
|--------------------------------------------------------------------------
| Unified session bootstrap
|--------------------------------------------------------------------------
*/

$https = function_exists('wp_runtime_is_https') ? wp_runtime_is_https() : (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('WORSHIPSESSID');

    session_set_cookie_params([
        'lifetime' => 86400 * 365,
        'path' => '/',
        'domain' => '',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');

    session_start();
}

if (!function_exists('wp_auth_clear_remember_cookie')) {
    function wp_auth_clear_remember_cookie(): void {
        $cookieOpts = [
            'expires'  => time() - 86400 * 30,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ];

        $domains = [null, '', $_SERVER['HTTP_HOST'] ?? ''];
        if (!empty($_SERVER['HTTP_HOST'])) {
            $host = $_SERVER['HTTP_HOST'];
            $domains[] = '.' . $host;
            $parts = explode('.', $host);
            if (count($parts) >= 3) {
                $mainDomain = implode('.', array_slice($parts, -2));
                $domains[] = $mainDomain;
                $domains[] = '.' . $mainDomain;
            }
        }
        $domains = array_unique(array_filter($domains, function($d) { return $d !== ''; }));

        foreach ($domains as $domain) {
            foreach ([true, false] as $sec) {
                $opts = $cookieOpts;
                $opts['secure'] = $sec;
                if ($domain !== null && $domain !== '') {
                    $opts['domain'] = $domain;
                }
                setcookie('remember_me', '', $opts);
            }
        }
        unset($_COOKIE['remember_me']);
    }
}

if (!function_exists('wp_auth_remember_cookie_expiry_ts')) {
    function wp_auth_remember_cookie_expiry_ts(): int {
        return time() + (86400 * 365 * 10);
    }
}

if (!function_exists('wp_auth_remember_session_expires_at')) {
    function wp_auth_remember_session_expires_at(): string {
        return date('Y-m-d H:i:s', wp_auth_remember_cookie_expiry_ts());
    }
}

if (!function_exists('wp_auth_is_https')) {
    function wp_auth_is_https(): bool {
        if (function_exists('wp_runtime_is_https')) {
            return wp_runtime_is_https();
        }
        return !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    }
}

if (!function_exists('wp_auth_issue_session_cookie')) {
    function wp_auth_issue_session_cookie(int $expiresTs): void {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        $sessionId = session_id();
        if ($sessionId === '') {
            return;
        }

        $params = session_get_cookie_params();
        setcookie(session_name(), $sessionId, [
            'expires'  => $expiresTs,
            'path'     => $params['path'] ?? '/',
            'domain'   => $params['domain'] ?? '',
            'secure'   => wp_auth_is_https(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}

if (!function_exists('wp_auth_issue_remember_cookie')) {
    function wp_auth_issue_remember_cookie(string $selector, string $validator): void {
        if ($selector === '' || $validator === '') {
            return;
        }

        $expiresTs = wp_auth_remember_cookie_expiry_ts();
        setcookie('remember_me', $selector . ':' . $validator, [
            'expires'  => $expiresTs,
            'path'     => '/',
            'secure'   => wp_auth_is_https(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        wp_auth_issue_session_cookie($expiresTs);
    }
}

if (!function_exists('wp_auth_open_pdo')) {
    function wp_auth_open_pdo(): ?PDO {
        try {
            return wp_runtime_open_pdo();
        } catch (Throwable $e) {
            return null;
        }
    }
}

if (!function_exists('wp_auth_ensure_user_access_columns')) {
    function wp_auth_ensure_user_access_columns(?PDO $pdo): void {
        static $done = false;
        if ($done || !$pdo) {
            return;
        }

        $done = true;
        try {
            $columns = [];
            $st = $pdo->query("SHOW COLUMNS FROM users");
            while ($row = $st ? $st->fetch(PDO::FETCH_ASSOC) : false) {
                $field = (string)($row['Field'] ?? '');
                if ($field !== '') {
                    $columns[$field] = true;
                }
            }

            if (empty($columns['is_blocked'])) {
                $pdo->exec("ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER email");
            }
            if (empty($columns['blocked_at'])) {
                $pdo->exec("ALTER TABLE users ADD COLUMN blocked_at DATETIME NULL DEFAULT NULL AFTER is_blocked");
            }
        } catch (Throwable $e) {
            // Column sync should never block auth flow.
        }
    }
}

if (!function_exists('wp_auth_touch_current_session')) {
    function wp_auth_touch_current_session(PDO $pdo): void {
        if (empty($_SESSION['user_id'])) return;

        $sessionKey = session_id();
        if ($sessionKey === '') return;

        try {
            $stmt = $pdo->prepare("
                UPDATE user_sessions
                SET last_used_at = NOW()
                WHERE user_id = ?
                  AND session_key = ?
                ORDER BY id DESC
                LIMIT 1
            ");
            $stmt->execute([
                (int)$_SESSION['user_id'],
                $sessionKey
            ]);
            
            // Also update user's overall last active time (throttled to 60s)
            if (empty($_SESSION['last_activity_update']) || time() - $_SESSION['last_activity_update'] > 60) {
                $prevTime = $_SESSION['last_activity_update'] ?? 0;
                $_SESSION['last_activity_update'] = time();
                try {
                    $stAct = $pdo->prepare("UPDATE users SET last_active_at = NOW() WHERE id = ?");
                    $stAct->execute([(int)$_SESSION['user_id']]);
                } catch (Throwable $e) {
                    $_SESSION['last_activity_update'] = $prevTime;
                }
            }
        } catch (Throwable $e) {
            // silently ignore
        }
    }
}

if (!function_exists('wp_auth_clear_session_user')) {
    function wp_auth_clear_session_user(bool $clearRememberCookie = false): void {
        unset(
            $_SESSION['user_id'],
            $_SESSION['email'],
            $_SESSION['name'],
            $_SESSION['username'],
            $_SESSION['auth_via_remember'],
            $_SESSION['user_session_row_id']
        );

        if ($clearRememberCookie) {
            wp_auth_clear_remember_cookie();
        }
    }
}

if (!function_exists('wp_auth_fill_session_user')) {
    function wp_auth_fill_session_user(array $row): void {
        $_SESSION['user_id']  = (int)$row['id'];
        $_SESSION['email']    = (string)($row['email'] ?? '');
        $_SESSION['name']     = trim((string)($row['name'] ?? '')) ?: (string)($row['email'] ?? 'User');
        $_SESSION['username'] = trim((string)($row['username'] ?? '')) ?: $_SESSION['name'];
    }
}

if (!function_exists('wp_auth_detect_device_meta')) {
    function wp_auth_detect_device_meta(string $ua): array {
        $ua = (string)$ua;

        $browser = 'Unknown';
        if (stripos($ua, 'Edg') !== false) $browser = 'Edge';
        elseif (stripos($ua, 'OPR') !== false || stripos($ua, 'Opera') !== false) $browser = 'Opera';
        elseif (stripos($ua, 'Chrome') !== false) $browser = 'Chrome';
        elseif (stripos($ua, 'Safari') !== false) $browser = 'Safari';
        elseif (stripos($ua, 'Firefox') !== false) $browser = 'Firefox';

        $platform = 'Unknown';
        if (stripos($ua, 'iPhone') !== false) $platform = 'iPhone';
        elseif (stripos($ua, 'iPad') !== false) $platform = 'iPad';
        elseif (stripos($ua, 'Android') !== false) $platform = 'Android';
        elseif (stripos($ua, 'Windows') !== false) $platform = 'Windows';
        elseif (stripos($ua, 'Mac OS X') !== false || stripos($ua, 'Macintosh') !== false) $platform = 'macOS';
        elseif (stripos($ua, 'Linux') !== false) $platform = 'Linux';

        return [
            'browser' => $browser,
            'platform' => $platform,
            'device_name' => trim($platform . ' • ' . $browser),
        ];
    }
}

if (!function_exists('wp_auth_normalize_session_source')) {
    function wp_auth_normalize_session_source(?string $source = null): string {
        $source = strtolower(trim((string)$source));
        if (in_array($source, ['pwa', 'admin-app', 'web'], true)) {
            return $source;
        }

        $querySource = strtolower(trim((string)($_GET['source'] ?? '')));
        if (in_array($querySource, ['pwa', 'admin-app', 'web'], true)) {
            return $querySource;
        }

        $postSource = strtolower(trim((string)($_POST['source'] ?? '')));
        if (in_array($postSource, ['pwa', 'admin-app', 'web'], true)) {
            return $postSource;
        }

        return 'web';
    }
}

if (!function_exists('wp_auth_session_origin_key')) {
    function wp_auth_session_origin_key(?string $source = null): string {
        $source = wp_auth_normalize_session_source($source);
        if ($source === 'pwa') return 'app';
        if ($source === 'admin-app') return 'admin-app';
        return 'web';
    }
}

if (!function_exists('wp_auth_compose_session_device_name')) {
    function wp_auth_compose_session_device_name(string $deviceName, ?string $source = null): string {
        return wp_auth_merge_device_name_with_origin($deviceName, wp_auth_session_origin_key($source));
    }
}

if (!function_exists('wp_auth_remember_context_matches')) {
    function wp_auth_remember_context_matches(array $row, array $currentMeta): bool {
        // The selector + validator pair is the actual credential. iOS PWA/Safari
        // can report browser/platform metadata slightly differently after app
        // relaunches or OS updates, so metadata must not invalidate a remembered
        // login by itself.
        return true;
    }
}

if (!function_exists('wp_auth_current_remember_selector')) {
    function wp_auth_current_remember_selector(): ?string {
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
}

if (!function_exists('wp_auth_extract_session_origin_from_device_name')) {
    function wp_auth_extract_session_origin_from_device_name(string $deviceName): string {
        $deviceName = trim($deviceName);
        if ($deviceName === '') return '';

        if (preg_match('/(?:^|\|\s*)origin:(app|admin-app|web)\s*$/i', $deviceName, $m)) {
            return strtolower((string)$m[1]);
        }

        $parts = array_map('trim', explode('•', $deviceName));
        $last = end($parts);
        if (!is_string($last)) return '';

        if ($last === 'Ծրագիր') return 'app';
        if ($last === 'Ադմին ծրագիր') return 'admin-app';
        if ($last === 'Կայք') return 'web';

        if ($last === 'app' || $last === 'admin-app' || $last === 'web') {
            return $last;
        }

        return '';
    }
}

if (!function_exists('wp_auth_merge_device_name_with_origin')) {
    function wp_auth_merge_device_name_with_origin(string $deviceName, string $origin): string {
        $base = trim($deviceName);
        $origin = trim($origin);
        if ($origin === '') {
            return $base;
        }

        $existingOrigin = wp_auth_extract_session_origin_from_device_name($base);
        if ($existingOrigin !== '') {
            $base = preg_replace('/\s*\|\s*origin:(app|admin-app|web)\s*$/i', '', $base);
            $base = preg_replace('/\s*•\s*(Ծրագիր|Ադմին ծրագիր|Կայք|app|admin-app|web)\s*$/u', '', (string)$base);
            $base = rtrim((string)$base, " \t\n\r\0\x0B|•");
        }

        if ($base === '') {
            return 'origin:' . $origin;
        }

        return $base . ' | origin:' . $origin;
    }
}

if (!function_exists('wp_auth_find_existing_device_session_id')) {
    function wp_auth_find_existing_device_session_id(PDO $pdo, int $userId, array $meta, string $deviceName): int {
        if ($userId <= 0) {
            return 0;
        }

        $sessionKey = session_id();
        $selector = function_exists('wp_auth_current_remember_selector') ? wp_auth_current_remember_selector() : '';
        $ip = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
        $userAgent = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
        $deviceName = trim($deviceName);

        try {
            // 1. Match exact current session_key or remember selector
            if ($sessionKey !== '' || $selector !== '') {
                $stmt = $pdo->prepare("
                    SELECT id FROM user_sessions
                    WHERE user_id = ?
                      AND (
                        (? <> '' AND session_key = ?)
                        OR (? <> '' AND selector = ?)
                      )
                    ORDER BY id DESC LIMIT 1
                ");
                $stmt->execute([$userId, $sessionKey, $sessionKey, $selector, $selector]);
                $id = (int)$stmt->fetchColumn();
                if ($id > 0) {
                    return $id;
                }
            }

            // 2. Match same exact device & browser on the same IP address
            if ($deviceName !== '' && $userAgent !== '' && $ip !== '') {
                $stmt = $pdo->prepare("
                    SELECT id FROM user_sessions
                    WHERE user_id = ?
                      AND device_name = ?
                      AND user_agent = ?
                      AND ip_address = ?
                    ORDER BY COALESCE(last_used_at, created_at) DESC, id DESC LIMIT 1
                ");
                $stmt->execute([$userId, $deviceName, $userAgent, $ip]);
                $id = (int)$stmt->fetchColumn();
                if ($id > 0) {
                    return $id;
                }
            }

            return 0;
        } catch (Throwable $e) {
            return 0;
        }
    }
}

if (!function_exists('wp_auth_prune_duplicate_device_sessions')) {
    function wp_auth_prune_duplicate_device_sessions(PDO $pdo, int $userId, array $meta, string $deviceName, int $keepSessionId = 0): void {
        if ($userId <= 0) {
            return;
        }

        try {
            // 1. Remove expired sessions
            $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND (expires_at IS NOT NULL AND expires_at < NOW())")->execute([$userId]);

            // 2. Remove older duplicate sessions from the EXACT SAME IP + user_agent + device_name
            $ip = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
            $userAgent = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
            $deviceName = trim($deviceName);

            if ($deviceName !== '' && $userAgent !== '' && $ip !== '') {
                $sql = "DELETE FROM user_sessions WHERE user_id = ? AND device_name = ? AND user_agent = ? AND ip_address = ?";
                $params = [$userId, $deviceName, $userAgent, $ip];
                if ($keepSessionId > 0) {
                    $sql .= " AND id <> ?";
                    $params[] = $keepSessionId;
                }
                $pdo->prepare($sql)->execute($params);
            }

            // 3. Limit total active sessions per user to 20
            $stmt = $pdo->prepare("SELECT id FROM user_sessions WHERE user_id = ? ORDER BY COALESCE(last_used_at, created_at) DESC LIMIT 20, 100");
            $stmt->execute([$userId]);
            $oldIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($oldIds)) {
                $placeholders = implode(',', array_fill(0, count($oldIds), '?'));
                $pdo->prepare("DELETE FROM user_sessions WHERE id IN ($placeholders)")->execute($oldIds);
            }
        } catch (Throwable $e) {
            // Cleanup should never block login.
        }
    }
}

if (!function_exists('wp_auth_cleanup_inactive_records')) {
    function wp_auth_cleanup_inactive_records(PDO $pdo, bool $force = false): int {
        static $cleaned = false;
        if ($cleaned && !$force) return 0;
        $cleaned = true;

        if (!$force && random_int(1, 30) !== 1) {
            return 0;
        }

        $deletedCount = 0;
        try {
            // 1. Delete user_sessions inactive for 30+ days or expired
            $stmt1 = $pdo->prepare("
                DELETE FROM user_sessions 
                WHERE (expires_at IS NOT NULL AND expires_at < NOW())
                   OR (COALESCE(last_used_at, created_at) < DATE_SUB(NOW(), INTERVAL 30 DAY))
            ");
            $stmt1->execute();
            $deletedCount += $stmt1->rowCount();

            // 2. Delete web_activity records inactive for 30+ days
            $stmt2 = $pdo->prepare("
                DELETE FROM web_activity 
                WHERE last_seen < DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $stmt2->execute();
            $deletedCount += $stmt2->rowCount();
        } catch (Throwable $e) {
            // Cleanup failure should never interrupt request execution
        }

        return $deletedCount;
    }
}

if (!function_exists('wp_auth_user_id')) {
    function wp_auth_user_id(): int {
        return !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
    }
}

if (!function_exists('wp_auth_is_logged_in')) {
    function wp_auth_is_logged_in(): bool {
        return wp_auth_user_id() > 0;
    }
}

if (!function_exists('wp_auth_current_session_backed')) {
    function wp_auth_current_session_backed(?PDO $pdo = null): bool {
        if (empty($_SESSION['user_id'])) {
            return false;
        }

        $pdo = $pdo ?: wp_auth_open_pdo();
        if (!$pdo) {
            return false;
        }

        $sessionKey = session_id();
        $sessionUserId = (int)$_SESSION['user_id'];
        $sessionRowId = !empty($_SESSION['user_session_row_id']) ? (int)$_SESSION['user_session_row_id'] : 0;

        try {
            if ($sessionRowId > 0) {
                $st = $pdo->prepare("
                    SELECT id
                    FROM user_sessions
                    WHERE id = ?
                      AND user_id = ?
                      AND session_key = ?
                      AND (expires_at IS NULL OR expires_at > NOW())
                    LIMIT 1
                ");
                $st->execute([$sessionRowId, $sessionUserId, $sessionKey]);
            } else {
                $st = $pdo->prepare("
                    SELECT id
                    FROM user_sessions
                    WHERE user_id = ?
                      AND session_key = ?
                      AND (expires_at IS NULL OR expires_at > NOW())
                    ORDER BY id DESC
                    LIMIT 1
                ");
                $st->execute([$sessionUserId, $sessionKey]);
            }

            return (bool)$st->fetchColumn();
        } catch (Throwable $e) {
            return false;
        }
    }
}

if (!function_exists('wp_auth_force_local_logout')) {
    function wp_auth_force_local_logout(bool $clearRememberCookie = true): void {
        wp_auth_clear_session_user($clearRememberCookie);

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires'  => time() - 42000,
                'path'     => $params['path'] ?? '/',
                'domain'   => $params['domain'] ?? '',
                'secure'   => !empty($params['secure']),
                'httponly' => !empty($params['httponly']),
                'samesite' => 'Lax',
            ]);
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
}

if (!function_exists('wp_auth_restore_from_remember_cookie')) {
    function wp_auth_restore_from_remember_cookie(?PDO $pdo = null): bool {
        if (!empty($_SESSION['user_id'])) {
            return true;
        }

        if (empty($_COOKIE['remember_me'])) {
            return false;
        }

        $pdo = $pdo ?: wp_auth_open_pdo();
        if (!$pdo) {
            return false;
        }

        $parts = explode(':', (string)$_COOKIE['remember_me'], 2);
        if (count($parts) !== 2) {
            wp_auth_clear_remember_cookie();
            return false;
        }

        [$selector, $validator] = $parts;

        if ($selector === '' || $validator === '') {
            wp_auth_clear_remember_cookie();
            return false;
        }

        try {
            $st = $pdo->prepare("
                SELECT
                    s.id AS session_row_id,
                    s.user_id,
                    s.selector,
                    s.token_hash,
                    s.remembered,
                    s.expires_at,
                    s.device_name,
                    s.browser,
                    s.platform,
                    s.user_agent,
                    u.id,
                    u.name,
                    u.username,
                    u.email
                FROM user_sessions s
                INNER JOIN users u ON u.id = s.user_id
                WHERE s.selector = ?
                  AND COALESCE(u.is_blocked, 0) = 0
                  AND s.remembered = 1
                  AND (s.expires_at IS NULL OR s.expires_at > NOW())
                LIMIT 1
            ");
            $st->execute([$selector]);
            $row = $st->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                wp_auth_clear_remember_cookie();
                return false;
            }

            $expectedHash = (string)($row['token_hash'] ?? '');
            $actualHash = hash('sha256', $validator);

            if (!hash_equals($expectedHash, $actualHash)) {
                $del = $pdo->prepare("DELETE FROM user_sessions WHERE selector = ?");
                $del->execute([$selector]);
                wp_auth_clear_remember_cookie();
                return false;
            }

            $currentMeta = wp_auth_detect_device_meta((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
            if (!wp_auth_remember_context_matches($row, $currentMeta)) {
                wp_auth_clear_remember_cookie();
                return false;
            }

            $sessionOrigin = wp_auth_extract_session_origin_from_device_name((string)($row['device_name'] ?? ''));
            $sessionDeviceName = wp_auth_merge_device_name_with_origin((string)$currentMeta['device_name'], $sessionOrigin);

            wp_auth_fill_session_user($row);
            $_SESSION['auth_via_remember'] = 1;
            $_SESSION['user_session_row_id'] = (int)($row['session_row_id'] ?? 0);
            wp_auth_issue_session_cookie(wp_auth_remember_cookie_expiry_ts());

            $upd = $pdo->prepare("
                UPDATE user_sessions
                SET
                    last_used_at = NOW(),
                    session_key = ?,
                    device_name = ?,
                    browser = ?,
                    platform = ?,
                    ip_address = ?,
                    user_agent = ?
                WHERE id = ?
                LIMIT 1
            ");
            $upd->execute([
                session_id(),
                $sessionDeviceName,
                (string)$currentMeta['browser'],
                (string)$currentMeta['platform'],
                function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? ''),
                mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
                (int)$row['session_row_id']
            ]);

            $_SESSION['last_activity_update'] = time();
            $stAct = $pdo->prepare("UPDATE users SET last_active_at = NOW() WHERE id = ?");
            $stAct->execute([(int)$row['user_id']]);

            return true;
        } catch (Throwable $e) {
            return false;
        }
    }
}

$pdo = wp_auth_open_pdo();
wp_auth_ensure_user_access_columns($pdo);

if (!empty($_SESSION['user_id'])) {
    if ($pdo) {
        try {
            $sessionKey = session_id();
            $sessionUserId = (int)$_SESSION['user_id'];
            $sessionRowId = !empty($_SESSION['user_session_row_id']) ? (int)$_SESSION['user_session_row_id'] : 0;

            if ($sessionRowId > 0) {
                $st = $pdo->prepare("
                    SELECT
                        s.id AS session_row_id,
                        s.user_id,
                        s.remembered,
                        s.expires_at,
                        u.id,
                        u.name,
                        u.username,
                        u.email
                    FROM user_sessions s
                    INNER JOIN users u ON u.id = s.user_id
                    WHERE s.id = ?
                      AND s.user_id = ?
                      AND COALESCE(u.is_blocked, 0) = 0
                      AND s.session_key = ?
                      AND (s.expires_at IS NULL OR s.expires_at > NOW())
                    LIMIT 1
                ");
                $st->execute([$sessionRowId, $sessionUserId, $sessionKey]);
            } else {
                $st = $pdo->prepare("
                    SELECT
                        s.id AS session_row_id,
                        s.user_id,
                        s.remembered,
                        s.expires_at,
                        u.id,
                        u.name,
                        u.username,
                        u.email
                    FROM user_sessions s
                    INNER JOIN users u ON u.id = s.user_id
                    WHERE s.user_id = ?
                      AND COALESCE(u.is_blocked, 0) = 0
                      AND s.session_key = ?
                      AND (s.expires_at IS NULL OR s.expires_at > NOW())
                    ORDER BY s.id DESC
                    LIMIT 1
                ");
                $st->execute([$sessionUserId, $sessionKey]);
            }
            $sessionRow = $st->fetch(PDO::FETCH_ASSOC);

            if ($sessionRow) {
                wp_auth_fill_session_user($sessionRow);
                $_SESSION['auth_via_remember'] = !empty($sessionRow['remembered']) ? 1 : 0;
                $_SESSION['user_session_row_id'] = (int)($sessionRow['session_row_id'] ?? 0);
                wp_auth_touch_current_session($pdo);
                return;
            }

            // Do not clear remember_me here; allow the bootstrap below
            // to restore the login from the persistent cookie.
            wp_auth_clear_session_user(false);
        } catch (Throwable $e) {
            return;
        }
    } else {
        return;
    }
}

if (!empty($_SESSION['user_id'])) {
    // If the user is already logged in, update their last active timestamp
    $pdoForAuth = wp_auth_open_pdo();
    if ($pdoForAuth) {
        wp_auth_touch_current_session($pdoForAuth);
        wp_auth_cleanup_inactive_records($pdoForAuth);
    }
} elseif (!empty($_COOKIE['remember_me'])) {
    // Otherwise, if they have a remember cookie, restore the session
    $pdoForAuth = wp_auth_open_pdo();
    if ($pdoForAuth) {
        wp_auth_restore_from_remember_cookie($pdoForAuth);
        wp_auth_cleanup_inactive_records($pdoForAuth);
    }
}
