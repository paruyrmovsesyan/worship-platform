<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_seo.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = (string)($adminUser['email'] ?? '');
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
$config = wp_version_load();
$message = '';
$messageType = 'success';

if (!wp_admin_user_can_section($adminUser, $config, 'site_info')) {
    http_response_code(403);
    exit('Այս բաժնի համար թույլտվություն չունեք։');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fields = [
        'site_seo_name', 'site_seo_title', 'site_seo_description', 'site_seo_keywords',
        'site_seo_logo', 'site_seo_image', 'site_seo_google_verification',
        'site_seo_bing_verification', 'site_seo_yandex_verification',
        'site_seo_default_author', 'site_seo_news_publisher', 'site_seo_news_logo',
    ];
    $input = [];
    foreach ($fields as $field) {
        $input[$field] = trim((string)($_POST[$field] ?? ''));
    }
    foreach (['site_seo_index_home', 'site_seo_index_songs', 'site_seo_index_song_pages', 'site_seo_index_news', 'site_seo_index_news_articles', 'site_seo_index_transpose'] as $field) {
        $input[$field] = !empty($_POST[$field]);
    }

    $saved = wp_version_save($input, [
        'actor' => $adminEmail ?: $adminDisplayName,
        'ip' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
        'action' => 'save_seo',
    ]);
    $message = $saved ? 'SEO կարգավորումները պահպանվեցին։' : 'Չհաջողվեց պահպանել SEO կարգավորումները։';
    $messageType = $saved ? 'success' : 'error';
    $config = wp_version_load();
}

