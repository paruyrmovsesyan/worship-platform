<?php
declare(strict_types=1);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/runtime_config.php';

header('Content-Type: text/plain; charset=utf-8');
echo "Testing DB Connection & Schema Creation...\n\n";

try {
    $conn = wp_runtime_open_mysqli();
    echo "1. DB Connection OK.\n";
    
    // Explicitly call ensure tables to see if it throws error
    if (function_exists('wp_runtime_ensure_admin_tables_mysqli')) {
        $result = wp_runtime_ensure_admin_tables_mysqli($conn);
        echo "2. Ensure tables returned: " . ($result ? 'true' : 'false') . "\n";
    }

    // Check tables
    $result = $conn->query("SHOW TABLES LIKE 'sys_settings'");
    if ($result && $result->num_rows > 0) {
        echo "3. Table 'sys_settings' exists.\n";
    } else {
        echo "3. Table 'sys_settings' DOES NOT EXIST.\n";
        echo "   MySQL Error: " . $conn->error . "\n";
    }
    
    // Test direct insert
    $conn->query("CREATE TABLE IF NOT EXISTS sys_settings (setting_key VARCHAR(100) NOT NULL PRIMARY KEY, setting_value LONGTEXT NULL)");
    if ($conn->error) {
         echo "4. Create Table Error: " . $conn->error . "\n";
    }
    
    $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('test_key', 'test_val') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
    if (!$stmt) {
        echo "5. Prepare Error: " . $conn->error . "\n";
    } else {
        $stmt->execute();
        if ($stmt->error) {
            echo "6. Execute Error: " . $stmt->error . "\n";
        } else {
            echo "6. Test Insert OK.\n";
        }
    }

    // Check actual script operations
    $path = __DIR__ . '/legacy_data/version_history_store.jsonl';
    if (is_file($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines) && count($lines) > 0) {
            $entry = json_decode($lines[0], true);
            echo "7. Attempting to insert 1 version_history record...\n";
            $stmt = $conn->prepare("INSERT INTO version_history (id, at, actor, ip, action, changed_fields, snapshot, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) {
                echo "   Prepare Error: " . $conn->error . "\n";
            } else {
                $id = $entry['id'] ?? bin2hex(random_bytes(16));
                $at = $entry['at'] ?? '';
                $actor = $entry['actor'] ?? '';
                $ip = $entry['ip'] ?? '';
                $action = $entry['action'] ?? '';
                $changed_fields = json_encode($entry['changed_fields'] ?? [], JSON_UNESCAPED_UNICODE);
                $snapshot = json_encode($entry['snapshot'] ?? [], JSON_UNESCAPED_UNICODE);
                $note = $entry['note'] ?? '';
                $stmt->bind_param('ssssssss', $id, $at, $actor, $ip, $action, $changed_fields, $snapshot, $note);
                if (!$stmt->execute()) {
                    echo "   Execute Error: " . $stmt->error . "\n";
                } else {
                    echo "   Insert OK.\n";
                }
            }
        }
    }

} catch (Throwable $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
}
