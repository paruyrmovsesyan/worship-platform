<?php
/**
 * admin_updates_css.php — Specific CSS for the Settings (admin_updates) page
 * Ultra-Compact Premium Bento-Box UI Redesign.
 */
?>
<style>
/* ── GENERAL HELPERS ── */
[hidden] { display: none !important; }

/* ── BADGES ── */
.badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge.success { background: var(--success-bg); color: var(--success); }
.badge.warning { background: var(--warning-bg); color: #b58b00; }
.badge.danger  { background: var(--danger-bg);  color: var(--danger); }
.badge.neutral { background: #f1f5f9; color: var(--muted); }

/* ── SECTION TABS (SIDEBAR) ── */
button.section-tab.nav-item {
  width: calc(100% - 24px); font-family: inherit; font-size: 13px; font-weight: 600;
  background: transparent; border: none; cursor: pointer; color: var(--muted);
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px; margin: 2px 12px;
  transition: all .15s; text-align: left;
}
button.section-tab.nav-item:hover { background: rgba(67,24,255,0.06); color: var(--text); transform: translateX(2px); }
button.section-tab.nav-item.active { background: linear-gradient(135deg, var(--primary), #6344ff); color: #fff; box-shadow: 0 4px 12px rgba(67,24,255,0.25); }
button.section-tab.nav-item.active svg { stroke: #fff; }

/* ── SECTION CONTENT ── */
.section-content { display: none; }
.section-content.is-active { display: block; animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* ── BACK NAVIGATION ── */
.section-back-nav { margin-bottom: 24px; }

/* ── SETTINGS MAIN NAV (GRID VIEW) ── */
.section-switcher.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.section-switcher.grid-view .section-tab {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.section-switcher.grid-view .section-tab:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.06);
  border-color: #cbd5e1;
}
.section-switcher.grid-view .section-tab.active {
  border-color: var(--primary);
  background: #f8fafc;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
.section-switcher.grid-view .section-tab svg.icon {
  width: 28px;
  height: 28px;
  color: var(--primary);
  padding: 8px;
  background: #e0e7ff;
  border-radius: 8px;
}
.section-switcher.grid-view .section-tab.active svg.icon {
  background: var(--primary);
  color: #fff;
}
.section-switcher.grid-view .section-tab .tab-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.section-switcher.grid-view .section-tab .tab-text span {
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
}
.section-switcher.grid-view .section-tab .tab-text small {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.4;
}

/* ── SECTION FOCUS BAR ── */
.section-focus {
  background: linear-gradient(135deg, #f8fafc, #fff);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}
.section-focus-copy { flex: 1; }
.section-focus-copy .eyebrow { font-size: 12px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.section-focus-copy h2 { font-size: 28px; font-weight: 800; color: var(--text); margin-bottom: 8px; letter-spacing: -0.5px; }
.section-focus-copy p { font-size: 15px; color: var(--muted); margin: 0; line-height: 1.5; }
.section-focus-side { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
.section-focus-meta { display: flex; gap: 8px; }
@media (max-width: 768px) {
  .section-focus { flex-direction: column; align-items: flex-start; padding: 20px; }
  .section-focus-side { align-items: flex-start; width: 100%; }
}

/* ── STATS CARDS ── */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.06);
}

/* ── BENTO GRID LAYOUTS ── */
.bento-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px; align-items: flex-start; }
.bento-grid.cols-3 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
@media (max-width: 1000px) { .bento-grid.cols-3 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); } }
@media (max-width: 600px) { .bento-grid, .bento-grid.cols-3 { grid-template-columns: 1fr; } }

.bento-split { display: grid; grid-template-columns: 1fr 320px; gap: 24px; margin-bottom: 24px; align-items: flex-start; }
@media (max-width: 800px) { .bento-split { grid-template-columns: 1fr; } }

.bento-split-even { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; align-items: flex-start; }
@media (max-width: 800px) { .bento-split-even { grid-template-columns: 1fr; } }
/* Bento Table */
.bento-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}
.bento-table th, .bento-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}
.bento-table th {
  font-weight: 500;
  color: var(--muted);
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}
.bento-table tr:last-child td {
  border-bottom: none;
}
.bento-table tr:hover td {
  background: rgba(0,0,0,0.015);
}
.bento-table .table-primary {
  font-weight: 600;
}
.bento-table .table-meta {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

@media (max-width: 1024px) {
  .bento-split-even {
    grid-template-columns: 1fr;
  }
}

/* Bento Timeline */
.bento-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  margin-top: 8px;
}
.bento-timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 10px;
  bottom: 20px;
  width: 2px;
  background: var(--border);
  z-index: 1;
}
.bento-timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 24px;
}
.bento-timeline-item:last-child {
  padding-bottom: 0;
}
.bento-timeline-item::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 24px;
  bottom: 0;
  width: 2px;
  background: var(--border);
  z-index: 1;
}
.bento-timeline-item:last-child::before {
  display: none;
}
.bento-timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px var(--border);
  position: relative;
  z-index: 2;
  margin-top: 5px;
  margin-left: 10px;
  flex-shrink: 0;
}
.bento-timeline-content {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  position: relative;
}
.bento-timeline-content::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 10px;
  width: 8px;
  height: 8px;
  background: #f8fafc;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
  transform: rotate(-45deg);
}

