<?php
require_once 'runtime_config.php';
require_once 'version_config.php';

try {
    $pdo = wp_runtime_open_pdo();
    $config = wp_version_load();
    $config['updated_at'] = wp_version_now_iso();
    $json = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    $stmt = $pdo->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('version_config', :json) ON DUPLICATE KEY UPDATE setting_value = :json2");
    $saved = $stmt->execute([':json' => $json, ':json2' => $json]);
    echo "Saved via PDO: " . ($saved ? 'true' : 'false') . "\n";
} catch (Throwable $e) {
    echo "PDO Error: " . $e->getMessage() . "\n";
}

try {
    $conn = wp_runtime_open_mysqli();
    $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('version_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    $stmt->bind_param('ss', $json, $json);
    $saved = $stmt->execute();
    echo "MySQLi Saved? " . ($saved ? 'YES' : 'NO') . "\n";
} catch (Throwable $e2) {
    echo "MySQLi Error: " . $e2->getMessage() . "\n";
}
