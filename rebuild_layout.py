import os

def rebuild_songs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    shell_idx = content.find('<div class="shell">')
    if shell_idx == -1: return False
    
    topbar_start = content.find('<div class="topbar">', shell_idx)
    topbar_actions_start = content.find('<div class="topbar-actions">', topbar_start)
    topbar_end = content.find('</div>\n\n    <section class="dashboard">', topbar_actions_start)
    if topbar_end == -1:
        topbar_end = content.find('</div>\n    <section class="dashboard">', topbar_actions_start)
        
    dashboard_start = content.find('<section class="dashboard">', topbar_end)
    sidebar_start = content.find('<aside class="sidebar">', dashboard_start)
    content_shell_start = content.find('<div class="content-shell">', sidebar_start)
    sidebar_end = content.find('</aside>', sidebar_start)
    
    brand_html = content[topbar_start + len('<div class="topbar">'):topbar_actions_start].strip()
    actions_html = content[topbar_actions_start:topbar_end].strip()
    sidebar_inner = content[sidebar_start + len('<aside class="sidebar">'):sidebar_end].strip()
    
    # We reconstruct the layout matching the image perfectly.
    # Image has: Sidebar (logo + panels), Topbar (actions), Main (tabs + workspace)
    new_wrapper = f'''<div class="saas-layout">
    <aside class="saas-sidebar">
        <div class="saas-brand">
            {brand_html}
        </div>
        <div class="saas-sidebar-content">
            {sidebar_inner}
        </div>
    </aside>
    <main class="saas-main">
        <header class="saas-topbar">
            <div class="saas-topbar-left">
                <!-- Search can be here or keep it inside -->
            </div>
            {actions_html}
        </header>
        <div class="saas-content">
'''
    
    prefix = content[:shell_idx]
    suffix = content[content_shell_start + len('<div class="content-shell">'):]
    suffix = suffix.replace('</section>', '</main>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(prefix + new_wrapper + suffix)
    return True

def rebuild_admin(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    wrap_idx = content.find('<main class="wrap">')
    if wrap_idx == -1: return False
    
    topbar_start = content.find('<div class="topbar">', wrap_idx)
    switcher_start = content.find('<div class="section-switcher"', topbar_start)
    
    # For admin_updates, the topbar contains the hero (title/stats) and topbar-side (buttons)
    topbar_inner = content[topbar_start + len('<div class="topbar">'):switcher_start].strip()
    
    # We will build a sidebar that matches songs.php visually.
    # Admin updates doesn't have a sidebar, so we give it one that acts as a navigation back to songs,
    # OR we can just put the hero stats in the sidebar!
    # Let's keep it simple: just brand + navigation.
    shared_sidebar = '''
        <div class="saas-brand">
            <div class="brand">
              <div class="brand-badge">WY</div>
              <div class="brand-copy">
                <h1>Ադմին Վահանակ</h1>
                <p>Կարգավորումներ և թարմացում</p>
              </div>
            </div>
        </div>
        <div class="saas-sidebar-content" style="padding: 20px;">
            <a class="btn btn-secondary" href="songs.php" style="width:100%; text-align:left; justify-content:flex-start; margin-bottom:10px;">Երգերի կառավարում</a>
            <a class="btn btn-danger" href="admin_logout.php" style="width:100%; text-align:left; justify-content:flex-start;">Դուրս գալ</a>
        </div>
    '''
    
    new_wrapper = f'''<div class="saas-layout">
    <aside class="saas-sidebar">
        {shared_sidebar}
    </aside>
    <main class="saas-main">
        <header class="saas-topbar">
            <div></div>
            <div class="topbar-actions">
                <span class="pill">Ադմին</span>
            </div>
        </header>
        <div class="saas-content">
            <div class="saas-page-header">
                {topbar_inner}
            </div>
'''
    prefix = content[:wrap_idx]
    suffix = content[switcher_start:]
    suffix = suffix.replace('</main>', '</div>\n    </main>\n</div>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(prefix + new_wrapper + suffix)
    return True

print("Rebuilding songs.php:", rebuild_songs('songs.php'))
print("Rebuilding admin_updates.php:", rebuild_admin('admin_updates.php'))
