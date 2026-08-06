<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/install_service.php';
require_once __DIR__ . '/version_config.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

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
$totalSongs = $totalUsers = $totalSetlists = $totalFavorites = $totalFriends = $pendingFriends = 0;
$lyricsCount = $chordsCount = $totalRequests = $pendingRequests = $totalPushSubs = 0;
$periodNewSongs = $periodPrevSongs = 0;
$periodNewUsers = $periodPrevUsers = 0;
$periodNewPushSubs = $periodPrevPushSubs = 0;
$periodNewRequests = $periodPrevRequests = 0;
$periodNewFriends = $periodPrevFriends = 0;
$activeUsers24h = $activeUsers7d = $activeUsers30d = 0;

$recentSongs = [];
$topArtists  = [];
$recentUsers = [];
$dbOk = false;

function getTrendHtml($current, $previous, $period, $supplementalHtml = '') {
    $supplDiv = $supplementalHtml ? '<div style="color:var(--muted); font-size:12px; font-weight:500; margin-top:4px; line-height:1.4;">' . $supplementalHtml . '</div>' : '';
    
    if ($period === 'all') {
        return '<div style="margin-top:8px;">' . $supplDiv . '</div>';
    }
    
    $periodLabels = [
        'daily' => __('այսօր'),
        'monthly' => __('այս ամիս'),
        'yearly' => __('այս տարի')
    ];
    $periodText = $periodLabels[$period] ?? '';
    
    if ($current == 0 && $previous == 0) {
        $trendDiv = '<div class="stat-trend" style="color:var(--muted);">' .
               '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>' .
               '0 ' . $periodText . '</div>';
        return '<div style="margin-top:8px; display:flex; flex-direction:column; gap:2px;">' . $trendDiv . $supplDiv . '</div>';
    }
    
    $growth = 0;
    if ($previous > 0) {
        $growth = (int)round((($current - $previous) / $previous) * 100);
    } elseif ($current > 0) {
        $growth = 100;
    }
    
    $sign = $growth > 0 ? '+' : '';
    $badgeText = ($current > 0 ? '+' . $current : (string)$current) . ' ' . $periodText;
    if ($previous > 0 && $growth != 0) {
        $badgeText .= ' (' . $sign . $growth . '%)';
    }
    
    $isUp = $growth >= 0;
    $trendClass = $isUp ? 'up' : 'down';
    $iconSvg = $isUp
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>';
    
    $trendDiv = '<div class="stat-trend ' . $trendClass . '">' . $iconSvg . htmlspecialchars($badgeText, ENT_QUOTES) . '</div>';
    
    return '<div style="margin-top:8px; display:flex; flex-direction:column; gap:2px;">' . $trendDiv . $supplDiv . '</div>';
}

