import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

style_start = content.find('<style>')
style_end = content.find('</style>', style_start) + len('</style>')

NEW_STYLE = '''<style>
/* ═══════════════════════════════════════════════════════════
   STANDARD ADMIN DASHBOARD - CLEAN DARK MODE
   No glow, no glass, no complex UI. Just functional CSS.
   ═══════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════
   SIDEBAR
══════════════════════════════ */
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
  display: flex; align-items: center; gap: 12px;
  font-size: 18px; font-weight: 700; color: var(--text);
  margin-bottom: 32px; padding: 0 8px;
}
.logo-icon {
  width: 32px; height: 32px; background: var(--primary);
  border-radius: var(--radius-sm); color: #fff;
  display: grid; place-items: center; font-size: 14px; font-weight: bold;
}
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: var(--radius-sm);
  color: var(--muted); font-size: 14px; text-decoration: none;
  margin-bottom: 4px; transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.nav-item.active { background: rgba(13, 110, 253, 0.15); color: var(--primary); font-weight: 600; }
.nav-item.active svg { color: var(--primary); }
.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
.logout { margin-top: auto; color: var(--danger); }
.logout:hover { background: rgba(220, 53, 69, 0.1); color: var(--danger); }

/* ══════════════════════════════
   MAIN LAYOUT & TOPBAR
══════════════════════════════ */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
  border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}
.topbar-left { font-size: 16px; font-weight: 600; color: var(--text); }
.topbar-right { display: flex; align-items: center; gap: 16px; }
.topbar-icon { color: var(--muted); cursor: pointer; position: relative; }
.topbar-icon:hover { color: var(--text); }
.topbar-icon .dot-badge {
  position: absolute; top: -4px; right: -4px;
  background: var(--danger); width: 16px; height: 16px; border-radius: 50%;
  color: #fff; font-size: 10px; display: grid; place-items: center; font-weight: bold;
}
.profile-btn {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: var(--text); cursor: pointer;
  background: none; border: none; font-weight: 500;
}
.profile-btn img { width: 32px; height: 32px; border-radius: 50%; }

/* ══════════════════════════════
   CONTENT
══════════════════════════════ */
.content { flex: 1; overflow-y: auto; padding: 24px; }
.wrap { max-width: 1000px; margin: 0 auto; padding-bottom: 60px; }

.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
.page-header p { font-size: 14px; color: var(--muted); }

/* Banners */
.banner {
  padding: 16px; border-radius: var(--radius); margin-bottom: 24px;
  font-size: 14px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text);
}
.banner[hidden] { display: none !important; }
.banner.success { border-color: var(--success); color: var(--success); background: rgba(25, 135, 84, 0.1); }
.banner.error   { border-color: var(--danger); color: var(--danger); background: rgba(220, 53, 69, 0.1); }

/* ══════════════════════════════
   SECTION SWITCHER (Tabs)
══════════════════════════════ */
.section-switcher {
  display: flex; gap: 2px; overflow-x: auto;
  border-bottom: 2px solid var(--border);
  margin-bottom: 32px;
}
.section-tab {
  padding: 12px 16px; background: none; border: none;
  color: var(--muted); font-size: 14px; font-weight: 500;
  cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; white-space: nowrap;
}
.section-tab:hover { color: var(--text); }
.section-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
.section-tab small { display: none; }

/* ══════════════════════════════
   FOCUS BAR (Header for sections)
══════════════════════════════ */
.section-focus {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
}
.section-focus-copy h2 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.section-focus-copy p { font-size: 14px; color: var(--muted); }
.eyebrow { font-size: 12px; font-weight: bold; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; display: block; }
.section-focus-side { display: flex; gap: 16px; align-items: center; }

/* ══════════════════════════════
   PANELS & CARDS
══════════════════════════════ */
.panel, section.panel, .card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 24px;
}
.panel > h2, .panel > h3, .card > h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
.panel > p, .card > p { font-size: 14px; color: var(--muted); margin-bottom: 20px; }

.panel-section {
  border-top: 1px solid var(--border); padding-top: 24px; margin-top: 24px;
}

/* ══════════════════════════════
   STATS
══════════════════════════════ */
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat { background: var(--bg); border: 1px solid var(--border); padding: 20px; border-radius: var(--radius); }
.stat strong { display: block; font-size: 24px; font-weight: 600; margin-bottom: 4px; }
.stat span { font-size: 13px; color: var(--muted); }

/* ══════════════════════════════
   FORMS & INPUTS
══════════════════════════════ */
.stack { display: flex; flex-direction: column; gap: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 500; }
.form-group .desc, .field-hint { font-size: 13px; color: var(--muted); }

input[type="text"], input[type="email"], input[type="number"], input[type="password"],
.input, select, textarea {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(13,110,253,0.25);
}
textarea { min-height: 100px; resize: vertical; }

/* Toggles / Checkboxes */
.toggle-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 16px 0; border-bottom: 1px solid var(--border);
}
.toggle-row:last-child { border-bottom: none; }
.toggle-info strong { display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.toggle-info span { font-size: 13px; color: var(--muted); }
input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; margin-top: 2px; }

/* ══════════════════════════════
   BUTTONS (Standard Bootstrap Style)
══════════════════════════════ */
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 24px; }

.btn, .btn-primary, .history-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 8px 16px; border-radius: var(--radius-sm);
  font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none;
  border: 1px solid transparent; background: var(--primary); color: #fff;
}
.btn:hover { background: var(--primary-hover); }

.btn-outline, .btn-ghost {
  background: transparent; border: 1px solid var(--border); color: var(--text);
}
.btn-outline:hover { background: var(--border); }
.btn-ghost { border-color: transparent; }
.btn-ghost:hover { background: rgba(255,255,255,0.05); }

.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: #bb2d3b; }

.btn-success { background: var(--success); color: #fff; }

/* Standard Quick Actions */
#quickActionsSection .actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
#quickActionsSection .btn {
  background: var(--bg); border: 1px solid var(--border); color: var(--text);
  padding: 12px; justify-content: flex-start; border-radius: var(--radius-sm);
  font-weight: normal;
}
#quickActionsSection .btn:hover { background: var(--surface); border-color: var(--muted); }

/* ══════════════════════════════
   TABLES
══════════════════════════════ */
.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-top: 16px; }
table { width: 100%; border-collapse: collapse; text-align: left; background: var(--surface); }
thead th { padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--muted); border-bottom: 2px solid var(--border); background: var(--bg); }
td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid var(--border); }
tbody tr:hover td { background: rgba(255,255,255,0.02); }

/* ══════════════════════════════
   RELEASE WORKSPACE
══════════════════════════════ */
.release-workspace { display: grid; grid-template-columns: 1fr 300px; gap: 24px; margin-top: 24px; }
@media (max-width: 900px) { .release-workspace { grid-template-columns: 1fr; } }
.release-summary-card { padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 16px; }
.release-summary-card strong { display: block; font-weight: 600; margin-bottom: 4px; }
.release-checklist { padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.release-check { display: flex; gap: 12px; margin-bottom: 12px; }
.release-check-badge { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: bold; flex-shrink: 0; background: var(--border); }
.release-check[data-state="done"] .release-check-badge { background: var(--success); color: #fff; }
.release-check[data-state="warn"] .release-check-badge { background: var(--warning); color: #000; }

/* ══════════════════════════════
   CHIPS & BADGES
══════════════════════════════ */
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { padding: 4px 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; font-size: 12px; }
.badge { display: inline-flex; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.badge.pending { background: rgba(255,193,7,0.2); color: var(--warning); }
.badge.success, .badge.approved { background: rgba(25,135,84,0.2); color: var(--success); }
.badge.error, .badge.rejected { background: rgba(220,53,69,0.2); color: var(--danger); }

code, pre { font-family: monospace; font-size: 13px; }
code { background: var(--bg); padding: 2px 4px; border-radius: 4px; }
pre { background: var(--bg); border: 1px solid var(--border); padding: 16px; border-radius: var(--radius-sm); overflow-x: auto; }
.autosave-status { font-size: 12px; color: var(--muted); }
.divider { height: 1px; background: var(--border); margin: 24px 0; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .topbar { padding: 0 16px; }
  .content { padding: 16px; }
}
</style>'''

new_content = content[:style_start] + NEW_STYLE + content[style_end:]

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: Standard CSS applied!")
