<?php
declare(strict_types=1);

require_once __DIR__ . '/version_config.php';

const WP_PUSH_QUEUE_KEY = 'push_queue_store';
const WP_PUSH_BLOCKED_KEY = 'push_blocked_store';

function wp_push_defaults(): array {
    return [
        'enabled' => true,
        'vapid_subject' => 'mailto:admin@worship.pmstudio.am',
        'vapid_public_key' => '',
        'vapid_private_key_pem' => '',
        'last_sent_at' => '',
        'last_sent_title' => '',
        'last_sent_url' => '',
    ];
}

function wp_push_sanitize_config(array $raw): array {
    $defaults = wp_push_defaults();
    $config = array_merge($defaults, $raw);
    $config['enabled'] = !empty($config['enabled']);
    $config['vapid_subject'] = mb_substr(trim((string)($config['vapid_subject'] ?? $defaults['vapid_subject'])) ?: $defaults['vapid_subject'], 0, 190);
    $config['vapid_public_key'] = preg_replace('/[^A-Za-z0-9\-_]/', '', (string)($config['vapid_public_key'] ?? '')) ?: '';
    $config['vapid_private_key_pem'] = trim((string)($config['vapid_private_key_pem'] ?? ''));
    $config['last_sent_at'] = wp_version_normalize_datetime($config['last_sent_at'] ?? '');
    $config['last_sent_title'] = mb_substr(trim((string)($config['last_sent_title'] ?? '')), 0, 160);
    $config['last_sent_url'] = mb_substr(trim((string)($config['last_sent_url'] ?? '')), 0, 260);
    return $config;
}

function wp_push_is_supported(): bool {
    return function_exists('openssl_pkey_new')
        && function_exists('openssl_sign')
        && function_exists('openssl_pkey_export')
        && function_exists('openssl_pkey_get_details');
}

function wp_push_load_config(): array {
    $defaults = wp_push_defaults();
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("SELECT setting_value FROM sys_settings WHERE setting_key = 'push_config'");
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $decoded = json_decode($row['setting_value'] ?? '', true);
            if (is_array($decoded)) {
                return wp_push_sanitize_config($decoded);
            }
        }
    } catch (Throwable $e) {}

    return $defaults;
}

function wp_push_save_config(array $payload): bool {
    $current = wp_push_load_config();
    $next = wp_push_sanitize_config(array_merge($current, $payload));
    
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('push_config', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt->bind_param('s', $json);
        return $stmt->execute();
    } catch (Throwable $e) {
        return false;
    }
}

function wp_push_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function wp_push_base64url_decode(string $data): string {
    $padding = 4 - (strlen($data) % 4);
    if ($padding < 4) {
        $data .= str_repeat('=', $padding);
    }
    $decoded = base64_decode(strtr($data, '-_', '+/'), true);
    return $decoded === false ? '' : $decoded;
}

function wp_push_generate_vapid_keys(): ?array {
    if (!wp_push_is_supported()) {
        return null;
    }

    $resource = @openssl_pkey_new([
        'private_key_type' => OPENSSL_KEYTYPE_EC,
        'curve_name' => 'prime256v1',
    ]);

    if (!$resource) {
        return null;
    }

    $privatePem = '';
    if (!@openssl_pkey_export($resource, $privatePem)) {
        return null;
    }

    $details = @openssl_pkey_get_details($resource);
    if (!is_array($details) || empty($details['ec']['x']) || empty($details['ec']['y'])) {
        return null;
    }

    $publicRaw = "\x04" . $details['ec']['x'] . $details['ec']['y'];

    return [
        'vapid_public_key' => wp_push_base64url_encode($publicRaw),
        'vapid_private_key_pem' => trim($privatePem),
    ];
}

function wp_push_bootstrap_config(): array {
    $config = wp_push_load_config();
    $config['supported'] = wp_push_is_supported();

    if (!$config['supported']) {
        return $config;
    }

    if ($config['vapid_public_key'] !== '' && $config['vapid_private_key_pem'] !== '') {
        return $config;
    }

    $generated = wp_push_generate_vapid_keys();
    if (!$generated) {
        return $config;
    }

    wp_push_save_config($generated);
    $config = wp_push_load_config();
    $config['supported'] = true;
    return $config;
}

function wp_push_read_sys_setting(string $key): array {
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("SELECT setting_value FROM sys_settings WHERE setting_key = ?");
        $stmt->bind_param('s', $key);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $decoded = json_decode($row['setting_value'] ?? '', true);
            return is_array($decoded) ? $decoded : [];
        }
    } catch (Throwable $e) {}
    return [];
}

function wp_push_write_sys_setting(string $key, array $payload): bool {
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt->bind_param('ss', $key, $json);
        return $stmt->execute();
    } catch (Throwable $e) {
        return false;
    }
}

function wp_push_subscription_id(string $endpoint): string {
    return hash('sha256', trim($endpoint));
}

function wp_push_device_placeholder_id(string $deviceId, string $deviceScope = 'main'): string {
    return 'device:' . hash('sha256', trim($deviceScope) . '|' . trim($deviceId));
}

function wp_push_normalize_ip(string $ip): string {
    $ip = trim($ip);
    if ($ip === '') {
        return '';
    }

    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
}

