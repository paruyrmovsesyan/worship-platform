<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';

// Require admin access
$access = wp_admin_require_access('/songs.php');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function wp_lyrics_out(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

const WP_LYRICS_CONFIG_FILE = __DIR__ . '/data/lyrics_ai_config.json';

function wp_lyrics_get_config(): array {
    $default = [
        'provider' => 'gemini', // 'gemini' or 'openai'
        'gemini_api_key' => '',
        'gemini_model' => 'gemini-2.5-flash',
        'openai_api_key' => '',
        'openai_model' => 'gpt-4o-mini',
    ];
    if (is_file(WP_LYRICS_CONFIG_FILE) && is_readable(WP_LYRICS_CONFIG_FILE)) {
        $raw = @file_get_contents(WP_LYRICS_CONFIG_FILE);
        if ($raw) {
            $data = @json_decode($raw, true);
            if (is_array($data)) {
                if (!empty($data['model']) && empty($data['gemini_model'])) {
                    $data['gemini_model'] = $data['model'];
                }
                $default = array_merge($default, $data);
            }
        }
    }
    // Fallback to environment variables
    if (empty($default['gemini_api_key'])) {
        $envKey = wp_runtime_env('GEMINI_API_KEY') ?: wp_runtime_env('GOOGLE_API_KEY');
        if ($envKey) {
            $default['gemini_api_key'] = $envKey;
        }
    }
    if (empty($default['openai_api_key'])) {
        $envKey = wp_runtime_env('OPENAI_API_KEY');
        if ($envKey) {
            $default['openai_api_key'] = $envKey;
        }
    }
    // Auto-select provider if only one is configured
    if ($default['provider'] === 'gemini' && empty($default['gemini_api_key']) && !empty($default['openai_api_key'])) {
        $default['provider'] = 'openai';
    } elseif ($default['provider'] === 'openai' && empty($default['openai_api_key']) && !empty($default['gemini_api_key'])) {
        $default['provider'] = 'gemini';
    }
    return $default;
}

function wp_lyrics_save_config(array $newConfig): bool {
    $dir = dirname(WP_LYRICS_CONFIG_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $current = wp_lyrics_get_config();

    if (isset($newConfig['provider']) && in_array($newConfig['provider'], ['gemini', 'openai'], true)) {
        $current['provider'] = $newConfig['provider'];
    }
    if (isset($newConfig['gemini_api_key'])) {
        $k = trim((string)$newConfig['gemini_api_key']);
        if ($k !== '' || !empty($newConfig['allow_empty_gemini'])) {
            $current['gemini_api_key'] = $k;
        }
    }
    if (isset($newConfig['gemini_model'])) {
        $current['gemini_model'] = trim((string)$newConfig['gemini_model']) ?: 'gemini-2.5-flash';
    }
    if (isset($newConfig['openai_api_key'])) {
        $k = trim((string)$newConfig['openai_api_key']);
        if ($k !== '' || !empty($newConfig['allow_empty_openai'])) {
            $current['openai_api_key'] = $k;
        }
    }
    if (isset($newConfig['openai_model'])) {
        $current['openai_model'] = trim((string)$newConfig['openai_model']) ?: 'gpt-4o-mini';
    }
    // Backward compatibility for legacy readers
    $current['model'] = $current['gemini_model'];

    return (bool)@file_put_contents(WP_LYRICS_CONFIG_FILE, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function wp_lyrics_gemini_request(string $apiKey, string $model, array $contents, ?array $generationConfig = null): array {
    if (empty($apiKey)) {
        throw new RuntimeException('Gemini API Key-ը նշված չէ։ Խնդրում ենք նշել կարգավորումներում։');
    }

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . urlencode($model) . ':generateContent?key=' . urlencode($apiKey);

    $body = ['contents' => $contents];
    if ($generationConfig !== null) {
        $body['generationConfig'] = $generationConfig;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        throw new RuntimeException('Ցանցային սխալ (Gemini cURL): ' . $curlErr);
    }

    $json = @json_decode((string)$response, true);
    if ($httpCode !== 200) {
        $msg = $json['error']['message'] ?? ('HTTP Error ' . $httpCode . ': ' . $response);
        throw new RuntimeException('Gemini API սխալ: ' . $msg);
    }

    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
    return ['raw' => $json, 'text' => trim((string)$text)];
}

function wp_lyrics_openai_request(string $apiKey, string $model, array $messages, ?string $responseFormat = 'json_object'): array {
    if (empty($apiKey)) {
        throw new RuntimeException('OpenAI (ChatGPT) API Key-ը նշված չէ։ Խնդրում ենք նշել կարգավորումներում։');
    }

    $url = 'https://api.openai.com/v1/chat/completions';

    $body = [
        'model' => $model ?: 'gpt-4o-mini',
        'messages' => $messages,
        'temperature' => 0.2,
    ];

    if ($responseFormat === 'json_object') {
        $body['response_format'] = ['type' => 'json_object'];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 55,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        throw new RuntimeException('Ցանցային սխալ (OpenAI cURL): ' . $curlErr);
    }

    $json = @json_decode((string)$response, true);
    if ($httpCode !== 200) {
        $msg = $json['error']['message'] ?? ('HTTP Error ' . $httpCode . ': ' . $response);
        throw new RuntimeException('OpenAI (ChatGPT) API սխալ: ' . $msg);
    }

    $text = $json['choices'][0]['message']['content'] ?? '';
    return ['raw' => $json, 'text' => trim((string)$text)];
}

$action = trim((string)($_GET['action'] ?? $_POST['action'] ?? ''));

// =========================================================================
// ACTION: get_config
// =========================================================================
if ($action === 'get_config') {
    $cfg = wp_lyrics_get_config();
    $mask = static function(string $k): string {
        $k = trim($k);
        if (empty($k)) return '';
        $len = strlen($k);
        return ($len > 8) ? (substr($k, 0, 4) . '...' . substr($k, -4)) : '••••••••';
    };

    wp_lyrics_out([
        'ok' => true,
        'provider' => $cfg['provider'] ?? 'gemini',
        'has_gemini' => !empty($cfg['gemini_api_key']),
        'has_openai' => !empty($cfg['openai_api_key']),
        'has_key' => !empty($cfg['gemini_api_key']) || !empty($cfg['openai_api_key']),
        'masked_gemini' => $mask($cfg['gemini_api_key']),
        'masked_openai' => $mask($cfg['openai_api_key']),
        'gemini_model' => $cfg['gemini_model'] ?? 'gemini-2.5-flash',
        'openai_model' => $cfg['openai_model'] ?? 'gpt-4o-mini',
        'model' => $cfg['gemini_model'] ?? 'gemini-2.5-flash', // legacy compat
    ]);
}

// =========================================================================
// ACTION: save_config
// =========================================================================
if ($action === 'save_config') {
    $rawInput = file_get_contents('php://input');
    $data = @json_decode($rawInput, true) ?: $_POST;

    $provider = trim((string)($data['provider'] ?? 'gemini'));
    $geminiApiKey = trim((string)($data['gemini_api_key'] ?? ''));
    $geminiModel = trim((string)($data['gemini_model'] ?? $data['model'] ?? 'gemini-2.5-flash'));
    $openaiApiKey = trim((string)($data['openai_api_key'] ?? ''));
    $openaiModel = trim((string)($data['openai_model'] ?? 'gpt-4o-mini'));

    $current = wp_lyrics_get_config();

    $savePayload = [
        'provider' => in_array($provider, ['gemini', 'openai'], true) ? $provider : 'gemini',
        'gemini_model' => $geminiModel,
        'openai_model' => $openaiModel,
    ];

    if ($geminiApiKey !== '') {
        $savePayload['gemini_api_key'] = $geminiApiKey;
    }
    if ($openaiApiKey !== '') {
        $savePayload['openai_api_key'] = $openaiApiKey;
    }

    $saved = wp_lyrics_save_config($savePayload);

    if (!$saved) {
        wp_lyrics_out(['ok' => false, 'error' => 'Չհաջողվեց պահպանել կարգավորումները սերվերում'], 500);
    }
    wp_lyrics_out(['ok' => true, 'message' => 'AI կարգավորումները հաջողությամբ պահպանվեցին']);
}

// =========================================================================
// ACTION: fetch_ai_lyrics
// =========================================================================
if ($action === 'fetch_ai_lyrics') {
    $rawInput = file_get_contents('php://input');
    $data = @json_decode($rawInput, true) ?: $_POST;

    $title = trim((string)($data['title'] ?? ''));
    $artist = trim((string)($data['artist'] ?? ''));
    $lang = trim((string)($data['lang'] ?? 'hy'));
    $existingLyrics = trim((string)($data['existing_lyrics'] ?? ''));

    if ($title === '') {
        wp_lyrics_out(['ok' => false, 'error' => 'Նշեք երգի վերնագիրը'], 400);
    }

    $cfg = wp_lyrics_get_config();
    $provider = $cfg['provider'] ?? 'gemini';

    if ($provider === 'openai' && empty($cfg['openai_api_key'])) {
        wp_lyrics_out([
            'ok' => false,
            'need_key' => true,
            'error' => 'OpenAI (ChatGPT) API Key-ը տեղադրված չէ։ Սեղմեք «AI Կարգավորումներ» և մուտքագրեք ձեր բանալին։'
        ], 400);
    }
    if ($provider === 'gemini' && empty($cfg['gemini_api_key'])) {
        wp_lyrics_out([
            'ok' => false,
            'need_key' => true,
            'error' => 'Gemini API Key-ը տեղադրված չէ։ Սեղմեք «AI Կարգավորումներ» և մուտքագրեք ձեր բանալին։'
        ], 400);
    }

    $systemInstruction = "You are a Christian Worship Music Database assistant specialized in Armenian, Russian, and English praise & worship songs, Christian hymns, and contemporary church music.
Your mission is to return the complete, canonical, beautifully formatted lyrics for the specified worship song.

OUTPUT REQUIREMENTS:
1. Provide the complete lyrics divided into structured sections with clear section headers in brackets:
   [Տուն 1]
   (lyrics of verse 1)

   [Կրկներգ]
   (lyrics of chorus)

   [Տուն 2]
   (lyrics of verse 2)

   [Կամուրջ]
   (lyrics of bridge)

   [Վերջաբան]
   (lyrics of outro)

   (If song is in Russian, use [Куплет 1], [Припев], [Куплет 2], [Мост]. If English, use [Verse 1], [Chorus], [Verse 2], [Bridge]).
2. NEVER write abbreviations like '(Կրկն. x2)' or '(Refrain)' - always write out full lyrics so projection and slides work properly.
3. If this is a translation of a known worship song (e.g. Bethel, Hillsong, Elevation, Chris Tomlin, Matt Redman), provide the best Armenian or Russian Christian church translation.
4. Also return title transliterations and suggested key if known.

Return ONLY a valid JSON object with these keys:
{
  \"title_hy\": \"Armenian title if available\",
  \"title_lat\": \"Latin/Armenian transliteration or original English title\",
  \"title_ru\": \"Russian title if available\",
  \"title_en\": \"English title if available\",
  \"artist\": \"Original songwriter / worship leader or ministry\",
  \"suggested_key\": \"Original musical key e.g. C, D, G, E, Am\",
  \"bpm\": 0,
  \"lyrics\": \"Full structured lyrics with brackets for stanzas\",
  \"notes\": \"Short note or verse summary\"
}";

    $userPrompt = "Song Title: {$title}\nArtist / Performer: {$artist}\nLanguage preference: {$lang}";
    if ($existingLyrics !== '') {
        $userPrompt .= "\nPartial or existing lyrics reference:\n" . mb_substr($existingLyrics, 0, 500);
    }

    try {
        if ($provider === 'openai') {
            $messages = [
                ['role' => 'system', 'content' => $systemInstruction],
                ['role' => 'user', 'content' => $userPrompt]
            ];
            $result = wp_lyrics_openai_request($cfg['openai_api_key'], $cfg['openai_model'] ?: 'gpt-4o-mini', $messages, 'json_object');
        } else {
            $contents = [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $systemInstruction . "\n\n" . $userPrompt]
                    ]
                ]
            ];
            $genConfig = [
                'temperature' => 0.2,
                'topP' => 0.95,
                'responseMimeType' => 'application/json'
            ];
            $result = wp_lyrics_gemini_request($cfg['gemini_api_key'], $cfg['gemini_model'] ?: 'gemini-2.5-flash', $contents, $genConfig);
        }

        $cleanText = $result['text'];

        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/s', $cleanText, $m)) {
            $cleanText = $m[1];
        }

        $parsed = @json_decode($cleanText, true);
        if (!is_array($parsed) || empty($parsed['lyrics'])) {
            $parsed = [
                'title_hy' => $title,
                'title_lat' => '',
                'title_ru' => '',
                'title_en' => '',
                'artist' => $artist,
                'suggested_key' => '',
                'bpm' => 0,
                'lyrics' => $cleanText,
            ];
        }

        wp_lyrics_out([
            'ok' => true,
            'data' => $parsed,
        ]);
    } catch (Throwable $e) {
        wp_lyrics_out([
            'ok' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
}

// =========================================================================
// ACTION: ocr_image_lyrics
// =========================================================================
if ($action === 'ocr_image_lyrics') {
    $cfg = wp_lyrics_get_config();
    $provider = $cfg['provider'] ?? 'gemini';

    if ($provider === 'openai' && empty($cfg['openai_api_key'])) {
        wp_lyrics_out([
            'ok' => false,
            'need_key' => true,
            'error' => 'OpenAI (ChatGPT) API Key-ը տեղադրված չէ։ Սեղմեք «AI Կարգավորումներ» և մուտքագրեք ձեր բանալին։'
        ], 400);
    }
    if ($provider === 'gemini' && empty($cfg['gemini_api_key'])) {
        wp_lyrics_out([
            'ok' => false,
            'need_key' => true,
            'error' => 'Gemini API Key-ը տեղադրված չէ։ Սեղմեք «AI Կարգավորումներ» և մուտքագրեք ձեր բանալին։'
        ], 400);
    }

    $imageBytes = '';
    $mimeType = 'image/jpeg';

    if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
        $imageBytes = @file_get_contents($_FILES['image']['tmp_name']);
        $detectedMime = @mime_content_type($_FILES['image']['tmp_name']);
        if ($detectedMime) $mimeType = $detectedMime;
    } else {
        $rawInput = file_get_contents('php://input');
        $data = @json_decode($rawInput, true) ?: $_POST;
        $base64 = trim((string)($data['image_base64'] ?? $data['image'] ?? ''));
        if ($base64 !== '') {
            if (preg_match('/^data:(image\/[a-zA-Z0-9\-\+\.]+);base64,(.+)$/', $base64, $m)) {
                $mimeType = $m[1];
                $imageBytes = base64_decode($m[2]);
            } else {
                $imageBytes = base64_decode($base64);
            }
        }
    }

    if (empty($imageBytes)) {
        wp_lyrics_out(['ok' => false, 'error' => 'Լուսանկար չի ուղարկվել։ Ընտրեք կամ քաշեք նկարը։'], 400);
    }

    $base64Data = base64_encode($imageBytes);

    $prompt = "You are an expert OCR and music transcription system for Christian songbooks, hymnals, sheet music, and lyrics slides (Armenian, Russian, English).
Examine this image carefully:
1. Transcribe the Armenian, Russian, or English text with highest fidelity.
2. Structure the song into sections with bracket headers: [Տուն 1], [Կրկներգ], [Տուն 2], [Կամուրջ] etc. (or Russian/English equivalents).
3. If there are musical chords above words (e.g. C, G, Am, Em), separate them:
   - Provide clean lyrics without chords in 'lyrics'.
   - Provide chords sheet in 'chords'.
   - Provide bracket ChordPro format in 'chordpro'.
4. Identify song title if visible in image.

Return ONLY a valid JSON:
{
  \"title\": \"Title found in image\",
  \"lyrics\": \"Full structured lyrics with [Տուն 1], [Կրկներգ] headers\",
  \"chords\": \"Extracted chord lines if any\",
  \"chordpro\": \"[C]Lyrics with [G]inline chords if any\"
}";

    try {
        if ($provider === 'openai') {
            $messages = [
                ['role' => 'system', 'content' => $prompt],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => "Please transcribe the lyrics and stanzas from this image:"],
                        [
                            'type' => 'image_url',
                            'image_url' => [
                                'url' => 'data:' . $mimeType . ';base64,' . $base64Data
                            ]
                        ]
                    ]
                ]
            ];
            $result = wp_lyrics_openai_request($cfg['openai_api_key'], $cfg['openai_model'] ?: 'gpt-4o-mini', $messages, 'json_object');
        } else {
            $contents = [
                [
                    'role' => 'user',
                    'parts' => [
                        [
                            'inlineData' => [
                                'mimeType' => $mimeType,
                                'data' => $base64Data
                            ]
                        ],
                        ['text' => $prompt]
                    ]
                ]
            ];
            $genConfig = [
                'temperature' => 0.1,
                'responseMimeType' => 'application/json'
            ];
            $result = wp_lyrics_gemini_request($cfg['gemini_api_key'], $cfg['gemini_model'] ?: 'gemini-2.5-flash', $contents, $genConfig);
        }

        $cleanText = $result['text'];
        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/s', $cleanText, $m)) {
            $cleanText = $m[1];
        }
        $parsed = @json_decode($cleanText, true);
        if (!is_array($parsed)) {
            $parsed = ['lyrics' => $cleanText, 'title' => '', 'chords' => '', 'chordpro' => ''];
        }
        wp_lyrics_out(['ok' => true, 'data' => $parsed]);
    } catch (Throwable $e) {
        wp_lyrics_out(['ok' => false, 'error' => $e->getMessage()], 500);
    }
}

