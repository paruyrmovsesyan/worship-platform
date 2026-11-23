<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/push_service.php';

if (!function_exists('wp_chat_compact_push_title')) {
    function wp_chat_compact_push_title(string $senderName): string {
        $senderName = trim(preg_replace('/\s+/u', ' ', $senderName));
        return $senderName !== '' ? mb_substr($senderName, 0, 60) : 'New message';
    }
}
if (!function_exists('wp_chat_compact_push_body')) {
    function wp_chat_compact_push_body(string $message, bool $isSetlistShare = false, string $setlistName = ''): string {
        $message = trim(preg_replace('/\s+/u', ' ', $message));
        return $message !== '' ? mb_substr($message, 0, 80) : 'Նոր հաղորդագրություն';
    }
}

function out_json(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$action = trim((string)($payload['action'] ?? ''));
$chatId = (int)($payload['chat_id'] ?? 0);
$userId = (int)($payload['user_id'] ?? 0);
$signature = trim((string)($payload['sig'] ?? ''));
$timestamp = (int)($payload['ts'] ?? 0);

if ($chatId <= 0 || $userId <= 0 || $action === '' || $signature === '') {
    out_json(['ok' => false, 'error' => 'Missing parameters'], 400);
}

// 1. Validate signature using persistent secret
// Signature is valid for up to 7 days
$now = time();
if ($timestamp < ($now - 7 * 86400) || $timestamp > ($now + 3600)) {
    out_json(['ok' => false, 'error' => 'Action token expired'], 403);
}

$secret = function_exists('wp_runtime_get_secret') ? wp_runtime_get_secret('native_chat_action', 32) : 'worship_secret_key';
$expectedSig = hash_hmac('sha256', "chat:{$chatId}:user:{$userId}:ts:{$timestamp}", $secret);
if (!hash_equals($expectedSig, $signature)) {
    out_json(['ok' => false, 'error' => 'Invalid signature'], 403);
}

try {
    $pdo = wp_runtime_open_pdo();
    $st = $pdo->query("SHOW COLUMNS FROM chat_participants LIKE 'last_read_message_id'");
    $hasColumn = $st && $st->fetch(PDO::FETCH_ASSOC);
    if (!$hasColumn) {
        $pdo->exec("ALTER TABLE chat_participants ADD COLUMN last_read_message_id BIGINT NULL DEFAULT NULL AFTER cleared_at");
    }
} catch (Throwable $e) {
    out_json(['ok' => false, 'error' => 'Database error'], 500);
}

// Verify user is indeed a member of this chat
$st = $pdo->prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ? LIMIT 1");
$st->execute([$chatId, $userId]);
if (!$st->fetch()) {
    out_json(['ok' => false, 'error' => 'Access denied'], 403);
}

if ($action === 'mark_read') {
    try {
        $stRead = $pdo->prepare("SELECT MAX(id) FROM chat_messages WHERE chat_id = ?");
        $stRead->execute([$chatId]);
        $lastId = (int)($stRead->fetchColumn() ?: 0);
        if ($lastId > 0) {
            $stMark = $pdo->prepare("
                UPDATE chat_participants
                SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), ?)
                WHERE chat_id = ? AND user_id = ?
            ");
            $stMark->execute([$lastId, $chatId, $userId]);
        }
        out_json(['ok' => true, 'action' => 'mark_read', 'chat_id' => $chatId]);
    } catch (Throwable $e) {
        out_json(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($action === 'reply') {
    $replyText = trim((string)($payload['message'] ?? ''));
    if ($replyText === '') {
        out_json(['ok' => false, 'error' => 'Empty message'], 400);
    }

    try {
        $st = $pdo->prepare("INSERT INTO chat_messages (chat_id, user_id, message, setlist_id) VALUES (?, ?, ?, NULL)");
        $st->execute([$chatId, $userId, $replyText]);
        $newMsgId = (int)$pdo->lastInsertId();

        // Also update last_read_message_id for sender
        $pdo->prepare("
            UPDATE chat_participants
            SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), ?)
            WHERE chat_id = ? AND user_id = ?
        ")->execute([$newMsgId, $chatId, $userId]);

        // Get sender name
        $stSender = $pdo->prepare("SELECT name, email FROM users WHERE id = ? LIMIT 1");
        $stSender->execute([$userId]);
        $sender = $stSender->fetch(PDO::FETCH_ASSOC);
        $senderName = !empty($sender['name']) ? $sender['name'] : (!empty($sender['email']) ? explode('@', $sender['email'])[0] : 'User');

        // Send pushes to other participants
        $stOthers = $pdo->prepare("
            SELECT cp.user_id
            FROM chat_participants cp
            WHERE cp.chat_id = ? AND cp.user_id != ?
        ");
        $stOthers->execute([$chatId, $userId]);
        $others = $stOthers->fetchAll(PDO::FETCH_ASSOC);

        $pushTitle = wp_chat_compact_push_title((string)$senderName);
        $pushMsg = wp_chat_compact_push_body((string)$replyText, false, '');

        foreach ($others as $other) {
            $oid = (int)$other['user_id'];
            $pdo->prepare("UPDATE chat_participants SET cleared_at = NULL WHERE chat_id = ? AND user_id = ?")->execute([$chatId, $oid]);
            wp_push_send_to_user($pdo, $oid, $pushTitle, $pushMsg, "/chat/{$chatId}", [
                'type' => 'chat',
                'chat_id' => $chatId,
            ]);
        }

        out_json(['ok' => true, 'action' => 'reply', 'id' => $newMsgId, 'chat_id' => $chatId]);
    } catch (Throwable $e) {
        out_json(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}

out_json(['ok' => false, 'error' => 'Unknown action'], 400);
