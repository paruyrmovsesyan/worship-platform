<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/runtime_config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function wp_install_identity_out(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_install_identity_body(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function wp_install_identity_source(array $body): string {
    $source = strtolower(trim((string)($body['source'] ?? $_GET['source'] ?? $_POST['source'] ?? '')));
    return in_array($source, ['pwa', 'admin-app'], true) ? $source : '';
}

function wp_install_identity_action(array $body): string {
    $action = strtolower(trim((string)($body['action'] ?? $_GET['action'] ?? $_POST['action'] ?? 'sync')));
    return $action === 'clear' ? 'clear' : 'sync';
}

function wp_install_identity_has_client_header(): bool {
    return trim((string)($_SERVER['HTTP_X_WP_INSTALL_IDENTITY'] ?? '')) === '1';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    wp_install_identity_out(['ok' => false, 'error' => 'Unsupported request'], 405);
}

$body = wp_install_identity_body();
$action = wp_install_identity_action($body);
$source = wp_install_identity_source($body);
if ($source === '') {
    wp_install_identity_out(['ok' => false, 'message' => 'Missing app source.'], 422);
}

$scope = $source === 'admin-app' ? 'admin' : 'main';
$cookieName = $scope === 'admin' ? 'wp_admin_install_device_id' : 'wp_install_device_id';
$deviceId = wp_install_sanitize_device_id((string)($_COOKIE[$cookieName] ?? ''));
if ($deviceId === '') {
    wp_install_identity_out(['ok' => false, 'message' => 'Missing install device identity.'], 422);
}

if ($action === 'clear') {
    if (!wp_install_identity_has_client_header()) {
        wp_install_identity_out(['ok' => false, 'error' => 'Forbidden'], 403);
    }

    $cleared = wp_install_clear_identity_match(
        $scope,
        $deviceId,
        wp_install_sanitize_signature((string)($body['device_signature'] ?? '')),
        0,
        (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
        wp_runtime_remote_ip()
    );

    wp_install_identity_out([
        'ok' => true,
        'cleared' => $cleared,
        'scope' => $scope,
        'device_id' => $deviceId,
    ]);
}

if (!function_exists('wp_auth_is_logged_in') || !wp_auth_is_logged_in()) {
    wp_install_identity_out(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$result = wp_install_register($scope, $deviceId, [
    'verified_source' => wp_install_expected_source($scope),
    'device_signature' => wp_install_sanitize_signature((string)($body['device_signature'] ?? '')),
    'user_id' => function_exists('wp_auth_user_id') ? wp_auth_user_id() : (int)($_SESSION['user_id'] ?? 0),
    'user_name' => trim((string)($_SESSION['name'] ?? '')),
    'user_username' => trim((string)($_SESSION['username'] ?? '')),
    'user_email' => trim((string)($_SESSION['email'] ?? '')),
    'ip_address' => wp_runtime_remote_ip(),
    'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
]);

wp_install_identity_out($result, !empty($result['ok']) ? 200 : 422);
