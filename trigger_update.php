<?php
require_once __DIR__ . '/version_config.php';

$config = wp_version_load();
$config['app_version'] = '5.0.3'; // bump version
$config['app_release_stamp'] = wp_version_now_iso();

$pdo = wp_runtime_open_pdo();
$json = json_encode($config, JSON_UNESCAPED_UNICODE);
$st = $pdo->prepare("UPDATE sys_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'version_config'");
$st->execute([$json]);

echo "Updated to version: " . $config['app_version'];
