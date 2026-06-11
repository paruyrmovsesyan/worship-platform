<?php
declare(strict_types=1);

require_once __DIR__ . '/version_config.php';

const WP_INSTALLS_PATH = __DIR__ . '/install_stats_store.json';
const WP_INSTALL_ACTIVE_WINDOW_DAYS = 60;

function wp_install_expected_source(string $scope): string {
    $scope = wp_install_normalize_scope($scope);
    return $scope === 'admin' ? 'admin-app-verified' : 'main-app-verified';
}

function wp_install_sanitize_device_id(string $deviceId): string {
    $deviceId = trim($deviceId);
    if ($deviceId === '') {
        return '';
    }

    $deviceId = preg_replace('/[^A-Za-z0-9._:-]/', '', $deviceId) ?? '';
    if (strlen($deviceId) < 8) {
        return '';
    }

    return mb_substr($deviceId, 0, 120);
}

function wp_install_sanitize_signature(string $signature): string {
    $signature = strtolower(trim($signature));
    if ($signature === '') {
        return '';
    }

    $signature = preg_replace('/[^a-f0-9]/', '', $signature) ?? '';
    if (strlen($signature) < 12) {
        return '';
    }

    return mb_substr($signature, 0, 64);
}

function wp_install_is_verified_source(string $scope, string $source): bool {
    return trim($source) === wp_install_expected_source($scope);
}

function wp_install_normalize_scope(string $scope): string {
    $scope = strtolower(trim($scope));
    return in_array($scope, ['main', 'admin'], true) ? $scope : 'main';
}

function wp_install_read_store(): array {
    $items = [];
    try {
        $conn = wp_runtime_open_mysqli();
        $result = $conn->query("SELECT * FROM install_stats");
        while ($row = $result->fetch_assoc()) {
            $deviceId = trim((string)($row['device_id'] ?? ''));
            if ($deviceId === '') continue;

            $items[] = [
                'device_id' => mb_substr($deviceId, 0, 120),
                'device_signature' => wp_install_sanitize_signature((string)($row['device_signature'] ?? '')),
                'scope' => wp_install_normalize_scope((string)($row['scope'] ?? 'main')),
                'source' => mb_substr(trim((string)($row['source'] ?? '')), 0, 80),
                'user_id' => max(0, (int)($row['user_id'] ?? 0)),
                'user_name' => mb_substr(trim((string)($row['user_name'] ?? '')), 0, 160),
                'user_username' => mb_substr(trim((string)($row['user_username'] ?? '')), 0, 160),
                'user_email' => mb_substr(trim((string)($row['user_email'] ?? '')), 0, 190),
                'ip_address' => mb_substr(trim((string)($row['ip_address'] ?? '')), 0, 80),
                'user_agent' => mb_substr(trim((string)($row['user_agent'] ?? '')), 0, 255),
                'installed_at' => wp_version_normalize_datetime($row['installed_at'] ?? '') ?: wp_version_now_iso(),
                'last_seen_at' => wp_version_normalize_datetime($row['last_seen_at'] ?? '') ?: wp_version_now_iso(),
            ];
        }
    } catch (Throwable $e) {}

    return $items;
}

