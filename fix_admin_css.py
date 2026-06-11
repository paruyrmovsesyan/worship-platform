import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    html = f.read()

new_css = """<style>
/* ── AETHER COMPATIBLE COMPONENT STYLES (PREMIUM FIX) ── */
body, html { background: var(--bg); color: var(--text); overflow: hidden; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
.wrap { max-width: 1200px; margin: 0 auto; width: 100%; padding-bottom: 60px; display: flex; flex-direction: column; }
.hero, .topbar { display: none !important; }

/* ── TABS (Section Switcher) ── */
.section-switcher { 
    display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; margin-bottom: 24px; 
    border-bottom: 1px solid var(--line); scrollbar-width: none; 
    -ms-overflow-style: none; flex-wrap: nowrap;
}
.section-switcher::-webkit-scrollbar { display: none; }
.section-tab { 
    background: rgba(255,255,255,0.02); border: 1px solid var(--line); color: var(--muted); 
    padding: 12px 20px; border-radius: 30px; cursor: pointer; text-align: center; 
    transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; 
    font-size: 14px; font-weight: 500; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
/* Hide the huge descriptions inside tabs */
.section-tab small { display: none; }
.section-tab span { pointer-events: none; }
.section-tab:hover { background: rgba(255,255,255,0.06); color: var(--text); border-color: rgba(255,255,255,0.1); transform: translateY(-1px); }
.section-tab.active { 
    background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05)); 
    border-color: rgba(168,85,247,0.5); color: #fff; box-shadow: 0 4px 15px rgba(168,85,247,0.15);
}

/* ── MAIN BANNER (Section Focus) ── */
.section-focus { 
    background: linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9)); 
    border: 1px solid var(--line); border-radius: 16px; 
    padding: 24px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2); backdrop-filter: blur(10px); gap: 20px; flex-wrap: wrap;
}
.section-focus-copy { flex: 1; min-width: 280px; }
.section-focus-copy h2 { font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #fff; letter-spacing: -0.01em; }
.section-focus-copy p { font-size: 14px; color: var(--muted); margin: 0; line-height: 1.5; }
.eyebrow { 
    display: inline-block; padding: 4px 12px; border-radius: 20px; 
    background: rgba(168,85,247,0.15); color: #c084fc; 
    font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;
}
.section-focus-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 20px; font-size: 12px; color: var(--text); border: 1px solid var(--line); font-weight: 500; }

/* ── PANELS & GRIDS ── */
.layout { display: grid; gap: 24px; grid-template-columns: 1fr; }
.panel { 
    background: var(--panel); border: 1px solid var(--line); border-radius: 16px; 
    padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
}
.panel.full { grid-column: 1 / -1; }
.panel h2 { font-size: 18px; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid var(--line); padding-bottom: 12px; color: #fff; }

/* ── STATS CARDS ── */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat { 
    background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; 
    padding: 16px; display: flex; flex-direction: column; justify-content: center;
}
.stat strong { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.stat span { font-size: 12px; color: var(--muted); line-height: 1.4; }

/* ── FORMS & INPUTS ── */
.stack { display: flex; flex-direction: column; gap: 20px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 13.5px; font-weight: 500; color: #e2e8f0; }
.form-group .desc, .field-hint { font-size: 12px; color: var(--muted); opacity: 0.8; line-height: 1.5; }
.input, select, textarea { 
    background: rgba(0,0,0,0.2); border: 1px solid var(--line); color: #fff; 
    border-radius: 10px; padding: 12px 14px; font-size: 14px; font-family: inherit; transition: all 0.2s;
    width: 100%; box-sizing: border-box; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}
.input:focus, select:focus, textarea:focus { 
    border-color: rgba(168,85,247,0.6); outline: none; background: rgba(0,0,0,0.3); box-shadow: 0 0 0 3px rgba(168,85,247,0.1);
}
textarea { min-height: 120px; resize: vertical; line-height: 1.5; }
select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 40px; }

/* ── BUTTONS & ACTIONS ── */
.actions, .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.btn, .btn-primary, .history-btn { 
    background: linear-gradient(135deg, #3b82f6, var(--accent)); color: #fff; 
    border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; 
    cursor: pointer; box-shadow: 0 4px 12px rgba(168,85,247,0.25); text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(168,85,247,0.35); }
.btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: var(--text); box-shadow: none; }
.btn-outline:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); transform: translateY(-1px); }
.btn-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; box-shadow: none; }
.btn-danger:hover { background: rgba(239,68,68,0.2); color: #fecaca; transform: translateY(-1px); }

/* ── BANNERS ── */
.banner { padding: 14px 18px; border-radius: 10px; margin-bottom: 24px; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px; }
.banner.success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #34d399; }
.banner.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; }

/* ── TABLES ── */
.table-wrap { overflow-x: auto; margin-top: 16px; border: 1px solid var(--line); border-radius: 10px; background: rgba(0,0,0,0.1); }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { background: rgba(255,255,255,0.03); padding: 14px 16px; font-size: 12px; font-weight: 600; color: var(--muted); border-bottom: 1px solid var(--line); text-transform: uppercase; letter-spacing: 0.05em; }
td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 14px; color: #e2e8f0; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(255,255,255,0.02); }

/* ── UTILS ── */
code, pre { background: rgba(0,0,0,0.3); border: 1px solid var(--line); border-radius: 6px; padding: 2px 6px; color: #d8b4fe; font-family: 'Fira Code', monospace; font-size: 13px; }
hr { border: none; border-top: 1px solid var(--line); margin: 24px 0; }

/* ── SPECIFIC COMPONENTS ── */
.history-item { padding: 16px; border-bottom: 1px solid var(--line); }
.history-item:last-child { border-bottom: none; }
.history-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.history-title { font-weight: 600; font-size: 15px; color: var(--text); }
.history-time { font-size: 12px; color: var(--muted); }
.mod-card { background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: transform 0.2s; }
.mod-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }
.mod-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.mod-title { font-size: 16px; font-weight: 600; color: #fff; }
.badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.badge.pending { background: rgba(245,158,11,0.15); color: #fcd34d; border: 1px solid rgba(245,158,11,0.3); }
.badge.approved { background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
.badge.rejected { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
.access-mini { display: flex; justify-content: space-between; padding: 12px 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); }
.access-helper { font-size: 13px; color: var(--muted); }
.field { margin-bottom: 20px; }
.device-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: rgba(0,0,0,0.15); padding: 16px; border-radius: 10px; margin-top: 12px; }
.device-meta { display: flex; flex-direction: column; gap: 4px; }
.device-meta strong { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; }
.device-meta span { font-size: 14px; color: var(--text); }
</style>"""

pattern = re.compile(r'<style>\s*/\* ── AETHER COMPATIBLE COMPONENT STYLES ── \*/.*?</style>', re.DOTALL)
new_html = pattern.sub(new_css, html, count=1)

# Ensure the .section-switcher inner text looks like modern pills by replacing numbers with regex if we wanted to
# But CSS `font-size: 14px` and hiding `<small>` is enough.

with open('admin_updates_fixed.php', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Premium CSS generated successfully.")
