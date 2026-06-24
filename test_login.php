<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_POST = [
    'login' => 'test@test.com',
    'password' => 'password', // invalid password to at least see if it parses far
    'remember_me' => false,
    'source' => 'pwa'
];
require 'login_api.php';
