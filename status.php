<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/runtime_config.php';

function out($arr, $code = 200): void {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

function wp_status_activity_client_info(string $userAgent): array {
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

function wp_status_touch_activity(PDO $pdo): void {
    try {
        $fetchSite = strtolower(trim((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')));
        if ($fetchSite === 'cross-site') return;

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

        $requestedSurface = strtolower(trim((string)($_GET['surface'] ?? '')));
        $appContext = strtolower(trim((string)($_COOKIE['wp_app_context'] ?? '')));
        if ($requestedSurface === 'app') {
            $source = 'app';
        } elseif ($requestedSurface === 'web') {
            $source = 'web';
        } elseif ($appContext === 'admin-app') {
            return;
        } else {
            // Older cached site_guard.js versions do not send surface yet.
            $source = $appContext === 'pwa' ? 'app' : 'web';
        }

        $path = trim((string)($_GET['path'] ?? '/'));
        if ($path === '' || $path[0] !== '/') $path = '/';
        $path = mb_substr($path, 0, 255);

        [$platform, $browser] = wp_status_activity_client_info((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
        $deviceKey = hash('sha256', $visitorToken);
        $visitorKey = hash('sha256', $visitorToken . '|' . $source);

        $stmt = $pdo->prepare("
            INSERT INTO web_activity
                (visitor_key, device_key, user_id, source, is_active, presence_version, platform, browser, last_path, last_seen, created_at)
            VALUES (?, ?, NULL, ?, 1, 4, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                device_key = VALUES(device_key),
                source = VALUES(source),
                is_active = 1,
                presence_version = 4,
                platform = VALUES(platform),
                browser = VALUES(browser),
                last_path = VALUES(last_path),
                last_seen = NOW()
        ");
        $stmt->execute([$visitorKey, $deviceKey, $source, $platform, $browser, $path]);
    } catch (Throwable $e) {
        // Presence tracking must never affect website availability checks.
    }
}

$config = wp_version_load();

if (wp_version_is_maintenance_active($config)) {
    out([
        "ok" => false,
        "maintenance" => true,
        "scheduled" => wp_version_is_scheduled_maintenance_active($config),
        "message" => (string)$config['maintenance_message'],
        "maintenance_end_at" => (string)($config['maintenance_end_at'] ?? ''),
        "page_app_modes" => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
        "page_web_modes" => $config['page_web_modes'] ?? wp_version_default_page_web_modes(),
        "blocked_os_list" => $config['blocked_os_list'] ?? [],
    ], 503);
}

$ok = true;
$msg = "OK";

try {
    $pdo = wp_runtime_open_pdo();
    $pdo->query("SELECT 1");
    wp_status_touch_activity($pdo);
} catch (Exception $e) {
    $ok = false;
    $msg = "Կայքը ժամանակավորապես անհասանելի է (DB)";
}

if (!$ok) {
    out([
        "ok" => false,
        "maintenance" => true,
        "message" => $msg,
        "page_app_modes" => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
        "page_web_modes" => $config['page_web_modes'] ?? wp_version_default_page_web_modes(),
        "blocked_os_list" => $config['blocked_os_list'] ?? [],
    ], 503);
}

out([
    "ok" => true,
    "maintenance" => false,
    "message" => $msg,
    "page_app_modes" => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
    "page_web_modes" => $config['page_web_modes'] ?? wp_version_default_page_web_modes(),
    "blocked_os_list" => $config['blocked_os_list'] ?? [],
], 200);
