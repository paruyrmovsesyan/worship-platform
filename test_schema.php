<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$stmt = $pdo->query("DESCRIBE users");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
