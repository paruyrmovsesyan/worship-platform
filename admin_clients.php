<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';

$access = wp_admin_require_access('/admin_clients.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'])) {
    setcookie('admin_lang', $_GET['lang'], time()+86400*30, '/');
    header('Location: ?'); exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'edit_user') {
    header('Content-Type: application/json');
    try {
        $conn = wp_runtime_open_mysqli();
        $uid = (int)($_POST['id'] ?? 0);
        $name = trim((string)($_POST['name'] ?? ''));
        $username = trim((string)($_POST['username'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $phone = trim((string)($_POST['phone_number'] ?? ''));
        $birth = trim((string)($_POST['birth_date'] ?? ''));
        if ($birth === '') $birth = null;
        $gender = trim((string)($_POST['gender'] ?? ''));
        if (!in_array($gender, ['male','female','other','prefer_not_to_say'])) $gender = null;
        
        $stmt = $conn->prepare("UPDATE users SET name=?, username=?, email=?, phone_number=?, birth_date=?, gender=? WHERE id=?");
        $stmt->bind_param('ssssssi', $name, $username, $email, $phone, $birth, $gender, $uid);
        $stmt->execute();
        echo json_encode(['ok' => true]);
    } catch(Throwable $e) {
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'user_details' && isset($_GET['id'])) {
    $uid = (int)$_GET['id'];
    header('Content-Type: application/json');
    try {
        $conn = wp_runtime_open_mysqli();
        
        $res = $conn->query("SELECT COUNT(*) FROM user_favorites WHERE user_id=$uid");
        $favCount = $res ? (int)$res->fetch_row()[0] : 0;
        
        $res = $conn->query("SELECT COUNT(*) FROM recent_views WHERE user_id=$uid");
        $viewCount = $res ? (int)$res->fetch_row()[0] : 0;
        
        $res = $conn->query("SELECT COUNT(*) FROM user_sessions WHERE user_id=$uid");
        $sessionCount = $res ? (int)$res->fetch_row()[0] : 0;
        
        $favRes = $conn->query("SELECT s.title FROM user_favorites f JOIN songs s ON f.song_id = s.id WHERE f.user_id=$uid ORDER BY f.id DESC");
        $favList = [];
        if ($favRes) { 
            while($r = $favRes->fetch_assoc()) { 
                $t = json_decode($r['title'], true);
                $favList[] = is_array($t) ? ($t['hy'] ?? $t['en'] ?? $t['ru'] ?? $r['title']) : $r['title'];
            } 
        }
        
        $viewRes = $conn->query("SELECT s.title FROM recent_views rv JOIN songs s ON rv.song_id = s.id WHERE rv.user_id=$uid ORDER BY rv.viewed_at DESC LIMIT 50");
        $viewList = [];
        if ($viewRes) { 
            while($r = $viewRes->fetch_assoc()) { 
                $t = json_decode($r['title'], true);
                $viewList[] = is_array($t) ? ($t['hy'] ?? $t['en'] ?? $t['ru'] ?? $r['title']) : $r['title'];
            } 
        }
        
        $sessRes = $conn->query("SELECT device_name, browser, platform, ip_address, last_used_at FROM user_sessions WHERE user_id=$uid ORDER BY last_used_at DESC LIMIT 10");
        $sessList = [];
        if ($sessRes) { while($r = $sessRes->fetch_assoc()) { $sessList[] = $r; } }
        
        echo json_encode([
            'ok' => true,
            'favorites' => $favCount,
            'recent_views' => $viewCount,
            'sessions' => $sessionCount,
            'fav_list' => $favList,
            'view_list' => $viewList,
            'sess_list' => $sessList
        ]);
    } catch(Throwable $e) {
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ── PAGINATION ─────────────────────────
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = 50;
$offset  = ($page - 1) * $perPage;
$search  = trim((string)($_GET['q'] ?? ''));

// ── FETCH USERS ──────────────────────────────────────────────
$users = [];
$totalUsers = 0;
$dbError = null;

try {
    $conn = wp_runtime_open_mysqli();

    // Ensure username column exists
    $checkCol = $conn->query("SHOW COLUMNS FROM users LIKE 'username'");
    if ($checkCol && $checkCol->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN username VARCHAR(160) NOT NULL DEFAULT '' AFTER id");
    }

    // Total count
    if ($search !== '') {
        $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE name LIKE ? OR email LIKE ?");
        $like = '%' . $search . '%';
        $stmt->bind_param('ss', $like, $like);
        $stmt->execute();
        $stmt->bind_result($totalUsers);
        $stmt->fetch();
        $stmt->close();
    } else {
        $r = $conn->query("SELECT COUNT(*) FROM users");
        if ($r) { $row = $r->fetch_row(); $totalUsers = (int)($row[0] ?? 0); }
    }

    // Rows
    if ($search !== '') {
        $like = '%' . $search . '%';
        $stmt = $conn->prepare(
            "SELECT id, username, name, email, created_at, birth_date, gender, phone_number
             FROM users WHERE name LIKE ? OR email LIKE ? OR username LIKE ?
             ORDER BY id DESC LIMIT ? OFFSET ?"
        );
        $stmt->bind_param('sssii', $like, $like, $like, $perPage, $offset);
    } else {
        $stmt = $conn->prepare(
            "SELECT id, username, name, email, created_at, birth_date, gender, phone_number
             FROM users ORDER BY id DESC LIMIT ? OFFSET ?"
        );
        $stmt->bind_param('ii', $perPage, $offset);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) { $users[] = $row; }
    $stmt->close();
    $conn->close();
} catch (Throwable $e) {
    $dbError = $e->getMessage();
}

$totalPages = (int)ceil($totalUsers / $perPage);

$activePage = 'clients';
$searchPlaceholder = 'Search users...';
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Clients — Worship Platform Admin</title>
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
          <h1>Clients 👥</h1>
          <p><?= number_format($totalUsers) ?> <?= __('registered users') ?></p>
        </div>
        <form method="get" style="display:flex; gap:12px; align-items:center;">
          <div class="search-box" style="display:inline-block;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="search" name="q" value="<?= htmlspecialchars($search) ?>" placeholder="<?= __('Search name or email...') ?>" style="width:240px;">
          </div>
          <button type="submit" class="btn btn-primary" style="padding:10px 18px;"><?= __('Search') ?></button>
          <?php if ($search): ?><a href="/admin_clients.php" class="btn"><?= __('Clear') ?></a><?php endif; ?>
        </form>
      </div>

      <?php if ($dbError): ?>
        <div style="background:var(--danger-bg); color:var(--danger); padding:16px 20px; border-radius:12px; margin-bottom:24px; font-weight:600;">
          <?= __('Database error:') ?> <?= htmlspecialchars($dbError) ?>
        </div>
      <?php endif; ?>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th><?= __('NAME') ?></th>
              <th><?= __('EMAIL') ?></th>
              <th><?= __('Registered') ?></th>
            </tr>
          </thead>
          <tbody>
            <?php if (empty($users)): ?>
            <tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);"><?= __('No users found') ?></td></tr>
            <?php else: ?>
            <?php foreach ($users as $u): ?>
            <tr onclick="openUserModal(<?= (int)$u['id'] ?>, '<?= htmlspecialchars((string)($u['name'] ?? '—'), ENT_QUOTES) ?>', '<?= htmlspecialchars((string)($u['email'] ?? '—'), ENT_QUOTES) ?>', '<?= htmlspecialchars((string)($u['username'] ?? '—'), ENT_QUOTES) ?>', '<?= htmlspecialchars((string)($u['created_at'] ?? '—'), ENT_QUOTES) ?>', '<?= htmlspecialchars((string)($u['phone_number'] ?? ''), ENT_QUOTES) ?>', '<?= htmlspecialchars((string)($u['birth_date'] ?? ''), ENT_QUOTES) ?>', '<?= htmlspecialchars((string)($u['gender'] ?? ''), ENT_QUOTES) ?>')" style="cursor: pointer;">
              <td style="color:var(--muted); font-size:13px;"><?= (int)$u['id'] ?></td>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:32px; height:32px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0;">
                    <?= htmlspecialchars(mb_substr((string)($u['name'] ?? 'U'), 0, 1)) ?>
                  </div>
                  <div style="font-weight:600; color:var(--text);"><?= htmlspecialchars((string)($u['name'] ?? '—')) ?></div>
                </div>
              </td>
              <td style="color:var(--muted);">
                <div><?= htmlspecialchars((string)($u['email'] ?? '—')) ?></div>
                <div style="font-size:11px; opacity:0.6; margin-top:2px;">@<?= htmlspecialchars((string)($u['username'] ?? '—')) ?></div>
              </td>
              <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($u['created_at'] ?? '—')) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>

        <?php if ($totalPages > 1): ?>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-top:1px solid var(--line);">
          <span style="color:var(--muted); font-size:14px;"><?= __('Page') ?> <?= $page ?> <?= __('of') ?> <?= $totalPages ?></span>
          <div style="display:flex; gap:8px;">
            <?php if ($page > 1): ?>
              <a href="?page=<?= $page-1 ?>&q=<?= urlencode($search) ?>" class="btn" style="padding:8px 16px;">← Prev</a>
            <?php endif; ?>
            <?php if ($page < $totalPages): ?>
              <a href="?page=<?= $page+1 ?>&q=<?= urlencode($search) ?>" class="btn btn-primary" style="padding:8px 16px;">Next →</a>
            <?php endif; ?>
          </div>
        </div>
        <?php endif; ?>
      </div>
    </div>
  </main>
</div>

<!-- User Details Modal -->
<div id="userModalOverlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:20px; overflow-y:auto; backdrop-filter:blur(4px);">
  <div style="background:var(--surface); border:1px solid var(--line); border-radius:24px; width:100%; max-width:700px; padding:32px; position:relative; box-shadow:0 24px 48px rgba(0,0,0,0.4); animation: dropIn .2s ease-out; margin:auto;">
    <div style="position:absolute; top:20px; right:20px; display:flex; gap:8px;">
      <button onclick="openEditModal()" style="background:rgba(67,24,255,0.1); color:var(--primary); border:none; border-radius:8px; padding:8px 16px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s;">✎ Խմբագրել</button>
      <button onclick="closeUserModal()" style="background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; color:var(--text); font-size:20px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">&times;</button>
    </div>
    
    <div style="display:flex; align-items:center; gap:24px; margin-bottom:32px; border-bottom:1px solid var(--line); padding-bottom:24px; margin-top:10px;">
      <div id="umAvatar" style="width:84px; height:84px; border-radius:50%; background:linear-gradient(135deg, var(--primary), #9d72ff); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:36px; flex-shrink:0; box-shadow:0 8px 24px rgba(67,24,255,0.4);">?</div>
      <div style="flex:1;">
        <h3 id="umName" style="margin:0 0 4px; color:var(--text); font-size:24px; font-weight:800;">Name</h3>
        <p id="umEmail" style="margin:0; color:var(--muted); font-size:15px; font-weight:500;">email@example.com</p>
        <p id="umUsername" style="margin:0 0 12px; color:var(--primary); font-size:13px; font-weight:600;">@username</p>
        
        <div style="display:flex; flex-wrap:wrap; gap:12px; font-size:13px;">
          <div style="background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:6px 12px; color:var(--text);">
             <span style="color:var(--muted); font-weight:600; margin-right:4px;">📞</span> <span id="umPhone">-</span>
          </div>
          <div style="background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:6px 12px; color:var(--text);">
             <span style="color:var(--muted); font-weight:600; margin-right:4px;">🎂</span> <span id="umBirth">-</span>
          </div>
          <div style="background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:6px 12px; color:var(--text);">
             <span style="color:var(--muted); font-weight:600; margin-right:4px;">👤</span> <span id="umGender">-</span>
          </div>
          <div style="background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:6px 12px; color:var(--text);">
             <span style="color:var(--muted); font-weight:600; margin-right:4px;">📅</span> <span id="umRegistered">-</span>
          </div>
        </div>
      </div>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
      <div style="background:var(--bg); border:1px solid var(--line); border-radius:16px; padding:20px;">
        <div onclick="toggleList('umFavListWrap')" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
          <div style="font-size:13px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:6px;">
            <?= __('Favorites') ?> <span id="umFavChevron" style="font-size:10px; transition:transform 0.2s;">▼</span>
          </div>
          <div id="umFavs" style="font-size:22px; font-weight:800; color:var(--primary);">...</div>
        </div>
        <div id="umFavListWrap" style="display:none; margin-top:16px; border-top:1px solid var(--line); padding-top:12px; max-height:200px; overflow-y:auto;">
          <ul id="umFavList" style="list-style:none; padding:0; margin:0; font-size:14px; color:var(--text); display:flex; flex-direction:column; gap:10px;"></ul>
        </div>
      </div>
      
      <div style="background:var(--bg); border:1px solid var(--line); border-radius:16px; padding:20px;">
        <div onclick="toggleList('umViewListWrap')" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
          <div style="font-size:13px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:6px;">
            <?= __('History') ?> <span id="umViewChevron" style="font-size:10px; transition:transform 0.2s;">▼</span>
          </div>
          <div id="umViews" style="font-size:22px; font-weight:800; color:var(--primary);">...</div>
        </div>
        <div id="umViewListWrap" style="display:none; margin-top:16px; border-top:1px solid var(--line); padding-top:12px; max-height:200px; overflow-y:auto;">
          <ul id="umViewList" style="list-style:none; padding:0; margin:0; font-size:14px; color:var(--text); display:flex; flex-direction:column; gap:10px;"></ul>
        </div>
      </div>
    </div>
    
    <div style="background:var(--bg); border:1px solid var(--line); border-radius:16px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--line); padding-bottom:12px;">
        <div style="font-size:13px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;"><?= __('Active Sessions') ?></div>
        <div id="umSessions" style="font-size:22px; font-weight:800; color:var(--primary);">...</div>
      </div>
      <ul id="umSessList" style="list-style:none; padding:0; margin:0; font-size:14px; color:var(--text); display:flex; flex-direction:column; gap:12px;"></ul>
    </div>
  </div>
</div>

<!-- Edit User Modal -->
<div id="editUserModalOverlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:10000; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px);">
  <div style="background:var(--surface); border:1px solid var(--line); border-radius:24px; width:100%; max-width:500px; padding:32px; position:relative; box-shadow:0 24px 48px rgba(0,0,0,0.4); animation: dropIn .2s ease-out;">
    <button onclick="closeEditModal()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; color:var(--text); font-size:20px; line-height:1; display:flex; align-items:center; justify-content:center;">&times;</button>
    <h3 style="margin:0 0 24px; font-size:20px; color:var(--text); font-weight:800;">Խմբագրել տվյալները</h3>
    <form id="editUserForm" onsubmit="saveUserEdit(event)">
      <input type="hidden" id="euId" name="id">
      
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:13px; color:var(--muted); margin-bottom:6px; font-weight:600;">Անուն</label>
        <input type="text" id="euName" name="name" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--bg); color:var(--text); outline:none;" required>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div>
          <label style="display:block; font-size:13px; color:var(--muted); margin-bottom:6px; font-weight:600;">Էլ․ փոստ</label>
          <input type="email" id="euEmail" name="email" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--bg); color:var(--text); outline:none;" required>
        </div>
        <div>
          <label style="display:block; font-size:13px; color:var(--muted); margin-bottom:6px; font-weight:600;">Մուտքանուն</label>
          <input type="text" id="euUsername" name="username" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--bg); color:var(--text); outline:none;">
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div>
          <label style="display:block; font-size:13px; color:var(--muted); margin-bottom:6px; font-weight:600;">Հեռախոս</label>
          <input type="text" id="euPhone" name="phone_number" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--bg); color:var(--text); outline:none;">
        </div>
        <div>
          <label style="display:block; font-size:13px; color:var(--muted); margin-bottom:6px; font-weight:600;">Ծննդյան ամսաթիվ</label>
          <input type="date" id="euBirth" name="birth_date" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--bg); color:var(--text); outline:none;">
        </div>
      </div>
      
      <div style="margin-bottom:24px;">
        <label style="display:block; font-size:13px; color:var(--muted); margin-bottom:6px; font-weight:600;">Սեռ</label>
        <select id="euGender" name="gender" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--bg); color:var(--text); outline:none;">
          <option value="">-- Նշված չէ --</option>
          <option value="male">Տղամարդ</option>
          <option value="female">Կին</option>
          <option value="other">Այլ</option>
        </select>
      </div>
      
      <button type="submit" class="btn btn-primary" style="width:100%; padding:14px; font-size:15px; font-weight:700; border:none; border-radius:12px; cursor:pointer;">Պահպանել</button>
    </form>
  </div>
