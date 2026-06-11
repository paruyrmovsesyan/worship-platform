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

/* ── GLOBAL UI KIT (Settings Forms) ── */
.settings-group {
  background: var(--surface);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  margin-bottom: 24px;
  border: 1px solid #f1f5f9;
}
.settings-group-header {
  margin-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 16px;
}
.settings-group-header h3 {
  font-size: 18px; font-weight: 800; color: var(--text); margin: 0 0 4px; letter-spacing: -0.3px;
}
.settings-group-header p {
  font-size: 14px; color: var(--muted); margin: 0; line-height: 1.5;
}

.form-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.form-field:last-child { margin-bottom: 0; }
.form-field label { font-size: 14px; font-weight: 700; color: var(--text); }
.form-field p.help-text { font-size: 13px; color: var(--muted); margin: -4px 0 8px 0; }

.input-field {
  padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px;
  font-family: inherit; font-size: 15px; color: var(--text);
  background: #f8fafc; outline: none; transition: all .2s;
  width: 100%; box-sizing: border-box;
}
.input-field:focus {
  border-color: var(--primary); background: #fff;
  box-shadow: 0 0 0 4px rgba(67, 24, 255, 0.1);
}
textarea.input-field { min-height: 120px; resize: vertical; line-height: 1.5; }

/* ── TOGGLE SWITCH (iOS Style) ── */
.toggle-switch-wrapper {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: #f8fafc; border-radius: 16px;
  border: 1px solid #e2e8f0; margin-bottom: 20px;
}
.toggle-switch-info h4 { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: var(--text); }
.toggle-switch-info p { margin: 0; font-size: 13px; color: var(--muted); }

.toggle-switch {
  position: relative; display: inline-block; width: 50px; height: 28px; flex-shrink: 0;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background-color: #cbd5e1; transition: .3s; border-radius: 34px;
}
.toggle-slider:before {
  position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px;
  background-color: white; transition: .3s; border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.toggle-switch input:checked + .toggle-slider { background-color: var(--success); }
.toggle-switch input:focus + .toggle-slider { box-shadow: 0 0 1px var(--success); }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }

/* ── DATA TABLES ── */
.data-table-container {
  overflow-x: auto; border-radius: 16px; border: 1px solid #e2e8f0;
  background: #fff; margin-bottom: 20px;
}
.data-table {
  width: 100%; border-collapse: collapse; font-size: 14px;
}
.data-table th {
  text-align: left; padding: 16px 20px; font-weight: 700; color: var(--muted);
  background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;
  font-size: 12px; letter-spacing: 0.5px;
}
.data-table td {
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9; color: var(--text);
  vertical-align: middle;
}
.data-table tbody tr:hover td { background: #f8fafc; }
.data-table tbody tr:last-child td { border-bottom: none; }

/* Sticky Save Bar */
.sticky-actions {
  position: sticky; bottom: 24px; z-index: 100;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px);
  padding: 16px 24px; border-radius: 20px; border: 1px solid #e2e8f0;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1); display: flex; justify-content: flex-end;
  gap: 12px; align-items: center;
}

</style>
