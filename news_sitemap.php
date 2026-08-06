<?php
declare(strict_types=1);

require_once __DIR__ . '/news_repository.php';
require_once __DIR__ . '/version_config.php';

header('Content-Type: application/xml; charset=UTF-8');

function wp_news_sitemap_escape(string $value): string {
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$host = trim((string)($_SERVER['HTTP_HOST'] ?? 'worship.pmstudio.am')) ?: 'worship.pmstudio.am';
$baseUrl = ($https ? 'https' : 'http') . '://' . $host;
$config = wp_version_load();
$publisher = (string)($config['site_seo_news_publisher'] ?: $config['site_seo_name'] ?: 'Worship Platform');
$items = [];

try {
    if (empty($config['site_seo_index_news_articles'])) {
        throw new RuntimeException('News article indexing is disabled.');
    }
    $pdo = wp_news_pdo();
    // Keep every published article as a standard sitemap URL. Only articles from
    // the last two days receive the Google News extension, as required by Google.
    $stmt = $pdo->query("
        SELECT slug, title_hy, title_en, title_ru, published_at
        FROM news_articles
        WHERE status = 'published'
          AND published_at IS NOT NULL
          AND published_at <= NOW()
        ORDER BY published_at DESC
        LIMIT 1000
    ");
    $items = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
} catch (Throwable $e) {
    $items = [];
}

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\">\n";

if (empty($items)) {
    // Prevent empty <urlset> error in Google Search Console by providing a fallback URL.
    echo "  <url>\n";
    echo '    <loc>' . wp_news_sitemap_escape($baseUrl . '/news') . "</loc>\n";
    echo '    <lastmod>' . wp_news_sitemap_escape(gmdate('c')) . "</lastmod>\n";
    echo "  </url>\n";
}

foreach ($items as $item) {
    $title = trim((string)($item['title_hy'] ?: $item['title_en'] ?: $item['title_ru'] ?: $item['slug']));
    $publishedTimestamp = strtotime((string)$item['published_at']);
    $published = date(DATE_ATOM, $publishedTimestamp);
    $isRecentNews = $publishedTimestamp >= strtotime('-2 days');
    echo "  <url>\n";
    echo '    <loc>' . wp_news_sitemap_escape($baseUrl . '/news/' . rawurlencode((string)$item['slug'])) . "</loc>\n";
    echo '    <lastmod>' . wp_news_sitemap_escape($published) . "</lastmod>\n";
    if ($isRecentNews) {
        echo "    <news:news>\n";
        echo "      <news:publication>\n";
        echo '        <news:name>' . wp_news_sitemap_escape($publisher) . "</news:name>\n";
        echo "        <news:language>hy</news:language>\n";
        echo "      </news:publication>\n";
        echo '      <news:publication_date>' . wp_news_sitemap_escape($published) . "</news:publication_date>\n";
        echo '      <news:title>' . wp_news_sitemap_escape($title) . "</news:title>\n";
        echo "    </news:news>\n";
    }
    echo "  </url>\n";
}
echo "</urlset>\n";
