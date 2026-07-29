<?php
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->query("SHOW COLUMNS FROM setlists LIKE 'share_token'");
print_r($st->fetchAll(PDO::FETCH_ASSOC));