/* ── BENTO CARDS (Formerly settings-group) ── */
.bento-card { 
  background: #ffffff; 
  border-radius: 16px; 
  border: 1px solid #e2e8f0; 
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); 
  padding: 24px; 
  margin-bottom: 0; 
  transition: box-shadow 0.2s, transform 0.2s; 
  position: relative; 
}
.bento-card:hover { 
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); 
  transform: translateY(-2px); 
}
.bento-card.full-width { grid-column: 1 / -1; }
.bento-card.transparent { background: transparent; border: none; box-shadow: none; padding: 0; }

.bento-header { margin-bottom: 16px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.bento-header h3 { font-size: 15px; font-weight: 800; color: var(--text); margin: 0; display: flex; align-items: center; gap: 6px; }
.bento-header p { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.4; }

/* ── FORM FIELDS (Ultra-Compact) ── */
.form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.form-field:last-child { margin-bottom: 0; }
.form-field label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
.form-field.row { flex-direction: row; align-items: center; justify-content: space-between; }
.form-field.row label { margin-bottom: 0; }

.input-field, input:not([type]), input[type="text"], input[type="email"], input[type="number"], input[type="password"], input[type="datetime-local"], select, textarea {
  padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-family: inherit; font-size: 13px; color: var(--text);
  background: rgba(255, 255, 255, 0.8); outline: none; transition: all .15s;
  width: 100%; box-sizing: border-box; font-weight: 500;
}
.input-field:focus, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):focus, select:focus, textarea:focus {
  border-color: var(--primary); background: #fff;
  box-shadow: 0 0 0 3px rgba(67,24,255,0.08);
}
textarea { min-height: 70px; resize: vertical; line-height: 1.4; }

