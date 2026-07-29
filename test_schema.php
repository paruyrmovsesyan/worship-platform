<?php
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();
$stmt = $pdo->query("SHOW CREATE TABLE setlists");
print_r($stmt->fetch(PDO::FETCH_ASSOC));
$stmt = $pdo->query("SHOW CREATE TABLE songs");
print_r($stmt->fetch(PDO::FETCH_ASSOC));
