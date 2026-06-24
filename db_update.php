<?php
require 'runtime_config.php';
$pdo = wp_runtime_open_pdo();

try {
    $pdo->exec("ALTER TABLE users 
                ADD COLUMN birth_date DATE DEFAULT NULL, 
                ADD COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say') DEFAULT NULL, 
                ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL");
    echo "<h1>Database Updated Successfully!</h1><p>You can now log in.</p>";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "<h1>Database Already Updated!</h1><p>The columns already exist. You can log in.</p>";
    } else {
        echo "<h1>Error</h1><p>" . htmlspecialchars($e->getMessage()) . "</p>";
    }
}
// delete itself after running
@unlink(__FILE__);
?>