/* ── COMPACT TOGGLE SWITCH (iOS) ── */
.toggle-switch-wrapper { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(248, 250, 255, 0.5); border-radius: 10px; border: 1px solid #eef2ff; margin-bottom: 8px; transition: border-color 0.2s; }
.toggle-switch-wrapper:hover { border-color: rgba(67,24,255,0.15); background: #f8faff; }
.toggle-switch-info h4 { margin: 0 0 2px; font-size: 13px; font-weight: 700; color: var(--text); }
.toggle-switch-info p { margin: 0; font-size: 11px; color: var(--muted); line-height: 1.3; }
.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; margin-left: 10px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; transition: .3s; border-radius: 24px; }
.toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.toggle-switch input:checked + .toggle-slider { background: linear-gradient(135deg, #05CD99, #00b07a); }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }

.toggle-switch.mini { width: 32px; height: 18px; margin-left: 6px; }
.toggle-switch.mini .toggle-slider:before { height: 14px; width: 14px; left: 2px; bottom: 2px; }
.toggle-switch.mini input:checked + .toggle-slider:before { transform: translateX(14px); }

/* ── BUTTONS ── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 6px 14px; border-radius: 8px; border: 1px solid #cbd5e1; color: var(--text); text-decoration: none; background: #fff; font-weight: 600; font-size: 12px; cursor: pointer; transition: all .15s; }
.btn:hover { background: #f8fafc; border-color: #94a3b8; }
.btn-primary { background: linear-gradient(135deg, #4318FF, #6340FF); border-color: transparent; color: #fff; box-shadow: 0 4px 12px rgba(67,24,255,0.2); }
.btn-primary:hover { background: linear-gradient(135deg, #3510e0, #5535ef); box-shadow: 0 6px 16px rgba(67,24,255,0.3); color: #fff; }
.btn-danger { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
.btn-danger:hover { background: #fee2e2; border-color: #f87171; }
.btn-icon { padding: 6px; min-height: unset; border-radius: 6px; }

/* ── BANNERS & NOTIFICATIONS ── */
.banner { padding: 10px 14px; border-radius: 10px; font-weight: 600; font-size: 12px; border: 1px solid; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.banner.success { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
.banner.error { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

/* ── CHIPS & EYEBROWS ── */
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 16px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: var(--muted); border: 1px solid #e2e8f0; }
.chip.active { background: var(--primary); color: #fff; border-color: transparent; }

/* ── STAT CARDS (Micro-Stats) ── */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 12px; }
.stat-micro { background: rgba(255, 255, 255, 0.6); border-radius: 10px; border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
.stat-micro-val { font-size: 18px; font-weight: 800; color: var(--text); display: block; line-height: 1.1; }
.stat-micro-lbl { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; display: block; }

/* ── QUICK STRIP / TOOLBAR ── */
.toolbar-strip { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 12px; flex-wrap: wrap; }
.toolbar-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

/* ── NOTION-LIKE COMPACT TABLE ── */
.notion-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.notion-table th { padding: 6px 8px; text-align: left; color: var(--muted); font-weight: 600; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.notion-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; color: var(--text); vertical-align: middle; }
.notion-table tbody tr:hover td { background: rgba(248, 250, 255, 0.8); }
.notion-table tbody tr:last-child td { border-bottom: none; }

/* ── TIMELINE (History) ── */
.timeline { display: flex; flex-direction: column; gap: 0; padding-left: 16px; border-left: 2px solid #e2e8f0; margin-left: 8px; margin-top: 8px; }
.timeline-item { position: relative; padding: 0 0 16px 16px; }
.timeline-item::before { content: ""; position: absolute; left: -21px; top: 2px; width: 10px; height: 10px; background: #fff; border: 2px solid var(--primary); border-radius: 50%; box-shadow: 0 0 0 4px rgba(255,255,255,0.8); }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.timeline-title { font-size: 13px; font-weight: 700; color: var(--text); }
.timeline-time { font-size: 11px; color: var(--muted); }
.timeline-content { background: #f8fafc; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0; font-size: 11px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px; }

/* ── STICKY SAVE BAR ── */
.sticky-actions { position: sticky; bottom: 12px; z-index: 100; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); padding: 10px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 4px 20px rgba(67,24,255,0.1); display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 16px; }

/* ── PUSH PREVIEW ── */
.push-preview-phone { width: 240px; height: 500px; border: 8px solid #1e293b; border-radius: 32px; overflow: hidden; position: relative; background: #000; box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin: 0 auto; display: flex; flex-direction: column; }
.push-preview-screen { background: #fff; width: 100%; height: 100%; padding-top: 32px; display: flex; flex-direction: column; }
.push-preview-banner { background: #f8fafc; margin: 12px; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.push-preview-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.push-preview-app { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.push-preview-tag { font-size: 9px; padding: 2px 6px; background: rgba(67,24,255,0.1); color: var(--primary); border-radius: 4px; font-weight: 600; }
.push-preview-title { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.3; }
.push-preview-body { font-size: 12px; color: var(--muted); line-height: 1.4; word-break: break-word; }
.push-preview-meta { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px; }
.push-preview-meta .chip { font-size: 9px; padding: 2px 6px; background: #f1f5f9; color: var(--muted); border: none; }

/* ── SPLIT VIEW (Translations / Moderation) ── */
.split-view { display: grid; grid-template-columns: 240px 1fr; gap: 12px; align-items: stretch; height: 100%; }
.split-sidebar { background: rgba(255, 255, 255, 0.5); border-radius: 12px; border: 1px solid #e2e8f0; padding: 10px; overflow-y: auto; max-height: 600px; display: flex; flex-direction: column; gap: 6px; }
.split-item { padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--text); border: 1px solid transparent; transition: all .15s; }
.split-item:hover { background: #f1f5f9; }
.split-item.active { background: #fff; border-color: var(--primary); box-shadow: 0 2px 8px rgba(67,24,255,0.1); }
.split-content { display: flex; flex-direction: column; gap: 12px; }

/* ── ALERTS / NOTES ── */
.compact-alert { padding: 8px 12px; border-radius: 8px; font-size: 11px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; margin-bottom: 10px; }
.compact-alert.info { background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; }
.compact-alert.warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.compact-alert.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.compact-alert svg { flex-shrink: 0; width: 14px; height: 14px; margin-top: 1px; }

</style>
