<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';
if (is_file(__DIR__ . '/install_service.php')) {
  require_once __DIR__ . '/install_service.php';
}

function out($arr, $code = 200){
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

function getDeviceInfo($ua){
  $ua = (string)$ua;
  $browser = 'Unknown';
  if(stripos($ua, 'Edg') !== false) $browser = 'Edge';
  elseif(stripos($ua, 'OPR') !== false || stripos($ua, 'Opera') !== false) $browser = 'Opera';
  elseif(stripos($ua, 'Chrome') !== false) $browser = 'Chrome';
  elseif(stripos($ua, 'Safari') !== false) $browser = 'Safari';
  elseif(stripos($ua, 'Firefox') !== false) $browser = 'Firefox';

  $platform = 'Unknown';
  if(stripos($ua, 'iPhone') !== false) $platform = 'iPhone';
  elseif(stripos($ua, 'iPad') !== false) $platform = 'iPad';
  elseif(stripos($ua, 'Android') !== false) $platform = 'Android';
  elseif(stripos($ua, 'Windows') !== false) $platform = 'Windows';
  elseif(stripos($ua, 'Mac OS X') !== false || stripos($ua, 'Macintosh') !== false) $platform = 'macOS';
  elseif(stripos($ua, 'Linux') !== false) $platform = 'Linux';

  $deviceName = trim($platform . ' • ' . $browser);
  return ['browser' => $browser, 'platform' => $platform, 'device_name' => $deviceName];
}

function wp_auth_session_origin_label(?string $source): string {
  $source = strtolower(trim((string)$source));
  if ($source === 'pwa') return 'app';
  if ($source === 'admin-app') return 'admin-app';
  return 'web';
}

function wp_auth_compose_device_name(string $deviceName, ?string $source): string {
  $origin = wp_auth_session_origin_label($source);
  $base = trim($deviceName);
  if ($base === '') return 'origin:' . $origin;
  return $base . ' | origin:' . $origin;
}

if (!function_exists('wp_auth_sync_install_identity')) {
  function wp_auth_sync_install_identity(array $user, string $source): void {
    if (!function_exists('wp_install_register') || !function_exists('wp_install_expected_source')) {
      return;
    }

    $source = strtolower(trim($source));
    if (!in_array($source, ['pwa', 'admin-app'], true)) {
      $hasMainInstallCookie = !empty($_COOKIE['wp_install_device_id']);
      $hasAdminInstallCookie = !empty($_COOKIE['wp_admin_install_device_id']);

      if ($hasMainInstallCookie) {
        $source = 'pwa';
      } elseif ($hasAdminInstallCookie) {
        $source = 'admin-app';
      } else {
        return;
      }
    }

    $scope = $source === 'admin-app' ? 'admin' : 'main';
    $cookieName = $scope === 'admin' ? 'wp_admin_install_device_id' : 'wp_install_device_id';
    $deviceId = function_exists('wp_install_sanitize_device_id')
      ? wp_install_sanitize_device_id((string)($_COOKIE[$cookieName] ?? ''))
      : trim((string)($_COOKIE[$cookieName] ?? ''));

    if ($deviceId === '') {
      return;
    }

    $name = trim((string)($user['name'] ?? ''));
    $username = trim((string)($user['username'] ?? ''));
    $email = trim((string)($user['email'] ?? ''));

    if ($name === '') {
      $name = $username !== '' ? $username : $email;
    }

    wp_install_register($scope, $deviceId, [
      'verified_source' => wp_install_expected_source($scope),
      'user_id' => max(0, (int)($user['id'] ?? 0)),
      'user_name' => $name,
      'user_username' => $username,
      'user_email' => $email,
      'ip_address' => function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? ''),
      'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
  }
}


if($_SERVER['REQUEST_METHOD'] !== 'POST'){
  out(["error" => "Method not allowed"], 405);
}

$raw = file_get_contents("php://input");
$d = json_decode($raw, true);
if (!is_array($d)) {
    $d = $_POST;
}

$name = trim($d['name'] ?? '');
$login = trim($d['login'] ?? ''); // username or email
$password = (string)($d['password'] ?? '');
$remember = !empty($d['remember_me']);
$source = strtolower((string)($d['source'] ?? 'pwa'));

function wp_runtime_password_min_length_api(): int {
    $path = __DIR__ . '/runtime_local_config.php';
    $local = is_file($path) ? include($path) : [];
    $fallback = (int)($local['password_min_length'] ?? 8);
    return max(6, min($fallback, 128));
}

$minPasswordLength = wp_runtime_password_min_length_api();

if($login === '' || $password === '' || strlen($password) < $minPasswordLength){
    out(["error" => "Լրացրեք բոլոր դաշտերը (գաղտնաբառը՝ առնվազն {$minPasswordLength} նիշ)։"], 400);
}

try {
  $conn = wp_runtime_open_pdo();
  $conn->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
  out(["error" => "DB connection failed"], 500);
}

function colExistsApi(PDO $conn, string $table, string $col): bool {
    $stmt = $conn->prepare("
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1
    ");
    $stmt->execute([$table, $col]);
    return (bool)$stmt->fetchColumn();
}

$hasUsername = colExistsApi($conn, 'users', 'username');
$hasEmail    = colExistsApi($conn, 'users', 'email');
$hasName     = colExistsApi($conn, 'users', 'name');

if($hasUsername){
    $stmt = $conn->prepare("SELECT id FROM users WHERE username=? LIMIT 1");
    $stmt->execute([$login]);
} elseif($hasEmail){
    $stmt = $conn->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
    $stmt->execute([$login]);
} else {
    out(["error" => "Users աղյուսակում չկա username/email դաշտ։"], 500);
}

if($stmt->fetch(PDO::FETCH_ASSOC)){
    $errorMsg = $hasUsername ? "Այս username-ով հաշիվ արդեն կա։" : "Այս email-ով հաշիվ արդեն կա։";
    out(["error" => $errorMsg], 400);
} else {

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $cols = [];
    $vals = [];
    $params = [];

    if($hasUsername){
        $cols[] = "username";
        $vals[] = "?";
        $params[] = $login;
    }
    if($hasEmail){
        $cols[] = "email";
        $vals[] = "?";
        $params[] = $login;
    }
    if($hasName){
        $cols[] = "name";
        $vals[] = "?";
        $params[] = ($name !== '' ? $name : $login);
    }

    $cols[] = "password_hash";
    $vals[] = "?";
    $params[] = $hash;

    $sql = "INSERT INTO users (".implode(",", $cols).") VALUES (".implode(",", $vals).")";
    $ins = $conn->prepare($sql);
    $ins->execute($params);

    $uid = (int)$conn->lastInsertId();

    session_regenerate_id(true);
    $_SESSION['user_id'] = $uid;
    $_SESSION['email'] = ($hasEmail && filter_var($login, FILTER_VALIDATE_EMAIL)) ? $login : '';
    $_SESSION['name'] = $name !== '' ? $name : $login;

    $_SESSION['username'] = $hasUsername ? $login : ($_SESSION['name'] ?: $login);
    $_SESSION['auth_via_remember'] = $remember ? 1 : 0;

    $selector = null;
    $tokenHash = null;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ip = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $info = getDeviceInfo($ua);
    $sessionDeviceName = wp_auth_compose_device_name($info['device_name'], $source);

    $expiresTs = $remember ? time() + 60*60*24*30 : time() + 60*60*12;
    $expiresAt = date('Y-m-d H:i:s', $expiresTs);

    if($remember){
        $selector = bin2hex(random_bytes(12));
        $validator = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $validator);

        setcookie("remember_me", $selector . ':' . $validator, [
            "expires"  => $expiresTs,
            "path"     => "/",
            "secure"   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            "httponly" => true,
            "samesite" => "Lax",
        ]);
    } else {
        if(!empty($_COOKIE['remember_me'])){
            $parts = explode(':', $_COOKIE['remember_me'], 2);
            if(count($parts) === 2){
                [$oldSelector] = $parts;
                $stmt = $conn->prepare("DELETE FROM user_sessions WHERE selector=?");
                $stmt->execute([$oldSelector]);
            }
        }

        setcookie("remember_me", "", [
            "expires"  => time() - 3600,
            "path"     => "/",
            "secure"   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            "httponly" => true,
            "samesite" => "Lax",
        ]);
    }

    $stmt = $conn->prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_key = ?");
    $stmt->execute([$uid, session_id()]);

    $stmt = $conn->prepare("
        INSERT INTO user_sessions
        (user_id, selector, token_hash, remembered, device_name, browser, platform, ip_address, user_agent, session_key, last_used_at, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
    ");
    $stmt->execute([
        $uid, $selector, $tokenHash, $remember ? 1 : 0, $sessionDeviceName, $info['browser'], $info['platform'], $ip, mb_substr($ua, 0, 255), session_id(), $expiresAt
    ]);

    $_SESSION['user_session_row_id'] = (int)$conn->lastInsertId();

    if (function_exists('wp_social_auth_send_registration_notifications')) {
        wp_social_auth_send_registration_notifications($conn, [
            'id' => $uid,
            'name' => (string)$_SESSION['name'],
            'username' => (string)$_SESSION['username'],
            'email' => (string)$_SESSION['email'],
            'email_verified_at' => null,
        ]);
    }

    wp_auth_sync_install_identity([
        'id' => $uid,
        'name' => (string)$_SESSION['name'],
        'username' => (string)$_SESSION['username'],
        'email' => (string)$_SESSION['email'],
    ], $source);

    out([
        "ok" => true,
        "user" => [
            "id" => $uid,
            "name" => $_SESSION['name'],
            "username" => $_SESSION['username'],
            "email" => $_SESSION['email']
        ]
    ]);
}
