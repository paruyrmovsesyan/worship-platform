import { noteIndex } from './chordTransposer.js';

export function parseSongKey(value) {
  const text = String(value || '').trim().replace(/♭/g, 'b').replace(/♯/g, '#');
  const match = text.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!match) return null;

  return {
    root: match[1].toUpperCase() + match[2],
    suffix: match[3] || '',
  };
}

export function normalizeSongKey(value) {
  const parsed = parseSongKey(value);
  return parsed ? `${parsed.root}${parsed.suffix}` : '';
}

function modeValue(suffix) {
  const value = String(suffix || '').trim().toLowerCase();
  if (/^m(?!aj)/.test(value) || /^min/.test(value)) return 'minor';
  if (value === '' || /^maj/.test(value)) return 'major';
  return value;
}

export function songKeysEqual(first, second) {
  const a = parseSongKey(first);
  const b = parseSongKey(second);
  if (!a || !b) return String(first || '').trim() === String(second || '').trim();

  return noteIndex(a.root) === noteIndex(b.root) && modeValue(a.suffix) === modeValue(b.suffix);
}

export function semitoneOffset(fromKey, toKey) {
  const from = parseSongKey(fromKey);
  const to = parseSongKey(toKey);
  if (!from || !to) return null;

  const fromIndex = noteIndex(from.root);
  const toIndex = noteIndex(to.root);
  if (fromIndex === -1 || toIndex === -1) return null;

  let difference = toIndex - fromIndex;
  if (difference > 6) difference -= 12;
  if (difference < -5) difference += 12;
  return difference;
}
