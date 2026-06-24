<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

/*
|--------------------------------------------------------------------------
| Unified session bootstrap
|--------------------------------------------------------------------------
*/

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('WORSHIPSESSID');

    session_set_cookie_params([
        'lifetime' => 0,
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

if (!function_exists('wp_auth_open_pdo')) {
    function wp_auth_open_pdo(): ?PDO {
        try {
            return wp_runtime_open_pdo();
        } catch (Throwable $e) {
            return null;
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

if (!function_exists('wp_auth_remember_context_matches')) {
    function wp_auth_remember_context_matches(array $row, array $currentMeta): bool {
        $storedBrowser = trim((string)($row['browser'] ?? ''));
        $storedPlatform = trim((string)($row['platform'] ?? ''));
        $currentBrowser = trim((string)($currentMeta['browser'] ?? ''));
        $currentPlatform = trim((string)($currentMeta['platform'] ?? ''));
        $storedUserAgent = trim((string)($row['user_agent'] ?? ''));
        $currentUserAgent = trim((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));

        if ($storedBrowser !== '' && $currentBrowser !== '' && strcasecmp($storedBrowser, $currentBrowser) !== 0) {
            return false;
        }

        if ($storedPlatform !== '' && $currentPlatform !== '' && strcasecmp($storedPlatform, $currentPlatform) !== 0) {
            return false;
        }

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

        $deviceName = trim($deviceName);
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
}

if (!function_exists('wp_auth_prune_duplicate_device_sessions')) {
    function wp_auth_prune_duplicate_device_sessions(PDO $pdo, int $userId, array $meta, string $deviceName, int $keepSessionId = 0): void {
        if ($userId <= 0) {
            return;
        }

        $deviceName = trim($deviceName);
        $browser = trim((string)($meta['browser'] ?? ''));
        $platform = trim((string)($meta['platform'] ?? ''));
        $userAgent = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);

        if ($deviceName === '' || $browser === '' || $platform === '' || $userAgent === '') {
            return;
        }

        $sql = "
            DELETE FROM user_sessions
            WHERE user_id = ?
              AND device_name = ?
              AND browser = ?
              AND platform = ?
              AND user_agent = ?
        ";
        $params = [$userId, $deviceName, $browser, $platform, $userAgent];

        if ($keepSessionId > 0) {
            $sql .= " AND id <> ?";
            $params[] = $keepSessionId;
        }

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        } catch (Throwable $e) {
            // Duplicate cleanup should never block login.
        }
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

$pdo = wp_auth_open_pdo();

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

if (empty($_COOKIE['remember_me'])) {
    return;
}

if (!$pdo) {
    return;
}

$parts = explode(':', (string)$_COOKIE['remember_me'], 2);
if (count($parts) !== 2) {
    wp_auth_clear_remember_cookie();
    return;
}

[$selector, $validator] = $parts;

if ($selector === '' || $validator === '') {
    wp_auth_clear_remember_cookie();
    return;
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
          AND s.remembered = 1
          AND s.expires_at IS NOT NULL
          AND s.expires_at > NOW()
        LIMIT 1
    ");
    $st->execute([$selector]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        wp_auth_clear_remember_cookie();
        return;
    }

    $expectedHash = (string)($row['token_hash'] ?? '');
    $actualHash   = hash('sha256', $validator);

    if (!hash_equals($expectedHash, $actualHash)) {
        $del = $pdo->prepare("DELETE FROM user_sessions WHERE selector = ?");
        $del->execute([$selector]);
        wp_auth_clear_remember_cookie();
        return;
    }

    $currentMeta = wp_auth_detect_device_meta((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    if (!wp_auth_remember_context_matches($row, $currentMeta)) {
        wp_auth_clear_remember_cookie();
        return;
    }

    $sessionOrigin = wp_auth_extract_session_origin_from_device_name((string)($row['device_name'] ?? ''));
    $sessionDeviceName = wp_auth_merge_device_name_with_origin((string)$currentMeta['device_name'], $sessionOrigin);

   
    wp_auth_fill_session_user($row);
    $_SESSION['auth_via_remember'] = 1;
    $_SESSION['user_session_row_id'] = (int)($row['session_row_id'] ?? 0);

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

} catch (Throwable $e) {
    // silently fail
    return;
}