function wp_push_load_subscriptions(): array {
    $normalized = [];
    try {
        $conn = wp_runtime_open_mysqli();
        $result = $conn->query("SELECT * FROM push_subscriptions");
        while ($row = $result->fetch_assoc()) {
            $endpoint = trim((string)($row['endpoint'] ?? ''));
            $deviceId = mb_substr(trim((string)($row['device_id'] ?? '')), 0, 120);
            $deviceScope = in_array((string)($row['device_scope'] ?? 'main'), ['main', 'admin'], true) ? (string)$row['device_scope'] : 'main';
            if ($endpoint === '' && $deviceId === '') continue;

            $normalized[] = [
                'id' => (string)($row['id'] ?? ($endpoint !== '' ? wp_push_subscription_id($endpoint) : wp_push_device_placeholder_id($deviceId, $deviceScope))),
                'endpoint' => $endpoint,
                'public_key' => (string)($row['public_key'] ?? ''),
                'auth_key' => (string)($row['auth_key'] ?? ''),
                'user_agent' => mb_substr(trim((string)($row['user_agent'] ?? '')), 0, 255),
                'user_id' => (int)($row['user_id'] ?? 0),
                'user_name' => mb_substr(trim((string)($row['user_name'] ?? '')), 0, 190),
                'user_email' => mb_substr(trim((string)($row['user_email'] ?? '')), 0, 190),
                'ip_address' => wp_push_normalize_ip((string)($row['ip_address'] ?? '')),
                'device_id' => $deviceId,
                'device_scope' => $deviceScope,
                'permission_state' => in_array((string)($row['permission_state'] ?? 'granted'), ['granted', 'default', 'denied'], true) ? (string)$row['permission_state'] : 'granted',
                'is_active' => (int)($row['is_active'] ?? 1) === 1,
                'created_at' => wp_version_normalize_datetime($row['created_at'] ?? '') ?: wp_version_now_iso(),
                'updated_at' => wp_version_normalize_datetime($row['updated_at'] ?? '') ?: wp_version_now_iso(),
                'last_seen_at' => wp_version_normalize_datetime($row['last_seen_at'] ?? '') ?: '',
            ];
        }
    } catch (Throwable $e) {}

    return $normalized;
}

function wp_push_save_subscriptions(array $subscriptions): bool {
    try {
        $conn = wp_runtime_open_mysqli();
        $conn->begin_transaction();
        
        $conn->query("TRUNCATE TABLE push_subscriptions");
        $stmt = $conn->prepare("INSERT INTO push_subscriptions (id, endpoint, public_key, auth_key, user_agent, user_id, user_name, user_email, ip_address, device_id, device_scope, permission_state, is_active, created_at, updated_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($subscriptions as $sub) {
            $endpoint = trim((string)($sub['endpoint'] ?? ''));
            $device_id = $sub['device_id'] ?? '';
            if ($endpoint === '' && trim((string)$device_id) === '') {
                continue;
            }
            $id = $sub['id'] ?? ($endpoint !== '' ? wp_push_subscription_id($endpoint) : wp_push_device_placeholder_id((string)$device_id, (string)($sub['device_scope'] ?? 'main')));
            $public_key = $sub['public_key'] ?? '';
            $auth_key = $sub['auth_key'] ?? '';
            $user_agent = $sub['user_agent'] ?? '';
            $user_id = $sub['user_id'] ?? 0;
            $user_name = $sub['user_name'] ?? '';
            $user_email = $sub['user_email'] ?? '';
            $ip_address = $sub['ip_address'] ?? '';
            $device_scope = in_array((string)($sub['device_scope'] ?? 'main'), ['main', 'admin'], true) ? (string)$sub['device_scope'] : 'main';
            $permission_state = in_array((string)($sub['permission_state'] ?? 'granted'), ['granted', 'default', 'denied'], true) ? (string)$sub['permission_state'] : 'granted';
            $is_active = !array_key_exists('is_active', $sub) || !empty($sub['is_active']) ? 1 : 0;
            $created_at = $sub['created_at'] ?? '';
            $updated_at = $sub['updated_at'] ?? '';
            $last_seen_at = $sub['last_seen_at'] ?? null;
            if ($last_seen_at === '') $last_seen_at = null;
            
            $stmt->bind_param('sssssissssssisss', $id, $endpoint, $public_key, $auth_key, $user_agent, $user_id, $user_name, $user_email, $ip_address, $device_id, $device_scope, $permission_state, $is_active, $created_at, $updated_at, $last_seen_at);
            $stmt->execute();
        }
        
        $conn->commit();
        return true;
    } catch (Throwable $e) {
        if (isset($conn) && $conn instanceof mysqli) $conn->rollback();
        return false;
    }
}

function wp_push_load_blocked(): array {
    $rows = wp_push_read_sys_setting(WP_PUSH_BLOCKED_KEY);
    $normalized = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $id = trim((string)($row['id'] ?? ''));
        if ($id === '') {
            continue;
        }

        $normalized[] = [
            'id' => $id,
            'endpoint' => trim((string)($row['endpoint'] ?? '')),
            'blocked_at' => wp_version_normalize_datetime($row['blocked_at'] ?? '') ?: wp_version_now_iso(),
            'actor' => mb_substr(trim((string)($row['actor'] ?? 'admin')), 0, 190),
            'reason' => mb_substr(trim((string)($row['reason'] ?? '')), 0, 255),
        ];
    }

    return $normalized;
}

