<?php
/**
 * admin_shared_css.php — Shared CSS for all admin pages
 * Include inside a <style> tag or inline via PHP output
 */
?>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #f4f7fe;
  --surface: #ffffff;
  --line: #e2e8f0;
  --text: #111c44;
  --muted: #a3aed1;
  --primary: #3A2DFF;
  --primary-hover: #2418B5;
  --success: #05cd99;
  --success-bg: #e6f9f3;
  --warning: #ffce20;
  --warning-bg: #fff8e1;
  --danger: #ee5d50;
  --danger-bg: #ffeeeb;
  --shadow-sm: 0 1px 2px rgba(112,144,176,0.05);
  --shadow: 0 18px 40px rgba(112,144,176,0.12);
  --radius: 16px;
  --radius-lg: 24px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); }

/* ── LAYOUT ── */
.app-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
.app-sidebar {
  width: 280px; flex-shrink: 0;
  background: var(--surface);
  display: flex; flex-direction: column;
  box-shadow: 14px 17px 40px 4px rgba(112,144,176,0.08);
  overflow-y: auto; overflow-x: hidden;
  z-index: 50;
}
.app-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }

/* ── BRAND ── */
.brand { display: flex; align-items: center; gap: 14px; padding: 28px 24px 16px; flex-shrink: 0; }
.brand-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--primary); color: white;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.brand-text { font-size: 18px; font-weight: 800; color: var(--text); }

/* ── NAV MENU ── */
.nav-menu { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 8px 0 16px; }
.sidebar-heading {
  font-size: 11px; font-weight: 700; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.6px;
  padding: 16px 24px 8px;
}
.nav-item {
  display: flex; align-items: center; gap: 14px;
  padding: 13px 24px; border-radius: 12px;
  margin: 2px 16px; width: calc(100% - 32px);
  color: var(--muted); text-decoration: none;
  font-size: 15px; font-weight: 600;
  transition: background .15s, color .15s;
  border: none; background: transparent; cursor: pointer;
  font-family: inherit; text-align: left;
}
.nav-item:hover { background: rgba(67,24,255,0.05); color: var(--text); }
.nav-item.active {
  background: var(--primary); color: #fff;
  box-shadow: 0 4px 15px rgba(67,24,255,0.3);
}
.nav-item.active svg { stroke: #fff; }

/* ── LANG ── */
.lang-switcher { display: flex; gap: 6px; background: #f1f5f9; padding: 4px; border-radius: 20px; }
.lang-btn { padding: 6px 14px; border-radius: 16px; color: var(--muted); font-weight: 700; font-size: 13px; text-decoration: none; transition: .15s; }
.lang-btn.active { background: var(--text); color: #fff; }

/* ── TOPBAR ── */
.app-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 40px; flex-shrink: 0;
}
.topbar-right { display: flex; align-items: center; gap: 20px; }
.search-box { position: relative; }
.search-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.search-box input {
  padding: 11px 16px 11px 42px; border-radius: 30px;
  border: none; background: var(--surface); width: 280px;
  font-family: inherit; font-size: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04); outline: none;
  color: var(--text);
}
.topbar-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--primary); color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px;
  box-shadow: 0 4px 10px rgba(67,24,255,0.2);
  flex-shrink: 0;
}
.bell-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--surface); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  position: relative; box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}
.bell-dot {
  position: absolute; top: 10px; right: 10px;
  width: 8px; height: 8px; background: var(--danger);
  border-radius: 50%; border: 2px solid white;
}

