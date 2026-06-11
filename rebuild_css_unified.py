import os
import re

# Paths to target PHP files
TARGET_FILES = [
    'admin_updates.php',
    'songs.php',
    # Add other admin pages here if needed, e.g., 'dashboard.php'
]

# Unified CSS to inject (clean dark mode)
UNIFIED_CSS = '''
/* ── STANDARD ADMIN DASHBOARD - CLEAN DARK MODE ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg: #121212;
  --surface: #1e1e1e;
  --border: #333333;
  --border-focus: #555555;
  --text: #e9ecef;
  --muted: #adb5bd;

  /* Standard Action Colors */
  --primary: #0d6efd;
  --primary-hover: #0b5ed7;
  --success: #198754;
  --danger: #dc3545;
  --warning: #ffc107;
  --info: #0dcaf0;

  --radius-sm: 4px;
  --radius: 6px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { height: 100%; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.5;
}

/* Sidebar */
.sidebar {
  width: 250px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 32px;
  padding: 0 8px;
}
.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--primary);
  border-radius: var(--radius-sm);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: bold;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
  margin-bottom: 4px;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.nav-item.active { background: rgba(13, 110, 253, 0.15); color: var(--primary); font-weight: 600; }
.nav-item.active svg { color: var(--primary); }
.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
.logout { margin-top: auto; color: var(--danger); }
.logout:hover { background: rgba(220, 53, 69, 0.1); color: var(--danger); }

/* Main layout & Topbar */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.topbar-left { font-size: 16px; font-weight: 600; color: var(--text); }
.topbar-right { display: flex; align-items: center; gap: 16px; }
.topbar-icon { color: var(--muted); cursor: pointer; position: relative; }
.topbar-icon:hover { color: var(--text); }
.topbar-icon .dot-badge {
  position: absolute; top: -4px; right: -4px;
  background: var(--danger);
  width: 16px; height: 16px; border-radius: 50%;
  color: #fff; font-size: 10px; display: grid; place-items: center; font-weight: bold;
}
.profile-btn {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: var(--text); cursor: pointer;
  background: none; border: none; font-weight: 500;
}
.profile-btn img { width: 32px; height: 32px; border-radius: 50%; }

/* Buttons */
.btn, .btn-primary, .history-btn {
  display: inline-block; padding: 8px 16px; border-radius: var(--radius-sm);
  font-size: 14px; font-weight: 500; cursor: pointer; border: none;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-outline, .btn-ghost {
  border: 1px solid var(--border); background: transparent; color: var(--text);
}
.btn-outline:hover, .btn-ghost:hover { background: var(--border); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: #bb2d3b; }
.btn-success { background: var(--success); color: #fff; }
.btn-success:hover { background: #157347; }

/* Cards / Panels */
.card, .panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
}

/* Tables */
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.table th { background: var(--surface); text-align: left; }
.table tr:hover { background: rgba(255,255,255,0.02); }

/* Forms */
input, select, textarea {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 14px;
}
input:focus, select:focus, textarea:focus {
  outline: none; border-color: var(--primary);
}
''' 

def replace_style_block(content: str, new_css: str) -> str:
    """Replace the first <style>...</style> block with new_css."""
    pattern = re.compile(r'<style[^>]*>.*?</style>', re.DOTALL | re.IGNORECASE)
    replacement = f'<style>{new_css}</style>'
    return pattern.sub(replacement, content, count=1)

base_dir = os.path.abspath(os.path.dirname(__file__))
for filename in TARGET_FILES:
    path = os.path.join(base_dir, filename)
    if not os.path.isfile(path):
        print(f'⚠️  File not found: {path}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()
    updated = replace_style_block(original, UNIFIED_CSS)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(updated)
    print(f'✅ Updated {filename}')
""
