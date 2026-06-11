<?php
declare(strict_types=1);

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/runtime_config.php';

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$logoutUserId = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
$logoutUserAgent = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
$logoutIpAddress = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');

try {
    $pdo = wp_runtime_open_pdo();

    $currentSessionId = session_id();

    if (!empty($_SESSION['user_id'])) {
        $uid = (int)$_SESSION['user_id'];

        $st = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_key = ?");
        $st->execute([$uid, $currentSessionId]);
    }

    if (!empty($_COOKIE['remember_me'])) {
        $parts = explode(':', (string)$_COOKIE['remember_me'], 2);
        $selector = $parts[0] ?? '';

        if ($selector !== '') {
            $st = $pdo->prepare("DELETE FROM user_sessions WHERE selector = ?");
            $st->execute([$selector]);
        }
    }
} catch (Throwable $e) {
    // նույնիսկ եթե DB fail լինի, logout-ը շարունակում ենք
}

try {
    $mainDeviceId = wp_install_sanitize_device_id((string)($_COOKIE['wp_install_device_id'] ?? ''));
    $mainDeviceSignature = wp_install_sanitize_signature((string)($_COOKIE['wp_install_device_sig'] ?? ''));
    if ($mainDeviceId !== '' || $mainDeviceSignature !== '' || $logoutUserId > 0) {
        wp_install_clear_identity_match('main', $mainDeviceId, $mainDeviceSignature, $logoutUserId, $logoutUserAgent, $logoutIpAddress);
    }

    $adminDeviceId = wp_install_sanitize_device_id((string)($_COOKIE['wp_admin_install_device_id'] ?? ''));
    $adminDeviceSignature = wp_install_sanitize_signature((string)($_COOKIE['wp_admin_install_device_sig'] ?? ''));
    if ($adminDeviceId !== '' || $adminDeviceSignature !== '' || $logoutUserId > 0) {
        wp_install_clear_identity_match('admin', $adminDeviceId, $adminDeviceSignature, $logoutUserId, $logoutUserAgent, $logoutIpAddress);
    }
} catch (Throwable $e) {
    // եթե install store sync-ը fail լինի, logout-ը միևնույն է շարունակում ենք
}

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    $sessionName = session_name();
    foreach ([true, false] as $sec) {
        setcookie($sessionName, '', [
            'expires'  => time() - 42000,
            'path'     => $params['path'] ?? '/',
            'domain'   => $params['domain'] ?? '',
            'secure'   => $sec,
            'httponly' => !empty($params['httponly']),
            'samesite' => 'Lax',
        ]);
    }
}

wp_auth_clear_remember_cookie();

if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

if (isset($_GET['silent']) && $_GET['silent'] === '1') {
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["ok" => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$source = strtolower((string)($_GET['source'] ?? ''));
$target = '/loginuser.php?logged_out=1';
if ($source !== '') {
    $target .= '&source=' . urlencode($source);
}
header('Location: ' . $target);
exit;