</div>

<script>
let currentUserData = {};

function openUserModal(id, name, email, username, registered, phone, birth, gender) {
    currentUserData = { id, name, email, username, registered, phone, birth, gender };
    
    document.getElementById('umName').textContent = name;
    document.getElementById('umAvatar').textContent = name ? name.charAt(0).toUpperCase() : '?';
    document.getElementById('umEmail').textContent = email;
    document.getElementById('umUsername').textContent = '@' + username;
    document.getElementById('umRegistered').textContent = registered.split(' ')[0]; // Show only date
    
    document.getElementById('umPhone').textContent = phone || '—';
    document.getElementById('umBirth').textContent = birth || '—';
    
    let genderTrans = {'male':'Տղամարդ', 'female':'Կին', 'other':'Այլ', 'prefer_not_to_say':'Նշված չէ'};
    document.getElementById('umGender').textContent = genderTrans[gender] || gender || '—';

    
    document.getElementById('umFavs').textContent = '...';
    document.getElementById('umViews').textContent = '...';
    document.getElementById('umSessions').textContent = '...';
    document.getElementById('umFavList').innerHTML = '';
    document.getElementById('umViewList').innerHTML = '';
    document.getElementById('umSessList').innerHTML = '';
    
    // Hide lists by default
    document.getElementById('umFavListWrap').style.display = 'none';
    document.getElementById('umViewListWrap').style.display = 'none';
    document.getElementById('umFavChevron').style.transform = 'rotate(0deg)';
    document.getElementById('umViewChevron').style.transform = 'rotate(0deg)';
    
    document.getElementById('userModalOverlay').style.display = 'flex';
    
    fetch('?action=user_details&id=' + id)
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                document.getElementById('umFavs').textContent = data.favorites;
                document.getElementById('umViews').textContent = data.recent_views;
                document.getElementById('umSessions').textContent = data.sessions;
                
                if (data.fav_list && data.fav_list.length > 0) {
                    document.getElementById('umFavList').innerHTML = data.fav_list.map(t => '<li style="display:flex; align-items:center; gap:8px;"><div style="width:6px; height:6px; border-radius:50%; background:var(--primary);"></div>' + escapeHtml(t) + '</li>').join('');
                } else {
                    document.getElementById('umFavList').innerHTML = '<li style="color:var(--muted); font-style:italic;">No favorites yet</li>';
                }
                
                if (data.view_list && data.view_list.length > 0) {
                    document.getElementById('umViewList').innerHTML = data.view_list.map(t => '<li style="display:flex; align-items:center; gap:8px;"><div style="width:6px; height:6px; border-radius:50%; background:var(--muted);"></div>' + escapeHtml(t) + '</li>').join('');
                } else {
                    document.getElementById('umViewList').innerHTML = '<li style="color:var(--muted); font-style:italic;">No history yet</li>';
                }
                
                if (data.sess_list && data.sess_list.length > 0) {
                    document.getElementById('umSessList').innerHTML = data.sess_list.map(s => {
                        let dev = [s.device_name, s.browser, s.platform].filter(Boolean).join(' - ') || 'Unknown Device';
                        let dt = new Date(s.last_used_at).toLocaleString();
                        return '<li style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:10px;"><div style="flex:1; min-width:0;"><div style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(dev) + '</div><div style="color:var(--muted); font-size:12px; margin-top:4px;">IP: ' + escapeHtml(s.ip_address || '?') + '</div></div><div style="font-size:12px; color:var(--muted); text-align:right;">' + dt + '</div></li>';
                    }).join('');
                } else {
                    document.getElementById('umSessList').innerHTML = '<li style="color:var(--muted); font-style:italic;">No active sessions</li>';
                }
            } else {
                document.getElementById('umFavs').textContent = '-';
                document.getElementById('umViews').textContent = '-';
                document.getElementById('umSessions').textContent = '-';
            }
        }).catch(() => {
            document.getElementById('umFavs').textContent = '-';
            document.getElementById('umViews').textContent = '-';
            document.getElementById('umSessions').textContent = '-';
        });
}

