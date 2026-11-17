<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/auth_bootstrap.php';
require_once __DIR__ . '/runtime_config.php';

function wp_bible_out(array $payload, int $code = 200): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function wp_bible_translations_catalog(): array {
    return [
        [
            'id' => 'easternarmenian',
            'name' => 'Արևելահայերեն',
            'short' => 'ՀԱՅ',
            'lang' => 'am',
            'scope' => 'partial',
            'available_books' => [1, 2, 40, 41, 42, 43],
            'note' => 'Ծննդոց, Ելից և 4 Ավետարանները (մյուս գրքերի համար ընտրեք Նոր Կտակարան կամ Synodal/KJV)',
        ],
        [
            'id' => 'westernarmenian',
            'name' => 'Արևմտահայերեն (ՆԿ)',
            'short' => 'ԱՐՄ',
            'lang' => 'am',
            'scope' => 'nt',
            'available_books' => range(40, 66),
            'note' => 'Նոր Կտակարան (ամբողջական)',
        ],
        [
            'id' => 'synodal',
            'name' => 'Синодальный перевод',
            'short' => 'RST',
            'lang' => 'ru',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Полная Библия (66 книг)',
        ],
        [
            'id' => 'akjv',
            'name' => 'American KJV',
            'short' => 'AKJV',
            'lang' => 'en',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Full Bible (66 books)',
        ],
        [
            'id' => 'kjv',
            'name' => 'King James Version',
            'short' => 'KJV',
            'lang' => 'en',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Full Bible (66 books)',
        ],
    ];
}

function wp_bible_valid_translation(string $tr): string {
    $allowed = ['easternarmenian', 'westernarmenian', 'synodal', 'akjv', 'kjv'];
    return in_array($tr, $allowed, true) ? $tr : 'synodal';
}

function wp_bible_fetch_remote(string $url): ?array {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_USERAGENT => 'WorshipPlatform/5.4',
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($status >= 200 && $status < 300 && is_string($body) && $body !== '') {
            $decoded = json_decode($body, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'header' => "User-Agent: WorshipPlatform/5.4\r\n",
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return null;
}

function wp_bible_load_chapter(string $tr, int $book, int $chapter): array {
    $tr = wp_bible_valid_translation($tr);
    if ($book < 1 || $book > 66 || $chapter < 1 || $chapter > 150) {
        return ['ok' => false, 'error' => 'Invalid book or chapter'];
    }

    foreach (wp_bible_translations_catalog() as $item) {
        if ($item['id'] === $tr && !in_array($book, $item['available_books'], true)) {
            return [
                'ok' => false,
                'unavailable_in_translation' => true,
                'translation' => $tr,
                'book' => $book,
                'chapter' => $chapter,
                'error' => 'This book is not included in the selected translation',
            ];
        }
    }

    $cacheDir = __DIR__ . '/data/bible_cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }
    $cacheFile = "{$cacheDir}/{$tr}_{$book}_{$chapter}.json";

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['verses'])) {
            return $cached;
        }
    }

    $url = "https://api.getbible.net/v2/{$tr}/{$book}/{$chapter}.json";
    $remote = wp_bible_fetch_remote($url);
    if (!$remote || empty($remote['verses']) || !is_array($remote['verses'])) {
        return ['ok' => false, 'error' => 'Unable to load chapter right now'];
    }

    $verses = [];
    foreach ($remote['verses'] as $v) {
        $verses[] = [
            'verse' => (int)($v['verse'] ?? 0),
            'text' => trim((string)($v['text'] ?? '')),
        ];
    }

    $payload = [
        'ok' => true,
        'translation' => $tr,
        'translation_name' => (string)($remote['translation'] ?? $tr),
        'book' => $book,
        'book_name' => (string)($remote['book_name'] ?? ''),
        'chapter' => $chapter,
        'verses' => $verses,
    ];

    @file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    return $payload;
}

