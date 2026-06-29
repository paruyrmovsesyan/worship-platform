<?php
if (is_file(__DIR__ . '/runtime_config.php')) {
  require_once __DIR__ . '/runtime_config.php';
}

if (!function_exists('wp_runtime_compat_local_config')) {
  function wp_runtime_compat_local_config(): array {
    $path = __DIR__ . '/runtime_local_config.php';
    if (!is_file($path)) {
      return [];
    }

    $loaded = include $path;
    return is_array($loaded) ? $loaded : [];
  }
}

if (!function_exists('wp_runtime_compat_env')) {
  function wp_runtime_compat_env(string $key, string $fallback = ''): string {
    $value = getenv($key);
    if (is_string($value) && $value !== '') {
      return $value;
    }
    if (isset($_ENV[$key]) && is_string($_ENV[$key]) && $_ENV[$key] !== '') {
      return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && is_string($_SERVER[$key]) && $_SERVER[$key] !== '') {
      return $_SERVER[$key];
    }
    return $fallback;
  }
}

if (!function_exists('wp_runtime_open_pdo')) {
  function wp_runtime_open_pdo(): PDO {
    $local = wp_runtime_compat_local_config();
    $db = is_array($local['db'] ?? null) ? $local['db'] : [];

    $fallback = [
      'host' => (string)($db['host'] ?? 'localhost'),
      'name' => (string)($db['name'] ?? 'pmstudio_wolarm'),
      'user' => (string)($db['user'] ?? 'pmstudio_wolarm'),
      'pass' => (string)($db['pass'] ?? 'wolarm2026'),
      'charset' => (string)($db['charset'] ?? 'utf8mb4'),
    ];

    $env = [
      'host' => trim(wp_runtime_compat_env('WORSHIP_DB_HOST', '')),
      'name' => trim(wp_runtime_compat_env('WORSHIP_DB_NAME', '')),
      'user' => trim(wp_runtime_compat_env('WORSHIP_DB_USER', '')),
      'pass' => wp_runtime_compat_env('WORSHIP_DB_PASS', ''),
      'charset' => trim(wp_runtime_compat_env('WORSHIP_DB_CHARSET', '')),
    ];

    $useEnv = $env['host'] !== '' && $env['name'] !== '' && $env['user'] !== '' && $env['pass'] !== '';

    $host = $useEnv ? $env['host'] : $fallback['host'];
    $name = $useEnv ? $env['name'] : $fallback['name'];
    $user = $useEnv ? $env['user'] : $fallback['user'];
    $pass = $useEnv ? $env['pass'] : $fallback['pass'];
    $charset = ($useEnv && $env['charset'] !== '') ? $env['charset'] : $fallback['charset'];

    return new PDO(
      sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $name, $charset),
      $user,
      $pass,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
  }
}
require_once __DIR__ . '/auth_bootstrap.php';
if (is_file(__DIR__ . '/install_service.php')) {
  require_once __DIR__ . '/install_service.php';
}
if (is_file(__DIR__ . '/social_auth_bootstrap.php')) {
  require_once __DIR__ . '/social_auth_bootstrap.php';
}

error_reporting(E_ALL);
ini_set('display_errors', 1);

$conn = wp_runtime_open_pdo();


