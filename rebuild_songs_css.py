import re

with open('songs.php', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Aether CSS inside the <style> block, right before </style>
aether_css = """
    /* Aether CSS Layout */
    .aether-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      overflow: hidden;
      padding: 24px;
      gap: 24px;
      box-sizing: border-box;
    }
    
    .aether-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 12px;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .header-icon-btn {
      color: var(--muted);
      cursor: pointer;
      position: relative;
    }
    
    .header-icon-btn:hover {
      color: var(--text);
    }
    
    .header-icon-btn .badge {
      position: absolute;
      top: -6px;
      right: -8px;
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
    
    .header-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    
    .header-profile img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.1);
    }
    
    .aether-workspace {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
      flex: 1;
      min-height: 0;
    }
    
    .aether-main-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
      padding-right: 12px;
    }
    
    .aether-side-col {
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow-y: auto;
      padding-right: 12px;
    }
    
    .aether-main-col::-webkit-scrollbar,
    .aether-side-col::-webkit-scrollbar {
      width: 6px;
    }
    .aether-main-col::-webkit-scrollbar-thumb,
    .aether-side-col::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
    }
    
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 0;
    }
    
    .date-picker {
      padding: 8px 14px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      font-size: 13px;
      color: var(--muted);
      backdrop-filter: blur(10px);
    }
    
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    
    .analytic-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      backdrop-filter: blur(10px);
    }
    
    .analytic-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .analytic-label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 500;
    }
    
    .analytic-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
    }
    
    .analytic-chart {
      width: 80px;
      height: 40px;
      display: flex;
      align-items: flex-end;
    }
    
    .chart-green .bars {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      width: 100%;
      height: 100%;
    }
    .chart-green .bar {
      flex: 1;
      background: var(--success);
      border-radius: 2px 2px 0 0;
      opacity: 0.8;
    }
    
    .management-panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      padding: 20px;
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .toolbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    
    .search-box {
      flex: 1;
      max-width: 300px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--primary-glow);
      border-radius: 999px;
      padding: 8px 16px;
    }
    
    .search-box svg {
      color: var(--primary);
    }
    
    .search-box input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 14px;
      outline: none;
      width: 100%;
    }
    
    .filters {
      display: flex;
      gap: 10px;
    }
    
    .filter-select {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
      color: var(--muted);
      border-radius: 999px;
      padding: 8px 16px;
      outline: none;
      cursor: pointer;
    }
    
    .table-wrap {
      border-radius: var(--radius-md);
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      text-align: left;
      padding: 12px 16px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      border-bottom: 1px solid var(--line);
      background: rgba(0,0,0,0.2);
    }
    
    td {
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      font-size: 14px;
      vertical-align: middle;
    }
    
    .status-badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid currentColor;
      display: inline-flex;
    }
    .status-active { color: var(--success); background: rgba(52, 211, 153, 0.1); }
    .status-pending { color: var(--warning); background: rgba(251, 191, 36, 0.1); }
    
    .td-actions {
      display: flex;
      gap: 10px;
    }
    
    .action-icon {
      color: var(--muted);
      cursor: pointer;
      transition: color 0.2s;
    }
    .action-icon:hover { color: var(--primary); }
    .action-icon.trash:hover { color: var(--danger); }
    
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
    }
    
    .footer-actions {
      display: flex;
      gap: 10px;
    }
    
    .neon-btn {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border: none;
      color: #000;
      font-weight: 700;
      border-radius: var(--radius-sm);
      padding: 10px 20px;
      cursor: pointer;
      box-shadow: 0 4px 20px var(--primary-glow);
    }
    
    .status-card, .activity-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 20px;
      backdrop-filter: blur(10px);
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 14px;
      color: var(--muted);
    }
    
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
    }
    .status-dot.purple { background: var(--accent); box-shadow: 0 0 10px var(--accent); }
    .status-dot.cyan { background: var(--primary); box-shadow: 0 0 10px var(--primary); }
    .status-dot.orange { background: var(--warning); box-shadow: 0 0 10px var(--warning); }
    .status-dot.green { background: var(--success); box-shadow: 0 0 10px var(--success); }
    
    .ml-auto { margin-left: auto; }
    
    .timeline-item {
      display: flex;
      gap: 16px;
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
      margin-top: 6px;
      position: relative;
      z-index: 2;
    }
    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .timeline-content strong {
      font-size: 14px;
    }
    .timeline-content span {
      font-size: 12px;
      color: var(--muted);
    }
    
    .mt-4 { margin-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
"""

new_content = content.replace("</style>", aether_css + "\n</style>")

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Injected Aether CSS into songs.php")
