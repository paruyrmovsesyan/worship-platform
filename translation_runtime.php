<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

const WP_TRANSLATION_CACHE_VERSION = 'v1';

if (!function_exists('wp_translation_settings')) {
    function wp_translation_settings(bool $refresh = false): array {
        return [
            'enabled' => true,
            'mode' => 'manual',
        ];
    }
}

if (!function_exists('wp_translation_requested_lang')) {
    function wp_translation_requested_lang(): string {
        $value = strtolower(trim((string)($_GET['lang'] ?? $_POST['lang'] ?? '')));
        return in_array($value, ['hy', 'ru', 'en'], true) ? $value : 'hy';
    }
}

if (!function_exists('wp_translation_should_translate')) {
    function wp_translation_should_translate(string $lang): bool {
        return in_array($lang, ['ru', 'en'], true);
    }
}

if (!function_exists('wp_translation_has_armenian')) {
    function wp_translation_has_armenian(string $text): bool {
        return preg_match('/[\x{0531}-\x{058F}]/u', $text) === 1;
    }
}

if (!function_exists('wp_translation_cache_root')) {
    function wp_translation_cache_root(): string {
        $dir = __DIR__ . '/translation_cache';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }
}

if (!function_exists('wp_translation_cache_path')) {
    function wp_translation_cache_path(string $lang, string $context, string $sourceText): string {
        $safeContext = preg_replace('/[^A-Za-z0-9_.-]+/', '_', trim($context)) ?: 'generic';
        $lang = in_array($lang, ['ru', 'en'], true) ? $lang : 'hy';
        $hash = hash('sha256', WP_TRANSLATION_CACHE_VERSION . '|' . $lang . '|' . $safeContext . '|' . $sourceText);
        $dir = wp_translation_cache_root() . DIRECTORY_SEPARATOR . $lang . DIRECTORY_SEPARATOR . $safeContext;
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir . DIRECTORY_SEPARATOR . $hash . '.json';
    }
}

if (!function_exists('wp_translation_cache_get')) {
    function wp_translation_cache_get(string $lang, string $context, string $sourceText): ?string {
        $path = wp_translation_cache_path($lang, $context, $sourceText);
        if (!is_file($path)) {
            $root = wp_translation_cache_root() . DIRECTORY_SEPARATOR . $lang;
            if (!is_dir($root)) {
                return null;
            }

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if (!$file instanceof SplFileInfo || !$file->isFile() || strtolower($file->getExtension()) !== 'json') {
                    continue;
                }

                $rawFallback = @file_get_contents($file->getPathname());
                if (!is_string($rawFallback) || trim($rawFallback) === '') {
                    continue;
                }

                $decodedFallback = json_decode($rawFallback, true);
                if (!is_array($decodedFallback)) {
                    continue;
                }

                $sourceFallback = trim((string)($decodedFallback['source'] ?? ''));
                $textFallback = trim((string)($decodedFallback['text'] ?? ''));
                if ($sourceFallback === trim($sourceText) && $textFallback !== '') {
                    return $textFallback;
                }
            }

            return null;
        }

        $raw = @file_get_contents($path);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        $text = $decoded['text'] ?? null;
        if (!is_string($text) || trim($text) === '') {
            return null;
        }

        return $text;
    }
}

if (!function_exists('wp_translation_cache_set')) {
    function wp_translation_cache_set(string $lang, string $context, string $sourceText, string $translatedText): bool {
        $path = wp_translation_cache_path($lang, $context, $sourceText);
        $payload = [
            'lang' => $lang,
            'context' => $context,
            'source' => $sourceText,
            'text' => $translatedText,
            'created_at' => date('c'),
        ];

        return @file_put_contents(
            $path,
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
            LOCK_EX
        ) !== false;
    }
}

if (!function_exists('wp_translation_translate_texts')) {
    function wp_translation_translate_texts(array $texts, string $lang, string $context = 'generic'): array {
        if (!wp_translation_should_translate($lang) || !$texts) {
            return $texts;
        }

        $result = [];
        foreach ($texts as $key => $text) {
            $value = trim((string)$text);
            if ($value === '' || !wp_translation_has_armenian($value)) {
                $result[$key] = $text;
                continue;
            }

            $cached = wp_translation_cache_get($lang, $context, $value);
            $result[$key] = is_string($cached) && trim($cached) !== '' ? $cached : $text;
        }

        ksort($result);
        return $result;
    }
}

if (!function_exists('wp_translation_translate_row')) {
    function wp_translation_translate_row(array $row, array $fieldContexts, string $lang): array {
        $translated = wp_translation_translate_rows([$row], $fieldContexts, $lang);
        return $translated[0] ?? $row;
    }
}