function wp_push_save_blocked(array $blocked): bool {
    return wp_push_write_sys_setting(WP_PUSH_BLOCKED_KEY, array_values($blocked));
}

function wp_push_is_blocked_endpoint(string $endpoint): bool {
    $id = wp_push_subscription_id($endpoint);
    foreach (wp_push_load_blocked() as $row) {
        if ((string)($row['id'] ?? '') === $id) {
            return true;
        }
    }
    return false;
}

function wp_push_block_endpoint(string $endpoint, string $actor = 'admin', string $reason = 'removed_by_admin'): bool {
    $endpoint = trim($endpoint);
    if ($endpoint === '') {
        return false;
    }

    $id = wp_push_subscription_id($endpoint);
    $blocked = wp_push_load_blocked();
    $found = false;

    foreach ($blocked as &$row) {
        if ((string)($row['id'] ?? '') !== $id) {
            continue;
        }
        $row['endpoint'] = $endpoint;
        $row['blocked_at'] = wp_version_now_iso();
        $row['actor'] = mb_substr(trim($actor) ?: 'admin', 0, 190);
        $row['reason'] = mb_substr(trim($reason), 0, 255);
        $found = true;
        break;
    }
    unset($row);

    if (!$found) {
        $blocked[] = [
            'id' => $id,
            'endpoint' => $endpoint,
            'blocked_at' => wp_version_now_iso(),
            'actor' => mb_substr(trim($actor) ?: 'admin', 0, 190),
            'reason' => mb_substr(trim($reason), 0, 255),
        ];
    }

    return wp_push_save_blocked($blocked);
}

function wp_push_unblock_endpoint(string $endpoint): bool {
    $endpoint = trim($endpoint);
    if ($endpoint === '') {
        return false;
    }

    $id = wp_push_subscription_id($endpoint);
    $blocked = array_values(array_filter(
        wp_push_load_blocked(),
        static fn(array $row): bool => (string)($row['id'] ?? '') !== $id
    ));

    return wp_push_save_blocked($blocked);
}

function wp_push_upsert_subscription(array $subscription, array $meta = []): array {
    $endpoint = trim((string)($subscription['endpoint'] ?? ''));
    $keys = is_array($subscription['keys'] ?? null) ? $subscription['keys'] : [];
    $publicKey = trim((string)($keys['p256dh'] ?? ''));
    $authKey = trim((string)($keys['auth'] ?? ''));
    $forceEnable = !empty($meta['force_enable']);

    if ($endpoint === '' || $publicKey === '' || $authKey === '') {
        return ['ok' => false, 'message' => 'Subscription տվյալները թերի են։'];
    }

    if (wp_push_is_blocked_endpoint($endpoint)) {
        if ($forceEnable) {
            wp_push_unblock_endpoint($endpoint);
        } else {
            return [
                'ok' => false,
                'disabled_by_admin' => true,
                'message' => 'Այս սարքի push ծանուցումները admin-ի կողմից անջատված են։',
            ];
        }
    }

    $subscriptions = wp_push_load_subscriptions();
    $id = wp_push_subscription_id($endpoint);
    $now = wp_version_now_iso();
    $found = false;
    $incomingDeviceId = mb_substr(trim((string)($meta['device_id'] ?? '')), 0, 120);
    $incomingDeviceScope = in_array((string)($meta['device_scope'] ?? 'main'), ['main', 'admin'], true) ? (string)$meta['device_scope'] : 'main';
    $clearUser = array_key_exists('clear_user', $meta) ? !empty($meta['clear_user']) : ((int)($meta['user_id'] ?? 0) <= 0);

    foreach ($subscriptions as &$row) {
        $matchesEndpoint = (string)$row['id'] === $id;
        $matchesDevice = !$matchesEndpoint
            && $incomingDeviceId !== ''
            && (string)($row['device_id'] ?? '') === $incomingDeviceId
            && (string)($row['device_scope'] ?? 'main') === $incomingDeviceScope;
        if (!$matchesEndpoint && !$matchesDevice) {
            continue;
        }

        $row['id'] = $id;
        $row['endpoint'] = $endpoint;
        $row['public_key'] = $publicKey;
        $row['auth_key'] = $authKey;
        $row['user_agent'] = mb_substr(trim((string)($meta['user_agent'] ?? $row['user_agent'] ?? '')), 0, 255);
        $row['user_id'] = $clearUser ? 0 : (!empty($meta['user_id']) ? (int)$meta['user_id'] : (int)($row['user_id'] ?? 0));
        $row['user_name'] = $clearUser ? '' : mb_substr(trim((string)($meta['user_name'] ?? $row['user_name'] ?? '')), 0, 190);
        $row['user_email'] = $clearUser ? '' : mb_substr(trim((string)($meta['user_email'] ?? $row['user_email'] ?? '')), 0, 190);
        $row['ip_address'] = wp_push_normalize_ip((string)($meta['ip_address'] ?? $row['ip_address'] ?? ''));
        $row['device_id'] = $incomingDeviceId !== '' ? $incomingDeviceId : mb_substr(trim((string)($row['device_id'] ?? '')), 0, 120);
        $nextDeviceScope = (string)($meta['device_scope'] ?? $row['device_scope'] ?? 'main');
        $nextPermissionState = (string)($meta['permission_state'] ?? 'granted');
        $row['device_scope'] = in_array($nextDeviceScope, ['main', 'admin'], true) ? $nextDeviceScope : 'main';
        $row['permission_state'] = in_array($nextPermissionState, ['granted', 'default', 'denied'], true) ? $nextPermissionState : 'granted';
        $row['is_active'] = $row['permission_state'] === 'granted';
        $row['updated_at'] = $now;
        $row['last_seen_at'] = $now;
        $found = true;
        break;
    }
    unset($row);

    if (!$found) {
        $newDeviceScope = (string)($meta['device_scope'] ?? 'main');
        $newPermissionState = (string)($meta['permission_state'] ?? 'granted');
        $newPermissionState = in_array($newPermissionState, ['granted', 'default', 'denied'], true) ? $newPermissionState : 'granted';
        $subscriptions[] = [
            'id' => $id,
            'endpoint' => $endpoint,
            'public_key' => $publicKey,
            'auth_key' => $authKey,
            'user_agent' => mb_substr(trim((string)($meta['user_agent'] ?? '')), 0, 255),
            'user_id' => $clearUser ? 0 : (!empty($meta['user_id']) ? (int)$meta['user_id'] : 0),
            'user_name' => $clearUser ? '' : mb_substr(trim((string)($meta['user_name'] ?? '')), 0, 190),
            'user_email' => $clearUser ? '' : mb_substr(trim((string)($meta['user_email'] ?? '')), 0, 190),
            'ip_address' => wp_push_normalize_ip((string)($meta['ip_address'] ?? '')),
            'device_id' => mb_substr(trim((string)($meta['device_id'] ?? '')), 0, 120),
            'device_scope' => in_array($newDeviceScope, ['main', 'admin'], true) ? $newDeviceScope : 'main',
            'permission_state' => $newPermissionState,
            'is_active' => $newPermissionState === 'granted',
            'created_at' => $now,
            'updated_at' => $now,
            'last_seen_at' => $now,
        ];
    }

    if (!wp_push_save_subscriptions($subscriptions)) {
        return ['ok' => false, 'message' => 'Չհաջողվեց պահպանել subscription-ը։'];
    }

    return ['ok' => true, 'id' => $id];
}

