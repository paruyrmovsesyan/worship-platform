<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/error_service.php';

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

// Helper for admin auth verification without redirect
function wp_error_is_admin_request(): bool {
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

// ── ADMIN ACTIONS (Protected) ──
if ($action === 'poll' || $action === 'get_logs') {
    if (!wp_error_is_admin_request()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $sinceId = (int)($_GET['since_id'] ?? 0);
    $limit = min(max((int)($_GET['limit'] ?? 50), 1), 200);
    $filters = [
        'environment' => trim((string)($_GET['environment'] ?? '')),
        'level' => trim((string)($_GET['level'] ?? '')),
        'search' => trim((string)($_GET['search'] ?? '')),
    ];

    $logs = wp_error_get_logs($filters, $limit, $sinceId);
    $stats = wp_error_get_stats();

    echo json_encode([
        'ok' => true,
        'logs' => $logs,
        'stats' => $stats,
        'timestamp' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action === 'native_php') {
    if (!wp_error_is_admin_request()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $logs = wp_error_read_native_php_logs(50);
    echo json_encode([
        'ok' => true,
        'logs' => $logs,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action === 'clear') {
    if (!wp_error_is_admin_request()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $cleared = wp_error_clear_logs();
    echo json_encode([
        'ok' => $cleared,
        'message' => $cleared ? 'Logs cleared successfully' : 'Failed to clear logs',
    ]);
    exit;
}

if ($action === 'test') {
    if (!wp_error_is_admin_request()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $testType = trim((string)($postData['type'] ?? 'frontend_js'));
    $testLevel = trim((string)($postData['level'] ?? 'error'));
    $testEnv = trim((string)($postData['environment'] ?? 'app'));

    $sampleErrors = [
        'frontend_js' => [
            'level' => 'error',
            'environment' => $testEnv,
            'message' => 'Uncaught TypeError: Cannot read properties of undefined (reading \'dataset\') in /assets/index.js',
            'file' => '/assets/index.js',
            'line' => 142,
            'url' => 'https://worship.pmstudio.am/songs',
            'stack_trace' => "TypeError: Cannot read properties of undefined (reading 'dataset')\n    at renderSongItem (https://worship.pmstudio.am/assets/index.js:142:18)\n    at Array.map (<anonymous>)\n    at SongList (https://worship.pmstudio.am/assets/index.js:289:33)",
        ],
        'promise' => [
            'level' => 'promise',
            'environment' => $testEnv,
            'message' => 'Unhandled Promise Rejection: NetworkError when attempting to fetch resource from /api/songs',
            'file' => '/pwa-init.js',
            'line' => 55,
            'url' => 'https://worship.pmstudio.am/transpose',
            'stack_trace' => "Error: NetworkError when attempting to fetch resource.\n    at fetchSongs (https://worship.pmstudio.am/pwa-init.js:55:12)\n    at async initApp (https://worship.pmstudio.am/assets/index.js:88:9)",
        ],
        'server' => [
            'level' => 'fatal',
            'environment' => 'server',
            'message' => 'Uncaught PDOException: SQLSTATE[HY000] [2002] Connection timed out in /runtime_config.php:280',
            'file' => '/runtime_config.php',
            'line' => 280,
            'url' => '/api.php?endpoint=songs',
            'stack_trace' => "#0 /runtime_config.php(280): PDO->__construct('mysql:host=127....')\n#1 /api.php(15): wp_runtime_open_pdo()\n#2 {main}",
        ]
    ];

    $template = $sampleErrors[$testType] ?? $sampleErrors['frontend_js'];
    if ($testLevel) $template['level'] = $testLevel;

    $result = wp_error_log_record($template);
    echo json_encode([
        'ok' => true,
        'result' => $result,
        'message' => 'Test error injected successfully',
    ]);
    exit;
}

// ── CLIENT-SIDE INCOMING ERROR REPORTING ──
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $ip = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

    // Simple IP-based Rate Limiting (max 30 requests per minute)
    $rateKey = 'err_rate_' . md5($ip);
    $rateFile = sys_get_temp_dir() . '/' . $rateKey;
    $rateData = @file_get_contents($rateFile);
    $currentTime = time();
    $rates = $rateData ? json_decode($rateData, true) : null;

    if (!is_array($rates) || ($currentTime - ($rates['reset'] ?? 0)) > 60) {
        $rates = ['count' => 1, 'reset' => $currentTime];
    } else {
        $rates['count']++;
        if ($rates['count'] > 40) {
            http_response_code(429);
            echo json_encode(['ok' => false, 'error' => 'Rate limit exceeded']);
            exit;
        }
    }
    @file_put_contents($rateFile, json_encode($rates));

    $message = trim((string)($postData['message'] ?? ''));
    if ($message === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Missing error message']);
        exit;
    }

    $level = trim((string)($postData['level'] ?? 'error'));
    $environment = trim((string)($postData['environment'] ?? ($postData['platform'] ?? 'web')));
    $file = isset($postData['file']) ? (string)$postData['file'] : (isset($postData['source']) ? (string)$postData['source'] : null);
    $line = isset($postData['line']) && is_numeric($postData['line']) ? (int)$postData['line'] : (isset($postData['lineno']) ? (int)$postData['lineno'] : null);
    $url = isset($postData['url']) ? (string)$postData['url'] : ($_SERVER['HTTP_REFERER'] ?? null);
    $stack = isset($postData['stack']) ? (string)$postData['stack'] : (isset($postData['stack_trace']) ? (string)$postData['stack_trace'] : null);
    $userId = isset($postData['user_id']) && is_numeric($postData['user_id']) ? (int)$postData['user_id'] : null;
    $userEmail = isset($postData['user_email']) ? (string)$postData['user_email'] : null;
    $userAgent = (string)($_SERVER['HTTP_USER_AGENT'] ?? ($postData['user_agent'] ?? ''));
    $deviceInfo = $postData['device_info'] ?? null;

    $result = wp_error_log_record([
        'level' => $level,
        'environment' => $environment,
        'message' => $message,
        'file' => $file,
        'line' => $line,
        'url' => $url,
        'stack_trace' => $stack,
        'user_id' => $userId,
        'user_email' => $userEmail,
        'ip_address' => $ip,
        'user_agent' => $userAgent,
        'device_info' => $deviceInfo,
    ]);

    echo json_encode(['ok' => true, 'result' => $result]);
    exit;
}

// Fallback
echo json_encode(['ok' => true, 'service' => 'Worship Error API v1']);
