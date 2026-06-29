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

// 1. List chats the user is in
if ($action === 'list_chats' && $method === 'GET') {
    $st = $pdo->prepare("
        SELECT c.id, c.type, c.name,
               (SELECT message FROM chat_messages m WHERE m.chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM chat_messages m WHERE m.chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
               (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM chat_participants cp2 JOIN users u ON cp2.user_id = u.id WHERE cp2.chat_id = c.id AND u.id != ?) as participant_names
        FROM chats c
        JOIN chat_participants cp ON cp.chat_id = c.id
        WHERE cp.user_id = ?
        ORDER BY last_message_at DESC
    ");
    $st->execute([$uid, $uid]);
    out(["ok" => true, "chats" => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

// 2. Get or create direct chat with a friend
if ($action === 'get_direct_chat' && $method === 'POST') {
    $d = readJson();
    $friend_id = (int)($d['user_id'] ?? 0);
    
    // Check if they are friends
    $st = $pdo->prepare("SELECT status FROM friends WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'");
    $st->execute([$uid, $friend_id, $friend_id, $uid]);
    if (!$st->fetch()) {
        out(["error" => "Not friends"], 403);
    }
    
    // Check if direct chat exists
    $st = $pdo->prepare("
        SELECT c.id FROM chats c
        JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
        JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
        WHERE c.type = 'direct'
        LIMIT 1
    ");
    $st->execute([$uid, $friend_id]);
    $chat_id = $st->fetchColumn();
    
    if (!$chat_id) {
        $pdo->beginTransaction();
        $st = $pdo->prepare("INSERT INTO chats (type, created_by) VALUES ('direct', ?)");
        $st->execute([$uid]);
        $chat_id = $pdo->lastInsertId();
        
        $st = $pdo->prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?), (?, ?)");
        $st->execute([$chat_id, $uid, $chat_id, $friend_id]);
        $pdo->commit();
    }
    
    out(["ok" => true, "chat_id" => (int)$chat_id]);
}

// 3. Get messages for a chat
if ($action === 'get_messages' && $method === 'GET') {
    $chat_id = (int)($_GET['chat_id'] ?? 0);
    
    // Check access
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    if (!$st->fetch()) out(["error" => "Access denied"], 403);
    
    $st = $pdo->prepare("
        SELECT m.id, m.user_id, u.name as user_name, m.message, m.setlist_id, m.created_at
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
        LIMIT 100
    ");
    $st->execute([$chat_id]);
    out(["ok" => true, "messages" => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

// 4. Send a message
if ($action === 'send_message' && $method === 'POST') {
    $d = readJson();
    $chat_id = (int)($d['chat_id'] ?? 0);
    $message = trim($d['message'] ?? '');
    $setlist_id = (int)($d['setlist_id'] ?? 0);
    
    // Check access
    $st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?");
    $st->execute([$chat_id, $uid]);
    if (!$st->fetch()) out(["error" => "Access denied"], 403);
    
    if ($message === '' && $setlist_id === 0) out(["error" => "Empty message"], 400);
    
    $st = $pdo->prepare("INSERT INTO chat_messages (chat_id, user_id, message, setlist_id) VALUES (?, ?, ?, ?)");
    $st->execute([$chat_id, $uid, $message, $setlist_id > 0 ? $setlist_id : null]);
    
    $st = $pdo->prepare("SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?");
    $st->execute([$chat_id, $uid]);
    $others = $st->fetchAll(PDO::FETCH_COLUMN);

    if ($setlist_id > 0) {
        // Copy setlist for each other participant
        require_once __DIR__ . '/setlists_api.php'; // or duplicate logic manually if needed
        // For simplicity, manually copy setlist
        $st_set = $pdo->prepare("SELECT * FROM setlists WHERE id = ?");
        $st_set->execute([$setlist_id]);
        $setlist = $st_set->fetch(PDO::FETCH_ASSOC);
        
        if ($setlist) {
            foreach ($others as $oid) {
                $st_ins = $pdo->prepare("INSERT INTO setlists (user_id, name, description, service_date, service_type, status) VALUES (?, ?, ?, ?, ?, ?)");
                $st_ins->execute([$oid, $setlist['name'] . " (Shared)", $setlist['description'], $setlist['service_date'], $setlist['service_type'], $setlist['status']]);
                $new_setlist_id = $pdo->lastInsertId();
                
                // Copy items
                $st_items = $pdo->prepare("SELECT * FROM setlist_items WHERE setlist_id = ?");
                $st_items->execute([$setlist_id]);
                $items = $st_items->fetchAll(PDO::FETCH_ASSOC);
                foreach ($items as $item) {
                    $st_item_ins = $pdo->prepare("INSERT INTO setlist_items (setlist_id, song_id, item_order, song_key, notes, custom_title, is_divider, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    $st_item_ins->execute([$new_setlist_id, $item['song_id'], $item['item_order'], $item['song_key'], $item['notes'], $item['custom_title'], $item['is_divider'], $item['duration_seconds']]);
                }
            }
        }
    }
    
    // Send push to other participants
    require_once __DIR__ . '/push_service.php';
    $senderName = $_SESSION['user_name'] ?? 'Someone';
    
    foreach ($others as $oid) {
        $push_msg = $setlist_id > 0 ? "Shared a setlist" : mb_substr($message, 0, 50);
        wp_push_send_to_user($pdo, (int)$oid, "New message from $senderName", $push_msg, "/chat/$chat_id");
    }
    
    out(["ok" => true]);
}

// 5. Create Group
if ($action === 'create_group' && $method === 'POST') {
    $d = readJson();
    $name = trim($d['name'] ?? 'Group Chat');
    $friend_ids = $d['friend_ids'] ?? []; // array of IDs
    
    if (empty($friend_ids) || !is_array($friend_ids)) out(["error" => "No friends selected"], 400);
    
    $pdo->beginTransaction();
    $st = $pdo->prepare("INSERT INTO chats (type, name, created_by) VALUES ('group', ?, ?)");
    $st->execute([$name, $uid]);
    $chat_id = $pdo->lastInsertId();
    
    $st = $pdo->prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)");
    $st->execute([$chat_id, $uid]); // add creator
    
    foreach ($friend_ids as $fid) {
        // verify friendship
        $st2 = $pdo->prepare("SELECT status FROM friends WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)) AND status = 'accepted'");
        $st2->execute([$uid, $fid, $fid, $uid]);
        if ($st2->fetch()) {
            $st->execute([$chat_id, $fid]);
        }
    }
    $pdo->commit();
    out(["ok" => true, "chat_id" => (int)$chat_id]);
}

out(["error" => "Invalid action"], 400);
