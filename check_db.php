<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->query("SHOW COLUMNS FROM users");
$columns = $st->fetchAll(PDO::FETCH_ASSOC);
print_r($columns);
