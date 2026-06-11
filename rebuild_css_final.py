import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact style block and replace it entirely
style_start = content.find('<style>')
style_end = content.find('</style>', style_start) + len('</style>')

if style_start == -1 or style_end == -1:
    print("ERROR: Could not find <style> block!")
    exit(1)

NEW_STYLE = '''<style>
/* ═══════════════════════════════════════════════════════════
   AETHER ADMIN — SETTINGS PAGE — COMPLETE DESIGN SYSTEM
   ═══════════════════════════════════════════════════════════ */

/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Design Tokens ── */
:root {
  --bg:       #0d1117;
  --surface:  #161b27;
  --panel:    #1c2333;
  --card:     #212840;
  --border:   rgba(255,255,255,0.07);
  --border2:  rgba(255,255,255,0.12);
  --text:     #e6edf3;
  --muted:    #8b949e;
  --subtle:   #6e7681;
  --primary:  #06b6d4;
  --accent:   #a855f7;
  --blue:     #3b82f6;
  --success:  #10b981;
  --warning:  #f59e0b;
  --danger:   #ef4444;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow:    0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --radius-sm: 8px;
  --radius:    12px;
  --radius-lg: 16px;
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { height: 100%; }

/* ── Body & Layout ── */
body {
  font-family: 'Inter', system-ui, sans-serif;
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
  width: 220px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  flex-shrink: 0;
  z-index: 10;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 32px;
  padding: 0 8px;
  color: var(--text);
}
.logo-icon {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, var(--primary), var(--blue));
  border-radius: 8px;
  display: grid; place-items: center;
  font-weight: 800; font-size: 15px; color: #fff;
  flex-shrink: 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  text-decoration: none;
  transition: all .18s ease;
  margin-bottom: 2px;
}
.nav-item:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.nav-item.active {
  color: var(--text);
  background: rgba(168,85,247,0.12);
  border-color: rgba(168,85,247,0.3);
}
.nav-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.nav-item.active svg { color: var(--accent); }
.logout { margin-top: auto; color: #f87171; }
.logout:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }

/* ══════════════════════════════
   MAIN AREA
══════════════════════════════ */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 58px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--surface);
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.topbar-left svg { color: var(--accent); width: 18px; height: 18px; }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.topbar-icon { color: var(--muted); cursor: pointer; position: relative; transition: color .15s; }
.topbar-icon:hover { color: var(--text); }
.topbar-icon .dot-badge {
  position: absolute; top: -3px; right: -3px;
  background: var(--danger); color: #fff;
  font-size: 8px; font-weight: 800;
  width: 14px; height: 14px;
  border-radius: 50%; display: grid; place-items: center;
  border: 2px solid var(--surface);
}
.profile-btn {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--muted); cursor: pointer;
  padding: 5px 10px; border-radius: var(--radius-sm);
  transition: all .15s;
  background: transparent; border: 1px solid transparent;
}
.profile-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); border-color: var(--border); }
.profile-btn img { width: 26px; height: 26px; border-radius: 50%; }

/* ══════════════════════════════
   SCROLLABLE CONTENT
══════════════════════════════ */
.content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.content::-webkit-scrollbar { width: 5px; }
.content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.wrap {
  max-width: 1060px;
  margin: 0 auto;
  padding: 32px 36px 80px;
}

/* ══════════════════════════════
   PAGE HEADER
══════════════════════════════ */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
}
.page-header-text h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  margin-bottom: 4px;
}
.page-header-text p { font-size: 14px; color: var(--muted); }

/* ══════════════════════════════
   NOTIFICATION BANNER
══════════════════════════════ */
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: var(--radius);
  margin-bottom: 24px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid;
  animation: slideDown 0.3s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.banner[hidden] { display: none !important; }
.banner.success { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25); color: #6ee7b7; }
.banner.error   { background: rgba(239,68,68,0.1);  border-color: rgba(239,68,68,0.25);  color: #fca5a5; }
.banner.info    { background: rgba(6,182,212,0.1);   border-color: rgba(6,182,212,0.25);  color: #67e8f9; }

/* ══════════════════════════════
   SECTION TABS
══════════════════════════════ */
.section-switcher {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 1px;
  margin-bottom: 28px;
  scrollbar-width: none;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
}
.section-switcher::-webkit-scrollbar { display: none; }

.section-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 0;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all .18s ease;
  position: relative;
  margin-bottom: -1px;
}
.section-tab span { font-size: 13px; font-weight: 500; }
.section-tab small { display: none; }
.section-tab:hover { color: var(--text); background: rgba(255,255,255,0.03); }
.section-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  background: transparent;
  font-weight: 600;
}

/* ══════════════════════════════
   HERO / SECTION FOCUS BAR
══════════════════════════════ */
.section-focus {
  background: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(6,182,212,0.05) 100%);
  border: 1px solid rgba(168,85,247,0.15);
  border-radius: var(--radius-lg);
  padding: 24px 28px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.section-focus-copy {}
.section-focus-copy h2 {
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}
.section-focus-copy p {
  font-size: 13.5px;
  color: var(--muted);
  max-width: 480px;
}
.section-focus-side {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(168,85,247,0.12);
  border: 1px solid rgba(168,85,247,0.2);
  color: #c084fc;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

/* ══════════════════════════════
   STATS ROW
══════════════════════════════ */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.stat {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, transform .2s;
}
.stat:hover { border-color: var(--border2); transform: translateY(-2px); }
.stat::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity .2s;
}
.stat:hover::before { opacity: 1; }
.stat strong {
  display: block;
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.2;
  margin-bottom: 4px;
}
.stat span {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}

/* Push stat cards */
.push-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.push-stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
}
.push-stat-val { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 4px; display: block; }
.push-stat-lbl { font-size: 12px; color: var(--muted); }

/* ══════════════════════════════
   PANELS / CARDS
══════════════════════════════ */
.panel, section.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  transition: border-color .2s;
}
.panel:hover { border-color: var(--border2); }

.panel > h2, .panel > h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel > h2::before {
  content: '';
  display: inline-block;
  width: 3px; height: 16px;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--primary), var(--accent));
}
.panel > p {
  font-size: 13.5px;
  color: var(--muted);
  margin-bottom: 20px;
  line-height: 1.6;
}

/* ── Panel Sections ── */
.panel-section {
  padding: 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
}
.panel-section:last-child { margin-bottom: 0; }

/* ══════════════════════════════
   RELEASE WORKSPACE
══════════════════════════════ */
.release-workspace {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  margin-top: 16px;
}
@media (max-width: 860px) { .release-workspace { grid-template-columns: 1fr; } }

.release-summary-grid { display: flex; flex-direction: column; gap: 12px; }
.release-summary-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
}
.release-summary-card strong { font-size: 14px; font-weight: 600; color: var(--text); display: block; margin-bottom: 6px; }
.release-summary-card span  { font-size: 13px; color: var(--muted); display: block; margin-bottom: 8px; }

.release-checklist {
  background: rgba(255,255,255,0.015);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
}
.release-checklist h3 { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.release-checklist p  { font-size: 12px; color: var(--muted); margin-bottom: 16px; line-height: 1.5; }
.release-check { display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-start; }
.release-check:last-child { margin-bottom: 0; }
.release-check-badge {
  width: 22px; height: 22px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  background: rgba(255,255,255,0.06); color: var(--muted);
  margin-top: 1px;
}
.release-check[data-state="done"] .release-check-badge { background: rgba(16,185,129,0.2); color: var(--success); }
.release-check[data-state="warn"] .release-check-badge { background: rgba(245,158,11,0.2); color: var(--warning); }
.release-check div strong { font-size: 13px; font-weight: 600; color: var(--text); display: block; margin-bottom: 2px; }
.release-check div span   { font-size: 11.5px; color: var(--muted); display: block; }

/* ══════════════════════════════
   FORMS & INPUTS
══════════════════════════════ */
.stack  { display: flex; flex-direction: column; gap: 18px; }
.grid   { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 5px;
}
.form-group .desc,
.field-hint,
.desc { font-size: 12px; color: var(--muted); line-height: 1.5; margin-top: 2px; }

input[type="text"],
input[type="email"],
input[type="number"],
input[type="url"],
input[type="password"],
.input, select, textarea {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13.5px;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
  width: 100%;
}
input[type="text"]:focus,
input[type="email"]:focus,
input[type="number"]:focus,
input[type="url"]:focus,
input[type="password"]:focus,
.input:focus, select:focus, textarea:focus {
  border-color: var(--primary);
  outline: none;
  background: rgba(6,182,212,0.04);
  box-shadow: 0 0 0 3px rgba(6,182,212,0.1);
}
select { cursor: pointer; }
textarea { min-height: 110px; resize: vertical; }

/* Checkbox & Toggle */
input[type="checkbox"] {
  width: 16px; height: 16px;
  cursor: pointer;
  accent-color: var(--accent);
}
.toggle-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}
.toggle-row:last-child { border-bottom: none; }
.toggle-info { flex: 1; }
.toggle-info strong { font-size: 13.5px; font-weight: 600; color: var(--text); display: block; margin-bottom: 3px; }
.toggle-info span   { font-size: 12px; color: var(--muted); }

/* ══════════════════════════════
   BUTTONS
══════════════════════════════ */
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }

.btn, .btn-primary, .history-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 20px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .18s ease;
  text-decoration: none;
  border: 1px solid transparent;
  white-space: nowrap;
  background: linear-gradient(135deg, var(--blue), var(--accent));
  color: #fff;
  box-shadow: 0 2px 12px rgba(168,85,247,0.3);
}
.btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(168,85,247,0.4); }
.btn:active { transform: translateY(0); }

.btn-sm { padding: 6px 14px; font-size: 12.5px; }

.btn-outline {
  background: rgba(255,255,255,0.05);
  border-color: var(--border);
  color: var(--text);
  box-shadow: none;
}
.btn-outline:hover { background: rgba(255,255,255,0.09); border-color: var(--border2); transform: none; box-shadow: none; }

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--muted);
  box-shadow: none;
}
.btn-ghost:hover { color: var(--text); background: rgba(255,255,255,0.05); transform: none; box-shadow: none; }

.btn-success {
  background: linear-gradient(135deg, #059669, var(--success));
  box-shadow: 0 2px 12px rgba(16,185,129,0.3);
  color: #fff;
}
.btn-success:hover { box-shadow: 0 4px 16px rgba(16,185,129,0.45); }

.btn-danger, button.btn-danger {
  background: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.3);
  color: #fca5a5;
  box-shadow: none;
}
.btn-danger:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); transform: none; box-shadow: none; }

/* Autosave status pill */
.autosave-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
}
.autosave-status[data-state="saved"]   { color: var(--success); border-color: rgba(16,185,129,0.2); }
.autosave-status[data-state="saving"]  { color: var(--warning); border-color: rgba(245,158,11,0.2); }

/* ══════════════════════════════
   TABLES
══════════════════════════════ */
.table-wrap {
  overflow-x: auto;
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(0,0,0,0.15);
}
table { width: 100%; border-collapse: collapse; text-align: left; }
thead th {
  padding: 12px 16px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--subtle);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.015);
  white-space: nowrap;
}
td {
  padding: 13px 16px;
  font-size: 13.5px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  vertical-align: middle;
  color: var(--text);
}
tbody tr:hover td { background: rgba(255,255,255,0.02); }
tbody tr:last-child td { border-bottom: none; }
td.muted { color: var(--muted); }

/* ══════════════════════════════
   CHIPS & BADGES
══════════════════════════════ */
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  padding: 4px 12px;
  background: rgba(6,182,212,0.08);
  border: 1px solid rgba(6,182,212,0.18);
  border-radius: 20px;
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  white-space: nowrap;
}
.chip-purple {
  background: rgba(168,85,247,0.08);
  border-color: rgba(168,85,247,0.18);
  color: #c084fc;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: 1px solid;
}
.badge.pending  { background: rgba(245,158,11,0.12); color: #fbbf24; border-color: rgba(245,158,11,0.25); }
.badge.approved,
.badge.success  { background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.25); }
.badge.rejected,
.badge.error    { background: rgba(239,68,68,0.12);  color: #f87171; border-color: rgba(239,68,68,0.25); }

/* ══════════════════════════════
   MOD CARDS (Moderation)
══════════════════════════════ */
.mod-card, .card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  margin-bottom: 12px;
  transition: border-color .18s;
}
.mod-card:hover, .card:hover { border-color: var(--border2); }
.mod-head, .card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 10px;
}
.mod-title { font-weight: 600; font-size: 14px; color: var(--text); }

/* ══════════════════════════════
   MISC UTILITIES
══════════════════════════════ */
code, .code {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 2px 7px;
  color: var(--primary);
  font-family: 'Courier New', monospace;
  font-size: 12px;
}
pre {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  color: var(--text);
  font-family: 'Courier New', monospace;
  font-size: 12.5px;
  overflow-x: auto;
  margin-top: 8px;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 20px 0;
}

.text-muted   { color: var(--muted); }
.text-success { color: var(--success); }
.text-danger  { color: var(--danger); }
.text-warning { color: var(--warning); }
.text-primary { color: var(--primary); }
.text-accent  { color: var(--accent); }

.mt-8  { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.mt-24 { margin-top: 24px; }

/* Section label — small eyebrow for subgroup */
.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--subtle);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

/* ── Scrollbar global ── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

/* ── Profile dropdown ── */
#profileDropdown { animation: fadeIn .15s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

/* ── Responsive ── */
@media (max-width: 760px) {
  .sidebar { display: none; }
  .wrap { padding: 20px 16px 60px; }
  .section-focus { flex-direction: column; }
  .release-workspace { grid-template-columns: 1fr; }
}
</style>'''

new_content = content[:style_start] + NEW_STYLE + content[style_end:]

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: CSS fully replaced!")
print(f"Style block was {style_end - style_start} bytes, replaced with {len(NEW_STYLE)} bytes")
