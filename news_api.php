<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/news_repository.php';

function wp_news_out(array $payload, int $code = 200): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$action = (string)($_GET['action'] ?? 'list');
$lang = wp_news_lang((string)($_GET['lang'] ?? 'hy'));

try {
    $pdo = wp_news_pdo();
} catch (Throwable $e) {
    wp_news_out(['ok' => false, 'error' => 'DB connection failed'], 500);
}

if ($action === 'list') {
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 20)));
    $featuredOnly = !empty($_GET['featured']);

    $sql = "
        SELECT *
        FROM news_articles
        WHERE status = 'published'
          AND (published_at IS NULL OR published_at <= NOW())
    ";
    if ($featuredOnly) {
        $sql .= " AND is_featured = 1 ";
    }
    $sql .= " ORDER BY is_featured DESC, sort_order ASC, COALESCE(published_at, created_at) DESC, id DESC LIMIT :limit";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $items = array_map(
        static fn(array $row): array => wp_news_localized($row, $lang),
        $stmt->fetchAll(PDO::FETCH_ASSOC)
    );

    wp_news_out(['ok' => true, 'articles' => $items]);
}

if ($action === 'detail') {
    $slug = trim((string)($_GET['slug'] ?? ''));
    if ($slug === '') {
        wp_news_out(['ok' => false, 'error' => 'Missing slug'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT *
        FROM news_articles
        WHERE slug = ?
          AND status = 'published'
          AND (published_at IS NULL OR published_at <= NOW())
        LIMIT 1
    ");
    $stmt->execute([$slug]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        wp_news_out(['ok' => false, 'error' => 'Not found'], 404);
    }

    wp_news_out(['ok' => true, 'article' => wp_news_localized($row, $lang)]);
}

wp_news_out(['ok' => false, 'error' => 'Unknown action'], 400);
