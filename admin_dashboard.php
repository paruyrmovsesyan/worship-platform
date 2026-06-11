<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/version_config.php';

$access = wp_admin_require_access('/admin_dashboard.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

// ── FETCH REAL DATA ──────────────────────────────────────────
$songCount = $lyricsCount = $chordsCount = $userCount = $setlistCount = 0;
$mainInstalls = $adminInstalls = $totalInstalls = 0;
$dbOk = false; $dbMs = 0;
$versionLabel = '—';
$phpVersion = phpversion();
$diskFreeGb = round(disk_free_space(__DIR__) / 1024 / 1024 / 1024, 2);
$memUsedMb  = round(memory_get_usage(true) / 1024 / 1024, 1);

try {
    $t0 = microtime(true);
    $conn = wp_runtime_open_mysqli();
    $dbMs = round((microtime(true) - $t0) * 1000, 1);
    $dbOk = true;

    $r = $conn->query("SELECT COUNT(*) FROM songs"); if($r){ $row=$r->fetch_row(); $songCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE lyrics IS NOT NULL AND lyrics != ''"); if($r){ $row=$r->fetch_row(); $lyricsCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE (chords IS NOT NULL AND chords != '') AND (lyrics IS NULL OR lyrics = '')"); if($r){ $row=$r->fetch_row(); $chordsCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM users"); if($r){ $row=$r->fetch_row(); $userCount=(int)($row[0]??0); }
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if($r && $r->num_rows > 0){ $r2=$conn->query("SELECT COUNT(*) FROM setlists"); if($r2){ $row=$r2->fetch_row(); $setlistCount=(int)($row[0]??0); } }
    $conn->close();
} catch(Throwable $e) { $dbOk = false; }

try {
    $installStats = wp_install_stats();
    $mainInstalls  = (int)($installStats['main']['count']  ?? 0);
    $adminInstalls = (int)($installStats['admin']['count'] ?? 0);
    $totalInstalls = (int)($installStats['total']          ?? 0);
} catch(Throwable $e) {}

try {
    $vc = wp_version_load();
    $versionLabel = (string)($vc['app_version'] ?? $vc['version'] ?? '—');
} catch(Throwable $e) {}

$activePage = 'dashboard';
$searchPlaceholder = 'Search...';
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard — Worship Admin</title>
  <link rel="icon" href="/wolarm_developers.png" type="image/png">
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
</head>
<body>
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <div class="page-heading page-heading-row">
        <div>
          <h1>Dashboard 😍</h1>
          <p>Overview of your Worship platform</p>
        </div>
        <div style="display:flex; gap:10px; background:white; padding:6px; border-radius:12px; box-shadow:var(--shadow-sm);">
          <button class="btn btn-primary" style="padding:8px 18px; border-radius:8px; box-shadow:none;">Daily</button>
          <button class="btn" style="padding:8px 18px; border-radius:8px; box-shadow:none; background:transparent;">Monthly</button>
        </div>
      </div>

      <!-- STAT CARDS -->
      <div class="stats">
        <div class="stat">
          <div class="stat-row">
            <div>
              <div class="stat-label">Total Songs</div>
              <div class="stat-value"><?= number_format($songCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?= $lyricsCount > 0 ? '+'.round($lyricsCount/$songCount*100).'%' : '0%' ?> <span class="stat-trend-label">with lyrics</span>
          </div>
        </div>

        <div class="stat">
          <div class="stat-row">
            <div>
              <div class="stat-label">Registered Users</div>
              <div class="stat-value"><?= number_format($userCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#f3ebff; color:#7d40ff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Active <span class="stat-trend-label">accounts</span>
          </div>
        </div>

        <div class="stat">
          <div class="stat-row">
            <div>
              <div class="stat-label">App Installs</div>
              <div class="stat-value"><?= number_format($totalInstalls) ?></div>
            </div>
            <div class="stat-icon" style="background:#e6f9f3; color:#05cd99;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?= $mainInstalls ?> main · <?= $adminInstalls ?> admin <span class="stat-trend-label">sessions</span>
          </div>
        </div>
      </div>

      <!-- SYSTEM STATUS + QUICK LINKS -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <!-- System Status -->
        <div class="card">
          <h3 style="font-size:18px; font-weight:700; margin-bottom:20px;">System Status</h3>
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600; color:var(--muted);">Database</span>
              <span class="badge <?= $dbOk ? 'badge-success' : 'badge-danger' ?>"><?= $dbOk ? '✓ Online' : '✗ Offline' ?> <?= $dbOk ? '('.$dbMs.'ms)' : '' ?></span>
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

        <!-- Quick Actions -->
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

      <!-- SONGS BREAKDOWN TABLE -->
      <div class="card" style="margin-bottom:32px;">
        <h3 style="font-size:18px; font-weight:700; margin-bottom:20px;">Songs Breakdown</h3>
        <div class="table-card" style="box-shadow:none; border:1px solid var(--line);">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Share</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>With Lyrics</strong></td>
                <td><?= number_format($lyricsCount) ?></td>
                <td><?= $songCount > 0 ? round($lyricsCount/$songCount*100) : 0 ?>%</td>
                <td><span class="badge badge-success">Published</span></td>
              </tr>
              <tr>
                <td><strong>Chords Only</strong></td>
                <td><?= number_format($chordsCount) ?></td>
                <td><?= $songCount > 0 ? round($chordsCount/$songCount*100) : 0 ?>%</td>
                <td><span class="badge badge-warning">Partial</span></td>
              </tr>
              <tr>
                <td><strong>Total</strong></td>
                <td><?= number_format($songCount) ?></td>
                <td>100%</td>
                <td><span class="badge badge-neutral">All</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div><!-- app-content -->
  </main>
</div>
</body>
</html>
