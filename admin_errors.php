<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/error_service.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_errors.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail       = trim((string)($adminUser['email'] ?? ''));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?');
    exit;
}

$i18n = [
    'hy' => [
        'page_title' => 'Սխալների Մոնիտոր — Worship Platform Admin',
        'title' => 'Սխալների Մոնիտորինգ',
        'subtitle' => 'Կայքի, PWA հավելվածի և սերվերի սխալները իրական ժամանակում',
        'live' => 'ՈՒՂԻՂ ԵԹԵՐ (LIVE)',
        'stream_active' => 'Սթրիմն ակտիվ է',
        'stream_paused' => 'Դադարեցված է',
        'refresh' => 'Թարմացնել',
        'clear_all' => 'Մաքրել մատյանը',
        'clear_confirm' => 'Վստա՞հ եք, որ ցանկանում եք մաքրել բոլոր գրանցված սխալները։',
        'export' => 'Արտահանել JSON',
        'test_error' => 'Փորձարկել (Test Error)',
        'sound' => 'Ձայնային ազդանշան',
        'interval' => 'Թարմացում՝',
        // Hero
        'hero_ok_title' => 'Բոլոր համակարգերն աշխատում են անխափան',
        'hero_ok_sub' => 'Կայքում, PWA ծրագրում և սերվերում ակտիվ սխալներ չկան:',
        'hero_err_title' => 'Հայտնաբերվել են համակարգային սխալներ',
        'hero_err_sub' => 'Գրանցվել են սխալներ, որոնք պահանջում են ադմինիստրատորի ուշադրությունը:',
        // Stats
        'total_errors' => 'Ընդհանուր սխալներ',
        'today_errors' => 'Այսօր (24 ժամ)',
        'app_errors' => 'Ծրագիր (PWA)',
        'web_errors' => 'Կայք (Web)',
        'server_errors' => 'Սերվեր (PHP / DB)',
        'critical_errors' => 'Կրիտիկական (Fatal)',
        // Filters
        'search_placeholder' => 'Որոնել սխալի հաղորդագրություն, ֆայլ, URL, email, IP...',
        'env_all' => 'Բոլոր հարթակները',
        'env_app' => 'PWA Ծրագիր',
        'env_web' => 'Կայք (Web)',
        'env_server' => 'Սերվեր (Backend)',
        'level_all' => 'Բոլոր մակարդակները',
        'level_fatal' => 'Fatal (Կրիտիկական)',
        'level_error' => 'Error (Սովորական)',
        'level_warning' => 'Warning (Զգուշացում)',
        'level_promise' => 'Promise Rejection',
        'level_network' => 'Network / API Error',
        // Table & Details
        'inspect' => 'Մանրամասն',
        'occurrences' => 'կրկնություն',
        'empty_title' => 'Սխալներ չեն գրանցվել',
        'empty_desc' => 'Համակարգը, կայքը և PWA ծրագիրն աշխատում են անխափան։ Ցանկացած նոր սխալ կհայտնվի այստեղ ակնթարթորեն:',
        'modal_title' => 'Սխալի Մանրամասն Զննում (Inspector)',
        'close' => 'Փակել',
        'copy_stack' => 'Պատճենել Stack Trace',
        'copy_json' => 'Պատճենել JSON',
        'copied' => 'Պատճենվեց!',
    ],
    'ru' => [
        'page_title' => 'Монитор ошибок — Worship Platform Admin',
        'title' => 'Мониторинг Ошибок',
        'subtitle' => 'Ошибки сайта, PWA-приложения и сервера в реальном времени',
        'live' => 'ПРЯМОЙ ЭФИР (LIVE)',
        'stream_active' => 'Стрим активен',
        'stream_paused' => 'Приостановлен',
        'refresh' => 'Обновить',
        'clear_all' => 'Очистить журнал',
        'clear_confirm' => 'Вы уверены, что хотите удалить все сохраненные ошибки?',
        'export' => 'Экспорт JSON',
        'test_error' => 'Тест ошибки',
        'sound' => 'Звуковое оповещение',
        'interval' => 'Обновление:',
        // Hero
        'hero_ok_title' => 'Все системы работают стабильно',
        'hero_ok_sub' => 'В приложении, на сайте и сервере активных сбоев нет.',
        'hero_err_title' => 'Обнаружены системные ошибки',
        'hero_err_sub' => 'Зафиксированы сбои, требующие внимания администратора.',
        // Stats
        'total_errors' => 'Всего ошибок',
        'today_errors' => 'Сегодня (24 часа)',
        'app_errors' => 'Приложение (PWA)',
        'web_errors' => 'Сайт (Web)',
        'server_errors' => 'Сервер (PHP / DB)',
        'critical_errors' => 'Критические (Fatal)',
        // Filters
        'search_placeholder' => 'Поиск по ошибке, файлу, URL, email, IP...',
        'env_all' => 'Все платформы',
        'env_app' => 'PWA Приложение',
        'env_web' => 'Сайт (Web)',
        'env_server' => 'Сервер (Backend)',
        'level_all' => 'Все уровни',
        'level_fatal' => 'Fatal (Критические)',
        'level_error' => 'Error (Обычные)',
        'level_warning' => 'Warning (Предупреждения)',
        'level_promise' => 'Promise Rejection',
        'level_network' => 'Network / API Error',
        // Table & Details
        'inspect' => 'Подробнее',
        'occurrences' => 'повторений',
        'empty_title' => 'Ошибок не зафиксировано',
        'empty_desc' => 'Платформа, сайт и приложение работают стабильно. Все новые сбои отобразятся здесь мгновенно.',
        'modal_title' => 'Детальный аудит ошибки',
        'close' => 'Закрыть',
        'copy_stack' => 'Копировать Stack Trace',
        'copy_json' => 'Копировать JSON',
        'copied' => 'Скопировано!',
    ],
    'en' => [
        'page_title' => 'Error Monitor — Worship Platform Admin',
        'title' => 'Real-Time Error Monitor',
        'subtitle' => 'Live runtime monitoring for Web, PWA App, and Server backend',
        'live' => 'LIVE STREAM',
        'stream_active' => 'Stream active',
        'stream_paused' => 'Stream paused',
        'refresh' => 'Refresh Now',
        'clear_all' => 'Clear Logs',
        'clear_confirm' => 'Are you sure you want to clear all error records?',
        'export' => 'Export JSON',
        'test_error' => 'Send Test Error',
        'sound' => 'Audio Alert',
        'interval' => 'Interval:',
        // Hero
        'hero_ok_title' => 'All Systems Operating Normally',
        'hero_ok_sub' => 'No critical exceptions detected in Web, App, or Server runtimes.',
        'hero_err_title' => 'System Errors Detected',
        'hero_err_sub' => 'Errors recorded that may require administrator review.',
        // Stats
        'total_errors' => 'Total Errors',
        'today_errors' => 'Today (24h)',
        'app_errors' => 'PWA App',
        'web_errors' => 'Web Browser',
        'server_errors' => 'Server Backend',
        'critical_errors' => 'Critical (Fatal)',
        // Filters
        'search_placeholder' => 'Search error message, file, URL, email, IP...',
        'env_all' => 'All Platforms',
        'env_app' => 'PWA App',
        'env_web' => 'Web Browser',
        'env_server' => 'Server (PHP/DB)',
        'level_all' => 'All Levels',
        'level_fatal' => 'Fatal',
        'level_error' => 'Error',
        'level_warning' => 'Warning',
        'level_promise' => 'Promise Rejection',
        'level_network' => 'Network / API Error',
        // Table & Details
        'inspect' => 'Inspect',
        'occurrences' => 'hits',
        'empty_title' => 'No Errors Recorded',
        'empty_desc' => 'Everything is running cleanly across Web, App, and Server. Any incoming issues will appear here in real time.',
        'modal_title' => 'Error Inspector & Stack Trace',
        'close' => 'Close',
        'copy_stack' => 'Copy Stack Trace',
        'copy_json' => 'Copy JSON',
        'copied' => 'Copied!',
    ]
];

