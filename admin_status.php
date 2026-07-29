<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/push_service.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_status.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && ($_GET['action'] ?? '') === 'cleanup_orphans') {
    try {
        $pdo = wp_runtime_open_pdo();
        $pdo->exec("DELETE si FROM setlist_items si LEFT JOIN songs s ON si.song_id = s.id WHERE s.id IS NULL AND si.song_id IS NOT NULL AND si.song_id > 0");
        $pdo->exec("DELETE sa FROM setlist_assignments sa LEFT JOIN setlists s ON sa.setlist_id = s.id WHERE s.id IS NULL");
        $pdo->exec("DELETE uf FROM user_favorites uf LEFT JOIN users u ON uf.user_id = u.id WHERE u.id IS NULL");
        $pdo->exec("DELETE us FROM user_sessions us LEFT JOIN users u ON us.user_id = u.id WHERE u.id IS NULL");
        header('Location: ?cleaned=1'); exit;
    } catch (Throwable $e) {
        header('Location: ?error=1'); exit;
    }
}

// ── TRANSLATIONS DICTIONARY ──────────────────────────────────
$i18n = [
    'hy' => [
        'page_title' => 'Համակարգի վիճակ — Worship Platform Admin',
        'status_ok' => 'Բոլոր համակարգերն աշխատում են նորմալ',
        'status_warn' => 'Առկա են զգուշացումներ',
        'status_error' => 'Հայտնաբերվել են խնդիրներ',
        'checked_summary' => 'Ստուգվել է %d կետ %d մվ-ում · %s',
        'total_checks' => 'Ընդհանուր ստուգումներ',
        'passed' => 'Անցած',
        'warnings' => 'Զգուշացումներ',
        'errors' => 'Սխալներ',
        'refresh' => 'Թարմացնել',
        'last_checked' => 'Վերջին ստուգումը՝',
        // Group labels
        'group_server' => 'Սերվերային միջավայր',
        'group_database' => 'Տվյալների բազա',
        'group_tables' => 'Բազայի աղյուսակներ',
        'group_integrity' => 'Տվյալների Անաղարտություն (Integrity)',
        'group_push' => 'Push Ծանուցումների Ենթակառուցվածք',
        'group_perf' => 'Բազայի Օպտիմիզացիա և Լոգեր',
        'group_sec_deep' => 'Անվտանգության Խորացված Աուդիտ',
        'group_api' => 'API Հասցեներ',
        'group_security' => 'Անվտանգություն',
        'group_app' => 'Ծրագիր / PWA',
        'group_files' => 'Ֆայլեր և թույլտվություններ',
        // Labels & notes
        'php_ver' => 'PHP Տարբերակ',
        'php_ver_rec' => 'Խորհուրդ է տրվում PHP 8.1+',
        'ext_loaded' => 'Բեռնված է',
        'ext_missing' => 'Բացակայում է',
        'ext_req_note' => "'%s' փլագինը բացակայում է",
        'mem_usage' => 'Հիշողության օգտագործում',
        'disk_space' => 'Սկավառակի հիշողություն',
        'disk_low_note' => 'Սկավառակի հիշողությունը քիչ է!',
        'used' => 'օգտագործված',
        'free' => 'ազատ',
        'upload_limits' => 'Բեռնման սահմանաչափեր',
        'db_conn' => 'Բազայի միացում',
        'db_slow_note' => 'Դանդաղ կապ',
        'mysql_ver' => 'MySQL Տարբերակ',
        'rows' => 'տող',
        'table_missing_note' => "'%s' աղյուսակը գոյություն չունի",
        'ssl_label' => 'SSL / HTTPS Համակարգ',
        'ssl_active' => 'Ակտիվ է',
        'ssl_not_active' => 'Անջատված է',
        'ssl_rec_note' => 'Խորհուրդ է տրվում միացնել HTTPS',
        'app_ver' => 'Ծրագրի տարբերակ',
        'sw_cache' => 'Service Worker Քեշ',
        'fe_build' => 'Frontend Ֆայլեր',
        'fe_build_ok' => 'Առկա է',
        'fe_build_missing' => 'Բացակայում է',
        'fe_build_note' => 'Անհրաժեշտ է կատարել npm run build',
        'file_exists_w' => 'Առկա է, Գրելի',
        'file_exists_r' => 'Առկա է, Միայն կարդալու',
        'file_missing' => 'Բացակայում է',
        'clean_ok' => 'Անաղարտ է (0 որբ գրանցում)',
        'clean_warn' => 'Հայտնաբերվել է %d որբ գրանցում',
    ],
    'ru' => [
        'page_title' => 'Состояние системы — Worship Platform Admin',
        'status_ok' => 'Все системы работают нормально',
        'status_warn' => 'Имеются предупреждения',
        'status_error' => 'Обнаружены проблемы',
        'checked_summary' => 'Проверено %d пунктов за %d мс · %s',
        'total_checks' => 'Всего проверок',
        'passed' => 'Пройдено',
        'warnings' => 'Предупреждения',
        'errors' => 'Ошибки',
        'refresh' => 'Обновить',
        'last_checked' => 'Последняя проверка:',
        // Group labels
        'group_server' => 'Серверное окружение',
        'group_database' => 'База данных',
        'group_tables' => 'Таблицы базы данных',
        'group_integrity' => 'Целостность данных (Integrity)',
        'group_push' => 'Инфраструктура Push-уведомлений',
        'group_perf' => 'Оптимизация БД и журналы',
        'group_sec_deep' => 'Глубокий аудит безопасности',
        'group_api' => 'API Эндпоинты',
        'group_security' => 'Безопасность',
        'group_app' => 'Приложение / PWA',
        'group_files' => 'Файлы и права доступа',
        // Labels & notes
        'php_ver' => 'Версия PHP',
        'php_ver_rec' => 'Рекомендуется PHP 8.1+',
        'ext_loaded' => 'Загружено',
        'ext_missing' => 'Отсутствует',
        'ext_req_note' => "Расширение '%s' не загружено",
        'mem_usage' => 'Использование памяти',
        'disk_space' => 'Дисковое пространство',
        'disk_low_note' => 'Мало места на диске!',
        'used' => 'использовано',
        'free' => 'свободно',
        'upload_limits' => 'Лимиты загрузки',
        'db_conn' => 'Подключение к БД',
        'db_slow_note' => 'Медленное соединение',
        'mysql_ver' => 'Версия MySQL',
        'rows' => 'строк',
        'table_missing_note' => "Таблица '%s' не существует",
        'ssl_label' => 'Система SSL / HTTPS',
        'ssl_active' => 'Активно',
        'ssl_not_active' => 'Не активно',
        'ssl_rec_note' => 'Рекомендуется использовать HTTPS',
        'app_ver' => 'Версия приложения',
        'sw_cache' => 'Кэш Service Worker',
        'fe_build' => 'Сборка Frontend',
        'fe_build_ok' => 'Присутствует',
        'fe_build_missing' => 'Отсутствует',
        'fe_build_note' => 'Требуется запуск npm run build',
        'file_exists_w' => 'Есть, Запись',
        'file_exists_r' => 'Есть, Чтение',
        'file_missing' => 'Отсутствует',
        'clean_ok' => 'Чисто (0 сиротских записей)',
        'clean_warn' => 'Обнаружено %d сиротских записей',
    ],
    'en' => [
        'page_title' => 'System Status — Worship Platform Admin',
        'status_ok' => 'All Systems Operational',
        'status_warn' => 'System Warnings Found',
        'status_error' => 'System Issues Found',
        'checked_summary' => 'Checked %d items in %d ms · %s',
        'total_checks' => 'Total Checks',
        'passed' => 'Passed',
        'warnings' => 'Warnings',
        'errors' => 'Errors',
        'refresh' => 'Refresh',
        'last_checked' => 'Last checked:',
        // Group labels
        'group_server' => 'Server Environment',
        'group_database' => 'Database',
        'group_tables' => 'Database Tables',
        'group_integrity' => 'Data Integrity & Orphans',
        'group_push' => 'Push Notification Infrastructure',
        'group_perf' => 'Database Performance & Logs',
        'group_sec_deep' => 'Deep Security Audit',
        'group_api' => 'API Endpoints',
        'group_security' => 'Security',
        'group_app' => 'Application / PWA',
        'group_files' => 'Files & Permissions',
        // Labels & notes
        'php_ver' => 'PHP Version',
        'php_ver_rec' => 'Recommended: PHP 8.1+',
        'ext_loaded' => 'Loaded',
        'ext_missing' => 'Missing',
        'ext_req_note' => "Required extension '%s' is missing",
        'mem_usage' => 'Memory Usage',
        'disk_space' => 'Disk Space',
        'disk_low_note' => 'Low disk space!',
        'used' => 'used',
        'free' => 'free',
        'upload_limits' => 'Upload Limits',
        'db_conn' => 'Database Connection',
        'db_slow_note' => 'Slow connection',
        'mysql_ver' => 'MySQL Version',
        'rows' => 'rows',
        'table_missing_note' => "Table '%s' does not exist",
        'ssl_label' => 'SSL / HTTPS System',
        'ssl_active' => 'Active',
        'ssl_not_active' => 'Not Active',
        'ssl_rec_note' => 'HTTPS is recommended for production',
        'app_ver' => 'App Version',
        'sw_cache' => 'Service Worker Cache',
        'fe_build' => 'Frontend Build',
        'fe_build_ok' => 'OK',
        'fe_build_missing' => 'Missing',
        'fe_build_note' => 'Run npm run build required',
        'file_exists_w' => 'Exists, Writable',
        'file_exists_r' => 'Exists, Read-only',
        'file_missing' => 'Missing',
        'clean_ok' => 'Clean (0 orphan records)',
        'clean_warn' => 'Found %d orphan records',
    ]
];

