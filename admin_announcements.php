<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/mobile_service.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_announcements.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail       = trim((string)($adminUser['email'] ?? ''));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?tab=' . urlencode((string)($_GET['tab'] ?? 'banner')));
    exit;
}

$activeTab = (string)($_GET['tab'] ?? $_POST['active_tab'] ?? 'banner');
if (!in_array($activeTab, ['banner', 'restrictions', 'maintenance'], true)) {
    $activeTab = 'banner';
}

$flashMessage = '';
$flashTone = 'success';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $formAction = (string)($_POST['form_action'] ?? 'save_all');
    $mobileConfig = wp_mobile_get_config();
    $versionConfig = wp_version_load();

    $allowedTargets = ['all', 'web_pwa', 'web', 'pwa', 'native', 'ios', 'android'];
    $allowedPages = array_keys(wp_mobile_restrictable_pages());
    $allowedFeatures = array_keys(wp_mobile_restrictable_features());

    if ($formAction === 'master_maintenance_on' || $formAction === 'master_maintenance_off') {
        $turnOn = ($formAction === 'master_maintenance_on');
        $versionConfig['maintenance_enabled'] = $turnOn;
        $mobileConfig['ios']['status'] = $turnOn ? 'maintenance' : 'live';
        $mobileConfig['android']['status'] = $turnOn ? 'maintenance' : 'live';

        $okWeb = wp_version_save($versionConfig, ['action' => 'master_maintenance', 'actor' => $adminDisplayName]);
        $okMob = wp_mobile_save_config($mobileConfig, $adminDisplayName);
        if ($okWeb && $okMob) {
            $flashMessage = $turnOn
                ? '🔴 Ամբողջ համակարգի տեխնիկական դադարը (Կայք, PWA, iOS, Android) միացվեց։'
                : '🟢 Ամբողջ համակարգը (Կայք, PWA, iOS, Android) վերադարձվեց Live ռեժիմի։';
        } else {
            $flashTone = 'error';
            $flashMessage = 'Չհաջողվեց թարմացնել կարգավորումների ֆայլերը։';
        }
    } else {
        // Save announcement + restrictions + maintenance settings together
        $rawRestrictedPages = isset($_POST['restricted_pages']) && is_array($_POST['restricted_pages'])
            ? array_map('strval', $_POST['restricted_pages'])
            : [];
        $rawRestrictedFeatures = isset($_POST['restricted_features']) && is_array($_POST['restricted_features'])
            ? array_map('strval', $_POST['restricted_features'])
            : [];

        $mobileConfig['announcement']['enabled']               = !empty($_POST['announcement_enabled']);
        $mobileConfig['announcement']['target']                = in_array($_POST['announcement_target'] ?? '', $allowedTargets, true) ? $_POST['announcement_target'] : 'all';
        $mobileConfig['announcement']['type']                  = in_array($_POST['announcement_type'] ?? '', ['info', 'warning', 'success', 'critical'], true) ? $_POST['announcement_type'] : 'info';
        $mobileConfig['announcement']['title']                 = trim((string)($_POST['announcement_title'] ?? ''));
        $mobileConfig['announcement']['message']               = trim((string)($_POST['announcement_message'] ?? ''));
        $mobileConfig['announcement']['title_ru']              = trim((string)($_POST['announcement_title_ru'] ?? ''));
        $mobileConfig['announcement']['message_ru']            = trim((string)($_POST['announcement_message_ru'] ?? ''));
        $mobileConfig['announcement']['title_en']              = trim((string)($_POST['announcement_title_en'] ?? ''));
        $mobileConfig['announcement']['message_en']            = trim((string)($_POST['announcement_message_en'] ?? ''));
        $mobileConfig['announcement']['action_text']           = trim((string)($_POST['announcement_action_text'] ?? ''));
        $mobileConfig['announcement']['action_url']            = trim((string)($_POST['announcement_action_url'] ?? ''));
        $mobileConfig['announcement']['dismissible']           = !empty($_POST['announcement_dismissible']);
        $mobileConfig['announcement']['show_countdown']        = !empty($_POST['announcement_show_countdown']);
        $mobileConfig['announcement']['sync_with_maintenance'] = !empty($_POST['announcement_sync_with_maintenance']);
        $mobileConfig['announcement']['schedule_start_at']     = wp_version_normalize_datetime($_POST['announcement_schedule_start_at'] ?? '');
        $mobileConfig['announcement']['schedule_end_at']       = wp_version_normalize_datetime($_POST['announcement_schedule_end_at'] ?? '');
        $mobileConfig['announcement']['restricted_pages']      = array_values(array_intersect($allowedPages, $rawRestrictedPages));
        $mobileConfig['announcement']['restricted_features']   = array_values(array_intersect($allowedFeatures, $rawRestrictedFeatures));

        // Unified Maintenance settings (Web/PWA + Native iOS/Android)
        $versionConfig['maintenance_enabled']     = !empty($_POST['web_maintenance_enabled']);
        $webMaintMsg = trim((string)($_POST['web_maintenance_message'] ?? ''));
        if ($webMaintMsg !== '') {
            $versionConfig['maintenance_message'] = $webMaintMsg;
        }
        $versionConfig['maintenance_start_at']    = wp_version_normalize_datetime($_POST['web_maintenance_start_at'] ?? '');
        $versionConfig['maintenance_end_at']      = wp_version_normalize_datetime($_POST['web_maintenance_end_at'] ?? '');
        $versionConfig['maintenance_allowed_ips'] = trim((string)($_POST['web_maintenance_allowed_ips'] ?? ''));

        $mobileConfig['ios']['status']              = in_array($_POST['ios_status'] ?? '', ['live', 'review', 'maintenance'], true) ? $_POST['ios_status'] : ($mobileConfig['ios']['status'] ?? 'live');
        $mobileConfig['ios']['maintenance_title']   = trim((string)($_POST['ios_maintenance_title'] ?? ($mobileConfig['ios']['maintenance_title'] ?? '')));
        $mobileConfig['ios']['maintenance_message'] = trim((string)($_POST['ios_maintenance_message'] ?? ($mobileConfig['ios']['maintenance_message'] ?? '')));

        $mobileConfig['android']['status']              = in_array($_POST['android_status'] ?? '', ['live', 'review', 'maintenance'], true) ? $_POST['android_status'] : ($mobileConfig['android']['status'] ?? 'live');
        $mobileConfig['android']['maintenance_title']   = trim((string)($_POST['android_maintenance_title'] ?? ($mobileConfig['android']['maintenance_title'] ?? '')));
        $mobileConfig['android']['maintenance_message'] = trim((string)($_POST['android_maintenance_message'] ?? ($mobileConfig['android']['maintenance_message'] ?? '')));

        $okMob = wp_mobile_save_config($mobileConfig, $adminDisplayName);
        $okWeb = wp_version_save($versionConfig, ['action' => 'save_announcements_command_center', 'actor' => $adminDisplayName]);
        if ($okMob && $okWeb) {
            $flashMessage = 'Բոլոր հայտարարությունները, սահմանափակումները և տեխնիկական դադարի կարգավորումները պահպանվեցին։';
        } else {
            $flashTone = 'error';
            $flashMessage = 'Սխալ պահպանման ընթացքում։ Ստուգեք գրման իրավունքները։';
        }
    }
}

