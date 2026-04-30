<?php
declare(strict_types=1);

function wp_share_target_value(string $key): string {
    $value = $_POST[$key] ?? $_GET[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }

    $value = trim($value);
    if ($value === '') {
        return '';
    }

    return mb_substr($value, 0, 2000);
}

function wp_share_target_extract_url(string ...$candidates): string {
    foreach ($candidates as $candidate) {
        if ($candidate === '') {
            continue;
        }

        if (preg_match('~https?://[^\s<>"\']+~iu', $candidate, $matches)) {
            return trim((string)($matches[0] ?? ''));
        }
    }

    return '';
}

function wp_share_target_internal_redirect(string $sharedUrl): ?string {
    if ($sharedUrl === '') {
        return null;
    }

    $parts = @parse_url($sharedUrl);
    if (!is_array($parts)) {
        return null;
    }

    $host = strtolower((string)($parts['host'] ?? ''));
    $currentHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));

    if ($host !== '' && $currentHost !== '' && $host !== $currentHost) {
        return null;
    }

    $path = (string)($parts['path'] ?? '');
    $allowedPaths = [
        '/song_view.html',
        '/main.html',
        '/favorites.html',
        '/setlists.html',
        '/setlist_view.html',
        '/setlist_public.html',
        '/account.html',
        '/',
        '/index.html',
    ];

    if (!in_array($path, $allowedPaths, true)) {
        return null;
    }

    $query = [];
    if (!empty($parts['query'])) {
        parse_str((string)$parts['query'], $query);
    }

    $target = $path === '/' ? '/main.html' : $path;
    $params = new URLSearchParamsPlaceholder();
    foreach ($query as $key => $value) {
        if (!is_scalar($value)) {
            continue;
        }
        $params->set((string)$key, (string)$value);
    }
    $params->set('source', 'pwa');
    $params->set('shared_from', 'target');

    return $target . '?' . $params->toQueryString();
}

final class URLSearchParamsPlaceholder {
    /** @var array<string,string> */
    private array $params = [];

    public function set(string $key, string $value): void {
        $this->params[$key] = $value;
    }

    public function toQueryString(): string {
        return http_build_query($this->params, '', '&', PHP_QUERY_RFC3986);
    }
}

$sharedTitle = wp_share_target_value('title');
$sharedText = wp_share_target_value('text');
$sharedUrl = wp_share_target_value('url');
if ($sharedUrl === '') {
    $sharedUrl = wp_share_target_extract_url($sharedText, $sharedTitle);
}

$internalTarget = wp_share_target_internal_redirect($sharedUrl);
if ($internalTarget !== null) {
    header('Location: ' . $internalTarget, true, 303);
    exit;
}

$targetParams = new URLSearchParamsPlaceholder();
$targetParams->set('source', 'pwa');
$targetParams->set('shared_from', 'target');

if ($sharedTitle !== '') {
    $targetParams->set('shared_title', $sharedTitle);
}

if ($sharedText !== '') {
    $targetParams->set('shared_text', $sharedText);
}

if ($sharedUrl !== '') {
    $targetParams->set('shared_url', $sharedUrl);
}

header('Location: /main.html?' . $targetParams->toQueryString(), true, 303);
exit;
