<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();

$st = $pdo->query("SHOW COLUMNS FROM chat_participants LIKE 'cleared_at'");
if (!$st->fetch()) {
    $pdo->exec("ALTER TABLE chat_participants ADD COLUMN cleared_at DATETIME NULL");
    echo "Added cleared_at\n";
} else {
    echo "cleared_at already exists\n";
}
