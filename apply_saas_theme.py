import os, re

TARGETS = ['admin_updates.php', 'songs.php']

SAAS_CSS = '''
/* ==============================================================
   SAAS LIGHT THEME (OVERRIDES)
   Keeps original logic and structure, but restyles to clean light mode
   ============================================================== */
:root {
  --bg: #f4f6f8 !important;
  --panel: #ffffff !important;
  --panel-2: #ffffff !important;
  --panel-soft: #f8fafc !important;
  --line: #e2e8f0 !important;
  --line-soft: #f1f5f9 !important;
  --text: #1e293b !important;
  --muted: #64748b !important;
  
  --primary: #f97316 !important;
  --primary-2: #ea580c !important;
  --danger: #ef4444 !important;
  --warning: #f59e0b !important;
  --success: #10b981 !important;
  
  --shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03) !important;
  --radius-xl: 12px !important;
  --radius-lg: 10px !important;
  --radius-md: 8px !important;
  --radius-sm: 6px !important;
  --radius: 10px !important;
}

body {
  background: var(--bg) !important;
  color: var(--text) !important;
}

.shell, .wrap {
  max-width: 96% !important; 
}

.topbar, .panel, .card, .device-card, .history-item, .permission-card, .stat-card, 
.workspace-note, .action-panel, .release-summary-card, .release-checklist,
.push-preview, .access-card, .panel-embed, .table-shell, .gate {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  box-shadow: var(--shadow) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  color: var(--text) !important;
  border-radius: var(--radius-md) !important;
}

.hero::after, .panel::before, .history-item::before, .history-item::after,
.device-card::before, .permission-card::before, #adminPageLoaderRail::after {
  display: none !important;
}
.hero {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  box-shadow: var(--shadow) !important;
}

.workspace-tabs, .section-switcher {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid var(--line) !important;
  border-radius: 0 !important;
  padding: 0 !important;
  gap: 32px !important;
  display: flex !important;
  box-shadow: none !important;
  margin-bottom: 24px !important;
}
.workspace-tab, .section-tab {
  background: transparent !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  color: var(--muted) !important;
  font-weight: 500 !important;
  padding: 12px 4px !important;
  box-shadow: none !important;
  min-height: auto !important;
}
.workspace-tab:hover, .section-tab:hover {
  background: transparent !important;
  color: var(--text) !important;
}
.workspace-tab.is-active, .section-tab.active {
  background: transparent !important;
  color: #1e293b !important;
  border-bottom-color: var(--primary) !important;
  box-shadow: none !important;
  font-weight: 600 !important;
}
.section-tab span { font-size: 14px !important; color: inherit !important; font-weight: inherit !important; }
.section-tab small { display: none !important; }

.btn, .history-btn {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  color: var(--text) !important;
  font-weight: 500 !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
  border-radius: var(--radius-sm) !important;
}
.btn:hover, .history-btn:hover {
  background: #f8fafc !important;
}
.btn-primary {
  background: var(--primary) !important;
  color: #ffffff !important;
  border-color: var(--primary) !important;
  box-shadow: 0 1px 3px rgba(249, 115, 22, 0.3) !important;
}
.btn-primary:hover {
  background: var(--primary-2) !important;
  border-color: var(--primary-2) !important;
}
.btn-success { background: #ffffff !important; color: var(--success) !important; border-color: #6ee7b7 !important; }
.btn-success:hover { background: #ecfdf5 !important; }
.btn-danger { background: #ffffff !important; color: var(--danger) !important; border-color: #fca5a5 !important; }
.btn-danger:hover { background: #fef2f2 !important; }

input, textarea, select {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  color: var(--text) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;
}
input:focus, textarea:focus, select:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2) !important;
  outline: none !important;
}

.table-shell {
  border: 1px solid var(--line) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: none !important;
  background: #ffffff !important;
}
th {
  background: #f8fafc !important;
  color: var(--muted) !important;
  font-weight: 600 !important;
  border-bottom: 1px solid var(--line) !important;
  text-transform: capitalize !important;
  box-shadow: none !important;
}
td {
  border-bottom: 1px solid var(--line) !important;
  color: var(--text) !important;
  vertical-align: middle !important;
}
tbody tr:hover {
  background: #f8fafc !important;
}

.pill, .mini-pill, .chip {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  color: var(--muted) !important;
  border-radius: 4px !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  padding: 4px 8px !important;
  text-transform: uppercase !important;
}
.pill.success, .mini-pill.status-pill.has-lyrics, .chip.success {
  color: var(--success) !important;
  border-color: var(--success) !important;
  background: #ffffff !important;
}
.pill.warning, .mini-pill.status-pill.no-lyrics, .chip.warning {
  color: var(--warning) !important;
  border-color: var(--warning) !important;
  background: #ffffff !important;
}

h1, h2, h3, h4, h5, strong { color: #0f172a !important; }
p, span, label, .hint { color: var(--muted) !important; }
.song-title strong { color: var(--text) !important; }

#adminPageLoader { background: var(--bg) !important; }
#adminPageLoaderCard { background: #ffffff !important; border-color: var(--line) !important; box-shadow: var(--shadow) !important; }
#adminPageLoaderTitle { color: var(--text) !important; }
#adminPageLoaderText { color: var(--muted) !important; }
#adminPageLoaderRail { background: var(--line) !important; }
#adminPageLoaderRail::after { display: block !important; background: var(--primary) !important; }
</style>
'''

base_dir = os.path.abspath(os.path.dirname(__file__))
for filename in TARGETS:
    path = os.path.join(base_dir, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '</style>' in content:
        parts = content.rsplit('</style>', 1)
        updated = parts[0] + SAAS_CSS + parts[1]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(f"✅ Applied SaaS Theme to {filename}")
