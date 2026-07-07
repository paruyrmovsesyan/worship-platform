<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'get_messages';
$_GET['chat_id'] = '888';
$_SESSION['user_id'] = 1;
require_once __DIR__ . '/chat_api.php';