/* ── PAGE CONTENT ── */
.app-content { padding: 0 40px 40px; }
.page-heading { margin-bottom: 32px; }
.page-heading h1 { font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
.page-heading p { font-size: 15px; color: var(--muted); margin-top: 6px; }
.page-heading-row { display: flex; justify-content: space-between; align-items: flex-start; }

/* ── STATS GRID ── */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 36px; }
.stat {
  background: var(--surface); border-radius: var(--radius-lg);
  padding: 28px; box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: 0;
}
.stat-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.stat-label { font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
.stat-value { font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -1px; }
.stat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-trend { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; }
.stat-trend.up { color: var(--success); }
.stat-trend.down { color: var(--danger); }
.stat-trend-label { color: var(--muted); font-weight: 500; }

/* ── TABLE CARD ── */
.table-card { background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
.table-card table { width: 100%; border-collapse: collapse; }
.table-card th {
  text-align: left; padding: 16px 24px;
  color: var(--muted); font-weight: 600; font-size: 12px;
  border-bottom: 1px solid var(--line); text-transform: uppercase; letter-spacing: 0.5px;
}
.table-card td { padding: 18px 24px; border-bottom: 1px solid var(--line); font-weight: 500; font-size: 14px; }
.table-card tbody tr:last-child td { border-bottom: none; }
.table-card tbody tr:hover { background: #f8faff; }

/* ── BADGES ── */
.badge {
  display: inline-flex; align-items: center;
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
}
.badge-success { background: var(--success-bg); color: var(--success); }
.badge-warning { background: var(--warning-bg); color: #b58b00; }
.badge-danger  { background: var(--danger-bg);  color: var(--danger); }
.badge-neutral { background: #f1f5f9; color: var(--muted); }

/* ── BUTTON ── */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 20px; border-radius: 12px;
  font-family: inherit; font-size: 14px; font-weight: 700;
  border: none; cursor: pointer; transition: .15s; text-decoration: none;
  background: var(--surface); color: var(--text);
  box-shadow: var(--shadow-sm);
}
.btn:hover { box-shadow: var(--shadow); }
.btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 15px rgba(67,24,255,0.3); }
.btn-primary:hover { background: var(--primary-hover); }
.btn-danger { background: var(--danger-bg); color: var(--danger); }

/* ── CARD ── */
.card { background: var(--surface); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); }

/* ── UTILS ── */
[hidden] { display: none !important; }
.text-muted { color: var(--muted); }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }

/* Global Minimal Loader */
#globalAdminLoader {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: rgba(248, 250, 252, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.4s ease, visibility 0.4s ease;
}
#globalAdminLoader.hide {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.global-pulse {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--primary);
  animation: globalPulse 1.5s ease-out infinite;
}
@keyframes globalPulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* Grid layout */
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; align-items: start; }

/* Stats Layout */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat {
  background: var(--surface); border-radius: var(--radius-lg);
  padding: 22px 22px 18px; box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; justify-content: space-between;
  border: 1.5px solid var(--line); transition: box-shadow 0.2s, transform 0.15s;
}
.stat:hover { box-shadow: 0 6px 24px rgba(112,144,176,0.14); transform: translateY(-1px); }
.stat > div:first-child { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }

