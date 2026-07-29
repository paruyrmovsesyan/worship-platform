<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'get_public_setlist';
require_once 'auth_bootstrap.php';
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();
$st = $pdo->prepare("SELECT share_token FROM setlists WHERE share_token IS NOT NULL ORDER BY id DESC LIMIT 1");
$st->execute();
$token = $st->fetchColumn();
echo "TOKEN: " . $token . "\n";
if ($token) {
    $_GET['token'] = $token;
    require 'setlists_api.php';
}