$t = $i18n[$adminLang] ?? $i18n['hy'];

// ── Collect system checks ───────────────────────────────────
date_default_timezone_set('Asia/Yerevan');
$checks = [];
$serverTime = date('Y-m-d H:i:s') . ' (GMT+4 / Yerevan)';
$startTime  = microtime(true);

// 1. PHP version
$phpVer = phpversion();
$phpOk  = version_compare($phpVer, '8.1', '>=');
$checks[] = [
    'group'  => 'server',
    'label'  => $t['php_ver'],
    'value'  => $phpVer,
    'status' => $phpOk ? 'ok' : 'warn',
    'note'   => $phpOk ? '' : $t['php_ver_rec'],
];

// 2. PHP Extensions
$requiredExtensions = ['pdo', 'pdo_mysql', 'mysqli', 'json', 'mbstring', 'openssl', 'curl'];
foreach ($requiredExtensions as $ext) {
    $loaded = extension_loaded($ext);
    $checks[] = [
        'group'  => 'server',
        'label'  => "PHP ext: $ext",
        'value'  => $loaded ? $t['ext_loaded'] : $t['ext_missing'],
        'status' => $loaded ? 'ok' : 'error',
        'note'   => $loaded ? '' : sprintf($t['ext_req_note'], $ext),
    ];
}

