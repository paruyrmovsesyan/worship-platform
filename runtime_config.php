<?php
declare(strict_types=1);

const WP_RUNTIME_SECRET_STORE_PATH = __DIR__ . '/runtime_secret_store.php';
const WP_RUNTIME_LOCAL_CONFIG_PATH = __DIR__ . '/runtime_local_config.php';

if (!function_exists('wp_runtime_local_config')) {
    function wp_runtime_local_config(): array {
        if (!is_file(WP_RUNTIME_LOCAL_CONFIG_PATH)) {
            return [];
        }

        $loaded = include WP_RUNTIME_LOCAL_CONFIG_PATH;
        return is_array($loaded) ? $loaded : [];
    }
}

if (!function_exists('wp_runtime_env')) {
    function wp_runtime_env(string $key, ?string $fallback = null): ?string {
        $value = getenv($key);
        if (is_string($value) && $value !== '') {
            return $value;
        }

        if (isset($_ENV[$key]) && is_string($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }

        if (isset($_SERVER[$key]) && is_string($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }

        return $fallback;
    }
}

if (!function_exists('wp_runtime_db_config')) {
    function wp_runtime_db_config(): array {
        $local = wp_runtime_local_config();
        $localDb = is_array($local['db'] ?? null) ? $local['db'] : [];

        $fallback = [
            'host' => (string)($localDb['host'] ?? 'localhost'),
            'name' => (string)($localDb['name'] ?? 'pmstudio_wolarm'),
            'user' => (string)($localDb['user'] ?? 'pmstudio_wolarm'),
            'pass' => (string)($localDb['pass'] ?? 'wolarm2026'),
            'charset' => (string)($localDb['charset'] ?? 'utf8mb4'),
        ];

        $env = [
            'host' => trim((string)wp_runtime_env('WORSHIP_DB_HOST', '')),
            'name' => trim((string)wp_runtime_env('WORSHIP_DB_NAME', '')),
            'user' => trim((string)wp_runtime_env('WORSHIP_DB_USER', '')),
            'pass' => (string)wp_runtime_env('WORSHIP_DB_PASS', ''),
            'charset' => trim((string)wp_runtime_env('WORSHIP_DB_CHARSET', '')),
        ];

        $hasCompleteEnv = $env['host'] !== '' && $env['name'] !== '' && $env['user'] !== '' && $env['pass'] !== '';

        if ($hasCompleteEnv) {
            return [
                'host' => $env['host'],
                'name' => $env['name'],
                'user' => $env['user'],
                'pass' => $env['pass'],
                'charset' => $env['charset'] !== '' ? $env['charset'] : $fallback['charset'],
            ];
        }

        return $fallback;
    }
}

if (!function_exists('wp_runtime_open_pdo')) {
    function wp_runtime_open_pdo(): PDO {
        $db = wp_runtime_db_config();
        return new PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=%s', $db['host'], $db['name'], $db['charset']),
            $db['user'],
            $db['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
}

if (!function_exists('wp_runtime_open_mysqli')) {
    function wp_runtime_open_mysqli(): mysqli {
        $db = wp_runtime_db_config();
        $conn = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
        if ($conn->connect_error) {
            throw new RuntimeException('DB connection failed');
        }
        $conn->set_charset($db['charset']);
        return $conn;
    }
}

if (!function_exists('wp_runtime_ensure_song_title_columns_mysqli')) {
    function wp_runtime_ensure_song_title_columns_mysqli(mysqli $conn): bool {
        static $done = false;
        if ($done) {
            return true;
        }

        $varcharUtf8 = "VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL";
        $required = [
            'title_hy' => "ALTER TABLE songs ADD COLUMN title_hy {$varcharUtf8} AFTER title",
            'title_lat' => "ALTER TABLE songs ADD COLUMN title_lat {$varcharUtf8} AFTER title_hy",
            'title_en' => "ALTER TABLE songs ADD COLUMN title_en {$varcharUtf8} AFTER title_lat",
            'title_ru' => "ALTER TABLE songs ADD COLUMN title_ru {$varcharUtf8} AFTER title_en",
        ];
        $repair = [
            'title_hy' => "ALTER TABLE songs MODIFY COLUMN title_hy {$varcharUtf8}",
            'title_lat' => "ALTER TABLE songs MODIFY COLUMN title_lat {$varcharUtf8}",
            'title_en' => "ALTER TABLE songs MODIFY COLUMN title_en {$varcharUtf8}",
            'title_ru' => "ALTER TABLE songs MODIFY COLUMN title_ru {$varcharUtf8}",
        ];

        foreach ($required as $column => $sql) {
            $safeColumn = preg_replace('/[^A-Za-z0-9_]+/', '', $column);
            $check = $conn->query("SHOW FULL COLUMNS FROM songs LIKE '{$safeColumn}'");
            $exists = $check instanceof mysqli_result && $check->num_rows > 0;
            $needsRepair = false;
            if ($exists && $check instanceof mysqli_result) {
                $info = $check->fetch_assoc() ?: [];
                $collation = strtolower((string)($info['Collation'] ?? ''));
                $type = strtolower((string)($info['Type'] ?? ''));
                $needsRepair = $collation !== 'utf8mb4_unicode_ci' || $type !== 'varchar(255)';
                $check->data_seek(0);
            }
            if ($check instanceof mysqli_result) {
                $check->free();
            }

            if (!$exists) {
                if (!$conn->query($sql)) {
                    return false;
                }
                continue;
            }

            if ($needsRepair) {
                if (!$conn->query($repair[$column])) {
                    return false;
                }
            }
        }

        $done = true;
        return true;
    }
}

if (!function_exists('wp_runtime_normalize_ip')) {
    function wp_runtime_normalize_ip(string $ip): string {
        $ip = trim($ip);
        if ($ip === '') {
            return '';
        }
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }
}

if (!function_exists('wp_runtime_remote_ip')) {
    function wp_runtime_remote_ip(): string {
        $candidates = [
            (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''),
            (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''),
            (string)($_SERVER['REMOTE_ADDR'] ?? ''),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === '') {
                continue;
            }
            $parts = array_map('trim', explode(',', $candidate));
            foreach ($parts as $part) {
                $normalized = wp_runtime_normalize_ip($part);
                if ($normalized !== '') {
                    return $normalized;
                }
            }
        }

        return '';
    }
}

if (!function_exists('wp_runtime_password_min_length')) {
    function wp_runtime_password_min_length(): int {
        $local = wp_runtime_local_config();
        $fallback = (string)($local['password_min_length'] ?? '8');
        $value = (int)(wp_runtime_env('WORSHIP_PASSWORD_MIN_LENGTH', $fallback) ?? 8);
        return max(6, min($value, 128));
    }
}

if (!function_exists('wp_runtime_load_secret_store')) {
    function wp_runtime_load_secret_store(): array {
        if (!is_file(WP_RUNTIME_SECRET_STORE_PATH)) {
            return [];
        }

        $loaded = include WP_RUNTIME_SECRET_STORE_PATH;
        return is_array($loaded) ? $loaded : [];
    }
}

if (!function_exists('wp_runtime_save_secret_store')) {
    function wp_runtime_save_secret_store(array $store): bool {
        $export = "<?php\nreturn " . var_export($store, true) . ";\n";
        return @file_put_contents(WP_RUNTIME_SECRET_STORE_PATH, $export, LOCK_EX) !== false;
    }
}

if (!function_exists('wp_runtime_set_secret')) {
    function wp_runtime_set_secret(string $name, string $value): bool {
        $name = trim($name);
        if ($name === '') {
            return false;
        }

        $store = wp_runtime_load_secret_store();
        $store[$name] = $value;
        return wp_runtime_save_secret_store($store);
    }
}

if (!function_exists('wp_runtime_delete_secret')) {
    function wp_runtime_delete_secret(string $name): bool {
        $name = trim($name);
        if ($name === '') {
            return false;
        }

        $store = wp_runtime_load_secret_store();
        if (!array_key_exists($name, $store)) {
            return true;
        }
        unset($store[$name]);
        return wp_runtime_save_secret_store($store);
    }
}

if (!function_exists('wp_runtime_peek_secret')) {
    function wp_runtime_peek_secret(string $name): string {
        $envKey = 'WORSHIP_' . strtoupper(preg_replace('/[^A-Za-z0-9]+/', '_', $name)) . '_SECRET';
        $envValue = wp_runtime_env($envKey, '');
        if (is_string($envValue) && trim($envValue) !== '') {
            return trim($envValue);
        }

        $local = wp_runtime_local_config();
        if (!empty($local['secrets'][$name]) && is_string($local['secrets'][$name])) {
            return trim($local['secrets'][$name]);
        }

        $store = wp_runtime_load_secret_store();
        if (!empty($store[$name]) && is_string($store[$name])) {
            return $store[$name];
        }

        return '';
    }
}

if (!function_exists('wp_runtime_get_secret')) {
    function wp_runtime_get_secret(string $name, int $length = 64): string {
        $existing = wp_runtime_peek_secret($name);
        if ($existing !== '') {
            return $existing;
        }

        try {
            $generated = bin2hex(random_bytes(max(16, (int)ceil($length / 2))));
        } catch (Throwable $e) {
            $generated = hash('sha256', $name . '|' . __FILE__ . '|' . microtime(true));
        }

        wp_runtime_set_secret($name, $generated);
        return $generated;
    }
}

if (!function_exists('wp_runtime_admin_cookie_secret')) {
    function wp_runtime_admin_cookie_secret(): string {
        return wp_runtime_get_secret('admin_cookie', 64);
    }
}
