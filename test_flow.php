<?php
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/song_request_service.php';
require_once __DIR__ . '/push_service.php';

// 1. Exactly what admin_updates.php line 81 does:
$moderationCounts = wp_song_request_counts();
$moderationRequests = wp_song_request_list('pending', 80, '');

// 2. Exactly what admin_updates.php line 1361 does:
$config = wp_push_bootstrap_config();
$subs = wp_push_load_subscriptions();

echo json_encode([
    'db_open' => function_exists('wp_runtime_open_mysqli') ? 'yes' : 'no',
    'vapid_public_key_present' => !empty($config['vapid_public_key']),
    'vapid_private_key_present' => !empty($config['vapid_private_key_pem']),
    'subscriptions_count' => count($subs),
    'legacy_fallback' => count($subs) === 17,
]);
