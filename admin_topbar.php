<?php
/**
 * admin_topbar.php — Shared top navigation bar
 * Expected vars: $adminDisplayName, $adminEmail, $searchPlaceholder
 */
if (!function_exists('__')) {
    require_once __DIR__ . '/admin_i18n.php';
}
$searchPlaceholder = $searchPlaceholder ?? __('Search...');
$adminEmail        = $adminEmail ?? '';
?>
<style>
/* ── Mobile menu button ── */
.mobile-menu-btn {
  display: none;
  background: var(--surface);
  border: 1px solid var(--line);
  cursor: pointer;
  color: var(--text);
  padding: 8px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mobile-menu-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.mobile-menu-btn:active {
  transform: scale(0.95);
}

/* ── User dropdown ── */
.user-menu-wrapper { position: relative; }
.user-menu-trigger {
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; padding: 6px 10px 6px 6px;
  border-radius: 40px; transition: background .15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.user-menu-trigger:hover { background: rgba(67,24,255,0.06); }
.user-menu-caret { color: var(--muted); transition: transform .2s; flex-shrink: 0; }
.user-menu-wrapper.open .user-menu-caret { transform: rotate(180deg); }

.user-dropdown {
  display: none; position: absolute; top: calc(100% + 10px); right: 0;
  min-width: 250px; background: #fff; border-radius: 20px;
  box-shadow: 0 20px 60px rgba(17,28,68,0.18); z-index: 1001;
  overflow: hidden; animation: dropIn .18s ease;
  border: 1px solid var(--line);
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
  box-shadow: 0 20px 60px rgba(17,28,68,0.18);
  border: 1px solid var(--line);
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
.notif-list { max-height:380px; overflow-y:auto; -webkit-overflow-scrolling: touch; }
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

/* ── Topbar Search Box ── */
.search-box { position: relative; }
.search-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.search-box input {
  padding: 10px 16px 10px 40px; border-radius: 30px;
  border: 1px solid var(--line); background: var(--surface); width: 260px;
  font-family: inherit; font-size: 14px;
  box-shadow: 0 2px 8px rgba(112,144,176,0.06); outline: none;
  color: var(--text);
  transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s, box-shadow 0.15s;
}
.search-box input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(58, 45, 255, 0.12);
  width: 300px;
}
</style>

<header class="app-topbar">
  <div style="display:flex; align-items:center; gap:12px; min-width:0;">
    <button class="mobile-menu-btn" onclick="toggleAdminMobileDrawer(event)" title="Toggle Menu" aria-label="Toggle Menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
    </button>
    <!-- Date / Brand Indicator -->
    <div class="topbar-date-wrapper" style="display:flex; align-items:center; gap:8px; color:var(--text); font-weight:700; font-size:14px; min-width:0;">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <span id="topbar-date" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><?= date('F j, Y') ?></span>
    </div>
  </div>
  <script>
    try {
      document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch(e) {}
  </script>

  <div class="topbar-right">
    <!-- Search -->
    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="search" id="topbarSearch" placeholder="<?= htmlspecialchars($searchPlaceholder) ?>" aria-label="<?= htmlspecialchars($searchPlaceholder) ?>">
    </div>

    <!-- Command Palette (⌘K) -->
    <button type="button" class="topbar-cmdk-btn" onclick="openAdminCmdk()" title="Արագ անցում (⌘K / Ctrl+K)" aria-label="Quick jump">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
      <span class="topbar-cmdk-label">Արագ անցում</span>
      <span class="topbar-cmdk-kbd">⌘K</span>
    </button>

    <!-- Dark / Light Theme Toggle -->
    <button type="button" class="topbar-icon-btn" id="adminThemeToggleBtn" onclick="toggleAdminTheme()" title="Փոխել գունային ռեժիմը (Dark / Light)" aria-label="Toggle theme">
      <svg id="adminThemeIconMoon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      <svg id="adminThemeIconSun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
    </button>

    <!-- Notification Bell -->
    <div class="notif-wrapper" id="topbarNotifWrapper">
      <button class="bell-btn" id="topbarBellBtn" title="<?= __('Notifications') ?>" aria-label="<?= __('Notifications') ?>" onclick="topbarToggleNotif(event)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span class="bell-dot" id="topbarBellDot"></span>
      </button>

      <div class="notif-panel" id="topbarNotifPanel">
        <div class="notif-head">
          <h4><?= __('Notifications') ?> <span class="notif-count-badge" id="topbarNotifBadge">0</span></h4>
          <span class="notif-mark" onclick="topbarMarkAllRead()"><?= __('Mark all read') ?></span>
        </div>
        <div class="notif-list" id="topbarNotifList">
          <div class="notif-loading">Loading…</div>
        </div>
        <div class="notif-footer">
          <a href="/admin_stats.php#push_history"><?= __('Դիտել ողջ պատմությունը →') ?></a>
        </div>
      </div>
    </div>

    <!-- User menu -->
    <div class="user-menu-wrapper" id="userMenuWrapper">
      <div class="user-menu-trigger" onclick="toggleUserMenu(event)" title="<?= __('Account menu') ?>" aria-label="<?= __('Account menu') ?>">
        <div class="topbar-avatar"><?= strtoupper(substr($adminDisplayName, 0, 1)) ?></div>
        <span class="topbar-username" style="font-weight:700; font-size:14px; color:var(--text);"><?= htmlspecialchars($adminDisplayName) ?></span>
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
            <?= __('Dashboard') ?>
          </a>
          <a class="ud-item" href="/songs.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <?= __('Songs') ?>
          </a>
          <a class="ud-item" href="/admin_updates.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <?= __('Settings') ?>
          </a>
          <div class="ud-divider"></div>
          <a class="ud-item danger" href="/admin_logout.php">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <?= __('Log Out') ?>
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
    if (w) w.classList.toggle('open');
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
  var _notifCache = null;

  window.topbarToggleNotif = function(e) {
    e.stopPropagation();
    document.getElementById('userMenuWrapper')?.classList.remove('open');
    var panel = document.getElementById('topbarNotifPanel');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    panel.classList.toggle('open');
    if (!isOpen && !_notifLoaded) {
      loadNotifications();
    }
  };

  function loadNotifications() {
    if (_notifCache !== null) {
      _notifLoaded = true;
      renderNotifications(_notifCache);
      return;
    }
    fetch('/admin_notifications_api.php')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _notifLoaded = true;
        _notifCache = data.items || [];
        renderNotifications(_notifCache);
      })
      .catch(function() {
        document.getElementById('topbarNotifList').innerHTML =
          '<div class="notif-empty"><?= __('Could not load notifications') ?></div>';
      });
  }

  function renderNotifications(items) {
    var badge = document.getElementById('topbarNotifBadge');
    var dot   = document.getElementById('topbarBellDot');
    var list  = document.getElementById('topbarNotifList');

    if (badge) badge.textContent = items.length;
    if (dot)   dot.style.display = items.length > 0 ? '' : 'none';

    if (!items.length) {
      list.innerHTML = '<div class="notif-empty">' + '<?= __('No notifications yet') ?>' + ' 🎉</div>';
      return;
    }

    var html = '';
    items.forEach(function(n) {
      var iconSvg = n.type === 'song'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>'
        : (n.type === 'push'
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>'
          : (n.type === 'request'
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'));

      var targetUrl = n.link || '/admin_stats.php';
      html += '<div class="notif-item" style="cursor:pointer;" onclick="window.location.href=\'' + escHtml(targetUrl) + '\'">'
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
    _notifLoaded = false;
    _notifCache = [];
    var badge = document.getElementById('topbarNotifBadge');
    var dot   = document.getElementById('topbarBellDot');
    var list  = document.getElementById('topbarNotifList');
    if (badge) badge.textContent = '0';
    if (dot)   dot.style.display = 'none';
    if (list)  list.innerHTML = '<div class="notif-empty">' + '<?= __('All caught up! 🎉') ?>' + '</div>';
  };

  document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('topbarSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var query = searchInput.value.trim();
          if (query) {
            var path = window.location.pathname;
            if (path.indexOf('admin_clients') !== -1) {
              window.location.href = '/admin_clients.php?q=' + encodeURIComponent(query);
            } else if (path.indexOf('admin_news') !== -1) {
              window.location.href = '/admin_news.php?q=' + encodeURIComponent(query);
            } else if (path.indexOf('admin_errors') !== -1) {
              var errSearch = document.getElementById('errorSearchInput');
              if (errSearch) {
                errSearch.value = query;
                errSearch.dispatchEvent(new Event('input'));
                return;
              }
              window.location.href = '/admin_errors.php?q=' + encodeURIComponent(query);
            } else {
              window.location.href = '/songs.php?q=' + encodeURIComponent(query);
            }
          }
        }
      });
    }

    fetch('/admin_notifications_api.php')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var items = data.items || [];
        var badge = document.getElementById('topbarNotifBadge');
        var dot   = document.getElementById('topbarBellDot');
        if (badge) badge.textContent = items.length;
        if (dot)   dot.style.display = items.length > 0 ? '' : 'none';
        _notifCache = items;

        var errBadge = document.getElementById('sidebarActiveErrorsBadge');
        var activeErrors = Number(data.active_errors || 0);
        if (errBadge) {
          if (activeErrors > 0) {
            errBadge.textContent = activeErrors > 99 ? '99+' : String(activeErrors);
            errBadge.classList.add('visible');
          } else {
            errBadge.textContent = '';
            errBadge.classList.remove('visible');
          }
        }
      })
      .catch(function() {});

    syncAdminThemeIcon();
  });

  /* ── Dark / Light Theme Toggle ── */
  function syncAdminThemeIcon() {
    var isDark = document.documentElement.getAttribute('data-admin-theme') === 'dark';
    var moon = document.getElementById('adminThemeIconMoon');
    var sun = document.getElementById('adminThemeIconSun');
    if (moon) moon.style.display = isDark ? 'none' : '';
    if (sun) sun.style.display = isDark ? '' : 'none';
  }
  window.toggleAdminTheme = function() {
    var isDark = document.documentElement.getAttribute('data-admin-theme') === 'dark';
    var next = isDark ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.setAttribute('data-admin-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-admin-theme');
    }
    try { localStorage.setItem('wp_admin_theme', next); } catch (_) {}
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', next === 'dark' ? '#0f172a' : '#f4f7fe');
    syncAdminThemeIcon();
  };

  /* ── Command Palette (⌘K / Ctrl+K) ── */
  var CMDK_ITEMS = [
    { label: '🏠 Գլխավոր վահանակ', sub: 'Dashboard & KPIs', url: '/admin_dashboard.php', keys: 'dashboard գլխավոր home' },
    { label: '🎵 Երգերի կառավարում', sub: 'Songs editor & catalog', url: '/songs.php', keys: 'songs երգեր lyrics chords' },
    { label: '👥 Հաճախորդներ', sub: 'Users & accounts', url: '/admin_clients.php', keys: 'clients users հաճախորդներ' },
    { label: '🎤 Թիմի դերեր', sub: 'Worship Roles', url: '/admin_worship_roles.php', keys: 'roles թիմի դերեր' },
    { label: '📊 Վիճակագրություն', sub: 'Statistics & Analytics', url: '/admin_stats.php', keys: 'stats analytics վիճակագրություն' },
    { label: '🔔 Հայտարարություններ և սահմանափակումներ', sub: 'Announcements & Maintenance', url: '/admin_announcements.php', keys: 'announcements maintenance հայտարարություններ' },
    { label: '🚨 Սխալների Մոնիտորինգ', sub: 'Error Logs & Auto-Verify', url: '/admin_errors.php', keys: 'errors logs crash սխալներ' },
    { label: '📱 iOS & Android Հավելվածներ', sub: 'Mobile versions & force update', url: '/admin_mobile.php', keys: 'mobile ios android app' },
    { label: '🧪 Ֆունկցիաների Լաբորատորիա', sub: 'Feature Flags', url: '/admin_features.php', keys: 'features flags լաբ' },
    { label: '📰 Նորություններ', sub: 'News & updates', url: '/admin_news.php', keys: 'news նորություններ' },
    { label: '✉️ Հաղորդագրություններ', sub: 'Messages & support', url: '/admin_messages.php', keys: 'messages support հաղորդագրություններ' },
    { label: '🔎 SEO & Search', sub: 'Meta tags & indexing', url: '/admin_seo.php', keys: 'seo search google' },
    { label: '⚙️ Կարգավորումներ և Թարմացումներ', sub: 'Settings, Push & Moderation', url: '/admin_updates.php', keys: 'settings push moderation կարգավորումներ' },
    { label: '❓ ՀՏՀ (FAQ)', sub: 'Frequently Asked Questions', url: '/admin_faq.php', keys: 'faq հտհ' },
    { label: '🩺 Համակարգի Վիճակ', sub: 'System Status & Health', url: '/admin_status.php', keys: 'status health համակարգի վիճակ' },
    { label: '🖥️ Սերվերի Ծանրաբեռնվածություն', sub: 'Server Load & Storage', url: '/admin_server_load.php', keys: 'server load cpu ram storage սերվեր' },
    { label: '🌓 Փոխել գունային ռեժիմը (Dark / Light)', sub: 'Toggle admin theme', action: 'toggleTheme', keys: 'theme dark light մութ բաց' },
    { label: '🌐 Բացել կայքը (Live)', sub: 'worship.pmstudio.am', url: '/', external: true, keys: 'site live website կայք' }
  ];
  var cmdkActiveIdx = 0;
  var cmdkFiltered = CMDK_ITEMS.slice();

  function renderCmdkList() {
    var list = document.getElementById('adminCmdkList');
    if (!list) return;
    if (!cmdkFiltered.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">Արդյունք չգտնվեց</div>';
      return;
    }
    var html = '';
    cmdkFiltered.forEach(function(item, idx) {
      html += '<button type="button" class="cmdk-item' + (idx === cmdkActiveIdx ? ' active' : '') + '" data-cmdk-idx="' + idx + '">'
        + '<span>' + escHtml(item.label) + '</span>'
        + '<span class="cmdk-item-sub">' + escHtml(item.sub) + '</span>'
        + '</button>';
    });
    list.innerHTML = html;
    list.querySelectorAll('.cmdk-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        runCmdkItem(Number(btn.getAttribute('data-cmdk-idx')));
      });
    });
  }

  function runCmdkItem(idx) {
    var item = cmdkFiltered[idx];
    if (!item) return;
    closeAdminCmdk();
    if (item.action === 'toggleTheme') {
      window.toggleAdminTheme();
      return;
    }
    if (item.external) {
      window.open(item.url, '_blank', 'noopener');
      return;
    }
    if (item.url) {
      window.location.href = item.url;
    }
  }

  window.openAdminCmdk = function() {
    var bd = document.getElementById('adminCmdkBackdrop');
    var input = document.getElementById('adminCmdkInput');
    if (!bd) return;
    bd.classList.add('open');
    cmdkFiltered = CMDK_ITEMS.slice();
    cmdkActiveIdx = 0;
    if (input) {
      input.value = '';
      setTimeout(function() { input.focus(); }, 20);
    }
    renderCmdkList();
  };

  window.closeAdminCmdk = function() {
    var bd = document.getElementById('adminCmdkBackdrop');
    if (bd) bd.classList.remove('open');
  };

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      var bd = document.getElementById('adminCmdkBackdrop');
      if (bd && bd.classList.contains('open')) {
        closeAdminCmdk();
      } else {
        openAdminCmdk();
      }
      return;
    }
    var bd = document.getElementById('adminCmdkBackdrop');
    if (!bd || !bd.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAdminCmdk();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdkActiveIdx = (cmdkActiveIdx + 1) % Math.max(1, cmdkFiltered.length);
      renderCmdkList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdkActiveIdx = (cmdkActiveIdx - 1 + Math.max(1, cmdkFiltered.length)) % Math.max(1, cmdkFiltered.length);
      renderCmdkList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCmdkItem(cmdkActiveIdx);
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('adminCmdkInput');
    if (input) {
      input.addEventListener('input', function() {
        var q = input.value.trim().toLowerCase();
        if (!q) {
          cmdkFiltered = CMDK_ITEMS.slice();
        } else {
          cmdkFiltered = CMDK_ITEMS.filter(function(item) {
            return (item.label + ' ' + item.sub + ' ' + item.keys).toLowerCase().indexOf(q) !== -1;
          });
        }
        cmdkActiveIdx = 0;
        renderCmdkList();
      });
    }
  });
})();
</script>

<!-- Command Palette Modal -->
<div class="cmdk-backdrop" id="adminCmdkBackdrop" onclick="if(event.target===this)closeAdminCmdk()">
  <div class="cmdk-modal" role="dialog" aria-modal="true" aria-label="Quick Admin Navigation">
    <div class="cmdk-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" class="cmdk-input" id="adminCmdkInput" placeholder="Որոնել բաժին կամ գործողություն (օր. Երգեր, Սխալներ, Dark)..." autocomplete="off">
      <span class="topbar-cmdk-kbd">ESC</span>
    </div>
    <div class="cmdk-list" id="adminCmdkList"></div>
    <div class="cmdk-foot">
      <span>↑↓ ընտրել · Enter բացել</span>
      <span>⌘K / Ctrl+K</span>
    </div>
  </div>
</div>
