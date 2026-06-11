import os

def build_admin_v4():
    with open('admin_updates.php', 'r', encoding='utf-8') as f:
        content = f.read()
        
    layout_start = content.find('<div class="app-layout">')
    if layout_start == -1:
        layout_start = content.find('<div class="saas-layout">')
    if layout_start == -1:
        layout_start = content.find('<div class="shell">')
    
    script_idx = content.find('<script>')
    
    php_header = content[:layout_start]
    js_footer = content[script_idx:]
    
    style_start = php_header.find('<style>')
    style_end = php_header.find('</style>')
    if style_start != -1 and style_end != -1:
        php_header = php_header[:style_start] + php_header[style_end + len('</style>'):]

    NEW_CSS = """<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #f4f6f8;
  --surface: #ffffff;
  --line: #e2e8f0;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #f97316;
  --success: #10b981;
  --danger: #ef4444;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --radius-sm: 6px; --radius: 8px;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; }

/* ── LAYOUT ── */
.app-layout { display: flex; height: 100vh; width: 100vw; }
.app-sidebar { width: 260px; background: var(--surface); border-right: 1px solid var(--line); display: flex; flex-direction: column; }
.brand { height: 72px; display: flex; align-items: center; padding: 0 24px; gap: 12px; border-bottom: 1px solid var(--line); }
.brand-icon { width: 32px; height: 32px; background: var(--text); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
.brand-text { font-weight: 700; font-size: 16px; }

.nav-menu { padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.nav-item { padding: 10px 16px; border-radius: var(--radius); color: var(--muted); font-weight: 500; text-decoration: none; font-size: 14px; display: block; }
.nav-item:hover { background: #f1f5f9; color: var(--text); }
.nav-item.active { background: #ffedd5; color: var(--primary); font-weight: 600; }

.app-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.app-topbar { height: 72px; background: var(--surface); border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }
.app-content { flex: 1; padding: 32px; overflow-y: auto; }

/* ── UI COMPONENTS ── */
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; border-radius: var(--radius-sm); font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid var(--line); background: var(--surface); color: var(--text); }
.btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }

.page-header { margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 24px; font-weight: 700; }
.page-header p { margin: 4px 0 0; font-size: 14px; color: var(--muted); }

/* Tabs for Section Switcher */
.section-switcher { display: flex; gap: 32px; margin-top: 24px; border-bottom: 1px solid var(--line); }
.section-tab { padding: 0 4px 12px; border: none; background: transparent; color: var(--muted); font-weight: 500; font-size: 14px; border-bottom: 2px solid transparent; cursor: pointer; margin-bottom: -1px; }
.section-tab.active { color: var(--text); font-weight: 600; border-bottom-color: var(--primary); }
.section-tab span { pointer-events: none; }
.section-tab small { display: none; } /* hide old subtext */

.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
.panel h2 { margin-top:0; font-size: 18px; }

/* Legacy Classes -> Compact SaaS Mapping */
.hero { display: none; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 4px; }
.stat strong { font-size: 20px; font-weight: 700; color: var(--text); }
.stat span { font-size: 12px; color: var(--muted); line-height: 1.4; }

.panel h3 { margin: 0 0 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.field input[type="text"], .field input[type="password"], .field input[type="number"], .field select, .field textarea, .textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); font-family: inherit; font-size: 14px; background: #fff; transition: border-color 0.2s; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); }
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--primary); }
.field small { display: block; font-size: 12px; color: var(--muted); margin-top: 4px; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.chip { display: inline-flex; align-items: center; padding: 4px 10px; background: #f1f5f9; color: var(--text); font-size: 12px; font-weight: 500; border-radius: 20px; border: 1px solid var(--line); }
.autosave-status { font-size: 12px; color: var(--muted); }
.autosave-status[data-state="saving"] { color: var(--primary); }
.autosave-status[data-state="saved"] { color: var(--success); }

/* specific components */
.release-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px; }
.release-summary-card { background: #fafafa; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 16px; }
.release-summary-card strong { display: block; font-size: 14px; margin-bottom: 4px; }
.release-summary-card span { font-size: 12px; color: var(--muted); display: block; }

.permission-card, .device-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: var(--shadow-sm); }
.permission-card .head, .device-card .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 8px; }
.permission-card strong, .device-card strong { font-size: 14px; }
.permission-card p, .device-card p { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.5; }

.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }

.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); }
.notice { padding: 12px 16px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 16px; border-left: 4px solid var(--primary); background: #fff7ed; }
.notice.success { border-left-color: var(--success); background: #ecfdf5; }
.notice.error { border-left-color: var(--danger); background: #fef2f2; }

/* Log entries */
.log-entry { font-size: 12px; padding: 8px 12px; border-bottom: 1px solid var(--line); font-family: monospace; display: flex; flex-direction: column; gap: 4px; }
.log-entry:last-child { border-bottom: none; }
.log-entry .time { color: var(--muted); }
.log-entry .text { color: var(--text); }

/* Tables inside panels */
.panel table { width: 100%; border-collapse: collapse; font-size: 13px; }
.panel th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--line); color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11px; }
.panel td { padding: 12px; border-bottom: 1px solid var(--line); }
.panel tbody tr:hover { background: #fafafa; }

/* Global reset for hidden */
.hidden { display: none !important; }
.stack { display: flex; flex-direction: column; gap: 24px; }

.lang-switcher { display: flex; gap: 4px; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 2px; background: #f8fafc; }
.lang-btn { text-decoration: none; color: var(--muted); font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; transition: 0.2s; }
.lang-btn:hover { color: var(--text); }
.lang-btn.active { background: #fff; color: var(--primary); box-shadow: var(--shadow-sm); }
</style>"""

    # Extract dynamic sections from the original file
    # specifically `<div class="layout" id="adminLayout">`
    layout_start = content.find('<div class="layout" id="adminLayout">')
    layout_end = script_idx
    layout_html = content[layout_start:layout_end]

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
        'Նախադիտում և Տրանսպոզիցիա' => 'Предпросмотр и Транспозиция', 'Օգտագործել բեմոլներ (b)' => 'Использовать бемоли (b)'
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
        'Նախադիտում և Տրանսպոզիցիա' => 'Preview & Transpose', 'Օգտագործել բեմոլներ (b)' => 'Use flats (b)'
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
"""

    admin_access_str = "require_once __DIR__ . '/admin_access.php';"
    if admin_access_str in php_header:
        php_header = php_header.replace(admin_access_str, admin_access_str + "\n" + i18n_php)
    else:
        php_header = php_header + "\n<?php\n" + i18n_php + "\n?>\n"

    NEW_BODY = f"""
