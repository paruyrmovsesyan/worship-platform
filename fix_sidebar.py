import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace emoji blocks with SVG blocks

replacements = [
    ('<span>📦 <?= __(\'Ծրագրի կարգավորումներ\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Ծրագրի կարգավորումներ\') ?></span>'),
     
    ('<span>🔧 <?= __(\'Սպասարկում\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Սպասարկում\') ?></span>'),
     
    ('<span>🔔 <?= __(\'Ծանուցումներ\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Ծանուցումներ\') ?></span>'),
     
    ('<span>📱 <?= __(\'Սարքեր\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Սարքեր\') ?></span>'),
     
    ('<span>🕘 <?= __(\'Պատմություն\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Պատմություն\') ?></span>'),
     
    ('<span>🔑 <?= __(\'Մուտքեր\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Մուտքեր\') ?></span>'),
     
    ('<span>✅ <?= __(\'Մոդերացիա\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Մոդերացիա\') ?></span>'),
     
    ('<span>🌐 <?= __(\'Թարգմանություն\') ?></span>',
     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>\n          <span style="white-space: normal; line-height: 1.2; text-align: left;"><?= __(\'Թարգմանություն\') ?></span>'),
]

for old, new in replacements:
    content = content.replace(old, new)

# Also fix the flex-direction logic in CSS
content = content.replace(
    '.section-tab { \n  background: transparent; border: none; color: #a3aed1; \n  padding: 14px 18px; border-radius: 16px; cursor: pointer; text-align: left; \n  transition: all .2s; display: flex; flex-direction: column; gap: 4px; text-decoration: none;\n}',
    '.section-tab { \n  background: transparent; border: none; color: var(--muted); \n  padding: 14px 24px; border-radius: 12px; cursor: pointer; text-align: left; \n  transition: all .2s; display: flex; flex-direction: row; align-items: center; gap: 16px; text-decoration: none;\n  margin: 4px 16px;\n  width: calc(100% - 32px);\n}'
)

# And remove the confusing "span" styles from old CSS
content = content.replace(
    '.section-tab span { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 12px; }',
    '.section-tab span { font-size: 15px; font-weight: 600; }'
)


with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced emojis with SVGs and fixed sidebar layout in admin_updates.php")

