import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Sidebar
sidebar_start = '<aside class="app-sidebar">'
sidebar_end = '</aside>'
s_idx = content.find(sidebar_start)
e_idx = content.find(sidebar_end, s_idx) + len(sidebar_end)

new_sidebar = """<aside class="app-sidebar">
    <div class="brand">
      <div class="brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
      </div>
      <div class="brand-text">Worship Admin</div>
    </div>
    <div class="nav-menu">
      <div class="sidebar-heading">Menu</div>
      <a class="nav-item" href="songs.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span><?= __('Երգերի ցանկ') ?></span>
      </a>
      
      <?php if ($hasAnyAdminSectionAccess): ?>
      <div class="section-switcher" role="tablist" aria-label="Admin բաժիններ">
        <?php if (!empty($adminSectionPermissions['release'])): ?>
        <button class="section-tab active" type="button" data-section-tab="release">
          <span>📦 <?= __('Ծրագրի կարգավորումներ') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['maintenance'])): ?>
        <button class="section-tab" type="button" data-section-tab="maintenance">
          <span>🔧 <?= __('Սպասարկում') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['push'])): ?>
        <button class="section-tab" type="button" data-section-tab="push">
          <span>🔔 <?= __('Ծանուցումներ') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['devices'])): ?>
        <button class="section-tab" type="button" data-section-tab="devices">
          <span>📱 <?= __('Սարքեր') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['history'])): ?>
        <button class="section-tab" type="button" data-section-tab="history">
          <span>🕘 <?= __('Պատմություն') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['access'])): ?>
        <button class="section-tab" type="button" data-section-tab="access">
          <span>🔑 <?= __('Մուտքեր') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['moderation'])): ?>
        <button class="section-tab" type="button" data-section-tab="moderation">
          <span>✅ <?= __('Մոդերացիա') ?></span>
        </button>
        <?php endif; ?>
        <?php if (!empty($adminSectionPermissions['translations'])): ?>
        <button class="section-tab" type="button" data-section-tab="translations">
          <span>🌐 <?= __('Թարգմանություն') ?></span>
        </button>
        <?php endif; ?>
      </div>
      <?php endif; ?>

      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 12px;">
        <div class="lang-switcher">
          <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
          <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
          <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
        </div>
        <a class="nav-item" href="admin_logout.php" style="color:var(--danger); border: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span><?= __('Դուրս գալ') ?></span>
        </a>
      </div>
    </div>
  </aside>"""

content = content[:s_idx] + new_sidebar + content[e_idx:]


# Replace the main header area
main_start = '<main class="app-main">'
main_end_match = '<div class="page-header" style="margin-bottom:32px;">'
ms_idx = content.find(main_start)
pe_idx = content.find('</div>', content.find(main_end_match)) + 6

new_main_top = """<main class="app-main">
    <header class="app-topbar">
      <div class="date-display" style="color: var(--text); font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span><?= date('F j, Y') ?></span>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <input type="search" placeholder="Search setting...">
        </div>
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 2px 10px rgba(0,0,0,0.02); cursor: pointer;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span style="position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: var(--danger); border-radius: 50%; border: 2px solid white;"></span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; box-shadow: 0 4px 10px rgba(67, 24, 255, 0.2);">
            <?= strtoupper(substr($adminDisplayName ?? 'A', 0, 1)) ?>
          </div>
          <span style="font-weight: 700; font-size: 15px; color: var(--text);"><?= htmlspecialchars($adminDisplayName ?? 'Admin', ENT_QUOTES) ?></span>
        </div>
      </div>
    </header>

    <div class="app-content">
      <div class="page-header" style="padding-bottom: 0; border: none; align-items: flex-start; margin-bottom: 32px; display: flex; justify-content: space-between;">
        <div>
          <h2 style="font-size: 34px; margin-bottom: 8px; font-weight:800; color:var(--text); letter-spacing:-0.5px;"><?= __('Համակարգի կարգավորումներ') ?> 😍</h2>
          <p style="margin:0; font-size:15px; color:var(--muted); font-weight: 500;"><?= __('Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։') ?></p>
        </div>
        <div style="display: flex; gap: 12px; background: #ffffff; padding: 6px; border-radius: 12px; box-shadow: var(--shadow-sm);">
          <button class="btn" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; box-shadow: 0 4px 10px rgba(67,24,255,0.2);">Daily</button>
          <button class="btn" style="background: transparent; color: var(--muted); border: none; padding: 8px 16px; box-shadow: none;">Monthly</button>
        </div>
      </div>"""

content = content[:ms_idx] + new_main_top + content[pe_idx:]

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(content)

print("admin_updates.php sidebar & topbar HTML rebuilt successfully.")
