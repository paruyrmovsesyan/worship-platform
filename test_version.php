<?php
require_once __DIR__ . '/runtime_config.php';
$conn = wp_runtime_open_mysqli();
$res = $conn->query("SELECT setting_value FROM sys_settings WHERE setting_key = 'version_config'");
print_r($res->fetch_assoc());