function wp_install_merge_item_rows(array $base, array $row): array {
    $baseInstalledAt = wp_version_normalize_datetime((string)($base['installed_at'] ?? '')) ?: wp_version_now_iso();
    $rowInstalledAt = wp_version_normalize_datetime((string)($row['installed_at'] ?? '')) ?: $baseInstalledAt;
    $baseLastSeenAt = wp_version_normalize_datetime((string)($base['last_seen_at'] ?? '')) ?: $baseInstalledAt;
    $rowLastSeenAt = wp_version_normalize_datetime((string)($row['last_seen_at'] ?? '')) ?: $rowInstalledAt;

    $merged = $base;
    if (strcmp($rowInstalledAt, $baseInstalledAt) < 0) {
        $merged['installed_at'] = $rowInstalledAt;
    } else {
        $merged['installed_at'] = $baseInstalledAt;
    }

        if (strcmp($rowLastSeenAt, $baseLastSeenAt) >= 0) {
            $merged['last_seen_at'] = $rowLastSeenAt;
            if (trim((string)($row['device_id'] ?? '')) !== '') {
                $merged['device_id'] = mb_substr(trim((string)$row['device_id']), 0, 120);
            }
        if (wp_install_sanitize_signature((string)($row['device_signature'] ?? '')) !== '') {
            $merged['device_signature'] = wp_install_sanitize_signature((string)$row['device_signature']);
        }
            if (trim((string)($row['source'] ?? '')) !== '') {
                $merged['source'] = mb_substr(trim((string)$row['source']), 0, 80);
            }
            $incomingUserId = max(0, (int)($row['user_id'] ?? 0));
            if ($incomingUserId > 0) {
                $merged['user_id'] = $incomingUserId;
            }
            if (trim((string)($row['user_name'] ?? '')) !== '') {
                $merged['user_name'] = mb_substr(trim((string)$row['user_name']), 0, 160);
            }
            if (trim((string)($row['user_username'] ?? '')) !== '') {
                $merged['user_username'] = mb_substr(trim((string)$row['user_username']), 0, 160);
            }
            if (trim((string)($row['user_email'] ?? '')) !== '') {
                $merged['user_email'] = mb_substr(trim((string)$row['user_email']), 0, 190);
            }
            if (trim((string)($row['ip_address'] ?? '')) !== '') {
                $merged['ip_address'] = mb_substr(trim((string)$row['ip_address']), 0, 80);
            }
            if (trim((string)($row['user_agent'] ?? '')) !== '') {
                $merged['user_agent'] = mb_substr(trim((string)$row['user_agent']), 0, 255);
        }
    } else {
        $merged['last_seen_at'] = $baseLastSeenAt;
        if (trim((string)($merged['device_signature'] ?? '')) === '') {
            $merged['device_signature'] = wp_install_sanitize_signature((string)($row['device_signature'] ?? ''));
        }
    }

    return $merged;
}

function wp_install_item_match_score(array $base, array $row): int {
    $baseScope = wp_install_normalize_scope((string)($base['scope'] ?? 'main'));
    $rowScope = wp_install_normalize_scope((string)($row['scope'] ?? 'main'));
    if ($baseScope !== $rowScope) {
        return 0;
    }

    $baseDeviceId = wp_install_sanitize_device_id((string)($base['device_id'] ?? ''));
    $rowDeviceId = wp_install_sanitize_device_id((string)($row['device_id'] ?? ''));
    if ($baseDeviceId !== '' && $rowDeviceId !== '' && hash_equals($baseDeviceId, $rowDeviceId)) {
        return 100;
    }

    $baseSignature = wp_install_sanitize_signature((string)($base['device_signature'] ?? ''));
    $rowSignature = wp_install_sanitize_signature((string)($row['device_signature'] ?? ''));
    if ($baseSignature !== '' && $rowSignature !== '' && hash_equals($baseSignature, $rowSignature)) {
        return 90;
    }

    $baseUserAgent = trim((string)($base['user_agent'] ?? ''));
    $rowUserAgent = trim((string)($row['user_agent'] ?? ''));
    if ($baseUserAgent !== '' && $rowUserAgent !== '' && hash_equals($baseUserAgent, $rowUserAgent)) {
        $baseInstalledAt = wp_version_normalize_datetime((string)($base['installed_at'] ?? ''));
        $rowInstalledAt = wp_version_normalize_datetime((string)($row['installed_at'] ?? ''));
        $baseLastSeenAt = wp_version_normalize_datetime((string)($base['last_seen_at'] ?? ''));
        $rowLastSeenAt = wp_version_normalize_datetime((string)($row['last_seen_at'] ?? ''));

        if (
            $baseInstalledAt !== '' &&
            $rowInstalledAt !== '' &&
            abs(strtotime($baseInstalledAt) - strtotime($rowInstalledAt)) <= 1800
        ) {
            return 40;
        }

        if (
            $baseLastSeenAt !== '' &&
            $rowLastSeenAt !== '' &&
            abs(strtotime($baseLastSeenAt) - strtotime($rowLastSeenAt)) <= 600
        ) {
            return 20;
        }
    }

    return 0;
}

