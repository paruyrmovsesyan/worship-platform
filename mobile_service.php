<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/error_service.php';
require_once __DIR__ . '/push_service.php';

const WP_MOBILE_CONFIG_FILE = __DIR__ . '/data/mobile_app_config.json';
const WP_ANNOUNCEMENTS_HISTORY_FILE = __DIR__ . '/data/announcements_history.json';
const WP_ANNOUNCEMENTS_HISTORY_MAX = 100;

/**
 * Returns default mobile apps configuration.
 */
function wp_mobile_default_config(): array {
    return [
        'ios' => [
            'current_version' => '5.3.0',
            'current_build' => '2',
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
            'current_version' => '5.4.0',
            'current_build' => '8',
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
            'target' => 'all', // 'all', 'web_pwa', 'web', 'pwa', 'native', 'ios', 'android'
            'type' => 'info', // 'info', 'warning', 'success', 'critical'
            'title' => '',
            'message' => '',
            'title_ru' => '',
            'message_ru' => '',
            'title_en' => '',
            'message_en' => '',
            'action_text' => '',
            'action_url' => '',
            'dismissible' => true,
            'schedule_start_at' => '',
            'schedule_end_at' => '',
            'show_countdown' => false,
            'sync_with_maintenance' => false,
            'restricted_pages' => [],
            'restricted_features' => [],
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
 * Checks whether an announcement's scheduled end time has passed.
 */
function wp_mobile_is_announcement_expired(array $announcement): bool {
    $endRaw = wp_version_normalize_datetime($announcement['schedule_end_at'] ?? '');
    if ($endRaw === '') {
        return false;
    }
    try {
        $tz = wp_version_admin_timezone();
        $nowTs = (new DateTimeImmutable('now', $tz))->getTimestamp();
        $endTs = (new DateTimeImmutable($endRaw, $tz))->getTimestamp();
        return $nowTs >= $endTs;
    } catch (Throwable $_) {
        return false;
    }
}

/**
 * Loads current mobile config from JSON file with defaults fallback.
 * Automatically deactivates the announcement if its schedule_end_at has expired.
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

    if (!empty($merged['announcement']['enabled']) && wp_mobile_is_announcement_expired($merged['announcement'])) {
        $merged['announcement']['enabled'] = false;
        $json = json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json !== false) {
            @file_put_contents(WP_MOBILE_CONFIG_FILE, $json, LOCK_EX);
        }
    }

    return $merged;
}

/**
 * Saves mobile config atomically and records announcement history when announcement content is present.
 */
function wp_mobile_save_config(array $config, string $updatedBy = 'admin', bool $forceNewHistory = false, bool $recordHistory = true): bool {
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
    $saved = (bool)@file_put_contents(WP_MOBILE_CONFIG_FILE, $json, LOCK_EX);
    if ($saved && $recordHistory && !empty($config['announcement']) && is_array($config['announcement'])) {
        $ann = $config['announcement'];
        $hasText = trim((string)($ann['title'] ?? '')) !== '' || trim((string)($ann['message'] ?? '')) !== '';
        $hasRestrictions = !empty($ann['restricted_pages']) || !empty($ann['restricted_features']);
        if ($hasText || $hasRestrictions) {
            wp_mobile_record_announcement_history($ann, $updatedBy, $forceNewHistory);
        }
    }
    return $saved;
}

/**
 * Computes a deterministic content fingerprint for an announcement so edits vs status toggles are distinguished.
 */
function wp_mobile_announcement_content_hash(array $ann): string {
    $pages = array_values(array_map('strval', (array)($ann['restricted_pages'] ?? [])));
    $features = array_values(array_map('strval', (array)($ann['restricted_features'] ?? [])));
    sort($pages);
    sort($features);

    $payload = [
        'target' => (string)($ann['target'] ?? 'all'),
        'type' => (string)($ann['type'] ?? 'info'),
        'title' => trim((string)($ann['title'] ?? '')),
        'message' => trim((string)($ann['message'] ?? '')),
        'title_ru' => trim((string)($ann['title_ru'] ?? '')),
        'message_ru' => trim((string)($ann['message_ru'] ?? '')),
        'title_en' => trim((string)($ann['title_en'] ?? '')),
        'message_en' => trim((string)($ann['message_en'] ?? '')),
        'action_text' => trim((string)($ann['action_text'] ?? '')),
        'action_url' => trim((string)($ann['action_url'] ?? '')),
        'restricted_pages' => $pages,
        'restricted_features' => $features,
    ];
    return sha1((string)json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

/**
 * Normalizes an announcement array into a history item structure.
 */
function wp_mobile_normalize_announcement_record(array $ann, string $actor = 'admin', ?string $id = null, ?string $createdAt = null): array {
    $now = date('Y-m-d H:i:s');
    $recordId = ($id !== null && $id !== '') ? $id : ('ann_' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(4)), 0, 6));
    return [
        'id' => $recordId,
        'content_hash' => wp_mobile_announcement_content_hash($ann),
        'enabled' => !empty($ann['enabled']),
        'target' => (string)($ann['target'] ?? 'all'),
        'type' => (string)($ann['type'] ?? 'info'),
        'title' => trim((string)($ann['title'] ?? '')),
        'message' => trim((string)($ann['message'] ?? '')),
        'title_ru' => trim((string)($ann['title_ru'] ?? '')),
        'message_ru' => trim((string)($ann['message_ru'] ?? '')),
        'title_en' => trim((string)($ann['title_en'] ?? '')),
        'message_en' => trim((string)($ann['message_en'] ?? '')),
        'action_text' => trim((string)($ann['action_text'] ?? '')),
        'action_url' => trim((string)($ann['action_url'] ?? '')),
        'dismissible' => !isset($ann['dismissible']) || !empty($ann['dismissible']),
        'show_countdown' => !empty($ann['show_countdown']),
        'sync_with_maintenance' => !empty($ann['sync_with_maintenance']),
        'schedule_start_at' => (string)($ann['schedule_start_at'] ?? ''),
        'schedule_end_at' => (string)($ann['schedule_end_at'] ?? ''),
        'restricted_pages' => array_values(array_map('strval', (array)($ann['restricted_pages'] ?? []))),
        'restricted_features' => array_values(array_map('strval', (array)($ann['restricted_features'] ?? []))),
        'actor' => $actor !== '' ? $actor : 'admin',
        'created_at' => ($createdAt !== null && $createdAt !== '') ? $createdAt : $now,
        'updated_at' => $now,
    ];
}

/**
 * Loads announcement history list (most recent first). Auto-seeds from current config if history file does not exist yet.
 */
function wp_mobile_get_announcement_history(): array {
    $items = [];
    if (is_file(WP_ANNOUNCEMENTS_HISTORY_FILE)) {
        $raw = @file_get_contents(WP_ANNOUNCEMENTS_HISTORY_FILE);
        if ($raw) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $items = array_values(array_filter($decoded, 'is_array'));
            }
        }
    }

    if (empty($items)) {
        $cfg = wp_mobile_get_config();
        $ann = is_array($cfg['announcement'] ?? null) ? $cfg['announcement'] : [];
        $hasText = trim((string)($ann['title'] ?? '')) !== '' || trim((string)($ann['message'] ?? '')) !== '';
        $hasRestrictions = !empty($ann['restricted_pages']) || !empty($ann['restricted_features']);
        if ($hasText || $hasRestrictions) {
            $seed = wp_mobile_normalize_announcement_record(
                $ann,
                (string)($cfg['updated_by'] ?? 'admin'),
                null,
                (string)($cfg['updated_at'] ?? date('Y-m-d H:i:s'))
            );
            $items = [$seed];
            wp_mobile_save_announcement_history($items);
        }
    }

    $changed = false;
    foreach ($items as &$item) {
        if (!empty($item['enabled']) && wp_mobile_is_announcement_expired($item)) {
            $item['enabled'] = false;
            $changed = true;
        }
    }
    unset($item);
    if ($changed) {
        wp_mobile_save_announcement_history($items);
    }

    return $items;
}

/**
 * Persists announcement history array to disk.
 */
function wp_mobile_save_announcement_history(array $items): bool {
    $dir = dirname(WP_ANNOUNCEMENTS_HISTORY_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $trimmed = array_slice(array_values($items), 0, WP_ANNOUNCEMENTS_HISTORY_MAX);
    $json = json_encode($trimmed, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    return (bool)@file_put_contents(WP_ANNOUNCEMENTS_HISTORY_FILE, $json, LOCK_EX);
}

/**
 * Records or updates an announcement snapshot in history.
 */
function wp_mobile_record_announcement_history(array $ann, string $actor = 'admin', bool $forceNew = false): ?array {
    $items = wp_mobile_get_announcement_history();
    $hash = wp_mobile_announcement_content_hash($ann);

    if (!$forceNew && !empty($items)) {
        // If any existing item has the exact same content hash, update and promote it to top
        foreach ($items as $idx => $existing) {
            $existingHash = (string)($existing['content_hash'] ?? wp_mobile_announcement_content_hash($existing));
            if ($existingHash === $hash) {
                $updated = wp_mobile_normalize_announcement_record(
                    $ann,
                    $actor,
                    (string)($existing['id'] ?? ''),
                    (string)($existing['created_at'] ?? '')
                );
                array_splice($items, $idx, 1);
                array_unshift($items, $updated);
                wp_mobile_save_announcement_history($items);
                return $updated;
            }
        }
    }

    $record = wp_mobile_normalize_announcement_record($ann, $actor);
    array_unshift($items, $record);
    wp_mobile_save_announcement_history($items);
    return $record;
}

/**
 * Finds a single announcement history item by ID.
 */
function wp_mobile_find_announcement_history(string $id): ?array {
    if ($id === '') return null;
    foreach (wp_mobile_get_announcement_history() as $item) {
        if ((string)($item['id'] ?? '') === $id) {
            return $item;
        }
    }
    return null;
}

/**
 * Updates an existing announcement history item in-place by ID.
 */
function wp_mobile_update_announcement_history(string $id, array $ann, string $actor = 'admin'): ?array {
    if ($id === '') return null;
    $items = wp_mobile_get_announcement_history();
    foreach ($items as $idx => $existing) {
        if ((string)($existing['id'] ?? '') === $id) {
            $updated = wp_mobile_normalize_announcement_record(
                $ann,
                $actor,
                $id,
                (string)($existing['created_at'] ?? '')
            );
            $items[$idx] = $updated;
            wp_mobile_save_announcement_history($items);
            return $updated;
        }
    }
    return null;
}

/**
 * Deletes a single announcement history item by ID.
 */
function wp_mobile_delete_announcement_history(string $id): bool {
    if ($id === '') return false;
    $items = wp_mobile_get_announcement_history();
    $filtered = array_values(array_filter($items, static fn(array $item): bool => (string)($item['id'] ?? '') !== $id));
    if (count($filtered) === count($items)) {
        return false;
    }
    return wp_mobile_save_announcement_history($filtered);
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
 * Canonical catalog of pages that can be temporarily restricted alongside an announcement.
 */
function wp_mobile_restrictable_pages(): array {
    return [
        '/songs' => 'Երգարան (/songs)',
        '/song' => 'Երգի դիտում (/song/:id)',
        '/setlists' => 'Երգացանկեր (/setlists)',
        '/bible' => 'Աստվածաշունչ (/bible)',
        '/church' => 'Եկեղեցի և Աղոթք (/church)',
        '/media' => 'Մեդիա և Ռադիո (/media)',
        '/studio' => 'Pro Studio և Գործիքներ (/studio)',
        '/service-planner' => 'Ծառայության Պլանավորող (/service-planner)',
        '/transpose' => 'Տրանսպոզ Գործիք (/transpose)',
        '/favorites' => 'Սիրելիներ (/favorites)',
        '/friends' => 'Ընկերներ և Թիմեր (/friends)',
        '/chats' => 'Չաթեր (/chats)',
        '/song-request' => 'Խնդրել Երգ (/song-request)',
        '/projection' => 'Live Պրոյեկցիա (/projection)',
        '/news' => 'Նորություններ (/news)',
    ];
}

/**
 * Canonical catalog of features that can be temporarily restricted alongside an announcement.
 */
function wp_mobile_restrictable_features(): array {
    return [
        'pro_studio' => 'Worship Pro Studio',
        'live_stage_follower' => 'Live Stage Sync (Երաժիշտների սինքրոն)',
        'rehearsal_stems' => 'RehearsalMix & Stems Միքշեր',
        'lyrics_projection' => 'Live Պրոյեկցիա և OBS',
        'worship_ai_studio' => 'Worship AI Studio',
        'service_planner' => 'Service Planner',
        'smart_metronome' => 'Խելացի Մետրոնոմ',
        'chord_chart_transpose_capo' => 'Տրանսպոզ և Կապո',
        'audio_calls' => 'Աուդիո Զանգեր (WebRTC)',
        'setlists_sync' => 'Երգացանկերի Սինքրոնացում',
        'offline_mode' => 'Offline Քեշավորում',
        'song_lyrics_copy' => 'Երգի պատճենում / Արտահանում',
        'setlist_creation' => 'Նոր երգացանկերի ստեղծում',
        'chat_messaging' => 'Չաթում հաղորդագրություններ ուղարկում',
        'song_requests_submit' => 'Նոր երգի հայտերի ուղարկում',
    ];
}

/**
 * Checks whether an announcement should currently be displayed/enforced based on enabled flag and schedule window.
 */
function wp_mobile_is_announcement_active(array $announcement, ?array $versionConfig = null): bool {
    $enabled = !empty($announcement['enabled']);
    $syncMaint = !empty($announcement['sync_with_maintenance']);
    if ($syncMaint && $versionConfig !== null && wp_version_is_maintenance_active($versionConfig)) {
        return true;
    }
    if (!$enabled) {
        return false;
    }

    $tz = wp_version_admin_timezone();
    $nowTs = (new DateTimeImmutable('now', $tz))->getTimestamp();
    $startRaw = wp_version_normalize_datetime($announcement['schedule_start_at'] ?? '');
    $endRaw = wp_version_normalize_datetime($announcement['schedule_end_at'] ?? '');

    if ($startRaw !== '') {
        try {
            $startTs = (new DateTimeImmutable($startRaw, $tz))->getTimestamp();
            if ($nowTs < $startTs) return false;
        } catch (Throwable $_) {}
    }
    if ($endRaw !== '') {
        try {
            $endTs = (new DateTimeImmutable($endRaw, $tz))->getTimestamp();
            if ($nowTs > $endTs) return false;
        } catch (Throwable $_) {}
    }

    return true;
}

/**
 * Checks whether an announcement target applies to the requesting runtime surface.
 */
function wp_mobile_announcement_matches_platform(string $target, string $platform): bool {
    return match ($target) {
        'all' => true,
        'web_pwa' => $platform === 'web' || $platform === 'pwa',
        'native' => $platform === 'ios' || $platform === 'android',
        default => $target === $platform,
    };
}

/**
 * Resolves client status given platform ('web', 'pwa', 'ios', 'android') and version/build.
 */
function wp_mobile_evaluate_client(string $platform, string $clientVersion = '', string $clientBuild = ''): array {
    $config = wp_mobile_get_config();
    $versionConfig = wp_version_load();
    $isNative = ($platform === 'ios' || $platform === 'android');
    $platConfig = $isNative ? ($config[$platform] ?? $config['android']) : [];

    $globalMaintActive = wp_version_is_maintenance_active($versionConfig);
    $isMaintenance = $isNative && (
        (($platConfig['status'] ?? 'live') === 'maintenance') ||
        (!empty($config['announcement']['sync_with_maintenance']) && $globalMaintActive)
    );
    $minVersion = (string)($platConfig['min_version'] ?? '1.0');
    $minBuild = (int)($platConfig['min_build'] ?? 1);
    $currentVersion = (string)($platConfig['current_version'] ?? '1.0');
    $currentBuild = (int)($platConfig['current_build'] ?? 1);
    $forceUpdateConfig = $isNative && !empty($platConfig['force_update']);

    $clientBuildInt = (int)$clientBuild;
    $needsUpdate = false;
    $isMandatory = false;

    if ($isNative && $clientVersion !== '') {
        if (version_compare($clientVersion, $currentVersion, '<')) {
            $needsUpdate = true;
        } elseif (version_compare($clientVersion, $currentVersion, '==') && $clientBuildInt > 0 && $currentBuild > $clientBuildInt) {
            $needsUpdate = true;
        }
        if (version_compare($clientVersion, $minVersion, '<') || ($clientBuildInt > 0 && $clientBuildInt < $minBuild)) {
            $needsUpdate = true;
            $isMandatory = true;
        }
    }
    if ($forceUpdateConfig && $needsUpdate) {
        $isMandatory = true;
    }

    $announcement = $config['announcement'] ?? [];
    $target = (string)($announcement['target'] ?? 'all');
    $showAnnouncement = wp_mobile_is_announcement_active($announcement, $versionConfig) &&
        wp_mobile_announcement_matches_platform($target, $platform);

    $allowedPages = array_keys(wp_mobile_restrictable_pages());
    $allowedFeatures = array_keys(wp_mobile_restrictable_features());
    $restrictedPages = $showAnnouncement
        ? array_values(array_intersect($allowedPages, array_map('strval', (array)($announcement['restricted_pages'] ?? []))))
        : [];
    $restrictedFeatures = $showAnnouncement
        ? array_values(array_intersect($allowedFeatures, array_map('strval', (array)($announcement['restricted_features'] ?? []))))
        : [];

    $countdownEndAt = !empty($announcement['schedule_end_at'])
        ? (string)$announcement['schedule_end_at']
        : (string)($versionConfig['maintenance_end_at'] ?? '');

    return [
        'ok' => true,
        'platform' => $platform,
        'status' => $isNative ? ($platConfig['status'] ?? 'live') : 'live',
        'maintenance' => [
            'active' => $isMaintenance,
            'web_active' => $globalMaintActive,
            'end_at' => (string)($versionConfig['maintenance_end_at'] ?? ''),
            'title' => $platConfig['maintenance_title'] ?? 'Վերազինման աշխատանքներ',
            'message' => !empty($platConfig['maintenance_message'])
                ? (string)$platConfig['maintenance_message']
                : (string)($versionConfig['maintenance_message'] ?? ''),
        ],
        'version' => [
            'current' => $currentVersion,
            'current_build' => $currentBuild,
            'client_version' => $clientVersion,
            'client_build' => $clientBuildInt > 0 ? $clientBuildInt : null,
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
            'target' => $target,
            'title' => $announcement['title'] ?? '',
            'message' => $announcement['message'] ?? '',
            'title_ru' => $announcement['title_ru'] ?? '',
            'message_ru' => $announcement['message_ru'] ?? '',
            'title_en' => $announcement['title_en'] ?? '',
            'message_en' => $announcement['message_en'] ?? '',
            'action_text' => $announcement['action_text'] ?? '',
            'action_url' => $announcement['action_url'] ?? '',
            'dismissible' => !isset($announcement['dismissible']) || !empty($announcement['dismissible']),
            'show_countdown' => !empty($announcement['show_countdown']),
            'schedule_start_at' => (string)($announcement['schedule_start_at'] ?? ''),
            'schedule_end_at' => $countdownEndAt,
            'restricted_pages' => $restrictedPages,
            'restricted_features' => $restrictedFeatures,
        ] : null,
        'restrictions' => [
            'pages' => $restrictedPages,
            'features' => $restrictedFeatures,
        ],
        'features' => $config['features'] ?? [],
        'timestamp' => date('Y-m-d H:i:s'),
    ];
}
