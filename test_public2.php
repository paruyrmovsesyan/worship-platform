<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'get_public_setlist';

require_once 'auth_bootstrap.php';
require_once 'runtime_config.php';
$pdo = wp_runtime_open_pdo();

// get a valid token
$st = $pdo->query('SELECT share_token FROM setlists WHERE share_token IS NOT NULL LIMIT 1');
$token = $st->fetchColumn();

if (!$token) {
    echo "No tokens found\n";
    exit;
}

$_GET['token'] = $token;
require 'setlists_api.php';
