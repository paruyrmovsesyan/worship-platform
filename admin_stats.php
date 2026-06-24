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
$prevSongCount = $prevUserCount = $prevTeamCount = $prevReqCount = $prevPushSubCount = 0;
$recentSongs = [];
$topArtists  = [];
$recentUsers = [];
$dbOk = false;

function getTrendHtml($current, $previous, $period, $supplementalHtml = '') {
    $supplDiv = $supplementalHtml ? '<div style="color:var(--muted); font-size:12px; font-weight:500; margin-top:4px; line-height:1.4;">' . $supplementalHtml . '</div>' : '';
    
    if ($period === 'all') {
        return '<div style="margin-top:8px;">' . $supplDiv . '</div>';
    }
    
    $growth = 0;
    if ($previous > 0) {
        $growth = round((($current - $previous) / $previous) * 100, 1);
    } elseif ($current > 0) {
        $growth = 100;
    }
    
    $sign = $growth > 0 ? '+' : '';
    $trendDiv = '';
    
    if ($growth > 0) {
        $trendDiv = '<div class="stat-trend up" title="vs previous period">' .
               '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>' .
               $sign . $growth . '%</div>';
    } elseif ($growth < 0) {
        $trendDiv = '<div class="stat-trend down" title="vs previous period">' .
               '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>' .
               $growth . '%</div>';
    } else {
        $trendDiv = '<div class="stat-trend" style="color:var(--muted);" title="vs previous period">' .
               '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>' .
               '0%</div>';
    }
    
    return '<div style="margin-top:8px; display:flex; flex-direction:column; gap:2px;">' . $trendDiv . $supplDiv . '</div>';
}