/* Settings form group */
.settings-group { background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); margin-bottom: 20px; overflow: hidden; border: 1.5px solid var(--line); transition: box-shadow 0.2s; }
.settings-group:hover { box-shadow: 0 4px 20px rgba(112,144,176,0.1); }
.settings-group-header { padding: 22px 28px 18px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg, #fafbff 0%, #f7f9ff 100%); }
.settings-group-header h3 { font-size: 15px; font-weight: 800; color: var(--text); margin: 0 0 4px; letter-spacing: -0.2px; }
.settings-group-header p { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.6; }
.settings-group > *:not(.settings-group-header) { padding-left: 28px; padding-right: 28px; }
.settings-group > *:last-child { padding-bottom: 24px; }
.settings-group > .settings-group-header + * { padding-top: 20px; }

/* Form fields */
.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
.form-field label { font-size: 12px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.4px; }
.help-text { font-size: 12px; color: var(--muted); line-height: 1.5; margin: 0; }
.form-field .input-field {
  padding: 11px 14px; border: 1.5px solid var(--line); border-radius: 10px;
  font-family: inherit; font-size: 14px; font-weight: 500; color: var(--text);
  background: var(--surface); outline: none; transition: border-color .15s, box-shadow .15s; width: 100%;
}
.form-field .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(67,24,255,0.08); }
.form-field .input-field:hover:not(:focus) { border-color: #c4cfe3; }
.form-field textarea.input-field { min-height: 90px; resize: vertical; line-height: 1.6; }
.form-field select.input-field { cursor: pointer; }

/* Data Table */
.data-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; }
.data-table th, .data-table td { padding: 14px 18px; text-align: left; border-bottom: 1px solid var(--line); }
.data-table th { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.7px; background: #f8fafc; border-top: 1px solid var(--line); border-bottom: 1.5px solid var(--line); }
.data-table td { font-size: 14px; font-weight: 500; color: var(--text); vertical-align: middle; }
.data-table tbody tr { transition: background .1s; }
.data-table tbody tr:hover td { background: #f5f7ff; }
.data-table tbody tr:last-child td { border-bottom: none; }

/* Access Cards */
.access-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 20px; }
.access-card { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 10px; transition: box-shadow 0.2s, border-color 0.2s; }
.access-card:hover { box-shadow: 0 4px 16px rgba(112,144,176,0.12); border-color: #c4d0e8; }
.access-card > strong { font-size: 13px; font-weight: 800; color: var(--text); }
.access-card > span { font-size: 12px; color: var(--muted); line-height: 1.6; }

/* Device components */
.device-toolbar-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; background: #f8fafc; padding: 16px; border-radius: var(--radius); border: 1px solid var(--line); }
.history-head { margin-bottom: 20px; }
.device-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
.device-card { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: var(--shadow-sm); transition: box-shadow 0.2s; }
.device-card:hover { box-shadow: 0 4px 16px rgba(112,144,176,0.12); }
.device-header { display: flex; justify-content: space-between; align-items: flex-start; }
.device-identity { display: flex; flex-direction: column; gap: 3px; }
.device-title { font-size: 15px; font-weight: 700; color: var(--text); }
.device-subtitle { font-size: 12px; color: var(--muted); }
.device-actions { display: flex; gap: 8px; align-items: center; }
.history-time { font-size: 11px; color: var(--muted); margin-top: 2px; }
.history-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: 0.15s; }
.history-btn.danger { background: var(--danger-bg); color: var(--danger); }
.history-btn.danger:hover { background: var(--danger); color: #fff; }

/* Panel & Autosave */
.panel-embed { background: #f8fafc; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; margin-bottom: 14px; }
.autosave-status { font-size: 12px; font-weight: 600; color: var(--muted); padding: 6px 12px; border-radius: 20px; background: #f4f7fe; display: inline-flex; align-items: center; gap: 6px; transition: color 0.2s, background 0.2s; }
.autosave-status[data-state="saving"] { color: #b58b00; background: var(--warning-bg); }
.autosave-status[data-state="success"] { color: var(--success); background: var(--success-bg); }
.autosave-status[data-state="error"] { color: var(--danger); background: var(--danger-bg); }

/* History & Permissions */
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; transition: box-shadow 0.15s; }
.history-item:hover { box-shadow: 0 2px 12px rgba(112,144,176,0.1); }
.history-title { font-weight: 700; color: var(--text); font-size: 14px; }
.note { font-size: 13px; color: var(--muted); }
.danger-note { font-size: 13px; color: var(--danger); }
.permission-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.permission-card { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: border-color 0.2s; }
.permission-card:hover { border-color: var(--primary); }
.permission-row-head { font-weight: 800; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid var(--line); padding-bottom: 8px; color: var(--text); }
.permission-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); padding: 3px 0; }

/* Moderation */
.moderation-diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.moderation-diff-item { background: #f8fafc; border-radius: var(--radius); padding: 14px; border: 1px solid var(--line); }
.moderation-diff-head { font-weight: 700; font-size: 11px; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.moderation-diff-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.moderation-diff-values { display: flex; flex-direction: column; gap: 4px; font-family: monospace; font-size: 12px; }

/* Push Preview */
.push-preview { display: flex; justify-content: center; margin: 24px 0; }
.push-preview-phone { width: 300px; height: 600px; border: 8px solid #222; border-radius: 32px; overflow: hidden; position: relative; background: #000; }
.push-preview-screen { background: #fff; width: 100%; height: 100%; padding-top: 40px; }
.push-preview-banner { background: #f0f0f0; margin: 16px; padding: 12px; border-radius: 12px; display: flex; gap: 12px; }
.push-preview-app { font-weight: 600; font-size: 12px; color: var(--muted); }
.push-preview-title { font-weight: 700; font-size: 14px; margin-top: 4px; }
.push-preview-body { font-size: 13px; margin-top: 4px; color: var(--text); }

/* Release Workspace */
.release-workspace { display: flex; flex-direction: column; gap: 20px; }
.release-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.release-summary-card { background: linear-gradient(135deg, #f8faff 0%, #fff 100%); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s, box-shadow 0.2s; }
.release-summary-card:hover { border-color: rgba(67,24,255,0.25); box-shadow: 0 4px 16px rgba(67,24,255,0.06); }
.release-summary-card > strong { font-size: 13px; font-weight: 800; color: var(--text); }
.release-summary-card > span { font-size: 12px; color: var(--muted); line-height: 1.5; }

/* Release Checklist */
.release-checklist-list { display: flex; flex-direction: column; gap: 8px; }
.release-check { display: flex; align-items: center; gap: 14px; padding: 13px 16px; background: #f8fafc; border-radius: 12px; border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s; }
.release-check[data-state="done"] { background: var(--success-bg); border-color: rgba(5,205,153,0.2); }
.release-check[data-state="warn"] { background: var(--warning-bg); border-color: rgba(255,206,32,0.3); }
.release-check[data-state="error"] { background: var(--danger-bg); border-color: rgba(238,93,80,0.2); }
.release-check > div:last-child { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.release-check > div:last-child > strong { font-size: 13px; font-weight: 700; color: var(--text); }
.release-check > div:last-child > span { font-size: 12px; color: var(--muted); }
.release-check-badge { width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; border-radius: 50%; background: var(--surface); color: var(--primary); border: 2px solid rgba(67,24,255,0.2); }
.release-check[data-state="done"] .release-check-badge { background: var(--success); color: #fff; border-color: var(--success); }
.release-check[data-state="warn"] .release-check-badge { background: #b58b00; color: #fff; border-color: #b58b00; }
.release-check[data-state="error"] .release-check-badge { background: var(--danger); color: #fff; border-color: var(--danger); }

/* Toggle Switch */
.toggle-switch-wrapper { display: flex; align-items: center; justify-content: space-between; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); transition: border-color 0.2s, background 0.2s; cursor: pointer; }
.toggle-switch-wrapper:hover { border-color: rgba(67,24,255,0.25); background: #fafbff; }
.toggle-switch-info { flex: 1; padding-right: 16px; }
.toggle-switch-info h4 { font-size: 13px; font-weight: 700; color: var(--text); }
.toggle-switch-info p { font-size: 12px; color: var(--muted); line-height: 1.5; }
.toggle-switch-info code { font-size: 11px; color: var(--primary); background: rgba(67,24,255,0.06); padding: 2px 6px; border-radius: 4px; }
.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #dde3ef; border-radius: 24px; transition: background 0.2s; }
.toggle-slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
.toggle-switch input:checked + .toggle-slider { background: var(--primary); }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }

/* Page app/web mode grid */
.page-app-grid { display: flex; flex-direction: column; }

/* Chips */
.chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.chip { display: inline-flex; align-items: center; padding: 5px 12px; background: #f1f5f9; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--text); border: 1px solid var(--line); }

/* Quick strip */
.quick-strip { display: flex; gap: 10px; flex-wrap: wrap; padding: 12px 0; }

/* Sticky actions */
.sticky-actions { position: sticky; bottom: 0; z-index: 10; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-top: 1px solid var(--line); padding: 16px 28px; display: flex; align-items: center; gap: 14px; justify-content: flex-end; margin: 0 -28px; box-shadow: 0 -4px 20px rgba(112,144,176,0.1); }

.btn-wide { width: 100%; justify-content: center; }

/* ── MOBILE RESPONSIVENESS ── */
@media (max-width: 992px) {
  /* Sidebar */
  .app-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 1000;
    transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  body.sidebar-open .app-sidebar { transform: translateX(0); }
  
  /* Sidebar overlay */
  .sidebar-overlay {
    position: fixed; inset: 0; background: rgba(17,28,68,0.4);
    z-index: 999; opacity: 0; pointer-events: none;
    transition: opacity 0.3s; backdrop-filter: blur(2px);
  }
  body.sidebar-open .sidebar-overlay { opacity: 1; pointer-events: auto; }
  
  /* Mobile menu button */
  .mobile-menu-btn { display: block !important; }
  
  /* Topbar */
  .app-topbar { padding: 16px 20px; }
  .search-box input { width: 160px; }
  
  /* Content */
  .app-content { padding: 20px; }
  .page-heading-row { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-heading-row .btn, .page-heading-row form { width: 100%; display: flex; }
  .page-heading-row .btn { justify-content: center; }
  
  /* Stats grid */
  .stats { grid-template-columns: 1fr !important; }
  
  /* Tables grid */
  .tables-grid { grid-template-columns: 1fr !important; }
  
  /* Responsive Tables */
  .table-card { overflow-x: auto; }
  table { min-width: 600px; }
  
  /* Form Grids */
  .grid-2 { grid-template-columns: 1fr !important; }
}

@media (max-width: 480px) {
  .search-box { display: none; } /* Hide search on very small screens to save space */
  .topbar-right { gap: 12px; }
  .page-heading h1 { font-size: 22px; }
}
</style>

