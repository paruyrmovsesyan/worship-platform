<?php
require 'version_config.php';
$config = wp_version_load();
echo "enabled: " . ($config['maintenance_enabled'] ? 'true' : 'false') . "\n";
