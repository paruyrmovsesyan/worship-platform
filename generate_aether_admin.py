import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aether Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #111827;
      --panel: #161e2e;
      --panel-glow: #1a2234;
      --sidebar-bg: rgba(22, 30, 46, 0.8);
      --line: rgba(255, 255, 255, 0.08);
      --text: #f9fafb;
      --muted: #9ca3af;
      --primary: #06b6d4; /* cyan */
      --accent: #a855f7; /* purple */
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }
    
    * { box-sizing: border-box; }
    
    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      height: 100vh;
      overflow: hidden;
      background-image: 
        radial-gradient(circle at top right, rgba(6, 182, 212, 0.05), transparent 40%),
        radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.05), transparent 40%);
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

    /* Layout */
    .sidebar {
      width: 240px;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--line);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      flex-shrink: 0;
      z-index: 10;
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .topbar {
      height: 70px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0 32px;
      flex-shrink: 0;
      gap: 20px;
    }

    .workspace {
      flex: 1;
      padding: 0 32px 32px 32px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 24px;
    }

    /* Sidebar Logo & Menu */
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 40px;
      padding: 0 12px;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--primary), #3b82f6);
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #000;
      font-size: 18px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      color: var(--muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      transition: all 0.2s;
    }
    .nav-item:hover {
      color: var(--text);
      background: rgba(255,255,255,0.03);
    }
    .nav-item.active {
      color: var(--text);
      background: rgba(168, 85, 247, 0.1);
      border: 1px solid rgba(168, 85, 247, 0.4);
      box-shadow: 0 0 15px rgba(168, 85, 247, 0.15);
    }
    .nav-item.active svg { color: var(--accent); }

    /* Topbar Profile */
    .icon-btn {
      color: var(--muted);
      cursor: pointer;
      position: relative;
    }
    .icon-btn:hover { color: var(--text); }
    .icon-btn .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--danger);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }
    .profile-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 13px;
      color: var(--muted);
    }
    .profile-btn img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }

    /* Cards */
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .date-picker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
      border-radius: 8px;
      font-size: 13px;
      color: var(--muted);
    }
    .date-range-select {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 13px;
      outline: none;
      margin-left: 10px;
    }

    /* Analytics Grid */
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .stat-info { display: flex; flex-direction: column; gap: 6px; }
    .stat-label { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 6px;}
    .stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
    
    .stat-chart { width: 80px; height: 36px; display: flex; align-items: flex-end;}
    .chart-purple path { stroke: var(--accent); stroke-width: 3; fill: none; }
    .chart-blue path { stroke: #3b82f6; stroke-width: 3; fill: none; }
    .chart-cyan .bars {
      display: flex; align-items: flex-end; gap: 3px; width: 100%; height: 100%;
    }
    .chart-cyan .bar { flex: 1; background: var(--primary); border-radius: 2px 2px 0 0; }

    /* User Management Table */
    .toolbar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      align-items: center;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(6, 182, 212, 0.4);
      border-radius: 8px;
      width: 260px;
    }
    .search-box input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 13px;
      outline: none;
      width: 100%;
    }
    .search-box svg { color: var(--primary); }
    
    .filters { display: flex; gap: 10px; }
    .filter-btn {
      padding: 8px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(6, 182, 212, 0.4);
      border-radius: 8px;
      color: var(--muted);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    
    .btn-neon {
      background: linear-gradient(135deg, #3b82f6, var(--accent));
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
      transition: opacity 0.2s;
    }
    .btn-neon:hover { opacity: 0.9; }

    .btn-cyan {
      background: linear-gradient(135deg, var(--primary), #3b82f6);
      color: #fff;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
      width: 100%;
    }

    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      font-weight: 500;
    }
    td {
      padding: 12px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      vertical-align: middle;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-info img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
    }
    
    .status-badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid currentColor;
      display: inline-flex;
    }
    .status-active { color: var(--success); background: rgba(16, 185, 129, 0.1); }
    .status-pending { color: var(--warning); background: rgba(245, 158, 11, 0.1); }
    .status-inactive { color: var(--muted); background: rgba(156, 163, 175, 0.1); }
    
    .row-actions {
      display: flex;
      gap: 10px;
    }
    .row-actions svg {
      color: #3b82f6;
      cursor: pointer;
      width: 16px; height: 16px;
    }
    .row-actions svg.trash { color: var(--danger); }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
    }

    /* Right Column Cards */
    .system-status {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .status-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
    }
    .status-dot-large {
      width: 12px; height: 12px; border-radius: 50%;
    }
    .dot-purple { background: var(--accent); box-shadow: 0 0 10px var(--accent); }
    .dot-green { background: var(--success); box-shadow: 0 0 10px var(--success); }
    .dot-cyan { background: var(--primary); box-shadow: 0 0 10px var(--primary); }
    .dot-orange { background: var(--warning); box-shadow: 0 0 10px var(--warning); }
    
    .vertical-status {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 10px;
    }
    .v-status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: var(--muted);
    }
    .v-status-row .dot-green { margin-left: auto; }

    /* Timeline */
    .timeline {
      display: flex;
      flex-direction: column;
      margin-top: 10px;
    }
    .timeline-item {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      position: relative;
    }
    .timeline-item::before {
      content: "";
      position: absolute;
      left: 3px;
      top: 16px;
      bottom: -20px;
      width: 2px;
      background: var(--line);
    }
    .timeline-item:last-child::before { display: none; }
    
    .timeline-dot {
      width: 8px; height: 8px; border-radius: 50%;
      margin-top: 5px;
      position: relative;
      z-index: 2;
    }
    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .timeline-content strong {
      font-size: 13px;
      color: var(--text);
      font-weight: 500;
    }
    .timeline-content span {
      font-size: 11px;
      color: var(--muted);
    }

  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon">A</div>
      Aether Admin
    </div>
    
    <div class="nav-menu">
      <a href="#" class="nav-item active">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        Dashboard
      </a>
      <a href="#" class="nav-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        Users
      </a>
      <a href="#" class="nav-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        analytics
      </a>
      <a href="#" class="nav-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        Settings
      </a>
      <a href="#" class="nav-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        Logs
      </a>
      <a href="#" class="nav-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        Help
      </a>
    </div>
  </aside>

  <!-- Main Content -->
  <div class="main-content">
    
    <!-- Topbar -->
    <header class="topbar">
      <div class="icon-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
      </div>
      <div class="icon-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span class="badge">8</span>
      </div>
      <div class="profile-btn">
        <img src="https://i.pravatar.cc/150?u=admin" alt="Profile">
        <span>Profile ▾</span>
      </div>
    </header>

    <!-- Workspace -->
    <div class="workspace">
      
      <!-- Left Column -->
      <div class="main-col">
        
        <div class="section-header">
          <h2 class="section-title">Analytics Overview</h2>
          <div>
            <div class="date-picker">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              2023 - 08/28
            </div>
            <select class="date-range-select">
              <option>Date Range</option>
            </select>
          </div>
        </div>

        <div class="analytics-grid">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Total Users <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
              <strong class="stat-value">30</strong>
            </div>
            <div class="stat-chart chart-purple">
              <svg viewBox="0 0 100 40"><path d="M0 30 Q 15 10, 30 25 T 60 10 T 100 20"/></svg>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Revenue <span style="color:#10b981; font-weight:700">aln</span></span>
              <strong class="stat-value">$138M</strong>
            </div>
            <div class="stat-chart chart-blue">
              <svg viewBox="0 0 100 40"><path d="M0 25 Q 20 35, 40 15 T 80 25 T 100 5"/></svg>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Active Sessions</span>
              <strong class="stat-value">47</strong>
            </div>
            <div class="stat-chart chart-cyan">
              <div class="bars">
                <div class="bar" style="height: 30%"></div>
                <div class="bar" style="height: 50%"></div>
                <div class="bar" style="height: 20%"></div>
                <div class="bar" style="height: 70%"></div>
                <div class="bar" style="height: 40%"></div>
                <div class="bar" style="height: 90%"></div>
                <div class="bar" style="height: 60%"></div>
                <div class="bar" style="height: 50%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-header" style="margin-bottom: 16px;">
            <h2 class="section-title" style="font-size: 16px;">User Management</h2>
            <button class="btn-neon">Add New User</button>
          </div>

          <div class="toolbar">
            <div class="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Search">
            </div>
            <div class="filters">
              <div class="filter-btn">All columnes ▾</div>
              <div class="filter-btn" style="border-color: rgba(255,255,255,0.1)">Filter ▾</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px"><input type="checkbox" style="accent-color: var(--primary)"></th>
                <th>Name ↑</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><input type="checkbox"></td>
                <td>
                  <div class="user-info">
                    <img src="https://i.pravatar.cc/150?u=1" alt="avatar">
                    Alex Rivers
                  </div>
                </td>
                <td>alesiters@gmail.com</td>
                <td>Admin</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>12/28/23</td>
                <td>
                  <div class="row-actions">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <svg class="trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </div>
                </td>
              </tr>
              <tr>
                <td><input type="checkbox"></td>
                <td>
                  <div class="user-info">
                    <img src="https://i.pravatar.cc/150?u=2" alt="avatar">
                    Mara Maich
                  </div>
                </td>
                <td>aovlices@gmail.com</td>
                <td>Editor</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>12/28/23</td>
                <td>
                  <div class="row-actions">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <svg class="trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </div>
                </td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.05);">
                <td><input type="checkbox" checked></td>
                <td>
                  <div class="user-info">
                    <img src="https://i.pravatar.cc/150?u=3" alt="avatar">
                    Alex Rivers
                  </div>
                </td>
                <td>ealitors@gmail.com</td>
                <td>User</td>
                <td><span class="status-badge status-pending">Pending</span></td>
                <td>12/25/23</td>
                <td>
                  <div class="row-actions">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <svg class="trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </div>
                </td>
              </tr>
              <tr>
                <td><input type="checkbox"></td>
                <td>
                  <div class="user-info">
                    <img src="https://i.pravatar.cc/150?u=4" alt="avatar">
                    Amrendem
                  </div>
                </td>
                <td>sowives@gmail.com</td>
                <td>User</td>
                <td><span class="status-badge status-inactive">Inactive</span></td>
                <td>12/29/23</td>
                <td>
                  <div class="row-actions">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <svg class="trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </div>
                </td>
              </tr>
              <tr>
                <td><input type="checkbox"></td>
                <td>
                  <div class="user-info">
                    <img src="https://i.pravatar.cc/150?u=5" alt="avatar">
                    Nina Shnox
                  </div>
                </td>
                <td>porron@gmail.com</td>
                <td>User</td>
                <td><span class="status-badge status-inactive">Inactive</span></td>
                <td>12/25/23</td>
                <td>
                  <div class="row-actions">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <svg class="trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="table-footer">
            <span style="color:var(--muted); font-size:13px">Show in 1 of 3</span>
            <div style="display:flex; gap:10px;">
              <button class="filter-btn">Previewons</button>
              <button class="btn-neon">Add New User</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="side-col">
        
        <div class="card" style="margin-bottom: 24px;">
          <h3 class="section-title" style="font-size:14px; margin-bottom:14px">System Status</h3>
          <div class="system-status">
            <div class="status-col">
              <div class="status-dot-large dot-purple"></div>
              API
            </div>
            <div class="status-col">
              <div class="status-dot-large dot-green"></div>
              Database
            </div>
            <div class="status-col">
              <div class="status-dot-large dot-cyan"></div>
              Server
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 class="section-title" style="font-size:14px; margin-bottom:14px">System Status</h3>
          <div class="vertical-status">
            <div class="v-status-row">
              <div class="status-dot-large dot-purple" style="width:8px;height:8px"></div>
              API
              <div class="status-dot-large dot-green" style="width:8px;height:8px"></div>
            </div>
            <div class="v-status-row">
              <div class="status-dot-large dot-cyan" style="width:8px;height:8px"></div>
              Database
              <div class="status-dot-large dot-green" style="width:8px;height:8px"></div>
            </div>
            <div class="v-status-row">
              <div class="status-dot-large dot-orange" style="width:8px;height:8px"></div>
              Server
              <div class="status-dot-large dot-green" style="width:8px;height:8px"></div>
            </div>
          </div>
        </div>

        <div class="card" style="flex: 1;">
          <h3 class="section-title" style="font-size:14px; display:flex; justify-content:space-between">
            Recent Activity
            <span>...</span>
          </h3>
          
          <div class="timeline">
            <div class="timeline-item">
               <div class="timeline-dot dot-cyan"></div>
               <div class="timeline-content">
                 <strong>Log upated</strong>
                 <span>Updated 7 days ago</span>
               </div>
            </div>
            <div class="timeline-item">
               <div class="timeline-dot dot-cyan"></div>
               <div class="timeline-content">
                 <strong>Log upated</strong>
                 <span>Updated 1 days ago</span>
               </div>
            </div>
            <div class="timeline-item">
               <div class="timeline-dot dot-purple"></div>
               <div class="timeline-content">
                 <strong>Logs updated</strong>
                 <span>Updated 3 days ago</span>
               </div>
            </div>
            <div class="timeline-item">
               <div class="timeline-dot dot-purple"></div>
               <div class="timeline-content">
                 <strong>Recent Activity</strong>
                 <span>Updated 1 days ago</span>
               </div>
            </div>
          </div>

          <div style="margin-top: auto; padding-top: 20px;">
            <button class="btn-cyan">Save Changes</button>
          </div>
        </div>
        
      </div>

    </div>
  </div>

</body>
</html>
"""

with open("aether_admin.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("Generated aether_admin.html")