function wp_install_canonicalize_items(array $items): array {
    $merged = [];

    foreach ($items as $row) {
        if (!is_array($row)) {
            continue;
        }

        $deviceId = wp_install_sanitize_device_id((string)($row['device_id'] ?? ''));
        if ($deviceId === '') {
            continue;
        }

        $scope = wp_install_normalize_scope((string)($row['scope'] ?? 'main'));
        $signature = wp_install_sanitize_signature((string)($row['device_signature'] ?? ''));
        $key = $signature !== '' ? ('sig:' . $scope . ':' . $signature) : ('dev:' . $scope . ':' . $deviceId);

        $normalized = [
            'device_id' => $deviceId,
            'device_signature' => $signature,
            'scope' => $scope,
            'source' => mb_substr(trim((string)($row['source'] ?? '')), 0, 80),
            'user_id' => max(0, (int)($row['user_id'] ?? 0)),
            'user_name' => mb_substr(trim((string)($row['user_name'] ?? '')), 0, 160),
            'user_username' => mb_substr(trim((string)($row['user_username'] ?? '')), 0, 160),
            'user_email' => mb_substr(trim((string)($row['user_email'] ?? '')), 0, 190),
            'ip_address' => mb_substr(trim((string)($row['ip_address'] ?? '')), 0, 80),
            'user_agent' => mb_substr(trim((string)($row['user_agent'] ?? '')), 0, 255),
            'installed_at' => wp_version_normalize_datetime($row['installed_at'] ?? '') ?: wp_version_now_iso(),
            'last_seen_at' => wp_version_normalize_datetime($row['last_seen_at'] ?? '') ?: wp_version_now_iso(),
        ];

        $matchedIndex = null;
        $bestScore = 0;
        foreach ($merged as $existingIndex => $existingRow) {
            $score = wp_install_item_match_score($existingRow, $normalized);
            if ($score > $bestScore) {
                $bestScore = $score;
                $matchedIndex = $existingIndex;
            }
        }

        if ($matchedIndex !== null && $bestScore > 0) {
            $merged[$matchedIndex] = wp_install_merge_item_rows($merged[$matchedIndex], $normalized);
            continue;
        }

        if (!isset($merged[$key])) {
            $merged[$key] = $normalized;
            continue;
        }

        $merged[$key] = wp_install_merge_item_rows($merged[$key], $normalized);
    }

    return array_values($merged);
}

function wp_install_write_store(array $items): bool {
    $items = wp_install_canonicalize_items($items);
    
    try {
        $conn = wp_runtime_open_mysqli();
        $conn->begin_transaction();
        
        $conn->query("TRUNCATE TABLE install_stats");
        $stmt = $conn->prepare("INSERT INTO install_stats (device_id, device_signature, scope, source, user_id, user_name, user_username, user_email, ip_address, user_agent, installed_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($items as $item) {
            $device_id = $item['device_id'] ?? '';
            $device_signature = $item['device_signature'] ?? '';
            $scope = $item['scope'] ?? 'main';
            $source = $item['source'] ?? '';
            $user_id = $item['user_id'] ?? 0;
            $user_name = $item['user_name'] ?? '';
            $user_username = $item['user_username'] ?? '';
            $user_email = $item['user_email'] ?? '';
            $ip_address = $item['ip_address'] ?? '';
            $user_agent = $item['user_agent'] ?? '';
            $installed_at = $item['installed_at'] ?? '';
            $last_seen_at = $item['last_seen_at'] ?? '';
            
            $stmt->bind_param('ssssisssssss', $device_id, $device_signature, $scope, $source, $user_id, $user_name, $user_username, $user_email, $ip_address, $user_agent, $installed_at, $last_seen_at);
            $stmt->execute();
        }
        
        $conn->commit();
        return true;
    } catch (Throwable $e) {
        if (isset($conn) && $conn instanceof mysqli) {
            $conn->rollback();
        }
        return false;
    }
}

function wp_install_is_active_seen_at(string $seenAt): bool {
    $seenAt = wp_version_normalize_datetime($seenAt);
    if ($seenAt === '') {
        return false;
    }

    try {
        $seen = new DateTimeImmutable($seenAt);
        $cutoff = new DateTimeImmutable('-' . WP_INSTALL_ACTIVE_WINDOW_DAYS . ' days');
        return $seen >= $cutoff;
    } catch (Throwable $e) {
        return false;
    }
}

