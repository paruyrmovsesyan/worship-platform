<?php
require_once __DIR__ . '/runtime_config.php';
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

function safeNext($next){
  $next = $next ?: '/main.html';
  if(!preg_match('~^/[a-zA-Z0-9_./\-]*$~', $next)) return '/main.html';
  return $next;
}

$next = safeNext($_GET['next'] ?? '/main.html');
$token = trim($_GET['token'] ?? '');
$source = strtolower((string)($_GET['source'] ?? $_POST['source'] ?? ''));
$sourceQuery = $source !== '' ? '&source=' . rawurlencode($source) : '';

$ok = false;
$tokenHash = $token ? hash('sha256', $token) : '';

try{
  $conn = wp_runtime_open_pdo();

  if($tokenHash){
    $st = $conn->prepare("
      SELECT id, user_id, expires_at, used_at
      FROM password_resets
      WHERE token_hash=? LIMIT 1
    ");
    $st->execute([$tokenHash]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    if($row && empty($row['used_at'])){
      $exp = strtotime($row['expires_at']);
      if($exp !== false && $exp > time()){
        $ok = true;
      }
    }
  }
}catch(Exception $e){
  $ok = false;
}
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
<title>Փոխել գաղտնաբառը</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}
  body{display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#3367ff,#6ea8ff);color:#fff;}
  .card{background:rgba(255,255,255,0.95);padding:40px;border-radius:16px;width:100%;max-width:420px;box-shadow:0 10px 25px rgba(0,0,0,0.2);color:#0f1222;}
  h2{text-align:center;margin-bottom:12px;font-size:22px;}
  p{color:#555;line-height:1.45;text-align:center;font-size:14px;margin-bottom:16px;}
  input{width:100%;padding:12px 16px;margin:10px 0;border-radius:10px;border:1px solid #ccc;font-size:16px;}
  input:focus{outline:none;border-color:#3367ff;box-shadow:0 0 0 3px rgba(51,103,255,0.2);}
  button{width:100%;padding:12px 16px;background:linear-gradient(135deg,#3367ff,#2247d6);color:#fff;font-weight:800;border:none;border-radius:12px;cursor:pointer;font-size:16px;transition:all .2s ease;}
  button:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(51,103,255,0.3);}
  .err{background:rgba(255,59,48,0.10);border:1px solid rgba(255,59,48,0.22);color:#b42318;padding:10px 12px;border-radius:12px;margin-top:12px;text-align:center;font-weight:800;}
  a{display:block;margin-top:14px;text-align:center;font-weight:800;text-decoration:none;color:#2247d6;}
</style>
</head>
<body>
  <div class="card">
    <div id="wpLangContainer"></div>
    <h2>Նոր գաղտնաբառ</h2>

    <?php if(!$ok): ?>
      <p>Հղումը սխալ է կամ ժամկետն անցել է։</p>
      <div class="err">Խնդրում ենք նորից փորձել</div>
      <a href="/forgot_password.php?next=<?= htmlspecialchars($next, ENT_QUOTES) ?><?= htmlspecialchars($sourceQuery, ENT_QUOTES) ?>">Նոր հղում ստանալ</a>
    <?php else: ?>
      <p>Մուտքագրեք նոր գաղտնաբառը (առնվազն 6 նիշ)։</p>
      <form method="POST" action="/reset_password_submit.php">
        <input type="hidden" name="next" value="<?= htmlspecialchars($next, ENT_QUOTES) ?>">
        <input type="hidden" name="source" value="<?= htmlspecialchars($source, ENT_QUOTES) ?>">
        <input type="hidden" name="token" value="<?= htmlspecialchars($token, ENT_QUOTES) ?>">
        <input name="password" type="password" placeholder="Նոր գաղտնաբառ" minlength="6" required>
        <input name="password2" type="password" placeholder="Կրկնել գաղտնաբառը" minlength="6" required>
        <button type="submit">Փոխել գաղտնաբառը</button>
      </form>
    <?php endif; ?>
  </div>
</body>
</html>
