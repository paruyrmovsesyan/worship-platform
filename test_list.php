<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'list_setlist_access';
$_GET['setlist_id'] = '1';
require 'auth_bootstrap.php';
// Need a valid session or fake the uid
