import os

def build_v4():
    # Read original
    with open('songs.php', 'r', encoding='utf-8') as f:
        content = f.read()
        
    shell_idx = content.find('<div class="app-layout">')
    if shell_idx == -1:
        shell_idx = content.find('<div class="saas-layout">')
    if shell_idx == -1:
        shell_idx = content.find('<div class="shell">')
    
    script_idx = content.rfind('<script>')
    
    php_header = content[:shell_idx]
    js_footer = content[script_idx:]
    
    # Check if there is a style block to replace
    style_start = php_header.find('<style>')
    style_end = php_header.find('</style>')
    if style_start != -1 and style_end != -1:
        # Keep php up to <style> and from </style> to body
        php_header = php_header[:style_start] + php_header[style_end + len('</style>'):]


    NEW_CSS = """<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #f4f6f8;
  --surface: #ffffff;
  --line: #e2e8f0;
  --line-soft: #f1f5f9;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #f97316;
  --primary-hover: #ea580c;
  --success: #10b981;
  --success-bg: #d1fae5;
  --warning: #f59e0b;
  --warning-bg: #fef3c7;
  --danger: #ef4444;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  --radius-sm: 6px;
  --radius: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden; /* SaaS layout manages scroll */
}

/* ── LAYOUT ── */
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.app-sidebar {
  width: 260px;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.brand {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
  border-bottom: 1px solid var(--line-soft);
}
.brand-icon {
  width: 32px; height: 32px;
  background: var(--text);
  color: #fff;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 14px;
}
.brand-text { font-weight: 700; font-size: 16px; color: var(--text); }

.nav-menu {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--radius);
  color: var(--muted);
  font-weight: 500;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}
.nav-item:hover { background: var(--line-soft); color: var(--text); }
.nav-item.active { background: #ffedd5; color: var(--primary); font-weight: 600; }

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-topbar {
  height: 72px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  flex-shrink: 0;
}

.search-box {
  position: relative;
  width: 380px;
}
.search-box input {
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: #f8fafc;
  font-size: 14px;
  transition: all 0.2s;
}
.search-box input:focus { background: #fff; border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
.search-box::before {
  content: '🔍';
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.topbar-right { display: flex; align-items: center; gap: 16px; }

.app-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

/* ── UI COMPONENTS ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 18px; border-radius: var(--radius-sm);
  font-weight: 600; font-size: 14px;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid var(--line); background: var(--surface); color: var(--text);
  box-shadow: var(--shadow-sm);
}
.btn:hover { background: #f8fafc; }
.btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }

.pill {
  padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
  background: var(--surface); border: 1px solid var(--line); color: var(--muted);
}
.pill.success { background: var(--success-bg); color: #065f46; border-color: #a7f3d0; }
.pill.warning { background: var(--warning-bg); color: #92400e; border-color: #fde68a; }

/* ── TABLE VIEW ── */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 16px;
}
.page-header h2 { margin: 0; font-size: 24px; font-weight: 700; color: var(--text); }
.page-header p { margin: 4px 0 0; font-size: 14px; color: var(--muted); }
.mini-pills { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
.mini-pill { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: var(--line); color: var(--muted); }
.status-pill.has-lyrics { background: var(--success-bg); color: var(--success); }
.status-pill.no-lyrics { background: var(--warning-bg); color: var(--warning); }
.mobile-key-pill { background: #e0e7ff; color: #4338ca; }
.song-title strong { font-size: 14px; font-weight: 600; color: var(--text); cursor: pointer; }
.song-title strong:hover { color: var(--primary); text-decoration: underline; }
.song-meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
.song-title { padding: 4px 0; }
.tabs { display: flex; gap: 32px; }
.tab {
  padding: 0 4px 12px; border: none; background: transparent;
  color: var(--muted); font-weight: 500; font-size: 14px;
  border-bottom: 2px solid transparent; cursor: pointer; margin-bottom: -17px;
}
.tab.active { color: var(--text); font-weight: 600; border-bottom-color: var(--primary); }

.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.toolbar-left { display: flex; gap: 12px; }

.table-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow-sm);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
th { background: #f8fafc; color: var(--muted); font-weight: 600; font-size: 13px; text-transform: uppercase; text-align: left; padding: 16px; border-bottom: 1px solid var(--line); }
td { padding: 16px; border-bottom: 1px solid var(--line); font-size: 14px; vertical-align: middle; }
tbody tr:hover { background: #f8fafc; }
tbody tr:last-child td { border-bottom: none; }

.song-title-cell strong { color: var(--text); font-weight: 600; display: block; margin-bottom: 4px;}
.song-title-cell span { color: var(--muted); font-size: 12px; }

/* ── EDITOR MODAL ── */
.editor-modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex; justify-content: flex-end;
  opacity: 0; pointer-events: none; transition: opacity 0.3s;
}
.editor-modal.is-active { opacity: 1; pointer-events: auto; }

.editor-drawer {
  width: 800px; max-width: 100%;
  background: var(--surface);
  height: 100%;
  box-shadow: -10px 0 25px rgba(0,0,0,0.1);
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.editor-modal.is-active .editor-drawer { transform: translateX(0); }

.editor-header {
  padding: 24px 32px; border-bottom: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center;
}
.editor-body {
  padding: 32px; flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 24px;
}
.editor-footer {
  padding: 24px 32px; border-top: 1px solid var(--line); background: #f8fafc;
  display: flex; justify-content: flex-end; gap: 12px;
}

/* Forms inside editor */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 8px; }
.form-field label { font-size: 13px; font-weight: 600; color: var(--text); }
.form-field input, .form-field textarea {
  padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm);
  font-family: inherit; font-size: 14px;
}
.form-field textarea { min-height: 120px; resize: vertical; font-family: monospace; }
.form-field input:focus, .form-field textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }

/* Utility */
.hidden { display: none !important; }

/* Dashboard Loader Override */
#adminPageLoader { position:fixed; inset:0; z-index:2000; background:var(--bg); display:flex; align-items:center; justify-content:center; }
#adminPageLoader.hide { display: none; }
#adminPageLoaderCard { background:#fff; padding:30px; border-radius:12px; border:1px solid var(--line); text-align:center;}


.lang-switcher { display: flex; gap: 4px; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 2px; background: #f8fafc; }
.lang-btn { text-decoration: none; color: var(--muted); font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; transition: 0.2s; }
.lang-btn:hover { color: var(--text); }
.lang-btn.active { background: #fff; color: var(--primary); box-shadow: var(--shadow-sm); }
</style>"""

    i18n_php = """
require_once __DIR__ . '/translation_runtime.php';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'])) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
$hardcoded_i18n = [
    'ru' => [
        'Երգերի ցանկ' => 'Список песен', 'Կարգավորումներ' => 'Настройки', 'Դուրս գալ' => 'Выйти',
        'Ադմին' => 'Админ', 'Կարգավորումներ և համակարգ' => 'Настройки и система',
        'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։' => 'Управляйте версиями, устройствами, доступами и т.д.',
        'Թարմացումներ' => 'Обновления', 'Սպասարկում' => 'Обслуживание', 'Սարքեր' => 'Устройства',
        'Պատմություն' => 'История', 'Մուտքեր' => 'Доступы', 'Մոդերացիա' => 'Модерация', 'Թարգմանություն' => 'Переводы',
        'Թարմացնել' => 'Обновить', 'Բոլորը PDF' => 'Все в PDF', 'Ավելացնել երգ' => 'Добавить песню',
        'ԱՆՎԱՆՈՒՄ' => 'НАЗВАНИЕ', 'ԿԱՏԱՐՈՂ' => 'ИСПОЛНИТЕЛЬ', 'ՏՈՆԱՅՆՈՒԹՅՈՒՆ' => 'ТОНАЛЬНОСТЬ',
        'ՏԵՄՊ (BPM)' => 'ТЕМП (BPM)', 'ԿԱՐԳԱՎԻՃԱԿ' => 'СТАТУС', 'ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐ' => 'ДЕЙСТВИЯ',
        'Բեռնել մնացածը' => 'Загрузить еще', 'Ավելացնել / Խմբագրել երգ' => 'Добавить / Изменить',
        'Մաքրել' => 'Очистить', 'Չեղարկել' => 'Отменить', 'Անվանում' => 'Название', 'Կատարող' => 'Исполнитель',
        'Տոնայնություն' => 'Тональность', 'Տեգեր' => 'Теги', 'Ակորդներ' => 'Аккорды', 'Բառեր' => 'Текст',
        'Նախադիտում և Տրանսպոզիցիա' => 'Предпросмотр и Транспозиция', 'Օգտագործել բեմոլներ (b)' => 'Использовать бемоли (b)',
        'Խմբագրումը չեղարկված է' => 'Редактирование отменено', 'ընդհանուր' => 'всего', 'բառերով' => 'с текстом',
        'երգ' => 'пес.', 'Անանուն' => 'Без названия', 'Կատարող նշված չէ' => 'Неизвестный', 'Երգը պահպանված է ✅' => 'Сохранено ✅'
    ],
    'en' => [
        'Երգերի ցանկ' => 'Music Library', 'Կարգավորումներ' => 'Settings', 'Դուրս գալ' => 'Log Out',
        'Ադմին' => 'Admin', 'Կարգավորումներ և համակարգ' => 'Settings & System',
        'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։' => 'Manage app versions, devices, accesses, etc.',
        'Թարմացումներ' => 'Updates', 'Սպասարկում' => 'Maintenance', 'Սարքեր' => 'Devices',
        'Պատմություն' => 'History', 'Մուտքեր' => 'Access', 'Մոդերացիա' => 'Moderation', 'Թարգմանություն' => 'Translations',
        'Թարմացնել' => 'Refresh', 'Բոլորը PDF' => 'Export All PDF', 'Ավելացնել երգ' => 'Add Song',
        'ԱՆՎԱՆՈՒՄ' => 'TITLE', 'ԿԱՏԱՐՈՂ' => 'ARTIST', 'ՏՈՆԱՅՆՈՒԹՅՈՒՆ' => 'KEY',
        'ՏԵՄՊ (BPM)' => 'TEMPO (BPM)', 'ԿԱՐԳԱՎԻՃԱԿ' => 'STATUS', 'ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐ' => 'ACTIONS',
        'Բեռնել մնացածը' => 'Load More', 'Ավելացնել / Խմբագրել երգ' => 'Add / Edit Song',
        'Մաքրել' => 'Clear', 'Չեղարկել' => 'Cancel', 'Անվանում' => 'Title', 'Կատարող' => 'Artist',
        'Տոնայնություն' => 'Key', 'Տեգեր' => 'Tags', 'Ակորդներ' => 'Chords', 'Բառեր' => 'Lyrics',
        'Նախադիտում և Տրանսպոզիցիա' => 'Preview & Transpose', 'Օգտագործել բեմոլներ (b)' => 'Use flats (b)',
        'Խմբագրումը չեղարկված է' => 'Edit Canceled', 'ընդհանուր' => 'total', 'բառերով' => 'with lyrics',
        'երգ' => 'songs', 'Անանուն' => 'Untitled', 'Կատարող նշված չէ' => 'Unknown Artist', 'Երգը պահպանված է ✅' => 'Saved ✅'
    ]
];
if (!function_exists('__')) {
    function __($text, $context = 'ui') {
        global $adminLang, $hardcoded_i18n;
        if ($adminLang === 'hy' || trim($text) === '') return $text;
        $cached = wp_translation_cache_get($adminLang, $context, $text);
        if ($cached) return $cached;
        return $hardcoded_i18n[$adminLang][$text] ?? $text;
    }
}

// Generate JSON for JS translations
$js_i18n_keys = [
    'Published' => __('Բառերով'),
    'Draft' => __('Առանց բառերի'),
    'Edit' => __('Խմբագրել'),
    'Delete' => __('Ջնջել'),
    'Cancel' => __('Չեղարկել'),
    'Save' => __('Պահպանել'),
    'Saving' => __('Պահպանվում է...'),
    'Saved' => __('Պահպանված է'),
    'Error' => __('Սխալ'),
    'Loading' => __('Բեռնվում է...'),
    'ConfirmDelete' => __('Վստա՞հ եք, որ ուզում եք ջնջել այս երգը:')
];
"""

    admin_access_str = "require_once __DIR__ . '/admin_access.php';"
    if admin_access_str in php_header:
        php_header = php_header.replace(admin_access_str, admin_access_str + "\n" + i18n_php)
    else:
        php_header = php_header + "\n<?php\n" + i18n_php + "\n?>\n"

    NEW_BODY = """
<div class="app-layout">
  <!-- SIDEBAR -->
  <aside class="app-sidebar">
    <div class="brand">
      <div class="brand-icon">WY</div>
      <div class="brand-text"><?= __('Worship Admin') ?></div>
    </div>
    <div class="nav-menu">
      <button class="nav-item active" id="tabLibrary"><?= __('Երգերի ցանկ') ?></button>
      <a class="nav-item" href="admin_updates.php"><?= __('Կարգավորումներ') ?></a>
      <a class="nav-item" href="admin_logout.php" style="color:var(--danger); margin-top:auto;"><?= __('Դուրս գալ') ?></a>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="app-main">
    <header class="app-topbar">
      <div class="search-box">
        <input id="search" type="search" placeholder="<?= __('Որոնել անունով, կատարողով...') ?>">
      </div>
      <div class="topbar-right">
      <div class="lang-switcher">
        <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
        <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
        <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
      </div>

        <span class="pill"><?= htmlspecialchars($adminDisplayName, ENT_QUOTES) ?></span>
      </div>
    </header>

    <div class="app-content">
      
      <!-- LIBRARY VIEW (Default) -->
      <div id="libraryPane" class="workspace-pane is-active">
        <div class="page-header">
          <div>
            <h2><?= __('Երգերի ցանկ') ?></h2>
            <p id="songsCount">0 երգ</p>
          </div>
          <div class="tabs" style="display:none;">
            <!-- Hidden tabs to keep JS happy -->
            <button class="workspace-tab is-active" data-workspace-tab="libraryPane">L</button>
            <button class="workspace-tab" data-workspace-tab="editorPane">E</button>
            <button class="workspace-tab" data-workspace-tab="previewPane">P</button>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button id="refreshList" class="btn"><?= __('Թարմացնել') ?></button>
            <button id="exportAllPdf" class="btn"><?= __('Բոլորը PDF') ?></button>
            <button id="toggleFiltersBtn" class="btn" style="display:none;">Ֆիլտրեր</button>
          </div>
          <button id="newSongBtn" class="btn btn-primary"><?= __('Ավելացնել երգ') ?></button>
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
                <th><?= __('ԱՆՎԱՆՈՒՄ') ?></th>
                <th><?= __('ԿԱՏԱՐՈՂ') ?></th>
                <th><?= __('ՏՈՆԱՅՆՈՒԹՅՈՒՆ') ?></th>
                <th><?= __('ՏԵՄՊ (BPM)') ?></th>
                <th><?= __('ԿԱՐԳԱՎԻՃԱԿ') ?></th>
                <th><?= __('ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐ') ?></th>
              </tr>
            </thead>
            <tbody id="songsTable"></tbody>
          </table>
          <div style="padding:16px; text-align:center;">
             <button id="loadMoreBtn" class="btn hidden"><?= __('Բեռնել մնացածը') ?></button>
          </div>
        </div>
        
        <div style="display:none;">
          <span id="tableInfo"></span>
          <span id="tableMetaInfo"></span>
        </div>
      </div>

    </div>
  </main>
  
  <!-- EDITOR OVERLAY (Modal Drawer) -->
  <div id="editorPane" class="editor-modal workspace-pane">
    <div class="editor-drawer">
      <div class="editor-header">
        <h3 style="margin:0;"><?= __('Ավելացնել / Խմբագրել երգ') ?></h3>
        <div style="display: flex; gap: 8px;">
          <button id="clearForm" class="btn compact-btn" title="Մաքրել">🔄</button>
          <button id="downloadTxt" class="btn compact-btn">TXT</button>
          <button id="exportPdf" class="btn compact-btn">PDF</button>
          <button id="cancelEdit" class="btn compact-btn" style="background:#fee2e2; color:#ef4444; border:none;"><?= __('Չեղարկել') ?></button>
        </div>
      </div>
      <div class="editor-body">
        
        <div class="form-grid">
          <div class="form-field">
            <label><?= __('Անվանում') ?></label>
            <input id="title" type="text" placeholder="Օր. Մեր սուրբ Աստված">
          </div>
          <div class="form-field">
            <label><?= __('Անվանում') ?> (RU)</label>
            <input id="title_ru" type="text">
          </div>
          <div class="form-field">
            <label><?= __('Անվանում') ?> (LAT)</label>
            <input id="title_lat" type="text">
          </div>
          <div class="form-field">
            <label><?= __('Անվանում') ?> (EN)</label>
            <input id="title_en" type="text">
          </div>
        </div>
        
        <div class="form-grid">
          <div class="form-field">
            <label><?= __('Կատարող') ?></label>
            <input id="artist" type="text">
          </div>
          <div class="form-field">
            <label><?= __('Տոնայնություն') ?></label>
            <input id="key" type="text">
          </div>
          <div class="form-field">
            <label><?= __('BPM') ?></label>
            <input id="bpm" type="number">
          </div>
          <div class="form-field">
            <label><?= __('Տեգեր') ?></label>
            <input id="tags" type="text">
          </div>
        </div>
        
        <div class="form-field">
          <label><?= __('Ակորդներ') ?></label>
          <textarea id="chords"></textarea>
        </div>
        <div class="form-field">
          <label><?= __('Բառեր') ?></label>
          <textarea id="lyrics"></textarea>
        </div>
        
        <div class="preview-section" style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
             <h4 style="margin:0; color: var(--text);"><?= __('Նախադիտում և Տրանսպոզիցիա') ?></h4>
             <label style="font-size:12px; display:flex; align-items:center; gap:4px; color: var(--text);">
               <input id="useFlats" type="checkbox"> <?= __('Օգտագործել բեմոլներ (b)') ?>
             </label>
           </div>
           <div id="keysGrid" style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:16px;"></div>
           <div class="preview-meta">
             <p id="previewMeta" style="margin: 0 0 12px; font-size: 12px; color: var(--muted);"></p>
             <div class="mini-pills" style="margin-bottom:12px;">
               <span class="mini-pill" id="selectedKeyPill"></span>
               <span class="mini-pill" id="transposeInfo"></span>
             </div>
           </div>
           <pre id="preview" style="background:#fff; padding:16px; border-radius:8px; border:1px solid #e2e8f0; font-family:monospace; white-space:pre-wrap; overflow-x:auto; min-height:100px; color: var(--text);"></pre>
        </div>
        <span id="previewTitle" style="display:none;"></span>


      </div>
      <div class="editor-footer">
        <button id="previewTrigger" class="btn" onclick="document.getElementById('previewPane').classList.add('is-active')"><?= __('Preview') ?></button>
        <button id="saveSong" class="btn btn-primary"><?= __('Save Song') ?></button>
      </div>
    </div>
  </div>
  
  <!-- PREVIEW OVERLAY -->
  <div id="previewPane" class="editor-modal workspace-pane">
    <div class="editor-drawer" style="width:600px;">
      <div class="editor-header">
        <h3 id="preview<?= __('Title') ?>" style="margin:0;"><?= __('Preview') ?></h3>
        <button class="btn" onclick="document.getElementById('previewPane').classList.remove('is-active')">Close <?= __('Preview') ?></button>
      </div>
      <div class="editor-body">
         <div id="preview" style="white-space:pre-wrap; font-family:monospace;"></div>
         
         <div style="display:none;">
           <span id="previewMeta"></span>
           <span id="transposeInfo"></span>
           <span id="selected<?= __('Key') ?>Pill"></span>
         </div>
      </div>
    </div>
  </div>

  <script>window.I18N = <?= json_encode($js_i18n_keys) ?>;</script>
  <!-- LEGACY HIDDEN ELEMENTS FOR JS COMPATIBILITY -->
  <div style="display:none;" id="legacy-hidden-elements">
    <span id="editingBadge"></span>
    <span id="notice"></span>
    <button id="sidebarSearchBtn"></button>
    <button id="sidebarRefreshBtn"></button>
    <button id="sidebarClearBtn"></button>
    <span id="tableMetaPill"></span>
    <span id="statTotalSongs"></span>
    <span id="stat<?= __('Lyrics') ?>Songs"></span>
    <span id="statVisibleSongs"></span>
    <span id="statCurrentMode"></span>
    <div id="workspacePanel"></div>
    <button id="installAdminAppBtn"></button>
  </div>

</div>
"""

    with open('songs_v4.php', 'w', encoding='utf-8') as f:
        f.write(php_header + NEW_CSS + NEW_BODY + js_footer)
        
    print("Successfully built songs_v4.php")
    
build_v4()