function wp_push_remove_subscription_by_endpoint(string $endpoint): bool {
    $endpoint = trim($endpoint);
    if ($endpoint === '') {
        return false;
    }

    $id = wp_push_subscription_id($endpoint);
    $subscriptions = array_values(array_filter(
        wp_push_load_subscriptions(),
        static fn(array $row): bool => (string)($row['id'] ?? '') !== $id
    ));

    wp_push_remove_queued_for_subscription($id);
    return wp_push_save_subscriptions($subscriptions);
}

function wp_push_sync_client_status(array $payload, array $meta = []): array {
    $endpoint = trim((string)($payload['endpoint'] ?? ''));
    $permission = (string)($payload['permission'] ?? 'default');
    $permission = in_array($permission, ['granted', 'default', 'denied'], true) ? $permission : 'default';
    $subscribed = !empty($payload['subscribed']) && $endpoint !== '' && $permission === 'granted';
    $id = $endpoint !== '' ? wp_push_subscription_id($endpoint) : '';
    $deviceId = mb_substr(trim((string)($payload['device_id'] ?? '')), 0, 120);
    $deviceScope = in_array((string)($payload['device_scope'] ?? 'main'), ['main', 'admin'], true) ? (string)$payload['device_scope'] : 'main';
    $now = wp_version_now_iso();
    $subscriptions = wp_push_load_subscriptions();
    $changed = false;
    $found = false;
    $clearUser = array_key_exists('clear_user', $meta) ? !empty($meta['clear_user']) : ((int)($meta['user_id'] ?? 0) <= 0);

    foreach ($subscriptions as &$row) {
        $matchesEndpoint = $id !== '' && (string)($row['id'] ?? '') === $id;
        $matchesDevice = !$matchesEndpoint
            && $deviceId !== ''
            && (string)($row['device_id'] ?? '') === $deviceId
            && (string)($row['device_scope'] ?? 'main') === $deviceScope;

        if (!$matchesEndpoint && !$matchesDevice) {
            continue;
        }

        $found = true;
        $row['permission_state'] = $permission;
        $row['is_active'] = $subscribed;
        $row['last_seen_at'] = $now;
        $row['updated_at'] = $now;
        if ($deviceId !== '') $row['device_id'] = $deviceId;
        $row['device_scope'] = $deviceScope;
        if ($endpoint !== '') {
            $row['id'] = $id;
            $row['endpoint'] = $endpoint;
        }
        if ($clearUser) {
            $row['user_id'] = 0;
            $row['user_name'] = '';
            $row['user_email'] = '';
            wp_push_remove_queued_for_subscription((string)($row['id'] ?? ''));
        } else {
            if (!empty($meta['user_id'])) $row['user_id'] = (int)$meta['user_id'];
            if (!empty($meta['user_name'])) $row['user_name'] = mb_substr(trim((string)$meta['user_name']), 0, 190);
            if (!empty($meta['user_email'])) $row['user_email'] = mb_substr(trim((string)$meta['user_email']), 0, 190);
        }
        if (!empty($meta['ip_address'])) $row['ip_address'] = wp_push_normalize_ip((string)$meta['ip_address']);
        $changed = true;
    }
    unset($row);

    if (!$found && $deviceId !== '') {
        $subscriptions[] = [
            'id' => $id !== '' ? $id : wp_push_device_placeholder_id($deviceId, $deviceScope),
            'endpoint' => $endpoint,
            'public_key' => '',
            'auth_key' => '',
            'user_agent' => mb_substr(trim((string)($meta['user_agent'] ?? '')), 0, 255),
            'user_id' => $clearUser ? 0 : (!empty($meta['user_id']) ? (int)$meta['user_id'] : 0),
            'user_name' => $clearUser ? '' : mb_substr(trim((string)($meta['user_name'] ?? '')), 0, 190),
            'user_email' => $clearUser ? '' : mb_substr(trim((string)($meta['user_email'] ?? '')), 0, 190),
            'ip_address' => wp_push_normalize_ip((string)($meta['ip_address'] ?? '')),
            'device_id' => $deviceId,
            'device_scope' => $deviceScope,
            'permission_state' => $permission,
            'is_active' => $subscribed,
            'created_at' => $now,
            'updated_at' => $now,
            'last_seen_at' => $now,
        ];
        $changed = true;
    }

    if ($changed) {
        wp_push_save_subscriptions($subscriptions);
    }

    return ['ok' => true, 'synced' => $changed, 'permission' => $permission, 'subscribed' => $subscribed];
}

