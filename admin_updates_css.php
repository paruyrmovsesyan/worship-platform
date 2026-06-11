<?php
/**
 * admin_updates_css.php — Specific CSS for the Settings (admin_updates) page
 * Complete redesign with premium UI kit.
 */
?>
<style>
/* ── LAYOUT ── */
.layout { display: flex; flex-direction: column; gap: 24px; }
.stack { display: flex; flex-direction: column; gap: 20px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.row-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }

/* ── LEGACY PANEL ── */
.panel { position: relative; overflow: hidden; background: #fff; border: 1.5px solid #f0f4ff; border-radius: 20px; box-shadow: 0 2px 12px rgba(67,24,255,0.04); padding: 28px 32px; margin-bottom: 20px; }
.panel h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.panel p { margin: 0 0 24px; color: var(--muted); font-size: 14px; line-height: 1.5; font-weight: 500; }
.panel.full { grid-column: 1 / -1; }
[data-section-container][hidden], .panel[hidden] { display: none !important; }

/* ── DASHBOARD ── */
.settings-dashboard { margin-bottom: 32px; }
.section-switcher.grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
@media (max-width: 600px) { .section-switcher.grid-view { grid-template-columns: 1fr; } }
.section-switcher.grid-view .section-tab {
  display: flex; align-items: flex-start; gap: 16px; padding: 22px 20px;
  border-radius: 20px; border: 1.5px solid #eef2f8; background: #fff; color: var(--text);
  cursor: pointer; text-align: left; transition: all .22s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 2px 12px rgba(67,24,255,0.04);
}
.section-switcher.grid-view .section-tab:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(67,24,255,0.12); border-color: var(--primary); }
.section-tab .icon { width: 24px; height: 24px; flex-shrink: 0; stroke: var(--primary); background: linear-gradient(135deg, rgba(67,24,255,0.10), rgba(67,24,255,0.05)); padding: 10px; border-radius: 14px; box-sizing: content-box; }
.section-tab .tab-text { display: flex; flex-direction: column; gap: 5px; }
.section-tab span { display: block; font-size: 15px; font-weight: 800; letter-spacing: -0.2px; color: var(--text); }
.section-tab small { display: block; font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--muted); }

/* ── BACK BUTTON ── */
.section-back-nav { margin-bottom: 28px; display: flex; align-items: center; }
#btnBackToDashboard { background: #f1f5f9; border: none; box-shadow: none; padding: 10px 16px; color: var(--muted); font-size: 14px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; gap: 8px; transition: all .2s; }
#btnBackToDashboard:hover { color: var(--primary); background: rgba(67,24,255,0.08); transform: translateX(-4px); }

/* ── SETTINGS GROUP CARD (NEW) ── */
.settings-group { background: #fff; border-radius: 20px; border: 1.5px solid #f0f4ff; box-shadow: 0 2px 16px rgba(67,24,255,0.04); margin-bottom: 20px; overflow: hidden; }
.settings-group-header { padding: 24px 28px 20px; border-bottom: 1px solid #f3f4f8; background: linear-gradient(to bottom, #fafbff, #fff); }
.settings-group-header h3 { font-size: 17px; font-weight: 800; color: var(--text); margin: 0 0 4px; letter-spacing: -0.3px; }
.settings-group-header p { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.6; }
.settings-group > *:not(.settings-group-header) { padding-left: 28px; padding-right: 28px; }
.settings-group > *:last-child { padding-bottom: 24px; }
.settings-group > .settings-group-header + * { padding-top: 20px; }

/* ── FORM FIELDS ── */
.form-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }
.form-field:last-child { margin-bottom: 0; }
.form-field label { font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: 0.1px; }
.form-field p.help-text { font-size: 12px; color: var(--muted); margin: -2px 0 6px; line-height: 1.5; }
.field { display: flex; flex-direction: column; gap: 8px; }

/* ── INPUTS ── */
.input-field,
.field input:not([type=checkbox]):not([type=radio]):not([type=file]),
.field select,
.field textarea,
input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not(.section-tab *),
select,
textarea {
  padding: 13px 16px; border: 1.5px solid #e8edf5; border-radius: 12px;
  font-family: inherit; font-size: 14px; color: var(--text);
  background: #f9faff; outline: none; transition: all .2s;
  width: 100%; box-sizing: border-box; font-weight: 500;
}
.input-field:focus, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):focus, select:focus, textarea:focus {
  border-color: var(--primary); background: #fff;
  box-shadow: 0 0 0 4px rgba(67,24,255,0.08);
}
textarea { min-height: 110px; resize: vertical; line-height: 1.5; }
label { font-size: 13px; font-weight: 700; color: var(--text); }

