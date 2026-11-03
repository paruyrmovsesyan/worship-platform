<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

const FEATURE_FLAGS_FILE = __DIR__ . '/data/feature_flags.json';

function wp_features_json(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_features_default_catalog(): array {
    return [
        // ── 0. 🎛️ Worship Pro Studio Suite (Գլխավոր Հավաքական) ──
        'pro_studio' => [
            'id' => 'pro_studio',
            'title' => 'Worship Pro Studio (Գլխավոր Հավաքական)',
            'description' => 'Բեմական սինքրոնացում, 8-ալիքային ստեմս միքշեր, պրոյեկցիա, AI և մետրոնոմ միավորող գլխավոր էկոհամակարգ:',
            'status' => 'beta',
            'category' => 'pro_studio',
            'is_suite' => true,
            'test_url' => '/studio',
        ],
        'live_stage_follower' => [
            'id' => 'live_stage_follower',
            'title' => 'Band Live Follower (Leader Remote Sync)',
            'description' => 'Երաժիշտների և վոկալիստների էկրանների ավտոմատ հետևում Worship Leader-ին:',
            'status' => 'beta',
            'category' => 'pro_studio',
            'suite' => 'pro_studio',
            'test_url' => '/setlists/1/live',
        ],
        'rehearsal_stems' => [
            'id' => 'rehearsal_stems',
            'title' => 'RehearsalMix & Stems Mixer',
            'description' => '8-ալիքանի բազմաթրեկ միքշեր, Solo/Mute և A-B հատվածի կրկնող Looper:',
            'status' => 'beta',
            'category' => 'pro_studio',
            'suite' => 'pro_studio',
            'test_url' => '/song/1',
        ],
        'lyrics_projection' => [
            'id' => 'lyrics_projection',
            'title' => 'Live Lyrics Projection & Confidence Monitor',
            'description' => 'Դահլիճի պրոյեկտորի, OBS եթերի Lower-Thirds և Confidence Monitor ռեժիմներ:',
            'status' => 'beta',
            'category' => 'pro_studio',
            'suite' => 'pro_studio',
            'test_url' => '/projection/1',
        ],
        'worship_ai_studio' => [
            'id' => 'worship_ai_studio',
            'title' => 'Worship AI Studio',
            'description' => 'Ակորդների գեներացում, պոետիկ հայերեն թարգմանություն և ակորդների հարստացում:',
            'status' => 'published',
            'category' => 'pro_studio',
            'suite' => 'pro_studio',
            'test_url' => '/song/1',
        ],
        'service_planner' => [
            'id' => 'service_planner',
            'title' => 'Ministry Service Planner & Team Rostering',
            'description' => 'Կիրակնօրյա ծառայության րոպեական Run-of-Show պլանավորում և թիմի գրաֆիկ:',
            'status' => 'published',
            'category' => 'pro_studio',
            'suite' => 'pro_studio',
            'test_url' => '/service-planner',
        ],
        'smart_metronome' => [
            'id' => 'smart_metronome',
            'title' => 'Smart Metronome & Visual Click',
            'description' => 'Web Audio API-ով ճշգրիտ մետրոնոմ, տեսողական լույսեր, Tap Tempo և Screen Pulse:',
            'status' => 'published',
            'category' => 'pro_studio',
            'suite' => 'pro_studio',
            'test_url' => '/song/1',
        ],

        // ── 1. Բեմ և Ելույթ (Stage & Performance) ──
        'stage_two_column' => [
            'id' => 'stage_two_column',
            'title' => '2-Column Chord Chart Stage Layout',
            'description' => 'Լայն էկրանների և պլանշետների համար 2 սյունակով ակորդների դասավորություն:',
            'status' => 'published',
            'category' => 'stage',
            'test_url' => '/song/1',
        ],
        'stage_hands_free_pedal' => [
            'id' => 'stage_hands_free_pedal',
            'title' => 'Bluetooth Pedal & Hands-Free Page Turner',
            'description' => 'AirTurn, PageFlip և Coda ոտնակներով կամ ավտո-սքրոլով երգի թերթում բեմական ելույթների ժամանակ։',
            'status' => 'beta',
            'category' => 'stage',
            'test_url' => '/song/1',
        ],
        'audio_pitch_pipe' => [
            'id' => 'audio_pitch_pipe',
            'title' => 'Vocal Pitch Pipe & Reference Drone',
            'description' => 'Վոկալիստների տոնայնության տվիչ, մեկնարկային նոտայի ազդանշան և 440Hz A կամերտոն։',
            'status' => 'beta',
            'category' => 'stage',
            'test_url' => '/song/1',
        ],

        // ── 2. Աուդիո և Բազմաթրեկ (Audio & Multitracks) ──
        'chord_chart_transpose_capo' => [
            'id' => 'chord_chart_transpose_capo',
            'title' => 'Smart Capo & Roman Numeral Chords',
            'description' => 'Կապոդաստրի դիրքի ավտո-հաշվիչ (Capo 1-7) և Nashville / Հռոմեական թվային ակորդներ։',
            'status' => 'published',
            'category' => 'audio',
            'test_url' => '/song/1',
        ],
        'multitrack_pads' => [
            'id' => 'multitrack_pads',
            'title' => 'Ambient Worship Pads & Key Transitions',
            'description' => '12 տոնայնություններում անընդհատ հնչող մթնոլորտային pad-եր՝ երգերի միջև հարթ անցումների համար։',
            'status' => 'beta',
            'category' => 'audio',
            'test_url' => '/song/1',
        ],

        // ── 3. Պրոյեկցիա և Եթեր (Projection & Stream) ──
        'obs_ndi_lower_thirds' => [
            'id' => 'obs_ndi_lower_thirds',
            'title' => 'OBS / vMix NDI Lower Thirds Stream',
            'description' => 'YouTube և Facebook ուղիղ եթերների համար թափանցիկ ալֆա-տիտրեր և NDI / Browser Source ինտեգրում։',
            'status' => 'beta',
            'category' => 'projection',
            'test_url' => '/projection/1',
        ],
        'ccli_songselect_import' => [
            'id' => 'ccli_songselect_import',
            'title' => 'CCLI SongSelect & Church Software Importer',
            'description' => 'Եկեղեցական ծրագրերից (OpenLP, ProPresenter, ChordPro) երգերի ավտոմատ իմպորտ և ինտեգրում։',
            'status' => 'beta',
            'category' => 'projection',
            'test_url' => '/songs.php',
        ],

        // ── 4. Արհեստական Բանականություն (AI & Automation) ──
        'ai_vocal_remover' => [
            'id' => 'ai_vocal_remover',
            'title' => 'AI Vocal Separation & Minus Generator',
            'description' => 'Երգի աուդիոյից վոկալի անջատում և մաքուր գործիքային մինուսների գեներացում AI մոդելով։',
            'status' => 'beta',
            'category' => 'ai',
            'test_url' => '/song/1',
        ],
        'ai_setlist_flow' => [
            'id' => 'ai_setlist_flow',
            'title' => 'AI Setlist Flow & Energy Curve Suggester',
            'description' => 'Երգերի տեմպի (BPM), տոնայնությունների և երկրպագության էներգիայի հոսքի AI խորհրդատու։',
            'status' => 'beta',
            'category' => 'ai',
            'test_url' => '/setlists',
        ],

        // ── 5. Ծառայություն և Թիմ (Ministry & Team Planning) ──
        'team_availability_calendar' => [
            'id' => 'team_availability_calendar',
            'title' => 'Team Availability & Automated Rostering',
            'description' => 'Երաժիշտների և վոկալիստների զբաղվածության օրացույց, բացակայությունների հաշվառում և ծանուցումներ։',
            'status' => 'beta',
            'category' => 'ministry',
            'test_url' => '/service-planner',
        ],
        'musician_chat_voice' => [
            'id' => 'musician_chat_voice',
            'title' => 'Stage Intercom & Team Voice Chat',
            'description' => 'Բեմի երաժիշտների, հնչյունային օպերատորի և ղեկավարի միջև ներքին ձայնային ու տեքստային կապ։',
            'status' => 'beta',
            'category' => 'ministry',
            'test_url' => '/setlists/1/live',
        ],

        // ── 6. Ցանց և Օֆլայն Համակարգ (Network & Offline) ──
        'offline_p2p_mesh' => [
            'id' => 'offline_p2p_mesh',
            'title' => 'Offline P2P Mesh & Local Discovery',
            'description' => 'Բեմական կապ և սինքրոնացում տեղային Wi-Fi-ով նույնիսկ այն դեպքում, երբ ինտերնետ կապը բացակայում է:',
            'status' => 'beta',
            'category' => 'network',
            'test_url' => '/setlists',
        ],
        'bluetooth_proximity_sync' => [
            'id' => 'bluetooth_proximity_sync',
            'title' => 'Bluetooth BLE Proximity Sync',
            'description' => 'Bluetooth Low Energy միջոցով մոտակա սարքերի հետ երգացանկերի ակնթարթային կիսում առանց որևէ ցանցի։',
            'status' => 'off',
            'category' => 'network',
            'test_url' => '/setlists',
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

$isDirectApiCall = (
    basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'features_api.php'
    || basename($_SERVER['PHP_SELF'] ?? '') === 'features_api.php'
    || strpos((string)($_SERVER['REQUEST_URI'] ?? ''), 'features_api.php') !== false
);

if ($isDirectApiCall) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
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
    // ACTION: update_suite (Toggle Pro Studio Suite + optional child cascade)
    // =========================================================================
    if ($action === 'update_suite') {
        $rawInput = file_get_contents('php://input');
        $payload = @json_decode($rawInput, true) ?: $_POST;
        $suiteId = trim((string)($payload['suite_id'] ?? 'pro_studio'));
        $newStatus = trim((string)($payload['status'] ?? 'published'));
        $cascade = !empty($payload['cascade']);

        if (!in_array($newStatus, ['off', 'beta', 'published'], true)) {
            wp_features_json(['ok' => false, 'error' => 'Invalid status'], 400);
        }

        $catalog = wp_features_load();
        if (isset($catalog[$suiteId])) {
            $catalog[$suiteId]['status'] = $newStatus;
            $catalog[$suiteId]['updated_at'] = time();
        }

        if ($cascade) {
            foreach ($catalog as $id => &$item) {
                if (($item['suite'] ?? '') === $suiteId) {
                    $item['status'] = $newStatus;
                    $item['updated_at'] = time();
                }
            }
        }

        wp_features_save($catalog);
        wp_features_json([
            'ok' => true,
            'suite_id' => $suiteId,
            'status' => $newStatus,
            'cascade' => $cascade,
        ]);
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
}
