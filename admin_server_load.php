<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_server_load.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

// ── TRANSLATIONS DICTIONARY ──────────────────────────────────
$i18n = [
    'hy' => [
        'page_title' => 'Սերվերի ծանրաբեռնվածություն — Worship Platform Admin',
        'title' => 'Սերվերի Ծանրաբեռնվածության Մոնիտոր',
        'subtitle' => 'CPU, RAM, Սկավառակի և Տվյալների բազայի ցուցանիշներ իրական ժամանակում',
        'live' => 'ՈՒՂԻՂ ԵԹԵՐ',
        'refresh_lbl' => 'Թարմացում՝',
        'manual_only' => 'Ձեռքով',
        'refresh' => 'Թարմացնել',
        // Card 1
        'cpu_title' => 'CPU Ծանրաբեռնվածություն',
        'core_capacity' => 'Միջուկների օգտագործում',
        'cores' => 'Միջուկ',
        'load_1m' => 'Միջին ծանրաբեռնվածություն (1ր)՝',
        'load_5m' => 'Միջին ծանրաբեռնվածություն (5ր)՝',
        'load_15m' => 'Միջին ծանրաբեռնվածություն (15ր)՝',
        // Card 2
        'ram_title' => 'Օպերատիվ Հիշողություն (RAM)',
        'ram_usage' => 'RAM Օգտագործում',
        'free' => 'Ազատ',
        'php_used' => 'PHP Ընթացիկ Օգտագործում՝',
        'php_peak' => 'PHP Մաքսիմում Օգտագործում՝',
        'php_limit' => 'PHP Հիշողության Սահմանաչափ՝',
        // Card 3
        'disk_title' => 'Սկավառակի Հիշողություն',
        'disk_usage' => 'Սկավառակի Օգտագործում',
        'available_space' => 'Ազատ Տարածք՝',
        'total_capacity' => 'Ընդհանուր Ծավալ՝',
        'storage_status' => 'Վիճակ՝',
        'healthy' => 'Նորմալ',
        // Card 4
        'db_title' => 'Բազայի Ծանրաբեռնվածություն',
        'connected' => 'Միացված է',
        'error' => 'Սխալ',
        'active_conn' => 'Ակտիվ Միացումներ',
        'conn_pool' => 'Միացումների պուլ',
        'max' => 'Մաքսիմում՝',
        'active_queries' => 'Ակտիվ հարցումներ (Running)՝',
        'qps' => 'Միջին հարցումներ/վրկ (QPS)՝',
        'slow_queries' => 'Դանդաղ հարցումներ՝',
        'total_queries' => 'Ընդհանուր մշակված հարցումներ՝',
        // Card 5
        'server_opcache_title' => 'Սերվեր և OPcache',
        'op_active' => 'OPcache Ակտիվ է',
        'op_off' => 'OPcache Անջատված է',
        'op_hit_rate' => 'OPcache Hit Rate՝',
        'op_mem_used' => 'OPcache Օգտագործված RAM՝',
        'op_scripts' => 'Քեշավորված PHP Ֆայլեր՝',
        'sys_uptime' => 'Սերվերի Uptime՝',
        'php_ver' => 'PHP Տարբերակ՝',
        'os_plat' => 'Օպերացիոն Համակարգ՝',
        'online_users' => 'Օնլայն օգտատերեր՝',
        'audience_title' => 'Լսարանի Ակտիվություն',
        'active_now' => 'Այս պահին',
        'active_unique_now' => 'Եզակի ակտիվ',
        'active_app_now' => 'Հիմնական ծրագիր',
        'active_web_now' => 'Կայք',
        'active_admin_now' => 'Ադմին ծրագիր',
        'active_24h' => 'Այսօր',
        'active_7d' => 'Այս շաբաթ (7օր)',
        'active_30d' => 'Այս ամիս (30օր)',
        'new_today' => 'Նոր գրանցումներ (24ժ)',
        'total_users' => 'Ընդհանուր բազա',
        'platforms_title' => 'Հարթակներ (վերջին 24ժ)՝',
        'slow_log_title' => 'Դանդաղ Հարցումների Մատյան',
        'slow_log_active' => 'APP ՄԱՏՅԱՆԸ ՄԻԱՑՎԱԾ Է',
        'slow_log_unavailable' => 'APP ՄԱՏՅԱՆԸ ԳՐԵԼԻ ՉԷ',
        'slow_log_test' => 'Փորձարկել մատյանը',
        'slow_log_testing' => 'Փորձարկվում է...',
        'slow_log_test_failed' => 'Մատյանի փորձարկումը չհաջողվեց։',
        'live_users_title' => 'Ակտիվ օգտատերեր (այս պահին)',
        'live_users_empty' => 'Այս պահին ակտիվ օգտատերեր չկան։',
        'audience_error' => 'Լսարանի տվյալները չհաջողվեց բեռնել։ Ստուգեք users, user_sessions, web_activity աղյուսակները և DB թույլտվությունները։',
        'overall_load_title' => 'Ընդհանուր Սերվերի Ծանրաբեռնվածություն',
        'overall_status_good' => 'Թեթև / Նորմալ (Օպտիմալ)',
        'overall_status_warn' => 'Միջին ծանրաբեռնվածություն',
        'overall_status_danger' => 'Բարձր ծանրաբեռնվածություն',
        'overall_summary' => 'Ընդհանուր սերվերային ռեսուրսների օգտագործում (CPU, RAM, Disk, DB)',
        'top_factor_title' => 'Գլխավոր ծանրաբեռնող ռեսուրսը՝',
        'top_factor_none' => 'Բոլոր ռեսուրսները աշխատում են օպտիմալ',
    ],
    'ru' => [
        'page_title' => 'Нагрузка сервера — Worship Platform Admin',
        'title' => 'Монитор нагрузки сервера',
        'subtitle' => 'Метрики производительности CPU, RAM, диска и БД в реальном времени',
        'live' => 'ПРЯМОЙ ЭФИР',
        'refresh_lbl' => 'Обновление:',
        'manual_only' => 'Вручную',
        'refresh' => 'Обновить',
        // Card 1
        'cpu_title' => 'Нагрузка CPU',
        'core_capacity' => 'Использование ядер',
        'cores' => 'Ядер',
        'load_1m' => 'Средняя нагрузка (1м):',
        'load_5m' => 'Средняя нагрузка (5м):',
        'load_15m' => 'Средняя нагрузка (15м):',
        // Card 2
        'ram_title' => 'Оперативная память (RAM)',
        'ram_usage' => 'Использование RAM',
        'free' => 'Свободно',
        'php_used' => 'Текущее использование PHP:',
        'php_peak' => 'Пиковое использование PHP:',
        'php_limit' => 'Лимит памяти PHP:',
        // Card 3
        'disk_title' => 'Дисковое пространство',
        'disk_usage' => 'Использование диска',
        'available_space' => 'Доступно:',
        'total_capacity' => 'Общий объем:',
        'storage_status' => 'Состояние:',
        'healthy' => 'В норме',
        // Card 4
        'db_title' => 'Нагрузка базы данных',
        'connected' => 'Подключено',
        'error' => 'Ошибка',
        'active_conn' => 'Активные соединения',
        'conn_pool' => 'Пул соединений',
        'max' => 'Максимум:',
        'active_queries' => 'Активные запросы (Running):',
        'qps' => 'Среднее запросов/сек (QPS):',
        'slow_queries' => 'Медленные запросы:',
        'total_queries' => 'Всего обработано запросов:',
        // Card 5
        'server_opcache_title' => 'Сервер и OPcache',
        'op_active' => 'OPcache Активен',
        'op_off' => 'OPcache Отключен',
        'op_hit_rate' => 'Эффективность OPcache:',
        'op_mem_used' => 'Память OPcache:',
        'op_scripts' => 'Кэшировано PHP скриптов:',
        'sys_uptime' => 'Время работы сервера:',
        'php_ver' => 'Версия PHP:',
        'os_plat' => 'Операционная система:',
        'online_users' => 'Онлайн пользователи:',
        'audience_title' => 'Активность аудитории',
        'active_now' => 'Прямо сейчас',
        'active_unique_now' => 'Уникально активны',
        'active_app_now' => 'Основное приложение',
        'active_web_now' => 'Сайт',
        'active_admin_now' => 'Админ-приложение',
        'active_24h' => 'За сегодня',
        'active_7d' => 'За неделю (7д)',
        'active_30d' => 'За месяц (30д)',
        'new_today' => 'Новые за 24ч',
        'total_users' => 'Всего пользователей',
        'platforms_title' => 'Платформы (последние 24ч):',
        'slow_log_title' => 'Журнал медленных запросов',
        'slow_log_active' => 'APP-ЖУРНАЛ ВКЛЮЧЕН',
        'slow_log_unavailable' => 'APP-ЖУРНАЛ НЕДОСТУПЕН',
        'slow_log_test' => 'Проверить журнал',
        'slow_log_testing' => 'Проверка...',
        'slow_log_test_failed' => 'Не удалось проверить журнал.',
        'live_users_title' => 'Активные пользователи сейчас',
        'live_users_empty' => 'Сейчас нет активных пользователей.',
        'audience_error' => 'Не удалось загрузить данные аудитории. Проверьте таблицы users, user_sessions, web_activity и права БД.',
        'overall_load_title' => 'Общая Нагрузка Сервера',
        'overall_status_good' => 'Легкая / Норма (Оптимально)',
        'overall_status_warn' => 'Умеренная нагрузка',
        'overall_status_danger' => 'Высокая нагрузка',
        'overall_summary' => 'Суммарное использование ресурсов сервера (CPU, RAM, Диск, БД)',
        'top_factor_title' => 'Главный фактор нагрузки:',
        'top_factor_none' => 'Все ресурсы работают оптимально',
    ],
    'en' => [
        'page_title' => 'Server Load — Worship Platform Admin',
        'title' => 'Server Load Monitor',
        'subtitle' => 'Real-time system CPU, RAM, Disk & Database performance metrics',
        'live' => 'LIVE',
        'refresh_lbl' => 'Refresh:',
        'manual_only' => 'Manual Only',
        'refresh' => 'Refresh',
        // Card 1
        'cpu_title' => 'CPU Usage & Load',
        'core_capacity' => 'Core Capacity Usage',
        'cores' => 'Cores',
        'load_1m' => 'Load Average (1m):',
        'load_5m' => 'Load Average (5m):',
        'load_15m' => 'Load Average (15m):',
        // Card 2
        'ram_title' => 'RAM (System Memory)',
        'ram_usage' => 'RAM Usage',
        'free' => 'Free',
        'php_used' => 'PHP Current Usage:',
        'php_peak' => 'PHP Peak Usage:',
        'php_limit' => 'PHP Memory Limit:',
        // Card 3
        'disk_title' => 'Disk Storage',
        'disk_usage' => 'Disk Usage',
        'available_space' => 'Available Space:',
        'total_capacity' => 'Total Capacity:',
        'storage_status' => 'Status:',
        'healthy' => 'Healthy',
        // Card 4
        'db_title' => 'Database Load',
        'connected' => 'Connected',
        'error' => 'Error',
        'active_conn' => 'Active Connections',
        'conn_pool' => 'Connection Pool',
        'max' => 'Max:',
        'active_queries' => 'Active Queries (Threads Running):',
        'qps' => 'Avg Queries Per Sec (QPS):',
        'slow_queries' => 'Slow Queries:',
        'total_queries' => 'Total Questions Processed:',
        // Card 5
        'server_opcache_title' => 'Server & OPcache Info',
        'op_active' => 'OPcache Active',
        'op_off' => 'OPcache Off',
        'op_hit_rate' => 'OPcache Hit Rate:',
        'op_mem_used' => 'OPcache Memory Used:',
        'op_scripts' => 'Cached PHP Scripts:',
        'sys_uptime' => 'Server Uptime:',
        'php_ver' => 'PHP Version:',
        'os_plat' => 'OS Platform:',
        'online_users' => 'Online Users:',
        'audience_title' => 'Audience Activity',
        'active_now' => 'Right Now',
        'active_unique_now' => 'Unique active',
        'active_app_now' => 'Main app',
        'active_web_now' => 'Website',
        'active_admin_now' => 'Admin app',
        'active_24h' => 'Today (24h)',
        'active_7d' => 'This Week (7d)',
        'active_30d' => 'This Month (30d)',
        'new_today' => 'New Today (24h)',
        'total_users' => 'Total Database',
        'platforms_title' => 'Platforms (last 24h):',
        'slow_log_title' => 'Slow Queries Log',
        'slow_log_active' => 'APP LOGGING ACTIVE',
        'slow_log_unavailable' => 'APP LOG NOT WRITABLE',
        'slow_log_test' => 'Test log',
        'slow_log_testing' => 'Testing...',
        'slow_log_test_failed' => 'Log test failed.',
        'live_users_title' => 'Live Users Now',
        'live_users_empty' => 'No active users right now.',
        'audience_error' => 'Audience metrics could not be loaded. Check the users, user_sessions, web_activity tables and database permissions.',
        'overall_load_title' => 'Overall Server Load',
        'overall_status_good' => 'Light / Normal (Optimal)',
        'overall_status_warn' => 'Moderate Load',
        'overall_status_danger' => 'High / Critical Load',
        'overall_summary' => 'Combined server resource utilization (CPU, RAM, Disk, DB)',
    ],
    'en' => [
        'page_title' => 'Server Load — Worship Platform Admin',
        'title' => 'Server Load Monitor',
        'subtitle' => 'Real-time system CPU, RAM, Disk & Database performance metrics',
        'live' => 'LIVE',
        'refresh_lbl' => 'Refresh:',
        'manual_only' => 'Manual Only',
        'refresh' => 'Refresh',
        // Card 1
        'cpu_title' => 'CPU Usage & Load',
        'core_capacity' => 'Core Capacity Usage',
        'cores' => 'Cores',
        'load_1m' => 'Load Average (1m):',
        'load_5m' => 'Load Average (5m):',
        'load_15m' => 'Load Average (15m):',
        // Card 2
        'ram_title' => 'RAM (System Memory)',
        'ram_usage' => 'RAM Usage',
        'free' => 'Free',
        'php_used' => 'PHP Current Usage:',
        'php_peak' => 'PHP Peak Usage:',
        'php_limit' => 'PHP Memory Limit:',
        // Card 3
        'disk_title' => 'Disk Storage',
        'disk_usage' => 'Disk Usage',
        'available_space' => 'Available Space:',
        'total_capacity' => 'Total Capacity:',
        'storage_status' => 'Storage Status:',
        'healthy' => 'Healthy',
        // Card 4
        'db_title' => 'Database Load & Activity',
        'connected' => 'Connected',
        'error' => 'Error',
        'active_conn' => 'Active Connections',
        'conn_pool' => 'Connection Pool',
        'max' => 'Max:',
        'active_queries' => 'Active Queries (Threads Running):',
        'qps' => 'Avg Queries Per Sec (QPS):',
        'slow_queries' => 'Slow Queries:',
        'total_queries' => 'Total Questions Processed:',
        // Card 5
        'server_opcache_title' => 'Server & OPcache Info',
        'op_active' => 'OPcache Active',
        'op_off' => 'OPcache Off',
        'op_hit_rate' => 'OPcache Hit Rate:',
        'op_mem_used' => 'OPcache Memory Used:',
        'op_scripts' => 'Cached PHP Scripts:',
        'sys_uptime' => 'Server Uptime:',
        'php_ver' => 'PHP Version:',
        'os_plat' => 'OS Platform:',
        'online_users' => 'Online Users:',
        'audience_title' => 'Audience Activity',
        'active_now' => 'Right Now',
        'active_unique_now' => 'Unique active',
        'active_app_now' => 'Main app',
        'active_web_now' => 'Website',
        'active_admin_now' => 'Admin app',
        'active_24h' => 'Today (24h)',
        'active_7d' => 'This Week (7d)',
        'active_30d' => 'This Month (30d)',
        'new_today' => 'New Today (24h)',
        'total_users' => 'Total Database',
        'platforms_title' => 'Platforms (last 24h):',
        'slow_log_title' => 'Slow Queries Log',
        'slow_log_active' => 'APP LOGGING ACTIVE',
        'slow_log_unavailable' => 'APP LOG NOT WRITABLE',
        'slow_log_test' => 'Test log',
        'slow_log_testing' => 'Testing...',
        'slow_log_test_failed' => 'Log test failed.',
        'live_users_title' => 'Live Users Now',
        'live_users_empty' => 'No active users right now.',
        'audience_error' => 'Audience metrics could not be loaded. Check the users, user_sessions, web_activity tables and database permissions.',
    ]
];

