import os, re

TARGETS = ['admin_updates.php', 'songs.php']

SAAS_CSS = '''
/* ==============================================================
   SAAS LIGHT MODE STRUCTURAL OVERRIDES
   Implements a clean, white/grey interface with orange accents
   ============================================================== */
:root {
  --bg: #f4f6f8 !important;
  --panel: #ffffff !important;
  --panel-2: #ffffff !important;
  --panel-soft: #f8fafc !important;
  --line: #e2e8f0 !important;
  --line-soft: #f1f5f9 !important;
  
  --text: #0f172a !important;
  --muted: #64748b !important;
  
  --primary: #f97316 !important; /* Orange accent */
  --primary-2: #ea580c !important;
  --danger: #ef4444 !important;
  --warning: #f59e0b !important;
  --success: #10b981 !important;
  
  --shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03) !important;
  --radius-md: 8px !important;
  --radius-sm: 6px !important;
}

body {
  background: var(--bg) !important;
  color: var(--text) !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important; /* Managed by layout */
}

/* ── MAIN SAAS LAYOUT ── */
.saas-layout {
  display: flex !important;
  height: 100vh !important;
  width: 100vw !important;
  overflow: hidden !important;
  background: var(--bg) !important;
}

.saas-sidebar {
  width: 280px !important;
  background: #ffffff !important;
  border-right: 1px solid var(--line) !important;
  display: flex !important;
  flex-direction: column !important;
  flex-shrink: 0 !important;
  overflow-y: auto !important;
}

.saas-brand {
  padding: 20px 24px !important;
  border-bottom: 1px solid var(--line-soft) !important;
  flex-shrink: 0 !important;
}

.saas-brand .brand {
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
}

.saas-brand .brand-badge {
  background: #fff !important;
  color: #0f172a !important;
  border: 1px solid var(--line) !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important;
  font-size: 16px !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.saas-brand .brand-copy h1 { font-size: 18px !important; color: #0f172a !important; margin: 0 !important; }
.saas-brand .brand-copy p { font-size: 12px !important; color: var(--muted) !important; margin: 2px 0 0 !important; }

.saas-sidebar-content {
  padding: 24px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  flex: 1 !important;
}

.saas-main {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.saas-topbar {
  height: 68px !important;
  background: #ffffff !important;
  border-bottom: 1px solid var(--line) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 24px !important;
  flex-shrink: 0 !important;
}

.saas-topbar .topbar-actions {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.saas-content {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 32px !important;
}

/* Hide old wrappers that might interfere */
.shell { padding: 0 !important; max-width: none !important; }
.dashboard { display: block !important; }
.content-shell { padding: 0 !important; }
.topbar { display: none !important; }
.sidebar { display: block !important; }

/* ── PANELS & CARDS ── */
.panel, .card, .device-card, .history-item, .permission-card, .stat-card, 
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

.panel-head { padding: 20px 24px 16px !important; }
.panel-body { padding: 0 24px 24px !important; }

/* Remove decorative pseudo-elements */
.hero::after, .panel::before, .history-item::before, .history-item::after,
.device-card::before, .permission-card::before, #adminPageLoaderRail::after {
  display: none !important;
}

/* ── TABS ── */
.workspace-tabs, .section-switcher {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid var(--line) !important;
  border-radius: 0 !important;
  padding: 0 !important;
  gap: 32px !important;
  display: flex !important;
  margin-bottom: 24px !important;
  width: 100% !important;
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
  color: #0f172a !important;
  border-bottom-color: var(--primary) !important;
  box-shadow: none !important;
  font-weight: 600 !important;
}

/* ── BUTTONS ── */
.btn, .history-btn {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  color: var(--text) !important;
  font-weight: 500 !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
  border-radius: var(--radius-sm) !important;
}
.btn:hover, .history-btn:hover { background: #f8fafc !important; }
.btn-primary {
  background: var(--primary) !important;
  color: #ffffff !important;
  border-color: var(--primary) !important;
  box-shadow: 0 1px 3px rgba(249, 115, 22, 0.3) !important;
}
.btn-primary:hover { background: var(--primary-2) !important; border-color: var(--primary-2) !important; }

/* ── TABLES ── */
.table-shell {
  border: 1px solid var(--line) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: none !important;
  background: transparent !important;
}
th {
  background: #ffffff !important;
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
tbody tr:hover { background: #f8fafc !important; }

/* ── STATUS PILLS ── */
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
.pill.success, .mini-pill.status-pill.has-lyrics, .chip.success { color: var(--success) !important; border-color: var(--success) !important; }
.pill.warning, .mini-pill.status-pill.no-lyrics, .chip.warning { color: var(--warning) !important; border-color: var(--warning) !important; }

/* ── SIDEBAR SECTIONS RESTYLING ── */
.sidebar .panel { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; margin-bottom: 24px !important; }
.sidebar .panel-head { padding: 0 0 12px 0 !important; border-bottom: 1px solid var(--line-soft) !important; margin-bottom: 12px !important; }
.sidebar .panel-head h3 { font-size: 13px !important; text-transform: uppercase !important; color: var(--muted) !important; font-weight: 700 !important; letter-spacing: 0.05em !important; margin: 0 !important; }
.sidebar .panel-head p { display: none !important; }
.sidebar .panel-body { padding: 0 !important; }
.sidebar-actions { display: flex !important; flex-direction: column !important; gap: 4px !important; }
.sidebar-actions .btn { border: none !important; background: transparent !important; box-shadow: none !important; justify-content: flex-start !important; padding: 10px 12px !important; color: var(--muted) !important; }
.sidebar-actions .btn:hover { background: #f1f5f9 !important; color: var(--text) !important; }
.sidebar-actions .btn-success { background: #ffedd5 !important; color: var(--primary) !important; font-weight: 600 !important; border-radius: 8px !important; }
.sidebar-actions .btn-success:hover { background: #fed7aa !important; }
.stat-card { border: none !important; background: transparent !important; padding: 8px 0 !important; border-bottom: 1px solid var(--line-soft) !important; border-radius: 0 !important; }
.stat-card strong { font-size: 18px !important; color: var(--text) !important; }
.stat-card span { font-size: 12px !important; color: var(--muted) !important; }

/* Misc */
h1, h2, h3, h4, h5, strong { color: #0f172a !important; }
p, span, label, .hint { color: var(--muted) !important; }
.song-title strong { color: var(--text) !important; }

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
        print(f"✅ Applied SaaS Struct & Theme to {filename}")
