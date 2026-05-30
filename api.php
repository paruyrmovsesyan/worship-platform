<?php
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/translation_runtime.php';

error_reporting(E_ALL);
ini_set('display_errors', '0');
header("Content-Type: application/json; charset=UTF-8");

register_shutdown_function(function () {
    $error = error_get_last();
    if (!$error) {
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array((int)($error['type'] ?? 0), $fatalTypes, true)) {
        return;
    }

    if (!headers_sent()) {
        http_response_code(500);
        header("Content-Type: application/json; charset=UTF-8");
    }

    echo json_encode([
        "success" => false,
        "error" => "API fatal error",
        "details" => [
            "message" => (string)($error['message'] ?? 'Unknown fatal error'),
            "file" => basename((string)($error['file'] ?? '')),
            "line" => (int)($error['line'] ?? 0),
        ],
    ], JSON_UNESCAPED_UNICODE);
});

try {
    $conn = wp_runtime_open_mysqli();
    wp_runtime_ensure_song_title_columns_mysqli($conn);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]);
    exit;
}

function wp_api_song_title_columns_present(mysqli $conn): bool {
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    $required = ['title_hy', 'title_lat', 'title_en', 'title_ru'];
    $present = [];
    $res = $conn->query("SHOW COLUMNS FROM songs");
    if ($res instanceof mysqli_result) {
        while ($row = $res->fetch_assoc()) {
            $name = (string)($row['Field'] ?? '');
            if ($name !== '') {
                $present[$name] = true;
            }
        }
        $res->free();
    }

    foreach ($required as $column) {
        if (empty($present[$column])) {
            $cached = false;
            return false;
        }
    }

    $cached = true;
    return true;
}

function wp_api_song_bpm_column_present(mysqli $conn): bool {
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    $res = $conn->query("SHOW COLUMNS FROM songs LIKE 'bpm'");
    $cached = $res instanceof mysqli_result && $res->num_rows > 0;
    if ($res instanceof mysqli_result) {
        $res->free();
    }
    return $cached;
}

