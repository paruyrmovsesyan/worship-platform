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
        
        // Ensure migrations run even if using PDO
        $tmpConn = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
        if (!$tmpConn->connect_error) {
            $tmpConn->set_charset($db['charset']);
            if (function_exists('wp_runtime_ensure_pricing_tables_mysqli')) {
                wp_runtime_ensure_pricing_tables_mysqli($tmpConn);
            }
            if (function_exists('wp_runtime_ensure_admin_tables_mysqli')) {
                wp_runtime_ensure_admin_tables_mysqli($tmpConn);
            }
            $tmpConn->close();
        }

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
            throw new RuntimeException('DB connection failed: ' . $conn->connect_error);
        }
        $conn->set_charset($db['charset']);
        
        if (function_exists('wp_runtime_ensure_pricing_tables_mysqli')) {
            wp_runtime_ensure_pricing_tables_mysqli($conn);
        }
        if (function_exists('wp_runtime_ensure_admin_tables_mysqli')) {
            wp_runtime_ensure_admin_tables_mysqli($conn);
        }
        
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
        $smallIntUnsigned = "SMALLINT UNSIGNED NULL";
        $required = [
            'title_hy' => [
                'add' => "ALTER TABLE songs ADD COLUMN title_hy {$varcharUtf8} AFTER title",
                'repair' => "ALTER TABLE songs MODIFY COLUMN title_hy {$varcharUtf8}",
                'type' => 'varchar(255)',
                'collation' => 'utf8mb4_unicode_ci',
            ],
            'title_lat' => [
                'add' => "ALTER TABLE songs ADD COLUMN title_lat {$varcharUtf8} AFTER title_hy",
                'repair' => "ALTER TABLE songs MODIFY COLUMN title_lat {$varcharUtf8}",
                'type' => 'varchar(255)',
                'collation' => 'utf8mb4_unicode_ci',
            ],
            'title_en' => [
                'add' => "ALTER TABLE songs ADD COLUMN title_en {$varcharUtf8} AFTER title_lat",
                'repair' => "ALTER TABLE songs MODIFY COLUMN title_en {$varcharUtf8}",
                'type' => 'varchar(255)',
                'collation' => 'utf8mb4_unicode_ci',
            ],
            'title_ru' => [
                'add' => "ALTER TABLE songs ADD COLUMN title_ru {$varcharUtf8} AFTER title_en",
                'repair' => "ALTER TABLE songs MODIFY COLUMN title_ru {$varcharUtf8}",
                'type' => 'varchar(255)',
                'collation' => 'utf8mb4_unicode_ci',
            ],
            'bpm' => [
                'add' => "ALTER TABLE songs ADD COLUMN bpm {$smallIntUnsigned} AFTER song_key",
                'repair' => "ALTER TABLE songs MODIFY COLUMN bpm {$smallIntUnsigned}",
                'type' => 'smallint unsigned',
                'collation' => '',
            ],
        ];

        foreach ($required as $column => $meta) {
            $safeColumn = preg_replace('/[^A-Za-z0-9_]+/', '', $column);
            $check = $conn->query("SHOW FULL COLUMNS FROM songs LIKE '{$safeColumn}'");
            $exists = $check instanceof mysqli_result && $check->num_rows > 0;
            $needsRepair = false;
            if ($exists && $check instanceof mysqli_result) {
                $info = $check->fetch_assoc() ?: [];
                $collation = strtolower((string)($info['Collation'] ?? ''));
                $type = strtolower((string)($info['Type'] ?? ''));
                $expectedType = strtolower((string)($meta['type'] ?? ''));
                $expectedCollation = strtolower((string)($meta['collation'] ?? ''));
                $needsRepair = $type !== $expectedType;
                if ($expectedCollation !== '') {
                    $needsRepair = $needsRepair || $collation !== $expectedCollation;
                }
                $check->data_seek(0);
            }
            if ($check instanceof mysqli_result) {
                $check->free();
            }

            if (!$exists) {
                if (!$conn->query((string)$meta['add'])) {
                    return false;
                }
                continue;
            }

            if ($needsRepair) {
                if (!$conn->query((string)$meta['repair'])) {
                    return false;
                }
            }
        }

        $done = true;
        return true;
    }
}

