<?php
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->prepare("UPDATE setlists SET share_token='1234abcd' WHERE id=1");
$st->execute();
echo "Done";
