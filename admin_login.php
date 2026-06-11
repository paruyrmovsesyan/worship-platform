<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
if (is_file(__DIR__ . '/social_auth_bootstrap.php')) {
    require_once __DIR__ . '/social_auth_bootstrap.php';
}

$config = wp_version_load();
$next = wp_admin_safe_next($_GET['next'] ?? $_POST['next'] ?? '/songs.php', '/songs.php');
$error = '';
$notice = '';
$socialError = trim((string)($_GET['social_error'] ?? ''));
$socialProviders = function_exists('wp_social_auth_provider_labels') ? array_keys(wp_social_auth_provider_labels()) : [];

if (!empty($_SESSION['admin_flash_notice'])) {
    $notice = trim((string)$_SESSION['admin_flash_notice']);
    unset($_SESSION['admin_flash_notice']);
}

if (!empty($_GET['logged_out'])) {
    $_SESSION['admin_flash_notice'] = 'Դուք դուրս եկաք admin համակարգից։';
    $redirectQuery = ['next' => $next];
    if ($socialError !== '') {
        $redirectQuery['social_error'] = $socialError;
    }
    if (!empty($_GET['denied'])) {
        $redirectQuery['denied'] = '1';
    }
    header('Location: /admin_login.php?' . http_build_query($redirectQuery));
    exit;
}

if (!empty($_GET['logged_out'])) {
    unset($_SESSION['admin_access_granted'], $_SESSION['admin_authenticated_at'], $_SESSION['admin_authenticated_user_id']);
    wp_admin_clear_access_cookie();
}

if (!empty($_GET['denied'])) {
    $error = 'Այս account-ը admin բաժնի մուտքի իրավունք չունի։ Մուտքը թույլատրվում է միայն admin role/is_admin կամ admin whitelist email ունեցող user-ներին։';
}

if ($socialError !== '' && $error === '') {
    $error = $socialError;
}

if (empty($_SESSION['user_id']) && !wp_admin_has_logout_lock(null)) {
    $restoredUser = wp_admin_restore_user_from_access_cookie();
    if ($restoredUser && wp_admin_is_authorized($restoredUser, $config)) {
        wp_admin_sign_user_in($restoredUser);
    }
}

