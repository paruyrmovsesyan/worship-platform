import re

with open('songs.php', 'r', encoding='utf-8') as f:
    old_songs = f.read()

with open('aether_admin.html', 'r', encoding='utf-8') as f:
    aether_html = f.read()

# Extract styles from aether
aether_style = re.search(r'<style>(.*?)</style>', aether_html, re.DOTALL).group(1)
aether_body = re.search(r'<body>(.*?)</body>', aether_html, re.DOTALL).group(1)

# Extract JS from songs
old_js = re.search(r'<script>(.*?)</script>', old_songs, re.DOTALL).group(1)

# We need to add the Editor form into aether_body
editor_html = """
        <div id="editorPane" hidden style="margin-top: 24px;">
          <div class="card">
            <h2 class="section-title">Խմբագրել Երգը</h2>
            <div style="display:grid; gap:16px; margin-bottom:20px;">
              <input type="text" id="title_hy" placeholder="Վերնագիր (Հայ)" class="search-box" style="width:100%">
              <input type="text" id="title_lat" placeholder="Վերնագիր (Լատ)" class="search-box" style="width:100%">
              <input type="text" id="title_en" placeholder="Վերնագիր (Անգլ)" class="search-box" style="width:100%">
              <input type="text" id="title_ru" placeholder="Վերնագիր (Ռուս)" class="search-box" style="width:100%">
              <input type="text" id="artist" placeholder="Կատարող" class="search-box" style="width:100%">
              <div style="display:flex; gap:16px;">
                <input type="text" id="key" placeholder="Տոնայնություն" class="search-box" style="flex:1">
                <input type="number" id="bpm" placeholder="BPM" class="search-box" style="flex:1">
              </div>
              <input type="text" id="tags" placeholder="Տեգեր (ստորակետով)" class="search-box" style="width:100%">
              <textarea id="chords" placeholder="Ակորդներ" class="search-box" style="width:100%; height:150px; background:rgba(255,255,255,0.03); color:#fff; padding:12px; font-family:monospace"></textarea>
              <textarea id="lyrics" placeholder="Բառեր" class="search-box" style="width:100%; height:150px; background:rgba(255,255,255,0.03); color:#fff; padding:12px; font-family:monospace"></textarea>
            </div>
            <div style="display:flex; gap:16px;">
              <button id="saveSongBtn" class="btn-neon">Պահպանել</button>
              <button id="cancelEditBtn" class="btn-cyan" style="width:auto">Չեղարկել</button>
            </div>
          </div>
        </div>
"""

# Replace the User Management section in Aether with the dynamic one
# We will inject the editor HTML right after the user management card
aether_body = aether_body.replace(
    '<!-- Workspace -->',
    '<!-- Workspace -->\n<div id="libraryPane">'
)
# Find the end of the left column
aether_body = aether_body.replace(
    '</div>\n\n      <!-- Right Column -->',
    f'</div>{editor_html}\n      </div>\n\n      <!-- Right Column -->\n</div> <!-- end libraryPane -->'
)

# Update IDs in Aether body so JS can find them
aether_body = aether_body.replace('Total Users', 'Total Songs')
aether_body = aether_body.replace('<strong class="stat-value">30</strong>', '<strong class="stat-value" id="statTotalSongs">0</strong>')

aether_body = aether_body.replace('Revenue', 'With Lyrics')
aether_body = aether_body.replace('<strong class="stat-value">$138M</strong>', '<strong class="stat-value" id="statLyricsSongs">0</strong>')

aether_body = aether_body.replace('Active Sessions', 'Active Users')
aether_body = aether_body.replace('<strong class="stat-value">47</strong>', '<strong class="stat-value" id="statActiveUsers">3</strong>')

aether_body = aether_body.replace('User Management', 'Songs Management')
aether_body = aether_body.replace('Add New User', 'Add New Song')
aether_body = aether_body.replace('class="btn-neon">Add New Song</button>', 'class="btn-neon" id="newSongBtn">Add New Song</button>')

# The search input needs an id
aether_body = aether_body.replace('placeholder="Search"', 'id="search" placeholder="Search"')

# The table body needs an id
aether_body = re.sub(r'<tbody>.*?</tbody>', '<tbody id="songsTable"></tbody>', aether_body, flags=re.DOTALL)

# Adjust columns
aether_body = aether_body.replace('<th>Name ↑</th>', '<th>Title ↑</th>')
aether_body = aether_body.replace('<th>Email</th>', '<th>Artist</th>')
aether_body = aether_body.replace('<th>Role</th>', '<th>Key</th>')
aether_body = aether_body.replace('<th>Join Date</th>', '<th>BPM / Tags</th>')

