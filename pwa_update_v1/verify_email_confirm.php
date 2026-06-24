<?php
// verify_email_confirm.php
require_once __DIR__ . '/runtime_config.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);
session_start();

function render_result_page(bool $ok, string $msg, string $redirectTo = '/account.html', int $delaySec = 3): void {
  http_response_code($ok ? 200 : 400);
  header('Content-Type: text/html; charset=UTF-8');

  $title = $ok ? 'Email հաստատվեց' : 'Email հաստատումը չհաջողվեց';
  $status = $ok ? 'Հաջողվեց' : 'Չհաջողվեց';
  $cls = $ok ? 'ok' : 'bad';

  $redirectToEsc = htmlspecialchars($redirectTo, ENT_QUOTES, 'UTF-8');
  $msgEsc = htmlspecialchars($msg, ENT_QUOTES, 'UTF-8');
  $titleEsc = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
  $statusEsc = htmlspecialchars($status, ENT_QUOTES, 'UTF-8');

  echo <<<HTML
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <link rel="apple-touch-icon" href="/wolarm_youth.png">
  <meta name="theme-color" content="#070910">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/wolarmyouth.jpg" type="image/jpeg">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Worship Platform">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#070910">
  <script src="/loader.js" defer></script>
  <script src="/pwa-init.js" defer></script>
  <title>{$titleEsc} — Worship Platform</title>
  <meta http-equiv="refresh" content="{$delaySec};url={$redirectToEsc}">
  <style>
    body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial;background:#0b1020;color:#eaf0ff;}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;}
    .card{max-width:560px;width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
      border-radius:18px;padding:18px 18px 16px;backdrop-filter: blur(10px);}
    h1{margin:0 0 8px;font-size:18px}
    p{margin:0 0 14px;color:rgba(234,240,255,0.88);line-height:1.45}
    .btn{display:inline-block;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);
      color:#eaf0ff;text-decoration:none;font-weight:800}
    .ok{color:#22c55e}
    .bad{color:#ff6b6b}
    small{color:rgba(234,240,255,0.65)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1 class="{$cls}">{$statusEsc}</h1>
      <p>{$msgEsc}</p>
      <a class="btn" href="{$redirectToEsc}">Գնալ օգտահաշիվ</a>
      <div style="margin-top:10px;"><small>{$delaySec} վայրկյանից ավտոմատ կբացվի օգտահաշիվը…</small></div>
    </div>
  </div>
  <script>
    setTimeout(()=>{ location.href = "{$redirectToEsc}"; }, {$delaySec}*1000);
  </script>
</body>
</html>
HTML;

  exit;
}

$token = (string)($_GET['token'] ?? '');
if($token === '' || strlen($token) < 40){
  render_result_page(false, "Հաստատման հղումը սխալ է կամ վնասված։", "/account.html", 4);
}

try{
  $pdo = wp_runtime_open_pdo();
}catch(Exception $e){
  render_result_page(false, "Սերվերի խնդիր է առաջացել։ Փորձիր մի քիչ հետո։", "/account.html", 4);
}

$hash = hash('sha256', $token);

$st = $pdo->prepare("SELECT id, pending_email, email_verify_expires_at, email_verified_at
                     FROM users WHERE email_verify_token_hash=? LIMIT 1");
$st->execute([$hash]);
$u = $st->fetch(PDO::FETCH_ASSOC);

if(!$u){
  render_result_page(false, "Հաստատման հղումը սխալ է կամ արդեն օգտագործվել է։", "/account.html", 4);
}

// Եթե verified է ու pending_email չկա՝ ok
if(!empty($u['email_verified_at']) && empty($u['pending_email'])){
  render_result_page(true, "Email-ը արդեն հաստատված է ✅", "/account.html", 2);
}

$exp = (string)($u['email_verify_expires_at'] ?? '');
if($exp === '' || strtotime($exp) < time()){
  // expire -> clear token
  $pdo->prepare("UPDATE users SET email_verify_token_hash=NULL, email_verify_expires_at=NULL WHERE id=?")->execute([(int)$u['id']]);
  render_result_page(false, "Հղման ժամկետը ավարտվել է։ Մուտք գործիր ու ուղարկիր նորից։", "/account.html", 5);
}

// verify
if(!empty($u['pending_email'])){
  // ✅ email change confirm
  $pdo->prepare("UPDATE users
    SET email = pending_email,
        pending_email = NULL,
        email_verified_at = NOW(),
        email_verify_token_hash = NULL,
        email_verify_expires_at = NULL
    WHERE id=?")->execute([(int)$u['id']]);
}else{
  // ✅ signup verify
  $pdo->prepare("UPDATE users
    SET email_verified_at = NOW(),
        email_verify_token_hash = NULL,
        email_verify_expires_at = NULL
    WHERE id=?")->execute([(int)$u['id']]);
}

render_result_page(true, "Ձեր email-ը հաստատվեց ✅", "/account.html", 3);
