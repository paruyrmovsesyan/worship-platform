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

$next = safeNext($_POST['next'] ?? '/main.html');
$source = strtolower((string)($_POST['source'] ?? $_GET['source'] ?? ''));
$token = trim($_POST['token'] ?? '');
$pw1 = (string)($_POST['password'] ?? '');
$pw2 = (string)($_POST['password2'] ?? '');

function fail($msg, $next){
  header("Content-Type: text/plain; charset=utf-8");
  echo $msg . "\n";
  echo "Վերադառնալ՝ /reset_password.php?token=" . urlencode($_POST['token'] ?? '') . "&next=" . urlencode($next);
  exit;
}

if($token === '' || strlen($pw1) < 6 || $pw1 !== $pw2){
  fail("Սխալ տվյալներ (գաղտնաբառը պետք է >=6 նիշ և 2 դաշտերը նույնը լինեն).", $next);
}

try{
  $conn = wp_runtime_open_pdo();
}catch(Exception $e){
  fail("DB սխալ.", $next);
}

$tokenHash = hash('sha256', $token);

$conn->beginTransaction();

// գտնել token row
$st = $conn->prepare("
  SELECT id, user_id, expires_at, used_at
  FROM password_resets
  WHERE token_hash=? LIMIT 1
");
$st->execute([$tokenHash]);
$row = $st->fetch(PDO::FETCH_ASSOC);

if(!$row || !empty($row['used_at']) || strtotime($row['expires_at']) <= time()){
  $conn->rollBack();
  fail("Հղումը սխալ է կամ ժամկետն անցել է։", $next);
}

$uid = (int)$row['user_id'];
$newHash = password_hash($pw1, PASSWORD_DEFAULT);

// update user password + clear remember_token
$up = $conn->prepare("UPDATE users SET password_hash=?, remember_token=NULL WHERE id=?");
$up->execute([$newHash, $uid]);

// mark reset as used
$u = $conn->prepare("UPDATE password_resets SET used_at=NOW() WHERE id=?");
$u->execute([(int)$row['id']]);

$conn->commit();

// session/cookie cleanup (force re-login)
$_SESSION = [];
session_destroy();

setcookie("remember_me", "", [
  "expires" => time() - 3600,
  "path" => "/",
  "secure" => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
  "httponly" => true,
  "samesite" => "Lax",
]);

$target = "/loginuser.php?next=" . urlencode($next);
if ($source !== '') {
  $target .= "&source=" . urlencode($source);
}
header("Location: " . $target);
exit;
