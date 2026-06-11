with open('songs_legacy_backup.php', 'r', encoding='utf-8') as f:
    songs = f.read()
    
with open('admin_updates_legacy_backup.php', 'r', encoding='utf-8') as f:
    updates = f.read()

# For Songs, the actual app starts AFTER the endif;
# Let's find the second <!doctype html>
songs_parts = songs.split('<!doctype html>')
songs_app = '<!doctype html>' + songs_parts[2] # 0 is before first, 1 is gate, 2 is app

# Extract head, body, script from songs_app
songs_head = songs_app.split('</head>')[0].split('<head>')[1]
songs_body = songs_app.split('<body')[1].split('>', 1)[1].split('</body>')[0]
# The scripts in songs_body can stay as they are, no need to extract them if we render one at a time.

# For Updates
updates_head = updates.split('</head>')[0].split('<head>')[1]
updates_body = updates.split('<body')[1].split('>', 1)[1].split('</body>')[0]

# For Updates backend, it's everything before <!doctype html>
updates_backend = updates.split('<!doctype html>')[0]

# Now, wait! If I just conditionally render them in PHP, I don't need to load both in the DOM!
# This solves ALL JS and CSS conflicts!

# Create the unified file:
final_php = f"""<?php
declare(strict_types=1);
require_once __DIR__ . '/admin_access.php';
$access = wp_admin_require_access('/admin.php');
$adminUser = $access['user'];
$adminPermissions = $access['permissions'] ?? wp_version_default_admin_permissions();
$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));
$adminEmail = trim((string)($adminUser['email'] ?? ''));

$currentTab = $_GET['tab'] ?? 'songs';

if ($currentTab === 'updates') {{
    // Inject Updates Backend
    // Wait, the updates backend HAS its own admin_access check. We need to strip it to avoid redeclaration.
"""

updates_backend_clean = updates_backend
updates_backend_clean = updates_backend_clean.replace("<?php\ndeclare(strict_types=1);\n", "")
updates_backend_clean = updates_backend_clean.replace("require_once __DIR__ . '/admin_access.php';\n", "")
updates_backend_clean = updates_backend_clean.replace("$access = wp_admin_require_access('/admin_updates.php');\n", "")
updates_backend_clean = updates_backend_clean.replace("$adminUser = $access['user'];\n", "")
updates_backend_clean = updates_backend_clean.replace("$adminPermissions = $access['permissions'] ?? wp_version_default_admin_permissions();\n", "")
updates_backend_clean = updates_backend_clean.replace("$adminDisplayName = trim((string)($adminUser['name'] ?? 'Admin'));\n", "")
updates_backend_clean = updates_backend_clean.replace("$adminEmail = trim((string)($adminUser['email'] ?? ''));\n", "")
# Fix redirects in updates backend
updates_backend_clean = updates_backend_clean.replace("header('Location: /admin_updates.php');", "header('Location: /admin.php?tab=updates');")

final_php += "?>" + updates_backend_clean + "<?php\n}\n?>"

# Now the HTML shell
html_shell = """
<!doctype html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Worship Admin Dashboard</title>
  <?php if ($currentTab === 'songs'): ?>
""" + songs_head + """
  <?php else: ?>
""" + updates_head + """
  <?php endif; ?>
  
  <style>
    :root {
      --sidebar-width: 280px;
    }
    html, body {
      margin: 0; padding: 0; height: 100vh; overflow: hidden;
    }
    .admin-layout {
      display: flex; height: 100vh; width: 100vw; overflow: hidden;
      background: #05070d;
    }
    .admin-sidebar {
      width: var(--sidebar-width);
      background: linear-gradient(145deg, rgba(13,20,35,.96), rgba(7,12,24,.9));
      border-right: 1px solid rgba(255,255,255,0.05);
      padding: 24px; display: flex; flex-direction: column; gap: 10px;
      flex-shrink: 0; z-index: 9999;
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
    /* Hide old topbars if needed */
    .topbar { display: none !important; }
    .wrap, .shell { max-width: 1300px; }
  </style>
</head>
<body>
  <div class="admin-layout">
      <aside class="admin-sidebar">
        <h2 style="margin-top:0;margin-bottom:30px;font-size:20px;color:#fff;font-family:Inter,sans-serif;">Worship Admin</h2>
        <button class="nav-btn <?= $currentTab === 'songs' ? 'active' : '' ?>" onclick="location.href='?tab=songs'">Երգերի բազա</button>
        <button class="nav-btn <?= $currentTab === 'updates' ? 'active' : '' ?>" onclick="location.href='?tab=updates'">Կարգավորումներ</button>
        <div style="flex:1"></div>
        <button class="nav-btn" onclick="location.href='/admin_logout.php'" style="color:#ff6b7a">Դուրս գալ</button>
      </aside>
      
      <main class="admin-main">
        <?php if ($currentTab === 'songs'): ?>
""" + songs_body.replace('action="/songs.php"', 'action="/admin.php?tab=songs"') + """
        <?php else: ?>
""" + updates_body.replace('action="/admin_updates.php"', 'action="/admin.php?tab=updates"').replace("fetch('/admin_updates.php", "fetch('/admin.php?tab=updates") + """
        <?php endif; ?>
      </main>
  </div>
</body>
</html>
"""

with open('admin.php', 'w', encoding='utf-8') as f:
    f.write(final_php + html_shell)

print("Rebuilt admin.php perfectly via conditional rendering.")
