<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';

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


$access = wp_admin_require_access('/songs.php');
$adminUser = $access['user'];
$adminPermissions = $access['permissions'] ?? wp_version_default_admin_permissions();
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));

if (empty($adminPermissions['songs_editor'])):
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Երգերի խմբագրումը հասանելի չէ</title>
  
</head>
<body>
  <main class="gate">
    <div class="eyebrow">Ադմին հասանելիություն</div>
    <h1>Երգերի խմբագրումը հասանելի չէ</h1>
    <p>Քո օգտահաշիվը մուտք ունի ադմին միջավայր, բայց <strong>Երգերի խմբագրում</strong> թույլտվությունը դեռ միացված չէ։ Եթե այս էջը քեզ պետք է, խնդրիր լիազորված ադմինին այն միացնել `Բաժինների թույլտվություններ ըստ օգտատիրոջ` բաժնից։</p>
    <div class="actions">
      <a class="btn btn-primary" href="/admin_updates.php">Բացել ադմինի կարգավորումները</a>
      <a class="btn btn-danger" href="/admin_logout.php">Դուրս գալ ադմինից</a>
    </div>
  </main>
</body>
</html>
<?php
exit;
endif;
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="manifest" href="/songs-manifest.php">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Worship Admin">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="wp-app-scope" content="admin">
  <meta name="theme-color" content="#070910">
  <script src="/pwa-init.js" defer></script>
  <title>Wolarm Youth — Երգերի կառավարում</title>
  <link rel="apple-touch-icon" href="wolarm_developers.png" type="image/png" />
  <link rel="icon" href="wolarm_developers.png" type="image/png" />
  

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
<div id="adminPageLoader" aria-hidden="true">
  <div id="adminPageLoaderCard" role="status" aria-live="polite" aria-busy="true">
    <h2 id="adminPageLoaderTitle">Բեռնվում է…</h2>
    <p id="adminPageLoaderText">Ադմինի երգերի տվյալները պատրաստվում են։</p>
    <div id="adminPageLoaderRail"></div>
  </div>
</div>




<?php include __DIR__ . '/admin_shared_css.php'; ?>
<style>
/* ── Songs page extras ── */
:root {
  --line-soft: #f1f5f9;
  --radius-sm: 10px;
  --radius-md: 20px;
}

/* Page loader */
#adminPageLoader { position:fixed; inset:0; z-index:2000; background:var(--bg); display:flex; align-items:center; justify-content:center; }
#adminPageLoader.hide { display:none; }
#adminPageLoaderCard { background:#fff; padding:40px; border-radius:20px; text-align:center; box-shadow:var(--shadow); }
#adminPageLoaderTitle { font-size:22px; font-weight:800; color:var(--text); margin:0 0 8px; }
#adminPageLoaderText { color:var(--muted); margin:0; }
#adminPageLoaderRail { width:200px; height:4px; background:#f1f5f9; border-radius:4px; margin:16px auto 0; overflow:hidden; }
#adminPageLoaderRail::after { content:''; display:block; height:100%; width:40%; background:var(--primary); border-radius:4px; animation:rail 1.2s ease-in-out infinite; }
@keyframes rail { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }

/* Notice toast */
#notice {
  position:fixed; top:24px; right:24px; z-index:3000;
  padding:14px 24px; border-radius:14px;
  background:#111c44; color:white;
  font-size:15px; font-weight:600;
  box-shadow:0 10px 30px rgba(0,0,0,0.15);
  opacity:0; pointer-events:none; transition:opacity .3s;
}
#notice.show { opacity:1; pointer-events:auto; }
#notice.success { background:var(--success); }
#notice.error   { background:var(--danger); }
#notice.info    { background:var(--primary); }