function wp_install_register(string $scope, string $deviceId, array $meta = []): array {
    $scope = wp_install_normalize_scope($scope);
    $deviceId = wp_install_sanitize_device_id($deviceId);
    $deviceSignature = wp_install_sanitize_signature((string)($meta['device_signature'] ?? ''));

    if ($deviceId === '') {
        return ['ok' => false, 'message' => 'Device ID is required.'];
    }

    $verifiedSource = trim((string)($meta['verified_source'] ?? ''));
    if (!wp_install_is_verified_source($scope, $verifiedSource)) {
        return ['ok' => false, 'message' => 'Unverified install source.'];
    }

    $items = wp_install_canonicalize_items(wp_install_read_store());
    $now = wp_version_now_iso();
    $found = false;

    foreach ($items as &$item) {
        $sameScope = (string)($item['scope'] ?? 'main') === $scope;
        $sameDeviceId = (string)($item['device_id'] ?? '') === $deviceId;
        $sameSignature = $deviceSignature !== '' && hash_equals((string)($item['device_signature'] ?? ''), $deviceSignature);

        if (!$sameScope || (!$sameDeviceId && !$sameSignature)) {
            continue;
        }

        $item['device_id'] = $deviceId;
        if ($deviceSignature !== '') {
            $item['device_signature'] = $deviceSignature;
        }
        $item['last_seen_at'] = $now;
        $item['source'] = $verifiedSource;
        $incomingUserId = max(0, (int)($meta['user_id'] ?? 0));
        if ($incomingUserId > 0) {
            $item['user_id'] = $incomingUserId;
        }
        if (trim((string)($meta['user_name'] ?? '')) !== '') {
            $item['user_name'] = mb_substr(trim((string)$meta['user_name']), 0, 160);
        }
        if (trim((string)($meta['user_username'] ?? '')) !== '') {
            $item['user_username'] = mb_substr(trim((string)$meta['user_username']), 0, 160);
        }
        if (trim((string)($meta['user_email'] ?? '')) !== '') {
            $item['user_email'] = mb_substr(trim((string)$meta['user_email']), 0, 190);
        }
        $item['ip_address'] = mb_substr(trim((string)($meta['ip_address'] ?? $item['ip_address'] ?? '')), 0, 80);
        $item['user_agent'] = mb_substr(trim((string)($meta['user_agent'] ?? $item['user_agent'] ?? '')), 0, 255);
        $found = true;
        break;
    }
    unset($item);

    if (!$found && $deviceSignature !== '') {
        $legacyIndex = null;
        $legacyUserAgent = trim((string)($meta['user_agent'] ?? ''));

        foreach ($items as $index => $item) {
            $sameScope = (string)($item['scope'] ?? 'main') === $scope;
            $hasSignature = wp_install_sanitize_signature((string)($item['device_signature'] ?? '')) !== '';
            $sameUserAgent = $legacyUserAgent !== '' && hash_equals((string)($item['user_agent'] ?? ''), $legacyUserAgent);
            $activeItem = wp_install_is_active_seen_at((string)($item['last_seen_at'] ?? ''));

            if (!$sameScope || $hasSignature || !$sameUserAgent || !$activeItem) {
                continue;
            }

            if ($legacyIndex !== null) {
                $legacyIndex = null;
                break;
            }

            $legacyIndex = $index;
        }

        if ($legacyIndex !== null) {
            $items[$legacyIndex]['device_id'] = $deviceId;
            $items[$legacyIndex]['device_signature'] = $deviceSignature;
            $items[$legacyIndex]['last_seen_at'] = $now;
            $items[$legacyIndex]['source'] = $verifiedSource;
            $incomingUserId = max(0, (int)($meta['user_id'] ?? 0));
            if ($incomingUserId > 0) {
                $items[$legacyIndex]['user_id'] = $incomingUserId;
            }
            if (trim((string)($meta['user_name'] ?? '')) !== '') {
                $items[$legacyIndex]['user_name'] = mb_substr(trim((string)$meta['user_name']), 0, 160);
            }
            if (trim((string)($meta['user_username'] ?? '')) !== '') {
                $items[$legacyIndex]['user_username'] = mb_substr(trim((string)$meta['user_username']), 0, 160);
            }
            if (trim((string)($meta['user_email'] ?? '')) !== '') {
                $items[$legacyIndex]['user_email'] = mb_substr(trim((string)$meta['user_email']), 0, 190);
            }
            $items[$legacyIndex]['ip_address'] = mb_substr(trim((string)($meta['ip_address'] ?? $items[$legacyIndex]['ip_address'] ?? '')), 0, 80);
            $items[$legacyIndex]['user_agent'] = mb_substr($legacyUserAgent, 0, 255);
            $found = true;
        }
    }

    if (!$found) {
        $items[] = [
            'device_id' => $deviceId,
            'device_signature' => $deviceSignature,
            'scope' => $scope,
            'source' => $verifiedSource,
            'user_id' => max(0, (int)($meta['user_id'] ?? 0)),
            'user_name' => mb_substr(trim((string)($meta['user_name'] ?? '')), 0, 160),
            'user_username' => mb_substr(trim((string)($meta['user_username'] ?? '')), 0, 160),
            'user_email' => mb_substr(trim((string)($meta['user_email'] ?? '')), 0, 190),
            'ip_address' => mb_substr(trim((string)($meta['ip_address'] ?? '')), 0, 80),
            'user_agent' => mb_substr(trim((string)($meta['user_agent'] ?? '')), 0, 255),
            'installed_at' => $now,
            'last_seen_at' => $now,
        ];
    }

    if (!wp_install_write_store($items)) {
        return ['ok' => false, 'message' => 'Չհաջողվեց պահպանել տեղադրման տվյալները։'];
    }

    return [
        'ok' => true,
        'scope' => $scope,
        'stats' => wp_install_stats(),
    ];
}