/* ── TOGGLE SWITCH (iOS) ── */
.toggle-switch-wrapper { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: linear-gradient(135deg, #f8faff, #f4f7ff); border-radius: 16px; border: 1.5px solid #eef2ff; margin-bottom: 14px; }
.toggle-switch-info h4 { margin: 0 0 3px; font-size: 14px; font-weight: 800; color: var(--text); }
.toggle-switch-info p { margin: 0; font-size: 12px; color: var(--muted); line-height: 1.4; }
.toggle-switch { position: relative; display: inline-block; width: 52px; height: 30px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #dce4f0; transition: .3s; border-radius: 34px; }
.toggle-slider:before { position: absolute; content: ""; height: 22px; width: 22px; left: 4px; bottom: 4px; background: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.toggle-switch input:checked + .toggle-slider { background: linear-gradient(135deg, #05CD99, #00b07a); }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }

/* ── LEGACY SWITCH-ROW ── */
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 12px 0; padding: 14px 18px; background: #f8faff; border-radius: 14px; border: 1.5px solid #eef2f8; }
.switch-copy { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.switch-copy strong { font-size: 14px; font-weight: 700; color: var(--text); }
.switch-copy span { font-size: 12px; font-weight: 500; color: var(--muted); }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #dce4f0; transition: .3s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.switch input:checked + .slider { background: linear-gradient(135deg, #05CD99, #00b07a); }
.switch input:checked + .slider:before { transform: translateX(20px); }

/* ── BUTTONS ── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 10px 18px; border-radius: 12px; border: 1.5px solid #e0e6f0; color: var(--text); text-decoration: none; background: #fff; font-weight: 700; font-size: 13px; cursor: pointer; transition: all .18s; }
.btn:hover { background: #f4f7ff; border-color: #c5d0e8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.btn-primary { background: linear-gradient(135deg, #4318FF, #6340FF); border-color: transparent; color: #fff; box-shadow: 0 4px 16px rgba(67,24,255,0.25); }
.btn-primary:hover { background: linear-gradient(135deg, #3510e0, #5535ef); box-shadow: 0 6px 22px rgba(67,24,255,0.35); color: #fff; }
.btn-wide { grid-column: 1 / -1; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding: 18px 24px; border-radius: 16px; border: 1px solid #eef2f8; background: #f8faff; margin-top: 20px; }
.actions .btn { flex: 1 1 180px; }

/* ── BANNERS ── */
.banner { margin-bottom: 20px; padding: 14px 18px; border-radius: 14px; font-weight: 600; font-size: 14px; border: 1px solid; }
.banner.success { background: #edfaf5; color: #048c68; border-color: rgba(5,205,153,0.25); }
.banner.error { background: #fef2f1; color: #c4291c; border-color: rgba(238,93,80,0.25); }

/* ── CHIPS ── */
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.chip { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: var(--muted); border: 1px solid #e2e8f0; }
.chip.success { background: #edfaf5; color: #048c68; border-color: rgba(5,205,153,0.25); }
.chip.warning { background: #fff8e6; color: #b58b00; border-color: #ffe082; }
.autosave-status { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f8f9ff; color: var(--muted); border: 1px solid #e8edf5; }
.autosave-status[data-state="saving"] { background: #fff8e6; color: #b58b00; border-color: #ffe699; }
.autosave-status[data-state="saved"] { background: #edfaf5; color: #048c68; border-color: #b3efdd; }
.autosave-status[data-state="error"] { background: #fef2f1; color: #c4291c; border-color: #fac2be; }

/* ── STAT CARDS ── */
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat { background: #fff; border-radius: 18px; border: 1.5px solid #f0f4ff; padding: 20px 22px; box-shadow: 0 2px 12px rgba(67,24,255,0.04); transition: all .2s; }
.stat:hover { box-shadow: 0 6px 24px rgba(67,24,255,0.08); transform: translateY(-2px); }

/* ── QUICK ACTIONS ── */
.quick-stack { display: flex; flex-direction: column; gap: 16px; }
.quick-strip { background: linear-gradient(135deg, #f8faff, #f4f7ff); border-radius: 18px; border: 1.5px solid #eef2ff; padding: 20px 22px; }
.quick-strip-head { margin-bottom: 14px; }
.quick-strip-head strong { display: block; font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
.quick-strip-head span { font-size: 12px; color: var(--muted); }
.quick-actions-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.quick-actions-grid .btn { flex: 0 0 auto; font-size: 12px; padding: 8px 14px; min-height: 36px; border-radius: 10px; }

/* ── PACKAGE ── */
.package-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.package-mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 18px 0; }
.package-mode-card { padding: 16px 18px; border-radius: 16px; border: 1.5px solid #eef2ff; background: linear-gradient(135deg, #f8faff, #f4f7ff); display: flex; flex-direction: column; gap: 6px; }
.package-mode-card strong { font-size: 13px; font-weight: 800; color: var(--text); }
.package-mode-card span { font-size: 12px; color: var(--muted); line-height: 1.5; }
.package-helper { margin-top: 12px; font-size: 13px; color: var(--muted); }

/* ── PAGE APP GRID ── */
.page-app-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.page-app-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-radius: 14px; border: 1.5px solid #eef2f8; background: #fff; cursor: pointer; transition: all .15s; }
.page-app-card:hover { border-color: #c5d0e8; background: #f8faff; }
.page-app-copy { display: flex; flex-direction: column; gap: 3px; }
.page-app-copy strong { font-size: 13px; font-weight: 800; color: var(--text); }
.page-app-copy span { font-size: 12px; color: var(--muted); }
.page-app-copy code { font-family: monospace; font-size: 11px; color: var(--primary); background: rgba(67,24,255,0.07); padding: 2px 6px; border-radius: 6px; align-self: flex-start; margin-top: 3px; }

/* ── RELEASE WORKSPACE ── */
.release-workspace { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
.release-summary-grid { display: flex; flex-direction: column; gap: 12px; }
.release-summary-card { padding: 18px 20px; border-radius: 16px; background: linear-gradient(135deg, #f8faff, #f4f7ff); border: 1.5px solid #eef2ff; display: flex; flex-direction: column; gap: 8px; }
.release-summary-card strong { font-size: 13px; font-weight: 800; color: var(--text); }
.release-summary-card span { font-size: 12px; color: var(--muted); }
.release-checklist { background: #fff; border-radius: 18px; border: 1.5px solid #eef2ff; padding: 20px 22px; height: fit-content; }
.release-checklist h3 { font-size: 15px; font-weight: 800; color: var(--text); margin: 0 0 4px; }
.release-checklist p { font-size: 12px; color: var(--muted); margin: 0 0 16px; line-height: 1.5; }
.release-checklist-list { display: flex; flex-direction: column; gap: 10px; }
.release-check { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #eef2f8; background: #fafbff; }
.release-check[data-state="done"] { border-color: rgba(5,205,153,0.3); background: #edfaf5; }
.release-check[data-state="warn"] { border-color: rgba(255,170,0,0.3); background: #fff8e6; }
.release-check-badge { width: 26px; height: 26px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.release-check[data-state="done"] .release-check-badge { background: #05CD99; }
.release-check[data-state="warn"] .release-check-badge { background: #f0a500; }
.release-check strong { display: block; font-size: 13px; font-weight: 800; color: var(--text); margin-bottom: 2px; }
.release-check span { font-size: 12px; color: var(--muted); line-height: 1.4; }

/* ── ACCESS SECTION ── */
.access-overview { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-bottom: 4px; }
.access-card { padding: 18px 20px; border-radius: 16px; border: 1.5px solid #eef2ff; background: linear-gradient(135deg, #f8faff, #fff); display: flex; flex-direction: column; gap: 8px; }
.access-card strong { font-size: 13px; font-weight: 800; color: var(--text); }
.access-card span { font-size: 12px; color: var(--muted); line-height: 1.5; }
.permission-card { background: #fff; border-radius: 16px; border: 1.5px solid #eef2f8; padding: 18px 20px; margin-bottom: 12px; }
.permission-row-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.permission-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.permission-check { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1.5px solid #eef2f8; cursor: pointer; background: #fafbff; transition: all .15s; }
.permission-check:hover { border-color: var(--primary); background: rgba(67,24,255,0.03); }
.permission-check input { margin-top: 2px; flex-shrink: 0; accent-color: var(--primary); width: auto; }
.permission-check strong { display: block; font-size: 12px; font-weight: 800; color: var(--text); }
.permission-check small { display: block; font-size: 11px; color: var(--muted); }
.permission-list { margin-top: 4px; }
.permission-status { font-size: 11px; font-weight: 700; color: var(--muted); background: #f8f9ff; padding: 5px 10px; border-radius: 20px; border: 1px solid #e8edf5; }

/* ── HISTORY / MODERATION ── */
.history-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.history-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #f8faff; border-radius: 14px; border: 1.5px solid #eef2f8; margin-bottom: 16px; flex-wrap: wrap; }
.history-toolbar-copy { font-size: 12px; color: var(--muted); font-weight: 500; }
.history-item { background: #fff; border-radius: 16px; border: 1.5px solid #eef2f8; padding: 18px 20px; margin-bottom: 10px; transition: box-shadow .15s; }
.history-item:hover { box-shadow: 0 4px 16px rgba(67,24,255,0.06); border-color: #c5d0e8; }
.history-title { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
.history-time { font-size: 12px; color: var(--muted); font-weight: 500; }
.history-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 14px; border-radius: 10px; border: 1.5px solid #e0e6f0; background: #fff; font-size: 12px; font-weight: 700; cursor: pointer; color: var(--text); transition: all .15s; }
.history-btn:hover { background: #f4f7ff; border-color: #c5d0e8; }
.history-btn.danger { border-color: rgba(238,93,80,0.3); color: #c4291c; background: #fef2f1; }
.history-btn.danger:hover { background: #fde8e7; }

/* ── DEVICES ── */
.device-list { display: flex; flex-direction: column; gap: 10px; }
.device-card { background: #fff; border-radius: 16px; border: 1.5px solid #eef2f8; padding: 18px 20px; transition: all .2s; }
.device-card:hover { box-shadow: 0 4px 20px rgba(67,24,255,0.06); border-color: #c5d0e8; }
.device-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.device-identity { display: flex; flex-direction: column; gap: 4px; }
.device-title { font-size: 14px; font-weight: 800; color: var(--text); }
.device-subtitle { font-size: 12px; color: var(--muted); }
.device-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.device-meta { font-size: 12px; color: var(--muted); font-weight: 500; }
.device-pill { display: inline-flex; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: var(--text); }

/* ── NOTES ── */
.danger-note { margin: 14px 0; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; line-height: 1.5; background: #fef2f1; color: #c4291c; border: 1.5px solid rgba(238,93,80,0.2); }
.access-helper { margin: 14px 0; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 500; line-height: 1.5; background: #f8faff; color: var(--muted); border: 1.5px solid #eef2f8; }
.note { font-size: 12px; color: var(--muted); font-style: italic; }

/* ── PANEL EMBED ── */
.panel-embed { background: #f8faff; border-radius: 16px; border: 1.5px solid #eef2ff; padding: 20px 22px; margin-top: 16px; }
.panel-embed h3 { font-size: 14px; font-weight: 800; color: var(--text); margin: 0 0 14px; }

/* ── ACTION PANEL ── */
.action-panel { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 20px; padding: 18px 22px; background: linear-gradient(135deg, #f8faff, #f4f7ff); border-radius: 16px; border: 1.5px solid #eef2ff; }
.action-copy strong { display: block; font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
.action-copy span { font-size: 12px; color: var(--muted); }
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── STICKY SAVE BAR ── */
.sticky-actions { position: sticky; bottom: 20px; z-index: 100; background: rgba(255,255,255,0.92); backdrop-filter: blur(16px); padding: 14px 22px; border-radius: 18px; border: 1.5px solid #e8edf5; box-shadow: 0 8px 32px rgba(67,24,255,0.12); display: flex; justify-content: flex-end; gap: 10px; align-items: center; margin-top: 20px; }

/* ── ACCESS UI ── */
.access-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.access-mini { display: flex; flex-direction: column; gap: 3px; }
.access-mini strong { font-size: 13px; font-weight: 800; color: var(--text); }
.access-mini span { font-size: 12px; color: var(--muted); }

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .grid, .row-2, .package-mode-grid { grid-template-columns: 1fr; }
  .release-workspace { grid-template-columns: 1fr; }
}
</style>
