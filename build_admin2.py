import os
import re

def extract(filepath, start_pattern, end_pattern):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    start = 0
    end = len(lines)
    for i, l in enumerate(lines):
        if re.search(start_pattern, l):
            start = i
            break
    for i in range(start, len(lines)):
        if re.search(end_pattern, lines[i]):
            end = i
            break
    return "".join(lines[start:end])

with open('admin_updates.php', 'r', encoding='utf-8') as f:
    au_content = f.read()

# Replace redirects
au_content = au_content.replace("header('Location: /admin_updates.php');", "header('Location: /admin.php?tab=updates');")
au_content = au_content.replace('action="/admin_updates.php"', 'action="/admin.php?tab=updates"')

# Split AU
au_backend = ""
au_match = re.search(r'^(.*?\?>)\s*<!doctype html>', au_content, re.DOTALL)
if au_match:
    au_backend = au_match.group(1)

au_html = ""
au_html_match = re.search(r'<body[^>]*>(.*?)<script>', au_content, re.DOTALL | re.IGNORECASE)
if au_html_match:
    au_html = au_html_match.group(1)

au_js = ""
au_js_match = re.search(r'(<script>.*?</script>)\s*</body>', au_content, re.DOTALL | re.IGNORECASE)
if au_js_match:
    au_js = au_js_match.group(1)
    
au_css = ""
au_css_match = re.search(r'(<style>.*?</style>)', au_content, re.DOTALL | re.IGNORECASE)
if au_css_match:
    au_css = au_css_match.group(1)


with open('songs.php', 'r', encoding='utf-8') as f:
    s_content = f.read()

# Songs doesn't have post forms pointing to itself usually, it uses api.php
# But let's extract
s_html = ""
s_html_match = re.search(r'<body[^>]*>(.*?)<script', s_content, re.DOTALL | re.IGNORECASE)
if s_html_match:
    s_html = s_html_match.group(1)

# Songs has multiple scripts, so let's get everything from the first <script to </body>
s_js = ""
s_js_match = re.search(r'(<script.*?</script>)\s*</body>', s_content, re.DOTALL | re.IGNORECASE)
if s_js_match:
    s_js = s_js_match.group(1)

s_css = ""
s_css_match = re.search(r'(<style>.*?</style>)', s_content, re.DOTALL | re.IGNORECASE)
if s_css_match:
    s_css = s_css_match.group(1)


# We need to preserve the auth block at the top
top_auth = """<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
$access = wp_admin_require_access('/admin.php');
$adminUser = $access['user'];
$adminPermissions = $access['permissions'] ?? wp_version_default_admin_permissions();
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));

$currentTab = $_GET['tab'] ?? 'songs';
?>
"""

# The admin_updates backend logic should only run if tab=updates, OR we just let it run (it checks $_POST['form_action'])
# It's safe to just include au_backend without the leading <?php, but we must remove its own auth checks if it has them.
# Let's just strip the first few lines of au_backend until it defines $config = wp_version_load();
au_backend_clean = au_backend
au_backend_clean = re.sub(r'<\?php.*?\$adminEmail.*?;', '', au_backend_clean, flags=re.DOTALL)
au_backend_clean = re.sub(r'require_once __DIR__ \. \'/admin_access\.php\';\n\$access = wp_admin_require_access\(\'/admin_updates\.php\'\);', '', au_backend_clean)

# Now assemble
final_file = top_auth + "<?php\n" + au_backend_clean.replace("<?php", "") + """
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Worship Admin Dashboard</title>
  
  <style>
    :root {
      --sidebar-width: 280px;
      --bg: #05070d;
      --panel: rgba(13,20,35,.82);
      --text: #eef2ff;
      --primary: #4f7cff;
      --primary-2: #7aa2ff;
    }
    body {
      margin: 0; padding: 0;
      display: flex; height: 100vh; overflow: hidden;
      background: var(--bg); color: var(--text);
      font-family: Inter, sans-serif;
    }
    .admin-sidebar {
      width: var(--sidebar-width);
      background: linear-gradient(145deg, rgba(13,20,35,.96), rgba(7,12,24,.9));
      border-right: 1px solid rgba(255,255,255,0.05);
      padding: 24px; display: flex; flex-direction: column; gap: 10px;
    }
    .admin-main {
      flex: 1; height: 100vh; overflow-y: auto; position: relative;
    }
    .tab-pane { display: none; padding: 24px; }
    .tab-pane.active { display: block; }
    
    .nav-btn {
      padding: 14px 18px; border-radius: 12px; color: #9ca9c8;
      text-decoration: none; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 12px;
      border: 1px solid transparent; background: transparent; text-align: left;
    }
    .nav-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }
    .nav-btn.active {
      background: linear-gradient(135deg, rgba(79,124,255,0.15), rgba(79,124,255,0.05));
      border-color: rgba(79,124,255,0.2); color: #fff;
    }
    
    .topbar { display: none !important; }
    .shell, .wrap { max-width: 1400px; padding: 0; }
  </style>
  """ + s_css + au_css + """
</head>
<body>

  <aside class="admin-sidebar">
    <h2 style="margin-top:0;margin-bottom:30px;font-size:20px;">Worship Admin</h2>
    <button class="nav-btn <?= $currentTab === 'songs' ? 'active' : '' ?>" onclick="location.href='?tab=songs'">Երգերի բազա</button>
    <button class="nav-btn <?= $currentTab === 'updates' ? 'active' : '' ?>" onclick="location.href='?tab=updates'">Թարմացումներ և Կարգավորումներ</button>
    <div style="flex:1"></div>
    <button class="nav-btn" onclick="location.href='/admin_logout.php'" style="color:#ff6b7a">Դուրս գալ</button>
  </aside>
  
  <main class="admin-main">
    <div class="tab-pane <?= $currentTab === 'songs' ? 'active' : '' ?>">
      """ + s_html + """
    </div>
    
    <div class="tab-pane <?= $currentTab === 'updates' ? 'active' : '' ?>">
      """ + au_html + """
    </div>
  </main>
  
  """ + s_js + au_js + """
</body>
</html>
"""

with open('admin.php', 'w', encoding='utf-8') as f:
    f.write(final_file)
    
print("Successfully wrote admin.php")