// =========================================================================
// ACTION: parse_file_import (PPTX, DOCX, TXT, ChordPro)
// =========================================================================
if ($action === 'parse_file_import') {
    if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        wp_lyrics_out(['ok' => false, 'error' => 'Ֆայլ չի ընտրվել'], 400);
    }

    $fileName = (string)($_FILES['file']['name'] ?? 'file');
    $tmpPath = (string)$_FILES['file']['tmp_name'];
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    $extractedSongs = [];

    $norm = function(string $s): string {
        $s = mb_strtolower(trim($s));
        $s = preg_replace('/[^\p{L}\p{N}]+/u', '', $s);
        return $s;
    };

    $pdo = wp_runtime_open_pdo();
    $stmt = $pdo->query("SELECT id, title, title_hy, title_lat, title_en, title_ru, artist, lyrics, chords FROM songs");
    $dbSongs = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    // 1. PPTX Parsing
    if ($ext === 'pptx') {
        if (!class_exists('ZipArchive')) {
            wp_lyrics_out(['ok' => false, 'error' => 'Server lacks ZipArchive extension'], 500);
        }
        $zip = new ZipArchive();
        if ($zip->open($tmpPath) === true) {
            $slidesText = [];
            for ($i = 1; $i <= 500; $i++) {
                $slideXml = $zip->getFromName("ppt/slides/slide{$i}.xml");
                if ($slideXml === false) continue;

                if (preg_match_all('/<a:t(?:\s[^>]*)?>(.*?)<\/a:t>/is', $slideXml, $matches)) {
                    $slideParts = [];
                    foreach ($matches[1] as $t) {
                        $decoded = html_entity_decode(trim($t), ENT_QUOTES | ENT_XML1, 'UTF-8');
                        if ($decoded !== '') $slideParts[] = $decoded;
                    }
                    if (!empty($slideParts)) {
                        $slidesText[] = implode("\n", $slideParts);
                    }
                }
            }
            $zip->close();

            if (!empty($slidesText)) {
                $baseTitle = pathinfo($fileName, PATHINFO_FILENAME);
                $firstSlide = $slidesText[0];
                $titleCandidate = (mb_strlen($firstSlide) < 60 && count(explode("\n", $firstSlide)) <= 2) ? $firstSlide : $baseTitle;

                $fullLyrics = implode("\n\n", array_slice($slidesText, ($titleCandidate === $firstSlide ? 1 : 0)));
                $extractedSongs[] = [
                    'title' => $titleCandidate,
                    'artist' => '',
                    'lyrics' => trim($fullLyrics),
                    'chords' => '',
                ];
            }
        }
    }
    // 2. DOCX Parsing
    elseif ($ext === 'docx') {
        if (!class_exists('ZipArchive')) {
            wp_lyrics_out(['ok' => false, 'error' => 'Server lacks ZipArchive extension'], 500);
        }
        $zip = new ZipArchive();
        if ($zip->open($tmpPath) === true) {
            $docXml = $zip->getFromName('word/document.xml');
            $zip->close();
            if ($docXml) {
                if (preg_match_all('/<w:p(?:\s[^>]*)?>(.*?)<\/w:p>/is', $docXml, $pMatches)) {
                    $paragraphs = [];
                    foreach ($pMatches[1] as $pXml) {
                        if (preg_match_all('/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/is', $pXml, $tMatches)) {
                            $pText = implode('', array_map(function($t) {
                                return html_entity_decode($t, ENT_QUOTES | ENT_XML1, 'UTF-8');
                            }, $tMatches[1]));
                            $paragraphs[] = trim($pText);
                        } else {
                            $paragraphs[] = '';
                        }
                    }
                    $baseTitle = pathinfo($fileName, PATHINFO_FILENAME);
                    $firstNonEmpty = '';
                    foreach ($paragraphs as $p) {
                        if ($p !== '') { $firstNonEmpty = $p; break; }
                    }
                    $titleCandidate = (mb_strlen($firstNonEmpty) < 60) ? $firstNonEmpty : $baseTitle;
                    $extractedSongs[] = [
                        'title' => $titleCandidate,
                        'artist' => '',
                        'lyrics' => trim(implode("\n", $paragraphs)),
                        'chords' => '',
                    ];
                }
            }
        }
    }
    // 3. TXT / ChordPro Parsing
    else {
        $content = @file_get_contents($tmpPath);
        if ($content) {
            $chunks = preg_split('/\n\s*[-=]{3,}\s*\n/', $content);
            if (count($chunks) <= 1) {
                $chunks = preg_split('/(?=\{title\s*:)/i', $content);
            }

            foreach ($chunks as $chunk) {
                $chunk = trim($chunk);
                if ($chunk === '') continue;

                $songTitle = '';
                $songArtist = '';
                $songLyrics = [];
                $songChords = [];

                $lines = explode("\n", $chunk);
                foreach ($lines as $line) {
                    $trimmed = trim($line);
                    if (preg_match('/\{title\s*:\s*([^}]+)\}/i', $trimmed, $m)) {
                        $songTitle = trim($m[1]);
                        continue;
                    }
                    if (preg_match('/\{artist\s*:\s*([^}]+)\}/i', $trimmed, $m)) {
                        $songArtist = trim($m[1]);
                        continue;
                    }
                    if (preg_match('/^(\s*[A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|7|9|add\d?)?(?:\/[A-G][#b]?)?\s*)+$/', $trimmed)) {
                        $songChords[] = $line;
                    } else {
                        $songLyrics[] = $line;
                    }
                }

                if ($songTitle === '') {
                    $songTitle = pathinfo($fileName, PATHINFO_FILENAME);
                }

                $extractedSongs[] = [
                    'title' => $songTitle,
                    'artist' => $songArtist,
                    'lyrics' => trim(implode("\n", $songLyrics)),
                    'chords' => trim(implode("\n", $songChords)),
                ];
            }
        }
    }

    if (empty($extractedSongs)) {
        wp_lyrics_out(['ok' => false, 'error' => 'Ֆայլից երգերի տեքստ չգտնվեց'], 400);
    }

    $matchedResults = [];
    foreach ($extractedSongs as $es) {
        $eNorm = $norm($es['title']);
        $bestMatch = null;

        foreach ($dbSongs as $db) {
            $candidates = [
                $norm($db['title'] ?? ''),
                $norm($db['title_hy'] ?? ''),
                $norm($db['title_lat'] ?? ''),
                $norm($db['title_ru'] ?? ''),
                $norm($db['title_en'] ?? ''),
            ];
            foreach ($candidates as $cand) {
                if ($cand !== '' && ($cand === $eNorm || str_contains($cand, $eNorm) || str_contains($eNorm, $cand))) {
                    $bestMatch = $db;
                    break 2;
                }
            }
        }

        $matchedResults[] = [
            'extracted_title' => $es['title'],
            'extracted_artist' => $es['artist'],
            'extracted_lyrics' => $es['lyrics'],
            'extracted_chords' => $es['chords'],
            'matched_id' => $bestMatch ? (int)$bestMatch['id'] : null,
            'matched_title' => $bestMatch ? $bestMatch['title'] : null,
            'has_existing_lyrics' => $bestMatch ? !empty(trim((string)$bestMatch['lyrics'])) : false,
            'action' => $bestMatch ? 'update' : 'create',
        ];
    }

    wp_lyrics_out([
        'ok' => true,
        'filename' => $fileName,
        'count' => count($matchedResults),
        'songs' => $matchedResults,
    ]);
}

