<?php
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();

try {
    // Add columns to setlist_items
    $pdo->exec("ALTER TABLE setlist_items ADD COLUMN duration INT NULL DEFAULT NULL AFTER target_key;");
    $pdo->exec("ALTER TABLE setlist_items ADD COLUMN bpm INT NULL DEFAULT NULL AFTER duration;");
    echo "Added duration and bpm to setlist_items\n";
} catch (Exception $e) {
    echo "Columns already exist or error: " . $e->getMessage() . "\n";
}

try {
    // Create setlist_item_assignments table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS setlist_item_assignments (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            setlist_item_id INT UNSIGNED NOT NULL,
            user_id INT UNSIGNED NOT NULL,
            role_name VARCHAR(100) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_item (setlist_item_id),
            KEY idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "Created setlist_item_assignments table\n";
} catch (Exception $e) {
    echo "Table already exists or error: " . $e->getMessage() . "\n";
}

echo "Migration complete.\n";
