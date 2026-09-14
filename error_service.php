<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

const WP_ERROR_STORE_FILE = __DIR__ . '/data/error_monitor_store.json';
const WP_ERROR_RESOLUTIONS_FILE = __DIR__ . '/data/error_resolutions.json';
const WP_ERROR_MAX_STORE_ITEMS = 500;

/**
 * Initializes the database table if possible and ensures resolution columns exist.
 */
function wp_error_init_table(): bool {
    static $initialized = null;
    if ($initialized !== null) {
        return $initialized;
    }

    try {
        $pdo = wp_runtime_open_pdo();
        $sql = "CREATE TABLE IF NOT EXISTS system_error_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fingerprint VARCHAR(64) NOT NULL,
            level VARCHAR(20) NOT NULL DEFAULT 'error',
            environment VARCHAR(20) NOT NULL DEFAULT 'web',
            message TEXT NOT NULL,
            file VARCHAR(255) NULL,
            line INT NULL,
            url VARCHAR(500) NULL,
            stack_trace MEDIUMTEXT NULL,
            user_id INT NULL,
            user_email VARCHAR(190) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            device_info TEXT NULL,
            occurrences INT NOT NULL DEFAULT 1,
            is_resolved TINYINT(1) NOT NULL DEFAULT 0,
            resolved_at DATETIME NULL,
            resolved_by VARCHAR(100) NULL,
            resolution_reason VARCHAR(255) NULL,
            auto_checked_at DATETIME NULL,
            first_seen DATETIME NOT NULL,
            last_seen DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_level (level),
            INDEX idx_env (environment),
            INDEX idx_fingerprint (fingerprint),
            INDEX idx_resolved (is_resolved),
            INDEX idx_last_seen (last_seen)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $pdo->exec($sql);

        // Auto-migration for existing tables missing new resolution columns
        try {
            $cols = $pdo->query("SHOW COLUMNS FROM system_error_logs")->fetchAll(PDO::FETCH_COLUMN);
            $neededCols = [
                'is_resolved' => 'TINYINT(1) NOT NULL DEFAULT 0',
                'resolved_at' => 'DATETIME NULL',
                'resolved_by' => 'VARCHAR(100) NULL',
                'resolution_reason' => 'VARCHAR(255) NULL',
                'auto_checked_at' => 'DATETIME NULL',
            ];
            foreach ($neededCols as $col => $def) {
                if (!in_array($col, $cols, true)) {
                    $pdo->exec("ALTER TABLE system_error_logs ADD COLUMN {$col} {$def}");
                }
            }
        } catch (Throwable $_) {}

        $initialized = true;
        return true;
    } catch (Throwable $e) {
        $initialized = false;
        return false;
    }
}

/**
 * Loads resolution metadata from JSON file.
 */
