<?php
$_POST = [
    'action' => 'save_settings',
    'maintenance_enabled' => ''
];
require 'version_config.php';
$config = wp_version_load();
$config['maintenance_enabled'] = array_key_exists('maintenance_enabled', $_POST) ? !empty($_POST['maintenance_enabled']) : !empty($config['maintenance_enabled']);
echo "new enabled: " . ($config['maintenance_enabled'] ? 'true' : 'false') . "\n";