// 3. Memory
$memLimit = ini_get('memory_limit');
$memUsed  = round(memory_get_usage(true) / 1024 / 1024, 1);
$checks[] = [
    'group'  => 'server',
    'label'  => $t['mem_usage'],
    'value'  => "{$memUsed} MB / {$memLimit}",
    'status' => 'ok',
    'note'   => '',
];

// 4. Disk space
$diskFree = disk_free_space(__DIR__);
$diskTotal = disk_total_space(__DIR__);
$diskFreeGb  = round($diskFree / 1024 / 1024 / 1024, 2);
$diskTotalGb = round($diskTotal / 1024 / 1024 / 1024, 2);
$diskPct     = round(($diskTotal - $diskFree) / $diskTotal * 100, 1);
$diskStatus  = $diskFreeGb > 1 ? 'ok' : ($diskFreeGb > 0.3 ? 'warn' : 'error');
$checks[] = [
    'group'  => 'server',
    'label'  => $t['disk_space'],
    'value'  => "{$diskFreeGb} GB {$t['free']} / {$diskTotalGb} GB ({$diskPct}% {$t['used']})",
    'status' => $diskStatus,
    'note'   => $diskStatus !== 'ok' ? $t['disk_low_note'] : '',
];

// 5. Upload limits
$uploadMax  = ini_get('upload_max_filesize');
$postMax    = ini_get('post_max_size');
$checks[] = [
    'group'  => 'server',
    'label'  => $t['upload_limits'],
    'value'  => "upload_max: {$uploadMax} / post_max: {$postMax}",
    'status' => 'ok',
    'note'   => '',
];

// ── Database Checks ──────────────────────────────────────────
$dbOk = false;
$dbMs = 0;
$dbVersion = '—';
$tableCounts = [];

