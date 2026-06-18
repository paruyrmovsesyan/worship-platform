<?php
function wp_admin_require_access() {
    return ['user' => ['name' => 'Test']];
}
require 'runtime_config.php';
$_SERVER['REQUEST_METHOD'] = 'GET';
include 'admin_messages.php';
