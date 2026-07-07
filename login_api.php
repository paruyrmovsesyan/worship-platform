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

    $source = function_exists('wp_auth_normalize_session_source') ? wp_auth_normalize_session_source($source) : strtolower(trim($source));
    if (!in_array($source, ['pwa', 'admin-app'], true)) {
      return;
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

$login = trim((string)($d['login'] ?? ''));
$password = (string)($d['password'] ?? '');
$remember = !empty($d['remember_me']);
$source = function_exists('wp_auth_normalize_session_source')
  ? wp_auth_normalize_session_source((string)($d['source'] ?? ''))
  : strtolower((string)($d['source'] ?? 'web'));

if($login === '' || $password === ''){
  out(["error" => "Լրացրեք բոլոր դաշտերը"], 400);
}

if(!filter_var($login, FILTER_VALIDATE_EMAIL)){
  out(["error" => "Մուտքագրեք վավեր էլ. փոստի հասցե"], 400);
}

try {
  $conn = wp_runtime_open_pdo();
  $conn->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  try {
    $conn->exec("ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER email");
  } catch (Throwable $e) {}
  try {
    $conn->exec("ALTER TABLE users ADD COLUMN blocked_at DATETIME NULL DEFAULT NULL AFTER is_blocked");
  } catch (Throwable $e) {}
} catch (Exception $e) {
  out(["error" => "DB connection failed"], 500);
}

$loginNorm = strtolower($login);
$stmt = $conn->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND COALESCE(is_blocked, 0) = 0 LIMIT 1");
$stmt->execute([$loginNorm]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if($user && !empty($user['password_hash']) && password_verify($password, $user['password_hash'])){

  $oldSessionKey = session_id();
  $oldSelector = wp_auth_current_remember_selector();
  $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
  $ip = function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : (string)($_SERVER['REMOTE_ADDR'] ?? '');
  $info = getDeviceInfo($ua);
  $sessionDeviceName = function_exists('wp_auth_compose_session_device_name')
    ? wp_auth_compose_session_device_name($info['device_name'], $source)
    : wp_auth_compose_device_name($info['device_name'], $source);
  $existingSessionId = wp_auth_find_existing_device_session_id($conn, (int)$user['id'], $info, $sessionDeviceName);

  session_regenerate_id(true);

  $_SESSION['user_id'] = (int)$user['id'];
  $display = (string)($user['name'] ?: $user['email'] ?: 'User');
  $_SESSION['name'] = $display;
  $_SESSION['username'] = trim((string)($user['username'] ?? '')) ?: $display;
  $_SESSION['email'] = (string)($user['email'] ?? '');
  $_SESSION['auth_via_remember'] = $remember ? 1 : 0;

  $selector = null;
  $tokenHash = null;
  $remembered = $remember ? 1 : 0;

  $expiresTs = $remember ? wp_auth_remember_cookie_expiry_ts() : time() + 60*60*12;
  $expiresAt = $remember ? date('Y-m-d H:i:s', $expiresTs) : date('Y-m-d H:i:s', $expiresTs);

  if($remember){
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $validator);

    wp_auth_issue_remember_cookie($selector, $validator);
  } else {
    $selector = null;
    $tokenHash = null;

    if($oldSelector !== null && $oldSelector !== ''){
      if($existingSessionId > 0){
        $stmt = $conn->prepare("DELETE FROM user_sessions WHERE user_id = ? AND selector = ? AND id <> ?");
        $stmt->execute([(int)$user['id'], $oldSelector, $existingSessionId]);
      }else{
        $stmt = $conn->prepare("DELETE FROM user_sessions WHERE user_id = ? AND selector = ?");
        $stmt->execute([(int)$user['id'], $oldSelector]);
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

  if($oldSessionKey !== ''){
    if($existingSessionId > 0){
      $stmt = $conn->prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_key = ? AND id <> ?");
      $stmt->execute([(int)$user['id'], $oldSessionKey, $existingSessionId]);
    }else{
      $stmt = $conn->prepare("DELETE FROM user_sessions WHERE user_id = ? AND session_key = ?");
      $stmt->execute([(int)$user['id'], $oldSessionKey]);
    }
  }

  $sessionRowId = $existingSessionId;

  if($sessionRowId > 0){
    $stmt = $conn->prepare("
      UPDATE user_sessions
      SET selector = ?, token_hash = ?, remembered = ?, device_name = ?, browser = ?, platform = ?, ip_address = ?, user_agent = ?, session_key = ?, last_used_at = NOW(), expires_at = ?
      WHERE id = ? AND user_id = ?
      LIMIT 1
    ");
    $stmt->execute([
      $selector, $tokenHash, $remember ? 1 : 0, $sessionDeviceName, $info['browser'], $info['platform'], $ip, mb_substr($ua, 0, 255), session_id(), $expiresAt, $sessionRowId, (int)$user['id']
    ]);
    if($stmt->rowCount() < 1){
      $sessionRowId = 0;
    }
  }

  if($sessionRowId <= 0){
    $stmt = $conn->prepare("
      INSERT INTO user_sessions (user_id, selector, token_hash, remembered, device_name, browser, platform, ip_address, user_agent, session_key, last_used_at, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
    ");
    $stmt->execute([
      (int)$user['id'], $selector, $tokenHash, $remember ? 1 : 0, $sessionDeviceName, $info['browser'], $info['platform'], $ip, mb_substr($ua, 0, 255), session_id(), $expiresAt
    ]);
    $sessionRowId = (int)$conn->lastInsertId();
  }

  wp_auth_prune_duplicate_device_sessions($conn, (int)$user['id'], $info, $sessionDeviceName, $sessionRowId);

  $_SESSION['user_session_row_id'] = $sessionRowId;

  wp_auth_sync_install_identity($user, $source);

  out([
      "ok" => true,
      "user" => [
          "id" => (int)$user['id'],
          "name" => $display,
          "email" => $user['email']
      ]
  ]);

} else {
  out(["error" => "Սխալ էլ. փոստ կամ գաղտնաբառ"], 401);
}
