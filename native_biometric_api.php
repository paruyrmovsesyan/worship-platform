<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/auth_bootstrap.php';

function native_bio_out(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (trim((string)($_SERVER['HTTP_X_WORSHIP_NATIVE'] ?? '')) !== '1') {
    native_bio_out(['ok' => false, 'error' => 'Native app request required'], 403);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    native_bio_out(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$payload = json_decode((string)file_get_contents('php://input'), true);
$payload = is_array($payload) ? $payload : [];
$action = strtolower(trim((string)($_GET['action'] ?? '')));
$pdo = wp_auth_open_pdo();
if (!$pdo) native_bio_out(['ok' => false, 'error' => 'Ծառայությունը ժամանակավորապես անհասանելի է'], 503);

if ($action === 'issue') {
    if (empty($_SESSION['user_id']) || !wp_auth_current_session_backed($pdo)) {
        native_bio_out(['ok' => false, 'error' => 'Նորից մուտքագրեք գաղտնաբառը'], 401);
    }

    $uid = (int)$_SESSION['user_id'];
    $rowId = (int)($_SESSION['user_session_row_id'] ?? 0);
    if ($rowId <= 0) {
        $find = $pdo->prepare('SELECT id FROM user_sessions WHERE user_id=? AND session_key=? AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY id DESC LIMIT 1');
        $find->execute([$uid, session_id()]);
        $rowId = (int)($find->fetchColumn() ?: 0);
    }
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $validator);
    $expiresAt = wp_auth_remember_session_expires_at();

    $st = $pdo->prepare('UPDATE user_sessions SET selector=?, token_hash=?, remembered=1, expires_at=?, last_used_at=NOW() WHERE id=? AND user_id=? LIMIT 1');
    $st->execute([$selector, $tokenHash, $expiresAt, $rowId, $uid]);
    if ($st->rowCount() < 1) native_bio_out(['ok' => false, 'error' => 'Մուտքի սեսիան չի գտնվել'], 401);

    wp_auth_issue_remember_cookie($selector, $validator);
    $_SESSION['auth_via_remember'] = 1;
    native_bio_out([
        'ok' => true,
        'token' => $selector . ':' . $validator,
        'account' => (string)($payload['account'] ?? $_SESSION['email'] ?? $_SESSION['username'] ?? ''),
    ]);
}

if ($action === 'login') {
    $token = trim((string)($payload['token'] ?? ''));
    $parts = explode(':', $token, 2);
    if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
        native_bio_out(['ok' => false, 'error' => 'Face ID մուտքը նորից կարգավորեք գաղտնաբառով'], 401);
    }

    wp_auth_clear_session_user(false);
    $_COOKIE['remember_me'] = $token;
    if (!wp_auth_restore_from_remember_cookie($pdo) || empty($_SESSION['user_id'])) {
        native_bio_out(['ok' => false, 'error' => 'Face ID մուտքը ժամկետանց է։ Մուտքագրեք գաղտնաբառը մեկ անգամ'], 401);
    }

    wp_auth_issue_remember_cookie($parts[0], $parts[1]);
    $st = $pdo->prepare('SELECT id, name, username, email FROM users WHERE id=? AND COALESCE(is_blocked,0)=0 LIMIT 1');
    $st->execute([(int)$_SESSION['user_id']]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    if (!$user) native_bio_out(['ok' => false, 'error' => 'Օգտատերը հասանելի չէ'], 401);

    native_bio_out(['ok' => true, 'user' => [
        'id' => (int)$user['id'],
        'name' => (string)($user['name'] ?? ''),
        'username' => (string)($user['username'] ?? ''),
        'email' => (string)($user['email'] ?? ''),
    ]]);
}

native_bio_out(['ok' => false, 'error' => 'Unknown action'], 404);
