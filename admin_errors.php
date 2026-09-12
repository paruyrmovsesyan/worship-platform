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
        'interval' => 'Թարմացման ինտերվալ',
        // Stats
        'total_errors' => 'Ընդհանուր սխալներ',
        'today_errors' => 'Այսօր (24 ժամ)',
        'app_errors' => 'Ծրագիր (PWA)',
        'web_errors' => 'Կայք (Web)',
        'server_errors' => 'Սերվեր (PHP / DB)',
        'critical_errors' => 'Կրիտիկական (Fatal)',
        // Filters
        'search_placeholder' => 'Որոնել ըստ սխալի, ֆայլի, URL-ի, email-ի, IP-ի...',
        'filter_env' => 'Բոլոր հարթակները',
        'filter_level' => 'Բոլոր աստիճանները',
        'env_all' => 'Բոլոր հարթակները',
        'env_app' => 'PWA Ծրագիր',
        'env_web' => 'Կայք (Web)',
        'env_server' => 'Սերվեր (Backend)',
        'level_all' => 'Բոլոր մակարդակները',
        'level_fatal' => 'Fatal (Կրիտիկական)',
        'level_error' => 'Error (Սովորական)',
        'level_warning' => 'Warning (Զգուշացում)',
        'level_promise' => 'Promise Rejection',
        // Table & Details
        'col_level' => 'Աստիճան',
        'col_env' => 'Հարթակ',
        'col_error' => 'Սխալի հաղորդագրություն և տեղ',
        'col_user' => 'Օգտատեր / IP',
        'col_time' => 'Ժամանակ',
        'col_actions' => 'Գործողություն',
        'inspect' => 'Մանրամասն',
        'occurrences' => 'կրկնություն',
        'empty_title' => 'Սխալներ չեն գրանցվել',
        'empty_desc' => 'Համակարգը, կայքը և PWA ծրագիրն աշխատում են անխափան։ Ցանկացած նոր սխալ կհայտնվի այստեղ անմիջապես։',
        'native_php_btn' => 'Սերվերի error_log ֆայլ',
        'modal_title' => 'Սխալի Մանրամասն Աուդիտ',
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
        'interval' => 'Интервал обновления',
        // Stats
        'total_errors' => 'Всего ошибок',
        'today_errors' => 'Сегодня (24 часа)',
        'app_errors' => 'Приложение (PWA)',
        'web_errors' => 'Сайт (Web)',
        'server_errors' => 'Сервер (PHP / DB)',
        'critical_errors' => 'Критические (Fatal)',
        // Filters
        'search_placeholder' => 'Поиск по ошибке, файлу, URL, email, IP...',
        'filter_env' => 'Все платформы',
        'filter_level' => 'Все уровни',
        'env_all' => 'Все платформы',
        'env_app' => 'PWA Приложение',
        'env_web' => 'Сайт (Web)',
        'env_server' => 'Сервер (Backend)',
        'level_all' => 'Все уровни',
        'level_fatal' => 'Fatal (Критические)',
        'level_error' => 'Error (Обычные)',
        'level_warning' => 'Warning (Предупреждения)',
        'level_promise' => 'Promise Rejection',
        // Table & Details
        'col_level' => 'Уровень',
        'col_env' => 'Платформа',
        'col_error' => 'Сообщение и файл',
        'col_user' => 'Пользователь / IP',
        'col_time' => 'Время',
        'col_actions' => 'Действия',
        'inspect' => 'Подробнее',
        'occurrences' => 'повторений',
        'empty_title' => 'Ошибок не зафиксировано',
        'empty_desc' => 'Платформа, сайт и приложение работают стабильно. Все новые сбои отобразятся здесь мгновенно.',
        'native_php_btn' => 'Лог сервера (error_log)',
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
        'sound' => 'Audio Chime',
        'interval' => 'Polling Interval',
        // Stats
        'total_errors' => 'Total Errors',
        'today_errors' => 'Today (24h)',
        'app_errors' => 'PWA App',
        'web_errors' => 'Web Browser',
        'server_errors' => 'Server Backend',
        'critical_errors' => 'Critical (Fatal)',
        // Filters
        'search_placeholder' => 'Search error message, file, URL, email, IP...',
        'filter_env' => 'All Platforms',
        'filter_level' => 'All Severities',
        'env_all' => 'All Platforms',
        'env_app' => 'PWA App',
        'env_web' => 'Web Browser',
        'env_server' => 'Server (PHP/DB)',
        'level_all' => 'All Levels',
        'level_fatal' => 'Fatal',
        'level_error' => 'Error',
        'level_warning' => 'Warning',
        'level_promise' => 'Promise Rejection',
        // Table & Details
        'col_level' => 'Level',
        'col_env' => 'Platform',
        'col_error' => 'Error & Source',
        'col_user' => 'User / IP',
        'col_time' => 'Timestamp',
        'col_actions' => 'Actions',
        'inspect' => 'Inspect',
        'occurrences' => 'hits',
        'empty_title' => 'No Errors Recorded',
        'empty_desc' => 'Everything is running cleanly across Web, App, and Server. Any incoming issues will appear here in real time.',
        'native_php_btn' => 'Native PHP error_log',
        'modal_title' => 'Error Inspector & Stack Trace',
        'close' => 'Close',
        'copy_stack' => 'Copy Stack Trace',
        'copy_json' => 'Copy JSON',
        'copied' => 'Copied!',
    ]
];