$mobileConfig = wp_mobile_get_config();
$versionConfig = wp_version_load();
$ann = $mobileConfig['announcement'] ?? [];
$isAnnNowActive = wp_mobile_is_announcement_active($ann, $versionConfig);
$isWebMaintActive = wp_version_is_maintenance_active($versionConfig);
$iosStatus = (string)($mobileConfig['ios']['status'] ?? 'live');
$androidStatus = (string)($mobileConfig['android']['status'] ?? 'live');

$restrictablePages = wp_mobile_restrictable_pages();
$restrictableFeatures = wp_mobile_restrictable_features();
$selectedPages = (array)($ann['restricted_pages'] ?? []);
$selectedFeatures = (array)($ann['restricted_features'] ?? []);

$pageGroups = [
    'Հիմնական բաժիններ' => ['/songs', '/song', '/setlists', '/bible', '/church', '/media', '/news'],
    'Ստուդիա և Բեմ' => ['/studio', '/service-planner', '/transpose', '/projection'],
    'Համայնք և Գործողություններ' => ['/favorites', '/friends', '/chats', '/song-request'],
];

$featureGroups = [
    'Pro Studio և Բեմ' => ['pro_studio', 'live_stage_follower', 'rehearsal_stems', 'lyrics_projection', 'worship_ai_studio', 'service_planner', 'smart_metronome'],
    'Երգարան, Չաթ և Օֆլայն' => ['chord_chart_transpose_capo', 'audio_calls', 'setlists_sync', 'offline_mode', 'song_lyrics_copy', 'setlist_creation', 'chat_messaging', 'song_requests_submit'],
];
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($adminLang) ?>">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Հայտարարություններ, Սահմանափակումներ և Դադար — Worship Admin</title>
  <link rel="icon" type="image/png" href="/favicon.png?v=2" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .ac-hero { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:22px; }
    .ac-title { font-size:1.75rem; font-weight:800; color:var(--text); letter-spacing:-0.02em; margin:0 0 6px; }
    .ac-sub { color:var(--muted); font-size:0.9rem; margin:0; max-width:740px; }
    .ac-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:22px; }
    .ac-stat { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
    .ac-stat-label { font-size:0.78rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px; }
    .ac-stat-val { font-size:1.25rem; font-weight:800; color:var(--text); }
    .ac-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:0.76rem; font-weight:700; }
    .ac-badge--on { background:rgba(5,205,153,0.16); color:#05cd99; }
    .ac-badge--warn { background:rgba(247,181,0,0.16); color:#f7b500; }
    .ac-badge--off { background:rgba(148,163,184,0.16); color:var(--muted); }
    .ac-badge--danger { background:rgba(238,93,80,0.16); color:#ee5d50; }
    .ac-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid var(--line); padding-bottom:12px; }
    .ac-tab { padding:9px 16px; border-radius:10px; border:1px solid var(--line); background:var(--surface); color:var(--muted); font-weight:600; font-size:0.88rem; cursor:pointer; transition:all .16s ease; }
    .ac-tab.is-active { background:var(--primary); color:#fff; border-color:var(--primary); box-shadow:0 4px 14px rgba(67,24,255,0.28); }
    .ac-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:22px; margin-bottom:20px; }
    .ac-card-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px; padding-bottom:14px; border-bottom:1px solid var(--line); }
    .ac-card-title { font-size:1.08rem; font-weight:800; color:var(--text); display:flex; align-items:center; gap:8px; }
    .ac-grid-2 { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; }
    .ac-grid-3 { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px; }
    .ac-field { display:flex; flex-direction:column; gap:6px; }
    .ac-label { font-size:0.8rem; font-weight:700; color:var(--muted); }
    .ac-input, .ac-select, .ac-textarea { width:100%; background:var(--bg); border:1px solid var(--line); color:var(--text); border-radius:10px; padding:10px 13px; font-size:0.9rem; font-family:inherit; box-sizing:border-box; }
    .ac-input:focus, .ac-select:focus, .ac-textarea:focus { outline:none; border-color:var(--primary); }
    .ac-toggle { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg); border:1px solid var(--line); border-radius:12px; }
    .ac-switch { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; }
    .ac-switch input { opacity:0; width:0; height:0; }
    .ac-slider { position:absolute; inset:0; background:var(--muted); border-radius:999px; transition:.25s; cursor:pointer; }
    .ac-slider:before { content:""; position:absolute; width:18px; height:18px; left:3px; bottom:3px; border-radius:50%; background:#fff; transition:.25s; }
    .ac-switch input:checked + .ac-slider { background:var(--primary); }
    .ac-switch input:checked + .ac-slider:before { transform:translateX(20px); }
    .ac-check-card { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--bg); border:1px solid var(--line); border-radius:11px; cursor:pointer; transition:border-color .15s; }
    .ac-check-card:hover { border-color:var(--primary); }
    .ac-check-card input { width:16px; height:16px; accent-color:var(--primary); flex-shrink:0; }
    .ac-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:10px; font-weight:700; font-size:0.88rem; border:1px solid transparent; cursor:pointer; text-decoration:none; }
    .ac-btn--primary { background:var(--primary); color:#fff; }
    .ac-btn--ghost { background:var(--bg); color:var(--text); border-color:var(--line); }
    .ac-btn--danger { background:rgba(238,93,80,0.16); color:#ee5d50; border-color:rgba(238,93,80,0.35); }
    .ac-btn--success { background:rgba(5,205,153,0.16); color:#05cd99; border-color:rgba(5,205,153,0.35); }
    .ac-preview-box { background:linear-gradient(165deg, rgba(22,24,36,0.96) 0%, rgba(13,14,22,0.99) 100%); border:1px solid rgba(0,212,255,0.42); color:#fff; border-radius:18px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.14), 0 14px 30px rgba(0,0,0,0.35); }
    .ac-preview-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; background:#7ee8ff; box-shadow:0 0 10px #7ee8ff; }
    .ac-panel { display:none; }
    .ac-panel.is-visible { display:block; }
    .ac-flash { padding:14px 18px; border-radius:12px; margin-bottom:18px; font-weight:700; background:rgba(5,205,153,0.14); border:1px solid rgba(5,205,153,0.35); color:#05cd99; }
    .ac-flash.is-error { background:rgba(238,93,80,0.14); border-color:rgba(238,93,80,0.35); color:#ee5d50; }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">
  <?php
    $activePage = 'announcements';
    include __DIR__ . '/admin_sidebar.php';
  ?>

  <main class="app-main">
    <?php
      $searchPlaceholder = 'Որոնել...';
      include __DIR__ . '/admin_topbar.php';
    ?>

    <div style="padding: 26px 34px 70px; max-width: 1380px; width: 100%; box-sizing: border-box;">
      <?php if ($flashMessage !== ''): ?>
        <div class="ac-flash <?= $flashTone === 'error' ? 'is-error' : '' ?>"><?= htmlspecialchars($flashMessage) ?></div>
      <?php endif; ?>

      <div class="ac-hero">
        <div>
          <h1 class="ac-title">📢 Հայտարարություններ, Սահմանափակումներ և Դադար</h1>
          <p class="ac-sub">Ամբողջական կառավարման կենտրոն՝ Կայքի, PWA-ի, iOS-ի և Android-ի համար․ հայտարարությունների պլանավորում, ըստ էջերի ու ֆունկցիաների սահմանափակում և տեխնիկական դադարի միասնական կառավարում։</p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="ac-btn ac-btn--primary" onclick="document.getElementById('acMainForm').submit();">💾 Պահպանել ամենը</button>
        </div>
      </div>

      <!-- STATUS SUMMARY -->
      <div class="ac-stats">
        <div class="ac-stat">
          <div class="ac-stat-label">Հայտարարություն</div>
          <div class="ac-stat-val">
            <?php if ($isAnnNowActive): ?>
              <span class="ac-badge ac-badge--on">● Ակտիվ է</span>
            <?php elseif (!empty($ann['enabled'])): ?>
              <span class="ac-badge ac-badge--warn">⏳ Պլանավորված / Սպասման մեջ</span>
            <?php else: ?>
              <span class="ac-badge ac-badge--off">○ Անջատված է</span>
            <?php endif; ?>
          </div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat-label">Ակտիվ Սահմանափակումներ</div>
          <div class="ac-stat-val"><?= count($selectedPages) ?> էջ · <?= count($selectedFeatures) ?> ֆունկցիա</div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat-label">Կայք և PWA Դադար</div>
          <div class="ac-stat-val">
            <span class="ac-badge <?= $isWebMaintActive ? 'ac-badge--danger' : 'ac-badge--on' ?>">
              <?= $isWebMaintActive ? '🔴 Դադարի մեջ է' : '🟢 Աշխատում է' ?>
            </span>
          </div>
        </div>
        <div class="ac-stat">
          <div class="ac-stat-label">iOS / Android Native</div>
          <div class="ac-stat-val">
            <span class="ac-badge <?= ($iosStatus === 'maintenance' || $androidStatus === 'maintenance') ? 'ac-badge--danger' : 'ac-badge--on' ?>">
              iOS: <?= htmlspecialchars($iosStatus) ?> · Android: <?= htmlspecialchars($androidStatus) ?>
            </span>
          </div>
        </div>
      </div>

      <!-- SECTION TABS -->
      <div class="ac-tabs" role="tablist">
        <button type="button" class="ac-tab <?= $activeTab === 'banner' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('banner', this)">📢 1. Հայտարարություն, Բաններ և Պլանավորում</button>
        <button type="button" class="ac-tab <?= $activeTab === 'restrictions' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('restrictions', this)">🔒 2. Էջերի և Ֆունկցիաների Սահմանափակում</button>
        <button type="button" class="ac-tab <?= $activeTab === 'maintenance' ? 'is-active' : '' ?>" onclick="wpSwitchAcTab('maintenance', this)">🛠️ 3. Միասնական Տեխնիկական Աշխատանքներ</button>
      </div>

      <form id="acMainForm" method="POST">
        <input type="hidden" name="form_action" id="acFormAction" value="save_all" />
        <input type="hidden" name="active_tab" id="acActiveTabInput" value="<?= htmlspecialchars($activeTab) ?>" />

        <!-- TAB 1: BANNER & SCHEDULING -->
        <section id="acPanelBanner" class="ac-panel <?= $activeTab === 'banner' ? 'is-visible' : '' ?>">
          <div class="ac-card">
            <div class="ac-card-head">
              <div class="ac-card-title">⚡ Արագ Ձևանմուշներ և Live Նախադիտում</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpApplyPreset('upgrade')">🛠️ Վերազինում</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpApplyPreset('partial')">🔒 Մասնակի սահմանափակում</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpApplyPreset('update')">🚀 Նոր թարմացում</button>
              </div>
            </div>

            <div class="ac-preview-box" id="acLivePreview">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                  <div class="ac-preview-dot" id="acPrevDot"></div>
                  <div id="acPrevTitle" style="font-weight:800; font-size:0.9rem; color:#7ee8ff; line-height:1.25;"><?= htmlspecialchars($ann['title'] ?: 'Հայտարարության վերնագիր') ?></div>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                  <span id="acPrevCountdown" style="display:<?= !empty($ann['show_countdown']) ? 'inline-flex' : 'none' ?>; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:rgba(0,212,255,0.16); border:1px solid rgba(0,212,255,0.38); color:#fff; font-size:0.74rem; font-weight:700; font-variant-numeric:tabular-nums;">⏳ 01:45:00</span>
                  <span id="acPrevClose" style="display:<?= (!isset($ann['dismissible']) || !empty($ann['dismissible'])) ? 'inline-flex' : 'none' ?>; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:rgba(255,255,255,0.85); font-size:0.76rem;">✕</span>
                </div>
              </div>
              <div id="acPrevMsg" style="font-size:0.84rem; color:rgba(235,240,248,0.92); line-height:1.48; white-space:pre-line;"><?= htmlspecialchars($ann['message'] ?: 'Այստեղ կցուցադրվի հայտարարության տեքստը օգտատերերի համար։') ?></div>
              <div>
                <span id="acPrevBtn" style="display:<?= !empty($ann['action_text']) ? 'inline-block' : 'none' ?>; padding:6px 13px; border-radius:999px; background:rgba(0,212,255,0.2); border:1px solid rgba(0,212,255,0.4); font-size:0.78rem; font-weight:700;"><?= htmlspecialchars($ann['action_text'] ?? '') ?> →</span>
              </div>
            </div>
          </div>

          <div class="ac-card">
            <div class="ac-card-head">
              <div class="ac-card-title">📢 Հիմնական Կարգավորումներ և Պլանավորում</div>
            </div>

            <div class="ac-grid-3" style="margin-bottom:16px;">
              <div class="ac-toggle">
                <label class="ac-switch">
                  <input type="checkbox" name="announcement_enabled" value="1" <?= !empty($ann['enabled']) ? 'checked' : '' ?>>
                  <span class="ac-slider"></span>
                </label>
                <div>
                  <div style="font-weight:700; color:var(--text); font-size:0.88rem;">Միացնել Հայտարարությունը</div>
                  <div style="font-size:0.75rem; color:var(--muted);">Ցուցադրվում է և կիրառում է սահմանափակումները</div>
                </div>
              </div>

              <div class="ac-toggle">
                <label class="ac-switch">
                  <input type="checkbox" name="announcement_dismissible" value="1" <?= (!isset($ann['dismissible']) || !empty($ann['dismissible'])) ? 'checked' : '' ?>>
                  <span class="ac-slider"></span>
                </label>
                <div>
                  <div style="font-weight:700; color:var(--text); font-size:0.88rem;">Թույլ տալ փակել (✕)</div>
                  <div style="font-size:0.75rem; color:var(--muted);">Անջատելիս մշտապես երևում է էկրանին</div>
                </div>
              </div>

              <div class="ac-toggle">
                <label class="ac-switch">
                  <input type="checkbox" name="announcement_show_countdown" value="1" <?= !empty($ann['show_countdown']) ? 'checked' : '' ?>>
                  <span class="ac-slider"></span>
                </label>
                <div>
                  <div style="font-weight:700; color:var(--text); font-size:0.88rem;">Ցուցադրել հետհաշվարկ</div>
                  <div style="font-size:0.75rem; color:var(--muted);">Երբ նշված է ավարտի ժամ</div>
                </div>
              </div>
            </div>

            <div class="ac-grid-2" style="margin-bottom:14px;">
              <div class="ac-field">
                <label class="ac-label">Թիրախային Հարթակ</label>
                <select name="announcement_target" class="ac-select">
                  <option value="all" <?= ($ann['target'] ?? '') === 'all' ? 'selected' : '' ?>>🌐 Ամբողջ համակարգը (Կայք, PWA, iOS և Android)</option>
                  <option value="web_pwa" <?= ($ann['target'] ?? '') === 'web_pwa' ? 'selected' : '' ?>>🖥️ Կայք և PWA</option>
                  <option value="web" <?= ($ann['target'] ?? '') === 'web' ? 'selected' : '' ?>>🌍 Միայն Կայք (Web)</option>
                  <option value="pwa" <?= ($ann['target'] ?? '') === 'pwa' ? 'selected' : '' ?>>📲 Միայն PWA</option>
                  <option value="native" <?= ($ann['target'] ?? '') === 'native' ? 'selected' : '' ?>>📱 Միայն iOS և Android Native</option>
                  <option value="ios" <?= ($ann['target'] ?? '') === 'ios' ? 'selected' : '' ?>>🍏 Միայն iOS</option>
                  <option value="android" <?= ($ann['target'] ?? '') === 'android' ? 'selected' : '' ?>>🤖 Միայն Android</option>
                </select>
              </div>
              <div class="ac-field">
                <label class="ac-label">Բանների Տեսակ / Գունային շեշտադրում</label>
                <select id="acTypeSelect" name="announcement_type" class="ac-select" onchange="wpUpdatePreview()">
                  <option value="info" <?= ($ann['type'] ?? '') === 'info' ? 'selected' : '' ?>>ℹ️ Տեղեկատվական (Երկնագույն)</option>
                  <option value="warning" <?= ($ann['type'] ?? '') === 'warning' ? 'selected' : '' ?>>⚠️ Վերազինում / Զգուշացում (Ոսկեգույն)</option>
                  <option value="success" <?= ($ann['type'] ?? '') === 'success' ? 'selected' : '' ?>>✅ Թարմացում / Ավարտ (Կանաչ)</option>
                  <option value="critical" <?= ($ann['type'] ?? '') === 'critical' ? 'selected' : '' ?>>🚨 Հրատապ դադար (Կարմիր)</option>
                </select>
              </div>
            </div>

            <div class="ac-grid-2" style="margin-bottom:14px;">
              <div class="ac-field">
                <label class="ac-label">Պլանավորված մեկնարկ (ըստ Երևանի ժամի, կամընտիր)</label>
                <input type="datetime-local" name="announcement_schedule_start_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($ann['schedule_start_at'] ?? '')) ?>">
              </div>
              <div class="ac-field">
                <label class="ac-label">Պլանավորված ավարտ (ըստ Երևանի ժամի, կամընտիր)</label>
                <input type="datetime-local" name="announcement_schedule_end_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($ann['schedule_end_at'] ?? '')) ?>">
              </div>
            </div>

            <div class="ac-grid-2" style="margin-bottom:14px;">
              <div class="ac-field">
                <label class="ac-label">Հայերեն Վերնագիր (Հիմնական)</label>
                <input type="text" id="acTitleInput" name="announcement_title" class="ac-input" value="<?= htmlspecialchars($ann['title'] ?? '') ?>" oninput="wpUpdatePreview()" placeholder="Օրինակ՝ Վերազինման աշխատանքներ">
              </div>
              <div class="ac-field">
                <label class="ac-label">Գործողության Կոճակ և Հղում (Կամընտիր)</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" id="acActionTextInput" name="announcement_action_text" class="ac-input" value="<?= htmlspecialchars($ann['action_text'] ?? '') ?>" oninput="wpUpdatePreview()" placeholder="Կոճակ (օր․ Մանրամասն)">
                  <input type="text" name="announcement_action_url" class="ac-input" value="<?= htmlspecialchars($ann['action_url'] ?? '') ?>" placeholder="/news կամ https://...">
                </div>
              </div>
            </div>

            <div class="ac-field" style="margin-bottom:16px;">
              <label class="ac-label">Հայերեն Հաղորդագրություն (Հիմնական)</label>
              <textarea id="acMsgInput" name="announcement_message" class="ac-textarea" rows="3" oninput="wpUpdatePreview()" placeholder="Գրեք հայտարարության ամբողջական տեքստը..."><?= htmlspecialchars($ann['message'] ?? '') ?></textarea>
            </div>

            <div class="ac-grid-2">
              <div class="ac-field">
                <label class="ac-label">🇷🇺 Русский (Կամընտիր վերնագիր և տեքստ)</label>
                <input type="text" id="acTitleRu" name="announcement_title_ru" class="ac-input" style="margin-bottom:8px;" value="<?= htmlspecialchars($ann['title_ru'] ?? '') ?>" placeholder="Заголовок на русском">
                <textarea id="acMsgRu" name="announcement_message_ru" class="ac-textarea" rows="2" placeholder="Текст объявления на русском..."><?= htmlspecialchars($ann['message_ru'] ?? '') ?></textarea>
              </div>
              <div class="ac-field">
                <label class="ac-label">🇺🇸 English (Optional Title & Message)</label>
                <input type="text" id="acTitleEn" name="announcement_title_en" class="ac-input" style="margin-bottom:8px;" value="<?= htmlspecialchars($ann['title_en'] ?? '') ?>" placeholder="English title">
                <textarea id="acMsgEn" name="announcement_message_en" class="ac-textarea" rows="2" placeholder="English announcement text..."><?= htmlspecialchars($ann['message_en'] ?? '') ?></textarea>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 2: GRANULAR RESTRICTIONS -->
        <section id="acPanelRestrictions" class="ac-panel <?= $activeTab === 'restrictions' ? 'is-visible' : '' ?>">
          <div class="ac-card">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title">🔒 Սահմանափակվող Էջեր (Routes)</div>
                <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Նշված էջերը մուտք գործելիս օգտատերը կտեսնի «Ժամանակավոր սահմանափակում» քարտը՝ վերևի հայտարարությամբ։</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_pages[]', true)">Նշել բոլորը</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_pages[]', false)">Մաքրել բոլորը</button>
              </div>
            </div>

            <?php foreach ($pageGroups as $groupLabel => $paths): ?>
              <div style="margin-bottom:18px;">
                <div style="font-weight:700; font-size:0.86rem; color:var(--text); margin-bottom:10px;"><?= htmlspecialchars($groupLabel) ?></div>
                <div class="ac-grid-3">
                  <?php foreach ($paths as $p): if (!isset($restrictablePages[$p])) continue; ?>
                    <label class="ac-check-card">
                      <input type="checkbox" name="restricted_pages[]" value="<?= htmlspecialchars($p) ?>" <?= in_array($p, $selectedPages, true) ? 'checked' : '' ?>>
                      <span style="font-size:0.84rem; font-weight:600; color:var(--text);"><?= htmlspecialchars($restrictablePages[$p]) ?></span>
                    </label>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>

          <div class="ac-card">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title">🧩 Սահմանափակվող Ֆունկցիաներ (Features)</div>
                <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Նշված գործիքներն ու հնարավորությունները ժամանակավորապես կանջատվեն՝ քանի դեռ հայտարարությունը ակտիվ է։</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_features[]', true)">Նշել բոլորը</button>
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSetChecks('restricted_features[]', false)">Մաքրել բոլորը</button>
              </div>
            </div>

            <?php foreach ($featureGroups as $groupLabel => $keys): ?>
              <div style="margin-bottom:18px;">
                <div style="font-weight:700; font-size:0.86rem; color:var(--text); margin-bottom:10px;"><?= htmlspecialchars($groupLabel) ?></div>
                <div class="ac-grid-3">
                  <?php foreach ($keys as $fk): if (!isset($restrictableFeatures[$fk])) continue; ?>
                    <label class="ac-check-card">
                      <input type="checkbox" name="restricted_features[]" value="<?= htmlspecialchars($fk) ?>" <?= in_array($fk, $selectedFeatures, true) ? 'checked' : '' ?>>
                      <span style="font-size:0.84rem; font-weight:600; color:var(--text);"><?= htmlspecialchars($restrictableFeatures[$fk]) ?></span>
                    </label>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </section>

        <!-- TAB 3: UNIFIED MAINTENANCE CONTROL -->
        <section id="acPanelMaintenance" class="ac-panel <?= $activeTab === 'maintenance' ? 'is-visible' : '' ?>">
          <div class="ac-card">
            <div class="ac-card-head">
              <div>
                <div class="ac-card-title">🚨 Մեկ սեղմումով ամբողջ համակարգի կառավարում</div>
                <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Անմիջապես փակում կամ բացում է Կայքը, PWA-ն, iOS-ը և Android-ը միաժամանակ։</div>
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button type="button" class="ac-btn ac-btn--ghost" onclick="wpSyncMaintFromAnnouncement()">📋 Պատճենել տեքստը հայտարարությունից</button>
                <button type="button" class="ac-btn ac-btn--danger" onclick="wpSubmitMasterAction('master_maintenance_on', 'Վստա՞հ եք, որ ուզում եք միացնել տեխնիկական դադարը ԱՄԲՈՂՋ համակարգում։')">🔴 Միացնել դադարը ամենուր</button>
                <button type="button" class="ac-btn ac-btn--success" onclick="wpSubmitMasterAction('master_maintenance_off', 'Վերականգնե՞լ ամբողջ համակարգը Live ռեժիմի։')">🟢 Բացել ամենուր (Live)</button>
              </div>
            </div>

            <div class="ac-toggle" style="margin-bottom:18px;">
              <label class="ac-switch">
                <input type="checkbox" name="announcement_sync_with_maintenance" value="1" <?= !empty($ann['sync_with_maintenance']) ? 'checked' : '' ?>>
                <span class="ac-slider"></span>
              </label>
              <div>
                <div style="font-weight:700; color:var(--text); font-size:0.9rem;">Կապել Հայտարարությունը Տեխնիկական Աշխատանքների հետ</div>
                <div style="font-size:0.78rem; color:var(--muted);">Երբ Կայքի/PWA դադարը միացված կամ պլանավորված է, հայտարարությունն ու սահմանափակումները նույնպես ավտոմատ կմիանան։</div>
              </div>
            </div>

            <div class="ac-grid-2">
              <!-- Web & PWA Maintenance -->
              <div style="background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:18px;">
                <h3 style="margin:0 0 12px; font-size:1rem; color:var(--text);">🌐 Կայք և PWA (`maintenance.html`)</h3>
                <div class="ac-toggle" style="margin-bottom:12px; background:var(--surface);">
                  <label class="ac-switch">
                    <input type="checkbox" name="web_maintenance_enabled" value="1" <?= !empty($versionConfig['maintenance_enabled']) ? 'checked' : '' ?>>
                    <span class="ac-slider"></span>
                  </label>
                  <div style="font-weight:700; font-size:0.86rem; color:var(--text);">Միացնել Կայքի և PWA դադարը</div>
                </div>
                <div class="ac-field" style="margin-bottom:10px;">
                  <label class="ac-label">Հաղորդագրություն (Web/PWA)</label>
                  <textarea id="acWebMaintMsg" name="web_maintenance_message" class="ac-textarea" rows="3"><?= htmlspecialchars($versionConfig['maintenance_message'] ?? '') ?></textarea>
                </div>
                <div class="ac-grid-2" style="margin-bottom:10px;">
                  <div class="ac-field">
                    <label class="ac-label">Սկիզբ</label>
                    <input type="datetime-local" name="web_maintenance_start_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($versionConfig['maintenance_start_at'] ?? '')) ?>">
                  </div>
                  <div class="ac-field">
                    <label class="ac-label">Ավարտ (հաշվիչի համար)</label>
                    <input type="datetime-local" name="web_maintenance_end_at" class="ac-input" value="<?= htmlspecialchars(wp_version_format_datetime_local($versionConfig['maintenance_end_at'] ?? '')) ?>">
                  </div>
                </div>
                <div class="ac-field">
                  <label class="ac-label">Թույլատրված IP-ներ (բացառություն, ստորակետով)</label>
                  <input type="text" name="web_maintenance_allowed_ips" class="ac-input" value="<?= htmlspecialchars($versionConfig['maintenance_allowed_ips'] ?? '') ?>" placeholder="օր․ 1.2.3.4, 5.6.7.8">
                </div>
              </div>

              <!-- iOS & Android Maintenance -->
              <div style="background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:18px;">
                <h3 style="margin:0 0 12px; font-size:1rem; color:var(--text);">📱 iOS և Android Native Հավելվածներ</h3>
                <div class="ac-grid-2" style="margin-bottom:10px;">
                  <div class="ac-field">
                    <label class="ac-label">🍏 iOS Կարգավիճակ</label>
                    <select name="ios_status" class="ac-select">
                      <option value="live" <?= $iosStatus === 'live' ? 'selected' : '' ?>>🟢 Live</option>
                      <option value="review" <?= $iosStatus === 'review' ? 'selected' : '' ?>>🟡 Review</option>
                      <option value="maintenance" <?= $iosStatus === 'maintenance' ? 'selected' : '' ?>>🔴 Maintenance</option>
                    </select>
                  </div>
                  <div class="ac-field">
                    <label class="ac-label">🤖 Android Կարգավիճակ</label>
                    <select name="android_status" class="ac-select">
                      <option value="live" <?= $androidStatus === 'live' ? 'selected' : '' ?>>🟢 Live</option>
                      <option value="review" <?= $androidStatus === 'review' ? 'selected' : '' ?>>🟡 Review</option>
                      <option value="maintenance" <?= $androidStatus === 'maintenance' ? 'selected' : '' ?>>🔴 Maintenance</option>
                    </select>
                  </div>
                </div>
                <div class="ac-field" style="margin-bottom:10px;">
                  <label class="ac-label">iOS Դադարի Վերնագիր և Տեքստ</label>
                  <input type="text" id="acIosMaintTitle" name="ios_maintenance_title" class="ac-input" style="margin-bottom:6px;" value="<?= htmlspecialchars($mobileConfig['ios']['maintenance_title'] ?? '') ?>">
                  <textarea id="acIosMaintMsg" name="ios_maintenance_message" class="ac-textarea" rows="2"><?= htmlspecialchars($mobileConfig['ios']['maintenance_message'] ?? '') ?></textarea>
                </div>
                <div class="ac-field">
                  <label class="ac-label">Android Դադարի Վերնագիր և Տեքստ</label>
                  <input type="text" id="acAndroidMaintTitle" name="android_maintenance_title" class="ac-input" style="margin-bottom:6px;" value="<?= htmlspecialchars($mobileConfig['android']['maintenance_title'] ?? '') ?>">
                  <textarea id="acAndroidMaintMsg" name="android_maintenance_message" class="ac-textarea" rows="2"><?= htmlspecialchars($mobileConfig['android']['maintenance_message'] ?? '') ?></textarea>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style="display:flex; justify-content:flex-end; margin-top:16px;">
          <button type="submit" class="ac-btn ac-btn--primary" onclick="document.getElementById('acFormAction').value='save_all';">💾 Պահպանել բոլոր փոփոխությունները</button>
        </div>
      </form>
    </div>
  </main>
</div>

<script>
  function wpSwitchAcTab(tab, btn) {
    document.getElementById('acActiveTabInput').value = tab;
    document.querySelectorAll('.ac-tab').forEach(function (el) { el.classList.remove('is-active'); });
    if (btn) btn.classList.add('is-active');
    document.getElementById('acPanelBanner').classList.toggle('is-visible', tab === 'banner');
    document.getElementById('acPanelRestrictions').classList.toggle('is-visible', tab === 'restrictions');
    document.getElementById('acPanelMaintenance').classList.toggle('is-visible', tab === 'maintenance');
  }

  function wpSetChecks(name, checked) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (el) { el.checked = checked; });
  }

  function wpUpdatePreview() {
    var type = document.getElementById('acTypeSelect').value;
    var title = document.getElementById('acTitleInput').value.trim();
    var msg = document.getElementById('acMsgInput').value.trim();
    var btnTxt = document.getElementById('acActionTextInput').value.trim();
    var dismissChk = document.querySelector('input[name="announcement_dismissible"]');
    var countChk = document.querySelector('input[name="announcement_show_countdown"]');
    var map = {
      info: { color: '#7ee8ff', border: 'rgba(0,212,255,0.45)', bg: 'rgba(0,212,255,0.18)', defaultTitle: 'Հայտարարություն' },
      warning: { color: '#f7b500', border: 'rgba(247,181,0,0.5)', bg: 'rgba(247,181,0,0.2)', defaultTitle: 'Ուշադրություն' },
      success: { color: '#34d399', border: 'rgba(16,185,129,0.5)', bg: 'rgba(16,185,129,0.2)', defaultTitle: 'Թարմացում' },
      critical: { color: '#ff6961', border: 'rgba(255,69,58,0.5)', bg: 'rgba(255,69,58,0.2)', defaultTitle: 'Տեխնիկական հայտարարություն' }
    };
    var pal = map[type] || map.info;
    var resolvedTitle = title;
    var resolvedMsg = msg;
    if (!resolvedTitle && resolvedMsg.indexOf('\n') !== -1) {
      var lines = resolvedMsg.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
      if (lines.length >= 2 && lines[0].length <= 80) {
        resolvedTitle = lines[0];
        resolvedMsg = lines.slice(1).join('\n');
      }
    }
    document.getElementById('acLivePreview').style.borderColor = pal.border;
    document.getElementById('acPrevDot').style.background = pal.color;
    document.getElementById('acPrevDot').style.boxShadow = '0 0 10px ' + pal.color;
    document.getElementById('acPrevTitle').style.color = pal.color;
    document.getElementById('acPrevTitle').textContent = resolvedTitle || pal.defaultTitle;
    document.getElementById('acPrevMsg').textContent = resolvedMsg || 'Այստեղ կցուցադրվի հայտարարության տեքստը օգտատերերի համար։';
    var prevCountdown = document.getElementById('acPrevCountdown');
    if (prevCountdown) {
      prevCountdown.style.display = (countChk && countChk.checked) ? 'inline-flex' : 'none';
      prevCountdown.style.background = pal.bg;
      prevCountdown.style.borderColor = pal.border;
    }
    var prevClose = document.getElementById('acPrevClose');
    if (prevClose) {
      prevClose.style.display = (!dismissChk || dismissChk.checked) ? 'inline-flex' : 'none';
    }
    var prevBtn = document.getElementById('acPrevBtn');
    if (btnTxt) {
      prevBtn.style.display = 'inline-block';
      prevBtn.style.background = pal.bg;
      prevBtn.style.borderColor = pal.border;
      prevBtn.textContent = btnTxt + ' →';
    } else {
      prevBtn.style.display = 'none';
    }
  }
  document.addEventListener('DOMContentLoaded', function() {
    wpUpdatePreview();
    document.querySelectorAll('input[name="announcement_dismissible"], input[name="announcement_show_countdown"]').forEach(function(el) {
      el.addEventListener('change', wpUpdatePreview);
    });
  });

  function wpApplyPreset(kind) {
    var presets = {
      upgrade: {
        type: 'warning',
        title: 'Վերազինման աշխատանքներ',
        msg: 'Worship Platform կայքը և բջջային հավելվածը ժամանակավորապես անհասանելի կլինեն տեխնիկական վերազինման նպատակներով։ Շուտով կվերադառնանք։',
        title_ru: 'Технические работы и обновление',
        msg_ru: 'Сайт и приложение Worship Platform временно обновляются для улучшения сервиса. Скоро вернёмся!',
        title_en: 'Scheduled Maintenance & Upgrade',
        msg_en: 'Worship Platform is currently undergoing scheduled upgrades and will be back shortly.'
      },
      partial: {
        type: 'warning',
        title: 'Որոշ բաժիններ ժամանակավորապես փակ են',
        msg: 'Համակարգի արդիականացման ընթացքում ընտրված բաժինները ժամանակավորապես սահմանափակված են։ Մյուս բաժինները շարունակում են աշխատել սովորական ռեժիմով։',
        title_ru: 'Некоторые разделы временно ограничены',
        msg_ru: 'Во время обновления системы выбранные разделы временно недоступны. Остальные функции работают в обычном режиме.',
        title_en: 'Partial Service Maintenance',
        msg_en: 'Selected features are temporarily restricted during system upgrades. Other sections remain available.'
      },
      update: {
        type: 'success',
        title: 'Հասանելի է նոր տարբերակ',
        msg: 'Ավելացվել է Աստվածաշնչի Նոր Արարատ թարգմանությունը և բարելավված է հավելվածի ինտերֆեյսը։',
        title_ru: 'Доступно новое обновление',
        msg_ru: 'Добавлен полный перевод Библии и обновлён интерфейс приложения.',
        title_en: 'New Update Available',
        msg_en: 'New Bible translations and refreshed mobile interface improvements are now live.'
      }
    };
    var p = presets[kind];
    if (!p) return;
    document.getElementById('acTypeSelect').value = p.type;
    document.getElementById('acTitleInput').value = p.title;
    document.getElementById('acMsgInput').value = p.msg;
    document.getElementById('acTitleRu').value = p.title_ru;
    document.getElementById('acMsgRu').value = p.msg_ru;
    document.getElementById('acTitleEn').value = p.title_en;
    document.getElementById('acMsgEn').value = p.msg_en;
    wpUpdatePreview();
  }

  function wpSyncMaintFromAnnouncement() {
    var title = document.getElementById('acTitleInput').value.trim() || 'Վերազինման աշխատանքներ';
    var msg = document.getElementById('acMsgInput').value.trim();
    if (!msg) return;
    document.getElementById('acWebMaintMsg').value = msg;
    document.getElementById('acIosMaintTitle').value = title;
    document.getElementById('acIosMaintMsg').value = msg;
    document.getElementById('acAndroidMaintTitle').value = title;
    document.getElementById('acAndroidMaintMsg').value = msg;
  }

  function wpSubmitMasterAction(actionName, confirmText) {
    if (!window.confirm(confirmText)) return;
    document.getElementById('acFormAction').value = actionName;
    document.getElementById('acMainForm').submit();
  }
</script>
</body>
</html>
