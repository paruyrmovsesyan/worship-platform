import os, re

def restructure_songs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find boundaries
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
    
    # Identify ends of sidebar
    sidebar_end = content.find('</aside>', sidebar_start)
    
    # Extract blocks
    brand_html = content[topbar_start + len('<div class="topbar">'):topbar_actions_start].strip()
    actions_html = content[topbar_actions_start:topbar_end].strip()
    sidebar_inner = content[sidebar_start + len('<aside class="sidebar">'):sidebar_end].strip()
    
    # Build new layout
    new_wrapper = f'''<div class="saas-layout">
    <aside class="saas-sidebar">
        {brand_html}
        <div class="sidebar-nav-container">
            {sidebar_inner}
        </div>
    </aside>
    <main class="saas-main">
        <header class="saas-topbar">
            <div class="saas-topbar-left">
                <div class="search-wrap-global">
                    <!-- Global search could go here -->
                </div>
            </div>
            {actions_html}
        </header>
        <div class="saas-content">
'''
    
    prefix = content[:shell_idx]
    # content_shell_start points to `<div class="content-shell">`
    suffix = content[content_shell_start + len('<div class="content-shell">'):]
    
    # Replace closing tags at the very end
    # Songs ends with:
    #       </div> <!-- /content-shell -->
    #     </section> <!-- /dashboard -->
    # </div> <!-- /shell -->
    
    suffix = suffix.replace('</section>', '</main>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(prefix + new_wrapper + suffix)
    return True

def restructure_admin(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # admin_updates has:
    # <main class="wrap">
    #   <div class="topbar">
    #      ...
    #   </div>
    #   <div class="section-switcher" ...>
    #   ...
    #   <div class="layout" id="adminLayout">
    
    wrap_idx = content.find('<main class="wrap">')
    if wrap_idx == -1: return False
    
    topbar_start = content.find('<div class="topbar">', wrap_idx)
    switcher_start = content.find('<div class="section-switcher"', topbar_start)
    
    topbar_inner = content[topbar_start + len('<div class="topbar">'):switcher_start].strip()
    
    # We will build a sidebar that just has a title and a link back to songs,
    # and put the switcher as "tabs" in the topbar.
    # Actually, the user wants the exact layout from the image. The image has a sidebar with main navigation.
    # Admin updates and Songs should share the same sidebar.
    
    shared_sidebar = '''
    <aside class="saas-sidebar">
        <div class="brand" style="padding: 20px;">
            <div class="brand-badge">WY</div>
            <div class="brand-copy">
                <h1>Ադմին Վահանակ</h1>
                <p>Միասնական համակարգ</p>
            </div>
        </div>
        <div class="saas-sidebar-nav">
            <a href="songs.php" class="nav-item">Երգերի կառավարում</a>
            <a href="admin_updates.php" class="nav-item active">Կարգավորումներ</a>
            <a href="admin_logout.php" class="nav-item" style="color:var(--danger)">Դուրս գալ</a>
        </div>
    </aside>
    '''
    
    new_wrapper = f'''<div class="saas-layout">
    {shared_sidebar}
    <main class="saas-main">
        <header class="saas-topbar">
            <div><!-- Search placeholder --></div>
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
    
    # Close tags at end
    # originally ended with </main>
    # we need to close .saas-content, .saas-main, .saas-layout
    # Wait, suffix currently contains the rest of the file which ends with </main>
    # So replacing </main> with </div></main></div> is correct.
    suffix = suffix.replace('</main>', '</div>\n    </main>\n</div>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(prefix + new_wrapper + suffix)
    return True

print("Restructuring songs.php:", restructure_songs('songs.php'))
print("Restructuring admin_updates.php:", restructure_admin('admin_updates.php'))
