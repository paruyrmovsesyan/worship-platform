<?php
require_once 'push_service.php';
$payload = [
    'title' => 'Test Push',
    'body' => 'Testing from FPM',
    'url' => '/main.html',
    'type' => 'version_update',
];
$result = wp_push_send_notification($payload);
echo json_encode($result);
