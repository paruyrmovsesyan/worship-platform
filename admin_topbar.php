<?php
/**
 * admin_topbar.php — Shared top navigation bar
 * Expected: $adminDisplayName, $searchPlaceholder
 */
$searchPlaceholder = $searchPlaceholder ?? 'Search...';
?>
<header class="app-topbar">
  <div style="display:flex; align-items:center; gap:10px; color:var(--text); font-weight:700; font-size:15px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    <?= date('F j, Y') ?>
  </div>
  <div class="topbar-right">
    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="search" id="topbarSearch" placeholder="<?= htmlspecialchars($searchPlaceholder) ?>">
    </div>
    <button class="bell-btn" title="Notifications">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      <span class="bell-dot"></span>
    </button>
    <div style="display:flex; align-items:center; gap:12px;">
      <div class="topbar-avatar"><?= strtoupper(substr($adminDisplayName, 0, 1)) ?></div>
      <span style="font-weight:700; font-size:15px; color:var(--text);"><?= htmlspecialchars($adminDisplayName) ?></span>
    </div>
  </div>
</header>