try {
    $t0 = microtime(true);
    $pdo = wp_runtime_open_pdo();
    $pdo->query("SELECT 1");
    $dbMs = round((microtime(true) - $t0) * 1000, 1);
    $dbOk = true;

    $dbVersion = $pdo->query("SELECT VERSION()")->fetchColumn();

    $checks[] = [
        'group'  => 'database',
        'label'  => $t['db_conn'],
        'value'  => "OK ({$dbMs}ms)",
        'status' => $dbMs < 500 ? 'ok' : 'warn',
        'note'   => $dbMs >= 500 ? $t['db_slow_note'] : '',
    ];

    $checks[] = [
        'group'  => 'database',
        'label'  => $t['mysql_ver'],
        'value'  => $dbVersion,
        'status' => 'ok',
        'note'   => '',
    ];

    $requiredTables = [
        'songs', 'users', 'setlists', 'setlist_items',
        'favorites', 'user_favorites', 'user_sessions',
        'teams', 'team_members', 'chats', 'chat_messages',
        'push_subscriptions', 'install_stats',
        'setlist_assignments', 'song_attachments',
    ];

    $existingTables = [];
    $rows = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($rows as $tb) $existingTables[] = $tb;

    foreach ($requiredTables as $table) {
        $exists = in_array($table, $existingTables);
        $count  = '—';
        if ($exists) {
            try {
                $count = (int)$pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
            } catch (Throwable $e) {
                $count = 'error';
            }
        }
        $tableCounts[$table] = $count;
        $checks[] = [
            'group'  => 'tables',
            'label'  => $table,
            'value'  => $exists ? "$count {$t['rows']}" : $t['ext_missing'],
            'status' => $exists ? 'ok' : 'error',
            'note'   => $exists ? '' : sprintf($t['table_missing_note'], $table),
        ];
    }

    // ── Deep Data Integrity Checks ────────────────────────────────
    $integrityChecks = [
        [
            'label_hy' => 'Երգացանկերի որբ գրանցումներ',
            'label_ru' => 'Сиротские элементы плейлистов',
            'label_en' => 'Orphan Setlist Items',
            'query' => "SELECT COUNT(*) FROM setlist_items si LEFT JOIN songs s ON si.song_id = s.id WHERE s.id IS NULL AND si.song_id IS NOT NULL AND si.song_id > 0",
            'note_hy' => 'Գտնվել են երգացանկի տարրեր, որոնց երգերը ջնջված են',
            'note_ru' => 'Элементы плейлиста, ссылающиеся на отсутствующие песни',
            'note_en' => 'Setlist items referencing missing songs',
        ],
        [
            'label_hy' => 'Հանձնարարականների որբ գրանցումներ',
            'label_ru' => 'Сиротские назначения плейлистов',
            'label_en' => 'Orphan Setlist Assignments',
            'query' => "SELECT COUNT(*) FROM setlist_assignments sa LEFT JOIN setlists s ON sa.setlist_id = s.id WHERE s.id IS NULL",
            'note_hy' => 'Գտնվել են հանձնարարականներ, որոնց երգացանկերը ջնջված են',
            'note_ru' => 'Назначения, ссылающиеся на отсутствующие плейлисты',
            'note_en' => 'Assignments referencing missing setlists',
        ],
        [
            'label_hy' => 'Նախընտրածների որբ գրանցումներ',
            'label_ru' => 'Сиротские избранные записи',
            'label_en' => 'Orphan User Favorites',
            'query' => "SELECT COUNT(*) FROM user_favorites uf LEFT JOIN users u ON uf.user_id = u.id WHERE u.id IS NULL",
            'note_hy' => 'Գտնվել են նախընտրածներ, որոնց օգտատերերը ջնջված են',
            'note_ru' => 'Избранное, ссылающееся на отсутствующих пользователей',
            'note_en' => 'Favorites referencing missing users',
        ],
        [
            'label_hy' => 'Սեսիաների որբ գրանցումներ',
            'label_ru' => 'Сиротские сессии пользователей',
            'label_en' => 'Orphan User Sessions',
            'query' => "SELECT COUNT(*) FROM user_sessions us LEFT JOIN users u ON us.user_id = u.id WHERE u.id IS NULL",
            'note_hy' => 'Գտնվել են սեսիաներ, որոնց օգտատերերը ջնջված են',
            'note_ru' => 'Сессии, ссылающиеся на отсутствующих пользователей',
            'note_en' => 'Sessions referencing missing users',
        ],
    ];

    foreach ($integrityChecks as $ic) {
        try {
            $orphans = (int)$pdo->query($ic['query'])->fetchColumn();
            $lbl = $ic['label_' . $adminLang] ?? $ic['label_hy'];
            $nt = $ic['note_' . $adminLang] ?? $ic['note_hy'];
            $sol = $adminLang === 'ru' ? 'Решение: Нажмите кнопку "Очистить сиротские записи" для удаления' : ($adminLang === 'en' ? 'Solution: Click "Clean Orphan Records" button to remove' : 'Լուծում՝ Սեղմեք կոճակը անտեր/որբ գրանցումները ավտոմատ ջնջելու համար');
            $actLbl = $adminLang === 'ru' ? 'Очистить сиротские записи' : ($adminLang === 'en' ? 'Clean Orphan Records' : 'Մաքրել որբ գրանցումները');
            $checks[] = [
                'group' => 'integrity',
                'label' => $lbl,
                'value' => $orphans === 0 ? $t['clean_ok'] : sprintf($t['clean_warn'], $orphans),
                'status' => $orphans === 0 ? 'ok' : 'warn',
                'note' => $orphans > 0 ? $nt : '',
                'solution' => $orphans > 0 ? $sol : '',
                'action_post' => $orphans > 0 ? '?action=cleanup_orphans' : '',
                'action_label' => $orphans > 0 ? $actLbl : '',
            ];
        } catch (Throwable $e) {}
    }

    // ── Deep Database Performance Audit ───────────────────────────
    $slowThreshold = wp_runtime_slow_query_threshold();
    $slowCount = wp_runtime_read_slow_query_count();
    $lblSlow = $adminLang === 'ru' ? 'Логгер медленных запросов' : ($adminLang === 'en' ? 'Slow Query Logger' : 'Դանդաղ Հարցումների Գրանցիչ');
    $checks[] = [
        'group' => 'perf',
        'label' => $lblSlow,
        'value' => "Threshold: {$slowThreshold}s | Logged: {$slowCount}",
        'status' => 'ok',
        'note' => '',
    ];

} catch (Throwable $e) {
    $checks[] = [
        'group' => 'database',
        'label' => $t['db_conn'],
        'value' => 'FAILED',
        'status' => 'error',
        'note' => $e->getMessage(),
    ];
}