function escapeHtml(str) {
    let div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

function toggleList(wrapId) {
    let wrap = document.getElementById(wrapId);
    let chevronId = wrapId === 'umFavListWrap' ? 'umFavChevron' : 'umViewChevron';
    let chevron = document.getElementById(chevronId);
    
    if (wrap.style.display === 'none') {
        wrap.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
    } else {
        wrap.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
    }
}

function closeUserModal() {
    document.getElementById('userModalOverlay').style.display = 'none';
}

function openEditModal() {
    document.getElementById('euId').value = currentUserData.id;
    document.getElementById('euName').value = currentUserData.name;
    document.getElementById('euEmail').value = currentUserData.email;
    document.getElementById('euUsername').value = currentUserData.username;
    document.getElementById('euPhone').value = currentUserData.phone;
    document.getElementById('euBirth').value = currentUserData.birth;
    document.getElementById('euGender').value = currentUserData.gender || '';
    
    document.getElementById('editUserModalOverlay').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editUserModalOverlay').style.display = 'none';
}

function saveUserEdit(e) {
    e.preventDefault();
    let form = e.target;
    let data = new FormData(form);
    
    fetch('?action=edit_user', {
        method: 'POST',
        body: data
    })
    .then(r => r.json())
    .then(res => {
        if (res.ok) {
            closeEditModal();
            location.reload(); // Reload to reflect changes in the table
        } else {
            alert('Սխալ առաջացավ: ' + (res.error || ''));
        }
    })
    .catch(err => {
        alert('Սխալ: ' + err.message);
    });
}
</script>

</body>
</html>
