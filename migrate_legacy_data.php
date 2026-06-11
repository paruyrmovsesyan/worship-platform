<?php
declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/push_service.php';

header('Content-Type: text/plain; charset=utf-8');
echo "Starting verbose legacy data migration...\n\n";

try {
    $conn = wp_runtime_open_mysqli();
    
    // Explicitly check table creation
    echo "Checking tables...\n";
    if (!wp_runtime_ensure_admin_tables_mysqli($conn)) {
        echo "FAILED TO CREATE TABLES: " . $conn->error . "\n";
    } else {
        echo "Tables created/verified.\n";
    }

    // 1. Version Config
    $path = __DIR__ . '/legacy_data/version_config_store.php';
    if (is_file($path)) {
        $data = include $path;
        if (is_array($data)) {
            $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('version_config', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            if (!$stmt) throw new Exception("Prepare failed for version_config: " . $conn->error);
            $stmt->bind_param('s', $json);
            if (!$stmt->execute()) throw new Exception("Execute failed for version_config: " . $stmt->error);
            echo "- Migrated version_config_store.php\n";
        }
    }

    // 2. Push Config
    $path = __DIR__ . '/legacy_data/push_config_store.php';
    if (is_file($path)) {
        $data = include $path;
        if (is_array($data)) {
            $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('push_config', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            if (!$stmt) throw new Exception("Prepare failed for push_config: " . $conn->error);
            $stmt->bind_param('s', $json);
            if (!$stmt->execute()) throw new Exception("Execute failed for push_config: " . $stmt->error);
            echo "- Migrated push_config_store.php\n";
        }
    }

    // 3. Install Stats
    $path = __DIR__ . '/legacy_data/install_stats_store.json';
    if (is_file($path)) {
        $json = file_get_contents($path);
        $data = json_decode($json, true);
        if (is_array($data)) {
            $items = wp_install_canonicalize_items($data);
            $conn->query("TRUNCATE TABLE install_stats");
            $stmt = $conn->prepare("INSERT INTO install_stats (device_id, device_signature, scope, source, user_id, user_name, user_username, user_email, ip_address, user_agent, installed_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) throw new Exception("Prepare failed for install_stats: " . $conn->error);
            
            $successCount = 0;
            foreach ($items as $item) {
                $device_id = $item['device_id'] ?? '';
                $device_signature = $item['device_signature'] ?? '';
                $scope = $item['scope'] ?? 'main';
                $source = $item['source'] ?? '';
                $user_id = $item['user_id'] ?? 0;
                $user_name = $item['user_name'] ?? '';
                $user_username = $item['user_username'] ?? '';
                $user_email = $item['user_email'] ?? '';
                $ip_address = $item['ip_address'] ?? '';
                $user_agent = $item['user_agent'] ?? '';
                $installed_at = !empty($item['installed_at']) ? $item['installed_at'] : wp_version_now_iso();
                $last_seen_at = !empty($item['last_seen_at']) ? $item['last_seen_at'] : wp_version_now_iso();
                
                $stmt->bind_param('ssssisssssss', $device_id, $device_signature, $scope, $source, $user_id, $user_name, $user_username, $user_email, $ip_address, $user_agent, $installed_at, $last_seen_at);
                if (!$stmt->execute()) throw new Exception("Execute failed for install_stats (device $device_id): " . $stmt->error);
                $successCount++;
            }
            echo "- Migrated install_stats_store.json ($successCount records)\n";
        }
    }

    // 4. Push Subscriptions
    $path = __DIR__ . '/legacy_data/push_subscriptions_store.json';
    if (is_file($path)) {
        $json = file_get_contents($path);
        $data = json_decode($json, true);
        if (is_array($data)) {
            $conn->query("TRUNCATE TABLE push_subscriptions");
            $stmt = $conn->prepare("INSERT INTO push_subscriptions (id, endpoint, public_key, auth_key, user_agent, user_id, user_name, user_email, ip_address, created_at, updated_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) throw new Exception("Prepare failed for push_subscriptions: " . $conn->error);
            
            $successCount = 0;
            foreach ($data as $sub) {
                $id = $sub['id'] ?? wp_push_subscription_id($sub['endpoint'] ?? '');
                $endpoint = $sub['endpoint'] ?? '';
                $public_key = $sub['public_key'] ?? '';
                $auth_key = $sub['auth_key'] ?? '';
                $user_agent = $sub['user_agent'] ?? '';
                $user_id = $sub['user_id'] ?? 0;
                $user_name = $sub['user_name'] ?? '';
                $user_email = $sub['user_email'] ?? '';
                $ip_address = $sub['ip_address'] ?? '';
                $created_at = !empty($sub['created_at']) ? $sub['created_at'] : wp_version_now_iso();
                $updated_at = !empty($sub['updated_at']) ? $sub['updated_at'] : wp_version_now_iso();
                $last_seen_at = !empty($sub['last_seen_at']) ? $sub['last_seen_at'] : null;
                
                $stmt->bind_param('sssssissssss', $id, $endpoint, $public_key, $auth_key, $user_agent, $user_id, $user_name, $user_email, $ip_address, $created_at, $updated_at, $last_seen_at);
                if (!$stmt->execute()) throw new Exception("Execute failed for push_subscriptions (id $id): " . $stmt->error);
                $successCount++;
            }
            echo "- Migrated push_subscriptions_store.json ($successCount records)\n";
        }
    }

    // 5. Push Blocked
    $path = __DIR__ . '/legacy_data/push_blocked_store.json';
    if (is_file($path)) {
        $json = file_get_contents($path);
        $data = json_decode($json, true);
        if (is_array($data)) {
            $jsonVal = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $key = WP_PUSH_BLOCKED_KEY;
            $stmt->bind_param('ss', $key, $jsonVal);
            if (!$stmt->execute()) throw new Exception("Execute failed for push_blocked: " . $stmt->error);
            echo "- Migrated push_blocked_store.json (" . count($data) . " records)\n";
        }
    }

    // 6. Push Queue
    $path = __DIR__ . '/legacy_data/push_queue_store.json';
    if (is_file($path)) {
        $json = file_get_contents($path);
        $data = json_decode($json, true);
        if (is_array($data)) {
            $jsonVal = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $key = WP_PUSH_QUEUE_KEY;
            $stmt->bind_param('ss', $key, $jsonVal);
            if (!$stmt->execute()) throw new Exception("Execute failed for push_queue: " . $stmt->error);
            echo "- Migrated push_queue_store.json (" . count($data) . " records)\n";
        }
    }

    // 7. Version History
    $path = __DIR__ . '/legacy_data/version_history_store.jsonl';
    if (is_file($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            $conn->query("TRUNCATE TABLE version_history");
            $stmt = $conn->prepare("INSERT INTO version_history (id, at, actor, ip, action, changed_fields, snapshot, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) throw new Exception("Prepare failed for version_history: " . $conn->error);
            
            $successCount = 0;
            foreach ($lines as $line) {
                $decoded = json_decode($line, true);
                if (is_array($decoded)) {
                    $id = $decoded['id'] ?? bin2hex(random_bytes(16));
                    $at = !empty($decoded['at']) ? wp_version_normalize_datetime($decoded['at']) : wp_version_now_iso();
                    if (!$at) $at = wp_version_now_iso();
                    $actor = mb_substr(trim((string)($decoded['actor'] ?? 'system')), 0, 190);
                    $ip = mb_substr(trim((string)($decoded['ip'] ?? '')), 0, 80);
                    $action = mb_substr(trim((string)($decoded['action'] ?? 'update')), 0, 100);
                    $changed_fields = json_encode($decoded['changed_fields'] ?? [], JSON_UNESCAPED_UNICODE);
                    $snapshot = json_encode($decoded['snapshot'] ?? [], JSON_UNESCAPED_UNICODE);
                    $note = (string)($decoded['note'] ?? '');
                    
                    $stmt->bind_param('ssssssss', $id, $at, $actor, $ip, $action, $changed_fields, $snapshot, $note);
                    if (!$stmt->execute()) throw new Exception("Execute failed for version_history (id $id): " . $stmt->error);
                    $successCount++;
                }
            }
            echo "- Migrated version_history_store.jsonl ($successCount records)\n";
        }
    }

    // 8. Push History
    $path = __DIR__ . '/legacy_data/push_history_store.jsonl';
    if (is_file($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            $conn->query("TRUNCATE TABLE push_history");
            $stmt = $conn->prepare("INSERT INTO push_history (id, at, actor, title, body, url, icon, tag, devices_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            if (!$stmt) throw new Exception("Prepare failed for push_history: " . $conn->error);
            
            $successCount = 0;
            foreach ($lines as $line) {
                $decoded = json_decode($line, true);
                if (is_array($decoded)) {
                    $id = $decoded['id'] ?? bin2hex(random_bytes(8));
                    $at = !empty($decoded['created_at']) ? wp_version_normalize_datetime($decoded['created_at']) : wp_version_now_iso();
                    if (!$at) $at = wp_version_now_iso();
                    $actor = mb_substr(trim((string)($decoded['actor'] ?? 'admin')), 0, 190);
                    $title = mb_substr(trim((string)($decoded['title'] ?? '')), 0, 160);
                    $body = (string)($decoded['body'] ?? '');
                    $url = mb_substr(trim((string)($decoded['url'] ?? '')), 0, 260);
                    $icon = mb_substr(trim((string)($decoded['icon'] ?? '')), 0, 260);
                    $tag = mb_substr(trim((string)($decoded['tag'] ?? '')), 0, 100);
                    $devices_count = (int)($decoded['queued'] ?? 0);
                    
                    $stmt->bind_param('ssssssssi', $id, $at, $actor, $title, $body, $url, $icon, $tag, $devices_count);
                    if (!$stmt->execute()) throw new Exception("Execute failed for push_history (id $id): " . $stmt->error);
                    $successCount++;
                }
            }
            echo "- Migrated push_history_store.jsonl ($successCount records)\n";
        }
    }

    echo "\nMigration completed successfully!\n";

} catch (Throwable $e) {
    echo "ERROR STOP: " . $e->getMessage() . "\n";
}
