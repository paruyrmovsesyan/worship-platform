<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'runtime_config.php';
$pdo = wp_runtime_open_pdo();

echo "<h1>Diagnostic & Fix Tool</h1>";

try {
    $pdo->exec("ALTER TABLE users 
                ADD COLUMN birth_date DATE DEFAULT NULL, 
                ADD COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say') DEFAULT NULL, 
                ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL");
    echo "<p style='color:green;'>Database columns added successfully.</p>";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "<p style='color:blue;'>Database already has the new columns.</p>";
    } else {
        echo "<p style='color:red;'>Database Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
}

try {
    $stmt = $pdo->prepare("SELECT name, username, email, birth_date, gender, phone_number FROM users LIMIT 1");
    $stmt->execute();
    echo "<p style='color:green;'>Test query succeeded! auth_me.php should no longer throw 500.</p>";
} catch (Exception $e) {
    echo "<p style='color:red;'>Test query failed: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
