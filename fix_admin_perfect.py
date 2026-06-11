import os, re

TARGETS = ['admin_updates.php', 'songs.php']

CLEAN_CSS_OVERRIDE = '''
/* ==============================================================
   CLEAN STANDARD DARK MODE OVERRIDES
   Forces removal of gradients, glassmorphism, and neon colors
   ============================================================== */
:root {
  --bg: #121212 !important;
  --bg-soft: #1e1e1e !important;
  --panel: #1e1e1e !important;
  --panel-2: #1e1e1e !important;
  --panel-soft: #252525 !important;
  --line: #333333 !important;
  --line-soft: #222222 !important;
  --text: #e9ecef !important;
  --muted: #adb5bd !important;
  --primary: #0d6efd !important;
  --primary-2: #0b5ed7 !important;
  --accent: #0d6efd !important;
  --danger: #dc3545 !important;
  --warning: #ffc107 !important;
  --success: #198754 !important;
  --shadow: none !important;
  --radius-xl: 8px !important;
  --radius-lg: 8px !important;
  --radius-md: 6px !important;
  --radius-sm: 4px !important;
  --radius: 8px !important;
}

body {
  background: var(--bg) !important;
}

/* Strip backgrounds & shadows from major containers */
.hero, .panel, .card, .device-card, .history-item, .permission-card, .stat-card, .topbar,
.sidebar, .workspace-note, .action-panel, .release-summary-card, .release-checklist,
.push-preview, .access-card, .panel-embed, .table-shell, .gate {
  background: var(--panel) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-color: var(--line) !important;
}

/* Pseudo-elements used for glowing borders and gradients */
.hero::after, .panel::before, .history-item::before, .history-item::after,
.device-card::before, .permission-card::before, #adminPageLoaderRail::after {
  display: none !important;
}

/* Button normalizations */
.btn, .history-btn, .workspace-tab, .section-tab, .nav-item {
  box-shadow: none !important;
  background: transparent !important;
  border: 1px solid var(--line) !important;
  border-radius: var(--radius-sm) !important;
}
.btn:hover, .history-btn:hover, .workspace-tab:hover, .section-tab:hover {
  background: rgba(255,255,255,0.05) !important;
}

.btn-primary, .workspace-tab.is-active, .section-tab.active, .nav-item.active {
  background: var(--primary) !important;
  color: #fff !important;
  border-color: var(--primary) !important;
}
.btn-primary:hover {
  background: var(--primary-2) !important;
}
.btn-danger {
  background: var(--danger) !important;
  color: #fff !important;
}
.btn-success {
  background: var(--success) !important;
  color: #fff !important;
}

/* Inputs */
input, textarea, select {
  background: #121212 !important;
  border-color: var(--line) !important;
  box-shadow: none !important;
  border-radius: var(--radius-sm) !important;
}
input:focus, textarea:focus, select:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 2px rgba(13,110,253,0.25) !important;
}

/* Misc overrides */
.stat-card { background: var(--panel) !important; }
.quick-strip, .device-toolbar, .history-toolbar { background: var(--panel-soft) !important; border-color: var(--line) !important; }
th { background: var(--panel-soft) !important; }

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
        updated = parts[0] + CLEAN_CSS_OVERRIDE + parts[1]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(f"✅ Injected CSS overrides into {filename}")
    else:
        print(f"⚠️ No <style> tag found in {filename}")
