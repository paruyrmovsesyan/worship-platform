<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/news_repository.php';
require_once __DIR__ . '/push_service.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_news.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: /admin_news.php');
    exit;
}

$pdo = wp_news_pdo();
$message = '';
$messageType = 'success';

function admin_news_value(array $source, string $key): string {
    return trim((string)($source[$key] ?? ''));
}

function admin_news_push_payload(array $article, string $actor): array {
    $title = (string)($article['title_hy'] ?: $article['title_en'] ?: $article['title_ru'] ?: 'Նոր հրապարակում');
    $excerpt = (string)($article['excerpt_hy'] ?: $article['excerpt_en'] ?: $article['excerpt_ru'] ?: 'Կարդացեք նոր հրապարակումը Worship Platform-ում։');
    $version = trim((string)($article['release_version'] ?? ''));
    $body = ($version !== '' ? ('v' . ltrim($version, 'vV') . ' • ') : '') . $excerpt;

    return [
        'title' => mb_substr($title, 0, 120),
        'body' => mb_substr($body, 0, 240),
        'url' => '/news/' . rawurlencode((string)$article['slug']),
        'icon' => '/wolarm_youth.png',
        'tag' => 'worship-news-' . (string)$article['slug'],
        'actor' => $actor !== '' ? $actor : 'admin',
    ];
}