function wp_push_find_subscription_by_id(string $id): ?array {
    $id = trim($id);
    if ($id === '') {
        return null;
    }

    foreach (wp_push_load_subscriptions() as $subscription) {
        if ((string)($subscription['id'] ?? '') === $id) {
            return $subscription;
        }
    }

    return null;
}

function wp_push_remove_subscription_by_id(string $id): bool {
    $subscription = wp_push_find_subscription_by_id($id);
    if (!$subscription) {
        return false;
    }

    return wp_push_remove_subscription_by_endpoint((string)($subscription['endpoint'] ?? ''));
}

function wp_push_load_queue(): array {
    $rows = wp_push_read_sys_setting(WP_PUSH_QUEUE_KEY);
    $normalized = [];

    foreach ($rows as $row) {
        if (!is_array($row) || empty($row['subscription_id'])) {
            continue;
        }

        $normalized[] = [
            'id' => (string)($row['id'] ?? ''),
            'subscription_id' => (string)$row['subscription_id'],
            'title' => mb_substr(trim((string)($row['title'] ?? '')), 0, 160),
            'body' => mb_substr(trim((string)($row['body'] ?? '')), 0, 600),
            'url' => mb_substr(trim((string)($row['url'] ?? '')), 0, 260),
            'icon' => mb_substr(trim((string)($row['icon'] ?? '')), 0, 260),
            'tag' => mb_substr(trim((string)($row['tag'] ?? '')), 0, 120),
            'created_at' => wp_version_normalize_datetime($row['created_at'] ?? '') ?: wp_version_now_iso(),
        ];
    }

    return $normalized;
}

function wp_push_save_queue(array $queue): bool {
    return wp_push_write_sys_setting(WP_PUSH_QUEUE_KEY, array_values($queue));
}

function wp_push_remove_queued_for_subscription(string $subscriptionId): void {
    if ($subscriptionId === '') {
        return;
    }

    $queue = array_values(array_filter(
        wp_push_load_queue(),
        static fn(array $item): bool => (string)($item['subscription_id'] ?? '') !== $subscriptionId
    ));
    wp_push_save_queue($queue);
}

function wp_push_detach_user_from_device(string $deviceId = '', string $deviceScope = 'main', int $userId = 0, string $userAgent = '', string $ipAddress = ''): int {
    $deviceId = mb_substr(trim($deviceId), 0, 120);
    $deviceScope = in_array($deviceScope, ['main', 'admin'], true) ? $deviceScope : 'main';
    $userAgent = mb_substr(trim($userAgent), 0, 255);
    $ipAddress = wp_push_normalize_ip($ipAddress);

    $subscriptions = wp_push_load_subscriptions();
    if (!$subscriptions) {
        return 0;
    }

    $changed = false;
    $detachedCount = 0;

    foreach ($subscriptions as &$row) {
        $matchesDevice = $deviceId !== ''
            && (string)($row['device_id'] ?? '') === $deviceId
            && (string)($row['device_scope'] ?? 'main') === $deviceScope;

        $matchesFallback = !$matchesDevice
            && $deviceId === ''
            && $userId > 0
            && (int)($row['user_id'] ?? 0) === $userId
            && $userAgent !== ''
            && strcasecmp((string)($row['user_agent'] ?? ''), $userAgent) === 0
            && $ipAddress !== ''
            && (string)($row['ip_address'] ?? '') === $ipAddress;

        if (!$matchesDevice && !$matchesFallback) {
            continue;
        }

        if ((int)($row['user_id'] ?? 0) <= 0
            && trim((string)($row['user_name'] ?? '')) === ''
            && trim((string)($row['user_email'] ?? '')) === '') {
            continue;
        }

        $row['user_id'] = 0;
        $row['user_name'] = '';
        $row['user_email'] = '';
        $row['updated_at'] = wp_version_now_iso();
        wp_push_remove_queued_for_subscription((string)($row['id'] ?? ''));
        $changed = true;
        $detachedCount++;
    }
    unset($row);

    if ($changed) {
        wp_push_save_subscriptions($subscriptions);
    }

    return $detachedCount;
}

