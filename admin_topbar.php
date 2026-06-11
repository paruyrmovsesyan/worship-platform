<?php
/**
 * admin_topbar.php — Shared top navigation bar
 * Expected vars: $adminDisplayName, $adminEmail, $searchPlaceholder
 */
$searchPlaceholder = $searchPlaceholder ?? 'Search...';
$adminEmail        = $adminEmail ?? '';
?>
<style>
/* ── User dropdown ── */
.user-menu-wrapper { position: relative; }
.user-menu-trigger {
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; padding: 6px 10px 6px 6px;
  border-radius: 40px; transition: background .15s;
  user-select: none;
}
.user-menu-trigger:hover { background: rgba(67,24,255,0.06); }
.user-menu-caret { color: var(--muted); transition: transform .2s; flex-shrink: 0; }
.user-menu-wrapper.open .user-menu-caret { transform: rotate(180deg); }

.user-dropdown {
  display: none; position: absolute; top: calc(100% + 10px); right: 0;
  min-width: 240px; background: #fff; border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.14); z-index: 1001;
  overflow: hidden; animation: dropIn .18s ease;
}
.user-menu-wrapper.open .user-dropdown { display: block; }
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ud-header { padding: 18px 20px 14px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; }
.ud-avatar { width:44px; height:44px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; flex-shrink:0; }
.ud-name  { font-size:15px; font-weight:700; color:var(--text); }
.ud-email { font-size:12px; color:var(--muted); margin-top:2px; }
.ud-item { display:flex; align-items:center; gap:12px; padding:12px 20px; color:var(--text); font-size:14px; font-weight:600; text-decoration:none; cursor:pointer; border:none; background:none; width:100%; font-family:inherit; text-align:left; transition:background .12s; }
.ud-item:hover { background: #f4f7fe; }
.ud-item.danger { color: var(--danger); }
.ud-item.danger:hover { background: var(--danger-bg); }
.ud-item svg { flex-shrink: 0; }
.ud-divider { height: 1px; background: var(--line); margin: 4px 0; }

/* ── Notification panel ── */
.notif-wrapper { position: relative; }
.notif-panel {
  display: none;
  position: absolute; top: calc(100% + 12px); right: 0;
  width: 360px; background: #fff; border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  z-index: 1002; overflow: hidden;
  animation: dropIn .18s ease;
}
.notif-panel.open { display: block; }
.notif-head {
  padding: 18px 20px 12px; border-bottom: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center;
}
.notif-head h4 { font-size:15px; font-weight:700; color:var(--text); margin:0; display:flex; align-items:center; gap:8px; }
.notif-count-badge { background:var(--primary); color:#fff; border-radius:20px; padding:2px 8px; font-size:11px; font-weight:700; }
.notif-mark { font-size:12px; font-weight:600; color:var(--muted); cursor:pointer; }
.notif-mark:hover { color:var(--primary); }
.notif-list { max-height:380px; overflow-y:auto; }
.notif-item { display:flex; align-items:flex-start; gap:12px; padding:14px 20px; border-bottom:1px solid var(--line); transition:background .1s; }
.notif-item:hover { background:#f8faff; }
.notif-item:last-child { border-bottom:none; }
.notif-icon { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.notif-icon.song { background:#e5f3ff; color:#228fff; }
.notif-icon.user { background:#f3ebff; color:#7d40ff; }
.notif-text { flex:1; min-width:0; }
.notif-msg  { font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.notif-sub  { font-size:12px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.notif-time { font-size:11px; color:var(--muted); margin-top:4px; }
.notif-empty { padding:40px; text-align:center; color:var(--muted); font-size:14px; }
.notif-loading { padding:30px; text-align:center; color:var(--muted); font-size:13px; }
.notif-footer { padding:14px 20px; border-top:1px solid var(--line); text-align:center; }
.notif-footer a { font-size:13px; font-weight:700; color:var(--primary); text-decoration:none; }
</style>

<header class="app-topbar">
  <!-- Date -->
  <div style="display:flex; align-items:center; gap:10px; color:var(--text); font-weight:700; font-size:15px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    <?= date('F j, Y') ?>
  </div>

  <div class="topbar-right">
    <!-- Search -->
    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="search" id="topbarSearch" placeholder="<?= htmlspecialchars($searchPlaceholder) ?>">
    </div>

    <!-- Notification Bell -->
    <div class="notif-wrapper" id="topbarNotifWrapper">
      <button class="bell-btn" id="topbarBellBtn" title="Notifications" onclick="topbarToggleNotif(event)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span class="bell-dot" id="topbarBellDot"></span>
      </button>

      <div class="notif-panel" id="topbarNotifPanel">
        <div class="notif-head">
          <h4>Notifications <span class="notif-count-badge" id="topbarNotifBadge">0</span></h4>
          <span class="notif-mark" onclick="topbarMarkAllRead()">Mark all read</span>
        </div>
        <div class="notif-list" id="topbarNotifList">
          <div class="notif-loading">Loading…</div>
        </div>
        <div class="notif-footer">
          <a href="/admin_stats.php">View all activity →</a>
        </div>
      </div>
    </div>

    <!-- User menu -->
    <div class="user-menu-wrapper" id="userMenuWrapper">
      <div class="user-menu-trigger" onclick="toggleUserMenu(event)" title="Account menu">
        <div class="topbar-avatar"><?= strtoupper(substr($adminDisplayName, 0, 1)) ?></div>
        <span style="font-weight:700; font-size:15px; color:var(--text);"><?= htmlspecialchars($adminDisplayName) ?></span>
        <svg class="user-menu-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>

      <div class="user-dropdown" id="userDropdown">
        <div class="ud-header">
          <div class="ud-avatar"><?= strtoupper(substr($adminDisplayName, 0, 1)) ?></div>
          <div>
            <div class="ud-name"><?= htmlspecialchars($adminDisplayName) ?></div>
            <?php if ($adminEmail): ?>
            <div class="ud-email"><?= htmlspecialchars($adminEmail) ?></div>
            <?php endif; ?>
          </div>
        </div>
        <div style="padding:6px 0;">
          <a class="ud-item" href="/admin_dashboard.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Dashboard
          </a>
          <a class="ud-item" href="/songs.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            Songs
          </a>
          <a class="ud-item" href="/admin_updates.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </a>
          <div class="ud-divider"></div>
          <a class="ud-item danger" href="/admin_logout.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log Out
          </a>
        </div>
      </div>
    </div>
  </div>
</header>

<script>
(function() {
  /* ── User dropdown ── */
  function toggleUserMenu(e) {
    e.stopPropagation();
    var w = document.getElementById('userMenuWrapper');
    var notifPanel = document.getElementById('topbarNotifPanel');
    if (notifPanel) notifPanel.classList.remove('open');
    w.classList.toggle('open');
  }
  window.toggleUserMenu = toggleUserMenu;

  document.addEventListener('click', function(e) {
    var w = document.getElementById('userMenuWrapper');
    if (w && !w.contains(e.target)) w.classList.remove('open');
    var nw = document.getElementById('topbarNotifWrapper');
    if (nw && !nw.contains(e.target)) {
      var panel = document.getElementById('topbarNotifPanel');
      if (panel) panel.classList.remove('open');
    }
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.getElementById('userMenuWrapper')?.classList.remove('open');
      document.getElementById('topbarNotifPanel')?.classList.remove('open');
    }
  });

  /* ── Notification panel ── */
  var _notifLoaded = false;

  window.topbarToggleNotif = function(e) {
    e.stopPropagation();
    // Close user dropdown
    document.getElementById('userMenuWrapper')?.classList.remove('open');
    var panel = document.getElementById('topbarNotifPanel');
    var isOpen = panel.classList.contains('open');
    panel.classList.toggle('open');
    if (!isOpen && !_notifLoaded) {
      loadNotifications();
    }
  };

  function loadNotifications() {
    fetch('/admin_notifications_api.php')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _notifLoaded = true;
        renderNotifications(data.items || []);
      })
      .catch(function() {
        document.getElementById('topbarNotifList').innerHTML =
          '<div class="notif-empty">Could not load notifications</div>';
      });
  }

  function renderNotifications(items) {
    var badge = document.getElementById('topbarNotifBadge');
    var dot   = document.getElementById('topbarBellDot');
    var list  = document.getElementById('topbarNotifList');

    if (badge) badge.textContent = items.length;
    if (dot)   dot.style.display = items.length > 0 ? '' : 'none';

    if (!items.length) {
      list.innerHTML = '<div class="notif-empty">No notifications yet 🎉</div>';
      return;
    }

    var html = '';
    items.forEach(function(n) {
      var iconSvg = n.type === 'song'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

      html += '<div class="notif-item">'
        + '<div class="notif-icon ' + escHtml(n.type) + '">' + iconSvg + '</div>'
        + '<div class="notif-text">'
        + '<div class="notif-msg">' + escHtml(n.message) + '</div>'
        + (n.sub ? '<div class="notif-sub">' + escHtml(n.sub) + '</div>' : '')
        + '<div class="notif-time">' + escHtml(n.time) + '</div>'
        + '</div></div>';
    });
    list.innerHTML = html;
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  window.topbarMarkAllRead = function() {
    _notifLoaded = false; // allow re-fetch next open
    var badge = document.getElementById('topbarNotifBadge');
    var dot   = document.getElementById('topbarBellDot');
    var list  = document.getElementById('topbarNotifList');
    if (badge) badge.textContent = '0';
    if (dot)   dot.style.display = 'none';
    if (list)  list.innerHTML = '<div class="notif-empty">All caught up! 🎉</div>';
  };

  // Pre-load count on page ready (just to show dot)
  document.addEventListener('DOMContentLoaded', function() {
    fetch('/admin_notifications_api.php')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var items = data.items || [];
        var badge = document.getElementById('topbarNotifBadge');
        var dot   = document.getElementById('topbarBellDot');
        if (badge) badge.textContent = items.length;
        if (dot)   dot.style.display = items.length > 0 ? '' : 'none';
        // Cache the loaded data
        _notifCache = items;
      })
      .catch(function() {});
  });

  var _notifCache = null;
  // Override loadNotifications to use cache if available
  var _origLoad = loadNotifications;
  loadNotifications = function() {
    if (_notifCache !== null) {
      _notifLoaded = true;
      renderNotifications(_notifCache);
    } else {
      _origLoad();
    }
  };
})();
</script>
