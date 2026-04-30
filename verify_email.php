<?php
// verify_email.php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

function safeNext($next): string {
  $next = $next ?: "/account.html";
  if(!preg_match('~^/[a-zA-Z0-9_./\-]*$~', $next)) return "/account.html";
  return $next;
}

$token = (string)($_GET['token'] ?? '');
$next  = safeNext((string)($_GET['next'] ?? '/account.html'));

if($token === '' || strlen($token) < 20){
  header("Location: /account.html?verify=invalid");
  exit;
}

$tokenHash = hash('sha256', $token);

try{
  $pdo = wp_runtime_open_pdo();
}catch(Exception $e){
  header("Location: /account.html?verify=error");
  exit;
}

// գտնել user-ին ըստ token_hash-ի, դեռ չհաստատված, ժամկետը չանցած
$st = $pdo->prepare("
  SELECT id
  FROM users
  WHERE email_verify_token_hash = ?
    AND email_verify_expires_at IS NOT NULL
    AND email_verify_expires_at > NOW()
  LIMIT 1
");
$st->execute([$tokenHash]);
$uid = (int)($st->fetchColumn() ?: 0);

if(!$uid){
  header("Location: /account.html?verify=expired");
  exit;
}

// հաստատել email-ը
$up = $pdo->prepare("
  UPDATE users
  SET email_verified_at = NOW(),
      email_verify_token_hash = NULL,
      email_verify_expires_at = NULL
  WHERE id = ?
");
$up->execute([$uid]);

header("Location: ".$next."?verify=ok");
exit;
