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

    $conn->close();

    // Sort by time desc
    usort($items, fn($a, $b) => strcmp((string)$b['time'], (string)$a['time']));
    $items = array_slice($items, 0, 12);

} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage(), 'items' => []]);
    exit;
}

echo json_encode(['items' => $items]);
