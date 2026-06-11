import os

def apply_saas_design():
    with open('admin_updates.php', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject PHP language cookie logic at the top
    php_inject = """$access = wp_admin_require_access('/admin_updates.php');
if (isset($_GET['lang']) && in_array($_GET['lang'], ['hy', 'ru', 'en'])) {
    setcookie('admin_lang', $_GET['lang'], time() + 86400 * 30, '/');
    header('Location: ?');
    exit;
}
$adminLang = $_COOKIE['admin_lang'] ?? 'hy';
"""
    if "$adminLang =" not in content:
        content = content.replace("$access = wp_admin_require_access('/admin_updates.php');", php_inject)

    # 2. Inject CSS
    css_inject = """
/* --- SAAS OVERRIDES --- */
body { margin: 0; overflow: hidden; background: #f4f6f8; }
.app-layout { display: flex; height: 100vh; width: 100vw; font-family: 'Inter', sans-serif; }
.app-sidebar { width: 260px; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.brand { height: 72px; display: flex; align-items: center; padding: 0 24px; gap: 12px; border-bottom: 1px solid #e2e8f0; }
.brand-icon { width: 32px; height: 32px; background: #0f172a; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
.brand-text { font-weight: 700; font-size: 16px; color: #0f172a; }
.nav-menu { padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.nav-item { padding: 10px 16px; border-radius: 8px; color: #64748b; font-weight: 500; text-decoration: none; font-size: 14px; display: block; }
.nav-item:hover { background: #f1f5f9; color: #0f172a; }
.nav-item.active { background: #ffedd5; color: #f97316; font-weight: 600; }
.app-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #f4f6f8; }
.app-topbar { height: 72px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }
.app-content { flex: 1; padding: 32px; overflow-y: auto; }
.section-focus, .hero { display: none !important; }
.section-switcher { display: flex !important; gap: 32px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; background: transparent; padding: 0; }
.section-switcher .section-tab { padding: 0 4px 12px; border: none; background: transparent; color: #64748b; font-weight: 500; font-size: 14px; border-bottom: 2px solid transparent; cursor: pointer; margin-bottom: -1px; width: auto; height: auto; display: block; border-radius: 0; box-shadow: none; text-align: left; }
.section-switcher .section-tab.active { color: #0f172a; font-weight: 600; border-bottom-color: #f97316; background: transparent; }
.section-switcher .section-tab small { display: none; }
.section-switcher .section-tab span { pointer-events: none; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.lang-switcher { display: inline-flex; gap: 4px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px; background: #f8fafc; margin-right: 12px; }
.lang-btn { text-decoration: none; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; color: #64748b; transition: 0.2s; }
.lang-btn:hover { color: #0f172a; }
.lang-btn.active { background: #fff; color: #f97316; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
</style>
"""
    if "/* --- SAAS OVERRIDES --- */" not in content:
        content = content.replace('</style>', css_inject)

    # 3. Replace <main class="wrap"> up to the banner with the new App Layout
    layout_start_idx = content.find('<main class="wrap">')
    layout_end_idx = content.find('<div\n      class="banner', layout_start_idx)
    
    if layout_start_idx != -1 and layout_end_idx != -1:
        new_layout_header = """<script>
    const ADMIN_I18N = {
      'Թարմացում և տեղադրում': {ru: 'Обновление и установка', en: 'Update & Deploy'},
      'Թարմացումների Վահանակ': {ru: 'Панель обновлений', en: 'Updates Dashboard'},
      'Ծրագրի ընթացիկ տարբերակ': {ru: 'Текущая версия приложения', en: 'Current App Version'},
      'Կայքի ընթացիկ տարբերակ': {ru: 'Текущая версия сайта', en: 'Current Web Version'},
      'Փաթեթի կապի վիճակ': {ru: 'Статус связи пакета', en: 'Package Sync Status'},
      'Ծրագրի ընդհանուր ճանաչված տեղադրումներ': {ru: 'Общее количество установок', en: 'Total Known Installs'},
      '1. Թարմացում և տեղադրում': {ru: 'Обновление и установка', en: 'Update & Deploy'},
      '2. Տեխնիկական աշխատանքներ': {ru: 'Тех. работы', en: 'Maintenance'},
      '3. Push ծանուցումներ': {ru: 'Push-уведомления', en: 'Push Notifications'},
      '4. Սարքեր': {ru: 'Устройства', en: 'Devices'},
      '5. Պատմություն': {ru: 'История', en: 'History'},
      '6. Մուտքեր': {ru: 'Доступы', en: 'Access'},
      '7. Մոդերացիա': {ru: 'Модерация', en: 'Moderation'},
      '8. Թարգմանություններ': {ru: 'Переводы', en: 'Translations'},
      'Կարգավորումներ և համակարգ': {ru: 'Настройки и система', en: 'Settings & System'},
      'Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։': {ru: 'Управляйте версиями, устройствами, доступами и т.д.', en: 'Manage app versions, devices, accesses, etc.'},
      'Երգերի ցանկ': {ru: 'Список песен', en: 'Music Library'},
      'Կարգավորումներ': {ru: 'Настройки', en: 'Settings'},
      'Դուրս գալ': {ru: 'Выйти', en: 'Log Out'},
      'Ադմին': {ru: 'Админ', en: 'Admin'}
    };
    const currentLang = '<?= $adminLang ?>';
    if (currentLang !== 'hy') {
      function translateNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.textContent.trim();
          if (text && ADMIN_I18N[text] && ADMIN_I18N[text][currentLang]) {
            node.textContent = node.textContent.replace(text, ADMIN_I18N[text][currentLang]);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          node.childNodes.forEach(translateNode);
        }
      }
      document.addEventListener('DOMContentLoaded', () => {
        translateNode(document.body);
      });
    }
</script>

<div class="app-layout">
  <aside class="app-sidebar">
    <div class="brand">
      <div class="brand-icon">WY</div>
      <div class="brand-text">Worship Admin</div>
    </div>
    <div class="nav-menu">
      <a class="nav-item" href="songs.php">Երգերի ցանկ</a>
      <a class="nav-item active" href="admin_updates.php">Կարգավորումներ</a>
      <a class="nav-item" href="admin_logout.php" style="color:#ef4444; margin-top:auto;">Դուրս գալ</a>
    </div>
  </aside>
  <main class="app-main">
    <header class="app-topbar">
      <div></div>
      <div class="topbar-right" style="display:flex; align-items:center; gap:16px;">
        <div class="lang-switcher">
          <a href="?lang=hy" class="lang-btn <?= $adminLang === 'hy' ? 'active' : '' ?>">AM</a>
          <a href="?lang=ru" class="lang-btn <?= $adminLang === 'ru' ? 'active' : '' ?>">RU</a>
          <a href="?lang=en" class="lang-btn <?= $adminLang === 'en' ? 'active' : '' ?>">EN</a>
        </div>
        <span class="pill" style="padding:4px 12px; background:#e2e8f0; border-radius:20px; font-size:12px; font-weight:600;">Ադմին</span>
      </div>
    </header>
    <div class="app-content">
      <div class="page-header" style="margin-bottom:24px;">
        <h2 style="margin:0; font-size:24px; font-weight:700;">Կարգավորումներ և համակարգ</h2>
        <p style="margin:4px 0 0; font-size:14px; color:#64748b;">Կառավարեք ծրագրի տարբերակները, սարքերը, մուտքերը և այլն։</p>
      </div>

      """
        content = content[:layout_start_idx] + new_layout_header + content[layout_end_idx:]

    # 4. Replace closing tag
    if "</main>" in content and "</div></main></div>" not in content:
        content = content.replace("</main>", "</div></main></div>")

    with open('admin_updates.php', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully transformed admin_updates.php to SaaS layout!")

apply_saas_design()
