import os

def process_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add the PHP i18n initialization block to NEW_BODY
    i18n_php = """
<?php
require_once __DIR__ . '/translation_runtime.php';
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'])) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    $adminLang = $_GET['lang'];
} else {
    $adminLang = $_COOKIE['admin_lang'] ?? 'hy';
}
$_GET['lang'] = $adminLang; // Force for consistency

if (!function_exists('__')) {
    function __($text) {
        global $adminLang;
        $translated = wp_translation_translate_texts([$text], $adminLang, 'admin_panel');
        return htmlspecialchars((string)($translated[0] ?? $text), ENT_QUOTES);
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
?>
"""

    if 'require_once __DIR__ . \'/translation_runtime.php\';' not in content:
        content = content.replace('NEW_BODY = f"""', 'NEW_BODY = f"""' + i18n_php)
        content = content.replace('NEW_BODY = """', 'NEW_BODY = """' + i18n_php)

    # Add Language Switcher CSS
    lang_css = """
.lang-switcher { display: flex; gap: 4px; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 2px; background: #f8fafc; }
.lang-btn { text-decoration: none; color: var(--muted); font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; transition: 0.2s; }
.lang-btn:hover { color: var(--text); }
.lang-btn.active { background: #fff; color: var(--primary); box-shadow: var(--shadow-sm); }
"""
    if '.lang-switcher {' not in content:
        content = content.replace('</style>\"\"\"', lang_css + '</style>\"\"\"')

    # Add Language Switcher HTML
    lang_html = """
      <div class="lang-switcher">
        <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
        <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
        <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
      </div>
"""
    if 'class="lang-switcher"' not in content:
        content = content.replace('<div class="topbar-right">', '<div class="topbar-right">' + lang_html)

    # Dictionary of strings to translate
    translations = {
        'Worship Admin': '<?= __(\'Worship Admin\') ?>',
        'Երգերի ցանկ': '<?= __(\'Երգերի ցանկ\') ?>',
        'Կարգավորումներ': '<?= __(\'Կարգավորումներ\') ?>',
        'Դուրս գալ': '<?= __(\'Դուրս գալ\') ?>',
        'Որոնել անունով, կատարողով...': '<?= __(\'Որոնել անունով, կատարողով...\') ?>',
        'Music Library': '<?= __(\'Music Library\') ?>',
        'Թարմացնել': '<?= __(\'Թարմացնել\') ?>',
        '+ Add Song': '<?= __(\'+ Add Song\') ?>',
        'Title': '<?= __(\'Title\') ?>',
        'Artist': '<?= __(\'Artist\') ?>',
        'Key': '<?= __(\'Key\') ?>',
        'Status': '<?= __(\'Status\') ?>',
        'Actions': '<?= __(\'Actions\') ?>',
        'Բեռնել մնացածը': '<?= __(\'Բեռնել մնացածը\') ?>',
        'Add / Edit Song': '<?= __(\'Add / Edit Song\') ?>',
        'Cancel': '<?= __(\'Cancel\') ?>',
        'Title (AM)': '<?= __(\'Title (AM)\') ?>',
        'Title (RU)': '<?= __(\'Title (RU)\') ?>',
        'Title (LAT)': '<?= __(\'Title (LAT)\') ?>',
        'Title (EN)': '<?= __(\'Title (EN)\') ?>',
        'BPM': '<?= __(\'BPM\') ?>',
        'Tags': '<?= __(\'Tags\') ?>',
        'Chords': '<?= __(\'Chords\') ?>',
        'Lyrics': '<?= __(\'Lyrics\') ?>',
        'Preview': '<?= __(\'Preview\') ?>',
        'Save Song': '<?= __(\'Save Song\') ?>',
        'Close Preview': '<?= __(\'Close Preview\') ?>',
        
        # admin_updates strings
        'Կարգավորումներ և համակարգ': '<?= __(\'Կարգավորումներ և համակարգ\') ?>',
        'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։': '<?= __(\'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։\') ?>',
        '>Թարմացումներ<': '><?= __(\'Թարմացումներ\') ?><',
        '>Սպասարկում<': '><?= __(\'Սպասարկում\') ?><',
        '>Push<': '><?= __(\'Push\') ?><',
        '>Սարքեր<': '><?= __(\'Սարքեր\') ?><',
        '>Պատմություն<': '><?= __(\'Պատմություն\') ?><',
        '>Մուտքեր<': '><?= __(\'Մուտքեր\') ?><',
        '>Մոդերացիա<': '><?= __(\'Մոդերացիա\') ?><',
        '>Թարգմանություն<': '><?= __(\'Թարգմանություն\') ?><',
    }

    # Inject I18N JS object right before the closing script tag or end of NEW_BODY
    if 'window.I18N = <?= json_encode($js_i18n_keys) ?>;' not in content:
        content = content.replace('<!-- LEGACY HIDDEN ELEMENTS FOR JS COMPATIBILITY -->', 
        """<script>window.I18N = <?= json_encode($js_i18n_keys) ?>;</script>\n  <!-- LEGACY HIDDEN ELEMENTS FOR JS COMPATIBILITY -->""")

    for hy, php in translations.items():
        if hy in content and php not in content:
            content = content.replace(hy, php)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('build_v4.py')
process_file('build_admin_v4.py')
print("Successfully injected I18N into builders.")
