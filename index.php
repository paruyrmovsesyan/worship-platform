<?php
declare(strict_types=1);
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/news_repository.php';

$config = wp_version_load();

$htmlPath = __DIR__ . '/index.html';
if (!file_exists($htmlPath)) {
    http_response_code(404);
    die('Index not found');
}
$htmlContent = file_get_contents($htmlPath);

$uri = $_SERVER['REQUEST_URI'];
$parsedUrl = parse_url($uri);
$path = $parsedUrl['path'] ?? '/';
$query = [];
if (!empty($parsedUrl['query'])) {
    parse_str($parsedUrl['query'], $query);
}

// Ensure unknown routes return a 404 status code (fixes search engine Soft 404 errors).
$validStaticRoutes = [
    '/', '/login', '/register', '/songs', '/transpose', '/setlists', '/setlists/public', 
    '/setlist_public.html', '/favorites', '/news', '/friends', '/chats', '/community', 
    '/resources', '/contact', '/about', '/blog', '/careers', '/documentation', '/tutorials', 
    '/support', '/privacy', '/terms', '/cookies', '/profile', '/settings', '/song-request', 
    '/notifications', '/manifest.json', '/robots.txt', '/sitemap.xml', '/news-sitemap.xml',
    '/offline.html', '/main.html', '/service-worker.js'
];
$isValidRoute = in_array($path, $validStaticRoutes, true)
    || preg_match('#^/song/\d+/?$#', $path)
    || preg_match('#^/news/[^/]+/?$#', $path)
    || preg_match('#^/setlists/\d+(?:/(?:edit|live))?/?$#', $path)
    || preg_match('#^/chat/\d+/?$#', $path)
    || preg_match('#\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot|mp4|webm)$#i', $path)
    || strpos($path, '/api/') === 0
    || strpos($path, '/admin') === 0; // fallback just in case, though admin should bypass index.php

if (!$isValidRoute) {
    http_response_code(404);
}

// Default Meta
$siteName = $config['site_seo_name'] ?: 'Worship Platform';
$title = $config['site_seo_title'] ?: "Worship Platform";
$description = $config['site_seo_description'] ?: "Worship Platform - Equip your worship team with chord charts, setlists, and collaboration tools.";
$keywords = (string)($config['site_seo_keywords'] ?? '');
$logo = $config['site_seo_logo'] ?: "https://worship.pmstudio.am/user_uploaded_logo.png";
$ogImage = $config['site_seo_image'] ?: "https://worship.pmstudio.am/og-image.png";
$canonical = "https://worship.pmstudio.am" . $path;
$ogType = 'website';
$article = null;

$schemas = [];

// Base Organization Schema (GEO & AEO)
$schemas[] = [
    "@context" => "https://schema.org",
    "@type" => "Organization",
    "name" => $siteName,
    "url" => "https://worship.pmstudio.am/",
    "logo" => $logo,
    "sameAs" => array_values(array_filter([
        $config['site_social_facebook'] ?? '',
        $config['site_social_instagram'] ?? '',
        $config['site_social_youtube'] ?? '',
    ])),
    "location" => [
        "@type" => "Place",
        "name" => "Word of Life Armenia",
        "address" => [
            "@type" => "PostalAddress",
            "addressLocality" => "Yerevan",
            "addressCountry" => "AM"
        ]
    ]
];

// Explicit site-name signal for search result title generation.
$schemas[] = [
    "@context" => "https://schema.org",
    "@type" => "WebSite",
    "@id" => "https://worship.pmstudio.am/#website",
    "url" => "https://worship.pmstudio.am/",
    "name" => $siteName,
    "alternateName" => $siteName,
];

// Base WebApplication Schema
$schemas[] = [
    "@context" => "https://schema.org",
    "@type" => "WebApplication",
    "name" => $siteName,
    "url" => "https://worship.pmstudio.am/",
    "applicationCategory" => "MusicApplication",
    "operatingSystem" => "Any",
    "offers" => [
        "@type" => "Offer",
        "price" => "0",
        "priceCurrency" => "AMD"
    ],
    "aggregateRating" => [
        "@type" => "AggregateRating",
        "ratingValue" => "5.0",
        "ratingCount" => "24"
    ]
];

// Server-rendered metadata for transpose tool.
if (in_array($path, ['/transpose', '/transpose/', '/transpose.html'], true) || preg_match('#^/transpose(?:/|$)#i', $path)) {
    $title = "Ակորդների Տրանսպոզիցիայի Գործիք | " . $siteName;
    $description = "Օնլայն ակորդների տրանսպոզիցիայի գործիք պաշտամունքի երաժիշտների և թիմերի համար։ Հեշտությամբ փոխեք երգերի տոնայնությունը (Key) և ակորդները։";
    $keywords = "ակորդների տրանսպոզիցիա, տոնայնության փոփոխում, chord transpose tool, worship chords, online transpose, " . $keywords;
    
    $schemas[] = [
        "@context" => "https://schema.org",
        "@type" => "SoftwareApplication",
        "name" => "Ակորդների Տրանսպոզիցիայի Գործիք",
        "operatingSystem" => "All",
        "applicationCategory" => "MultimediaApplication",
        "offers" => [
            "@type" => "Offer",
            "price" => "0",
            "priceCurrency" => "AMD"
        ]
    ];
}

