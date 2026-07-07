<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();

try {
    $st = $pdo->query("SHOW COLUMNS FROM chat_participants LIKE 'cleared_at'");
    if (!$st->fetch()) {
        $pdo->exec("ALTER TABLE chat_participants ADD COLUMN cleared_at DATETIME NULL");
        echo "Successfully added 'cleared_at' to chat_participants.<br>\n";
    } else {
        echo "'cleared_at' already exists.<br>\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "<br>\n";
}
echo "Done.";
