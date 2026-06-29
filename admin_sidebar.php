<?php
// admin_sidebar.php — Shared sidebar include for all admin pages
// Usage: include __DIR__ . '/admin_sidebar.php';
// Expected variables: $adminDisplayName, $adminLang, $activePage ('dashboard'|'songs'|'clients'|'statistics'|'settings'|'faq')
$activePage = $activePage ?? 'dashboard';
$adminLang  = $adminLang ?? 'hy';
$adminDisplayName = $adminDisplayName ?? 'Admin';

$navItems = [
    'dashboard'  => ['label' => __('Dashboard'),   'href' => '/admin_dashboard.php',  'icon' => '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>'],
    'songs'      => ['label' => __('Songs'),        'href' => '/songs.php',             'icon' => '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>'],
    'clients'    => ['label' => __('Clients'),      'href' => '/admin_clients.php',     'icon' => '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'],
    'statistics' => ['label' => __('Statistics'),   'href' => '/admin_stats.php',       'icon' => '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>'],
    'messages'   => ['label' => __('Messages'),     'href' => '/admin_messages.php',    'icon' => '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>'],
    'settings'   => ['label' => __('Settings'),     'href' => '/admin_updates.php',     'icon' => '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'],
    'faq'        => ['label' => __('FAQ'),          'href' => '/admin_faq.php',         'icon' => '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>'],
];
?>
<!-- Global Page Loader -->
<div id="globalAdminLoader" aria-hidden="true">
  <div class="global-pulse"></div>
</div>
<script>
  window.addEventListener('load', function() {
    var loader = document.getElementById('globalAdminLoader');
    if (loader) {
      setTimeout(function() {
        loader.classList.add('hide');
      }, 150); // slight delay for smooth transition
    }
  });
</script>

<div class="sidebar-overlay" onclick="document.body.classList.remove('sidebar-open')"></div>
<aside class="app-sidebar">
  <div class="brand">
    <div class="brand-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
    </div>
    <div class="brand-text" style="font-size:13px; line-height:1.3; font-weight:800; letter-spacing:-0.2px;"><?= __('Worship<br>Platform Admin') ?></div>
  </div>

  <div class="nav-menu">
    <div class="sidebar-heading"><?= __('Menu') ?></div>

    <?php foreach ($navItems as $key => $item): ?>
    <a class="nav-item <?= $activePage === $key ? 'active' : '' ?>" href="<?= $item['href'] ?>">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><?= $item['icon'] ?></svg>
      <span><?= htmlspecialchars($item['label']) ?></span>
    </a>
    <?php endforeach; ?>

    <div style="margin-top: 16px; padding: 0 16px;">
      <div class="lang-switcher" style="display:inline-flex; width:100%;">
        <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>" style="flex:1; text-align:center;">AM</a>
        <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>" style="flex:1; text-align:center;">RU</a>
        <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>" style="flex:1; text-align:center;">EN</a>
      </div>
    </div>


    <a class="nav-item" href="/admin_logout.php" style="color:var(--danger); margin-top: 8px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span><?= __('Log Out') ?></span>
    </a>
  </div>


</aside>