function wp_install_mask_device_id(string $deviceId): string {
    $deviceId = trim($deviceId);
    if ($deviceId === '') {
        return '—';
    }

    if (mb_strlen($deviceId) <= 12) {
        return $deviceId;
    }

    return mb_substr($deviceId, 0, 8) . '…' . mb_substr($deviceId, -4);
}

function wp_install_list_devices(string $scope = 'main', bool $onlyActive = true, int $limit = 100): array {
    $scope = wp_install_normalize_scope($scope);
    $limit = max(1, min($limit, 300));
    $items = wp_install_read_store();
    $devices = [];

    foreach ($items as $item) {
        $itemScope = wp_install_normalize_scope((string)($item['scope'] ?? 'main'));
        $source = (string)($item['source'] ?? '');
        $seenAt = (string)($item['last_seen_at'] ?? '');

        if ($itemScope !== $scope) {
            continue;
        }
        if (!wp_install_is_verified_source($scope, $source)) {
            continue;
        }
        if ($onlyActive && !wp_install_is_active_seen_at($seenAt)) {
            continue;
        }

        $devices[] = $item;
    }

    usort($devices, static function (array $a, array $b): int {
        return strcmp((string)($b['last_seen_at'] ?? ''), (string)($a['last_seen_at'] ?? ''));
    });

    return array_slice($devices, 0, $limit);
}

function wp_install_stats(): array {
    $items = wp_install_read_store();
    $stats = [
        'total' => 0,
        'total_known' => 0,
        'window_days' => WP_INSTALL_ACTIVE_WINDOW_DAYS,
        'main' => ['count' => 0, 'known_count' => 0, 'last_seen_at' => ''],
        'admin' => ['count' => 0, 'known_count' => 0, 'last_seen_at' => ''],
    ];

    foreach ($items as $item) {
        $scope = wp_install_normalize_scope((string)($item['scope'] ?? 'main'));
        $source = (string)($item['source'] ?? '');
        $seenAt = (string)($item['last_seen_at'] ?? '');
        if (!wp_install_is_verified_source($scope, $source)) {
            continue;
        }

        $stats['total_known']++;
        $stats[$scope]['known_count']++;

        if (!wp_install_is_active_seen_at($seenAt)) {
            continue;
        }

        $stats['total']++;
        $stats[$scope]['count']++;

        if ($seenAt !== '' && ($stats[$scope]['last_seen_at'] === '' || strcmp($seenAt, $stats[$scope]['last_seen_at']) > 0)) {
            $stats[$scope]['last_seen_at'] = $seenAt;
        }
    }

    return $stats;
}

