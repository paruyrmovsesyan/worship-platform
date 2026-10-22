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
  --shadow-sm: 0 1px 3px rgba(112,144,176,0.06);
  --shadow: 0 14px 34px rgba(112,144,176,0.12);
  --radius-sm: 10px;
  --radius: 16px;
  --radius-lg: 24px;

  /* Safe Area Insets */
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

/* ── GLOBAL RESET & MOBILE TOUCH DEFAULTS ── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  min-height: 100dvh;
  height: 100dvh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body.wp-admin-app {
  min-height: 100dvh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}

/* ── LAYOUT ── */
.app-layout {
  display: flex;
  width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  padding-left: var(--sal);
  padding-right: var(--sar);
}

.app-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  box-shadow: 14px 17px 40px 4px rgba(112,144,176,0.08);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 50;
  border-right: 1px solid var(--line);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.app-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

/* ── BRAND ── */
.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 22px 18px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--line);
}
.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(58,45,255,0.25);
}
.brand-text {
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.25;
}

.sidebar-close-btn {
  display: none;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.sidebar-close-btn:hover {
  background: var(--line);
  color: var(--text);
}

/* ── NAV MENU ── */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 0 20px;
}
.sidebar-heading {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 14px 22px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 20px;
  border-radius: 12px;
  margin: 2px 14px;
  width: calc(100% - 28px);
  color: var(--muted);
  text-decoration: none;
  font-size: 14.5px;
  font-weight: 600;
  transition: background .15s, color .15s, transform .12s;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.nav-item:hover {
  background: rgba(58, 45, 255, 0.05);
  color: var(--text);
}
.nav-item:active {
  transform: scale(0.98);
}
.nav-item svg {
  flex-shrink: 0;
  width: 19px;
  height: 19px;
}
.nav-item.active {
  background: linear-gradient(135deg, var(--primary), #5b4dff);
  color: #fff;
  box-shadow: 0 4px 16px rgba(58, 45, 255, 0.32);
}
.nav-item.active svg {
  stroke: #fff;
}

/* ── LANG SWITCHER ── */
.lang-switcher {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 20px;
}
.lang-btn {
  padding: 6px 14px;
  border-radius: 16px;
  color: var(--muted);
  font-weight: 700;
  font-size: 12.5px;
  text-decoration: none;
  transition: .15s;
}
.lang-btn.active {
  background: var(--text);
  color: #fff;
  box-shadow: 0 2px 6px rgba(17,28,68,0.2);
}

/* ── TOPBAR ── */
.app-topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 36px;
  flex-shrink: 0;
  background: rgba(244, 247, 254, 0.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.topbar-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 3px 10px rgba(58,45,255,0.25);
  flex-shrink: 0;
}
.bell-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--line);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: var(--shadow-sm);
  transition: all .15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.bell-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.bell-btn:active {
  transform: scale(0.95);
}
.bell-dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 8px;
  height: 8px;
  background: var(--danger);
  border-radius: 50%;
  border: 2px solid white;
}

/* ── PAGE CONTENT & HEADINGS ── */
.app-content {
  padding: 24px 36px 40px;
  min-width: 0;
}
.page-heading {
  margin-bottom: 28px;
}
.page-heading h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.5px;
}
.page-heading p {
  font-size: 14.5px;
  color: var(--muted);
  margin-top: 5px;
  font-weight: 500;
}
.page-heading-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

/* ── STATS CARDS & GRIDS ── */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.stat {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 20px 22px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid var(--line);
  transition: box-shadow 0.2s, transform 0.15s;
}
.stat:hover {
  box-shadow: 0 8px 24px rgba(112,144,176,0.12);
  transform: translateY(-2px);
}
.stat-row, .stat > div:first-child {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}
.stat-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 4px;
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.8px;
  line-height: 1.1;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
}
.stat-trend.up { color: var(--success); }
.stat-trend.down { color: var(--danger); }
.stat-trend-label { color: var(--muted); font-weight: 500; }

/* ── TABLES ── */
.table-card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--line);
  margin-bottom: 24px;
}
.table-card table, .data-table {
  width: 100%;
  border-collapse: collapse;
}
.table-card th, .data-table th {
  text-align: left;
  padding: 14px 20px;
  color: var(--muted);
  font-weight: 700;
  font-size: 11.5px;
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  background: #f8fafc;
}
.table-card td, .data-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  font-weight: 500;
  font-size: 14px;
  color: var(--text);
  vertical-align: middle;
}
.table-card tbody tr:last-child td, .data-table tbody tr:last-child td {
  border-bottom: none;
}
.table-card tbody tr:hover, .data-table tbody tr:hover td {
  background: #f8faff;
}