if (!function_exists('wp_translation_split_variants')) {
    function wp_translation_split_variants(string $text): array {
        $parts = preg_split('/\s*\/\s*/u', trim($text)) ?: [];
        $parts = array_values(array_filter(array_map(static function ($part) {
            return trim((string)$part);
        }, $parts), static function ($part) {
            return $part !== '';
        }));

        return $parts;
    }
}

if (!function_exists('wp_translation_has_cyrillic')) {
    function wp_translation_has_cyrillic(string $text): bool {
        return preg_match('/[\x{0400}-\x{04FF}]/u', $text) === 1;
    }
}

if (!function_exists('wp_translation_has_latin')) {
    function wp_translation_has_latin(string $text): bool {
        return preg_match('/[A-Za-z]/', $text) === 1;
    }
}

if (!function_exists('wp_translation_pick_variant_for_lang')) {
    function wp_translation_pick_variant_for_lang(array $parts, string $lang): string {
        $latinParts = [];
        foreach ($parts as $part) {
            $value = trim((string)$part);
            if ($value !== '' && wp_translation_has_latin($value) && !wp_translation_has_armenian($value) && !wp_translation_has_cyrillic($value)) {
                $latinParts[] = $value;
            }
        }

        foreach ($parts as $part) {
            if (!is_string($part) || trim($part) === '') {
                continue;
            }

            $value = trim($part);

            if ($lang === 'hy' && wp_translation_has_armenian($value)) {
                return $value;
            }

            if ($lang === 'ru' && wp_translation_has_cyrillic($value) && !wp_translation_has_armenian($value)) {
                return $value;
            }

            if (
                $lang === 'en' &&
                !empty($parts[0]) &&
                wp_translation_has_armenian((string)$parts[0]) &&
                count($latinParts) >= 2
            ) {
                return (string)$latinParts[count($latinParts) - 1];
            }

            if (
                $lang === 'en' &&
                wp_translation_has_latin($value) &&
                !wp_translation_has_armenian($value) &&
                !wp_translation_has_cyrillic($value)
            ) {
                return $value;
            }
        }

        return '';
    }
}

if (!function_exists('wp_translation_localize_variant_text')) {
    function wp_translation_localize_variant_text(string $text, string $lang, string $context = 'generic'): string {
        $text = trim($text);
        if ($text === '') {
            return '';
        }

        $parts = wp_translation_split_variants($text);
        if (!$parts) {
            return $text;
        }

        $existing = wp_translation_pick_variant_for_lang($parts, $lang);
        if ($existing !== '') {
            return $existing;
        }

        if ($lang === 'hy') {
            $armenian = wp_translation_pick_variant_for_lang($parts, 'hy');
            return $armenian !== '' ? $armenian : $parts[0];
        }

        $armenian = wp_translation_pick_variant_for_lang($parts, 'hy');
        if ($armenian !== '') {
            $translated = wp_translation_translate_texts([$armenian], $lang, $context);
            $candidate = trim((string)($translated[0] ?? ''));
            if ($candidate !== '') {
                return $candidate;
            }
            return $armenian;
        }

        if (wp_translation_has_armenian($text)) {
            $translated = wp_translation_translate_texts([$text], $lang, $context);
            $candidate = trim((string)($translated[0] ?? ''));
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return $parts[0];
    }
}

if (!function_exists('wp_translation_localize_row_fields')) {
    function wp_translation_localize_row_fields(array $rows, array $fieldContexts, string $lang): array {
        if (!$rows || !$fieldContexts) {
            return $rows;
        }

        foreach ($rows as $rowKey => $row) {
            if (!is_array($row)) {
                continue;
            }

            foreach ($fieldContexts as $field => $context) {
                if (!array_key_exists($field, $row) || !is_string($row[$field])) {
                    continue;
                }

                $explicitVariant = '';
                if ($lang === 'hy' && !empty($row[$field . '_hy']) && is_string($row[$field . '_hy'])) {
                    $explicitVariant = trim((string)$row[$field . '_hy']);
                } elseif ($lang === 'ru' && !empty($row[$field . '_ru']) && is_string($row[$field . '_ru'])) {
                    $explicitVariant = trim((string)$row[$field . '_ru']);
                } elseif ($lang === 'en' && !empty($row[$field . '_en']) && is_string($row[$field . '_en'])) {
                    $explicitVariant = trim((string)$row[$field . '_en']);
                }

                if ($explicitVariant !== '') {
                    $rows[$rowKey][$field] = $explicitVariant;
                    continue;
                }

                $rows[$rowKey][$field] = wp_translation_localize_variant_text((string)$row[$field], $lang, (string)$context);
            }
        }

        return $rows;
    }
}

if (!function_exists('wp_translation_cache_counts')) {
    function wp_translation_cache_counts(): array {
        $counts = [
            'all' => 0,
            'ru' => 0,
            'en' => 0,
        ];

        foreach (['ru', 'en'] as $lang) {
            $root = wp_translation_cache_root() . DIRECTORY_SEPARATOR . $lang;
            if (!is_dir($root)) {
                continue;
            }

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if ($file instanceof SplFileInfo && $file->isFile() && strtolower($file->getExtension()) === 'json') {
                    $counts[$lang]++;
                    $counts['all']++;
                }
            }
        }

        return $counts;
    }
}

