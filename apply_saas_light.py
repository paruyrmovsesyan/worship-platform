import os, re

TARGETS = ['admin_updates.php', 'songs.php']

SAAS_LIGHT_CSS = '''
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
  --accent: #f97316 !important;
  
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
  margin: 0 !important;
  padding: 0 !important;
}

/* ── MAIN SAAS LAYOUT ── */
.saas-layout {
  display: flex !important;
  height: 100vh !important;
  overflow: hidden !important;
  background: var(--bg) !important;
  width: 100% !important;
}
.saas-sidebar {
  width: 260px !important;
  background: #ffffff !important;
  border-right: 1px solid var(--line) !important;
  display: flex !important;
  flex-direction: column !important;
  flex-shrink: 0 !important;
  overflow-y: auto !important;
}
.saas-sidebar .brand {
  padding: 20px 24px !important;
  border-bottom: 1px solid var(--line-soft) !important;
  margin-bottom: 16px !important;
}
.saas-sidebar-nav, .sidebar-nav-container {
  display: flex !important;
  flex-direction: column !important;
  padding: 0 16px !important;
  gap: 4px !important;
}
.saas-main {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
.saas-topbar {
  height: 64px !important;
  background: #ffffff !important;
  border-bottom: 1px solid var(--line) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 24px !important;
  flex-shrink: 0 !important;
}
.saas-content {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 24px 32px !important;
}
.saas-page-header {
  margin-bottom: 24px !important;
}

/* Hide old wrappers that might interfere */
.shell { padding: 0 !important; max-width: none !important; }
.dashboard { display: block !important; }
.content-shell { padding: 0 !important; }

/* ── PANELS & CARDS ── */
.hero, .panel, .card, .device-card, .history-item, .permission-card, .stat-card, 
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

/* Remove decorative pseudo-elements from dark mode */
.hero::after, .panel::before, .history-item::before, .history-item::after,
.device-card::before, .permission-card::before, #adminPageLoaderRail::after {
  display: none !important;
}

/* ── NAVIGATION & TABS ── */
/* Sidebar Links */
.nav-item, .btn-secondary {
  color: var(--muted) !important;
  border: none !important;
  background: transparent !important;
  font-weight: 500 !important;
  padding: 10px 14px !important;
  text-align: left !important;
  border-radius: var(--radius-sm) !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  text-decoration: none !important;
}
.nav-item:hover, .btn-secondary:hover {
  background: #f1f5f9 !important;
  color: var(--text) !important;
}
.nav-item.active, .saas-sidebar-nav .active {
  background: #ffedd5 !important; /* light orange */
  color: var(--primary) !important;
  font-weight: 600 !important;
}

/* Horizontal Tabs (Workspace / Settings sections) */
.workspace-tabs, .section-switcher {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid var(--line) !important;
  border-radius: 0 !important;
  padding: 0 !important;
  gap: 20px !important;
  display: flex !important;
  margin-bottom: 24px !important;
  width: 100% !important;
}
.workspace-tab, .section-tab {
  background: transparent !important;
  border: none !important;
  border-bottom: 3px solid transparent !important;
  border-radius: 0 !important;
  color: var(--muted) !important;
  font-weight: 600 !important;
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
  color: var(--text) !important;
  border-bottom-color: var(--primary) !important;
  box-shadow: none !important;
}
.section-tab span { font-size: 15px !important; color: inherit !important; }
.section-tab small { display: none !important; } /* Hide descriptions in tabs to match screenshot */

/* ── BUTTONS ── */
.btn, .history-btn {
  background: #ffffff !important;
  border: 1px solid var(--line) !important;
  color: var(--text) !important;
  font-weight: 600 !important;
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
  box-shadow: 0 1px 3px rgba(249, 115, 22, 0.4) !important;
}
.btn-primary:hover {
  background: var(--primary-2) !important;
  border-color: var(--primary-2) !important;
}

/* ── TABLES ── */
.table-shell {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}
th {
  background: transparent !important;
  color: var(--muted) !important;
  font-weight: 600 !important;
  border-bottom: 2px solid var(--line) !important;
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
.pill.success, .mini-pill.status-pill.has-lyrics, .chip.success, .release-check[data-state="done"] .release-check-badge {
  color: var(--success) !important;
  border-color: var(--success) !important;
  background: #ffffff !important;
}
.pill.warning, .mini-pill.status-pill.no-lyrics, .chip.warning, .release-check[data-state="warn"] .release-check-badge {
  color: var(--warning) !important;
  border-color: var(--warning) !important;
  background: #ffffff !important;
}

/* Hide parts of old structure */
.topbar { display: none !important; }
.shell > .topbar { display: none !important; }

/* Dashboard Loader Override */
#adminPageLoader { background: #f4f6f8 !important; }
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
    
    # We want to append our CSS override just before the LAST </style> tag in the file
    if '</style>' in content:
        # rsplit with maxsplit=1 replaces only the last occurrence
        parts = content.rsplit('</style>', 1)
        updated = parts[0] + SAAS_LIGHT_CSS + parts[1]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(f"✅ Injected SaaS Light CSS overrides into {filename}")
    else:
        print(f"⚠️ No <style> tag found in {filename}")