/* ── BADGES & BUTTONS ── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 700;
}
.badge-success { background: var(--success-bg); color: var(--success); }
.badge-warning { background: var(--warning-bg); color: #b58b00; }
.badge-danger  { background: var(--danger-bg);  color: var(--danger); }
.badge-neutral { background: #f1f5f9; color: var(--muted); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid var(--line);
  cursor: pointer;
  transition: all .15s ease;
  text-decoration: none;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.btn:hover {
  box-shadow: 0 4px 14px rgba(112,144,176,0.15);
  border-color: #cbd5e1;
}
.btn:active {
  transform: scale(0.98);
}
.btn-primary {
  background: linear-gradient(135deg, var(--primary), #5b4dff);
  color: #fff;
  border: none;
  box-shadow: 0 4px 16px rgba(58, 45, 255, 0.3);
}
.btn-primary:hover {
  filter: brightness(1.08);
}
.btn-danger {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(238,93,80,0.25);
}
.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--line);
}

/* ── FORMS & SETTINGS GROUPS ── */
.settings-group {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.settings-group-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(135deg, #fafbff 0%, #f7f9ff 100%);
}
.settings-group-header h3 {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 4px;
}
.settings-group-header p {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}
.settings-group > *:not(.settings-group-header) {
  padding-left: 24px;
  padding-right: 24px;
}
.settings-group > *:last-child {
  padding-bottom: 22px;
}
.settings-group > .settings-group-header + * {
  padding-top: 18px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.form-field label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.help-text {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0;
}
.form-field .input-field,
.form-field input,
.form-field select,
.form-field textarea {
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  width: 100%;
}
.form-field .input-field:focus,
.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(58, 45, 255, 0.1);
}

/* ── GLOBAL LOADER ── */
#globalAdminLoader {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: rgba(244, 247, 254, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
#globalAdminLoader.hide {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.global-pulse {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--primary);
  animation: globalPulse 1.4s ease-out infinite;
}
@keyframes globalPulse {
  0% { transform: scale(0.4); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* ── BOTTOM NAVIGATION (HIDDEN ON DESKTOP) ── */
.app-bottom-nav {
  display: none;
}

/* ==========================================================================
   MOBILE & TABLET RESPONSIVENESS (PWA STANDALONE & TOUCH-OPTIMIZED)
   ========================================================================== */

@media (max-width: 992px) {
  /* Layout adjustments */
  .app-layout,
  body.wp-admin-app .app-layout {
    display: flex;
    height: 100dvh;
    min-height: 100dvh;
    width: 100%;
    overflow: hidden;
    padding-left: 0;
    padding-right: 0;
  }

  .app-main,
  body.wp-admin-app .app-main {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding-bottom: calc(72px + var(--sab)) !important;
  }

  /* Mobile Drawer Sidebar */
  .app-sidebar,
  body.wp-admin-app .app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1050;
    width: min(86vw, 320px);
    max-width: 340px;
    height: 100dvh;
    transform: translateX(-105%);
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
    border-radius: 0 24px 24px 0;
    box-shadow: 20px 0 60px rgba(17, 28, 68, 0.22);
    padding-top: var(--sat);
    padding-bottom: calc(16px + var(--sab));
  }

  body.sidebar-open .app-sidebar {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 28, 68, 0.45);
    z-index: 1040;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.26s ease;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  body.sidebar-open .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }

  body.sidebar-open {
    overflow: hidden !important;
  }

  .sidebar-close-btn {
    display: inline-flex;
  }

  /* Mobile Hamburger button */
  .mobile-menu-btn {
    display: inline-flex !important;
  }

  /* Topbar Mobile */
  .app-topbar,
  body.wp-admin-app .app-topbar {
    padding-top: calc(12px + var(--sat));
    padding-bottom: 12px;
    padding-left: calc(14px + var(--sal));
    padding-right: calc(14px + var(--sar));
    margin: 0;
    background: rgba(244, 247, 254, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--line);
  }

  .topbar-date-wrapper span {
    font-size: 13px;
  }

  /* Topbar search mobile */
  .search-box input {
    width: 170px;
  }
  .search-box input:focus {
    width: 220px;
  }

  /* Content area global normalization */
  .app-content,
  body.wp-admin-app .app-content,
  .app-main > div[style*="padding: 28px 40px"],
  .app-main > div[style*="padding:28px 40px"],
  .app-main > div[style*="padding: 28px 40px 60px"],
  .app-main > div[style*="padding:28px 40px 60px"] {
    padding: 16px 14px calc(84px + var(--sab)) !important;
    max-width: 100% !important;
    width: 100% !important;
  }

  .page-heading h1 {
    font-size: 24px;
  }
  .page-heading-row {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  /* ── 5-TAB MOBILE BOTTOM NAVIGATION ── */
  .app-bottom-nav,
  body.wp-admin-app .app-bottom-nav {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: center;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    height: calc(56px + var(--sab));
    padding-top: 4px;
    padding-bottom: var(--sab);
    padding-left: calc(6px + var(--sal));
    padding-right: calc(6px + var(--sar));
    background: rgba(255, 255, 255, 0.94);
    border-top: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 -6px 24px rgba(112, 144, 176, 0.12);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  .app-bottom-nav a,
  .app-bottom-nav button,
  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 48px;
    padding: 4px 2px;
    background: transparent;
    border: none;
    color: var(--muted);
    text-decoration: none;
    font-family: inherit;
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1.15;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.15s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .app-bottom-nav a:active,
  .app-bottom-nav button:active {
    transform: scale(0.93);
  }

  .bottom-nav-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .app-bottom-nav a svg,
  .app-bottom-nav button svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
    flex-shrink: 0;
  }

  .app-bottom-nav a.active,
  .app-bottom-nav button.active {
    color: var(--primary);
  }

  .app-bottom-nav a.active .bottom-nav-icon-wrap,
  .app-bottom-nav button.active .bottom-nav-icon-wrap {
    color: var(--primary);
  }

  .bottom-nav-dot {
    position: absolute;
    top: -2px;
    right: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 6px rgba(58, 45, 255, 0.6);
  }

  /* Dropdown sheets on mobile */
  .notif-panel,
  body.wp-admin-app .notif-panel,
  .user-dropdown,
  body.wp-admin-app .user-dropdown {
    position: fixed !important;
    top: calc(66px + var(--sat)) !important;
    left: calc(12px + var(--sal)) !important;
    right: calc(12px + var(--sar)) !important;
    width: auto !important;
    min-width: 0 !important;
    max-height: calc(100dvh - 90px - var(--sat) - var(--sab)) !important;
    border-radius: 20px !important;
    box-shadow: 0 25px 60px rgba(17, 28, 68, 0.28) !important;
  }

  /* Tables horizontal scroll */
  .table-card {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 14px;
  }
  .table-card table {
    min-width: 600px;
  }
  .table-card th, .table-card td {
    padding: 12px 14px;
  }

  /* Grid & form resets */
  .grid, .grid-2, .form-grid, .moderation-diff-grid {
    grid-template-columns: 1fr !important;
  }

  /* Sticky actions floating comfortably above bottom nav */
  .sticky-actions,
  body.wp-admin-app .sticky-actions {
    position: sticky;
    bottom: calc(60px + var(--sab)) !important;
    z-index: 900;
    margin: 0 -14px;
    padding: 14px 20px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid var(--line);
  }

  /* Full-width drawer modals on mobile */
  .editor-drawer,
  body.wp-admin-app .editor-drawer {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    border-radius: 0;
  }
  .editor-header {
    padding: calc(16px + var(--sat)) 18px 16px !important;
  }
  .editor-body {
    padding: 16px !important;
    padding-bottom: calc(24px + var(--sab)) !important;
  }
  .editor-footer {
    padding: 14px 18px calc(14px + var(--sab)) !important;
    flex-wrap: wrap;
    gap: 8px;
  }
  .editor-footer .btn {
    flex: 1 1 120px;
    justify-content: center;
  }

  /* Input zoom prevention on iOS (< 768px requires >= 16px font-size) */
  input, select, textarea,
  .form-field .input-field,
  .form-field input,
  .form-field select,
  .form-field textarea,
  .search-box input,
  .songs-search-input,
  .local-search-input {
    font-size: 16px !important;
  }
}

/* ── SMALL PHONES (< 600px / < 480px) ── */
@media (max-width: 640px) {
  /* Stats 2-column mobile grid */
  .stats,
  .features-stats-row,
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }

  .stat, .f-stat-card, .kpi-card {
    padding: 14px 14px 12px !important;
    border-radius: 14px !important;
  }

  .stat-value, .f-stat-info strong, .kpi-number {
    font-size: 22px !important;
  }

  .stat-label, .f-stat-info div, .kpi-title {
    font-size: 11px !important;
  }

  .stat-icon, .f-stat-icon {
    width: 38px !important;
    height: 38px !important;
    font-size: 1.15rem !important;
  }

  /* Features Grid 1 column on phone */
  .features-grid {
    grid-template-columns: 1fr !important;
  }

  /* Compact topbar date */
  .topbar-date-wrapper span {
    display: none !important;
  }
  .topbar-username {
    display: none !important;
  }
  .user-menu-trigger {
    padding: 0 !important;
  }
  .user-menu-caret {
    display: none !important;
  }

  /* Search box compact on tiny screens */
  .search-box input {
    width: 120px;
  }
  .search-box input:focus {
    width: 170px;
  }

  .topbar-right {
    gap: 8px;
  }
  .topbar-avatar,
  .bell-btn {
    width: 38px;
    height: 38px;
  }
}

/* ── PWA STANDALONE SPECIFIC ENHANCEMENTS ── */
@media all and (display-mode: standalone) {
  .app-topbar {
    padding-top: calc(14px + var(--sat)) !important;
  }
  .app-bottom-nav {
    padding-bottom: max(6px, var(--sab)) !important;
  }
}
</style>
