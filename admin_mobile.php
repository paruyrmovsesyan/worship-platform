<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/mobile_service.php';
require_once __DIR__ . '/error_service.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_mobile.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail       = trim((string)($adminUser['email'] ?? ''));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}

$i18n = [
    'hy' => [
        'page_title' => 'iOS և Android Հավելվածների Կառավարում — Worship Admin',
        'title' => 'Բջջային Հավելվածների Կենտրոն',
        'subtitle' => 'iOS (App Store) և Android (Google Play) տարբերակների, սխալների և կարգավորումների կառավարում',
        'tab_overview' => 'Ընդհանուր Վահանակ',
        'tab_ios' => '🍏 iOS Կառավարում',
        'tab_android' => '🤖 Android Կառավարում',
        'tab_errors' => '⚠️ Սխալների Մոնիտոր',
        'tab_announcements' => '📢 Հայտարարություններ & Ֆունկցիաներ',
        'tab_devices' => '📲 Բջջային Սարքեր',
        'save_changes' => 'Պահպանել Փոփոխությունները',
        'saving' => 'Պահպանվում է...',
        'saved_ok' => 'Կարգավորումները հաջողությամբ պահպանվեցին:',
        'status_live' => 'Ակտիվ (Live)',
        'status_review' => 'Ստուգման մեջ (Review)',
        'status_maintenance' => 'Տեխնիկական դադար (Maintenance)',
        'force_update' => 'Պարտադիր Թարմացում (Force Update)',
        'force_update_desc' => 'Եթե ակտիվ է, հին տարբերակով օգտատերերը չեն կարողանա մուտք գործել առանց թարմացնելու:',
        'current_ver' => 'Ընթացիկ Տարբերակ',
        'current_build' => 'Ընթացիկ Build',
        'min_ver' => 'Նվազագույն Պահանջվող Տարբերակ',
        'min_build' => 'Նվազագույն Build',
        'store_url' => 'Խանութի Հղում',
        'apk_url' => 'Ուղիղ APK Ներբեռնում',
        'maintenance_mode' => 'Տեխնիկական Դադարի Ռեժիմ',
        'maint_title' => 'Դադարի Վերնագիր',
        'maint_msg' => 'Դադարի Հաղորդագրություն',
        'update_title' => 'Թարմացման Վերնագիր',
        'update_msg' => 'Թարմացման Հաղորդագրություն',
        'test_error_ios' => 'Թեստային Սխալ (iOS)',
        'test_error_android' => 'Թեստային Սխալ (Android)',
        'all_platforms' => 'Բոլոր Հարթակները',
        'all_status' => 'Բոլոր Կարգավիճակները',
        'status_active' => '🔴 Ակտիվ',
        'status_resolved' => '🟢 Լուծված',
        'resolve' => 'Նշել Լուծված',
        'reopen' => 'Վերաբացել',
        'inspect' => 'Մանրամասն',
        'no_errors' => 'Բջջային սխալներ չեն հայտնաբերվել: Հավելվածներն աշխատում են անխափան:',
        'no_devices' => 'Գրանցված բջջային սարքեր դեռ չկան:',
    ],
    'ru' => [
        'page_title' => 'Управление iOS и Android приложениями — Worship Admin',
        'title' => 'Центр Мобильных Приложений',
        'subtitle' => 'Управление версиями iOS (App Store) и Android (Google Play), мониторинг ошибок и настройки',
        'tab_overview' => 'Обзор',
        'tab_ios' => '🍏 Управление iOS',
        'tab_android' => '🤖 Управление Android',
        'tab_errors' => '⚠️ Монитор Ошибок',
        'tab_announcements' => '📢 Баннеры и Функции',
        'tab_devices' => '📲 Мобильные Устройства',
        'save_changes' => 'Сохранить Изменения',
        'saving' => 'Сохранение...',
        'saved_ok' => 'Настройки успешно сохранены.',
        'status_live' => 'Активно (Live)',
        'status_review' => 'На проверке (Review)',
        'status_maintenance' => 'Техработы (Maintenance)',
        'force_update' => 'Принудительное Обновление',
        'force_update_desc' => 'Если включено, пользователи со старыми версиями не смогут продолжить без обновления.',
        'current_ver' => 'Текущая Версия',
        'current_build' => 'Текущий Build',
        'min_ver' => 'Минимальная Версия',
        'min_build' => 'Минимальный Build',
        'store_url' => 'Ссылка на Магазин',
        'apk_url' => 'Прямое скачивание APK',
        'maintenance_mode' => 'Режим Техработ',
        'maint_title' => 'Заголовок техработ',
        'maint_msg' => 'Сообщение техработ',
        'update_title' => 'Заголовок обновления',
        'update_msg' => 'Сообщение обновления',
        'test_error_ios' => 'Тест Ошибки (iOS)',
        'test_error_android' => 'Тест Ошибки (Android)',
        'all_platforms' => 'Все Платформы',
        'all_status' => 'Все Статусы',
        'status_active' => '🔴 Активные',
        'status_resolved' => '🟢 Решенные',
        'resolve' => 'Решено',
        'reopen' => 'Открыть',
        'inspect' => 'Детали',
        'no_errors' => 'Ошибок мобильных приложений не обнаружено.',
        'no_devices' => 'Зарегистрированных устройств пока нет.',
    ],
    'en' => [
        'page_title' => 'iOS & Android App Management — Worship Admin',
        'title' => 'Mobile Apps Hub',
        'subtitle' => 'Manage iOS (App Store) and Android (Google Play) versions, crash logs & in-app announcements',
        'tab_overview' => 'Overview',
        'tab_ios' => '🍏 iOS Management',
        'tab_android' => '🤖 Android Management',
        'tab_errors' => '⚠️ Crash & Error Monitor',
        'tab_announcements' => '📢 Announcements & Features',
        'tab_devices' => '📲 Mobile Devices',
        'save_changes' => 'Save Changes',
        'saving' => 'Saving...',
        'saved_ok' => 'Settings saved successfully.',
        'status_live' => 'Live',
        'status_review' => 'Under Review',
        'status_maintenance' => 'Maintenance',
        'force_update' => 'Force Update',
        'force_update_desc' => 'When active, clients on older versions are blocked until they update.',
        'current_ver' => 'Current Version',
        'current_build' => 'Current Build',
        'min_ver' => 'Minimum Required Version',
        'min_build' => 'Minimum Build',
        'store_url' => 'Store URL',
        'apk_url' => 'Direct APK Download',
        'maintenance_mode' => 'Maintenance Mode',
        'maint_title' => 'Maintenance Title',
        'maint_msg' => 'Maintenance Message',
        'update_title' => 'Update Dialog Title',
        'update_msg' => 'Update Dialog Message',
        'test_error_ios' => 'Inject iOS Error',
        'test_error_android' => 'Inject Android Error',
        'all_platforms' => 'All Platforms',
        'all_status' => 'All Statuses',
        'status_active' => '🔴 Active',
        'status_resolved' => '🟢 Resolved',
        'resolve' => 'Mark Resolved',
        'reopen' => 'Reopen',
        'inspect' => 'Inspect',
        'no_errors' => 'No mobile errors detected. Apps are operating smoothly.',
        'no_devices' => 'No mobile devices registered yet.',
    ],
];
$t = $i18n[$adminLang] ?? $i18n['hy'];

