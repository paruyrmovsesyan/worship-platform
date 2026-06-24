<?php
require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/translation_runtime.php';
require_once __DIR__ . '/song_request_service.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
header("Content-Type: application/json; charset=UTF-8");

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

function out($arr, $code=200){
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if(empty($_SESSION['user_id']) && $action !== 'auth_status'){
  out(["error"=>"Unauthorized"], 401);
}

try{
  $pdo = wp_runtime_open_pdo();
}catch(Exception $e){
  out(["error"=>"DB connection failed"], 500);
}

$uid = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$minPasswordLength = wp_runtime_password_min_length();
$lang = wp_translation_requested_lang();

function readJson(){
  $raw = file_get_contents("php://input");
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}


function getCurrentRememberSelector(){
  if(empty($_COOKIE['remember_me'])) return null;

  $parts = explode(':', $_COOKIE['remember_me'], 2);
  if(count($parts) !== 2) return null;

  $selector = trim((string)$parts[0]);
  return $selector !== '' ? $selector : null;
}

function sessionOriginFromDeviceName(string $deviceName): string {
  $deviceName = trim($deviceName);
  if($deviceName === '') return 'Անհայտ';

  if(preg_match('/(?:^|\|\s*)origin:(app|admin-app|web)\s*$/i', $deviceName, $m)){
    $key = strtolower((string)$m[1]);
    if($key === 'app') return 'Ծրագիր';
    if($key === 'admin-app') return 'Ադմին ծրագիր';
    return 'Կայք';
  }

  $parts = array_map('trim', explode('•', $deviceName));
  $last = end($parts);

  if($last === 'Ծրագիր' || $last === 'Ադմին ծրագիր' || $last === 'Կայք') return $last;
  if($last === 'app') return 'Ծրագիր';
  if($last === 'admin-app') return 'Ադմին ծրագիր';
  if($last === 'web') return 'Կայք';

  return 'Կայք';
}

function normalizeSessionDeviceBase(string $deviceName): string {
  $deviceName = trim($deviceName);
  $deviceName = preg_replace('/\s*\|\s*origin:(app|admin-app|web)\s*$/i', '', $deviceName);
  $deviceName = preg_replace('/\s*•\s*(Ծրագիր|Ադմին ծրագիր|Կայք|app|admin-app|web)\s*$/u', '', (string)$deviceName);
  $deviceName = preg_replace('/\s+/u', ' ', (string)$deviceName);
  return mb_strtolower(trim((string)$deviceName), 'UTF-8');
}

function activeSessionGroupKey(array $row): string {
  $origin = sessionOriginFromDeviceName((string)($row['device_name'] ?? ''));
  $base = normalizeSessionDeviceBase((string)($row['device_name'] ?? ''));
  $browser = mb_strtolower(trim((string)($row['browser'] ?? '')), 'UTF-8');
  $platform = mb_strtolower(trim((string)($row['platform'] ?? '')), 'UTF-8');
  $agent = mb_strtolower(trim((string)($row['user_agent'] ?? '')), 'UTF-8');

  if($base === '' && $browser === '' && $platform === '' && $agent === ''){
    $sessionKey = trim((string)($row['session_key'] ?? ''));
    if($sessionKey !== '') return 'session:' . $sessionKey;
    $selector = trim((string)($row['selector'] ?? ''));
    if($selector !== '') return 'selector:' . $selector;
    return 'row:' . (string)($row['id'] ?? '');
  }

  return implode('|', [$origin, $base, $browser, $platform, $agent]);
}

function activeSessionTimestamp(array $row): int {
  $value = (string)($row['last_used_at'] ?? '');
  if($value === '') $value = (string)($row['created_at'] ?? '');
  $ts = strtotime($value);
  return $ts !== false ? $ts : 0;
}

function chooseActiveSessionRow(array $current, array $candidate, string $currentSessionKey): array {
  $currentIsNow = ((string)($current['session_key'] ?? '') === $currentSessionKey);
  $candidateIsNow = ((string)($candidate['session_key'] ?? '') === $currentSessionKey);

  if($candidateIsNow && !$currentIsNow) return $candidate;
  if($currentIsNow && !$candidateIsNow) return $current;

  $currentTs = activeSessionTimestamp($current);
  $candidateTs = activeSessionTimestamp($candidate);
  if($candidateTs > $currentTs) return $candidate;
  if($candidateTs < $currentTs) return $current;

  return ((int)($candidate['id'] ?? 0) > (int)($current['id'] ?? 0)) ? $candidate : $current;
}

function dedupeActiveSessionRows(PDO $pdo, int $uid, array $rows, string $currentSessionKey): array {
  $groups = [];
  $deleteIds = [];

  foreach($rows as $row){
    $key = activeSessionGroupKey($row);
    if(!isset($groups[$key])){
      $groups[$key] = $row;
      continue;
    }

    $keep = chooseActiveSessionRow($groups[$key], $row, $currentSessionKey);
    $drop = ((int)($keep['id'] ?? 0) === (int)($groups[$key]['id'] ?? 0)) ? $row : $groups[$key];
    $groups[$key] = $keep;

    $dropId = (int)($drop['id'] ?? 0);
    if($dropId > 0) $deleteIds[] = $dropId;
  }

  $deleteIds = array_values(array_unique($deleteIds));
  if($deleteIds){
    try{
      $placeholders = implode(',', array_fill(0, count($deleteIds), '?'));
      $params = array_merge([$uid], $deleteIds);
      $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ? AND id IN ($placeholders)")->execute($params);
    }catch(Throwable $e){
      // The response can still be clean even if background cleanup fails.
    }
  }

  $out = array_values($groups);
  usort($out, function($a, $b) use ($currentSessionKey){
    $aCurrent = ((string)($a['session_key'] ?? '') === $currentSessionKey) ? 1 : 0;
    $bCurrent = ((string)($b['session_key'] ?? '') === $currentSessionKey) ? 1 : 0;
    if($aCurrent !== $bCurrent) return $bCurrent <=> $aCurrent;
    return activeSessionTimestamp($b) <=> activeSessionTimestamp($a);
  });

  return $out;
}

// ✅ GET profile
if($action === 'me' && $method === 'GET'){
  $st = $pdo->prepare("SELECT id, name, email, created_at FROM users WHERE id=? LIMIT 1");
  $st->execute([$uid]);
  $u = $st->fetch(PDO::FETCH_ASSOC);
  if(!$u) out(["error"=>"User not found"], 404);

  out([
    "id" => (int)$u["id"],
    "name" => (string)($u["name"] ?? ''),
    "email" => (string)($u["email"] ?? ''),
    "created_at" => (string)($u["created_at"] ?? ''),
    "email_verified" => !empty($u["email_verified_at"])
  ]);
}

// ✅ POST update profile (name/email)
// ✅ POST update profile (name only + optional pending_email)
if($action === 'update_profile' && $method === 'POST'){
  $d = readJson();
  $name = trim((string)($d["name"] ?? ''));
  $email = trim((string)($d["email"] ?? ''));
  $birth_date = trim((string)($d["birth_date"] ?? ''));
  $gender = trim((string)($d["gender"] ?? ''));
  $phone_number = trim((string)($d["phone_number"] ?? ''));

  if($name === '') out(["error"=>"Name required"], 400);
  if(strlen($name) > 80) out(["error"=>"Name too long"], 400);

  $bDate = $birth_date === '' ? null : $birth_date;
  $gndr = $gender === '' ? null : $gender;
  if ($gndr !== null && !in_array($gndr, ['male', 'female', 'other', 'prefer_not_to_say'])) {
    $gndr = null;
  }
  $phone = $phone_number === '' ? null : $phone_number;

  // update name & other fields
  $pdo->prepare("UPDATE users SET name=?, birth_date=?, gender=?, phone_number=? WHERE id=?")->execute([$name, $bDate, $gndr, $phone, $uid]);
  $_SESSION['name'] = $name;

  // optional: if email passed here, set pending_email (NOT direct)
  if($email !== ''){
    if(strlen($email) > 190) out(["error"=>"Email too long"], 400);
    if(!filter_var($email, FILTER_VALIDATE_EMAIL)) out(["error"=>"Invalid email"], 400);

    $st = $pdo->prepare("SELECT id FROM users
      WHERE (LOWER(email)=LOWER(?) OR LOWER(pending_email)=LOWER(?)) AND id<>?
      LIMIT 1");
    $st->execute([$email, $email, $uid]);
    if($st->fetchColumn()) out(["error"=>"Email already in use"], 409);

    $pdo->prepare("UPDATE users SET pending_email=? WHERE id=?")->execute([$email, $uid]);
  }

  out(["ok"=>true, "name"=>$name]);
}


// ✅ GET auth status
if($action === 'auth_status' && $method === 'GET'){
  if(!empty($_SESSION['user_id']) && !wp_auth_current_session_backed($pdo)){
    wp_auth_force_local_logout(false);
  }

  out([
    "ok" => true,
    "logged_in" => !empty($_SESSION['user_id']),
    "session_type" => !empty($_SESSION['user_id'])
      ? (!empty($_SESSION['auth_via_remember']) ? 'remember' : 'session')
      : null,
    "user_id" => !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null,
    "name" => !empty($_SESSION['name']) ? (string)$_SESSION['name'] : null,
    "email" => !empty($_SESSION['email']) ? (string)$_SESSION['email'] : null
  ]);
}


if($action === 'get_active_sessions' && $method === 'GET'){
  $currentSelector = getCurrentRememberSelector();
  $currentSessionKey = session_id();

  $st = $pdo->prepare("
    SELECT
      id,
      selector,
      session_key,
      remembered,
      device_name,
      browser,
      platform,
      ip_address,
      user_agent,
      last_used_at,
      expires_at,
      created_at
    FROM user_sessions
    WHERE user_id = ?
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY
      CASE WHEN session_key = ? THEN 0 ELSE 1 END,
      COALESCE(last_used_at, created_at) DESC
  ");
  $st->execute([$uid, $currentSessionKey]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);
  $rows = dedupeActiveSessionRows($pdo, $uid, $rows, $currentSessionKey);

  $outRows = array_map(function($row) use ($currentSelector, $currentSessionKey){
    return [
      "id" => (int)$row["id"],
      "device_name" => preg_replace('/(?:\s*\|\s*)?origin:(?:app|admin-app|web)$/i', '', (string)($row["device_name"] ?? '')),
      "session_origin" => sessionOriginFromDeviceName((string)($row["device_name"] ?? '')),
      "browser" => (string)($row["browser"] ?? ''),
      "platform" => (string)($row["platform"] ?? ''),
      "ip_address" => (string)($row["ip_address"] ?? ''),
      "user_agent" => (string)($row["user_agent"] ?? ''),
      "last_used_at" => (string)($row["last_used_at"] ?? ''),
      "expires_at" => (string)($row["expires_at"] ?? ''),
      "created_at" => (string)($row["created_at"] ?? ''),
      "remembered" => !empty($row["remembered"]),
      "is_current" => ((string)$row["session_key"] === (string)$currentSessionKey)
    ];
  }, $rows);

  $hasCurrent = false;
  foreach($outRows as $r){
    if(!empty($r["is_current"])) {
      $hasCurrent = true;
      break;
    }
  }

  if(!$hasCurrent){
    array_unshift($outRows, [
      "id" => -1,
      "device_name" => "Ընթացիկ սարք (Legacy)",
      "session_origin" => "unknown",
      "browser" => "Անհայտ",
      "platform" => "Անհայտ",
      "ip_address" => wp_runtime_remote_ip(),
      "user_agent" => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
      "last_used_at" => date("Y-m-d H:i:s"),
      "expires_at" => "",
      "created_at" => date("Y-m-d H:i:s"),
      "remembered" => false,
      "is_current" => true
    ]);
  }

  out($outRows);
}


if($action === 'delete_session' && $method === 'POST'){
  $d = readJson();
  $sessionId = (int)($d["session_id"] ?? 0);
  if($sessionId <= 0) out(["error"=>"session_id required"], 400);

  $currentSessionKey = session_id();

  $st = $pdo->prepare("
    SELECT id, selector, session_key
    FROM user_sessions
    WHERE id = ? AND user_id = ?
    LIMIT 1
  ");
  $st->execute([$sessionId, $uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);

  if(!$row) out(["error"=>"Session not found"], 404);

  $deleteClauses = ["id = ?"];
  $deleteParams = [$sessionId];

  if(!empty($row["session_key"])){
    $deleteClauses[] = "session_key = ?";
    $deleteParams[] = (string)$row["session_key"];
  }

  if(!empty($row["selector"])){
    $deleteClauses[] = "selector = ?";
    $deleteParams[] = (string)$row["selector"];
  }

  $deleteSql = "DELETE FROM user_sessions WHERE user_id = ? AND (" . implode(" OR ", $deleteClauses) . ")";
  array_unshift($deleteParams, $uid);
  $pdo->prepare($deleteSql)->execute($deleteParams);

  $isCurrent = ((string)$row["session_key"] === (string)$currentSessionKey);

  if($isCurrent){
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
      $params = session_get_cookie_params();
      $sessionName = session_name();
      foreach ([true, false] as $sec) {
        setcookie($sessionName, '', [
            'expires'  => time() - 42000,
            'path'     => $params['path'] ?? '/',
            'domain'   => $params['domain'] ?? '',
            'secure'   => $sec,
            'httponly' => !empty($params['httponly']),
            'samesite' => 'Lax',
        ]);
      }
    }
    session_destroy();

    wp_auth_clear_remember_cookie();

    out(["ok"=>true, "logged_out"=>true]);
  }

  out(["ok"=>true, "logged_out"=>false]);
}


if($action === 'delete_other_sessions' && $method === 'POST'){
  $currentSessionKey = session_id();
  $currentSessionRowId = !empty($_SESSION['user_session_row_id']) ? (int)$_SESSION['user_session_row_id'] : 0;

  $st = $pdo->prepare("
    DELETE FROM user_sessions
    WHERE user_id = ?
      AND NOT (
        (session_key IS NOT NULL AND session_key = ?)
        OR id = ?
      )
  ");
  $st->execute([$uid, $currentSessionKey, $currentSessionRowId]);

  out(["ok"=>true]);
}


// ✅ POST add recent viewed song
if($action === 'add_recent_view' && $method === 'POST'){
  $d = readJson();
  $songId = (int)($d["song_id"] ?? 0);

  if($songId <= 0) out(["error"=>"song_id required"], 422);

  $st = $pdo->prepare("
    INSERT INTO recent_views (user_id, song_id, viewed_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE viewed_at = NOW()
  ");
  $st->execute([$uid, $songId]);

  out(["ok"=>true]);
}

// ✅ GET recent viewed songs
if($action === 'get_recent_views' && $method === 'GET'){
  $limit = (int)($_GET["limit"] ?? 10);
  if($limit < 1) $limit = 10;
  if($limit > 20) $limit = 20;

  $st = $pdo->prepare("
    SELECT
      rv.song_id AS id,
      rv.viewed_at,
      s.title,
      s.artist,
      s.song_key,
      s.tags
    FROM recent_views rv
    INNER JOIN songs s ON s.id = rv.song_id
    WHERE rv.user_id = ?
    ORDER BY rv.viewed_at DESC
    LIMIT $limit
  ");
  $st->execute([$uid]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);
  $rows = wp_translation_translate_rows($rows, [
    'title' => 'account.recent.title',
    'artist' => 'account.recent.artist',
    'tags' => 'account.recent.tags',
  ], $lang);
  $rows = wp_translation_localize_row_fields($rows, [
    'title' => 'account.recent.title',
  ], $lang);

  out($rows);
}

if($action === 'get_my_song_requests' && $method === 'GET'){
  $limit = (int)($_GET["limit"] ?? 10);
  if($limit < 1) $limit = 10;
  if($limit > 20) $limit = 20;

  $rows = wp_song_request_list_for_submitter($uid, $limit);
  $rows = array_map(function(array $row): array {
    return [
      "id" => (int)($row["id"] ?? 0),
      "song_id" => (int)($row["song_id"] ?? 0),
      "resolved_song_id" => (int)($row["resolved_song_id"] ?? 0),
      "request_type" => (string)($row["request_type"] ?? ''),
      "request_type_label" => wp_song_request_type_label((string)($row["request_type"] ?? '')),
      "status" => (string)($row["status"] ?? ''),
      "status_label" => wp_song_request_status_label((string)($row["status"] ?? '')),
      "title" => (string)($row["title_hy"] ?? $row["title"] ?? ''),
      "artist" => (string)($row["artist"] ?? ''),
      "song_key" => (string)($row["song_key"] ?? ''),
      "bpm" => (int)($row["bpm"] ?? 0),
      "tags" => (string)($row["tags"] ?? ''),
      "submitted_message" => (string)($row["submitted_message"] ?? ''),
      "review_note" => (string)($row["review_note"] ?? ''),
      "created_at" => (string)($row["created_at"] ?? ''),
      "reviewed_at" => (string)($row["reviewed_at"] ?? ''),
    ];
  }, $rows);

  $rows = wp_translation_translate_rows($rows, [
    'title' => 'account.song_requests.title',
    'artist' => 'account.song_requests.artist',
    'tags' => 'account.song_requests.tags',
    'submitted_message' => 'account.song_requests.submitted_message',
    'review_note' => 'account.song_requests.review_note',
  ], $lang);
  $rows = wp_translation_localize_row_fields($rows, [
    'title' => 'account.song_requests.title',
  ], $lang);

  out($rows);
}

// ✅ POST clear recent viewed songs
if($action === 'clear_recent_views' && $method === 'POST'){
  $st = $pdo->prepare("DELETE FROM recent_views WHERE user_id=?");
  $st->execute([$uid]);

  out(["ok"=>true]);
}



// ✅ POST set pending_email only (do NOT change email yet)
if($action === 'update_email_only' && $method === 'POST'){
    
    
  $d = readJson();
  $email = trim((string)($d["email"] ?? ''));

  if($email === '') out(["error"=>"Email required"], 400);
  if(strlen($email) > 190) out(["error"=>"Email too long"], 400);
  if(!filter_var($email, FILTER_VALIDATE_EMAIL)) out(["error"=>"Invalid email"], 400);
  
  // reject if same as current email or same as existing pending_email
$st = $pdo->prepare("SELECT email, pending_email FROM users WHERE id=? LIMIT 1");
$st->execute([$uid]);
$row = $st->fetch(PDO::FETCH_ASSOC);

$cur = strtolower(trim((string)($row['email'] ?? '')));
$pend = strtolower(trim((string)($row['pending_email'] ?? '')));
$req = strtolower(trim($email));

if($req === $cur || ($pend !== '' && $req === $pend)){
  out(["error"=>"Same email - nothing to change"], 409);
}

  // unique check: email + pending_email
  $st = $pdo->prepare("SELECT id FROM users 
    WHERE (LOWER(email)=LOWER(?) OR LOWER(pending_email)=LOWER(?)) AND id<>? 
    LIMIT 1");
  $st->execute([$email, $email, $uid]);
  if($st->fetchColumn()){
    out(["error"=>"Email already in use"], 409);
  }

  $pdo->prepare("UPDATE users SET pending_email=? WHERE id=?")->execute([$email, $uid]);

  out(["ok"=>true, "pending_email"=>$email]);
  
  
}

// ✅ POST change password
if($action === 'change_password' && $method === 'POST'){
  $d = readJson();
  $current = (string)($d["current_password"] ?? '');
  $newpass = (string)($d["new_password"] ?? '');

  if(strlen($newpass) < $minPasswordLength) out(["error"=>"New password must be at least {$minPasswordLength} characters"], 400);
  if(strlen($newpass) > 200) out(["error"=>"New password too long"], 400);

  $st = $pdo->prepare("SELECT password_hash, email_verified_at, pending_email FROM users WHERE id=? LIMIT 1");
$st->execute([$uid]);
$row = $st->fetch(PDO::FETCH_ASSOC);
if(!$row) out(["error"=>"User not found"], 404);

// ✅ NEW: block if not verified
if(empty($row["email_verified_at"])){
  out(["error"=>"Գաղտնաբառը փոխելու համար նախ պետք է հաստատել email-ը։"], 403);
}
if(!empty($row["pending_email"])){
  out(["error"=>"Email-ը սպասում է հաստատման։ Նախ հաստատիր նոր email-ը, հետո փոխիր գաղտնաբառը։"], 403);
}

  if(!password_verify($current, $row["password_hash"])){
    out(["error"=>"Current password is incorrect"], 401);
  }

  $hash = password_hash($newpass, PASSWORD_DEFAULT);
  $st = $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?");
  $st->execute([$hash, $uid]);

  out(["ok"=>true]);
}
// ✅ POST delete account (danger zone)
if($action === 'delete_account' && $method === 'POST'){
  $d = readJson();
  $password = (string)($d["password"] ?? '');

  if($password === '' || strlen($password) < $minPasswordLength){
    out(["error"=>"Գրիր գաղտնաբառը"], 400);
  }

  // 1) Check password
  $st = $pdo->prepare("SELECT password_hash, email_verified_at, pending_email FROM users WHERE id=? LIMIT 1");
  $st->execute([$uid]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
// ✅ Require verified email AND no pending email change
if(empty($row["email_verified_at"])){
  out(["error"=>"Օգտահաշիվը ջնջելու համար նախ պետք է հաստատել email-ը։"], 403);
}
if(!empty($row["pending_email"])){
  out(["error"=>"Email-ը սպասում է հաստատման։ Նախ հաստատիր նոր email-ը, հետո ջնջիր օգտահաշիվը։"], 403);
}

  // 2) Delete related data + user (transaction)
  $pdo->beginTransaction();
  try{
    // favorites table (եթե կա)
    try{
      $pdo->prepare("DELETE FROM favorites WHERE user_id=?")->execute([$uid]);
    }catch(Exception $e){ /* եթե չունես այս table-ը՝ թող անտեսի */ }
    // recent_views մաքրումը (եթե կա)
    try{
      $pdo->prepare("DELETE FROM recent_views WHERE user_id=?")->execute([$uid]);
    }catch(Exception $e){}
    // password_resets table (եթե կա)
    try{
      $pdo->prepare("DELETE FROM password_resets WHERE user_id=?")->execute([$uid]);
    }catch(Exception $e){}
    try{
      $pdo->prepare("DELETE FROM user_sessions WHERE user_id=?")->execute([$uid]);
    }catch(Exception $e){}

    // user
    $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$uid]);

    $pdo->commit();
  }catch(Exception $e){
    $pdo->rollBack();
    out(["error"=>"Server error"], 500);
  }

  // 3) Clear session + remember cookie
  $_SESSION = [];
  if(session_id()) session_destroy();

  wp_auth_clear_remember_cookie();

  out(["ok"=>true]);
}

// ✅ GET email verification status (supports pending_email)
if($action === 'email_status' && $method === 'GET'){
  $st = $pdo->prepare("SELECT email, pending_email, email_verified_at FROM users WHERE id=? LIMIT 1");
  $st->execute([$uid]);
  $u = $st->fetch(PDO::FETCH_ASSOC);
  if(!$u) out(["error"=>"User not found"], 404);

  out([
    "ok" => true,
    "status" => [
      "email" => (string)($u["email"] ?? ''),
      "pending_email" => (string)($u["pending_email"] ?? ''),
      "verified" => !empty($u["email_verified_at"]),
      "pending" => !empty($u["pending_email"]),
    ]
  ]);
}




// ✅ POST send verification email (JSON only, no includes)
if($action === 'send_verify_email' && $method === 'POST'){

  // get user + target email
  $st = $pdo->prepare("SELECT name, email, pending_email, email_verified_at, email_last_verification_sent_at
                       FROM users WHERE id=? LIMIT 1");
  $st->execute([$uid]);
  $u = $st->fetch(PDO::FETCH_ASSOC);
  if(!$u) out(["error"=>"User not found"], 404);

  $targetEmail = trim((string)($u['pending_email'] ?? ''));
  if($targetEmail === '') $targetEmail = trim((string)($u['email'] ?? ''));

  if($targetEmail === '' || !filter_var($targetEmail, FILTER_VALIDATE_EMAIL)){
    out(["error"=>"Add a valid email first"], 400);
  }

  // եթե արդեն verified է ու pending չկա → պետք չէ
  if(!empty($u['email_verified_at']) && empty($u['pending_email'])){
    out(["ok"=>true, "alreadyVerified"=>true]);
  }

  // rate limit 60s
$st = $pdo->prepare("SELECT TIMESTAMPDIFF(SECOND, email_last_verification_sent_at, NOW()) AS diff
                     FROM users WHERE id=?");
$st->execute([$uid]);
$diff = (int)($st->fetchColumn() ?? 999999);

if($diff < 60){
  out(["ok"=>true, "sent"=>false, "rateLimited"=>true, "retry_in"=>60-$diff]);
}

  // token
  $token = bin2hex(random_bytes(32));
  $hash  = hash('sha256', $token);
  $expiresAt = (new DateTime('+30 minutes'))->format('Y-m-d H:i:s');

  $upd = $pdo->prepare("UPDATE users
  SET email_verify_token_hash=?,
      email_verify_expires_at=?
  WHERE id=?");
$upd->execute([$hash, $expiresAt, $uid]);
$pdo->prepare("UPDATE users SET email_last_verification_sent_at=NOW() WHERE id=?")
    ->execute([$uid]);

  // include mailer + build link
  require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';

  $baseUrl = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'worship.pmstudio.am');
  $link = $baseUrl . '/verify_email_confirm.php?token=' . urlencode($token);

  $name = trim((string)($u['name'] ?? 'User'));
  $res = send_verify_email($targetEmail, ($name === '' ? 'User' : $name), $link);

  if(!is_array($res) || empty($res['ok'])){
    $err = is_array($res) ? ($res['error'] ?? 'Unknown mail error') : 'Unknown mail error';
    out(["error"=>"MAIL ERROR: ".$err], 500);
  }

  out(["ok"=>true, "sent"=>true]);
}


// ✅ POST send password reset email (only if verified and no pending email)
// Uses password_resets table + send_reset_email() + /reset_password.php
if($action === 'forgot_password_email' && $method === 'POST'){
  try{
    // 1) load user
    $st = $pdo->prepare("SELECT id, email, name, email_verified_at, pending_email
                         FROM users WHERE id=? LIMIT 1");
    $st->execute([$uid]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if(!$u) out(["error"=>"User not found"], 404);

    if(empty($u["email_verified_at"])) out(["error"=>"Նախ պետք է հաստատել email-ը։"], 403);
    if(!empty($u["pending_email"])) out(["error"=>"Email-ը սպասում է հաստատման։ Նախ հաստատիր նոր email-ը։"], 403);

    $email = strtolower(trim((string)($u["email"] ?? '')));
    if($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)){
      out(["error"=>"Valid email not found"], 400);
    }

    // 2) rate limit 60s by last active request
    $st = $pdo->prepare("SELECT created_at
                         FROM password_resets
                         WHERE user_id=? AND used_at IS NULL AND expires_at > NOW()
                         ORDER BY created_at DESC
                         LIMIT 1");
    $st->execute([$uid]);
    $last = (string)($st->fetchColumn() ?? '');
    if($last !== ''){
      $diff = time() - strtotime($last);
      if($diff < 60){
        out(["ok"=>true, "sent"=>false, "rateLimited"=>true, "retry_in"=>60-$diff]);
      }
    }

    // 3) create token + insert record FIRST (so token is valid)
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = (new DateTime('+30 minutes'))->format('Y-m-d H:i:s');

    $ip = wp_runtime_remote_ip() ?: null;
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

    $ins = $pdo->prepare("INSERT INTO password_resets (user_id, token_hash, expires_at, ip, user_agent)
                          VALUES (?,?,?,?,?)");
    $ins->execute([(int)$u['id'], $tokenHash, $expiresAt, $ip, $ua]);
    $resetId = (int)$pdo->lastInsertId();

    // 4) send email
    require_once __DIR__ . '/lib/PHPMailer/inc/mailer.php';

    $baseUrl = 'https://worship.pmstudio.am';
    $next = '/account.html';
    $resetLink = $baseUrl . "/reset_password.php?token=" . urlencode($token) . "&next=" . urlencode($next);

    if(!function_exists('send_reset_email')){
      // cleanup row so it won't block next try
      $pdo->prepare("DELETE FROM password_resets WHERE id=?")->execute([$resetId]);
      out(["error"=>"Mailer function send_reset_email() not found"], 500);
    }

    $toName = (string)($u['name'] ?? '');
    $res = send_reset_email($email, $toName, $resetLink);

    if(!is_array($res) || empty($res['ok'])){
      // cleanup row so it won't rate-limit user
      $pdo->prepare("DELETE FROM password_resets WHERE id=?")->execute([$resetId]);
      $err = is_array($res) ? ($res['error'] ?? 'Unknown mail error') : 'Unknown mail error';
      out(["error"=>"MAIL ERROR: ".$err], 500);
    }

    out(["ok"=>true, "sent"=>true]);

  }catch(Exception $e){
    out(["error"=>"SERVER ERROR: ".$e->getMessage()], 500);
  }
}
out(["error"=>"Unknown action"], 404);
