<?php
declare(strict_types=1);

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/song_request_service.php';

header('Content-Type: application/json; charset=UTF-8');

function wp_song_request_api_out(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (empty($_SESSION['user_id']) || !wp_auth_current_session_backed()) {
    wp_song_request_api_out([
        'ok' => false,
        'message' => 'Այս հարցումը ուղարկելու համար նախ մուտք գործիր։',
    ], 401);
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = trim((string)($_GET['action'] ?? 'submit_request'));

if ($method !== 'POST' || $action !== 'submit_request') {
    wp_song_request_api_out([
        'ok' => false,
        'message' => 'Սխալ հարցում է ուղարկվել։',
    ], 405);
}

$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) {
    wp_song_request_api_out([
        'ok' => false,
        'message' => 'Սխալ տվյալներ են ուղարկվել։',
    ], 400);
}

$submitter = [
    'id' => (int)($_SESSION['user_id'] ?? 0),
    'name' => (string)($_SESSION['name'] ?? $_SESSION['username'] ?? ''),
    'email' => (string)($_SESSION['email'] ?? ''),
];

$result = wp_song_request_create($payload, $submitter);
wp_song_request_api_out($result, !empty($result['ok']) ? 200 : 400);
