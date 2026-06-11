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
            "SELECT id, name, email, created_at, role, is_admin
             FROM users WHERE name LIKE ? OR email LIKE ?
             ORDER BY id DESC LIMIT ? OFFSET ?"
        );
        $stmt->bind_param('ssii', $like, $like, $perPage, $offset);
    } else {
        $stmt = $conn->prepare(
            "SELECT id, name, email, created_at, role, is_admin
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
          <p><?= number_format($totalUsers) ?> registered users</p>
        </div>
        <form method="get" style="display:flex; gap:12px; align-items:center;">
          <div class="search-box" style="display:inline-block;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="search" name="q" value="<?= htmlspecialchars($search) ?>" placeholder="Search name or email..." style="width:240px;">
          </div>
          <button type="submit" class="btn btn-primary" style="padding:10px 18px;">Search</button>
          <?php if ($search): ?><a href="/admin_clients.php" class="btn">Clear</a><?php endif; ?>
        </form>
      </div>

      <?php if ($dbError): ?>
        <div style="background:var(--danger-bg); color:var(--danger); padding:16px 20px; border-radius:12px; margin-bottom:24px; font-weight:600;">
          Database error: <?= htmlspecialchars($dbError) ?>
        </div>
      <?php endif; ?>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Admin</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            <?php if (empty($users)): ?>
            <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--muted);">No users found</td></tr>
            <?php else: ?>
            <?php foreach ($users as $u): ?>
            <tr>
              <td style="color:var(--muted); font-size:13px;"><?= (int)$u['id'] ?></td>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:34px; height:34px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink:0;">
                    <?= strtoupper(substr((string)($u['name'] ?? '?'), 0, 1)) ?>
                  </div>
                  <strong><?= htmlspecialchars((string)($u['name'] ?? '—')) ?></strong>
                </div>
              </td>
              <td style="color:var(--muted);"><?= htmlspecialchars((string)($u['email'] ?? '—')) ?></td>
              <td>
                <?php $role = (string)($u['role'] ?? ''); ?>
                <span class="badge <?= $role === 'admin' ? 'badge-success' : ($role !== '' ? 'badge-warning' : 'badge-neutral') ?>">
                  <?= htmlspecialchars($role ?: 'user') ?>
                </span>
              </td>
              <td>
                <?php $isAdmin = !empty($u['is_admin']); ?>
                <span class="badge <?= $isAdmin ? 'badge-success' : 'badge-neutral' ?>"><?= $isAdmin ? 'Yes' : 'No' ?></span>
              </td>
              <td style="color:var(--muted); font-size:13px;"><?= htmlspecialchars((string)($u['created_at'] ?? '—')) ?></td>
            </tr>
            <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>

        <?php if ($totalPages > 1): ?>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-top:1px solid var(--line);">
          <span style="color:var(--muted); font-size:14px;">Page <?= $page ?> of <?= $totalPages ?></span>
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
</body>
</html>