if (!function_exists('wp_runtime_ensure_pricing_tables_mysqli')) {
    function wp_runtime_ensure_pricing_tables_mysqli(mysqli $conn): bool {
        static $done = false;
        if ($done) {
            return true;
        }

        // 1. Add plan_type to users
        $check = $conn->query("SHOW COLUMNS FROM users LIKE 'plan_type'");
        if ($check instanceof mysqli_result && $check->num_rows === 0) {
            $conn->query("ALTER TABLE users ADD COLUMN plan_type ENUM('free', 'pro', 'church') NOT NULL DEFAULT 'free'");
        }
        if ($check instanceof mysqli_result) {
            $check->free();
        }

        // Add email verification columns
        $check = $conn->query("SHOW COLUMNS FROM users LIKE 'pending_email'");
        if ($check instanceof mysqli_result && $check->num_rows === 0) {
            $conn->query("ALTER TABLE users 
                ADD COLUMN pending_email VARCHAR(190) NULL,
                ADD COLUMN email_verified_at DATETIME NULL,
                ADD COLUMN email_verify_token_hash VARCHAR(255) NULL,
                ADD COLUMN email_verify_expires_at DATETIME NULL,
                ADD COLUMN email_last_verification_sent_at DATETIME NULL");
        }
        if ($check instanceof mysqli_result) {
            $check->free();
        }

        // 2. Create teams table
        $conn->query("
            CREATE TABLE IF NOT EXISTS teams (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                owner_user_id INT UNSIGNED NOT NULL,
                name VARCHAR(150) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_owner (owner_user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // 3. Create team_members table
        $conn->query("
            CREATE TABLE IF NOT EXISTS team_members (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                team_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                role ENUM('member', 'admin') NOT NULL DEFAULT 'member',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uniq_team_user (team_id, user_id),
                KEY idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // 4. Create user_sessions table
        $conn->query("
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                selector VARCHAR(255) NULL,
                session_key VARCHAR(255) NULL,
                remembered TINYINT(1) NOT NULL DEFAULT 0,
                device_name VARCHAR(150) NULL,
                browser VARCHAR(100) NULL,
                platform VARCHAR(100) NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                last_used_at DATETIME NULL,
                expires_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // 5. Create password_resets table
        $conn->query("
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                ip VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // 6. Create recent_views table
        $conn->query("
            CREATE TABLE IF NOT EXISTS recent_views (
                user_id INT UNSIGNED NOT NULL,
                song_id INT UNSIGNED NOT NULL,
                viewed_at DATETIME NOT NULL,
                PRIMARY KEY (user_id, song_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // 7. Create favorites table
        $conn->query("
            CREATE TABLE IF NOT EXISTS favorites (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                song_id INT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uniq_user_song (user_id, song_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $done = true;
        return true;
    }
}

if (!function_exists('wp_runtime_ensure_admin_tables_mysqli')) {
    function wp_runtime_ensure_admin_tables_mysqli(mysqli $conn): bool {
        static $done = false;
        if ($done) {
            return true;
        }

        // 1. sys_settings table for key-value JSON configurations
        $conn->query("
            CREATE TABLE IF NOT EXISTS sys_settings (
                setting_key VARCHAR(100) NOT NULL,
                setting_value LONGTEXT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // 2. version_history table
        $conn->query("
            CREATE TABLE IF NOT EXISTS version_history (
                id VARCHAR(64) NOT NULL,
                at VARCHAR(60) NOT NULL,
                actor VARCHAR(190) NOT NULL,
                ip VARCHAR(80) NOT NULL,
                action VARCHAR(100) NOT NULL,
                changed_fields JSON NULL,
                snapshot JSON NULL,
                note TEXT NULL,
                PRIMARY KEY (id),
                KEY idx_at (at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->query("ALTER TABLE version_history MODIFY COLUMN at VARCHAR(60) NOT NULL");

        // 3. install_stats table
        $conn->query("
            CREATE TABLE IF NOT EXISTS install_stats (
                device_id VARCHAR(120) NOT NULL,
                device_signature VARCHAR(64) NOT NULL,
                scope VARCHAR(50) NOT NULL,
                source VARCHAR(80) NOT NULL,
                user_id INT UNSIGNED NOT NULL DEFAULT 0,
                user_name VARCHAR(160) NOT NULL DEFAULT '',
                user_username VARCHAR(160) NOT NULL DEFAULT '',
                user_email VARCHAR(190) NOT NULL DEFAULT '',
                ip_address VARCHAR(80) NOT NULL DEFAULT '',
                user_agent VARCHAR(255) NOT NULL DEFAULT '',
                installed_at VARCHAR(60) NOT NULL,
                last_seen_at VARCHAR(60) NOT NULL,
                PRIMARY KEY (device_id),
                KEY idx_last_seen (last_seen_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->query("ALTER TABLE install_stats MODIFY COLUMN installed_at VARCHAR(60) NOT NULL, MODIFY COLUMN last_seen_at VARCHAR(60) NOT NULL");

        // 4. push_subscriptions table
        $conn->query("
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id VARCHAR(120) NOT NULL,
                endpoint TEXT NOT NULL,
                public_key VARCHAR(255) NOT NULL DEFAULT '',
                auth_key VARCHAR(255) NOT NULL DEFAULT '',
                user_agent VARCHAR(255) NOT NULL DEFAULT '',
                user_id INT UNSIGNED NOT NULL DEFAULT 0,
                user_name VARCHAR(190) NOT NULL DEFAULT '',
                user_email VARCHAR(190) NOT NULL DEFAULT '',
                ip_address VARCHAR(80) NOT NULL DEFAULT '',
                created_at VARCHAR(60) NOT NULL,
                updated_at VARCHAR(60) NOT NULL,
                last_seen_at VARCHAR(60) NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->query("ALTER TABLE push_subscriptions MODIFY COLUMN created_at VARCHAR(60) NOT NULL, MODIFY COLUMN updated_at VARCHAR(60) NOT NULL, MODIFY COLUMN last_seen_at VARCHAR(60) NULL");

        // 5. push_history table
        $conn->query("
            CREATE TABLE IF NOT EXISTS push_history (
                id VARCHAR(64) NOT NULL,
                at VARCHAR(60) NOT NULL,
                actor VARCHAR(190) NOT NULL,
                title VARCHAR(160) NOT NULL DEFAULT '',
                body TEXT NULL,
                url VARCHAR(260) NOT NULL DEFAULT '',
                icon VARCHAR(260) NOT NULL DEFAULT '',
                tag VARCHAR(100) NOT NULL DEFAULT '',
                devices_count INT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (id),
                KEY idx_at (at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $conn->query("ALTER TABLE push_history MODIFY COLUMN at VARCHAR(60) NOT NULL");

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
