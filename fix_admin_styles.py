import re

structural_css = """
/* ── BASE LAYOUT RECOVERY ── */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { display: flex; height: 100vh; overflow: hidden; }

/* ── SIDEBAR ── */
.sidebar { width: 220px; background: rgba(16,24,44,0.9); border-right: 1px solid var(--line); display: flex; flex-direction: column; padding: 24px 14px; flex-shrink: 0; }
.logo { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; margin-bottom: 36px; padding: 0 8px; color: #fff;}
.logo-icon { width: 30px; height: 30px; background: linear-gradient(135deg, var(--primary), #3b82f6); border-radius: 8px; display: grid; place-items: center; font-weight: 800; font-size: 16px; color: #fff; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: var(--muted); font-size: 13.5px; font-weight: 500; cursor: pointer; border: 1px solid transparent; background: transparent; text-decoration: none; transition: all .2s; margin-bottom: 2px; }
.nav-item:hover { color: var(--text); background: rgba(255,255,255,0.04); }
.nav-item.active { color: var(--text); background: rgba(168,85,247,0.12); border-color: rgba(168,85,247,0.35); }
.nav-item.active svg { color: var(--accent); }
.nav-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.logout { margin-top: auto; color: #f87171; }
.logout:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }

/* ── MAIN ── */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ── TOPBAR ── */
.topbar { display: flex; align-items: center; justify-content: flex-end; gap: 18px; padding: 0 28px; height: 62px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
.topbar-icon { color: var(--muted); cursor: pointer; position: relative; }
.topbar-icon:hover { color: var(--text); }
.badge { position: absolute; top: -4px; right: -4px; background: var(--danger); color: #fff; font-size: 9px; font-weight: 800; width: 15px; height: 15px; border-radius: 50%; display: grid; place-items: center; }
.profile { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); cursor: pointer; }
.profile img { width: 30px; height: 30px; border-radius: 50%; }

/* ── CONTENT OVERRIDES ── */
.content { flex: 1; overflow-y: auto; padding: 32px 40px; }
.wrap { max-width: 1100px; margin: 0 auto; padding-bottom: 60px; display: flex; flex-direction: column; height: 100%; }

"""

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Prepend the structural_css right after <style>
if '<style>' in content:
    new_content = content.replace('<style>', '<style>\n' + structural_css, 1)
    with open('admin_updates.php', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed admin styles!")
else:
    print("Error: Could not find <style> tag!")
