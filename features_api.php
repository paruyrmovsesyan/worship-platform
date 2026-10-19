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

const FEATURE_FLAGS_FILE = __DIR__ . '/data/feature_flags.json';

function wp_features_json(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_features_default_catalog(): array {
    return [
        'smart_metronome' => [
            'id' => 'smart_metronome',
            'title' => 'Smart Metronome & Visual Click',
            'description' => 'Web Audio API-ով ճշգրիտ մետրոնոմ, տեսողական լույսեր, Tap Tempo և Screen Pulse:',
            'status' => 'published', // 'off' | 'beta' | 'published'
            'category' => 'stage',
            'test_url' => '/song/1',
        ],
        'live_stage_follower' => [
            'id' => 'live_stage_follower',
            'title' => 'Band Live Follower (Leader Remote Sync)',
            'description' => 'Երաժիշտների և վոկալիստների էկրանների ավտոմատ հետևում Worship Leader-ին:',
            'status' => 'published',
            'category' => 'stage',
            'test_url' => '/setlists/1/live',
        ],
        'rehearsal_stems' => [
            'id' => 'rehearsal_stems',
            'title' => 'RehearsalMix & Stems Mixer',
            'description' => '8-ալիքանի բազմաթրեկ միքշեր, Solo/Mute և A-B հատվածի կրկնող Looper:',
            'status' => 'published',
            'category' => 'audio',
            'test_url' => '/song/1',
        ],
        'lyrics_projection' => [
            'id' => 'lyrics_projection',
            'title' => 'Live Lyrics Projection & OBS Lower Thirds',
            'description' => 'Դահլիճի պրոյեկտորի, OBS եթերի Lower-Thirds և Confidence Monitor ռեժիմներ:',
            'status' => 'published',
            'category' => 'projection',
            'test_url' => '/projection/1',
        ],
        'worship_ai_studio' => [
            'id' => 'worship_ai_studio',
            'title' => 'Worship AI Studio',
            'description' => 'Ակորդների գեներացում, պոետիկ հայերեն թարգմանություն և ակորդների հարստացում:',
            'status' => 'published',
            'category' => 'ai',
            'test_url' => '/song/1',
        ],
        'service_planner' => [
            'id' => 'service_planner',
            'title' => 'Ministry Service Planner & Team Rostering',
            'description' => 'Կիրակնօրյա ծառայության րոպեական Run-of-Show պլանավորում և թիմի գրաֆիկ:',
            'status' => 'published',
            'category' => 'ministry',
            'test_url' => '/service-planner',
        ],
        'offline_p2p_mesh' => [
            'id' => 'offline_p2p_mesh',
            'title' => 'Offline P2P Mesh & Local Discovery',
            'description' => 'Բեմական կապ և սինքրոնացում նույնիսկ այն դեպքում, երբ ինտերնետ կապը բացակայում է:',
            'status' => 'published',
            'category' => 'network',
            'test_url' => '/setlists',
        ],
        'stage_two_column' => [
            'id' => 'stage_two_column',
            'title' => '2-Column Chord Chart Stage Layout',
            'description' => 'Լայն էկրանների և պլանշետների համար 2 սյունակով ակորդների դասավորություն:',
            'status' => 'published',
            'category' => 'stage',
            'test_url' => '/song/1',
        ],
    ];
}

function wp_features_load(): array {
    $catalog = wp_features_default_catalog();
    if (is_file(FEATURE_FLAGS_FILE)) {
        $raw = @file_get_contents(FEATURE_FLAGS_FILE);
        if ($raw) {
            $saved = @json_decode($raw, true);
            if (is_array($saved)) {
                foreach ($saved as $k => $v) {
                    if (isset($catalog[$k])) {
                        if (is_array($v)) {
                            $catalog[$k] = array_merge($catalog[$k], $v);
                        } elseif (is_string($v)) {
                            $catalog[$k]['status'] = $v;
                        }
                    }
                }
            }
        }
    }
    return $catalog;
}

function wp_features_save(array $catalog): bool {
    $dir = dirname(FEATURE_FLAGS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return (bool)@file_put_contents(
        FEATURE_FLAGS_FILE,
        json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'get_flags'));

// =========================================================================
// ACTION: get_flags (Client endpoint)
// =========================================================================
if ($action === 'get_flags') {
    $catalog = wp_features_load();
    $flags = [];
    foreach ($catalog as $id => $item) {
        $flags[$id] = $item['status'] ?? 'published';
    }
    wp_features_json([
        'ok' => true,
        'flags' => $flags,
        'catalog' => $catalog,
    ]);
}

// =========================================================================
// ACTION: update_flag (Admin only)
// =========================================================================
if ($action === 'update_flag') {
    $rawInput = file_get_contents('php://input');
    $payload = @json_decode($rawInput, true) ?: $_POST;

    $featureId = trim((string)($payload['feature_id'] ?? $payload['id'] ?? ''));
    $newStatus = trim((string)($payload['status'] ?? 'published'));

    if (!in_array($newStatus, ['off', 'beta', 'published'], true)) {
        wp_features_json(['ok' => false, 'error' => 'Invalid status (must be off, beta, or published)'], 400);
    }

    $catalog = wp_features_load();
    if (!isset($catalog[$featureId])) {
        wp_features_json(['ok' => false, 'error' => 'Feature not found in catalog'], 404);
    }

    $catalog[$featureId]['status'] = $newStatus;
    $catalog[$featureId]['updated_at'] = time();

    wp_features_save($catalog);

    wp_features_json([
        'ok' => true,
        'feature_id' => $featureId,
        'status' => $newStatus,
    ]);
}

// =========================================================================
// ACTION: publish_all (Publish all features to production)
// =========================================================================
if ($action === 'publish_all') {
    $catalog = wp_features_load();
    foreach ($catalog as $id => &$item) {
        $item['status'] = 'published';
        $item['updated_at'] = time();
    }
    wp_features_save($catalog);
    wp_features_json(['ok' => true, 'message' => 'Բոլոր նոր ֆունկցիաները հաջողությամբ հրապարակվեցին:']);
}

// =========================================================================
// ACTION: reset_defaults
// =========================================================================
if ($action === 'reset_defaults') {
    $catalog = wp_features_default_catalog();
    wp_features_save($catalog);
    wp_features_json(['ok' => true, 'catalog' => $catalog]);
}

wp_features_json(['ok' => false, 'error' => 'Invalid action'], 400);
