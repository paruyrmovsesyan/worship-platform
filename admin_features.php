<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/features_api.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_features.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail       = trim((string)($adminUser['email'] ?? ''));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';
$activePage       = 'features';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}

$i18n = [
    'hy' => [
        'page_title' => 'Ֆունկցիաների Լաբորատորիա — Worship Platform Admin',
        'title' => 'Ֆունկցիաների Լաբորատորիա (Feature Flags & Labs)',
        'subtitle' => 'Կառավարեք նորարարությունները, փորձարկեք առանձին մոդուլները և հրապարակեք մեկ սեղմումով:',
        'publish_all' => '🚀 Վերջնական Հրապարակել Բոլորը (Live)',
        'total' => 'Ընդհանուր Ֆունկցիաներ',
        'published' => 'Հրապարակված (Live)',
        'beta' => 'Beta / Փորձարկում',
        'soon' => 'Շուտով (Coming Soon)',
        'off' => 'Անջատված (Off)',
        'search_placeholder' => 'Որոնել ֆունկցիա (Smart Metronome, Follower, Stems...)...',
        'filter_all' => 'Բոլորը',
        'cat_all' => 'Բոլոր ոլորտները',
        'test_btn' => 'Փորձարկել',
        'confirm_publish_all' => 'Հաստատու՞մ եք բոլոր նոր ֆունկցիաների վերջնական հրապարակումը բոլոր օգտատերերի համար:',
        'status_updated' => 'Կարգավիճակը թարմացվեց',
        'empty_search' => 'Որոնմանը համապատասխան ֆունկցիա չգտնվեց:',
        'cat_labels' => [
            'pro_studio' => '🎛️ Worship Pro Studio (Հավաքական)',
            'stage' => 'Բեմ և Ելույթ',
            'audio' => 'Աուդիո և Բազմաթրեկ',
            'projection' => 'Պրոյեկցիա և Եթեր',
            'ai' => 'Արհեստական Բանականություն (AI)',
            'ministry' => 'Ծառայություն և Թիմ',
            'network' => 'Օֆլայն և Ցանց',
            'general' => 'Ընդհանուր',
        ],
    ],
    'ru' => [
        'page_title' => 'Лаборатория функций — Worship Platform Admin',
        'title' => 'Лаборатория функций (Feature Flags & Labs)',
        'subtitle' => 'Управляйте новыми возможностями платформы, включайте Beta-режим и публикуйте в один клик.',
        'publish_all' => '🚀 Опубликовать все функции (Live)',
        'total' => 'Всего функций',
        'published' => 'Опубликовано (Live)',
        'beta' => 'Beta / Доработка',
        'soon' => 'Скоро (Coming Soon)',
        'off' => 'Отключено (Off)',
        'search_placeholder' => 'Поиск функций (Metronome, Follower, Stems...)...',
        'filter_all' => 'Все',
        'cat_all' => 'Все категории',
        'test_btn' => 'Тестировать',
        'confirm_publish_all' => 'Подтверждаете публикацию всех функций для всех пользователей?',
        'status_updated' => 'Статус обновлен',
        'empty_search' => 'Функции по запросу не найдены.',
        'cat_labels' => [
            'pro_studio' => '🎛️ Worship Pro Studio (Пакет)',
            'stage' => 'Сцена и Выступление',
            'audio' => 'Аудио и Мультитреки',
            'projection' => 'Проекция и Эфир (OBS)',
            'ai' => 'Искусственный интеллект (AI)',
            'ministry' => 'Служение и Команда',
            'network' => 'Офлайн и Сеть',
            'general' => 'Общее',
        ],
    ],
    'en' => [
        'page_title' => 'Feature Flags & Labs — Worship Platform Admin',
        'title' => 'Feature Flags & Labs Laboratory',
        'subtitle' => 'Manage platform feature flags, test beta modules and roll out to production with one click.',
        'publish_all' => '🚀 Publish All Live to Production',
        'total' => 'Total Features',
        'published' => 'Published (Live)',
        'beta' => 'Beta / Refining',
        'soon' => 'Coming Soon',
        'off' => 'Disabled (Off)',
        'search_placeholder' => 'Search features (Metronome, Follower, Stems...)...',
        'filter_all' => 'All',
        'cat_all' => 'All Categories',
        'test_btn' => 'Test Feature',
        'confirm_publish_all' => 'Are you sure you want to publish all features to live for all users?',
        'status_updated' => 'Status updated successfully',
        'empty_search' => 'No matching features found.',
        'cat_labels' => [
            'pro_studio' => '🎛️ Worship Pro Studio Suite',
            'stage' => 'Stage & Performance',
            'audio' => 'Audio & Multitracks',
            'projection' => 'Projection & Stream',
            'ai' => 'AI Studio & Automation',
            'ministry' => 'Ministry & Team',
            'network' => 'Offline & Network',
            'general' => 'General',
        ],
    ],
];

$t = $i18n[$adminLang] ?? $i18n['hy'];

$catalog = wp_features_load();

$totalCount = count($catalog);
$publishedCount = 0;
$betaCount = 0;
$soonCount = 0;
$offCount = 0;

$categories = ['pro_studio'];

