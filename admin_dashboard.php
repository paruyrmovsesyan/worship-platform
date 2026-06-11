<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/version_config.php';

$access = wp_admin_require_access('/admin_dashboard.php');
$adminUser        = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang        = $_COOKIE['admin_lang'] ?? 'hy';

if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ' . strtok($_SERVER['REQUEST_URI'],'?') . '?period=' . ($_GET['period'] ?? 'daily'));
    exit;
}

$period = in_array($_GET['period'] ?? '', ['daily','monthly']) ? $_GET['period'] : 'daily';

// ── FETCH DATA ──────────────────────────────────────────────
$songCount = $lyricsCount = $chordsCount = $userCount = $setlistCount = 0;
$songCountPrev = $userCountPrev = 0;          // for trend %
$recentSongs   = [];
$notifications = [];
$dbOk = false; $dbMs = 0;

$mainInstalls = $adminInstalls = $totalInstalls = 0;
$phpVersion   = phpversion();
$diskFreeGb   = round(disk_free_space(__DIR__) / 1024 / 1024 / 1024, 2);
$memUsedMb    = round(memory_get_usage(true) / 1024 / 1024, 1);
$versionLabel = '—';

// Period boundaries
if ($period === 'daily') {
    $periodStart     = date('Y-m-d 00:00:00');
    $periodStartPrev = date('Y-m-d 00:00:00', strtotime('-1 day'));
    $periodEndPrev   = date('Y-m-d 23:59:59', strtotime('-1 day'));
    $periodLabel     = 'Today';
} else {
    $periodStart     = date('Y-m-01 00:00:00');
    $periodStartPrev = date('Y-m-01 00:00:00', strtotime('-1 month'));
    $periodEndPrev   = date('Y-m-t 23:59:59', strtotime('-1 month'));
    $periodLabel     = date('F Y');
}

try {
    $t0   = microtime(true);
    $conn = wp_runtime_open_mysqli();
    $dbMs = round((microtime(true) - $t0) * 1000, 1);
    $dbOk = true;

    // All-time totals
    $r = $conn->query("SELECT COUNT(*) FROM songs");
    if ($r) { $row = $r->fetch_row(); $songCount = (int)($row[0] ?? 0); }

    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE lyrics IS NOT NULL AND lyrics != ''");
    if ($r) { $row = $r->fetch_row(); $lyricsCount = (int)($row[0] ?? 0); }

    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE (chords IS NOT NULL AND chords != '') AND (lyrics IS NULL OR lyrics = '')");
    if ($r) { $row = $r->fetch_row(); $chordsCount = (int)($row[0] ?? 0); }

    $r = $conn->query("SELECT COUNT(*) FROM users");
    if ($r) { $row = $r->fetch_row(); $userCount = (int)($row[0] ?? 0); }

    // Period-specific new songs count
    $stmt = $conn->prepare("SELECT COUNT(*) FROM songs WHERE created_at >= ?");
    if ($stmt) {
        $stmt->bind_param('s', $periodStart);
        $stmt->execute();
        $stmt->bind_result($songCountPeriod);
        $stmt->fetch();
        $stmt->close();
    }
    $songCountPeriod = $songCountPeriod ?? 0;

    // Period-specific new users count
    $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE created_at >= ?");
    if ($stmt) {
        $stmt->bind_param('s', $periodStart);
        $stmt->execute();
        $stmt->bind_result($userCountPeriod);
        $stmt->fetch();
        $stmt->close();
    }
    $userCountPeriod = $userCountPeriod ?? 0;

    // Previous period songs
    $stmt = $conn->prepare("SELECT COUNT(*) FROM songs WHERE created_at BETWEEN ? AND ?");
    if ($stmt) {
        $stmt->bind_param('ss', $periodStartPrev, $periodEndPrev);
        $stmt->execute();
        $stmt->bind_result($songCountPrev);
        $stmt->fetch();
        $stmt->close();
    }
    $songCountPrev = $songCountPrev ?? 0;

    // Previous period users
    $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE created_at BETWEEN ? AND ?");
    if ($stmt) {
        $stmt->bind_param('ss', $periodStartPrev, $periodEndPrev);
        $stmt->execute();
        $stmt->bind_result($userCountPrev);
        $stmt->fetch();
        $stmt->close();
    }
    $userCountPrev = $userCountPrev ?? 0;

    // Setlists
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM setlists");
        if ($r2) { $row = $r2->fetch_row(); $setlistCount = (int)($row[0] ?? 0); }
    }

    // Recent songs for the table (period)
    $stmt = $conn->prepare(
        "SELECT id, title, artist, created_at FROM songs WHERE created_at >= ? ORDER BY id DESC LIMIT 8"
    );
    if ($stmt) {
        $stmt->bind_param('s', $periodStart);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) { $recentSongs[] = $row; }
        $stmt->close();
    }

    // Notifications: last 10 songs added (all time)
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs ORDER BY id DESC LIMIT 10");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $notifications[] = [
                'type'    => 'song',
                'message' => 'New song added: ' . ($row['title'] ?? 'Untitled'),
                'sub'     => $row['artist'] ?? '',
                'time'    => $row['created_at'] ?? '',
            ];
        }
    }

    // Add recent user registrations to notifications
    $r = $conn->query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 5");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $notifications[] = [
                'type'    => 'user',
                'message' => 'New user: ' . ($row['name'] ?? $row['email'] ?? 'Unknown'),
                'sub'     => $row['email'] ?? '',
                'time'    => $row['created_at'] ?? '',
            ];
        }
    }

    // Sort notifications by time desc
    usort($notifications, fn($a, $b) => strcmp($b['time'], $a['time']));
    $notifications = array_slice($notifications, 0, 12);

    $conn->close();
} catch (Throwable $e) { $dbOk = false; }

