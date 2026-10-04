<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

function native_push_response(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function native_push_body(): array {
    $decoded = json_decode((string)file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    native_push_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$userId = (int)($_SESSION['user_id'] ?? 0);
if ($userId <= 0) {
    native_push_response(['ok' => false, 'error' => 'Authentication required'], 401);
}

$action = strtolower(trim((string)($_GET['action'] ?? 'register')));
$body = native_push_body();
$platform = strtolower(trim((string)($body['platform'] ?? '')));
$token = trim((string)($body['token'] ?? ''));
$deviceId = trim((string)($body['device_id'] ?? ''));

if (!in_array($platform, ['ios', 'android'], true)) {
    native_push_response(['ok' => false, 'error' => 'Invalid platform'], 422);
}
if ($deviceId === '' || strlen($deviceId) > 191) {
    native_push_response(['ok' => false, 'error' => 'Invalid device'], 422);
}

try {
    $pdo = wp_runtime_open_pdo();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS native_push_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            device_id VARCHAR(191) NOT NULL,
            platform VARCHAR(16) NOT NULL,
            token TEXT NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_native_push_device (user_id, device_id, platform),
            KEY idx_native_push_user_active (user_id, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    if ($action === 'register') {
        if ($token === '' || strlen($token) > 4096) {
            native_push_response(['ok' => false, 'error' => 'Invalid token'], 422);
        }
        $statement = $pdo->prepare(
            "INSERT INTO native_push_tokens (user_id, device_id, platform, token, is_active)
             VALUES (?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE token = VALUES(token), is_active = 1, updated_at = CURRENT_TIMESTAMP"
        );
        $statement->execute([$userId, $deviceId, $platform, $token]);
        native_push_response(['ok' => true]);
    }

    if ($action === 'unregister') {
        $statement = $pdo->prepare(
            'UPDATE native_push_tokens SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND device_id = ? AND platform = ?'
        );
        $statement->execute([$userId, $deviceId, $platform]);
        native_push_response(['ok' => true]);
    }

    native_push_response(['ok' => false, 'error' => 'Unsupported action'], 405);
} catch (Throwable $error) {
    error_log('native_push_api: ' . $error->getMessage());
    native_push_response(['ok' => false, 'error' => 'Native push storage unavailable'], 500);
}
