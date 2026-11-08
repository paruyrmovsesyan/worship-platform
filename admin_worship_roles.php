<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';
require_once __DIR__ . '/runtime_config.php';
require_once __DIR__ . '/admin_pwa_bootstrap.php';

$access = wp_admin_require_access('/admin_worship_roles.php');
$adminUser = $access['user'];
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy','ru','en'], true)) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}

$pdo = wp_runtime_open_pdo();

// Ensure worship_roles table exists
$pdo->exec("CREATE TABLE IF NOT EXISTS worship_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(64) NOT NULL UNIQUE,
  icon VARCHAR(32) NOT NULL DEFAULT '🎵',
  name_am VARCHAR(120) NOT NULL,
  name_ru VARCHAR(120) NOT NULL DEFAULT '',
  name_en VARCHAR(120) NOT NULL DEFAULT '',
  is_custom TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$message = '';
$messageType = 'success';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $icon = trim((string)($_POST['icon'] ?? '🎵')) ?: '🎵';
        $name_am = trim((string)($_POST['name_am'] ?? ''));
        $name_ru = trim((string)($_POST['name_ru'] ?? ''));
        $name_en = trim((string)($_POST['name_en'] ?? ''));
        $role_key = trim((string)($_POST['role_key'] ?? ''));
        $sort_order = (int)($_POST['sort_order'] ?? 100);
        $is_active = isset($_POST['is_active']) ? 1 : 0;

        if ($name_am === '') {
            $message = 'Հայերեն անվանումը պարտադիր է:';
            $messageType = 'error';
        } else {
            if ($role_key === '') {
                $slug = preg_replace('/[^a-z0-9]+/i', '_', strtolower($name_en ?: $name_am));
                $slug = trim((string)$slug, '_');
                $role_key = ($slug ?: 'role') . '_' . substr(md5(microtime()), 0, 5);
            }

            // Check if key exists
            $ck = $pdo->prepare("SELECT id FROM worship_roles WHERE role_key = ? LIMIT 1");
            $ck->execute([$role_key]);
            if ($ck->fetch()) {
                $role_key .= '_' . rand(10, 99);
            }

            $st = $pdo->prepare("INSERT INTO worship_roles (role_key, icon, name_am, name_ru, name_en, is_custom, is_active, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?, ?)");
            $st->execute([$role_key, $icon, $name_am, $name_ru, $name_en, $is_active, $sort_order]);

            $message = 'Նոր դերը հաջողությամբ ավելացվեց:';
            $messageType = 'success';
        }
    } elseif ($action === 'edit') {
        $id = (int)($_POST['id'] ?? 0);
        $icon = trim((string)($_POST['icon'] ?? '🎵')) ?: '🎵';
        $name_am = trim((string)($_POST['name_am'] ?? ''));
        $name_ru = trim((string)($_POST['name_ru'] ?? ''));
        $name_en = trim((string)($_POST['name_en'] ?? ''));
        $sort_order = (int)($_POST['sort_order'] ?? 100);
        $is_active = isset($_POST['is_active']) ? 1 : 0;

        if ($id <= 0 || $name_am === '') {
            $message = 'Սխալ տվյալներ են ուղարկվել:';
            $messageType = 'error';
        } else {
            $st = $pdo->prepare("UPDATE worship_roles SET icon = ?, name_am = ?, name_ru = ?, name_en = ?, sort_order = ?, is_active = ? WHERE id = ?");
            $st->execute([$icon, $name_am, $name_ru, $name_en, $sort_order, $is_active, $id]);

            $message = 'Դերը հաջողությամբ թարմացվեց:';
            $messageType = 'success';
        }
    } elseif ($action === 'toggle') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare("UPDATE worship_roles SET is_active = 1 - is_active WHERE id = ?")->execute([$id]);
            $message = 'Կարգավիճակը փոփոխվեց:';
            $messageType = 'success';
        }
    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare("DELETE FROM worship_roles WHERE id = ?")->execute([$id]);
            $message = 'Դերը հեռացվեց:';
            $messageType = 'success';
        }
    }

    header('Location: /admin_worship_roles.php?msg=' . urlencode($message) . '&type=' . $messageType);
    exit;
}

if (isset($_GET['msg'])) {
    $message = (string)$_GET['msg'];
    $messageType = (string)($_GET['type'] ?? 'success');
}

