import re

with open('songs.php', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to replace the <aside class="app-sidebar"> ... </main> block.
# Since regex can be tricky with nested HTML, I'll use string replacement based on known boundaries.

# The boundary starts at <aside class="app-sidebar"> and ends at </main>

start_marker = '<aside class="app-sidebar">'
end_marker = '</main>'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find the bounds to replace in songs.php")
    exit(1)

new_html = """<aside class="app-sidebar">
    <div class="brand">
      <div class="brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
      </div>
      <div class="brand-text"><?= __('Worship') ?></div>
    </div>
    <div class="nav-menu">
      <div class="sidebar-heading">Menu</div>
      <button class="nav-item active" id="tabLibrary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span><?= __('Dashboard') ?></span>
      </button>
      <a class="nav-item" href="songs.php" style="color: var(--primary); font-weight: 700;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span><?= __('Songs') ?></span>
      </a>
      <a class="nav-item" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span><?= __('Clients') ?></span>
      </a>
      <a class="nav-item" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span><?= __('Statistics') ?></span>
      </a>
      <a class="nav-item" href="admin_updates.php">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span><?= __('FAQ') ?></span>
      </a>
      <a class="nav-item" href="admin_logout.php" style="margin-top:auto; color:var(--danger);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span><?= __('Log Out') ?></span>
      </a>
    </div>
    
    <div style="padding: 24px;">
      <div style="background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border-radius: 20px; padding: 24px; color: white; text-align: center; position: relative; overflow: hidden; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.3);">
        <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Upgrade your plan</h4>
        <p style="margin: 0 0 16px; font-size: 13px; opacity: 0.9;">Go to pro to access all features</p>
        <button style="background: white; color: var(--primary); border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; width: 100%;">Upgrade</button>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="app-main">
    <header class="app-topbar">
      <div class="date-display" style="color: var(--text); font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span><?= date('F j, Y') ?></span>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <input id="search" type="search" placeholder="<?= __('Search by name, artist...') ?>">
        </div>
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 2px 10px rgba(0,0,0,0.02); cursor: pointer;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span style="position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: var(--danger); border-radius: 50%; border: 2px solid white;"></span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; box-shadow: 0 4px 10px rgba(67, 24, 255, 0.2);">
            <?= strtoupper(substr($adminDisplayName, 0, 1)) ?>
          </div>
          <span style="font-weight: 700; font-size: 15px; color: var(--text);"><?= htmlspecialchars($adminDisplayName, ENT_QUOTES) ?></span>
        </div>
      </div>
    </header>

    <div class="app-content">
      
      <!-- LIBRARY VIEW (Default) -->
      <div id="libraryPane" class="workspace-pane is-active">
        <div class="page-header" style="padding-bottom: 0; border: none; align-items: flex-start;">
          <div>
            <h2 style="font-size: 34px; margin-bottom: 8px;"><?= __('Songs') ?> 😍</h2>
            <p id="songsCount" style="margin: 0;"><?= __('0 songs in database') ?></p>
          </div>
          <div style="display: flex; gap: 12px; background: #ffffff; padding: 6px; border-radius: 12px; box-shadow: var(--shadow-sm);">
            <button class="btn" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; box-shadow: 0 4px 10px rgba(67,24,255,0.2);">Daily</button>
            <button class="btn" style="background: transparent; color: var(--muted); border: none; padding: 8px 16px; box-shadow: none;">Monthly</button>
          </div>
        </div>

        <!-- Hidden tabs to keep JS happy -->
        <div class="tabs" style="display:none;">
          <button class="workspace-tab is-active" data-workspace-tab="libraryPane">L</button>
          <button class="workspace-tab" data-workspace-tab="editorPane">E</button>
          <button class="workspace-tab" data-workspace-tab="previewPane">P</button>
        </div>

        <!-- STAT CARDS -->
        <div class="stats">
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Total Songs</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;">3,245</strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: #e5f3ff; color: #228fff; display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +20%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Pending Songs</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;">123</strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: #fff8e1; color: #ffce20; display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--danger); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                -11%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
          <div class="stat">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="display: block; color: var(--muted); font-weight: 600; font-size: 15px; margin-bottom: 8px;">Published Songs</span>
                <strong style="font-size: 32px; color: var(--text); display: block; margin-bottom: 12px;">3,100</strong>
              </div>
              <div style="width: 48px; height: 48px; border-radius: 12px; background: #e6f9f3; color: #05cd99; display: flex; align-items: center; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;">
              <span style="color: var(--success); display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                +18%
              </span>
              <span style="color: var(--muted);">Impression</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 32px; border-bottom: 1px solid var(--line); margin-bottom: 32px; margin-top: -10px;">
          <div class="tab active" style="padding: 0 4px 16px;">All Songs</div>
          <div class="tab" style="padding: 0 4px 16px;">Pending Songs</div>
          <div class="tab" style="padding: 0 4px 16px;">Published Songs</div>
          <div class="tab" style="padding: 0 4px 16px;">Draft Songs</div>
          <div class="tab" style="padding: 0 4px 16px;">Deleted Songs</div>
        </div>

        <div class="toolbar" style="margin-bottom: 24px;">
          <div class="toolbar-left">
            <button id="refreshList" class="btn"><?= __('Refresh') ?></button>
            <button id="exportAllPdf" class="btn"><?= __('Export PDF') ?></button>
            <button id="toggleFiltersBtn" class="btn" style="display:none;">Filters</button>
            <div class="lang-switcher">
              <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
              <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
              <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
            </div>
          </div>
          <button id="newSongBtn" class="btn btn-primary" style="padding: 14px 28px;">+ <?= __('Add Song') ?></button>
        </div>
        
        <!-- Filters (Hidden by default in new design, but kept for JS compatibility) -->
        <div id="filtersPanel" class="hidden">
           <select id="sortBy"><option value="newest">Նորից հին</option></select>
           <select id="lyricsFilter"><option value="all">Բոլորը</option></select>
           <input id="keyFilter" type="text">
           <input id="tagFilter" type="text">
           <button id="clearFilters">Մաքրել</button>
           <div id="activeFilters"></div>
        </div>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th style="padding-left: 32px;"><?= __('TITLE') ?></th>
                <th><?= __('ARTIST') ?></th>
                <th><?= __('KEY') ?></th>
                <th><?= __('TEMPO (BPM)') ?></th>
                <th><?= __('STATUS') ?></th>
                <th style="padding-right: 32px;"><?= __('ACTIONS') ?></th>
              </tr>
            </thead>
            <tbody id="songsTable"></tbody>
          </table>
          <div style="padding:24px; text-align:center; border-top: 1px solid var(--line);">
             <button id="loadMoreBtn" class="btn hidden"><?= __('Load More') ?></button>
          </div>
        </div>
        
        <div style="display:none;">
          <span id="tableInfo"></span>
          <span id="tableMetaInfo"></span>
        </div>
      </div>

    </div>
  </main>"""

content = content[:start_idx] + new_html + content[end_idx:]

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(content)

print("songs.php HTML rebuilt successfully.")
