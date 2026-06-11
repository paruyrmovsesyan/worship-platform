<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/version_config.php';

$access = wp_admin_require_access('/admin_stats.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

// ── FETCH STATS ──────────────────────────────────────────────
$songCount = $lyricsCount = $chordsCount = $userCount = $setlistCount = $favCount = 0;
$recentSongs = [];
$topArtists  = [];
$recentUsers = [];
$dbOk = false;

try {
    $conn = wp_runtime_open_mysqli();
    $dbOk = true;

    $r = $conn->query("SELECT COUNT(*) FROM songs"); if($r){ $row=$r->fetch_row(); $songCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE lyrics IS NOT NULL AND lyrics != ''"); if($r){ $row=$r->fetch_row(); $lyricsCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE (chords IS NOT NULL AND chords != '') AND (lyrics IS NULL OR lyrics='')"); if($r){ $row=$r->fetch_row(); $chordsCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM users"); if($r){ $row=$r->fetch_row(); $userCount=(int)($row[0]??0); }

    // Setlists
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM setlists"); if($r2){ $row=$r2->fetch_row(); $setlistCount=(int)($row[0]??0); }
    }

    // Favorites
    $r = $conn->query("SHOW TABLES LIKE 'user_favorites'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM user_favorites"); if($r2){ $row=$r2->fetch_row(); $favCount=(int)($row[0]??0); }
    }

    // Recent songs (last 10)
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentSongs[] = $row; } }

    // Top artists by song count
    $r = $conn->query("SELECT artist, COUNT(*) AS cnt FROM songs WHERE artist IS NOT NULL AND artist != '' GROUP BY artist ORDER BY cnt DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $topArtists[] = $row; } }

    // Recent users (last 10)
    $r = $conn->query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentUsers[] = $row; } }

    $conn->close();
} catch (Throwable $e) { $dbOk = false; }

$installStats  = [];
$mainInstalls  = $adminInstalls = $totalInstalls = 0;
try {
    $installStats = wp_install_stats();
    $mainInstalls  = (int)($installStats['main']['count']  ?? 0);
    $adminInstalls = (int)($installStats['admin']['count'] ?? 0);
    $totalInstalls = (int)($installStats['total'] ?? 0);
} catch(Throwable $e) {}

$activePage = 'statistics';
$searchPlaceholder = 'Search stats...';
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Statistics — Worship Platform Admin</title>
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
          <h1>Statistics 📊</h1>
          <p><?= __('Platform analytics and insights') ?></p>
        </div>
      </div>

      <!-- STAT CARDS -->
      <div class="stats">
        <div class="stat">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Total Songs') ?></div>
              <div class="stat-value"><?= number_format($songCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?= $lyricsCount ?> with lyrics <span class="stat-trend-label">· <?= $chordsCount ?> chords only</span>
          </div>
        </div>

        <div class="stat">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Total Users') ?></div>
              <div class="stat-value"><?= number_format($userCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#f3ebff; color:#7d40ff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?= $favCount ?> favorites <span class="stat-trend-label">· <?= $setlistCount ?> setlists</span>
          </div>
        </div>

        <div class="stat">
          <div class="stat-row">
            <div>
              <div class="stat-label">Active Installs</div>
              <div class="stat-value"><?= number_format($totalInstalls) ?></div>
            </div>
            <div class="stat-icon" style="background:#e6f9f3; color:#05cd99;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </div>
          </div>
          <div class="stat-trend up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <?= $mainInstalls ?> app · <?= $adminInstalls ?> admin <span class="stat-trend-label">sessions</span>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <!-- Top Artists -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line);">
            <h3 style="font-size:16px; font-weight:700;">Top Artists</h3>
          </div>
          <table>
            <thead><tr><th><?= __('Artist') ?></th><th>Songs</th></tr></thead>
            <tbody>
              <?php foreach ($topArtists as $a): ?>
              <tr>
                <td><strong><?= htmlspecialchars((string)($a['artist'] ?? '—')) ?></strong></td>
                <td><span class="badge badge-neutral"><?= (int)$a['cnt'] ?></span></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($topArtists)): ?>
              <tr><td colspan="2" style="text-align:center; padding:30px; color:var(--muted);"><?= __('No data') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>

        <!-- Recent Users -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line);">
            <h3 style="font-size:16px; font-weight:700;">Recent Registrations</h3>
          </div>
          <table>
            <thead><tr><th><?= __('User') ?></th><th><?= __('Email') ?></th><th><?= __('Joined') ?></th></tr></thead>
            <tbody>
              <?php foreach ($recentUsers as $u): ?>
              <tr>
                <td><strong><?= htmlspecialchars((string)($u['name'] ?? '—')) ?></strong></td>
                <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($u['email'] ?? '—')) ?></td>
                <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($u['created_at'] ?? '—')) ?></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($recentUsers)): ?>
              <tr><td colspan="3" style="text-align:center; padding:30px; color:var(--muted);"><?= __('No data') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Songs -->
      <div class="table-card">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:16px; font-weight:700;">Recently Added Songs</h3>
          <a href="/songs.php" class="btn btn-primary" style="padding:8px 16px; font-size:13px;">Manage Songs →</a>
        </div>
        <table>
          <thead><tr><th>#</th><th><?= __('Title') ?></th><th><?= __('Artist') ?></th><th><?= __('Added') ?></th></tr></thead>
          <tbody>
            <?php foreach ($recentSongs as $s): ?>
            <tr>
              <td style="color:var(--muted); font-size:13px;"><?= (int)$s['id'] ?></td>
              <td><strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong></td>
              <td style="color:var(--muted);"><?= htmlspecialchars((string)($s['artist'] ?? '—')) ?></td>
              <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($s['created_at'] ?? '—')) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php if (empty($recentSongs)): ?>
            <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);"><?= __('No songs yet') ?></td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>
</body>
</html>
