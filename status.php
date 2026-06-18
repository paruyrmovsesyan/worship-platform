<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/runtime_config.php';

function out($arr, $code = 200): void {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

$config = wp_version_load();

if (wp_version_is_maintenance_active($config)) {
    out([
        "ok" => false,
        "maintenance" => true,
        "scheduled" => wp_version_is_scheduled_maintenance_active($config),
        "message" => (string)$config['maintenance_message'],
        "maintenance_end_at" => (string)($config['maintenance_end_at'] ?? ''),
        "page_app_modes" => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
        "page_web_modes" => $config['page_web_modes'] ?? wp_version_default_page_web_modes(),
    ], 503);
}

$ok = true;
$msg = "OK";

try {
    $pdo = wp_runtime_open_pdo();
    $pdo->query("SELECT 1");
} catch (Exception $e) {
    $ok = false;
    $msg = "Կայքը ժամանակավորապես անհասանելի է (DB)";
}

if (!$ok) {
    out([
        "ok" => false,
        "maintenance" => true,
        "message" => $msg,
        "page_app_modes" => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
        "page_web_modes" => $config['page_web_modes'] ?? wp_version_default_page_web_modes(),
    ], 503);
}

out([
    "ok" => true,
    "maintenance" => false,
    "message" => $msg,
    "page_app_modes" => $config['page_app_modes'] ?? wp_version_default_page_app_modes(),
    "page_web_modes" => $config['page_web_modes'] ?? wp_version_default_page_web_modes(),
], 200);
