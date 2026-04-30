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

if (!function_exists('wp_runtime_password_min_length')) {
    function wp_runtime_password_min_length(): int {
        $local = wp_runtime_compat_local_config();
        $fallback = (int)($local['password_min_length'] ?? 8);
        return max(6, min($fallback, 128));
    }
}

if (is_file(__DIR__ . '/install_service.php')) {
    require_once __DIR__ . '/install_service.php';
}
if (is_file(__DIR__ . '/social_auth_bootstrap.php')) {
    require_once __DIR__ . '/social_auth_bootstrap.php';
}

require_once __DIR__ . '/auth_bootstrap.php';
error_reporting(E_ALL);
ini_set('display_errors', 1);

$conn = wp_runtime_open_pdo();

function colExists(PDO $conn, string $table, string $col): bool {
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

function safeNext($next): string {
    $next = $next ?: "/main.html";
    if(!preg_match('~^/[a-zA-Z0-9_./-]*$~', $next)) return "/main.html";
    return $next;
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

$NEXT = safeNext($_GET['next'] ?? ($_POST['next'] ?? '/main.html'));
$source = strtolower((string)($_GET['source'] ?? $_POST['source'] ?? ''));
$isProgramAuth = in_array($source, ['pwa', 'admin-app'], true);
$authBodyClass = $isProgramAuth ? 'auth-app' : 'auth-web';
$sourceQuery = $source !== '' ? '&source=' . rawurlencode($source) : '';
$authBadgeLabel = $isProgramAuth ? 'Նոր ծրագրային հաշիվ' : 'Նոր կայքային հաշիվ';
$authTitle = $isProgramAuth ? 'Ստեղծիր ծրագրային հաշիվ' : 'Ստեղծիր կայքի հաշիվ';
$authLead = $isProgramAuth
    ? 'Գրանցվելուց հետո ծրագիրը կբացի հենց քո պահպանված երգերը, սեթլիստները, push ծանուցումները և անձնական կարգավորումները։'
    : 'Կայքում գրանցվելուց հետո կբացվեն քո անձնական պահպանված երգերը, սեթլիստներն ու հաշվի կարգավորումները, իսկ ծրագիրը կհասկանա նույն հաշվով մուտքը։';
$authMiniBadge = $isProgramAuth ? 'Ծրագրային հաշիվ' : 'Կայքի հաշիվ';
$authMetaChip = $isProgramAuth ? 'Հաշիվը կաշխատի թե կայքում, թե ծրագրում' : 'Նույն հաշիվը կաշխատի նաև ծրագրում';
$authHint = $isProgramAuth
    ? 'Ստեղծիր հաշիվ, որպեսզի ծրագրի ներսում ունենաս քո անձնական պահպանված երգերը, սեթլիստներն ու կարգավորումները։'
    : 'Ստեղծիր հաշիվ, որպեսզի կայքում ունենաս քո անձնական պահպանված երգերը, սեթլիստներն ու հաշվի կարգավորումները։';
$socialProviderLabels = function_exists('wp_social_auth_provider_labels') ? wp_social_auth_provider_labels() : ['google' => 'Google'];
$socialProviders = array_keys($socialProviderLabels);
$socialError = trim((string)($_GET['social_error'] ?? ''));

// Եթե արդեն login է՝ գնա next
if(!empty($_SESSION['user_id'])){
    wp_auth_sync_install_identity([
        'id' => (int)($_SESSION['user_id'] ?? 0),
        'name' => (string)($_SESSION['name'] ?? ''),
        'username' => (string)($_SESSION['username'] ?? ''),
        'email' => (string)($_SESSION['email'] ?? ''),
    ], $source);
    header("Location: ".$NEXT);
    exit;
}

$hasUsername = colExists($conn, 'users', 'username');
$hasEmail    = colExists($conn, 'users', 'email');
$hasName     = colExists($conn, 'users', 'name');
$error = '';
if ($error === '' && $socialError !== '') {
    $error = $socialError;
}
$minPasswordLength = wp_runtime_password_min_length();

if($_SERVER['REQUEST_METHOD']==='POST'){
    $name = trim($_POST['name'] ?? '');
    $login = trim($_POST['login'] ?? ''); // username կամ email (կախված schema-ից)
    $password = (string)($_POST['password'] ?? '');
    $remember = !empty($_POST['remember_me']);

    if($login === '' || $password === '' || strlen($password) < $minPasswordLength){
        $error = "Լրացրեք բոլոր դաշտերը (գաղտնաբառը՝ առնվազն {$minPasswordLength} նիշ)։";
    } else {

        // --- Ստուգում՝ արդեն կա՞ օգտատեր ---
        // Եթե կա username սյունակ՝ uniqueness-ը ստուգենք username-ով,
        // այլապես եթե կա email՝ email-ով
        if($hasUsername){
            $stmt = $conn->prepare("SELECT id FROM users WHERE username=? LIMIT 1");
            $stmt->execute([$login]);
        } elseif($hasEmail){
            $stmt = $conn->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
            $stmt->execute([$login]);
        } else {
            // Եթե neither username nor email չկա՝ schema-ը չհամընկավ
            $error = "Users աղյուսակում չկա username/email դաշտ։";
            goto render;
        }

        if($stmt->fetch(PDO::FETCH_ASSOC)){
            $error = $hasUsername ? "Այս username-ով հաշիվ արդեն կա։" : "Այս email-ով հաշիվ արդեն կա։";
        } else {

            $hash = password_hash($password, PASSWORD_DEFAULT);

            // --- Insert կառուցենք ըստ սյունակների ---
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
                // եթե user-ը գրել է email՝ լավ, եթե գրել է nickname՝ սա կլինի նույնը (չէր լինի լավագույնը, բայց schema-ից է կախված)
                $params[] = $login;
            }
            if($hasName){
                $cols[] = "name";
                $vals[] = "?";
                $params[] = ($name !== '' ? $name : $login);
            }

            // password_hash պարտադիր է (քեզ մոտ loginuser.php-ն հենց սրանով է աշխատում)
            $cols[] = "password_hash";
            $vals[] = "?";
            $params[] = $hash;

            $sql = "INSERT INTO users (".implode(",", $cols).") VALUES (".implode(",", $vals).")";
            $ins = $conn->prepare($sql);
            $ins->execute($params);

            $uid = (int)$conn->lastInsertId();

            // --- Session ---
            session_regenerate_id(true);
            $_SESSION['user_id'] = $uid;
            $_SESSION['email'] = ($hasEmail && filter_var($login, FILTER_VALIDATE_EMAIL)) ? $login : '';
            $_SESSION['name'] = $name !== '' ? $name : $login;

            // navbar-ում ցուցադրելու համար
            $_SESSION['username'] = $hasUsername ? $login : ($_SESSION['name'] ?: $login);
            $_SESSION['auth_via_remember'] = $remember ? 1 : 0;

            $selector = null;
            $tokenHash = null;
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $ip = function_exists('wp_runtime_remote_ip')
                ? wp_runtime_remote_ip()
                : (string)($_SERVER['REMOTE_ADDR'] ?? '');
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

            $deviceName = wp_auth_compose_device_name(trim($platform . ' • ' . $browser), $source);

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
                $uid,
                $selector,
                $tokenHash,
                $remember ? 1 : 0,
                $deviceName,
                $browser,
                $platform,
                $ip,
                mb_substr($ua, 0, 255),
                session_id(),
                $expiresAt
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

            header("Location: ".$NEXT);
            exit;
        }
    }
}

render:
?>
<!doctype html>
<html lang="hy">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/wolarmyouth.jpg" type="image/jpeg">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Worship Platform">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0b1020">
<style id="wp-prepaint-bg">html,body{background:#0b1020;color-scheme:dark}</style>
<script src="/i18n.js" defer></script>
<script src="/loader.js" defer></script>
<script src="/pwa-init.js" defer></script>
<title>Գրանցում — Worship Platform</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}
  body{
    display:flex;justify-content:center;align-items:center;min-height:100vh;
    background:linear-gradient(135deg,#3367ff,#6ea8ff);
    color:#fff;
    padding:16px;
  }
  .login-container{
    background:rgba(255,255,255,0.95);
    padding:40px;
    border-radius:16px;
    width:100%;
    max-width:400px;
    box-shadow:0 10px 25px rgba(0,0,0,0.2);
    color:#0f1222;
  }
  .login-container h2{text-align:center;margin-bottom:14px;font-size:24px;}
  .login-container input{
    width:100%;
    padding:12px 16px;
    margin-bottom:12px;
    border-radius:10px;
    border:1px solid #ccc;
    font-size:16px;
  }
  .login-container input:focus{
    outline:none;border-color:#3367ff;
    box-shadow:0 0 0 3px rgba(51,103,255,0.2);
  }
  .login-container button{
    width:100%;
    padding:12px 16px;
    background:linear-gradient(135deg,#3367ff,#2247d6);
    color:#fff;
    font-weight:700;
    border:none;
    border-radius:12px;
    cursor:pointer;
    font-size:16px;
    transition:all .2s ease;
  }
  .login-container button:hover{
    transform:translateY(-2px);
    box-shadow:0 6px 18px rgba(51,103,255,0.3);
  }
  .error-msg{color:#ff3b30;margin-bottom:12px;text-align:center;font-weight:600;}
  @media(max-width:420px){.login-container{padding:30px;}}

  .back-home{
    display:inline-block;margin-bottom:16px;text-decoration:none;font-weight:600;
    color:#3367ff;background:rgba(51,103,255,0.1);
    padding:8px 14px;border-radius:10px;transition:all .2s ease;
  }
  .back-home:hover{background:rgba(51,103,255,0.18);transform:translateY(-1px);}

  .hint{
    text-align:center;
    font-size:13px;
    line-height:1.45;
    color:#555;
  }

  .social-auth{
    margin:18px 0 10px;
    display:grid;
    gap:10px;
  }
  .social-auth-sep{
    display:flex;
    align-items:center;
    gap:10px;
    color:#65708e;
    font-size:13px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.08em;
  }
  .social-auth-sep::before,
  .social-auth-sep::after{
    content:"";
    flex:1;
    height:1px;
    background:rgba(84,98,134,.24);
  }
  .social-auth-grid{
    display:grid;
    gap:10px;
  }
  .social-auth-link{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    width:100%;
    padding:12px 14px;
    border-radius:14px;
    border:1px solid rgba(84,98,134,.22);
    background:#f6f8ff;
    color:#17213a;
    text-decoration:none;
    font-weight:700;
    transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
  }
  .social-auth-link:hover{
    transform:translateY(-1px);
    border-color:rgba(51,103,255,.28);
    background:#ffffff;
    box-shadow:0 12px 28px rgba(28,41,78,.10);
  }
  .social-auth-icon{
    width:20px;
    height:20px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    font-size:18px;
    line-height:1;
  }
  .social-auth-link.is-disabled{
    opacity:.72;
    background:rgba(226,231,245,.7);
    color:#5b657f;
    border-style:dashed;
    box-shadow:none;
    transform:none;
    cursor:not-allowed;
  }
  .social-auth-link-note{
    display:block;
    margin-top:2px;
    font-size:11px;
    font-weight:600;
    color:#6e7893;
  }

  .row{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-top:8px;
    flex-wrap:wrap;
    color:#555;
    font-size:14px;
  }

  /* ✅ Custom checkbox (same as login) */
  .chk{
    display:flex;
    align-items:center;
    gap:10px;
    cursor:pointer;
    user-select:none;
    padding:8px 10px;
    border-radius:12px;
    background: rgba(51,103,255,0.06);
    border: 1px solid rgba(51,103,255,0.18);
    transition: transform .12s ease, background .2s ease, border-color .2s ease;
  }
  .chk:hover{
    background: rgba(51,103,255,0.10);
    border-color: rgba(51,103,255,0.28);
    transform: translateY(-1px);
  }
  .chk input{
    position:absolute;
    opacity:0;
    pointer-events:none;
  }
  .chk-box{
    width:18px;height:18px;border-radius:6px;
    border:2px solid rgba(34,71,214,0.35);
    background:#fff;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    flex:0 0 auto;
    transition: background .18s ease, border-color .18s ease, box-shadow .18s ease, transform .12s ease;
  }
  .chk-text{
    font-weight:700;
    color:#1f2a44;
    font-size:14px;
  }
  .chk input:checked + .chk-box{
    background: linear-gradient(135deg,#3367ff,#2247d6);
    border-color: transparent;
    box-shadow: 0 8px 18px rgba(51,103,255,0.25);
    transform: scale(1.02);
  }
  .chk input:checked + .chk-box::after{
    content:"";
    width:9px;height:5px;
    border-left:2px solid #fff;
    border-bottom:2px solid #fff;
    transform: rotate(-45deg);
    margin-top:-1px;
  }
  .chk input:focus-visible + .chk-box{
    box-shadow: 0 0 0 4px rgba(51,103,255,0.18);
  }

  /* ✅ Link chips */
  .link-chip{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:8px 12px;
    border-radius:12px;
    font-weight:800;
    font-size:14px;
    text-decoration:none;
    color:#2247d6;
    background: rgba(34,71,214,0.08);
    border: 1px solid rgba(34,71,214,0.18);
    transition: transform .12s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
  }
  .link-chip:hover{
    background: rgba(34,71,214,0.12);
    border-color: rgba(34,71,214,0.28);
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(34,71,214,0.10);
  }
  .link-chip:active{transform: translateY(0);}
  .link-chip:focus-visible{outline:none;box-shadow: 0 0 0 4px rgba(51,103,255,0.18);}

  .links{margin-top:14px;text-align:center;}
  .link-chip.ghost{
    background: rgba(15,18,34,0.04);
    border: 1px solid rgba(15,18,34,0.12);
    color:#2b3a55;
    font-weight:700;
  }
  .link-chip.ghost:hover{
    background: rgba(15,18,34,0.07);
    border-color: rgba(15,18,34,0.18);
    box-shadow: 0 10px 22px rgba(15,18,34,0.08);
  }
  /* ✅ Mobile optimization */
@media (max-width: 420px){
  body{
    padding:12px;
  }

  .login-container{
    max-width: 100%;
    padding: 26px 18px;      /* ավելի հարմար touch */
    border-radius: 14px;
  }

  .login-container h2{
    font-size: 20px;
    margin-bottom: 10px;
  }

  .hint{
    font-size: 12.5px;
    line-height: 1.45;
  }

  .login-container input{
    font-size: 16px;         /* iOS zoom-ը չանի */
    padding: 12px 14px;
    margin-bottom: 10px;
  }

  .row{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    margin-top:8px;
    flex-wrap: nowrap;
    color:#555;
    font-size:14px;
  }

  .login-container button{
    border-radius: 14px;
  }

  .links{
    margin-top: 12px;
  }
}

/* ✅ Better viewport on mobile browsers (iOS/Android) */
@supports (height: 100svh){
  body{ min-height: 100svh; }
}
@supports (height: 100dvh){
  body{ min-height: 100dvh; }
}

body.auth-app{
  display:block;
  min-height:100vh;
  padding:18px;
  background:
    radial-gradient(circle at 14% 12%, rgba(111,129,255,.22), transparent 24%),
    radial-gradient(circle at 82% 18%, rgba(58,200,185,.12), transparent 18%),
    linear-gradient(180deg,#070b14 0%,#0b1020 54%,#0a1222 100%);
  color:#eef3ff;
}

body.auth-web{
  min-height:100vh;
  padding:22px;
  background:
    radial-gradient(circle at 18% 10%, rgba(111,129,255,.2), transparent 24%),
    radial-gradient(circle at 84% 16%, rgba(58,200,185,.11), transparent 18%),
    linear-gradient(180deg,#0a0f1c 0%,#10182c 56%,#0d1425 100%);
  color:#eef3ff;
}

.auth-shell{
  width:min(100%, 1120px);
  margin:0 auto;
  min-height:calc(100vh - 36px);
  display:grid;
  grid-template-columns:minmax(0,1.08fr) minmax(380px,.92fr);
  gap:22px;
  align-items:stretch;
}

.auth-aside,
.login-container{
  position:relative;
  overflow:hidden;
  border-radius:32px;
}

.auth-aside{
  padding:34px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  gap:30px;
}

.auth-aside::before{
  content:"";
  position:absolute;
  inset:auto -8% -24% auto;
  width:220px;
  height:220px;
  border-radius:999px;
  background:radial-gradient(circle, rgba(122,149,255,.2), transparent 70%);
  pointer-events:none;
}

body.auth-app .auth-aside{
  border:1px solid rgba(255,255,255,.08);
  background:
    linear-gradient(180deg,rgba(14,20,36,.95),rgba(9,14,28,.9)),
    linear-gradient(135deg,rgba(122,149,255,.08),transparent 40%);
  box-shadow:0 28px 70px rgba(0,0,0,.34);
  backdrop-filter:blur(22px) saturate(150%);
  -webkit-backdrop-filter:blur(22px) saturate(150%);
}

body.auth-web .auth-aside{
  border:1px solid rgba(255,255,255,.08);
  background:
    linear-gradient(180deg,rgba(15,22,40,.88),rgba(12,18,34,.82)),
    linear-gradient(135deg,rgba(122,149,255,.08),transparent 48%);
  box-shadow:0 28px 70px rgba(0,0,0,.26);
}

.auth-badge{
  display:inline-flex;
  align-items:center;
  gap:8px;
  width:max-content;
  padding:8px 13px;
  border-radius:999px;
  font-size:11px;
  font-weight:800;
  letter-spacing:.14em;
  text-transform:uppercase;
}

body.auth-app .auth-badge{
  background:rgba(122,149,255,.14);
  border:1px solid rgba(122,149,255,.22);
  color:#dfe6ff;
}

body.auth-web .auth-badge{
  background:rgba(122,149,255,.14);
  border:1px solid rgba(122,149,255,.22);
  color:#dfe6ff;
}

.auth-aside h1{
  margin:14px 0 0;
  font-size:clamp(34px,4.6vw,58px);
  line-height:.94;
  letter-spacing:-.06em;
}

body.auth-app .auth-aside h1{
  color:#f7f9ff;
}

body.auth-web .auth-aside h1{
  color:#f7f9ff;
  max-width:12ch;
}

.auth-aside p{
  margin:0;
  font-size:15px;
  line-height:1.7;
  max-width:560px;
}

body.auth-app .auth-aside p{
  color:#aab6cf;
}

body.auth-web .auth-aside p{
  color:#afbad0;
}

.auth-points{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}

.auth-point{
  padding:18px 18px 16px;
  border-radius:22px;
}

body.auth-app .auth-point{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.07);
}

body.auth-web .auth-point{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.07);
}

.auth-point strong{
  display:block;
  margin-bottom:8px;
  font-size:14px;
}

body.auth-app .auth-point strong{
  color:#eef3ff;
}

body.auth-web .auth-point strong{
  color:#eef3ff;
}

.auth-point span{
  display:block;
  font-size:13px;
  line-height:1.55;
}

body.auth-app .auth-point span{
  color:#9aa7bf;
}

body.auth-web .auth-point span{
  color:#9aa7bf;
}

body.auth-app .login-container{
  width:100%;
  max-width:none;
  align-self:center;
  padding:30px 28px;
  color:#eef3ff;
  border:1px solid rgba(255,255,255,.08);
  background:
    linear-gradient(180deg,rgba(12,18,34,.94),rgba(9,14,28,.86)),
    linear-gradient(135deg,rgba(122,149,255,.08),transparent 42%);
  box-shadow:0 28px 70px rgba(0,0,0,.32);
  backdrop-filter:blur(22px) saturate(150%);
  -webkit-backdrop-filter:blur(22px) saturate(150%);
}

body.auth-web .login-container{
  width:100%;
  max-width:none;
  align-self:center;
  padding:34px 30px;
  border:1px solid rgba(255,255,255,.1);
  background:rgba(245,247,255,.96);
  box-shadow:0 28px 60px rgba(0,0,0,.18);
  color:#101728;
}

body.auth-web .auth-windowbar span{
  box-shadow:none;
}

body.auth-web .login-container h2{
  text-align:left;
  margin-bottom:10px;
  font-size:32px;
  letter-spacing:-.04em;
  color:#14213d;
}

body.auth-web .hint{
  color:#5f6d89;
}

body.auth-web .back-home{
  color:#2947c7;
  background:rgba(41,71,199,.08);
  border:1px solid rgba(41,71,199,.12);
}

body.auth-web .back-home:hover{
  background:rgba(41,71,199,.13);
}

body.auth-web .auth-mini-badge{
  background:rgba(41,71,199,.08);
  border-color:rgba(41,71,199,.14);
  color:#3658c9;
}

body.auth-web .auth-meta-chip{
  background:rgba(20,33,61,.05);
  border-color:rgba(20,33,61,.08);
  color:#5f6d89;
}

body.auth-web .login-container input{
  background:#ffffff;
  border:1px solid rgba(20,33,61,.12);
  color:#14213d;
}

body.auth-web .login-container input::placeholder{
  color:#8a96ad;
}

body.auth-web .login-container input:focus{
  border-color:rgba(91,115,255,.48);
  box-shadow:0 0 0 4px rgba(91,115,255,.12);
}

body.auth-web .login-container button{
  background:linear-gradient(135deg,#6e85ff,#516cff);
  box-shadow:0 18px 34px rgba(91,115,255,.24);
}

body.auth-web .login-container button:hover{
  box-shadow:0 22px 38px rgba(91,115,255,.28);
}

body.auth-web .row{
  color:#5f6d89;
}

body.auth-web .chk{
  background:rgba(41,71,199,.05);
  border-color:rgba(41,71,199,.1);
}

body.auth-web .chk:hover{
  background:rgba(41,71,199,.08);
  border-color:rgba(41,71,199,.14);
}

body.auth-web .chk-text{
  color:#20325d;
}

body.auth-web .link-chip{
  color:#2947c7;
  background:rgba(41,71,199,.07);
  border-color:rgba(41,71,199,.12);
}

body.auth-web .link-chip:hover{
  background:rgba(41,71,199,.11);
  border-color:rgba(41,71,199,.16);
  box-shadow:0 10px 22px rgba(41,71,199,.1);
}

body.auth-web .link-chip.ghost{
  background:rgba(20,33,61,.04);
  border-color:rgba(20,33,61,.09);
  color:#344a74;
}

body.auth-web .link-chip.ghost:hover{
  background:rgba(20,33,61,.07);
  border-color:rgba(20,33,61,.14);
}

.auth-windowbar{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:18px;
}

.auth-windowbar span{
  width:10px;
  height:10px;
  border-radius:999px;
  background:rgba(255,255,255,.18);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.22);
}

.auth-windowbar span:nth-child(1){background:#ff6b7a;}
.auth-windowbar span:nth-child(2){background:#ffbe5c;}
.auth-windowbar span:nth-child(3){background:#36d399;}

.auth-form-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  margin-bottom:8px;
}

.auth-mini-badge{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(122,149,255,.12);
  border:1px solid rgba(122,149,255,.2);
  color:#dfe6ff;
  font-size:11px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
}

.auth-meta-chip{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.08);
  color:#9aa7bf;
  font-size:12px;
  font-weight:700;
  white-space:nowrap;
}

body.auth-app .login-container h2{
  text-align:left;
  margin-bottom:10px;
  font-size:30px;
  letter-spacing:-.03em;
  color:#f7f9ff;
}

body.auth-app .hint{
  margin:0 0 18px;
  text-align:left;
  color:#9aa7bf;
  font-size:14px;
  line-height:1.55;
}

body.auth-app .back-home{
  margin-bottom:18px;
  color:#e6ecff;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.08);
}

body.auth-app .back-home:hover{
  background:rgba(255,255,255,.10);
}

body.auth-app .login-container input{
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.09);
  color:#eef3ff;
  margin-bottom:12px;
}

body.auth-app .login-container input::placeholder{
  color:#8ea0bf;
}

body.auth-app .login-container input:focus{
  border-color:rgba(122,149,255,.6);
  box-shadow:0 0 0 4px rgba(122,149,255,.16);
}

body.auth-app .login-container button{
  background:linear-gradient(135deg,#7a95ff,#5b73ff);
  box-shadow:0 18px 34px rgba(91,115,255,.24);
}

body.auth-app .login-container button:hover{
  box-shadow:0 22px 38px rgba(91,115,255,.28);
}

body.auth-app .error-msg{
  margin-bottom:14px;
  padding:12px 14px;
  border-radius:14px;
  background:rgba(255,107,122,.12);
  border:1px solid rgba(255,107,122,.22);
  color:#ffd7dd;
  text-align:left;
}

body.auth-app .row{
  color:#9aa7bf;
}

body.auth-app .chk{
  background:rgba(255,255,255,.04);
  border-color:rgba(255,255,255,.08);
}

body.auth-app .chk:hover{
  background:rgba(255,255,255,.08);
  border-color:rgba(255,255,255,.14);
}

body.auth-app .chk-box{
  background:rgba(255,255,255,.06);
  border-color:rgba(122,149,255,.4);
}

body.auth-app .chk-text{
  color:#eef3ff;
}

body.auth-app .link-chip{
  color:#dfe6ff;
  background:rgba(122,149,255,.12);
  border-color:rgba(122,149,255,.2);
}

body.auth-app .link-chip:hover{
  background:rgba(122,149,255,.18);
  border-color:rgba(122,149,255,.28);
  box-shadow:0 12px 24px rgba(91,115,255,.14);
}

body.auth-app .link-chip.ghost{
  background:rgba(255,255,255,.05);
  border-color:rgba(255,255,255,.08);
  color:#eef3ff;
}

body.auth-app .link-chip.ghost:hover{
  background:rgba(255,255,255,.08);
  border-color:rgba(255,255,255,.14);
}

@media (max-width: 840px){
  body.auth-app,
  body.auth-web{padding:12px}
  .auth-shell{
    min-height:auto;
    grid-template-columns:1fr;
  }
  .auth-aside{
    order:2;
    padding:22px 18px;
    gap:18px;
  }
  body.auth-app .login-container,
  body.auth-web .login-container{
    order:1;
    padding:22px 18px;
  }
  body.auth-app .login-container h2,
  body.auth-web .login-container h2{
    font-size:24px;
  }
  .auth-form-top{
    flex-direction:column;
    align-items:flex-start;
  }
  .auth-points{
    grid-template-columns:1fr;
  }
  body.auth-web .auth-aside h1{
    max-width:none;
  }
}

@media (max-width: 840px){
  body.auth-web{
    align-items:flex-start;
    padding:10px;
  }
  body.auth-web .auth-shell{
    width:min(100%,560px);
    gap:14px;
  }
  body.auth-web .login-container,
  body.auth-web .auth-aside{
    border-radius:24px;
  }
  body.auth-web .login-container{
    padding:22px 18px 18px;
    box-shadow:0 18px 38px rgba(0,0,0,.16);
  }
  body.auth-web .auth-aside{
    padding:20px 18px;
    gap:16px;
  }
  body.auth-web .auth-windowbar{
    margin-bottom:12px;
  }
  body.auth-web .auth-form-top{
    gap:10px;
    margin-bottom:6px;
  }
  body.auth-web .auth-mini-badge,
  body.auth-web .auth-meta-chip{
    white-space:normal;
  }
  body.auth-web .auth-meta-chip{
    justify-content:flex-start;
  }
  body.auth-web .login-container h2{
    font-size:22px;
    line-height:1.04;
  }
  body.auth-web .hint,
  body.auth-web .auth-aside p{
    font-size:13px;
    line-height:1.58;
  }
  body.auth-web .auth-aside h1{
    font-size:clamp(30px,8vw,42px);
    line-height:.98;
  }
  body.auth-web .row{
    flex-direction:column;
    align-items:stretch;
    gap:10px;
  }
  body.auth-web .chk,
  body.auth-web .link-chip{
    width:100%;
    justify-content:center;
    text-align:center;
  }
  body.auth-web .back-home{
    display:flex;
    width:100%;
    justify-content:center;
    text-align:center;
    margin-bottom:14px;
  }
  body.auth-web .auth-points{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
}

@media (max-width: 560px){
  body.auth-web{
    padding:8px;
  }
  body.auth-web .auth-shell{
    width:100%;
    gap:12px;
  }
  body.auth-web .login-container,
  body.auth-web .auth-aside{
    border-radius:22px;
    padding:18px 14px;
  }
  body.auth-web .login-container input,
  body.auth-web .login-container button{
    min-height:48px;
  }
  body.auth-web .auth-form-top{
    align-items:stretch;
  }
  body.auth-web .auth-mini-badge,
  body.auth-web .auth-meta-chip{
    width:100%;
  }
  body.auth-web .auth-points{
    grid-template-columns:1fr;
  }
}
</style>
</head>
<body class="<?= htmlspecialchars($authBodyClass, ENT_QUOTES) ?>">
  <div class="auth-shell">
    <section class="auth-aside">
      <div>
        <span class="auth-badge"><?= htmlspecialchars($authBadgeLabel, ENT_QUOTES) ?></span>
        <h1><?= htmlspecialchars($authTitle, ENT_QUOTES) ?></h1>
      </div>
      <p><?= htmlspecialchars($authLead, ENT_QUOTES) ?></p>
      <div class="auth-points">
        <div class="auth-point"><strong>Անձնական գրադարան</strong><span>Պահպանած երգերը կապվում են հենց քո հաշվին։</span></div>
        <div class="auth-point"><strong>Սեթլիստներ</strong><span>Ծառայության երգացանկը հասանելի է նույն մուտքից։</span></div>
        <div class="auth-point"><strong>Push</strong><span>Թարմացումները և հայտարարությունները գալիս են ծրագրի մեջ։</span></div>
        <div class="auth-point"><strong>Շարունակականություն</strong><span>Կայքն ու ծրագիրը նույն հաշվով աշխատում են միասին։</span></div>
      </div>
    </section>

    <div class="login-container">
    <div class="auth-windowbar"><span></span><span></span><span></span></div>
    <div class="auth-form-top">
      <span class="auth-mini-badge"><?= htmlspecialchars($authMiniBadge, ENT_QUOTES) ?></span>
      <span class="auth-meta-chip"><?= htmlspecialchars($authMetaChip, ENT_QUOTES) ?></span>
    </div>
    <?php if(!$isProgramAuth): ?>
    <a href="<?= htmlspecialchars($source !== '' ? '/?source=' . rawurlencode($source) : '/', ENT_QUOTES) ?>" class="back-home">← Հետ գլխավոր էջ</a>
    <?php endif; ?>

    <h2>Գրանցում</h2>
    <p class="hint"><?= htmlspecialchars($authHint, ENT_QUOTES) ?></p>

    <?php if(!empty($error)) echo "<div class='error-msg'>".htmlspecialchars($error)."</div>"; ?>

    <form method="POST" action="/registeruser.php">
      <input type="hidden" name="next" value="<?= htmlspecialchars($NEXT, ENT_QUOTES) ?>">
      <input type="hidden" name="source" value="<?= htmlspecialchars($source, ENT_QUOTES) ?>">

      <input name="name" placeholder="Անուն" maxlength="120">

      <input name="login" placeholder="<?= $hasUsername ? "Մուտքանուն կամ Էլ. փոստ" : "Էլ. փոստ" ?>" required>

      <input name="password" type="password" placeholder="Գաղտնաբառ (>= <?= (int)$minPasswordLength ?> նիշ)" required>

      <div class="row">
        <label class="chk">
          <input type="checkbox" name="remember_me" />
          <span class="chk-box" aria-hidden="true"></span>
          <span class="chk-text">Հիշել ինձ</span>
        </label>

        <a class="link-chip" href="/loginuser.php?next=<?= htmlspecialchars($NEXT, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">
          Արդեն ունե՞ս հաշիվ
        </a>
      </div>

      <br>
      <button type="submit">Գրանցվել</button>
    </form>

    <?php if(!empty($socialProviders)): ?>
    <div class="social-auth">
      <div class="social-auth-sep">կամ ստեղծիր հաշիվ</div>
      <div class="social-auth-grid">
        <?php foreach($socialProviders as $provider): ?>
          <?php
            $providerLabel = function_exists('wp_social_auth_provider_label') ? wp_social_auth_provider_label($provider) : ucfirst($provider);
            $providerEnabled = function_exists('wp_social_auth_provider_enabled') ? wp_social_auth_provider_enabled($provider) : false;
            $socialUrl = function_exists('wp_social_auth_start_url')
                ? wp_social_auth_start_url($provider, $NEXT, $source, 'register', false)
                : '#';
            $socialIcon = 'G';
            $socialNote = $providerEnabled ? 'Պատրաստ է գրանցման համար' : 'Միացրու ադմինից, որպեսզի աշխատի';
          ?>
          <a
            class="social-auth-link <?= htmlspecialchars($provider, ENT_QUOTES) ?> <?= $providerEnabled ? '' : 'is-disabled' ?>"
            href="<?= htmlspecialchars($providerEnabled ? $socialUrl : '#', ENT_QUOTES) ?>"
            data-social-provider="<?= htmlspecialchars($provider, ENT_QUOTES) ?>"
            data-social-enabled="<?= $providerEnabled ? '1' : '0' ?>"
          >
            <span class="social-auth-icon" aria-hidden="true"><?= htmlspecialchars($socialIcon, ENT_QUOTES) ?></span>
            <span>
              <?= htmlspecialchars($providerLabel, ENT_QUOTES) ?>-ով շարունակել
              <small class="social-auth-link-note"><?= htmlspecialchars($socialNote, ENT_QUOTES) ?></small>
            </span>
          </a>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>

    <div class="links">
      <a class="link-chip ghost" href="/forgot_password.php?next=<?= htmlspecialchars($NEXT, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">
        Գաղտնաբառ մոռացե՞լ ես
      </a>
    </div>
  </div>
  </div>
<script>
document.addEventListener('DOMContentLoaded', function(){
  var rememberInput = document.querySelector('input[name="remember_me"]');
  document.querySelectorAll('.social-auth-link').forEach(function(link){
    link.addEventListener('click', function(event){
      if (link.dataset.socialEnabled !== '1') {
        event.preventDefault();
        return;
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
});
</script>
</body>
</html>
