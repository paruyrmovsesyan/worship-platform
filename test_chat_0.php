<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->query("SELECT * FROM chat_participants WHERE chat_id = 0");
print_r($st->fetchAll(PDO::FETCH_ASSOC));
