import re

with open('songs.php', 'r', encoding='utf-8') as f:
    html = f.read()

new_css = """<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #f4f7fe;
  --surface: #ffffff;
  --line: #e2e8f0;
  --line-soft: #f1f5f9;
  --text: #111c44;
  --muted: #a3aed1;
  --primary: #4318FF;
  --primary-hover: #3311DB;
  --success: #05cd99;
  --success-bg: #e6f9f3;
  --warning: #ffce20;
  --warning-bg: #fff8e1;
  --danger: #ee5d50;
  --danger-bg: #ffeeeb;
  --shadow-sm: 0 1px 2px rgba(112, 144, 176, 0.05);
  --shadow: 0 18px 40px rgba(112, 144, 176, 0.12);
  --shadow-lg: 0 20px 40px rgba(112, 144, 176, 0.15);
  --radius-sm: 10px;
  --radius: 16px;
  --radius-md: 20px;
  --radius-lg: 24px;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

/* ── LAYOUT ── */
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.app-sidebar {
  width: 280px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 14px 17px 40px 4px rgba(112, 144, 176, 0.08); z-index: 50; border-right: none;
}

.brand {
  height: 90px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
}
.brand-icon {
  width: 36px; height: 36px;
  background: var(--text);
  color: #fff;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px;
}
.brand-text { font-weight: 800; font-size: 24px; color: var(--text); letter-spacing: -0.5px; }

.nav-menu {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 16px;
  color: #a3aed1; font-weight: 600; text-decoration: none; font-size: 15px;
  cursor: pointer; transition: all 0.2s; border: none; background: transparent; width: 100%; text-align: left;
}
.nav-item:hover { background: #f4f7fe; color: #111c44; }
.nav-item.active { background: var(--primary); color: #ffffff; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.25); }

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-box {
  position: relative;
  width: 380px;
}
.search-box input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #ffffff;
  font-size: 15px;
  transition: all 0.2s; font-weight: 500;
}
.search-box input:focus { background: #fff; border-color: var(--primary); outline: none; box-shadow: 0 0 0 4px rgba(67, 24, 255, 0.1); }
.search-box::before {
  content: '🔍';
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
}

.topbar-right { display: flex; align-items: center; gap: 16px; }

.app-content {
  flex: 1;
  padding: 40px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  overflow-y: auto;
}

/* ── UI COMPONENTS ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 12px 24px; border-radius: 16px;
  font-weight: 700; font-size: 15px;
  cursor: pointer; transition: all 0.2s;
  border: none; background: #ffffff; color: #111c44;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.btn:hover { background: #f4f7fe; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.btn-primary { background: var(--primary); color: #fff; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.25); }
.btn-primary:hover { background: var(--primary-hover); color: #fff; box-shadow: 0 12px 24px rgba(67, 24, 255, 0.35); }

.pill {
  padding: 8px 16px; border-radius: 999px;
  font-size: 13px; font-weight: 700;
  background: var(--surface); border: none; color: #111c44; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

/* ── TABLE VIEW ── */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 32px; padding-bottom: 24px;
}
.page-header h2 { margin: 0; font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.page-header p { margin: 8px 0 0; font-size: 15px; color: var(--muted); font-weight: 500; }
.mini-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.mini-pill { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px; background: #f4f7fe; color: #a3aed1; }
.status-pill.has-lyrics { background: var(--success-bg); color: var(--success); }
.status-pill.no-lyrics { background: var(--warning-bg); color: var(--warning); }
.mobile-key-pill { background: rgba(67, 24, 255, 0.1); color: var(--primary); }
.song-title strong { font-size: 16px; font-weight: 700; color: var(--text); cursor: pointer; transition: 0.2s;}
.song-title strong:hover { color: var(--primary); }
.song-meta { font-size: 13px; color: var(--muted); margin-top: 6px; font-weight: 500; }
.song-title { padding: 4px 0; }
.tabs { display: flex; gap: 32px; }
.tab {
  padding: 0 4px 12px; border: none; background: transparent;
  color: var(--muted); font-weight: 600; font-size: 15px;
  border-bottom: 3px solid transparent; cursor: pointer; margin-bottom: -17px; transition: 0.2s;
}
.tab.active { color: var(--primary); border-bottom-color: var(--primary); }

.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
}
.toolbar-left { display: flex; gap: 16px; }

.table-card {
  background: var(--surface); border: none;
  border-radius: var(--radius-md); box-shadow: var(--shadow);
  overflow: hidden; padding: 20px 0;
}
table { width: 100%; border-collapse: collapse; }
th { background: #ffffff; color: #a3aed1; font-weight: 700; font-size: 14px; text-transform: none; text-align: left; padding: 20px 24px; border-bottom: 1px solid #f4f7fe; white-space: nowrap;}
td { padding: 20px 24px; border-bottom: 1px solid #f4f7fe; font-size: 15px; vertical-align: middle; font-weight: 600; color: #111c44;}
tbody tr:hover { background: #fafbfc; }
tbody tr:last-child td { border-bottom: none; }

.song-title-cell strong { color: var(--text); font-weight: 700; display: block; margin-bottom: 6px;}
.song-title-cell span { color: var(--muted); font-size: 13px; }

/* ── EDITOR MODAL ── */
.editor-modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(11, 20, 55, 0.5); backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex; justify-content: flex-end;
  opacity: 0; pointer-events: none; transition: opacity 0.3s;
}
.editor-modal.is-active { opacity: 1; pointer-events: auto; }

.editor-drawer {
  width: 800px; max-width: 100%;
  background: var(--surface);
  height: 100%;
  box-shadow: -20px 0 50px rgba(11, 20, 55, 0.1);
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.editor-modal.is-active .editor-drawer { transform: translateX(0); }

.editor-header {
  padding: 32px 40px; border-bottom: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center;
}
.editor-header h3 { font-size: 24px; font-weight: 800; color: #111c44; margin: 0; }
.editor-body {
  padding: 40px; flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 32px;
}
.editor-footer {
  padding: 32px 40px; border-top: 1px solid var(--line); background: #ffffff;
  display: flex; justify-content: flex-end; gap: 16px;
}

/* Forms inside editor */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.form-field { display: flex; flex-direction: column; gap: 10px; }
.form-field label { font-size: 14px; font-weight: 700; color: var(--text); }
.form-field input, .form-field textarea {
  padding: 14px 16px; border: 1px solid var(--line); border-radius: var(--radius-sm);
  font-family: inherit; font-size: 15px; font-weight: 500;
}
.form-field textarea { min-height: 140px; resize: vertical; font-family: monospace; }
.form-field input:focus, .form-field textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(67, 24, 255, 0.1); }

/* Dashboard Loader Override */
#adminPageLoader { position:fixed; inset:0; z-index:2000; background:var(--bg); display:flex; align-items:center; justify-content:center; }
#adminPageLoader.hide { display: none; }
#adminPageLoaderCard { background:#fff; padding:40px; border-radius:20px; border:none; text-align:center; box-shadow: var(--shadow);}
#adminPageLoaderTitle { font-size: 24px; font-weight: 800; color: #111c44; }

.lang-switcher { display: flex; gap: 8px; padding: 4px; background: #f4f7fe; border-radius: 12px; border: none; }
.lang-btn { text-decoration: none; color: #a3aed1; font-size: 13px; font-weight: 700; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
.lang-btn:hover { color: #111c44; }
.lang-btn.active { background: #111c44; color: #ffffff; box-shadow: var(--shadow-sm); }
</style>"""

# Find the start of <style> to the first </style>
# And replace
pattern = re.compile(r'<style>.*?</style>', re.DOTALL)
# Only replace the FIRST <style> block, which is the main UI styles
new_html = pattern.sub(new_css, html, count=1)

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("CSS replaced in songs.php successfully.")