foreach ($catalog as $item) {
    $st = $item['status'] ?? 'published';
    if ($st === 'published') $publishedCount++;
    elseif ($st === 'beta') $betaCount++;
    elseif ($st === 'soon' || $st === 'coming_soon') $soonCount++;
    else $offCount++;

    $cat = strtolower((string)($item['category'] ?? 'general'));
    if ($cat !== '' && !in_array($cat, $categories, true)) {
        $categories[] = $cat;
    }
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($adminLang) ?>">
<head>
  <?php wp_admin_render_pwa_head($t['page_title']); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    /* ── Laboratory Specific Styles ── */
    .features-hero {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 24px 28px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: var(--shadow-sm);
    }
    .features-hero-title h1 {
      font-size: 1.65rem;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .features-hero-title h1 span.icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(58, 45, 255, 0.12), rgba(192, 132, 252, 0.2));
      color: var(--primary);
      font-size: 20px;
    }
    .features-hero-title p {
      margin: 0;
      color: var(--muted);
      font-size: 0.95rem;
      font-weight: 500;
    }
    .btn-publish-all {
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      color: #fff;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.28);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
    }
    .btn-publish-all:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.38);
    }
    .btn-publish-all:active {
      transform: translateY(0);
    }

    /* ── KPI Row ── */
    .features-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .f-stat-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 18px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .f-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(112, 144, 176, 0.1);
    }
    .f-stat-card.active-filter {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(58, 45, 255, 0.15);
    }
    .f-stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }
    .f-stat-info div {
      font-size: 0.76rem;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .f-stat-info strong {
      font-size: 1.7rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
    }

    /* ── Filter / Toolbar ── */
    .features-toolbar {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      box-shadow: var(--shadow-sm);
    }
    .filter-pills-group {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .filter-pill {
      background: #f4f7fe;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }
    .filter-pill:hover {
      background: #e9effd;
      border-color: #cbd5e1;
    }
    .filter-pill.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
      box-shadow: 0 2px 8px rgba(58, 45, 255, 0.25);
    }
    .local-search-input {
      background: #f4f7fe;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 0.85rem;
      color: var(--text);
      outline: none;
      min-width: 240px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .local-search-input:focus {
      border-color: var(--primary);
      background: #fff;
    }

    /* ── Features Grid & Cards ── */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
      gap: 18px;
    }

    @media (max-width: 768px) {
      .features-hero {
        padding: 18px 20px;
        flex-direction: column;
        align-items: stretch;
      }
      .btn-publish-all {
        width: 100%;
        justify-content: center;
      }
      .features-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      .features-toolbar > div {
        width: 100%;
      }
      .local-search-input {
        width: 100%;
        min-width: 0;
      }
      .filter-pills-group {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex-wrap: nowrap;
        padding-bottom: 4px;
      }
      .filter-pill {
        white-space: nowrap;
        flex-shrink: 0;
      }
      .feature-card {
        padding: 18px;
      }
    }
    .feature-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: var(--shadow-sm);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      position: relative;
    }
    .feature-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 30px rgba(112, 144, 176, 0.12);
      border-color: #cbd5e1;
    }
    .feature-card.highlight {
      border-color: var(--primary);
      animation: pulse-border 1.5s infinite;
    }
    @keyframes pulse-border {
      0% { box-shadow: 0 0 0 0 rgba(58, 45, 255, 0.3); }
      70% { box-shadow: 0 0 0 8px rgba(58, 45, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(58, 45, 255, 0); }
    }
    .feature-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      gap: 12px;
    }
    .feature-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 6px 0;
      line-height: 1.35;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .live-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .live-dot.published {
      background: #10b981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
    }
    .live-dot.beta {
      background: #f59e0b;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
    }
    .live-dot.soon {
      background: #6366f1;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
    }
    .live-dot.off {
      background: #94a3b8;
    }
    .feature-cat-tag {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
    }
    .feature-cat-tag.stage { background: #e0f2fe; color: #0284c7; }
    .feature-cat-tag.audio { background: #fae8ff; color: #a855f7; }
    .feature-cat-tag.projection { background: #fef3c7; color: #d97706; }
    .feature-cat-tag.ai { background: #e0e7ff; color: #4338ca; }
    .feature-cat-tag.ministry, .feature-cat-tag.planning { background: #dcfce7; color: #16a34a; }
    .feature-cat-tag.network { background: #ede9fe; color: #7c3aed; }

    .feature-cat-tag.pro_studio { background: #ede9fe; color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.3); }
    .suite-module-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 750; padding: 2px 8px; border-radius: 6px; background: rgba(99, 102, 241, 0.12); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.25); margin-left: 6px; }

    /* ── Worship Pro Studio Master Suite Card ── */
    .pro-suite-master-card {
      background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(238, 242, 255, 0.95));
      border: 2px solid #818cf8;
      border-radius: var(--radius);
      padding: 26px;
      margin-bottom: 28px;
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.12);
      position: relative;
      overflow: hidden;
    }
    .pro-suite-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .pro-suite-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .pro-suite-crown {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff;
      padding: 3px 10px;
      border-radius: 6px;
      display: inline-block;
    }
    .pro-suite-title {
      font-size: 1.45rem;
      font-weight: 850;
      color: var(--text);
      margin: 4px 0 6px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pro-suite-desc {
      font-size: 0.92rem;
      color: #475569;
      line-height: 1.5;
      max-width: 780px;
      margin: 0;
    }
    .pro-suite-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }
    .pro-suite-switch-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748b;
    }
    .pro-suite-batch-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .suite-batch-btn {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--line);
      cursor: pointer;
      background: #fff;
      color: var(--text);
      transition: all 0.15s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .suite-batch-btn.live:hover { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .suite-batch-btn.beta:hover { background: #fef3c7; color: #b45309; border-color: #fcd34d; }
    .suite-batch-btn.soon:hover { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .suite-batch-btn.off:hover { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
    .suite-batch-btn.test { background: #ede9fe; color: #6366f1; border-color: #c4b5fd; }
    .suite-batch-btn.test:hover { background: #ddd6fe; }

    .pro-suite-modules-title {
      font-size: 0.86rem;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-top: 16px;
      margin-bottom: 12px;
      border-top: 1px solid rgba(99, 102, 241, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pro-suite-modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .suite-module-card {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      transition: all 0.15s ease;
    }
    .suite-module-card:hover {
      border-color: #a5b4fc;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
    }
    .suite-module-top {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .suite-module-icon {
      font-size: 1.4rem;
      line-height: 1;
      padding: 4px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .suite-module-meta {
      flex: 1;
    }
    .suite-module-name {
      font-size: 0.95rem;
      font-weight: 750;
      color: #0f172a;
      line-height: 1.3;
    }
    .suite-module-subtext {
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.4;
      margin-top: 2px;
    }
    .suite-module-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px dashed rgba(0,0,0,0.06);
    }
    .suite-module-status {
      font-size: 0.75rem;
      font-weight: 750;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .suite-module-status.published { background: #dcfce7; color: #15803d; }
    .suite-module-status.beta { background: #fef3c7; color: #b45309; }
    .suite-module-status.soon { background: #e0e7ff; color: #4338ca; }
    .suite-module-status.off { background: #f1f5f9; color: #64748b; }
    .feature-segmented-switch.mini .switch-opt {
      padding: 3px 8px;
      font-size: 0.75rem;
    }

    .feature-desc {
      font-size: 0.88rem;
      color: #475569;
      line-height: 1.55;
      margin-bottom: 22px;
      flex: 1;
    }

    /* ── Controls Row ── */
    .feature-controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }
    .feature-segmented-switch {
      display: flex;
      background: #f1f5f9;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px;
      gap: 3px;
    }
    .switch-opt {
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #64748b;
      transition: all 0.15s ease;
      user-select: none;
    }
    .switch-opt:hover {
      color: var(--text);
    }
    .switch-opt.active-published {
      background: #10b981;
      color: #fff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
    }
    .switch-opt.active-beta {
      background: #f59e0b;
      color: #fff;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }
    .switch-opt.active-soon {
      background: #6366f1;
      color: #fff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }
    .switch-opt.active-off {
      background: #ef4444;
      color: #fff;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
    }

    .feature-test-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 700;
      background: rgba(58, 45, 255, 0.08);
      border: 1px solid rgba(58, 45, 255, 0.2);
      color: var(--primary);
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .feature-test-btn:hover {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 12px rgba(58, 45, 255, 0.25);
    }

    /* Toast Notification */
    .toast-msg {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #111c44;
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
      opacity: 0;
      transform: translateY(16px);
      transition: all 0.25s ease;
      pointer-events: none;
    }
    .toast-msg.show {
      opacity: 1;
      transform: translateY(0);
    }
    .empty-state {
      background: var(--surface);
      border: 1px dashed var(--line);
      border-radius: var(--radius);
      padding: 60px 20px;
      text-align: center;
      color: var(--muted);
      font-size: 1rem;
      grid-column: 1 / -1;
    }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">

  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php 
      $searchPlaceholder = $t['search_placeholder'];
      include __DIR__ . '/admin_topbar.php'; 
    ?>

    <div style="padding: 28px 40px 60px; max-width: 1400px; width: 100%;">
      
      <!-- Hero Header -->
      <div class="features-hero">
        <div class="features-hero-title">
          <h1>
            <span class="icon-badge">🔬</span>
            <?= htmlspecialchars($t['title']) ?>
          </h1>
          <p><?= htmlspecialchars($t['subtitle']) ?></p>
        </div>

        <div>
          <button type="button" class="btn-publish-all" onclick="publishAllFeatures()">
            <?= htmlspecialchars($t['publish_all']) ?>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="features-stats-row">
        <div class="f-stat-card active-filter" data-filter="all" onclick="filterByStatus('all', this)">
          <div class="f-stat-icon" style="background:rgba(58,45,255,0.1); color:var(--primary);">✨</div>
          <div class="f-stat-info">
            <div><?= htmlspecialchars($t['total']) ?></div>
            <strong id="statTotal"><?= $totalCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card" data-filter="published" onclick="filterByStatus('published', this)">
          <div class="f-stat-icon" style="background:rgba(16,185,129,0.12); color:#10b981;">🟢</div>
          <div class="f-stat-info">
            <div><?= htmlspecialchars($t['published']) ?></div>
            <strong id="statPublished"><?= $publishedCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card" data-filter="beta" onclick="filterByStatus('beta', this)">
          <div class="f-stat-icon" style="background:rgba(245,158,11,0.12); color:#f59e0b;">🧪</div>
          <div class="f-stat-info">
            <div><?= htmlspecialchars($t['beta']) ?></div>
            <strong id="statBeta"><?= $betaCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card" data-filter="soon" onclick="filterByStatus('soon', this)">
          <div class="f-stat-icon" style="background:rgba(99,102,241,0.12); color:#6366f1;">⏳</div>
          <div class="f-stat-info">
            <div><?= htmlspecialchars($t['soon'] ?? 'Շուտով') ?></div>
            <strong id="statSoon"><?= $soonCount ?></strong>
          </div>
        </div>

        <div class="f-stat-card" data-filter="off" onclick="filterByStatus('off', this)">
          <div class="f-stat-icon" style="background:rgba(239,68,68,0.12); color:#ef4444;">🔴</div>
          <div class="f-stat-info">
            <div><?= htmlspecialchars($t['off']) ?></div>
            <strong id="statOff"><?= $offCount ?></strong>
          </div>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="features-toolbar">
        <div class="filter-pills-group" id="categoryPills">
          <button type="button" class="filter-pill active" data-cat="all" onclick="filterByCategory('all', this)">
            <?= htmlspecialchars($t['cat_all']) ?>
          </button>
          <?php foreach ($categories as $cat): 
            $catLabel = $t['cat_labels'][$cat] ?? ucfirst($cat);
          ?>
            <button type="button" class="filter-pill" data-cat="<?= htmlspecialchars($cat) ?>" onclick="filterByCategory('<?= htmlspecialchars($cat) ?>', this)">
              <?= htmlspecialchars($catLabel) ?>
            </button>
          <?php endforeach; ?>
        </div>

        <div>
          <input 
            type="search" 
            id="localSearchInput" 
            class="local-search-input" 
            placeholder="<?= htmlspecialchars($t['search_placeholder']) ?>" 
            oninput="handleSearch(this.value)"
          >
        </div>
      </div>

      <!-- Worship Pro Studio Master Suite Showcase -->
      <?php if (!empty($catalog['pro_studio'])): 
        $ps = $catalog['pro_studio'];
        $psStatus = $ps['status'] ?? 'beta';
        $psModules = array_filter($catalog, fn($item) => ($item['suite'] ?? '') === 'pro_studio');
      ?>
      <div class="pro-suite-master-card" id="card-pro_studio" data-id="pro_studio" data-status="<?= htmlspecialchars($psStatus) ?>" data-category="pro_studio" data-title="worship pro studio" data-desc="գլխավոր հավաքական">
        <div class="pro-suite-header">
          <div class="pro-suite-info">
            <div class="pro-suite-badge-row">
              <span class="pro-suite-crown">⭐ MASTER ECOSYSTEM • ԳԼԽԱՎՈՐ ՀԱՎԱՔԱԿԱՆ</span>
              <span class="live-dot <?= htmlspecialchars($psStatus) ?>" id="dot-pro_studio"></span>
              <span class="feature-badge-refining" id="badge-pro_studio" style="font-size:11px; padding:2px 10px; font-weight:700; border-radius:6px; display:inline-block; <?= $psStatus === 'published' ? 'background:#dcfce7; color:#15803d;' : ($psStatus === 'beta' ? 'background:#fef3c7; color:#b45309;' : (in_array($psStatus, ['soon', 'coming_soon'], true) ? 'background:#e0e7ff; color:#4338ca;' : 'background:#f1f5f9; color:#64748b;')) ?>">
                <?= $psStatus === 'published' ? '🟢 Live' : ($psStatus === 'beta' ? '🧪 Beta / Փորձարկում' : (in_array($psStatus, ['soon', 'coming_soon'], true) ? '⏳ Շուտով' : '⚪ Անջատված')) ?>
              </span>
            </div>
            <h2 class="pro-suite-title">
              🎛️ Worship Pro Studio Suite
            </h2>
            <p class="pro-suite-desc">
              Worship Pro Studio-ն կայքի, PWA-ի և հավելվածների բեմական ու երաժշտական <strong>գլխավոր հավաքականն է</strong>:
              Այն իր ներսում միավորում է բոլոր 6 հիմնական մոդուլները: Այստեղից կարող եք կառավարել ինչպես ամբողջ հավաքականը (Master Switch), այնպես էլ նրա ներսի գործիքներից յուրաքանչյուրը:
            </p>
          </div>

          <div class="pro-suite-actions">
            <div class="pro-suite-switch-label">Հավաքականի Գլխավոր Անջատիչ (Master Switch)՝</div>
            <div class="feature-segmented-switch" data-feature="pro_studio">
              <button 
                type="button" 
                class="switch-opt <?= $psStatus === 'off' ? 'active-off' : '' ?>" 
                data-status="off"
                onclick="updateFeatureStatus('pro_studio', 'off')"
                title="Անջատել ամբողջ Pro Studio հավաքականը"
              >
                Off
              </button>
              <button 
                type="button" 
                class="switch-opt <?= in_array($psStatus, ['soon', 'coming_soon'], true) ? 'active-soon' : '' ?>" 
                data-status="soon"
                onclick="updateFeatureStatus('pro_studio', 'soon')"
                title="Pro Studio հավաքականը նշել որպես «Շուտով»"
              >
                Շուտով
              </button>
              <button 
                type="button" 
                class="switch-opt <?= $psStatus === 'beta' ? 'active-beta' : '' ?>" 
                data-status="beta"
                onclick="updateFeatureStatus('pro_studio', 'beta')"
                title="Pro Studio հավաքականը դնել Beta փորձարկման ռեժիմում"
              >
                Beta
              </button>
              <button 
                type="button" 
                class="switch-opt <?= $psStatus === 'published' ? 'active-published' : '' ?>" 
                data-status="published"
                onclick="updateFeatureStatus('pro_studio', 'published')"
                title="Հրապարակել Pro Studio հավաքականը բոլորի համար"
              >
                Live
              </button>
            </div>
            <div class="pro-suite-batch-actions">
              <button type="button" class="suite-batch-btn live" onclick="setSuiteAll('published')">🚀 Բոլոր 6-ը Live</button>
              <button type="button" class="suite-batch-btn beta" onclick="setSuiteAll('beta')">🧪 Բոլոր 6-ը Beta</button>
              <button type="button" class="suite-batch-btn soon" onclick="setSuiteAll('soon')">⏳ Բոլոր 6-ը Շուտով</button>
              <button type="button" class="suite-batch-btn off" onclick="setSuiteAll('off')">⚪ Բոլոր 6-ը Off</button>
              <a href="/studio" target="_blank" class="suite-batch-btn test">🔗 Բացել Pro Studio Hub →</a>
            </div>
          </div>
        </div>

        <div class="pro-suite-modules-title">
          <span>📦 Pro Studio-ի Ներսի 6 Հիմնական Գործիքները (Modules)</span>
        </div>

        <div class="pro-suite-modules-grid">
          <?php 
          $moduleIcons = [
            'live_stage_follower' => '📡',
            'rehearsal_stems' => '🎛️',
            'lyrics_projection' => '📽️',
            'worship_ai_studio' => '✨',
            'service_planner' => '📅',
            'smart_metronome' => '⏱️',
          ];
          foreach ($psModules as $mId => $mItem): 
            $mStatus = $mItem['status'] ?? 'published';
            $mIcon = $moduleIcons[$mId] ?? '🔧';
          ?>
            <div class="suite-module-card <?= $mStatus ?>" id="suite-sub-<?= htmlspecialchars($mId) ?>">
              <div class="suite-module-top">
                <span class="suite-module-icon"><?= $mIcon ?></span>
                <div class="suite-module-meta">
                  <div class="suite-module-name"><?= htmlspecialchars($mItem['title']) ?></div>
                  <div class="suite-module-subtext"><?= htmlspecialchars($mItem['description']) ?></div>
                </div>
              </div>
              <div class="suite-module-bottom">
                <span class="suite-module-status <?= htmlspecialchars($mStatus) ?>" id="subbadge-<?= htmlspecialchars($mId) ?>">
                  <?= $mStatus === 'published' ? 'Live' : ($mStatus === 'beta' ? 'Beta' : (in_array($mStatus, ['soon', 'coming_soon'], true) ? 'Շուտով' : 'Off')) ?>
                </span>
                <div class="feature-segmented-switch mini" data-feature="<?= htmlspecialchars($mId) ?>">
                  <button type="button" class="switch-opt <?= $mStatus === 'off' ? 'active-off' : '' ?>" data-status="off" onclick="updateFeatureStatus('<?= htmlspecialchars($mId) ?>', 'off')">Off</button>
                  <button type="button" class="switch-opt <?= in_array($mStatus, ['soon', 'coming_soon'], true) ? 'active-soon' : '' ?>" data-status="soon" onclick="updateFeatureStatus('<?= htmlspecialchars($mId) ?>', 'soon')">Շուտով</button>
                  <button type="button" class="switch-opt <?= $mStatus === 'beta' ? 'active-beta' : '' ?>" data-status="beta" onclick="updateFeatureStatus('<?= htmlspecialchars($mId) ?>', 'beta')">Beta</button>
                  <button type="button" class="switch-opt <?= $mStatus === 'published' ? 'active-published' : '' ?>" data-status="published" onclick="updateFeatureStatus('<?= htmlspecialchars($mId) ?>', 'published')">Live</button>
                </div>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
      <?php endif; ?>

      <!-- Features Grid -->
      <div class="features-grid" id="featuresGrid">
        <?php foreach ($catalog as $id => $item): 
          if ($id === 'pro_studio') continue; // Rendered prominently above in Master Suite Card
          $status = $item['status'] ?? 'published';
          $testUrl = $item['test_url'] ?? '/';
          $cat = strtolower((string)($item['category'] ?? 'general'));
          $catLabel = $t['cat_labels'][$cat] ?? ucfirst($cat);
          $suite = $item['suite'] ?? '';
        ?>
        <div 
          class="feature-card" 
          id="card-<?= htmlspecialchars($id) ?>" 
          data-id="<?= htmlspecialchars($id) ?>"
          data-status="<?= htmlspecialchars($status) ?>"
          data-category="<?= htmlspecialchars($cat) ?>"
          data-suite="<?= htmlspecialchars($suite) ?>"
          data-title="<?= htmlspecialchars(strtolower($item['title'])) ?>"
          data-desc="<?= htmlspecialchars(strtolower($item['description'])) ?>"
        >
          <div>
            <div class="feature-card-top">
              <div>
                <h3 class="feature-name">
                  <span class="live-dot <?= htmlspecialchars($status) ?>" id="dot-<?= htmlspecialchars($id) ?>"></span>
                  <?= htmlspecialchars($item['title']) ?>
                </h3>
                <span class="feature-cat-tag <?= htmlspecialchars($cat) ?>"><?= htmlspecialchars($catLabel) ?></span>
                <?php if ($suite === 'pro_studio'): ?>
                  <span class="suite-module-tag">🎛️ Pro Studio Մոդուլ</span>
                <?php endif; ?>
                <?php if ($status === 'beta'): ?>
                  <span class="feature-badge-refining" id="badge-<?= htmlspecialchars($id) ?>" style="font-size:10px; padding:2px 8px; margin-left:6px; font-weight:700; background:#fef3c7; color:#b45309; border-radius:6px; display:inline-block;">🧪 Վերամշակման մեջ</span>
                <?php elseif ($status === 'soon' || $status === 'coming_soon'): ?>
                  <span class="feature-badge-refining" id="badge-<?= htmlspecialchars($id) ?>" style="font-size:10px; padding:2px 8px; margin-left:6px; font-weight:700; background:#e0e7ff; color:#4338ca; border-radius:6px; display:inline-block;">⏳ Շուտով</span>
                <?php elseif ($status === 'off'): ?>
                  <span class="feature-badge-refining" id="badge-<?= htmlspecialchars($id) ?>" style="font-size:10px; padding:2px 8px; margin-left:6px; font-weight:700; background:#f1f5f9; color:#64748b; border-radius:6px; display:inline-block;">⚪ Փորձարարական</span>
                <?php else: ?>
                  <span class="feature-badge-refining" id="badge-<?= htmlspecialchars($id) ?>" style="font-size:10px; padding:2px 8px; margin-left:6px; font-weight:700; background:#dcfce7; color:#15803d; border-radius:6px; display:inline-block;">🟢 Live</span>
                <?php endif; ?>
              </div>
            </div>

            <p class="feature-desc"><?= htmlspecialchars($item['description']) ?></p>
          </div>

          <div class="feature-controls-row">
            <!-- Segmented Switch -->
            <div class="feature-segmented-switch" data-feature="<?= htmlspecialchars($id) ?>">
              <button 
                type="button" 
                class="switch-opt <?= $status === 'off' ? 'active-off' : '' ?>" 
                data-status="off"
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'off')"
                title="Անջատել բոլորի համար"
              >
                Off
              </button>
              <button 
                type="button" 
                class="switch-opt <?= in_array($status, ['soon', 'coming_soon'], true) ? 'active-soon' : '' ?>" 
                data-status="soon"
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'soon')"
                title="Նշել որպես «Շուտով» (կոճակը տեսանելի, բայց անհասանելի)"
              >
                Շուտով
              </button>
              <button 
                type="button" 
                class="switch-opt <?= $status === 'beta' ? 'active-beta' : '' ?>" 
                data-status="beta"
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'beta')"
                title="Միայն ադմինների և թեստավորողների համար"
              >
                Beta
              </button>
              <button 
                type="button" 
                class="switch-opt <?= $status === 'published' ? 'active-published' : '' ?>" 
                data-status="published"
                onclick="updateFeatureStatus('<?= htmlspecialchars($id) ?>', 'published')"
                title="Հրապարակել բոլոր օգտատերերի համար"
              >
                Live
              </button>
            </div>

            <!-- Test Link -->
            <a href="<?= htmlspecialchars($testUrl) ?>" target="_blank" rel="noreferrer" class="feature-test-btn">
              🧪 <?= htmlspecialchars($t['test_btn']) ?>
            </a>
          </div>
        </div>
        <?php endforeach; ?>

        <div id="emptySearchState" class="empty-state" style="display:none;">
          <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
          <div><?= htmlspecialchars($t['empty_search']) ?></div>
        </div>
      </div>

    </div>
  </main>
</div>

<!-- Floating Toast -->
<div id="toastMsg" class="toast-msg">
  <span id="toastIcon">✅</span>
  <span id="toastText"><?= htmlspecialchars($t['status_updated']) ?></span>
</div>

<script>
  let activeStatusFilter = 'all';
  let activeCategoryFilter = 'all';
  let searchQuery = '';

  const confirmPublishText = <?= json_encode($t['confirm_publish_all']) ?>;
  const statusUpdatedText = <?= json_encode($t['status_updated']) ?>;

  // Sync with topbar search
  const topbarSearch = document.getElementById('topbarSearch');
  const localSearch = document.getElementById('localSearchInput');

  if (topbarSearch) {
    topbarSearch.addEventListener('input', function(e) {
      if (localSearch) localSearch.value = e.target.value;
      handleSearch(e.target.value);
    });
  }

  function handleSearch(val) {
    searchQuery = (val || '').trim().toLowerCase();
    applyFilters();
  }

  function filterByStatus(status, el) {
    activeStatusFilter = status;
    document.querySelectorAll('.f-stat-card').forEach(c => c.classList.remove('active-filter'));
    if (el) el.classList.add('active-filter');
    applyFilters();
  }

  function filterByCategory(cat, el) {
    activeCategoryFilter = cat;
    document.querySelectorAll('#categoryPills .filter-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    applyFilters();
  }

  function applyFilters() {
    const cards = document.querySelectorAll('.feature-card');
    const masterCard = document.getElementById('card-pro_studio');
    let visibleCount = 0;

    cards.forEach(card => {
      const cardStatus = card.getAttribute('data-status');
      const cardCat = card.getAttribute('data-category');
      const cardSuite = card.getAttribute('data-suite') || '';
      const cardTitle = card.getAttribute('data-title') || '';
      const cardDesc = card.getAttribute('data-desc') || '';

      const matchStatus = (activeStatusFilter === 'all' || cardStatus === activeStatusFilter || (activeStatusFilter === 'soon' && (cardStatus === 'soon' || cardStatus === 'coming_soon')));
      const matchCat = (activeCategoryFilter === 'all' || cardCat === activeCategoryFilter || (activeCategoryFilter === 'pro_studio' && cardSuite === 'pro_studio'));
      const matchSearch = (!searchQuery || cardTitle.includes(searchQuery) || cardDesc.includes(searchQuery));

      if (matchStatus && matchCat && matchSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (masterCard) {
      const mStatus = masterCard.getAttribute('data-status');
      const mTitle = masterCard.getAttribute('data-title') || '';
      const mDesc = masterCard.getAttribute('data-desc') || '';
      const matchMStatus = (activeStatusFilter === 'all' || mStatus === activeStatusFilter || (activeStatusFilter === 'soon' && (mStatus === 'soon' || mStatus === 'coming_soon')));
      const matchMCat = (activeCategoryFilter === 'all' || activeCategoryFilter === 'pro_studio');
      const matchMSearch = (!searchQuery || mTitle.includes(searchQuery) || mDesc.includes(searchQuery) || searchQuery.includes('pro') || searchQuery.includes('studio'));
      if (matchMStatus && matchMCat && matchMSearch) {
        masterCard.style.display = 'block';
        visibleCount++;
      } else {
        masterCard.style.display = 'none';
      }
    }

    const empty = document.getElementById('emptySearchState');
    if (empty) {
      empty.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  function recalculateStats() {
    const cards = document.querySelectorAll('.feature-card');
    let total = cards.length;
    let published = 0;
    let beta = 0;
    let soon = 0;
    let off = 0;

    cards.forEach(card => {
      const st = card.getAttribute('data-status');
      if (st === 'published') published++;
      else if (st === 'beta') beta++;
      else if (st === 'soon' || st === 'coming_soon') soon++;
      else off++;
    });

    const statTotalEl = document.getElementById('statTotal');
    const statPubEl = document.getElementById('statPublished');
    const statBetaEl = document.getElementById('statBeta');
    const statSoonEl = document.getElementById('statSoon');
    const statOffEl = document.getElementById('statOff');
    if (statTotalEl) statTotalEl.textContent = total;
    if (statPubEl) statPubEl.textContent = published;
    if (statBetaEl) statBetaEl.textContent = beta;
    if (statSoonEl) statSoonEl.textContent = soon;
    if (statOffEl) statOffEl.textContent = off;
  }

  function showToast(text, icon = '✅') {
    const toast = document.getElementById('toastMsg');
    const tText = document.getElementById('toastText');
    const tIcon = document.getElementById('toastIcon');
    if (!toast) return;

    tText.textContent = text;
    tIcon.textContent = icon;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function updateFeatureStatusUI(featureId, newStatus) {
    const card = document.getElementById('card-' + featureId);
    if (card) {
      card.setAttribute('data-status', newStatus);
      const dot = document.getElementById('dot-' + featureId);
      if (dot) dot.className = 'live-dot ' + newStatus;

      const badge = document.getElementById('badge-' + featureId);
      if (badge) {
        if (newStatus === 'published') {
          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          badge.textContent = '🟢 Live';
        } else if (newStatus === 'beta') {
          badge.style.background = '#fef3c7';
          badge.style.color = '#b45309';
          badge.textContent = '🧪 Վերամշակման մեջ';
        } else if (newStatus === 'soon' || newStatus === 'coming_soon') {
          badge.style.background = '#e0e7ff';
          badge.style.color = '#4338ca';
          badge.textContent = '⏳ Շուտով';
        } else {
          badge.style.background = '#f1f5f9';
          badge.style.color = '#64748b';
          badge.textContent = '⚪ Փորձարարական';
        }
      }

      const switchBox = card.querySelector('.feature-segmented-switch');
      if (switchBox) {
        const buttons = switchBox.querySelectorAll('.switch-opt');
        buttons.forEach(btn => {
          btn.classList.remove('active-published', 'active-beta', 'active-soon', 'active-off');
          const btnSt = btn.getAttribute('data-status');
          if (btnSt === newStatus || (btnSt === 'soon' && (newStatus === 'soon' || newStatus === 'coming_soon'))) {
            btn.classList.add('active-' + btnSt);
          }
        });
      }
    }

    // Sync sub-card in Master Suite
    const subCard = document.getElementById('suite-sub-' + featureId);
    if (subCard) {
      subCard.className = 'suite-module-card ' + newStatus;
      const subBadge = document.getElementById('subbadge-' + featureId);
      if (subBadge) {
        subBadge.className = 'suite-module-status ' + newStatus;
        subBadge.textContent = newStatus === 'published' ? 'Live' : (newStatus === 'beta' ? 'Beta' : (newStatus === 'soon' || newStatus === 'coming_soon' ? 'Շուտով' : 'Off'));
      }
      const miniSwitch = subCard.querySelector('.feature-segmented-switch.mini');
      if (miniSwitch) {
        const btns = miniSwitch.querySelectorAll('.switch-opt');
        btns.forEach(btn => {
          btn.classList.remove('active-published', 'active-beta', 'active-soon', 'active-off');
          const btnSt = btn.getAttribute('data-status');
          if (btnSt === newStatus || (btnSt === 'soon' && (newStatus === 'soon' || newStatus === 'coming_soon'))) {
            btn.classList.add('active-' + btnSt);
          }
        });
      }
    }
  }

  async function updateFeatureStatus(featureId, newStatus) {
    const card = document.getElementById('card-' + featureId);
    if (!card) return;

    const oldStatus = card.getAttribute('data-status');
    if (oldStatus === newStatus) return;

    // Optimistic UI update
    updateFeatureStatusUI(featureId, newStatus);
    recalculateStats();

    try {
      const res = await fetch('/features_api.php?action=update_flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Server error');
      }

      // Instant synchronization with client PWA and app cache
      try {
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('wp_feature_flags') || '{}'); } catch {}
        stored[featureId] = newStatus;
        localStorage.setItem('wp_feature_flags', JSON.stringify(stored));
        window.dispatchEvent(new CustomEvent('wp_feature_flags_updated', {
          detail: { flags: stored }
        }));
      } catch (e) {}

      showToast(statusUpdatedText + ' (' + newStatus.toUpperCase() + ')', '✨');
    } catch (err) {
      // Revert optimistic update
      updateFeatureStatusUI(featureId, oldStatus);
      recalculateStats();
      showToast('Սխալ՝ ' + (err.message || 'Չհաջողվեց պահպանել'), '⚠️');
    }
  }

  async function setSuiteAll(newStatus) {
    const statusLabels = {
      published: 'Live (հասանելի բոլորին)',
      beta: 'Beta (փորձարկման ռեժիմ)',
      soon: 'Շուտով (նշված շուտով և անհասանելի)',
      off: 'Off (անջատված)'
    };
    if (!confirm('Pro Studio-ի բոլոր 6 գործիքները դարձնե՞լ ' + (statusLabels[newStatus] || newStatus) + ':')) {
      return;
    }

    try {
      const res = await fetch('/features_api.php?action=update_suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite_id: 'pro_studio', status: newStatus, cascade: true })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Server error');
      }

      updateFeatureStatusUI('pro_studio', newStatus);

      const modules = ['live_stage_follower', 'rehearsal_stems', 'lyrics_projection', 'worship_ai_studio', 'service_planner', 'smart_metronome'];
      modules.forEach(mId => {
        updateFeatureStatusUI(mId, newStatus);
      });

      recalculateStats();
      applyFilters();

      try {
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('wp_feature_flags') || '{}'); } catch {}
        stored['pro_studio'] = newStatus;
        modules.forEach(mId => { stored[mId] = newStatus; });
        localStorage.setItem('wp_feature_flags', JSON.stringify(stored));
        window.dispatchEvent(new CustomEvent('wp_feature_flags_updated', {
          detail: { flags: stored }
        }));
      } catch (e) {}

      showToast('Worship Pro Studio-ի բոլոր 6 գործիքները դարձան ' + newStatus.toUpperCase(), '🎛️');
    } catch (err) {
      showToast('Սխալ՝ ' + (err.message || 'Չհաջողվեց թարմացնել հավաքականը'), '⚠️');
    }
  }

  async function publishAllFeatures() {
    if (!confirm(confirmPublishText)) return;

    try {
      const res = await fetch('/features_api.php?action=publish_all', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        document.querySelectorAll('.feature-card').forEach(card => {
          card.setAttribute('data-status', 'published');
          const id = card.getAttribute('data-id');
          const dot = document.getElementById('dot-' + id);
          if (dot) dot.className = 'live-dot published';
          const switchBox = card.querySelector('.feature-segmented-switch');
          if (switchBox) {
            const buttons = switchBox.querySelectorAll('.switch-opt');
            buttons.forEach(b => b.classList.remove('active-published', 'active-beta', 'active-off'));
            buttons[2].classList.add('active-published');
          }
          const badge = document.getElementById('badge-' + id);
          if (badge) {
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
            badge.textContent = '🟢 Live';
          }
        });
        recalculateStats();
        applyFilters();

        // Instant synchronization with client PWA and app cache
        try {
          let stored = {};
          try { stored = JSON.parse(localStorage.getItem('wp_feature_flags') || '{}'); } catch {}
          document.querySelectorAll('.feature-card').forEach(c => {
            const fid = c.getAttribute('data-id');
            if (fid) stored[fid] = 'published';
          });
          localStorage.setItem('wp_feature_flags', JSON.stringify(stored));
          window.dispatchEvent(new CustomEvent('wp_feature_flags_updated', {
            detail: { flags: stored }
          }));
        } catch (e) {}

        showToast('Բոլոր ֆունկցիաները հաջողությամբ դարձան Live!', '🚀');
      } else {
        showToast('Սխալ՝ ' + (data.error || 'Չհաջողվեց հրապարակել'), '⚠️');
      }
    } catch (err) {
      showToast('Ցանցային սխալ', '⚠️');
    }
  }
</script>
</body>
</html>
