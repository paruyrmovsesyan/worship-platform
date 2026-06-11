import re

with open('songs_legacy_backup.php', 'r', encoding='utf-8') as f:
    songs = f.read()

with open('admin_updates_legacy_backup.php', 'r', encoding='utf-8') as f:
    updates = f.read()

sidebar_css = """
    :root {
      --sidebar-width: 280px;
    }
    body {
      display: flex !important;
      align-items: stretch !important;
      margin: 0; padding: 0;
      height: 100vh; overflow: hidden;
      background: #05070d !important;
    }
    .admin-sidebar {
      width: var(--sidebar-width);
      background: linear-gradient(145deg, rgba(13,20,35,.96), rgba(7,12,24,.9));
      border-right: 1px solid rgba(255,255,255,0.05);
      padding: 24px; display: flex; flex-direction: column; gap: 10px;
      flex-shrink: 0;
    }
    .admin-main {
      flex: 1; height: 100vh; overflow-y: auto; position: relative;
      background: var(--bg);
    }
    .nav-btn {
      padding: 14px 18px; border-radius: 12px; color: #9ca9c8;
      text-decoration: none; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 12px;
      border: 1px solid transparent; background: transparent; text-align: left;
      font-size: 15px; font-family: Inter, sans-serif;
    }
    .nav-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }
    .nav-btn.active {
      background: linear-gradient(135deg, rgba(79,124,255,0.15), rgba(79,124,255,0.05));
      border-color: rgba(79,124,255,0.2); color: #fff;
    }
    .topbar { display: none !important; }
"""

def inject_sidebar(html_content, current_tab):
    # Inject CSS
    html_content = re.sub(r'(<style>)', r'\1' + sidebar_css, html_content, 1, re.IGNORECASE)
    
    # Inject Sidebar into body
    sidebar_html = f"""
    <aside class="admin-sidebar">
      <h2 style="margin-top:0;margin-bottom:30px;font-size:20px;color:#fff;font-family:Inter,sans-serif;">Worship Admin</h2>
      <button class="nav-btn {'active' if current_tab == 'songs' else ''}" onclick="location.href='/songs.php'">Երգերի բազա</button>
      <button class="nav-btn {'active' if current_tab == 'updates' else ''}" onclick="location.href='/admin_updates.php'">Կարգավորումներ</button>
      <div style="flex:1"></div>
      <button class="nav-btn" onclick="location.href='/admin_logout.php'" style="color:#ff6b7a">Դուրս գալ</button>
    </aside>
    <main class="admin-main">
    """
    
    # In songs.php, we have TWO bodies. We only want to inject into the actual app body, not the gate HTML.
    # Wait, if we inject into both, it's also fine. But we can just inject into the LAST <body
    
    parts = html_content.rsplit('<body', 1)
    if len(parts) > 1:
        # Reassemble
        body_start, body_rest = parts[1].split('>', 1)
        html_content = parts[0] + '<body' + body_start + '>' + sidebar_html + body_rest
    else:
        # Fallback if only one body
        html_content = re.sub(r'(<body[^>]*>)', r'\1' + sidebar_html, html_content, 1, re.IGNORECASE)
    
    # Close the <main> before </body>
    html_content = re.sub(r'(</body>)', r'</main>\1', html_content, 1, re.IGNORECASE)
    return html_content

songs_final = inject_sidebar(songs, 'songs')
updates_final = inject_sidebar(updates, 'updates')

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(songs_final)

with open('admin_updates.php', 'w', encoding='utf-8') as f:
    f.write(updates_final)

with open('admin.php', 'w', encoding='utf-8') as f:
    f.write("<?php header('Location: /songs.php'); exit; ?>")

print("Generated MPA files successfully.")