try {
    $conn = wp_runtime_open_mysqli();
    $dbOk = true;

    $period = $_GET['period'] ?? 'all';
    $periodLabels = [
        'all'     => __('Ամբողջ Ժամանակ'),
        'daily'   => __('Օրական'),
        'monthly' => __('Ամսական'),
        'yearly'  => __('Տարեկան'),
    ];
    $periodLabel = $periodLabels[$period] ?? '';
    
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

    // 1. ALL-TIME TOTALS (Always stay accurate regardless of filter)
    $r = $conn->query("SELECT COUNT(*) FROM songs"); if($r){ $row=$r->fetch_row(); $totalSongs=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE lyrics IS NOT NULL AND TRIM(lyrics) != ''"); if($r){ $row=$r->fetch_row(); $lyricsCount=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE chords IS NOT NULL AND TRIM(chords) != ''"); if($r){ $row=$r->fetch_row(); $chordsCount=(int)($row[0]??0); }
    
    $lyricsPct = $totalSongs > 0 ? (int)round(($lyricsCount / $totalSongs) * 100) : 0;
    $chordsPct = $totalSongs > 0 ? (int)round(($chordsCount / $totalSongs) * 100) : 0;

    $r = $conn->query("SELECT COUNT(*) FROM users"); if($r){ $row=$r->fetch_row(); $totalUsers=(int)($row[0]??0); }

    // Active Users (sessions & web activity - 100% synced with Server Load page)
    $activeUsersOnline = $activeUsers24h = $activeUsers7d = $activeUsers30d = 0;
    $rSess = $conn->query("SHOW TABLES LIKE 'user_sessions'");
    $rWeb  = $conn->query("SHOW TABLES LIKE 'web_activity'");
    if (($rSess && $rSess->num_rows > 0) || ($rWeb && $rWeb->num_rows > 0)) {
        $sqlAudience = "
            SELECT
                SUM(currently_active = 1) AS online_now,
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
        ";
        $resAud = $conn->query($sqlAudience);
        if ($resAud && $rowAud = $resAud->fetch_assoc()) {
            $activeUsersOnline = (int)($rowAud['online_now'] ?? 0);
            $activeUsers24h    = (int)($rowAud['active_24h'] ?? 0);
            $activeUsers7d     = (int)($rowAud['active_7d'] ?? 0);
            $activeUsers30d    = (int)($rowAud['active_30d'] ?? 0);
        }
    }

    // Setlists & Favorites
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM setlists"); if($r2){ $row=$r2->fetch_row(); $totalSetlists=(int)($row[0]??0); }
    }

    // Friends
    $r = $conn->query("SHOW TABLES LIKE 'friends'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*), SUM(IF(status='pending', 1, 0)) FROM friends");
        if ($r2) { $row = $r2->fetch_row(); $totalFriends = (int)($row[0] ?? 0); $pendingFriends = (int)($row[1] ?? 0); }
    }

    // Push Subscriptions
    $pushFilter = "is_active = 1 AND permission_state = 'granted' AND TRIM(endpoint) <> '' AND TRIM(public_key) <> '' AND TRIM(auth_key) <> ''";
    $r = $conn->query("SHOW TABLES LIKE 'push_subscriptions'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM push_subscriptions WHERE $pushFilter"); if($r2){ $row=$r2->fetch_row(); $totalPushSubs=(int)($row[0]??0); }
    }

    // Moderation (Song Requests)
    $r = $conn->query("SHOW TABLES LIKE 'song_change_requests'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*), SUM(IF(status='pending', 1, 0)) FROM song_change_requests");
        if($r2){ $row=$r2->fetch_row(); $totalRequests=(int)($row[0]??0); $pendingRequests=(int)($row[1]??0); }
    }

    // Unified Favorites Query (user_favorites, favorites, favoritesuser)
    $existingFavTables = [];
    foreach (['user_favorites', 'favorites', 'favoritesuser'] as $tbl) {
        $r = $conn->query("SHOW TABLES LIKE '{$tbl}'");
        if ($r && $r->num_rows > 0) {
            $existingFavTables[] = $tbl;
        }
    }

    if (!empty($existingFavTables)) {
        $unionParts = [];
        foreach ($existingFavTables as $tbl) {
            $unionParts[] = "SELECT user_id, song_id FROM `{$tbl}` WHERE user_id > 0 AND song_id > 0";
        }
        $favSubquery = "(" . implode(" UNION ", $unionParts) . ") fav_combined";

        $r2 = $conn->query("SELECT COUNT(*) FROM {$favSubquery}");
        if ($r2) { $row = $r2->fetch_row(); $totalFavorites = (int)($row[0] ?? 0); }

        $topFavorites = [];
        $r2 = $conn->query("
            SELECT s.id, s.title, s.artist, COUNT(DISTINCT fav_combined.user_id) AS favs 
            FROM {$favSubquery}
            JOIN songs s ON fav_combined.song_id = s.id 
            GROUP BY fav_combined.song_id 
            ORDER BY favs DESC, s.id DESC LIMIT 10
        ");
        if ($r2) { while($row = $r2->fetch_assoc()) { $topFavorites[] = $row; } }
    }

    // 2. PERIOD-SPECIFIC NEW COUNTS
    if ($period !== 'all') {
        $r = $conn->query("SELECT COUNT(*) FROM songs $whereCreated"); if($r){ $row=$r->fetch_row(); $periodNewSongs=(int)($row[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM songs $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $periodPrevSongs=(int)($row[0]??0); }

        $r = $conn->query("SELECT COUNT(*) FROM users $whereCreated"); if($r){ $row=$r->fetch_row(); $periodNewUsers=(int)($row[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM users $wherePrevCreated"); if($r){ $row=$r->fetch_row(); $periodPrevUsers=(int)($row[0]??0); }

        $r = $conn->query("SHOW TABLES LIKE 'friends'");
        if ($r && $r->num_rows > 0) {
            $r2 = $conn->query("SELECT COUNT(*) FROM friends $whereCreated");
            if ($r2) { $row = $r2->fetch_row(); $periodNewFriends = (int)($row[0] ?? 0); }
            if ($wherePrevCreated !== '') {
                $r2 = $conn->query("SELECT COUNT(*) FROM friends $wherePrevCreated");
                if ($r2) { $row = $r2->fetch_row(); $periodPrevFriends = (int)($row[0] ?? 0); }
            }
        }

        $r = $conn->query("SHOW TABLES LIKE 'push_subscriptions'");
        if ($r && $r->num_rows > 0) {
            $r2 = $conn->query("SELECT COUNT(*) FROM push_subscriptions WHERE $pushFilter AND created_at >= DATE_SUB(NOW(), INTERVAL " . ($period === 'daily' ? '1 DAY' : ($period === 'monthly' ? '1 MONTH' : '1 YEAR')) . ")");
            if($r2){ $row=$r2->fetch_row(); $periodNewPushSubs=(int)($row[0]??0); }
        }
    }

    // Recent songs (filtered by period)
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs $whereCreated ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentSongs[] = $row; } }

    // Top artists by song count (filtered by period)
    $r = $conn->query("SELECT artist, COUNT(*) AS cnt FROM songs WHERE artist IS NOT NULL AND TRIM(artist) != '' $andCreated GROUP BY artist ORDER BY cnt DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $topArtists[] = $row; } }

    // Recent users (filtered by period)
    $r = $conn->query("SELECT id, name, email, created_at FROM users $whereCreated ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentUsers[] = $row; } }

    // Top Viewed Songs (filtered by period)
    $topViews = [];
    $r = $conn->query("SHOW TABLES LIKE 'recent_views'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("
            SELECT s.id, s.title, s.artist, COUNT(v.song_id) as views 
            FROM recent_views v 
            JOIN songs s ON v.song_id = s.id 
            $whereViewed
            GROUP BY v.song_id 
            ORDER BY views DESC LIMIT 10
        ");
        if ($r2) { while($row=$r2->fetch_assoc()) { $topViews[] = $row; } }
    }

    // Recent Push Campaigns (filtered by period)
    // Recent Push
    $r = $conn->query("SHOW TABLES LIKE 'push_history'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, body, devices_count, at FROM push_history $whereAt ORDER BY at DESC LIMIT 8");
        if ($r2) { while ($row = $r2->fetch_assoc()) { $recentPush[] = $row; } }
    }

    // Unified Notifications History (Songs, Users, Push, Requests)
    $allNotificationsHistory = [];

    $r = $conn->query("SELECT id, title, artist, created_at FROM songs ORDER BY id DESC LIMIT 15");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $allNotificationsHistory[] = [
                'type'    => 'song',
                'badge'   => '🎵 Նոր Երգ',
                'title'   => $row['title'] ?? 'Untitled',
                'sub'     => $row['artist'] ?? '',
                'time'    => $row['created_at'] ?? '',
                'link'    => '/songs.php'
            ];
        }
    }

    $r = $conn->query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 15");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $allNotificationsHistory[] = [
                'type'    => 'user',
                'badge'   => '👤 Նոր Օգտատեր',
                'title'   => $row['name'] ?? $row['email'] ?? 'User',
                'sub'     => $row['email'] ?? '',
                'time'    => $row['created_at'] ?? '',
                'link'    => '/admin_clients.php'
            ];
        }
    }

    $rPush = $conn->query("SHOW TABLES LIKE 'push_history'");
    if ($rPush && $rPush->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, body, devices_count, at FROM push_history ORDER BY id DESC LIMIT 15");
        if ($r2) {
            while ($row = $r2->fetch_assoc()) {
                $allNotificationsHistory[] = [
                    'type'    => 'push',
                    'badge'   => '📣 Push Ծանուցում',
                    'title'   => $row['title'] ?? 'Notification',
                    'sub'     => ($row['body'] ?? '') . ' (' . ($row['devices_count'] ?? 0) . ' devices)',
                    'time'    => $row['at'] ?? '',
                    'link'    => '/admin_updates.php'
                ];
            }
        }
    }

    $rReq = $conn->query("SHOW TABLES LIKE 'song_change_requests'");
    if ($rReq && $rReq->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, created_at FROM song_change_requests ORDER BY id DESC LIMIT 15");
        if ($r2) {
            while ($row = $r2->fetch_assoc()) {
                $allNotificationsHistory[] = [
                    'type'    => 'request',
                    'badge'   => '⚠️ Հայտ',
                    'title'   => $row['title'] ?? 'Song edit request',
                    'sub'     => 'Մոդերացիայի ենթակա հայտ',
                    'time'    => $row['created_at'] ?? '',
                    'link'    => '/admin_messages.php'
                ];
            }
        }
    }

    usort($allNotificationsHistory, fn($a, $b) => strcmp((string)$b['time'], (string)$a['time']));

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
  <?php wp_admin_render_pwa_head('Statistics — Worship Platform Admin'); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .metric-progress-bar { height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 6px; }
    .metric-progress-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <div class="page-heading page-heading-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h1><?= __('Statistics & Insights') ?></h1>
          <p><?= __('Worship Platform analytics, content metrics and user engagement') ?></p>
        </div>
        <div>
          <form method="get" action="admin_stats.php" style="margin:0;">
            <select name="period" class="input" style="width: auto; display: inline-block; padding: 10px 18px; border-radius: 12px; background: white; border: 1.5px solid var(--line); font-weight: 700; color: var(--text); cursor: pointer; box-shadow: var(--shadow-sm);" onchange="this.form.submit()">
              <option value="all" <?= $period === 'all' ? 'selected' : '' ?>><?= __('Ամբողջ Ժամանակ (All-Time)') ?></option>
              <option value="yearly" <?= $period === 'yearly' ? 'selected' : '' ?>><?= __('Տարեկան (Yearly)') ?></option>
              <option value="monthly" <?= $period === 'monthly' ? 'selected' : '' ?>><?= __('Ամսական (Monthly)') ?></option>
              <option value="daily" <?= $period === 'daily' ? 'selected' : '' ?>><?= __('Օրական (Daily)') ?></option>
            </select>
          </form>
        </div>
      </div>

        <!-- PRIMARY STAT CARDS GRID -->
        <div class="stats" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); margin-bottom: 28px; gap: 18px;">
          
          <!-- Card 1: Songs -->
          <div class="stat" style="margin-bottom:0;">
            <div class="stat-row">
              <div>
                <div class="stat-label"><?= __('Ընդհանուր Երգեր (Total Songs)') ?></div>
                <div class="stat-value"><?= number_format($totalSongs) ?></div>
              </div>
              <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
              </div>
            </div>
            <?= getTrendHtml($periodNewSongs, $periodPrevSongs, $period, number_format($lyricsCount) . ' ' . __('տեքստով') . ' (' . $lyricsPct . '%) · ' . number_format($chordsCount) . ' ' . __('Ակորդներով') . ' (' . $chordsPct . '%)') ?>
            <div class="metric-progress-bar" title="Lyrics coverage">
              <div class="metric-progress-fill" style="width: <?= $lyricsPct ?>%; background: var(--primary);"></div>
            </div>
          </div>

          <!-- Card 2: Users -->
          <div class="stat" style="margin-bottom:0;">
            <div class="stat-row">
              <div>
                <div class="stat-label"><?= __('Գրանցված Օգտատերեր (Users)') ?></div>
                <div class="stat-value"><?= number_format($totalUsers) ?></div>
              </div>
              <div class="stat-icon" style="background:#f3ebff; color:#7d40ff;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
            </div>
            <?= getTrendHtml($periodNewUsers, $periodPrevUsers, $period, ($activeUsers30d > 0 ? $activeUsers30d . ' ' . __('Ակտիվ (30 օր)') : number_format($totalFavorites) . ' ' . __('Նախընտրածներ') . ' · ' . number_format($totalSetlists) . ' ' . __('Ցանկեր'))) ?>
          </div>

          <!-- Card 3: Installs -->
          <div class="stat" style="margin-bottom:0;">
            <div class="stat-row">
              <div>
                <div class="stat-label"><?= __('Ակտիվ Տեղադրումներ (PWA Installs)') ?></div>
                <div class="stat-value"><?= number_format($totalInstalls) ?></div>
              </div>
              <div class="stat-icon" style="background:#e6f9f3; color:#05cd99;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              </div>
            </div>
            <?= getTrendHtml(0, 0, 'all', number_format($mainInstalls) . ' ' . __('Գլխավոր App') . ' · ' . number_format($adminInstalls) . ' ' . __('Admin App')) ?>
          </div>

          <!-- Card 4: Push Subscriptions -->
          <div class="stat" style="margin-bottom:0;">
            <div class="stat-row">
              <div>
                <div class="stat-label"><?= __('Push Բաժանորդագրություններ') ?></div>
                <div class="stat-value"><?= number_format($totalPushSubs) ?></div>
              </div>
              <div class="stat-icon" style="background:#e8eaf6; color:#3f51b5;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </div>
            </div>
            <?= getTrendHtml($periodNewPushSubs, $periodPrevPushSubs, $period, count($recentPush) . ' ' . __('վերջին ծանուցում')) ?>
          </div>

          <!-- Card 5: Setlists & Favorites -->
          <div class="stat" style="margin-bottom:0;">
            <div class="stat-row">
              <div>
                <div class="stat-label"><?= __('Երգացանկեր (Setlists)') ?></div>
                <div class="stat-value"><?= number_format($totalSetlists) ?></div>
              </div>
              <div class="stat-icon" style="background:#fff0f6; color:#e01e5a;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </div>
            </div>
            <?= getTrendHtml(0, 0, 'all', number_format($totalFavorites) . ' ' . __('պահպանված երգ նախընտրածներում')) ?>
          </div>

          <!-- Card 6: Friends & Moderation -->
          <div class="stat" style="margin-bottom:0;">
            <div class="stat-row">
              <div>
                <div class="stat-label"><?= __('Ընկերներ և Մոդերացիա') ?></div>
                <div class="stat-value"><?= number_format($totalFriends) ?></div>
              </div>
              <div class="stat-icon" style="background:#fff3e0; color:#ff9800;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
            </div>
            <?= getTrendHtml($periodNewFriends, $periodPrevFriends, $period, number_format($pendingRequests) . ' ' . __('սպասման մեջ երգի հարցում') . ' · ' . number_format($pendingFriends) . ' ' . __('ընկերության հայտ')) ?>
          </div>

        </div>

        <!-- DEEP ANALYTICS METRIC WIDGETS -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <!-- Widget 1: Engagement & Active Users (Dynamic by Filter Period) -->
          <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid var(--line); box-shadow: var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:14px; margin-bottom:18px;">
              <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Օգտատերերի Ակտիվություն (User Engagement)') ?></h3>
              <span class="chip primary" style="font-weight:700; font-size:11px;">
                <?= $period === 'daily' ? __('Օրական Լսարան (Daily)') : ($period === 'monthly' ? __('Ամսական Լսարան (Monthly)') : ($period === 'yearly' ? __('Տարեկան Լսարան (Yearly)') : __('Ամբողջ Ժամանակ (All-Time)'))) ?>
              </span>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px;">
              <?php if ($period === 'daily'): ?>
                <div style="background:#e6f9f3; padding:12px 10px; border-radius:12px; border:1px solid #b7ebde;">
                  <div style="font-size:11px; color:#047857; font-weight:700; text-transform:uppercase;"><?= __('Առցանց') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsersOnline) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Այսօր Ակտիվ (24h)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:var(--primary); margin-top:4px;"><?= number_format($activeUsers24h) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Նոր Օգտատեր') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#7d40ff; margin-top:4px;"><?= number_format($periodNewUsers) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Նոր Երգ') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#e01e5a; margin-top:4px;"><?= number_format($periodNewSongs) ?></div>
                </div>
              <?php elseif ($period === 'monthly'): ?>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('DAU (24h)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:var(--primary); margin-top:4px;"><?= number_format($activeUsers24h) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('WAU (7d)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#7d40ff; margin-top:4px;"><?= number_format($activeUsers7d) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('MAU (30d)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsers30d) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Նոր Օգտատեր') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#ff9800; margin-top:4px;"><?= number_format($periodNewUsers) ?></div>
                </div>
              <?php elseif ($period === 'yearly'): ?>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('MAU (30d)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsers30d) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Նոր Օգտատեր') ?></div>
                  <div style="font-size:20px; font-weight:800; color:var(--primary); margin-top:4px;"><?= number_format($periodNewUsers) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Նոր Երգեր') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#7d40ff; margin-top:4px;"><?= number_format($periodNewSongs) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('Տեղադրումներ') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#ff9800; margin-top:4px;"><?= number_format($totalInstalls) ?></div>
                </div>
              <?php else: ?>
                <div style="background:#e6f9f3; padding:12px 10px; border-radius:12px; border:1px solid #b7ebde;">
                  <div style="font-size:11px; color:#047857; font-weight:700; text-transform:uppercase;"><?= __('Առցանց') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsersOnline) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('DAU (24h)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:var(--primary); margin-top:4px;"><?= number_format($activeUsers24h) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('WAU (7d)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#7d40ff; margin-top:4px;"><?= number_format($activeUsers7d) ?></div>
                </div>
                <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
                  <div style="font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase;"><?= __('MAU (30d)') ?></div>
                  <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsers30d) ?></div>
                </div>
              <?php endif; ?>
            </div>

            <?php 
              $ratioPct = 0;
              if ($period === 'daily') {
                  $ratioPct = $totalUsers > 0 ? min(100, round(($activeUsers24h / $totalUsers) * 100, 1)) : 0;
                  $ratioText = __('Օրական ակտիվությունը ընդհանուր գրանցվածների նկատմամբ');
              } elseif ($period === 'monthly') {
                  $ratioPct = $totalUsers > 0 ? min(100, round(($activeUsers30d / $totalUsers) * 100, 1)) : 0;
                  $ratioText = __('Ամսական ակտիվությունը ընդհանուր գրանցվածների նկատմամբ');
              } elseif ($period === 'yearly') {
                  $ratioPct = $totalUsers > 0 ? min(100, round(($periodNewUsers / $totalUsers) * 100, 1)) : 0;
                  $ratioText = __('Տարեկան նոր գրանցումների աճի հարաբերակցությունը');
              } else {
                  $ratioPct = $totalUsers > 0 ? min(100, round(($activeUsers30d / $totalUsers) * 100, 1)) : 0;
                  $ratioText = __('Ակտիվ լսարան (100% համադրված Սերվերի էջի հետ)');
              }
            ?>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                  <span><?= htmlspecialchars($ratioText) ?></span>
                  <span style="color:var(--primary);"><?= $ratioPct ?>%</span>
                </div>
                <div class="metric-progress-bar">
                  <div class="metric-progress-fill" style="width: <?= $ratioPct ?>%; background: var(--primary);"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Widget 2: Content Quality & Platform Stats -->
          <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid var(--line); box-shadow: var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:14px; margin-bottom:18px;">
              <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Բովանդակության Որակ և Հարստություն') ?></h3>
              <span class="chip success" style="font-weight:700; font-size:11px;"><?= number_format($totalSongs) ?> Երգ</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                  <span>📱 <?= __('Տեքստով ապահովված երգեր (Lyrics Coverage)') ?></span>
                  <span style="color:var(--primary);"><?= number_format($lyricsCount) ?> (<?= $lyricsPct ?>%)</span>
                </div>
                <div class="metric-progress-bar">
                  <div class="metric-progress-fill" style="width: <?= $lyricsPct ?>%; background: #228fff;"></div>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                  <span>🎸 <?= __('Ակորդներով ապահովված երգեր (Chords Coverage)') ?></span>
                  <span style="color:#7d40ff;"><?= number_format($chordsCount) ?> (<?= $chordsPct ?>%)</span>
                </div>
                <div class="metric-progress-bar">
                  <div class="metric-progress-fill" style="width: <?= $chordsPct ?>%; background: #7d40ff;"></div>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px 14px; border-radius:10px; margin-top:4px;">
                <span style="font-size:13px; color:var(--muted); font-weight:600;"><?= __('Միջինը նախընտրած երգեր 1 օգտատիրոջ հաշվով') ?></span>
                <strong style="font-size:14px; color:var(--text);"><?= $totalUsers > 0 ? round($totalFavorites / $totalUsers, 1) : 0 ?></strong>
              </div>
            </div>
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
          <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Ամենաշատ Դիտված Երգերը') ?></h3>
            <span style="font-size:12px; color:var(--muted); font-weight:600;"><?= $period === 'all' ? __('Ամբողջ ընթացքում') : $periodLabel ?></span>
          </div>
          <table>
            <thead><tr><th style="width:40px;">#</th><th><?= __('Երգ և Հեղինակ') ?></th><th style="text-align:right;"><?= __('Դիտումներ') ?></th></tr></thead>
            <tbody>
              <?php $idx = 1; foreach ($topViews as $s): ?>
              <tr>
                <td style="color:var(--muted); font-size:13px; font-weight:700;"><?= $idx++ ?></td>
                <td>
                  <strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong>
                  <?php if (!empty($s['artist'])): ?>
                    <div style="font-size:12px; color:var(--muted); margin-top:2px;"><?= htmlspecialchars((string)$s['artist']) ?></div>
                  <?php endif; ?>
                </td>
                <td style="text-align:right;"><span class="badge badge-neutral" style="font-weight:700; font-size:13px;"><?= number_format((int)$s['views']) ?></span></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($topViews)): ?>
              <tr><td colspan="3" style="text-align:center; padding:30px; color:var(--muted);"><?= __('Տվյալներ դեռ չկան (No view data)') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>

        <!-- Top Favorited Songs -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Ամենաշատ Նախընտրած Երգերը') ?></h3>
            <span style="font-size:12px; color:var(--muted); font-weight:600;"><?= $period === 'all' ? __('Ամբողջ ընթացքում') : $periodLabel ?></span>
          </div>
          <table>
            <thead><tr><th style="width:40px;">#</th><th><?= __('Երգ և Հեղինակ') ?></th><th style="text-align:right;"><?= __('Նախընտրածներ') ?></th></tr></thead>
            <tbody>
              <?php $idx = 1; foreach ($topFavorites as $s): ?>
              <tr>
                <td style="color:var(--muted); font-size:13px; font-weight:700;"><?= $idx++ ?></td>
                <td>
                  <strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong>
                  <?php if (!empty($s['artist'])): ?>
                    <div style="font-size:12px; color:var(--muted); margin-top:2px;"><?= htmlspecialchars((string)$s['artist']) ?></div>
                  <?php endif; ?>
                </td>
                <td style="text-align:right;"><span class="badge" style="background:#fce7f3; color:#db2777; font-weight:700; font-size:13px;">♥ <?= number_format((int)$s['favs']) ?></span></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($topFavorites)): ?>
              <tr><td colspan="3" style="text-align:center; padding:30px; color:var(--muted);"><?= __('Տվյալներ դեռ չկան (No favorites data)') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Unified Notifications & Activity History -->
      <div class="table-card" id="notifications_history" style="margin-bottom:32px;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Ծանուցումների և Իրադարձությունների Ամբողջական Պատմություն') ?></h3>
          <span class="chip primary" style="font-weight:700; font-size:11px;"><?= count($allNotificationsHistory) ?> <?= __('Իրադարձություն') ?></span>
        </div>
        <table>
          <thead>
            <tr><th><?= __('Տեսակ') ?></th><th><?= __('Վերնագիր / Նկարագրություն') ?></th><th><?= __('Լրացուցիչ') ?></th><th style="text-align:right;"><?= __('Ամսաթիվ') ?></th></tr>
          </thead>
          <tbody>
            <?php foreach ($allNotificationsHistory as $item): ?>
            <tr style="cursor:pointer;" onclick="window.location.href='<?= htmlspecialchars($item['link']) ?>'">
              <td style="width:140px;"><span class="badge badge-neutral" style="font-weight:700; font-size:12px;"><?= htmlspecialchars($item['badge']) ?></span></td>
              <td><strong><?= htmlspecialchars((string)($item['title'] ?? '—')) ?></strong></td>
              <td style="color:var(--muted); font-size:13px; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><?= htmlspecialchars((string)($item['sub'] ?? '—')) ?></td>
              <td style="text-align:right; color:var(--muted); font-size:13px; font-weight:600;"><?= htmlspecialchars((string)($item['time'] ?? '—')) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php if (empty($allNotificationsHistory)): ?>
            <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);"><?= __('Ծանուցումների պատմություն դեռ չկա') ?></td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>

      <!-- Recent Push Notifications -->
      <div class="table-card" id="push_history" style="margin-bottom:32px;">
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