function wp_push_enqueue(array $subscriptionIds, array $payload): int {
    $queue = wp_push_load_queue();
    $now = wp_version_now_iso();
    $count = 0;

    foreach ($subscriptionIds as $subscriptionId) {
        $subscriptionId = trim((string)$subscriptionId);
        if ($subscriptionId === '') {
            continue;
        }

        $queue[] = [
            'id' => bin2hex(random_bytes(8)),
            'subscription_id' => $subscriptionId,
            'title' => mb_substr(trim((string)($payload['title'] ?? '')), 0, 160),
            'body' => mb_substr(trim((string)($payload['body'] ?? '')), 0, 600),
            'url' => mb_substr(trim((string)($payload['url'] ?? '/')), 0, 260) ?: '/',
            'icon' => mb_substr(trim((string)($payload['icon'] ?? '/wolarm_youth.png')), 0, 260) ?: '/wolarm_youth.png',
            'tag' => mb_substr(trim((string)($payload['tag'] ?? 'worship-general')), 0, 120) ?: 'worship-general',
            'created_at' => $now,
        ];
        $count++;
    }

    if (count($queue) > 500) {
        $queue = array_slice($queue, -500);
    }

    wp_push_save_queue($queue);
    return $count;
}

function wp_push_pull_for_endpoint(string $endpoint): ?array {
    $endpoint = trim($endpoint);
    if ($endpoint === '') {
        return null;
    }

    $subscriptionId = wp_push_subscription_id($endpoint);
    $queue = wp_push_load_queue();
    $latest = null;
    $remaining = [];

    foreach ($queue as $item) {
        if ((string)($item['subscription_id'] ?? '') === $subscriptionId) {
            $latest = $item;
            continue;
        }
        $remaining[] = $item;
    }

    if ($latest !== null) {
        wp_push_save_queue($remaining);
    }

    return $latest;
}

function wp_push_stats(): array {
    $config = wp_push_bootstrap_config();
    $subscriptions = wp_push_load_subscriptions();
    $active = array_values(array_filter($subscriptions, static function (array $row): bool {
        return !empty($row['is_active'])
            && (string)($row['permission_state'] ?? '') === 'granted'
            && trim((string)($row['device_id'] ?? '')) !== '';
    }));
    $activeMain = array_values(array_filter($active, static fn(array $row): bool => (string)($row['device_scope'] ?? 'main') === 'main'));
    $activeAdmin = array_values(array_filter($active, static fn(array $row): bool => (string)($row['device_scope'] ?? 'main') === 'admin'));
    return [
        'enabled' => !empty($config['enabled']),
        'supported' => !empty($config['supported']),
        'subscriptions' => count($subscriptions),
        'active_subscriptions' => count($active),
        'active_main_subscriptions' => count($activeMain),
        'active_admin_subscriptions' => count($activeAdmin),
        'queued' => count(wp_push_load_queue()),
        'last_sent_at' => (string)($config['last_sent_at'] ?? ''),
        'last_sent_title' => (string)($config['last_sent_title'] ?? ''),
    ];
}

function wp_push_history_append(array $entry): void {
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("INSERT INTO push_history (id, at, actor, title, body, url, icon, tag, devices_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $id = $entry['id'] ?? bin2hex(random_bytes(8));
        $at = wp_version_normalize_datetime($entry['created_at'] ?? '') ?: wp_version_now_iso();
        $actor = mb_substr(trim((string)($entry['actor'] ?? 'admin')), 0, 190);
        $title = mb_substr(trim((string)($entry['title'] ?? '')), 0, 160);
        $body = (string)($entry['body'] ?? '');
        $url = mb_substr(trim((string)($entry['url'] ?? '')), 0, 260);
        $icon = mb_substr(trim((string)($entry['icon'] ?? '')), 0, 260);
        $tag = mb_substr(trim((string)($entry['tag'] ?? '')), 0, 100);
        $devices_count = (int)($entry['queued'] ?? 0);
        
        $stmt->bind_param('ssssssssi', $id, $at, $actor, $title, $body, $url, $icon, $tag, $devices_count);
        $stmt->execute();
    } catch (Throwable $e) {}
}

function wp_push_history_load(int $limit = 20): array {
    $items = [];
    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare("SELECT * FROM push_history ORDER BY at DESC LIMIT ?");
        $stmt->bind_param('i', $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $items[] = [
                'id' => (string)($row['id'] ?? ''),
                'title' => (string)($row['title'] ?? ''),
                'body' => (string)($row['body'] ?? ''),
                'url' => (string)($row['url'] ?? ''),
                'tag' => (string)($row['tag'] ?? ''),
                'actor' => (string)($row['actor'] ?? 'admin'),
                'created_at' => wp_version_normalize_datetime($row['at'] ?? '') ?: wp_version_now_iso(),
                'queued' => (int)($row['devices_count'] ?? 0),
                'success' => 0,
                'failed' => 0,
                'removed' => 0,
            ];
        }
    } catch (Throwable $e) {}
    
    return $items;
}