function wp_bible_open_state_pdo(): ?PDO {
    try {
        $pdo = wp_runtime_open_pdo();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS bible_user_state (
                user_id INT UNSIGNED NOT NULL PRIMARY KEY,
                state_json LONGTEXT NOT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        return $pdo;
    } catch (Throwable $e) {
        return null;
    }
}

function wp_bible_default_state(): array {
    return [
        'highlights' => [],
        'notes' => [],
        'bookmarks' => [],
        'plan_days' => [],
        'last_read' => null,
    ];
}

function wp_bible_load_user_state(int $uid): array {
    if ($uid <= 0) {
        return wp_bible_default_state();
    }

    $pdo = wp_bible_open_state_pdo();
    if ($pdo) {
        try {
            $st = $pdo->prepare('SELECT state_json FROM bible_user_state WHERE user_id = ? LIMIT 1');
            $st->execute([$uid]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row && !empty($row['state_json'])) {
                $decoded = json_decode((string)$row['state_json'], true);
                if (is_array($decoded)) {
                    return array_merge(wp_bible_default_state(), $decoded);
                }
            }
            return wp_bible_default_state();
        } catch (Throwable $e) {
            // Fall through to JSON store
        }
    }

    $file = __DIR__ . '/data/bible_user_state.json';
    if (is_file($file)) {
        $all = json_decode((string)@file_get_contents($file), true);
        if (is_array($all) && isset($all[(string)$uid]) && is_array($all[(string)$uid])) {
            return array_merge(wp_bible_default_state(), $all[(string)$uid]);
        }
    }
    return wp_bible_default_state();
}

function wp_bible_save_user_state(int $uid, array $state): bool {
    if ($uid <= 0) {
        return false;
    }
    $clean = array_merge(wp_bible_default_state(), $state);
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $pdo = wp_bible_open_state_pdo();
    if ($pdo) {
        try {
            $st = $pdo->prepare('
                INSERT INTO bible_user_state (user_id, state_json, updated_at)
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()
            ');
            $st->execute([$uid, $json]);
            return true;
        } catch (Throwable $e) {
            // Fall back to file
        }
    }

    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $file = $dir . '/bible_user_state.json';
    $all = is_file($file) ? (json_decode((string)@file_get_contents($file), true) ?: []) : [];
    $all[(string)$uid] = $clean;
    return (bool)@file_put_contents($file, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? 'chapter'));
$uid = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

if ($action === 'translations') {
    wp_bible_out(['ok' => true, 'translations' => wp_bible_translations_catalog()]);
}

if ($action === 'chapter') {
    $tr = wp_bible_valid_translation((string)($_GET['tr'] ?? 'synodal'));
    $book = (int)($_GET['book'] ?? 43);
    $chapter = (int)($_GET['chapter'] ?? 1);
    $result = wp_bible_load_chapter($tr, $book, $chapter);
    wp_bible_out($result, !empty($result['ok']) ? 200 : (!empty($result['unavailable_in_translation']) ? 200 : 404));
}

if ($action === 'search') {
    $q = trim((string)($_GET['q'] ?? ''));
    $tr = wp_bible_valid_translation((string)($_GET['tr'] ?? 'synodal'));
    if (mb_strlen($q) < 2) {
        wp_bible_out(['ok' => true, 'results' => []]);
    }

    $cacheDir = __DIR__ . '/data/bible_cache';
    $results = [];
    if (is_dir($cacheDir)) {
        $files = glob("{$cacheDir}/{$tr}_*.json") ?: [];
        foreach ($files as $file) {
            $data = json_decode((string)@file_get_contents($file), true);
            if (!is_array($data) || empty($data['verses'])) continue;
            foreach ($data['verses'] as $v) {
                $text = (string)($v['text'] ?? '');
                if (mb_stripos($text, $q) !== false) {
                    $results[] = [
                        'translation' => $tr,
                        'book' => (int)$data['book'],
                        'book_name' => (string)$data['book_name'],
                        'chapter' => (int)$data['chapter'],
                        'verse' => (int)$v['verse'],
                        'text' => $text,
                    ];
                    if (count($results) >= 40) {
                        wp_bible_out(['ok' => true, 'results' => $results]);
                    }
                }
            }
        }
    }
    wp_bible_out(['ok' => true, 'results' => $results]);
}

if ($action === 'user_state') {
    if ($uid <= 0) {
        wp_bible_out(['ok' => true, 'guest' => true, 'state' => wp_bible_default_state()]);
    }
    wp_bible_out(['ok' => true, 'guest' => false, 'state' => wp_bible_load_user_state($uid)]);
}

if ($action === 'save_user_state') {
    if ($uid <= 0) {
        wp_bible_out(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    $raw = file_get_contents('php://input');
    $payload = json_decode((string)$raw, true);
    if (!is_array($payload) || !is_array($payload['state'] ?? null)) {
        wp_bible_out(['ok' => false, 'error' => 'Invalid payload'], 400);
    }
    $saved = wp_bible_save_user_state($uid, $payload['state']);
    wp_bible_out(['ok' => $saved, 'state' => wp_bible_load_user_state($uid)]);
}

wp_bible_out(['ok' => false, 'error' => 'Unknown action'], 400);
