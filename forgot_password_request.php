<?php
// /forgot_password_request.php

require_once __DIR__ . '/runtime_config.php';

session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

function safeNext($next): string {
  $next = $next ?: "/main.html";
  if(!preg_match('~^/[a-zA-Z0-9_./\-]*$~', $next)) return "/main.html";
  return $next;
}

$next = safeNext($_POST['next'] ?? ($_GET['next'] ?? '/main.html'));
$source = strtolower((string)($_POST['source'] ?? $_GET['source'] ?? ''));
$email = trim($_POST['email'] ?? '');
$emailNorm = strtolower($email);

// ✅ միշտ նույն արդյունք (չբացահայտի՝ email կա՞, թե՞ չկա)
function done(string $next, string $source = ''): void {
  $target = "/forgot_password_sent.php?next=" . urlencode($next);
  if ($source !== '') {
    $target .= "&source=" . urlencode($source);
  }
  header("Location: " . $target);
  exit;
}

if($emailNorm === '' || !filter_var($emailNorm, FILTER_VALIDATE_EMAIL)){
  done($next, $source);
}

try{
  $conn = wp_runtime_open_pdo();
}catch(Exception $e){
  done($next, $source);
}

// 1) գտնել user-ին
$st = $conn->prepare("SELECT id, name, email FROM users WHERE LOWER(email)=? LIMIT 1");
$st->execute([$emailNorm]);
$user = $st->fetch(PDO::FETCH_ASSOC);

if(!$user){
  done($next, $source);
}

// 2) token
$token = bin2hex(random_bytes(32));      // raw token
$tokenHash = hash('sha256', $token);     // DB hash
$expiresAt = (new DateTime('+30 minutes'))->format('Y-m-d H:i:s');

// 3) insert reset request
$ip = $_SERVER['REMOTE_ADDR'] ?? null;
$ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

$ins = $conn->prepare("INSERT INTO password_resets (user_id, token_hash, expires_at, ip, user_agent) VALUES (?,?,?,?,?)");
$ins->execute([(int)$user['id'], $tokenHash, $expiresAt, $ip, $ua]);

// 4) build link + send
require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';

$baseUrl = 'https://worship.pmstudio.am';
$resetLink = $baseUrl . "/reset_password.php?token=" . urlencode($token) . "&next=" . urlencode($next) . ($source !== '' ? "&source=" . urlencode($source) : '');

$toName = (string)($user['name'] ?? '');
$res = send_reset_email($emailNorm, $toName, $resetLink);

// DEV փուլում կարող ես ժամանակավորապես տեսնել սխալը
if(!$res["ok"]){
  // ❗ Արտադրանքում սա մի ցուցադրիր (լոգ արա). հիմա թողնում ենք debug-ի համար
  echo "MAIL ERROR: " . htmlspecialchars((string)$res["error"]);
  exit;
}

done($next, $source);