function safeNext($next){
  $next = $next ?: '/main.html';
  if(!preg_match('~^/[a-zA-Z0-9_./\-]*$~', $next)) return '/main.html';
  return $next;
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

  return [
    'browser' => $browser,
    'platform' => $platform,
    'device_name' => $deviceName
  ];
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
  if ($base === '') {
    return 'origin:' . $origin;
  }
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

      if ($hasMainInstallCookie) {
        $source = 'pwa';
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

$next = safeNext($_GET['next'] ?? ($_POST['next'] ?? '/main.html'));
$source = strtolower((string)($_GET['source'] ?? $_POST['source'] ?? ''));
$isProgramAuth = in_array($source, ['pwa', 'admin-app'], true);
$authBodyClass = $isProgramAuth ? 'auth-app' : 'auth-web';
$sourceQuery = $source !== '' ? '&source=' . rawurlencode($source) : '';
$authBadgeLabel = 'Worship Platform';
$authTitle = 'Մուտք գործիր քո հաշվով';
$authLead = 'Մեկ միասնական մուտք քո անձնական գրադարանի, սեթլիստների և ծանուցումների համար՝ թե՛ կայքում, թե՛ ծրագրում։';
$authMiniBadge = 'Միասնական մուտք';
$authMetaChip = 'Քո տվյալները միշտ քեզ հետ են';
$authNote = 'Մուտք գործիր, որպեսզի համաժամացնես քո պահպանված երգերը և սեթլիստները բոլոր սարքերում։';
$socialProviderLabels = function_exists('wp_social_auth_provider_labels') ? wp_social_auth_provider_labels() : ['google' => 'Google'];
$socialProviders = array_keys($socialProviderLabels);
$socialError = trim((string)($_GET['social_error'] ?? ''));

// ✅ 1) already logged in by session
if(!empty($_SESSION['user_id'])){
  wp_auth_sync_install_identity([
    'id' => (int)($_SESSION['user_id'] ?? 0),
    'name' => (string)($_SESSION['name'] ?? ''),
    'username' => (string)($_SESSION['username'] ?? ''),
    'email' => (string)($_SESSION['email'] ?? ''),
  ], $source);
  header("Location: ".$next);
  exit;
}

$error = '';
if ($error === '' && $socialError !== '') {
  $error = $socialError;
}

if($_SERVER['REQUEST_METHOD']==='POST'){
  $login = trim($_POST['login'] ?? '');
  $password = (string)($_POST['password'] ?? '');
  $remember = !empty($_POST['remember_me']);

  if($login === '' || $password === ''){
    $error = "Լրացրեք բոլոր դաշտերը";
  } else {

    $loginNorm = strtolower($login);

    $stmt = $conn->prepare("SELECT * FROM users WHERE name = ? OR LOWER(email) = ? LIMIT 1");
    $stmt->execute([$login, $loginNorm]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if($user && !empty($user['password_hash']) && password_verify($password, $user['password_hash'])){

      $oldSessionKey = session_id();
      $oldSelector = wp_auth_current_remember_selector();
      $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
      $ip = wp_runtime_remote_ip();
      $info = getDeviceInfo($ua);
      $sessionDeviceName = wp_auth_compose_device_name($info['device_name'], $source);
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

$expiresTs = $remember
  ? time() + 60*60*24*30
  : time() + 60*60*12;

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
    SET
      selector = ?,
      token_hash = ?,
      remembered = ?,
      device_name = ?,
      browser = ?,
      platform = ?,
      ip_address = ?,
      user_agent = ?,
      session_key = ?,
      last_used_at = NOW(),
      expires_at = ?
    WHERE id = ?
      AND user_id = ?
    LIMIT 1
  ");
  $stmt->execute([
    $selector,
    $tokenHash,
    $remember ? 1 : 0,
    $sessionDeviceName,
    $info['browser'],
    $info['platform'],
    $ip,
    mb_substr($ua, 0, 255),
    session_id(),
    $expiresAt,
    $sessionRowId,
    (int)$user['id']
  ]);

  if($stmt->rowCount() < 1){
    $sessionRowId = 0;
  }
}

if($sessionRowId <= 0){
  $stmt = $conn->prepare("
    INSERT INTO user_sessions
    (user_id, selector, token_hash, remembered, device_name, browser, platform, ip_address, user_agent, session_key, last_used_at, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
  ");
  $stmt->execute([
    (int)$user['id'],
    $selector,
    $tokenHash,
    $remember ? 1 : 0,
    $sessionDeviceName,
    $info['browser'],
    $info['platform'],
    $ip,
    mb_substr($ua, 0, 255),
    session_id(),
    $expiresAt
  ]);
  $sessionRowId = (int)$conn->lastInsertId();
}

wp_auth_prune_duplicate_device_sessions($conn, (int)$user['id'], $info, $sessionDeviceName, $sessionRowId);

$_SESSION['user_session_row_id'] = $sessionRowId;

      $sep = (strpos($next, '?') === false) ? '?' : '&';
$nextWithFlag = $next . $sep . 'session_login=' . ($remember ? '0' : '1');

wp_auth_sync_install_identity($user, $source);

header("Location: " . $nextWithFlag);
exit;

    } else {
      $error = "Սխալ մուտքանուն/email կամ password";
    }
  }
}
?>
<!doctype html>
<html lang="hy">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="apple-touch-icon" href="/wolarm_youth.png">
<meta name="theme-color" content="#070910">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/wolarmyouth.jpg" type="image/jpeg">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Worship Platform">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#05050A">
<style id="wp-prepaint-bg">html,body{background:#05050A;color-scheme:dark}</style>
<script src="/i18n.js?v=2" defer></script>
<script src="/loader.js" defer></script>
<script src="/pwa-init.js" defer></script>
<title>Մուտք — Worship Platform</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
/* ── Reset & Base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0;
  min-height: 100svh;
  background: #05050A;
  color: #E8E8F0;
}

/* ── Split Layout ── */
.split-layout {
  display: flex;
  min-height: 100svh;
  width: 100%;
}

/* ── Left Side: Hero / Artwork ── */
.hero-section {
  display: none; /* hidden on mobile */
  flex: 1.2;
  position: relative;
  background: 
    radial-gradient(circle at 15% 50%, rgba(157,114,255,0.15) 0%, transparent 40%),
    radial-gradient(circle at 85% 30%, rgba(0,240,255,0.1) 0%, transparent 40%),
    linear-gradient(135deg, #0A0A14 0%, #05050A 100%);
  border-right: 1px solid rgba(255,255,255,0.03);
  overflow: hidden;
  padding: 60px;
  flex-direction: column;
  justify-content: center;
}

/* dynamic rings */
.hero-section::before,
.hero-section::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.02);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.hero-section::before { width: 120%; padding-bottom: 120%; border-width: 2px; border-color: rgba(157,114,255,0.05); }
.hero-section::after { width: 80%; padding-bottom: 80%; border-width: 1px; border-color: rgba(0,240,255,0.04); }

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 500px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(157,114,255,0.1);
  border: 1px solid rgba(157,114,255,0.2);
  color: #C8B4FF;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 24px;
}
.hero-badge::before {
  content: '';
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #9D72FF;
  box-shadow: 0 0 12px rgba(157,114,255,0.8);
}

.hero-title {
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: #fff;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #FFF 0%, #B0B0C0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-lead {
  font-size: 16px;
  line-height: 1.6;
  color: #C0C0D8;
  margin-bottom: 40px;
}

/* ── Right Side: Form ── */
.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /*
    Bug 3 fix: use --vv-height (set by JS via visualViewport) so the form section
    shrinks when the iOS soft keyboard opens, pushing content above it.
    Fallback chain: JS-set var → keyboard-inset-height CSS env → 100svh.
  */
  min-height: var(--vv-height, env(keyboard-inset-height, 100svh));
  padding: env(safe-area-inset-top, 20px) 24px calc(env(safe-area-inset-bottom, 20px) + 108px);
  background: #05050A;
  position: relative;
  /* Enable smooth scroll so the active input scrolls into view */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.form-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 2;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #A0A0C0;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 32px;
  transition: 0.2s;
}
.back-link:hover { color: #00F0FF; transform: translateX(-4px); }

.form-header {
  margin-bottom: 32px;
}
.form-header h2 {
  font-size: 32px;
  font-weight: 800;
  color: #F0F0FF;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}
.form-header p {
  font-size: 14px;
  color: #A0A0C0;
}

/* Floating label inputs */
.input-group {
  position: relative;
  margin-bottom: 16px;
}
.input-group input {
  width: 100%;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 24px 16px 8px 16px;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
}
.input-group input:focus {
  background: rgba(0,240,255,0.04);
  border-color: rgba(0,240,255,0.4);
  box-shadow: 0 0 0 4px rgba(0,240,255,0.1);
}
.input-group label {
  position: absolute;
  left: 16px;
  top: 17px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  pointer-events: none;
  transition: all 0.2s ease;
}
.input-group input:focus ~ label,
.input-group input:not(:placeholder-shown) ~ label {
  top: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #00F0FF;
}
.input-group input::placeholder {
  color: transparent !important;
}

/* Error */
.error-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255,80,80,0.08);
  border: 1px solid rgba(255,80,80,0.2);
  color: #FF9090;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
}

/* Options row */
.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  margin-bottom: 24px;
}

.chk {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.chk input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.chk-box {
  width: 18px; height: 18px;
  border-radius: 6px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.02);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.chk input:checked + .chk-box {
  background: #9D72FF;
  border-color: #9D72FF;
  box-shadow: 0 0 12px rgba(157,114,255,0.4);
}
.chk input:checked + .chk-box::after {
  content: '';
  width: 8px; height: 4px;
  border-left: 2px solid #05050A;
  border-bottom: 2px solid #05050A;
  transform: rotate(-45deg);
  margin-top: -2px;
}
.chk-text {
  font-size: 13px;
  font-weight: 500;
  color: #C0C0D8;
}

.text-link {
  font-size: 13px;
  font-weight: 600;
  color: #9D72FF;
  text-decoration: none;
  transition: 0.2s;
}
.text-link:hover {
  color: #00F0FF;
  text-decoration: underline;
}

/* Main CTA */
.btn-primary {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #9D72FF 0%, #00F0FF 100%);
  color: #05050A;
  font-size: 16px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(157,114,255,0.25);
  margin-bottom: 24px;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(157,114,255,0.35);
}

/* Socials */
.social-sep {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #8080A8;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.social-sep::before, .social-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.05);
}

.social-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  color: #E8E8F0;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.social-btn:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
  transform: translateY(-1px);
}
.social-btn.is-disabled {
  opacity: 0.5;
  pointer-events: none;
  border-style: dashed;
}
.social-icon {
  width: 20px; height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
.social-note {
  display: block;
  font-size: 10px;
  color: #A0A0C0;
  font-weight: 500;
  margin-top: 2px;
}

.footer-link {
  text-align: center;
  margin-top: 32px;
  font-size: 14px;
  color: #C0C0D8;
}
.footer-link a {
  color: #9D72FF;
  font-weight: 600;
  text-decoration: none;
}
.footer-link a:hover { text-decoration: underline; }

/* Responsive */
@media (min-width: 900px) {
  .hero-section { display: flex; }
}

/* React SPA equivalent animation for Login */
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media all and (display-mode: standalone) {
  .animate-fade-in {
    animation: fadeInPWA 0.28s ease-out forwards;
  }
}
@keyframes fadeInPWA {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
</head>
<body class="<?= htmlspecialchars($authBodyClass, ENT_QUOTES) ?>">
  <div class="split-layout animate-fade-in">
    
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <span class="hero-badge"><?= htmlspecialchars($authBadgeLabel, ENT_QUOTES) ?></span>
        <h1 class="hero-title"><?= htmlspecialchars($authTitle, ENT_QUOTES) ?></h1>
        <p class="hero-lead"><?= htmlspecialchars($authLead, ENT_QUOTES) ?></p>
      </div>
    </div>

    <!-- Form Section -->
    <div class="form-section">
      <div class="form-container">
        
        <?php if(!$isProgramAuth): ?>
          <a href="<?= htmlspecialchars($source !== '' ? '/?source=' . rawurlencode($source) : '/', ENT_QUOTES) ?>" class="back-link">
            &larr; Վերադառնալ
          </a>
        <?php endif; ?>

        <div id="wpLangContainer"></div>
        <div class="form-header">
          <h2>Բարի վերադարձ</h2>
          <p><?= htmlspecialchars($authNote, ENT_QUOTES) ?></p>
        </div>

        <?php if(!empty($error)) echo "<div class='error-msg'>".htmlspecialchars($error)."</div>"; ?>

        <form method="POST" action="/loginuser.php">
          <input type="hidden" name="next" value="<?= htmlspecialchars($next, ENT_QUOTES) ?>">
          <input type="hidden" name="source" value="<?= htmlspecialchars($source, ENT_QUOTES) ?>">

          <div class="input-group">
            <input type="text" name="login" id="login" required placeholder=" ">
            <label for="login">Մուտքանուն կամ Էլ. փոստ</label>
          </div>

          <div class="input-group">
            <input type="password" name="password" id="password" required placeholder=" ">
            <label for="password">Գաղտնաբառ</label>
          </div>

          <div class="options-row">
            <label class="chk">
              <input type="checkbox" name="remember_me">
              <span class="chk-box" aria-hidden="true"></span>
              <span class="chk-text">Հիշել ինձ</span>
            </label>
            <a class="text-link" href="/forgot_password.php?next=<?= htmlspecialchars($next, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">Մոռացե՞լ եք</a>
          </div>

          <button type="submit" class="btn-primary">Մուտք</button>
        </form>

        <?php if(!empty($socialProviders)): ?>
        <div class="social-sep">կամ շարունակիր</div>
        <div class="social-btns">
          <?php foreach($socialProviders as $provider): ?>
            <?php
              $providerLabel = function_exists('wp_social_auth_provider_label') ? wp_social_auth_provider_label($provider) : ucfirst($provider);
              $providerEnabled = function_exists('wp_social_auth_provider_enabled') ? wp_social_auth_provider_enabled($provider) : false;
              $socialUrl = function_exists('wp_social_auth_start_url')
                ? wp_social_auth_start_url($provider, $next, $source, 'login', false)
                : '#';
              $svgGoogle = '<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>';
              $socialIcon = ($provider === 'google') ? $svgGoogle : htmlspecialchars(ucfirst($provider[0] ?? ''));
              $socialNote = $providerEnabled ? 'Պատրաստ է մուտքի համար' : 'Միացրու ադմինից';
            ?>
            <a class="social-btn <?= $providerEnabled ? '' : 'is-disabled' ?>" 
               href="<?= htmlspecialchars($providerEnabled ? $socialUrl : '#', ENT_QUOTES) ?>"
               data-social-enabled="<?= $providerEnabled ? '1' : '0' ?>">
              <span class="social-icon"><?= $socialIcon ?></span>
              <span>
                <?= htmlspecialchars($providerLabel, ENT_QUOTES) ?>-ով մուտք
                <small class="social-note"><?= htmlspecialchars($socialNote, ENT_QUOTES) ?></small>
              </span>
            </a>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <div class="footer-link">
          Չունե՞ս հաշիվ։ <a href="/registeruser.php?next=<?= htmlspecialchars($next, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">Ստեղծել հիմա</a>
        </div>
      </div>
    </div>
  </div>

<script>
document.addEventListener('DOMContentLoaded', function(){
  var rememberInput = document.querySelector('input[name="remember_me"]');
  document.querySelectorAll('.social-btn').forEach(function(link){
    link.addEventListener('click', function(event){
      if (link.dataset.socialEnabled !== '1') {
        event.preventDefault(); return;
      }
      try {
        var url = new URL(link.href, window.location.origin);
        if (rememberInput && rememberInput.checked) {
          url.searchParams.set('remember', '1');
        } else {
          url.searchParams.delete('remember');
        }
        link.href = url.toString();
      } catch (e) {}
    });
  });

  /*
   * Bug 3 fix: iOS PWA keyboard avoidance.
   *
   * On iOS Safari (PWA mode), the soft keyboard does NOT resize window.innerHeight —
   * it only resizes the visualViewport. We listen to that resize and set a CSS custom
   * property (--vv-height) on the body so the form-section can shrink accordingly,
   * which causes the form content to scroll above the keyboard.
   *
   * We also scroll the focused input into view with a slight delay so it clears
   * the keyboard toolbar.
   */
  function applyViewportHeight() {
    var vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.body.style.setProperty('--vv-height', vvh + 'px');
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyViewportHeight);
    window.visualViewport.addEventListener('scroll', applyViewportHeight);
    applyViewportHeight();
  }

  /* Scroll focused input into view above keyboard toolbar */
  document.querySelectorAll('input').forEach(function(input) {
    input.addEventListener('focus', function() {
      setTimeout(function() {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    });
  });
});
</script>
</body>
</html>
