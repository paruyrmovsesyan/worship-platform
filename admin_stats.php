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
$lyricsCount = $chordsCount = $totalRequests = $pendingRequests = 0;
$totalPushSubs = $mainPushSubs = $adminPushSubs = 0;
$totalInstalls = $mainInstalls = $adminInstalls = 0;
$totalChats = $totalNews = 0;

$periodNewSongs = $periodPrevSongs = 0;
$periodNewUsers = $periodPrevUsers = 0;
$periodNewPushSubs = $periodPrevPushSubs = 0;
$periodNewInstalls = $periodPrevInstalls = 0;
$periodNewFavorites = $periodPrevFavorites = 0;
$periodNewRequests = $periodPrevRequests = 0;
$periodNewFriends = $periodPrevFriends = 0;

$activeUsersOnline = $activeUsers24h = $activeUsers7d = $activeUsers30d = $uniqueTrackedVisitors = 0;

$recentSongs = [];
$topArtists  = [];
$recentUsers = [];
$topViews = [];
$topFavorites = [];
$recentPush = [];
$allNotificationsHistory = [];
$dbOk = false;

if (!function_exists('getTrendHtml')) {
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
}

try {
    $conn = wp_runtime_open_mysqli();
    $dbOk = true;

    $period = $_GET['period'] ?? 'all';
    if (!in_array($period, ['all', 'daily', 'monthly', 'yearly'], true)) {
        $period = 'all';
    }

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

    // 1. SONGS METRICS
    $r = $conn->query("SELECT COUNT(*) FROM songs"); if($r){ $row=$r->fetch_row(); $totalSongs=(int)($row[0]??0); }
    $r = $conn->query("SELECT COUNT(*) FROM songs WHERE lyrics IS NOT NULL AND TRIM(lyrics) != ''"); if($r){ $row=$r->fetch_row(); $lyricsCount=(int)($row[0]??0); }
    
    // Safely check if chords column exists
    $hasChordsCol = false;
    $colRes = $conn->query("SHOW COLUMNS FROM songs LIKE 'chords'");
    if ($colRes && $colRes->num_rows > 0) {
        $hasChordsCol = true;
        $r = $conn->query("SELECT COUNT(*) FROM songs WHERE chords IS NOT NULL AND TRIM(chords) != ''");
        if ($r) { $row=$r->fetch_row(); $chordsCount=(int)($row[0]??0); }
    }
    
    $lyricsPct = $totalSongs > 0 ? (int)round(($lyricsCount / $totalSongs) * 100) : 0;
    $chordsPct = $totalSongs > 0 ? (int)round(($chordsCount / $totalSongs) * 100) : 0;

    // 2. USERS METRICS
    $r = $conn->query("SELECT COUNT(*) FROM users"); if($r){ $row=$r->fetch_row(); $totalUsers=(int)($row[0]??0); }

    // 3. AUDIENCE & ONLINE (Heartbeat synced with server load page)
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

        $rTracked = $conn->query("SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, 0), device_key, visitor_key)) FROM web_activity");
        if ($rTracked) { $uniqueTrackedVisitors = (int)($rTracked->fetch_row()[0] ?? 0); }
    }

    // 4. INSTALLS (from install_stats table or install_service)
    $rInst = $conn->query("SHOW TABLES LIKE 'install_stats'");
    if ($rInst && $rInst->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*), SUM(IF(scope='main', 1, 0)), SUM(IF(scope='admin', 1, 0)) FROM install_stats");
        if ($r2 && $row = $r2->fetch_row()) {
            $totalInstalls = (int)($row[0] ?? 0);
            $mainInstalls  = (int)($row[1] ?? 0);
            $adminInstalls = (int)($row[2] ?? 0);
        }
    }
    if ($totalInstalls === 0) {
        try {
            $installStatsObj = wp_install_stats();
            $mainInstalls  = (int)($installStatsObj['main']['count'] ?? 0);
            $adminInstalls = (int)($installStatsObj['admin']['count'] ?? 0);
            $totalInstalls = (int)($installStatsObj['total'] ?? 0);
        } catch (Throwable $e) {}
    }

    // 5. PUSH SUBSCRIPTIONS
    $pushFilter = "is_active = 1 AND permission_state = 'granted' AND TRIM(endpoint) <> ''";
    $rPush = $conn->query("SHOW TABLES LIKE 'push_subscriptions'");
    if ($rPush && $rPush->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*), SUM(IF(device_scope='main', 1, 0)), SUM(IF(device_scope='admin', 1, 0)) FROM push_subscriptions WHERE $pushFilter");
        if ($r2 && $row = $r2->fetch_row()) {
            $totalPushSubs = (int)($row[0] ?? 0);
            $mainPushSubs  = (int)($row[1] ?? 0);
            $adminPushSubs = (int)($row[2] ?? 0);
        }
    }

    // 6. FAVORITES
    $rFav = $conn->query("SHOW TABLES LIKE 'favorites'");
    if ($rFav && $rFav->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM favorites");
        if ($r2) { $totalFavorites = (int)($r2->fetch_row()[0] ?? 0); }

        $r2 = $conn->query("
            SELECT s.id, s.title, s.artist, COUNT(f.id) AS favs 
            FROM favorites f 
            JOIN songs s ON f.song_id = s.id 
            GROUP BY f.song_id 
            ORDER BY favs DESC, s.id DESC LIMIT 10
        ");
        if ($r2) { while($row = $r2->fetch_assoc()) { $topFavorites[] = $row; } }
    }

    // 7. SETLISTS & CHATS
    $r = $conn->query("SHOW TABLES LIKE 'setlists'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM setlists"); if($r2){ $row=$r2->fetch_row(); $totalSetlists=(int)($row[0]??0); }
    }
    $rChats = $conn->query("SHOW TABLES LIKE 'chats'");
    if ($rChats && $rChats->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM chats"); if($r2){ $totalChats=(int)($r2->fetch_row()[0]??0); }
    }

    // 8. FRIENDS & MODERATION
    $r = $conn->query("SHOW TABLES LIKE 'friends'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*), SUM(IF(status='pending', 1, 0)) FROM friends");
        if ($r2) { $row = $r2->fetch_row(); $totalFriends = (int)($row[0] ?? 0); $pendingFriends = (int)($row[1] ?? 0); }
    }
    $r = $conn->query("SHOW TABLES LIKE 'song_change_requests'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*), SUM(IF(status='pending', 1, 0)) FROM song_change_requests");
        if($r2){ $row=$r2->fetch_row(); $totalRequests=(int)($row[0]??0); $pendingRequests=(int)($row[1]??0); }
    }

    // 9. NEWS ARTICLES
    $rNews = $conn->query("SHOW TABLES LIKE 'news_articles'");
    if ($rNews && $rNews->num_rows > 0) {
        $r2 = $conn->query("SELECT COUNT(*) FROM news_articles"); if($r2){ $totalNews=(int)($r2->fetch_row()[0]??0); }
    }

    // 10. PERIOD-SPECIFIC COUNTS & BENCHMARKS
    if ($period !== 'all') {
        // Songs
        $r = $conn->query("SELECT COUNT(*) FROM songs $whereCreated"); if($r){ $periodNewSongs=(int)($r->fetch_row()[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM songs $wherePrevCreated"); if($r){ $periodPrevSongs=(int)($r->fetch_row()[0]??0); }

        // Users
        $r = $conn->query("SELECT COUNT(*) FROM users $whereCreated"); if($r){ $periodNewUsers=(int)($r->fetch_row()[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM users $wherePrevCreated"); if($r){ $periodPrevUsers=(int)($r->fetch_row()[0]??0); }

        // Installs
        $whereInst = str_replace('created_at', 'installed_at', $whereCreated);
        $wherePrevInst = str_replace('created_at', 'installed_at', $wherePrevCreated);
        $r = $conn->query("SELECT COUNT(*) FROM install_stats $whereInst"); if($r){ $periodNewInstalls=(int)($r->fetch_row()[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM install_stats $wherePrevInst"); if($r){ $periodPrevInstalls=(int)($r->fetch_row()[0]??0); }

        // Push Subs
        $wherePush = $whereCreated ? "$whereCreated AND $pushFilter" : "WHERE $pushFilter";
        $wherePrevPush = $wherePrevCreated ? "$wherePrevCreated AND $pushFilter" : "WHERE $pushFilter";
        $r = $conn->query("SELECT COUNT(*) FROM push_subscriptions $wherePush"); if($r){ $periodNewPushSubs=(int)($r->fetch_row()[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM push_subscriptions $wherePrevPush"); if($r){ $periodPrevPushSubs=(int)($r->fetch_row()[0]??0); }

        // Favorites
        $r = $conn->query("SELECT COUNT(*) FROM favorites $whereCreated"); if($r){ $periodNewFavorites=(int)($r->fetch_row()[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM favorites $wherePrevCreated"); if($r){ $periodPrevFavorites=(int)($r->fetch_row()[0]??0); }

        // Friends
        $r = $conn->query("SELECT COUNT(*) FROM friends $whereCreated"); if($r){ $periodNewFriends=(int)($r->fetch_row()[0]??0); }
        $r = $conn->query("SELECT COUNT(*) FROM friends $wherePrevCreated"); if($r){ $periodPrevFriends=(int)($r->fetch_row()[0]??0); }
    }

    // Recent songs (filtered by period)
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs $whereCreated ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentSongs[] = $row; } }

    // Top artists by song count (filtered by period)
    $r = $conn->query("SELECT artist, COUNT(*) AS cnt FROM songs WHERE artist IS NOT NULL AND TRIM(artist) != '' $andCreated GROUP BY artist ORDER BY cnt DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $topArtists[] = $row; } }

    // Recent users (filtered by period)
    $r = $conn->query("SELECT id, name, username, email, role, created_at FROM users $whereCreated ORDER BY id DESC LIMIT 10");
    if ($r) { while($row=$r->fetch_assoc()) { $recentUsers[] = $row; } }

    // Top Viewed Songs (filtered by period)
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
    $r = $conn->query("SHOW TABLES LIKE 'push_history'");
    if ($r && $r->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, body, devices_count, at FROM push_history $whereAt ORDER BY at DESC LIMIT 8");
        if ($r2) { while ($row = $r2->fetch_assoc()) { $recentPush[] = $row; } }
    }

    // Unified Notifications & Events History
    $r = $conn->query("SELECT id, title, artist, created_at FROM songs ORDER BY id DESC LIMIT 12");
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

    $r = $conn->query("SELECT id, name, username, email, created_at FROM users ORDER BY id DESC LIMIT 12");
    if ($r) {
        while ($row = $r->fetch_assoc()) {
            $allNotificationsHistory[] = [
                'type'    => 'user',
                'badge'   => '👤 Նոր Օգտատեր',
                'title'   => $row['name'] ?: ($row['username'] ?: ($row['email'] ?? 'User')),
                'sub'     => $row['email'] ?? '',
                'time'    => $row['created_at'] ?? '',
                'link'    => '/admin_clients.php'
            ];
        }
    }

    if (!empty($recentPush)) {
        foreach ($recentPush as $row) {
            $allNotificationsHistory[] = [
                'type'    => 'push',
                'badge'   => '📣 Push Ծանուցում',
                'title'   => $row['title'] ?? 'Notification',
                'sub'     => ($row['body'] ?? '') . ' (' . (int)($row['devices_count'] ?? 0) . ' ' . __('սարք') . ')',
                'time'    => $row['at'] ?? '',
                'link'    => '/admin_updates.php'
            ];
        }
    }

    $rReq = $conn->query("SHOW TABLES LIKE 'song_change_requests'");
    if ($rReq && $rReq->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title, created_at FROM song_change_requests ORDER BY id DESC LIMIT 10");
        if ($r2) {
            while ($row = $r2->fetch_assoc()) {
                $allNotificationsHistory[] = [
                    'type'    => 'request',
                    'badge'   => '⚠️ Հայտ',
                    'title'   => $row['title'] ?? 'Song edit request',
                    'sub'     => __('Մոդերացիայի ենթակա հայտ'),
                    'time'    => $row['created_at'] ?? '',
                    'link'    => '/admin_messages.php'
                ];
            }
        }
    }

    if ($rNews && $rNews->num_rows > 0) {
        $r2 = $conn->query("SELECT id, title_hy, release_version, published_at, created_at FROM news_articles ORDER BY id DESC LIMIT 10");
        if ($r2) {
            while ($row = $r2->fetch_assoc()) {
                $allNotificationsHistory[] = [
                    'type'    => 'news',
                    'badge'   => '📰 Նորություն',
                    'title'   => $row['title_hy'] ?? 'Նորություն',
                    'sub'     => $row['release_version'] ? __('Թողարկում՝') . ' ' . $row['release_version'] : __('Հրապարակված հոդված'),
                    'time'    => $row['published_at'] ?? $row['created_at'] ?? '',
                    'link'    => '/admin_news.php'
                ];
            }
        }
    }

    usort($allNotificationsHistory, fn($a, $b) => strcmp((string)$b['time'], (string)$a['time']));

    $conn->close();
} catch (Throwable $e) {
    $dbOk = false;
}

$activePage = 'statistics';
$searchPlaceholder = 'Search stats...';
?>
<!doctype html>
<html lang="hy">
<head>
  <?php wp_admin_render_pwa_head('Statistics & Insights — Worship Platform Admin'); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .metric-progress-bar { height: 7px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 6px; }
    .metric-progress-fill { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
    
    .period-tabs {
      display: inline-flex;
      background: var(--card-bg, #fff);
      border: 1.5px solid var(--line, #e2e8f0);
      border-radius: 14px;
      padding: 4px;
      gap: 4px;
      box-shadow: var(--shadow-sm);
    }
    .period-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      color: var(--muted, #64748b);
      text-decoration: none;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .period-tab:hover {
      color: var(--text, #1e293b);
      background: rgba(0,0,0,0.04);
    }
    .period-tab.active {
      background: var(--primary, #228fff);
      color: #fff;
      font-weight: 800;
      box-shadow: 0 2px 8px rgba(34, 143, 255, 0.35);
    }
    .period-tab svg { width: 15px; height: 15px; stroke-width: 2.2; }

    .period-desc-banner {
      background: #f8fafc;
      border: 1px solid var(--line, #e2e8f0);
      border-radius: 14px;
      padding: 12px 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 800;
    }
    .rank-1 { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .rank-2 { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .rank-3 { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
    .rank-other { background: transparent; color: var(--muted, #94a3b8); font-weight: 700; }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 768px) {
      .period-tabs { width: 100%; overflow-x: auto; }
      .period-tab { padding: 8px 12px; font-size: 12px; }
    }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <!-- HEADER & PERIOD SELECTOR -->
      <div class="page-heading page-heading-row" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; flex-wrap: wrap;">
        <div>
          <h1 style="display: flex; align-items: center; gap: 10px; margin: 0 0 6px 0;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <?= __('Statistics & Insights') ?>
          </h1>
          <p style="margin: 0; color: var(--muted);"><?= __('Worship Platform իրական վիճակագրություն, լսարանի ակտիվություն և բովանդակության ցուցանիշներ') ?></p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="period-tabs">
            <a href="?period=all" class="period-tab <?= $period === 'all' ? 'active' : '' ?>">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <?= __('Ամբողջ Ժամանակ') ?>
            </a>
            <a href="?period=daily" class="period-tab <?= $period === 'daily' ? 'active' : '' ?>">
              <?= __('Օրական (24ժ)') ?>
            </a>
            <a href="?period=monthly" class="period-tab <?= $period === 'monthly' ? 'active' : '' ?>">
              <?= __('Ամսական (30օր)') ?>
            </a>
            <a href="?period=yearly" class="period-tab <?= $period === 'yearly' ? 'active' : '' ?>">
              <?= __('Տարեկան') ?>
            </a>
          </div>

          <button onclick="window.location.reload();" class="btn btn-outline" style="padding: 9px 14px; border-radius: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;" title="<?= __('Թարմացնել տվյալները') ?>">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
            <?= __('Թարմացնել') ?>
          </button>
        </div>
      </div>

      <!-- PERIOD CONTEXT BANNER -->
      <div class="period-desc-banner">
        <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text);">
          <?php if ($period === 'daily'): ?>
            <span>📅 <strong><?= __('Օրական ռեժիմ') ?>:</strong> <?= __('Ցուցադրվում են վերջին 24 ժամվա նոր տվյալները, ակտիվությունը և աճի դինամիկան նախորդ օրվա համեմատ:') ?></span>
          <?php elseif ($period === 'monthly'): ?>
            <span>📆 <strong><?= __('Ամսական ռեժիմ') ?>:</strong> <?= __('Ցուցադրվում են վերջին 30 օրվա նոր գրանցումները, լսարանի ակտիվությունը և աճի տեմպը նախորդ ամսվա համեմատ:') ?></span>
          <?php elseif ($period === 'yearly'): ?>
            <span>📈 <strong><?= __('Տարեկան ռեժիմ') ?>:</strong> <?= __('Ցուցադրվում են վերջին 1 տարվա (365 օր) ընդհանուր զարգացման և տարեկան աճի ցուցանիշները:') ?></span>
          <?php else: ?>
            <span>📊 <strong><?= __('Ամբողջ Ժամանակ') ?>:</strong> <?= __('Ցուցադրվում են հարթակի հիմնադրման պահից սկսած բոլոր կուտակված տվյալներն ու ճշգրիտ ընդհանուր ցուցանիշները:') ?></span>
          <?php endif; ?>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: var(--muted);">
          <?= __('Թարմացվել է՝') ?> <?= date('Y-m-d H:i') ?>
        </div>
      </div>

      <!-- PRIMARY STAT CARDS GRID -->
      <div class="stats" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); margin-bottom: 28px; gap: 18px;">
        
        <!-- Card 1: Songs -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Ընդհանուր Երգեր (Songs)') ?></div>
              <div class="stat-value"><?= number_format($totalSongs) ?></div>
            </div>
            <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          </div>
          <?= getTrendHtml($periodNewSongs, $periodPrevSongs, $period, number_format($lyricsCount) . ' ' . __('տեքստով') . ' (' . $lyricsPct . '%) · ' . number_format($chordsCount) . ' ' . __('Ակորդներով') . ' (' . $chordsPct . '%)') ?>
          <div class="metric-progress-bar" title="<?= __('Lyrics coverage') ?>">
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
          <?= getTrendHtml($periodNewUsers, $periodPrevUsers, $period, ($activeUsers30d > 0 ? $activeUsers30d . ' ' . __('ակտիվ (30 օր)') : ($uniqueTrackedVisitors > 0 ? $uniqueTrackedVisitors . ' ' . __('այցելու') : __('Գրանցված համակարգում')))) ?>
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
          <?= getTrendHtml($periodNewInstalls, $periodPrevInstalls, $period, number_format($mainInstalls) . ' ' . __('Գլխավոր App') . ' · ' . number_format($adminInstalls) . ' ' . __('Admin App')) ?>
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
          <?= getTrendHtml($periodNewPushSubs, $periodPrevPushSubs, $period, number_format($mainPushSubs) . ' ' . __('Գլխավոր') . ' · ' . count($recentPush) . ' ' . __('ուղարկված արշավ')) ?>
        </div>

        <!-- Card 5: Favorites & Bookmarks -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Նախընտրած Երգեր (Favorites)') ?></div>
              <div class="stat-value"><?= number_format($totalFavorites) ?></div>
            </div>
            <div class="stat-icon" style="background:#fff0f6; color:#e01e5a;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
          </div>
          <?php 
            $favNote = $totalUsers > 0 ? (round($totalFavorites / $totalUsers, 1) . ' ' . __('միջինը 1 օգտատիրոջ հաշվով')) : ($totalFavorites . ' ' . __('պահպանված երգ'));
            if ($totalSetlists > 0) { $favNote .= ' · ' . number_format($totalSetlists) . ' ' . __('ցանկ'); }
          ?>
          <?= getTrendHtml($periodNewFavorites, $periodPrevFavorites, $period, $favNote) ?>
        </div>

        <!-- Card 6: Friends & Moderation -->
        <div class="stat" style="margin-bottom:0;">
          <div class="stat-row">
            <div>
              <div class="stat-label"><?= __('Շփում և Մոդերացիա') ?></div>
              <div class="stat-value"><?= number_format($totalFriends) ?></div>
            </div>
            <div class="stat-icon" style="background:#fff3e0; color:#ff9800;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <?php
            $commParts = [];
            if ($pendingRequests > 0) { $commParts[] = $pendingRequests . ' ' . __('սպասող հայտ'); }
            if ($pendingFriends > 0) { $commParts[] = $pendingFriends . ' ' . __('ընկերության հայտ'); }
            if ($totalChats > 0) { $commParts[] = $totalChats . ' ' . __('չատ'); }
            $commNote = !empty($commParts) ? implode(' · ', $commParts) : __('Համայնքային կապեր և հայտեր');
          ?>
          <?= getTrendHtml($periodNewFriends, $periodPrevFriends, $period, $commNote) ?>
        </div>

      </div>

      <!-- DEEP ANALYTICS METRIC WIDGETS -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; margin-bottom: 32px;">
        
        <!-- Widget 1: Engagement & Active Users -->
        <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid var(--line); box-shadow: var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:14px; margin-bottom:18px;">
            <h3 style="font-size:16px; font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              <?= __('Օգտատերերի Ակտիվություն (User Engagement)') ?>
            </h3>
            <span class="chip primary" style="font-weight:700; font-size:11px;">
              <?= $period === 'daily' ? __('Օրական Լսարան (Daily)') : ($period === 'monthly' ? __('Ամսական Լսարան (Monthly)') : ($period === 'yearly' ? __('Տարեկան Լսարան (Yearly)') : __('Ամբողջ Ժամանակ (All-Time)'))) ?>
            </span>
          </div>
          
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px;">
            <div style="background:#e6f9f3; padding:12px 10px; border-radius:12px; border:1px solid #b7ebde;">
              <div style="font-size:11px; color:#047857; font-weight:700; text-transform:uppercase;"><?= __('Առցանց') ?></div>
              <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsersOnline) ?></div>
            </div>
            <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
              <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;"><?= __('DAU (24h)') ?></div>
              <div style="font-size:20px; font-weight:800; color:var(--primary); margin-top:4px;"><?= number_format($activeUsers24h) ?></div>
            </div>
            <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
              <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;"><?= __('WAU (7d)') ?></div>
              <div style="font-size:20px; font-weight:800; color:#7d40ff; margin-top:4px;"><?= number_format($activeUsers7d) ?></div>
            </div>
            <div style="background:#f8fafc; padding:12px 10px; border-radius:12px; border:1px solid #e2e8f0;">
              <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;"><?= __('MAU (30d)') ?></div>
              <div style="font-size:20px; font-weight:800; color:#05cd99; margin-top:4px;"><?= number_format($activeUsers30d) ?></div>
            </div>
          </div>

          <?php 
            $stickinessRatio = $activeUsers30d > 0 ? min(100, round(($activeUsers24h / $activeUsers30d) * 100, 1)) : 0;
            $userRatioPct = $totalUsers > 0 ? min(100, round(($activeUsers30d / $totalUsers) * 100, 1)) : 0;
          ?>
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                <span><?= __('DAU / MAU Stickiness (Օգտատերերի վերադարձի հաճախականություն)') ?></span>
                <span style="color:var(--primary); font-weight:700;"><?= $stickinessRatio ?>%</span>
              </div>
              <div class="metric-progress-bar">
                <div class="metric-progress-fill" style="width: <?= $stickinessRatio ?>%; background: var(--primary);"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                <span><?= __('Ակտիվ լսարանը գրանցվածների նկատմամբ (30 օր)') ?></span>
                <span style="color:#05cd99; font-weight:700;"><?= $userRatioPct ?>%</span>
              </div>
              <div class="metric-progress-bar">
                <div class="metric-progress-fill" style="width: <?= $userRatioPct ?>%; background: #05cd99;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Widget 2: Content Quality & Ecosystem Richness -->
        <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid var(--line); box-shadow: var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:14px; margin-bottom:18px;">
            <h3 style="font-size:16px; font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7d40ff" stroke-width="2.2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
              <?= __('Բովանդակության Որակ և Հարստություն') ?>
            </h3>
            <span class="chip success" style="font-weight:700; font-size:11px;"><?= number_format($totalSongs) ?> <?= __('Երգ') ?></span>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                <span>📱 <?= __('Տեքստով ապահովված երգեր (Lyrics Coverage)') ?></span>
                <span style="color:#228fff; font-weight:700;"><?= number_format($lyricsCount) ?> (<?= $lyricsPct ?>%)</span>
              </div>
              <div class="metric-progress-bar">
                <div class="metric-progress-fill" style="width: <?= $lyricsPct ?>%; background: #228fff;"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                <span>🎸 <?= __('Ակորդներով ապահովված երգեր (Chords Coverage)') ?></span>
                <span style="color:#7d40ff; font-weight:700;"><?= number_format($chordsCount) ?> (<?= $chordsPct ?>%)</span>
              </div>
              <div class="metric-progress-bar">
                <div class="metric-progress-fill" style="width: <?= $chordsPct ?>%; background: #7d40ff;"></div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:4px;">
              <div style="background:#f8fafc; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0;">
                <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;"><?= __('PWA Տեղադրումներ') ?></div>
                <strong style="font-size:16px; color:var(--text); margin-top:2px; display:block;"><?= number_format($totalInstalls) ?></strong>
              </div>
              <div style="background:#f8fafc; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0;">
                <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;"><?= __('Հրապարակված Լուրեր') ?></div>
                <strong style="font-size:16px; color:var(--text); margin-top:2px; display:block;"><?= number_format($totalNews) ?></strong>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- TABLES SECTION 1: Top Artists & Recent Users -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px; margin-bottom:32px;">
        <!-- Top Artists -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Top Artists (Առաջատար Հեղինակներ)') ?></h3>
            <span style="font-size:12px; color:var(--muted); font-weight:600;"><?= $period === 'all' ? __('Ամբողջ ընթացքում') : $periodLabel ?></span>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th style="width:40px;">#</th><th><?= __('Հեղինակ / Artist') ?></th><th style="text-align:right;"><?= __('Երգերի Քանակ') ?></th></tr></thead>
              <tbody>
                <?php $rank = 1; foreach ($topArtists as $a): ?>
                <tr>
                  <td><span class="rank-badge <?= $rank === 1 ? 'rank-1' : ($rank === 2 ? 'rank-2' : ($rank === 3 ? 'rank-3' : 'rank-other')) ?>"><?= $rank++ ?></span></td>
                  <td><strong><?= htmlspecialchars((string)($a['artist'] ?? '—')) ?></strong></td>
                  <td style="text-align:right;"><span class="badge badge-neutral" style="font-weight:700; font-size:13px;"><?= (int)$a['cnt'] ?></span></td>
                </tr>
                <?php endforeach; ?>
                <?php if (empty($topArtists)): ?>
                <tr><td colspan="3" style="text-align:center; padding:36px 20px; color:var(--muted); font-size:13px;"><?= __('Հեղինակների տվյալներ դեռ չկան:') ?><br><span style="font-size:12px;"><?= __('Երգեր ավելացնելիս նշեք հեղինակներին:') ?></span></td></tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Users -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Recent Registrations (Վերջին Գրանցումները)') ?></h3>
            <a href="/admin_clients.php" class="btn btn-outline" style="padding:4px 10px; font-size:12px; font-weight:700;"><?= __('Բոլորը') ?> →</a>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th><?= __('Օգտատեր') ?></th><th><?= __('Դեր') ?></th><th><?= __('Էլ. Հասցե') ?></th><th style="text-align:right;"><?= __('Գրանցվել է') ?></th></tr></thead>
              <tbody>
                <?php foreach ($recentUsers as $u): ?>
                <tr>
                  <td><strong><?= htmlspecialchars((string)($u['name'] ?: ($u['username'] ?? '—'))) ?></strong></td>
                  <td><span class="badge <?= ($u['role'] ?? '') === 'admin' ? 'badge-primary' : 'badge-neutral' ?>" style="font-size:11px; font-weight:700;"><?= htmlspecialchars((string)($u['role'] ?? 'user')) ?></span></td>
                  <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($u['email'] ?? '—')) ?></td>
                  <td style="text-align:right; color:var(--muted); font-size:12px; font-weight:600;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($u['created_at'] ?? '')) ?: '—') ?></td>
                </tr>
                <?php endforeach; ?>
                <?php if (empty($recentUsers)): ?>
                <tr><td colspan="4" style="text-align:center; padding:36px 20px; color:var(--muted); font-size:13px;"><?= __('Գրանցված օգտատերեր դեռ չկան:') ?></td></tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TABLES SECTION 2: Recently Added Songs -->
      <div class="table-card" style="margin-bottom:32px;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Recently Added Songs (Վերջին Ավելացված Երգերը)') ?></h3>
            <p style="margin:2px 0 0 0; font-size:12px; color:var(--muted);"><?= $period === 'all' ? __('Վերջին ավելացվածները') : $periodLabel ?></p>
          </div>
          <a href="/songs.php" class="btn btn-primary" style="padding:8px 16px; font-size:13px; font-weight:700;"><?= __('Կառավարել Երգերը') ?> →</a>
        </div>
        <div class="table-responsive">
          <table>
            <thead><tr><th style="width:50px;">#</th><th><?= __('Վերնագիր') ?></th><th><?= __('Հեղինակ') ?></th><th style="text-align:right;"><?= __('Ավելացման Ամսաթիվ') ?></th></tr></thead>
            <tbody>
              <?php foreach ($recentSongs as $s): ?>
              <tr>
                <td style="color:var(--muted); font-size:13px; font-weight:700;"><?= (int)$s['id'] ?></td>
                <td><strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong></td>
                <td style="color:var(--muted);"><?= htmlspecialchars((string)($s['artist'] ?? '—')) ?></td>
                <td style="text-align:right; color:var(--muted); font-size:12px; font-weight:600;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($s['created_at'] ?? '')) ?: '—') ?></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($recentSongs)): ?>
              <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted); font-size:13px;"><?= __('Երգեր դեռ չեն ավելացվել:') ?><br><a href="/songs.php" class="btn btn-primary" style="margin-top:10px; padding:6px 14px; font-size:12px;"><?= __('+ Ավելացնել առաջին երգը') ?></a></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TABLES SECTION 3: Top Viewed & Top Favorited Songs -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px; margin-bottom:32px;">
        <!-- Top Viewed Songs -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Ամենաշատ Դիտված Երգերը') ?></h3>
            <span style="font-size:12px; color:var(--muted); font-weight:600;"><?= $period === 'all' ? __('Ամբողջ ընթացքում') : $periodLabel ?></span>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th style="width:40px;">#</th><th><?= __('Երգ և Հեղինակ') ?></th><th style="text-align:right;"><?= __('Դիտումներ') ?></th></tr></thead>
              <tbody>
                <?php $idx = 1; foreach ($topViews as $s): ?>
                <tr>
                  <td><span class="rank-badge <?= $idx === 1 ? 'rank-1' : ($idx === 2 ? 'rank-2' : ($idx === 3 ? 'rank-3' : 'rank-other')) ?>"><?= $idx++ ?></span></td>
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
                <tr><td colspan="3" style="text-align:center; padding:36px; color:var(--muted); font-size:13px;"><?= __('Դիտումների պատմություն դեռ չկա:') ?><br><span style="font-size:12px;"><?= __('Օգտատերերի դիտումներն այստեղ կհաշվարկվեն ավտոմատ:') ?></span></td></tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Favorited Songs -->
        <div class="table-card">
          <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Ամենաշատ Նախընտրած Երգերը') ?></h3>
            <span style="font-size:12px; color:var(--muted); font-weight:600;"><?= $period === 'all' ? __('Ամբողջ ընթացքում') : $periodLabel ?></span>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th style="width:40px;">#</th><th><?= __('Երգ և Հեղինակ') ?></th><th style="text-align:right;"><?= __('Նախընտրածներ') ?></th></tr></thead>
              <tbody>
                <?php $idx = 1; foreach ($topFavorites as $s): ?>
                <tr>
                  <td><span class="rank-badge <?= $idx === 1 ? 'rank-1' : ($idx === 2 ? 'rank-2' : ($idx === 3 ? 'rank-3' : 'rank-other')) ?>"><?= $idx++ ?></span></td>
                  <td>
                    <strong><?= htmlspecialchars((string)($s['title'] ?? '—')) ?></strong>
                    <?php if (!empty($s['artist'])): ?>
                      <div style="font-size:12px; color:var(--muted); margin-top:2px;"><?= htmlspecialchars((string)$s['artist']) ?></div>
                    <?php endif; ?>
                  </td>
                  <td style="text-align:right;"><span class="badge" style="background:#fce7f3; color:#db2777; font-weight:800; font-size:13px;">♥ <?= number_format((int)$s['favs']) ?></span></td>
                </tr>
                <?php endforeach; ?>
                <?php if (empty($topFavorites)): ?>
                <tr><td colspan="3" style="text-align:center; padding:36px; color:var(--muted); font-size:13px;"><?= __('Նախընտրած երգերի տվյալներ դեռ չկան:') ?><br><span style="font-size:12px;"><?= __('Երբ օգտատերերը երգերը նշեն սիրելի, կհայտնվեն այստեղ:') ?></span></td></tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TABLES SECTION 4: Unified Events & Activity History -->
      <div class="table-card" id="notifications_history" style="margin-bottom:32px;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Հարթակի Իրադարձությունների Ամբողջական Պատմություն') ?></h3>
            <p style="margin:2px 0 0 0; font-size:12px; color:var(--muted);"><?= __('Երգերի, օգտատերերի, ծանուցումների, հայտերի և նորությունների ժամանակագրություն') ?></p>
          </div>
          <span class="chip primary" style="font-weight:700; font-size:11px;"><?= count($allNotificationsHistory) ?> <?= __('Իրադարձություն') ?></span>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th><?= __('Տեսակ') ?></th><th><?= __('Վերնագիր / Նկարագրություն') ?></th><th><?= __('Լրացուցիչ') ?></th><th style="text-align:right;"><?= __('Ամսաթիվ') ?></th></tr>
            </thead>
            <tbody>
              <?php foreach ($allNotificationsHistory as $item): ?>
              <tr style="cursor:pointer;" onclick="window.location.href='<?= htmlspecialchars($item['link']) ?>'">
                <td style="width:150px;"><span class="badge badge-neutral" style="font-weight:700; font-size:12px;"><?= htmlspecialchars($item['badge']) ?></span></td>
                <td><strong><?= htmlspecialchars((string)($item['title'] ?? '—')) ?></strong></td>
                <td style="color:var(--muted); font-size:13px; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><?= htmlspecialchars((string)($item['sub'] ?? '—')) ?></td>
                <td style="text-align:right; color:var(--muted); font-size:12px; font-weight:600;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($item['time'] ?? '')) ?: '—') ?></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($allNotificationsHistory)): ?>
              <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted); font-size:13px;"><?= __('Իրադարձությունների պատմություն դեռ չկա:') ?></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TABLES SECTION 5: Recent Push Notifications -->
      <div class="table-card" id="push_history" style="margin-bottom:32px;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:16px; font-weight:700; margin:0;"><?= __('Recent Push Notifications (Ուղարկված Push Արշավներ)') ?></h3>
            <p style="margin:2px 0 0 0; font-size:12px; color:var(--muted);"><?= __('Վերջին ուղարկված բրաուզերային և մոբայլ push ծանուցումները') ?></p>
          </div>
          <a href="/admin_updates.php" class="btn btn-outline" style="padding:6px 12px; font-size:13px; font-weight:700;"><?= __('Push Panel') ?> →</a>
        </div>
        <div class="table-responsive">
          <table>
            <thead><tr><th><?= __('Վերնագիր') ?></th><th><?= __('Հաղորդագրություն') ?></th><th><?= __('Առաքված Սարքեր') ?></th><th style="text-align:right;"><?= __('Ամսաթիվ') ?></th></tr></thead>
            <tbody>
              <?php foreach ($recentPush as $p): ?>
              <tr>
                <td><strong><?= htmlspecialchars((string)($p['title'] ?? '—')) ?></strong></td>
                <td style="color:var(--muted); font-size:13px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><?= htmlspecialchars((string)($p['body'] ?? '—')) ?></td>
                <td><span class="badge" style="background:#dcfce7; color:#166534; font-weight:800;"><?= (int)($p['devices_count'] ?? 0) ?></span></td>
                <td style="text-align:right; color:var(--muted); font-size:12px; font-weight:600;"><?= htmlspecialchars(wp_version_format_datetime_admin((string)($p['at'] ?? '')) ?: '—') ?></td>
              </tr>
              <?php endforeach; ?>
              <?php if (empty($recentPush)): ?>
              <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted); font-size:13px;"><?= __('Push ծանուցումներ դեռ չեն ուղարկվել:') ?><br><a href="/admin_updates.php" class="btn btn-outline" style="margin-top:10px; padding:6px 14px; font-size:12px;"><?= __('Ուղարկել առաջին push ծանուցումը') ?></a></td></tr>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>
</div>
</body>
</html>
