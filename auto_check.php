<?php
require_once __DIR__ . '/runtime_config.php';
$statusFile = __DIR__ . '/status.json';
$status = json_decode(file_get_contents($statusFile), true);

try {
    // օրինակ՝ DB check
    $pdo = wp_runtime_open_pdo();
    $status['auto'] = false;
} catch(Exception $e){
    $status['auto'] = true;
}

file_put_contents($statusFile, json_encode($status, JSON_PRETTY_PRINT));