function wp_push_history_clear(): bool {
    try {
        $conn = wp_runtime_open_mysqli();
        return $conn->query("TRUNCATE TABLE push_history");
    } catch (Throwable $e) {
        return false;
    }
}

function wp_push_der_to_jose(string $der, int $partLength = 32): string {
    $offset = 0;

    if (ord($der[$offset]) !== 0x30) {
        return '';
    }
    $offset++;
    $seqLen = ord($der[$offset]);
    $offset++;
    if ($seqLen & 0x80) {
        $byteCount = $seqLen & 0x7f;
        $seqLen = 0;
        for ($i = 0; $i < $byteCount; $i++) {
            $seqLen = ($seqLen << 8) | ord($der[$offset + $i]);
        }
        $offset += $byteCount;
    }

    $readInteger = static function(string $der, int &$offset, int $partLength): string {
        if (ord($der[$offset]) !== 0x02) {
            return '';
        }
        $offset++;
        $len = ord($der[$offset]);
        $offset++;
        if ($len & 0x80) {
            $byteCount = $len & 0x7f;
            $len = 0;
            for ($i = 0; $i < $byteCount; $i++) {
                $len = ($len << 8) | ord($der[$offset + $i]);
            }
            $offset += $byteCount;
        }
        $value = substr($der, $offset, $len);
        $offset += $len;
        $value = ltrim($value, "\x00");
        return str_pad($value, $partLength, "\x00", STR_PAD_LEFT);
    };

    $r = $readInteger($der, $offset, $partLength);
    $s = $readInteger($der, $offset, $partLength);

    return $r !== '' && $s !== '' ? $r . $s : '';
}

function wp_push_build_vapid_jwt(string $audience, string $subject, string $privateKeyPem): ?string {
    $header = wp_push_base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256'], JSON_UNESCAPED_SLASHES));
    $claims = wp_push_base64url_encode(json_encode([
        'aud' => $audience,
        'exp' => time() + 3600,
        'sub' => $subject,
    ], JSON_UNESCAPED_SLASHES));

    $data = $header . '.' . $claims;
    $signature = '';

    if (!@openssl_sign($data, $signature, $privateKeyPem, OPENSSL_ALGO_SHA256)) {
        return null;
    }

    $jose = wp_push_der_to_jose($signature, 32);
    if ($jose === '') {
        return null;
    }

    return $data . '.' . wp_push_base64url_encode($jose);
}

function wp_push_post_signal(string $endpoint, array $headers, string $payload = ''): array {
    $status = 0;
    $error = '';

    if (function_exists('curl_init')) {
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
        ]);
        curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = (string)curl_error($ch);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'ignore_errors' => true,
                'timeout' => 20,
                'header' => implode("\r\n", $headers),
                'content' => $payload,
            ],
        ]);
        @file_get_contents($endpoint, false, $context);
        $responseHeaders = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : ($http_response_header ?? []);
        if (!empty($responseHeaders[0]) && preg_match('/\s(\d{3})\s/', (string)$responseHeaders[0], $match)) {
            $status = (int)$match[1];
        }
    }

    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'error' => $error,
    ];
}

function wp_push_send_signal(array $subscription, array $config): array {
    $endpoint = trim((string)($subscription['endpoint'] ?? ''));
    if ($endpoint === '') {
        return ['ok' => false, 'status' => 0, 'error' => 'endpoint missing'];
    }

    $parts = parse_url($endpoint);
    if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
        return ['ok' => false, 'status' => 0, 'error' => 'invalid endpoint'];
    }

    $audience = $parts['scheme'] . '://' . $parts['host'] . (!empty($parts['port']) ? ':' . $parts['port'] : '');
    $jwt = wp_push_build_vapid_jwt($audience, (string)$config['vapid_subject'], (string)$config['vapid_private_key_pem']);

    if ($jwt === null || empty($config['vapid_public_key'])) {
        return ['ok' => false, 'status' => 0, 'error' => 'vapid unavailable'];
    }

    $modernHeaders = [
        'TTL: 60',
        'Urgency: high',
        'Content-Length: 0',
        'Authorization: vapid t=' . $jwt . ', k=' . (string)$config['vapid_public_key'],
    ];

    $modernResult = wp_push_post_signal($endpoint, $modernHeaders);
    $modernResult['mode'] = 'vapid';
    if (!empty($modernResult['ok'])) {
        return $modernResult;
    }

    $legacyHeaders = [
        'TTL: 60',
        'Urgency: high',
        'Content-Length: 0',
        'Authorization: WebPush ' . $jwt,
        'Crypto-Key: p256ecdsa=' . (string)$config['vapid_public_key'],
    ];

    $legacyResult = wp_push_post_signal($endpoint, $legacyHeaders);
    $legacyResult['mode'] = 'legacy';

    if (!empty($legacyResult['ok'])) {
        return $legacyResult;
    }

    if ((int)($legacyResult['status'] ?? 0) > 0) {
        return $legacyResult;
    }

    return $modernResult;
}