$t = $i18n[$adminLang] ?? $i18n['hy'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && ($_GET['action'] ?? '') === 'slow_log_test') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    try {
        $pdo = wp_runtime_open_pdo();
        $testDuration = min(2.5, max(1.2, wp_runtime_slow_query_threshold() + 0.2));
        $logPath = wp_runtime_slow_query_log_path();
        clearstatcache(true, $logPath);
        $beforeSize = is_file($logPath) ? (int)(filesize($logPath) ?: 0) : 0;
        $stmt = $pdo->prepare('SELECT SLEEP(?) /* APP SLOW-LOG SELF-TEST */');
        $stmt->execute([$testDuration]);
        clearstatcache(true, $logPath);
        $afterSize = is_file($logPath) ? (int)(filesize($logPath) ?: 0) : 0;
        $logged = $afterSize > $beforeSize;
        if (!$logged) {
            throw new RuntimeException('Slow-log self-test did not append an entry.');
        }
        echo json_encode([
            'ok' => true,
            'duration' => $testDuration,
            'logged' => true,
        ], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'slow_log_test_failed']);
    }
    exit;
}

// ── DATA COLLECTOR FUNCTION ─────────────────────────────────
function get_server_metrics(): array {
    $now = microtime(true);
    
    // CPU Cores
    $cpuCores = 1;
    if (is_file('/proc/cpuinfo')) {
        $cpuinfo = file_get_contents('/proc/cpuinfo');
        preg_match_all('/^processor\s*:/m', $cpuinfo, $matches);
        if (!empty($matches[0])) {
            $cpuCores = count($matches[0]);
        }
    } elseif (stristr(PHP_OS, 'WIN')) {
        $cpuCores = (int)getenv('NUMBER_OF_PROCESSORS');
    } else {
        $nc = @shell_exec('nproc 2>/dev/null');
        if ($nc && is_numeric(trim($nc))) {
            $cpuCores = (int)trim($nc);
        }
    }
    if ($cpuCores < 1) $cpuCores = 1;

    // CPU Load
    $load = [0.0, 0.0, 0.0];
    if (function_exists('sys_getloadavg')) {
        $sysLoad = sys_getloadavg();
        if (is_array($sysLoad) && count($sysLoad) >= 3) {
            $load = [round($sysLoad[0], 2), round($sysLoad[1], 2), round($sysLoad[2], 2)];
        }
    }

    $cpuPct = min(100, round(($load[0] / $cpuCores) * 100, 1));

    // Memory (RAM)
    $memTotal = 0;
    $memFree = 0;
    $memUsed = 0;
    $memPct = 0;

    if (is_file('/proc/meminfo')) {
        $meminfoStr = @file_get_contents('/proc/meminfo');
        if ($meminfoStr) {
            preg_match('/MemTotal:\s+(\d+)\s+kB/i', $meminfoStr, $mt);
            preg_match('/MemFree:\s+(\d+)\s+kB/i', $meminfoStr, $mf);
            preg_match('/MemAvailable:\s+(\d+)\s+kB/i', $meminfoStr, $ma);
            
            $totalKb = (int)($mt[1] ?? 0);
            $freeKb = (int)($mf[1] ?? 0);
            $availKb = (int)($ma[1] ?? $freeKb);

            if ($totalKb > 0) {
                $memTotal = round($totalKb / 1024, 1);
                $memFree = round($availKb / 1024, 1);
                $memUsed = round(($totalKb - $availKb) / 1024, 1);
                $memPct = round(($memUsed / $memTotal) * 100, 1);
            }
        }
    }

    if ($memTotal === 0) {
        $limit = ini_get('memory_limit');
        $bytes = 128 * 1024 * 1024;
        if (preg_match('/^(\d+)(M|G|K)?$/i', trim($limit), $m)) {
            $val = (int)$m[1];
            $unit = strtoupper($m[2] ?? 'M');
            if ($unit === 'G') $bytes = $val * 1024 * 1024 * 1024;
            elseif ($unit === 'M') $bytes = $val * 1024 * 1024;
            elseif ($unit === 'K') $bytes = $val * 1024;
        }
        $memTotal = round($bytes / 1024 / 1024, 1);
        $memUsed = round(memory_get_usage(true) / 1024 / 1024, 1);
        $memFree = max(0, $memTotal - $memUsed);
        $memPct = round(($memUsed / $memTotal) * 100, 1);
    }

    // PHP Memory
    $phpMemUsed = round(memory_get_usage(true) / 1024 / 1024, 2);
    $phpMemPeak = round(memory_get_peak_usage(true) / 1024 / 1024, 2);
    $phpMemLimit = ini_get('memory_limit');

    // Disk Space
    $diskDir = __DIR__;
    $diskFreeB = @disk_free_space($diskDir) ?: 0;
    $diskTotalB = @disk_total_space($diskDir) ?: 1;
    $diskUsedB = max(0, $diskTotalB - $diskFreeB);

    $diskFreeGb = round($diskFreeB / 1024 / 1024 / 1024, 2);
    $diskTotalGb = round($diskTotalB / 1024 / 1024 / 1024, 2);
    $diskUsedGb = round($diskUsedB / 1024 / 1024 / 1024, 2);
    $diskPct = round(($diskUsedB / $diskTotalB) * 100, 1);

    // Database Metrics
    $dbConnected = false;
    $dbMetrics = [
        'queries' => 0,
        'threads_connected' => 0,
        'threads_running' => 0,
        'max_connections' => 0,
        'slow_queries' => 0,
        'mysql_global_slow_queries' => 0,
        'slow_query_log' => false,
        'long_query_time' => wp_runtime_slow_query_threshold(),
        'log_output' => 'UNKNOWN',
        'slow_query_log_file' => '',
        'data_directory' => '',
        'uptime_sec' => 0,
        'qps' => 0.0,
    ];

    try {
        $pdo = wp_runtime_open_pdo();
        $dbConnected = true;

        $stmt = $pdo->query("SHOW GLOBAL STATUS WHERE Variable_name IN ('Questions', 'Threads_connected', 'Threads_running', 'Slow_queries', 'Uptime')");
        $statusVars = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $statusVars[$row['Variable_name']] = $row['Value'];
        }

        $stmt2 = $pdo->query("SHOW GLOBAL VARIABLES WHERE Variable_name IN ('max_connections', 'slow_query_log', 'long_query_time', 'log_output', 'slow_query_log_file', 'datadir')");
        $dbVariables = [];
        while ($variableRow = $stmt2->fetch(PDO::FETCH_ASSOC)) {
            $dbVariables[(string)($variableRow['Variable_name'] ?? '')] = (string)($variableRow['Value'] ?? '');
        }
        $maxConn = (int)($dbVariables['max_connections'] ?? 151);

        $uptime = (int)($statusVars['Uptime'] ?? 0);
        $questions = (int)($statusVars['Questions'] ?? 0);

        $dbMetrics = [
            'queries' => $questions,
            'threads_connected' => (int)($statusVars['Threads_connected'] ?? 0),
            'threads_running' => (int)($statusVars['Threads_running'] ?? 0),
            'max_connections' => $maxConn,
            'slow_queries' => 0,
            'mysql_global_slow_queries' => (int)($statusVars['Slow_queries'] ?? 0),
            'slow_query_log' => strtoupper((string)($dbVariables['slow_query_log'] ?? 'OFF')) === 'ON',
            'long_query_time' => (float)($dbVariables['long_query_time'] ?? wp_runtime_slow_query_threshold()),
            'log_output' => strtoupper((string)($dbVariables['log_output'] ?? 'UNKNOWN')),
            'slow_query_log_file' => (string)($dbVariables['slow_query_log_file'] ?? ''),
            'data_directory' => (string)($dbVariables['datadir'] ?? ''),
            'uptime_sec' => $uptime,
            'qps' => $uptime > 0 ? round($questions / $uptime, 2) : 0,
        ];
    } catch (Throwable $e) {}

    // Audience Metrics
    $audience = [
        'online_5m' => 0,
        'online_app_5m' => 0,
        'online_web_5m' => 0,
        'online_admin_app_5m' => 0,
        'active_24h' => 0,
        'active_7d' => 0,
        'active_30d' => 0,
        'new_today' => 0,
        'total_users' => 0,
        'platforms' => [],
        'live_users' => [],
        'error' => false,
    ];
    try {
        if (!isset($pdo)) $pdo = wp_runtime_open_pdo();

        // Merge authenticated app sessions with website heartbeats. A signed-in
        // visitor uses the same user identity in both sources and is counted once.
        $activityCounts = $pdo->query("
            SELECT
                SUM(currently_active = 1) AS online_5m,
                SUM(last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS active_24h,
                SUM(last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS active_7d,
                SUM(last_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS active_30d
            FROM (
                SELECT
                    identity_key,
                    MAX(last_seen) AS last_seen,
                    MAX(last_seen >= DATE_SUB(NOW(), INTERVAL 15 SECOND) AND is_current = 1) AS currently_active
                FROM (
                    SELECT
                        CONCAT('user:', s.user_id) AS identity_key,
                        s.last_used_at AS last_seen,
                        CASE
                            WHEN s.last_used_at < DATE_SUB(NOW(), INTERVAL 15 SECOND) THEN 0
                            WHEN s.device_name LIKE '%origin:admin-app%' THEN 1
                            ELSE 0
                        END AS is_current
                    FROM user_sessions s
                    WHERE s.last_used_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    UNION ALL
                    SELECT
                        CASE
                            WHEN user_id IS NOT NULL AND user_id > 0 THEN CONCAT('user:', user_id)
                            ELSE CONCAT('device:', COALESCE(device_key, visitor_key))
                        END AS identity_key,
                        last_seen,
                        (is_active = 1 AND presence_version = 4) AS is_current
                    FROM web_activity
                    WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ) activity_rows
                GROUP BY identity_key
            ) unique_activity
        ")->fetch(PDO::FETCH_ASSOC) ?: [];
        $audience['online_5m'] = (int)($activityCounts['online_5m'] ?? 0);
        $audience['active_24h'] = (int)($activityCounts['active_24h'] ?? 0);
        $audience['active_7d'] = (int)($activityCounts['active_7d'] ?? 0);
        $audience['active_30d'] = (int)($activityCounts['active_30d'] ?? 0);

        $sourceCountsStmt = $pdo->query("
            SELECT activity_source, COUNT(*) AS active_count
            FROM (
                SELECT identity_key, activity_source
                FROM (
                    SELECT
                        CONCAT('user:', s.user_id) AS identity_key,
                        CASE
                            WHEN s.device_name LIKE '%origin:admin-app%' THEN 'admin-app'
                            WHEN s.device_name LIKE '%origin:app%' THEN 'app'
                            ELSE 'web'
                        END AS activity_source
                    FROM user_sessions s
                    WHERE s.last_used_at >= DATE_SUB(NOW(), INTERVAL 15 SECOND)
                      AND s.device_name LIKE '%origin:admin-app%'
                    UNION ALL
                    SELECT
                        CASE
                            WHEN user_id IS NOT NULL AND user_id > 0 THEN CONCAT('user:', user_id)
                            ELSE CONCAT('device:', COALESCE(device_key, visitor_key))
                        END AS identity_key,
                        CASE WHEN source = 'app' THEN 'app' ELSE 'web' END AS activity_source
                    FROM web_activity
                    WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 15 SECOND)
                      AND is_active = 1
                      AND presence_version = 4
                ) source_rows
                GROUP BY identity_key, activity_source
            ) unique_source_activity
            GROUP BY activity_source
        ");
        while ($sourceRow = $sourceCountsStmt->fetch(PDO::FETCH_ASSOC)) {
            $source = (string)($sourceRow['activity_source'] ?? '');
            $count = (int)($sourceRow['active_count'] ?? 0);
            if ($source === 'app') $audience['online_app_5m'] = $count;
            elseif ($source === 'admin-app') $audience['online_admin_app_5m'] = $count;
            elseif ($source === 'web') $audience['online_web_5m'] = $count;
        }
        $audience['new_today'] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")->fetchColumn();
        $audience['total_users'] = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

        // Group each user once per platform/origin in the selected activity window.
        $stPlat = $pdo->query("
            SELECT plat_name, COUNT(*) AS c
            FROM (
                SELECT identity_key, plat_name, MAX(last_seen) AS last_seen
                FROM (
                    SELECT
                        CONCAT('user:', s.user_id) AS identity_key,
                        CASE
                            WHEN s.device_name LIKE '%origin:admin-app%' THEN CONCAT(s.platform, ' (Admin App)')
                            WHEN s.device_name LIKE '%origin:app%' THEN CONCAT(s.platform, ' (App)')
                            ELSE CONCAT(s.platform, ' (Web)')
                        END AS plat_name,
                        s.last_used_at AS last_seen
                    FROM user_sessions s
                    WHERE s.last_used_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                      AND s.platform IS NOT NULL
                      AND s.platform != ''
                      AND (
                          s.device_name LIKE '%origin:admin-app%'
                          OR NOT EXISTS (
                              SELECT 1
                              FROM web_activity recent_heartbeat
                              WHERE recent_heartbeat.user_id = s.user_id
                                AND recent_heartbeat.last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                AND recent_heartbeat.presence_version = 4
                          )
                      )
                    UNION ALL
                    SELECT
                        CASE
                            WHEN user_id IS NOT NULL AND user_id > 0 THEN CONCAT('user:', user_id)
                            ELSE CONCAT('device:', COALESCE(device_key, visitor_key))
                        END AS identity_key,
                        CONCAT(
                            COALESCE(NULLIF(platform, ''), 'Unknown'),
                            CASE WHEN source = 'app' THEN ' (App)' ELSE ' (Web)' END
                        ) AS plat_name,
                        last_seen
                    FROM web_activity
                    WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ) platform_rows
                GROUP BY identity_key, plat_name
            ) unique_platform_activity
            GROUP BY plat_name
            ORDER BY c DESC
        ");
        while ($r = $stPlat->fetch(PDO::FETCH_ASSOC)) {
            $audience['platforms'][$r['plat_name']] = (int)$r['c'];
        }

        // Prefer explicit app/web heartbeats over the persisted session origin.
        // Safari and an installed PWA can share a login session, so the session's
        // original device_name is not a reliable current-surface signal.
        $stLive = $pdo->query("
            SELECT
                activity.user_id,
                u.name, 
                u.username,
                u.email,
                activity.plat_name
            FROM (
                SELECT
                    s.user_id,
                    CASE
                        WHEN s.device_name LIKE '%origin:admin-app%' THEN CONCAT(s.platform, ' (Admin App)')
                        WHEN s.device_name LIKE '%origin:app%' THEN CONCAT(s.platform, ' (App)')
                        ELSE CONCAT(s.platform, ' (Web)')
                    END AS plat_name,
                    s.last_used_at AS last_seen
                FROM user_sessions s
                WHERE s.last_used_at >= DATE_SUB(NOW(), INTERVAL 15 SECOND)
                  AND s.device_name LIKE '%origin:admin-app%'
                UNION ALL
                SELECT
                    heartbeat.user_id,
                    CONCAT(
                        COALESCE(NULLIF(heartbeat.platform, ''), 'Unknown'),
                        CASE WHEN heartbeat.source = 'app' THEN ' (App)' ELSE ' (Web)' END
                    ) AS plat_name,
                    heartbeat.last_seen
                FROM web_activity heartbeat
                WHERE heartbeat.user_id IS NOT NULL
                  AND heartbeat.user_id > 0
                  AND heartbeat.last_seen >= DATE_SUB(NOW(), INTERVAL 15 SECOND)
                  AND heartbeat.is_active = 1
                  AND heartbeat.presence_version = 4
            ) activity
            JOIN users u ON activity.user_id = u.id
            ORDER BY activity.last_seen DESC
            LIMIT 200
        ");
        $seenLiveUsers = [];
        while ($r = $stLive->fetch(PDO::FETCH_ASSOC)) {
            $userId = (int)($r['user_id'] ?? 0);
            if ($userId <= 0 || isset($seenLiveUsers[$userId])) {
                continue;
            }
            $seenLiveUsers[$userId] = true;
            $displayName = trim((string)($r['name'] ?? ''));
            if ($displayName === '') $displayName = trim((string)($r['username'] ?? ''));
            if ($displayName === '') $displayName = trim((string)($r['email'] ?? ''));
            $audience['live_users'][] = [
                'name' => $displayName !== '' ? $displayName : ('User #' . $userId),
                'platform' => (string)($r['plat_name'] ?? 'Unknown (Web)'),
            ];
            if (count($audience['live_users']) >= 50) break;
        }
    } catch (Throwable $e) {
        $audience['error'] = true;
    }

    // OPcache
    $opcacheStatus = [
        'enabled' => false,
        'memory_used_mb' => 0,
        'memory_free_mb' => 0,
        'hit_rate' => 0,
        'cached_scripts' => 0,
    ];
    if (function_exists('opcache_get_status')) {
        $st = @opcache_get_status(false);
        if ($st && !empty($st['opcache_enabled'])) {
            $mem = $st['memory_usage'] ?? [];
            $stats = $st['opcache_statistics'] ?? [];
            $opcacheStatus = [
                'enabled' => true,
                'memory_used_mb' => round(($mem['used_memory'] ?? 0) / 1024 / 1024, 1),
                'memory_free_mb' => round(($mem['free_memory'] ?? 0) / 1024 / 1024, 1),
                'hit_rate' => round($stats['opcache_hit_rate'] ?? 0, 1),
                'cached_scripts' => (int)($stats['num_cached_scripts'] ?? 0),
            ];
        }
    }

    // System Uptime
    $sysUptime = '—';
    if (is_file('/proc/uptime')) {
        $up = @file_get_contents('/proc/uptime');
        if ($up) {
            $sec = (int)explode(' ', trim($up))[0];
            $days = floor($sec / 86400);
            $hours = floor(($sec % 86400) / 3600);
            $mins = floor(($sec % 3600) / 60);
            $sysUptime = "{$days}d {$hours}h {$mins}m";
        }
    }

    // Build one diagnostic log from the MySQL slow log, Performance Schema and
    // the application-level PDO logger. Slow_queries itself is cumulative and
    // does not contain the SQL text, so relying on the local file alone leaves
    // mysqli/server-side slow queries invisible.
    $slowLogPath = wp_runtime_slow_query_log_path();
    $applicationSlowQueryCount = wp_runtime_read_slow_query_count();
    $dbMetrics['slow_queries'] = $applicationSlowQueryCount;
    $slowLogWritable = file_exists($slowLogPath)
        ? is_writable($slowLogPath)
        : (is_dir(dirname($slowLogPath)) && is_writable(dirname($slowLogPath)));
    $appSlowLogContent = '';
    if (file_exists($slowLogPath)) {
        $size = filesize($slowLogPath);
        if ($size > 0) {
            if ($size > 102400) {
                $f = fopen($slowLogPath, 'r');
                fseek($f, -102400, SEEK_END);
                $appSlowLogContent = "[Log truncated. Showing last 100KB...]\n" . fread($f, 102400);
                fclose($f);
            } else {
                $appSlowLogContent = (string)file_get_contents($slowLogPath);
            }
        }
    }

    $slowLogSections = [];
    $slowLogSections[] = implode("\n", [
        '=== MySQL slow-query diagnostics ===',
        'Application slow queries recorded: ' . $applicationSlowQueryCount,
        'MySQL Slow_queries (since server start): ' . (int)$dbMetrics['mysql_global_slow_queries'],
        'Scope: global MySQL server counter; it may include other databases on shared hosting.',
        'Displayed card count source: application logger; every counted item has a detailed entry below.',
        'slow_query_log: ' . (!empty($dbMetrics['slow_query_log']) ? 'ON' : 'OFF'),
        'long_query_time: ' . number_format((float)$dbMetrics['long_query_time'], 3, '.', '') . 's',
        'application log threshold: ' . number_format(wp_runtime_slow_query_threshold(), 3, '.', '') . 's',
        'log_output: ' . (string)$dbMetrics['log_output'],
    ]);

    $mysqlFileLogContent = '';
    $mysqlFileReadable = false;
    $mysqlSlowLogFile = trim((string)($dbMetrics['slow_query_log_file'] ?? ''));
    if ($mysqlSlowLogFile !== '' && $mysqlSlowLogFile[0] !== DIRECTORY_SEPARATOR) {
        $mysqlSlowLogFile = rtrim((string)($dbMetrics['data_directory'] ?? ''), '/\\') . DIRECTORY_SEPARATOR . $mysqlSlowLogFile;
    }
    if ($mysqlSlowLogFile !== '' && is_file($mysqlSlowLogFile) && is_readable($mysqlSlowLogFile)) {
        $mysqlFileReadable = true;
        $mysqlFileSize = (int)(filesize($mysqlSlowLogFile) ?: 0);
        if ($mysqlFileSize > 0) {
            $mysqlFileHandle = fopen($mysqlSlowLogFile, 'rb');
            if (is_resource($mysqlFileHandle)) {
                $mysqlReadSize = min($mysqlFileSize, 102400);
                if ($mysqlFileSize > $mysqlReadSize) {
                    fseek($mysqlFileHandle, -$mysqlReadSize, SEEK_END);
                }
                $mysqlFileLogContent = (string)fread($mysqlFileHandle, $mysqlReadSize);
                fclose($mysqlFileHandle);
            }
        }
    }
    if (trim($mysqlFileLogContent) !== '') {
        $slowLogSections[] = "=== MySQL slow log file (latest 100KB) ===\n" . trim($mysqlFileLogContent);
    }

    $mysqlSlowRows = [];
    $mysqlSlowTableReadable = false;
    if (isset($pdo) && $pdo instanceof PDO) {
        try {
            $mysqlSlowStmt = $pdo->query("
                SELECT
                    start_time,
                    query_time,
                    COALESCE(db, '') AS db_name,
                    CONVERT(sql_text USING utf8mb4) AS sql_text
                FROM mysql.slow_log
                WHERE db = DATABASE() OR db = ''
                ORDER BY start_time DESC
                LIMIT 50
            ");
            $mysqlSlowTableReadable = true;
            while ($row = $mysqlSlowStmt->fetch(PDO::FETCH_ASSOC)) {
                $sqlText = trim((string)($row['sql_text'] ?? ''));
                if ($sqlText === '') continue;
                $mysqlSlowRows[] = sprintf(
                    "[%s] Duration: %s | DB: %s\nQuery: %s",
                    (string)($row['start_time'] ?? 'Unknown time'),
                    (string)($row['query_time'] ?? 'Unknown'),
                    (string)($row['db_name'] ?? ''),
                    mb_substr($sqlText, 0, 4000)
                );
            }
        } catch (Throwable $e) {
            // mysql.slow_log commonly requires privileges not granted to app users.
        }
    }
    if ($mysqlSlowRows) {
        $slowLogSections[] = "=== MySQL slow_log (latest entries) ===\n" . implode("\n---------------------------\n", $mysqlSlowRows);
    }

    $digestRows = [];
    $performanceSchemaReadable = false;
    if (isset($pdo) && $pdo instanceof PDO) {
        try {
            $minimumTimer = number_format(max(0.001, (float)$dbMetrics['long_query_time']) * 1000000000000, 0, '.', '');
            $digestStmt = $pdo->query("
                SELECT
                    DIGEST_TEXT,
                    COUNT_STAR,
                    ROUND(AVG_TIMER_WAIT / 1000000000000, 3) AS avg_seconds,
                    ROUND(MAX_TIMER_WAIT / 1000000000000, 3) AS max_seconds,
                    SUM_ERRORS,
                    SUM_ROWS_EXAMINED,
                    FIRST_SEEN,
                    LAST_SEEN
                FROM performance_schema.events_statements_summary_by_digest
                WHERE SCHEMA_NAME = DATABASE()
                  AND DIGEST_TEXT IS NOT NULL
                  AND MAX_TIMER_WAIT >= {$minimumTimer}
                ORDER BY LAST_SEEN DESC
                LIMIT 50
            ");
            $performanceSchemaReadable = true;
            while ($row = $digestStmt->fetch(PDO::FETCH_ASSOC)) {
                $digestText = trim((string)($row['DIGEST_TEXT'] ?? ''));
                if ($digestText === '') continue;
                $digestRows[] = sprintf(
                    "[%s] Executions: %d | Avg: %.3fs | Max: %.3fs | Rows examined: %d | Errors: %d\nQuery pattern: %s",
                    (string)($row['LAST_SEEN'] ?? 'Unknown time'),
                    (int)($row['COUNT_STAR'] ?? 0),
                    (float)($row['avg_seconds'] ?? 0),
                    (float)($row['max_seconds'] ?? 0),
                    (int)($row['SUM_ROWS_EXAMINED'] ?? 0),
                    (int)($row['SUM_ERRORS'] ?? 0),
                    mb_substr($digestText, 0, 4000)
                );
            }
        } catch (Throwable $e) {
            // Performance Schema may be disabled or unavailable on shared hosting.
        }
    }
    if ($digestRows) {
        $slowLogSections[] = "=== Performance Schema slow query patterns ===\n" . implode("\n---------------------------\n", $digestRows);
    }

    $slowLogSections[] = implode("\n", [
        '=== Detailed source availability ===',
        'MySQL FILE log readable: ' . ($mysqlFileReadable ? 'YES' : 'NO'),
        'mysql.slow_log table readable: ' . ($mysqlSlowTableReadable ? 'YES' : 'NO'),
        'Performance Schema readable: ' . ($performanceSchemaReadable ? 'YES' : 'NO'),
        'Application PDO/mysqli log writable: ' . ($slowLogWritable ? 'YES' : 'NO'),
    ]);

    $trimmedAppLog = trim($appSlowLogContent);
    if ($trimmedAppLog !== '' && $trimmedAppLog !== '[Log Initialized]') {
        $slowLogSections[] = "=== Application PDO/mysqli slow-query log ===\n" . $trimmedAppLog;
    }

    if (trim($mysqlFileLogContent) === '' && !$mysqlSlowRows && !$digestRows && ($trimmedAppLog === '' || $trimmedAppLog === '[Log Initialized]')) {
        $reason = !empty($dbMetrics['slow_query_log'])
            ? 'Historical MySQL details are not readable with the current DB permissions or log_output setting. Future application PDO/mysqli queries over the application threshold will be recorded here.'
            : 'MySQL slow_query_log is OFF. The counter is cumulative, but MySQL is not retaining detailed slow-query records.';
        $slowLogSections[] = "=== No detailed records available ===\n" . $reason;
    }

    $slowLogContent = implode("\n\n", $slowLogSections);

    $dbConnPct = ($dbConnected && ($dbMetrics['max_connections'] ?? 0) > 0)
        ? min(100, round((($dbMetrics['threads_connected'] ?? 0) / $dbMetrics['max_connections']) * 100, 1))
        : 0;

    $overallPct = min(100, max(0, round(
        ($cpuPct * 0.40) +
        ($memPct * 0.40) +
        ($diskPct * 0.10) +
        ($dbConnPct * 0.10),
        1
    )));

    $threadsRunning = (int)($dbMetrics['threads_running'] ?? 0);
    $threadsConnected = (int)($dbMetrics['threads_connected'] ?? 0);
    $qpsVal = (float)($dbMetrics['qps'] ?? 0);
    $slowVal = (int)($dbMetrics['slow_queries'] ?? 0);
    $online5mVal = (int)($audience['online_5m'] ?? 0);
    $opMemVal = (float)($opcacheStatus['memory_used_mb'] ?? 0);

    // Dynamic reason generator for CPU
    if ($threadsRunning > 2 || $qpsVal > 15) {
        $cpuReasonHy = "Պատճառ՝ Տվյալների բազայի ակտիվ հարցումներ ({$threadsRunning} running) և բարձր QPS ({$qpsVal} q/s)";
        $cpuReasonRu = "Причина: Активные запросы к БД ({$threadsRunning} выполняются) и высокий QPS ({$qpsVal} запр/сек)";
        $cpuReasonEn = "Cause: Active DB queries ({$threadsRunning} running) and high QPS ({$qpsVal} qps)";
    } elseif ($online5mVal > 0) {
        $cpuReasonHy = "Պատճառ՝ Օնլայն օգտատերերի հարցումներ ({$online5mVal} ակտիվ) և PHP սկրիպտների մշակում";
        $cpuReasonRu = "Причина: Запросы онлайн пользователей ({$online5mVal} активных) и обработка PHP скриптов";
        $cpuReasonEn = "Cause: Online user requests ({$online55mVal} active) and PHP script execution";
    } else {
        $cpuReasonHy = "Պատճառ՝ Համակարգային background պրոցեսներ և PHP / OS ռեսուրսների ծանրաբեռնվածություն";
        $cpuReasonRu = "Причина: Системные фоновые процессы и нагрузка ресурсов PHP / ОС";
        $cpuReasonEn = "Cause: Background system processes and PHP / OS resource utilization";
    }

    // Dynamic reason generator for RAM
    if (!empty($opcacheStatus['enabled']) && $opMemVal > 0) {
        $ramReasonHy = "Պատճառ՝ PHP պրոցեսներ, OPcache քեշ ({$opMemVal} MB) և բազայի buffer սպառում";
        $ramReasonRu = "Причина: Процессы PHP, кэш OPcache ({$opMemVal} МБ) и буфер БД";
        $ramReasonEn = "Cause: PHP processes, OPcache memory ({$opMemVal} MB) and database buffer allocation";
    } else {
        $ramReasonHy = "Պատճառ՝ PHP հիշողության (RAM) սպառում active պրոցեսների և օպերացիոն համակարգի քեշի կողմից";
        $ramReasonRu = "Причина: Расход памяти RAM активными процессами PHP и кэшем ОС";
        $ramReasonEn = "Cause: System RAM consumption by active PHP processes and OS cache";
    }

    // Dynamic reason generator for DB
    if ($slowVal > 0) {
        $dbReasonHy = "Պատճառ՝ Բարձր ակտիվ միացումներ ({$threadsConnected}/{$dbMetrics['max_connections']}) և դանդաղ հարցումներ ({$slowVal} slow queries)";
        $dbReasonRu = "Причина: Высокие соединения БД ({$threadsConnected}/{$dbMetrics['max_connections']}) и медленные запросы ({$slowVal})";
        $dbReasonEn = "Cause: High active connection pool ({$threadsConnected}/{$dbMetrics['max_connections']}) and slow queries ({$slowVal})";
    } else {
        $dbReasonHy = "Պատճառ՝ Զուգահեռ բացված DB միացումներ ({$threadsConnected}/{$dbMetrics['max_connections']}) օգտատերերի/սկրիպտների կողմից";
        $dbReasonRu = "Причина: Параллельные соединения БД ({$threadsConnected}/{$dbMetrics['max_connections']}) со стороны пользователей/скриптов";
        $dbReasonEn = "Cause: Concurrent database connections ({$threadsConnected}/{$dbMetrics['max_connections']}) by users/scripts";
    }

    // Dynamic reason generator for Disk
    $diskReasonHy = "Պատճառ՝ Սկավառակի հիշողության սպառում ({$diskUsedGb} GB օգտագործված, մնացել է {$diskFreeGb} GB)";
    $diskReasonRu = "Причина: Использование дискового пространства ({$diskUsedGb} ГБ занято, осталось {$diskFreeGb} ГБ)";
    $diskReasonEn = "Cause: Disk storage utilization ({$diskUsedGb} GB used, {$diskFreeGb} GB available)";

    $factors = [
        'cpu' => [
            'key' => 'cpu',
            'name_hy' => 'CPU (Պրոցեսոր)',
            'name_ru' => 'CPU (Процессор)',
            'name_en' => 'CPU (Processor)',
            'pct' => $cpuPct,
            'detail' => "Load 1m: {$load[0]} ({$cpuCores} Cores)",
            'reason_hy' => $cpuReasonHy,
            'reason_ru' => $cpuReasonRu,
            'reason_en' => $cpuReasonEn,
        ],
        'ram' => [
            'key' => 'ram',
            'name_hy' => 'RAM (Հիշողություն)',
            'name_ru' => 'RAM (Память)',
            'name_en' => 'RAM (Memory)',
            'pct' => $memPct,
            'detail' => "{$memUsed} MB / {$memTotal} MB",
            'reason_hy' => $ramReasonHy,
            'reason_ru' => $ramReasonRu,
            'reason_en' => $ramReasonEn,
        ],
        'disk' => [
            'key' => 'disk',
            'name_hy' => 'Disk (Սկավառակ)',
            'name_ru' => 'Диск (Хранилище)',
            'name_en' => 'Disk (Storage)',
            'pct' => $diskPct,
            'detail' => "{$diskUsedGb} GB / {$diskTotalGb} GB",
            'reason_hy' => $diskReasonHy,
            'reason_ru' => $diskReasonRu,
            'reason_en' => $diskReasonEn,
        ],
        'db' => [
            'key' => 'db',
            'name_hy' => 'DB (Տվյալների Բազա)',
            'name_ru' => 'Соединения БД',
            'name_en' => 'DB Connections',
            'pct' => $dbConnPct,
            'detail' => "Active: " . ($dbMetrics['threads_connected'] ?? 0) . " / " . ($dbMetrics['max_connections'] ?? 151),
            'reason_hy' => $dbReasonHy,
            'reason_ru' => $dbReasonRu,
            'reason_en' => $dbReasonEn,
        ],
    ];
    uasort($factors, fn($a, $b) => $b['pct'] <=> $a['pct']);
    $topFactorKey = array_key_first($factors);
    $topFactor = $factors[$topFactorKey];

    return [
        'timestamp' => date('H:i:s'),
        'overall_load_pct' => $overallPct,
        'top_factor' => $topFactor,
        'cpu' => [
            'cores' => $cpuCores,
            'load_1m' => $load[0],
            'load_5m' => $load[1],
            'load_15m' => $load[2],
            'pct' => $cpuPct,
        ],
        'memory' => [
            'total_mb' => $memTotal,
            'used_mb' => $memUsed,
            'free_mb' => $memFree,
            'pct' => $memPct,
            'php_used_mb' => $phpMemUsed,
            'php_peak_mb' => $phpMemPeak,
            'php_limit' => $phpMemLimit,
        ],
        'disk' => [
            'total_gb' => $diskTotalGb,
            'used_gb' => $diskUsedGb,
            'free_gb' => $diskFreeGb,
            'pct' => $diskPct,
        ],
        'db' => [
            'connected' => $dbConnected,
            'metrics' => $dbMetrics,
        ],
        'opcache' => $opcacheStatus,
        'audience' => $audience,
        'server' => [
            'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'php_version' => PHP_VERSION,
            'os' => PHP_OS . ' (' . php_uname('r') . ')',
            'uptime' => $sysUptime,
        ],
        'slow_log' => $slowLogContent,
        'slow_log_writable' => $slowLogWritable,
    ];
}

// ── AJAX ENDPOINT MODE ──────────────────────────────────────
if (isset($_GET['ajax']) && $_GET['ajax'] === '1') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(get_server_metrics(), JSON_UNESCAPED_UNICODE);
    exit;
}

$metrics = get_server_metrics();
$activePage = 'server_load';
?>
<!doctype html>
<html lang="<?= htmlspecialchars($adminLang, ENT_QUOTES) ?>">
<head>
  <?php wp_admin_render_pwa_head($t['page_title']); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .load-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .load-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .load-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .load-card-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .load-card-title svg {
      color: var(--primary);
    }
    
    .live-pulse {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(5,205,153,0.7);
      animation: pulse 1.5s infinite;
    }

    /* Audience Dashboard Custom Styles */
    .audience-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .audience-now-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .audience-now-grid .audience-box {
      min-width: 0;
    }
    .audience-box {
      background: rgba(163,174,209,0.06);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: transform 0.2s;
    }
    .audience-box:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .audience-box::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10%;
      bottom: 10%;
      width: 4px;
      background: var(--primary);
      border-radius: 0 4px 4px 0;
    }
    .audience-box.success::before { background: var(--success); }
    .audience-box.warning::before { background: var(--warning); }
    .audience-box.danger::before { background: var(--danger); }
    
    .audience-box .val {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.1;
    }
    .audience-box .lbl {
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 700;
      margin-top: 6px;
      text-transform: uppercase;
    }
    
    .platforms-wrapper {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed var(--line);
    }
    
    .platform-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    
    .p-tag {
      background: var(--surface);
      border: 1px solid var(--line);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text);
      display: inline-flex;
      align-items: center;
    }
    .p-tag .p-count {
      background: rgba(163,174,209,0.15);
      color: var(--text);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
      margin-left: 8px;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 205, 153, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(5, 205, 153, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 205, 153, 0); }
    }

    .load-card-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
    }

    .load-card-badge.good { background: var(--success-bg); color: var(--success); }
    .load-card-badge.warn { background: var(--warning-bg); color: #d99b00; }
    .load-card-badge.danger { background: var(--danger-bg); color: var(--danger); }

    /* Gauge / Progress Bar */
    .gauge-wrapper {
      margin-bottom: 16px;
    }

    .gauge-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .gauge-val {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
      margin-bottom: 12px;
    }

    .progress-bar-bg {
      width: 100%;
      height: 12px;
      background: rgba(163,174,209,0.18);
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.5s ease, background-color 0.3s ease;
    }

    .progress-bar-fill.good { background: var(--success); }
    .progress-bar-fill.warn { background: var(--warning); }
    .progress-bar-fill.danger { background: var(--danger); }

    .load-stats-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
      border-top: 1px solid var(--line);
      padding-top: 16px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.88rem;
    }

    .stat-row .lbl {
      color: var(--muted);
      font-weight: 500;
    }

    .stat-row .val {
      font-weight: 700;
      color: var(--text);
    }

    .live-pulse {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--success);
      background: var(--success-bg);
      padding: 6px 14px;
      border-radius: 20px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      animation: pulseAnim 1.5s infinite;
    }

    @keyframes pulseAnim {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 205, 153, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(5, 205, 153, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 205, 153, 0); }
    }

    .auto-refresh-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-refresh {
      background: var(--surface);
      border: 1px solid var(--line);
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }

    .btn-refresh:hover {
      background: rgba(67,24,255,0.04);
    }

    .select-interval {
      background: var(--surface);
      border: 1px solid var(--line);
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
      outline: none;
      cursor: pointer;
    }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">

  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div style="padding: 28px 40px 60px; max-width: 1200px;">

      <!-- Header Row -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--text); margin-bottom: 4px;"><?= htmlspecialchars($t['title']) ?></h1>
          <p style="color: var(--muted); font-size: 0.9rem; font-weight: 500;"><?= htmlspecialchars($t['subtitle']) ?></p>
        </div>

        <div class="auto-refresh-controls">
          <div class="live-pulse">
            <span class="pulse-dot"></span>
            <?= htmlspecialchars($t['live']) ?> (<span id="lastUpdated"><?= $metrics['timestamp'] ?></span>)
            <span style="margin-left: 10px; padding-left: 10px; border-left: 1px solid rgba(5, 205, 153, 0.4);">
              <?= htmlspecialchars($t['online_users']) ?> <span id="onlineUsers"><?= $metrics['audience']['online_5m'] ?></span>
            </span>
          </div>
          <select id="intervalSelect" class="select-interval">
            <option value="3000"><?= htmlspecialchars($t['refresh_lbl']) ?> 3s</option>
            <option value="5000" selected><?= htmlspecialchars($t['refresh_lbl']) ?> 5s</option>
            <option value="10000"><?= htmlspecialchars($t['refresh_lbl']) ?> 10s</option>
            <option value="0"><?= htmlspecialchars($t['manual_only']) ?></option>
          </select>
          <button class="btn-refresh" id="manualRefreshBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            <?= htmlspecialchars($t['refresh']) ?>
          </button>
        </div>
      </div>

      <!-- Overall Server Load Card -->
      <div class="load-card" style="margin-bottom: 24px; background: linear-gradient(135deg, var(--surface) 0%, rgba(67, 24, 255, 0.03) 100%); border: 1px solid var(--line);">
        <div class="load-card-header" style="margin-bottom: 12px;">
          <div class="load-card-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <?= htmlspecialchars($t['overall_load_title']) ?>
          </div>
          <?php 
            $overall = $metrics['overall_load_pct'];
            $overallClass = $overall > 80 ? 'danger' : ($overall > 50 ? 'warn' : 'good');
            $overallStatusText = $overall > 80 ? $t['overall_status_danger'] : ($overall > 50 ? $t['overall_status_warn'] : $t['overall_status_good']);
          ?>
          <span id="overallBadge" class="load-card-badge <?= $overallClass ?>" style="font-size: 0.85rem; padding: 6px 14px;">
            <span id="overallStatusText"><?= htmlspecialchars($overallStatusText) ?></span>
          </span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 240px;">
            <div class="gauge-val" style="font-size: 2.4rem; margin-bottom: 8px;"><span id="overallPctText"><?= $overall ?></span>%</div>
            <div class="progress-bar-bg" style="height: 16px; border-radius: 8px;">
              <div id="overallBar" class="progress-bar-fill <?= $overallClass ?>" style="width: <?= $overall ?>%; border-radius: 8px;"></div>
            </div>
            <p style="color: var(--muted); font-size: 0.8rem; margin-top: 8px; font-weight: 500;"><?= htmlspecialchars($t['overall_summary']) ?></p>
          </div>

          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="background: rgba(163,174,209,0.08); border: 1px solid var(--line); padding: 10px 14px; border-radius: 10px; text-align: center; min-width: 85px;">
              <div style="font-size: 0.7rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">CPU</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--text); margin-top: 2px;"><span id="overallCpuMini"><?= $metrics['cpu']['pct'] ?></span>%</div>
            </div>
            <div style="background: rgba(163,174,209,0.08); border: 1px solid var(--line); padding: 10px 14px; border-radius: 10px; text-align: center; min-width: 85px;">
              <div style="font-size: 0.7rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">RAM</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--text); margin-top: 2px;"><span id="overallRamMini"><?= $metrics['memory']['pct'] ?></span>%</div>
            </div>
            <div style="background: rgba(163,174,209,0.08); border: 1px solid var(--line); padding: 10px 14px; border-radius: 10px; text-align: center; min-width: 85px;">
              <div style="font-size: 0.7rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">Disk</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--text); margin-top: 2px;"><span id="overallDiskMini"><?= $metrics['disk']['pct'] ?></span>%</div>
            </div>
            <div style="background: rgba(163,174,209,0.08); border: 1px solid var(--line); padding: 10px 14px; border-radius: 10px; text-align: center; min-width: 85px;">
              <div style="font-size: 0.7rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">DB Conn</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--text); margin-top: 2px;"><span id="overallDbMini"><?= ($metrics['db']['metrics']['max_connections'] ?? 0) > 0 ? round(($metrics['db']['metrics']['threads_connected'] / $metrics['db']['metrics']['max_connections']) * 100) : 0 ?></span>%</div>
            </div>
          </div>
        </div>

        <!-- Primary Bottleneck / Top Load Factor Row -->
        <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: var(--muted);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <span><?= htmlspecialchars($t['top_factor_title']) ?></span>
              <?php $tf = $metrics['top_factor']; ?>
              <strong id="topFactorName" style="color: var(--text); font-weight: 800; font-size: 0.9rem;"><?= htmlspecialchars($tf['name_' . $adminLang] ?? $tf['name_hy']) ?></strong>
              <span id="topFactorPct" class="load-card-badge <?= $tf['pct'] > 80 ? 'danger' : ($tf['pct'] > 50 ? 'warn' : 'good') ?>" style="font-size: 0.78rem; font-weight: 800; padding: 2px 10px; border-radius: 12px;"><?= $tf['pct'] ?>%</span>
            </div>
            <div id="topFactorDetail" style="font-size: 0.82rem; color: var(--muted); font-weight: 600; font-family: var(--font-mono);"><?= htmlspecialchars($tf['detail']) ?></div>
          </div>
          <div id="topFactorReason" style="font-size: 0.82rem; color: var(--warning); font-weight: 700; background: rgba(245,158,11,0.06); padding: 8px 12px; border-radius: 8px; border: 1px dashed rgba(245,158,11,0.3);">
            <?= htmlspecialchars($tf['reason_' . $adminLang] ?? $tf['reason_hy']) ?>
          </div>
        </div>
      </div>

      <!-- Main Metric Cards Grid -->
      <div class="load-grid">

        <!-- 1. CPU LOAD CARD -->
        <div class="load-card">
          <div class="load-card-header">
            <div class="load-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>
              <?= htmlspecialchars($t['cpu_title']) ?>
            </div>
            <span id="cpuBadge" class="load-card-badge <?= $metrics['cpu']['pct'] > 80 ? 'danger' : ($metrics['cpu']['pct'] > 50 ? 'warn' : 'good') ?>">
              <?= $metrics['cpu']['pct'] ?>%
            </span>
          </div>

          <div class="gauge-val"><span id="cpuPctText"><?= $metrics['cpu']['pct'] ?></span>%</div>

          <div class="gauge-wrapper">
            <div class="gauge-label">
              <span><?= htmlspecialchars($t['core_capacity']) ?></span>
              <span><?= $metrics['cpu']['cores'] ?> <?= htmlspecialchars($t['cores']) ?></span>
            </div>
            <div class="progress-bar-bg">
              <div id="cpuBar" class="progress-bar-fill <?= $metrics['cpu']['pct'] > 80 ? 'danger' : ($metrics['cpu']['pct'] > 50 ? 'warn' : 'good') ?>" style="width: <?= $metrics['cpu']['pct'] ?>%;"></div>
            </div>
          </div>

          <div class="load-stats-list">
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['load_1m']) ?></span>
              <span class="val" id="cpuLoad1"><?= $metrics['cpu']['load_1m'] ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['load_5m']) ?></span>
              <span class="val" id="cpuLoad5"><?= $metrics['cpu']['load_5m'] ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['load_15m']) ?></span>
              <span class="val" id="cpuLoad15"><?= $metrics['cpu']['load_15m'] ?></span>
            </div>
          </div>
        </div>

        <!-- 2. MEMORY (RAM) CARD -->
        <div class="load-card">
          <div class="load-card-header">
            <div class="load-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M6 5v3M10 5v3M14 5v3M18 5v3M2 8h20v8H2z"></path></svg>
              <?= htmlspecialchars($t['ram_title']) ?>
            </div>
            <span id="memBadge" class="load-card-badge <?= $metrics['memory']['pct'] > 85 ? 'danger' : ($metrics['memory']['pct'] > 65 ? 'warn' : 'good') ?>">
              <?= $metrics['memory']['pct'] ?>%
            </span>
          </div>

          <div class="gauge-val"><span id="memUsedMbText"><?= $metrics['memory']['used_mb'] ?></span> MB <span style="font-size:0.9rem; color:var(--muted); font-weight:500;">/ <?= $metrics['memory']['total_mb'] ?> MB</span></div>

          <div class="gauge-wrapper">
            <div class="gauge-label">
              <span><?= htmlspecialchars($t['ram_usage']) ?></span>
              <span id="memFreeMbText"><?= $metrics['memory']['free_mb'] ?> MB <?= htmlspecialchars($t['free']) ?></span>
            </div>
            <div class="progress-bar-bg">
              <div id="memBar" class="progress-bar-fill <?= $metrics['memory']['pct'] > 85 ? 'danger' : ($metrics['memory']['pct'] > 65 ? 'warn' : 'good') ?>" style="width: <?= $metrics['memory']['pct'] ?>%;"></div>
            </div>
          </div>

          <div class="load-stats-list">
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['php_used']) ?></span>
              <span class="val" id="phpMemUsed"><?= $metrics['memory']['php_used_mb'] ?> MB</span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['php_peak']) ?></span>
              <span class="val" id="phpMemPeak"><?= $metrics['memory']['php_peak_mb'] ?> MB</span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['php_limit']) ?></span>
              <span class="val"><?= $metrics['memory']['php_limit'] ?></span>
            </div>
          </div>
        </div>

        <!-- 3. DISK STORAGE CARD -->
        <div class="load-card">
          <div class="load-card-header">
            <div class="load-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>
              <?= htmlspecialchars($t['disk_title']) ?>
            </div>
            <span id="diskBadge" class="load-card-badge <?= $metrics['disk']['pct'] > 90 ? 'danger' : ($metrics['disk']['pct'] > 75 ? 'warn' : 'good') ?>">
              <?= $metrics['disk']['pct'] ?>%
            </span>
          </div>

          <div class="gauge-val"><span id="diskUsedGbText"><?= $metrics['disk']['used_gb'] ?></span> GB <span style="font-size:0.9rem; color:var(--muted); font-weight:500;">/ <?= $metrics['disk']['total_gb'] ?> GB</span></div>

          <div class="gauge-wrapper">
            <div class="gauge-label">
              <span><?= htmlspecialchars($t['disk_usage']) ?></span>
              <span id="diskFreeGbText"><?= $metrics['disk']['free_gb'] ?> GB <?= htmlspecialchars($t['free']) ?></span>
            </div>
            <div class="progress-bar-bg">
              <div id="diskBar" class="progress-bar-fill <?= $metrics['disk']['pct'] > 90 ? 'danger' : ($metrics['disk']['pct'] > 75 ? 'warn' : 'good') ?>" style="width: <?= $metrics['disk']['pct'] ?>%;"></div>
            </div>
          </div>

          <div class="load-stats-list">
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['available_space']) ?></span>
              <span class="val" id="diskFreeVal"><?= $metrics['disk']['free_gb'] ?> GB</span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['total_capacity']) ?></span>
              <span class="val"><?= $metrics['disk']['total_gb'] ?> GB</span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['storage_status']) ?></span>
              <span class="val" style="color:var(--success);"><?= htmlspecialchars($t['healthy']) ?></span>
            </div>
          </div>
        </div>

      </div> <!-- /load-grid -->

      <!-- Second Row Grid: Database & OPcache / System -->
      <div class="load-grid">

        <!-- 4. DATABASE LOAD CARD -->
        <div class="load-card">
          <div class="load-card-header">
            <div class="load-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              <?= htmlspecialchars($t['db_title']) ?>
            </div>
            <span id="dbBadge" class="load-card-badge <?= $metrics['db']['connected'] ? 'good' : 'danger' ?>">
              <?= $metrics['db']['connected'] ? htmlspecialchars($t['connected']) : htmlspecialchars($t['error']) ?>
            </span>
          </div>

          <?php 
            $dbConnPct = 0;
            if ($metrics['db']['metrics']['max_connections'] > 0) {
                $dbConnPct = round(($metrics['db']['metrics']['threads_connected'] / $metrics['db']['metrics']['max_connections']) * 100, 1);
            }
          ?>

          <div class="gauge-val"><span id="dbThreadsConn"><?= $metrics['db']['metrics']['threads_connected'] ?></span> <span style="font-size:0.9rem; color:var(--muted); font-weight:500;"><?= htmlspecialchars($t['active_conn']) ?> (<?= $dbConnPct ?>%)</span></div>

          <div class="gauge-wrapper">
            <div class="gauge-label">
              <span><?= htmlspecialchars($t['conn_pool']) ?></span>
              <span><?= htmlspecialchars($t['max']) ?> <span id="dbMaxConn"><?= $metrics['db']['metrics']['max_connections'] ?></span></span>
            </div>
            <div class="progress-bar-bg">
              <div id="dbConnBar" class="progress-bar-fill <?= $dbConnPct > 80 ? 'danger' : 'good' ?>" style="width: <?= max(2, $dbConnPct) ?>%;"></div>
            </div>
          </div>

          <div class="load-stats-list">
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['active_queries']) ?></span>
              <span class="val" id="dbThreadsRun"><?= $metrics['db']['metrics']['threads_running'] ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['qps']) ?></span>
              <span class="val" id="dbQps"><?= $metrics['db']['metrics']['qps'] ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['slow_queries']) ?></span>
              <span class="val" id="dbSlowQueries" style="<?= $metrics['db']['metrics']['slow_queries'] > 0 ? 'color:var(--danger);' : '' ?>"><?= $metrics['db']['metrics']['slow_queries'] ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['total_queries']) ?></span>
              <span class="val" id="dbTotalQueries"><?= number_format($metrics['db']['metrics']['queries']) ?></span>
            </div>
          </div>
        </div>

        <!-- 5. OPCACHE & SYSTEM INFO CARD -->
        <div class="load-card">
          <div class="load-card-header">
            <div class="load-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <?= htmlspecialchars($t['server_opcache_title']) ?>
            </div>
            <span id="opcacheBadge" class="load-card-badge <?= $metrics['opcache']['enabled'] ? 'good' : 'warn' ?>">
              <?= $metrics['opcache']['enabled'] ? htmlspecialchars($t['op_active']) : htmlspecialchars($t['op_off']) ?>
            </span>
          </div>

          <div class="load-stats-list" style="border-top: none; padding-top: 0; margin-top: 0;">
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['op_hit_rate']) ?></span>
              <span class="val" id="opHitRate" style="color:var(--primary); font-size:1.1rem;"><?= $metrics['opcache']['enabled'] ? $metrics['opcache']['hit_rate'] . '%' : 'N/A' ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['op_mem_used']) ?></span>
              <span class="val" id="opMemUsed"><?= $metrics['opcache']['enabled'] ? $metrics['opcache']['memory_used_mb'] . ' MB' : 'N/A' ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['op_scripts']) ?></span>
              <span class="val" id="opScripts"><?= $metrics['opcache']['enabled'] ? number_format($metrics['opcache']['cached_scripts']) : 'N/A' ?></span>
            </div>
            <div class="stat-row" style="margin-top: 8px; border-top: 1px solid var(--line); padding-top: 10px;">
              <span class="lbl"><?= htmlspecialchars($t['sys_uptime']) ?></span>
              <span class="val" id="sysUptime"><?= htmlspecialchars($metrics['server']['uptime']) ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['php_ver']) ?></span>
              <span class="val"><?= htmlspecialchars($metrics['server']['php_version']) ?></span>
            </div>
            <div class="stat-row">
              <span class="lbl"><?= htmlspecialchars($t['os_plat']) ?></span>
              <span class="val" style="font-size:0.8rem;"><?= htmlspecialchars($metrics['server']['os']) ?></span>
            </div>
          </div>
        </div>

      </div> <!-- /load-grid -->

    <div class="load-grid">
        <!-- 6. AUDIENCE ACTIVITY CARD -->
        <div class="load-card" style="grid-column: 1 / -1;">
          <div class="load-card-header">
            <div class="load-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <?= htmlspecialchars($t['audience_title']) ?>
            </div>
            <div class="live-pulse" style="background:transparent; padding:0;">
              <span class="pulse-dot"></span> <span style="color:var(--text);" id="audOnline5m"><?= $metrics['audience']['online_5m'] ?></span> <?= htmlspecialchars($t['active_unique_now']) ?>
            </div>
          </div>

          <div id="audMetricsError" style="margin:0 0 15px; padding:10px 12px; border-radius:8px; font-size:12px; line-height:1.4; color:#991b1b; background:#fef2f2; border:1px solid #fecaca;"<?= empty($metrics['audience']['error']) ? ' hidden' : '' ?>>
            <?= htmlspecialchars($t['audience_error']) ?>
          </div>

          <div class="audience-now-grid">
            <div class="audience-box success">
              <div class="val" id="audOnlineApp5m"><?= $metrics['audience']['online_app_5m'] ?></div>
              <div class="lbl"><?= htmlspecialchars($t['active_app_now']) ?> · 5 <?= $adminLang === 'hy' ? 'րոպե' : ($adminLang === 'ru' ? 'мин' : 'min') ?></div>
            </div>
            <div class="audience-box">
              <div class="val" id="audOnlineWeb5m"><?= $metrics['audience']['online_web_5m'] ?></div>
              <div class="lbl"><?= htmlspecialchars($t['active_web_now']) ?> · 5 <?= $adminLang === 'hy' ? 'րոպե' : ($adminLang === 'ru' ? 'мин' : 'min') ?></div>
            </div>
            <div class="audience-box warning">
              <div class="val" id="audOnlineAdminApp5m"><?= $metrics['audience']['online_admin_app_5m'] ?></div>
              <div class="lbl"><?= htmlspecialchars($t['active_admin_now']) ?> · 5 <?= $adminLang === 'hy' ? 'րոպե' : ($adminLang === 'ru' ? 'мин' : 'min') ?></div>
            </div>
          </div>

          <div class="audience-grid">
            <div class="audience-box success">
              <div class="val" id="audActive24h"><?= $metrics['audience']['active_24h'] ?></div>
              <div class="lbl"><?= htmlspecialchars($t['active_24h']) ?></div>
            </div>
            <div class="audience-box">
              <div class="val" id="audActive7d"><?= $metrics['audience']['active_7d'] ?></div>
              <div class="lbl"><?= htmlspecialchars($t['active_7d']) ?></div>
            </div>
            <div class="audience-box">
              <div class="val" id="audActive30d"><?= $metrics['audience']['active_30d'] ?></div>
              <div class="lbl"><?= htmlspecialchars($t['active_30d']) ?></div>
            </div>
            <div class="audience-box warning">
              <div class="val" id="audTotalUsers"><?= number_format($metrics['audience']['total_users']) ?></div>
              <div class="lbl"><?= htmlspecialchars($t['total_users']) ?></div>
            </div>
          </div>
          
          <div style="margin-top: 15px; display:flex; align-items:center; gap: 15px;">
             <div style="flex: 1; background: rgba(5,205,153,0.05); border: 1px dashed var(--success); padding: 12px; border-radius: 10px; text-align:center;">
                <div style="font-size: 1.6rem; font-weight:900; color:var(--success);" id="audNewToday"><?= $metrics['audience']['new_today'] ?></div>
                <div style="font-size: 0.75rem; font-weight:700; color:var(--success); text-transform:uppercase; margin-top:4px;"><?= htmlspecialchars($t['new_today']) ?></div>
             </div>
          </div>

          <div class="platforms-wrapper">
            <div class="stat-row">
              <span class="lbl" style="font-weight:700; font-size:0.8rem; text-transform:uppercase;"><?= htmlspecialchars($t['platforms_title']) ?></span>
            </div>
            <div id="audPlatforms">
              <?php if (empty($metrics['audience']['platforms'])): ?>
                <div style="font-size:0.8rem; color:var(--muted);">—</div>
              <?php else: 
                $total = array_sum($metrics['audience']['platforms']);
                $colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
                $colorIdx = 0;
              ?>
                <div style="display:flex; width:100%; height:8px; border-radius:4px; overflow:hidden; margin-bottom:12px; background:rgba(163,174,209,0.2);">
                  <?php foreach ($metrics['audience']['platforms'] as $plat => $count): 
                    $color = $colors[$colorIdx % count($colors)];
                    $pct = $total > 0 ? number_format(($count / $total) * 100, 1) : 0;
                  ?>
                    <div style="width:<?= $pct ?>%; background:<?= $color ?>;" title="<?= htmlspecialchars($plat) ?>: <?= $count ?> (<?= $pct ?>%)"></div>
                  <?php $colorIdx++; endforeach; ?>
                </div>
                
                <div style="display:flex; flex-wrap:wrap; gap:12px;">
                  <?php $colorIdx = 0; foreach ($metrics['audience']['platforms'] as $plat => $count): 
                    $color = $colors[$colorIdx % count($colors)];
                  ?>
                    <div style="font-size:0.8rem; color:var(--text); font-weight:600;">
                      <span style="color:<?= $color ?>; font-size:1rem; line-height:1; vertical-align:middle; margin-right:4px;">&bull;</span>
                      <?= htmlspecialchars($plat) ?> <span style="color:var(--muted); font-size:0.75rem;">(<?= $count ?>)</span>
                    </div>
                  <?php $colorIdx++; endforeach; ?>
                </div>
              <?php endif; ?>
            </div>
          </div>

          <div class="platforms-wrapper" style="margin-top: 15px; border-top: 1px solid var(--line); padding-top: 15px;">
            <div class="stat-row">
              <span class="lbl" style="font-weight:700; font-size:0.8rem; text-transform:uppercase;"><?= htmlspecialchars($t['live_users_title']) ?></span>
            </div>
            
            <div id="audLiveUsers" style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
              <?php if (empty($metrics['audience']['live_users'])): ?>
                <div style="font-size:0.8rem; color:var(--muted);"><?= htmlspecialchars($t['live_users_empty']) ?></div>
              <?php else: ?>
                <?php foreach ($metrics['audience']['live_users'] as $lu): ?>
                  <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; border:1px solid var(--line);">
                    <span style="font-size:0.85rem; font-weight:600; color:var(--text);"><?= htmlspecialchars($lu['name']) ?></span>
                    <span style="font-size:0.75rem; color:var(--muted);"><?= htmlspecialchars($lu['platform']) ?></span>
                  </div>
                <?php endforeach; ?>
              <?php endif; ?>
            </div>
          </div>
        </div>
      </div> <!-- /load-grid -->

      <!-- 7. SLOW QUERY LOG -->
      <div class="load-card" style="margin-top:20px;">
        <div class="load-card-header">
          <div class="load-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <?= htmlspecialchars($t['slow_log_title'] ?? 'Slow Queries Log') ?>
          </div>
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
            <span
              id="slowLogStatus"
              class="load-card-badge <?= $metrics['slow_log_writable'] ? 'good' : 'warn' ?>"
              data-active-label="<?= htmlspecialchars($t['slow_log_active'], ENT_QUOTES) ?>"
              data-error-label="<?= htmlspecialchars($t['slow_log_unavailable'], ENT_QUOTES) ?>"
            ><?= htmlspecialchars($metrics['slow_log_writable'] ? $t['slow_log_active'] : $t['slow_log_unavailable']) ?></span>
            <button
              type="button"
              id="slowLogTestBtn"
              data-label="<?= htmlspecialchars($t['slow_log_test'], ENT_QUOTES) ?>"
              data-testing-label="<?= htmlspecialchars($t['slow_log_testing'], ENT_QUOTES) ?>"
              data-error-label="<?= htmlspecialchars($t['slow_log_test_failed'], ENT_QUOTES) ?>"
              style="border:1px solid var(--line); background:var(--surface); color:var(--text); border-radius:8px; padding:7px 10px; font-size:0.75rem; font-weight:700; cursor:pointer;"
            ><?= htmlspecialchars($t['slow_log_test']) ?></button>
          </div>
        </div>
        <div style="margin-top:15px;">
          <textarea id="slowQueriesLogBox" readonly style="width: 100%; height: 300px; background: rgba(0,0,0,0.2); color: var(--success); font-family: monospace; font-size: 12px; padding: 15px; border: 1px solid var(--line); border-radius: 8px; resize: vertical; box-sizing: border-box; white-space: pre-wrap;"><?= htmlspecialchars($metrics['slow_log']) ?></textarea>
        </div>
      </div>

    </div>
  </main>