// Server-rendered metadata for public news articles. This is what crawlers see
// before the React application starts.
if (preg_match('#^/news/([^/]+)/?$#', $path, $newsMatch)) {
    try {
        $pdo = wp_news_pdo();
        $stmt = $pdo->prepare("
            SELECT * FROM news_articles
            WHERE slug = ? AND status = 'published'
              AND (published_at IS NULL OR published_at <= NOW())
            LIMIT 1
        ");
        $stmt->execute([rawurldecode($newsMatch[1])]);
        $newsRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($newsRow) {
            $lang = wp_news_lang((string)($query['lang'] ?? 'hy'));
            $article = wp_news_localized($newsRow, $lang);
            $title = $article['title'] . ' | ' . $siteName;
            $description = $article['excerpt'] ?: mb_substr(trim(strip_tags($article['content'])), 0, 160);
            $ogImage = $article['image_url'] ?: $ogImage;
            $ogType = 'article';
            $publishedIso = !empty($article['published_at']) ? date(DATE_ATOM, strtotime($article['published_at'])) : '';
            $modifiedIso = !empty($newsRow['updated_at']) ? date(DATE_ATOM, strtotime((string)$newsRow['updated_at'])) : $publishedIso;
            $schemas[] = [
                '@context' => 'https://schema.org',
                '@type' => 'NewsArticle',
                'mainEntityOfPage' => ['@type' => 'WebPage', '@id' => $canonical],
                'headline' => $article['title'],
                'description' => $description,
                'image' => [$ogImage],
                'datePublished' => $publishedIso,
                'dateModified' => $modifiedIso,
                'author' => [
                    '@type' => 'Organization',
                    'name' => $config['site_seo_default_author'] ?: $siteName,
                ],
                'publisher' => [
                    '@type' => 'Organization',
                    'name' => $config['site_seo_news_publisher'] ?: $siteName,
                    'logo' => [
                        '@type' => 'ImageObject',
                        'url' => $config['site_seo_news_logo'] ?: $logo,
                    ],
                ],
            ];
        }
    } catch (Throwable $e) {
        // Keep the application available with the global metadata.
    }
} elseif ($path === '/news' || $path === '/news/' || $path === '/news.html') {
    $title = 'Նորություններ | ' . $siteName;
    $description = 'Worship Platform-ի վերջին նորությունները, թարմացումները և օգտակար նյութերը։';
}

// Check if it's a song view
$songId = null;
if (strpos($path, '/song_view.html') !== false && !empty($query['id'])) {
    $songId = (int)$query['id'];
} elseif (preg_match('#^/song/(\d+)#', $path, $m)) { // If they use nice urls later
    $songId = (int)$m[1];
}

if ($songId) {
    try {
        $pdo = wp_runtime_open_pdo();
        $stmt = $pdo->prepare("SELECT id, title, title_hy, title_en, title_ru, artist, lyrics FROM songs WHERE id = ? LIMIT 1");
        $stmt->execute([$songId]);
        $song = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($song) {
            $songTitle = $song['title'] ?: $song['title_hy'] ?: $song['title_en'] ?: 'Unknown Song';
            $artist = $song['artist'] ?: 'Unknown Artist';
            $cleanTitle = strip_tags($songTitle . ' - ' . $artist . ' | Worship Platform');
            $title = $cleanTitle;
            
            $snippet = mb_substr(trim(strip_tags($song['lyrics'] ?? '')), 0, 150);
            if ($snippet) {
                $description = $snippet . '...';
            } else {
                $description = "Chords and lyrics for " . strip_tags($songTitle) . " by " . strip_tags($artist) . " on the Worship Platform.";
            }
            
            // MusicComposition Schema (AEO)
            $schemas[] = [
                "@context" => "https://schema.org",
                "@type" => "MusicComposition",
                "name" => $songTitle,
                "composer" => [
                    "@type" => "Person",
                    "name" => $artist
                ],
                "lyrics" => [
                    "@type" => "CreativeWork",
                    "text" => mb_substr(trim(strip_tags($song['lyrics'] ?? '')), 0, 500)
                ]
            ];
        }
    } catch (Throwable $e) {
        // ignore DB errors, fallback to default meta
    }
}

$shouldIndex = true;
if ($path === '/' || $path === '') {
    $shouldIndex = !empty($config['site_seo_index_home']);
} elseif ($songId) {
    $shouldIndex = !empty($config['site_seo_index_song_pages']);
} elseif (strpos($path, '/song_view.html') !== false || preg_match('#^/song(?:/|$)#', $path)) {
    $shouldIndex = false; // Never index blank song view shells without an ID
} elseif (in_array($path, ['/songs', '/songs/', '/songs.html', '/main.html'], true)) {
    $shouldIndex = !empty($config['site_seo_index_songs']);
} elseif (preg_match('#^/news/[^/]+/?$#', $path)) {
    $shouldIndex = !empty($config['site_seo_index_news_articles']);
} elseif (in_array($path, ['/news', '/news/', '/news.html'], true)) {
    $shouldIndex = !empty($config['site_seo_index_news']);
} elseif (in_array($path, ['/transpose', '/transpose/', '/transpose.html'], true) || preg_match('#^/transpose(?:/|$)#i', $path)) {
    $shouldIndex = !empty($config['site_seo_index_transpose']);
}
$robotsContent = $shouldIndex
    ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    : 'noindex,follow';

$metaEscape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safeTitle = $metaEscape((string)$title);
$safeDescription = $metaEscape((string)$description);
$safeKeywords = $metaEscape($keywords);
$safeCanonical = $metaEscape($canonical);
$safeOgImage = $metaEscape((string)$ogImage);

// Generate standards-based tags used by Google, Bing, Yandex and social crawlers.
$metaTags = "
    <title>{$safeTitle}</title>
    <meta name=\"application-name\" content=\"" . $metaEscape($siteName) . "\" />
    <meta name=\"description\" content=\"{$safeDescription}\" />
    <meta name=\"keywords\" content=\"{$safeKeywords}\" />
    <meta name=\"robots\" content=\"{$robotsContent}\" />
    <link rel=\"canonical\" href=\"{$safeCanonical}\" />
    <meta property=\"og:site_name\" content=\"" . $metaEscape($siteName) . "\" />
    <meta property=\"og:title\" content=\"{$safeTitle}\" />
    <meta property=\"og:description\" content=\"{$safeDescription}\" />
    <meta property=\"og:image\" content=\"{$safeOgImage}\" />
    <meta property=\"og:url\" content=\"{$safeCanonical}\" />
    <meta property=\"og:type\" content=\"{$ogType}\" />
    <meta name=\"twitter:card\" content=\"summary_large_image\" />
    <meta name=\"twitter:title\" content=\"{$safeTitle}\" />
    <meta name=\"twitter:description\" content=\"{$safeDescription}\" />
    <meta name=\"twitter:image\" content=\"{$safeOgImage}\" />
";
if (!empty($config['site_seo_google_verification'])) {
    $metaTags .= '<meta name="google-site-verification" content="' . $metaEscape((string)$config['site_seo_google_verification']) . "\" />\n";
}
if (!empty($config['site_seo_bing_verification'])) {
    $metaTags .= '<meta name="msvalidate.01" content="' . $metaEscape((string)$config['site_seo_bing_verification']) . "\" />\n";
}
if (!empty($config['site_seo_yandex_verification'])) {
    $metaTags .= '<meta name="yandex-verification" content="' . $metaEscape((string)$config['site_seo_yandex_verification']) . "\" />\n";
}
if ($article) {
    $metaTags .= '<meta property="article:published_time" content="' . $metaEscape($publishedIso) . "\" />\n";
    $metaTags .= '<meta property="article:modified_time" content="' . $metaEscape($modifiedIso) . "\" />\n";
}

// Inject Schemas
$schemaTags = '';
if (!empty($schemas)) {
    foreach ($schemas as $schema) {
        $schemaJson = json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $schemaTags .= "<script type=\"application/ld+json\">\n{$schemaJson}\n</script>\n";
    }
}

$siteConfig = [
    'contactEmail' => $config['site_contact_email'] ?? 'info@worship.pmstudio.am',
    'contactPhone' => $config['site_contact_phone'] ?? '+374 00 000000',
    'contactAddress' => $config['site_contact_address'] ?? 'Երևան, Հայաստան',
    'socialFacebook' => $config['site_social_facebook'] ?? '',
    'socialInstagram' => $config['site_social_instagram'] ?? '',
    'socialYoutube' => $config['site_social_youtube'] ?? '',
];
$configScript = "<script>window.SITE_CONFIG = " . json_encode($siteConfig, JSON_UNESCAPED_UNICODE) . ";</script>";

// Replace in HTML
// Remove build-time SEO tags to prevent duplicates.
$htmlContent = preg_replace('/<title>.*?<\/title>/is', '', $htmlContent);
$htmlContent = preg_replace('/\s*<meta\s+(?:name|property)="(?:application-name|description|keywords|robots|google-site-verification|msvalidate\.01|yandex-verification|og:[^"]+|twitter:[^"]+)"[^>]*>/i', '', $htmlContent);
$htmlContent = preg_replace('/\s*<link\s+rel="canonical"[^>]*>/i', '', $htmlContent);

// Inject right before </head>
$injection = $configScript . "\n" . $metaTags . "\n" . $schemaTags . "\n</head>";
$htmlContent = str_ireplace('</head>', $injection, $htmlContent);

echo $htmlContent;
