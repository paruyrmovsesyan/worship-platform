<?php
function safeNext($next){
  $next = $next ?: '/main.html';
  if(!preg_match('~^/[a-zA-Z0-9_./\-]*$~', $next)) return '/main.html';
  return $next;
}
$next = safeNext($_GET['next'] ?? '/main.html');
$source = strtolower((string)($_GET['source'] ?? ''));
$sourceQuery = $source !== '' ? '&source=' . rawurlencode($source) : '';
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
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#070910">
<script src="/loader.js" defer></script>
<script src="/pwa-init.js" defer></script>
<title>Ստուգեք email-ը</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}
  body{display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#3367ff,#6ea8ff);color:#fff;}
  .card{background:rgba(255,255,255,0.95);padding:40px;border-radius:16px;width:100%;max-width:420px;box-shadow:0 10px 25px rgba(0,0,0,0.2);color:#0f1222;text-align:center;}
  h2{margin-bottom:12px;font-size:22px;}
  p{color:#555;line-height:1.5;font-size:14px;}
  a{display:inline-flex;justify-content:center;margin-top:18px;padding:10px 14px;border-radius:12px;font-weight:800;text-decoration:none;color:#2247d6;background:rgba(34,71,214,0.08);border:1px solid rgba(34,71,214,0.18);}
  a:hover{background:rgba(34,71,214,0.12);transform:translateY(-1px);}
</style>
</head>
<body>
  <div class="card">
    <h2>Ստուգեք email-ը</h2>
    <p>
      Եթե այդ email-ով հաշիվ կա, մենք ուղարկեցինք վերականգնման հղում։<br>
      Ստուգեք նաև <b>Spam / Promotions</b> բաժինները։
    </p>
    <a href="/loginuser.php?next=<?= htmlspecialchars($next, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">Վերադառնալ մուտք</a>
  </div>
</body>
</html>
