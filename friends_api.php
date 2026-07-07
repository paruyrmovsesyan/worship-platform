<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

function out($arr, $code = 200){
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (empty($_SESSION['user_id'])) {
  out(["error" => "Unauthorized"], 401);
}

try {
  $pdo = wp_runtime_open_pdo();
  $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
  out(["error" => "DB connection failed"], 500);
}

$uid = (int)$_SESSION['user_id'];

function readJson(){
  $raw = file_get_contents("php://input");
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function wp_friends_current_user_display_name(PDO $pdo, int $uid): string {
    $name = trim((string)($_SESSION['name'] ?? $_SESSION['username'] ?? ''));
    if ($name !== '') {
        return $name;
    }

    try {
        $st = $pdo->prepare("SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), email) FROM users WHERE id = ? LIMIT 1");
        $st->execute([$uid]);
        $dbName = trim((string)$st->fetchColumn());
        if ($dbName !== '') {
            return $dbName;
        }
    } catch (Throwable $e) {}

    return 'Someone';
}

if ($action === 'search_users' && $method === 'GET') {
    $q = trim($_GET['q'] ?? '');
    if (strlen($q) < 2) {
        out(["ok" => true, "users" => []]);
    }
    
    $st = $pdo->prepare("SELECT id, name, email FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 20");
    $lk = "%" . $q . "%";
    $st->execute([$lk, $lk, $uid]);
    $users = $st->fetchAll(PDO::FETCH_ASSOC);
    
    // Check friend status for each
    foreach ($users as &$u) {
        $st2 = $pdo->prepare("SELECT status FROM friends WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)");
        $st2->execute([$uid, $u['id'], $u['id'], $uid]);
        $fs = $st2->fetch(PDO::FETCH_ASSOC);
        $u['friend_status'] = $fs ? $fs['status'] : null;
        if ($fs && $fs['status'] === 'pending') {
            // Check who sent it
            $st3 = $pdo->prepare("SELECT user_id_1 FROM friends WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)");
            $st3->execute([$uid, $u['id'], $u['id'], $uid]);
            $sender = $st3->fetchColumn();
            $u['is_requester'] = ($sender == $uid);
        }
    }
    unset($u);
    out(["ok" => true, "users" => $users]);
}

if (($action === 'list' || $action === 'get_friends') && $method === 'GET') {
    $st = $pdo->prepare("
        SELECT f.user_id_1, f.user_id_2, f.status,
               IF(f.user_id_1 = ?, u2.id, u1.id) as friend_id,
               IF(f.user_id_1 = ?, u2.name, u1.name) as name,
               IF(f.user_id_1 = ?, u2.email, u1.email) as email,
               f.user_id_1 as requester_id
        FROM friends f
        JOIN users u1 ON f.user_id_1 = u1.id
        JOIN users u2 ON f.user_id_2 = u2.id
        WHERE f.user_id_1 = ? OR f.user_id_2 = ?
    ");
    $st->execute([$uid, $uid, $uid, $uid, $uid]);
    $list = $st->fetchAll(PDO::FETCH_ASSOC);

    if ($action === 'get_friends') {
        $list = array_values(array_filter($list, static function ($row) {
            return (string)($row['status'] ?? '') === 'accepted';
        }));
    }
    
    out(["ok" => true, "friends" => $list]);
}

if ($action === 'add' && $method === 'POST') {
    $d = readJson();
    $friend_id = (int)($d['user_id'] ?? 0);
    if ($friend_id === 0 || $friend_id === $uid) {
        out(["error" => "Invalid user"], 400);
    }
    
    $st = $pdo->prepare("SELECT status FROM friends WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)");
    $st->execute([$uid, $friend_id, $friend_id, $uid]);
    if ($st->fetch()) {
        out(["error" => "Already requested or friends"], 400);
    }
    
    $st = $pdo->prepare("INSERT INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, 'pending')");
    $st->execute([$uid, $friend_id]);
    
    require_once __DIR__ . '/push_service.php';
    $senderName = wp_friends_current_user_display_name($pdo, $uid);
    
    // Fetch recipient's language
    $stLang = $pdo->prepare("SELECT language FROM users WHERE id = ?");
    $stLang->execute([$friend_id]);
    $lang = $stLang->fetchColumn() ?: 'am';
    
    $push_title = "New Friend Request";
    $push_msg = "$senderName wants to be your friend.";
    $notif_text = "$senderName wants to be your friend.";
    
    if ($lang === 'am') {
        $push_title = "Նոր ընկերության հարցում";
        $push_msg = "$senderName-ը ցանկանում է դառնալ ձեր ընկերը:";
        $notif_text = "$senderName-ը ցանկանում է դառնալ ձեր ընկերը:";
    } elseif ($lang === 'ru') {
        $push_title = "Новый запрос в друзья";
        $push_msg = "$senderName хочет добавить вас в друзья.";
        $notif_text = "$senderName хочет добавить вас в друзья.";
    }

    $pushResult = wp_push_send_to_user($pdo, $friend_id, $push_title, $push_msg, "/friends");

    $st_notif = $pdo->prepare("INSERT INTO user_notifications (user_id, sender_id, type, content, action_link) VALUES (?, ?, 'friend_request', ?, '/friends')");
    $st_notif->execute([$friend_id, $uid, json_encode(['text' => $notif_text])]);

    out([
        "ok" => true,
        "push" => [
            "ok" => !empty($pushResult['ok']),
            "success_count" => (int)($pushResult['success_count'] ?? 0),
            "message" => (string)($pushResult['message'] ?? ''),
        ],
    ]);
}

if ($action === 'accept' && $method === 'POST') {
    $d = readJson();
    $friend_id = (int)($d['user_id'] ?? 0);
    
    $st = $pdo->prepare("UPDATE friends SET status = 'accepted' WHERE user_id_1 = ? AND user_id_2 = ? AND status = 'pending'");
    $st->execute([$friend_id, $uid]); 
    
    if ($st->rowCount() > 0) {
        require_once __DIR__ . '/push_service.php';
        $senderName = wp_friends_current_user_display_name($pdo, $uid);
        $st_notif = $pdo->prepare("INSERT INTO user_notifications (user_id, sender_id, type, content, action_link) VALUES (?, ?, 'friend_accepted', ?, '/friends')");
        $st_notif->execute([$friend_id, $uid, json_encode(['text' => "$senderName accepted your friend request."])]);

        wp_push_send_to_user($pdo, $friend_id, "Friend request accepted", "$senderName accepted your friend request.", "/friends");

        out(["ok" => true]);
    } else {
        out(["error" => "No pending request found"], 400);
    }
}

if ($action === 'remove' && $method === 'POST') {
    $d = readJson();
    $friend_id = (int)($d['user_id'] ?? 0);
    
    $st = $pdo->prepare("DELETE FROM friends WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)");
    $st->execute([$uid, $friend_id, $friend_id, $uid]);
    
    out(["ok" => true]);
}

out(["error" => "Invalid action"], 400);
