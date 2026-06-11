<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/version_config.php';

wp_admin_require_access('/songs.php');

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$result = [];
$startTime = microtime(true);

// ── 1. DATABASE ───────────────────────────────────────────
$dbOk    = false;
$dbMs    = 0;
$songCount   = 0;
$lyricsCount = 0;
$chordsCount = 0;

try {
    $t0   = microtime(true);
    $conn = wp_runtime_open_mysqli();
    $dbMs = round((microtime(true) - $t0) * 1000, 1);
    $dbOk = true;

    // song stats
    $r = $conn->query("SELECT COUNT(*) AS c FROM songs");
    if ($r) { $row = $r->fetch_row(); $songCount = (int)($row[0] ?? 0); }

    $r = $conn->query("SELECT COUNT(*) AS c FROM songs WHERE lyrics IS NOT NULL AND lyrics != ''");
    if ($r) { $row = $r->fetch_row(); $lyricsCount = (int)($row[0] ?? 0); }

    $r = $conn->query("SELECT COUNT(*) AS c FROM songs WHERE (chords IS NOT NULL AND chords != '') AND (lyrics IS NULL OR lyrics = '')");
    if ($r) { $row = $r->fetch_row(); $chordsCount = (int)($row[0] ?? 0); }

    // registered users
    $userCount = 0;
    $r = $conn->query("SELECT COUNT(*) AS c FROM users");
    if ($r) { $row = $r->fetch_row(); $userCount = (int)($row[0] ?? 0); }

    // setlists
    $setlistCount = 0;
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM setlists");
        if ($r2) { $row = $r2->fetch_row(); $setlistCount = (int)($row[0] ?? 0); }
    }

    $conn->close();
} catch (Throwable $e) {
    $dbOk = false;
}

// ── 2. API SELF-CHECK ─────────────────────────────────────
$apiOk = true; // we are the API, if we got here it's OK

// ── 3. SERVER CHECK (direct PHP — no self-HTTP request) ──────────────────
// Most shared hostings block loopback HTTP requests, so we test the server
// health directly in PHP instead of calling status.php over HTTP.
$statusOk = false;
$statusMs = 0;
try {
    $t0 = microtime(true);
    // Quick sanity: check that PHP can open a file and read server memory
    $memOk = function_exists('memory_get_usage');
    $diskOk = disk_free_space(__DIR__) !== false;
    $statusMs = round((microtime(true) - $t0) * 1000, 2);
    $statusOk = $memOk && $diskOk;
} catch (Throwable $e) {
    $statusOk = false;
}

// ── 4. APP / PWA INSTALLS ────────────────────────────────
$installStats = [];
try {
    $installStats = wp_install_stats();
} catch (Throwable $e) {
    $installStats = [];
}

$mainInstalls   = (int)($installStats['main']['count']  ?? 0);
$adminInstalls  = (int)($installStats['admin']['count'] ?? 0);
$totalInstalls  = (int)($installStats['total']          ?? 0);
$totalKnown     = (int)($installStats['total_known']    ?? 0);

// ── 5. VERSION ───────────────────────────────────────────
$versionLabel = '—';
try {
    $vc = wp_version_load();
    $versionLabel = (string)($vc['version'] ?? $vc['app_version'] ?? '—');
} catch (Throwable $e) {}

// ── 6. SERVER UPTIME (PHP) ───────────────────────────────
$phpVersion   = phpversion();
$serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'Apache';
$totalMs = round((microtime(true) - $startTime) * 1000, 1);

// ── OUTPUT ───────────────────────────────────────────────
echo json_encode([
    'status' => [
        'api'      => ['ok' => $apiOk,    'label' => 'API',      'ms' => $totalMs],
        'database' => ['ok' => $dbOk,     'label' => 'Database', 'ms' => $dbMs],
        'server'   => ['ok' => $statusOk, 'label' => 'Server',   'ms' => $statusMs],
    ],
    'songs' => [
        'total'        => $songCount,
        'with_lyrics'  => $lyricsCount,
        'chords_only'  => $chordsCount,
    ],
    'users' => [
        'registered' => $userCount ?? 0,
        'setlists'   => $setlistCount,
    ],
    'installs' => [
        'main_active'  => $mainInstalls,
        'admin_active' => $adminInstalls,
        'total_active' => $totalInstalls,
        'total_known'  => $totalKnown,
    ],
    'system' => [
        'php_version'     => $phpVersion,
        'server_software' => $serverSoftware,
        'version'         => $versionLabel,
        'response_ms'     => $totalMs,
        'memory_used_mb'  => round(memory_get_usage(true) / 1024 / 1024, 1),
        'disk_free_gb'    => round(disk_free_space(__DIR__) / 1024 / 1024 / 1024, 2),
    ],
], JSON_UNESCAPED_UNICODE);