// Fetch all roles
$roles = $pdo->query("SELECT * FROM worship_roles ORDER BY sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC);

$totalCount = count($roles);
$activeCount = count(array_filter($roles, fn($r) => !empty($r['is_active'])));
$customCount = count(array_filter($roles, fn($r) => !empty($r['is_custom'])));

$activePage = 'worship_roles';
?>
<!doctype html>
<html lang="<?= htmlspecialchars($adminLang) ?>">
<head>
  <?php wp_admin_render_pwa_head('Թիմի Դերերի Կառավարում — Worship Platform Admin'); ?>
  <?php include __DIR__ . '/admin_shared_css.php'; ?>
  <style>
    .roles-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .roles-stat-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .roles-stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
    }
    .roles-stat-val {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.1;
      color: var(--text);
    }
    .roles-stat-label {
      font-size: 13px;
      color: var(--muted);
      margin-top: 4px;
      font-weight: 500;
    }
    .roles-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .roles-table-wrapper {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    .roles-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .roles-table th {
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--line);
    }
    .roles-table td {
      padding: 14px 18px;
      font-size: 14px;
      color: var(--text);
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .roles-table tr:last-child td {
      border-bottom: none;
    }
    .roles-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .role-emoji-cell {
      font-size: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .role-badge-tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .badge-default {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }
    .badge-custom {
      background: rgba(168, 85, 247, 0.12);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.25);
    }
    .badge-active {
      background: rgba(34, 197, 94, 0.12);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }
    .badge-inactive {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .role-actions-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-action-icon {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--line);
      color: var(--text);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-action-icon:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    .btn-action-delete:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    /* Add/Edit Modal */
    .admin-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .admin-modal-backdrop.is-open {
      display: flex;
    }
    .admin-modal-box {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      position: relative;
    }
    .admin-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--line);
    }
    .admin-modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
    }
    .admin-modal-close {
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 4px;
    }
    .emoji-picker-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .emoji-pick-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 18px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .emoji-pick-btn:hover {
      background: rgba(0, 212, 255, 0.15);
      border-color: #00d4ff;
    }
  </style>