// ── POST REQUEST HANDLER ──
$flashMessage = '';
$flashType = 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postAction = trim((string)($_POST['form_action'] ?? ''));

    if ($postAction === 'save_ios' || $postAction === 'save_android' || $postAction === 'save_all') {
        $config = wp_mobile_get_config();

        if ($postAction === 'save_ios' || $postAction === 'save_all') {
            $config['ios']['current_version'] = trim((string)($_POST['ios_current_version'] ?? '1.0'));
            $config['ios']['current_build']   = trim((string)($_POST['ios_current_build'] ?? '1'));
            $config['ios']['min_version']     = trim((string)($_POST['ios_min_version'] ?? '1.0'));
            $config['ios']['min_build']       = trim((string)($_POST['ios_min_build'] ?? '1'));
            $config['ios']['force_update']    = !empty($_POST['ios_force_update']);
            $config['ios']['status']          = in_array($_POST['ios_status'] ?? '', ['live', 'review', 'maintenance'], true) ? $_POST['ios_status'] : 'live';
            $config['ios']['app_store_url']   = trim((string)($_POST['ios_app_store_url'] ?? ''));
            $config['ios']['maintenance_title']   = trim((string)($_POST['ios_maintenance_title'] ?? ''));
            $config['ios']['maintenance_message'] = trim((string)($_POST['ios_maintenance_message'] ?? ''));
            $config['ios']['update_title']        = trim((string)($_POST['ios_update_title'] ?? ''));
            $config['ios']['update_message']      = trim((string)($_POST['ios_update_message'] ?? ''));
        }

        if ($postAction === 'save_android' || $postAction === 'save_all') {
            $config['android']['current_version'] = trim((string)($_POST['android_current_version'] ?? '1.0'));
            $config['android']['current_build']   = trim((string)($_POST['android_current_build'] ?? '1'));
            $config['android']['min_version']     = trim((string)($_POST['android_min_version'] ?? '1.0'));
            $config['android']['min_build']       = trim((string)($_POST['android_min_build'] ?? '1'));
            $config['android']['force_update']    = !empty($_POST['android_force_update']);
            $config['android']['status']          = in_array($_POST['android_status'] ?? '', ['live', 'review', 'maintenance'], true) ? $_POST['android_status'] : 'live';
            $config['android']['play_store_url']  = trim((string)($_POST['android_play_store_url'] ?? ''));
            $config['android']['apk_download_url'] = trim((string)($_POST['android_apk_download_url'] ?? ''));
            $config['android']['maintenance_title']   = trim((string)($_POST['android_maintenance_title'] ?? ''));
            $config['android']['maintenance_message'] = trim((string)($_POST['android_maintenance_message'] ?? ''));
            $config['android']['update_title']        = trim((string)($_POST['android_update_title'] ?? ''));
            $config['android']['update_message']      = trim((string)($_POST['android_update_message'] ?? ''));
        }

        wp_mobile_save_config($config, $adminDisplayName);
        $flashMessage = $t['saved_ok'];
    }

    if ($postAction === 'save_announcements') {
        $config = wp_mobile_get_config();
        $config['announcement']['enabled']     = !empty($_POST['announcement_enabled']);
        $config['announcement']['target']      = in_array($_POST['announcement_target'] ?? '', ['all', 'ios', 'android'], true) ? $_POST['announcement_target'] : 'all';
        $config['announcement']['type']        = in_array($_POST['announcement_type'] ?? '', ['info', 'warning', 'success', 'critical'], true) ? $_POST['announcement_type'] : 'info';
        $config['announcement']['title']       = trim((string)($_POST['announcement_title'] ?? ''));
        $config['announcement']['message']     = trim((string)($_POST['announcement_message'] ?? ''));
        $config['announcement']['action_text'] = trim((string)($_POST['announcement_action_text'] ?? ''));
        $config['announcement']['action_url']  = trim((string)($_POST['announcement_action_url'] ?? ''));

        // Feature flags
        $config['features']['biometric_auth']      = !empty($_POST['feat_biometric_auth']);
        $config['features']['audio_calls']         = !empty($_POST['feat_audio_calls']);
        $config['features']['push_notifications']  = !empty($_POST['feat_push_notifications']);
        $config['features']['chord_transposition'] = !empty($_POST['feat_chord_transposition']);
        $config['features']['setlists_sync']       = !empty($_POST['feat_setlists_sync']);
        $config['features']['offline_mode']        = !empty($_POST['feat_offline_mode']);

        wp_mobile_save_config($config, $adminDisplayName);
        $flashMessage = $t['saved_ok'];
    }

    if ($postAction === 'inject_test_error') {
        $plat = $_POST['test_platform'] === 'ios' ? 'ios' : 'android';
        wp_error_log_record([
            'level' => 'fatal',
            'environment' => $plat,
            'message' => "Test Native Crash: Null pointer / WKWebView memory warning simulated on {$plat} App",
            'file' => $plat === 'ios' ? 'ViewController.swift' : 'MainActivity.java',
            'line' => 124,
            'url' => 'capacitor://localhost/songs',
            'stack_trace' => "FatalException: Simulated Native Exception\n  at am.pmstudio.worship.Bridge.dispatchMessage({$plat}:124)\n  at capacitor.plugins.NativeEngine.run(NativeEngine.swift:88)",
            'user_agent' => $plat === 'ios' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
            'device_info' => json_encode(['platform' => $plat, 'version' => '1.0', 'build' => '1', 'model' => $plat === 'ios' ? 'iPhone 15 Pro' : 'Pixel 8']),
        ]);
        $flashMessage = "Թեստային սխալը հաջողությամբ գրանցվեց {$plat} հավելվածի համար:";
    }

    if ($postAction === 'toggle_resolve_error') {
        $fp = trim((string)$_POST['fingerprint']);
        $isRes = !empty($_POST['is_resolved']);
        if ($fp !== '') {
            wp_error_save_resolution($fp, $isRes, $isRes ? 'Լուծված է ադմինի կողմից' : 'Վերաբացված է', $adminDisplayName);
            $flashMessage = $isRes ? 'Սխալը նշվեց որպես լուծված:' : 'Սխալը վերաբացվեց:';
        }
    }
}

