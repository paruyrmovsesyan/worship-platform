import re

with open('songs.php', 'r', encoding='utf-8') as f:
    songs_html = f.read()

# Extract styles
style_start = songs_html.find('<style>')
style_end = songs_html.find('</style>') + 8
aether_styles = songs_html[style_start:style_end]

# Extract Sidebar & Topbar
sidebar_start = songs_html.find('<!-- SIDEBAR -->')
sidebar_end = songs_html.find('<!-- CONTENT -->') + 16
aether_layout = songs_html[sidebar_start:sidebar_end]

# Modify admin_updates.php
with open('admin_updates.php', 'r', encoding='utf-8') as f:
    admin_updates = f.read()

old_style_start = admin_updates.find('<style>')
old_style_end = admin_updates.find('</style>') + 8

custom_patch = """
<style>
/* Aether Base Overrides for Admin Updates */
body { background: var(--bg); color: var(--text); overflow: hidden; margin: 0; padding: 0; }
.wrap { max-width: none; margin: 0; padding: 0; display: flex; flex-direction: column; height: 100%; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: none; color: var(--text); }
.section-switcher { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; margin-bottom: 25px; border-bottom: 1px solid var(--line); }
.section-tab { background: transparent; border: 1px solid transparent; color: var(--muted); padding: 10px 16px; border-radius: 10px; cursor: pointer; text-align: left; transition: all .2s; flex-shrink: 0; }
.section-tab span { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.section-tab small { font-size: 11px; opacity: 0.7; }
.section-tab:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.section-tab.active { background: rgba(168,85,247,0.12); border-color: rgba(168,85,247,0.35); color: var(--text); }
.form-group label { color: var(--muted); }
.input, select, textarea { background: rgba(255,255,255,0.04); border: 1px solid var(--line); color: var(--text); border-radius: 8px; padding: 10px; width: 100%; box-sizing: border-box; font-family: inherit; }
.input:focus, select:focus, textarea:focus { border-color: rgba(6,182,212,0.5); outline: none; }
.btn, .btn-primary { background: linear-gradient(135deg, #3b82f6, var(--accent)); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(168,85,247,0.3); }
.btn-outline, .btn-danger { background: rgba(255,255,255,0.05); border: 1px solid var(--line); color: var(--muted); border-radius: 8px; padding: 10px 20px; cursor: pointer; }
.btn-danger { color: #fca5a5; border-color: rgba(239,68,68,0.3); }
.btn-danger:hover { background: rgba(239,68,68,0.1); color: #fecaca; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; border-bottom: 1px solid var(--line); padding: 12px; color: var(--muted); font-size: 12px; }
td { border-bottom: 1px solid rgba(255,255,255,0.03); padding: 12px; font-size: 13px; }
h2, h3, h4 { color: var(--text); }
code, pre { background: rgba(0,0,0,0.3); border: 1px solid var(--line); border-radius: 6px; padding: 2px 6px; color: #a855f7; }
/* The inner content needs to scroll */
.content { flex: 1; overflow-y: auto; padding: 24px 28px; }
.section-focus { background: var(--panel); border: 1px solid var(--line); }
.section-focus-copy p { color: var(--muted); }
.field-hint, .meta, .desc { color: var(--muted); }
.card { background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; }
</style>
"""

new_html = admin_updates[:old_style_start] + aether_styles + custom_patch + admin_updates[old_style_start:old_style_end] + admin_updates[old_style_end:]

body_start = new_html.find('<body>')
# We need to find the old topbar and remove it, up to the <div class="banner">
banner_start = new_html.find('<div\n      class="banner')

if banner_start == -1:
    print("Could not find banner div")
    exit(1)

new_html = new_html[:body_start] + "<body>\n" + aether_layout + "\n<div class=\"content\">\n  <main class=\"wrap\">\n" + new_html[banner_start:]

# Add closing tags
html_end = new_html.find('</html>')
new_html = new_html[:html_end] + "  </main>\n  </div>\n</div>\n" + new_html[html_end:]

# Fix active states in the sidebar
new_html = new_html.replace('<a class="nav-item active" href="/songs.php">', '<a class="nav-item" href="/songs.php">')
new_html = new_html.replace('<a class="nav-item" href="/admin_updates.php">', '<a class="nav-item active" href="/admin_updates.php">')

with open('admin_updates_new.php', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Created admin_updates_new.php")
