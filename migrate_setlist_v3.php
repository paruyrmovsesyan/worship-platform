<?php
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "<h3>Սկսվում է երգացանկերի բազայի թարմացումը v3...</h3>";

    // 1. Add transition_type to setlist_items
    try {
        $pdo->exec("ALTER TABLE setlist_items ADD COLUMN transition_type VARCHAR(20) NULL");
        echo "Ավելացվեց 'transition_type' դաշտը setlist_items աղյուսակում։<br>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "'transition_type' դաշտը արդեն գոյություն ունի։<br>";
        } else {
            throw $e;
        }
    }

    // 2. Create setlist_assignments table for Team Scheduling
    $pdo->exec("CREATE TABLE IF NOT EXISTS setlist_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setlist_id INT NOT NULL,
        user_id INT NOT NULL,
        role_name VARCHAR(100) NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_assignment (setlist_id, user_id),
        KEY idx_setlist (setlist_id),
        KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Ստեղծվեց 'setlist_assignments' աղյուսակը (Թիմի Նշանակումներ)։<br>";

    // 3. Create song_attachments table for Links/Files
    $pdo->exec("CREATE TABLE IF NOT EXISTS song_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        song_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'link',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_song (song_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Ստեղծվեց 'song_attachments' աղյուսակը (Երգերի կցորդներ)։<br>";

    echo "<h3 style='color:green;'>Բազայի թարմացումը v3 հաջողությամբ ավարտվեց։</h3>";

} catch (PDOException $e) {
    echo "<h3 style='color:red;'>Սխալ՝ " . htmlspecialchars($e->getMessage()) . "</h3>";
}
?>
