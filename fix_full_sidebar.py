with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('  <aside class="app-sidebar">')
end = content.find('  </aside>', start) + len('  </aside>')

new_sidebar = '''  <aside class="app-sidebar">
    <div class="brand">
      <div class="brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
      </div>
      <div class="brand-text">Worship</div>
    </div>

    <div class="nav-menu">
      <div class="sidebar-heading">Menu</div>

      <!-- Dashboard -->
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Dashboard</span>
      </a>

      <!-- Songs -->
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span>Songs</span>
      </a>

      <!-- Clients -->
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Clients</span>
      </a>

      <!-- Statistics (active - this is admin_updates.php) -->
      <a class="nav-item active" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span>Statistics</span>
      </a>

      <!-- FAQ -->
      <a class="nav-item" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>FAQ</span>
      </a>

      <!-- ─── SECTION SEPARATOR ─────────────────────────── -->
      <?php if ($hasAnyAdminSectionAccess): ?>
      <div class="sidebar-heading" style="margin-top: 24px;">Settings</div>

      <?php if (!empty($adminSectionPermissions['release'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="release">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        <span><?= __('Ծրագրի կարգավորումներ') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['maintenance'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="maintenance">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
        <span><?= __('Սպասարկում') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['push'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="push">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span><?= __('Ծանուցումներ') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['devices'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="devices">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        <span><?= __('Սարքեր') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['history'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="history">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span><?= __('Պատմություն') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['access'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="access">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
        <span><?= __('Մուտքեր') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['moderation'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="moderation">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span><?= __('Մոդերացիա') ?></span>
      </button>
      <?php endif; ?>

      <?php if (!empty($adminSectionPermissions['translations'])): ?>
      <button class="section-tab nav-item" type="button" data-section-tab="translations">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        <span><?= __('Թարգմանություն') ?></span>
      </button>
      <?php endif; ?>

      <?php endif; ?>

      <!-- Language switcher -->
      <div style="margin-top: 16px; padding: 0 24px;">
        <div class="lang-switcher">
          <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
          <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
          <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
        </div>
      </div>

      <!-- Log Out -->
      <a class="nav-item" href="admin_logout.php" style="color:var(--danger); margin-top: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span><?= __('Դուրս գալ') ?></span>
      </a>
    </div>

    <div style="padding: 24px; padding-top: 0; margin-top: auto;">
      <div style="background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border-radius: 20px; padding: 24px; color: white; text-align: center; overflow: hidden; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.3);">
        <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Upgrade your plan</h4>
        <p style="margin: 0 0 16px; font-size: 13px; opacity: 0.9;">Go to pro to access all features</p>
        <button style="background: white; color: var(--primary); border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; width: 100%;">Upgrade</button>
      </div>
    </div>
  </aside>'''

content = content[:start] + new_sidebar + content[end:]

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Full functional sidebar replaced (chars {start} to {end})")