if (!function_exists('wp_translation_cache_list_entries')) {
    function wp_translation_cache_list_entries(string $lang = 'all', string $search = '', int $limit = 80): array {
        $allowedLangs = $lang === 'all' ? ['ru', 'en'] : (in_array($lang, ['ru', 'en'], true) ? [$lang] : ['ru', 'en']);
        $searchNeedle = mb_strtolower(trim($search));
        $entries = [];

        foreach ($allowedLangs as $langCode) {
            $root = wp_translation_cache_root() . DIRECTORY_SEPARATOR . $langCode;
            if (!is_dir($root)) {
                continue;
            }

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if (!$file instanceof SplFileInfo || !$file->isFile() || strtolower($file->getExtension()) !== 'json') {
                    continue;
                }

                $raw = @file_get_contents($file->getPathname());
                if (!is_string($raw) || trim($raw) === '') {
                    continue;
                }

                $decoded = json_decode($raw, true);
                if (!is_array($decoded)) {
                    continue;
                }

                $source = trim((string)($decoded['source'] ?? ''));
                $text = trim((string)($decoded['text'] ?? ''));
                $context = trim((string)($decoded['context'] ?? 'generic'));
                if ($source === '' || $text === '') {
                    continue;
                }

                if ($searchNeedle !== '') {
                    $haystack = mb_strtolower(implode(' ', [$source, $text, $context, $langCode]));
                    if (!str_contains($haystack, $searchNeedle)) {
                        continue;
                    }
                }

                $entries[] = [
                    'lang' => $langCode,
                    'context' => $context,
                    'source' => $source,
                    'text' => $text,
                    'created_at' => (string)($decoded['created_at'] ?? ''),
                    'path' => $file->getPathname(),
                    'id' => hash('sha256', $langCode . '|' . $context . '|' . $source),
                    'updated_at' => date('c', (int)$file->getMTime()),
                ];
            }
        }

        usort($entries, static function (array $a, array $b): int {
            return strcmp((string)($b['updated_at'] ?? ''), (string)($a['updated_at'] ?? ''));
        });

        return array_slice($entries, 0, max(1, $limit));
    }
}

if (!function_exists('wp_translation_cache_delete')) {
    function wp_translation_cache_delete(string $lang, string $context, string $sourceText): bool {
        if (!in_array($lang, ['ru', 'en'], true)) {
            return false;
        }

        $path = wp_translation_cache_path($lang, $context, $sourceText);
        if (!is_file($path)) {
            return true;
        }

        return @unlink($path);
    }
}

if (!function_exists('wp_translation_cache_clear')) {
    function wp_translation_cache_clear(string $lang = 'all'): int {
        $langs = $lang === 'all' ? ['ru', 'en'] : (in_array($lang, ['ru', 'en'], true) ? [$lang] : []);
        $removed = 0;

        foreach ($langs as $langCode) {
            $root = wp_translation_cache_root() . DIRECTORY_SEPARATOR . $langCode;
            if (!is_dir($root)) {
                continue;
            }

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );

            foreach ($iterator as $file) {
                if ($file instanceof SplFileInfo && $file->isFile() && strtolower($file->getExtension()) === 'json') {
                    if (@unlink($file->getPathname())) {
                        $removed++;
                    }
                }
            }
        }

        return $removed;
    }
}

if (!function_exists('wp_translation_translate_rows')) {
    function wp_translation_translate_rows(array $rows, array $fieldContexts, string $lang): array {
        if (!wp_translation_should_translate($lang) || !$rows || !$fieldContexts) {
            return $rows;
        }

        foreach ($fieldContexts as $field => $context) {
            $batch = [];
            foreach ($rows as $rowKey => $row) {
                if (!is_array($row) || !array_key_exists($field, $row)) {
                    continue;
                }

                $value = $row[$field];
                if (!is_string($value)) {
                    continue;
                }

                $value = trim($value);
                if ($value === '' || !wp_translation_has_armenian($value)) {
                    continue;
                }

                $batch[$rowKey] = $value;
            }

            if (!$batch) {
                continue;
            }

            $translated = wp_translation_translate_texts($batch, $lang, $context);
            foreach ($translated as $rowKey => $text) {
                if (!isset($rows[$rowKey]) || !is_array($rows[$rowKey])) {
                    continue;
                }
                $rows[$rowKey][$field] = $text;
            }
        }

        return $rows;
    }
}
