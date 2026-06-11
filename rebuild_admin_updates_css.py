import re

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    html = f.read()

# We need to replace the old bulky CSS with sleek Aether-compatible CSS for admin_updates specific components.
# The old block starts around here:
# <style>
#     .wrap{max-width:none;margin:0;padding:0;display:flex;flex-direction:column;height:100%}
#     .topbar{...

new_css = """<style>
/* ── AETHER COMPATIBLE COMPONENT STYLES ── */
.wrap { max-width: 1000px; margin: 0 auto; width: 100%; padding-bottom: 60px; }
.hero { display: none; } /* Hide old hero completely */
.topbar { display: none; } /* Hide old topbar */

/* ── TABS (Section Switcher) ── */
.section-switcher { 
    display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 24px; 
    border-bottom: 1px solid var(--line); scrollbar-width: none;
}
.section-switcher::-webkit-scrollbar { display: none; }
.section-tab { 
    background: transparent; border: 1px solid transparent; color: var(--muted); 
    padding: 10px 16px; border-radius: 8px; cursor: pointer; text-align: left; 
    transition: all .2s; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px;
}
.section-tab span { font-size: 13.5px; font-weight: 600; }
.section-tab small { font-size: 11px; opacity: 0.6; display: none; } /* Hide the bulky text */
.section-tab:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.section-tab.active { 
    background: rgba(168,85,247,0.12); border-color: rgba(168,85,247,0.35); color: var(--text); 
}

/* ── CARDS & PANELS ── */
.panel { 
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px; 
    padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow); color: var(--text); 
}
.section-focus { 
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px; 
    padding: 24px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 16px;
}
.section-focus-copy h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--text); }
.section-focus-copy p { font-size: 14px; color: var(--muted); line-height: 1.5; }
.eyebrow { 
    display: inline-block; padding: 4px 10px; border-radius: 6px; 
    background: rgba(168,85,247,0.15); color: var(--accent); 
    font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;
}

/* ── FORMS & INPUTS ── */
.stack { display: flex; flex-direction: column; gap: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 500; color: var(--muted); }
.form-group .desc, .field-hint { font-size: 12px; color: var(--muted); opacity: 0.8; }
.input, select, textarea { 
    background: rgba(255,255,255,0.03); border: 1px solid var(--line); color: var(--text); 
    border-radius: 8px; padding: 10px 14px; font-size: 14px; font-family: inherit; transition: all 0.2s;
}
.input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; background: rgba(255,255,255,0.05); }
textarea { min-height: 100px; resize: vertical; }

/* ── BUTTONS ── */
.actions { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
.btn, .btn-primary, .history-btn { 
    background: linear-gradient(135deg, #3b82f6, var(--accent)); color: #fff; 
    border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; 
    cursor: pointer; box-shadow: 0 4px 14px rgba(168,85,247,0.3); text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
}
.btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.btn-outline, .btn-danger { background: rgba(255,255,255,0.05); border: 1px solid var(--line); color: var(--text); box-shadow: none; }
.btn-danger { color: #fca5a5; border-color: rgba(239,68,68,0.3); }
.btn-danger:hover { background: rgba(239,68,68,0.1); }

/* ── TABLES ── */
.table-wrap { overflow-x: auto; margin-top: 16px; border: 1px solid var(--line); border-radius: 8px; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { background: rgba(255,255,255,0.02); padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--muted); border-bottom: 1px solid var(--line); }
td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13.5px; }
tr:hover td { background: rgba(255,255,255,0.01); }

/* ── UTILS ── */
code, pre { background: rgba(0,0,0,0.3); border: 1px solid var(--line); border-radius: 6px; padding: 2px 6px; color: var(--accent); font-family: monospace; font-size: 12px; }
.banner { padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; font-weight: 500; }
.banner.success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #a7f3d0; }
.banner.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fecaca; }

/* Moderation / Cards */
.mod-card, .card { background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.mod-head, .card-head { display: flex; justify-content: space-between; margin-bottom: 12px; }
.mod-title { font-weight: 600; color: var(--text); }
.badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.badge.pending { background: rgba(245,158,11,0.15); color: #fcd34d; }
.badge.approved { background: rgba(16,185,129,0.15); color: #a7f3d0; }
.badge.rejected { background: rgba(239,68,68,0.15); color: #fecaca; }

/* Push Stats */
.push-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 24px; }
.push-stat-card { background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 10px; padding: 16px; text-align: center; }
.push-stat-val { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.push-stat-lbl { font-size: 12px; color: var(--muted); }
</style>"""

# Using regex to find the old style block:
# It starts at: <style>\n    .wrap{max-width:none;
# And ends at the first </style> after that.
pattern = re.compile(r'<style>\s*\.wrap\{max-width:none;.*?</style>', re.DOTALL)
new_html = pattern.sub(new_css, html, count=1)

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("CSS updated successfully.")
