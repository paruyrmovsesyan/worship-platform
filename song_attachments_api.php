<?php
declare(strict_types=1);

require_once 'auth_bootstrap.php';
require_once 'runtime_config.php';
require_once 'admin_access.php';
$pdo = wp_runtime_open_pdo();

header('Content-Type: application/json; charset=utf-8');

function out(array $data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Requires user login
session_start();
$uid = (int)($_SESSION['user_id'] ?? 0);
if ($uid <= 0) {
    $user = wp_admin_get_current_user();
    if (!$user) {
        out(["error" => "Unauthorized"], 401);
    }
    $uid = (int)$user['id'];
}

if ($action === 'add' && $method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    if (!is_array($d)) out(["error" => "Invalid JSON payload"], 400);

    $song_id = (int)($d['song_id'] ?? 0);
    $title = trim((string)($d['title'] ?? ''));
    $url = trim((string)($d['url'] ?? ''));
    $type = trim((string)($d['type'] ?? 'link'));

    if ($song_id <= 0 || $title === '' || $url === '') {
        out(["error" => "Missing required fields"], 400);
    }

    $st = $pdo->prepare("INSERT INTO song_attachments (song_id, title, url, type) VALUES (?, ?, ?, ?)");
    try {
        $st->execute([$song_id, $title, $url, $type]);
        out(["ok" => true, "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        out(["error" => "Failed to add attachment"], 500);
    }
}

if ($action === 'remove' && $method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    if (!is_array($d)) out(["error" => "Invalid JSON payload"], 400);

    $id = (int)($d['id'] ?? 0);
    if ($id <= 0) out(["error" => "Invalid attachment id"], 400);

    $st = $pdo->prepare("DELETE FROM song_attachments WHERE id = ?");
    try {
        $st->execute([$id]);
        out(["ok" => true]);
    } catch (Exception $e) {
        out(["error" => "Failed to remove attachment"], 500);
    }
}

out(["error" => "Unknown action"], 404);
