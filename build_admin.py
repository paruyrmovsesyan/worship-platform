import os
import re

def extract_lines(filepath, start_pattern=None, end_pattern=None, start_line=None, end_line=None):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    start_idx = 0
    end_idx = len(lines)
    
    if start_line is not None:
        start_idx = start_line - 1
    elif start_pattern:
        for i, line in enumerate(lines):
            if re.search(start_pattern, line):
                start_idx = i
                break
                
    if end_line is not None:
        end_idx = end_line
    elif end_pattern:
        for i in range(start_idx, len(lines)):
            if re.search(end_pattern, lines[i]):
                end_idx = i
                break
                
    return "".join(lines[start_idx:end_idx])

# 1. Get PHP Backend from admin_updates.php
php_backend = extract_lines('admin_updates.php', start_line=1, end_line=1391)

# 2. Get Songs HTML (body content before script)
# From line 122 (<body...>) to 1795 (before <script>)
# Wait, songs.php body starts after </head>. Let's find it.
songs_body = extract_lines('songs.php', start_pattern=r'<body', end_pattern=r'<script>')
# Remove the <body> and </body> tags from songs_body if present
songs_body = re.sub(r'<body[^>]*>', '', songs_body)
songs_body = songs_body.replace('</body>', '')

# 3. Get Songs JS
songs_js = extract_lines('songs.php', start_pattern=r'<script>', end_pattern=r'</html>')
songs_js = songs_js.replace('</html>', '')

# 4. Get Admin Updates HTML (body content before script)
# Body starts somewhere after line 1392
admin_body = extract_lines('admin_updates.php', start_pattern=r'<body', end_pattern=r'<script>')
admin_body = re.sub(r'<body[^>]*>', '', admin_body)
admin_body = admin_body.replace('</body>', '')

# 5. Get Admin Updates JS
admin_js = extract_lines('admin_updates.php', start_pattern=r'<script>', end_pattern=r'</html>')
admin_js = admin_js.replace('</html>', '')

# 6. Build the new skeleton
skeleton = f"""{php_backend}
?>
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Worship Admin Dashboard</title>
  
  <!-- Shared Unified CSS -->
  <style>
    :root{{
      --bg:#06101c;
      --panel:rgba(13,20,35,.82);
      --panel-2:rgba(255,255,255,.04);
      --line:rgba(255,255,255,.08);
      --text:#eef2ff;
      --muted:#9ca9c8;
      --primary:#4f7cff;
      --primary-2:#7aa2ff;
      --success:#18a957;
      --warning:#ffb84d;
      --danger:#d24b5f;
      --radius:20px;
      --shadow:0 22px 60px rgba(0,0,0,.36);
      --sidebar-width: 280px;
    }}
    * {{ box-sizing:border-box; }}
    body {{
      margin: 0;
      font-family: Inter, system-ui, sans-serif;
      background: radial-gradient(circle at top left, rgba(79,124,255,.16), transparent 24%),
                  radial-gradient(circle at top right, rgba(24,169,87,.10), transparent 20%),
                  linear-gradient(180deg,#0a1426 0%, #05070d 100%);
      color: var(--text);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }}
    
    /* Layout */
    .admin-sidebar {{
      width: var(--sidebar-width);
      background: linear-gradient(145deg, rgba(13,20,35,.96), rgba(7,12,24,.9));
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      padding: 24px;
      backdrop-filter: blur(16px);
      z-index: 100;
    }}
    .admin-main {{
      flex: 1;
      height: 100%;
      overflow-y: auto;
      padding: 32px;
      position: relative;
    }}
    
    /* Sidebar Brand */
    .admin-brand {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 40px;
    }}
    .admin-brand-icon {{
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--primary), var(--primary-2));
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 18px; color: #fff;
    }}
    .admin-brand-text {{ font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
    
    /* Sidebar Navigation */
    .admin-nav {{ display: flex; flex-direction: column; gap: 8px; }}
    .admin-nav-item {{
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px;
      border-radius: 14px;
      color: var(--muted);
      text-decoration: none;
      font-size: 15px; font-weight: 600;
      transition: all 0.2s;
      cursor: pointer;
      border: 1px solid transparent;
    }}
    .admin-nav-item:hover {{
      background: rgba(255,255,255,0.04);
      color: var(--text);
    }}
    .admin-nav-item.active {{
      background: linear-gradient(135deg, rgba(79,124,255,0.15), rgba(79,124,255,0.05));
      border-color: rgba(79,124,255,0.2);
      color: #fff;
      box-shadow: inset 0 0 20px rgba(79,124,255,0.05);
    }}
    
    /* Tabs System */
    .tab-content {{ display: none; }}
    .tab-content.active {{ display: block; animation: fadeIn 0.3s ease; }}
    @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(10px); }} to {{ opacity: 1; transform: translateY(0); }} }}
    
    /* Topbar fallback for old html */
    .topbar {{ display: none !important; }}
    
    /* Reused utilities */
    .wrap {{ max-width: 1400px; margin: 0 auto; }}
    .panel {{ background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow); }}
    .btn {{ display: inline-flex; align-items: center; justify-content: center; padding: 12px 18px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.05); color: #fff; text-decoration: none; font-weight: 600; cursor: pointer; transition: 0.2s; }}
    .btn:hover {{ background: rgba(255,255,255,.08); }}
    .btn-primary {{ background: linear-gradient(135deg, var(--primary), var(--primary-2)); border-color: transparent; box-shadow: 0 8px 24px rgba(79,124,255,.25); }}
    .btn-primary:hover {{ box-shadow: 0 12px 32px rgba(79,124,255,.35); transform: translateY(-1px); }}
    
    /* Input styles */
    input, textarea, select {{
      width: 100%; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.04);
      color: var(--text); padding: 14px; outline: none; font: inherit; transition: 0.2s;
    }}
    input:focus, textarea:focus, select:focus {{
      border-color: var(--primary-2); box-shadow: 0 0 0 3px rgba(79,124,255,.15); background: rgba(255,255,255,.06);
    }}
    label {{ font-size: 13px; color: #a8b7dc; font-weight: 600; margin-bottom: 6px; display: block; }}
  </style>
  
  <!-- Re-inject CSS blocks from original files that might be missing -->
  <style>
    {extract_lines('songs.php', start_pattern=r'<style', end_pattern=r'</style>')}
  </style>
  <style>
    {extract_lines('admin_updates.php', start_pattern=r'<style', end_pattern=r'</style>')}
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside class="admin-sidebar">
    <div class="admin-brand">
      <div class="admin-brand-icon">W</div>
      <div class="admin-brand-text">Worship Admin</div>
    </div>
    
    <nav class="admin-nav">
      <a class="admin-nav-item active" data-tab="tab-songs">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
        Երգերի բազա
      </a>
      <a class="admin-nav-item" data-tab="tab-updates">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Թարմացումներ և Release
      </a>
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="admin-main">
  
    <div id="tab-songs" class="tab-content active">
      {songs_body}
    </div>
    
    <div id="tab-updates" class="tab-content">
      {admin_body}
    </div>
    
  </main>

  <!-- JS Section -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  
  <script>
    // Tab switching logic
    document.querySelectorAll('.admin-nav-item').forEach(item => {{
      item.addEventListener('click', e => {{
        document.querySelectorAll('.admin-nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        item.classList.add('active');
        const tabId = item.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      }});
    }});
  </script>

  <!-- Legacy Scripts -->
  {songs_js}
  {admin_js}

</body>
</html>
"""

with open('admin.php', 'w', encoding='utf-8') as f:
    f.write(skeleton)
    
print("Successfully wrote admin.php")