// ── Push Notification Infrastructure Health ────────────────────
$pushConfigPath = __DIR__ . '/version_config.php';
$p8File = wp_push_credential_path('apns');
$p8Exists = wp_push_credential_is_available('apns');
$solPush = $adminLang === 'ru' ? 'Решение: Перейдите в Настройки -> Push-уведомления и загрузите файл .p8' : ($adminLang === 'en' ? 'Solution: Go to Settings -> Push Notifications and upload .p8 certificate' : 'Լուծում՝ Գնացեք «Կարգավորումներ» -> «Push ծանուցումներ» և բեռնեք Apple AuthKey.p8 ֆայլը');
$actPush = $adminLang === 'ru' ? 'Перейти в Настройки' : ($adminLang === 'en' ? 'Go to Settings' : 'Գնալ Կարգավորումներ');

$checks[] = [
    'group' => 'push',
    'label' => 'iOS APNS AuthKey.p8',
    'value' => $p8Exists ? 'Found & Readable' : 'Missing',
    'status' => $p8Exists ? 'ok' : 'warn',
    'note' => $p8Exists ? '' : 'P8 certificate file is missing for iOS push notifications',
    'solution' => $p8Exists ? '' : $solPush,
    'action_url' => $p8Exists ? '' : '/admin_updates.php#push',
    'action_label' => $p8Exists ? '' : $actPush,
];

$fcmJson = wp_push_credential_path('firebase');
$fcmExists = wp_push_credential_is_available('firebase');
$solFcm = $adminLang === 'ru' ? 'Решение: Перейдите в Настройки -> Push-уведомления и загрузите JSON-файл' : ($adminLang === 'en' ? 'Solution: Go to Settings -> Push Notifications and upload Firebase JSON' : 'Լուծում՝ Գնացեք «Կարգավորումներ» -> «Push ծանուցումներ» և բեռնեք firebase_service_account.json ֆայլը');

$checks[] = [
    'group' => 'push',
    'label' => 'Firebase Service Account JSON',
    'value' => $fcmExists ? 'Found & Configured' : 'Missing',
    'status' => $fcmExists ? 'ok' : 'warn',
    'note' => $fcmExists ? '' : 'Service account JSON is missing for Web/FCM push notifications',
    'solution' => $fcmExists ? '' : $solFcm,
    'action_url' => $fcmExists ? '' : '/admin_updates.php#push',
    'action_label' => $fcmExists ? '' : $actPush,
];

// ── API Endpoints Check ──────────────────────────────────────
$apiEndpoints = [
    ['name' => 'Status API',       'url' => '/status.php'],
    ['name' => 'Songs API',        'url' => '/api.php?action=songs&limit=1'],
    ['name' => 'Auth Check',       'url' => '/auth_me.php'],
    ['name' => 'Setlists API',     'url' => '/setlists_api.php?action=ping'],
];

$serverName = $_SERVER['HTTP_HOST'] ?? 'worship.pmstudio.am';
$scheme     = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';

foreach ($apiEndpoints as $ep) {
    $url = "{$scheme}://{$serverName}{$ep['url']}";
    $t0  = microtime(true);
    $ok  = false;
    $httpCode = 0;
    $apiMs = 0;

    try {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_NOBODY         => false,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        ]);
        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $apiMs    = round((microtime(true) - $t0) * 1000, 1);
        curl_close($ch);

        $ok = $httpCode >= 200 && $httpCode < 500;
    } catch (Throwable $e) {
        $apiMs = round((microtime(true) - $t0) * 1000, 1);
    }

    $checks[] = [
        'group'  => 'api',
        'label'  => $ep['name'],
        'value'  => $ok ? "HTTP {$httpCode} ({$apiMs}ms)" : "FAILED (HTTP {$httpCode})",
        'status' => $ok ? ($apiMs < 1000 ? 'ok' : 'warn') : 'error',
        'note'   => $ep['url'],
    ];
}

