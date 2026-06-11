import os

def fix_missing_ids():
    with open('songs.php', 'r', encoding='utf-8') as f:
        content = f.read()

    # The string of missing elements
    missing_elements = '''
  <div style="display:none;" id="legacy-hidden-elements">
    <span id="editingBadge"></span>
    <span id="notice"></span>
    <button id="sidebarSearchBtn"></button>
    <button id="sidebarRefreshBtn"></button>
    <button id="sidebarClearBtn"></button>
    <span id="tableMetaPill"></span>
    <span id="statTotalSongs"></span>
    <span id="statLyricsSongs"></span>
    <span id="statVisibleSongs"></span>
    <span id="statCurrentMode"></span>
    <div id="workspacePanel"></div>
    <button id="installAdminAppBtn"></button>
  </div>
'''

    # Insert it right before the previewPane closing div, or just before </div>\n</main>
    # Actually, it's safer to just inject it right before `</div>\n  </main>`
    
    target_string = '</div>\n  </main>'
    idx = content.find(target_string)
    
    if idx != -1:
        new_content = content[:idx] + missing_elements + content[idx:]
        with open('songs.php', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully injected missing IDs into songs.php")
    else:
        print("Could not find target string in songs.php")

fix_missing_ids()
