const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const CHORD_REGEX = /(^|[\s([|])((?:[A-G](?:#|b)?)(?:maj7|maj9|maj|min7|min9|min|m7b5|m7|m9|m|dim7|dim|aug|sus2|sus4|sus7|sus|add9|add2|add4|add|no5|no3|2|4|5|6|7|9|11|13)?(?:\([#b0-9+\-]+\))?(?:\/[A-G](?:#|b)?)?)(?=[\s)\],:;|]|$)/g;

export function noteIndex(note) {
  if (note === 'Cb') return 11;
  if (note === 'Fb') return 4;
  let idx = SHARPS.indexOf(note);
  if (idx === -1) idx = FLATS.indexOf(note);
  if (note === 'B#') return 0;
  if (note === 'E#') return 5;
  return idx;
}

export function transposeRoot(root, semi, useFlats) {
  const i = noteIndex(root);
  if(i < 0) return root;
  const autoFlats = root.includes('b') && !root.includes('#');
  const flat = typeof useFlats === 'boolean' ? useFlats : autoFlats;
  const idx = (i + semi + 1200) % 12; // +1200 to handle negative modulo safely
  return flat ? FLATS[idx] : SHARPS[idx];
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function transposeChordToken(chordToken, semi, useFlats) {
  let main = chordToken;
  let bass = '';

  if (chordToken.includes('/')) {
    const parts = chordToken.split('/');
    main = parts[0];
    bass = parts[1] || '';
  }

  const rootMatch = main.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!rootMatch) return chordToken;

  const root = rootMatch[1];
  const type = rootMatch[2] || '';
  const newRoot = transposeRoot(root, semi, useFlats);
  const newBass = bass ? transposeRoot(bass, semi, useFlats) : '';

  return `${newRoot}${type}${newBass ? '/' + newBass : ''}`;
}

export function transposeChordText(text = '', semi = 0, useFlats = false) {
  if (!text) return '';
  if (semi === 0) return String(text);

  return String(text).replace(CHORD_REGEX, (match, prefix, chordToken) => {
    return `${prefix}${transposeChordToken(chordToken, semi, useFlats)}`;
  });
}

export function renderWithChords(text = '', semi = 0, useFlats = false) {
  if (!text) return '';
  const safeText = escapeHtml(transposeChordText(text, semi, useFlats));
  return safeText.replace(CHORD_REGEX, (match, prefix, chordToken) => {
    return `${prefix}<span class="chord">${chordToken}</span>`;
  });
}