/* Lang switcher */
.lang-switcher { display:flex; gap:6px; background:#f1f5f9; padding:4px; border-radius:20px; }
.lang-btn { padding:6px 14px; border-radius:16px; color:var(--muted); font-weight:700; font-size:13px; text-decoration:none; transition:.15s; }
.lang-btn.active { background:var(--text); color:#fff; }

/* Period badge */
.period-badge { display:inline-flex; align-items:center; border-radius:20px; padding:3px 10px; font-size:11px; font-weight:700; margin-bottom:4px; }

/* Table */
table { width:100%; border-collapse:collapse; }
th { text-align:left; padding:16px 24px; color:var(--muted); font-weight:600; font-size:12px; border-bottom:1px solid var(--line); text-transform:uppercase; letter-spacing:.5px; }
td { padding:18px 24px; border-bottom:1px solid var(--line); font-weight:500; font-size:14px; color:var(--text); }
tbody tr:last-child td { border-bottom:none; }
tbody tr:hover { background:#f8faff; }

/* Song cells */
.song-title strong { font-size:15px; font-weight:700; color:var(--text); cursor:pointer; transition:.2s; }
.song-title strong:hover { color:var(--primary); }
.song-meta { font-size:13px; color:var(--muted); margin-top:5px; font-weight:500; }
.song-title { padding:2px 0; }
.status-pill { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
.status-pill.has-lyrics { background:var(--success-bg); color:var(--success); }
.status-pill.no-lyrics  { background:var(--warning-bg); color:#b58b00; }
.mobile-key-pill { background:rgba(67,24,255,0.1); color:var(--primary); }
.mini-pill { font-size:12px; font-weight:700; padding:4px 10px; border-radius:8px; background:#f4f7fe; color:var(--muted); }
.mini-pills { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }

/* Toolbar */
.toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
.toolbar-left { display:flex; gap:12px; align-items:center; }

/* Page header */
.page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }

/* Workspace panes */
.workspace-tab { display:none !important; }
.workspace-pane { display:none; }
.workspace-pane.is-active { display:block; }

/* Preview pane */
#previewPane { position:fixed; inset:0; z-index:900; background:var(--surface); overflow:auto; }
#previewPane:not(.is-active) { display:none; }

/* Keys grid */
#keysGrid { display:flex; flex-wrap:wrap; gap:8px; }
#keysGrid button { padding:8px 16px; border-radius:10px; border:1px solid var(--line); background:white; color:var(--text); font-weight:700; font-size:14px; cursor:pointer; transition:.15s; }
#keysGrid button:hover { border-color:var(--primary); color:var(--primary); }
#keysGrid button.active { background:var(--primary); color:white; border-color:var(--primary); }

.hidden { display:none !important; }
[hidden] { display:none !important; }
#editingBadge { font-size:12px; font-weight:700; color:var(--muted); }

/* ── Editor drawer ── */
.editor-modal {
  position:fixed; top:0; left:0; right:0; bottom:0;
  background:rgba(11,20,55,0.5); backdrop-filter:blur(8px);
  z-index:1000; display:flex; justify-content:flex-end;
  opacity:0; pointer-events:none; transition:opacity .3s;
}
.editor-modal.is-active { opacity:1; pointer-events:auto; }
.editor-drawer {
  width:800px; max-width:100%; background:var(--surface); height:100%;
  box-shadow:-20px 0 50px rgba(11,20,55,0.1);
  display:flex; flex-direction:column;
  transform:translateX(100%); transition:transform .3s cubic-bezier(0.16,1,0.3,1);
}
.editor-modal.is-active .editor-drawer { transform:translateX(0); }
.editor-header { padding:28px 36px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }
.editor-header h3 { font-size:22px; font-weight:800; color:var(--text); margin:0; }
.editor-body { padding:36px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:24px; }
.editor-footer { padding:20px 36px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; gap:12px; }

/* Form fields */
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.form-field { display:flex; flex-direction:column; gap:8px; }
.form-field label { font-size:13px; font-weight:700; color:var(--text); }
.form-field input, .form-field textarea, .form-field select {
  padding:12px 14px; border:1px solid var(--line); border-radius:10px;
  font-family:inherit; font-size:14px; font-weight:500; color:var(--text);
  background:var(--surface); outline:none; transition:.15s;
}
.form-field input:focus, .form-field textarea:focus, .form-field select:focus {
  border-color:var(--primary); box-shadow:0 0 0 3px rgba(67,24,255,0.1);
}
.form-field textarea { min-height:140px; resize:vertical; font-family:monospace; }

/* Section-tab hidden buttons kept for JS */
button.section-tab.nav-item {
  width:calc(100% - 32px); font-family:inherit; font-size:15px; font-weight:600;
  background:transparent; border:none; cursor:pointer; color:var(--muted);
  display:flex; align-items:center; gap:14px;
  padding:13px 24px; border-radius:12px; margin:2px 16px;
  transition:background .15s, color .15s; text-align:left;
}
button.section-tab.nav-item:hover { background:rgba(67,24,255,0.05); color:var(--text); }
button.section-tab.nav-item.active { background:var(--primary); color:#fff; box-shadow:0 4px 15px rgba(67,24,255,0.3); }
button.section-tab.nav-item.active svg { stroke:#fff; }

/* PWA install banner */
#adminInstallBanner {
  position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
  background:var(--surface); border-radius:20px; padding:20px 28px;
  box-shadow:var(--shadow); z-index:800; display:flex; align-items:center; gap:16px;
  max-width:500px; width:calc(100% - 48px);
}
</style>


<div class="app-layout">
  <!-- SIDEBAR -->
  <?php
    $activePage = "songs";
    include __DIR__ . "/admin_sidebar.php";
  ?>

  <!-- MAIN -->
  <main class="app-main">
    <?php
      $adminEmail = trim((string)($adminUser['email'] ?? ''));
      $searchPlaceholder = 'Search by name, artist...';
      include __DIR__ . '/admin_topbar.php';
    ?>

    <div class="app-content">
      
      <!-- LIBRARY VIEW (Default) -->
      <div id="libraryPane" class="workspace-pane is-active">
        <div class="page-header" style="padding-bottom: 0; border: none; align-items: flex-start;">
          <div>
            <h2 style="font-size: 34px; margin-bottom: 8px; font-weight:800; color:var(--text); letter-spacing:-0.5px;"><?= __('Songs') ?> 😍</h2>
            <p id="songsCount" style="margin: 0; font-size:15px; color:var(--muted); font-weight: 500;"><?= __('0 songs in database') ?></p>
          </div>
        </div>

        <!-- Hidden tabs to keep JS happy -->
        <div class="tabs" style="display:none;">
          <button class="workspace-tab is-active" data-workspace-tab="libraryPane">L</button>
          <button class="workspace-tab" data-workspace-tab="editorPane">E</button>
          <button class="workspace-tab" data-workspace-tab="previewPane">P</button>
        </div>

        <!-- REAL STAT CARDS (New Design) -->
        <div class="stats" style="margin-bottom: 32px;">
          <!-- Total Songs -->
          <div class="stat">
            <div class="stat-row">
              <div>
                <div class="stat-label">
                  <span class="period-badge" style="background:#e5f3ff; color:#228fff;">Database</span><br>
                  Total Songs
                </div>
                <div class="stat-value" id="statTotalSongs">0</div>
              </div>
              <div class="stat-icon" style="background:#e5f3ff; color:#228fff;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
              </div>
            </div>
          </div>

          <!-- With Lyrics -->
          <div class="stat">
            <div class="stat-row">
              <div>
                <div class="stat-label">
                  <span class="period-badge" style="background:#f3ebff; color:#7d40ff;">Content</span><br>
                  With Lyrics
                </div>
                <div class="stat-value" id="statLyricsSongs">0</div>
              </div>
              <div class="stat-icon" style="background:#f3ebff; color:#7d40ff;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
            </div>
          </div>

          <!-- Filtered / Visible -->
          <div class="stat">
            <div class="stat-row">
              <div>
                <div class="stat-label">
                  <span class="period-badge" style="background:#e6f9f3; color:#05cd99;">Current View</span><br>
                  Filtered Results
                </div>
                <div class="stat-value" id="statVisibleSongs">0</div>
              </div>
              <div class="stat-icon" style="background:#e6f9f3; color:#05cd99;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </div>
            </div>
            <div class="stat-trend up" style="display:none;" id="statCurrentModeWrap">
              <span id="statCurrentMode" style="color:var(--muted);font-weight:600;">—</span>
            </div>
          </div>
        </div>

        <div class="toolbar" style="margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center;">
          <div class="toolbar-left" style="display:flex; gap:12px;">
            <button id="refreshList" class="btn" style="background:white; border:1px solid var(--line);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> <?= __('Refresh') ?></button>
            <button id="exportAllPdf" class="btn" style="background:white; border:1px solid var(--line);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg> <?= __('Export PDF') ?></button>
            <button id="toggleFiltersBtn" class="btn" style="display:none;">Filters</button>
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
<script>
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function noteIndex(note) {
  if (!note) return -1;
  const m = ('' + note).trim().match(/^([A-Ga-g])([#b♭]?)/);
  if (!m) return -1;
  let root = (m[1].toUpperCase() + (m[2] || '')).replace(/♭/g, 'b');
  if (SHARPS.includes(root)) return SHARPS.indexOf(root);
  if (FLATS.includes(root)) return FLATS.indexOf(root);
  if (root === 'E#') return SHARPS.indexOf('F');
  if (root === 'B#') return SHARPS.indexOf('C');
  if (root === 'Fb') return SHARPS.indexOf('E');
  if (root === 'Cb') return SHARPS.indexOf('B');
  return -1;
}

function parseKeySignature(note) {
  const value = String(note || '').trim().replace(/♭/g, 'b').replace(/\s+/g, '');
  if (!value) return null;
  const m = value.match(/^([A-Ga-g])([#b]?)(m|min|minor)?$/i);
  if (!m) return null;
  const root = (m[1].toUpperCase() + (m[2] || ''));
  const index = noteIndex(root);
  if (index < 0) return null;
  const suffix = String(m[3] || '').toLowerCase();
  const isMinor = suffix === 'm' || suffix === 'min' || suffix === 'minor';
  return {
    root,
    index,
    isMinor,
    display: root + (isMinor ? 'm' : '')
  };
}

function getEffectiveTargetKey(originalKey, targetKey) {
  const target = parseKeySignature(targetKey);
  if (!target) return String(targetKey || '').trim();
  const original = parseKeySignature(originalKey);
  return target.root + (original && original.isMinor ? 'm' : '');
}

function transposeRoot(root, semi, useFlats) {
  const i = noteIndex(root);
  if (i < 0) return root;
  const autoFlats = ('' + root).includes('b') && !('' + root).includes('#');
  const useFlat = useFlats || autoFlats;
  const idx = (i + semi + 12) % 12;
  return useFlat ? FLATS[idx] : SHARPS[idx];
}

function escapeHtml(s) {
  return ('' + s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderWithChords(text = '', semi = 0, useFlats = false) {
  const chordRegex = /(^|[\s\(\[])([A-G](?:#|b)?)([mM0-9majdimaugaddsus]*)?(?:\/([A-G](?:#|b)?))?(?=[\s\)\]\,]|$)/g;
  return text.split('\n').map(line =>
    line.replace(chordRegex, (match, prefix, root, type = '', bass = '') => {
      const newRoot = transposeRoot(root, semi, useFlats);
      let result = `${prefix}<span class="chord">${newRoot}${type}`;
      if (bass) {
        const newBass = transposeRoot(bass, semi, useFlats);
        result += `/${newBass}`;
      }
      result += '</span>';
      return result;
    })
  ).join('\n');
}

const $ = (id) => document.getElementById(id);
const titleI = $('title');
const titleLatI = $('title_lat');
const titleRuI = $('title_ru');
const titleEnI = $('title_en');
const artistI = $('artist');
const keyI = $('key');
const bpmI = $('bpm');
const tagsI = $('tags');
const chordsI = $('chords');
const lyricsI = $('lyrics');
const useFlatsI = $('useFlats');
const preview = $('preview');
const keysGrid = $('keysGrid');
const saveBtn = $('saveSong');
const cancelEditBtn = $('cancelEdit');
const clearBtn = $('clearForm');
const downloadTxtBtn = $('downloadTxt');
const exportPdfBtn = $('exportPdf');
const exportAllPdfBtn = $('exportAllPdf');
const searchI = $('topbarSearch');
const tableBody = $('songsTable');
const previewTitle = $('previewTitle');
const previewMeta = $('previewMeta');
const selectedKeyPill = $('selectedKeyPill');
const transposeInfo = $('transposeInfo');
const songsCount = $('songsCount');
const tableInfo = $('tableInfo');
const editingBadge = $('editingBadge');
const notice = $('notice');
const refreshListBtn = $('refreshList');
const loadMoreBtn = $('loadMoreBtn');
const newSongBtn = $('newSongBtn');
const sidebarSearchBtn = $('sidebarSearchBtn');
const sidebarRefreshBtn = $('sidebarRefreshBtn');
const sidebarClearBtn = $('sidebarClearBtn');
const tableMetaInfo = $('tableMetaInfo');
const tableMetaPill = $('tableMetaPill');
const toggleFiltersBtn = $('toggleFiltersBtn');
const filtersPanel = $('filtersPanel');
const sortByI = $('sortBy');
const lyricsFilterI = $('lyricsFilter');
const keyFilterI = $('keyFilter');
const tagFilterI = $('tagFilter');
const clearFiltersBtn = $('clearFilters');
const activeFilters = $('activeFilters');
const statTotalSongs = $('statTotalSongs');
const statLyricsSongs = $('statLyricsSongs');
const statVisibleSongs = $('statVisibleSongs');
const statCurrentMode = $('statCurrentMode');
const workspacePanel = $('workspacePanel');
const workspaceTabs = Array.from(document.querySelectorAll('[data-workspace-tab]'));
const workspacePanes = Array.from(document.querySelectorAll('.workspace-pane'));
const installAdminAppBtn = $('installAdminAppBtn');

const KEY_OPTIONS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
let selectedTargetKey = '';
let ALL_SONGS = [];
let currentEditId = null;
let visibleSongsCount = 10;
let lastSavedSnapshot = '';
const SONGS_PAGE_SIZE = 10;
let deferredAdminInstallPrompt = null;
const adminInstallStorageKey = 'wp_admin_install_prompt_hidden';
const adminInstallDeviceKey = 'wp_admin_install_device_id';
const adminInstallSignatureCookieKey = 'wp_admin_install_device_sig';
const adminInstallSeenKey = 'wp_admin_install_last_ping_at';
const adminInstallConfirmedKey = 'wp_admin_install_confirmed';
const adminInstallIosIntentKey = 'wp_admin_install_ios_intent';

function hasArmenianText(text) {
  return /[\u0531-\u058F]/u.test(String(text || ''));
}

function hasCyrillicText(text) {
  return /[\u0400-\u04FF]/u.test(String(text || ''));
}

function hasLatinText(text) {
  return /[A-Za-z]/.test(String(text || ''));
}

function splitTitleVariants(text) {
  return String(text || '')
    .split(/\s*\/\s*/u)
    .map(part => part.trim())
    .filter(Boolean);
}

function parseSongTitleVariants(text) {
  const parts = splitTitleVariants(text);
  let hy = '';
  let lat = '';
  let ru = '';
  let en = '';

  const latinParts = parts.filter(part => hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part));
  const cyrillicParts = parts.filter(part => hasCyrillicText(part) && !hasArmenianText(part));

  if (parts.length >= 3 && hasArmenianText(parts[0])) {
    hy = parts[0] || '';
    if (latinParts.length >= 2) {
      lat = latinParts[0] || '';
      en = latinParts[latinParts.length - 1] || '';
    } else if (latinParts.length === 1 && parts.length === 2) {
      en = latinParts[0] || '';
    }
    ru = cyrillicParts[0] || '';
    return { hy, lat, ru, en };
  }

  parts.forEach((part) => {
    if (!hy && hasArmenianText(part)) {
      hy = part;
      return;
    }
    if (!ru && hasCyrillicText(part) && !hasArmenianText(part)) {
      ru = part;
      return;
    }
    if (!lat && hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) {
      lat = part;
      return;
    }
    if (!en && hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) {
      en = part;
    }
  });

  if (!hy && parts.length) hy = parts[0];
  if (!en && !ru && lat && parts.length === 2 && hy) {
    en = lat;
    lat = '';
  }

  return { hy, lat, ru, en };
}

function buildCombinedSongTitle() {
  const hy = titleI.value.trim();
  const lat = titleLatI.value.trim();
  const ru = titleRuI.value.trim();
  const en = titleEnI.value.trim();
  return [hy, lat, en, ru].filter(Boolean).join(' / ');
}

function displayEditorSongTitle(text) {
  const variants = parseSongTitleVariants(text);
  return variants.hy || variants.ru || variants.en || String(text || '');
}

function showNotice(message, type = 'info') {
  notice.className = `notice show ${type}`;
  notice.textContent = message;
  clearTimeout(showNotice._timer);
  showNotice._timer = setTimeout(() => {
    notice.className = 'notice';
    notice.textContent = '';
  }, 2800);
}

function isStandaloneAdminApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
}

function ensureAdminInstallBanner() {
  var existing = document.getElementById('adminInstallBanner');
  if (existing) return existing;

  var banner = document.createElement('div');
  banner.id = 'adminInstallBanner';
  banner.className = 'admin-install-banner';
  banner.innerHTML =
    '<div class="admin-install-copy">' +
    '  <strong>Ներբեռնեք ադմին ծրագիրը</strong>' +
    '  <span id="adminInstallBannerText">Արագ մուտք գործեք երգերի կառավարման բաժին առանձին հավելվածով։</span>' +
    '</div>' +
    '<div class="admin-install-actions">' +
    '  <button class="btn btn-secondary" id="adminInstallLaterBtn" type="button">Հետո</button>' +
    '  <button class="btn btn-primary" id="adminInstallPromptBtn" type="button">Ներբեռնել</button>' +
    '</div>';
  document.body.appendChild(banner);
  return banner;
}

function hideAdminInstallBanner(persist) {
  var banner = document.getElementById('adminInstallBanner');
  if (banner) banner.classList.remove('show');
  if (persist) {
    try {
      localStorage.setItem(adminInstallStorageKey, '1');
    } catch (e) {
      // ignore storage errors
    }
  }
}

function updateAdminInstallBanner() {
  var banner = ensureAdminInstallBanner();
  var text = document.getElementById('adminInstallBannerText');
  var promptBtn = document.getElementById('adminInstallPromptBtn');
  var laterBtn = document.getElementById('adminInstallLaterBtn');

  if (laterBtn && !laterBtn.dataset.bound) {
    laterBtn.dataset.bound = '1';
    laterBtn?.addEventListener('click', function() {
      hideAdminInstallBanner(true);
    });
  }

  if (promptBtn && !promptBtn.dataset.bound) {
    promptBtn.dataset.bound = '1';
    promptBtn?.addEventListener('click', function() {
      handleAdminInstallRequest();
    });
  }

  if (isStandaloneAdminApp()) {
    banner.classList.remove('show');
    return;
  }

  try {
    if (localStorage.getItem(adminInstallStorageKey) === '1') {
      banner.classList.remove('show');
      return;
    }
  } catch (e) {
    // ignore storage errors
  }

  if (!deferredAdminInstallPrompt && !isAppleMobile()) {
    banner.classList.remove('show');
    return;
  }

  if (text) {
    text.textContent = isAppleMobile()
      ? 'Safari-ում կարող եք այս էջը պահել որպես առանձին հավելված։'
      : 'Ներբեռնեք երգերի կառավարման առանձին ծրագիրը արագ մուտքի համար։';
  }

  banner.classList.add('show');
}

function updateInstallAdminButton() {
  if (!installAdminAppBtn) return;

  if (isStandaloneAdminApp()) {
    installAdminAppBtn.hidden = true;
    hideAdminInstallBanner(false);
    return;
  }

  installAdminAppBtn.hidden = false;
  installAdminAppBtn.disabled = false;
  installAdminAppBtn.classList.remove('btn-success');
  installAdminAppBtn.classList.add('btn-secondary');

  const desktopLabel = installAdminAppBtn.querySelector('.label-desktop');
  const mobileLabel = installAdminAppBtn.querySelector('.label-mobile');

  if (deferredAdminInstallPrompt) {
    if (desktopLabel) desktopLabel.textContent = 'Ներբեռնել որպես ծրագիր';
    if (mobileLabel) mobileLabel.textContent = 'Ներբեռնել';
    return;
  }

  if (isAppleMobile()) {
    if (desktopLabel) desktopLabel.textContent = 'Ինչպես ներբեռնել ծրագիրը';
    if (mobileLabel) mobileLabel.textContent = 'Ինչպես';
    return;
  }

  if (desktopLabel) desktopLabel.textContent = 'Բացել ներբեռնման հուշումը';
  if (mobileLabel) mobileLabel.textContent = 'Ծրագիր';
}

function getAdminInstallDeviceId() {
  try {
    var existing = localStorage.getItem(adminInstallDeviceKey);
    if (existing) {
      writeAdminInstallCookie(existing);
      return existing;
    }
    var cookieValue = readAdminInstallCookie();
    if (cookieValue) {
      localStorage.setItem(adminInstallDeviceKey, cookieValue);
      return cookieValue;
    }
    var next = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : ('admin-' + Math.random().toString(36).slice(2) + Date.now()));
    localStorage.setItem(adminInstallDeviceKey, next);
    writeAdminInstallCookie(next);
    return next;
  } catch (e) {
    var fallbackCookie = readAdminInstallCookie();
    if (fallbackCookie) return fallbackCookie;
    var fallback = 'admin-' + Math.random().toString(36).slice(2) + Date.now();
    writeAdminInstallCookie(fallback);
    return fallback;
  }
}

function readAdminInstallCookie() {
  try {
    var escapedName = String(adminInstallDeviceKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var match = document.cookie.match(new RegExp('(?:^|; )' + escapedName + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  } catch (e) {
    return '';
  }
}

function writeAdminInstallCookie(value) {
  try {
    document.cookie = adminInstallDeviceKey + '=' + encodeURIComponent(value) + '; path=/; max-age=' + (3650 * 24 * 60 * 60) + '; SameSite=Lax';
  } catch (e) {
    // ignore cookie errors
  }
}

function shouldPingAdminInstall() {
  try {
    var last = Number(localStorage.getItem(adminInstallSeenKey) || '0');
    return !last || (Date.now() - last) > 12 * 60 * 60 * 1000;
  } catch (e) {
    return true;
  }
}

function markAdminInstallPing() {
  try {
    localStorage.setItem(adminInstallSeenKey, String(Date.now()));
  } catch (e) {
    // ignore
  }
}

function getAdminInstallSignature() {
  try {
    const screenInfo = window.screen || {};
    const nav = window.navigator || {};
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (err) {}

    const signatureParts = [
      'scope:admin',
      'ua:' + (nav.userAgent || ''),
      'platform:' + (nav.platform || ''),
      'lang:' + (nav.language || ''),
      'langs:' + ((nav.languages || []).join(',')),
      'touch:' + String(nav.maxTouchPoints || 0),
      'cpu:' + String(nav.hardwareConcurrency || 0),
      'mem:' + String(nav.deviceMemory || 0),
      'screen:' + [screenInfo.width || 0, screenInfo.height || 0, screenInfo.colorDepth || 0].join('x'),
      'viewport:' + [window.innerWidth || 0, window.innerHeight || 0].join('x'),
      'dpr:' + String(window.devicePixelRatio || 1),
      'tz:' + tz
    ].join('|');

    let hash = 2166136261;
    for (let i = 0; i < signatureParts.length; i += 1) {
      hash ^= signatureParts.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const signature = ('00000000' + (hash >>> 0).toString(16)).slice(-8) + ('00000000' + signatureParts.length.toString(16)).slice(-8);
    try {
      document.cookie = adminInstallSignatureCookieKey + '=' + encodeURIComponent(signature) + '; path=/; max-age=' + (3650 * 24 * 60 * 60) + '; SameSite=Lax';
    } catch (e) {}
    return signature;
  } catch (err) {
    return '';
  }
}

function registerAdminInstall(options) {
  options = options || {};
  const force = !!options.force;
  if (!isStandaloneAdminApp() || !hasConfirmedAdminInstall() || !navigator.onLine) return;
  if (!force && !shouldPingAdminInstall()) return;

  fetch('/install_api.php?action=register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-App-Scope': 'admin',
      'X-WP-Install-Mode': 'standalone'
    },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      scope: 'admin',
      source: 'admin-app-verified',
      device_id: getAdminInstallDeviceId(),
      device_signature: getAdminInstallSignature()
    })
  }).then((response) => {
    if (response && response.ok) {
      markAdminInstallPing();
    }
  }).catch(() => {
    // ignore network errors
  });
}

function cleanupLegacyMainInstallRecord() {
  if (!isStandaloneAdminApp() || !navigator.onLine) return;

  const cleanupKey = 'wp_admin_legacy_main_cleanup_done';
  try {
    if (localStorage.getItem(cleanupKey) === '1') {
      return;
    }
  } catch (e) {}

  let legacyDeviceId = '';
  let legacySignature = '';

  try {
    legacyDeviceId = String(localStorage.getItem('wp_install_device_id') || '').trim();
  } catch (e) {}
  if (!legacyDeviceId) {
    try {
      const match = document.cookie.match(/(?:^|; )wp_install_device_id=([^;]*)/);
      legacyDeviceId = match ? decodeURIComponent(match[1]) : '';
    } catch (e) {}
  }

  try {
    const match = document.cookie.match(/(?:^|; )wp_install_device_sig=([^;]*)/);
    legacySignature = match ? decodeURIComponent(match[1]) : '';
  } catch (e) {}

  if (!legacyDeviceId && !legacySignature) {
    try {
      localStorage.setItem(cleanupKey, '1');
    } catch (e) {}
    return;
  }

  fetch('/install_api.php?action=cleanup_legacy_main', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-App-Scope': 'admin',
      'X-WP-Install-Mode': 'standalone'
    },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      scope: 'admin',
      source: 'admin-app-verified',
      legacy_device_id: legacyDeviceId,
      legacy_device_signature: legacySignature
    })
  }).then((response) => {
    if (!response || !response.ok) return;
    try {
      localStorage.setItem(cleanupKey, '1');
    } catch (e) {}
  }).catch(() => {
    // ignore cleanup errors
  });
}

async function handleAdminInstallRequest() {
  if (isStandaloneAdminApp()) {
    showNotice('Այս էջն արդեն բացված է որպես առանձին ծրագիր', 'info');
    hideAdminInstallBanner(false);
    return;
  }

  if (deferredAdminInstallPrompt) {
    try {
      deferredAdminInstallPrompt.prompt();
      var choice = await deferredAdminInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        try {
          localStorage.setItem(adminInstallConfirmedKey, '1');
        } catch (e) {}
        hideAdminInstallBanner(false);
      }
    } catch (err) {
      showNotice('Չհաջողվեց բացել ներբեռնման պատուհանը', 'error');
    } finally {
      deferredAdminInstallPrompt = null;
      updateInstallAdminButton();
      updateAdminInstallBanner();
    }
    return;
  }

  if (isAppleMobile()) {
    try {
      localStorage.setItem(adminInstallIosIntentKey, '1');
    } catch (e) {}
    showNotice('Safari-ում սեղմիր Share և ընտրիր Add to Home Screen', 'info');
    return;
  }

  showNotice('Եթե browser-ը դեռ հուշում չի տալիս, բացիր էջը Chrome կամ Edge-ով և նորից փորձիր', 'info');
}

window?.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredAdminInstallPrompt = event;
  updateInstallAdminButton();
  updateAdminInstallBanner();
});

window?.addEventListener('appinstalled', () => {
  deferredAdminInstallPrompt = null;
  updateInstallAdminButton();
  hideAdminInstallBanner(false);
  try {
    localStorage.setItem(adminInstallConfirmedKey, '1');
    localStorage.removeItem(adminInstallIosIntentKey);
  } catch (e) {}
  showNotice('Ադմին էջը տեղադրվել է որպես առանձին ծրագիր', 'success');
  setTimeout(() => registerAdminInstall({ force: true }), 1200);
});

function hasConfirmedAdminInstall() {
  try {
    if (isStandaloneAdminApp()) {
      localStorage.setItem(adminInstallConfirmedKey, '1');
      localStorage.removeItem(adminInstallIosIntentKey);
      return true;
    }

    if (localStorage.getItem(adminInstallConfirmedKey) === '1') {
      return true;
    }

    if (window.navigator.standalone === true && localStorage.getItem(adminInstallIosIntentKey) === '1') {
      localStorage.setItem(adminInstallConfirmedKey, '1');
      localStorage.removeItem(adminInstallIosIntentKey);
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

window?.addEventListener('load', () => {
  setTimeout(() => {
    registerAdminInstall({ force: true });
    cleanupLegacyMainInstallRecord();
  }, 900);
});

window?.addEventListener('online', registerAdminInstall);

function normalizeSong(song) {
  return {
    ...song,
    song_key: song.song_key ?? song.key ?? ''
  };
}

function hideAdminPageLoader(delay = 80) {
  window.clearTimeout(window.__adminPageLoaderTimer);
  window.__adminPageLoaderTimer = window.setTimeout(() => {
    const el = document.getElementById('adminPageLoader');
    if (el) el.classList.add('hide');
  }, delay);
}

function scrollWorkspaceIntoView() {
  if (!workspacePanel) return;
  if (window.matchMedia('(max-width: 1120px)').matches) {
    workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function activateWorkspaceTab(id) {
  workspacePanes.forEach((pane) => {
    const active = pane.id === id;
    pane.hidden = !active;
    pane.classList.toggle('is-active', active);
  });
  workspaceTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.workspaceTab === id);
  });
  updateWorkspaceState();
}

workspaceTabs.forEach((tab) => {
  tab?.addEventListener('click', () => activateWorkspaceTab(tab.dataset.workspaceTab));
});

function updateStats(totalCount, visibleCount) {
  const withLyrics = ALL_SONGS.filter(song => (song.lyrics || '').trim()).length;
  statTotalSongs.textContent = String(totalCount);
  if (statLyricsSongs) statLyricsSongs.textContent = String(withLyrics);
  statVisibleSongs.textContent = String(visibleCount);
  statCurrentMode.textContent = currentEditId !== null ? 'Խմբագրում' : 'Նոր երգ';
}

function setEditMode(song = null) {
  currentEditId = song ? Number(song.id) : null;
  const editing = currentEditId !== null;
  saveBtn.textContent = editing ? (window.I18N?.Update || 'Թարմացնել') : (window.I18N?.Save || 'Պահպանել');
  cancelEditBtn.hidden = !editing;
  editingBadge.textContent = editing ? `Խմբագրվում է․ ${displayEditorSongTitle(song.title || '') || 'Անանուն'}` : 'Խմբագրվում է․ ոչինչ';
  statCurrentMode.textContent = editing ? 'Խմբագրում' : 'Նոր երգ';
  updateWorkspaceState();
}

function createSongSnapshot() {
  return JSON.stringify({
    id: currentEditId,
    form: getFormData(),
    selectedTargetKey: selectedTargetKey || '',
    useFlats: !!useFlatsI.checked
  });
}

function hasUnsavedChanges() {
  return createSongSnapshot() !== lastSavedSnapshot;
}

function markCurrentSnapshotAsSaved() {
  lastSavedSnapshot = createSongSnapshot();
  updateWorkspaceState();
}

function computeSemiForLive(originalKey, targetKey) {
  if (!originalKey || !targetKey) return 0;
  const from = parseKeySignature(originalKey);
  const to = parseKeySignature(targetKey);
  if (!from || !to) return 0;
  return (to.index - from.index + 12) % 12;
}

function getCurrentSemi() {
  const originalKey = keyI.value.trim();
  if (!originalKey || !selectedTargetKey) return 0;
  return computeSemiForLive(originalKey, getEffectiveTargetKey(originalKey, selectedTargetKey));
}

function buildKeysGrid() {
  keysGrid.innerHTML = '';
  for (const k of KEY_OPTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = k;
    btn.dataset.key = k;
    btn?.addEventListener('click', () => {
      document.querySelectorAll('#keysGrid button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTargetKey = k;
      renderPreview();
    });
    keysGrid.appendChild(btn);
  }
}

function renderPreview() {
  const originalKey = keyI.value.trim();
  const effectiveTargetKey = getEffectiveTargetKey(originalKey, selectedTargetKey);
  const useFlats = useFlatsI.checked;
  const semi = getCurrentSemi();
  const raw = chordsI.value.trim();

  previewTitle.textContent = titleI.value.trim() || titleLatI.value.trim() || titleRuI.value.trim() || titleEnI.value.trim() || 'Չկա վերնագիր';
  const bpmText = bpmI && bpmI.value.trim() ? `BPM: ${bpmI.value.trim()}` : '';
  previewMeta.textContent = [artistI.value.trim(), originalKey ? `Սկզբնական: ${originalKey}` : '', effectiveTargetKey ? `Թիրախ: ${effectiveTargetKey}` : '', bpmText]
    .filter(Boolean)
    .join(' • ') || 'Ակորդների նախադիտում';

  selectedKeyPill.textContent = `Թիրախային տոնայնություն: ${effectiveTargetKey || '—'}`;
  transposeInfo.textContent = `Տրանսպոզ: ${semi >= 0 ? '+' + semi : semi}`;

  if (!raw) {
    preview.innerHTML = '<span class="empty-preview">Այստեղ կերևա ակորդների նախադիտումը</span>';
    updateWorkspaceState();
    return;
  }

  preview.innerHTML = renderWithChords(raw, semi, useFlats);
  updateWorkspaceState();
}

function getFormData() {
  return {
    title: buildCombinedSongTitle(),
    title_hy: titleI.value.trim(),
    title_lat: titleLatI.value.trim(),
    title_en: titleEnI.value.trim(),
    title_ru: titleRuI.value.trim(),
    artist: artistI.value.trim(),
    key: keyI.value.trim(),
    bpm: bpmI.value ? Number(bpmI.value) : 0,
    tags: tagsI.value.trim(),
    chords: chordsI.value,
    lyrics: lyricsI.value
  };
}

function validateSong(song) {
  if (!song.title) return 'Լրացրու երգի անունը';
  if (song.bpm && (song.bpm < 20 || song.bpm > 400)) return 'BPM-ը գրիր 20-ից 400 միջակայքում';
  if (!song.chords.trim() && !song.lyrics.trim()) return 'Լրացրու գոնե ակորդները կամ բառերը';
  return '';
}

function fillForm(song) {
  const titleVariants = parseSongTitleVariants(song.title || '');
  const apiVariants = song.title_variants && typeof song.title_variants === 'object' ? song.title_variants : {};
  titleI.value = apiVariants.hy || titleVariants.hy || '';
  titleLatI.value = apiVariants.lat || titleVariants.lat || '';
  titleRuI.value = apiVariants.ru || titleVariants.ru || '';
  titleEnI.value = apiVariants.en || titleVariants.en || '';
  artistI.value = song.artist || '';
  keyI.value = song.song_key || song.key || '';
  bpmI.value = song.bpm ? String(song.bpm) : '';
  tagsI.value = song.tags || '';
  chordsI.value = song.chords || '';
  lyricsI.value = song.lyrics || '';
  selectedTargetKey = '';
  document.querySelectorAll('#keysGrid button').forEach(b => b.classList.remove('active'));
  renderPreview();
  activateWorkspaceTab('editorPane');
  scrollWorkspaceIntoView();
  markCurrentSnapshotAsSaved();
}

function clearForm() {
  titleI.value = '';
  titleLatI.value = '';
  titleRuI.value = '';
  titleEnI.value = '';
  artistI.value = '';
  keyI.value = '';
  bpmI.value = '';
  tagsI.value = '';
  chordsI.value = '';
  lyricsI.value = '';
  useFlatsI.checked = false;
  selectedTargetKey = '';
  document.querySelectorAll('#keysGrid button').forEach(b => b.classList.remove('active'));
  setEditMode(null);
  renderPreview();
  markCurrentSnapshotAsSaved();
}

function textCmp(a, b) {
  return a.localeCompare(b, 'hy', { sensitivity: 'base' });
}

function getActiveFiltersList() {
  const items = [];
  if (sortByI.value !== 'newest') items.push(`Դասավորում: ${sortByI.options[sortByI.selectedIndex].text}`);
  if (lyricsFilterI.value !== 'all') items.push(`Բառեր: ${lyricsFilterI.options[lyricsFilterI.selectedIndex].text}`);
  if (keyFilterI.value.trim()) items.push(`Տոնայնություն: ${keyFilterI.value.trim()}`);
  if (tagFilterI.value.trim()) items.push(`Տեգ: ${tagFilterI.value.trim()}`);
  if (searchI.value.trim()) items.push(`Որոնում: ${searchI.value.trim()}`);
  return items;
}

function renderActiveFilters() {
  const items = getActiveFiltersList();
  activeFilters.innerHTML = items.map(item => `<span class="active-chip">${escapeHtml(item)}</span>`).join('');
}

function updateFiltersButtonState() {
  const count = getActiveFiltersList().length;
  const open = !filtersPanel.hidden;
  toggleFiltersBtn.textContent = count > 0 ? `Ֆիլտրեր • ${count}` : 'Ֆիլտրեր';
  toggleFiltersBtn.setAttribute('aria-expanded', String(open));
  renderActiveFilters();
  updateWorkspaceState();
}

function updateWorkspaceState() {
}

function applySort(list) {
  const sort = sortByI.value;
  const copy = [...list];
  switch (sort) {
    case 'title_asc': copy.sort((a, b) => textCmp(a.title || '', b.title || '')); break;
    case 'title_desc': copy.sort((a, b) => textCmp(b.title || '', a.title || '')); break;
    case 'artist_asc': copy.sort((a, b) => textCmp(a.artist || '', b.artist || '')); break;
    case 'artist_desc': copy.sort((a, b) => textCmp(b.artist || '', a.artist || '')); break;
    case 'key_asc': copy.sort((a, b) => textCmp(a.song_key || '', b.song_key || '')); break;
    case 'key_desc': copy.sort((a, b) => textCmp(b.song_key || '', a.song_key || '')); break;
    case 'newest':
    default:
      copy.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      break;
  }
  return copy;
}

function getFilteredSongs() {
  const q = searchI.value.trim().toLowerCase();
  const lyricsMode = lyricsFilterI.value;
  const keyFilter = keyFilterI.value.trim().toLowerCase();
  const tagFilter = tagFilterI.value.trim().toLowerCase();

  const filtered = ALL_SONGS.filter(song => {
    const haystack = [song.title, song.artist, song.tags, song.lyrics, song.chords, song.song_key, song.bpm].filter(Boolean).join(' ').toLowerCase();
    if (q && !haystack.includes(q)) return false;
    const hasLyrics = !!(song.lyrics && song.lyrics.trim());
    if (lyricsMode === 'with' && !hasLyrics) return false;
    if (lyricsMode === 'without' && hasLyrics) return false;
    if (keyFilter && !(song.song_key || '').toLowerCase().includes(keyFilter)) return false;
    if (tagFilter && !(song.tags || '').toLowerCase().includes(tagFilter)) return false;
    return true;
  });

  return applySort(filtered);
}

function getVisibleSongs() {
  return getFilteredSongs().slice(0, visibleSongsCount);
}

function updateLoadMoreState(totalCount, shownCount) {
  const hasMore = shownCount < totalCount;
  loadMoreBtn.hidden = !hasMore;
  tableMetaInfo.textContent = hasMore ? `Ցուցադրված է ${shownCount}-ը ${totalCount}-ից` : `Ցուցադրված են բոլոր ${totalCount} երգերը`;
  tableMetaPill.textContent = hasMore ? `${shownCount}/${totalCount}` : `Բոլորը՝ ${totalCount}`;
}

function renderTable(songs = [], totalCount = songs.length) {
  tableBody.innerHTML = '';
  const withLyrics = ALL_SONGS.filter(song => (song.lyrics || '').trim()).length;
  songsCount.innerHTML = `
    <span style="font-weight:600; color:var(--text);">${ALL_SONGS.length}</span> ${window.I18N?.TotalSongs || 'ընդհանուր'} 
    <span style="margin:0 8px; color:var(--line);">|</span> 
    <span style="font-weight:600; color:var(--success);">${withLyrics}</span> ${window.I18N?.WithLyricsCount || 'բառերով'}
  `;
  tableInfo.textContent = `Ցուցադրվում է ${songs.length} երգ`;
  updateLoadMoreState(totalCount, songs.length);
  updateStats(ALL_SONGS.length, totalCount);

  if (!songs.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="3">
        <div class="song-meta" style="padding:12px 0;">Ոչինչ չի գտնվել</div>
      </td>
    `;
    tableBody.appendChild(tr);
    return;
  }

  for (const s of songs) {
    const hasLyrics = !!(s.lyrics && s.lyrics.trim());
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.songId = s.id;
    tr.innerHTML = `
      <td>
        <div class="song-title" data-open-song="${s.id}">
          <strong>${escapeHtml(displayEditorSongTitle(s.title || '') || (window.I18N?.Untitled || 'Անանուն'))}</strong>
          ${s.tags ? `<div class="mini-pills" style="margin-top:4px;">${s.tags.split(',').filter(Boolean).slice(0, 3).map(tag => `<span class="mini-pill">${escapeHtml(tag.trim())}</span>`).join('')}</div>` : ''}
        </div>
      </td>
      <td>
        <div class="song-meta" style="margin-top:0;">${escapeHtml(s.artist || (window.I18N?.UnknownArtist || 'Կատարող նշված չէ'))}</div>
      </td>
      <td>
        <div class="mini-pills" style="margin-top:0;">
          <span class="mini-pill mobile-key-pill">${escapeHtml(s.song_key || '—')}</span>
        </div>
      </td>
      <td>
        <div class="mini-pills" style="margin-top:0;">
          ${s.bpm ? `<span class="mini-pill">BPM ${escapeHtml(String(s.bpm))}</span>` : '<span class="song-meta" style="margin:0;">—</span>'}
        </div>
      </td>
      <td>
        <div class="mini-pills" style="margin-top:0;">
          <span class="mini-pill status-pill ${hasLyrics ? 'has-lyrics' : 'no-lyrics'}">${hasLyrics ? (window.I18N?.Published || 'Բառերով') : (window.I18N?.Draft || 'Առանց բառերի')}</span>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn" type="button" data-action="edit" data-id="${s.id}">${window.I18N?.Edit || 'Խմբագրել'}</button>
          <button class="btn" style="color:var(--danger); border-color:#fca5a5;" type="button" data-action="delete" data-id="${s.id}">${window.I18N?.Delete || 'Ջնջել'}</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }
}

async function fetchSongs() {
  const res = await fetch('api.php');
  if (!res.ok) throw new Error('Չհաջողվեց բեռնել երգերը');
  const songs = await res.json();
  ALL_SONGS = Array.isArray(songs) ? songs.map(normalizeSong) : [];
  visibleSongsCount = SONGS_PAGE_SIZE;
  renderTable(getVisibleSongs(), getFilteredSongs().length);
}

async function startEditSong(id) {
  const res = await fetch('api.php?id=' + encodeURIComponent(id));
  if (!res.ok) throw new Error('Չհաջողվեց բեռնել երգը');
  const song = normalizeSong(await res.json());
  fillForm(song);
  setEditMode(song);
  markCurrentSnapshotAsSaved();
  showNotice('Խմբագրման ռեժիմը ակտիվացված է', 'info');
}

async function saveCurrentSong() {
  const song = getFormData();
  const error = validateSong(song);
  if (error) {
    showNotice(error, 'error');
    return;
  }

  const parseApiResponse = async (res) => {
    const raw = await res.text();
    let json = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch (_) {
      json = { raw };
    }
    return { raw, json };
  };

  if (currentEditId !== null) {
    const res = await fetch('api.php?id=' + encodeURIComponent(currentEditId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song)
    });
    const { raw, json: result } = await parseApiResponse(res);
    if (!res.ok || result.success === false) {
      const detail = result?.details?.message || result?.error || raw || 'Չհաջողվեց թարմացնել երգը';
      throw new Error(detail);
    }
    showNotice(window.I18N?.Saved || 'Երգը պահպանված է ✅', 'success');
  } else {
    const res = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song)
    });
    const { raw, json: result } = await parseApiResponse(res);
    if (!res.ok || result.success === false) {
      const detail = result?.details?.message || result?.error || raw || 'Չհաջողվեց պահպանել երգը';
      throw new Error(detail);
    }
    showNotice(window.I18N?.Saved || 'Երգը պահպանված է ✅', 'success');
  }

  clearForm();
  await fetchSongs();
  activateWorkspaceTab('libraryPane');
  markCurrentSnapshotAsSaved();
}

async function deleteSong(id) {
  if (!confirm(window.I18N?.ConfirmDelete || 'Իսկապե՞ս ջնջել այս երգը։')) return;
  const res = await fetch('api.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
  if (!res.ok) throw new Error('Չհաջողվեց ջնջել երգը');
  showNotice('Երգը ջնջված է', 'success');
  if (currentEditId === Number(id)) clearForm();
  await fetchSongs();
}

function openSongInNewTab(id) {
  window.open('song_view.html?id=' + encodeURIComponent(id), '_blank');
}

function rerenderList() {
  visibleSongsCount = SONGS_PAGE_SIZE;
  renderTable(getVisibleSongs(), getFilteredSongs().length);
  updateFiltersButtonState();
}

downloadTxtBtn?.addEventListener('click', () => {
  const blob = new Blob([chordsI.value || ''], { type:'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (titleI.value || titleLatI.value || titleRuI.value || titleEnI.value || 'song') + '.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

exportPdfBtn?.addEventListener('click', () => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showNotice('jsPDF չի բեռնվել', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;
  const semi = getCurrentSemi();

  doc.setFontSize(16);
  doc.text(titleI.value || titleLatI.value || titleRuI.value || titleEnI.value || 'Անանուն', 10, y); y += 10;
  doc.setFontSize(12);
  if (artistI.value) { doc.text('Կատարող: ' + artistI.value, 10, y); y += 8; }
  if (keyI.value) { doc.text('Տոնայնություն: ' + keyI.value, 10, y); y += 8; }
  if (bpmI.value) { doc.text('BPM: ' + bpmI.value, 10, y); y += 8; }
  if (selectedTargetKey) { doc.text('Թիրախային տոնայնություն: ' + selectedTargetKey, 10, y); y += 8; }

  const lines = (chordsI.value || '').split('\n');
  for (const line of lines) {
    const plain = line.replace(/\b([A-G][#b]?)(m|maj|min|dim|aug|sus2|sus4|7|9|11|13)?(\/[A-G][#b]?)?\b/g,
      (match, root, type, bass) => {
        const newRoot = transposeRoot(root, semi, useFlatsI.checked);
        let out = newRoot + (type || '');
        if (bass) out += '/' + transposeRoot(bass.slice(1), semi, useFlatsI.checked);
        return '(' + out + ')';
      }
    );

    const chunks = doc.splitTextToSize(plain, 180);
    for (const chunk of chunks) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(chunk, 10, y);
      y += 7;
    }
  }

  doc.save((titleI.value || titleLatI.value || titleRuI.value || titleEnI.value || 'song') + '.pdf');
});

exportAllPdfBtn?.addEventListener('click', async () => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showNotice('jsPDF չի բեռնվել', 'error');
    return;
  }

  const songs = getFilteredSongs();
  if (!songs.length) {
    showNotice('Արտահանելու երգեր չկան', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  songs.forEach((song, index) => {
    if (index > 0) doc.addPage();
    let y = 18;
    doc.setFontSize(16);
    doc.text(displayEditorSongTitle(song.title || '') || 'Անանուն', 10, y); y += 9;
    doc.setFontSize(12);
    if (song.artist) { doc.text('Կատարող: ' + song.artist, 10, y); y += 7; }
    if (song.song_key) { doc.text('Տոնայնություն: ' + song.song_key, 10, y); y += 7; }
    if (song.bpm) { doc.text('BPM: ' + song.bpm, 10, y); y += 7; }
    if (song.tags) { doc.text('Տեգեր: ' + song.tags, 10, y); y += 7; }
    y += 3;

    const lines = (song.chords || '').split('\n');
    for (const line of lines) {
      const chunks = doc.splitTextToSize(line, 180);
      for (const chunk of chunks) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(chunk, 10, y);
        y += 7;
      }
    }
  });

  doc.save('songs-export.pdf');
});

[keyI, chordsI, useFlatsI, titleI, titleLatI, titleRuI, titleEnI, artistI].forEach(el => el?.addEventListener('input', renderPreview));
tagsI?.addEventListener('input', updateWorkspaceState);
lyricsI?.addEventListener('input', updateWorkspaceState);
searchI?.addEventListener('input', rerenderList);
sortByI?.addEventListener('change', rerenderList);
lyricsFilterI?.addEventListener('change', rerenderList);
keyFilterI?.addEventListener('input', rerenderList);
tagFilterI?.addEventListener('input', rerenderList);

toggleFiltersBtn?.addEventListener('click', () => {
  filtersPanel.hidden = !filtersPanel.hidden;
  updateFiltersButtonState();
});

clearFiltersBtn?.addEventListener('click', () => {
  sortByI.value = 'newest';
  lyricsFilterI.value = 'all';
  keyFilterI.value = '';
  tagFilterI.value = '';
  searchI.value = '';
  rerenderList();
  filtersPanel.hidden = true;
  updateFiltersButtonState();
  showNotice('Ֆիլտրերը մաքրված են', 'info');
});

saveBtn?.addEventListener('click', async () => {
  try {
    await saveCurrentSong();
  } catch (err) {
    showNotice(err.message || 'Սխալ է տեղի ունեցել', 'error');
  }
});

cancelEditBtn?.addEventListener('click', () => {
  clearForm();
  showNotice('Խմբագրումը չեղարկված է', 'info');
  activateWorkspaceTab('libraryPane');
});

clearBtn?.addEventListener('click', clearForm);
installAdminAppBtn?.addEventListener('click', async () => {
  await handleAdminInstallRequest();
});

sidebarSearchBtn?.addEventListener('click', () => {
  activateWorkspaceTab('libraryPane');
  scrollWorkspaceIntoView();
  searchI.focus();
  searchI.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
newSongBtn?.addEventListener('click', () => {
  clearForm();
  activateWorkspaceTab('editorPane');
  scrollWorkspaceIntoView();
  titleI.focus();
  showNotice('Բացված է նոր երգի ռեժիմը', 'info');
});

refreshListBtn?.addEventListener('click', async () => {
  try {
    await fetchSongs();
    showNotice(window.I18N?.Loading || 'Բեռնվում է...', 'info');
  } catch (err) {
    showNotice(err.message || 'Չհաջողվեց թարմացնել ցանկը', 'error');
  }
});
sidebarRefreshBtn?.addEventListener('click', () => refreshListBtn.click());
sidebarClearBtn?.addEventListener('click', () => {
  clearForm();
  showNotice('Ձևը մաքրված է', 'info');
});

loadMoreBtn?.addEventListener('click', () => {
  visibleSongsCount += SONGS_PAGE_SIZE;
  renderTable(getVisibleSongs(), getFilteredSongs().length);
});

tableBody?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (btn) {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    try {
      if (action === 'edit') await startEditSong(id);
      if (action === 'delete') await deleteSong(id);
    } catch (err) {
      showNotice(err.message || 'Սխալ է տեղի ունեցել', 'error');
    }
    return;
  }

  const openTarget = e.target.closest('[data-open-song]');
  if (openTarget) {
    openSongInNewTab(openTarget.dataset.openSong);
    return;
  }

  const row = e.target.closest('tr.clickable-row');
  if (row && row.dataset.songId) {
    openSongInNewTab(row.dataset.songId);
  }
});

buildKeysGrid();
setEditMode(null);
renderPreview();
activateWorkspaceTab('libraryPane');
markCurrentSnapshotAsSaved();
updateInstallAdminButton();
updateAdminInstallBanner();

window?.addEventListener('beforeunload', (e) => {
  if (!hasUnsavedChanges()) return;
  e.preventDefault();
  e.returnValue = '';
});

(async function init() {
  try {
    filtersPanel.hidden = true;
    updateFiltersButtonState();
    await fetchSongs();
    updateFiltersButtonState();
  } catch (err) {
    showNotice(err.message || 'Չհաջողվեց բեռնել տվյալները', 'error');
  } finally {
    hideAdminPageLoader(120);
  }
})();
</script>
</body>
</html>