// =========================================================================
// ACTION: batch_import_songs
// =========================================================================
if ($action === 'batch_import_songs') {
    $rawInput = file_get_contents('php://input');
    $data = @json_decode($rawInput, true) ?: $_POST;
    $items = is_array($data['items'] ?? null) ? $data['items'] : [];

    if (empty($items)) {
        wp_lyrics_out(['ok' => false, 'error' => 'Ներմուծման համար երգեր չեն ընտրվել'], 400);
    }

    $pdo = wp_runtime_open_pdo();
    $updatedCount = 0;
    $createdCount = 0;

    $updateStmt = $pdo->prepare("UPDATE songs SET lyrics = ?, chords = CASE WHEN (chords IS NULL OR chords = '') AND ? != '' THEN ? ELSE chords END, updated_at = NOW() WHERE id = ?");
    $insertStmt = $pdo->prepare("INSERT INTO songs (title, title_hy, artist, lyrics, chords, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");

    foreach ($items as $item) {
        $act = $item['action'] ?? 'create';
        $songId = (int)($item['matched_id'] ?? 0);
        $title = trim((string)($item['extracted_title'] ?? ''));
        $artist = trim((string)($item['extracted_artist'] ?? ''));
        $lyrics = trim((string)($item['extracted_lyrics'] ?? ''));
        $chords = trim((string)($item['extracted_chords'] ?? ''));

        if ($act === 'update' && $songId > 0 && $lyrics !== '') {
            $updateStmt->execute([$lyrics, $chords, $chords, $songId]);
            $updatedCount++;
        } elseif ($act === 'create' && $title !== '') {
            $insertStmt->execute([$title, $title, $artist, $lyrics, $chords]);
            $createdCount++;
        }
    }

    wp_lyrics_out([
        'ok' => true,
        'updated_count' => $updatedCount,
        'created_count' => $createdCount,
        'total' => $updatedCount + $createdCount,
    ]);
}

wp_lyrics_out(['ok' => false, 'error' => 'Անհայտ գործողություն (Invalid action)'], 400);
