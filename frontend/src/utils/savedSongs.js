import { noteIndex } from './chordTransposer.js';

export const DEFAULT_SAVED_SONG_SORT = 'saved_newest';

const validSorts = new Set([
  'saved_newest',
  'saved_oldest',
  'title_asc',
  'artist_asc',
  'key_asc',
  'bpm_asc',
  'bpm_desc',
]);

export function normalizeSavedSongSort(value) {
  return validSorts.has(value) ? value : DEFAULT_SAVED_SONG_SORT;
}

function savedTimestamp(song) {
  const timestamp = Date.parse(song?.favorite_created_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function bpmValue(song, missingValue) {
  const bpm = Number.parseInt(song?.bpm, 10);
  return Number.isFinite(bpm) && bpm > 0 ? bpm : missingValue;
}

function keyValue(song) {
  const key = String(song?.target_key || song?.song_key || '').trim();
  const match = key.match(/^([A-G](?:#|b)?)(.*)$/i);
  if (!match) return [99, 99, key];

  const root = noteIndex(match[1]);
  const suffix = match[2].toLowerCase();
  const mode = suffix.startsWith('m') && !suffix.startsWith('maj') ? 1 : 0;
  return [root === -1 ? 99 : root, mode, suffix];
}

export function sortSavedSongs(songs, sortBy, getTitle, locale = 'en') {
  const normalizedSort = normalizeSavedSongSort(sortBy);
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

  return [...songs].sort((a, b) => {
    let result = 0;

    if (normalizedSort === 'saved_newest') result = savedTimestamp(b) - savedTimestamp(a);
    if (normalizedSort === 'saved_oldest') result = savedTimestamp(a) - savedTimestamp(b);
    if (normalizedSort === 'title_asc') result = collator.compare(getTitle(a), getTitle(b));
    if (normalizedSort === 'artist_asc') result = collator.compare(a?.artist || '', b?.artist || '');
    if (normalizedSort === 'bpm_asc') result = bpmValue(a, Number.MAX_SAFE_INTEGER) - bpmValue(b, Number.MAX_SAFE_INTEGER);
    if (normalizedSort === 'bpm_desc') result = bpmValue(b, -1) - bpmValue(a, -1);

    if (normalizedSort === 'key_asc') {
      const aKey = keyValue(a);
      const bKey = keyValue(b);
      result = aKey[0] - bKey[0] || aKey[1] - bKey[1] || collator.compare(aKey[2], bKey[2]);
    }

    const aId = Number.parseInt(a?.id, 10) || 0;
    const bId = Number.parseInt(b?.id, 10) || 0;
    return result || aId - bId;
  });
}