if (!wp_admin_has_logout_lock(wp_admin_get_current_user()) && !empty($_SESSION['user_id']) && !empty($_SESSION['admin_access_granted'])) {
    $currentUser = wp_admin_get_current_user();
    if ($currentUser && wp_admin_is_authorized($currentUser, $config)) {
        header('Location: ' . $next);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = trim((string)($_POST['login'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    if ($login === '' || $password === '') {
        $error = 'Լրացրեք login-ը և գաղտնաբառը։';
    } else {
        $pdo = wp_admin_get_pdo();

        if (!$pdo) {
            $error = 'Չհաջողվեց միանալ բազային։';
        } else {
            $user = wp_admin_find_user_by_login($pdo, $login);

            if (!$user || empty($user['password_hash']) || !password_verify($password, (string)$user['password_hash'])) {
                $error = 'Սխալ մուտքանուն/email կամ գաղտնաբառ։';
            } else {
                $authorized = wp_admin_is_authorized($user, $config);

                if (!$authorized && wp_admin_can_bootstrap($user, $config)) {
                    if (wp_admin_bootstrap_access($user)) {
                        $config = wp_version_load();
                        $authorized = wp_admin_is_authorized($user, $config);
                        $notice = 'Սա առաջին admin մուտքն էր, և ձեր email-ը ավտոմատ ավելացվեց admin whitelist-ում։';
                    }
                }

                if (!$authorized) {
                    $error = 'Այս օգտահաշիվը admin մուտքի իրավունք չունի։ Պետք է լինի `role/is_admin`-ով admin կամ email-ով admin whitelist-ում։';
                } else {
                    wp_admin_sign_user_in($user);
                    header('Location: ' . $next);
                    exit;
                }
            }
        }
    }
}

$hasAdminWhitelist = !empty($config['admin_emails']);
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Login</title>
  <style>
    :root{
      --bg: #0f1423;
      --panel: rgba(16, 23, 41, 0.7);
      --line: rgba(255,255,255,0.08);
      --text: #e2e8f0;
      --muted: #94a3b8;
      --primary: #2fd1c5;
      --primary-2: #00f2fe;
      --accent: #a78bfa;
      --danger: #fb7185;
      --success: #34d399;
      --radius: 20px;
      --shadow: 0 10px 40px rgba(0,0,0,0.3);
      --primary-glow: rgba(47, 209, 197, 0.4);
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:20px;
      font-family:Inter,system-ui,sans-serif;
      color:var(--text);
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 15% 50%, rgba(47, 209, 197, 0.08), transparent 25%),
        radial-gradient(circle at 85% 30%, rgba(167, 139, 250, 0.08), transparent 25%);
    }
    .shell{
      width:min(100%,1020px);
      display:grid;
      grid-template-columns:minmax(0,1.1fr) minmax(340px,.9fr);
      gap:20px;
      align-items:stretch;
    }
    .hero,.panel{
      background:var(--panel);
      border:1px solid var(--line);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      backdrop-filter:blur(24px);
      -webkit-backdrop-filter:blur(24px);
    }
    .hero{
      padding:28px;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      min-height:580px;
    }
    .hero h1{margin:0;font-size:clamp(30px,4vw,40px);line-height:1.02}
    .hero p{margin:14px 0 0;color:var(--muted);line-height:1.65;font-size:15px;max-width:560px}
    .hero-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
      margin-top:28px;
    }
    .info-card{
      border:1px solid var(--line);
      border-radius:18px;
      padding:16px;
      background:rgba(255,255,255,.04);
    }
    .info-card strong{display:block;font-size:14px;margin-bottom:8px}
    .info-card span{display:block;color:var(--muted);line-height:1.5;font-size:13px}
    .meta{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-top:18px;
    }
    .chip{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:999px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.05);
      font-size:12px;
      font-weight:700;
    }
    .panel{padding:24px}
    .panel h2{margin:0 0 10px;font-size:26px}
    .panel p{margin:0 0 18px;color:var(--muted);line-height:1.55}
    .field{display:flex;flex-direction:column;gap:8px;margin-top:14px}
    label{font-size:13px;font-weight:700}
    input{
      width:100%;
      border-radius:15px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.04);
      color:var(--text);
      padding:13px 14px;
      min-height:50px;
      outline:none;
      font:inherit;
    }
    input:focus{border-color:rgba(122,162,255,.65);box-shadow:0 0 0 3px rgba(79,124,255,.16)}
    .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
    .btn{
      min-height:46px;
      border-radius:14px;
      border:1px solid var(--line);
      padding:12px 16px;
      font:700 14px/1 Inter,system-ui,sans-serif;
      cursor:pointer;
      text-decoration:none;
      display:inline-flex;
      align-items:center;
      justify-content:center;
    }
    .btn-primary{
      background:linear-gradient(135deg,var(--primary),var(--primary-2));
      color:#0f1423;
      border-color:transparent;
      box-shadow:0 4px 15px var(--primary-glow);
      width:100%;
    }
    .btn-ghost{
      background:rgba(255,255,255,.05);
      color:var(--text);
    }
    .message{
      margin-top:14px;
      padding:13px 14px;
      border-radius:14px;
      border:1px solid var(--line);
      font-weight:700;
      line-height:1.5;
    }
    .message.error{background:rgba(255,122,141,.14);color:#ffd3da}
    .message.success{background:rgba(105,213,155,.14);color:#cbf8dc}
    code{
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
      background:rgba(255,255,255,.06);
      border-radius:8px;
      padding:2px 6px;
    }
    .social-auth{
      margin-top:18px;
      padding-top:18px;
      border-top:1px solid var(--line);
    }
    .social-auth-sep{
      text-align:center;
      color:var(--muted);
      font-size:13px;
      font-weight:700;
      margin-bottom:12px;
    }
    .social-auth-grid{
      display:grid;
      grid-template-columns:1fr;
      gap:10px;
    }
    .social-auth-link{
      display:flex;
      align-items:center;
      gap:12px;
      min-height:54px;
      padding:12px 14px;
      border-radius:16px;
      border:1px solid var(--line);
      background:rgba(255,255,255,.04);
      color:var(--text);
      text-decoration:none;
      transition:transform .16s ease, border-color .16s ease, background .16s ease;
    }
    .social-auth-link:hover{
      transform:translateY(-1px);
      border-color:rgba(122,162,255,.38);
      background:rgba(255,255,255,.06);
    }
    .social-auth-link.is-disabled{
      opacity:.6;
      pointer-events:none;
    }
    .social-auth-icon{
      width:34px;
      height:34px;
      border-radius:12px;
      display:grid;
      place-items:center;
      background:rgba(255,255,255,.08);
      font-weight:800;
      flex:0 0 34px;
    }
    .social-auth-link strong{
      display:block;
      font-size:14px;
      margin-bottom:3px;
    }
    .social-auth-link small{
      display:block;
      color:var(--muted);
      font-size:12px;
      line-height:1.45;
    }
    @media(max-width:920px){
      body{
        padding:14px;
        place-items:start center;
      }
      .shell{
        grid-template-columns:1fr;
        gap:14px;
      }
      .panel{
        order:1;
        padding:20px;
      }
      .hero{
        order:2;
        min-height:auto;
        padding:22px;
      }
      .hero-grid{grid-template-columns:1fr}
      .actions{
        display:grid;
        grid-template-columns:1fr 1fr;
      }
      .actions .btn{
        width:100%;
      }
      .meta{
        margin-top:16px;
      }
    }
    @media(max-width:560px){
      body{
        padding:10px;
      }
      .panel,
      .hero{
        border-radius:18px;
      }
      .panel{
        padding:18px 16px;
      }
      .hero{
        padding:18px 16px;
        gap:18px;
      }
      .hero h1{
        font-size:26px;
        line-height:1.05;
      }
      .hero p{
        font-size:14px;
        line-height:1.55;
        margin-top:10px;
      }
      .info-card{
        border-radius:16px;
        padding:14px;
      }
      .panel h2{
        font-size:22px;
      }
      .panel p{
        font-size:14px;
        line-height:1.5;
        margin-bottom:16px;
      }
      .field{
        margin-top:12px;
      }
      input{
        border-radius:14px;
        padding:12px 13px;
        min-height:48px;
        font-size:16px;
      }
      .actions{
        grid-template-columns:1fr;
        gap:8px;
        margin-top:18px;
      }
      .btn{
        width:100%;
      }
      .meta{
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
      }
      .chip{
        width:100%;
        justify-content:center;
        text-align:center;
      }
      .message{
        margin-top:12px;
        padding:12px;
        border-radius:12px;
        font-size:14px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <h1>Admin Control Login</h1>
        <p>Այս մուտքը նախատեսված է միայն admin կառավարման բաժնի համար։ Այն ստուգում է <code>users</code> աղյուսակը և ներս է թողնում միայն այն user-ներին, որոնք ունեն <code>role/is_admin</code> կամ որոնց email-ը կա admin whitelist-ում։</p>
        <div class="hero-grid">
          <div class="info-card">
            <strong>Ովքեր ունեն access</strong>
            <span><code>role = admin / superadmin / owner</code>, կամ <code>is_admin = 1</code>, կամ email-ը գրանցված է admin whitelist-ում։</span>
          </div>
          <div class="info-card">
            <strong>Առաջին bootstrap</strong>
            <span><?= $hasAdminWhitelist
                ? 'Admin whitelist-ը արդեն գրանցված է, և մուտքը որոշվում է role/is_admin կամ whitelist-ով։'
                : 'Քանի որ admin whitelist-ը դեռ դատարկ է, առաջին հաջող admin login-ի email-ը ավտոմատ կդառնա whitelist admin։' ?></span>
          </div>
        </div>
      </div>

      <div class="meta">
        <div class="chip">Admin Hub: Songs + Update Control</div>
        <div class="chip">Redirect: <?= htmlspecialchars($next, ENT_QUOTES) ?></div>
      </div>
    </section>

    <section class="panel">
      <h2>Մուտք admin համակարգ</h2>
      <p>Մուտքագրեք նույն username/email և password-ը, որով user համակարգ եք մտնում։ Այս login-ը ակտիվացնում է admin access flag-ը տվյալ session-ի համար, և եթե account-ը admin access չունենա, կտեսնեք հստակ մերժման հաղորդագրություն։</p>

      <form method="post">
        <input type="hidden" name="next" value="<?= htmlspecialchars($next, ENT_QUOTES) ?>">

        <div class="field">
          <label for="login">Username կամ Email</label>
          <input id="login" name="login" autocomplete="username" value="<?= htmlspecialchars((string)($_POST['login'] ?? ''), ENT_QUOTES) ?>" required>
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit">Մուտք գործել admin բաժին</button>
          <a class="btn btn-ghost" href="/main.html">Վերադառնալ կայք</a>
        </div>
      </form>

      <?php if (!empty($socialProviders)): ?>
        <div class="social-auth">
          <div class="social-auth-sep">կամ շարունակիր Google-ով</div>
          <div class="social-auth-grid">
            <?php foreach ($socialProviders as $provider): ?>
              <?php
                $providerLabel = function_exists('wp_social_auth_provider_label') ? wp_social_auth_provider_label($provider) : ucfirst($provider);
                $providerEnabled = function_exists('wp_social_auth_provider_enabled') ? wp_social_auth_provider_enabled($provider) : false;
                $socialUrl = function_exists('wp_social_auth_start_url')
                    ? wp_social_auth_start_url($provider, $next, '', 'login', false, 'admin')
                    : '#';
                $socialNote = $providerEnabled
                    ? 'Կմտնի միայն այն դեպքում, եթե Google հաշիվը կապված է և account-ը admin իրավունք ունի։'
                    : 'Միացրու Google մուտքը ադմինից, որպեսզի այս կոճակը աշխատի։';
              ?>
              <a
                class="social-auth-link <?= htmlspecialchars($provider, ENT_QUOTES) ?> <?= $providerEnabled ? '' : 'is-disabled' ?>"
                href="<?= htmlspecialchars($providerEnabled ? $socialUrl : '#', ENT_QUOTES) ?>"
              >
                <span class="social-auth-icon" aria-hidden="true">G</span>
                <span>
                  <strong><?= htmlspecialchars($providerLabel, ENT_QUOTES) ?>-ով admin մուտք</strong>
                  <small><?= htmlspecialchars($socialNote, ENT_QUOTES) ?></small>
                </span>
              </a>
            <?php endforeach; ?>
          </div>
        </div>
      <?php endif; ?>

      <?php if ($error !== ''): ?>
        <div class="message error"><?= htmlspecialchars($error, ENT_QUOTES) ?></div>
      <?php endif; ?>

      <?php if ($notice !== ''): ?>
        <div class="message success"><?= htmlspecialchars($notice, ENT_QUOTES) ?></div>
      <?php endif; ?>
    </section>
  </main>
</body>
</html>
