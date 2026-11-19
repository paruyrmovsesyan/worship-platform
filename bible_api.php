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
            'id' => 'nor_ararat',
            'name' => 'Նոր Արարատ (ՆԱԹ)',
            'short' => 'ՆԱԹ',
            'lang' => 'am',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Ամբողջ Աստվածաշունչ (66 գիրք) — Նոր Արարատ թարգմանություն',
        ],
        [
            'id' => 'easternarmenian',
            'name' => 'Արևելահայերեն (մասն.)',
            'short' => 'ՀԱՅ',
            'lang' => 'am',
            'scope' => 'partial',
            'available_books' => [1, 2, 40, 41, 42, 43],
            'note' => 'Ծննդոց, Ելից և 4 Ավետարանները',
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
            'name' => 'Синодальный',
            'short' => 'RST',
            'lang' => 'ru',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Полная Библия (66 книг)',
        ],
        [
            'id' => 'nrt',
            'name' => 'Новый русский',
            'short' => 'НРП',
            'lang' => 'ru',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Современный русский перевод (66 книг)',
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
            'id' => 'esv',
            'name' => 'English Standard (ESV)',
            'short' => 'ESV',
            'lang' => 'en',
            'scope' => 'full',
            'available_books' => range(1, 66),
            'note' => 'Modern English (66 books)',
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
    $allowed = ['nor_ararat', 'easternarmenian', 'westernarmenian', 'synodal', 'nrt', 'akjv', 'esv', 'kjv'];
    return in_array($tr, $allowed, true) ? $tr : 'nor_ararat';
}