$activePage = 'seo';
$searchPlaceholder = 'Search SEO settings...';
function seo_e(array $config, string $key): string {
    return htmlspecialchars((string)($config[$key] ?? ''), ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="hy">
<head>
  <?php wp_admin_render_pwa_head('SEO & Search — Worship Platform Admin'); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .seo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.seo-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm)}.seo-card.full{grid-column:1/-1}.seo-card h2{font-size:18px;margin:0 0 6px}.seo-card>p{color:var(--muted);font-size:13px;margin:0 0 20px}.seo-field{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}.seo-field label{font-size:12px;font-weight:800;color:var(--text)}.seo-field input,.seo-field textarea{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font:inherit}.seo-field textarea{min-height:92px;resize:vertical}.seo-help{font-size:11px;color:var(--muted)}.google-preview{background:#fff;border:1px solid #dfe1e5;border-radius:14px;padding:20px;color:#202124}.google-url{font-size:13px}.google-title{font-size:20px;color:#1a0dab;margin:6px 0}.google-desc{font-size:14px;line-height:1.5;color:#4d5156}.seo-actions{display:flex;justify-content:flex-end;margin-top:20px}@media(max-width:900px){.seo-grid{grid-template-columns:1fr}.seo-card.full{grid-column:auto}}
  </style>
</head>
<body>
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>
  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>
    <div class="app-content">
      <div class="page-heading"><h1>SEO և որոնողական համակարգեր</h1><p>Կառավարեք Google, Bing, Yandex և մյուս որոնողական համակարգերում ցուցադրվող տվյալները։</p></div>
      <?php if ($message): ?><div style="padding:14px 18px;border-radius:12px;margin-bottom:20px;font-weight:700;background:<?= $messageType === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)' ?>;color:<?= $messageType === 'success' ? 'var(--success)' : 'var(--danger)' ?>"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post">
        <div class="seo-grid">
          <section class="seo-card">
            <h2>Որոնման արդյունք</h2>
            <p>Այս տվյալները կարդում են բոլոր հիմնական որոնողական համակարգերը։ Փոփոխությունը կարող է երևալ միայն վերաինդեքսավորումից հետո։</p>
            <div class="seo-field"><label for="site_seo_name">Կայքի անուն</label><input id="site_seo_name" name="site_seo_name" maxlength="120" value="<?= seo_e($config, 'site_seo_name') ?>"></div>
            <div class="seo-field"><label for="site_seo_title">SEO վերնագիր</label><input id="site_seo_title" name="site_seo_title" maxlength="120" value="<?= seo_e($config, 'site_seo_title') ?>"><span class="seo-help">Խորհուրդ՝ մոտ 50–60 նիշ։</span></div>
            <div class="seo-field"><label for="site_seo_description">SEO նկարագրություն</label><textarea id="site_seo_description" name="site_seo_description" maxlength="300"><?= seo_e($config, 'site_seo_description') ?></textarea><span class="seo-help">Խորհուրդ՝ մոտ 140–160 նիշ։</span></div>
            <div class="seo-field"><label for="site_seo_keywords">Բանալի բառեր</label><input id="site_seo_keywords" name="site_seo_keywords" maxlength="255" value="<?= seo_e($config, 'site_seo_keywords') ?>"></div>
          </section>
          <section class="seo-card">
            <h2>Որոնման նախադիտում</h2>
            <p>Մոտավոր տեսքն է. որոնողական համակարգը երբեմն ինքն է ընտրում ցուցադրվող տեքստը։</p>
            <div class="google-preview">
              <div class="google-url">worship.pmstudio.am</div>
              <div class="google-title" id="previewTitle"><?= seo_e($config, 'site_seo_title') ?></div>
              <div class="google-desc" id="previewDescription"><?= seo_e($config, 'site_seo_description') ?></div>
            </div>
            <div class="seo-field" style="margin-top:20px"><label for="site_seo_google_verification">Google Search Console verification code</label><input id="site_seo_google_verification" name="site_seo_google_verification" maxlength="255" value="<?= seo_e($config, 'site_seo_google_verification') ?>" placeholder="Միայն content-ի արժեքը"><span class="seo-help">Օրինակ՝ meta tag-ի content="..." հատվածը։</span></div>
            <div class="seo-field"><label for="site_seo_bing_verification">Bing Webmaster Tools verification code</label><input id="site_seo_bing_verification" name="site_seo_bing_verification" maxlength="255" value="<?= seo_e($config, 'site_seo_bing_verification') ?>" placeholder="msvalidate.01 content"></div>
            <div class="seo-field"><label for="site_seo_yandex_verification">Yandex Webmaster verification code</label><input id="site_seo_yandex_verification" name="site_seo_yandex_verification" maxlength="255" value="<?= seo_e($config, 'site_seo_yandex_verification') ?>" placeholder="yandex-verification content"></div>
          </section>
          <section class="seo-card">
            <h2>Լոգո և տարածվող նկար</h2>
            <p>Օգտագործվում են Google schema-ում, Facebook/Telegram/WhatsApp և այլ հարթակներում։</p>
            <div class="seo-field"><label for="site_seo_logo">Կազմակերպության լոգոյի URL</label><input id="site_seo_logo" type="url" name="site_seo_logo" maxlength="500" value="<?= seo_e($config, 'site_seo_logo') ?>"></div>
            <div class="seo-field"><label for="site_seo_image">Կիսվելու հիմնական նկարի URL</label><input id="site_seo_image" type="url" name="site_seo_image" maxlength="500" value="<?= seo_e($config, 'site_seo_image') ?>"><span class="seo-help">Խորհուրդ՝ 1200×630 px։</span></div>
          </section>
          <section class="seo-card">
            <h2>Google News</h2>
            <p>Այս տվյալները մտնում են յուրաքանչյուր հրապարակված նորության NewsArticle schema-ի մեջ։</p>
            <div class="seo-field"><label for="site_seo_news_publisher">Հրատարակչի անուն</label><input id="site_seo_news_publisher" name="site_seo_news_publisher" maxlength="120" value="<?= seo_e($config, 'site_seo_news_publisher') ?>"></div>
            <div class="seo-field"><label for="site_seo_news_logo">Google News լոգոյի URL</label><input id="site_seo_news_logo" type="url" name="site_seo_news_logo" maxlength="500" value="<?= seo_e($config, 'site_seo_news_logo') ?>"><span class="seo-help">Օգտագործեք պարզ, քառակուսի և HTTPS լոգո։</span></div>
            <div class="seo-field"><label for="site_seo_default_author">Նորությունների լռելյայն հեղինակ</label><input id="site_seo_default_author" name="site_seo_default_author" maxlength="120" value="<?= seo_e($config, 'site_seo_default_author') ?>"></div>
          </section>
          <section class="seo-card full">
            <h2>Էջերի ինդեքսավորում</h2>
            <p>Ընտրեք՝ որոնողական համակարգերը որ տեսակի էջերը կարող են ներառել արդյունքներում։ Անջատված էջերը կստանան <code>noindex,follow</code> և չեն ներառվի sitemap-ում։</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">
              <?php foreach ([
                'site_seo_index_home' => ['Գլխավոր էջ', '/'],
                'site_seo_index_songs' => ['Երգերի ցանկ', '/songs'],
                'site_seo_index_song_pages' => ['Երգի դիտման էջեր', '/song/123'],
                'site_seo_index_news' => ['Նորությունների ցանկ', '/news'],
                'site_seo_index_news_articles' => ['Նորությունների հոդվածներ', '/news/article'],
                'site_seo_index_transpose' => ['Տրանսպոզի գործիք', '/transpose'],
              ] as $key => [$label, $example]): ?>
                <label style="display:flex;align-items:flex-start;gap:10px;padding:14px;border:1px solid var(--line);border-radius:12px;cursor:pointer">
                  <input type="checkbox" name="<?= $key ?>" value="1" <?= !empty($config[$key]) ? 'checked' : '' ?> style="margin-top:3px">
                  <span><strong style="display:block;font-size:14px"><?= $label ?></strong><small class="seo-help"><?= $example ?></small></span>
                </label>
              <?php endforeach; ?>
            </div>
          </section>
        </div>
        <div class="seo-actions"><button class="btn btn-primary" type="submit">Պահպանել SEO կարգավորումները</button></div>
      </form>
    </div>
  </main>
</div>
<script>
  const titleInput=document.getElementById('site_seo_title'),descriptionInput=document.getElementById('site_seo_description');
  titleInput.addEventListener('input',()=>document.getElementById('previewTitle').textContent=titleInput.value||'Worship Platform');
  descriptionInput.addEventListener('input',()=>document.getElementById('previewDescription').textContent=descriptionInput.value);
</script>
</body>
</html>
