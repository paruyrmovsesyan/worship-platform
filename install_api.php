<?php
declare(strict_types=1);

require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/auth_bootstrap.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function wp_install_api_response(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_install_api_body(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function wp_install_cookie_name_for_scope(string $scope): string {
    return wp_install_normalize_scope($scope) === 'admin'
        ? 'wp_admin_install_device_id'
        : 'wp_install_device_id';
}

function wp_install_signature_cookie_name_for_scope(string $scope): string {
    return wp_install_normalize_scope($scope) === 'admin'
        ? 'wp_admin_install_device_sig'
        : 'wp_install_device_sig';
}

function wp_install_cookie_device_id(string $scope): string {
    $cookieName = wp_install_cookie_name_for_scope($scope);
    return wp_install_sanitize_device_id((string)($_COOKIE[$cookieName] ?? ''));
}

function wp_install_cookie_device_signature(string $scope): string {
    $cookieName = wp_install_signature_cookie_name_for_scope($scope);
    return wp_install_sanitize_signature((string)($_COOKIE[$cookieName] ?? ''));
}

function wp_install_request_device_id(string $scope, array $body): string {
    $cookieDeviceId = wp_install_cookie_device_id($scope);
    $bodyDeviceId = wp_install_sanitize_device_id((string)($body['device_id'] ?? ''));

    if ($cookieDeviceId !== '' && $bodyDeviceId !== '' && !hash_equals($cookieDeviceId, $bodyDeviceId)) {
        return '';
    }

    return $cookieDeviceId !== '' ? $cookieDeviceId : $bodyDeviceId;
}

function wp_install_request_signature(array $body): string {
    return wp_install_sanitize_signature((string)($body['device_signature'] ?? ''));
}

function wp_install_current_user_meta(): array {
    if (!function_exists('wp_auth_is_logged_in') || !wp_auth_is_logged_in()) {
        return [];
    }

    return [
        'user_id' => function_exists('wp_auth_user_id') ? wp_auth_user_id() : (int)($_SESSION['user_id'] ?? 0),
        'user_name' => trim((string)($_SESSION['name'] ?? $_SESSION['username'] ?? '')),
        'user_username' => trim((string)($_SESSION['username'] ?? '')),
        'user_email' => trim((string)($_SESSION['email'] ?? '')),
    ];
}

function wp_install_request_verified_source(string $scope, array $body): string {
    $expected = wp_install_expected_source($scope);
    $headerScope = strtolower(trim((string)($_SERVER['HTTP_X_WP_APP_SCOPE'] ?? '')));
    $installMode = strtolower(trim((string)($_SERVER['HTTP_X_WP_INSTALL_MODE'] ?? '')));
    $bodySource = strtolower(trim((string)($body['source'] ?? '')));

    if ($headerScope !== wp_install_normalize_scope($scope)) {
        return '';
    }

    if ($installMode !== 'standalone') {
        return '';
    }

    if ($bodySource !== $expected) {
        return '';
    }

    return $expected;
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'stats'));

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'stats') {
    wp_install_api_response([
        'ok' => true,
        'stats' => wp_install_stats(),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'current_device_status') {
    $scope = wp_install_normalize_scope((string)($_GET['scope'] ?? 'main'));
    $deviceId = wp_install_cookie_device_id($scope);
    $deviceSignature = wp_install_cookie_device_signature($scope);
    $device = wp_install_find_device($scope, $deviceId, $deviceSignature);
    $lastSeenAt = is_array($device) ? (string)($device['last_seen_at'] ?? '') : '';
    $isActive = $lastSeenAt !== '' ? wp_install_is_active_seen_at($lastSeenAt) : false;
    $isInstalled = is_array($device) && $isActive;

    wp_install_api_response([
        'ok' => true,
        'scope' => $scope,
        'installed' => $isInstalled,
        'verified' => is_array($device),
        'active' => $isActive,
        'last_seen_at' => $lastSeenAt,
        'confidence' => $isInstalled ? 'server' : 'server-none',
    ]);
}

$body = wp_install_api_body();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $scope = wp_install_normalize_scope((string)($body['scope'] ?? 'main'));
    $deviceId = wp_install_request_device_id($scope, $body);
    if ($deviceId === '') {
        wp_install_api_response(['ok' => false, 'message' => 'Invalid device identity.'], 422);
    }

    $verifiedSource = wp_install_request_verified_source($scope, $body);
    if ($verifiedSource === '') {
        wp_install_api_response(['ok' => false, 'message' => 'Unverified install request.'], 422);
    }

    $result = wp_install_register(
        $scope,
        $deviceId,
        array_merge([
            'verified_source' => $verifiedSource,
            'device_signature' => wp_install_request_signature($body),
            'ip_address' => wp_runtime_remote_ip(),
            'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
        ], wp_install_current_user_meta())
    );

    wp_install_api_response($result, !empty($result['ok']) ? 200 : 422);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'cleanup_legacy_main') {
    $scope = (string)($body['scope'] ?? 'admin');
    $verifiedSource = wp_install_request_verified_source($scope, $body);
    if ($verifiedSource === '' || wp_install_normalize_scope($scope) !== 'admin') {
        wp_install_api_response(['ok' => false, 'message' => 'Unverified cleanup request.'], 422);
    }

    $legacyDeviceId = wp_install_sanitize_device_id((string)($body['legacy_device_id'] ?? ''));
    $legacySignature = wp_install_sanitize_signature((string)($body['legacy_device_signature'] ?? ''));

    if ($legacyDeviceId === '' && $legacySignature === '') {
        wp_install_api_response(['ok' => true, 'removed' => false]);
    }

    $removed = wp_install_remove_device('main', $legacyDeviceId, $legacySignature);
    wp_install_api_response([
        'ok' => true,
        'removed' => $removed,
        'stats' => wp_install_stats(),
    ]);
}

wp_install_api_response(['ok' => false, 'error' => 'Unsupported request'], 405);
