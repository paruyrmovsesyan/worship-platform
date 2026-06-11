<?php
/**
 * admin_topbar.php — Shared top navigation bar
 * Expected: $adminDisplayName, $adminEmail, $searchPlaceholder
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
.user-menu-caret {
  color: var(--muted);
  transition: transform .2s;
  flex-shrink: 0;
}
.user-menu-wrapper.open .user-menu-caret { transform: rotate(180deg); }

.user-dropdown {
  display: none;
  position: absolute; top: calc(100% + 10px); right: 0;
  min-width: 240px;
  background: #fff; border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.14);
  z-index: 1000;
  overflow: hidden;
  animation: dropIn .18s ease;
}
.user-menu-wrapper.open .user-dropdown { display: block; }
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Header block */
.ud-header {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 12px;
}
.ud-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 18px; flex-shrink: 0;
}
.ud-name  { font-size: 15px; font-weight: 700; color: var(--text); }
.ud-email { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* Menu items */
.ud-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px;
  color: var(--text); font-size: 14px; font-weight: 600;
  text-decoration: none; cursor: pointer;
  border: none; background: none; width: 100%;
  font-family: inherit; text-align: left;
  transition: background .12s;
}
.ud-item:hover { background: #f4f7fe; }
.ud-item.danger { color: var(--danger); }
.ud-item.danger:hover { background: var(--danger-bg); }
.ud-item svg { flex-shrink: 0; }
.ud-divider { height: 1px; background: var(--line); margin: 4px 0; }
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

    <!-- Bell (basic, pages that need it override this) -->
    <button class="bell-btn" id="topbarBellBtn" title="Notifications">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      <span class="bell-dot"></span>
    </button>

    <!-- User menu -->
    <div class="user-menu-wrapper" id="userMenuWrapper">
      <div class="user-menu-trigger" id="userMenuTrigger" onclick="toggleUserMenu(event)" title="Account menu">
        <div class="topbar-avatar"><?= strtoupper(substr($adminDisplayName, 0, 1)) ?></div>
        <span style="font-weight:700; font-size:15px; color:var(--text);"><?= htmlspecialchars($adminDisplayName) ?></span>
        <svg class="user-menu-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>

      <div class="user-dropdown" id="userDropdown">
        <!-- Profile header -->
        <div class="ud-header">
          <div class="ud-avatar"><?= strtoupper(substr($adminDisplayName, 0, 1)) ?></div>
          <div>
            <div class="ud-name"><?= htmlspecialchars($adminDisplayName) ?></div>
            <?php if ($adminEmail): ?>
            <div class="ud-email"><?= htmlspecialchars($adminEmail) ?></div>
            <?php endif; ?>
          </div>
        </div>

        <!-- Navigation items -->
        <div style="padding: 6px 0;">
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
    </div><!-- user-menu-wrapper -->
  </div>
</header>

<script>
(function() {
  function toggleUserMenu(e) {
    e.stopPropagation();
    document.getElementById('userMenuWrapper').classList.toggle('open');
  }
  // expose to global so inline onclick works
  window.toggleUserMenu = toggleUserMenu;

  // Close on outside click
  document.addEventListener('click', function(e) {
    var w = document.getElementById('userMenuWrapper');
    if (w && !w.contains(e.target)) w.classList.remove('open');
  });

  // Escape key closes
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.getElementById('userMenuWrapper')?.classList.remove('open');
    }
  });
})();
</script>
