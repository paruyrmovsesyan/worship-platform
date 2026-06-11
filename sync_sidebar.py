with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Find start and end of the aside.app-sidebar
start = content.find('  <aside class="app-sidebar">')
# Find the closing </aside> that matches this one (first occurrence after start)
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
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Dashboard</span>
      </a>
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span>Songs</span>
      </a>
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Clients</span>
      </a>
      <a class="nav-item active" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span>Statistics</span>
      </a>
      <a class="nav-item" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>FAQ</span>
      </a>
      <a class="nav-item" href="admin_logout.php" style="color:var(--danger);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span><?= __('Դուրս գալ') ?></span>
      </a>

      <!-- HIDDEN section switcher — kept for JS functionality -->
      <?php if ($hasAnyAdminSectionAccess): ?>
      <div class="section-switcher" role="tablist" aria-label="Admin" style="display:none; visibility:hidden; position:absolute; pointer-events:none;">
        <?php if (!empty($adminSectionPermissions['release'])): ?>
        <button class="section-tab active" type="button" data-section-tab="release"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['maintenance'])): ?>
        <button class="section-tab" type="button" data-section-tab="maintenance"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['push'])): ?>
        <button class="section-tab" type="button" data-section-tab="push"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['devices'])): ?>
        <button class="section-tab" type="button" data-section-tab="devices"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['history'])): ?>
        <button class="section-tab" type="button" data-section-tab="history"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['access'])): ?>
        <button class="section-tab" type="button" data-section-tab="access"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['moderation'])): ?>
        <button class="section-tab" type="button" data-section-tab="moderation"></button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['translations'])): ?>
        <button class="section-tab" type="button" data-section-tab="translations"></button>
        <?php endif; ?>
      </div>
      <?php endif; ?>
    </div>

    <div style="padding: 24px;">
      <div style="background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border-radius: 20px; padding: 24px; color: white; text-align: center; position: relative; overflow: hidden; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.3);">
        <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Upgrade your plan</h4>
        <p style="margin: 0 0 16px; font-size: 13px; opacity: 0.9;">Go to pro to access all features</p>
        <button style="background: white; color: var(--primary); border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; width: 100%;">Upgrade</button>
      </div>
    </div>
  </aside>'''

content = content[:start] + new_sidebar + content[end:]

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Sidebar replaced: chars {start} to {end}")
