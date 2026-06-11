import re

with open('songs.php', 'r', encoding='utf-8') as f:
    js = f.read()

# Make getActiveFiltersList safe
new_getActiveFiltersList = """
function getActiveFiltersList() {
  const items = [];
  if (searchI && searchI.value.trim()) items.push(`Որոնում: ${searchI.value.trim()}`);
  return items;
}
"""
js = re.sub(r'function getActiveFiltersList\(\) \{.*?(?=function renderActiveFilters)', new_getActiveFiltersList, js, flags=re.DOTALL)

# Make updateFiltersButtonState safe
new_updateFiltersButtonState = """
function updateFiltersButtonState() {
  if (toggleFiltersBtn) {
      const count = getActiveFiltersList().length;
      const open = filtersPanel ? !filtersPanel.hidden : false;
      toggleFiltersBtn.textContent = count > 0 ? `Ֆիլտրեր • ${count}` : 'Ֆիլտրեր';
      toggleFiltersBtn.setAttribute('aria-expanded', String(open));
  }
  if (activeFilters) renderActiveFilters();
  updateWorkspaceState();
}
"""
js = re.sub(r'function updateFiltersButtonState\(\) \{.*?(?=function updateWorkspaceState)', new_updateFiltersButtonState, js, flags=re.DOTALL)

# Make applySort safe
new_applySort = """
function applySort(list) {
  const sort = sortByI ? sortByI.value : 'newest';
  const copy = [...list];
  switch (sort) {
    case 'newest':
    default:
      copy.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      break;
  }
  return copy;
}
"""
js = re.sub(r'function applySort\(list\) \{.*?(?=function getFilteredSongs)', new_applySort, js, flags=re.DOTALL)

# Make getFilteredSongs safe
new_getFilteredSongs = """
function getFilteredSongs() {
  const q = searchI ? searchI.value.trim().toLowerCase() : '';
  const lyricsMode = lyricsFilterI ? lyricsFilterI.value : 'all';
  const keyFilter = keyFilterI ? keyFilterI.value.trim().toLowerCase() : '';
  const tagFilter = tagFilterI ? tagFilterI.value.trim().toLowerCase() : '';

  const filtered = ALL_SONGS.filter(song => {
    const haystack = [song.title, song.artist, song.tags, song.lyrics, song.chords, song.song_key, song.bpm].filter(Boolean).join(' ').toLowerCase();
    if (q && !haystack.includes(q)) return false;
    const hasLyrics = !!(song.lyrics && song.lyrics.trim());
    if (lyricsMode === 'with' && !hasLyrics) return false;
    if (lyricsMode === 'without' && hasLyrics) return false;
    if (keyFilter && !(song.song_key || '').toLowerCase().includes(keyFilter)) return false;
    if (tagFilter && !(song.tags || '').toLowerCase().includes(tagFilter)) return false;
    return true;
  });

  return applySort(filtered);
}
"""
js = re.sub(r'function getFilteredSongs\(\) \{.*?(?=function getVisibleSongs)', new_getFilteredSongs, js, flags=re.DOTALL)

# In init, remove filtersPanel.hidden = true;
new_init = """
(async function init() {
  try {
    if(typeof filtersPanel !== 'undefined' && filtersPanel) filtersPanel.hidden = true;
    updateFiltersButtonState();
    await fetchSongs();
    updateFiltersButtonState();
  } catch (err) {
    showNotice(err.message || 'Չհաջողվեց բեռնել տվյալները', 'error');
  } finally {
    if(typeof hideAdminPageLoader === 'function') hideAdminPageLoader(120);
  }
})();
"""
js = re.sub(r'\(async function init\(\) \{.*?\)\(\);', new_init, js, flags=re.DOTALL)

with open('songs.php', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS patched.")