$t = $i18n[$adminLang] ?? $i18n['hy'];

// Initial load
$initialStats = wp_error_get_stats();
$initialLogs  = wp_error_get_logs([], 60);

$hasErrors = ($initialStats['total'] > 0);
$activePage = 'errors';
?>
<!doctype html>
<html lang="<?= htmlspecialchars($adminLang, ENT_QUOTES) ?>">
<head>
  <?php wp_admin_render_pwa_head($t['page_title']); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    /* ── Hero Status Banner (Matches admin_status.php & admin_server_load.php) ── */
    .status-hero {
      padding: 24px 32px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
      transition: all 0.3s ease;
      border: 1px solid transparent;
    }
    .status-hero.ok {
      background: linear-gradient(135deg, #e6f9f3 0%, #d0f5ea 100%);
      border-color: rgba(5, 205, 153, 0.3);
    }
    .status-hero.error {
      background: linear-gradient(135deg, #ffeeeb 0%, #ffe0da 100%);
      border-color: rgba(238, 93, 80, 0.3);
    }
    .status-hero-icon {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      flex-shrink: 0;
      color: #fff;
    }
    .status-hero.ok .status-hero-icon    { background: var(--success); }
    .status-hero.error .status-hero-icon { background: var(--danger); }
    .status-hero-text h2 {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--text);
      margin: 0 0 4px;
      letter-spacing: -0.3px;
    }
    .status-hero-text p {
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 500;
      margin: 0;
    }

    /* ── Live Pulse Controls ── */
    .live-controls-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .live-pulse-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ecfdf5;
      color: #059669;
      padding: 6px 14px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid rgba(5, 150, 105, 0.25);
    }
    .live-pulse-badge.paused {
      background: #f1f5f9;
      color: #64748b;
      border-color: #cbd5e1;
    }
    .live-pulse-badge.alert {
      background: #fef2f2;
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.3);
      animation: alert-shake 0.4s ease;
    }
    @keyframes alert-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse-ring 1.8s infinite;
    }
    .live-pulse-badge.paused .pulse-dot {
      background: #94a3b8;
      animation: none;
    }
    .live-pulse-badge.alert .pulse-dot {
      background: #ef4444;
      animation: pulse-ring-red 1.2s infinite;
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    @keyframes pulse-ring-red {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
      70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* ── KPI Summary Cards ── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--card);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-number {
      font-size: 26px;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
    }
    .kpi-card.critical .kpi-number { color: #dc2626; }
    .kpi-card.app .kpi-number { color: #7c3aed; }
    .kpi-card.web .kpi-number { color: #2563eb; }
    .kpi-card.server .kpi-number { color: #d97706; }

    /* ── Filter Toolbar ── */
    .filter-panel {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: var(--shadow-sm);
    }
    .filter-left, .filter-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .search-wrap {
      position: relative;
      min-width: 280px;
      flex: 1;
    }
    .search-wrap input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s;
    }
    .search-wrap input:focus {
      border-color: var(--primary);
    }
    .search-wrap svg {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
    }
    .select-ctrl {
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg);
      color: var(--text);
      outline: none;
      cursor: pointer;
    }

    .btn-tool {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--line);
      background: var(--card);
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
    }
    .btn-tool:hover {
      background: var(--bg);
      border-color: #cbd5e1;
    }
    .btn-tool.primary {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .btn-tool.primary:hover {
      filter: brightness(1.08);
    }
    .btn-tool.danger {
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.3);
      background: #fff;
    }
    .btn-tool.danger:hover {
      background: #fef2f2;
      border-color: #dc2626;
    }

    .audio-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text);
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 20px;
      background: var(--bg);
      border: 1px solid var(--line);
      user-select: none;
    }
    .audio-pill input {
      cursor: pointer;
    }

    /* ── Error Stream Cards ── */
    .error-stream {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .error-card-item {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: flex-start;
      gap: 16px;
      transition: border-color 0.15s, box-shadow 0.15s;
      cursor: pointer;
      position: relative;
    }
    .error-card-item:hover {
      border-color: #94a3b8;
      box-shadow: var(--shadow-md);
    }
    .error-card-item.just-added {
      animation: flash-row 2s ease;
    }
    @keyframes flash-row {
      0% { background: #fee2e2; }
      100% { background: var(--card); }
    }

    .level-chip {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .level-chip.fatal { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .level-chip.error { background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; }
    .level-chip.warning { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
    .level-chip.promise { background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; }
    .level-chip.network { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }

    .env-chip {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .env-chip.app { background: #ede9fe; color: #5b21b6; }
    .env-chip.web { background: #e0f2fe; color: #0369a1; }
    .env-chip.server, .env-chip.db { background: #fef3c7; color: #92400e; }
    .env-chip.api { background: #fce7f3; color: #9d174d; }

    .hits-badge {
      background: #f1f5f9;
      color: #475569;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .error-body {
      flex: 1;
      min-width: 0;
    }
    .error-body-head {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 6px;
    }
    .error-text-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.4;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      word-break: break-word;
    }
    .error-meta-tags {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--muted);
      margin-top: 6px;
    }
    .error-meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .error-stamp {
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
      white-space: nowrap;
    }

    .empty-banner {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 60px 24px;
      text-align: center;
    }
    .empty-banner svg {
      color: #10b981;
      margin-bottom: 16px;
    }
    .empty-banner h3 {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      margin: 0 0 6px;
    }
    .empty-banner p {
      font-size: 14px;
      color: var(--muted);
      max-width: 500px;
      margin: 0 auto;
    }

    /* ── Modal Inspector ── */
    .inspector-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .inspector-overlay.open {
      display: flex;
    }
    .inspector-card {
      background: var(--card);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 860px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
    }
    .inspector-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      background: var(--card);
      z-index: 2;
    }
    .inspector-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .inspector-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .inspector-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: var(--bg);
      border-radius: var(--radius-md);
      padding: 16px;
      border: 1px solid var(--line);
    }
    .grid-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .grid-cell label {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .grid-cell span {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      word-break: break-all;
    }
    .code-trace {
      background: #0f172a;
      color: #f8fafc;
      border-radius: var(--radius-md);
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      max-height: 350px;
      white-space: pre-wrap;
      border: 1px solid #1e293b;
    }
    .inspector-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card);
      position: sticky;
      bottom: 0;
      z-index: 2;
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

    <div style="padding: 28px 40px 60px; max-width: 1400px;">
      
      <!-- Top Title & Live Stream Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--text); margin-bottom: 4px; display:flex; align-items:center; gap:10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <?= htmlspecialchars($t['title']) ?>
          </h1>
          <p style="color: var(--muted); font-size: 0.9rem; font-weight: 500; margin:0;"><?= htmlspecialchars($t['subtitle']) ?></p>
        </div>

        <div class="live-controls-group">
          <div class="live-pulse-badge" id="liveBadge">
            <span class="pulse-dot"></span>
            <span id="liveStatusText"><?= htmlspecialchars($t['live']) ?></span>
          </div>

          <button class="btn-tool primary" id="btnRefresh" title="Refresh error logs">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <?= htmlspecialchars($t['refresh']) ?>
          </button>
        </div>
      </div>

      <!-- Hero Banner -->
      <div id="heroBanner" class="status-hero <?= $hasErrors ? 'error' : 'ok' ?>">
        <div class="status-hero-icon" id="heroIcon">
          <?= $hasErrors ? '✕' : '✓' ?>
        </div>
        <div class="status-hero-text">
          <h2 id="heroTitle"><?= htmlspecialchars($hasErrors ? $t['hero_err_title'] : $t['hero_ok_title']) ?></h2>
          <p id="heroSub"><?= htmlspecialchars($hasErrors ? $t['hero_err_sub'] : $t['hero_ok_sub']) ?></p>
        </div>
      </div>

      <!-- KPI Grid Cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-title"><?= htmlspecialchars($t['total_errors']) ?></div>
          <div class="kpi-number" id="kpiTotal"><?= (int)$initialStats['total'] ?></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title"><?= htmlspecialchars($t['today_errors']) ?></div>
          <div class="kpi-number" id="kpiToday"><?= (int)$initialStats['today'] ?></div>
        </div>
        <div class="kpi-card app">
          <div class="kpi-title"><?= htmlspecialchars($t['app_errors']) ?></div>
          <div class="kpi-number" id="kpiApp"><?= (int)$initialStats['app'] ?></div>
        </div>
        <div class="kpi-card web">
          <div class="kpi-title"><?= htmlspecialchars($t['web_errors']) ?></div>
          <div class="kpi-number" id="kpiWeb"><?= (int)$initialStats['web'] ?></div>
        </div>
        <div class="kpi-card server">
          <div class="kpi-title"><?= htmlspecialchars($t['server_errors']) ?></div>
          <div class="kpi-number" id="kpiServer"><?= (int)$initialStats['server'] ?></div>
        </div>
        <div class="kpi-card critical">
          <div class="kpi-title"><?= htmlspecialchars($t['critical_errors']) ?></div>
          <div class="kpi-number" id="kpiCritical"><?= (int)$initialStats['critical'] ?></div>
        </div>
      </div>

      <!-- Filter Panel Toolbar -->
      <div class="filter-panel">
        <div class="filter-left">
          <div class="search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="filterSearch" placeholder="<?= htmlspecialchars($t['search_placeholder']) ?>">
          </div>

          <select class="select-ctrl" id="filterEnv">
            <option value="all"><?= htmlspecialchars($t['env_all']) ?></option>
            <option value="app"><?= htmlspecialchars($t['env_app']) ?></option>
            <option value="web"><?= htmlspecialchars($t['env_web']) ?></option>
            <option value="server"><?= htmlspecialchars($t['env_server']) ?></option>
          </select>

          <select class="select-ctrl" id="filterLevel">
            <option value="all"><?= htmlspecialchars($t['level_all']) ?></option>
            <option value="fatal"><?= htmlspecialchars($t['level_fatal']) ?></option>
            <option value="error"><?= htmlspecialchars($t['level_error']) ?></option>
            <option value="warning"><?= htmlspecialchars($t['level_warning']) ?></option>
            <option value="promise"><?= htmlspecialchars($t['level_promise']) ?></option>
          </select>

          <select class="select-ctrl" id="pollingInterval">
            <option value="3000"><?= htmlspecialchars($t['interval']) ?> 3s</option>
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="0"><?= htmlspecialchars($t['stream_paused']) ?></option>
          </select>

          <label class="audio-pill" title="Play sound on new errors">
            <input type="checkbox" id="toggleSound" checked>
            <span>🔔 <?= htmlspecialchars($t['sound']) ?></span>
          </label>
        </div>

        <div class="filter-right">
          <button class="btn-tool" id="btnTestError" title="Simulate sending a test error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            <?= htmlspecialchars($t['test_error']) ?>
          </button>

          <button class="btn-tool" id="btnExport" title="Export all logs as JSON">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <?= htmlspecialchars($t['export']) ?>
          </button>

          <button class="btn-tool danger" id="btnClear" title="Clear all error records">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <?= htmlspecialchars($t['clear_all']) ?>
          </button>
        </div>
      </div>

      <!-- Error Stream Cards Container -->
      <div id="errorStreamContainer" class="error-stream">
        <!-- Injected via JavaScript -->
      </div>

      <!-- Empty State -->
      <div id="emptyState" class="empty-banner" style="display:none;">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <h3><?= htmlspecialchars($t['empty_title']) ?></h3>
        <p><?= htmlspecialchars($t['empty_desc']) ?></p>
      </div>

    </div>
  </main>

</div>

<!-- Inspector Modal -->
<div class="inspector-overlay" id="inspectModal">
  <div class="inspector-card">
    <div class="inspector-header">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <?= htmlspecialchars($t['modal_title']) ?>
      </h3>
      <button class="btn-tool" onclick="closeInspectModal()">✕</button>
    </div>

    <div class="inspector-content">
      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
          <span id="mLevel" class="level-chip"></span>
          <span id="mEnv" class="env-chip"></span>
          <span id="mHits" class="hits-badge"></span>
        </div>
        <div id="mMessage" class="error-text-title" style="font-size:15px; padding:12px; background:var(--bg); border:1px solid var(--line); border-radius:8px;"></div>
      </div>

      <div class="inspector-grid">
        <div class="grid-cell">
          <label>URL / Route</label>
          <span id="mUrl">—</span>
        </div>
        <div class="grid-cell">
          <label>Source File & Line</label>
          <span id="mFile">—</span>
        </div>
        <div class="grid-cell">
          <label>User / Email</label>
          <span id="mUser">—</span>
        </div>
        <div class="grid-cell">
          <label>IP Address</label>
          <span id="mIp">—</span>
        </div>
        <div class="grid-cell">
          <label>First Seen</label>
          <span id="mFirstSeen">—</span>
        </div>
        <div class="grid-cell">
          <label>Last Seen</label>
          <span id="mLastSeen">—</span>
        </div>
        <div class="grid-cell" style="grid-column:1/-1;">
          <label>Device / User Agent</label>
          <span id="mUserAgent" style="font-size:12px; color:var(--muted); font-family:monospace;">—</span>
        </div>
      </div>

      <div id="stackTraceSection">
        <label style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; display:block;">STACK TRACE</label>
        <pre class="code-trace" id="mStack"></pre>
      </div>
    </div>

    <div class="inspector-footer">
      <div style="display:flex; gap:8px;">
        <button class="btn-tool" id="btnCopyStack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <?= htmlspecialchars($t['copy_stack']) ?>
        </button>
        <button class="btn-tool" id="btnCopyJson">
          <?= htmlspecialchars($t['copy_json']) ?>
        </button>
      </div>
      <button class="btn-tool primary" onclick="closeInspectModal()"><?= htmlspecialchars($t['close']) ?></button>
    </div>
  </div>
</div>

<script>
(function() {
  'use strict';

  let currentLogs = <?= json_encode($initialLogs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
  let activeInspectItem = null;
  let pollTimer = null;
  let lastHighestId = 0;
  let audioContext = null;

  currentLogs.forEach(function(item) {
    var idNum = parseInt(item.id, 10) || 0;
    if (idNum > lastHighestId) lastHighestId = idNum;
  });

  function playAlertChime() {
    if (!document.getElementById('toggleSound').checked) return;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.35);
    } catch (_) {}
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const now = Date.now();
    const then = new Date(dateStr.replace(' ', 'T')).getTime();
    if (isNaN(then)) return dateStr;
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));

    const lang = '<?= $adminLang ?>';
    if (diffSec < 10) {
      return lang === 'hy' ? 'հենց հիմա' : (lang === 'ru' ? 'только что' : 'just now');
    }
    if (diffSec < 60) {
      return lang === 'hy' ? `${diffSec} վրկ առաջ` : (lang === 'ru' ? `${diffSec} сек. назад` : `${diffSec}s ago`);
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return lang === 'hy' ? `${diffMin} րոպե առաջ` : (lang === 'ru' ? `${diffMin} мин. назад` : `${diffMin}m ago`);
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return lang === 'hy' ? `${diffHours} ժամ առաջ` : (lang === 'ru' ? `${diffHours} ч. назад` : `${diffHours}h ago`);
    }
    return dateStr.substring(0, 16);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderErrorList(logs, newlyAddedIds) {
    const container = document.getElementById('errorStreamContainer');
    const emptyState = document.getElementById('emptyState');
    if (!logs || logs.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    let html = '';

    logs.forEach(function(item) {
      const level = (item.level || 'error').toLowerCase();
      const env = (item.environment || 'web').toLowerCase();
      const occ = parseInt(item.occurrences, 10) || 1;
      const isNew = newlyAddedIds && newlyAddedIds.includes(String(item.id));

      const fileInfo = item.file ? `${escapeHtml(item.file)}${item.line ? ':' + item.line : ''}` : '';
      const userTag = item.user_email ? escapeHtml(item.user_email) : (item.ip_address || '');

      html += `
        <div class="error-card-item ${isNew ? 'just-added' : ''}" data-id="${escapeHtml(item.id)}" onclick="window.inspectError('${escapeHtml(item.id)}')">
          <div class="error-body">
            <div class="error-body-head">
              <span class="level-chip ${escapeHtml(level)}">${escapeHtml(level)}</span>
              <span class="env-chip ${escapeHtml(env)}">${escapeHtml(env)}</span>
              ${occ > 1 ? `<span class="hits-badge">${occ} <?= htmlspecialchars($t['occurrences']) ?></span>` : ''}
              <span style="flex:1;"></span>
              <span class="error-stamp" title="${escapeHtml(item.last_seen)}">${formatRelativeTime(item.last_seen)}</span>
            </div>
            
            <div class="error-text-title">${escapeHtml(item.message)}</div>

            <div class="error-meta-tags">
              ${fileInfo ? `<span class="error-meta-tag" title="${escapeHtml(item.file)}">📁 ${fileInfo}</span>` : ''}
              ${item.url ? `<span class="error-meta-tag" title="${escapeHtml(item.url)}">🔗 ${escapeHtml(item.url)}</span>` : ''}
              ${userTag ? `<span class="error-meta-tag">👤 ${userTag}</span>` : ''}
            </div>
          </div>
          
          <button class="btn-tool" style="padding:6px 12px; font-size:12px; align-self:center;" onclick="event.stopPropagation(); window.inspectError('${escapeHtml(item.id)}')">
            <?= htmlspecialchars($t['inspect']) ?>
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function applyFilters() {
    const searchVal = document.getElementById('filterSearch').value.toLowerCase().trim();
    const envVal = document.getElementById('filterEnv').value;
    const levelVal = document.getElementById('filterLevel').value;

    const filtered = currentLogs.filter(function(item) {
      if (envVal !== 'all' && (item.environment || '').toLowerCase() !== envVal) {
        return false;
      }
      if (levelVal !== 'all' && (item.level || '').toLowerCase() !== levelVal) {
        return false;
      }
      if (searchVal) {
        const text = `${item.message || ''} ${item.file || ''} ${item.url || ''} ${item.user_email || ''} ${item.ip_address || ''}`.toLowerCase();
        if (text.indexOf(searchVal) === -1) return false;
      }
      return true;
    });

    renderErrorList(filtered);
  }

  function updateKpis(stats) {
    if (!stats) return;
    document.getElementById('kpiTotal').textContent = stats.total || 0;
    document.getElementById('kpiToday').textContent = stats.today || 0;
    document.getElementById('kpiApp').textContent = stats.app || 0;
    document.getElementById('kpiWeb').textContent = stats.web || 0;
    document.getElementById('kpiServer').textContent = stats.server || 0;
    document.getElementById('kpiCritical').textContent = stats.critical || 0;

    const hero = document.getElementById('heroBanner');
    const heroIcon = document.getElementById('heroIcon');
    const heroTitle = document.getElementById('heroTitle');
    const heroSub = document.getElementById('heroSub');

    if (stats.total > 0) {
      hero.className = 'status-hero error';
      heroIcon.textContent = '✕';
      heroTitle.textContent = '<?= htmlspecialchars($t['hero_err_title']) ?>';
      heroSub.textContent = '<?= htmlspecialchars($t['hero_err_sub']) ?>';
    } else {
      hero.className = 'status-hero ok';
      heroIcon.textContent = '✓';
      heroTitle.textContent = '<?= htmlspecialchars($t['hero_ok_title']) ?>';
      heroSub.textContent = '<?= htmlspecialchars($t['hero_ok_sub']) ?>';
    }
  }

  async function fetchLatestErrors() {
    try {
      const resp = await fetch('/error_api.php?action=poll&limit=60', { cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.ok) return;

      const newLogs = data.logs || [];
      const newIds = [];
      let hasNewCritical = false;

      newLogs.forEach(function(item) {
        const idNum = parseInt(item.id, 10) || 0;
        if (idNum > lastHighestId) {
          lastHighestId = idNum;
          newIds.push(String(item.id));
          if (item.level === 'fatal' || item.level === 'error') {
            hasNewCritical = true;
          }
        }
      });

      if (newIds.length > 0 && hasNewCritical) {
        playAlertChime();
        const badge = document.getElementById('liveBadge');
        badge.classList.add('alert');
        setTimeout(() => badge.classList.remove('alert'), 2500);
      }

      currentLogs = newLogs;
      updateKpis(data.stats);
      applyFilters();
    } catch (_) {}
  }

  function setupPolling() {
    if (pollTimer) clearInterval(pollTimer);
    const intervalMs = parseInt(document.getElementById('pollingInterval').value, 10);
    const badge = document.getElementById('liveBadge');
    const statusText = document.getElementById('liveStatusText');

    if (intervalMs > 0) {
      badge.classList.remove('paused');
      statusText.textContent = '<?= htmlspecialchars($t['live']) ?>';
      pollTimer = setInterval(fetchLatestErrors, intervalMs);
    } else {
      badge.classList.add('paused');
      statusText.textContent = '<?= htmlspecialchars($t['stream_paused']) ?>';
    }
  }

  window.inspectError = function(id) {
    const item = currentLogs.find(l => String(l.id) === String(id));
    if (!item) return;
    activeInspectItem = item;

    document.getElementById('mLevel').textContent = (item.level || 'error').toUpperCase();
    document.getElementById('mLevel').className = 'level-chip ' + (item.level || 'error').toLowerCase();
    document.getElementById('mEnv').textContent = (item.environment || 'web').toUpperCase();
    document.getElementById('mEnv').className = 'env-chip ' + (item.environment || 'web').toLowerCase();
    document.getElementById('mHits').textContent = (item.occurrences || 1) + ' <?= htmlspecialchars($t['occurrences']) ?>';

    document.getElementById('mMessage').textContent = item.message || '';
    document.getElementById('mUrl').textContent = item.url || '—';
    document.getElementById('mFile').textContent = (item.file || '—') + (item.line ? ':' + item.line : '');
    document.getElementById('mUser').textContent = (item.user_email || 'Guest') + (item.user_id ? ' (ID: ' + item.user_id + ')' : '');
    document.getElementById('mIp').textContent = item.ip_address || '—';
    document.getElementById('mFirstSeen').textContent = item.first_seen || '—';
    document.getElementById('mLastSeen').textContent = item.last_seen || '—';

    let uaDetails = item.user_agent || 'Unknown';
    if (item.device_info) {
      try {
        const dObj = typeof item.device_info === 'object' ? item.device_info : JSON.parse(item.device_info);
        uaDetails += ` | ${dObj.screen || ''} | ${dObj.platform || ''}`;
      } catch (_) {}
    }
    document.getElementById('mUserAgent').textContent = uaDetails;

    const stackSection = document.getElementById('stackTraceSection');
    if (item.stack_trace && item.stack_trace.trim() !== '') {
      document.getElementById('mStack').textContent = item.stack_trace;
      stackSection.style.display = 'block';
    } else {
      stackSection.style.display = 'none';
    }

    document.getElementById('inspectModal').classList.add('open');
  };

  window.closeInspectModal = function() {
    document.getElementById('inspectModal').classList.remove('open');
    activeInspectItem = null;
  };

  document.getElementById('filterSearch').addEventListener('input', applyFilters);
  document.getElementById('filterEnv').addEventListener('change', applyFilters);
  document.getElementById('filterLevel').addEventListener('change', applyFilters);
  document.getElementById('pollingInterval').addEventListener('change', setupPolling);
  document.getElementById('btnRefresh').addEventListener('click', fetchLatestErrors);

  document.getElementById('btnClear').addEventListener('click', async function() {
    if (!confirm('<?= htmlspecialchars($t['clear_confirm']) ?>')) return;
    try {
      const resp = await fetch('/error_api.php?action=clear', { method: 'POST' });
      const data = await resp.json();
      if (data.ok) {
        currentLogs = [];
        renderErrorList([]);
        updateKpis({ total: 0, today: 0, app: 0, web: 0, server: 0, critical: 0 });
      }
    } catch (_) {}
  });

  document.getElementById('btnExport').addEventListener('click', function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLogs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `worship_error_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  });

  document.getElementById('btnTestError').addEventListener('click', async function() {
    try {
      const resp = await fetch('/error_api.php?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'frontend_js',
          environment: 'app',
          level: 'error'
        })
      });
      if (resp.ok) {
        fetchLatestErrors();
      }
    } catch (_) {}
  });

  document.getElementById('btnCopyStack').addEventListener('click', function() {
    if (!activeInspectItem || !activeInspectItem.stack_trace) return;
    navigator.clipboard.writeText(activeInspectItem.stack_trace).then(() => {
      const orig = this.innerHTML;
      this.textContent = '<?= htmlspecialchars($t['copied']) ?>';
      setTimeout(() => this.innerHTML = orig, 1500);
    });
  });

  document.getElementById('btnCopyJson').addEventListener('click', function() {
    if (!activeInspectItem) return;
    navigator.clipboard.writeText(JSON.stringify(activeInspectItem, null, 2)).then(() => {
      const orig = this.innerHTML;
      this.textContent = '<?= htmlspecialchars($t['copied']) ?>';
      setTimeout(() => this.innerHTML = orig, 1500);
    });
  });

  document.getElementById('inspectModal').addEventListener('click', function(e) {
    if (e.target === this) closeInspectModal();
  });

  applyFilters();
  setupPolling();

})();
</script>

</body>
</html>
