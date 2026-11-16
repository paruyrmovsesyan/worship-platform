/**
 * Fast in-memory + localStorage cache helpers for instantaneous song viewing
 * and 0ms setlist swiping with pre-resolved target keys & capo.
 */

const songDetailMemoryMap = new Map();
const inFlightPrefetches = new Map();

let indexedSongsCacheRaw = null;
let indexedSongsCacheMap = new Map();

let indexedFavsCacheRaw = null;
let indexedFavsCacheMap = new Map();

function normalizeId(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str;
}

function getSongsListMap() {
  try {
    const raw = localStorage.getItem('wp_songs_cache');
    if (!raw) return indexedSongsCacheMap;
    if (raw !== indexedSongsCacheRaw) {
      const parsed = JSON.parse(raw);
      const nextMap = new Map();
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.id != null) {
            nextMap.set(String(item.id), item);
          }
        }
      }
      indexedSongsCacheRaw = raw;
      indexedSongsCacheMap = nextMap;
    }
  } catch {
    // ignore corrupt cache
  }
  return indexedSongsCacheMap;
}

export function getCachedFavoriteById(songId) {
  const sid = normalizeId(songId);
  if (!sid) return null;
  try {
    const raw = localStorage.getItem('wp_user_favorites_cache');
    if (!raw) return null;
    if (raw !== indexedFavsCacheRaw) {
      const parsed = JSON.parse(raw);
      const nextMap = new Map();
      if (Array.isArray(parsed)) {
        for (const fav of parsed) {
          const fid = normalizeId(fav?.song_id ?? fav?.id);
          if (fid) nextMap.set(fid, fav);
        }
      }
      indexedFavsCacheRaw = raw;
      indexedFavsCacheMap = nextMap;
    }
    return indexedFavsCacheMap.get(sid) || null;
  } catch {
    return null;
  }
}

export function getCachedSetlistData(setlistId) {
  const slId = normalizeId(setlistId);
  if (!slId) return null;
  try {
    const raw = localStorage.getItem(`wp_setlist_cache_${slId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getCachedSetlistItem(setlistId, songId, itemId = null) {
  const cached = getCachedSetlistData(setlistId);
  if (!cached || !Array.isArray(cached.items)) return null;

  const sid = normalizeId(songId);
  const iid = normalizeId(itemId);

  if (iid) {
    const byItem = cached.items.find(
      (i) => i && i.item_type !== 'section' && normalizeId(i.id) === iid
    );
    if (byItem) return byItem;
  }
  if (sid) {
    return (
      cached.items.find(
        (i) => i && i.item_type !== 'section' && normalizeId(i.song_id) === sid
      ) || null
    );
  }
  return null;
}

export function getCachedSetlistNav(setlistId, songId, itemId = null) {
  const cached = getCachedSetlistData(setlistId);
  if (!cached || !Array.isArray(cached.items)) return null;

  const songRows = cached.items.filter(
    (i) => i && i.item_type !== 'section' && i.song_id != null
  );
  if (songRows.length === 0) return null;

  const sid = normalizeId(songId);
  const iid = normalizeId(itemId);

  let index = -1;
  if (iid) {
    index = songRows.findIndex((row) => normalizeId(row.id) === iid);
  }
  if (index < 0 && sid) {
    index = songRows.findIndex((row) => normalizeId(row.song_id) === sid);
  }
  if (index < 0) return null;

  const normalizeRow = (row) => {
    if (!row) return null;
    return {
      item_id: Number(row.id),
      id: Number(row.song_id),
      title: String(row.song_title || row.title || ''),
      target_key: row.target_key || null,
      capo: row.capo != null && row.capo !== '' ? Number(row.capo) : null,
      position: Number(row.position || 0),
    };
  };

  const prev = index > 0 ? songRows[index - 1] : null;
  const current = songRows[index];
  const next = index < songRows.length - 1 ? songRows[index + 1] : null;

  return {
    setlist: cached.setlist
      ? { id: Number(cached.setlist.id || setlistId), name: cached.setlist.name || '' }
      : { id: Number(setlistId), name: '' },
    index: index + 1,
    total: songRows.length,
    prev: normalizeRow(prev),
    current: {
      ...normalizeRow(current),
      index: index + 1,
      setlist_id: Number(cached.setlist?.id || setlistId),
    },
    next: normalizeRow(next),
  };
}

export function saveCachedSongDetail(song, lang = 'hy') {
  if (!song || song.id == null) return;
  const sid = String(song.id);
  songDetailMemoryMap.set(`${lang}:${sid}`, song);
}

export function getCachedSongById(songId, { lang = 'hy', setlistId = null, setlistItemId = null } = {}) {
  const sid = normalizeId(songId);
  if (!sid) return null;

  const fromMem = songDetailMemoryMap.get(`${lang}:${sid}`);
  if (fromMem) return fromMem;

  const fromCatalog = getSongsListMap().get(sid);
  if (fromCatalog && (fromCatalog.chords !== undefined || fromCatalog.lyrics !== undefined)) {
    return fromCatalog;
  }

  if (setlistId) {
    const slItem = getCachedSetlistItem(setlistId, sid, setlistItemId);
    if (slItem && (slItem.chords !== undefined || slItem.lyrics !== undefined)) {
      return {
        id: Number(slItem.song_id || sid),
        title: slItem.song_title || slItem.title || '',
        artist: slItem.song_artist || slItem.artist || '',
        song_key: slItem.original_key || slItem.song_key || '',
        bpm: slItem.bpm || slItem.original_bpm || 0,
        tags: slItem.song_tags || slItem.tags || '',
        chords: slItem.chords || '',
        lyrics: slItem.lyrics || '',
        attachments: slItem.attachments || [],
      };
    }
  }

  return null;
}

export function prefetchSongById(songId, lang = 'hy') {
  const sid = normalizeId(songId);
  if (!sid) return;
  const cacheKey = `${lang}:${sid}`;
  if (songDetailMemoryMap.has(cacheKey) || inFlightPrefetches.has(cacheKey)) return;

  const req = fetch(`/api.php?id=${sid}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.id) {
        saveCachedSongDetail(data, lang);
      }
    })
    .catch(() => {})
    .finally(() => {
      inFlightPrefetches.delete(cacheKey);
    });

  inFlightPrefetches.set(cacheKey, req);
}
