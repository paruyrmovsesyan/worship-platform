<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();

// Check if column exists
$st = $pdo->query("SHOW COLUMNS FROM users LIKE 'last_active_at'");
if (!$st->fetch()) {
    $pdo->exec("ALTER TABLE users ADD COLUMN last_active_at DATETIME NULL");
    echo "Added last_active_at\n";
} else {
    echo "last_active_at already exists\n";
}