function wp_install_find_device(string $scope = 'main', string $deviceId = '', string $deviceSignature = ''): ?array {
    $scope = wp_install_normalize_scope($scope);
    $deviceId = wp_install_sanitize_device_id($deviceId);
    $deviceSignature = wp_install_sanitize_signature($deviceSignature);

    if ($deviceId === '' && $deviceSignature === '') {
        return null;
    }

    $items = wp_install_canonicalize_items(wp_install_read_store());

    foreach ($items as $item) {
        $itemScope = wp_install_normalize_scope((string)($item['scope'] ?? 'main'));
        $source = (string)($item['source'] ?? '');
        $sameDeviceId = $deviceId !== '' && hash_equals((string)($item['device_id'] ?? ''), $deviceId);
        $sameSignature = $deviceSignature !== '' && hash_equals((string)($item['device_signature'] ?? ''), $deviceSignature);

        if ($itemScope !== $scope) {
            continue;
        }

        if (!wp_install_is_verified_source($scope, $source)) {
            continue;
        }

        if ($sameDeviceId || $sameSignature) {
            return $item;
        }
    }

    return null;
}

function wp_install_clear_identity(string $scope, string $deviceId): bool {
    return wp_install_clear_identity_match($scope, $deviceId, '');
}

function wp_install_remove_device(string $scope, string $deviceId = '', string $deviceSignature = ''): bool {
    $scope = wp_install_normalize_scope($scope);
    $deviceId = wp_install_sanitize_device_id($deviceId);
    $deviceSignature = wp_install_sanitize_signature($deviceSignature);

    if ($deviceId === '' && $deviceSignature === '') {
        return false;
    }

    $items = wp_install_canonicalize_items(wp_install_read_store());
    $filtered = [];
    $removed = false;

    foreach ($items as $item) {
        $sameScope = (string)($item['scope'] ?? 'main') === $scope;
        $sameDeviceId = $deviceId !== '' && (string)($item['device_id'] ?? '') === $deviceId;
        $sameSignature = $deviceSignature !== '' && hash_equals((string)($item['device_signature'] ?? ''), $deviceSignature);

        if ($sameScope && ($sameDeviceId || $sameSignature)) {
            $removed = true;
            continue;
        }

        $filtered[] = $item;
    }

    if (!$removed) {
        return false;
    }

    return wp_install_write_store($filtered);
}

function wp_install_clear_identity_match(string $scope, string $deviceId = '', string $deviceSignature = '', int $userId = 0, string $userAgent = '', string $ipAddress = ''): bool {
    $scope = wp_install_normalize_scope($scope);
    $deviceId = wp_install_sanitize_device_id($deviceId);
    $deviceSignature = wp_install_sanitize_signature($deviceSignature);
    $userId = max(0, $userId);
    $userAgent = trim($userAgent);
    $ipAddress = trim($ipAddress);

    if ($deviceId === '' && $deviceSignature === '' && $userId === 0) {
        return false;
    }

    $items = wp_install_canonicalize_items(wp_install_read_store());
    $changed = false;

    foreach ($items as &$item) {
        $sameScope = (string)($item['scope'] ?? 'main') === $scope;
        $sameDeviceId = $deviceId !== '' && (string)($item['device_id'] ?? '') === $deviceId;
        $sameSignature = $deviceSignature !== '' && hash_equals((string)($item['device_signature'] ?? ''), $deviceSignature);
        $sameUser = $userId > 0 && (int)($item['user_id'] ?? 0) === $userId;
        $sameUserAgent = $userAgent !== '' && hash_equals((string)($item['user_agent'] ?? ''), $userAgent);
        $sameIp = $ipAddress !== '' && hash_equals((string)($item['ip_address'] ?? ''), $ipAddress);
        $sameSessionFingerprint = $sameUser && ($sameUserAgent || $sameIp);

        if (!$sameScope || (!$sameDeviceId && !$sameSignature && !$sameSessionFingerprint)) {
            continue;
        }

        $item['user_id'] = 0;
        $item['user_name'] = '';
        $item['user_username'] = '';
        $item['user_email'] = '';
        $changed = true;
    }
    unset($item);

    if (!$changed) {
        return false;
    }

    return wp_install_write_store($items);
}