function admin_news_store_image_upload(array $file): array {
    $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        return ['ok' => true, 'url' => ''];
    }
    if ($error !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'message' => 'Նկարի բեռնումը չհաջողվեց (կոդ ' . $error . ')։'];
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    $size = (int)($file['size'] ?? 0);
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return ['ok' => false, 'message' => 'Բեռնված նկարի ժամանակավոր ֆայլը հասանելի չէ։'];
    }
    if ($size <= 0 || $size > 10 * 1024 * 1024) {
        return ['ok' => false, 'message' => 'Նկարի չափը պետք է լինի առավելագույնը 10 MB։'];
    }

    $mime = '';
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = (string)$finfo->file($tmpPath);
    }
    if ($mime === '' && function_exists('getimagesize')) {
        $imageInfo = @getimagesize($tmpPath);
        $mime = is_array($imageInfo) ? (string)($imageInfo['mime'] ?? '') : '';
    }

    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($extensions[$mime])) {
        return ['ok' => false, 'message' => 'Թույլատրվում են միայն JPEG, PNG կամ WebP նկարներ։'];
    }

    $uploadDir = __DIR__ . '/uploads/news';
    if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        return ['ok' => false, 'message' => 'Չհաջողվեց ստեղծել նորությունների նկարների պանակը։'];
    }
    if (!is_writable($uploadDir)) {
        return ['ok' => false, 'message' => 'uploads/news պանակը գրելու թույլտվություն չունի։'];
    }

    try {
        $randomPart = bin2hex(random_bytes(5));
    } catch (Throwable $error) {
        $randomPart = substr(sha1(uniqid('', true)), 0, 10);
    }
    $filename = 'news-' . date('Ymd-His') . '-' . $randomPart . '.' . $extensions[$mime];
    $destination = $uploadDir . '/' . $filename;
    if (!move_uploaded_file($tmpPath, $destination)) {
        return ['ok' => false, 'message' => 'Չհաջողվեց նկարը պահպանել uploads/news պանակում։'];
    }
    @chmod($destination, 0644);

    return ['ok' => true, 'url' => '/uploads/news/' . $filename];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'save') {
        $id = (int)($_POST['id'] ?? 0);
        $previousStatus = null;
        if ($id > 0) {
            $previousStmt = $pdo->prepare('SELECT status FROM news_articles WHERE id = ? LIMIT 1');
            $previousStmt->execute([$id]);
            $previousStatus = $previousStmt->fetchColumn();
        }
        $titleHy = admin_news_value($_POST, 'title_hy');
        $baseSlug = admin_news_value($_POST, 'slug');
        if ($baseSlug === '') {
            $baseSlug = $titleHy !== '' ? $titleHy : admin_news_value($_POST, 'title_en');
        }

        if ($titleHy === '' && admin_news_value($_POST, 'title_en') === '' && admin_news_value($_POST, 'title_ru') === '') {
            $message = 'Գոնե մեկ լեզվով վերնագիր լրացրեք։';
            $messageType = 'error';
        } else {
            $slug = wp_news_unique_slug($pdo, $baseSlug, $id);
            $status = in_array(($_POST['status'] ?? 'draft'), ['draft', 'published'], true) ? (string)$_POST['status'] : 'draft';
            $publishedAt = admin_news_value($_POST, 'published_at');
            if ($publishedAt !== '') {
                $publishedAt = str_replace('T', ' ', $publishedAt);
                if (strlen($publishedAt) === 16) $publishedAt .= ':00';
            } else {
                $publishedAt = date('Y-m-d H:i:s');
            }

            $imageUpload = admin_news_store_image_upload($_FILES['news_image_file'] ?? []);
            if (empty($imageUpload['ok'])) {
                $message = (string)($imageUpload['message'] ?? 'Նկարի բեռնումը չհաջողվեց։');
                $messageType = 'error';
            } else {
                $imageUrl = trim((string)($imageUpload['url'] ?? '')) ?: admin_news_value($_POST, 'image_url');
                $payload = [
                    'slug' => $slug,
                    'status' => $status,
                    'is_featured' => !empty($_POST['is_featured']) ? 1 : 0,
                    'sort_order' => (int)($_POST['sort_order'] ?? 0),
                    'image_url' => $imageUrl,
                    'published_at' => $publishedAt,
                    'release_version' => mb_substr(admin_news_value($_POST, 'release_version'), 0, 60),
                    'title_hy' => admin_news_value($_POST, 'title_hy'),
                    'title_en' => admin_news_value($_POST, 'title_en'),
                    'title_ru' => admin_news_value($_POST, 'title_ru'),
                    'excerpt_hy' => admin_news_value($_POST, 'excerpt_hy'),
                    'excerpt_en' => admin_news_value($_POST, 'excerpt_en'),
                    'excerpt_ru' => admin_news_value($_POST, 'excerpt_ru'),
                    'content_hy' => admin_news_value($_POST, 'content_hy'),
                    'content_en' => admin_news_value($_POST, 'content_en'),
                    'content_ru' => admin_news_value($_POST, 'content_ru'),
                    'tag_hy' => admin_news_value($_POST, 'tag_hy'),
                    'tag_en' => admin_news_value($_POST, 'tag_en'),
                    'tag_ru' => admin_news_value($_POST, 'tag_ru'),
                ];

                if ($id > 0) {
                    $payload['id'] = $id;
                    $stmt = $pdo->prepare("
                        UPDATE news_articles SET
                            slug = :slug, status = :status, is_featured = :is_featured, sort_order = :sort_order,
                            image_url = :image_url, published_at = :published_at, release_version = :release_version,
                            title_hy = :title_hy, title_en = :title_en, title_ru = :title_ru,
                            excerpt_hy = :excerpt_hy, excerpt_en = :excerpt_en, excerpt_ru = :excerpt_ru,
                            content_hy = :content_hy, content_en = :content_en, content_ru = :content_ru,
                            tag_hy = :tag_hy, tag_en = :tag_en, tag_ru = :tag_ru
                        WHERE id = :id
                    ");
                    $stmt->execute($payload);
                    $message = 'Նորությունը թարմացվեց։';
                } else {
                    $stmt = $pdo->prepare("
                        INSERT INTO news_articles (
                            slug, status, is_featured, sort_order, image_url, published_at, release_version,
                            title_hy, title_en, title_ru, excerpt_hy, excerpt_en, excerpt_ru,
                            content_hy, content_en, content_ru, tag_hy, tag_en, tag_ru
                        ) VALUES (
                            :slug, :status, :is_featured, :sort_order, :image_url, :published_at, :release_version,
                            :title_hy, :title_en, :title_ru, :excerpt_hy, :excerpt_en, :excerpt_ru,
                            :content_hy, :content_en, :content_ru, :tag_hy, :tag_en, :tag_ru
                        )
                    ");
                    $stmt->execute($payload);
                    $message = 'Նորությունը ավելացվեց։';
                }

                $isFirstPublish = $status === 'published' && ($id === 0 || $previousStatus !== 'published');
                if ($isFirstPublish) {
                    $pushResult = wp_push_send_notification(admin_news_push_payload($payload, $adminDisplayName));
                    if (!empty($pushResult['ok'])) {
                        $message .= ' Push ծանուցումը ուղարկվեց բոլոր ակտիվ սարքերին։';
                    } else {
                        $message .= ' Push ծանուցումը չուղարկվեց․ ' . (string)($pushResult['message'] ?? 'անհայտ սխալ') . '։';
                        $messageType = 'warning';
                    }
                }
            }
        }
    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare("DELETE FROM news_articles WHERE id = ?");
            $stmt->execute([$id]);
            $message = 'Նորությունը ջնջվեց։';
        }
    }

    header('Location: /admin_news.php' . ($message ? '?msg=' . urlencode($message) . '&type=' . urlencode($messageType) : ''));
    exit;
}

