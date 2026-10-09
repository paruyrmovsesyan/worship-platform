<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/error_service.php';
require_once __DIR__ . '/push_service.php';

const WP_MOBILE_CONFIG_FILE = __DIR__ . '/data/mobile_app_config.json';

/**
 * Returns default mobile apps configuration.
 */
function wp_mobile_default_config(): array {
    return [
        'ios' => [
            'current_version' => '1.0',
            'current_build' => '1',
            'min_version' => '1.0',
            'min_build' => '1',
            'force_update' => false,
            'status' => 'live', // 'live', 'review', 'maintenance'
            'app_store_url' => 'https://apps.apple.com/app/worship-platform/id6470000000',
            'maintenance_title' => 'Տեխնիկական դադար',
            'maintenance_message' => 'iOS հավելվածը գտնվում է պլանային թարմացման փուլում: Խնդրում ենք փորձել մի փոքր ուշ:',
            'update_title' => 'Հասանելի է նոր տարբերակ',
            'update_message' => 'Խնդրում ենք թարմացնել Worship Platform-ը App Store-ից՝ շարունակելու համար:',
        ],
        'android' => [
            'current_version' => '1.0',
            'current_build' => '1',
            'min_version' => '1.0',
            'min_build' => '1',
            'force_update' => false,
            'status' => 'live', // 'live', 'review', 'maintenance'
            'play_store_url' => 'https://play.google.com/store/apps/details?id=am.pmstudio.worship',
            'apk_download_url' => 'https://worship.pmstudio.am/worship-platform.apk',
            'maintenance_title' => 'Տեխնիկական դադար',
            'maintenance_message' => 'Android հավելվածը գտնվում է պլանային թարմացման փուլում: Խնդրում ենք փորձել մի փոքր ուշ:',
            'update_title' => 'Հասանելի է նոր տարբերակ',
            'update_message' => 'Խնդրում ենք թարմացնել Worship Platform-ը Google Play-ից կամ ներբեռնել թարմ APK-ն:',
        ],
        'announcement' => [
            'enabled' => false,
            'target' => 'all', // 'all', 'ios', 'android'
            'type' => 'info', // 'info', 'warning', 'success', 'critical'
            'title' => '',
            'message' => '',
            'action_text' => '',
            'action_url' => '',
            'dismissible' => true,
        ],
        'features' => [
            'biometric_auth' => true,
            'audio_calls' => true,
            'push_notifications' => true,
            'chord_transposition' => true,
            'setlists_sync' => true,
            'offline_mode' => true,
            'chat_voice_messages' => true,
        ],
        'updated_at' => date('Y-m-d H:i:s'),
        'updated_by' => 'system',
    ];
}

/**
 * Loads current mobile config from JSON file with defaults fallback.
 */
function wp_mobile_get_config(): array {
    $defaults = wp_mobile_default_config();
    if (!is_file(WP_MOBILE_CONFIG_FILE)) {
        return $defaults;
    }
    $raw = @file_get_contents(WP_MOBILE_CONFIG_FILE);
    if (!$raw) {
        return $defaults;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $defaults;
    }

    $merged = array_replace_recursive($defaults, $data);
    return $merged;
}

/**
 * Saves mobile config atomically.
 */