</head>
<body class="wp-admin-app">
<div class="app-layout">
  <?php include __DIR__ . '/admin_sidebar.php'; ?>

  <main class="app-main">
    <?php include __DIR__ . '/admin_topbar.php'; ?>

    <div class="app-content">
      <div class="page-heading page-heading-row">
        <div>
          <h1>🎭 Երկրպագության Թիմի Դերեր</h1>
          <p>Կառավարեք օգտատերերի պրոֆիլում հասանելի թիմային դերերը, ավելացրեք նոր դերեր կամ խմբագրեք գոյություն ունեցողները:</p>
        </div>
        <div>
          <button type="button" class="btn btn-primary" onclick="openAddRoleModal()">
            ➕ Ավելացնել Նոր Դեր
          </button>
        </div>
      </div>

      <?php if ($message): ?>
        <div style="background:<?= $messageType === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' ?>; color:<?= $messageType === 'success' ? '#4ade80' : '#f87171' ?>; border:1px solid <?= $messageType === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' ?>; padding:14px 20px; border-radius:12px; margin-bottom:24px; font-weight:600;">
          <?= htmlspecialchars($message) ?>
        </div>
      <?php endif; ?>

      <!-- STATS CARDS -->
      <div class="roles-stats-grid">
        <div class="roles-stat-card">
          <div class="roles-stat-icon">🎭</div>
          <div>
            <div class="roles-stat-val"><?= $totalCount ?></div>
            <div class="roles-stat-label">Ընդհանուր Դերեր</div>
          </div>
        </div>
        <div class="roles-stat-card">
          <div class="roles-stat-icon" style="background:rgba(34,197,94,0.1); color:#4ade80;">✅</div>
          <div>
            <div class="roles-stat-val"><?= $activeCount ?></div>
            <div class="roles-stat-label">Ակտիվ Ցուցակում</div>
          </div>
        </div>
        <div class="roles-stat-card">
          <div class="roles-stat-icon" style="background:rgba(168,85,247,0.1); color:#c084fc;">👤</div>
          <div>
            <div class="roles-stat-val"><?= $customCount ?></div>
            <div class="roles-stat-label">Օգտատերերի Ավելացրած</div>
          </div>
        </div>
      </div>

      <!-- ROLES TABLE -->
      <div class="roles-table-wrapper">
        <table class="roles-table">
          <thead>
            <tr>
              <th style="width:70px;">Իկոն</th>
              <th>Հայերեն (AM)</th>
              <th>Ռուսերեն (RU)</th>
              <th>Անգլերեն (EN)</th>
              <th>Իդենտիֆիկատոր (Key)</th>
              <th style="width:100px;">Տեսակ</th>
              <th style="width:70px;">Կարգ</th>
              <th style="width:100px;">Կարգավիճակ</th>
              <th style="text-align:right; width:180px;">Գործողություններ</th>
            </tr>
          </thead>
          <tbody>
            <?php if (empty($roles)): ?>
              <tr>
                <td colspan="9" style="text-align:center; padding:36px; color:var(--muted);">
                  Դերեր չեն գտնվել
                </td>
              </tr>
            <?php else: ?>
              <?php foreach ($roles as $r): ?>
                <tr>
                  <td>
                    <span style="font-size:24px;"><?= htmlspecialchars($r['icon'] ?: '🎵') ?></span>
                  </td>
                  <td>
                    <strong><?= htmlspecialchars($r['name_am']) ?></strong>
                  </td>
                  <td>
                    <span style="color:var(--muted);"><?= htmlspecialchars($r['name_ru'] ?: '—') ?></span>
                  </td>
                  <td>
                    <span style="color:var(--muted);"><?= htmlspecialchars($r['name_en'] ?: '—') ?></span>
                  </td>
                  <td>
                    <code style="font-size:12px; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; color:#38bdf8;">
                      <?= htmlspecialchars($r['role_key']) ?>
                    </code>
                  </td>
                  <td>
                    <?php if (!empty($r['is_custom'])): ?>
                      <span class="role-badge-tag badge-custom">Օգտատիրոջ</span>
                    <?php else: ?>
                      <span class="role-badge-tag badge-default">Ստանդարտ</span>
                    <?php endif; ?>
                  </td>
                  <td>
                    <span style="font-weight:700; color:var(--muted);"><?= (int)$r['sort_order'] ?></span>
                  </td>
                  <td>
                    <?php if (!empty($r['is_active'])): ?>
                      <span class="role-badge-tag badge-active">Ակտիվ</span>
                    <?php else: ?>
                      <span class="role-badge-tag badge-inactive">Պասիվ</span>
                    <?php endif; ?>
                  </td>
                  <td style="text-align:right;">
                    <div class="role-actions-cell" style="justify-content:flex-end;">
                      <button
                        type="button"
                        class="btn-action-icon"
                        title="Խմբագրել"
                        onclick='openEditRoleModal(<?= json_encode($r, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP) ?>)'
                      >
                        ✏️
                      </button>

                      <form method="post" style="display:inline;" onsubmit="return true;">
                        <input type="hidden" name="action" value="toggle">
                        <input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
                        <button
                          type="submit"
                          class="btn-action-icon"
                          title="<?= !empty($r['is_active']) ? 'Անջատել' : 'Ակտիվացնել' ?>"
                        >
                          <?= !empty($r['is_active']) ? '👁️' : '🚫' ?>
                        </button>
                      </form>

                      <form method="post" style="display:inline;" onsubmit="return confirm('Իսկապե՞ս ցանկանում եք հեռացնել այս դերը:');">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
                        <button type="submit" class="btn-action-icon btn-action-delete" title="Հեռացնել">
                          🗑️
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>

    </div>
  </main>
</div>

