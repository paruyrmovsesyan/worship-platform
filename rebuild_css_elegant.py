import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact style block and replace it entirely
style_start = content.find('<style>')
style_end = content.find('</style>', style_start) + len('</style>')

NEW_STYLE = '''<style>
/* ═══════════════════════════════════════════════════════════
   AETHER ADMIN — PREMIUM ELEGANT REDESIGN
   ═══════════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  /* Ultra-minimalist dark palette */
  --bg:         #050505;
  --surface:    #0a0a0a;
  --panel:      #0e0e0e;
  --border:     #222222;
  --border-hover:#333333;
  --text:       #f0f0f0;
  --muted:      #888888;
  --primary:    #ededed;
  --accent:     #06b6d4;
  --accent-alt: #9333ea;
  --success:    #10b981;
  --warning:    #f59e0b;
  --danger:     #ef4444;
  
  --radius-sm:  6px;
  --radius:     12px;
  --radius-lg:  20px;
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
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ══════════════════════════════
   SIDEBAR
══════════════════════════════ */
.sidebar {
  width: 260px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 32px 20px;
  flex-shrink: 0;
  z-index: 10;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 40px;
  padding: 0 10px;
  letter-spacing: 0.5px;
  color: var(--text);
}
.logo-icon {
  width: 28px; height: 28px;
  background: var(--text);
  border-radius: 6px;
  display: grid; place-items: center;
  font-weight: 800; font-size: 13px; color: var(--bg);
  flex-shrink: 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
  margin-bottom: 4px;
}
.nav-item:hover { color: var(--text); background: rgba(255,255,255,0.03); }
.nav-item.active {
  color: var(--text);
  background: rgba(255,255,255,0.06);
  font-weight: 600;
}
.nav-item svg { width: 16px; height: 16px; flex-shrink: 0; opacity: 0.7; }
.nav-item.active svg { opacity: 1; }
.logout { margin-top: auto; color: #f87171; }
.logout:hover { background: rgba(239,68,68,0.08); color: #fca5a5; }

/* ══════════════════════════════
   MAIN LAYOUT
══════════════════════════════ */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 70px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg);
}
.topbar-left { font-size: 14px; font-weight: 500; color: var(--muted); }
.topbar-right { display: flex; align-items: center; gap: 20px; }
.topbar-icon { color: var(--muted); cursor: pointer; transition: color 0.2s; position: relative; }
.topbar-icon:hover { color: var(--text); }
.topbar-icon .dot-badge {
  position: absolute; top: -2px; right: -2px;
  background: var(--accent-alt); width: 8px; height: 8px; border-radius: 50%;
  border: 2px solid var(--bg); color: transparent; overflow: hidden;
}

.profile-btn {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; font-weight: 500; color: var(--text);
  cursor: pointer; background: none; border: none;
}
.profile-btn img { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border); }

/* ══════════════════════════════
   CONTENT
══════════════════════════════ */
.content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 60px 40px 100px;
}

/* Page Header */
.page-header { margin-bottom: 40px; }
.page-header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 8px; color: var(--text); }
.page-header p { font-size: 15px; color: var(--muted); }

/* Banner */
.banner {
  padding: 16px 20px; border-radius: var(--radius-sm); margin-bottom: 32px;
  font-size: 14px; font-weight: 500; border: 1px solid var(--border);
  background: rgba(255,255,255,0.02); color: var(--text);
}
.banner[hidden] { display: none !important; }
.banner.success { border-color: rgba(16,185,129,0.3); color: #34d399; }
.banner.error   { border-color: rgba(239,68,68,0.3); color: #f87171; }

/* ══════════════════════════════
   SECTION SWITCHER (Tabs)
══════════════════════════════ */
.section-switcher {
  display: flex; gap: 24px; overflow-x: auto;
  border-bottom: 1px solid var(--border);
  margin-bottom: 40px; padding-bottom: 0;
  scrollbar-width: none;
}
.section-switcher::-webkit-scrollbar { display: none; }
.section-tab {
  padding: 0 0 16px 0;
  border: none; background: none;
  color: var(--muted); font-size: 14px; font-weight: 500;
  cursor: pointer; position: relative; white-space: nowrap;
  transition: color 0.2s;
}
.section-tab:hover { color: var(--text); }
.section-tab.active { color: var(--text); font-weight: 600; }
.section-tab.active::after {
  content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
  height: 2px; background: var(--text);
}
.section-tab small { display: none; }

/* ══════════════════════════════
   SECTION FOCUS BAR
══════════════════════════════ */
.section-focus {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  margin-bottom: 48px; flex-wrap: wrap;
}
.section-focus-copy h2 { font-size: 20px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.3px; }
.section-focus-copy p { font-size: 15px; color: var(--muted); max-width: 500px; line-height: 1.5; }
.eyebrow {
  display: inline-block; font-size: 12px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;
}
.section-focus-side { display: flex; align-items: center; gap: 16px; }

/* ══════════════════════════════
   STATS
══════════════════════════════ */
.stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 48px;
}
.stat {
  padding: 24px; border: 1px solid var(--border); border-radius: var(--radius);
  background: rgba(255,255,255,0.01);
}
.stat strong { display: block; font-size: 32px; font-weight: 700; margin-bottom: 8px; letter-spacing: -1px; }
.stat span { font-size: 13px; color: var(--muted); }
.push-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
.push-stat-card { padding: 20px; border: 1px solid var(--border); border-radius: var(--radius); text-align: center; }
.push-stat-val { font-size: 28px; font-weight: 700; display: block; margin-bottom: 4px; }
.push-stat-lbl { font-size: 13px; color: var(--muted); }

/* ══════════════════════════════
   PANELS & CARDS (Minimalist)
══════════════════════════════ */
.panel, section.panel {
  margin-bottom: 48px;
}
.panel > h2, .panel > h3 {
  font-size: 16px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.2px;
}
.panel > p {
  font-size: 14px; color: var(--muted); margin-bottom: 24px; max-width: 600px;
}
.panel-section {
  border-top: 1px solid var(--border);
  padding: 32px 0;
}
.panel-section:first-of-type { border-top: none; padding-top: 0; }

.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  background: var(--surface);
  margin-bottom: 16px;
}

/* ══════════════════════════════
   FORMS & INPUTS
══════════════════════════════ */
.stack { display: flex; flex-direction: column; gap: 32px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }

.form-group { display: flex; flex-direction: column; gap: 10px; }
.form-group label { font-size: 14px; font-weight: 500; color: var(--text); }
.form-group .desc, .field-hint { font-size: 13px; color: var(--muted); line-height: 1.5; margin-top: 4px; }

input[type="text"], input[type="email"], input[type="number"], input[type="url"], input[type="password"],
.input, select, textarea {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  width: 100%;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--text); outline: none; background: #000;
}
textarea { min-height: 120px; resize: vertical; }

/* Toggles */
.toggle-row {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
  padding: 20px 0; border-bottom: 1px solid var(--border);
}
.toggle-row:last-child { border-bottom: none; padding-bottom: 0; }
.toggle-info strong { display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.toggle-info span { font-size: 13px; color: var(--muted); line-height: 1.5; }
input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--text); margin-top: 2px; }

/* ══════════════════════════════
   BUTTONS (Sleek & Thin)
══════════════════════════════ */
.actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }

.btn, .btn-primary, .history-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 20px; border-radius: var(--radius-sm);
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s; text-decoration: none;
  background: var(--text); color: var(--bg); border: 1px solid var(--text);
}
.btn:hover { background: transparent; color: var(--text); }
.btn-outline, .btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
.btn-outline:hover { border-color: var(--text); }
.btn-ghost { border-color: transparent; }
.btn-ghost:hover { background: var(--border); }
.btn-danger { background: transparent; color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
.btn-danger:hover { border-color: #f87171; background: rgba(239,68,68,0.05); }

/* Quick Actions Redesign */
/* Before they were ugly stacked purple pills, now they will be elegant thin cards */
#quickActionsSection .actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
#quickActionsSection .btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 14px;
  border-radius: var(--radius-sm);
  font-weight: 400;
  justify-content: flex-start;
  text-align: left;
}
#quickActionsSection .btn:hover {
  border-color: var(--text);
  background: rgba(255,255,255,0.02);
}

/* ══════════════════════════════
   RELEASE WORKSPACE
══════════════════════════════ */
.release-workspace { display: grid; grid-template-columns: 1fr 320px; gap: 32px; margin-top: 24px; }
@media (max-width: 900px) { .release-workspace { grid-template-columns: 1fr; } }
.release-summary-card { padding: 24px; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; }
.release-summary-card strong { font-size: 14px; font-weight: 500; margin-bottom: 8px; display: block; }
.release-summary-card span { font-size: 13px; color: var(--muted); }
.release-checklist { padding: 24px; border: 1px solid var(--border); border-radius: var(--radius); }
.release-checklist h3 { font-size: 14px; margin-bottom: 8px; font-weight: 500; }
.release-checklist p { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
.release-check { display: flex; gap: 12px; margin-bottom: 16px; }
.release-check-badge {
  width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border);
  display: grid; place-items: center; font-size: 10px; color: transparent; flex-shrink: 0;
}
.release-check[data-state="done"] .release-check-badge { border-color: var(--success); background: var(--success); color: var(--bg); }
.release-check[data-state="warn"] .release-check-badge { border-color: var(--warning); background: var(--warning); color: var(--bg); }
.release-check div strong { font-size: 14px; font-weight: 500; margin-bottom: 4px; display: block; }
.release-check div span { font-size: 13px; color: var(--muted); }

/* ══════════════════════════════
   TABLES
══════════════════════════════ */
.table-wrap { overflow-x: auto; margin-top: 24px; border: 1px solid var(--border); border-radius: var(--radius-sm); }
table { width: 100%; border-collapse: collapse; text-align: left; }
thead th { padding: 14px 20px; font-size: 12px; font-weight: 500; color: var(--muted); border-bottom: 1px solid var(--border); }
td { padding: 16px 20px; font-size: 14px; border-bottom: 1px solid var(--border); }
tbody tr:hover td { background: rgba(255,255,255,0.01); }
tbody tr:last-child td { border-bottom: none; }

/* ══════════════════════════════
   CHIPS & UTILS
══════════════════════════════ */
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { padding: 4px 12px; border: 1px solid var(--border); border-radius: 20px; font-size: 12px; color: var(--muted); }
.badge { display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; border: 1px solid; }
.badge.pending { color: var(--warning); border-color: rgba(245,158,11,0.3); }
.badge.success, .badge.approved { color: var(--success); border-color: rgba(16,185,129,0.3); }
.badge.error, .badge.rejected { color: var(--danger); border-color: rgba(239,68,68,0.3); }

code, pre { font-family: 'Courier New', monospace; font-size: 13px; }
code { background: var(--border); padding: 2px 6px; border-radius: 4px; }
pre { background: var(--surface); border: 1px solid var(--border); padding: 16px; border-radius: var(--radius-sm); overflow-x: auto; }

.divider { height: 1px; background: var(--border); margin: 32px 0; }
.autosave-status { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .wrap { padding: 32px 20px 80px; }
  .topbar { padding: 0 20px; }
  .section-focus { flex-direction: column; gap: 16px; }
}
</style>'''

new_content = content[:style_start] + NEW_STYLE + content[style_end:]

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: Elegant CSS fully applied!")
