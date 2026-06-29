<?php
declare(strict_types=1);
require_once __DIR__ . '/runtime_config.php';

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

// Default Meta
$title = "Worship Platform";
$description = "Worship Platform - Equip your worship team with chord charts, setlists, and collaboration tools.";
$ogImage = "https://worship.pmstudio.am/user_uploaded_logo.png"; // Using the new logo
$canonical = "https://worship.pmstudio.am" . $path;

$schemas = [];

// Base Organization Schema (GEO & AEO)
$schemas[] = [
    "@context" => "https://schema.org",
    "@type" => "Organization",
    "name" => "Word of Life Worship",
    "url" => "https://worship.pmstudio.am/",
    "logo" => "https://worship.pmstudio.am/user_uploaded_logo.png",
    "sameAs" => [],
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

// Base WebApplication Schema
$schemas[] = [
    "@context" => "https://schema.org",
    "@type" => "WebApplication",
    "name" => "Worship Platform",
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
            $title = htmlspecialchars($cleanTitle);
            
            $snippet = mb_substr(trim(strip_tags($song['lyrics'] ?? '')), 0, 150);
            if ($snippet) {
                $description = htmlspecialchars($snippet . '...');
            } else {
                $description = htmlspecialchars("Chords and lyrics for " . strip_tags($songTitle) . " by " . strip_tags($artist) . " on the Worship Platform.");
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

// Generate Meta Tags
$metaTags = "
    <title>{$title}</title>
    <meta name=\"description\" content=\"{$description}\" />
    <link rel=\"canonical\" href=\"{$canonical}\" />
    <meta property=\"og:title\" content=\"{$title}\" />
    <meta property=\"og:description\" content=\"{$description}\" />
    <meta property=\"og:image\" content=\"{$ogImage}\" />
    <meta property=\"og:url\" content=\"{$canonical}\" />
    <meta property=\"og:type\" content=\"website\" />
    <meta name=\"twitter:card\" content=\"summary_large_image\" />
    <meta name=\"twitter:title\" content=\"{$title}\" />
    <meta name=\"twitter:description\" content=\"{$description}\" />
    <meta name=\"twitter:image\" content=\"{$ogImage}\" />
";

// Inject Schemas
$schemaTags = '';
if (!empty($schemas)) {
    foreach ($schemas as $schema) {
        $schemaJson = json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $schemaTags .= "<script type=\"application/ld+json\">\n{$schemaJson}\n</script>\n";
    }
}

// Replace in HTML
// Remove original title and description to prevent duplicates
$htmlContent = preg_replace('/<title>.*?<\/title>/is', '', $htmlContent);
$htmlContent = preg_replace('/<meta name="description".*?>/is', '', $htmlContent);

// Inject right before </head>
$injection = $metaTags . "\n" . $schemaTags . "\n</head>";
$htmlContent = str_ireplace('</head>', $injection, $htmlContent);

echo $htmlContent;