function wp_bible_bolls_code(string $tr): ?string {
    return match ($tr) {
        'nrt' => 'NRT',
        'esv' => 'ESV',
        'synodal' => 'SYNOD',
        'kjv', 'akjv' => 'KJV',
        default => null,
    };
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
        if (PHP_VERSION_ID < 80000) {
            curl_close($ch);
        }
        unset($ch);
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

    if ($tr === 'nor_ararat') {
        $natFile = __DIR__ . "/data/bible_nat/{$book}.json";
        if (is_file($natFile)) {
            $bookChapters = json_decode((string)@file_get_contents($natFile), true);
            $chKey = (string)$chapter;
            if (is_array($bookChapters) && !empty($bookChapters[$chKey]) && is_array($bookChapters[$chKey])) {
                $verses = array_map(static fn(array $row): array => [
                    'verse' => (int)($row['v'] ?? 0),
                    'text' => (string)($row['t'] ?? ''),
                ], $bookChapters[$chKey]);
                return [
                    'ok' => true,
                    'translation' => 'nor_ararat',
                    'translation_name' => 'Նոր Արարատ (ՆԱԹ)',
                    'book' => $book,
                    'book_name' => '',
                    'chapter' => $chapter,
                    'verses' => $verses,
                ];
            }
        }
        return ['ok' => false, 'error' => 'Unable to load chapter right now'];
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

    $verses = [];
    if (in_array($tr, ['nrt', 'esv'], true)) {
        $bollsSlug = strtoupper($tr);
        $remote = wp_bible_fetch_remote("https://bolls.life/get-text/{$bollsSlug}/{$book}/{$chapter}/");
        if (!$remote || !is_array($remote) || empty($remote[0]['text'])) {
            return ['ok' => false, 'error' => 'Unable to load chapter right now'];
        }
        foreach ($remote as $v) {
            $cleanText = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string)($v['text'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            if ($cleanText !== '') {
                $verses[] = [
                    'verse' => (int)($v['verse'] ?? 0),
                    'text' => $cleanText,
                ];
            }
        }
        $trName = $tr === 'nrt' ? 'Новый русский' : 'ESV';
    } else {
        $url = "https://api.getbible.net/v2/{$tr}/{$book}/{$chapter}.json";
        $remote = wp_bible_fetch_remote($url);
        if (!$remote || empty($remote['verses']) || !is_array($remote['verses'])) {
            return ['ok' => false, 'error' => 'Unable to load chapter right now'];
        }
        foreach ($remote['verses'] as $v) {
            $verses[] = [
                'verse' => (int)($v['verse'] ?? 0),
                'text' => trim((string)($v['text'] ?? '')),
            ];
        }
        $trName = (string)($remote['translation'] ?? $tr);
    }

    if (empty($verses)) {
        return ['ok' => false, 'error' => 'Unable to load chapter right now'];
    }

    $payload = [
        'ok' => true,
        'translation' => $tr,
        'translation_name' => $trName,
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

    $results = [];
    $seen = [];

    if ($tr === 'nor_ararat') {
        for ($b = 1; $b <= 66; $b++) {
            $natFile = __DIR__ . "/data/bible_nat/{$b}.json";
            if (!is_file($natFile)) continue;
            $bookChapters = json_decode((string)@file_get_contents($natFile), true);
            if (!is_array($bookChapters)) continue;
            foreach ($bookChapters as $chKey => $vs) {
                if (!is_array($vs)) continue;
                foreach ($vs as $v) {
                    $txt = (string)($v['t'] ?? '');
                    if ($txt !== '' && mb_stripos($txt, $q) !== false) {
                        $results[] = [
                            'translation' => 'nor_ararat',
                            'book' => $b,
                            'book_name' => '',
                            'chapter' => (int)$chKey,
                            'verse' => (int)($v['v'] ?? 0),
                            'text' => $txt,
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

    $bollsCode = wp_bible_bolls_code($tr);
    if ($bollsCode !== null) {
        $remoteSearch = wp_bible_fetch_remote("https://bolls.life/v2/find/{$bollsCode}?search=" . rawurlencode($q));
        if ($remoteSearch && !empty($remoteSearch['results']) && is_array($remoteSearch['results'])) {
            foreach ($remoteSearch['results'] as $item) {
                $b = (int)($item['book'] ?? 0);
                $c = (int)($item['chapter'] ?? 0);
                $v = (int)($item['verse'] ?? 0);
                $withoutStrongs = preg_replace('/<S>.*?<\/S>/si', '', (string)($item['text'] ?? ''));
                $cleanText = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string)$withoutStrongs), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
                if ($b >= 1 && $b <= 66 && $c > 0 && $v > 0 && $cleanText !== '') {
                    $k = "{$b}_{$c}_{$v}";
                    $seen[$k] = true;
                    $results[] = [
                        'translation' => $tr,
                        'book' => $b,
                        'book_name' => '',
                        'chapter' => $c,
                        'verse' => $v,
                        'text' => $cleanText,
                    ];
                    if (count($results) >= 40) {
                        wp_bible_out(['ok' => true, 'results' => $results]);
                    }
                }
            }
        }
    }

    $cacheDir = __DIR__ . '/data/bible_cache';
    if (is_dir($cacheDir)) {
        $files = glob("{$cacheDir}/{$tr}_*.json") ?: [];
        foreach ($files as $file) {
            $data = json_decode((string)@file_get_contents($file), true);
            if (!is_array($data) || empty($data['verses'])) continue;
            foreach ($data['verses'] as $v) {
                $text = (string)($v['text'] ?? '');
                if (mb_stripos($text, $q) !== false) {
                    $b = (int)$data['book'];
                    $c = (int)$data['chapter'];
                    $vn = (int)$v['verse'];
                    $k = "{$b}_{$c}_{$vn}";
                    if (!empty($seen[$k])) continue;
                    $seen[$k] = true;
                    $results[] = [
                        'translation' => $tr,
                        'book' => $b,
                        'book_name' => (string)$data['book_name'],
                        'chapter' => $c,
                        'verse' => $vn,
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

function wp_bible_align_psalm(string $mainTr, string $targetTr, int $book, int $chapter): int {
    if ($book !== 19) return $chapter;
    $lxx = ['synodal', 'nrt'];
    $mainIsLxx = in_array($mainTr, $lxx, true);
    $targetIsLxx = in_array($targetTr, $lxx, true);
    if ($mainIsLxx === $targetIsLxx) return $chapter;
    if (!$mainIsLxx && $targetIsLxx) {
        if ($chapter === 10) return 9;
        if ($chapter >= 11 && $chapter <= 113) return $chapter - 1;
        if ($chapter === 114 || $chapter === 115) return 113;
        if ($chapter === 116) return 114;
        if ($chapter >= 117 && $chapter <= 146) return $chapter - 1;
        if ($chapter === 147) return 146;
        return $chapter;
    }
    if ($chapter >= 10 && $chapter <= 112) return $chapter + 1;
    if ($chapter === 113) return 114;
    if ($chapter === 114 || $chapter === 115) return 116;
    if ($chapter >= 116 && $chapter <= 145) return $chapter + 1;
    if ($chapter === 146 || $chapter === 147) return 147;
    return $chapter;
}

if ($action === 'compare') {
    $mainTr = wp_bible_valid_translation((string)($_GET['main_tr'] ?? 'akjv'));
    $book = (int)($_GET['book'] ?? 43);
    $chapter = (int)($_GET['chapter'] ?? 1);
    $verseNum = (int)($_GET['verse'] ?? 1);
    $items = [];
    foreach (wp_bible_translations_catalog() as $meta) {
        if (!in_array($book, $meta['available_books'], true)) continue;
        $targetCh = wp_bible_align_psalm($mainTr, $meta['id'], $book, $chapter);
        $loaded = wp_bible_load_chapter($meta['id'], $book, $targetCh);
        if (empty($loaded['ok']) || empty($loaded['verses'])) continue;
        foreach ($loaded['verses'] as $v) {
            if ((int)$v['verse'] === $verseNum) {
                $items[] = [
                    'id' => $meta['id'],
                    'short' => $meta['short'],
                    'name' => $meta['name'],
                    'text' => $v['text'],
                ];
                break;
            }
        }
    }
    wp_bible_out(['ok' => true, 'book' => $book, 'chapter' => $chapter, 'verse' => $verseNum, 'comparisons' => $items]);
}

function wp_bible_transliterate_hy_to_ru_phonetic(string $text): string {
    // Convert Armenian script to close Russian phonetic equivalents for clear audio TTS
    // when native Armenian voices are unavailable on the user's device.
    $text = str_replace(
        ['ու', 'Ու', 'ՈՒ', 'և', 'Եվ', 'ԵՎ', '«', '»', '։', '՝', '՜', '՞', '՛'],
        ['у',  'У',  'У',  'ев', 'Ев', 'Ев', '',  '',  '.', ',', '!', '?', ''],
        $text
    );
    // Word-initial ո -> во, ե -> е
    $text = preg_replace('/(^|[\s.,!?;:\(\)\-"])Ո/u', '$1Во', $text) ?? $text;
    $text = preg_replace('/(^|[\s.,!?;:\(\)\-"])ո/u', '$1во', $text) ?? $text;
    $text = preg_replace('/(^|[\s.,!?;:\(\)\-"])Ե/u', '$1Е', $text) ?? $text;
    $text = preg_replace('/(^|[\s.,!?;:\(\)\-"])ե/u', '$1е', $text) ?? $text;

    $map = [
        'Ա' => 'А', 'ա' => 'а',
        'Բ' => 'Б', 'բ' => 'б',
        'Գ' => 'Г', 'գ' => 'г',
        'Դ' => 'Д', 'դ' => 'д',
        'Ե' => 'Э', 'ե' => 'э',
        'Զ' => 'З', 'զ' => 'з',
        'Է' => 'Э', 'է' => 'э',
        'Ը' => 'Ы', 'ը' => 'ы',
        'Թ' => 'Т', 'թ' => 'т',
        'Ժ' => 'Ж', 'ժ' => 'ж',
        'Ի' => 'И', 'ի' => 'и',
        'Լ' => 'Л', 'լ' => 'л',
        'Խ' => 'Х', 'խ' => 'х',
        'Ծ' => 'Ц', 'ծ' => 'ц',
        'Կ' => 'К', 'կ' => 'к',
        'Հ' => 'Х', 'հ' => 'х',
        'Ձ' => 'Дз', 'ձ' => 'дз',
        'Ղ' => 'Г', 'ղ' => 'г',
        'Ճ' => 'Ч', 'ճ' => 'ч',
        'Մ' => 'М', 'մ' => 'м',
        'Յ' => 'Й', 'յ' => 'й',
        'Ն' => 'Н', 'ն' => 'н',
        'Շ' => 'Ш', 'շ' => 'ш',
        'Ո' => 'О', 'ո' => 'о',
        'Չ' => 'Ч', 'չ' => 'ч',
        'Պ' => 'П', 'պ' => 'п',
        'Ջ' => 'Дж', 'ջ' => 'дж',
        'Ռ' => 'Р', 'ռ' => 'р',
        'Ս' => 'С', 'ս' => 'с',
        'Վ' => 'В', 'վ' => 'в',
        'Տ' => 'Т', 'տ' => 'т',
        'Ր' => 'Р', 'ր' => 'р',
        'Ց' => 'Ц', 'ց' => 'ц',
        'Ւ' => 'В', 'ւ' => 'в',
        'Փ' => 'П', 'փ' => 'п',
        'Ք' => 'К', 'ք' => 'к',
        'Օ' => 'О', 'օ' => 'о',
        'Ֆ' => 'Ф', 'ֆ' => 'ф',
    ];
    return strtr($text, $map);
}

if ($action === 'tts') {
    $text = trim((string)($_GET['text'] ?? ''));
    $lang = strtolower(trim((string)($_GET['lang'] ?? 'am')));
    if ($text === '') {
        http_response_code(400);
        exit;
    }
    if (mb_strlen($text) > 220) {
        $text = mb_substr($text, 0, 220);
    }

    $ttsLang = match ($lang) {
        'ru', 'ru-ru' => 'ru',
        'en', 'en-us' => 'en',
        default => 'ru',
    };
    $ttsQuery = ($lang === 'am' || $lang === 'hy' || $lang === 'hy-am')
        ? wp_bible_transliterate_hy_to_ru_phonetic($text)
        : $text;

    $cacheDir = __DIR__ . '/data/bible_tts_cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }
    $hash = sha1($ttsLang . '|' . $ttsQuery);
    $cacheFile = $cacheDir . '/' . $hash . '.mp3';

    $mp3 = null;
    if (is_file($cacheFile) && filesize($cacheFile) > 256) {
        $mp3 = @file_get_contents($cacheFile);
    }
    if (!is_string($mp3) || strlen($mp3) < 256) {
        $url = 'https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl='
            . rawurlencode($ttsLang)
            . '&q=' . rawurlencode($ttsQuery);
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 8,
                CURLOPT_CONNECTTIMEOUT => 4,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]);
            $body = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if (is_string($body) && $code >= 200 && $code < 300 && strlen($body) > 256) {
                $mp3 = $body;
                @file_put_contents($cacheFile, $mp3, LOCK_EX);
            }
        }
    }

    if (!is_string($mp3) || strlen($mp3) < 256) {
        wp_bible_out(['ok' => false, 'error' => 'TTS audio unavailable'], 502);
    }

    header('Content-Type: audio/mpeg');
    header('Cache-Control: public, max-age=604800');
    header('Content-Length: ' . strlen($mp3));
    echo $mp3;
    exit;
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