// ── LOAD DATA ──
$mobileConfig = wp_mobile_get_config();
$errorStats = wp_error_get_stats();
$errorFilterPlatform = in_array($_GET['err_platform'] ?? '', ['all', 'ios', 'android'], true) ? $_GET['err_platform'] : 'all';
$errorFilterStatus   = in_array($_GET['err_status'] ?? '', ['all', 'active', 'resolved'], true) ? $_GET['err_status'] : 'all';
$errorFilterSearch   = trim((string)($_GET['err_search'] ?? ''));

$mobileErrors = wp_mobile_get_error_logs($errorFilterPlatform, 50, $errorFilterStatus, $errorFilterSearch);
$registeredDevices = wp_mobile_get_registered_devices();

$activeTab = $_GET['tab'] ?? 'overview';
if (!in_array($activeTab, ['overview', 'ios', 'android', 'errors', 'announcements', 'devices'], true)) {
    $activeTab = 'overview';
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($adminLang) ?>" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= htmlspecialchars($t['page_title']) ?></title>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .mobile-hub-container {
      max-width: 1320px;
      margin: 0 auto;
      padding: 24px;
    }
    .m-hero {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      position: relative;
      overflow: hidden;
    }
    .m-hero::after {
      content: '';
      position: absolute;
      right: -80px;
      top: -80px;
      width: 260px;
      height: 260px;
      background: radial-gradient(circle, rgba(0, 212, 255, 0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .m-hero-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .m-hero-sub {
      color: #94a3b8;
      font-size: 0.92rem;
      max-width: 600px;
    }
    .m-hero-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .m-tabs-nav {
      display: flex;
      gap: 6px;
      background: rgba(15, 23, 42, 0.6);
      padding: 6px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 24px;
      overflow-x: auto;
    }
    .m-tab-btn {
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.88rem;
      color: #94a3b8;
      background: transparent;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
    }
    .m-tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .m-tab-btn.active {
      color: #fff;
      background: #0284c7;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }
    .m-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .m-stat-card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .m-stat-card .m-stat-label {
      font-size: 0.8rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .m-stat-card .m-stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .m-stat-card .m-stat-sub {
      font-size: 0.82rem;
      color: #64748b;
      margin-top: 6px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge--live { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge--review { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }
    .badge--maint { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge--fatal { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge--error { background: rgba(249, 115, 22, 0.2); color: #fdba74; }
    .badge--warn { background: rgba(234, 179, 8, 0.2); color: #fde047; }
    .m-form-card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .m-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .m-card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .m-form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .m-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .m-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #cbd5e1;
    }
    .m-input, .m-select, .m-textarea {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 10px 14px;
      color: #fff;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .m-input:focus, .m-select:focus, .m-textarea:focus {
      border-color: #00d4ff;
    }
    .m-toggle-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .m-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .m-switch input { opacity: 0; width: 0; height: 0; }
    .m-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #475569;
      transition: .3s;
      border-radius: 34px;
    }
    .m-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    input:checked + .m-slider { background-color: #0284c7; }
    input:checked + .m-slider:before { transform: translateX(20px); }
    .m-btn {
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .m-btn--primary {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #fff;
    }
    .m-btn--primary:hover { opacity: 0.92; transform: translateY(-1px); }
    .m-btn--secondary {
      background: #334155;
      color: #f1f5f9;
    }
    .m-btn--secondary:hover { background: #475569; }
    .m-btn--danger {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .m-btn--danger:hover { background: rgba(239, 68, 68, 0.25); }
    .m-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .m-table th {
      text-align: left;
      padding: 12px 14px;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .m-table td {
      padding: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }
    .m-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .m-error-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .m-error-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .m-error-msg {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.84rem;
      color: #f87171;
      background: rgba(15, 23, 42, 0.6);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(239, 68, 68, 0.2);
      word-break: break-all;
    }
    .alert-flash {
      padding: 14px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }
  </style>
</head>
<body class="admin-body">

<?php 
$activePage = 'mobile';
include __DIR__ . '/admin_sidebar.php'; 
?>

<div class="admin-main">
  <?php include __DIR__ . '/admin_topbar.php'; ?>

  <div class="mobile-hub-container">

    <?php if ($flashMessage !== ''): ?>
      <div class="alert-flash">
        ✓ <?= htmlspecialchars($flashMessage) ?>
      </div>
    <?php endif; ?>

    <!-- HERO HEADER -->
    <div class="m-hero">
      <div>
        <div class="m-hero-title">
          <span>📱</span> <?= htmlspecialchars($t['title']) ?>
        </div>
        <div class="m-hero-sub">
          <?= htmlspecialchars($t['subtitle']) ?>
        </div>
      </div>
      <div class="m-hero-actions">
        <form method="POST" style="display:inline;">
          <input type="hidden" name="form_action" value="inject_test_error">
          <input type="hidden" name="test_platform" value="ios">
          <button type="submit" class="m-btn m-btn--secondary" title="Փորձարկել iOS սխալ">
            🧪 <?= htmlspecialchars($t['test_error_ios']) ?>
          </button>
        </form>
        <form method="POST" style="display:inline;">
          <input type="hidden" name="form_action" value="inject_test_error">
          <input type="hidden" name="test_platform" value="android">
          <button type="submit" class="m-btn m-btn--secondary" title="Փորձարկել Android սխալ">
            🧪 <?= htmlspecialchars($t['test_error_android']) ?>
          </button>
        </form>
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <div class="m-tabs-nav">
      <a href="?tab=overview" class="m-tab-btn <?= $activeTab === 'overview' ? 'active' : '' ?>">
        📊 <?= htmlspecialchars($t['tab_overview']) ?>
      </a>
      <a href="?tab=ios" class="m-tab-btn <?= $activeTab === 'ios' ? 'active' : '' ?>">
        🍏 <?= htmlspecialchars($t['tab_ios']) ?>
      </a>
      <a href="?tab=android" class="m-tab-btn <?= $activeTab === 'android' ? 'active' : '' ?>">
        🤖 <?= htmlspecialchars($t['tab_android']) ?>
      </a>
      <a href="?tab=errors" class="m-tab-btn <?= $activeTab === 'errors' ? 'active' : '' ?>">
        ⚠️ <?= htmlspecialchars($t['tab_errors']) ?>
        <?php if (!empty($errorStats['ios']) || !empty($errorStats['android'])): ?>
          <span style="background:#ef4444; color:#fff; border-radius:99px; padding:2px 7px; font-size:0.72rem;">
            <?= (int)($errorStats['ios'] + $errorStats['android']) ?>
          </span>
        <?php endif; ?>
      </a>
      <a href="?tab=announcements" class="m-tab-btn <?= $activeTab === 'announcements' ? 'active' : '' ?>">
        📢 <?= htmlspecialchars($t['tab_announcements']) ?>
      </a>
      <a href="?tab=devices" class="m-tab-btn <?= $activeTab === 'devices' ? 'active' : '' ?>">
        📲 <?= htmlspecialchars($t['tab_devices']) ?> (<?= count($registeredDevices) ?>)
      </a>
    </div>

    <!-- 1. OVERVIEW TAB -->
    <?php if ($activeTab === 'overview'): ?>
      <div class="m-stat-grid">
        <!-- iOS Status Card -->
        <div class="m-stat-card">
          <div class="m-stat-label">
            <span>🍏 iOS (App Store)</span>
            <span class="badge badge--<?= htmlspecialchars($mobileConfig['ios']['status'] === 'live' ? 'live' : ($mobileConfig['ios']['status'] === 'review' ? 'review' : 'maint')) ?>">
              <?= htmlspecialchars($mobileConfig['ios']['status']) ?>
            </span>
          </div>
          <div class="m-stat-value">
            v<?= htmlspecialchars($mobileConfig['ios']['current_version']) ?>
            <span style="font-size:0.95rem; color:#94a3b8; font-weight:500;">Build <?= htmlspecialchars($mobileConfig['ios']['current_build']) ?></span>
          </div>
          <div class="m-stat-sub">
            Նվազագույն՝ v<?= htmlspecialchars($mobileConfig['ios']['min_version']) ?> · 
            <?= !empty($mobileConfig['ios']['force_update']) ? '<span style="color:#f87171;font-weight:700;">Պարտադիր թարմացում</span>' : '<span style="color:#4ade80;">Ընտրովի</span>' ?>
          </div>
        </div>

        <!-- Android Status Card -->
        <div class="m-stat-card">
          <div class="m-stat-label">
            <span>🤖 Android (Google Play)</span>
            <span class="badge badge--<?= htmlspecialchars($mobileConfig['android']['status'] === 'live' ? 'live' : ($mobileConfig['android']['status'] === 'review' ? 'review' : 'maint')) ?>">
              <?= htmlspecialchars($mobileConfig['android']['status']) ?>
            </span>
          </div>
          <div class="m-stat-value">
            v<?= htmlspecialchars($mobileConfig['android']['current_version']) ?>
            <span style="font-size:0.95rem; color:#94a3b8; font-weight:500;">Build <?= htmlspecialchars($mobileConfig['android']['current_build']) ?></span>
          </div>
          <div class="m-stat-sub">
            Նվազագույն՝ v<?= htmlspecialchars($mobileConfig['android']['min_version']) ?> · 
            <?= !empty($mobileConfig['android']['force_update']) ? '<span style="color:#f87171;font-weight:700;">Պարտադիր թարմացում</span>' : '<span style="color:#4ade80;">Ընտրովի</span>' ?>
          </div>
        </div>

        <!-- iOS Errors -->
        <div class="m-stat-card">
          <div class="m-stat-label">
            <span>🍏 iOS Սխալներ</span>
            <span style="color:#f87171; font-weight:700;">iOS Logs</span>
          </div>
          <div class="m-stat-value" style="color:#f87171;">
            <?= (int)($errorStats['ios'] ?? 0) ?>
          </div>
          <div class="m-stat-sub">Գրանցված քրեշներ և սխալներ iPhone/iPad-ից</div>
        </div>

        <!-- Android Errors -->
        <div class="m-stat-card">
          <div class="m-stat-label">
            <span>🤖 Android Սխալներ</span>
            <span style="color:#f87171; font-weight:700;">Android Logs</span>
          </div>
          <div class="m-stat-value" style="color:#f87171;">
            <?= (int)($errorStats['android'] ?? 0) ?>
          </div>
          <div class="m-stat-sub">Գրանցված քրեշներ Android սարքերից</div>
        </div>
      </div>

      <!-- Quick Platform Actions -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px; margin-bottom:24px;">
        <div class="m-form-card">
          <div class="m-card-header">
            <div class="m-card-title">🍏 iOS Կարգավիճակի Արագ Փոխարկիչ</div>
            <a href="?tab=ios" class="m-btn m-btn--secondary" style="padding:6px 12px; font-size:0.8rem;">Մանրամասն</a>
          </div>
          <p style="color:#94a3b8; font-size:0.88rem; margin-bottom:16px;">
            Կարող եք ակնթարթորեն միացնել կամ անջատել պարտադիր թարմացումը կամ տեխնիկական դադարը բոլոր iOS օգտատերերի համար:
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="?tab=ios" class="m-btn m-btn--primary">Կարգավորել iOS</a>
            <a href="https://appstoreconnect.apple.com" target="_blank" class="m-btn m-btn--secondary">App Store Connect ↗</a>
          </div>
        </div>

        <div class="m-form-card">
          <div class="m-card-header">
            <div class="m-card-title">🤖 Android Կարգավիճակի Արագ Փոխարկիչ</div>
            <a href="?tab=android" class="m-btn m-btn--secondary" style="padding:6px 12px; font-size:0.8rem;">Մանրամասն</a>
          </div>
          <p style="color:#94a3b8; font-size:0.88rem; margin-bottom:16px;">
            Կարող եք ակնթարթորեն միացնել կամ անջատել պարտադիր թարմացումը կամ տեխնիկական դադարը բոլոր Android օգտատերերի համար:
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="?tab=android" class="m-btn m-btn--primary">Կարգավորել Android</a>
            <a href="/worship-platform.apk" download class="m-btn m-btn--secondary">Ներբեռնել APK (26.8 MB) ⬇</a>
          </div>
        </div>
      </div>
    <?php endif; ?>

    <!-- 2. iOS MANAGEMENT TAB -->
    <?php if ($activeTab === 'ios'): ?>
      <form method="POST" class="m-form-card">
        <input type="hidden" name="form_action" value="save_ios">
        <div class="m-card-header">
          <div class="m-card-title">🍏 iOS Հավելվածի Պարամետրեր (App Store / TestFlight)</div>
          <button type="submit" class="m-btn m-btn--primary">💾 <?= htmlspecialchars($t['save_changes']) ?></button>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['current_ver']) ?></label>
            <input type="text" name="ios_current_version" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['current_version']) ?>" required>
          </div>
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['current_build']) ?></label>
            <input type="number" name="ios_current_build" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['current_build']) ?>" required>
          </div>
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['min_ver']) ?></label>
            <input type="text" name="ios_min_version" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['min_version']) ?>" required>
          </div>
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['min_build']) ?></label>
            <input type="number" name="ios_min_build" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['min_build']) ?>" required>
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label">Կարգավիճակ (Platform Status)</label>
            <select name="ios_status" class="m-select">
              <option value="live" <?= $mobileConfig['ios']['status'] === 'live' ? 'selected' : '' ?>>🟢 Live (Հավելվածը հասանելի է)</option>
              <option value="review" <?= $mobileConfig['ios']['status'] === 'review' ? 'selected' : '' ?>>🟡 Under Review (Apple-ի ստուգման մեջ)</option>
              <option value="maintenance" <?= $mobileConfig['ios']['status'] === 'maintenance' ? 'selected' : '' ?>>🔴 Maintenance (Տեխնիկական դադար)</option>
            </select>
          </div>
          <div class="m-field" style="grid-column: span 2;">
            <label class="m-label"><?= htmlspecialchars($t['store_url']) ?></label>
            <input type="url" name="ios_app_store_url" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['app_store_url']) ?>">
          </div>
        </div>

        <div class="m-toggle-wrap" style="margin-bottom:16px;">
          <label class="m-switch">
            <input type="checkbox" name="ios_force_update" value="1" <?= !empty($mobileConfig['ios']['force_update']) ? 'checked' : '' ?>>
            <span class="m-slider"></span>
          </label>
          <div>
            <div style="font-weight:700; color:#fff; font-size:0.92rem;"><?= htmlspecialchars($t['force_update']) ?></div>
            <div style="font-size:0.8rem; color:#94a3b8;"><?= htmlspecialchars($t['force_update_desc']) ?></div>
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['update_title']) ?></label>
            <input type="text" name="ios_update_title" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['update_title']) ?>">
          </div>
          <div class="m-field" style="grid-column: span 2;">
            <label class="m-label"><?= htmlspecialchars($t['update_msg']) ?></label>
            <input type="text" name="ios_update_message" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['update_message']) ?>">
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['maint_title']) ?></label>
            <input type="text" name="ios_maintenance_title" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['maintenance_title']) ?>">
          </div>
          <div class="m-field" style="grid-column: span 2;">
            <label class="m-label"><?= htmlspecialchars($t['maint_msg']) ?></label>
            <input type="text" name="ios_maintenance_message" class="m-input" value="<?= htmlspecialchars($mobileConfig['ios']['maintenance_message']) ?>">
          </div>
        </div>

        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
          <button type="submit" class="m-btn m-btn--primary">💾 <?= htmlspecialchars($t['save_changes']) ?></button>
        </div>
      </form>
    <?php endif; ?>

    <!-- 3. ANDROID MANAGEMENT TAB -->
    <?php if ($activeTab === 'android'): ?>
      <form method="POST" class="m-form-card">
        <input type="hidden" name="form_action" value="save_android">
        <div class="m-card-header">
          <div class="m-card-title">🤖 Android Հավելվածի Պարամետրեր (Google Play & APK)</div>
          <button type="submit" class="m-btn m-btn--primary">💾 <?= htmlspecialchars($t['save_changes']) ?></button>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['current_ver']) ?></label>
            <input type="text" name="android_current_version" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['current_version']) ?>" required>
          </div>
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['current_build']) ?></label>
            <input type="number" name="android_current_build" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['current_build']) ?>" required>
          </div>
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['min_ver']) ?></label>
            <input type="text" name="android_min_version" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['min_version']) ?>" required>
          </div>
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['min_build']) ?></label>
            <input type="number" name="android_min_build" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['min_build']) ?>" required>
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label">Կարգավիճակ (Platform Status)</label>
            <select name="android_status" class="m-select">
              <option value="live" <?= $mobileConfig['android']['status'] === 'live' ? 'selected' : '' ?>>🟢 Live (Հավելվածը հասանելի է)</option>
              <option value="review" <?= $mobileConfig['android']['status'] === 'review' ? 'selected' : '' ?>>🟡 Under Review (Google Play-ի ստուգման մեջ)</option>
              <option value="maintenance" <?= $mobileConfig['android']['status'] === 'maintenance' ? 'selected' : '' ?>>🔴 Maintenance (Տեխնիկական դադար)</option>
            </select>
          </div>
          <div class="m-field">
            <label class="m-label">Google Play Հղում</label>
            <input type="url" name="android_play_store_url" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['play_store_url']) ?>">
          </div>
          <div class="m-field">
            <label class="m-label">Ուղիղ APK Ներբեռնման Հղում</label>
            <input type="url" name="android_apk_download_url" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['apk_download_url']) ?>">
          </div>
        </div>

        <div class="m-toggle-wrap" style="margin-bottom:16px;">
          <label class="m-switch">
            <input type="checkbox" name="android_force_update" value="1" <?= !empty($mobileConfig['android']['force_update']) ? 'checked' : '' ?>>
            <span class="m-slider"></span>
          </label>
          <div>
            <div style="font-weight:700; color:#fff; font-size:0.92rem;"><?= htmlspecialchars($t['force_update']) ?></div>
            <div style="font-size:0.8rem; color:#94a3b8;"><?= htmlspecialchars($t['force_update_desc']) ?></div>
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['update_title']) ?></label>
            <input type="text" name="android_update_title" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['update_title']) ?>">
          </div>
          <div class="m-field" style="grid-column: span 2;">
            <label class="m-label"><?= htmlspecialchars($t['update_msg']) ?></label>
            <input type="text" name="android_update_message" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['update_message']) ?>">
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label"><?= htmlspecialchars($t['maint_title']) ?></label>
            <input type="text" name="android_maintenance_title" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['maintenance_title']) ?>">
          </div>
          <div class="m-field" style="grid-column: span 2;">
            <label class="m-label"><?= htmlspecialchars($t['maint_msg']) ?></label>
            <input type="text" name="android_maintenance_message" class="m-input" value="<?= htmlspecialchars($mobileConfig['android']['maintenance_message']) ?>">
          </div>
        </div>

        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
          <button type="submit" class="m-btn m-btn--primary">💾 <?= htmlspecialchars($t['save_changes']) ?></button>
        </div>
      </form>
    <?php endif; ?>

    <!-- 4. ERRORS & CRASH MONITOR TAB -->
    <?php if ($activeTab === 'errors'): ?>
      <div class="m-form-card">
        <div class="m-card-header">
          <div class="m-card-title">⚠️ iOS և Android Սխալների & Քրեշների Մոնիտոր</div>
          <div style="display:flex; gap:8px;">
            <a href="?tab=errors" class="m-btn m-btn--secondary" style="padding:6px 14px; font-size:0.82rem;">🔄 Թարմացնել</a>
          </div>
        </div>

        <!-- Filters Form -->
        <form method="GET" style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
          <input type="hidden" name="tab" value="errors">
          <select name="err_platform" class="m-select" style="min-width:140px;" onchange="this.form.submit()">
            <option value="all" <?= $errorFilterPlatform === 'all' ? 'selected' : '' ?>>Բոլոր հարթակները</option>
            <option value="ios" <?= $errorFilterPlatform === 'ios' ? 'selected' : '' ?>>🍏 Միայն iOS</option>
            <option value="android" <?= $errorFilterPlatform === 'android' ? 'selected' : '' ?>>🤖 Միայն Android</option>
          </select>
          <select name="err_status" class="m-select" style="min-width:140px;" onchange="this.form.submit()">
            <option value="all" <?= $errorFilterStatus === 'all' ? 'selected' : '' ?>>Բոլոր կարգավիճակները</option>
            <option value="active" <?= $errorFilterStatus === 'active' ? 'selected' : '' ?>>🔴 Ակտիվ սխալներ</option>
            <option value="resolved" <?= $errorFilterStatus === 'resolved' ? 'selected' : '' ?>>🟢 Լուծված խնդիրներ</option>
          </select>
          <input type="text" name="err_search" class="m-input" placeholder="Որոնել սխալ, ֆայլ, stack..." value="<?= htmlspecialchars($errorFilterSearch) ?>" style="flex:1; min-width:200px;">
          <button type="submit" class="m-btn m-btn--secondary">Որոնել</button>
        </form>

        <?php if (empty($mobileErrors)): ?>
          <div style="text-align:center; padding:48px 20px; color:#64748b;">
            <div style="font-size:2.8rem; margin-bottom:12px;">🎉</div>
            <div style="font-size:1.1rem; font-weight:700; color:#cbd5e1;"><?= htmlspecialchars($t['no_errors']) ?></div>
            <div style="font-size:0.85rem; margin-top:6px;">Ցանկացած նոր քրեշ կամ JS runtime սխալ կհայտնվի այստեղ անմիջապես:</div>
          </div>
        <?php else: ?>
          <div>
            <?php foreach ($mobileErrors as $err): ?>
              <?php 
                $isResolved = !empty($err['is_resolved']);
                $env = strtolower((string)($err['environment'] ?? ''));
                $level = strtolower((string)($err['level'] ?? 'error'));
                $devInfo = $err['device_info'] ? (is_array($err['device_info']) ? $err['device_info'] : json_decode((string)$err['device_info'], true)) : null;
              ?>
              <div class="m-error-card">
                <div class="m-error-header">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="badge" style="background:#1e293b; color:#fff; border:1px solid rgba(255,255,255,0.1);">
                      <?= $env === 'ios' ? '🍏 iOS' : ($env === 'android' ? '🤖 Android' : '📱 Mobile') ?>
                    </span>
                    <span class="badge badge--<?= $level === 'fatal' ? 'fatal' : ($level === 'error' ? 'error' : 'warn') ?>">
                      <?= htmlspecialchars(strtoupper($level)) ?>
                    </span>
                    <?php if ($isResolved): ?>
                      <span class="badge badge--live">ԼՈՒԾՎԱԾ</span>
                    <?php else: ?>
                      <span class="badge badge--maint">ԱԿՏԻՎ</span>
                    <?php endif; ?>
                    <span style="font-size:0.8rem; color:#64748b;">
                      <?= (int)($err['occurrences'] ?? 1) ?> կրկնություն · <?= htmlspecialchars($err['last_seen'] ?? '') ?>
                    </span>
                  </div>

                  <form method="POST" style="margin:0;">
                    <input type="hidden" name="form_action" value="toggle_resolve_error">
                    <input type="hidden" name="fingerprint" value="<?= htmlspecialchars($err['fingerprint'] ?? '') ?>">
                    <input type="hidden" name="is_resolved" value="<?= $isResolved ? '0' : '1' ?>">
                    <button type="submit" class="m-btn <?= $isResolved ? 'm-btn--secondary' : 'm-btn--primary' ?>" style="padding:4px 10px; font-size:0.75rem;">
                      <?= $isResolved ? 'Վերաբացել' : '✓ Նշել Լուծված' ?>
                    </button>
                  </form>
                </div>

                <div class="m-error-msg">
                  <?= htmlspecialchars($err['message'] ?? '') ?>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; font-size:0.8rem; color:#94a3b8; gap:10px;">
                  <div>
                    <?php if (!empty($err['file'])): ?>
                      <span>📍 Ֆայլ: <?= htmlspecialchars($err['file']) ?><?= !empty($err['line']) ? ':' . $err['line'] : '' ?></span>
                    <?php endif; ?>
                    <?php if (!empty($devInfo['model'])): ?>
                      <span style="margin-left:12px;">📱 Սարք: <?= htmlspecialchars($devInfo['model']) ?></span>
                    <?php endif; ?>
                  </div>
                  <div>
                    <?php if (!empty($err['user_email'])): ?>
                      <span>👤 <?= htmlspecialchars($err['user_email']) ?></span>
                    <?php endif; ?>
                  </div>
                </div>

                <?php if (!empty($err['stack_trace'])): ?>
                  <details style="margin-top:6px; font-size:0.78rem;">
                    <summary style="cursor:pointer; color:#38bdf8;">Դիտել Stack Trace</summary>
                    <pre style="background:#0b1120; padding:10px; border-radius:8px; margin-top:6px; color:#cbd5e1; overflow-x:auto; max-height:180px;"><?= htmlspecialchars($err['stack_trace']) ?></pre>
                  </details>
                <?php endif; ?>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <!-- 5. ANNOUNCEMENTS & FEATURES TAB -->
    <?php if ($activeTab === 'announcements'): ?>
      <form method="POST" class="m-form-card">
        <input type="hidden" name="form_action" value="save_announcements">
        <div class="m-card-header">
          <div class="m-card-title">📢 Ներծրագրային Հայտարարության Բաններ (In-App Banner)</div>
          <button type="submit" class="m-btn m-btn--primary">💾 <?= htmlspecialchars($t['save_changes']) ?></button>
        </div>

        <div class="m-toggle-wrap" style="margin-bottom:16px;">
          <label class="m-switch">
            <input type="checkbox" name="announcement_enabled" value="1" <?= !empty($mobileConfig['announcement']['enabled']) ? 'checked' : '' ?>>
            <span class="m-slider"></span>
          </label>
          <div>
            <div style="font-weight:700; color:#fff; font-size:0.92rem;">Միացնել Ներծրագրային Բանները</div>
            <div style="font-size:0.8rem; color:#94a3b8;">Հաղորդագրությունը կհայտնվի հավելվածի վերևի հատվածում:</div>
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label">Թիրախային Հարթակ</label>
            <select name="announcement_target" class="m-select">
              <option value="all" <?= ($mobileConfig['announcement']['target'] ?? '') === 'all' ? 'selected' : '' ?>>📱 Երկուսն էլ (iOS և Android)</option>
              <option value="ios" <?= ($mobileConfig['announcement']['target'] ?? '') === 'ios' ? 'selected' : '' ?>>🍏 Միայն iOS</option>
              <option value="android" <?= ($mobileConfig['announcement']['target'] ?? '') === 'android' ? 'selected' : '' ?>>🤖 Միայն Android</option>
            </select>
          </div>
          <div class="m-field">
            <label class="m-label">Բանների Տեսակ</label>
            <select name="announcement_type" class="m-select">
              <option value="info" <?= ($mobileConfig['announcement']['type'] ?? '') === 'info' ? 'selected' : '' ?>>ℹ️ Տեղեկատվական (Info - Կապույտ)</option>
              <option value="warning" <?= ($mobileConfig['announcement']['type'] ?? '') === 'warning' ? 'selected' : '' ?>>⚠️ Զգուշացում (Warning - Դեղին)</option>
              <option value="success" <?= ($mobileConfig['announcement']['type'] ?? '') === 'success' ? 'selected' : '' ?>>✅ Դրական (Success - Կանաչ)</option>
              <option value="critical" <?= ($mobileConfig['announcement']['type'] ?? '') === 'critical' ? 'selected' : '' ?>>🚨 Կրիտիկական (Critical - Կարմիր)</option>
            </select>
          </div>
          <div class="m-field">
            <label class="m-label">Վերնագիր</label>
            <input type="text" name="announcement_title" class="m-input" value="<?= htmlspecialchars($mobileConfig['announcement']['title'] ?? '') ?>" placeholder="Օրինակ՝ Կարևոր ծանուցում">
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field" style="grid-column: span 3;">
            <label class="m-label">Հաղորդագրություն</label>
            <textarea name="announcement_message" class="m-textarea" rows="2" placeholder="Գրեք հաղորդագրության տեքստը..."><?= htmlspecialchars($mobileConfig['announcement']['message'] ?? '') ?></textarea>
          </div>
        </div>

        <div class="m-form-row">
          <div class="m-field">
            <label class="m-label">Գործողության Կոճակ (Կամընտիր)</label>
            <input type="text" name="announcement_action_text" class="m-input" value="<?= htmlspecialchars($mobileConfig['announcement']['action_text'] ?? '') ?>" placeholder="Օրինակ՝ Թարմացնել">
          </div>
          <div class="m-field" style="grid-column: span 2;">
            <label class="m-label">Կոճակի Հղում</label>
            <input type="text" name="announcement_action_url" class="m-input" value="<?= htmlspecialchars($mobileConfig['announcement']['action_url'] ?? '') ?>" placeholder="https://... կամ ներքին էջ (/songs)">
          </div>
        </div>

        <div class="m-card-header" style="margin-top:28px;">
          <div class="m-card-title">⚙️ Native Ֆունկցիաների Կառավարում (Feature Flags)</div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-bottom:16px;">
          <div class="m-toggle-wrap">
            <label class="m-switch">
              <input type="checkbox" name="feat_biometric_auth" value="1" <?= !empty($mobileConfig['features']['biometric_auth']) ? 'checked' : '' ?>>
              <span class="m-slider"></span>
            </label>
            <div>
              <div style="font-weight:600; color:#fff;">Face ID / Biometrics</div>
              <div style="font-size:0.75rem; color:#94a3b8;">Մատնահետք և դեմքի ճանաչում</div>
            </div>
          </div>

          <div class="m-toggle-wrap">
            <label class="m-switch">
              <input type="checkbox" name="feat_audio_calls" value="1" <?= !empty($mobileConfig['features']['audio_calls']) ? 'checked' : '' ?>>
              <span class="m-slider"></span>
            </label>
            <div>
              <div style="font-weight:600; color:#fff;">Աուդիո Զանգեր (Audio Calls)</div>
              <div style="font-size:0.75rem; color:#94a3b8;">P2P / WebRTC ձայնային զանգեր</div>
            </div>
          </div>

          <div class="m-toggle-wrap">
            <label class="m-switch">
              <input type="checkbox" name="feat_push_notifications" value="1" <?= !empty($mobileConfig['features']['push_notifications']) ? 'checked' : '' ?>>
              <span class="m-slider"></span>
            </label>
            <div>
              <div style="font-weight:600; color:#fff;">Push Ծանուցումներ</div>
              <div style="font-size:0.75rem; color:#94a3b8;">APNs (iOS) & FCM (Android)</div>
            </div>
          </div>

          <div class="m-toggle-wrap">
            <label class="m-switch">
              <input type="checkbox" name="feat_chord_transposition" value="1" <?= !empty($mobileConfig['features']['chord_transposition']) ? 'checked' : '' ?>>
              <span class="m-slider"></span>
            </label>
            <div>
              <div style="font-weight:600; color:#fff;">Ակորդների Տրանսպոզիցիա</div>
              <div style="font-size:0.75rem; color:#94a3b8;">Տոնայնության փոփոխում</div>
            </div>
          </div>

          <div class="m-toggle-wrap">
            <label class="m-switch">
              <input type="checkbox" name="feat_setlists_sync" value="1" <?= !empty($mobileConfig['features']['setlists_sync']) ? 'checked' : '' ?>>
              <span class="m-slider"></span>
            </label>
            <div>
              <div style="font-weight:600; color:#fff;">Երգացանկերի Սինքրոնացում</div>
              <div style="font-size:0.75rem; color:#94a3b8;">Live Setlists & Team Roles</div>
            </div>
          </div>

          <div class="m-toggle-wrap">
            <label class="m-switch">
              <input type="checkbox" name="feat_offline_mode" value="1" <?= !empty($mobileConfig['features']['offline_mode']) ? 'checked' : '' ?>>
              <span class="m-slider"></span>
            </label>
            <div>
              <div style="font-weight:600; color:#fff;">Offline Քեշավորում</div>
              <div style="font-size:0.75rem; color:#94a3b8;">Անցանց երգերի պահպանում</div>
            </div>
          </div>
        </div>

        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
          <button type="submit" class="m-btn m-btn--primary">💾 <?= htmlspecialchars($t['save_changes']) ?></button>
        </div>
      </form>
    <?php endif; ?>

    <!-- 6. MOBILE DEVICES TAB -->
    <?php if ($activeTab === 'devices'): ?>
      <div class="m-form-card">
        <div class="m-card-header">
          <div class="m-card-title">📲 Գրանցված Բջջային Սարքեր (<?= count($registeredDevices) ?>)</div>
          <a href="?tab=devices" class="m-btn m-btn--secondary" style="padding:6px 14px; font-size:0.82rem;">🔄 Թարմացնել</a>
        </div>

        <?php if (empty($registeredDevices)): ?>
          <div style="text-align:center; padding:48px 20px; color:#64748b;">
            <div style="font-size:2.8rem; margin-bottom:12px;">📱</div>
            <div style="font-size:1.1rem; font-weight:700; color:#cbd5e1;"><?= htmlspecialchars($t['no_devices']) ?></div>
            <div style="font-size:0.85rem; margin-top:6px;">Երբ օգտատերերը բացեն հավելվածը հեռախոսով, սարքերը կգրանցվեն այստեղ:</div>
          </div>
        <?php else: ?>
          <div style="overflow-x:auto;">
            <table class="m-table">
              <thead>
                <tr>
                  <th>Սարք / Հարթակ</th>
                  <th>Device ID</th>
                  <th>Օգտատեր (User ID)</th>
                  <th>Push Token</th>
                  <th>Կարգավիճակ</th>
                  <th>Վերջին Ակտիվություն</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($registeredDevices as $dev): ?>
                  <tr>
                    <td>
                      <div style="font-weight:600; color:#fff;">
                        <?= str_contains(strtolower($dev['platform']), 'ios') ? '🍏 iOS' : (str_contains(strtolower($dev['platform']), 'android') ? '🤖 Android' : '📱 ' . htmlspecialchars($dev['platform'])) ?>
                      </div>
                      <div style="font-size:0.75rem; color:#64748b;"><?= htmlspecialchars(substr($dev['user_agent'], 0, 50)) ?></div>
                    </td>
                    <td><code style="font-size:0.78rem; color:#38bdf8;"><?= htmlspecialchars(substr($dev['device_id'], 0, 16)) ?>...</code></td>
                    <td><?= $dev['user_id'] ? '#' . (int)$dev['user_id'] : '<span style="color:#64748b;">Հյուր (Guest)</span>' ?></td>
                    <td>
                      <?= !empty($dev['has_token']) ? '<span class="badge badge--live">ԱԿՏԻՎ TOKEN</span>' : '<span style="color:#64748b; font-size:0.78rem;">Չկա</span>' ?>
                    </td>
                    <td>
                      <?= !empty($dev['is_active']) ? '<span style="color:#4ade80;">● Online</span>' : '<span style="color:#64748b;">Offline</span>' ?>
                    </td>
                    <td style="font-size:0.8rem; color:#94a3b8;"><?= htmlspecialchars($dev['last_seen']) ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        <?php endif; ?>
      </div>
    <?php endif; ?>

  </div>
</div>

</body>
</html>