<!-- ADD / EDIT ROLE MODAL -->
<div id="roleModalBackdrop" class="admin-modal-backdrop" onclick="closeRoleModal(event)">
  <div class="admin-modal-box" onclick="event.stopPropagation()">
    <div class="admin-modal-header">
      <h3 id="modalTitle">➕ Ավելացնել Դեր</h3>
      <button type="button" class="admin-modal-close" onclick="closeRoleModal()">✕</button>
    </div>

    <form method="post" id="roleForm">
      <input type="hidden" name="action" id="formAction" value="add">
      <input type="hidden" name="id" id="formRoleId" value="">

      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:13px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">
          Իկոն (Emoji)
        </label>
        <div style="display:flex; gap:10px; align-items:center;">
          <input
            type="text"
            name="icon"
            id="formIcon"
            required
            maxlength="16"
            value="🎵"
            style="width:80px; text-align:center; font-size:24px; padding:8px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text);"
          >
          <div class="emoji-picker-row">
            <?php
            $quickEmojis = ['🎤', '📖', '🎸', '🎹', '🥁', '🎛️', '🎶', '🎷', '🎺', '🎻', '🪕', '🪗', '🎧', '📽️', '💡', '💻', '✝️', '🕊️'];
            foreach ($quickEmojis as $em):
            ?>
              <button type="button" class="emoji-pick-btn" onclick="document.getElementById('formIcon').value='<?= $em ?>'"><?= $em ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:13px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">
          Անվանում Հայերեն (AM) *
        </label>
        <input
          type="text"
          name="name_am"
          id="formNameAm"
          required
          placeholder="օր. Սաքսոֆոնահար"
          style="width:100%; box-sizing:border-box; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text); font-size:14px;"
        >
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        <div>
          <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">
            Անվանում Ռուսերեն (RU)
          </label>
          <input
            type="text"
            name="name_ru"
            id="formNameRu"
            placeholder="օր. Саксофонист"
            style="width:100%; box-sizing:border-box; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text); font-size:14px;"
          >
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">
            Անվանում Անգլերեն (EN)
          </label>
          <input
            type="text"
            name="name_en"
            id="formNameEn"
            placeholder="օր. Saxophonist"
            style="width:100%; box-sizing:border-box; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text); font-size:14px;"
          >
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 120px; gap:12px; margin-bottom:18px;">
        <div id="keyFieldWrap">
          <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">
            Իդենտիֆիկատոր (Key, անգլերեն)
          </label>
          <input
            type="text"
            name="role_key"
            id="formRoleKey"
            placeholder="օր. saxophonist (կամ դատարկ թողեք)"
            style="width:100%; box-sizing:border-box; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text); font-size:14px;"
          >
        </div>
        <div>
          <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">
            Կարգ (Order)
          </label>
          <input
            type="number"
            name="sort_order"
            id="formSortOrder"
            value="100"
            style="width:100%; box-sizing:border-box; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:var(--bg); color:var(--text); font-size:14px;"
          >
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:var(--text); font-weight:600;">
          <input type="checkbox" name="is_active" id="formIsActive" value="1" checked style="width:18px; height:18px; accent-color:#00d4ff;">
          Ակտիվ է և ցուցադրվում է օգտատերերի ընտրացանկում
        </label>
      </div>

      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button type="button" class="btn" style="background:rgba(255,255,255,0.06); border:1px solid var(--line); color:var(--text);" onclick="closeRoleModal()">
          Չեղարկել
        </button>
        <button type="submit" class="btn btn-primary" id="modalSubmitBtn">
          Պահպանել
        </button>
      </div>
    </form>
  </div>
</div>

<script>
function openAddRoleModal() {
  document.getElementById('modalTitle').textContent = '➕ Ավելացնել Նոր Դեր';
  document.getElementById('formAction').value = 'add';
  document.getElementById('formRoleId').value = '';
  document.getElementById('formIcon').value = '🎵';
  document.getElementById('formNameAm').value = '';
  document.getElementById('formNameRu').value = '';
  document.getElementById('formNameEn').value = '';
  document.getElementById('formRoleKey').value = '';
  document.getElementById('keyFieldWrap').style.display = 'block';
  document.getElementById('formSortOrder').value = '100';
  document.getElementById('formIsActive').checked = true;
  document.getElementById('modalSubmitBtn').textContent = 'Ավելացնել Դեր';
  document.getElementById('roleModalBackdrop').classList.add('is-open');
}

function openEditRoleModal(role) {
  document.getElementById('modalTitle').textContent = '✏️ Խմբագրել Դերը';
  document.getElementById('formAction').value = 'edit';
  document.getElementById('formRoleId').value = role.id;
  document.getElementById('formIcon').value = role.icon || '🎵';
  document.getElementById('formNameAm').value = role.name_am || '';
  document.getElementById('formNameRu').value = role.name_ru || '';
  document.getElementById('formNameEn').value = role.name_en || '';
  document.getElementById('formRoleKey').value = role.role_key || '';
  document.getElementById('keyFieldWrap').style.display = 'none'; // Key is fixed during edit
  document.getElementById('formSortOrder').value = role.sort_order || 0;
  document.getElementById('formIsActive').checked = parseInt(role.is_active, 10) === 1;
  document.getElementById('modalSubmitBtn').textContent = 'Պահպանել Փոփոխությունները';
  document.getElementById('roleModalBackdrop').classList.add('is-open');
}

function closeRoleModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('admin-modal-close')) {
    return;
  }
  document.getElementById('roleModalBackdrop').classList.remove('is-open');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeRoleModal();
  }
});
</script>
</body>
</html>
