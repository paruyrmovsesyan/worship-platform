<?php
ini_set('display_errors', 1); error_reporting(E_ALL);
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->query("SELECT chat_id, COUNT(*) as cnt FROM chat_messages GROUP BY chat_id ORDER BY cnt DESC LIMIT 1");
$row = $st->fetch(PDO::FETCH_ASSOC);
print_r($row);

if ($row) {
    $chat_id = $row['chat_id'];
    $st = $pdo->prepare("
        SELECT m.id, m.user_id, u.name as user_name, m.message, m.setlist_id, m.created_at
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
        LIMIT 100
    ");
    $st->execute([$chat_id]);
    $messages = $st->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($messages) . " messages for chat $chat_id.\n";
} else {
    echo "No chat messages found at all!\n";
}
