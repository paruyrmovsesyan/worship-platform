import os

def restructure_html(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the bounds
    shell_idx = content.find('<div class="shell">')
    if shell_idx == -1:
        print(f"Shell not found in {filename}")
        return False
        
    topbar_start = content.find('<div class="topbar">', shell_idx)
    dashboard_start = content.find('<section class="dashboard">', topbar_start)
    sidebar_start = content.find('<aside class="sidebar">', dashboard_start)
    content_shell_start = content.find('<div class="content-shell">', sidebar_start)
    
    # We need to find the END of topbar and END of sidebar
    # The end of topbar is just before dashboard_start
    topbar_end = content.rfind('</div>', topbar_start, dashboard_start)
    sidebar_end = content.rfind('</aside>', sidebar_start, content_shell_start)
    
    if -1 in [topbar_start, dashboard_start, sidebar_start, content_shell_start, topbar_end, sidebar_end]:
        print(f"Could not find all markers in {filename}")
        return False
        
    topbar_content = content[topbar_start:topbar_end+6]
    sidebar_content = content[sidebar_start:sidebar_end+8]
    
    # Rebuild the top wrapper
    new_wrapper = f'''<div class="saas-layout">
  {sidebar_content}
  <main class="saas-main">
    {topbar_content}
    <div class="saas-content">'''
    
    # Replace from shell_idx to content_shell_start + length
    prefix = content[:shell_idx]
    suffix = content[content_shell_start + len('<div class="content-shell">'):]
    
    # We also need to close the tags at the very end of the document.
    # Currently it ends with:
    #       </div> <!-- /content-shell -->
    #     </section> <!-- /dashboard -->
    # </div> <!-- /shell -->
    # We need to change the closing tags.
    
    suffix = suffix.replace('</section>', '</main>')
    # This might be fragile, but let's test.
    
    with open(f"test_out_{filename}", 'w', encoding='utf-8') as f:
        f.write(prefix + new_wrapper + suffix)
    print(f"Successfully restructured {filename} to test file")
    return True

restructure_html('songs.php')
restructure_html('admin_updates.php')
