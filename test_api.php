<?php
require_once 'db.php'; // or whatever connects to DB
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'list_setlist_access';
$_GET['setlist_id'] = '1'; 
// Assuming we need to spoof session
$_SESSION['user_id'] = 1;
require 'setlists_api.php';