<div class="app-layout">
  <aside class="app-sidebar">
    <div class="brand">
      <div class="brand-icon">WY</div>
      <div class="brand-text"><?= __('Worship Admin') ?></div>
    </div>
    <div class="nav-menu">
      <a class="nav-item" href="songs.php"><?= __('Երգերի ցանկ') ?></a>
      <a class="nav-item active" href="admin_updates.php"><?= __('Կարգավորումներ') ?></a>
      <a class="nav-item" href="admin_logout.php" style="color:var(--danger); margin-top:auto;"><?= __('Դուրս գալ') ?></a>
    </div>
  </aside>

  <main class="app-main">
    <header class="app-topbar">
      <div></div>
      <div class="topbar-right">
        <div class="lang-switcher">
          <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
          <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
          <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
        </div>
        <span class="pill"><?= __('Ադմին') ?></span>
      </div>
    </header>

    <div class="app-content">
      <div class="page-header">
        <h2><?= __('Կարգավորումներ և համակարգ') ?></h2>
        <p><?= __('Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։') ?></p>
        
        <div class="section-switcher" role="tablist">
          <button class="section-tab active" data-section-tab="release"><span><?= __('Թարմացումներ') ?></span></button>
          <button class="section-tab" data-section-tab="maintenance"><span><?= __('Սպասարկում') ?></span></button>
          <button class="section-tab" data-section-tab="push"><span><?= __('Push') ?></span></button>
          <button class="section-tab" data-section-tab="devices"><span><?= __('Սարքեր') ?></span></button>
          <button class="section-tab" data-section-tab="history"><span><?= __('Պատմություն') ?></span></button>
          <button class="section-tab" data-section-tab="access"><span><?= __('Մուտքեր') ?></span></button>
          <button class="section-tab" data-section-tab="moderation"><span><?= __('Մոդերացիա') ?></span></button>
          <button class="section-tab" data-section-tab="translations"><span><?= __('Թարգմանություն') ?></span></button>
        </div>
      </div>
      
      <!-- INJECT EXISTING LAYOUT -->
      {layout_html}
    </div>
  </main>
</div>
"""

    with open('admin_v4.php', 'w', encoding='utf-8') as f:
        f.write(php_header + NEW_CSS + NEW_BODY + js_footer)
        
    print("Successfully built admin_v4.php")

build_admin_v4()