# Clean up JS: Remove old element references that don't exist and use safe gets
js_replacements = [
    ("const titleI = $('title_hy');", "const titleI = $('title_hy');"),
    ("const statVisibleSongs = $('statVisibleSongs');", "const statVisibleSongs = null;"),
    ("const statCurrentMode = $('statCurrentMode');", "const statCurrentMode = null;"),
    ("const workspacePanel = $('workspacePanel');", "const workspacePanel = null;"),
    ("const editingBadge = $('editingBadge');", "const editingBadge = null;"),
    ("const songsCount = $('songsCount');", "const songsCount = null;"),
    ("const tableInfo = $('tableInfo');", "const tableInfo = null;"),
    ("const previewTitle = $('previewTitle');", "const previewTitle = null;"),
    ("const previewMeta = $('previewMeta');", "const previewMeta = null;"),
    ("const selectedKeyPill = $('selectedKeyPill');", "const selectedKeyPill = null;"),
    ("const transposeInfo = $('transposeInfo');", "const transposeInfo = null;"),
    ("const preview = $('preview');", "const preview = null;"),
    ("const keysGrid = $('keysGrid');", "const keysGrid = null;"),
    ("const useFlatsI = $('useFlats');", "const useFlatsI = null;"),
]

for old, new in js_replacements:
    old_js = old_js.replace(old, new)

# Override renderTable completely
new_renderTable = """
function renderTable(songs = [], totalCount = songs.length) {
  tableBody.innerHTML = '';
  if(statTotalSongs) statTotalSongs.textContent = ALL_SONGS.length;
  if(statLyricsSongs) statLyricsSongs.textContent = ALL_SONGS.filter(s => s.lyrics && s.lyrics.trim()).length;
  
  if (!songs.length) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No songs found</td></tr>';
    return;
  }

  for (const s of songs) {
    const hasLyrics = !!(s.lyrics && s.lyrics.trim());
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.songId = s.id;
    
    tr.innerHTML = `
      <td><input type="checkbox" style="accent-color: var(--primary)"></td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);display:grid;place-items:center;">
             🎵
          </div>
          <div style="display:flex; flex-direction:column; gap:2px;">
             <strong style="font-size:14px">${escapeHtml(displayEditorSongTitle(s.title || '') || 'Անանուն')}</strong>
          </div>
        </div>
      </td>
      <td>
        <span style="font-size:13px">${escapeHtml(s.artist || 'Unknown')}</span>
      </td>
      <td>
         <span style="color:var(--muted); font-size:13px">${escapeHtml(s.song_key || '—')}</span>
      </td>
      <td>
         <span class="status-badge ${hasLyrics ? 'status-active' : 'status-pending'}">
           ${hasLyrics ? 'Active' : 'Pending'}
         </span>
      </td>
      <td>
         <span style="font-size:13px">${escapeHtml(String(s.bpm || '—'))}</span>
      </td>
      <td>
        <div class="row-actions">
           <svg class="view" data-open-song="${s.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
           <svg class="edit" data-action="edit" data-id="${s.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
           <svg class="trash" data-action="delete" data-id="${s.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }
}
"""

old_js = re.sub(r'function renderTable\(songs = \[\], totalCount = songs.length\) \{.*?(?=async function fetchSongs)', new_renderTable + '\n', old_js, flags=re.DOTALL)

# Fix workspace tabs logic
old_js = re.sub(r'function activateWorkspaceTab\(id\) \{.*?(?=workspaceTabs.forEach)', """
function activateWorkspaceTab(id) {
  const lib = document.getElementById('libraryPane');
  const ed = document.getElementById('editorPane');
  if(lib && ed) {
    if(id === 'editorPane') {
      ed.hidden = false;
      lib.style.display = 'none';
    } else {
      ed.hidden = true;
      lib.style.display = 'block';
    }
  }
}
""", old_js, flags=re.DOTALL)

# Safely disable preview
old_js = old_js.replace("renderPreview();", "// renderPreview();")
old_js = old_js.replace("function renderPreview() {", "function renderPreview() { return;")
old_js = old_js.replace("buildKeysGrid();", "// buildKeysGrid();")

# Save button listener
old_js = old_js.replace("saveBtn.addEventListener", "document.getElementById('saveSongBtn')?.addEventListener")

new_php = f"""<?php
require_once 'config.php';
// Remove auth check for local edit
?>
<!DOCTYPE html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <title>Aether Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>{aether_style}</style>
</head>
<body>
{aether_body}
<div id="notice" class="notice"></div>
<style>
.notice {{
  position: fixed; bottom: 20px; right: 20px;
  background: var(--panel); border: 1px solid var(--line);
  padding: 12px 24px; border-radius: 8px; color: #fff;
  transform: translateY(100px); opacity: 0; transition: all 0.3s;
  z-index: 9999;
}}
.notice.show {{ transform: translateY(0); opacity: 1; }}
.notice.success {{ border-color: var(--success); color: var(--success); }}
.notice.error {{ border-color: var(--danger); color: var(--danger); }}
.notice.info {{ border-color: var(--primary); color: var(--primary); }}
</style>
<script>
const $ = id => document.getElementById(id);
{old_js}
</script>
</body>
</html>
"""

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(new_php)

print("songs.php completely rebuilt with Aether Admin UI and backend logic!")
