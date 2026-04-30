<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

header('Content-Type: application/xml; charset=UTF-8');

function wp_sitemap_base_url(): string {
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';
    $host = trim((string)($_SERVER['HTTP_HOST'] ?? 'worship.pmstudio.am'));
    if ($host === '') {
        $host = 'worship.pmstudio.am';
    }
    return $scheme . '://' . $host;
}

function wp_sitemap_xml_escape(string $value): string {
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function wp_sitemap_lastmod(?string $value): string {
    $value = trim((string)$value);
    if ($value === '') {
        return gmdate('c');
    }

    $ts = strtotime($value);
    if ($ts === false) {
        return gmdate('c');
    }

    return gmdate('c', $ts);
}

$baseUrl = wp_sitemap_base_url();
$urls = [];

$staticPages = [
    [
        'loc' => $baseUrl . '/',
        'lastmod' => gmdate('c'),
        'changefreq' => 'daily',
        'priority' => '1.0',
    ],
    [
        'loc' => $baseUrl . '/main.html',
        'lastmod' => gmdate('c'),
        'changefreq' => 'daily',
        'priority' => '0.9',
    ],
    [
        'loc' => $baseUrl . '/news.html',
        'lastmod' => gmdate('c'),
        'changefreq' => 'weekly',
        'priority' => '0.7',
    ],
];

foreach ($staticPages as $page) {
    $urls[] = $page;
}

try {
    $pdo = wp_runtime_open_pdo();
    $stmt = $pdo->query("SELECT id, created_at FROM songs ORDER BY created_at DESC, id DESC");
    $songs = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

    foreach ($songs as $song) {
        $songId = (int)($song['id'] ?? 0);
        if ($songId <= 0) {
            continue;
        }

        $urls[] = [
            'loc' => $baseUrl . '/song_view.html?id=' . rawurlencode((string)$songId),
            'lastmod' => wp_sitemap_lastmod((string)($song['created_at'] ?? '')),
            'changefreq' => 'weekly',
            'priority' => '0.8',
        ];
    }
} catch (Throwable $e) {
    // Keep sitemap available with public static pages even if DB is temporarily unavailable.
}

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";

foreach ($urls as $url) {
    echo "  <url>\n";
    echo '    <loc>' . wp_sitemap_xml_escape((string)$url['loc']) . "</loc>\n";
    echo '    <lastmod>' . wp_sitemap_xml_escape((string)$url['lastmod']) . "</lastmod>\n";
    echo '    <changefreq>' . wp_sitemap_xml_escape((string)$url['changefreq']) . "</changefreq>\n";
    echo '    <priority>' . wp_sitemap_xml_escape((string)$url['priority']) . "</priority>\n";
    echo "  </url>\n";
}

echo "</urlset>\n";