function wp_push_send_notification(array $payload): array {
    $config = wp_push_bootstrap_config();

    if (empty($config['supported'])) {
        return ['ok' => false, 'message' => 'Սերվերում OpenSSL աջակցություն չկա push notifications-ի համար։'];
    }

    if (empty($config['enabled'])) {
        return ['ok' => false, 'message' => 'Push Notifications-ը այժմ անջատված է։'];
    }

    $subscriptions = wp_push_load_subscriptions();
    if (!$subscriptions) {
        return ['ok' => false, 'message' => 'Գրանցված push subscription դեռ չկա։'];
    }

    $subscriptionIds = array_map(static fn(array $row): string => (string)$row['id'], $subscriptions);
    $queued = wp_push_enqueue($subscriptionIds, $payload);

    $success = 0;
    $failed = 0;
    $removed = 0;
    $errorSamples = [];

    foreach ($subscriptions as $subscription) {
        $result = wp_push_send_signal($subscription, $config);
        if (!empty($result['ok'])) {
            $success++;
            continue;
        }

        $failed++;
        $status = (int)($result['status'] ?? 0);
        if (count($errorSamples) < 3) {
            $errorSamples[] = trim((string)($result['error'] ?? '')) !== ''
                ? ('#' . $status . ' ' . trim((string)$result['error']))
                : ('#' . $status . ' signal failed');
        }
        if ($status === 404 || $status === 410) {
            $removed++;
            wp_push_remove_subscription_by_endpoint((string)($subscription['endpoint'] ?? ''));
        }
    }

    wp_push_save_config([
        'last_sent_at' => wp_version_now_iso(),
        'last_sent_title' => trim((string)($payload['title'] ?? '')),
        'last_sent_url' => trim((string)($payload['url'] ?? '/')),
    ]);

    $result = [
        'ok' => $success > 0,
        'message' => 'Push-ը հերթագրվեց ' . $queued . ' սարքի համար, ուղարկվեց signal ' . $success . ' subscription-ի, ձախողվեց ' . $failed . ' subscription-ի համար' . ($removed > 0 ? ', և ' . $removed . ' ժամկետանց subscription հեռացվեց։' : '։'),
        'queued' => $queued,
        'success' => $success,
        'failed' => $failed,
        'removed' => $removed,
        'errors' => $errorSamples,
    ];

    if ($success === 0 && $errorSamples) {
        $result['message'] .= ' Օրինակ սխալներ՝ ' . implode(' • ', $errorSamples);
    }

    wp_push_history_append([
        'id' => bin2hex(random_bytes(8)),
        'title' => trim((string)($payload['title'] ?? '')),
        'body' => trim((string)($payload['body'] ?? '')),
        'url' => trim((string)($payload['url'] ?? '/')),
        'tag' => trim((string)($payload['tag'] ?? '')),
        'actor' => trim((string)($payload['actor'] ?? 'admin')),
        'created_at' => wp_version_now_iso(),
        'queued' => $queued,
        'success' => $success,
        'failed' => $failed,
        'removed' => $removed,
        'errors' => $errorSamples,
    ]);

    return $result;
}

function wp_push_send_to_user($pdo, int $user_id, string $title, string $body, string $url = '/main.html'): array {
    $config = wp_push_bootstrap_config();
    if (empty($config['supported']) || empty($config['enabled'])) {
        return ['ok' => false, 'message' => 'Push disabled.'];
    }

    $st = $pdo->prepare("SELECT * FROM push_subscriptions WHERE user_id = ? AND is_active = 1 AND permission_state = 'granted'");
    $st->execute([$user_id]);
    $subs = $st->fetchAll(\PDO::FETCH_ASSOC);
    if (!$subs) {
        return ['ok' => false, 'message' => 'No subscriptions found for user.'];
    }

    $payload = [
        'title' => $title,
        'body' => $body,
        'url' => $url,
        'icon' => '/wolarm_youth.png',
        'tag' => 'worship-direct'
    ];

    $subscriptionIds = array_map(static fn(array $row): string => (string)$row['id'], $subs);
    wp_push_enqueue($subscriptionIds, $payload);

    $success = 0;
    $failed = 0;
    $removed = 0;
    $errorSamples = [];
    foreach ($subs as $sub) {
        $result = wp_push_send_signal($sub, $config);
        if (!empty($result['ok'])) {
            $success++;
        } else {
            $failed++;
            $status = (int)($result['status'] ?? 0);
            if (count($errorSamples) < 3) {
                $errorSamples[] = trim((string)($result['error'] ?? '')) !== ''
                    ? ('#' . $status . ' ' . trim((string)$result['error']))
                    : ('#' . $status . ' signal failed');
            }
        }

        if (($result['status'] ?? 0) === 404 || ($result['status'] ?? 0) === 410) {
            $removed++;
            wp_push_remove_subscription_by_endpoint((string)($sub['endpoint'] ?? ''));
        }
    }

    return [
        'ok' => $success > 0,
        'success_count' => $success,
        'failed' => $failed,
        'removed' => $removed,
        'errors' => $errorSamples,
        'message' => $success > 0
            ? 'Push sent to ' . $success . ' subscription(s).'
            : 'Push signal failed for all subscriptions.',
    ];
}
