<?php
declare(strict_types=1);

require_once __DIR__ . '/version_config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$config = wp_version_load();
$maintenanceActive = wp_version_is_maintenance_active($config);
$scheduledMaintenanceActive = wp_version_is_scheduled_maintenance_active($config);

echo json_encode([
    'ok' => true,
    'app_version' => $config['app_version'],
    'web_version' => $config['web_version'],
    'app_release_stamp' => $config['app_release_stamp'],
    'web_release_stamp' => $config['web_release_stamp'],
    'app_release_type' => $config['app_release_type'],
    'web_release_type' => $config['web_release_type'],
    'app_release_summary' => $config['app_release_summary'],
    'web_release_summary' => $config['web_release_summary'],
    'app_title' => $config['app_title'],
    'app_message' => $config['app_message'],
    'web_title' => $config['web_title'],
    'web_message' => $config['web_message'],
    'maintenance_enabled' => !empty($config['maintenance_enabled']),
    'maintenance_active' => $maintenanceActive,
    'scheduled_maintenance_active' => $scheduledMaintenanceActive,
    'maintenance_message' => $config['maintenance_message'],
    'maintenance_start_at' => $config['maintenance_start_at'],
    'maintenance_end_at' => $config['maintenance_end_at'],
    'meta_note' => $config['meta_note'],
    'page_app_modes' => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
    'updated_at' => $config['updated_at'],
], JSON_UNESCAPED_UNICODE);
