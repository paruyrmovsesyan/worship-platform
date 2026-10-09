<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/mobile_service.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rawInput = file_get_contents('php://input');
$postData = [];
if ($rawInput) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $postData = $decoded;
    }
}
if (empty($postData) && !empty($_POST)) {
    $postData = $_POST;
}

$action = trim((string)($_GET['action'] ?? $postData['action'] ?? ''));

// Helper for admin auth check
function wp_mobile_is_admin(): bool {
    require_once __DIR__ . '/admin_access.php';
    $config = wp_version_load();
    $user = wp_admin_get_current_user();
    if (!$user && !wp_admin_has_logout_lock(null)) {
        $restored = wp_admin_restore_user_from_access_cookie();
        if ($restored && wp_admin_is_authorized($restored, $config)) {
            wp_admin_sign_user_in($restored, false);
            $user = $restored;
        }
    }
    return ($user !== null && wp_admin_is_authorized($user, $config));
}

// ── ADMIN ACTIONS ──
if ($action === 'save_config' || (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && $action === 'update')) {
    if (!wp_mobile_is_admin()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $currentConfig = wp_mobile_get_config();
    $incoming = $postData['config'] ?? $postData;

    if (isset($incoming['ios']) && is_array($incoming['ios'])) {
        $currentConfig['ios'] = array_merge($currentConfig['ios'], $incoming['ios']);
        $currentConfig['ios']['force_update'] = !empty($incoming['ios']['force_update']);
    }
    if (isset($incoming['android']) && is_array($incoming['android'])) {
        $currentConfig['android'] = array_merge($currentConfig['android'], $incoming['android']);
        $currentConfig['android']['force_update'] = !empty($incoming['android']['force_update']);
    }
    if (isset($incoming['announcement']) && is_array($incoming['announcement'])) {
        $currentConfig['announcement'] = array_merge($currentConfig['announcement'], $incoming['announcement']);
        $currentConfig['announcement']['enabled'] = !empty($incoming['announcement']['enabled']);
    }
    if (isset($incoming['features']) && is_array($incoming['features'])) {
        $currentConfig['features'] = array_merge($currentConfig['features'], $incoming['features']);
    }

    $saved = wp_mobile_save_config($currentConfig, 'admin');
    echo json_encode([
        'ok' => $saved,
        'config' => $currentConfig,
        'message' => $saved ? 'Կարգավորումները պահպանվեցին:' : 'Չհաջողվեց պահպանել:',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'get_admin_data') {
    if (!wp_mobile_is_admin()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $config = wp_mobile_get_config();
    $errorStats = wp_error_get_stats();
    $iosErrors = wp_mobile_get_error_logs('ios', 20);
    $androidErrors = wp_mobile_get_error_logs('android', 20);
    $devices = wp_mobile_get_registered_devices();

    echo json_encode([
        'ok' => true,
        'config' => $config,
        'error_stats' => $errorStats,
        'ios_errors' => $iosErrors,
        'android_errors' => $androidErrors,
        'devices' => $devices,
        'timestamp' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── CLIENT-FACING CONFIG CHECK ──
// e.g. GET /mobile_config_api.php?platform=ios&version=1.0&build=1
$platform = strtolower(trim((string)($_GET['platform'] ?? $postData['platform'] ?? '')));
if ($platform !== 'ios' && $platform !== 'android') {
    // If not specified, inspect user agent
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (str_contains($ua, 'iphone') || str_contains($ua, 'ipad') || str_contains($ua, 'ios')) {
        $platform = 'ios';
    } else {
        $platform = 'android';
    }
}

$clientVersion = trim((string)($_GET['version'] ?? $postData['version'] ?? ''));
$clientBuild = trim((string)($_GET['build'] ?? $postData['build'] ?? ''));

$evaluation = wp_mobile_evaluate_client($platform, $clientVersion, $clientBuild);
echo json_encode($evaluation, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
