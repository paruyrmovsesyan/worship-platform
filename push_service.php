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

function wp_push_credential_spec(string $type): ?array {
    return match ($type) {
        'apns' => [
            'filename' => 'AuthKey_APNS.p8',
            'extension' => 'p8',
            'max_bytes' => 65536,
            'label' => 'iOS APNS AuthKey',
        ],
        'firebase' => [
            'filename' => 'firebase_service_account.json',
            'extension' => 'json',
            'max_bytes' => 2097152,
            'label' => 'Firebase Service Account',
        ],
        default => null,
    };
}

function wp_push_credential_candidates(string $type): array {
    $spec = wp_push_credential_spec($type);
    if ($spec === null) return [];

    $filename = (string)$spec['filename'];
    return [
        __DIR__ . '/uploads/push_credentials/' . $filename,
        __DIR__ . '/uploads/' . $filename,
        __DIR__ . '/' . $filename,
    ];
}

function wp_push_credential_path(string $type): string {
    foreach (wp_push_credential_candidates($type) as $candidate) {
        if (is_file($candidate) && is_readable($candidate)) {
            return $candidate;
        }
    }

    $candidates = wp_push_credential_candidates($type);
    return $candidates[0] ?? '';
}

function wp_push_credential_is_available(string $type): bool {
    $path = wp_push_credential_path($type);
    return $path !== '' && is_file($path) && is_readable($path) && (int)filesize($path) > 0;
}

function wp_push_validate_credential_content(string $type, string $content): ?string {
    if ($type === 'apns') {
        if (
            !str_contains($content, '-----BEGIN PRIVATE KEY-----')
            || !str_contains($content, '-----END PRIVATE KEY-----')
        ) {
            return 'Ընտրված .p8 ֆայլը վավեր APNS private key չէ։';
        }
        return null;
    }

    if ($type === 'firebase') {
        $decoded = json_decode($content, true);
        if (
            !is_array($decoded)
            || ($decoded['type'] ?? '') !== 'service_account'
            || trim((string)($decoded['project_id'] ?? '')) === ''
            || trim((string)($decoded['client_email'] ?? '')) === ''
            || !str_contains((string)($decoded['private_key'] ?? ''), 'BEGIN PRIVATE KEY')
        ) {
            return 'Ընտրված JSON-ը վավեր Firebase service account ֆայլ չէ։';
        }
        return null;
    }

    return 'Push credential-ի տեսակը չի ճանաչվել։';
}

