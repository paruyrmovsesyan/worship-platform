// Utility for managing recent song searches in localStorage

const STORAGE_KEY = 'worship_recent_song_searches';
const MAX_RECENT_ITEMS = 6;

export const DEFAULT_SEARCH_SUGGESTIONS = [
  'Սուրբ',
  'Աստված',
  'Հիսուս',
  'Փառք',
  'Ալելույա',
  'Շնորհակալ ենք'
];

export function getRecentSongSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string' && item.trim()) : [];
  } catch {
    return [];
  }
}

export function saveRecentSongSearch(query) {
  if (!query || typeof query !== 'string') return;
  const clean = query.trim();
  if (clean.length < 2) return;

  try {
    const list = getRecentSongSearches();
    const updated = [clean, ...list.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save recent search:', err);
  }
}

export function removeRecentSongSearch(query) {
  if (!query) return [];
  try {
    const list = getRecentSongSearches();
    const clean = query.trim().toLowerCase();
    const updated = list.filter(item => item.toLowerCase() !== clean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSongSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return [];
}
