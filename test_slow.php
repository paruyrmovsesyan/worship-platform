<?php
require_once __DIR__ . '/runtime_config.php';
$pdo = wp_runtime_open_pdo();
$pdo->query("SELECT SLEEP(1.5)");
echo "Done\n";
