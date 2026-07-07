<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->query("SELECT * FROM chats ORDER BY id DESC LIMIT 5");
print_r($st->fetchAll(PDO::FETCH_ASSOC));
$st = $pdo->query("SELECT * FROM chat_participants ORDER BY chat_id DESC LIMIT 5");
print_r($st->fetchAll(PDO::FETCH_ASSOC));