try {
    $conn = wp_runtime_open_mysqli();
    $dbOk = true;

    $period = $_GET['period'] ?? 'all';
    $whereCreated = ''; $andCreated = '';
    $whereViewed = '';  $whereAt = '';
    $wherePrevCreated = '';
    
    if ($period === 'daily') {
        $whereCreated = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        $andCreated   = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        $whereViewed  = "WHERE v.viewed_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        $whereAt      = "WHERE at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        $wherePrevCreated = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)";
    } elseif ($period === 'monthly') {
        $whereCreated = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        $andCreated   = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        $whereViewed  = "WHERE v.viewed_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        $whereAt      = "WHERE at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        $wherePrevCreated = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)";
    } elseif ($period === 'yearly') {
        $whereCreated = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        $andCreated   = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        $whereViewed  = "WHERE v.viewed_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        $whereAt      = "WHERE at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        $wherePrevCreated = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR) AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)";
    }

    $r = $conn->query("SELECT COUNT(*) FROM songs $whereCreated"); if($r){ $row=$r->fetch_row(); $songCount=(int)($row[0]??0); }
    if ($period !== 'all') { $r = $conn->query("SELECT COUNT(*) FROM songs $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $prevSongCount=(int)($row[0]??0); } }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE lyrics IS NOT NULL AND lyrics != '' $andCreated"); if($r){ $row=$r->fetch_row(); $lyricsCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE (chords IS NOT NULL AND chords != '') AND (lyrics IS NULL OR lyrics='') $andCreated"); if($r){ $row=$r->fetch_row(); $chordsCount=(int)($row[0]??0); }
    
    $r = $conn->query("SELECT COUNT(*) FROM users $whereCreated"); if($r){ $row=$r->fetch_row(); $userCount=(int)($row[0]??0); }
    if ($period !== 'all') { $r = $conn->query("SELECT COUNT(*) FROM users $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $prevUserCount=(int)($row[0]??0); } }

    // Setlists
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM setlists $whereCreated"); if($r2){ $row=$r2->fetch_row(); $setlistCount=(int)($row[0]??0); }
    }

    // Favorites
    $r = $conn->query("SHOW TABLES LIKE 'favorites'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM favorites $whereCreated"); if($r2){ $row=$r2->fetch_row(); $favCount=(int)($row[0]??0); }
    }

    // Recent songs (last 10)
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentSongs[] = $row; } }

    // Top artists by song count
    $r = $conn->query("SELECT artist, COUNT(*) AS cnt FROM songs WHERE artist IS NOT NULL AND artist != '' $andCreated GROUP BY artist ORDER BY cnt DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $topArtists[] = $row; } }

    // Recent users (last 10)
    $r = $conn->query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentUsers[] = $row; } }

    // Moderation (Song Requests)
    $reqCount = $pendingReqCount = 0;
    $r = $conn->query("SELECT COUNT(*), SUM(IF(status='pending', 1, 0)) FROM song_change_requests $whereCreated");
    if($r){ $row=$r->fetch_row(); $reqCount=(int)($row[0]??0); $pendingReqCount=(int)($row[1]??0); }
    if ($period !== 'all') { $r = $conn->query("SELECT COUNT(*) FROM song_change_requests $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $prevReqCount=(int)($row[0]??0); } }

    // Teams
    $teamCount = $teamMemberCount = 0;
    $r = $conn->query("SELECT COUNT(*) FROM teams $whereCreated"); if($r){ $row=$r->fetch_row(); $teamCount=(int)($row[0]??0); }
    if ($period !== 'all') { $r = $conn->query("SELECT COUNT(*) FROM teams $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $prevTeamCount=(int)($row[0]??0); } }
    $r = $conn->query("SELECT COUNT(*) FROM team_members $whereCreated"); if($r){ $row=$r->fetch_row(); $teamMemberCount=(int)($row[0]??0); }

    // Push Subscriptions
    $pushSubCount = 0;
    $r = $conn->query("SELECT COUNT(*) FROM push_subscriptions $whereCreated"); if($r){ $row=$r->fetch_row(); $pushSubCount=(int)($row[0]??0); }
    if ($period !== 'all') { $r = $conn->query("SELECT COUNT(*) FROM push_subscriptions $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $prevPushSubCount=(int)($row[0]??0); } }

    // Top Viewed Songs
    $topViews = [];
    $r = $conn->query("
        SELECT s.id, s.title, COUNT(v.id) as views 
        FROM recent_views v 
        JOIN songs s ON v.song_id = s.id 
        $whereViewed
        GROUP BY v.song_id 
        ORDER BY views DESC LIMIT 10
    ");
    if ($r) { while($row=$r->fetch_assoc()) { $topViews[] = $row; } }

    // Top Favorited Songs
    $topFavorites = [];
    $r = $conn->query("
        SELECT s.id, s.title, COUNT(f.user_id) as favs 
        FROM favorites f 
        JOIN songs s ON f.song_id = s.id 
        ".($whereCreated ? str_replace('created_at', 'f.created_at', $whereCreated) : '')."
        GROUP BY f.song_id 
        ORDER BY favs DESC LIMIT 10
    ");
    if ($r) { while($row=$r->fetch_assoc()) { $topFavorites[] = $row; } }

    // Recent Push
    $recentPush = [];
    $r = $conn->query("SELECT id, title, body, devices_count, at FROM push_history ORDER BY at DESC LIMIT 5");
    if ($r) { while($row=$r->fetch_assoc()) { $recentPush[] = $row; } }

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
      <div class="page-heading page-heading-row" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1><?= __('Statistics') ?> 📊</h1>
          <p><?= __('Platform analytics and insights') ?></p>
        </div>
        <div>
          <form method="get" action="admin_stats.php" style="margin:0;">
            <select name="period" class="input" style="width: auto; display: inline-block; padding: 8px 16px; border-radius: 12px; background: white; border: 1px solid var(--line); font-weight: 500; color: var(--text); cursor: pointer;" onchange="this.form.submit()">
              <option value="all" <?= $period === 'all' ? 'selected' : '' ?>><?= __('All Time') ?></option>
              <option value="yearly" <?= $period === 'yearly' ? 'selected' : '' ?>><?= __('Yearly') ?></option>
              <option value="monthly" <?= $period === 'monthly' ? 'selected' : '' ?>><?= __('Monthly') ?></option>
              <option value="daily" <?= $period === 'daily' ? 'selected' : '' ?>><?= __('Daily') ?></option>
            </select>
          </form>
        </div>
      </div>

      <!-- STAT CARDS -->
      <div class="stats" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); margin-bottom: 24px; gap: 16px;">
        <!-- Card 1: Songs -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Total Songs') ?></div>
              <div class="stat-value"><?= number_format($songCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          </div>
          <?= getTrendHtml($songCount, $prevSongCount, $period, $lyricsCount . ' ' . __('with lyrics') . ' · ' . $chordsCount . ' ' . __('chords only')) ?>
        </div>

        <!-- Card 2: Users -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Total Users') ?></div>
              <div class="stat-value"><?= number_format($userCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#f3ebff; color:#7d40ff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <?= getTrendHtml($userCount, $prevUserCount, $period, $favCount . ' ' . __('favorites') . ' · ' . $setlistCount . ' ' . __('setlists')) ?>
        </div>

        <!-- Card 3: Installs -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Active Installs') ?></div>
              <div class="stat-value"><?= number_format($totalInstalls) ?></div>
            </div>
            <div class="stat-icon" style="background:#e6f9f3; color:#05cd99;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </div>
          </div>
          <?= getTrendHtml(0, 0, 'all', $mainInstalls . ' ' . __('app') . ' · ' . $adminInstalls . ' ' . __('admin')) ?>
        </div>

        <!-- Card 4: Teams -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Teams') ?></div>
              <div class="stat-value"><?= number_format($teamCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#fff3e0; color:#ff9800;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <?= getTrendHtml($teamCount, $prevTeamCount, $period, $teamMemberCount . ' ' . __('team members total')) ?>
        </div>

        <!-- Card 5: Moderation -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Song Requests') ?></div>
              <div class="stat-value"><?= number_format($reqCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#ffebee; color:#f44336;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
          </div>
          <?= getTrendHtml($reqCount, $prevReqCount, $period, $pendingReqCount . ' ' . __('pending moderation')) ?>
        </div>

        <!-- Card 6: Push Notifications -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Push Subscriptions') ?></div>
              <div class="stat-value"><?= number_format($pushSubCount) ?></div>
            </div>
            <div class="stat-icon" style="background:#e8eaf6; color:#3f51b5;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
          </div>
          <?= getTrendHtml($pushSubCount, $prevPushSubCount, $period, count($recentPush) . ' ' . __('recent campaigns')) ?>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <!-- Top Artists -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line);">
            <h3 style="font-size:16px; font-weight:700;"><?= __('Top Artists') ?></h3>
          </div>
          <table>
            <thead><tr><th><?= __('Artist') ?></th><th><?= __('Songs') ?></th></tr></thead>
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
            <h3 style="font-size:16px; font-weight:700;"><?= __('Recent Registrations') ?></h3>
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
      <div class="table-card" style="margin-bottom:32px;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:16px; font-weight:700;"><?= __('Recently Added Songs') ?></h3>
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

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <!-- Top Viewed Songs -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line);">
            <h3 style="font-size:16px; font-weight:700;"><?= __('Top Viewed Songs') ?></h3>
          </div>
          <table>
            <thead><tr><th><?= __('Song') ?></th><th><?= __('Views') ?></th></tr></thead>
            <tbody>
              <?php foreach ($topViews as $s): ?>
              <tr>
                <td><strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong></td>
                <td><span class="badge badge-neutral"><?= number_format((int)$s['views']) ?></span></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($topViews)): ?>
              <tr><td colspan="2" style="text-align:center; padding:30px; color:var(--muted);"><?= __('No data') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>

        <!-- Top Favorited Songs -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line);">
            <h3 style="font-size:16px; font-weight:700;"><?= __('Most Favorited Songs') ?></h3>
          </div>
          <table>
            <thead><tr><th><?= __('Song') ?></th><th><?= __('Favorites') ?></th></tr></thead>
            <tbody>
              <?php foreach ($topFavorites as $s): ?>
              <tr>
                <td><strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong></td>
                <td><span class="badge badge-neutral" style="background:#fce7f3; color:#db2777;">♥ <?= number_format((int)$s['favs']) ?></span></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($topFavorites)): ?>
              <tr><td colspan="2" style="text-align:center; padding:30px; color:var(--muted);"><?= __('No data') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Push Notifications -->
      <div class="table-card" style="margin-bottom:32px;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:16px; font-weight:700;"><?= __('Recent Push Notifications') ?></h3>
          <a href="/admin_updates.php" class="btn btn-outline" style="padding:6px 12px; font-size:13px;"><?= __('Push Panel') ?> →</a>
        </div>
        <table>
          <thead><tr><th><?= __('Subject') ?></th><th><?= __('Message') ?></th><th><?= __('Delivered') ?></th><th><?= __('Date') ?></th></tr></thead>
          <tbody>
            <?php foreach ($recentPush as $p): ?>
            <tr>
              <td><strong><?= htmlspecialchars((string)($p['title'] ?? '—')) ?></strong></td>
              <td style="color:var(--muted); font-size:13px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><?= htmlspecialchars((string)($p['body'] ?? '—')) ?></td>
              <td><span class="badge" style="background:#dcfce7; color:#166534; font-weight:700;"><?= (int)($p['devices_count'] ?? 0) ?></span></td>
              <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($p['at'] ?? '—')) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php if (empty($recentPush)): ?>
            <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);"><?= __('No push notifications sent yet') ?></td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>
</body>
</html>
