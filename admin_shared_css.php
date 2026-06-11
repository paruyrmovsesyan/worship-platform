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
  --primary: #4318FF;
  --primary-hover: #3311DB;
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
</style>
