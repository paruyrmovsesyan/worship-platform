<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

const STAGE_SESSIONS_FILE = __DIR__ . '/data/live_stage_sessions.json';

function stage_json_response(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function stage_load_sessions(): array {
    if (!is_file(STAGE_SESSIONS_FILE)) {
        return [];
    }
    $raw = @file_get_contents(STAGE_SESSIONS_FILE);
    if (!$raw) return [];
    $data = @json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function stage_save_sessions(array $sessions): bool {
    $dir = dirname(STAGE_SESSIONS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return (bool)@file_put_contents(
        STAGE_SESSIONS_FILE,
        json_encode($sessions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

// Clean up sessions older than 24 hours
function stage_prune_old_sessions(array &$sessions): void {
    $now = time();
    $cutoff = $now - (24 * 3600);
    foreach ($sessions as $id => $sess) {
        if (($sess['updated_at'] ?? 0) < $cutoff) {
            unset($sessions[$id]);
        }
    }
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? ''));

// =========================================================================
// ACTION: broadcast_state (Leader pushes new stage state)
// =========================================================================
if ($action === 'broadcast_state') {
    $rawInput = file_get_contents('php://input');
    $payload = @json_decode($rawInput, true) ?: $_POST;

    $sessionId = trim((string)($payload['session_id'] ?? ''));
    if ($sessionId === '') {
        stage_json_response(['ok' => false, 'error' => 'Session ID is required'], 400);
    }

    $sessions = stage_load_sessions();
    stage_prune_old_sessions($sessions);

    $now = time();
    $nowMs = (int)(microtime(true) * 1000);

    $currentState = $sessions[$sessionId] ?? [
        'session_id' => $sessionId,
        'created_at' => $now,
    ];

    $currentState['leader_name'] = trim((string)($payload['leader_name'] ?? $currentState['leader_name'] ?? 'Worship Leader'));
    $currentState['song_id'] = isset($payload['song_id']) ? (int)$payload['song_id'] : ($currentState['song_id'] ?? null);
    $currentState['song_title'] = trim((string)($payload['song_title'] ?? $currentState['song_title'] ?? ''));
    $currentState['setlist_id'] = isset($payload['setlist_id']) ? (int)$payload['setlist_id'] : ($currentState['setlist_id'] ?? null);
    $currentState['section_name'] = trim((string)($payload['section_name'] ?? $currentState['section_name'] ?? ''));
    $currentState['section_index'] = isset($payload['section_index']) ? (int)$payload['section_index'] : ($currentState['section_index'] ?? 0);
    $currentState['bpm'] = isset($payload['bpm']) ? (int)$payload['bpm'] : ($currentState['bpm'] ?? 0);
    $currentState['scroll_ratio'] = isset($payload['scroll_ratio']) ? (float)$payload['scroll_ratio'] : ($currentState['scroll_ratio'] ?? 0.0);
    $currentState['stage_message'] = trim((string)($payload['stage_message'] ?? $currentState['stage_message'] ?? ''));
    $currentState['updated_at'] = $now;
    $currentState['version'] = $nowMs;

    $sessions[$sessionId] = $currentState;
    stage_save_sessions($sessions);

    stage_json_response([
        'ok' => true,
        'session_id' => $sessionId,
        'state' => $currentState,
    ]);
}

// =========================================================================
// ACTION: get_state (Followers / Projection clients poll stage state)
// =========================================================================
if ($action === 'get_state') {
    $sessionId = trim((string)($_GET['session_id'] ?? ''));
    if ($sessionId === '') {
        stage_json_response(['ok' => false, 'error' => 'Session ID is required'], 400);
    }

    $sessions = stage_load_sessions();
    $session = $sessions[$sessionId] ?? null;

    if (!$session) {
        stage_json_response(['ok' => false, 'error' => 'Live stage session not found'], 404);
    }

    stage_json_response([
        'ok' => true,
        'session_id' => $sessionId,
        'state' => $session,
    ]);
}

// =========================================================================
// ACTION: list_active_sessions
// =========================================================================
if ($action === 'list_active_sessions') {
    $sessions = stage_load_sessions();
    stage_prune_old_sessions($sessions);

    $active = [];
    $recentThreshold = time() - 3600; // Active within last 1 hour
    foreach ($sessions as $id => $sess) {
        if (($sess['updated_at'] ?? 0) >= $recentThreshold) {
            $active[] = [
                'session_id' => $id,
                'leader_name' => $sess['leader_name'] ?? 'Leader',
                'song_title' => $sess['song_title'] ?? '',
                'updated_at' => $sess['updated_at'] ?? 0,
            ];
        }
    }

    stage_json_response([
        'ok' => true,
        'sessions' => $active,
    ]);
}

stage_json_response(['ok' => false, 'error' => 'Invalid action'], 400);
