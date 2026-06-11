import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    admin_updates = f.read()

# The new ultra-premium CSS
premium_css = """<style>
/* ── AETHER PREMIUM INTERIOR STYLES ── */
:root {
  --bg: #111827;
  --panel: #161e2e;
  --panel-glow: #1a2234;
  --sidebar-bg: rgba(22, 30, 46, 0.8);
  --line: rgba(255, 255, 255, 0.08);
  --text: #f9fafb;
  --muted: #9ca3af;
  --primary: #06b6d4;
  --accent: #a855f7;
  --danger: #ef4444;
  --warning: #f59e0b;
  --success: #10b981;
}

body { background: var(--bg); color: var(--text); overflow: hidden; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
.wrap { max-width: 1100px; margin: 0 auto; padding-bottom: 60px; display: flex; flex-direction: column; height: 100%; }
.hero, .topbar { display: none !important; }

/* ── ANIMATED TABS (Section Switcher) ── */
.section-switcher { 
    display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; margin-bottom: 32px; 
    border-bottom: 1px solid var(--line); scrollbar-width: none;
}
.section-switcher::-webkit-scrollbar { display: none; }
.section-tab { 
    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); color: var(--muted); 
    padding: 12px 20px; border-radius: 12px; cursor: pointer; text-align: left; 
    transition: all .3s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; 
    display: flex; flex-direction: column; gap: 4px; position: relative; overflow: hidden;
}
.section-tab span { font-size: 14px; font-weight: 600; z-index: 2; position: relative; }
.section-tab small { font-size: 11px; opacity: 0; max-height: 0; transition: all 0.3s; z-index: 2; position: relative; }
.section-tab:hover { background: rgba(255,255,255,0.05); color: var(--text); border-color: rgba(255,255,255,0.1); transform: translateY(-2px); }
.section-tab.active { 
    background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.4); color: #fff; 
    box-shadow: 0 4px 20px rgba(168,85,247,0.15);
}
.section-tab.active::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
}
.section-tab.active small { opacity: 0.7; max-height: 40px; margin-top: 4px; }

/* ── GLASS PANELS & CARDS ── */
.panel, .section-focus, .card, .mod-card { 
    background: rgba(22, 30, 46, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--line); border-radius: 16px; 
    padding: 24px; margin-bottom: 24px; color: var(--text); 
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    transition: transform 0.3s, box-shadow 0.3s;
}
.panel:hover, .card:hover { border-color: rgba(255,255,255,0.12); box-shadow: 0 8px 30px rgba(0,0,0,0.4); }

.section-focus { display: flex; flex-direction: column; gap: 16px; position: relative; overflow: hidden; }
.section-focus::after {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 60%);
    pointer-events: none; z-index: 0;
}
.section-focus-copy, .section-focus-side { position: relative; z-index: 1; }
.section-focus-copy h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #fff; letter-spacing: -0.5px; }
.section-focus-copy p { font-size: 14px; color: var(--muted); line-height: 1.6; }
.eyebrow { 
    display: inline-block; padding: 6px 12px; border-radius: 8px; 
    background: rgba(6,182,212,0.1); color: var(--primary); border: 1px solid rgba(6,182,212,0.2);
    font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.5px;
}

/* ── STATS GRID (Micro-Animations) ── */
.stats, .push-stats-grid { 
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; 
}
.stat, .push-stat-card { 
    background: linear-gradient(145deg, rgba(22,30,46,0.8), rgba(17,24,39,0.9)); 
    border: 1px solid var(--line); border-radius: 16px; padding: 20px; 
    display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden;
    transition: transform 0.2s;
}
.stat:hover { transform: translateY(-4px); border-color: rgba(6,182,212,0.3); }
.stat strong, .push-stat-val { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 6px; display: block; line-height: 1.2; }
.stat span, .push-stat-lbl { font-size: 13px; color: var(--muted); font-weight: 500; }

/* ── RELEASE WORKSPACE ── */
.release-workspace { display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
@media (max-width: 900px) { .release-workspace { grid-template-columns: 1fr; } }
.release-summary-grid { display: flex; flex-direction: column; gap: 16px; }
.release-summary-card {
    background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; padding: 20px;
    display: flex; flex-direction: column; gap: 10px;
}
.release-summary-card strong { font-size: 15px; color: #fff; }
.release-summary-card span { font-size: 13px; color: var(--muted); }
.release-checklist { background: rgba(255,255,255,0.01); border-radius: 12px; padding: 20px; border: 1px solid var(--line); }
.release-checklist h3 { font-size: 15px; margin-bottom: 8px; color: #fff; }
.release-checklist p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
.release-check { display: flex; gap: 12px; margin-bottom: 16px; }
.release-check-badge { 
    width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; 
    font-size: 11px; font-weight: 700; flex-shrink: 0; background: rgba(255,255,255,0.1); color: var(--muted); 
}
.release-check[data-state="done"] .release-check-badge { background: rgba(16,185,129,0.2); color: var(--success); }
.release-check strong { font-size: 13px; color: #fff; display: block; margin-bottom: 2px; }
.release-check span { font-size: 11px; color: var(--muted); display: block; }

/* ── FORMS & NEON INPUTS ── */
.stack { display: flex; flex-direction: column; gap: 20px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 13.5px; font-weight: 600; color: #fff; }
.form-group .desc, .field-hint { font-size: 12px; color: var(--muted); }
.input, select, textarea { 
    background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; 
    border-radius: 10px; padding: 12px 16px; font-size: 14px; font-family: inherit; transition: all 0.2s;
    width: 100%; box-sizing: border-box;
}
.input:focus, select:focus, textarea:focus { 
    border-color: var(--primary); outline: none; background: rgba(0,0,0,0.4); 
    box-shadow: 0 0 0 3px rgba(6,182,212,0.15);
}
textarea { min-height: 120px; resize: vertical; }

/* ── BUTTONS (Gradient Glow) ── */
.actions { display: flex; gap: 12px; margin-top: 32px; flex-wrap: wrap; }
.btn, .btn-primary, .history-btn { 
    background: linear-gradient(135deg, #3b82f6, var(--accent)); color: #fff; 
    border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; 
    cursor: pointer; box-shadow: 0 4px 15px rgba(168,85,247,0.4); text-decoration: none; 
    display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(168,85,247,0.6); }
.btn:active { transform: translateY(0); }
.btn-outline, .btn-danger { 
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; 
    box-shadow: none; backdrop-filter: blur(10px); 
}
.btn-outline:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
.btn-danger { color: #fca5a5; border-color: rgba(239,68,68,0.3); }
.btn-danger:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.5); }

/* ── TABLES ── */
.table-wrap { overflow-x: auto; margin-top: 16px; border: 1px solid var(--line); border-radius: 12px; background: rgba(0,0,0,0.2); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { background: rgba(255,255,255,0.02); padding: 14px 16px; font-size: 12px; font-weight: 600; color: var(--muted); border-bottom: 1px solid var(--line); text-transform: uppercase; letter-spacing: 0.5px; }
td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13.5px; vertical-align: middle; }
tr:hover td { background: rgba(255,255,255,0.02); }
tr:last-child td { border-bottom: none; }

/* ── CHIPS & BADGES ── */
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.chip { 
    padding: 6px 12px; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); 
    border-radius: 20px; font-size: 12px; color: var(--primary); font-weight: 600;
}
.badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; display: inline-flex; }
.badge.pending { background: rgba(245,158,11,0.15); color: #fcd34d; border: 1px solid rgba(245,158,11,0.3); }
.badge.approved, .badge.success { background: rgba(16,185,129,0.15); color: #a7f3d0; border: 1px solid rgba(16,185,129,0.3); }
.badge.rejected, .badge.error { background: rgba(239,68,68,0.15); color: #fecaca; border: 1px solid rgba(239,68,68,0.3); }

/* ── UTILS ── */
code, pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 3px 8px; color: var(--accent); font-family: monospace; font-size: 12px; }
.banner { padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
.banner.success { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #a7f3d0; }
.banner.error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #fecaca; }

.content { flex: 1; overflow-y: auto; padding: 32px 40px; }
@media (max-width: 768px) { .content { padding: 20px; } .wrap { padding-bottom: 40px; } }
</style>"""

old_style_start = admin_updates.find('<style>')
old_style_end = admin_updates.find('</style>', old_style_start) + 8

if old_style_start != -1 and old_style_end != -1:
    new_html = admin_updates[:old_style_start] + premium_css + admin_updates[old_style_end:]
    with open('admin_updates.php', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Successfully injected premium CSS into admin_updates.php")
else:
    print("Could not find the <style> block in admin_updates.php!")