function wp_mobile_save_config(array $config, string $updatedBy = 'admin'): bool {
    $dir = dirname(WP_MOBILE_CONFIG_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $config['updated_at'] = date('Y-m-d H:i:s');
    $config['updated_by'] = $updatedBy;

    $json = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    return (bool)@file_put_contents(WP_MOBILE_CONFIG_FILE, $json, LOCK_EX);
}

/**
 * Retrieves mobile-specific error logs (iOS or Android).
 */
function wp_mobile_get_error_logs(string $platform = 'all', int $limit = 100, string $status = 'all', string $search = ''): array {
    $filters = [
        'status' => $status,
        'search' => $search,
    ];
    if ($platform === 'ios') {
        $filters['environment'] = 'ios';
    } elseif ($platform === 'android') {
        $filters['environment'] = 'android';
    }

    $logs = wp_error_get_logs($filters, $limit);
    if ($platform === 'all') {
        // Filter to only mobile logs (ios, android, or device_info containing iOS/Android)
        $logs = array_values(array_filter($logs, static function(array $l): bool {
            $env = strtolower((string)($l['environment'] ?? ''));
            if ($env === 'ios' || $env === 'android') return true;
            $ua = strtolower((string)($l['user_agent'] ?? ''));
            $dev = strtolower((string)($l['device_info'] ?? ''));
            return str_contains($ua, 'iphone') || str_contains($ua, 'ipad') || str_contains($ua, 'android') ||
                   str_contains($dev, 'ios') || str_contains($dev, 'android') || str_contains($dev, 'capacitor');
        }));
    }

    return $logs;
}

/**
 * Retrieves registered native devices from push tokens and DB.
 */
function wp_mobile_get_registered_devices(): array {
    $devices = [];
    try {
        $pdo = wp_runtime_open_pdo();
        // Check for push_subscriptions table
        $tables = $pdo->query("SHOW TABLES LIKE 'push_subscriptions'")->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($tables)) {
            $stmt = $pdo->query("SELECT id, user_id, device_id, platform, token, user_agent, is_active, created_at, updated_at FROM push_subscriptions ORDER BY updated_at DESC LIMIT 100");
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $devices[] = [
                    'id' => (int)($row['id'] ?? 0),
                    'user_id' => $row['user_id'] ? (int)$row['user_id'] : null,
                    'device_id' => (string)($row['device_id'] ?? ''),
                    'platform' => (string)($row['platform'] ?? 'mobile'),
                    'user_agent' => (string)($row['user_agent'] ?? ''),
                    'is_active' => !empty($row['is_active']),
                    'has_token' => !empty($row['token']),
                    'last_seen' => (string)($row['updated_at'] ?? $row['created_at'] ?? ''),
                ];
            }
        }
    } catch (Throwable $_) {}

    // Also check install service devices
    if (function_exists('wp_install_list_devices')) {
        $installDevices = wp_install_list_devices('main', true, 100);
        foreach ($installDevices as $dev) {
            $platform = strtolower((string)($dev['platform'] ?? ''));
            if (str_contains($platform, 'ios') || str_contains($platform, 'android') || str_contains($platform, 'mobile')) {
                $devices[] = [
                    'id' => $dev['id'] ?? 0,
                    'user_id' => $dev['user_id'] ?? null,
                    'device_id' => $dev['device_id'] ?? '',
                    'platform' => $dev['platform'] ?? 'Mobile',
                    'user_agent' => $dev['browser'] ?? '',
                    'is_active' => true,
                    'has_token' => false,
                    'last_seen' => $dev['last_seen'] ?? '',
                ];
            }
        }
    }

    return $devices;
}

/**
 * Resolves client status given platform and client version/build.
 */
function wp_mobile_evaluate_client(string $platform, string $clientVersion = '', string $clientBuild = ''): array {
    $config = wp_mobile_get_config();
    $platConfig = $config[$platform] ?? $config['android'];

    $isMaintenance = ($platConfig['status'] ?? 'live') === 'maintenance';
    $minVersion = (string)($platConfig['min_version'] ?? '1.0');
    $minBuild = (int)($platConfig['min_build'] ?? 1);
    $currentVersion = (string)($platConfig['current_version'] ?? '1.0');
    $forceUpdateConfig = !empty($platConfig['force_update']);

    $clientBuildInt = (int)$clientBuild;
    $needsUpdate = false;
    $isMandatory = false;

    if ($clientVersion !== '') {
        if (version_compare($clientVersion, $currentVersion, '<')) {
            $needsUpdate = true;
        }
        if (version_compare($clientVersion, $minVersion, '<') || ($clientBuildInt > 0 && $clientBuildInt < $minBuild)) {
            $needsUpdate = true;
            $isMandatory = true;
        }
    }
    if ($forceUpdateConfig) {
        $isMandatory = true;
    }

    $announcement = $config['announcement'] ?? [];
    $showAnnouncement = !empty($announcement['enabled']) &&
        ($announcement['target'] === 'all' || $announcement['target'] === $platform);

    return [
        'ok' => true,
        'platform' => $platform,
        'status' => $platConfig['status'] ?? 'live',
        'maintenance' => [
            'active' => $isMaintenance,
            'title' => $platConfig['maintenance_title'] ?? '',
            'message' => $platConfig['maintenance_message'] ?? '',
        ],
        'version' => [
            'current' => $currentVersion,
            'min_required' => $minVersion,
            'needs_update' => $needsUpdate,
            'force_update' => $isMandatory,
            'update_title' => $platConfig['update_title'] ?? '',
            'update_message' => $platConfig['update_message'] ?? '',
            'store_url' => $platform === 'ios' ? ($platConfig['app_store_url'] ?? '') : ($platConfig['play_store_url'] ?? ''),
            'apk_url' => $platform === 'android' ? ($platConfig['apk_download_url'] ?? '') : null,
        ],
        'announcement' => $showAnnouncement ? [
            'type' => $announcement['type'] ?? 'info',
            'title' => $announcement['title'] ?? '',
            'message' => $announcement['message'] ?? '',
            'action_text' => $announcement['action_text'] ?? '',
            'action_url' => $announcement['action_url'] ?? '',
            'dismissible' => !empty($announcement['dismissible']),
        ] : null,
        'features' => $config['features'] ?? [],
        'timestamp' => date('Y-m-d H:i:s'),
    ];
}
