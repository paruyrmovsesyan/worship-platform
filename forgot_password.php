<?php
session_start();

function safeNext($next){
  $next = $next ?: '/main.html';
  if(!preg_match('~^/[a-zA-Z0-9_./\-]*$~', $next)) return '/main.html';
  return $next;
}
$next = safeNext($_GET['next'] ?? '/main.html');
$source = strtolower((string)($_GET['source'] ?? $_POST['source'] ?? ''));
$sourceQuery = $source !== '' ? '&source=' . rawurlencode($source) : '';
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
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#070910">
<script src="/loader.js" defer></script>
<script src="/pwa-init.js" defer></script>
<title>Վերականգնել գաղտնաբառը</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}
  body{display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#3367ff,#6ea8ff);color:#fff;}
  .card{background:rgba(255,255,255,0.95);padding:40px;border-radius:16px;width:100%;max-width:420px;box-shadow:0 10px 25px rgba(0,0,0,0.2);color:#0f1222;}
  h2{text-align:center;margin-bottom:12px;font-size:24px;}
  p{color:#555;line-height:1.45;text-align:center;font-size:14px;margin-bottom:16px;}
  input{width:100%;padding:12px 16px;margin:12px 0;border-radius:10px;border:1px solid #ccc;font-size:16px;}
  input:focus{outline:none;border-color:#3367ff;box-shadow:0 0 0 3px rgba(51,103,255,0.2);}
  button{width:100%;padding:12px 16px;background:linear-gradient(135deg,#3367ff,#2247d6);color:#fff;font-weight:800;border:none;border-radius:12px;cursor:pointer;font-size:16px;transition:all .2s ease;}
  button:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(51,103,255,0.3);}
  .back-home{display:inline-block;margin-bottom:16px;text-decoration:none;font-weight:700;color:#3367ff;background:rgba(51,103,255,0.1);padding:8px 14px;border-radius:10px;transition:.2s;}
  .back-home:hover{background:rgba(51,103,255,0.18);transform:translateY(-1px);}
  .link-row{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-top:14px;}
  .chip{display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;color:#2247d6;background:rgba(34,71,214,0.08);border:1px solid rgba(34,71,214,0.18);transition:.15s;}
  .chip:hover{background:rgba(34,71,214,0.12);transform:translateY(-1px);}
  @media(max-width:420px){.card{padding:28px}.chip{width:100%}}
</style>
</head>
<body>
  <div class="card">
    <a href="/" class="back-home">← Հետ գլխավոր էջ</a>
    <h2>Վերականգնել գաղտնաբառը</h2>
    

    <?php $token = trim((string)($_GET['token'] ?? '')); ?>

<?php if($token !== '' && strlen($token) >= 40): ?>
  <p>Մուտքագրիր նոր գաղտնաբառը։</p>

  <form method="POST" action="/forgot_password_reset.php">
    <input type="hidden" name="next" value="<?= htmlspecialchars($next, ENT_QUOTES) ?>">
    <input type="hidden" name="source" value="<?= htmlspecialchars($source, ENT_QUOTES) ?>">
    <input type="hidden" name="token" value="<?= htmlspecialchars($token, ENT_QUOTES) ?>">

    <input name="new_password" type="password" placeholder="Նոր գաղտնաբառ (մին. 8 նիշ)" minlength="8" required>
    <input name="new_password2" type="password" placeholder="Կրկնել նոր գաղտնաբառը" minlength="8" required>

    <button type="submit">Փոխել գաղտնաբառը</button>
  </form>

<?php else: ?>
  <p>Գրիր քո email-ը։ Եթե այդ email-ով հաշիվ կա, կուղարկվի վերականգնման հղում։</p>

  <form method="POST" action="/forgot_password_request.php">
    <input type="hidden" name="next" value="<?= htmlspecialchars($next, ENT_QUOTES) ?>">
    <input type="hidden" name="source" value="<?= htmlspecialchars($source, ENT_QUOTES) ?>">
    <input name="email" type="email" placeholder="Էլ․ փոստ" required>
    <button type="submit">Ուղարկել հղումը</button>
  </form>
<?php endif; ?>

    <div class="link-row">
      <a class="chip" href="/loginuser.php?next=<?= htmlspecialchars($next, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">Մուտք</a>
      <a class="chip" href="/registeruser.php?next=<?= htmlspecialchars($next, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">Գրանցում</a>
    </div>
  </div>
</body>
</html>