try {
    $installStats  = wp_install_stats();
    $mainInstalls  = (int)($installStats['main']['count']  ?? 0);
    $adminInstalls = (int)($installStats['admin']['count'] ?? 0);
    $totalInstalls = (int)($installStats['total']          ?? 0);
} catch (Throwable $e) {}

try {
    $vc = wp_version_load();
    $versionLabel = (string)($vc['app_version'] ?? $vc['version'] ?? '—');
} catch (Throwable $e) {}

// Trend helpers
function trendPct(int $current, int $prev): string {
    if ($prev === 0) return $current > 0 ? '+100%' : '0%';
    $pct = round(($current - $prev) / $prev * 100);
    return ($pct >= 0 ? '+' : '') . $pct . '%';
}
function trendClass(int $current, int $prev): string {
    return $current >= $prev ? 'up' : 'down';
}

$activePage        = 'dashboard';
$searchPlaceholder = 'Search...';
$notifCount        = count($notifications);
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard — Worship Admin</title>
  <link rel="icon" href="/wolarm_developers.png" type="image/png">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    /* ── Daily/Monthly toggle ── */
    .period-toggle { display:flex; gap:6px; background:white; padding:6px; border-radius:12px; box-shadow:var(--shadow-sm); }
    .period-btn {
      padding:8px 20px; border-radius:8px; border:none; cursor:pointer;
      font-family:inherit; font-size:14px; font-weight:700;
      transition: background .15s, color .15s, box-shadow .15s;
      background:transparent; color:var(--muted);
    }
    .period-btn.active { background:var(--primary); color:#fff; box-shadow:0 4px 10px rgba(67,24,255,0.25); }
    .period-btn:hover:not(.active) { background:#f4f7fe; color:var(--text); }

    /* ── Notification panel ── */
    .notif-wrapper { position:relative; }
    .notif-btn {
      width:44px; height:44px; border-radius:50%;
      background:white; border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 10px rgba(0,0,0,0.05); position:relative;
      transition: box-shadow .15s;
    }
    .notif-btn:hover { box-shadow:0 4px 16px rgba(0,0,0,0.1); }
    .notif-dot {
      position:absolute; top:9px; right:9px;
      width:9px; height:9px; background:var(--danger);
      border-radius:50%; border:2px solid white;
    }
    .notif-panel {
      position:absolute; top:calc(100% + 12px); right:0;
      width:360px; background:white; border-radius:20px;
      box-shadow:0 20px 60px rgba(0,0,0,0.15); z-index:1000;
      display:none; overflow:hidden;
      animation: notifIn .2s ease;
    }
    .notif-panel.open { display:block; }
    @keyframes notifIn {
      from { opacity:0; transform:translateY(-8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .notif-header {
      padding:20px 20px 12px;
      border-bottom:1px solid var(--line);
      display:flex; justify-content:space-between; align-items:center;
    }
    .notif-header h4 { font-size:16px; font-weight:700; color:var(--text); }
    .notif-header span { font-size:12px; color:var(--muted); cursor:pointer; font-weight:600; }
    .notif-header span:hover { color:var(--primary); }
    .notif-list { max-height:380px; overflow-y:auto; }
    .notif-item {
      display:flex; align-items:flex-start; gap:12px;
      padding:14px 20px; border-bottom:1px solid var(--line);
      transition: background .1s;
    }
    .notif-item:hover { background:#f8faff; }
    .notif-item:last-child { border-bottom:none; }
    .notif-icon {
      width:36px; height:36px; border-radius:10px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
    }
    .notif-icon.song { background:#e5f3ff; color:#228fff; }
    .notif-icon.user { background:#f3ebff; color:#7d40ff; }
    .notif-text { flex:1; min-width:0; }
    .notif-msg { font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .notif-sub { font-size:12px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .notif-time { font-size:11px; color:var(--muted); margin-top:4px; }
    .notif-empty { padding:40px; text-align:center; color:var(--muted); font-size:14px; }
    .notif-footer { padding:14px 20px; border-top:1px solid var(--line); text-align:center; }
    .notif-footer a { font-size:13px; font-weight:700; color:var(--primary); text-decoration:none; }

    /* ── Stat card animation ── */
    .stat-value { transition: all .3s ease; }
    .stat.loading .stat-value { opacity:0.4; }

    /* ── Period data badge ── */
    .period-badge {
      display:inline-flex; align-items:center; gap:6px;
      background:#f4f7fe; border-radius:20px; padding:4px 12px;
      font-size:12px; font-weight:700; color:var(--muted);
      margin-bottom:8px;
    }
  </style>
</head>
<body>
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <!-- PAGE HEADING with working period toggle -->
      <div class="page-heading page-heading-row">
        <div>
          <h1>Dashboard 😍</h1>
          <p>Overview of your Worship platform · <strong><?= $periodLabel ?></strong></p>
        </div>
        <div class="period-toggle">
          <button
            class="period-btn <?= $period === 'daily' ? 'active' : '' ?>"
            onclick="setPeriod('daily')"
            id="btnDaily">
            Daily
          </button>
          <button
            class="period-btn <?= $period === 'monthly' ? 'active' : '' ?>"
            onclick="setPeriod('monthly')"
            id="btnMonthly">
            Monthly
          </button>
        </div>
      </div>

      <!-- STAT CARDS -->
      <div class="stats" id="statsGrid">
        <!-- Songs -->
        <div class="stat" id="statSongs">
          <div class="stat-row">
            <div>
              <div class="stat-label">
                <span class="period-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <?= $periodLabel ?>
                </span><br>
                New Songs
              </div>
              <div class="stat-value" id="valSongsNew"><?= number_format($songCountPeriod ?? 0) ?></div>
            </div>
            <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          </div>
          <div class="stat-trend <?= trendClass($songCountPeriod ?? 0, $songCountPrev) ?>">
            <?php if (($songCountPeriod ?? 0) >= $songCountPrev): ?>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?php else: ?>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            <?php endif; ?>
            <span id="trendSongsNew"><?= trendPct($songCountPeriod ?? 0, $songCountPrev) ?></span>
            <span class="stat-trend-label">vs previous</span>
          </div>
        </div>

        <!-- Users -->
        <div class="stat" id="statUsers">
          <div class="stat-row">
            <div>
              <div class="stat-label">
                <span class="period-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <?= $periodLabel ?>
                </span><br>
                New Users
              </div>
              <div class="stat-value" id="valUsersNew"><?= number_format($userCountPeriod ?? 0) ?></div>
            </div>
            <div class="stat-icon" style="background:#f3ebff; color:#7d40ff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div class="stat-trend <?= trendClass($userCountPeriod ?? 0, $userCountPrev) ?>">
            <?php if (($userCountPeriod ?? 0) >= $userCountPrev): ?>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?php else: ?>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            <?php endif; ?>
            <span id="trendUsersNew"><?= trendPct($userCountPeriod ?? 0, $userCountPrev) ?></span>
            <span class="stat-trend-label">vs previous</span>
          </div>
        </div>

        <!-- All-time totals -->
        <div class="stat" id="statTotals">
          <div class="stat-row">
            <div>
              <div class="stat-label">
                <span class="period-badge" style="background:#e6f9f3; color:#05cd99;">
                  All Time
                </span><br>
                Total Songs
              </div>
              <div class="stat-value"><?= number_format($songCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#e6f9f3; color:#05cd99;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?= $userCount ?> users <span class="stat-trend-label">· <?= $totalInstalls ?> installs</span>
          </div>
        </div>
      </div>

      <!-- SYSTEM STATUS + QUICK LINKS -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <div class="card">
          <h3 style="font-size:18px; font-weight:700; margin-bottom:20px;">System Status</h3>
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--muted);">Database</span>
              <span class="badge <?= $dbOk ? 'badge-success' : 'badge-danger' ?>"><?= $dbOk ? '✓ Online' : '✗ Offline' ?><?= $dbOk ? ' ('.$dbMs.'ms)' : '' ?></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--muted);">PHP Version</span>
              <span class="badge badge-neutral"><?= htmlspecialchars($phpVersion) ?></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--muted);">App Version</span>
              <span class="badge badge-success"><?= htmlspecialchars($versionLabel) ?></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--muted);">Disk Free</span>
              <span class="badge badge-neutral"><?= $diskFreeGb ?> GB</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--muted);">Memory Used</span>
              <span class="badge badge-neutral"><?= $memUsedMb ?> MB</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:18px; font-weight:700; margin-bottom:20px;">Quick Actions</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <a href="/songs.php" class="btn" style="width:100%; justify-content:flex-start;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              Manage Songs
            </a>
            <a href="/admin_clients.php" class="btn" style="width:100%; justify-content:flex-start;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              View Clients
            </a>
            <a href="/admin_updates.php" class="btn" style="width:100%; justify-content:flex-start;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              System Settings
            </a>
            <a href="/admin_stats.php" class="btn btn-primary" style="width:100%; justify-content:flex-start;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              View Statistics
            </a>
          </div>
        </div>
      </div>

      <!-- PERIOD SONGS TABLE -->
      <div class="table-card">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:16px; font-weight:700;">Songs added — <?= htmlspecialchars($periodLabel) ?></h3>
          <a href="/songs.php" class="btn btn-primary" style="padding:8px 16px; font-size:13px;">Manage Songs →</a>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Title</th><th>Artist</th><th>Added</th></tr>
          </thead>
          <tbody id="periodSongsBody">
            <?php if (empty($recentSongs)): ?>
            <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);">No songs added during this period</td></tr>
            <?php else: ?>
            <?php foreach ($recentSongs as $s): ?>
            <tr>
              <td style="color:var(--muted); font-size:13px;"><?= (int)$s['id'] ?></td>
              <td><strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong></td>
              <td style="color:var(--muted);"><?= htmlspecialchars((string)($s['artist'] ?? '—')) ?></td>
              <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($s['created_at'] ?? '—')) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>

    </div><!-- app-content -->
  </main>
</div>

<!-- ── Notification panel (fixed overlay) ───────────────── -->
<div id="notifWrapper" style="position:fixed; top:72px; right:40px; z-index:9999;">
  <div class="notif-panel" id="notifPanel" style="position:relative; top:0; right:0;">
    <div class="notif-header">
      <h4>Notifications <span style="background:var(--primary);color:white;border-radius:20px;padding:2px 8px;font-size:11px;"><?= $notifCount ?></span></h4>
      <span onclick="markAllRead()" style="cursor:pointer;color:var(--muted);font-size:13px;font-weight:600;">Mark all read</span>
    </div>
    <div class="notif-list" id="notifList">
      <?php if (empty($notifications)): ?>
        <div class="notif-empty">No notifications yet</div>
      <?php else: ?>
        <?php foreach ($notifications as $n): ?>
        <div class="notif-item">
          <div class="notif-icon <?= $n['type'] ?>">
            <?php if ($n['type'] === 'song'): ?>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <?php else: ?>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <?php endif; ?>
          </div>
          <div class="notif-text">
            <div class="notif-msg"><?= htmlspecialchars($n['message']) ?></div>
            <?php if ($n['sub']): ?><div class="notif-sub"><?= htmlspecialchars($n['sub']) ?></div><?php endif; ?>
            <div class="notif-time"><?= htmlspecialchars($n['time']) ?></div>
          </div>
        </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
    <div class="notif-footer">
      <a href="/admin_stats.php">View all activity →</a>
    </div>
  </div>
</div>

<script>
// ── Period toggle ──────────────────────────────────────────
function setPeriod(period) {
  const url = new URL(window.location.href);
  url.searchParams.set('period', period);
  document.getElementById('statsGrid').style.opacity = '0.5';
  document.getElementById('statsGrid').style.transition = 'opacity .2s';
  window.location.href = url.toString();
}

document.addEventListener('DOMContentLoaded', function() {
  // Highlight correct period button
  const period = new URLSearchParams(window.location.search).get('period') || 'daily';
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn' + period.charAt(0).toUpperCase() + period.slice(1))?.classList.add('active');

  // Hook shared topbar bell to our notification panel
  const bell = document.getElementById('topbarBellBtn');
  if (bell) {
    bell.addEventListener('click', function(e) {
      e.stopPropagation();
      document.getElementById('notifPanel')?.classList.toggle('open');
    });
  }

  // Hook topbar search to table filter
  const searchInput = document.getElementById('topbarSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      handleSearch(this.value);
    });
  }
});

// ── Notifications ──────────────────────────────────────────
function markAllRead() {
  document.querySelector('.notif-dot')?.remove();
  document.getElementById('notifList').innerHTML = '<div class="notif-empty">All caught up! 🎉</div>';
}

document.addEventListener('click', function(e) {
  const wrapper = document.getElementById('notifWrapper');
  const panel   = document.getElementById('notifPanel');
  if (panel && panel.classList.contains('open') && wrapper && !wrapper.contains(e.target)) {
    panel.classList.remove('open');
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.getElementById('notifPanel')?.classList.remove('open');
});

// ── Table search ──────────────────────────────────────────
function handleSearch(q) {
  const rows  = document.querySelectorAll('#periodSongsBody tr');
  const query = q.toLowerCase().trim();
  rows.forEach(row => {
    row.style.display = !query || row.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
}
</script>
</body>
</html>
