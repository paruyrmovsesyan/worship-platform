import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    html = f.read()

new_css = """<style>
/* ── UNTLIP LIGHT PASTEL THEME ── */
:root {
  --bg: #f4f7fe;
  --panel: #ffffff;
  --line: #e2e8f0;
  --text: #1f2438;
  --muted: #7a7f9a;
  --primary: #4318FF; /* Bright untlip purple */
  --primary-2: #3311DB;
  --success: #05cd99;
  --warning: #ffce20;
  --danger: #ee5d50;
  --radius: 20px;
  --shadow: 0 18px 40px rgba(112, 144, 176, 0.12);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
}

.wrap { max-width: 1400px; margin: 0 auto; padding: 28px 18px 60px; }
.topbar { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(300px,.85fr); gap: 18px; align-items: stretch; margin-bottom: 18px; }

/* ── LAYOUT ── */
.app-layout { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }
.app-sidebar { 
  width: 280px; background: #ffffff; border-right: none; 
  display: flex; flex-direction: column; padding: 32px 24px; flex-shrink: 0; 
  box-shadow: 14px 17px 40px 4px rgba(112, 144, 176, 0.08); z-index: 10;
}
.app-main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; position: relative; }
.app-content { padding: 40px; max-width: 1300px; width: 100%; margin: 0 auto; }

/* ── SIDEBAR ── */
.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; padding: 0 8px; }
.brand-icon { 
  width: 36px; height: 36px; background: #111c44; color: #fff; 
  border-radius: 10px; display: flex; align-items: center; justify-content: center; 
  font-weight: 800; font-size: 16px; 
}
.brand-text { font-size: 24px; font-weight: 800; color: #111c44; letter-spacing: -0.5px; }

.nav-menu { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 16px;
  color: #a3aed1; text-decoration: none; font-size: 15px; font-weight: 600; transition: all 0.2s;
}
.nav-item:hover { background: #f4f7fe; color: #111c44; }
.nav-item.active { background: var(--primary); color: #ffffff; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.25); }

.sidebar-heading { font-size: 12px; font-weight: 700; color: #a3aed1; text-transform: uppercase; letter-spacing: 0.5px; margin: 32px 0 12px 12px; }

/* ── TABS (Section Switcher) ── */
.section-switcher { 
  display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; 
}
.section-tab { 
  background: transparent; border: none; color: #a3aed1; 
  padding: 14px 18px; border-radius: 16px; cursor: pointer; text-align: left; 
  transition: all .2s; display: flex; flex-direction: column; gap: 4px; text-decoration: none;
}
.section-tab span { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
.section-tab:hover { background: #f4f7fe; color: #111c44; }
.section-tab.active { 
  background: var(--primary); color: #ffffff; box-shadow: 0 10px 20px rgba(67, 24, 255, 0.25); 
}

.lang-switcher { display: flex; gap: 10px; padding: 0 8px; }
.lang-btn { 
  flex: 1; padding: 8px 12px; border-radius: 12px; background: #f4f7fe; color: #a3aed1; 
  font-size: 13px; font-weight: 700; text-decoration: none; transition: 0.2s; text-align: center;
}
.lang-btn.active { background: #111c44; color: #fff; }

/* ── CARDS & PANELS ── */
.panel { 
  background: var(--panel); border: none; border-radius: var(--radius); 
  padding: 32px; margin-bottom: 32px; box-shadow: var(--shadow); 
}
.panel.full { padding: 40px; }
.panel h2, .section-focus-copy h2 { font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px; color: #111c44; }
.panel p, .section-focus-copy p { margin: 0 0 24px; color: #a3aed1; line-height: 1.6; font-size: 15px; }

/* ── STATS (Untlip Style) ── */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 40px; }
.stat {
  padding: 32px; border-radius: var(--radius); display: flex; flex-direction: column; gap: 16px;
  background: #ffffff; border: none; box-shadow: var(--shadow); position: relative; overflow: hidden;
}

/* First stat card: Light Blue */
.stat:nth-child(1) { background: #e5f3ff; }
.stat:nth-child(1) strong { color: #228fff; }
.stat:nth-child(1) span { color: #5c8fc2; font-weight: 600; }

/* Second stat card: Light Purple */
.stat:nth-child(2) { background: #f3ebff; }
.stat:nth-child(2) strong { color: #7d40ff; }
.stat:nth-child(2) span { color: #8e73b2; font-weight: 600; }

/* Third stat card: Light Orange */
.stat:nth-child(3) { background: #ffefe5; }
.stat:nth-child(3) strong { color: #ff6b1c; }
.stat:nth-child(3) span { color: #b28269; font-weight: 600; }

.stat strong { font-size: 42px; font-weight: 800; letter-spacing: -1.5px; line-height: 1; }
.stat span { font-size: 16px; }

/* ── FORMS & INPUTS ── */
.stack { display: flex; flex-direction: column; gap: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
.field, .form-group { display: flex; flex-direction: column; gap: 10px; }
label { font-size: 14px; font-weight: 700; color: #111c44; }
.desc, .field-hint { font-size: 13px; color: #a3aed1; line-height: 1.5; }

input, textarea, select {
  width: 100%; border-radius: 16px; border: 1px solid #e2e8f0; background: #ffffff;
  color: #111c44; padding: 16px 20px; outline: none; font-size: 15px; font-family: inherit;
  transition: all 0.2s; font-weight: 500;
}
input::placeholder, textarea::placeholder { color: #a3aed1; }
input:focus, textarea:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(67, 24, 255, 0.1); }
textarea { min-height: 140px; resize: vertical; }

.checkbox-label { display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 15px; font-weight: 600; color: #111c44; }
input[type="checkbox"] { width: 22px; height: 22px; border-radius: 6px; accent-color: var(--primary); cursor: pointer; }

/* ── BUTTONS ── */
.actions { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; }
.btn, .history-btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 50px;
  padding: 12px 24px; border-radius: 16px; border: none; color: #111c44;
  background: #f4f7fe; font-weight: 700; font-size: 15px; cursor: pointer; text-decoration: none;
  transition: all 0.2s; letter-spacing: 0.3px;
}
.btn:hover, .history-btn:hover { background: #e2e8f0; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.btn-primary { 
  background: var(--primary); color: #ffffff; 
  box-shadow: 0 10px 20px rgba(67, 24, 255, 0.25); 
}
.btn-primary:hover { background: var(--primary-2); color: #ffffff; box-shadow: 0 12px 24px rgba(67, 24, 255, 0.35); }

.btn-danger { color: #ee5d50; background: #ffeeeb; }
.btn-danger:hover { background: #ffdbd6; }

/* ── TABLES (Untlip Style) ── */
.table-wrap { overflow-x: auto; background: #ffffff; border-radius: 20px; box-shadow: var(--shadow); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { 
  background: #ffffff; padding: 24px 24px 16px; font-size: 14px; font-weight: 700; 
  color: #a3aed1; border-bottom: 1px solid #f4f7fe; white-space: nowrap;
}
td { padding: 20px 24px; border-bottom: 1px solid #f4f7fe; font-size: 15px; color: #111c44; vertical-align: middle; font-weight: 600; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafbfc; }

/* Status Badges */
.badge { 
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; 
  border-radius: 999px; font-size: 13px; font-weight: 700; 
}
.badge.success, .badge.approved, .status-badge.active { background: #e6f9f3; color: #05cd99; }
.badge.warning, .badge.pending, .status-badge.pending { background: #fff8e1; color: #ffce20; }
.badge.danger, .badge.rejected, .status-badge.inactive { background: #ffeeeb; color: #ee5d50; }

/* ── UTILS ── */
.banner { padding: 18px 24px; border-radius: 16px; margin-bottom: 32px; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
.banner.success { background: #e6f9f3; color: #05cd99; }
.banner.error { background: #ffeeeb; color: #ee5d50; }

code, pre { background: #f4f7fe; border-radius: 8px; padding: 4px 8px; color: var(--primary); font-family: monospace; font-size: 14px; }

/* Section Focus (Quick actions banner) */
.section-focus { 
  background: #ffffff; border-radius: var(--radius); 
  padding: 40px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; gap: 32px;
  box-shadow: var(--shadow);
}
.section-focus-copy { flex: 1; }
.section-focus-side { display: flex; flex-direction: column; gap: 20px; align-items: flex-end; }
.eyebrow { 
  display: inline-block; padding: 8px 16px; border-radius: 10px; 
  background: rgba(67, 24, 255, 0.1); color: var(--primary); 
  font-size: 13px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.5px;
}
.chips { display: flex; gap: 12px; }
.chip { padding: 8px 16px; background: #f4f7fe; border-radius: 10px; font-size: 14px; font-weight: 700; color: #111c44; }

/* Push Stats */
.push-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px; }
.push-stat-card { background: #ffffff; border-radius: 16px; padding: 24px; text-align: center; box-shadow: var(--shadow); }
.push-stat-val { font-size: 36px; font-weight: 800; color: #111c44; margin-bottom: 8px; letter-spacing: -1px; }
.push-stat-lbl { font-size: 14px; color: #a3aed1; font-weight: 600; }
</style>"""

# Using regex to replace the old CSS block
# We know it starts with <style> and ends with </style>
pattern = re.compile(r'<style>.*?</style>', re.DOTALL)

# Let's replace only the FIRST <style> block, which is the main CSS block in admin_updates.php
new_html = pattern.sub(new_css, html, count=1)

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("CSS replaced in admin_updates.php successfully.")
