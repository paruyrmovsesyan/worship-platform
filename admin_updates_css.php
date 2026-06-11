<?php
/**
 * admin_updates_css.php — Specific CSS for the Settings (admin_updates) page
 * Adapts the old dark-theme structural classes to the new Light Theme.
 */
?>
<style>
/* ── SETTINGS LAYOUT & PANELS ── */
.layout { display: flex; flex-direction: column; gap: 24px; }
.stack { display: flex; flex-direction: column; gap: 20px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.row-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }

.panel {
  position: relative; overflow: hidden; background: var(--surface);
  border: 1px solid var(--line); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm); padding: 28px 32px; margin-bottom: 24px;
}
.panel h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.panel p { margin: 0 0 24px; color: var(--muted); font-size: 14px; line-height: 1.5; font-weight: 500; }
.panel.full { grid-column: 1 / -1; }

/* Hidden state for JavaScript section toggling */
[data-section-container][hidden],
.panel[hidden] {
  display: none !important;
}


/* ── SETTINGS DASHBOARD LAYOUT ── */
.settings-dashboard {
  margin-bottom: 32px;
}
.section-switcher.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
@media (max-width: 600px) {
  .section-switcher.grid-view { grid-template-columns: 1fr; }
}

.section-switcher.grid-view .section-tab {
  display: flex; align-items: flex-start; justify-content: flex-start; gap: 16px;
  padding: 24px; border-radius: 20px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); cursor: pointer; text-align: left;
  transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-sm);
}
.section-switcher.grid-view .section-tab:hover {
  transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06);
  border-color: #cbd5e1;
}
.section-switcher.grid-view .section-tab.active {
  /* Should not be active in grid view normally, but just in case */
  border-color: var(--primary);
}

.section-tab .icon {
  width: 28px; height: 28px; flex-shrink: 0; stroke: var(--primary);
  background: rgba(67, 24, 255, 0.08); padding: 8px; border-radius: 12px;
  box-sizing: content-box;
}
.section-tab .tab-text {
  display: flex; flex-direction: column; gap: 6px;
}
.section-tab span { display: block; font-size: 16px; font-weight: 800; margin: 0; letter-spacing: -0.2px; color: var(--text); }
.section-tab small { display: block; font-size: 13px; font-weight: 500; opacity: 0.8; line-height: 1.5; color: var(--muted); }

/* Back Button Area */
.section-back-nav { margin-bottom: 24px; display: flex; align-items: center; }
#btnBackToDashboard {
  background: transparent; border: none; box-shadow: none; padding: 0;
  color: var(--muted); font-size: 15px; font-weight: 700;
}
#btnBackToDashboard:hover { color: var(--primary); background: transparent; transform: translateX(-4px); }

/* ── FORM ELEMENTS ── */
.field { display: flex; flex-direction: column; gap: 8px; }
.field label, label { font-size: 13px; font-weight: 700; color: var(--text); }
.field input, .field textarea, .field select, input, select, textarea {
  width: 100%; border-radius: 12px; border: 1px solid var(--line); background: #f8faff;
  color: var(--text); padding: 12px 16px; outline: none; font: inherit; font-size: 14px;
  font-weight: 500; transition: border-color .15s, box-shadow .15s, background .15s;
}
.field input:focus, .field textarea:focus, .field select:focus, input:focus, select:focus, textarea:focus {
  border-color: var(--primary); background: #fff;
  box-shadow: 0 0 0 3px rgba(67, 24, 255, 0.1);
}
textarea { min-height: 120px; resize: vertical; line-height: 1.5; }

