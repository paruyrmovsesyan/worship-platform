<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';

wp_admin_require_access('/admin_notifications_api.php');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$items = [];

try {
    $conn = wp_runtime_open_mysqli();

    // Recent songs (last 8)
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs ORDER BY id DESC LIMIT 8");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $items[] = [
                'type'    => 'song',
                'message' => 'New song: ' . ($row['title'] ?? 'Untitled'),
                'sub'     => $row['artist'] ?? '',
                'time'    => $row['created_at'] ?? '',
            ];
        }
    }

    // Recent users (last 5)
    $r = $conn->query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 5");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $items[] = [
                'type'    => 'user',
                'message' => 'New user: ' . ($row['name'] ?? $row['email'] ?? 'Unknown'),
                'sub'     => $row['email'] ?? '',
                'time'    => $row['created_at'] ?? '',
            ];
        }
    }

    // Sent Push Notifications
    $rPush = $conn->query("SHOW TABLES LIKE 'push_history'");
    if ($rPush && $rPush->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, body, devices_count, at FROM push_history ORDER BY id DESC LIMIT 5");
        if ($r2) {
            while ($row = $r2->fetch_assoc()) {
                $items[] = [
                    'type'    => 'push',
                    'message' => '📣 Push: ' . ($row['title'] ?? 'Notification'),
                    'sub'     => ($row['devices_count'] ?? 0) . ' devices reached',
                    'time'    => $row['at'] ?? date('Y-m-d H:i:s'),
                    'link'    => '/admin_updates.php?tab=push'
                ];
            }
        }
    }

    // Pending song change requests (moderation alert)
    $rReq = $conn->query("SHOW TABLES LIKE 'song_change_requests'");
    if ($rReq && $rReq->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, created_at FROM song_change_requests WHERE status = 'pending' ORDER BY id DESC LIMIT 5");
        if ($r2) {
            while ($row = $r2->fetch_assoc()) {
                $items[] = [
                    'type'    => 'request',
                    'message' => '⚠️ Pending request: ' . ($row['title'] ?? 'Song edit'),
                    'sub'     => 'Requires admin review in Moderation',
                    'time'    => $row['created_at'] ?? date('Y-m-d H:i:s'),
                    'link'    => '/admin_messages.php'
                ];
            }
        }
    }

    $conn->close();

    // Sort by time desc
    usort($items, fn($a, $b) => strcmp((string)$b['time'], (string)$a['time']));
    $items = array_slice($items, 0, 20);

} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage(), 'items' => []]);
    exit;
}

echo json_encode(['items' => $items]);
