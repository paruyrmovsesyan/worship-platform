<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/translation_runtime.php';

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function favorites_out(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function favorites_read_json(): array {
    $raw = file_get_contents('php://input');
    $decoded = json_decode(is_string($raw) ? $raw : '', true);
    return is_array($decoded) ? $decoded : [];
}

function favorites_norm_key($key): ?string {
    if ($key === null) {
        return null;
    }

    $key = trim((string)$key);
    if ($key === '') {
        return null;
    }

    return str_replace('♭', 'b', $key);
}

function favorites_guest_response(string $action): never {
    if ($action === 'get_favorites') {
        favorites_out([]);
    }

    if ($action === 'get_favorite') {
        favorites_out(['favorite' => false, 'target_key' => null]);
    }

    favorites_out(['error' => 'Unauthorized'], 401);
}

$action = trim((string)($_GET['action'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$userId = wp_auth_user_id();
$lang = wp_translation_requested_lang();

if ($userId <= 0) {
    favorites_guest_response($action);
}

try {
    $pdo = wp_runtime_open_pdo();
} catch (Throwable $e) {
    favorites_out(['error' => 'DB connection failed'], 500);
}

if ($action === 'toggle_favorite' && $method === 'POST') {
    $data = favorites_read_json();
    $songId = (int)($data['song_id'] ?? 0);

    if ($songId <= 0) {
        favorites_out(['error' => 'song_id required'], 400);
    }

    $stmt = $pdo->prepare('SELECT id FROM favorites WHERE user_id=? AND song_id=? LIMIT 1');
    $stmt->execute([$userId, $songId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $del = $pdo->prepare('DELETE FROM favorites WHERE id=?');
        $del->execute([(int)$row['id']]);
        favorites_out(['favorite' => false]);
    }

    $ins = $pdo->prepare('INSERT INTO favorites (user_id, song_id, target_key) VALUES (?, ?, NULL)');
    $ins->execute([$userId, $songId]);
    favorites_out(['favorite' => true]);
}

if ($action === 'update_favorite_key' && $method === 'POST') {
    $data = favorites_read_json();
    $songId = (int)($data['song_id'] ?? 0);
    $targetKey = favorites_norm_key($data['target_key'] ?? null);

    if ($songId <= 0) {
        favorites_out(['error' => 'song_id required'], 400);
    }

    $upd = $pdo->prepare('UPDATE favorites SET target_key=? WHERE user_id=? AND song_id=?');
    $upd->execute([$targetKey, $userId, $songId]);
    favorites_out(['ok' => true, 'target_key' => $targetKey]);
}

if ($action === 'get_favorites' && $method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT s.*, f.target_key
         FROM favorites f
         JOIN songs s ON f.song_id = s.id
         WHERE f.user_id = ?
         ORDER BY f.created_at ASC, f.id ASC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $rows = wp_translation_translate_rows($rows, [
        'title' => 'favorites.song.title',
        'artist' => 'favorites.song.artist',
        'chords' => 'favorites.song.chords',
        'lyrics' => 'favorites.song.lyrics',
        'tags' => 'favorites.song.tags',
    ], $lang);
    $rows = wp_translation_localize_row_fields($rows, [
        'title' => 'favorites.song.title',
    ], $lang);
    favorites_out($rows);
}

if ($action === 'get_favorite' && $method === 'GET') {
    $songId = (int)($_GET['song_id'] ?? 0);
    if ($songId <= 0) {
        favorites_out(['error' => 'song_id required'], 400);
    }

    $stmt = $pdo->prepare('SELECT target_key FROM favorites WHERE user_id=? AND song_id=? LIMIT 1');
    $stmt->execute([$userId, $songId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        favorites_out(['favorite' => true, 'target_key' => $row['target_key']]);
    }

    favorites_out(['favorite' => false, 'target_key' => null]);
}

if ($action === 'ensure_favorite' && $method === 'POST') {
    $data = favorites_read_json();
    $songId = (int)($data['song_id'] ?? 0);

    if ($songId <= 0) {
        favorites_out(['error' => 'song_id required'], 400);
    }

    $stmt = $pdo->prepare('SELECT id, target_key FROM favorites WHERE user_id=? AND song_id=? LIMIT 1');
    $stmt->execute([$userId, $songId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        favorites_out(['favorite' => true, 'target_key' => $row['target_key']]);
    }

    $ins = $pdo->prepare('INSERT INTO favorites (user_id, song_id, target_key) VALUES (?, ?, NULL)');
    $ins->execute([$userId, $songId]);
    favorites_out(['favorite' => true, 'target_key' => null]);
}

favorites_out(['error' => 'No valid action'], 404);