</div>

<script>
  window.liveEmptyText = <?= json_encode($t['live_users_empty'] ?? 'No active users.') ?>;
  window.adminLang = <?= json_encode($adminLang) ?>;
  window.overallLoadText = {
    good: <?= json_encode($t['overall_status_good']) ?>,
    warn: <?= json_encode($t['overall_status_warn']) ?>,
    danger: <?= json_encode($t['overall_status_danger']) ?>
  };
  
  (function() {
  let timerId = null;

  function getStatusClass(pct, warnThreshold = 60, dangerThreshold = 85) {
    if (pct >= dangerThreshold) return 'danger';
    if (pct >= warnThreshold) return 'warn';
    return 'good';
  }

  function updateMetricsUI(data) {
    if (!data) return;

    document.getElementById('lastUpdated').textContent = data.timestamp;

    // 0. OVERALL LOAD
    if (typeof data.overall_load_pct !== 'undefined') {
      const pct = data.overall_load_pct;
      const statusClass = getStatusClass(pct, 50, 80);
      document.getElementById('overallPctText').textContent = pct;
      
      const overallBar = document.getElementById('overallBar');
      if (overallBar) {
        overallBar.style.width = pct + '%';
        overallBar.className = 'progress-bar-fill ' + statusClass;
      }
      
      const overallBadge = document.getElementById('overallBadge');
      if (overallBadge) {
        overallBadge.className = 'load-card-badge ' + statusClass;
      }
      
      const statusTextEl = document.getElementById('overallStatusText');
      if (statusTextEl && window.overallLoadText) {
        statusTextEl.textContent = pct >= 80 ? window.overallLoadText.danger : (pct >= 50 ? window.overallLoadText.warn : window.overallLoadText.good);
      }
      
      if (data.cpu) document.getElementById('overallCpuMini').textContent = data.cpu.pct;
      if (data.memory) document.getElementById('overallRamMini').textContent = data.memory.pct;
      if (data.disk) document.getElementById('overallDiskMini').textContent = data.disk.pct;
      if (data.db && data.db.metrics) {
        const maxConn = data.db.metrics.max_connections || 151;
        document.getElementById('overallDbMini').textContent = Math.round((data.db.metrics.threads_connected / maxConn) * 100);
      }

      if (data.top_factor) {
        const lang = window.adminLang || 'hy';
        const tfName = document.getElementById('topFactorName');
        if (tfName) tfName.textContent = data.top_factor['name_' + lang] || data.top_factor.name_hy;
        
        const tfPct = document.getElementById('topFactorPct');
        if (tfPct) {
          tfPct.textContent = data.top_factor.pct + '%';
          tfPct.className = 'load-card-badge ' + getStatusClass(data.top_factor.pct, 50, 80);
        }
        
        const tfDetail = document.getElementById('topFactorDetail');
        if (tfDetail) tfDetail.textContent = data.top_factor.detail;

        const tfReason = document.getElementById('topFactorReason');
        if (tfReason) tfReason.textContent = data.top_factor['reason_' + lang] || data.top_factor.reason_hy;
      }
    }

    // 1. CPU
    if (data.cpu) {
      const pct = data.cpu.pct;
      const statusClass = getStatusClass(pct, 50, 80);
      
      document.getElementById('cpuPctText').textContent = pct;
      document.getElementById('cpuBadge').textContent = pct + '%';
      document.getElementById('cpuBadge').className = 'load-card-badge ' + statusClass;
      
      const cpuBar = document.getElementById('cpuBar');
      cpuBar.style.width = pct + '%';
      cpuBar.className = 'progress-bar-fill ' + statusClass;

      document.getElementById('cpuLoad1').textContent = data.cpu.load_1m;
      document.getElementById('cpuLoad5').textContent = data.cpu.load_5m;
      document.getElementById('cpuLoad15').textContent = data.cpu.load_15m;
    }

    // 2. RAM
    if (data.memory) {
      const pct = data.memory.pct;
      const statusClass = getStatusClass(pct, 65, 85);

      document.getElementById('memUsedMbText').textContent = data.memory.used_mb;
      document.getElementById('memFreeMbText').textContent = data.memory.free_mb + ' MB';
      document.getElementById('memBadge').textContent = pct + '%';
      document.getElementById('memBadge').className = 'load-card-badge ' + statusClass;

      const memBar = document.getElementById('memBar');
      memBar.style.width = pct + '%';
      memBar.className = 'progress-bar-fill ' + statusClass;

      document.getElementById('phpMemUsed').textContent = data.memory.php_used_mb + ' MB';
      document.getElementById('phpMemPeak').textContent = data.memory.php_peak_mb + ' MB';
    }

    // 3. DISK
    if (data.disk) {
      const pct = data.disk.pct;
      const statusClass = getStatusClass(pct, 75, 90);

      document.getElementById('diskUsedGbText').textContent = data.disk.used_gb;
      document.getElementById('diskFreeGbText').textContent = data.disk.free_gb + ' GB';
      document.getElementById('diskFreeVal').textContent = data.disk.free_gb + ' GB';
      document.getElementById('diskBadge').textContent = pct + '%';
      document.getElementById('diskBadge').className = 'load-card-badge ' + statusClass;

      const diskBar = document.getElementById('diskBar');
      diskBar.style.width = pct + '%';
      diskBar.className = 'progress-bar-fill ' + statusClass;
    }

    // 4. DATABASE
    if (data.db && data.db.metrics) {
      const m = data.db.metrics;
      const maxConn = m.max_connections || 151;
      const connPct = maxConn > 0 ? Math.round((m.threads_connected / maxConn) * 100) : 0;
      
      document.getElementById('dbThreadsConn').textContent = m.threads_connected;
      document.getElementById('dbMaxConn').textContent = maxConn;
      document.getElementById('dbThreadsRun').textContent = m.threads_running;
      document.getElementById('dbQps').textContent = m.qps;
      
      const slowEl = document.getElementById('dbSlowQueries');
      slowEl.textContent = m.slow_queries;
      slowEl.style.color = m.slow_queries > 0 ? 'var(--danger)' : '';

      document.getElementById('dbTotalQueries').textContent = Number(m.queries).toLocaleString();

      const dbBar = document.getElementById('dbConnBar');
      dbBar.style.width = Math.max(2, connPct) + '%';
      dbBar.className = 'progress-bar-fill ' + (connPct > 80 ? 'danger' : 'good');

      if (typeof m.active_users_5m !== 'undefined') {
        const outEl = document.getElementById('onlineUsers');
        if (outEl) outEl.textContent = m.active_users_5m;
      }
    }

    // 5. OPCACHE & SYSTEM
    if (data.opcache) {
      if (data.opcache.enabled) {
        document.getElementById('opHitRate').textContent = data.opcache.hit_rate + '%';
        document.getElementById('opMemUsed').textContent = data.opcache.memory_used_mb + ' MB';
        document.getElementById('opScripts').textContent = Number(data.opcache.cached_scripts).toLocaleString();
      }
    }
    if (data.server && data.server.uptime) {
      document.getElementById('sysUptime').textContent = data.server.uptime;
    }

    // 6. AUDIENCE
    if (data.audience) {
      const audienceError = document.getElementById('audMetricsError');
      if (audienceError) audienceError.hidden = !data.audience.error;
      document.getElementById('audOnline5m').textContent = data.audience.online_5m;
      document.getElementById('audOnlineApp5m').textContent = data.audience.online_app_5m;
      document.getElementById('audOnlineWeb5m').textContent = data.audience.online_web_5m;
      document.getElementById('audOnlineAdminApp5m').textContent = data.audience.online_admin_app_5m;
      document.getElementById('audActive24h').textContent = data.audience.active_24h;
      document.getElementById('audActive7d').textContent = data.audience.active_7d;
      document.getElementById('audActive30d').textContent = data.audience.active_30d;
      document.getElementById('audNewToday').textContent = data.audience.new_today;
      document.getElementById('audTotalUsers').textContent = Number(data.audience.total_users).toLocaleString();
      
      // Update top header badge as well (if exists)
      const outEl = document.getElementById('onlineUsers');
      if (outEl) outEl.textContent = data.audience.online_5m;
      
      const pContainer = document.getElementById('audPlatforms');
      pContainer.innerHTML = '';
      
      const platforms = data.audience.platforms;
      if (Object.keys(platforms).length === 0) {
        pContainer.innerHTML = '<div style="font-size:0.8rem; color:var(--muted);">—</div>';
      } else {
        // Calculate total for percentages
        let total = 0;
        for (const count of Object.values(platforms)) total += count;
        
        // Colors for platforms
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
        let colorIdx = 0;
        
        // Build the stacked bar
        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.width = '100%';
        barContainer.style.height = '8px';
        barContainer.style.borderRadius = '4px';
        barContainer.style.overflow = 'hidden';
        barContainer.style.marginBottom = '12px';
        barContainer.style.background = 'rgba(163,174,209,0.2)';
        
        // Build the legend
        const legendContainer = document.createElement('div');
        legendContainer.style.display = 'flex';
        legendContainer.style.flexWrap = 'wrap';
        legendContainer.style.gap = '12px';
        
        for (const [p, c] of Object.entries(platforms)) {
          const color = colors[colorIdx % colors.length];
          const pct = ((c / total) * 100).toFixed(1);
          
          // Bar segment
          const segment = document.createElement('div');
          segment.style.width = pct + '%';
          segment.style.background = color;
          segment.title = p + ': ' + c + ' (' + pct + '%)';
          barContainer.appendChild(segment);
          
          // Legend item
          const legItem = document.createElement('div');
          legItem.style.fontSize = '0.8rem';
          legItem.style.color = 'var(--text)';
          legItem.style.fontWeight = '600';
          legItem.innerHTML = `<span style="color:${color}; font-size:1rem; line-height:1; vertical-align:middle; margin-right:4px;">&bull;</span>${p} <span style="color:var(--muted); font-size:0.75rem;">(${c})</span>`;
          legendContainer.appendChild(legItem);
          
          colorIdx++;
        }
        
        pContainer.appendChild(barContainer);
        pContainer.appendChild(legendContainer);
      }
      
      const luContainer = document.getElementById('audLiveUsers');
      if (luContainer) {
        luContainer.innerHTML = '';
        if (data.audience.live_users && data.audience.live_users.length > 0) {
          for (const lu of data.audience.live_users) {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; border:1px solid var(--line);';
            const sName = document.createElement('span');
            sName.style.cssText = 'font-size:0.85rem; font-weight:600; color:var(--text);';
            sName.textContent = lu.name;
            const sPlat = document.createElement('span');
            sPlat.style.cssText = 'font-size:0.75rem; color:var(--muted);';
            sPlat.textContent = lu.platform;
            div.appendChild(sName);
            div.appendChild(sPlat);
            luContainer.appendChild(div);
          }
        } else {
          luContainer.innerHTML = '<div style="font-size:0.8rem; color:var(--muted);">' + (window.liveEmptyText || 'No active users.') + '</div>';
        }
      }
    }

    if (typeof data.slow_log === 'string') {
      const logBox = document.getElementById('slowQueriesLogBox');
      if (logBox && logBox.value !== data.slow_log) {
        logBox.value = data.slow_log;
        logBox.scrollTop = logBox.scrollHeight;
      }
    }
    if (typeof data.slow_log_writable === 'boolean') {
      const slowLogStatus = document.getElementById('slowLogStatus');
      if (slowLogStatus) {
        slowLogStatus.textContent = data.slow_log_writable
          ? slowLogStatus.dataset.activeLabel
          : slowLogStatus.dataset.errorLabel;
        slowLogStatus.className = 'load-card-badge ' + (data.slow_log_writable ? 'good' : 'warn');
      }
    }
  }

  async function fetchMetrics() {
    try {
      const res = await fetch('?ajax=1');
      if (res.ok) {
        const data = await res.json();
        updateMetricsUI(data);
      }
    } catch (e) {
      console.error('Failed to fetch server metrics:', e);
    }
  }

  function startAutoRefresh() {
    if (timerId) clearInterval(timerId);
    const interval = parseInt(document.getElementById('intervalSelect').value, 10);
    if (interval > 0) {
      timerId = setInterval(fetchMetrics, interval);
    }
  }

  document.getElementById('intervalSelect').addEventListener('change', startAutoRefresh);
  document.getElementById('manualRefreshBtn').addEventListener('click', function() {
    fetchMetrics();
  });

  const slowLogTestBtn = document.getElementById('slowLogTestBtn');
  if (slowLogTestBtn) {
    slowLogTestBtn.addEventListener('click', async function() {
      slowLogTestBtn.disabled = true;
      slowLogTestBtn.textContent = slowLogTestBtn.dataset.testingLabel;
      try {
        const response = await fetch('?action=slow_log_test', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store'
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error('slow_log_test_failed');
        await fetchMetrics();
      } catch (error) {
        window.alert(slowLogTestBtn.dataset.errorLabel);
      } finally {
        slowLogTestBtn.disabled = false;
        slowLogTestBtn.textContent = slowLogTestBtn.dataset.label;
      }
    });
  }

  startAutoRefresh();
})();
</script>
</body>
</html>