function wp_api_json_error(string $message, int $status = 500): void {
    http_response_code($status);
    echo json_encode(["success" => false, "error" => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$hasSeparateTitleColumns = wp_api_song_title_columns_present($conn);
$hasBpmColumn = wp_api_song_bpm_column_present($conn);

$method = $_SERVER['REQUEST_METHOD'];
$lang = wp_translation_requested_lang();

// ---------- SEARCH (lyrics) ----------
if ($method === "GET" && isset($_GET['action']) && $_GET['action'] === 'search') {
    $mode = $_GET['mode'] ?? 'lyrics';
    $q = trim($_GET['q'] ?? '');

    if ($q === '') {
        echo json_encode([]); 
        exit;
    }

    // lyrics search only
    if ($mode === 'lyrics') {
        $like = '%' . $q . '%';
        if ($hasSeparateTitleColumns) {
            $stmt = $conn->prepare("
                SELECT id, title, title_hy, title_lat, title_en, title_ru, artist, song_key, tags, created_at, lyrics
                FROM songs
                WHERE lyrics LIKE ?
                   OR title LIKE ?
                   OR title_hy LIKE ?
                   OR title_lat LIKE ?
                   OR title_en LIKE ?
                   OR title_ru LIKE ?
                   OR artist LIKE ?
                   OR tags LIKE ?
                ORDER BY created_at DESC
                LIMIT 200
            ");
            $stmt->bind_param("ssssssss", $like, $like, $like, $like, $like, $like, $like, $like);
        } else {
            $stmt = $conn->prepare("
                SELECT id, title, artist, song_key, tags, created_at, lyrics
                FROM songs
                WHERE lyrics LIKE ?
                   OR title LIKE ?
                   OR artist LIKE ?
                   OR tags LIKE ?
                ORDER BY created_at DESC
                LIMIT 200
            ");
            $stmt->bind_param("ssss", $like, $like, $like, $like);
        }
        $stmt->execute();
        $res = $stmt->get_result();

        $songs = [];
        while ($row = $res->fetch_assoc()) $songs[] = $row;
        $songs = wp_translation_translate_rows($songs, [
            'title' => 'api.song.title',
            'artist' => 'api.song.artist',
            'tags' => 'api.song.tags',
        ], $lang);
        $songs = wp_translation_localize_row_fields($songs, [
            'title' => 'api.song.title',
        ], $lang);
        echo json_encode($songs, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // default fallback (եթե սխալ mode փոխանցեն)
    echo json_encode([]);
    exit;
}

// ---------- READ ----------
if ($method === "GET") {
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $res = $conn->query("SELECT * FROM songs WHERE id=$id");
        $song = $res ? $res->fetch_assoc() : null;
        if (is_array($song)) {
            $sourceTitle = trim((string)($song['title'] ?? ''));
            $song['title_variants'] = [
                'hy' => trim((string)($song['title_hy'] ?? '')) ?: $sourceTitle,
                'lat' => trim((string)($song['title_lat'] ?? '')),
                'ru' => trim((string)($song['title_ru'] ?? '')) ?: ($sourceTitle !== '' ? (wp_translation_cache_get('ru', 'api.song.title', $sourceTitle) ?? '') : ''),
                'en' => trim((string)($song['title_en'] ?? '')) ?: ($sourceTitle !== '' ? (wp_translation_cache_get('en', 'api.song.title', $sourceTitle) ?? '') : ''),
            ];
            $song = wp_translation_translate_row($song, [
                'title' => 'api.song.title',
                'artist' => 'api.song.artist',
                'chords' => 'api.song.chords',
                'lyrics' => 'api.song.lyrics',
                'tags' => 'api.song.tags',
            ], $lang);
            $song = wp_translation_localize_row_fields([$song], [
                'title' => 'api.song.title',
            ], $lang)[0] ?? $song;
        }
        echo json_encode($song, JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $res = $conn->query("SELECT * FROM songs ORDER BY created_at DESC");
        $songs = [];
        while ($row = $res->fetch_assoc()) $songs[] = $row;
        $songs = wp_translation_translate_rows($songs, [
            'title' => 'api.song.title',
            'artist' => 'api.song.artist',
            'tags' => 'api.song.tags',
        ], $lang);
        $songs = wp_translation_localize_row_fields($songs, [
            'title' => 'api.song.title',
        ], $lang);
        echo json_encode($songs);
        exit;
    }
}

// ---------- CREATE ----------
if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        wp_api_json_error('Սխալ տվյալներ են ուղարկվել', 400);
    }
    $title = trim((string)($data['title'] ?? ''));
    $titleHy = trim((string)($data['title_hy'] ?? ''));
    $titleLat = trim((string)($data['title_lat'] ?? ''));
    $titleEn = trim((string)($data['title_en'] ?? ''));
    $titleRu = trim((string)($data['title_ru'] ?? ''));
    $artist = trim((string)($data['artist'] ?? ''));
    $songKey = trim((string)($data['key'] ?? ($data['song_key'] ?? '')));
    $bpm = max(0, (int)($data['bpm'] ?? 0));
    $tags = trim((string)($data['tags'] ?? ''));
    $chords = (string)($data['chords'] ?? '');
    $lyrics = (string)($data['lyrics'] ?? '');

    if ($hasSeparateTitleColumns && $hasBpmColumn) {
        $stmt = $conn->prepare("INSERT INTO songs (title, title_hy, title_lat, title_en, title_ru, artist, song_key, bpm, tags, chords, lyrics) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        if (!$stmt) {
            wp_api_json_error('Չհաջողվեց պատրաստել նոր երգի պահպանումը: ' . $conn->error);
        }
        $stmt->bind_param("sssssssisss", $title, $titleHy, $titleLat, $titleEn, $titleRu, $artist, $songKey, $bpm, $tags, $chords, $lyrics);
    } elseif ($hasSeparateTitleColumns) {
        $stmt = $conn->prepare("INSERT INTO songs (title, title_hy, title_lat, title_en, title_ru, artist, song_key, tags, chords, lyrics) VALUES (?,?,?,?,?,?,?,?,?,?)");
        if (!$stmt) {
            wp_api_json_error('Չհաջողվեց պատրաստել նոր երգի պահպանումը: ' . $conn->error);
        }
        $stmt->bind_param("ssssssssss", $title, $titleHy, $titleLat, $titleEn, $titleRu, $artist, $songKey, $tags, $chords, $lyrics);
    } else {
        $stmt = $conn->prepare($hasBpmColumn
            ? "INSERT INTO songs (title, artist, song_key, bpm, tags, chords, lyrics) VALUES (?,?,?,?,?,?,?)"
            : "INSERT INTO songs (title, artist, song_key, tags, chords, lyrics) VALUES (?,?,?,?,?,?)"
        );
        if (!$stmt) {
            wp_api_json_error('Չհաջողվեց պատրաստել երգի պահպանումը: ' . $conn->error);
        }
        if ($hasBpmColumn) {
            $stmt->bind_param("sssisss", $title, $artist, $songKey, $bpm, $tags, $chords, $lyrics);
        } else {
            $stmt->bind_param("ssssss", $title, $artist, $songKey, $tags, $chords, $lyrics);
        }
    }

    if (!$stmt->execute()) {
        wp_api_json_error('Չհաջողվեց պահպանել երգը: ' . $stmt->error);
    }
    echo json_encode(["success" => true, "id" => $conn->insert_id]);
    exit;
}

// --- PUT (update existing) ---
if ($method === "PUT") {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = intval($params['id'] ?? 0);
    $data = json_decode(file_get_contents("php://input"), true);

    if ($id > 0 && is_array($data)) {
        $title = trim((string)($data['title'] ?? ''));
        $titleHy = trim((string)($data['title_hy'] ?? ''));
        $titleLat = trim((string)($data['title_lat'] ?? ''));
        $titleEn = trim((string)($data['title_en'] ?? ''));
        $titleRu = trim((string)($data['title_ru'] ?? ''));
        $artist = trim((string)($data['artist'] ?? ''));
        $songKey = trim((string)($data['key'] ?? ($data['song_key'] ?? '')));
        $bpm = max(0, (int)($data['bpm'] ?? 0));
        $tags = trim((string)($data['tags'] ?? ''));
        $chords = (string)($data['chords'] ?? '');
        $lyrics = (string)($data['lyrics'] ?? '');

        if ($hasSeparateTitleColumns && $hasBpmColumn) {
            $stmt = $conn->prepare("UPDATE songs SET title=?, title_hy=?, title_lat=?, title_en=?, title_ru=?, artist=?, song_key=?, bpm=?, tags=?, chords=?, lyrics=? WHERE id=?");
            if (!$stmt) {
                wp_api_json_error('Չհաջողվեց պատրաստել երգի թարմացումը: ' . $conn->error);
            }
            $stmt->bind_param("sssssssisssi", $title, $titleHy, $titleLat, $titleEn, $titleRu, $artist, $songKey, $bpm, $tags, $chords, $lyrics, $id);
        } elseif ($hasSeparateTitleColumns) {
            $stmt = $conn->prepare("UPDATE songs SET title=?, title_hy=?, title_lat=?, title_en=?, title_ru=?, artist=?, song_key=?, tags=?, chords=?, lyrics=? WHERE id=?");
            if (!$stmt) {
                wp_api_json_error('Չհաջողվեց պատրաստել երգի թարմացումը: ' . $conn->error);
            }
            $stmt->bind_param("ssssssssssi", $title, $titleHy, $titleLat, $titleEn, $titleRu, $artist, $songKey, $tags, $chords, $lyrics, $id);
        } else {
            $stmt = $conn->prepare($hasBpmColumn
                ? "UPDATE songs SET title=?, artist=?, song_key=?, bpm=?, tags=?, chords=?, lyrics=? WHERE id=?"
                : "UPDATE songs SET title=?, artist=?, song_key=?, tags=?, chords=?, lyrics=? WHERE id=?"
            );
            if (!$stmt) {
                wp_api_json_error('Չհաջողվեց պատրաստել երգի թարմացումը: ' . $conn->error);
            }
            if ($hasBpmColumn) {
                $stmt->bind_param("sssisssi", $title, $artist, $songKey, $bpm, $tags, $chords, $lyrics, $id);
            } else {
                $stmt->bind_param("ssssssi", $title, $artist, $songKey, $tags, $chords, $lyrics, $id);
            }
        }

        $ok = $stmt->execute();
        if (!$ok) {
            wp_api_json_error('Չհաջողվեց թարմացնել երգը: ' . $stmt->error);
        }
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => "Missing ID or data"]);
    }
    exit;
}


// ---------- DELETE ----------
if ($method === "DELETE") {
    parse_str($_SERVER['QUERY_STRING'], $params);
    $id = intval($params['id'] ?? 0);
    $conn->query("DELETE FROM songs WHERE id=$id");
    echo json_encode(["success" => true]);
    exit;
}
