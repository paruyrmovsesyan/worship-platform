<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'get_setlists';
// Mock session
session_start();
$_SESSION['user_id'] = 1;
require 'setlists_api.php';
