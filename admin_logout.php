<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
wp_admin_set_logout_lock(wp_admin_get_current_user());
unset($_SESSION['admin_access_granted'], $_SESSION['admin_authenticated_at'], $_SESSION['admin_authenticated_user_id']);
wp_admin_clear_access_cookie();
$_SESSION['admin_flash_notice'] = 'Դուք դուրս եկաք admin համակարգից։';

header('Location: /admin_login.php');
exit;