if (isset($_GET['msg'])) {
    $message = (string)$_GET['msg'];
    $messageType = (string)($_GET['type'] ?? 'success');
}

$editItem = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare("SELECT * FROM news_articles WHERE id = ? LIMIT 1");
    $stmt->execute([(int)$_GET['edit']]);
    $editItem = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

$articles = $pdo->query("SELECT * FROM news_articles ORDER BY COALESCE(published_at, created_at) DESC, id DESC")->fetchAll(PDO::FETCH_ASSOC);
$activePage = 'news';
$searchPlaceholder = 'Search news...';
$publishedValue = $editItem && !empty($editItem['published_at']) ? str_replace(' ', 'T', substr((string)$editItem['published_at'], 0, 16)) : date('Y-m-d\TH:i');
?>
<!doctype html>
<html lang="hy">
<head>
  <?php wp_admin_render_pwa_head('News — Worship Platform Admin'); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .news-form { background: var(--surface); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); margin-bottom: 28px; }
    .news-grid-form { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:16px; }
    .field { display:flex; flex-direction:column; gap:7px; margin-bottom:14px; }
    .field label { font-size:12px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.4px; }
    .field input, .field select, .field textarea { padding:11px 13px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text); font:inherit; outline:none; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color:var(--primary); background:#fff; }
    .field textarea { min-height:92px; resize:vertical; }
    .field textarea.content { min-height:170px; }
    .news-item { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px; margin-bottom:12px; display:flex; gap:16px; justify-content:space-between; align-items:flex-start; box-shadow:var(--shadow-sm); }
    .news-thumb { width:96px; height:68px; border-radius:12px; background:linear-gradient(135deg,#1C1C34,#2C2C54); background-size:cover; background-position:center; flex-shrink:0; }
    .news-title { font-weight:800; color:var(--text); margin-bottom:6px; }
    .news-meta { font-size:12px; color:var(--muted); display:flex; gap:8px; flex-wrap:wrap; }
    .pill { display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:800; background:#eef2ff; color:#3730a3; }
    .pill.draft { background:#f1f5f9; color:#475569; }
    .pill.pub { background:#dcfce7; color:#166534; }
    @media (max-width: 900px) { .news-grid-form { grid-template-columns:1fr; } .news-item { flex-direction:column; } }
  </style>
</head>
<body>
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>
  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>
    <div class="app-content">
      <div class="page-heading page-heading-row">
        <div>
          <h1>Նորություններ</h1>
          <p><?= count($articles) ?> գրառում</p>
        </div>
        <a class="btn" href="/news" target="_blank">Տեսնել կայքում</a>
      </div>

      <?php if ($message): ?>
        <div style="background:<?= $messageType === 'success' ? 'var(--success-bg)' : ($messageType === 'warning' ? '#fff7d6' : 'var(--danger-bg)') ?>; color:<?= $messageType === 'success' ? 'var(--success)' : ($messageType === 'warning' ? '#8a6500' : 'var(--danger)') ?>; padding:14px 20px; border-radius:12px; margin-bottom:24px; font-weight:700;">
          <?= htmlspecialchars($message, ENT_QUOTES) ?>
        </div>
      <?php endif; ?>

      <div class="news-form">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:18px;"><?= $editItem ? 'Խմբագրել նորությունը' : 'Ավելացնել նորություն' ?></h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="action" value="save">
          <?php if ($editItem): ?><input type="hidden" name="id" value="<?= (int)$editItem['id'] ?>"><?php endif; ?>

          <div class="news-grid-form">
            <div class="field"><label>Slug</label><input name="slug" value="<?= htmlspecialchars((string)($editItem['slug'] ?? ''), ENT_QUOTES) ?>" placeholder="auto-generated"></div>
            <div class="field"><label>Status</label><select name="status"><option value="draft" <?= ($editItem['status'] ?? '') === 'draft' ? 'selected' : '' ?>>Draft</option><option value="published" <?= ($editItem['status'] ?? 'published') === 'published' ? 'selected' : '' ?>>Published</option></select></div>
            <div class="field"><label>Published at</label><input type="datetime-local" name="published_at" value="<?= htmlspecialchars($publishedValue, ENT_QUOTES) ?>"></div>
          </div>

          <div class="news-grid-form">
            <div class="field"><label>Բեռնել նկար</label><input type="file" name="news_image_file" accept="image/jpeg,image/png,image/webp"><small style="color:var(--muted);">JPEG, PNG կամ WebP, առավելագույնը 10 MB։ Նոր ֆայլը ավտոմատ կլրացնի Image URL-ը։</small></div>
            <div class="field"><label>Image URL</label><input name="image_url" value="<?= htmlspecialchars((string)($editItem['image_url'] ?? ''), ENT_QUOTES) ?>"></div>
            <div class="field"><label>Թարմացման տարբերակ</label><input name="release_version" maxlength="60" value="<?= htmlspecialchars((string)($editItem['release_version'] ?? ''), ENT_QUOTES) ?>" placeholder="օր. 5.0.0"><small style="color:var(--muted);">Դաշտը կամավոր է։ Լրացրեք այն տարբերակը, որին վերաբերում է նորությունը։</small></div>
          </div>

          <div class="news-grid-form">
            <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="<?= htmlspecialchars((string)($editItem['sort_order'] ?? '0'), ENT_QUOTES) ?>"></div>
            <div class="field"><label>Featured</label><label style="display:flex;align-items:center;gap:8px;padding:11px 0;"><input type="checkbox" name="is_featured" value="1" <?= !empty($editItem['is_featured']) ? 'checked' : '' ?>> Նշել որպես կարևոր նորություն</label></div>
          </div>

          <?php foreach (['hy' => 'Հայերեն', 'en' => 'English', 'ru' => 'Русский'] as $lang => $label): ?>
            <h4 style="margin:18px 0 12px; font-size:14px; font-weight:900; color:var(--primary);"><?= $label ?></h4>
            <div class="news-grid-form">
              <div class="field"><label>Title</label><input name="title_<?= $lang ?>" value="<?= htmlspecialchars((string)($editItem['title_' . $lang] ?? ''), ENT_QUOTES) ?>"></div>
              <div class="field"><label>Tag</label><input name="tag_<?= $lang ?>" value="<?= htmlspecialchars((string)($editItem['tag_' . $lang] ?? ''), ENT_QUOTES) ?>"></div>
              <div class="field"><label>Excerpt</label><textarea name="excerpt_<?= $lang ?>"><?= htmlspecialchars((string)($editItem['excerpt_' . $lang] ?? ''), ENT_QUOTES) ?></textarea></div>
            </div>
            <div class="field"><label>Content</label><textarea class="content" name="content_<?= $lang ?>"><?= htmlspecialchars((string)($editItem['content_' . $lang] ?? ''), ENT_QUOTES) ?></textarea></div>
          <?php endforeach; ?>

          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary"><?= $editItem ? 'Պահպանել փոփոխությունները' : 'Ավելացնել' ?></button>
            <?php if ($editItem): ?><a href="/admin_news.php" class="btn">Չեղարկել</a><?php endif; ?>
          </div>
        </form>
      </div>

      <?php foreach ($articles as $article): ?>
        <div class="news-item">
          <div style="display:flex; gap:14px; min-width:0;">
            <div class="news-thumb" style="<?= !empty($article['image_url']) ? 'background-image:url(' . htmlspecialchars((string)$article['image_url'], ENT_QUOTES) . ')' : '' ?>"></div>
            <div>
              <div class="news-title"><?= htmlspecialchars((string)($article['title_hy'] ?: $article['title_en'] ?: $article['title_ru'] ?: $article['slug']), ENT_QUOTES) ?></div>
              <div class="news-meta">
                <span class="pill <?= $article['status'] === 'published' ? 'pub' : 'draft' ?>"><?= htmlspecialchars((string)$article['status'], ENT_QUOTES) ?></span>
                <?php if (!empty($article['is_featured'])): ?><span class="pill">Featured</span><?php endif; ?>
                <?php if (!empty($article['release_version'])): ?><span class="pill">Տարբերակ <?= htmlspecialchars((string)$article['release_version'], ENT_QUOTES) ?></span><?php endif; ?>
                <span><?= htmlspecialchars((string)($article['published_at'] ?? ''), ENT_QUOTES) ?></span>
                <span>/news/<?= htmlspecialchars((string)$article['slug'], ENT_QUOTES) ?></span>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0;">
            <a class="btn" style="padding:8px 12px; font-size:13px;" href="/news/<?= urlencode((string)$article['slug']) ?>" target="_blank">Բացել</a>
            <a class="btn" style="padding:8px 12px; font-size:13px;" href="?edit=<?= (int)$article['id'] ?>">Խմբագրել</a>
            <form method="post" onsubmit="return confirm('Ջնջե՞լ այս նորությունը։')">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= (int)$article['id'] ?>">
              <button class="btn btn-danger" type="submit" style="padding:8px 12px; font-size:13px;">Ջնջել</button>
            </form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </main>
</div>
</body>
</html>