// ── SSL Check ────────────────────────────────────────────────
$sslOk = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
$checks[] = [
    'group'  => 'security',
    'label'  => $t['ssl_label'],
    'value'  => $sslOk ? $t['ssl_active'] : $t['ssl_not_active'],
    'status' => $sslOk ? 'ok' : 'warn',
    'note'   => $sslOk ? '' : $t['ssl_rec_note'],
];

// ── Version / PWA ────────────────────────────────────────────
$versionLabel = '—';
try {
    $vc = wp_version_load();
    $versionLabel = (string)($vc['app_version'] ?? $vc['version'] ?? '—');
} catch (Throwable $e) {}

$checks[] = [
    'group'  => 'app',
    'label'  => $t['app_ver'],
    'value'  => $versionLabel,
    'status' => 'ok',
    'note'   => '',
];

$swPath = __DIR__ . '/sw.js';
$swVersion = '—';
if (file_exists($swPath)) {
    $swContent = file_get_contents($swPath);
    if (preg_match('/CACHE_VERSION\s*=\s*["\']([^"\']+)/', $swContent, $m)) {
        $swVersion = $m[1];
    }
}
$checks[] = [
    'group'  => 'app',
    'label'  => $t['sw_cache'],
    'value'  => $swVersion,
    'status' => 'ok',
    'note'   => '',
];

$assetsDir = __DIR__ . '/assets';
$jsExists  = glob($assetsDir . '/index.js*');
$cssExists = glob($assetsDir . '/index.css*');
$buildOk   = !empty($jsExists) && !empty($cssExists);
$checks[] = [
    'group'  => 'app',
    'label'  => $t['fe_build'],
    'value'  => $buildOk ? $t['fe_build_ok'] : $t['fe_build_missing'],
    'status' => $buildOk ? 'ok' : 'error',
    'note'   => $buildOk ? '' : $t['fe_build_note'],
];

// ── File Permissions ─────────────────────────────────────────
$criticalPaths = [
    'assets/' => __DIR__ . '/assets',
    'frontend/dist/' => __DIR__ . '/frontend/dist',
    'sw.js' => __DIR__ . '/sw.js',
    'index.html' => __DIR__ . '/index.html',
];

foreach ($criticalPaths as $label => $path) {
    $exists   = file_exists($path);
    $writable = $exists && is_writable($path);
    $checks[] = [
        'group'  => 'files',
        'label'  => $label,
        'value'  => $exists ? ($writable ? $t['file_exists_w'] : $t['file_exists_r']) : $t['file_missing'],
        'status' => $exists ? 'ok' : 'warn',
        'note'   => '',
    ];
}

// ── Summary ──────────────────────────────────────────────────
$totalChecks = count($checks);
$okCount    = count(array_filter($checks, fn($c) => $c['status'] === 'ok'));
$warnCount  = count(array_filter($checks, fn($c) => $c['status'] === 'warn'));
$errorCount = count(array_filter($checks, fn($c) => $c['status'] === 'error'));
$totalMs    = round((microtime(true) - $startTime) * 1000);

$overallStatus = $errorCount > 0 ? 'error' : ($warnCount > 0 ? 'warn' : 'ok');
$overallLabel  = $errorCount > 0 ? $t['status_error'] : ($warnCount > 0 ? $t['status_warn'] : $t['status_ok']);

