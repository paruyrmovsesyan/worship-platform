<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_access.php';

$access = wp_admin_require_access('/songs.php');
$adminUser = $access['user'];
$adminPermissions = $access['permissions'] ?? wp_version_default_admin_permissions();
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));

if (empty($adminPermissions['songs_editor'])):
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Երգերի խմբագրումը հասանելի չէ</title>
  <style>
    :root{
      --bg:#0b1020;
      --panel:rgba(18,24,45,.88);
      --line:rgba(255,255,255,.1);
      --text:#eef3ff;
      --muted:#9aa8c9;
      --primary:#6b7cff;
      --danger:#ff6b7a;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:24px;
      font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      color:var(--text);
      background:
        radial-gradient(circle at top left, rgba(107,124,255,.18), transparent 28%),
        radial-gradient(circle at top right, rgba(87,214,195,.12), transparent 22%),
        linear-gradient(180deg, #09101d 0%, #0b1020 100%);
    }
    .gate{
      width:min(680px,100%);
      padding:28px;
      border-radius:24px;
      border:1px solid var(--line);
      background:var(--panel);
      box-shadow:0 24px 70px rgba(0,0,0,.34);
    }
    .eyebrow{
      display:inline-flex;
      padding:8px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      color:#c9d4ff;
      font-size:12px;
      font-weight:700;
      letter-spacing:.04em;
      text-transform:uppercase;
    }
    h1{
      margin:16px 0 10px;
      font-size:clamp(28px,4vw,38px);
      line-height:1.05;
    }
    p{
      margin:0;
      color:var(--muted);
      line-height:1.65;
      font-size:15px;
    }
    .actions{
      display:flex;
      flex-wrap:wrap;
      gap:12px;
      margin-top:22px;
    }
    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:46px;
      padding:12px 16px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.1);
      color:var(--text);
      text-decoration:none;
      font-weight:700;
      background:rgba(255,255,255,.05);
    }
    .btn-primary{
      background:linear-gradient(135deg,var(--primary),#8ea1ff);
      border-color:transparent;
      color:#fff;
    }
    .btn-danger{
      background:rgba(255,107,122,.12);
      border-color:rgba(255,107,122,.2);
      color:#ffb5bd;
    }
  </style>
</head>
<body>
  <main class="gate">
    <div class="eyebrow">Ադմին հասանելիություն</div>
    <h1>Երգերի խմբագրումը հասանելի չէ</h1>
    <p>Քո օգտահաշիվը մուտք ունի ադմին միջավայր, բայց <strong>Երգերի խմբագրում</strong> թույլտվությունը դեռ միացված չէ։ Եթե այս էջը քեզ պետք է, խնդրիր լիազորված ադմինին այն միացնել `Բաժինների թույլտվություններ ըստ օգտատիրոջ` բաժնից։</p>
    <div class="actions">
      <a class="btn btn-primary" href="/admin_updates.php">Բացել ադմինի կարգավորումները</a>
      <a class="btn btn-danger" href="/admin_logout.php">Դուրս գալ ադմինից</a>
    </div>
  </main>
</body>
</html>
<?php
exit;
endif;
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="manifest" href="/songs-manifest.php">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Worship Admin">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="wp-app-scope" content="admin">
  <meta name="theme-color" content="#070910">
  <script src="/pwa-init.js" defer></script>
  <title>Wolarm Youth — Երգերի կառավարում</title>
  <link rel="apple-touch-icon" href="wolarm_developers.png" type="image/png" />
  <link rel="icon" href="wolarm_developers.png" type="image/png" />
  <style>
    :root {
      --bg: #0a1020;
      --bg-soft: #121933;
      --panel: rgba(17, 24, 45, 0.88);
      --panel-soft: rgba(255, 255, 255, 0.05);
      --line: rgba(255,255,255,0.10);
      --line-soft: rgba(255,255,255,0.06);
      --text: #eef3ff;
      --muted: #96a4c5;
      --primary: #6b7cff;
      --primary-2: #8ea1ff;
      --accent: #57d6c3;
      --danger: #ff6b7a;
      --warning: #f7c66b;
      --success: #60d394;
      --shadow: 0 24px 60px rgba(0,0,0,.35);
      --radius-xl: 26px;
      --radius-lg: 22px;
      --radius-md: 18px;
      --radius-sm: 14px;
      --table-max-h: 720px;
      --mobile-table-max-h: 58vh;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(107,124,255,.18), transparent 28%),
        radial-gradient(circle at top right, rgba(87,214,195,.12), transparent 22%),
        linear-gradient(180deg, #09101d 0%, #0b1020 100%);
      color: var(--text);
      min-height: 100vh;
    }

    .shell {
      max-width: 1520px;
      margin: 0 auto;
      padding: 20px;
    }

    .topbar {
      position: static;
      top: 14px;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: rgba(10, 14, 28, .76);
      backdrop-filter: blur(16px);
      box-shadow: var(--shadow);
      margin-bottom: 18px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .brand-badge {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, rgba(107,124,255,.24), rgba(87,214,195,.18));
      border: 1px solid rgba(255,255,255,.1);
      font-size: 20px;
      font-weight: 800;
      letter-spacing: .04em;
      flex: 0 0 auto;
    }

    .brand-copy h1 {
      margin: 0;
      font-size: clamp(20px, 2.2vw, 30px);
      line-height: 1.04;
    }

    .brand-copy p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }

    #adminPageLoader {
      position: fixed;
      inset: 0;
      z-index: 2147482200;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at top left, rgba(107,124,255,.18), transparent 28%),
        radial-gradient(circle at top right, rgba(87,214,195,.14), transparent 22%),
        rgba(8, 12, 24, 0.92);
      backdrop-filter: blur(14px) saturate(120%);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      transition: opacity .22s ease, visibility .22s ease;
    }

    #adminPageLoader.hide {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    #adminPageLoaderCard {
      width: min(420px, calc(100vw - 28px));
      padding: 22px 18px 18px;
      border-radius: 26px;
      border: 1px solid rgba(255,255,255,.10);
      background: linear-gradient(180deg, rgba(12,18,34,.92), rgba(10,14,27,.84));
      box-shadow: 0 24px 70px rgba(0,0,0,.44);
    }

    #adminPageLoaderTitle {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -.03em;
    }

    #adminPageLoaderText {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }

    #adminPageLoaderRail {
      height: 8px;
      border-radius: 999px;
      background: rgba(255,255,255,.08);
      overflow: hidden;
      position: relative;
    }

    #adminPageLoaderRail::after {
      content: "";
      position: absolute;
      left: -35%;
      top: 0;
      width: 38%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, rgba(107,124,255,0), rgba(107,124,255,.95), rgba(87,214,195,.78));
      animation: adminLoaderRail 1.3s cubic-bezier(.4, 0, .2, 1) infinite;
    }

    @keyframes adminLoaderRail {
      0% { left: -35%; }
      100% { left: 100%; }
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .label-desktop { display: inline; }
    .label-mobile { display: none; }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .02em;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.06);
      color: var(--text);
      white-space: nowrap;
    }
    .pill.success { background: rgba(96,211,148,.12); color: #9df0bf; }
    .pill.warning { background: rgba(247,198,107,.12); color: #ffd995; }
    .pill.info { background: rgba(107,124,255,.14); color: #cbd4ff; }

    .btn,
    .key-buttons button,
    .workspace-tab {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 14px;
      padding: 12px 14px;
      min-height: 44px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: .22s ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .btn {
      background: rgba(255,255,255,.05);
      color: var(--text);
      border-color: rgba(255,255,255,.09);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn:hover,
    .workspace-tab:hover,
    .key-buttons button:hover {
      transform: translateY(-1px);
      background: rgba(255,255,255,.08);
    }

    .btn:active,
    .key-buttons button:active,
    .workspace-tab:active {
      transform: scale(.985);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-2));
      color: white;
      border-color: transparent;
      box-shadow: 0 14px 26px rgba(107,124,255,.28);
    }
    .btn-secondary { background: rgba(255,255,255,.06); color: #e6ebff; }
    .btn-danger { background: rgba(255,107,122,.14); color: #ffc2c9; border-color: rgba(255,107,122,.18); }
    .btn-success { background: rgba(96,211,148,.16); color: #bff3d3; border-color: rgba(96,211,148,.20); }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
      overflow: hidden;
    }

    .panel-head {
      padding: 18px 20px 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }

    .panel-head h2,
    .panel-head h3 {
      margin: 0;
      font-size: 21px;
    }

    .panel-head p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .panel-body { padding: 18px 20px 20px; }

    .dashboard {
      display: grid;
      grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .sidebar {
      position: sticky;
      top: 18px;
      display: grid;
      gap: 18px;
      align-self: start;
    }

    .content-shell {
      min-width: 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .stat-card {
      background: var(--panel-soft);
      border: 1px solid var(--line-soft);
      border-radius: 18px;
      padding: 14px;
    }

    .stat-card strong {
      display: block;
      font-size: 24px;
      margin-bottom: 4px;
    }

    .stat-card span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .main {
      display: grid;
      gap: 18px;
      min-width: 0;
    }

    .sidebar-actions {
      display: grid;
      gap: 10px;
    }

    .sidebar-actions .btn {
      width: 100%;
      justify-content: flex-start;
      border-radius: 16px;
      padding: 12px 14px;
    }

    .sidebar-note {
      margin-top: 4px;
      padding: 12px 14px;
      border: 1px dashed rgba(255,255,255,.10);
      border-radius: 16px;
      background: rgba(255,255,255,.03);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .install-admin-btn {
      white-space: nowrap;
    }

    .workspace-tabs {
      display: inline-grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      padding: 6px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.04);
      margin-bottom: 16px;
    }

    .workspace-tab {
      flex: 1 1 0;
      background: rgba(255,255,255,.05);
      color: var(--text);
      border-color: rgba(255,255,255,.09);
      min-width: 0;
      line-height: 1.2;
      text-align: center;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .workspace-tab.is-active {
      background: linear-gradient(135deg, var(--primary), var(--primary-2));
      color: white;
      border-color: transparent;
      box-shadow: 0 12px 24px rgba(107,124,255,.22);
    }

    .workspace-pane[hidden] { display: none !important; }
    .workspace-pane {
      display: block;
      min-width: 0;
    }

    .workspace-panel .panel-body {
      display: grid;
      gap: 16px;
    }

    .library-panel .panel-head {
      align-items: center;
    }

    .library-panel .table-shell th:nth-child(2),
    .library-panel .table-shell td:nth-child(2) {
      display: none;
    }

    .library-panel .table-shell th:nth-child(1),
    .library-panel .table-shell td:nth-child(1) {
      width: 72%;
    }

    .library-panel .table-shell th:nth-child(3),
    .library-panel .table-shell td:nth-child(3) {
      width: 28%;
      text-align: right;
    }

    .library-panel .mobile-key-pill { display: inline-flex; }

    .editor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr);
      gap: 18px;
      align-items: start;
    }

    .editor-stack,
    .preview-stack {
      display: grid;
      gap: 18px;
      min-width: 0;
    }

    .editor-card {
      border: 1px solid var(--line-soft);
      border-radius: 18px;
      background: var(--panel-soft);
      padding: 14px;
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .card-head strong { font-size: 15px; }
    .card-head span { font-size: 12px; color: var(--muted); }

    .editor-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .field,
    .field-wide,
    .filter-field {
      display: grid;
      gap: 8px;
    }

    .field label,
    .field-wide label,
    .filter-field label {
      color: #d7dff7;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .01em;
    }

    .field-wide { margin-bottom: 12px; }

    .hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      margin-top: 4px;
    }

    input[type="text"],
    textarea,
    input[type="search"],
    select {
      width: 100%;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
      color: var(--text);
      border-radius: 16px;
      padding: 13px 14px;
      outline: none;
      transition: .22s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      font-size: 16px;
    }

    select { appearance: none; }

    textarea {
      min-height: 180px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      line-height: 1.55;
    }

    input::placeholder,
    textarea::placeholder { color: #7f8baa; }

    input:focus,
    textarea:focus,
    input[type="search"]:focus,
    select:focus {
      border-color: rgba(142,161,255,.85);
      background: rgba(255,255,255,.08);
      box-shadow: 0 0 0 4px rgba(107,124,255,.14);
    }

    .toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .toolbar-title {
      display: grid;
      gap: 4px;
    }

    .toolbar-title strong { font-size: 15px; }
    .toolbar-title span { font-size: 12px; color: var(--muted); }

    .toggle-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.08);
      color: #dce5ff;
      font-size: 13px;
      font-weight: 600;
    }

    .key-buttons {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
    }

    .preview-card {
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 20px;
      overflow: hidden;
      background: rgba(255,255,255,.04);
    }

    .preview-top {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .preview-top strong { font-size: 15px; }
    .preview-top span { font-size: 12px; color: var(--muted); }

    .preview {
      white-space: pre-wrap;
      padding: 18px 16px 20px;
      min-height: 240px;
      font-size: 15px;
      line-height: 1.72;
      color: #eef3ff;
      max-height: 520px;
      overflow: auto;
    }

    .empty-preview { color: #7f8baa; font-style: italic; }
    .chord { font-weight: 800; color: #9bd7ff; }

    .form-actions .btn,
    .export-actions .btn {
      width: 100%;
      justify-content: center;
    }

    .form-actions,
    .export-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .songs-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .songs-toolbar-left,
    .songs-toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .compact-btn {
      min-height: 38px;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 13px;
    }

    .songs-count-pill { white-space: nowrap; }

    .search-wrap {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .filters-panel[hidden] { display: none !important; }

    .filters-panel {
      margin-bottom: 14px;
      transform-origin: top;
      animation: filtersDrop .18s ease;
    }

    @keyframes filtersDrop {
      from { opacity: 0; transform: translateY(-6px) scaleY(.98); }
      to { opacity: 1; transform: translateY(0) scaleY(1); }
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 12px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      background: rgba(255,255,255,.03);
    }

    .filter-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .active-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .active-filters:empty { display: none; }

    .active-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(107,124,255,.14);
      border: 1px solid rgba(142,161,255,.20);
      color: #d7e0ff;
    }

    .table-shell {
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 20px;
      overflow: hidden;
      background: rgba(255,255,255,.03);
      display: grid;
      grid-template-rows: auto auto auto;
      min-height: 0;
    }

    .table-scroll {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: var(--table-max-h);
      position: relative;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      text-align: left;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      vertical-align: top;
      font-size: 14px;
    }

    th {
      background: rgba(17, 24, 45, .96);
      color: #c9d3ef;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .05em;
      position: sticky;
      top: 0;
      z-index: 5;
      backdrop-filter: blur(10px);
      box-shadow: inset 0 -1px 0 rgba(255,255,255,.06);
    }

    tbody tr:hover { background: rgba(255,255,255,.04); }
    tbody tr.clickable-row { cursor: pointer; }

    .song-title {
      display: grid;
      gap: 5px;
      cursor: pointer;
    }

    .song-title strong {
      font-size: 15px;
      color: #f2f5ff;
      line-height: 1.35;
      word-break: break-word;
    }

    .song-meta {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .mini-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .mini-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.06);
      color: #d7e0ff;
      font-size: 11px;
      font-weight: 700;
    }

    .mini-pill.status-pill.has-lyrics {
      color: #9df0bf;
      border-color: rgba(96,211,148,.20);
      background: rgba(96,211,148,.10);
    }

    .mini-pill.status-pill.no-lyrics {
      color: #ffd995;
      border-color: rgba(247,198,107,.18);
      background: rgba(247,198,107,.10);
    }

    .mobile-key-pill { display: none; }

    .row-actions {
      display: inline-flex;
      flex-wrap: nowrap;
      gap: 6px;
      align-items: center;
      justify-content: flex-end;
    }

    .row-actions .btn {
      min-width: 76px;
      min-height: 34px;
      padding: 6px 10px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1;
      white-space: nowrap;
      box-shadow: none;
    }

    .table-footer {
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      color: var(--muted);
      font-size: 13px;
      flex-wrap: wrap;
    }

    .load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    .notice {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.06);
      color: #dce5ff;
      display: none;
    }

    .notice.show { display: block; }
    .notice.success { border-color: rgba(96,211,148,.18); color: #bff3d3; }
    .notice.error { border-color: rgba(255,107,122,.18); color: #ffc2c9; }
    .notice.info { border-color: rgba(107,124,255,.18); color: #d2d9ff; }

    .admin-install-banner {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 16px;
      z-index: 100004;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(12, 18, 34, .96);
      box-shadow: 0 18px 40px rgba(0,0,0,.34);
      backdrop-filter: blur(16px);
    }

    .admin-install-banner.show {
      display: flex;
    }

    .admin-install-copy {
      min-width: 0;
      display: grid;
      gap: 4px;
    }

    .admin-install-copy strong {
      font-size: 13px;
    }

    .admin-install-copy span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .admin-install-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }

    .admin-install-actions .btn {
      min-height: 38px;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 12px;
      white-space: nowrap;
    }

    footer {
      color: #7582a5;
      text-align: center;
      font-size: 12px;
      padding: 22px 12px 8px;
    }

    @media (max-width: 1380px) {
      .editor-layout { grid-template-columns: 1fr; }
    }

    @media (max-width: 1120px) {
      .dashboard { grid-template-columns: 1fr; }
      .sidebar {
        position: static;
      }
      .content-shell { order: 1; }
      .sidebar { order: 2; }
      .summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .sidebar-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 860px) {
      .dashboard {
        gap: 14px;
      }

      .editor-grid,
      .filters-grid,
      .sidebar-actions {
        grid-template-columns: 1fr;
      }

      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .topbar {
        position: static;
        border-radius: 18px;
        padding: 10px 12px;
        gap: 10px;
        align-items: center;
      }

      .shell { padding: 14px; }
      .panel-head, .panel-body { padding-left: 16px; padding-right: 16px; }
      .panel-body { padding-top: 14px; padding-bottom: 16px; }

      .brand {
        gap: 10px;
      }

      .brand-badge {
        width: 42px;
        height: 42px;
        border-radius: 13px;
        font-size: 16px;
      }

      .brand-copy h1 {
        font-size: 21px;
      }

      .brand-copy p {
        font-size: 12px;
        margin-top: 4px;
      }

      .topbar-actions {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .topbar-actions .pill {
        display: inline-flex;
        justify-content: center;
        padding: 7px 10px;
        font-size: 11px;
        min-height: 34px;
      }

      .sidebar .panel:nth-of-type(2) {
        display: none;
      }

      .sidebar .panel:first-of-type .panel-head p {
        display: none;
      }

      .status-row {
        width: 100%;
        justify-content: flex-start;
      }

      .install-admin-btn {
        width: auto;
      }

      .workspace-panel .panel-head {
        gap: 10px;
      }

      .workspace-panel .panel-head p {
        font-size: 12px;
        max-width: 42ch;
      }

      .workspace-tabs {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        padding: 5px;
      }

      .workspace-tab {
        min-width: 0;
        padding: 11px 9px;
        font-size: 13px;
      }

      .editor-layout,
      .preview-stack,
      .editor-stack {
        gap: 14px;
      }

      .editor-card {
        padding: 12px;
        border-radius: 16px;
      }

      .summary-grid {
        gap: 8px;
      }

      .stat-card {
        padding: 12px;
        border-radius: 16px;
      }

      .stat-card strong {
        font-size: 20px;
      }

      .stat-card span {
        font-size: 11px;
      }

      .preview { min-height: 180px; max-height: 320px; font-size: 14px; }
      th, td { padding: 12px; }
    }

    @media (max-width: 560px) {
      .shell { padding: 10px; }
      .topbar {
        padding: 9px 10px;
        gap: 8px;
      }

      .brand {
        align-items: center;
        gap: 9px;
      }

      .brand-badge {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        font-size: 14px;
      }

      .brand-copy h1 {
        font-size: 17px;
        line-height: 1.06;
      }

      .brand-copy p { display: none; }
      .panel { border-radius: 18px; }
      .panel-head h2, .panel-head h3 { font-size: 18px; }
      .main { gap: 12px; }

      .topbar-actions {
        display: flex;
        align-items: center;
        grid-template-columns: none;
        flex-wrap: nowrap;
        justify-content: flex-end;
        width: auto;
        gap: 6px;
        margin-left: auto;
      }

      .topbar-actions .pill {
        display: none;
      }

      .topbar-actions a,
      .topbar-actions button {
        width: auto;
        min-width: 0;
        flex: 0 0 auto;
      }

      .topbar-actions .btn {
        min-height: 38px;
        padding: 9px 10px;
        border-radius: 12px;
        font-size: 12px;
      }

      .label-desktop {
        display: none;
      }

      .label-mobile {
        display: inline;
      }

      .workspace-panel .panel-head p {
        display: none;
      }

      .workspace-tabs {
        gap: 5px;
        padding: 4px;
      }

      .workspace-tab {
        padding: 10px 6px;
        font-size: 12px;
        border-radius: 12px;
      }

      .key-buttons {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .form-actions,
      .export-actions { grid-template-columns: 1fr; }

      .btn,
      .workspace-tab,
      .key-buttons button { min-height: 46px; font-size: 14px; }

      .songs-toolbar {
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }

      .songs-toolbar-left {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1 1 100%;
        min-width: 100%;
      }

      .songs-toolbar-right {
        display: flex;
        align-items: center;
        flex: 1 1 100%;
        justify-content: flex-start;
      }

      .sidebar-note {
        font-size: 11px;
      }

      .songs-toolbar-left .compact-btn {
        flex: 1 1 0;
        min-height: 40px;
        padding: 9px 10px;
        font-size: 12px;
        border-radius: 12px;
      }

      .songs-count-pill {
        padding: 6px 10px;
        font-size: 11px;
      }

      .search-wrap { grid-template-columns: 1fr; gap: 8px; margin-bottom: 10px; }
      .search-wrap input[type="search"] { min-height: 42px; padding: 10px 12px; font-size: 14px; }
      .filters-panel { padding: 10px; border-radius: 16px; }

      .table-shell {
        min-height: auto;
        width: 100%;
        overflow: hidden;
      }

      .table-scroll {
        width: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        max-height: var(--mobile-table-max-h);
      }

      table {
        width: 100%;
        min-width: 0;
        table-layout: fixed;
      }

      .library-panel table,
      .library-panel thead,
      .library-panel tbody,
      .library-panel tr,
      .library-panel td {
        display: block;
        width: 100%;
      }

      .library-panel thead {
        display: none;
      }

      .library-panel tbody {
        display: grid;
        gap: 10px;
        padding: 10px;
      }

      .library-panel tr.clickable-row {
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        background: rgba(255,255,255,.03);
        padding: 12px;
      }

      .library-panel td {
        padding: 0;
        border: 0;
      }

      .library-panel td:nth-child(2) {
        display: none;
      }

      .row-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        margin-top: 10px;
      }

      .row-actions .btn {
        min-width: 86px;
        min-height: 36px;
        padding: 7px 10px;
        font-size: 11px;
      }

      .song-title {
        gap: 6px;
      }

      .song-title strong { font-size: 14px; line-height: 1.32; }
      .song-meta { font-size: 11px; line-height: 1.4; }
      .mini-pill { font-size: 10px; padding: 5px 8px; }
      .preview-top { padding: 12px 14px; }
      .preview { padding: 14px; line-height: 1.6; }

      .admin-install-banner {
        left: 10px;
        right: 10px;
        bottom: 10px;
        padding: 10px 12px;
        border-radius: 14px;
        align-items: stretch;
        flex-direction: column;
      }

      .admin-install-actions {
        width: 100%;
      }

      .admin-install-actions .btn {
        flex: 1 1 0;
        justify-content: center;
      }
    }
  </style>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
<div id="adminPageLoader" aria-hidden="true">
  <div id="adminPageLoaderCard" role="status" aria-live="polite" aria-busy="true">
    <h2 id="adminPageLoaderTitle">Բեռնվում է…</h2>
    <p id="adminPageLoaderText">Ադմինի երգերի տվյալները պատրաստվում են։</p>
    <div id="adminPageLoaderRail"></div>
  </div>
</div>
<div class="shell">
    <div class="topbar">
      <div class="brand">
        <div class="brand-badge">WY</div>
        <div class="brand-copy">
          <h1>Երգերի բազայի ադմին</h1>
          <p>Ավելացրու, խմբագրիր, փնտրիր, տրանսպոզ արա և արտահանիր երգերը՝ ավելի հստակ աշխատանքային հոսքով</p>
        </div>
      </div>

      <div class="topbar-actions">
        <span class="pill info">Երգերի կառավարում</span>
        <span class="pill"><?= htmlspecialchars($adminDisplayName, ENT_QUOTES) ?></span>
        <?php if ($adminEmail !== ''): ?>
          <span class="pill"><?= htmlspecialchars($adminEmail, ENT_QUOTES) ?></span>
        <?php endif; ?>
        <a class="btn btn-secondary" href="admin_updates.php">
          <span class="label-desktop">Թարմացումներ և տեղադրում</span>
          <span class="label-mobile">Թարմացումներ</span>
        </a>
        <a class="btn btn-danger" href="admin_logout.php">
          <span class="label-desktop">Դուրս գալ admin-ից</span>
          <span class="label-mobile">Դուրս գալ</span>
        </a>
      </div>
    </div>

    <section class="dashboard">
      <aside class="sidebar">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h3>Աշխատանքային ամփոփում</h3>
              <p>Ընդհանուր վիճակ, տեսանելի արդյունքներ և ընթացիկ խմբագրում</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="summary-grid">
              <div class="stat-card">
                <strong id="statTotalSongs">0</strong>
                <span>Ընդհանուր երգեր</span>
              </div>
              <div class="stat-card">
                <strong id="statLyricsSongs">0</strong>
                <span>Բառերով երգեր</span>
              </div>
              <div class="stat-card">
                <strong id="statVisibleSongs">0</strong>
                <span>Տեսանելի արդյունքներ</span>
              </div>
              <div class="stat-card">
                <strong id="statCurrentMode">Նոր երգ</strong>
                <span>Ընթացիկ ռեժիմ</span>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <h3>Արագ գործողություններ</h3>
              <p>Ամենակարևոր քայլերը մեկ տեղում, առանց ավելորդ կրկնության</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="sidebar-actions">
              <button class="btn btn-success" id="newSongBtn" type="button">Նոր երգ սկսել</button>
              <button class="btn btn-secondary" id="sidebarSearchBtn" type="button">Բացել որոնումը</button>
              <button class="btn btn-secondary" id="sidebarRefreshBtn" type="button">Թարմացնել ցանկը</button>
              <button class="btn btn-secondary" id="sidebarClearBtn" type="button">Մաքրել ձևը</button>
            </div>
            <div class="sidebar-note">
              Համակարգչում գրադարանը ձախում է, իսկ աշխատանքային տարածքը` աջում։ Հեռախոսով նույն հոսքը բացվում է շարքով, առանց խառնաշփոթի։
            </div>
          </div>
        </section>
      </aside>

      <div class="content-shell">
        <section class="panel workspace-panel" id="workspacePanel">
          <div class="panel-head">
            <div>
              <h2>Աշխատանքային տարածք</h2>
              <p>Աշխատի՛ր երեք պարզ բաժիններով` երգերի ցանկ, խմբագրիչ և նախադիտում</p>
            </div>
            <div class="status-row">
              <button class="btn btn-secondary compact-btn install-admin-btn" id="installAdminAppBtn" type="button">
                <span class="label-desktop">Ներբեռնել որպես ծրագիր</span>
                <span class="label-mobile">Ներբեռնել</span>
              </button>
              <span class="pill warning" id="editingBadge">Խմբագրվում է․ ոչինչ</span>
            </div>
          </div>

          <div class="panel-body">
            <div class="workspace-tabs" aria-label="Աշխատանքային ներդիրներ">
              <button class="workspace-tab is-active" type="button" data-workspace-tab="libraryPane">Երգերի ցանկ</button>
              <button class="workspace-tab" type="button" data-workspace-tab="editorPane">Խմբագրիչ</button>
              <button class="workspace-tab" type="button" data-workspace-tab="previewPane">Նախադիտում</button>
            </div>

            <section class="workspace-pane is-active library-panel" id="libraryPane">
              <div class="card-head">
                <div>
                  <strong>Երգերի գրադարան</strong><br>
                  <span>Փնտրիր, ֆիլտրիր և ընտրիր երգը` անմիջապես խմբագրելու համար</span>
                </div>
                <div class="status-row">
                  <span class="pill songs-count-pill" id="songsCount">0 երգ</span>
                </div>
              </div>

              <div class="songs-toolbar">
                <div class="songs-toolbar-left">
                  <button id="toggleFiltersBtn" class="btn btn-secondary compact-btn" type="button" aria-expanded="false" aria-controls="filtersPanel">Ֆիլտրեր</button>
                  <button id="refreshList" class="btn btn-secondary compact-btn" type="button">Թարմացնել</button>
                </div>
                <div class="songs-toolbar-right">
                  <span class="pill info" id="tableMetaPill">Սկզբում 10 երգ</span>
                </div>
              </div>

              <div class="search-wrap">
                <input id="search" type="search" placeholder="Որոնել անունով, կատարողով, տեգերով, բառերով կամ տոնայնությամբ…">
              </div>

              <div id="filtersPanel" class="filters-panel" hidden>
                <div class="filters-grid">
                  <div class="filter-field">
                    <label for="sortBy">Դասավորել ըստ</label>
                    <select id="sortBy">
                      <option value="newest">Նորից հին</option>
                      <option value="title_asc">Անուն A-Z</option>
                      <option value="title_desc">Անուն Z-A</option>
                      <option value="artist_asc">Կատարող A-Z</option>
                      <option value="artist_desc">Կատարող Z-A</option>
                      <option value="key_asc">Տոնայնություն A-Z</option>
                      <option value="key_desc">Տոնայնություն Z-A</option>
                    </select>
                  </div>

                  <div class="filter-field">
                    <label for="lyricsFilter">Բառերի ֆիլտր</label>
                    <select id="lyricsFilter">
                      <option value="all">Բոլորը</option>
                      <option value="with">Միայն բառերով</option>
                      <option value="without">Միայն առանց բառերի</option>
                    </select>
                  </div>

                  <div class="filter-field">
                    <label for="keyFilter">Տոնայնություն</label>
                    <input id="keyFilter" type="text" placeholder="օր. C, Dm, Eb">
                  </div>

                  <div class="filter-field">
                    <label for="tagFilter">Տեգ</label>
                    <input id="tagFilter" type="text" placeholder="օր. easter">
                  </div>

                  <div class="filter-actions">
                    <button id="clearFilters" class="btn btn-secondary" type="button">Մաքրել ֆիլտրերը</button>
                  </div>
                </div>
                <div id="activeFilters" class="active-filters"></div>
              </div>

              <div class="table-shell">
                <div class="table-scroll">
                  <table aria-label="songs table">
                    <thead>
                      <tr>
                        <th>Երգ</th>
                        <th>Տոնայնություն</th>
                        <th>Գործողություններ</th>
                      </tr>
                    </thead>
                    <tbody id="songsTable"></tbody>
                  </table>
                </div>

                <div class="load-more-wrap">
                  <button id="loadMoreBtn" class="btn btn-secondary" type="button" hidden>Բեռնել մնացածը</button>
                </div>
                <div class="table-footer">
                  <span id="tableInfo">Ցուցադրվում է 0 երգ</span>
                  <span id="tableMetaInfo">Սկզբում ցուցադրվում է 10 երգ</span>
                </div>
              </div>
            </section>

            <section class="workspace-pane" id="editorPane" hidden>
              <div class="editor-layout">
                <div class="editor-stack">
                  <div class="editor-card">
                    <div class="card-head">
                      <div>
                        <strong>Հիմնական տվյալներ</strong><br>
                        <span>Վերնագիր, կատարող, տոնայնություն և տեգեր</span>
                      </div>
                    </div>

                    <div class="editor-grid">
                      <div class="field">
                        <label for="title">Երգի անունը հայերեն</label>
                        <input id="title" type="text" placeholder="Օր. Մեր սուրբ Աստված">
                      </div>

                      <div class="field">
                        <label for="title_ru">Երգի անունը ռուսերեն</label>
                        <input id="title_ru" type="text" placeholder="Օր. Наш святой Бог">
                      </div>

                      <div class="field">
                        <label for="title_lat">Երգի անունը լատինատառ հայերեն</label>
                        <input id="title_lat" type="text" placeholder="Օր. Mer Surb Astvats">
                      </div>

                      <div class="field">
                        <label for="title_en">Երգի անունը անգլերեն</label>
                        <input id="title_en" type="text" placeholder="Օր. Our Holy God">
                      </div>

                      <div class="field">
                        <label for="artist">Կատարողը</label>
                        <input id="artist" type="text" placeholder="Օր. Խմբի անուն">
                      </div>

                      <div class="field">
                        <label for="key">Սկզբնական տոնայնություն</label>
                        <input id="key" type="text" placeholder="Օր. C, Eb, Am կամ Dm">
                      </div>

                      <div class="field">
                        <label for="bpm">BPM տեմպ</label>
                        <input id="bpm" type="number" min="20" max="400" step="1" inputmode="numeric" placeholder="Օր. 72 կամ 128">
                      </div>

                      <div class="field">
                        <label for="tags">Տեգեր</label>
                        <input id="tags" type="text" placeholder="օր. worship, easter, youth">
                      </div>
                    </div>
                  </div>

                  <div class="editor-card">
                    <div class="card-head">
                      <div>
                        <strong>Բովանդակություն</strong><br>
                        <span>Ակորդներ և բառեր</span>
                      </div>
                    </div>

                    <div class="field-wide">
                      <label for="chords">Ակորդներ</label>
                      <textarea id="chords" placeholder="C | G/B | Am | F&#10;Քո տեքստն ու ակորդները այստեղ"></textarea>
                      <div class="hint">Ակորդները կարող ես գրել նույն կառուցվածքով, ինչ հիմա ես օգտագործում։</div>
                    </div>

                    <div class="field-wide">
                      <label for="lyrics">Բառեր</label>
                      <textarea id="lyrics" placeholder="Երգի բառերը՝ առանց ակորդների"></textarea>
                    </div>
                  </div>

                </div>

                <div class="preview-stack">
                  <div class="editor-card">
                    <div class="card-head">
                      <div>
                        <strong>Տրանսպոզ</strong><br>
                        <span>Ընտրիր նպատակային տոնայնությունը նախադիտման համար</span>
                      </div>
                    </div>

                    <div class="toolbar-row">
                      <div class="toolbar-title">
                        <strong>Նպատակային տոնայնություն</strong>
                        <span>Ընտրիր նոր տոնայնությունը</span>
                      </div>

                      <label class="toggle-wrap" title="Օգտագործել bemol-ներ (Db, Eb...)">
                        <input id="useFlats" type="checkbox">
                        <span>Օգտագործել bemol-ներ</span>
                      </label>
                    </div>

                    <div id="keysGrid" class="key-buttons" role="tablist" aria-label="Տոնայնություններ"></div>
                  </div>

                  <div class="editor-card">
                    <div class="card-head">
                      <div>
                        <strong>Գլխավոր գործողություններ</strong><br>
                        <span>Պահպանում և մաքրում</span>
                      </div>
                    </div>

                    <div class="form-actions">
                      <button id="saveSong" class="btn btn-primary" type="button">Պահպանել</button>
                      <button id="cancelEdit" class="btn btn-secondary" type="button" hidden>Չեղարկել խմբագրումը</button>
                      <button id="clearForm" class="btn btn-secondary" type="button">Մաքրել</button>
                    </div>
                  </div>

                  <div class="editor-card">
                    <div class="card-head">
                      <div>
                        <strong>Արտահանում</strong><br>
                        <span>TXT և PDF տարբերակներ</span>
                      </div>
                    </div>

                    <div class="export-actions">
                      <button id="downloadTxt" class="btn btn-secondary" type="button">TXT</button>
                      <button id="exportPdf" class="btn btn-secondary" type="button">PDF</button>
                      <button id="exportAllPdf" class="btn btn-secondary" type="button">Բոլորը PDF</button>
                    </div>
                  </div>
                </div>
              </div>

              <div id="notice" class="notice"></div>
            </section>

            <section class="workspace-pane" id="previewPane" hidden>
              <div class="card-head">
                <div>
                  <strong>Նախադիտում</strong><br>
                  <span>Ակորդները անմիջապես թարմացվում են ընտրված տոնայնությամբ</span>
                </div>
                <div class="status-row">
                  <span class="pill" id="transposeInfo">Տրանսպոզ: 0</span>
                  <span class="pill" id="selectedKeyPill">Թիրախային տոնայնություն: —</span>
                </div>
              </div>

              <div class="preview-card">
                <div class="preview-top">
                  <div>
                    <strong id="previewTitle">Չկա վերնագիր</strong><br>
                    <span id="previewMeta">Ակորդների նախադիտում</span>
                  </div>
                </div>
                <div id="preview" class="preview"><span class="empty-preview">Այստեղ կերևա ակորդների նախադիտումը</span></div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>

    <footer><b>Wolarm Youth 2026 | PM Studio 2026</b></footer>
  </div>

<script>
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function noteIndex(note) {
  if (!note) return -1;
  const m = ('' + note).trim().match(/^([A-Ga-g])([#b♭]?)/);
  if (!m) return -1;
  let root = (m[1].toUpperCase() + (m[2] || '')).replace(/♭/g, 'b');
  if (SHARPS.includes(root)) return SHARPS.indexOf(root);
  if (FLATS.includes(root)) return FLATS.indexOf(root);
  if (root === 'E#') return SHARPS.indexOf('F');
  if (root === 'B#') return SHARPS.indexOf('C');
  if (root === 'Fb') return SHARPS.indexOf('E');
  if (root === 'Cb') return SHARPS.indexOf('B');
  return -1;
}

function parseKeySignature(note) {
  const value = String(note || '').trim().replace(/♭/g, 'b').replace(/\s+/g, '');
  if (!value) return null;
  const m = value.match(/^([A-Ga-g])([#b]?)(m|min|minor)?$/i);
  if (!m) return null;
  const root = (m[1].toUpperCase() + (m[2] || ''));
  const index = noteIndex(root);
  if (index < 0) return null;
  const suffix = String(m[3] || '').toLowerCase();
  const isMinor = suffix === 'm' || suffix === 'min' || suffix === 'minor';
  return {
    root,
    index,
    isMinor,
    display: root + (isMinor ? 'm' : '')
  };
}

function getEffectiveTargetKey(originalKey, targetKey) {
  const target = parseKeySignature(targetKey);
  if (!target) return String(targetKey || '').trim();
  const original = parseKeySignature(originalKey);
  return target.root + (original && original.isMinor ? 'm' : '');
}

function transposeRoot(root, semi, useFlats) {
  const i = noteIndex(root);
  if (i < 0) return root;
  const autoFlats = ('' + root).includes('b') && !('' + root).includes('#');
  const useFlat = useFlats || autoFlats;
  const idx = (i + semi + 12) % 12;
  return useFlat ? FLATS[idx] : SHARPS[idx];
}

function escapeHtml(s) {
  return ('' + s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderWithChords(text = '', semi = 0, useFlats = false) {
  const chordRegex = /(^|[\s\(\[])([A-G](?:#|b)?)([mM0-9majdimaugaddsus]*)?(?:\/([A-G](?:#|b)?))?(?=[\s\)\]\,]|$)/g;
  return text.split('\n').map(line =>
    line.replace(chordRegex, (match, prefix, root, type = '', bass = '') => {
      const newRoot = transposeRoot(root, semi, useFlats);
      let result = `${prefix}<span class="chord">${newRoot}${type}`;
      if (bass) {
        const newBass = transposeRoot(bass, semi, useFlats);
        result += `/${newBass}`;
      }
      result += '</span>';
      return result;
    })
  ).join('\n');
}

const $ = (id) => document.getElementById(id);
const titleI = $('title');
const titleLatI = $('title_lat');
const titleRuI = $('title_ru');
const titleEnI = $('title_en');
const artistI = $('artist');
const keyI = $('key');
const bpmI = $('bpm');
const tagsI = $('tags');
const chordsI = $('chords');
const lyricsI = $('lyrics');
const useFlatsI = $('useFlats');
const preview = $('preview');
const keysGrid = $('keysGrid');
const saveBtn = $('saveSong');
const cancelEditBtn = $('cancelEdit');
const clearBtn = $('clearForm');
const downloadTxtBtn = $('downloadTxt');
const exportPdfBtn = $('exportPdf');
const exportAllPdfBtn = $('exportAllPdf');
const searchI = $('search');
const tableBody = $('songsTable');
const previewTitle = $('previewTitle');
const previewMeta = $('previewMeta');
const selectedKeyPill = $('selectedKeyPill');
const transposeInfo = $('transposeInfo');
const songsCount = $('songsCount');
const tableInfo = $('tableInfo');
const editingBadge = $('editingBadge');
const notice = $('notice');
const refreshListBtn = $('refreshList');
const loadMoreBtn = $('loadMoreBtn');
const newSongBtn = $('newSongBtn');
const sidebarSearchBtn = $('sidebarSearchBtn');
const sidebarRefreshBtn = $('sidebarRefreshBtn');
const sidebarClearBtn = $('sidebarClearBtn');
const tableMetaInfo = $('tableMetaInfo');
const tableMetaPill = $('tableMetaPill');
const toggleFiltersBtn = $('toggleFiltersBtn');
const filtersPanel = $('filtersPanel');
const sortByI = $('sortBy');
const lyricsFilterI = $('lyricsFilter');
const keyFilterI = $('keyFilter');
const tagFilterI = $('tagFilter');
const clearFiltersBtn = $('clearFilters');
const activeFilters = $('activeFilters');
const statTotalSongs = $('statTotalSongs');
const statLyricsSongs = $('statLyricsSongs');
const statVisibleSongs = $('statVisibleSongs');
const statCurrentMode = $('statCurrentMode');
const workspacePanel = $('workspacePanel');
const workspaceTabs = Array.from(document.querySelectorAll('[data-workspace-tab]'));
const workspacePanes = Array.from(document.querySelectorAll('.workspace-pane'));
const installAdminAppBtn = $('installAdminAppBtn');

const KEY_OPTIONS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
let selectedTargetKey = '';
let ALL_SONGS = [];
let currentEditId = null;
let visibleSongsCount = 10;
let lastSavedSnapshot = '';
const SONGS_PAGE_SIZE = 10;
let deferredAdminInstallPrompt = null;
const adminInstallStorageKey = 'wp_admin_install_prompt_hidden';
const adminInstallDeviceKey = 'wp_admin_install_device_id';
const adminInstallSignatureCookieKey = 'wp_admin_install_device_sig';
const adminInstallSeenKey = 'wp_admin_install_last_ping_at';
const adminInstallConfirmedKey = 'wp_admin_install_confirmed';
const adminInstallIosIntentKey = 'wp_admin_install_ios_intent';

function hasArmenianText(text) {
  return /[\u0531-\u058F]/u.test(String(text || ''));
}

function hasCyrillicText(text) {
  return /[\u0400-\u04FF]/u.test(String(text || ''));
}

function hasLatinText(text) {
  return /[A-Za-z]/.test(String(text || ''));
}

function splitTitleVariants(text) {
  return String(text || '')
    .split(/\s*\/\s*/u)
    .map(part => part.trim())
    .filter(Boolean);
}

function parseSongTitleVariants(text) {
  const parts = splitTitleVariants(text);
  let hy = '';
  let lat = '';
  let ru = '';
  let en = '';

  const latinParts = parts.filter(part => hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part));
  const cyrillicParts = parts.filter(part => hasCyrillicText(part) && !hasArmenianText(part));

  if (parts.length >= 3 && hasArmenianText(parts[0])) {
    hy = parts[0] || '';
    if (latinParts.length >= 2) {
      lat = latinParts[0] || '';
      en = latinParts[latinParts.length - 1] || '';
    } else if (latinParts.length === 1 && parts.length === 2) {
      en = latinParts[0] || '';
    }
    ru = cyrillicParts[0] || '';
    return { hy, lat, ru, en };
  }

  parts.forEach((part) => {
    if (!hy && hasArmenianText(part)) {
      hy = part;
      return;
    }
    if (!ru && hasCyrillicText(part) && !hasArmenianText(part)) {
      ru = part;
      return;
    }
    if (!lat && hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) {
      lat = part;
      return;
    }
    if (!en && hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) {
      en = part;
    }
  });

  if (!hy && parts.length) hy = parts[0];
  if (!en && !ru && lat && parts.length === 2 && hy) {
    en = lat;
    lat = '';
  }

  return { hy, lat, ru, en };
}

function buildCombinedSongTitle() {
  const hy = titleI.value.trim();
  const lat = titleLatI.value.trim();
  const ru = titleRuI.value.trim();
  const en = titleEnI.value.trim();
  return [hy, lat, en, ru].filter(Boolean).join(' / ');
}

function displayEditorSongTitle(text) {
  const variants = parseSongTitleVariants(text);
  return variants.hy || variants.ru || variants.en || String(text || '');
}

function showNotice(message, type = 'info') {
  notice.className = `notice show ${type}`;
  notice.textContent = message;
  clearTimeout(showNotice._timer);
  showNotice._timer = setTimeout(() => {
    notice.className = 'notice';
    notice.textContent = '';
  }, 2800);
}

function isStandaloneAdminApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
}

function ensureAdminInstallBanner() {
  var existing = document.getElementById('adminInstallBanner');
  if (existing) return existing;

  var banner = document.createElement('div');
  banner.id = 'adminInstallBanner';
  banner.className = 'admin-install-banner';
  banner.innerHTML =
    '<div class="admin-install-copy">' +
    '  <strong>Ներբեռնեք ադմին ծրագիրը</strong>' +
    '  <span id="adminInstallBannerText">Արագ մուտք գործեք երգերի կառավարման բաժին առանձին հավելվածով։</span>' +
    '</div>' +
    '<div class="admin-install-actions">' +
    '  <button class="btn btn-secondary" id="adminInstallLaterBtn" type="button">Հետո</button>' +
    '  <button class="btn btn-primary" id="adminInstallPromptBtn" type="button">Ներբեռնել</button>' +
    '</div>';
  document.body.appendChild(banner);
  return banner;
}

function hideAdminInstallBanner(persist) {
  var banner = document.getElementById('adminInstallBanner');
  if (banner) banner.classList.remove('show');
  if (persist) {
    try {
      localStorage.setItem(adminInstallStorageKey, '1');
    } catch (e) {
      // ignore storage errors
    }
  }
}

function updateAdminInstallBanner() {
  var banner = ensureAdminInstallBanner();
  var text = document.getElementById('adminInstallBannerText');
  var promptBtn = document.getElementById('adminInstallPromptBtn');
  var laterBtn = document.getElementById('adminInstallLaterBtn');

  if (laterBtn && !laterBtn.dataset.bound) {
    laterBtn.dataset.bound = '1';
    laterBtn.addEventListener('click', function() {
      hideAdminInstallBanner(true);
    });
  }

  if (promptBtn && !promptBtn.dataset.bound) {
    promptBtn.dataset.bound = '1';
    promptBtn.addEventListener('click', function() {
      handleAdminInstallRequest();
    });
  }

  if (isStandaloneAdminApp()) {
    banner.classList.remove('show');
    return;
  }

  try {
    if (localStorage.getItem(adminInstallStorageKey) === '1') {
      banner.classList.remove('show');
      return;
    }
  } catch (e) {
    // ignore storage errors
  }

  if (!deferredAdminInstallPrompt && !isAppleMobile()) {
    banner.classList.remove('show');
    return;
  }

  if (text) {
    text.textContent = isAppleMobile()
      ? 'Safari-ում կարող եք այս էջը պահել որպես առանձին հավելված։'
      : 'Ներբեռնեք երգերի կառավարման առանձին ծրագիրը արագ մուտքի համար։';
  }

  banner.classList.add('show');
}

function updateInstallAdminButton() {
  if (!installAdminAppBtn) return;

  if (isStandaloneAdminApp()) {
    installAdminAppBtn.hidden = true;
    hideAdminInstallBanner(false);
    return;
  }

  installAdminAppBtn.hidden = false;
  installAdminAppBtn.disabled = false;
  installAdminAppBtn.classList.remove('btn-success');
  installAdminAppBtn.classList.add('btn-secondary');

  const desktopLabel = installAdminAppBtn.querySelector('.label-desktop');
  const mobileLabel = installAdminAppBtn.querySelector('.label-mobile');

  if (deferredAdminInstallPrompt) {
    if (desktopLabel) desktopLabel.textContent = 'Ներբեռնել որպես ծրագիր';
    if (mobileLabel) mobileLabel.textContent = 'Ներբեռնել';
    return;
  }

  if (isAppleMobile()) {
    if (desktopLabel) desktopLabel.textContent = 'Ինչպես ներբեռնել ծրագիրը';
    if (mobileLabel) mobileLabel.textContent = 'Ինչպես';
    return;
  }

  if (desktopLabel) desktopLabel.textContent = 'Բացել ներբեռնման հուշումը';
  if (mobileLabel) mobileLabel.textContent = 'Ծրագիր';
}

function getAdminInstallDeviceId() {
  try {
    var existing = localStorage.getItem(adminInstallDeviceKey);
    if (existing) {
      writeAdminInstallCookie(existing);
      return existing;
    }
    var cookieValue = readAdminInstallCookie();
    if (cookieValue) {
      localStorage.setItem(adminInstallDeviceKey, cookieValue);
      return cookieValue;
    }
    var next = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : ('admin-' + Math.random().toString(36).slice(2) + Date.now()));
    localStorage.setItem(adminInstallDeviceKey, next);
    writeAdminInstallCookie(next);
    return next;
  } catch (e) {
    var fallbackCookie = readAdminInstallCookie();
    if (fallbackCookie) return fallbackCookie;
    var fallback = 'admin-' + Math.random().toString(36).slice(2) + Date.now();
    writeAdminInstallCookie(fallback);
    return fallback;
  }
}

function readAdminInstallCookie() {
  try {
    var escapedName = String(adminInstallDeviceKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var match = document.cookie.match(new RegExp('(?:^|; )' + escapedName + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  } catch (e) {
    return '';
  }
}

function writeAdminInstallCookie(value) {
  try {
    document.cookie = adminInstallDeviceKey + '=' + encodeURIComponent(value) + '; path=/; max-age=' + (3650 * 24 * 60 * 60) + '; SameSite=Lax';
  } catch (e) {
    // ignore cookie errors
  }
}

function shouldPingAdminInstall() {
  try {
    var last = Number(localStorage.getItem(adminInstallSeenKey) || '0');
    return !last || (Date.now() - last) > 12 * 60 * 60 * 1000;
  } catch (e) {
    return true;
  }
}

function markAdminInstallPing() {
  try {
    localStorage.setItem(adminInstallSeenKey, String(Date.now()));
  } catch (e) {
    // ignore
  }
}

function getAdminInstallSignature() {
  try {
    const screenInfo = window.screen || {};
    const nav = window.navigator || {};
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (err) {}

    const signatureParts = [
      'scope:admin',
      'ua:' + (nav.userAgent || ''),
      'platform:' + (nav.platform || ''),
      'lang:' + (nav.language || ''),
      'langs:' + ((nav.languages || []).join(',')),
      'touch:' + String(nav.maxTouchPoints || 0),
      'cpu:' + String(nav.hardwareConcurrency || 0),
      'mem:' + String(nav.deviceMemory || 0),
      'screen:' + [screenInfo.width || 0, screenInfo.height || 0, screenInfo.colorDepth || 0].join('x'),
      'viewport:' + [window.innerWidth || 0, window.innerHeight || 0].join('x'),
      'dpr:' + String(window.devicePixelRatio || 1),
      'tz:' + tz
    ].join('|');

    let hash = 2166136261;
    for (let i = 0; i < signatureParts.length; i += 1) {
      hash ^= signatureParts.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const signature = ('00000000' + (hash >>> 0).toString(16)).slice(-8) + ('00000000' + signatureParts.length.toString(16)).slice(-8);
    try {
      document.cookie = adminInstallSignatureCookieKey + '=' + encodeURIComponent(signature) + '; path=/; max-age=' + (3650 * 24 * 60 * 60) + '; SameSite=Lax';
    } catch (e) {}
    return signature;
  } catch (err) {
    return '';
  }
}

function registerAdminInstall(options) {
  options = options || {};
  const force = !!options.force;
  if (!isStandaloneAdminApp() || !hasConfirmedAdminInstall() || !navigator.onLine) return;
  if (!force && !shouldPingAdminInstall()) return;

  fetch('/install_api.php?action=register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-App-Scope': 'admin',
      'X-WP-Install-Mode': 'standalone'
    },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      scope: 'admin',
      source: 'admin-app-verified',
      device_id: getAdminInstallDeviceId(),
      device_signature: getAdminInstallSignature()
    })
  }).then((response) => {
    if (response && response.ok) {
      markAdminInstallPing();
    }
  }).catch(() => {
    // ignore network errors
  });
}

function cleanupLegacyMainInstallRecord() {
  if (!isStandaloneAdminApp() || !navigator.onLine) return;

  const cleanupKey = 'wp_admin_legacy_main_cleanup_done';
  try {
    if (localStorage.getItem(cleanupKey) === '1') {
      return;
    }
  } catch (e) {}

  let legacyDeviceId = '';
  let legacySignature = '';

  try {
    legacyDeviceId = String(localStorage.getItem('wp_install_device_id') || '').trim();
  } catch (e) {}
  if (!legacyDeviceId) {
    try {
      const match = document.cookie.match(/(?:^|; )wp_install_device_id=([^;]*)/);
      legacyDeviceId = match ? decodeURIComponent(match[1]) : '';
    } catch (e) {}
  }

  try {
    const match = document.cookie.match(/(?:^|; )wp_install_device_sig=([^;]*)/);
    legacySignature = match ? decodeURIComponent(match[1]) : '';
  } catch (e) {}

  if (!legacyDeviceId && !legacySignature) {
    try {
      localStorage.setItem(cleanupKey, '1');
    } catch (e) {}
    return;
  }

  fetch('/install_api.php?action=cleanup_legacy_main', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-App-Scope': 'admin',
      'X-WP-Install-Mode': 'standalone'
    },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      scope: 'admin',
      source: 'admin-app-verified',
      legacy_device_id: legacyDeviceId,
      legacy_device_signature: legacySignature
    })
  }).then((response) => {
    if (!response || !response.ok) return;
    try {
      localStorage.setItem(cleanupKey, '1');
    } catch (e) {}
  }).catch(() => {
    // ignore cleanup errors
  });
}

async function handleAdminInstallRequest() {
  if (isStandaloneAdminApp()) {
    showNotice('Այս էջն արդեն բացված է որպես առանձին ծրագիր', 'info');
    hideAdminInstallBanner(false);
    return;
  }

  if (deferredAdminInstallPrompt) {
    try {
      deferredAdminInstallPrompt.prompt();
      var choice = await deferredAdminInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        try {
          localStorage.setItem(adminInstallConfirmedKey, '1');
        } catch (e) {}
        hideAdminInstallBanner(false);
      }
    } catch (err) {
      showNotice('Չհաջողվեց բացել ներբեռնման պատուհանը', 'error');
    } finally {
      deferredAdminInstallPrompt = null;
      updateInstallAdminButton();
      updateAdminInstallBanner();
    }
    return;
  }

  if (isAppleMobile()) {
    try {
      localStorage.setItem(adminInstallIosIntentKey, '1');
    } catch (e) {}
    showNotice('Safari-ում սեղմիր Share և ընտրիր Add to Home Screen', 'info');
    return;
  }

  showNotice('Եթե browser-ը դեռ հուշում չի տալիս, բացիր էջը Chrome կամ Edge-ով և նորից փորձիր', 'info');
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredAdminInstallPrompt = event;
  updateInstallAdminButton();
  updateAdminInstallBanner();
});

window.addEventListener('appinstalled', () => {
  deferredAdminInstallPrompt = null;
  updateInstallAdminButton();
  hideAdminInstallBanner(false);
  try {
    localStorage.setItem(adminInstallConfirmedKey, '1');
    localStorage.removeItem(adminInstallIosIntentKey);
  } catch (e) {}
  showNotice('Ադմին էջը տեղադրվել է որպես առանձին ծրագիր', 'success');
  setTimeout(() => registerAdminInstall({ force: true }), 1200);
});

function hasConfirmedAdminInstall() {
  try {
    if (isStandaloneAdminApp()) {
      localStorage.setItem(adminInstallConfirmedKey, '1');
      localStorage.removeItem(adminInstallIosIntentKey);
      return true;
    }

    if (localStorage.getItem(adminInstallConfirmedKey) === '1') {
      return true;
    }

    if (window.navigator.standalone === true && localStorage.getItem(adminInstallIosIntentKey) === '1') {
      localStorage.setItem(adminInstallConfirmedKey, '1');
      localStorage.removeItem(adminInstallIosIntentKey);
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

window.addEventListener('load', () => {
  setTimeout(() => {
    registerAdminInstall({ force: true });
    cleanupLegacyMainInstallRecord();
  }, 900);
});

window.addEventListener('online', registerAdminInstall);

function normalizeSong(song) {
  return {
    ...song,
    song_key: song.song_key ?? song.key ?? ''
  };
}

function hideAdminPageLoader(delay = 80) {
  window.clearTimeout(window.__adminPageLoaderTimer);
  window.__adminPageLoaderTimer = window.setTimeout(() => {
    const el = document.getElementById('adminPageLoader');
    if (el) el.classList.add('hide');
  }, delay);
}

function scrollWorkspaceIntoView() {
  if (!workspacePanel) return;
  if (window.matchMedia('(max-width: 1120px)').matches) {
    workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function activateWorkspaceTab(id) {
  workspacePanes.forEach((pane) => {
    const active = pane.id === id;
    pane.hidden = !active;
    pane.classList.toggle('is-active', active);
  });
  workspaceTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.workspaceTab === id);
  });
  updateWorkspaceState();
}

workspaceTabs.forEach((tab) => {
  tab.addEventListener('click', () => activateWorkspaceTab(tab.dataset.workspaceTab));
});

function updateStats(totalCount, visibleCount) {
  const withLyrics = ALL_SONGS.filter(song => (song.lyrics || '').trim()).length;
  statTotalSongs.textContent = String(totalCount);
  statLyricsSongs.textContent = String(withLyrics);
  statVisibleSongs.textContent = String(visibleCount);
  statCurrentMode.textContent = currentEditId !== null ? 'Խմբագրում' : 'Նոր երգ';
}

function setEditMode(song = null) {
  currentEditId = song ? Number(song.id) : null;
  const editing = currentEditId !== null;
  saveBtn.textContent = editing ? 'Թարմացնել' : 'Պահպանել';
  cancelEditBtn.hidden = !editing;
  editingBadge.textContent = editing ? `Խմբագրվում է․ ${displayEditorSongTitle(song.title || '') || 'Անանուն'}` : 'Խմբագրվում է․ ոչինչ';
  statCurrentMode.textContent = editing ? 'Խմբագրում' : 'Նոր երգ';
  updateWorkspaceState();
}

function createSongSnapshot() {
  return JSON.stringify({
    id: currentEditId,
    form: getFormData(),
    selectedTargetKey: selectedTargetKey || '',
    useFlats: !!useFlatsI.checked
  });
}

function hasUnsavedChanges() {
  return createSongSnapshot() !== lastSavedSnapshot;
}

function markCurrentSnapshotAsSaved() {
  lastSavedSnapshot = createSongSnapshot();
  updateWorkspaceState();
}

function computeSemiForLive(originalKey, targetKey) {
  if (!originalKey || !targetKey) return 0;
  const from = parseKeySignature(originalKey);
  const to = parseKeySignature(targetKey);
  if (!from || !to) return 0;
  return (to.index - from.index + 12) % 12;
}

function getCurrentSemi() {
  const originalKey = keyI.value.trim();
  if (!originalKey || !selectedTargetKey) return 0;
  return computeSemiForLive(originalKey, getEffectiveTargetKey(originalKey, selectedTargetKey));
}

function buildKeysGrid() {
  keysGrid.innerHTML = '';
  for (const k of KEY_OPTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = k;
    btn.dataset.key = k;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#keysGrid button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTargetKey = k;
      renderPreview();
    });
    keysGrid.appendChild(btn);
  }
}

function renderPreview() {
  const originalKey = keyI.value.trim();
  const effectiveTargetKey = getEffectiveTargetKey(originalKey, selectedTargetKey);
  const useFlats = useFlatsI.checked;
  const semi = getCurrentSemi();
  const raw = chordsI.value.trim();

  previewTitle.textContent = titleI.value.trim() || titleLatI.value.trim() || titleRuI.value.trim() || titleEnI.value.trim() || 'Չկա վերնագիր';
  const bpmText = bpmI && bpmI.value.trim() ? `BPM: ${bpmI.value.trim()}` : '';
  previewMeta.textContent = [artistI.value.trim(), originalKey ? `Սկզբնական: ${originalKey}` : '', effectiveTargetKey ? `Թիրախ: ${effectiveTargetKey}` : '', bpmText]
    .filter(Boolean)
    .join(' • ') || 'Ակորդների նախադիտում';

  selectedKeyPill.textContent = `Թիրախային տոնայնություն: ${effectiveTargetKey || '—'}`;
  transposeInfo.textContent = `Տրանսպոզ: ${semi >= 0 ? '+' + semi : semi}`;

  if (!raw) {
    preview.innerHTML = '<span class="empty-preview">Այստեղ կերևա ակորդների նախադիտումը</span>';
    updateWorkspaceState();
    return;
  }

  preview.innerHTML = renderWithChords(raw, semi, useFlats);
  updateWorkspaceState();
}

function getFormData() {
  return {
    title: buildCombinedSongTitle(),
    title_hy: titleI.value.trim(),
    title_lat: titleLatI.value.trim(),
    title_en: titleEnI.value.trim(),
    title_ru: titleRuI.value.trim(),
    artist: artistI.value.trim(),
    key: keyI.value.trim(),
    bpm: bpmI.value ? Number(bpmI.value) : 0,
    tags: tagsI.value.trim(),
    chords: chordsI.value,
    lyrics: lyricsI.value
  };
}

function validateSong(song) {
  if (!song.title) return 'Լրացրու երգի անունը';
  if (song.bpm && (song.bpm < 20 || song.bpm > 400)) return 'BPM-ը գրիր 20-ից 400 միջակայքում';
  if (!song.chords.trim() && !song.lyrics.trim()) return 'Լրացրու գոնե ակորդները կամ բառերը';
  return '';
}

function fillForm(song) {
  const titleVariants = parseSongTitleVariants(song.title || '');
  const apiVariants = song.title_variants && typeof song.title_variants === 'object' ? song.title_variants : {};
  titleI.value = apiVariants.hy || titleVariants.hy || '';
  titleLatI.value = apiVariants.lat || titleVariants.lat || '';
  titleRuI.value = apiVariants.ru || titleVariants.ru || '';
  titleEnI.value = apiVariants.en || titleVariants.en || '';
  artistI.value = song.artist || '';
  keyI.value = song.song_key || song.key || '';
  bpmI.value = song.bpm ? String(song.bpm) : '';
  tagsI.value = song.tags || '';
  chordsI.value = song.chords || '';
  lyricsI.value = song.lyrics || '';
  selectedTargetKey = '';
  document.querySelectorAll('#keysGrid button').forEach(b => b.classList.remove('active'));
  renderPreview();
  activateWorkspaceTab('editorPane');
  scrollWorkspaceIntoView();
  markCurrentSnapshotAsSaved();
}

function clearForm() {
  titleI.value = '';
  titleLatI.value = '';
  titleRuI.value = '';
  titleEnI.value = '';
  artistI.value = '';
  keyI.value = '';
  bpmI.value = '';
  tagsI.value = '';
  chordsI.value = '';
  lyricsI.value = '';
  useFlatsI.checked = false;
  selectedTargetKey = '';
  document.querySelectorAll('#keysGrid button').forEach(b => b.classList.remove('active'));
  setEditMode(null);
  renderPreview();
  markCurrentSnapshotAsSaved();
}

function textCmp(a, b) {
  return a.localeCompare(b, 'hy', { sensitivity: 'base' });
}

function getActiveFiltersList() {
  const items = [];
  if (sortByI.value !== 'newest') items.push(`Դասավորում: ${sortByI.options[sortByI.selectedIndex].text}`);
  if (lyricsFilterI.value !== 'all') items.push(`Բառեր: ${lyricsFilterI.options[lyricsFilterI.selectedIndex].text}`);
  if (keyFilterI.value.trim()) items.push(`Տոնայնություն: ${keyFilterI.value.trim()}`);
  if (tagFilterI.value.trim()) items.push(`Տեգ: ${tagFilterI.value.trim()}`);
  if (searchI.value.trim()) items.push(`Որոնում: ${searchI.value.trim()}`);
  return items;
}

function renderActiveFilters() {
  const items = getActiveFiltersList();
  activeFilters.innerHTML = items.map(item => `<span class="active-chip">${escapeHtml(item)}</span>`).join('');
}

function updateFiltersButtonState() {
  const count = getActiveFiltersList().length;
  const open = !filtersPanel.hidden;
  toggleFiltersBtn.textContent = count > 0 ? `Ֆիլտրեր • ${count}` : 'Ֆիլտրեր';
  toggleFiltersBtn.setAttribute('aria-expanded', String(open));
  renderActiveFilters();
  updateWorkspaceState();
}

function updateWorkspaceState() {
}

function applySort(list) {
  const sort = sortByI.value;
  const copy = [...list];
  switch (sort) {
    case 'title_asc': copy.sort((a, b) => textCmp(a.title || '', b.title || '')); break;
    case 'title_desc': copy.sort((a, b) => textCmp(b.title || '', a.title || '')); break;
    case 'artist_asc': copy.sort((a, b) => textCmp(a.artist || '', b.artist || '')); break;
    case 'artist_desc': copy.sort((a, b) => textCmp(b.artist || '', a.artist || '')); break;
    case 'key_asc': copy.sort((a, b) => textCmp(a.song_key || '', b.song_key || '')); break;
    case 'key_desc': copy.sort((a, b) => textCmp(b.song_key || '', a.song_key || '')); break;
    case 'newest':
    default:
      copy.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      break;
  }
  return copy;
}

function getFilteredSongs() {
  const q = searchI.value.trim().toLowerCase();
  const lyricsMode = lyricsFilterI.value;
  const keyFilter = keyFilterI.value.trim().toLowerCase();
  const tagFilter = tagFilterI.value.trim().toLowerCase();

  const filtered = ALL_SONGS.filter(song => {
    const haystack = [song.title, song.artist, song.tags, song.lyrics, song.chords, song.song_key, song.bpm].filter(Boolean).join(' ').toLowerCase();
    if (q && !haystack.includes(q)) return false;
    const hasLyrics = !!(song.lyrics && song.lyrics.trim());
    if (lyricsMode === 'with' && !hasLyrics) return false;
    if (lyricsMode === 'without' && hasLyrics) return false;
    if (keyFilter && !(song.song_key || '').toLowerCase().includes(keyFilter)) return false;
    if (tagFilter && !(song.tags || '').toLowerCase().includes(tagFilter)) return false;
    return true;
  });

  return applySort(filtered);
}

function getVisibleSongs() {
  return getFilteredSongs().slice(0, visibleSongsCount);
}

function updateLoadMoreState(totalCount, shownCount) {
  const hasMore = shownCount < totalCount;
  loadMoreBtn.hidden = !hasMore;
  tableMetaInfo.textContent = hasMore ? `Ցուցադրված է ${shownCount}-ը ${totalCount}-ից` : `Ցուցադրված են բոլոր ${totalCount} երգերը`;
  tableMetaPill.textContent = hasMore ? `${shownCount}/${totalCount}` : `Բոլորը՝ ${totalCount}`;
}

function renderTable(songs = [], totalCount = songs.length) {
  tableBody.innerHTML = '';
  songsCount.textContent = `${totalCount} երգ`;
  tableInfo.textContent = `Ցուցադրվում է ${songs.length} երգ`;
  updateLoadMoreState(totalCount, songs.length);
  updateStats(ALL_SONGS.length, totalCount);

  if (!songs.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="3">
        <div class="song-meta" style="padding:12px 0;">Ոչինչ չի գտնվել</div>
      </td>
    `;
    tableBody.appendChild(tr);
    return;
  }

  for (const s of songs) {
    const hasLyrics = !!(s.lyrics && s.lyrics.trim());
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.songId = s.id;
    tr.innerHTML = `
      <td>
        <div class="song-title" data-open-song="${s.id}">
          <strong>${escapeHtml(displayEditorSongTitle(s.title || '') || 'Անանուն')}</strong>
          <div class="song-meta">${escapeHtml(s.artist || 'Կատարող նշված չէ')}</div>
          <div class="mini-pills">
            <span class="mini-pill mobile-key-pill">${escapeHtml(s.song_key || '—')}</span>
            ${s.bpm ? `<span class="mini-pill">BPM ${escapeHtml(String(s.bpm))}</span>` : ''}
            <span class="mini-pill status-pill ${hasLyrics ? 'has-lyrics' : 'no-lyrics'}">${hasLyrics ? 'Բառերը առկա են' : 'Բառերը չկան'}</span>
            ${s.tags ? s.tags.split(',').filter(Boolean).slice(0, 3).map(tag => `<span class="mini-pill">${escapeHtml(tag.trim())}</span>`).join('') : '<span class="mini-pill">առանց տեգերի</span>'}
          </div>
        </div>
      </td>
      <td>
        <div class="mini-pills">
          <span class="mini-pill">${escapeHtml(s.song_key || '—')}</span>
          ${s.bpm ? `<span class="mini-pill">BPM ${escapeHtml(String(s.bpm))}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn-primary" type="button" data-action="edit" data-id="${s.id}">Խմբագրել</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${s.id}">Ջնջել</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }
}

async function fetchSongs() {
  const res = await fetch('api.php');
  if (!res.ok) throw new Error('Չհաջողվեց բեռնել երգերը');
  const songs = await res.json();
  ALL_SONGS = Array.isArray(songs) ? songs.map(normalizeSong) : [];
  visibleSongsCount = SONGS_PAGE_SIZE;
  renderTable(getVisibleSongs(), getFilteredSongs().length);
}

async function startEditSong(id) {
  const res = await fetch('api.php?id=' + encodeURIComponent(id));
  if (!res.ok) throw new Error('Չհաջողվեց բեռնել երգը');
  const song = normalizeSong(await res.json());
  fillForm(song);
  setEditMode(song);
  markCurrentSnapshotAsSaved();
  showNotice('Խմբագրման ռեժիմը ակտիվացված է', 'info');
}

async function saveCurrentSong() {
  const song = getFormData();
  const error = validateSong(song);
  if (error) {
    showNotice(error, 'error');
    return;
  }

  const parseApiResponse = async (res) => {
    const raw = await res.text();
    let json = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch (_) {
      json = { raw };
    }
    return { raw, json };
  };

  if (currentEditId !== null) {
    const res = await fetch('api.php?id=' + encodeURIComponent(currentEditId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song)
    });
    const { raw, json: result } = await parseApiResponse(res);
    if (!res.ok || result.success === false) {
      const detail = result?.details?.message || result?.error || raw || 'Չհաջողվեց թարմացնել երգը';
      throw new Error(detail);
    }
    showNotice('Փոփոխությունները պահպանված են ✅', 'success');
  } else {
    const res = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song)
    });
    const { raw, json: result } = await parseApiResponse(res);
    if (!res.ok || result.success === false) {
      const detail = result?.details?.message || result?.error || raw || 'Չհաջողվեց պահպանել երգը';
      throw new Error(detail);
    }
    showNotice('Երգը պահպանված է ✅', 'success');
  }

  clearForm();
  await fetchSongs();
  markCurrentSnapshotAsSaved();
}

async function deleteSong(id) {
  if (!confirm('Իսկապե՞ս ջնջել այս երգը։')) return;
  const res = await fetch('api.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
  if (!res.ok) throw new Error('Չհաջողվեց ջնջել երգը');
  showNotice('Երգը ջնջված է', 'success');
  if (currentEditId === Number(id)) clearForm();
  await fetchSongs();
}

function openSongInNewTab(id) {
  window.open('song_view.html?id=' + encodeURIComponent(id), '_blank');
}

function rerenderList() {
  visibleSongsCount = SONGS_PAGE_SIZE;
  renderTable(getVisibleSongs(), getFilteredSongs().length);
  updateFiltersButtonState();
}

downloadTxtBtn.addEventListener('click', () => {
  const blob = new Blob([chordsI.value || ''], { type:'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (titleI.value || titleLatI.value || titleRuI.value || titleEnI.value || 'song') + '.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

exportPdfBtn.addEventListener('click', () => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showNotice('jsPDF չի բեռնվել', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;
  const semi = getCurrentSemi();

  doc.setFontSize(16);
  doc.text(titleI.value || titleLatI.value || titleRuI.value || titleEnI.value || 'Անանուն', 10, y); y += 10;
  doc.setFontSize(12);
  if (artistI.value) { doc.text('Կատարող: ' + artistI.value, 10, y); y += 8; }
  if (keyI.value) { doc.text('Տոնայնություն: ' + keyI.value, 10, y); y += 8; }
  if (bpmI.value) { doc.text('BPM: ' + bpmI.value, 10, y); y += 8; }
  if (selectedTargetKey) { doc.text('Թիրախային տոնայնություն: ' + selectedTargetKey, 10, y); y += 8; }

  const lines = (chordsI.value || '').split('\n');
  for (const line of lines) {
    const plain = line.replace(/\b([A-G][#b]?)(m|maj|min|dim|aug|sus2|sus4|7|9|11|13)?(\/[A-G][#b]?)?\b/g,
      (match, root, type, bass) => {
        const newRoot = transposeRoot(root, semi, useFlatsI.checked);
        let out = newRoot + (type || '');
        if (bass) out += '/' + transposeRoot(bass.slice(1), semi, useFlatsI.checked);
        return '(' + out + ')';
      }
    );

    const chunks = doc.splitTextToSize(plain, 180);
    for (const chunk of chunks) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(chunk, 10, y);
      y += 7;
    }
  }

  doc.save((titleI.value || titleLatI.value || titleRuI.value || titleEnI.value || 'song') + '.pdf');
});

exportAllPdfBtn.addEventListener('click', async () => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showNotice('jsPDF չի բեռնվել', 'error');
    return;
  }

  const songs = getFilteredSongs();
  if (!songs.length) {
    showNotice('Արտահանելու երգեր չկան', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  songs.forEach((song, index) => {
    if (index > 0) doc.addPage();
    let y = 18;
    doc.setFontSize(16);
    doc.text(displayEditorSongTitle(song.title || '') || 'Անանուն', 10, y); y += 9;
    doc.setFontSize(12);
    if (song.artist) { doc.text('Կատարող: ' + song.artist, 10, y); y += 7; }
    if (song.song_key) { doc.text('Տոնայնություն: ' + song.song_key, 10, y); y += 7; }
    if (song.bpm) { doc.text('BPM: ' + song.bpm, 10, y); y += 7; }
    if (song.tags) { doc.text('Տեգեր: ' + song.tags, 10, y); y += 7; }
    y += 3;

    const lines = (song.chords || '').split('\n');
    for (const line of lines) {
      const chunks = doc.splitTextToSize(line, 180);
      for (const chunk of chunks) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(chunk, 10, y);
        y += 7;
      }
    }
  });

  doc.save('songs-export.pdf');
});

[keyI, chordsI, useFlatsI, titleI, titleLatI, titleRuI, titleEnI, artistI].forEach(el => el.addEventListener('input', renderPreview));
tagsI.addEventListener('input', updateWorkspaceState);
lyricsI.addEventListener('input', updateWorkspaceState);
searchI.addEventListener('input', rerenderList);
sortByI.addEventListener('change', rerenderList);
lyricsFilterI.addEventListener('change', rerenderList);
keyFilterI.addEventListener('input', rerenderList);
tagFilterI.addEventListener('input', rerenderList);

toggleFiltersBtn.addEventListener('click', () => {
  filtersPanel.hidden = !filtersPanel.hidden;
  updateFiltersButtonState();
});

clearFiltersBtn.addEventListener('click', () => {
  sortByI.value = 'newest';
  lyricsFilterI.value = 'all';
  keyFilterI.value = '';
  tagFilterI.value = '';
  searchI.value = '';
  rerenderList();
  filtersPanel.hidden = true;
  updateFiltersButtonState();
  showNotice('Ֆիլտրերը մաքրված են', 'info');
});

saveBtn.addEventListener('click', async () => {
  try {
    await saveCurrentSong();
  } catch (err) {
    showNotice(err.message || 'Սխալ է տեղի ունեցել', 'error');
  }
});

cancelEditBtn.addEventListener('click', () => {
  clearForm();
  showNotice('Խմբագրումը չեղարկված է', 'info');
});

clearBtn.addEventListener('click', clearForm);
installAdminAppBtn?.addEventListener('click', async () => {
  await handleAdminInstallRequest();
});

sidebarSearchBtn?.addEventListener('click', () => {
  activateWorkspaceTab('libraryPane');
  scrollWorkspaceIntoView();
  searchI.focus();
  searchI.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
newSongBtn.addEventListener('click', () => {
  clearForm();
  activateWorkspaceTab('editorPane');
  scrollWorkspaceIntoView();
  titleI.focus();
  showNotice('Բացված է նոր երգի ռեժիմը', 'info');
});

refreshListBtn.addEventListener('click', async () => {
  try {
    await fetchSongs();
    showNotice('Ցանկը թարմացվեց', 'info');
  } catch (err) {
    showNotice(err.message || 'Չհաջողվեց թարմացնել ցանկը', 'error');
  }
});
sidebarRefreshBtn?.addEventListener('click', () => refreshListBtn.click());
sidebarClearBtn?.addEventListener('click', () => {
  clearForm();
  showNotice('Ձևը մաքրված է', 'info');
});

loadMoreBtn.addEventListener('click', () => {
  visibleSongsCount += SONGS_PAGE_SIZE;
  renderTable(getVisibleSongs(), getFilteredSongs().length);
});

tableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (btn) {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    try {
      if (action === 'edit') await startEditSong(id);
      if (action === 'delete') await deleteSong(id);
    } catch (err) {
      showNotice(err.message || 'Սխալ է տեղի ունեցել', 'error');
    }
    return;
  }

  const openTarget = e.target.closest('[data-open-song]');
  if (openTarget) {
    openSongInNewTab(openTarget.dataset.openSong);
    return;
  }

  const row = e.target.closest('tr.clickable-row');
  if (row && row.dataset.songId) {
    openSongInNewTab(row.dataset.songId);
  }
});

buildKeysGrid();
setEditMode(null);
renderPreview();
activateWorkspaceTab('libraryPane');
markCurrentSnapshotAsSaved();
updateInstallAdminButton();
updateAdminInstallBanner();

window.addEventListener('beforeunload', (e) => {
  if (!hasUnsavedChanges()) return;
  e.preventDefault();
  e.returnValue = '';
});

(async function init() {
  try {
    filtersPanel.hidden = true;
    updateFiltersButtonState();
    await fetchSongs();
    updateFiltersButtonState();
  } catch (err) {
    showNotice(err.message || 'Չհաջողվեց բեռնել տվյալները', 'error');
  } finally {
    hideAdminPageLoader(120);
  }
})();
</script>
</body>
</html>
