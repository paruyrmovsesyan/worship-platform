<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

const WP_ERROR_STORE_FILE = __DIR__ . '/data/error_monitor_store.json';
const WP_ERROR_MAX_STORE_ITEMS = 500;

/**
 * Initializes the database table if possible.
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
            first_seen DATETIME NOT NULL,
            last_seen DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_level (level),
            INDEX idx_env (environment),
            INDEX idx_fingerprint (fingerprint),
            INDEX idx_last_seen (last_seen)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $pdo->exec($sql);
        $initialized = true;
        return true;
    } catch (Throwable $e) {
        $initialized = false;
        return false;
    }
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
            // Check for recent duplicate within 1 hour
            $checkStmt = $pdo->prepare("SELECT id, occurrences FROM system_error_logs WHERE fingerprint = ? AND last_seen >= DATE_SUB(?, INTERVAL 1 HOUR) ORDER BY id DESC LIMIT 1");
            $checkStmt->execute([$fingerprint, $now]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $updateStmt = $pdo->prepare("UPDATE system_error_logs SET occurrences = occurrences + 1, last_seen = ?, url = COALESCE(?, url), user_id = COALESCE(?, user_id), user_email = COALESCE(?, user_email) WHERE id = ?");
                $updateStmt->execute([$now, $url, $userId, $userEmail, (int)$existing['id']]);
                return [
                    'id' => (int)$existing['id'],
                    'fingerprint' => $fingerprint,
                    'occurrences' => (int)$existing['occurrences'] + 1,
                    'status' => 'updated'
                ];
            }

            $insertStmt = $pdo->prepare("INSERT INTO system_error_logs 
                (fingerprint, level, environment, message, file, line, url, stack_trace, user_id, user_email, ip_address, user_agent, device_info, occurrences, first_seen, last_seen, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)");
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
            if (($nowTs - $itemLastSeen) < 3600) {
                $foundIndex = $idx;
                break;
            }
        }
    }

    if ($foundIndex >= 0) {
        $store[$foundIndex]['occurrences'] = (int)($store[$foundIndex]['occurrences'] ?? 1) + 1;
        $store[$foundIndex]['last_seen'] = $now;
        if ($url) $store[$foundIndex]['url'] = $url;
        if ($userId) $store[$foundIndex]['user_id'] = $userId;
        if ($userEmail) $store[$foundIndex]['user_email'] = $userEmail;
        $updatedItem = $store[$foundIndex];
        array_splice($store, $foundIndex, 1);
        array_unshift($store, $updatedItem);
        wp_error_save_json_store($store);
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
 * Reads native PHP error_log file lines and converts them into normalized error entries.
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
    $parsed = [];
    $rawLines = array_reverse($rawLines);

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
            if (preg_match('/in\s+([^\s]+)\s+on\s+line\s+(\d+)$/i', $msgPart, $fileMatches)) {
                $file = $fileMatches[1];
                $lineNum = (int)$fileMatches[2];
                $msgPart = trim(preg_replace('/in\s+[^\s]+\s+on\s+line\s+\d+$/i', '', $msgPart));
            }

            $entryTs = strtotime($dateStr) ?: time();
            $formattedDate = date('Y-m-d H:i:s', $entryTs);

            $parsed[] = [
                'id' => 'php_' . substr(md5($line), 0, 10),
                'fingerprint' => md5($line),
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
                'first_seen' => $formattedDate,
                'last_seen' => $formattedDate,
                'created_at' => $formattedDate
            ];

            if (count($parsed) >= $limit) {
                break;
            }
        }
    }

    return $parsed;
}

/**
 * Retrieves error logs with optional filtering, automatically merging native PHP error logs.
 */
function wp_error_get_logs(array $filters = [], int $limit = 50, int $sinceId = 0): array {
    $envFilter = trim((string)($filters['environment'] ?? ''));
    $levelFilter = trim((string)($filters['level'] ?? ''));
    $search = trim((string)($filters['search'] ?? ''));

    $rows = [];

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
            $sql .= " ORDER BY last_seen DESC LIMIT " . (int)$limit;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $dbRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (is_array($dbRows)) {
                $rows = $dbRows;
            }
        } catch (Throwable $e) {}
    }

    // If DB has no rows or few rows, check JSON store
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
            if (count($rows) >= $limit) break;
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
            // Check if not already in rows
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

        // Re-sort by last_seen desc
        usort($rows, function($a, $b) {
            return strcmp((string)($b['last_seen'] ?? ''), (string)($a['last_seen'] ?? ''));
        });
        $rows = array_slice($rows, 0, $limit);
    }

    return $rows;
}

/**
 * Returns summary stats about captured errors.
 */
function wp_error_get_stats(): array {
    $stats = [
        'total' => 0,
        'today' => 0,
        'app' => 0,
        'web' => 0,
        'server' => 0,
        'critical' => 0,
    ];

    if (wp_error_init_table()) {
        try {
            $pdo = wp_runtime_open_pdo();
            
            $stmt = $pdo->query("SELECT COUNT(*) as cnt, COALESCE(SUM(occurrences), 0) as total_occurrences FROM system_error_logs");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['total'] = (int)($row['total_occurrences'] ?? $row['cnt'] ?? 0);

            $today = date('Y-m-d 00:00:00');
            $stmtToday = $pdo->prepare("SELECT COALESCE(SUM(occurrences), 0) as cnt FROM system_error_logs WHERE last_seen >= ?");
            $stmtToday->execute([$today]);
            $stats['today'] = (int)$stmtToday->fetchColumn();

            $stmtApp = $pdo->query("SELECT COALESCE(SUM(occurrences), 0) FROM system_error_logs WHERE environment = 'app'");
            $stats['app'] = (int)$stmtApp->fetchColumn();

            $stmtWeb = $pdo->query("SELECT COALESCE(SUM(occurrences), 0) FROM system_error_logs WHERE environment = 'web'");
            $stats['web'] = (int)$stmtWeb->fetchColumn();

            $stmtServer = $pdo->query("SELECT COALESCE(SUM(occurrences), 0) FROM system_error_logs WHERE environment IN ('server', 'db', 'api')");
            $stats['server'] = (int)$stmtServer->fetchColumn();

            $stmtCrit = $pdo->query("SELECT COALESCE(SUM(occurrences), 0) FROM system_error_logs WHERE level IN ('fatal', 'error')");
            $stats['critical'] = (int)$stmtCrit->fetchColumn();
        } catch (Throwable $e) {}
    }

    // Add native PHP logs into stats if not captured in table
    $nativeLogs = wp_error_read_native_php_logs(30);
    $nativeCount = count($nativeLogs);
    if ($nativeCount > 0 && $stats['server'] < $nativeCount) {
        $stats['server'] = max($stats['server'], $nativeCount);
        $stats['total'] = max($stats['total'], $stats['app'] + $stats['web'] + $stats['server']);
        $stats['critical'] = max($stats['critical'], $nativeCount);
    }

    return $stats;
}

/**
 * Clears all error logs from DB and JSON store.
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
