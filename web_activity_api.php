<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$fetchSite = strtolower(trim((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')));
if ($fetchSite === 'cross-site') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'cross_site_request']);
    exit;
}

require_once __DIR__ . '/auth_bootstrap.php';

function wp_web_activity_client_info(string $userAgent): array {
    $browser = 'Unknown';
    if (stripos($userAgent, 'Edg') !== false) $browser = 'Edge';
    elseif (stripos($userAgent, 'OPR') !== false || stripos($userAgent, 'Opera') !== false) $browser = 'Opera';
    elseif (stripos($userAgent, 'Chrome') !== false) $browser = 'Chrome';
    elseif (stripos($userAgent, 'Safari') !== false) $browser = 'Safari';
    elseif (stripos($userAgent, 'Firefox') !== false) $browser = 'Firefox';

    $platform = 'Web';
    if (stripos($userAgent, 'iPhone') !== false) $platform = 'iPhone';
    elseif (stripos($userAgent, 'iPad') !== false) $platform = 'iPad';
    elseif (stripos($userAgent, 'Android') !== false) $platform = 'Android';
    elseif (stripos($userAgent, 'Windows') !== false) $platform = 'Windows';
    elseif (stripos($userAgent, 'Mac OS X') !== false || stripos($userAgent, 'Macintosh') !== false) $platform = 'macOS';
    elseif (stripos($userAgent, 'Linux') !== false) $platform = 'Linux';

    return [$platform, $browser];
}

try {
    $visitorToken = trim((string)($_COOKIE['wp_web_visitor'] ?? ''));
    if (!preg_match('/^[a-f0-9]{32}$/', $visitorToken)) {
        $visitorToken = bin2hex(random_bytes(16));
        setcookie('wp_web_visitor', $visitorToken, [
            'expires' => time() + (86400 * 365),
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    $payload = json_decode((string)file_get_contents('php://input'), true);
    $source = is_array($payload) ? strtolower(trim((string)($payload['source'] ?? 'web'))) : 'web';
    if (!in_array($source, ['app', 'web'], true)) $source = 'web';
    $presenceVersion = is_array($payload) ? (int)($payload['presenceVersion'] ?? 0) : 0;
    if ($presenceVersion !== 4) {
        $source = 'web';
        $presenceVersion = 4;
    }
    $isActive = !is_array($payload) || !array_key_exists('active', $payload) || $payload['active'] !== false;

    $deviceKey = hash('sha256', $visitorToken);
    $visitorKey = hash('sha256', $visitorToken . '|' . $source);
    $userId = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
    [$platform, $browser] = wp_web_activity_client_info((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));

    $path = is_array($payload) ? trim((string)($payload['path'] ?? '')) : '';
    if ($path === '' || $path[0] !== '/') $path = '/';
    $path = mb_substr($path, 0, 255);

    if (!$isActive) {
        // Hidden/background tabs are kept active until the heartbeat TTL expires.
        echo json_encode(['ok' => true, 'ignored' => 'inactive_signal'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo = wp_runtime_open_pdo();
    $stmt = $pdo->prepare("
        INSERT INTO web_activity
            (visitor_key, device_key, user_id, source, is_active, presence_version, platform, browser, last_path, last_seen, created_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            device_key = VALUES(device_key),
            user_id = VALUES(user_id),
            source = VALUES(source),
            is_active = 1,
            presence_version = VALUES(presence_version),
            platform = VALUES(platform),
            browser = VALUES(browser),
            last_path = VALUES(last_path),
            last_seen = NOW()
    ");
    $stmt->execute([$visitorKey, $deviceKey, $userId, $source, $presenceVersion, $platform, $browser, $path]);

    // Keep the table bounded without adding cleanup work to every heartbeat.
    if (random_int(1, 50) === 1) {
        $pdo->exec("DELETE FROM web_activity WHERE last_seen < DATE_SUB(NOW(), INTERVAL 30 DAY)");
    }

    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'activity_unavailable']);
}
