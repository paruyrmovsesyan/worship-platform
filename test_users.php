<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->query("SELECT id, name, email FROM users WHERE id IN (1, 2)");
print_r($st->fetchAll(PDO::FETCH_ASSOC));
