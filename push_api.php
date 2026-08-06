<?php
// opcache_bust: 3591
declare(strict_types=1);

try {
    require_once __DIR__ . '/auth_bootstrap.php';
    require_once __DIR__ . '/push_service.php';
    require_once __DIR__ . '/runtime_config.php';
} catch (Throwable $e) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok' => false, 'error' => 'Include error: ' . $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function wp_push_api_response(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_push_api_body(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

try {
    $action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'config'));
    $config = wp_push_bootstrap_config();

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'config') {
        wp_push_api_response([
            'ok' => true,
            'enabled' => !empty($config['enabled']) && !empty($config['supported']),
            'supported' => !empty($config['supported']),
            'publicKey' => (string)($config['vapid_public_key'] ?? ''),
        ]);
    }
} catch (Throwable $err) {
    wp_push_api_response(['ok' => false, 'error' => $err->getMessage(), 'file' => $err->getFile(), 'line' => $err->getLine()], 500);
}

$body = wp_push_api_body();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'subscribe') {
    if (empty($config['supported'])) {
        wp_push_api_response(['ok' => false, 'error' => 'Push notifications are not supported on this server.'], 503);
    }

    $deviceScope = (string)($body['device_scope'] ?? 'main');
    $permissionState = (string)($body['permission'] ?? 'granted');
    $result = wp_push_upsert_subscription((array)($body['subscription'] ?? []), [
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
        'user_id' => (int)($_SESSION['user_id'] ?? 0),
        'user_name' => (string)($_SESSION['name'] ?? $_SESSION['username'] ?? ''),
        'user_email' => (string)($_SESSION['email'] ?? ''),
        'ip_address' => wp_runtime_remote_ip(),
        'device_id' => (string)($body['device_id'] ?? ''),
        'device_scope' => in_array($deviceScope, ['main', 'admin'], true) ? $deviceScope : 'main',
        'permission_state' => in_array($permissionState, ['granted', 'default', 'denied'], true) ? $permissionState : 'granted',
        'force_enable' => !empty($body['force_enable']),
    ]);

    $status = !empty($result['ok']) ? 200 : (!empty($result['disabled_by_admin']) ? 409 : 422);
    wp_push_api_response($result, $status);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'status') {
    $result = wp_push_sync_client_status($body, [
        'user_id' => (int)($_SESSION['user_id'] ?? 0),
        'user_name' => (string)($_SESSION['name'] ?? $_SESSION['username'] ?? ''),
        'user_email' => (string)($_SESSION['email'] ?? ''),
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
        'ip_address' => wp_runtime_remote_ip(),
    ]);
    wp_push_api_response($result);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'unsubscribe') {
    $endpoint = trim((string)($body['endpoint'] ?? ''));
    if ($endpoint === '') {
        wp_push_api_response(['ok' => false, 'error' => 'endpoint missing'], 422);
    }

    wp_push_api_response(['ok' => wp_push_remove_subscription_by_endpoint($endpoint)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'pull') {
    $endpoint = trim((string)($body['endpoint'] ?? ''));
    if ($endpoint === '') {
        wp_push_api_response(['ok' => false, 'error' => 'endpoint missing'], 422);
    }

    $notification = wp_push_pull_for_endpoint($endpoint);
    wp_push_api_response([
        'ok' => true,
        'notification' => $notification,
    ]);
}

wp_push_api_response(['ok' => false, 'error' => 'Unsupported request'], 405);