$activePage = 'status';
?>
<!doctype html>
<html lang="<?= htmlspecialchars($adminLang, ENT_QUOTES) ?>">
<head>
  <?php wp_admin_render_pwa_head($t['page_title']); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .status-hero {
      padding: 32px 40px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 32px;
    }
    .status-hero.ok     { background: linear-gradient(135deg, #e6f9f3 0%, #d0f5ea 100%); }
    .status-hero.warn   { background: linear-gradient(135deg, #fff8e1 0%, #fff0c2 100%); }
    .status-hero.error  { background: linear-gradient(135deg, #ffeeeb 0%, #ffe0da 100%); }

    .status-hero-icon {
      width: 72px; height: 72px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 36px; flex-shrink: 0;
    }
    .status-hero.ok .status-hero-icon    { background: var(--success); color: #fff; }
    .status-hero.warn .status-hero-icon  { background: var(--warning); color: #fff; }
    .status-hero.error .status-hero-icon { background: var(--danger);  color: #fff; }

    .status-hero-text h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 4px; }
    .status-hero-text p  { color: var(--muted); font-size: 0.95rem; font-weight: 500; }

    .status-summary {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px; margin-bottom: 32px;
    }
    .summary-card {
      background: var(--surface); border-radius: var(--radius); padding: 20px;
      text-align: center; box-shadow: var(--shadow-sm);
    }
    .summary-card .num { font-size: 2rem; font-weight: 800; line-height: 1; }
    .summary-card .lbl { font-size: 0.8rem; color: var(--muted); font-weight: 600; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card.ok    .num { color: var(--success); }
    .summary-card.warn  .num { color: var(--warning); }
    .summary-card.error .num { color: var(--danger); }
    .summary-card.total .num { color: var(--primary); }

    .check-group {
      background: var(--surface); border-radius: var(--radius);
      box-shadow: var(--shadow-sm); margin-bottom: 20px; overflow: hidden;
    }
    .check-group-title {
      padding: 16px 24px; font-weight: 800; font-size: 0.85rem;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--muted); border-bottom: 1px solid var(--line);
      display: flex; align-items: center; gap: 10px;
    }
    .check-group-title svg { flex-shrink: 0; }
    .check-row {
      display: flex; align-items: center; padding: 14px 24px;
      border-bottom: 1px solid var(--line); gap: 16px;
      transition: background 0.1s;
    }
    .check-row:last-child { border-bottom: none; }
    .check-row:hover { background: rgba(67,24,255,0.02); }

    .check-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .check-dot.ok    { background: var(--success); box-shadow: 0 0 0 3px var(--success-bg); }
    .check-dot.warn  { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-bg); }
    .check-dot.error { background: var(--danger);  box-shadow: 0 0 0 3px var(--danger-bg); }

    .check-label { font-weight: 600; font-size: 0.92rem; min-width: 180px; }
    .check-value { flex: 1; color: var(--muted); font-size: 0.88rem; font-weight: 500; }
    .check-note  { font-size: 0.8rem; color: var(--danger); font-weight: 500; max-width: 300px; }

    .refresh-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 24px; background: var(--primary); color: #fff;
      border: none; border-radius: 12px; font-size: 0.9rem;
      font-weight: 700; cursor: pointer; font-family: inherit;
      transition: background 0.15s, transform 0.1s;
    }
    .refresh-btn:hover { background: var(--primary-hover); }
    .refresh-btn:active { transform: scale(0.97); }

    .status-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 0; color: var(--muted); font-size: 0.82rem; font-weight: 500;
    }

    @media (max-width: 768px) {
      .status-hero { padding: 20px; flex-direction: column; text-align: center; }
      .status-hero-text h1 { font-size: 1.3rem; }
      .check-row { flex-wrap: wrap; gap: 8px; padding: 12px 16px; }
      .check-label { min-width: 120px; font-size: 0.85rem; }
      .check-value { font-size: 0.82rem; }
      .check-note  { width: 100%; }
      .status-summary { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">

  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div style="padding: 28px 40px 60px; max-width: 1100px;">

      <!-- Hero Banner -->
      <div class="status-hero <?= $overallStatus ?>">
        <div class="status-hero-icon">
          <?php if ($overallStatus === 'ok'): ?>✓
          <?php elseif ($overallStatus === 'warn'): ?>⚠
          <?php else: ?>✕<?php endif; ?>
        </div>
        <div class="status-hero-text">
          <h1><?= htmlspecialchars($overallLabel) ?></h1>
          <p><?= htmlspecialchars(sprintf($t['checked_summary'], $totalChecks, $totalMs, $serverTime)) ?></p>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="status-summary">
        <div class="summary-card total">
          <div class="num"><?= $totalChecks ?></div>
          <div class="lbl"><?= htmlspecialchars($t['total_checks']) ?></div>
        </div>
        <div class="summary-card ok">
          <div class="num"><?= $okCount ?></div>
          <div class="lbl"><?= htmlspecialchars($t['passed']) ?></div>
        </div>
        <div class="summary-card warn">
          <div class="num"><?= $warnCount ?></div>
          <div class="lbl"><?= htmlspecialchars($t['warnings']) ?></div>
        </div>
        <div class="summary-card error">
          <div class="num"><?= $errorCount ?></div>
          <div class="lbl"><?= htmlspecialchars($t['errors']) ?></div>
        </div>
      </div>

      <?php
      $groups = [];
      foreach ($checks as $c) {
          $groups[$c['group']][] = $c;
      }

      $groupLabels = [
          'server'    => ['label' => $t['group_server'],    'icon' => '<path d="M22 12H2"></path><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line>'],
          'database'  => ['label' => $t['group_database'],  'icon' => '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>'],
          'tables'    => ['label' => $t['group_tables'],    'icon' => '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>'],
          'integrity' => ['label' => $t['group_integrity'], 'icon' => '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'],
          'push'      => ['label' => $t['group_push'],      'icon' => '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>'],
          'perf'      => ['label' => $t['group_perf'],      'icon' => '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>'],
          'sec_deep'  => ['label' => $t['group_sec_deep'],  'icon' => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'],
          'api'       => ['label' => $t['group_api'],       'icon' => '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>'],
          'security'  => ['label' => $t['group_security'],  'icon' => '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'],
          'app'       => ['label' => $t['group_app'],       'icon' => '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>'],
          'files'     => ['label' => $t['group_files'],     'icon' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>'],
      ];
      ?>

      <?php foreach ($groups as $groupKey => $items): ?>
        <?php $gInfo = $groupLabels[$groupKey] ?? ['label' => ucfirst($groupKey), 'icon' => '']; ?>
        <div class="check-group">
          <div class="check-group-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><?= $gInfo['icon'] ?></svg>
            <?= htmlspecialchars($gInfo['label']) ?>
            <span style="margin-left:auto; font-size:0.75rem; color: var(--muted); font-weight:600;">
              <?= count($items) ?>
            </span>
          </div>
          <?php foreach ($items as $item): ?>
            <div class="check-row" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; gap: 16px; border-bottom: 1px solid var(--line);">
              
              <!-- Left Column: Dot + Label + Sub-note -->
              <div style="display: flex; align-items: center; gap: 12px; min-width: 220px; flex: 1;">
                <span class="check-dot <?= $item['status'] ?>"></span>
                <div>
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--text);"><?= htmlspecialchars($item['label']) ?></div>
                  <?php if (!empty($item['note'])): ?>
                    <div style="font-size: 0.78rem; color: <?= $item['status'] === 'error' ? 'var(--danger)' : ($item['status'] === 'warn' ? '#d97706' : 'var(--muted)') ?>; font-weight: 500; margin-top: 2px;">
                      <?= htmlspecialchars($item['note']) ?>
                    </div>
                  <?php endif; ?>
                  <?php if (!empty($item['solution'])): ?>
                    <div style="font-size: 0.78rem; color: var(--primary); font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span>💡 <?= htmlspecialchars($item['solution']) ?></span>
                      <?php if (!empty($item['action_url'])): ?>
                        <a href="<?= htmlspecialchars($item['action_url']) ?>" style="background: var(--primary); color: #fff; text-decoration: none; padding: 2px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; display: inline-block;"><?= htmlspecialchars($item['action_label']) ?> &rarr;</a>
                      <?php elseif (!empty($item['action_post'])): ?>
                        <form method="POST" action="<?= htmlspecialchars($item['action_post']) ?>" style="display:inline;">
                          <button type="submit" style="background: var(--primary); color: #fff; border: none; padding: 2px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit;"><?= htmlspecialchars($item['action_label']) ?></button>
                        </form>
                      <?php endif; ?>
                    </div>
                  <?php endif; ?>
                </div>
              </div>

              <!-- Right Column: Value + Status Badge -->
              <div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0; text-align: right;">
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--primary); font-family: var(--font-mono);"><?= htmlspecialchars((string)$item['value']) ?></span>
                
                <?php if ($item['status'] === 'ok'): ?>
                  <span class="load-card-badge good" style="font-size:0.75rem; padding:4px 12px; border-radius:12px; font-weight:700; min-width: 90px; text-align: center;">✓ <?= $adminLang === 'ru' ? 'ОК' : ($adminLang === 'en' ? 'PASSED' : 'Անցել է') ?></span>
                <?php elseif ($item['status'] === 'warn'): ?>
                  <span class="load-card-badge warn" style="font-size:0.75rem; padding:4px 12px; border-radius:12px; font-weight:700; min-width: 90px; text-align: center;">⚠ <?= $adminLang === 'ru' ? 'Внимание' : ($adminLang === 'en' ? 'Warning' : 'Զգուշացում') ?></span>
                <?php else: ?>
                  <span class="load-card-badge danger" style="font-size:0.75rem; padding:4px 12px; border-radius:12px; font-weight:700; min-width: 90px; text-align: center;">✕ <?= $adminLang === 'ru' ? 'Ошибка' : ($adminLang === 'en' ? 'Error' : 'Սխալ') ?></span>
                <?php endif; ?>
              </div>

            </div>
          <?php endforeach; ?>
        </div>
      <?php endforeach; ?>

      <!-- Footer -->
      <div class="status-footer">
        <span><?= htmlspecialchars($t['last_checked']) ?> <?= $serverTime ?></span>
        <button class="refresh-btn" onclick="location.reload()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <?= htmlspecialchars($t['refresh']) ?>
        </button>
      </div>

    </div>
  </main>
</div>
</body>
</html>