function wp_push_store_credential_upload(array $file, string $type): array {
    $spec = wp_push_credential_spec($type);
    if ($spec === null) {
        return ['ok' => false, 'uploaded' => false, 'message' => 'Push credential-ի տեսակը չի ճանաչվել։'];
    }

    $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        return ['ok' => true, 'uploaded' => false, 'message' => ''];
    }
    if ($error !== UPLOAD_ERR_OK) {
        $errorMessage = match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ֆայլը գերազանցում է սերվերի թույլատրելի չափը։',
            UPLOAD_ERR_PARTIAL => 'Ֆայլը բեռնվել է մասամբ։ Փորձեք կրկին։',
            UPLOAD_ERR_NO_TMP_DIR => 'Սերվերի ժամանակավոր upload պանակը հասանելի չէ։',
            UPLOAD_ERR_CANT_WRITE => 'Սերվերը չկարողացավ գրել բեռնված ֆայլը։',
            UPLOAD_ERR_EXTENSION => 'Սերվերի PHP extension-ը կանգնեցրել է upload-ը։',
            default => 'Ֆայլի բեռնումը չհաջողվեց (կոդ ' . $error . ')։',
        };
        return ['ok' => false, 'uploaded' => false, 'message' => $errorMessage];
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath) || !is_readable($tmpPath)) {
        return ['ok' => false, 'uploaded' => false, 'message' => 'Բեռնված ժամանակավոր ֆայլը հասանելի չէ։'];
    }

    $extension = strtolower((string)pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
    if ($extension !== (string)$spec['extension']) {
        return [
            'ok' => false,
            'uploaded' => false,
            'message' => (string)$spec['label'] . ' ֆայլը պետք է լինի .' . (string)$spec['extension'] . ' ձևաչափով։',
        ];
    }

    $size = (int)($file['size'] ?? filesize($tmpPath) ?: 0);
    if ($size <= 0 || $size > (int)$spec['max_bytes']) {
        return ['ok' => false, 'uploaded' => false, 'message' => (string)$spec['label'] . ' ֆայլի չափը թույլատրելի չէ։'];
    }

    $content = (string)file_get_contents($tmpPath);
    $validationError = wp_push_validate_credential_content($type, $content);
    if ($validationError !== null) {
        return ['ok' => false, 'uploaded' => false, 'message' => $validationError];
    }

    $targetDir = __DIR__ . '/uploads/push_credentials';
    if (!is_dir($targetDir) && !@mkdir($targetDir, 0750, true) && !is_dir($targetDir)) {
        return ['ok' => false, 'uploaded' => false, 'message' => 'Push credential-ների պահպանման պանակը ստեղծել չհաջողվեց։'];
    }
    if (!is_writable($targetDir)) {
        return ['ok' => false, 'uploaded' => false, 'message' => 'Push credential-ների պահպանման պանակը writable չէ։'];
    }

    $destination = $targetDir . '/' . (string)$spec['filename'];
    $temporaryDestination = $destination . '.uploading-' . bin2hex(random_bytes(6));
    if (!move_uploaded_file($tmpPath, $temporaryDestination)) {
        return ['ok' => false, 'uploaded' => false, 'message' => 'Սերվերը չկարողացավ պահպանել բեռնված ֆայլը։'];
    }
    @chmod($temporaryDestination, 0600);

    if (!@rename($temporaryDestination, $destination)) {
        @unlink($temporaryDestination);
        return ['ok' => false, 'uploaded' => false, 'message' => 'Բեռնված ֆայլը վերջնական path-ում պահպանել չհաջողվեց։'];
    }
    @chmod($destination, 0600);
    clearstatcache(true, $destination);

    if (!is_file($destination) || !is_readable($destination) || (int)filesize($destination) !== $size) {
        return ['ok' => false, 'uploaded' => false, 'message' => 'Ֆայլը պահպանվեց, բայց սերվերը չկարողացավ հաստատել այն։'];
    }

    return [
        'ok' => true,
        'uploaded' => true,
        'message' => (string)$spec['label'] . ' ֆայլը պահպանվեց։',
        'path' => $destination,
    ];
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
        $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES ('push_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        $json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt->bind_param('ss', $json, $json);
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
        $stmt = $conn->prepare("INSERT INTO sys_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt->bind_param('sss', $key, $json, $json);
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
        if ($result instanceof mysqli_result) {
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
            $result->free();
        }
        $conn->close();
    } catch (Throwable $e) {}

    if (empty($normalized)) {
        $legacy = wp_push_legacy_backup_rows();
        if ($legacy) {
            foreach ($legacy as $row) {
                $endpoint = trim((string)($row['endpoint'] ?? ''));
                if ($endpoint === '') continue;
                $id = wp_push_subscription_id($endpoint);
                $normalized[] = [
                    'id' => $id,
                    'endpoint' => $endpoint,
                    'public_key' => (string)($row['public_key'] ?? ''),
                    'auth_key' => (string)($row['auth_key'] ?? ''),
                    'user_agent' => mb_substr(trim((string)($row['user_agent'] ?? '')), 0, 255),
                    'user_id' => (int)($row['user_id'] ?? 0),
                    'user_name' => mb_substr(trim((string)($row['user_name'] ?? '')), 0, 190),
                    'user_email' => mb_substr(trim((string)($row['user_email'] ?? '')), 0, 190),
                    'ip_address' => wp_push_normalize_ip((string)($row['ip_address'] ?? '')),
                    'device_id' => (string)($row['device_id'] ?? ''),
                    'device_scope' => (string)($row['device_scope'] ?? 'main'),
                    'permission_state' => 'granted',
                    'is_active' => true,
                    'created_at' => wp_version_normalize_datetime($row['created_at'] ?? '') ?: wp_version_now_iso(),
                    'updated_at' => wp_version_normalize_datetime($row['updated_at'] ?? '') ?: wp_version_now_iso(),
                    'last_seen_at' => wp_version_normalize_datetime($row['last_seen_at'] ?? '') ?: '',
                ];
            }
        }
    }

    return $normalized;
}

function wp_push_has_subscription_endpoint(array $subscription): bool {
    return trim((string)($subscription['endpoint'] ?? '')) !== ''
        && trim((string)($subscription['public_key'] ?? '')) !== ''
        && trim((string)($subscription['auth_key'] ?? '')) !== '';
}

function wp_push_is_active_subscription(array $subscription): bool {
    return !empty($subscription['is_active'])
        && (string)($subscription['permission_state'] ?? '') === 'granted'
        && wp_push_has_subscription_endpoint($subscription);
}

function wp_push_store_subscription_row(array $subscription, string $previousId = ''): bool {
    $endpoint = trim((string)($subscription['endpoint'] ?? ''));
    $deviceId = mb_substr(trim((string)($subscription['device_id'] ?? '')), 0, 120);
    $deviceScope = in_array((string)($subscription['device_scope'] ?? 'main'), ['main', 'admin'], true)
        ? (string)$subscription['device_scope']
        : 'main';
    if ($endpoint === '' && $deviceId === '') {
        return false;
    }

    $id = trim((string)($subscription['id'] ?? ''));
    if ($id === '') {
        $id = $endpoint !== ''
            ? wp_push_subscription_id($endpoint)
            : wp_push_device_placeholder_id($deviceId, $deviceScope);
    }

    $publicKey = trim((string)($subscription['public_key'] ?? ''));
    $authKey = trim((string)($subscription['auth_key'] ?? ''));
    $userAgent = mb_substr(trim((string)($subscription['user_agent'] ?? '')), 0, 255);
    $userId = max(0, (int)($subscription['user_id'] ?? 0));
    $userName = mb_substr(trim((string)($subscription['user_name'] ?? '')), 0, 190);
    $userEmail = mb_substr(trim((string)($subscription['user_email'] ?? '')), 0, 190);
    $ipAddress = wp_push_normalize_ip((string)($subscription['ip_address'] ?? ''));
    $permissionState = in_array((string)($subscription['permission_state'] ?? 'granted'), ['granted', 'default', 'denied'], true)
        ? (string)$subscription['permission_state']
        : 'granted';
    $isActive = !empty($subscription['is_active']) ? 1 : 0;
    $createdAt = wp_version_normalize_datetime($subscription['created_at'] ?? '') ?: wp_version_now_iso();
    $updatedAt = wp_version_normalize_datetime($subscription['updated_at'] ?? '') ?: wp_version_now_iso();
    $lastSeenAt = wp_version_normalize_datetime($subscription['last_seen_at'] ?? '') ?: null;
    $previousId = trim($previousId);

    try {
        $conn = wp_runtime_open_mysqli();
        $conn->begin_transaction();

        if ($previousId !== '' && $previousId !== $id) {
            $deletePrevious = $conn->prepare('DELETE FROM push_subscriptions WHERE id = ?');
            $deletePrevious->bind_param('s', $previousId);
            $deletePrevious->execute();
        }

        $stmt = $conn->prepare(
            'REPLACE INTO push_subscriptions
            (id, endpoint, public_key, auth_key, user_agent, user_id, user_name, user_email, ip_address, device_id, device_scope, permission_state, is_active, created_at, updated_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param(
            'sssssissssssisss',
            $id,
            $endpoint,
            $publicKey,
            $authKey,
            $userAgent,
            $userId,
            $userName,
            $userEmail,
            $ipAddress,
            $deviceId,
            $deviceScope,
            $permissionState,
            $isActive,
            $createdAt,
            $updatedAt,
            $lastSeenAt
        );
        $stmt->execute();

        if ($deviceId !== '' && $endpoint !== '') {
            $deletePlaceholder = $conn->prepare(
                "DELETE FROM push_subscriptions
                 WHERE device_id = ? AND device_scope = ? AND id <> ? AND endpoint = ''"
            );
            $deletePlaceholder->bind_param('sss', $deviceId, $deviceScope, $id);
            $deletePlaceholder->execute();
        }

        $conn->commit();
        return true;
    } catch (Throwable $e) {
        if (isset($conn) && $conn instanceof mysqli) {
            try {
                $conn->rollback();
            } catch (Throwable $rollbackError) {
            }
        }
        return false;
    }
}

function wp_push_delete_subscription_row(string $id): bool {
    $id = trim($id);
    if ($id === '') {
        return false;
    }

    try {
        $conn = wp_runtime_open_mysqli();
        $stmt = $conn->prepare('DELETE FROM push_subscriptions WHERE id = ?');
        $stmt->bind_param('s', $id);
        $stmt->execute();
        return $stmt->affected_rows > 0;
    } catch (Throwable $e) {
        return false;
    }
}

function wp_push_legacy_backup_rows(): array {
    $path = __DIR__ . '/legacy_data/push_subscriptions_store.json';
    if (!is_file($path) || !is_readable($path)) {
        return [];
    }

    $decoded = json_decode((string)file_get_contents($path), true);
    if (!is_array($decoded)) {
        return [];
    }

    return array_values(array_filter(
        $decoded,
        static fn($row): bool => is_array($row) && wp_push_has_subscription_endpoint($row)
    ));
}

function wp_push_restore_legacy_subscriptions(): array {
    $currentEndpoints = array_values(array_filter(
        wp_push_load_subscriptions(),
        'wp_push_has_subscription_endpoint'
    ));
    if ($currentEndpoints) {
        return [
            'ok' => false,
            'restored' => 0,
            'message' => 'Վերականգնումը չկատարվեց, քանի որ push endpoint-ների ցանկը դատարկ չէ։',
        ];
    }

    $backupRows = wp_push_legacy_backup_rows();
    if (!$backupRows) {
        return [
            'ok' => false,
            'restored' => 0,
            'message' => 'Push subscription-ների պահուստային ցանկ չի գտնվել։',
        ];
    }

    $blockedIds = [];
    foreach (wp_push_load_blocked() as $blockedRow) {
        $blockedIds[(string)($blockedRow['id'] ?? '')] = true;
    }

    $restored = 0;
    $failed = 0;
    foreach ($backupRows as $row) {
        $endpoint = trim((string)($row['endpoint'] ?? ''));
        $id = wp_push_subscription_id($endpoint);
        if ($endpoint === '' || isset($blockedIds[$id])) {
            continue;
        }

        $restoredRow = [
            'id' => $id,
            'endpoint' => $endpoint,
            'public_key' => (string)($row['public_key'] ?? ''),
            'auth_key' => (string)($row['auth_key'] ?? ''),
            'user_agent' => (string)($row['user_agent'] ?? ''),
            'user_id' => (int)($row['user_id'] ?? 0),
            'user_name' => (string)($row['user_name'] ?? ''),
            'user_email' => (string)($row['user_email'] ?? ''),
            'ip_address' => (string)($row['ip_address'] ?? ''),
            'device_id' => '',
            'device_scope' => 'main',
            'permission_state' => 'granted',
            'is_active' => true,
            'created_at' => (string)($row['created_at'] ?? ''),
            'updated_at' => wp_version_now_iso(),
            'last_seen_at' => (string)($row['last_seen_at'] ?? ''),
        ];

        if (wp_push_store_subscription_row($restoredRow)) {
            $restored++;
        } else {
            $failed++;
        }
    }

    if ($restored === 0) {
        return [
            'ok' => false,
            'restored' => 0,
            'message' => 'Պահուստային push subscription-ները վերականգնել չհաջողվեց։',
        ];
    }

    return [
        'ok' => $failed === 0,
        'restored' => $restored,
        'failed' => $failed,
        'message' => 'Վերականգնվեց ' . $restored . ' push subscription'
            . ($failed > 0 ? ', չվերականգնվեց՝ ' . $failed . '։' : '։'),
    ];
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

    $id = wp_push_subscription_id($endpoint);
    $now = wp_version_now_iso();
    $incomingDeviceId = mb_substr(trim((string)($meta['device_id'] ?? '')), 0, 120);
    $incomingDeviceScope = in_array((string)($meta['device_scope'] ?? 'main'), ['main', 'admin'], true) ? (string)$meta['device_scope'] : 'main';
    $clearUser = array_key_exists('clear_user', $meta) ? !empty($meta['clear_user']) : ((int)($meta['user_id'] ?? 0) <= 0);
    $existing = null;
    $deviceMatch = null;
    foreach (wp_push_load_subscriptions() as $row) {
        if ((string)($row['id'] ?? '') === $id) {
            $existing = $row;
            break;
        }
        if (
            $deviceMatch === null
            && $incomingDeviceId !== ''
            && (string)($row['device_id'] ?? '') === $incomingDeviceId
            && (string)($row['device_scope'] ?? 'main') === $incomingDeviceScope
        ) {
            $deviceMatch = $row;
        }
    }
    if ($existing === null) {
        $existing = $deviceMatch;
    }

    $previousId = (string)($existing['id'] ?? '');
    $nextPermissionState = (string)($meta['permission_state'] ?? 'granted');
    $nextPermissionState = in_array($nextPermissionState, ['granted', 'default', 'denied'], true)
        ? $nextPermissionState
        : 'granted';
    $nextRow = [
        'id' => $id,
        'endpoint' => $endpoint,
        'public_key' => $publicKey,
        'auth_key' => $authKey,
        'user_agent' => mb_substr(trim((string)($meta['user_agent'] ?? $existing['user_agent'] ?? '')), 0, 255),
        'user_id' => $clearUser ? 0 : (!empty($meta['user_id']) ? (int)$meta['user_id'] : (int)($existing['user_id'] ?? 0)),
        'user_name' => $clearUser ? '' : mb_substr(trim((string)($meta['user_name'] ?? $existing['user_name'] ?? '')), 0, 190),
        'user_email' => $clearUser ? '' : mb_substr(trim((string)($meta['user_email'] ?? $existing['user_email'] ?? '')), 0, 190),
        'ip_address' => wp_push_normalize_ip((string)($meta['ip_address'] ?? $existing['ip_address'] ?? '')),
        'device_id' => $incomingDeviceId !== '' ? $incomingDeviceId : mb_substr(trim((string)($existing['device_id'] ?? '')), 0, 120),
        'device_scope' => $incomingDeviceScope,
        'permission_state' => $nextPermissionState,
        'is_active' => $nextPermissionState === 'granted',
        'created_at' => (string)($existing['created_at'] ?? $now),
        'updated_at' => $now,
        'last_seen_at' => $now,
    ];

    if (!wp_push_store_subscription_row($nextRow, $previousId)) {
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
    $removed = wp_push_delete_subscription_row($id);
    if ($removed) {
        wp_push_remove_queued_for_subscription($id);
    }
    return $removed;
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
    $clearUser = array_key_exists('clear_user', $meta) ? !empty($meta['clear_user']) : ((int)($meta['user_id'] ?? 0) <= 0);
    $existing = null;
    $deviceMatch = null;
    foreach (wp_push_load_subscriptions() as $row) {
        if ($id !== '' && (string)($row['id'] ?? '') === $id) {
            $existing = $row;
            break;
        }
        if (
            $deviceMatch === null
            && $deviceId !== ''
            && (string)($row['device_id'] ?? '') === $deviceId
            && (string)($row['device_scope'] ?? 'main') === $deviceScope
        ) {
            $deviceMatch = $row;
        }
    }
    if ($existing === null) {
        $existing = $deviceMatch;
    }

    if ($existing === null && $deviceId === '') {
        return ['ok' => true, 'synced' => false, 'permission' => $permission, 'subscribed' => $subscribed];
    }

    $previousId = (string)($existing['id'] ?? '');
    $targetId = $id !== ''
        ? $id
        : ($previousId !== '' ? $previousId : wp_push_device_placeholder_id($deviceId, $deviceScope));
    $targetEndpoint = $endpoint !== '' ? $endpoint : (string)($existing['endpoint'] ?? '');
    $nextRow = [
        'id' => $targetId,
        'endpoint' => $targetEndpoint,
        'public_key' => (string)($existing['public_key'] ?? ''),
        'auth_key' => (string)($existing['auth_key'] ?? ''),
        'user_agent' => mb_substr(trim((string)($meta['user_agent'] ?? $existing['user_agent'] ?? '')), 0, 255),
        'user_id' => $clearUser ? 0 : (!empty($meta['user_id']) ? (int)$meta['user_id'] : (int)($existing['user_id'] ?? 0)),
        'user_name' => $clearUser ? '' : mb_substr(trim((string)($meta['user_name'] ?? $existing['user_name'] ?? '')), 0, 190),
        'user_email' => $clearUser ? '' : mb_substr(trim((string)($meta['user_email'] ?? $existing['user_email'] ?? '')), 0, 190),
        'ip_address' => wp_push_normalize_ip((string)($meta['ip_address'] ?? $existing['ip_address'] ?? '')),
        'device_id' => $deviceId !== '' ? $deviceId : (string)($existing['device_id'] ?? ''),
        'device_scope' => $deviceScope,
        'permission_state' => $permission,
        'is_active' => $subscribed,
        'created_at' => (string)($existing['created_at'] ?? $now),
        'updated_at' => $now,
        'last_seen_at' => $now,
    ];

    $saved = wp_push_store_subscription_row($nextRow, $previousId);
    if ($saved && $clearUser) {
        wp_push_remove_queued_for_subscription($targetId);
    }

    return [
        'ok' => $saved,
        'synced' => $saved,
        'permission' => $permission,
        'subscribed' => $subscribed,
    ];
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
    $removed = wp_push_delete_subscription_row($id);
    if ($removed) {
        wp_push_remove_queued_for_subscription($id);
    }
    return $removed;
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

    $detachedCount = 0;

    foreach ($subscriptions as $row) {
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
        $subscriptionId = (string)($row['id'] ?? '');
        if (wp_push_store_subscription_row($row, $subscriptionId)) {
            wp_push_remove_queued_for_subscription($subscriptionId);
            $detachedCount++;
        }
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
    $active = array_values(array_filter($subscriptions, 'wp_push_is_active_subscription'));
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

    $subscriptions = array_values(array_filter(
        wp_push_load_subscriptions(),
        'wp_push_is_active_subscription'
    ));
    if (!$subscriptions) {
        return ['ok' => false, 'message' => 'Գրանցված push subscription դեռ չկա։'];
    }

    $subscriptionIds = array_map(static fn(array $row): string => (string)$row['id'], $subscriptions);
    $queued = wp_push_enqueue($subscriptionIds, $payload);

    // Also log system broadcast notification to user_notifications for all users
    try {
        $pdo = null;
        if (function_exists('wp_db_get_pdo')) {
            $pdo = wp_db_get_pdo();
        } elseif (isset($GLOBALS['pdo'])) {
            $pdo = $GLOBALS['pdo'];
        }
        if ($pdo) {
            $title = trim((string)($payload['title'] ?? ''));
            $body = trim((string)($payload['body'] ?? ''));
            $url = trim((string)($payload['url'] ?? '/'));
            $notif_text = $title ? ($body ? "$title: $body" : $title) : $body;
            if ($notif_text !== '') {
                $notif_json = json_encode(['text' => $notif_text]);
                $st_users = $pdo->query("SELECT id FROM users");
                if ($st_users) {
                    $st_ins = $pdo->prepare("INSERT INTO user_notifications (user_id, sender_id, type, content, action_link, is_read, created_at) VALUES (?, 0, 'system', ?, ?, 0, NOW())");
                    while ($u = $st_users->fetch(\PDO::FETCH_ASSOC)) {
                        $st_ins->execute([(int)$u['id'], $notif_json, $url]);
                    }
                }
            }
        }
    } catch (\Throwable $e) {}

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

function wp_push_send_to_user($pdo, int $user_id, string $title, string $body, string $url = '/main.html', array $extra = []): array {
    if ($user_id > 0 && $pdo) {
        try {
            $notif_type = 'system';
            if (!empty($extra['type'])) {
                $notif_type = (string)$extra['type'];
            } elseif (strpos($url, '/chat') !== false) {
                $notif_type = 'chat_message';
            } elseif (strpos($url, '/friends') !== false) {
                $notif_type = 'friend_request';
            } elseif (strpos($url, '/setlist') !== false) {
                $notif_type = 'setlist_share';
            }

            $notif_text = $title ? "$title: $body" : $body;
            $st_ins = $pdo->prepare("INSERT INTO user_notifications (user_id, sender_id, type, content, action_link, is_read, created_at) VALUES (?, 0, ?, ?, ?, 0, NOW())");
            $st_ins->execute([$user_id, $notif_type, json_encode(['text' => $notif_text]), $url]);
        } catch (\Throwable $e) {
            // ignore if notification insert fails
        }
    }

    $config = wp_push_bootstrap_config();
    if (empty($config['supported']) || empty($config['enabled'])) {
        return ['ok' => false, 'message' => 'Push disabled.'];
    }

    $st = $pdo->prepare("SELECT * FROM push_subscriptions WHERE user_id = ? AND is_active = 1 AND permission_state = 'granted'");
    $st->execute([$user_id]);
    $subs = array_values(array_filter(
        $st->fetchAll(\PDO::FETCH_ASSOC),
        'wp_push_is_active_subscription'
    ));
    if (!$subs) {
        return ['ok' => false, 'message' => 'No subscriptions found for user.'];
    }

    $payload = array_merge([
        'title' => $title,
        'body' => $body,
        'url' => $url,
        'icon' => '/wolarm_youth.png',
        'tag' => 'worship-direct'
    ], is_array($extra) ? $extra : []);

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
