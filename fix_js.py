import re

with open('songs.php', 'r', encoding='utf-8') as f:
    content = f.read()

def safe_replace(old, new):
    global content
    content = content.replace(old, new)

# 1. Prevent crashes for missing elements
safe_replace("statLyricsSongs.textContent = String(withLyrics);", "if(statLyricsSongs) statLyricsSongs.textContent = String(withLyrics);")
safe_replace("statVisibleSongs.textContent = String(visibleCount);", "if(statVisibleSongs) statVisibleSongs.textContent = String(visibleCount);")
safe_replace("statCurrentMode.textContent = currentEditId !== null ? 'Խմբագրում' : 'Նոր երգ';", "if(statCurrentMode) statCurrentMode.textContent = currentEditId !== null ? 'Խմբագրում' : 'Նոր երգ';")
safe_replace("songsCount.textContent = `${totalCount} երգ`;", "if(songsCount) songsCount.textContent = `${totalCount} երգ`;")
safe_replace("tableInfo.textContent = `Ցուցադրվում է ${songs.length} երգ`;", "if(tableInfo) tableInfo.textContent = `Ցուցադրվում է ${songs.length} երգ`;")
safe_replace("updateLoadMoreState(totalCount, songs.length);", "if(typeof updateLoadMoreState === 'function') { try { updateLoadMoreState(totalCount, songs.length); } catch(e){} }")
safe_replace("editingBadge.textContent =", "if(editingBadge) editingBadge.textContent =")
safe_replace("updateStats(ALL_SONGS.length, totalCount);", """
  if(statTotalSongs) statTotalSongs.textContent = ALL_SONGS.length;
  let translations = ALL_SONGS.filter(s => s.title_ru || s.title_en).length;
  let trEl = document.getElementById('statTranslations');
  if(trEl) trEl.textContent = translations;
""")

# 2. Update renderTable
old_render = """  for (const s of songs) {
    const hasLyrics = !!(s.lyrics && s.lyrics.trim());
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.songId = s.id;
    tr.innerHTML = `
      <td>
        <div class="song-title" data-open-song="${s.id}">
          <strong>${escapeHtml(displayEditorSongTitle(s.title || '') || 'Անանուն')}</strong>
          <div class="song-meta">${escapeHtml(s.artist || 'Կատարող նշված չէ')}</div>
          <div class="mini-pills">
            <span class="mini-pill mobile-key-pill">${escapeHtml(s.song_key || '—')}</span>
            ${s.bpm ? `<span class="mini-pill">BPM ${escapeHtml(String(s.bpm))}</span>` : ''}
            <span class="mini-pill status-pill ${hasLyrics ? 'has-lyrics' : 'no-lyrics'}">${hasLyrics ? 'Բառերը առկա են' : 'Բառերը չկան'}</span>
            ${s.tags ? s.tags.split(',').filter(Boolean).slice(0, 3).map(tag => `<span class="mini-pill">${escapeHtml(tag.trim())}</span>`).join('') : '<span class="mini-pill">առանց տեգերի</span>'}
          </div>
        </div>
      </td>
      <td>
        <div class="mini-pills">
          <span class="mini-pill">${escapeHtml(s.song_key || '—')}</span>
          ${s.bpm ? `<span class="mini-pill">BPM ${escapeHtml(String(s.bpm))}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn-primary" type="button" data-action="edit" data-id="${s.id}">Խմբագրել</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${s.id}">Ջնջել</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }"""

new_render = """  for (const s of songs) {
    const hasLyrics = !!(s.lyrics && s.lyrics.trim());
    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.songId = s.id;
    
    // Aether design row
    tr.innerHTML = `
      <td><input type="checkbox"></td>
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
        <div style="display:flex; flex-direction:column; gap:2px;">
           <span style="font-size:13px">${escapeHtml(s.artist || 'Unknown Artist')}</span>
        </div>
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
        <div class="td-actions">
           <svg class="action-icon view" data-open-song="${s.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
           <svg class="action-icon edit" data-action="edit" data-id="${s.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
           <svg class="action-icon trash" data-action="delete" data-id="${s.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }"""

safe_replace(old_render, new_render)

# 3. Action icon fix: The existing code uses button[data-action] and [data-open-song]
# Our SVG icons also use these attributes, but `e.target.closest` should match SVG elements too.
safe_replace("const btn = e.target.closest('button[data-action]');", "const btn = e.target.closest('[data-action]');")

# 4. Bind new "Add New Song"
# Old newSongBtn was an ID, we still have id="newSongBtn", but editor/library panes might need fixing.
safe_replace("activateWorkspaceTab('editorPane');", """
  const edPane = document.getElementById('editorPane');
  const libPane = document.getElementById('libraryPane');
  if(edPane && libPane) {
      edPane.hidden = false;
      libPane.hidden = true;
  }
""")
safe_replace("activateWorkspaceTab('libraryPane');", """
  const edPane = document.getElementById('editorPane');
  const libPane = document.getElementById('libraryPane');
  if(edPane && libPane) {
      edPane.hidden = true;
      libPane.hidden = false;
  }
""")

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(content)

print("JS table render logic patched.")
