<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

$action = $_GET['action'] ?? '';
$uid = (int)($_SESSION['user_id'] ?? 0);

if ($uid <= 0) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not authenticated']);
    exit;
}

try {
    $pdo = wp_runtime_open_pdo();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'DB Connection Failed']);
    exit;
}

if ($action === 'list') {
    // Fetch user notifications
    $st = $pdo->prepare("
        SELECT * FROM user_notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
    ");
    $st->execute([$uid]);
    $notifications = $st->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['ok' => true, 'notifications' => $notifications]);
    exit;
}

if ($action === 'mark_read') {
    $body = json_decode(file_get_contents('php://input'), true);
    $notif_id = $body['id'] ?? null;

    if ($notif_id === 'all') {
        $st = $pdo->prepare("UPDATE user_notifications SET is_read = 1 WHERE user_id = ?");
        $st->execute([$uid]);
    } elseif ($notif_id) {
        $st = $pdo->prepare("UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
        $st->execute([(int)$notif_id, $uid]);
    }

    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'delete') {
    $body = json_decode(file_get_contents('php://input'), true);
    $notif_id = $body['id'] ?? null;

    if ($notif_id) {
        $st = $pdo->prepare("DELETE FROM user_notifications WHERE id = ? AND user_id = ?");
        $st->execute([(int)$notif_id, $uid]);
    }

    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'get_unread_count') {
    $st = $pdo->prepare("SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0");
    $st->execute([$uid]);
    $count = (int)$st->fetchColumn();

    echo json_encode(['ok' => true, 'count' => $count]);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Invalid action']);
