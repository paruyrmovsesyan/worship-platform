<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
wp_admin_require_access('/songs.php');
header('Location: /songs.php');
exit;