$t = $i18n[$adminLang] ?? $i18n['hy'];

// Initial load of stats and logs
$initialStats = wp_error_get_stats();
$initialLogs  = wp_error_get_logs([], 50);

$activePage = 'errors';
?>
<!doctype html>
<html lang="<?= htmlspecialchars($adminLang, ENT_QUOTES) ?>">
<head>
  <?php wp_admin_render_pwa_head($t['page_title']); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    /* ── Real-Time Error Monitor Styles ── */
    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
    }
    .monitor-title h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--text);
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .monitor-title p {
      font-size: 14px;
      color: var(--muted);
      margin: 0;
    }

    /* Live Pulsing Badge */
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
      letter-spacing: 0.5px;
      border: 1px solid rgba(5, 150, 105, 0.2);
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);
      transition: all 0.25s ease;
    }
    .live-pulse-badge.paused {
      background: #f1f5f9;
      color: #64748b;
      border-color: #cbd5e1;
      box-shadow: none;
    }
    .live-pulse-badge.alert {
      background: #fef2f2;
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.2);
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
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

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--card);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .kpi-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
    }
    .kpi-card.critical .kpi-value { color: #dc2626; }
    .kpi-card.app .kpi-value { color: #7c3aed; }
    .kpi-card.web .kpi-value { color: #2563eb; }
    .kpi-card.server .kpi-value { color: #d97706; }

    /* Controls Bar */
    .controls-bar {
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
    .controls-left, .controls-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .search-input-wrap {
      position: relative;
      min-width: 260px;
      flex: 1;
    }
    .search-input-wrap input {
      width: 100%;
      padding: 9px 12px 9px 36px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input-wrap input:focus {
      border-color: var(--primary);
    }
    .search-input-wrap svg {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
    }
    .filter-select {
      padding: 9px 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--bg);
      color: var(--text);
      outline: none;
      cursor: pointer;
    }

    /* Buttons */
    .btn-action {
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
      transition: all 0.15s ease;
      user-select: none;
    }
    .btn-action:hover {
      background: var(--bg);
      border-color: #cbd5e1;
    }
    .btn-action.primary {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .btn-action.primary:hover {
      filter: brightness(1.08);
    }
    .btn-action.danger {
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.3);
      background: #fff;
    }
    .btn-action.danger:hover {
      background: #fef2f2;
      border-color: #dc2626;
    }

    /* Toggle pill */
    .toggle-pill {
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
    .toggle-pill input {
      cursor: pointer;
    }

    /* Error Table & Items */
    .error-card-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .error-item {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: flex-start;
      gap: 16px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.3s ease;
      cursor: pointer;
      position: relative;
    }
    .error-item:hover {
      border-color: #94a3b8;
      box-shadow: var(--shadow-md);
    }
    .error-item.just-arrived {
      animation: flash-highlight 2s ease;
    }
    @keyframes flash-highlight {
      0% { background: #fee2e2; }
      100% { background: var(--card); }
    }

    /* Level Badges */
    .level-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .level-fatal { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .level-error { background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; }
    .level-warning { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
    .level-promise { background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; }
    .level-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }

    /* Environment Badges */
    .env-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .env-app { background: #ede9fe; color: #5b21b6; }
    .env-web { background: #e0f2fe; color: #0369a1; }
    .env-server { background: #fef3c7; color: #92400e; }
    .env-api { background: #fce7f3; color: #9d174d; }

    .hit-count-badge {
      background: #f1f5f9;
      color: #475569;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }

    .error-item-content {
      flex: 1;
      min-width: 0;
    }
    .error-item-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 6px;
    }
    .error-msg {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.4;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      word-break: break-word;
    }
    .error-meta-line {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--muted);
      margin-top: 6px;
    }
    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .error-time {
      font-size: 12px;
      color: var(--muted);
      font-weight: 600;
      white-space: nowrap;
    }

    /* Empty state */
    .empty-state {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 60px 24px;
      text-align: center;
    }
    .empty-state svg {
      color: #10b981;
      margin-bottom: 16px;
    }
    .empty-state h3 {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      margin: 0 0 6px;
    }
    .empty-state p {
      font-size: 14px;
      color: var(--muted);
      max-width: 500px;
      margin: 0 auto;
    }

    /* Inspection Modal */
    .err-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .err-modal-overlay.open {
      display: flex;
    }
    .err-modal-card {
      background: var(--card);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 850px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
    }
    .err-modal-head {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      background: var(--card);
      z-index: 1;
    }
    .err-modal-head h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .err-modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .modal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: var(--bg);
      border-radius: var(--radius-md);
      padding: 16px;
      border: 1px solid var(--line);
    }
    .modal-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .modal-field label {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .modal-field span {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      word-break: break-all;
    }
    .stack-trace-box {
      background: #0f172a;
      color: #f8fafc;
      border-radius: var(--radius-md);
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      max-height: 340px;
      white-space: pre-wrap;
      border: 1px solid #1e293b;
    }
    .err-modal-foot {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card);
      position: sticky;
      bottom: 0;
    }
  </style>
</head>
<body>

<?php include __DIR__ . '/admin_sidebar.php'; ?>

<main class="app-main">
  <?php 
    $searchPlaceholder = $t['search_placeholder'];
    include __DIR__ . '/admin_topbar.php'; 
  ?>

  <div class="app-content">
    
    <!-- Top Header & Live Indicator -->
    <div class="monitor-header">
      <div class="monitor-title">
        <h1>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <?= htmlspecialchars($t['title']) ?>
        </h1>
        <p><?= htmlspecialchars($t['subtitle']) ?></p>
      </div>

      <div style="display:flex; align-items:center; gap:12px;">
        <div class="live-pulse-badge" id="liveBadge">
          <div class="pulse-dot"></div>
          <span id="liveStatusText"><?= htmlspecialchars($t['live']) ?></span>
        </div>

        <button class="btn-action primary" id="btnRefresh" title="Refresh error logs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          <?= htmlspecialchars($t['refresh']) ?>
        </button>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label"><?= htmlspecialchars($t['total_errors']) ?></div>
        <div class="kpi-value" id="kpiTotal"><?= (int)$initialStats['total'] ?></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><?= htmlspecialchars($t['today_errors']) ?></div>
        <div class="kpi-value" id="kpiToday"><?= (int)$initialStats['today'] ?></div>
      </div>
      <div class="kpi-card app">
        <div class="kpi-label"><?= htmlspecialchars($t['app_errors']) ?></div>
        <div class="kpi-value" id="kpiApp"><?= (int)$initialStats['app'] ?></div>
      </div>
      <div class="kpi-card web">
        <div class="kpi-label"><?= htmlspecialchars($t['web_errors']) ?></div>
        <div class="kpi-value" id="kpiWeb"><?= (int)$initialStats['web'] ?></div>
      </div>
      <div class="kpi-card server">
        <div class="kpi-label"><?= htmlspecialchars($t['server_errors']) ?></div>
        <div class="kpi-value" id="kpiServer"><?= (int)$initialStats['server'] ?></div>
      </div>
      <div class="kpi-card critical">
        <div class="kpi-label"><?= htmlspecialchars($t['critical_errors']) ?></div>
        <div class="kpi-value" id="kpiCritical"><?= (int)$initialStats['critical'] ?></div>
      </div>
    </div>

    <!-- Controls Bar -->
    <div class="controls-bar">
      <div class="controls-left">
        <div class="search-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="filterSearch" placeholder="<?= htmlspecialchars($t['search_placeholder']) ?>">
        </div>

        <select class="filter-select" id="filterEnv">
          <option value="all"><?= htmlspecialchars($t['env_all']) ?></option>
          <option value="app"><?= htmlspecialchars($t['env_app']) ?></option>
          <option value="web"><?= htmlspecialchars($t['env_web']) ?></option>
          <option value="server"><?= htmlspecialchars($t['env_server']) ?></option>
        </select>

        <select class="filter-select" id="filterLevel">
          <option value="all"><?= htmlspecialchars($t['level_all']) ?></option>
          <option value="fatal"><?= htmlspecialchars($t['level_fatal']) ?></option>
          <option value="error"><?= htmlspecialchars($t['level_error']) ?></option>
          <option value="warning"><?= htmlspecialchars($t['level_warning']) ?></option>
          <option value="promise"><?= htmlspecialchars($t['level_promise']) ?></option>
        </select>

        <select class="filter-select" id="pollingInterval">
          <option value="3000">3s <?= htmlspecialchars($t['interval']) ?></option>
          <option value="5000">5s</option>
          <option value="10000">10s</option>
          <option value="0"><?= htmlspecialchars($t['stream_paused']) ?></option>
        </select>

        <label class="toggle-pill" title="Enable audio alert chime for new critical errors">
          <input type="checkbox" id="toggleSound" checked>
          <span>🔔 <?= htmlspecialchars($t['sound']) ?></span>
        </label>
      </div>

      <div class="controls-right">
        <button class="btn-action" id="btnTestError" title="Simulate sending a test error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          <?= htmlspecialchars($t['test_error']) ?>
        </button>

        <button class="btn-action" id="btnExport" title="Export all logs as JSON">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <?= htmlspecialchars($t['export']) ?>
        </button>

        <button class="btn-action danger" id="btnClear" title="Clear all stored logs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <?= htmlspecialchars($t['clear_all']) ?>
        </button>
      </div>
    </div>

    <!-- Error Stream Container -->
    <div id="errorStreamContainer" class="error-card-list">
      <!-- Injected via JavaScript -->
    </div>

    <!-- Empty State -->
    <div id="emptyState" class="empty-state" style="display:none;">
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <h3><?= htmlspecialchars($t['empty_title']) ?></h3>
      <p><?= htmlspecialchars($t['empty_desc']) ?></p>
    </div>

  </div>
</main>

<!-- Detailed Inspector Modal -->
<div class="err-modal-overlay" id="inspectModal">
  <div class="err-modal-card">
    <div class="err-modal-head">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <?= htmlspecialchars($t['modal_title']) ?>
      </h3>
      <button class="btn-action" onclick="closeInspectModal()">✕</button>
    </div>

    <div class="err-modal-body">
      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
          <span id="mLevel" class="level-badge"></span>
          <span id="mEnv" class="env-badge"></span>
          <span id="mHits" class="hit-count-badge"></span>
        </div>
        <div id="mMessage" class="error-msg" style="font-size:16px; padding:12px; background:var(--bg); border:1px solid var(--line); border-radius:8px;"></div>
      </div>

      <div class="modal-grid">
        <div class="modal-field">
          <label>URL / Route</label>
          <span id="mUrl">—</span>
        </div>
        <div class="modal-field">
          <label>Source File & Line</label>
          <span id="mFile">—</span>
        </div>
        <div class="modal-field">
          <label>User / Email</label>
          <span id="mUser">—</span>
        </div>
        <div class="modal-field">
          <label>IP Address</label>
          <span id="mIp">—</span>
        </div>
        <div class="modal-field">
          <label>First Seen</label>
          <span id="mFirstSeen">—</span>
        </div>
        <div class="modal-field">
          <label>Last Seen</label>
          <span id="mLastSeen">—</span>
        </div>
        <div class="modal-field" style="grid-column:1/-1;">
          <label>Device / User Agent</label>
          <span id="mUserAgent" style="font-size:12px; color:var(--muted); font-family:monospace;">—</span>
        </div>
      </div>

      <div id="stackTraceSection">
        <label style="font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; display:block;">STACK TRACE</label>
        <pre class="stack-trace-box" id="mStack"></pre>
      </div>
    </div>

    <div class="err-modal-foot">
      <div style="display:flex; gap:8px;">
        <button class="btn-action" id="btnCopyStack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <?= htmlspecialchars($t['copy_stack']) ?>
        </button>
        <button class="btn-action" id="btnCopyJson">
          <?= htmlspecialchars($t['copy_json']) ?>
        </button>
      </div>
      <button class="btn-action primary" onclick="closeInspectModal()"><?= htmlspecialchars($t['close']) ?></button>
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

  // Initialize highest ID
  currentLogs.forEach(function(item) {
    var idNum = parseInt(item.id, 10) || 0;
    if (idNum > lastHighestId) lastHighestId = idNum;
  });

  // Soft audio chime for real-time alerts
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
      osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.35);
    } catch (_) {}
  }

  // Format relative time (Armenian / Russian / English)
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

      let levelClass = 'level-error';
      if (level === 'fatal') levelClass = 'level-fatal';
      else if (level === 'warning') levelClass = 'level-warning';
      else if (level === 'promise') levelClass = 'level-promise';
      else if (level === 'info') levelClass = 'level-info';

      let envClass = 'env-web';
      if (env === 'app') envClass = 'env-app';
      else if (env === 'server' || env === 'db') envClass = 'env-server';
      else if (env === 'api') envClass = 'env-api';

      const fileInfo = item.file ? `${escapeHtml(item.file)}${item.line ? ':' + item.line : ''}` : '';
      const userTag = item.user_email ? escapeHtml(item.user_email) : (item.ip_address || '');

      html += `
        <div class="error-item ${isNew ? 'just-arrived' : ''}" data-id="${escapeHtml(item.id)}" onclick="window.inspectError('${escapeHtml(item.id)}')">
          <div class="error-item-content">
            <div class="error-item-header">
              <span class="level-badge ${levelClass}">${escapeHtml(level)}</span>
              <span class="env-badge ${envClass}">${escapeHtml(env)}</span>
              ${occ > 1 ? `<span class="hit-count-badge">${occ} <?= htmlspecialchars($t['occurrences']) ?></span>` : ''}
              <span style="flex:1;"></span>
              <span class="error-time" title="${escapeHtml(item.last_seen)}">${formatRelativeTime(item.last_seen)}</span>
            </div>
            
            <div class="error-msg">${escapeHtml(item.message)}</div>

            <div class="error-meta-line">
              ${fileInfo ? `<span class="meta-tag" title="${escapeHtml(item.file)}">📁 ${fileInfo}</span>` : ''}
              ${item.url ? `<span class="meta-tag" title="${escapeHtml(item.url)}">🔗 ${escapeHtml(item.url)}</span>` : ''}
              ${userTag ? `<span class="meta-tag">👤 ${userTag}</span>` : ''}
            </div>
          </div>
          
          <button class="btn-action" style="padding:6px 12px; font-size:12px; align-self:center;" onclick="event.stopPropagation(); window.inspectError('${escapeHtml(item.id)}')">
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
  }

  // Poll errors in real-time
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

  // Modal Inspector
  window.inspectError = function(id) {
    const item = currentLogs.find(l => String(l.id) === String(id));
    if (!item) return;
    activeInspectItem = item;

    document.getElementById('mLevel').textContent = (item.level || 'error').toUpperCase();
    document.getElementById('mLevel').className = 'level-badge level-' + (item.level || 'error').toLowerCase();
    document.getElementById('mEnv').textContent = (item.environment || 'web').toUpperCase();
    document.getElementById('mEnv').className = 'env-badge env-' + (item.environment || 'web').toLowerCase();
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

  // Event Listeners
  document.getElementById('filterSearch').addEventListener('input', applyFilters);
  document.getElementById('filterEnv').addEventListener('change', applyFilters);
  document.getElementById('filterLevel').addEventListener('change', applyFilters);
  document.getElementById('pollingInterval').addEventListener('change', setupPolling);
  document.getElementById('btnRefresh').addEventListener('click', fetchLatestErrors);

  // Clear logs
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

  // Export JSON
  document.getElementById('btnExport').addEventListener('click', function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentLogs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `worship_error_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  });

  // Test Error
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

  // Copy buttons
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

  // Close modal on click outside
  document.getElementById('inspectModal').addEventListener('click', function(e) {
    if (e.target === this) closeInspectModal();
  });

  // Initial render & start polling
  applyFilters();
  setupPolling();

})();
</script>

</body>
</html>