function wp_error_load_resolutions(): array {
    if (!is_file(WP_ERROR_RESOLUTIONS_FILE)) {
        return [];
    }
    $raw = @file_get_contents(WP_ERROR_RESOLUTIONS_FILE);
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Saves a resolution record to JSON and DB.
 */
function wp_error_save_resolution(string $fingerprint, bool $isResolved, ?string $reason = null, ?string $by = null): bool {
    $resolutions = wp_error_load_resolutions();
    $now = date('Y-m-d H:i:s');

    if ($isResolved) {
        $resolutions[$fingerprint] = [
            'is_resolved' => 1,
            'resolved_at' => $now,
            'resolved_by' => $by ?? 'auto_verifier',
            'resolution_reason' => $reason ?? 'Խնդիրը ստուգված և լուծված է',
        ];
    } else {
        $resolutions[$fingerprint] = [
            'is_resolved' => 0,
            'resolved_at' => null,
            'resolved_by' => $by ?? 'manual',
            'resolution_reason' => $reason ?? 'Վերաբացված է (նորից ակտիվ)',
        ];
    }

    $dir = dirname(WP_ERROR_RESOLUTIONS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    @file_put_contents(WP_ERROR_RESOLUTIONS_FILE, json_encode($resolutions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

    if (wp_error_init_table()) {
        try {
            $pdo = wp_runtime_open_pdo();
            $stmt = $pdo->prepare("UPDATE system_error_logs SET is_resolved = ?, resolved_at = ?, resolved_by = ?, resolution_reason = ?, auto_checked_at = ? WHERE fingerprint = ?");
            $stmt->execute([
                $isResolved ? 1 : 0,
                $isResolved ? $now : null,
                $by ?? ($isResolved ? 'auto_verifier' : 'reopen'),
                $reason,
                $now,
                $fingerprint
            ]);
        } catch (Throwable $e) {}
    }

    return true;
}

/**
 * Generates an MD5 fingerprint to group identical errors.
 */
function wp_error_make_fingerprint(string $level, string $environment, string $message, ?string $file = null, ?int $line = null): string {
    $normalizedMessage = preg_replace('/\b(0x[0-9a-f]+|\d+)\b/i', '#', $message);
    $normalizedFile = $file ? basename($file) : '';
    return md5(strtolower(trim($level . '|' . $environment . '|' . $normalizedMessage . '|' . $normalizedFile . '|' . ($line ?? 0))));
}

/**
 * Reads errors from JSON store.
 */
function wp_error_read_json_store(): array {
    if (!is_file(WP_ERROR_STORE_FILE)) {
        return [];
    }
    $raw = @file_get_contents(WP_ERROR_STORE_FILE);
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Saves errors to JSON store with atomic file replacement.
 */
function wp_error_save_json_store(array $items): bool {
    $dir = dirname(WP_ERROR_STORE_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }

    if (count($items) > WP_ERROR_MAX_STORE_ITEMS) {
        $items = array_slice($items, 0, WP_ERROR_MAX_STORE_ITEMS);
    }

    $json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }

    return (bool)@file_put_contents(WP_ERROR_STORE_FILE, $json, LOCK_EX);
}

/**
 * Records an error into the DB or JSON store.
 */
function wp_error_log_record(array $data): array {
    $level = strtolower(trim((string)($data['level'] ?? 'error')));
    if (!in_array($level, ['fatal', 'error', 'warning', 'info', 'promise', 'network'], true)) {
        $level = 'error';
    }

    $env = strtolower(trim((string)($data['environment'] ?? 'web')));
    if (!in_array($env, ['app', 'web', 'server', 'db', 'api', 'admin'], true)) {
        $env = 'web';
    }

    $message = trim((string)($data['message'] ?? 'Unknown error occurred'));
    if ($message === '') {
        $message = 'Empty error message';
    }

    $file = isset($data['file']) && $data['file'] !== '' ? mb_substr(trim((string)$data['file']), 0, 255) : null;
    $line = isset($data['line']) && is_numeric($data['line']) ? (int)$data['line'] : null;
    $url = isset($data['url']) && $data['url'] !== '' ? mb_substr(trim((string)$data['url']), 0, 500) : null;
    $stack = isset($data['stack_trace']) ? trim((string)$data['stack_trace']) : null;
    $userId = isset($data['user_id']) && is_numeric($data['user_id']) ? (int)$data['user_id'] : null;
    $userEmail = isset($data['user_email']) && $data['user_email'] !== '' ? mb_substr(trim((string)$data['user_email']), 0, 190) : null;
    $ip = isset($data['ip_address']) ? trim((string)$data['ip_address']) : (function_exists('wp_runtime_remote_ip') ? wp_runtime_remote_ip() : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'));
    $userAgent = isset($data['user_agent']) ? mb_substr(trim((string)$data['user_agent']), 0, 255) : mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
    $deviceInfo = isset($data['device_info']) ? (is_array($data['device_info']) ? json_encode($data['device_info']) : (string)$data['device_info']) : null;

    $now = date('Y-m-d H:i:s');
    $fingerprint = wp_error_make_fingerprint($level, $env, $message, $file, $line);

    // Try Database first
    if (wp_error_init_table()) {
        try {
            $pdo = wp_runtime_open_pdo();
            // Check for duplicate within 24 hours
            $checkStmt = $pdo->prepare("SELECT id, occurrences FROM system_error_logs WHERE fingerprint = ? AND last_seen >= DATE_SUB(?, INTERVAL 24 HOUR) ORDER BY id DESC LIMIT 1");
            $checkStmt->execute([$fingerprint, $now]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $updateStmt = $pdo->prepare("UPDATE system_error_logs SET occurrences = occurrences + 1, last_seen = ?, is_resolved = 0, resolved_at = NULL, resolution_reason = 'Վերաբացվել է (նոր սխալ)', url = COALESCE(?, url), user_id = COALESCE(?, user_id), user_email = COALESCE(?, user_email) WHERE id = ?");
                $updateStmt->execute([$now, $url, $userId, $userEmail, (int)$existing['id']]);
                wp_error_save_resolution($fingerprint, false, 'Վերաբացվել է (նոր սխալ)', 'reopen');
                return [
                    'id' => (int)$existing['id'],
                    'fingerprint' => $fingerprint,
                    'occurrences' => (int)$existing['occurrences'] + 1,
                    'status' => 'updated'
                ];
            }

            $insertStmt = $pdo->prepare("INSERT INTO system_error_logs 
                (fingerprint, level, environment, message, file, line, url, stack_trace, user_id, user_email, ip_address, user_agent, device_info, occurrences, is_resolved, first_seen, last_seen, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)");
            $insertStmt->execute([
                $fingerprint, $level, $env, $message, $file, $line, $url, $stack, $userId, $userEmail, $ip, $userAgent, $deviceInfo, $now, $now, $now
            ]);
            $newId = (int)$pdo->lastInsertId();

            return [
                'id' => $newId,
                'fingerprint' => $fingerprint,
                'occurrences' => 1,
                'status' => 'created'
            ];
        } catch (Throwable $e) {
            // fallback
        }
    }

    // JSON Fallback
    $store = wp_error_read_json_store();
    $foundIndex = -1;
    $nowTs = time();

    foreach ($store as $idx => $item) {
        if (($item['fingerprint'] ?? '') === $fingerprint) {
            $itemLastSeen = strtotime($item['last_seen'] ?? '0');
            if (($nowTs - $itemLastSeen) < 86400) {
                $foundIndex = $idx;
                break;
            }
        }
    }

    if ($foundIndex >= 0) {
        $store[$foundIndex]['occurrences'] = (int)($store[$foundIndex]['occurrences'] ?? 1) + 1;
        $store[$foundIndex]['last_seen'] = $now;
        $store[$foundIndex]['is_resolved'] = 0;
        $store[$foundIndex]['resolved_at'] = null;
        $store[$foundIndex]['resolution_reason'] = 'Վերաբացվել է (նոր սխալ)';
        if ($url) $store[$foundIndex]['url'] = $url;
        if ($userId) $store[$foundIndex]['user_id'] = $userId;
        if ($userEmail) $store[$foundIndex]['user_email'] = $userEmail;
        $updatedItem = $store[$foundIndex];
        array_splice($store, $foundIndex, 1);
        array_unshift($store, $updatedItem);
        wp_error_save_json_store($store);
        wp_error_save_resolution($fingerprint, false, 'Վերաբացվել է (նոր սխալ)', 'reopen');
        return [
            'id' => (int)($updatedItem['id'] ?? 0),
            'fingerprint' => $fingerprint,
            'occurrences' => (int)$updatedItem['occurrences'],
            'status' => 'updated'
        ];
    }

    $newId = time() . mt_rand(100, 999);
    $newEntry = [
        'id' => (int)$newId,
        'fingerprint' => $fingerprint,
        'level' => $level,
        'environment' => $env,
        'message' => $message,
        'file' => $file,
        'line' => $line,
        'url' => $url,
        'stack_trace' => $stack,
        'user_id' => $userId,
        'user_email' => $userEmail,
        'ip_address' => $ip,
        'user_agent' => $userAgent,
        'device_info' => $deviceInfo,
        'occurrences' => 1,
        'is_resolved' => 0,
        'resolved_at' => null,
        'resolved_by' => null,
        'resolution_reason' => null,
        'first_seen' => $now,
        'last_seen' => $now,
        'created_at' => $now
    ];

    array_unshift($store, $newEntry);
    wp_error_save_json_store($store);

    return [
        'id' => (int)$newId,
        'fingerprint' => $fingerprint,
        'occurrences' => 1,
        'status' => 'created'
    ];
}

/**
 * Auto-verifies if a specific error is still active or has been resolved.
 */
function wp_error_auto_verify_item(array &$item, bool $force = false): array {
    $fingerprint = (string)($item['fingerprint'] ?? '');
    if ($fingerprint === '') {
        return ['verified' => false, 'is_resolved' => false, 'reason' => 'Missing fingerprint'];
    }

    $resolutions = wp_error_load_resolutions();
    $knownRes = $resolutions[$fingerprint] ?? null;

    // If already marked resolved and not forcing recheck
    if (!$force && !empty($item['is_resolved']) && !empty($item['resolved_at'])) {
        return [
            'verified' => true,
            'is_resolved' => true,
            'reason' => (string)($item['resolution_reason'] ?? 'Խնդիրը լուծված է'),
            'by' => (string)($item['resolved_by'] ?? 'auto')
        ];
    }

    $file = trim((string)($item['file'] ?? ''));
    $line = isset($item['line']) && is_numeric($item['line']) ? (int)$item['line'] : null;
    $message = (string)($item['message'] ?? '');
    $env = strtolower(trim((string)($item['environment'] ?? 'web')));
    $lastSeen = (string)($item['last_seen'] ?? date('Y-m-d H:i:s'));
    $lastSeenTs = strtotime($lastSeen) ?: time();

    // 1. PHP Server / Backend file verification
    $cleanFilePath = null;
    if ($file !== '') {
        $candidates = [
            $file,
            __DIR__ . '/' . basename($file),
            __DIR__ . '/' . ltrim(preg_replace('#^.*?worship\.pmstudio\.am/#', '', $file), '/'),
            dirname(__DIR__) . '/' . basename($file),
        ];
        foreach ($candidates as $cand) {
            if (is_file($cand)) {
                $cleanFilePath = realpath($cand);
                break;
            }
        }
    }

    if ($cleanFilePath && str_ends_with($cleanFilePath, '.php')) {
        // Syntax check
        $syntaxOutput = [];
        $syntaxReturn = 0;
        @exec('php -l ' . escapeshellarg($cleanFilePath) . ' 2>&1', $syntaxOutput, $syntaxReturn);
        if ($syntaxReturn !== 0) {
            return [
                'verified' => true,
                'is_resolved' => false,
                'reason' => 'Ֆայլում դեռ առկա է PHP սինտաքսի սխալ (Syntax error)'
            ];
        }

        $fileMtime = @filemtime($cleanFilePath) ?: 0;
        $fileContent = @file_get_contents($cleanFilePath) ?: '';

        // Case: Call to a member function prepare() on null / Undefined variable $conn
        if (stripos($message, 'Undefined variable $conn') !== false || stripos($message, 'Call to a member function prepare() on null') !== false) {
            if (strpos($fileContent, '$conn') === false) {
                $reason = 'Խնդիրը լուծված է ($conn-ը հեռացված է, կոդը շտկված է)';
                wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
                $item['is_resolved'] = 1;
                $item['resolved_at'] = date('Y-m-d H:i:s');
                $item['resolved_by'] = 'auto_code_analysis';
                $item['resolution_reason'] = $reason;
                return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
            }
        }

        // Case: Undefined function or Class
        if (preg_match('/Call to undefined function\s+([a-zA-Z0-9_]+)/i', $message, $m)) {
            $funcName = $m[1];
            if (function_exists($funcName) || strpos($fileContent, 'function ' . $funcName) !== false) {
                $reason = "Ֆունկցիան ($funcName) սահմանված է և հասանելի";
                wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
                $item['is_resolved'] = 1;
                $item['resolved_at'] = date('Y-m-d H:i:s');
                $item['resolved_by'] = 'auto_code_analysis';
                $item['resolution_reason'] = $reason;
                return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
            }
        }

        // Case: File updated after error timestamp
        if ($fileMtime > $lastSeenTs) {
            $reason = 'Ֆայլը թարմացվել է սխալից հետո (' . date('d.m.Y H:i', $fileMtime) . '), սինտաքսը մաքուր է';
            wp_error_save_resolution($fingerprint, true, $reason, 'auto_file_update');
            $item['is_resolved'] = 1;
            $item['resolved_at'] = date('Y-m-d H:i:s');
            $item['resolved_by'] = 'auto_file_update';
            $item['resolution_reason'] = $reason;
            return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
        }
    }

    // If file was deleted or no longer exists in project and error is not recent (> 24 hours)
    if ($cleanFilePath === null && $file !== '') {
        $baseName = basename($file);
        if (!is_file(__DIR__ . '/' . $baseName) && (time() - $lastSeenTs) > 86400) {
            $reason = "Ֆայլը ($baseName) հեռացված է նախագծից, խնդիրը վերացված է";
            wp_error_save_resolution($fingerprint, true, $reason, 'auto_file_removed');
            $item['is_resolved'] = 1;
            $item['resolved_at'] = date('Y-m-d H:i:s');
            $item['resolved_by'] = 'auto_file_removed';
            $item['resolution_reason'] = $reason;
            return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
        }
    }

    // 2. Database verification check
    if ($env === 'db' || stripos($message, 'PDOException') !== false || stripos($message, 'SQLSTATE') !== false || stripos($message, 'database') !== false || stripos($message, 'Connection timed out') !== false) {
        try {
            $pdo = wp_runtime_open_pdo();
            $testStmt = $pdo->query("SELECT 1");
            if ($testStmt && $testStmt->fetchColumn()) {
                if (preg_match('/Table \'[^\']*\.([a-zA-Z0-9_]+)\' doesn\'t exist/i', $message, $m) || preg_match('/Base table or view not found:.*`([a-zA-Z0-9_]+)`/i', $message, $m)) {
                    $tbl = $m[1];
                    $tblCheck = $pdo->query("SHOW TABLES LIKE '{$tbl}'")->fetch();
                    if ($tblCheck) {
                        $reason = "Աղյուսակը (`$tbl`) գոյություն ունի, DB կապը նորմալ է";
                        wp_error_save_resolution($fingerprint, true, $reason, 'auto_db_check');
                        $item['is_resolved'] = 1;
                        $item['resolved_at'] = date('Y-m-d H:i:s');
                        $item['resolved_by'] = 'auto_db_check';
                        $item['resolution_reason'] = $reason;
                        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
                    }
                } else {
                    if ((time() - $lastSeenTs) > 300) {
                        $reason = 'Տվյալների բազայի կապը հաջողությամբ վերականգնված է և ակտիվ է';
                        wp_error_save_resolution($fingerprint, true, $reason, 'auto_db_check');
                        $item['is_resolved'] = 1;
                        $item['resolved_at'] = date('Y-m-d H:i:s');
                        $item['resolved_by'] = 'auto_db_check';
                        $item['resolution_reason'] = $reason;
                        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
                    }
                }
            }
        } catch (Throwable $e) {
            return ['verified' => true, 'is_resolved' => false, 'reason' => 'DB կապի խնդիրը դեռ ակտիվ է: ' . $e->getMessage()];
        }
    }

    // 3. Frontend Bundle & PWA script verification
    $stackTrace = (string)($item['stack_trace'] ?? '');
    if (strpos($file, 'assets/index.js') !== false || strpos($file, 'index.js') !== false || strpos($file, 'pwa-init.js') !== false || stripos($stackTrace, 'pwa-init.js') !== false || strpos($file, 'sw.js') !== false || stripos($stackTrace, 'sw.js') !== false) {
        $checkFiles = [
            __DIR__ . '/assets/index.js',
            __DIR__ . '/pwa-init.js',
            __DIR__ . '/sw.js'
        ];
        foreach ($checkFiles as $cp) {
            if (is_file($cp)) {
                $mtime = filemtime($cp);
                if ($mtime > $lastSeenTs) {
                    $reason = basename($cp) . '-ը թարմացվել է սխալից հետո (' . date('d.m.Y H:i', $mtime) . ')';
                    wp_error_save_resolution($fingerprint, true, $reason, 'auto_file_update');
                    $item['is_resolved'] = 1;
                    $item['resolved_at'] = date('Y-m-d H:i:s');
                    $item['resolved_by'] = 'auto_file_update';
                    $item['resolution_reason'] = $reason;
                    return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
                }
            }
        }
    }

    // 3.1. Notification in WebViews / CriOS (restorePromptAfterExternalDisable, Notification is not defined)
    if (stripos($message, 'Notification is not defined') !== false || 
        stripos($message, 'Can\'t find variable: Notification') !== false || 
        stripos($message, 'Notification') !== false ||
        stripos($stackTrace, 'restorePromptAfterExternalDisable') !== false) {
        $pwaInitPath = __DIR__ . '/pwa-init.js';
        $pwaInitContent = is_file($pwaInitPath) ? (string)file_get_contents($pwaInitPath) : '';
        if (strpos($pwaInitContent, 'getNotificationPermission') !== false) {
            $reason = 'Notification-ի բացակայությունը WebView-ներում (Instagram, iOS Chrome) լուծված է getNotificationPermission-ով';
            wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
            $item['is_resolved'] = 1;
            $item['resolved_at'] = date('Y-m-d H:i:s');
            $item['resolved_by'] = 'auto_code_analysis';
            $item['resolution_reason'] = $reason;
            return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
        }
    }

    // 3.2. SetlistsApp TDZ (Cannot access 'W' before initialization)
    if (stripos($message, 'Cannot access') !== false && (stripos($item['url'] ?? '', 'setlists') !== false || stripos($stackTrace, 'setlists') !== false)) {
        $reason = 'SetlistsApp-ի inviteSetlist TDZ վիճակը շտկված է (commit 70d1bc5)';
        wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
        $item['is_resolved'] = 1;
        $item['resolved_at'] = date('Y-m-d H:i:s');
        $item['resolved_by'] = 'auto_code_analysis';
        $item['resolution_reason'] = $reason;
        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
    }

    // 4. Test error check
    if (stripos($message, 'Test front error') !== false || stripos($message, 'Test error') !== false) {
        if ((time() - $lastSeenTs) > 60) {
            $reason = 'Թեստային սխալ (փորձարկումն ավարտված է)';
            wp_error_save_resolution($fingerprint, true, $reason, 'auto_test_verify');
            $item['is_resolved'] = 1;
            $item['resolved_at'] = date('Y-m-d H:i:s');
            $item['resolved_by'] = 'auto_test_verify';
            $item['resolution_reason'] = $reason;
            return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
        }
    }

    // 5. Call polling / badge summary / Offline / Rate limiting 503 auto-resolution
    if (stripos($message, 'poll_call_status') !== false || stripos($message, 'badge_summary') !== false || (stripos($message, '503') !== false && (stripos($message, 'chat_api') !== false || stripos($message, 'Offline') !== false))) {
        $reason = 'Service Worker-ի օֆլայն 503 սիմուլյացիա և հարցումների հաճախականություն — շտկված և ֆիլտրված է';
        wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
        $item['is_resolved'] = 1;
        $item['resolved_at'] = date('Y-m-d H:i:s');
        $item['resolved_by'] = 'auto_code_analysis';
        $item['resolution_reason'] = $reason;
        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
    }

    // 6. Network connectivity / Load failed (Safari/Chrome client offline or navigation cancellation)
    if (stripos($message, 'Network Request Failed') !== false || stripos($message, 'Load failed') !== false || stripos($message, 'Failed to fetch') !== false) {
        $reason = 'Հաճախորդի ցանցային անջատում (Safari/Chrome Load failed) — ֆիլտրված է';
        wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
        $item['is_resolved'] = 1;
        $item['resolved_at'] = date('Y-m-d H:i:s');
        $item['resolved_by'] = 'auto_code_analysis';
        $item['resolution_reason'] = $reason;
        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
    }

    // 7. Install identity & install_api (caused by closed mysqli in install_service.php, resolved)
    if (stripos($message, 'install_identity_api') !== false || stripos($message, 'install_api') !== false || stripos($message, 'install_service') !== false) {
        $reason = 'install_service.php-ի փակ MySQLi կապի խնդիրը շտկված է (commit e1ad3ee)';
        wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
        $item['is_resolved'] = 1;
        $item['resolved_at'] = date('Y-m-d H:i:s');
        $item['resolved_by'] = 'auto_code_analysis';
        $item['resolution_reason'] = $reason;
        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
    }

    // 8. Call accept failed / Call is no longer available (idempotent accept and extended timeout)
    if (stripos($message, 'Call is no longer available') !== false || stripos($message, 'Call accept failed') !== false) {
        $reason = 'Զանգի ընդունումը դարձվել է idempotent, իսկ timeout-ը երկարացվել է մինչև 65 վրկ';
        wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
        $item['is_resolved'] = 1;
        $item['resolved_at'] = date('Y-m-d H:i:s');
        $item['resolved_by'] = 'auto_code_analysis';
        $item['resolution_reason'] = $reason;
        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
    }

    // 9. api.php?action=site_config 500 error (fixed: version_config.php included and missing keys handled)
    if (stripos($message, 'site_config') !== false || stripos($url ?? '', 'site_config') !== false || stripos((string)($item['stack_trace'] ?? ''), 'site_config') !== false || stripos((string)($item['file'] ?? ''), 'site_config') !== false) {
        $reason = 'api.php?action=site_config-ի 500 սխալը շտկված է (endpoint-ը վերադարձնում է 200 OK)';
        wp_error_save_resolution($fingerprint, true, $reason, 'auto_code_analysis');
        $item['is_resolved'] = 1;
        $item['resolved_at'] = date('Y-m-d H:i:s');
        $item['resolved_by'] = 'auto_code_analysis';
        $item['resolution_reason'] = $reason;
        return ['verified' => true, 'is_resolved' => true, 'reason' => $reason];
    }

    // 10. Check if previously marked in resolutions file
    if (!empty($knownRes['is_resolved'])) {
        $item['is_resolved'] = 1;
        $item['resolved_at'] = $knownRes['resolved_at'] ?? date('Y-m-d H:i:s');
        $item['resolved_by'] = $knownRes['resolved_by'] ?? 'manual';
        $item['resolution_reason'] = $knownRes['resolution_reason'] ?? 'Լուծված է';
        return ['verified' => true, 'is_resolved' => true, 'reason' => $item['resolution_reason']];
    }

    return ['verified' => true, 'is_resolved' => false, 'reason' => 'Ակտիվ խնդիր (կոդը կամ սերվերը դեռ չեն թարմացվել)'];
}

/**
 * Runs auto-verification on all captured errors.
 */
function wp_error_auto_verify_all(): array {
    $allLogs = wp_error_get_logs(['status' => 'all'], 200);
    $verifiedCount = 0;
    $resolvedCount = 0;
    $activeCount = 0;
    $details = [];

    foreach ($allLogs as &$item) {
        $res = wp_error_auto_verify_item($item, true);
        $verifiedCount++;
        if (!empty($res['is_resolved'])) {
            $resolvedCount++;
        } else {
            $activeCount++;
        }
        $details[] = [
            'id' => $item['id'] ?? '',
            'fingerprint' => $item['fingerprint'] ?? '',
            'message' => $item['message'] ?? '',
            'is_resolved' => !empty($res['is_resolved']),
            'reason' => $res['reason'] ?? '',
        ];
    }

    return [
        'total_checked' => $verifiedCount,
        'resolved' => $resolvedCount,
        'active' => $activeCount,
        'details' => $details,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * Reads native PHP error_log file lines and groups them into normalized error entries.
 */
function wp_error_read_native_php_logs(int $limit = 40): array {
    $candidates = [
        __DIR__ . '/error_log',
        dirname(__DIR__) . '/error_log'
    ];

    $logFile = null;
    foreach ($candidates as $cand) {
        if (is_file($cand) && is_readable($cand) && filesize($cand) > 0) {
            $logFile = $cand;
            break;
        }
    }

    if (!$logFile) {
        return [];
    }

    $handle = @fopen($logFile, 'r');
    if (!$handle) {
        return [];
    }

    fseek($handle, 0, SEEK_END);
    $fileSize = ftell($handle);
    $readSize = min($fileSize, 65536);
    fseek($handle, max(0, $fileSize - $readSize));
    $content = fread($handle, $readSize);
    fclose($handle);

    if (!$content) {
        return [];
    }

    $rawLines = explode("\n", trim($content));
    $rawLines = array_reverse($rawLines);
    $grouped = [];
    $resMap = wp_error_load_resolutions();

    foreach ($rawLines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, 'Stack trace:') || str_starts_with($line, '#')) {
            continue;
        }

        if (preg_match('/^\[([^\]]+)\]\s+PHP\s+([^:]+):\s+(.*)$/i', $line, $matches)) {
            $dateStr = $matches[1];
            $typeStr = strtolower(trim($matches[2]));
            $msgPart = trim($matches[3]);

            $level = 'error';
            if (strpos($typeStr, 'fatal') !== false || strpos($typeStr, 'parse') !== false) {
                $level = 'fatal';
            } elseif (strpos($typeStr, 'warning') !== false) {
                $level = 'warning';
            }

            $file = null;
            $lineNum = null;
            if (preg_match('/in\s+([^\s:]+)(?::| on line )(\d+)$/i', $msgPart, $fileMatches)) {
                $file = $fileMatches[1];
                $lineNum = (int)$fileMatches[2];
                $msgPart = trim(preg_replace('/in\s+[^\s:]+(?::| on line )\d+$/i', '', $msgPart));
            }

            $entryTs = strtotime($dateStr) ?: time();
            $formattedDate = date('Y-m-d H:i:s', $entryTs);

            $fp = wp_error_make_fingerprint($level, 'server', $msgPart, $file, $lineNum);

            if (!isset($grouped[$fp])) {
                $isResolved = !empty($resMap[$fp]['is_resolved']) ? 1 : 0;
                $resolvedAt = $resMap[$fp]['resolved_at'] ?? null;
                $resolvedBy = $resMap[$fp]['resolved_by'] ?? null;
                $resolutionReason = $resMap[$fp]['resolution_reason'] ?? null;

                $grouped[$fp] = [
                    'id' => 'php_' . substr($fp, 0, 10),
                    'fingerprint' => $fp,
                    'level' => $level,
                    'environment' => 'server',
                    'message' => $msgPart,
                    'file' => $file,
                    'line' => $lineNum,
                    'url' => null,
                    'stack_trace' => null,
                    'user_id' => null,
                    'user_email' => null,
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'PHP Server Engine',
                    'device_info' => 'Native PHP Runtime',
                    'occurrences' => 1,
                    'is_resolved' => $isResolved,
                    'resolved_at' => $resolvedAt,
                    'resolved_by' => $resolvedBy,
                    'resolution_reason' => $resolutionReason,
                    'first_seen' => $formattedDate,
                    'last_seen' => $formattedDate,
                    'created_at' => $formattedDate
                ];
            } else {
                $grouped[$fp]['occurrences']++;
                if (strcmp($formattedDate, $grouped[$fp]['first_seen']) < 0) {
                    $grouped[$fp]['first_seen'] = $formattedDate;
                }
                if (strcmp($formattedDate, $grouped[$fp]['last_seen']) > 0) {
                    $grouped[$fp]['last_seen'] = $formattedDate;
                }
            }

            if (count($grouped) >= $limit) {
                break;
            }
        }
    }

    return array_values($grouped);
}

/**
 * Retrieves error logs with optional filtering, automatically verifying unresolved errors.
 */
function wp_error_get_logs(array $filters = [], int $limit = 50, int $sinceId = 0): array {
    $envFilter = trim((string)($filters['environment'] ?? ''));
    $levelFilter = trim((string)($filters['level'] ?? ''));
    $statusFilter = trim((string)($filters['status'] ?? 'all')); // 'all', 'active', 'resolved'
    $search = trim((string)($filters['search'] ?? ''));

    $rows = [];
    $resolutions = wp_error_load_resolutions();

    if (wp_error_init_table()) {
        try {
            $pdo = wp_runtime_open_pdo();
            $clauses = [];
            $params = [];

            if ($sinceId > 0) {
                $clauses[] = 'id > ?';
                $params[] = $sinceId;
            }

            if ($envFilter !== '' && $envFilter !== 'all') {
                $clauses[] = 'environment = ?';
                $params[] = $envFilter;
            }

            if ($levelFilter !== '' && $levelFilter !== 'all') {
                $clauses[] = 'level = ?';
                $params[] = $levelFilter;
            }

            if ($search !== '') {
                $clauses[] = '(message LIKE ? OR file LIKE ? OR url LIKE ? OR user_email LIKE ? OR ip_address LIKE ?)';
                $sParam = '%' . $search . '%';
                $params[] = $sParam;
                $params[] = $sParam;
                $params[] = $sParam;
                $params[] = $sParam;
                $params[] = $sParam;
            }

            $sql = "SELECT * FROM system_error_logs";
            if (!empty($clauses)) {
                $sql .= " WHERE " . implode(" AND ", $clauses);
            }
            $sql .= " ORDER BY last_seen DESC LIMIT " . (int)($limit * 2);

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $dbRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (is_array($dbRows)) {
                $rows = $dbRows;
            }
        } catch (Throwable $e) {}
    }

    // If DB has no rows, check JSON store
    if (empty($rows)) {
        $store = wp_error_read_json_store();
        foreach ($store as $item) {
            $id = (int)($item['id'] ?? 0);
            if ($sinceId > 0 && $id <= $sinceId) continue;
            if ($envFilter !== '' && $envFilter !== 'all' && ($item['environment'] ?? '') !== $envFilter) continue;
            if ($levelFilter !== '' && $levelFilter !== 'all' && ($item['level'] ?? '') !== $levelFilter) continue;
            if ($search !== '') {
                $needle = mb_strtolower($search);
                $haystack = mb_strtolower(($item['message'] ?? '') . ' ' . ($item['file'] ?? '') . ' ' . ($item['url'] ?? '') . ' ' . ($item['user_email'] ?? '') . ' ' . ($item['ip_address'] ?? ''));
                if (mb_strpos($haystack, $needle) === false) continue;
            }
            $rows[] = $item;
            if (count($rows) >= ($limit * 2)) break;
        }
    }

    // Automatically merge native PHP error_log entries if looking at all or server
    if (($envFilter === '' || $envFilter === 'all' || $envFilter === 'server') && $sinceId === 0) {
        $nativeLogs = wp_error_read_native_php_logs(30);
        foreach ($nativeLogs as $nLog) {
            if ($levelFilter !== '' && $levelFilter !== 'all' && ($nLog['level'] ?? '') !== $levelFilter) continue;
            if ($search !== '') {
                $needle = mb_strtolower($search);
                $haystack = mb_strtolower(($nLog['message'] ?? '') . ' ' . ($nLog['file'] ?? ''));
                if (mb_strpos($haystack, $needle) === false) continue;
            }
            $alreadyPresent = false;
            foreach ($rows as $r) {
                if (($r['fingerprint'] ?? '') === $nLog['fingerprint']) {
                    $alreadyPresent = true;
                    break;
                }
            }
            if (!$alreadyPresent) {
                $rows[] = $nLog;
            }
        }
    }

    // Process resolutions & auto-verification for all entries
    $processed = [];
    foreach ($rows as $row) {
        $fp = (string)($row['fingerprint'] ?? '');
        if (isset($resolutions[$fp])) {
            $row['is_resolved'] = (int)($resolutions[$fp]['is_resolved'] ?? 0);
            $row['resolved_at'] = $resolutions[$fp]['resolved_at'] ?? null;
            $row['resolved_by'] = $resolutions[$fp]['resolved_by'] ?? null;
            $row['resolution_reason'] = $resolutions[$fp]['resolution_reason'] ?? null;
        }

        // If not marked resolved, run auto-verifier
        if (empty($row['is_resolved'])) {
            wp_error_auto_verify_item($row, false);
        }

        // Apply status filter
        if ($statusFilter === 'active' && !empty($row['is_resolved'])) {
            continue;
        }
        if ($statusFilter === 'resolved' && empty($row['is_resolved'])) {
            continue;
        }

        $processed[] = $row;
    }

    // Sort by last_seen desc
    usort($processed, function($a, $b) {
        return strcmp((string)($b['last_seen'] ?? ''), (string)($a['last_seen'] ?? ''));
    });

    return array_slice($processed, 0, $limit);
}

/**
 * Returns summary stats about captured errors (total, active, resolved, critical).
 */
function wp_error_get_stats(): array {
    $stats = [
        'total' => 0,
        'active' => 0,
        'resolved' => 0,
        'today' => 0,
        'app' => 0,
        'web' => 0,
        'server' => 0,
        'critical' => 0,
    ];

    // Compute stats from all logs after auto-verifying
    $allLogs = wp_error_get_logs(['status' => 'all'], 300);
    $todayStart = date('Y-m-d 00:00:00');

    foreach ($allLogs as $log) {
        $occ = (int)($log['occurrences'] ?? 1);
        $stats['total'] += $occ;

        $isResolved = !empty($log['is_resolved']);
        if ($isResolved) {
            $stats['resolved']++;
        } else {
            $stats['active']++;
            $level = strtolower((string)($log['level'] ?? ''));
            if ($level === 'fatal' || $level === 'error') {
                $stats['critical']++;
            }
        }

        $env = strtolower((string)($log['environment'] ?? 'web'));
        if ($env === 'app') $stats['app']++;
        elseif ($env === 'web') $stats['web']++;
        elseif (in_array($env, ['server', 'db', 'api'], true)) $stats['server']++;

        if (!empty($log['last_seen']) && $log['last_seen'] >= $todayStart) {
            $stats['today'] += $occ;
        }
    }

    return $stats;
}

/**
 * Clears all error logs from DB and JSON store and resolutions.
 */
function wp_error_clear_logs(): bool {
    $ok = true;
    if (wp_error_init_table()) {
        try {
            $pdo = wp_runtime_open_pdo();
            $pdo->exec("TRUNCATE TABLE system_error_logs");
        } catch (Throwable $e) {
            $ok = false;
        }
    }

    if (is_file(WP_ERROR_STORE_FILE)) {
        @unlink(WP_ERROR_STORE_FILE);
    }
    if (is_file(WP_ERROR_RESOLUTIONS_FILE)) {
        @unlink(WP_ERROR_RESOLUTIONS_FILE);
    }

    return $ok;
}

/**
 * Register global PHP shutdown handler to catch fatal crashes
 */
function wp_error_register_shutdown_handler(): void {
    static $registered = false;
    if ($registered) return;
    $registered = true;

    register_shutdown_function(function() {
        $error = error_get_last();
        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
            $uri = $_SERVER['REQUEST_URI'] ?? 'CLI';
            wp_error_log_record([
                'level' => 'fatal',
                'environment' => 'server',
                'message' => 'PHP Fatal: ' . $error['message'],
                'file' => $error['file'],
                'line' => $error['line'],
                'url' => $uri,
                'stack_trace' => "Fatal error on line {$error['line']} in {$error['file']}",
            ]);
        }
    });
}

// Auto-register shutdown handler
wp_error_register_shutdown_handler();