/* ── BUTTONS ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 10px 20px; border-radius: 12px; border: 1px solid var(--line);
  color: var(--text); text-decoration: none; background: var(--surface);
  font-weight: 700; font-size: 14px; cursor: pointer;
  transition: transform .15s, background .15s, box-shadow .15s, border-color .15s;
}
.btn:hover { background: #f8faff; border-color: #cbd5e1; transform: translateY(-1px); }
.btn-primary {
  background: var(--primary); border-color: var(--primary); color: #fff;
  box-shadow: 0 4px 15px rgba(67, 24, 255, 0.2);
}
.btn-primary:hover {
  background: var(--primary-hover); border-color: var(--primary-hover);
  box-shadow: 0 6px 20px rgba(67, 24, 255, 0.3); color: #fff;
}
.actions {
  display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
  padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--line);
  background: #f8faff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
  margin-top: 24px;
}
.actions .btn { flex: 1 1 180px; }

/* ── SWITCHES (Toggles) ── */
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 16px 0; }
.switch-copy { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.switch-copy strong { font-size: 15px; font-weight: 700; color: var(--text); }
.switch-copy span { font-size: 13px; font-weight: 500; color: var(--muted); }

.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.slider {
  position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1;
  transition: .3s; border-radius: 24px;
}
.slider:before {
  position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
  background-color: white; transition: .3s; border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.switch input:checked + .slider { background-color: var(--success); }
.switch input:focus + .slider { box-shadow: 0 0 0 3px rgba(5, 205, 153, 0.2); }
.switch input:checked + .slider:before { transform: translateX(20px); }

/* ── BANNERS & CHIPS ── */
.banner { margin-bottom: 24px; padding: 16px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; border: 1px solid var(--line); }
.banner.success { background: var(--success-bg); color: #048c68; border-color: rgba(5,205,153,0.3); }
.banner.error { background: var(--danger-bg); color: #c4291c; border-color: rgba(238,93,80,0.3); }

.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.autosave-status {
  display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700; background: #f8faff; color: var(--muted);
  border: 1px solid var(--line);
}
.autosave-status[data-state="saving"] { background: var(--warning-bg); color: #b58b00; border-color: #ffe699; }
.autosave-status[data-state="saved"] { background: var(--success-bg); color: #048c68; border-color: #b3efdd; }
.autosave-status[data-state="error"] { background: var(--danger-bg); color: #c4291c; border-color: #fac2be; }

/* ── CUSTOM GRIDS ── */
.package-mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
.package-mode-card {
  padding: 16px 20px; border-radius: 16px; border: 1px solid var(--line);
  background: #f8faff; display: flex; flex-direction: column; gap: 6px;
}
.package-mode-card strong { font-size: 14px; font-weight: 700; color: var(--text); }
.package-mode-card span { font-size: 13px; font-weight: 500; color: var(--muted); line-height: 1.5; }

.page-app-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 20px; }
.page-app-card {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 16px 20px; border-radius: 16px; border: 1px solid var(--line);
  background: var(--surface); box-shadow: 0 2px 8px rgba(0,0,0,0.02); cursor: pointer;
  transition: transform .15s, border-color .15s;
}
.page-app-card:hover { border-color: #cbd5e1; transform: translateY(-1px); }
.page-app-copy { display: flex; flex-direction: column; gap: 4px; }
.page-app-copy strong { font-size: 14px; font-weight: 700; color: var(--text); }
.page-app-copy span { font-size: 12px; font-weight: 500; color: var(--muted); line-height: 1.4; }
.page-app-copy code { font-family: monospace; font-size: 11px; color: var(--primary); background: rgba(67,24,255,0.08); padding: 2px 6px; border-radius: 6px; align-self: flex-start; margin-top: 4px; }

.danger-note, .access-helper {
  margin-top: 16px; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; line-height: 1.5;
}
.danger-note { background: var(--danger-bg); color: #c4291c; border: 1px solid rgba(238,93,80,0.3); }
.access-helper { background: #f8faff; color: var(--muted); border: 1px solid var(--line); }

/* Overrides for specific missing layout elements */
.action-panel { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; }
.device-card { display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 16px; border: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow-sm); }
.device-header { display: flex; justify-content: space-between; align-items: flex-start; }
.device-title { font-weight: 700; font-size: 15px; color: var(--text); }
.device-meta { font-size: 12px; font-weight: 500; color: var(--muted); }
.device-pill { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f8faff; color: var(--text); }

@media (max-width: 900px) {
  .grid, .row-2, .package-mode-grid { grid-template-columns: 1fr; }
}
</style>
