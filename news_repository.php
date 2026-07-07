<?php
declare(strict_types=1);

require_once __DIR__ . '/runtime_config.php';

function wp_news_pdo(): PDO {
    $pdo = wp_runtime_open_pdo();
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    wp_news_ensure_schema($pdo);
    wp_news_seed_defaults($pdo);
    return $pdo;
}

function wp_news_ensure_schema(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS news_articles (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(180) NOT NULL UNIQUE,
            status ENUM('draft','published') NOT NULL DEFAULT 'draft',
            is_featured TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            image_url VARCHAR(500) NULL,
            published_at DATETIME NULL,
            title_hy VARCHAR(255) NOT NULL DEFAULT '',
            title_en VARCHAR(255) NOT NULL DEFAULT '',
            title_ru VARCHAR(255) NOT NULL DEFAULT '',
            excerpt_hy TEXT NULL,
            excerpt_en TEXT NULL,
            excerpt_ru TEXT NULL,
            content_hy MEDIUMTEXT NULL,
            content_en MEDIUMTEXT NULL,
            content_ru MEDIUMTEXT NULL,
            tag_hy VARCHAR(120) NOT NULL DEFAULT '',
            tag_en VARCHAR(120) NOT NULL DEFAULT '',
            tag_ru VARCHAR(120) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_news_status_date (status, published_at),
            INDEX idx_news_featured (is_featured, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function wp_news_seed_defaults(PDO $pdo): void {
    $count = (int)$pdo->query("SELECT COUNT(*) FROM news_articles")->fetchColumn();
    if ($count > 0) {
        return;
    }

    $items = [
        [
            'slug' => 'dynamic-transposition',
            'published_at' => '2024-04-12 09:00:00',
            'image_url' => 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200',
            'tag_hy' => 'Թարմացում',
            'tag_en' => 'Update',
            'tag_ru' => 'Обновление',
            'title_hy' => 'Նոր հնարավորություն՝ դինամիկ տոնայնություն',
            'title_en' => 'New Feature: Dynamic Transposition',
            'title_ru' => 'Новая функция: динамическая транспозиция',
            'excerpt_hy' => 'Այժմ կարող եք փոխել երգի տոնայնությունը մեկ քլիքով՝ առանց ակորդները ձեռքով վերաշարելու։',
            'excerpt_en' => 'Transpose any song instantly without manually rewriting chord sheets.',
            'excerpt_ru' => 'Меняйте тональность песни одним нажатием без ручной правки аккордов.',
            'content_hy' => "Նոր transposition գործիքը օգնում է արագ պատրաստել երգերը տարբեր ձայնային տիրույթների համար։\n\nԵրգի դիտման էջում կարող եք ընտրել ցանկալի տոնայնությունը, իսկ ակորդները կթարմացվեն անմիջապես։",
            'content_en' => "The new transposition tool helps prepare songs for different vocal ranges quickly.\n\nOpen a song, choose the desired key, and chords update immediately.",
            'content_ru' => "Новый инструмент транспозиции помогает быстро готовить песни под разные вокальные диапазоны.\n\nОткройте песню, выберите тональность, и аккорды обновятся сразу.",
        ],
        [
            'slug' => 'setlist-planning-guide',
            'published_at' => '2024-04-28 09:00:00',
            'image_url' => 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
            'tag_hy' => 'Ուղեցույց',
            'tag_en' => 'Guide',
            'tag_ru' => 'Руководство',
            'title_hy' => 'Երգացանկերի պլանավորման գաղտնիքները',
            'title_en' => 'Mastering Your Setlist Planning',
            'title_ru' => 'Секреты планирования сет-листа',
            'excerpt_hy' => 'Ինչպես արագ հավաքել ծառայության երգացանկը և պահել թիմի աշխատանքը նույն տեղում։',
            'excerpt_en' => 'Build service setlists faster and keep the team aligned in one place.',
            'excerpt_ru' => 'Как быстрее собирать сет-листы и держать команду в одном рабочем пространстве.',
            'content_hy' => "Լավ երգացանկը միայն երգերի ցուցակ չէ․ այն ծառայության ընթացքն է։\n\nՕգտագործեք setlist-երը երգերը դասավորելու, տոնայնությունները պահելու և թիմի հետ կիսվելու համար։",
            'content_en' => "A strong setlist is more than a list of songs; it shapes the flow of the service.\n\nUse setlists to order songs, save keys, and share plans with the team.",
            'content_ru' => "Хороший сет-лист - это не просто список песен, а логика служения.\n\nИспользуйте сет-листы, чтобы упорядочить песни, сохранить тональности и делиться планом с командой.",
        ],
        [
            'slug' => 'collaborate-with-friends',
            'published_at' => '2024-05-18 09:00:00',
            'image_url' => 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200',
            'tag_hy' => 'Համագործակցություն',
            'tag_en' => 'Collaboration',
            'tag_ru' => 'Совместная работа',
            'title_hy' => 'Համագործակցեք ընկերների և թիմի հետ',
            'title_en' => 'Collaborate With Friends and Team Members',
            'title_ru' => 'Работайте вместе с друзьями и командой',
            'excerpt_hy' => 'Կիսվեք երգերով, երգացանկերով և նշումներով՝ չկորցնելով աշխատանքի ընթացքը։',
            'excerpt_en' => 'Share songs, setlists, and notes without losing the flow of preparation.',
            'excerpt_ru' => 'Делитесь песнями, сет-листами и заметками, не теряя ход подготовки.',
            'content_hy' => "Ընկերների և չաթի համակարգը օգնում է երգերը քննարկել հենց հարթակի ներսում։\n\nՍա նվազեցնում է տարբեր հավելվածների միջև անցումները և պահում է ծառայության նյութերը նույն տեղում։",
            'content_en' => "Friends and chat features help discuss songs inside the platform itself.\n\nThis reduces switching between apps and keeps worship materials together.",
            'content_ru' => "Функции друзей и чата помогают обсуждать песни прямо внутри платформы.\n\nЭто уменьшает переключение между приложениями и хранит материалы служения вместе.",
        ],
    ];

    $stmt = $pdo->prepare("
        INSERT INTO news_articles (
            slug, status, is_featured, sort_order, image_url, published_at,
            title_hy, title_en, title_ru, excerpt_hy, excerpt_en, excerpt_ru,
            content_hy, content_en, content_ru, tag_hy, tag_en, tag_ru
        ) VALUES (
            :slug, 'published', 1, :sort_order, :image_url, :published_at,
            :title_hy, :title_en, :title_ru, :excerpt_hy, :excerpt_en, :excerpt_ru,
            :content_hy, :content_en, :content_ru, :tag_hy, :tag_en, :tag_ru
        )
    ");

    foreach ($items as $index => $item) {
        $item['sort_order'] = $index + 1;
        $stmt->execute($item);
    }
}

function wp_news_lang(string $lang): string {
    return in_array($lang, ['hy', 'am', 'en', 'ru'], true) ? ($lang === 'am' ? 'hy' : $lang) : 'hy';
}

function wp_news_localized(array $row, string $lang): array {
    $lang = wp_news_lang($lang);
    $fallback = $lang === 'hy' ? 'en' : 'hy';
    $pick = static function (array $row, string $field) use ($lang, $fallback): string {
        $value = trim((string)($row[$field . '_' . $lang] ?? ''));
        if ($value !== '') return $value;
        $fallbackValue = trim((string)($row[$field . '_' . $fallback] ?? ''));
        if ($fallbackValue !== '') return $fallbackValue;
        return trim((string)($row[$field . '_en'] ?? ''));
    };

    return [
        'id' => (int)$row['id'],
        'slug' => (string)$row['slug'],
        'status' => (string)$row['status'],
        'is_featured' => (int)$row['is_featured'] === 1,
        'image_url' => (string)($row['image_url'] ?? ''),
        'published_at' => (string)($row['published_at'] ?? ''),
        'date' => (string)($row['published_at'] ?? ''),
        'tag' => $pick($row, 'tag'),
        'title' => $pick($row, 'title'),
        'excerpt' => $pick($row, 'excerpt'),
        'content' => $pick($row, 'content'),
    ];
}

function wp_news_slugify(string $value): string {
    $value = trim(mb_strtolower($value));
    $value = preg_replace('/[^\p{L}\p{N}]+/u', '-', $value) ?: '';
    $value = trim($value, '-');
    return $value !== '' ? mb_substr($value, 0, 160) : 'news-' . time();
}

function wp_news_unique_slug(PDO $pdo, string $slug, int $ignoreId = 0): string {
    $base = wp_news_slugify($slug);
    $candidate = $base;
    $suffix = 2;
    while (true) {
        $sql = "SELECT id FROM news_articles WHERE slug = ?";
        $params = [$candidate];
        if ($ignoreId > 0) {
            $sql .= " AND id <> ?";
            $params[] = $ignoreId;
        }
        $stmt = $pdo->prepare($sql . " LIMIT 1");
        $stmt->execute($params);
        if (!$stmt->fetchColumn()) {
            return $candidate;
        }
        $candidate = $base . '-' . $suffix++;
    }
}
