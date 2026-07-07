<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'get_messages';
$_GET['chat_id'] = '999';
$_SESSION['user_id'] = 1;
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$uid = 1;
$chat_id = 999;
$st = $pdo->prepare("SELECT cleared_at FROM chat_participants WHERE chat_id = ? AND user_id = ?");
$st->execute([$chat_id, $uid]);
$cleared_at = $st->fetchColumn();
$st = $pdo->prepare("SELECT type, name FROM chats WHERE id = ?");
$st->execute([$chat_id]);
$chat_info = $st->fetch(PDO::FETCH_ASSOC);
$stCount = $pdo->prepare("SELECT COUNT(*) FROM chat_participants WHERE chat_id = ?");
$stCount->execute([$chat_id]);
$pCount = (int)$stCount->fetchColumn();
if ($chat_info && ($chat_info['type'] === 'direct' || $pCount <= 2)) {
    $st = $pdo->prepare("SELECT u.name, u.email, u.last_active_at, TIMESTAMPDIFF(SECOND, u.last_active_at, NOW()) as seconds_since_active FROM chat_participants cp JOIN users u ON cp.user_id = u.id WHERE cp.chat_id = ? AND u.id != ?");
    $st->execute([$chat_id, $uid]);
    $other = $st->fetch(PDO::FETCH_ASSOC);
    if ($other) {
        $chat_info['display_name'] = !empty($other['name']) ? $other['name'] : explode('@', $other['email'])[0];
        $chat_info['last_active_at'] = $other['last_active_at'];
        $chat_info['seconds_since_active'] = $other['seconds_since_active'];
    } else {
        $chat_info['display_name'] = 'Ընկեր';
    }
} else if ($chat_info) {
    $chat_info['display_name'] = !empty($chat_info['name']) ? $chat_info['name'] : 'Խումբ';
}
$st = $pdo->prepare("SELECT m.id, m.user_id, u.name as user_name, m.message, m.setlist_id, m.created_at FROM chat_messages m JOIN users u ON m.user_id = u.id WHERE m.chat_id = ? AND (? IS NULL OR m.created_at > ?) ORDER BY m.created_at ASC LIMIT 100");
$st->execute([$chat_id, $cleared_at, $cleared_at]);
print_r(["ok" => true, "chat_info" => $chat_info ?: ["display_name" => "Չաթ"], "messages" => $st->fetchAll(PDO::FETCH_ASSOC)]);
