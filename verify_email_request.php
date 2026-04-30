<?php
// verify_email_request.php
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json; charset=UTF-8");
session_start();

function out($arr,$code=200){
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

if(empty($_SESSION['user_id'])) out(["error"=>"Unauthorized"], 401);

try{
  $pdo = wp_runtime_open_pdo();
}catch(Exception $e){
  out(["error"=>"DB connection failed"], 500);
}

$uid = (int)$_SESSION['user_id'];

$st = $pdo->prepare("SELECT id, name, email, pending_email, email_verified_at, email_last_verification_sent_at
                     FROM users WHERE id=? LIMIT 1");
$st->execute([$uid]);
$u = $st->fetch(PDO::FETCH_ASSOC);
if(!$u) out(["error"=>"User not found"], 404);

$targetEmail = trim((string)($u['pending_email'] ?? ''));
if($targetEmail === '') $targetEmail = trim((string)($u['email'] ?? ''));

$name  = trim((string)($u['name'] ?? 'User'));

if($targetEmail === '' || !filter_var($targetEmail, FILTER_VALIDATE_EMAIL)){
  out(["error"=>"Add a valid email first"], 400);
}

// Եթե email-ը verified է ու pending_email չկա՝ էլ պետք չէ
if(!empty($u['email_verified_at']) && empty($u['pending_email'])){
  out(["ok"=>true, "alreadyVerified"=>true]);
}

$last = (string)($u['email_last_verification_sent_at'] ?? '');
if($last !== '' && (time() - strtotime($last)) < 60){
  out(["ok"=>true, "sent"=>true, "rateLimited"=>true]);
}

// token
$token = bin2hex(random_bytes(32));
$hash  = hash('sha256', $token);
$expiresAt = (new DateTime('+30 minutes'))->format('Y-m-d H:i:s');

$upd = $pdo->prepare("UPDATE users
  SET email_verify_token_hash=?,
      email_verify_expires_at=?,
      email_last_verification_sent_at=NOW()
  WHERE id=?");
$upd->execute([$hash, $expiresAt, $uid]);

$baseUrl = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'worship.pmstudio.am');
$link = $baseUrl . '/verify_email_confirm.php?token=' . urlencode($token);

$res = send_verify_email($targetEmail, $name === '' ? 'User' : $name, $link);

if(!$res["ok"]){
  // dev-ում տեսնելու համար
  out(["error"=>"MAIL ERROR: ".$res["error"]], 500);
}

out(["ok"=>true, "sent"=>true]);
