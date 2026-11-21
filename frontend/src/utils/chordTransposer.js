const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const CHORD_REGEX = /(^|[\s([|])((?:[A-G](?:#|b)?)(?:maj7|maj9|maj|min7|min9|min|m7b5|m7|m9|m|dim7|dim|aug(?:[0-9]+)?|\+(?:[0-9]+)?|sus2|sus4|sus7|sus|add9|add2|add4|add|no5|no3|2|4|5|6|7|9|11|13)?(?:\([#b0-9+-]+\))?(?:\/[A-G](?:#|b)?)?)(?=[\s)\],:;|]|$)/g;

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

export function stripStageNotes(text = '') {
  if (!text) return '';
  return String(text)
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('!'))
    .join('\n');
}

export function renderLyricsWithStageNotes(text = '') {
  if (!text) return '';
  return String(text)
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('!')) {
        const note = escapeHtml(trimmed.slice(1).trim());
        return `<span class="stage-cue-line">${note}</span>`;
      }
      return escapeHtml(line);
    })
    .join('\n');
}

export function renderWithChords(text = '', semi = 0, useFlats = false) {
  if (!text) return '';
  return String(text)
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('!')) {
        const note = escapeHtml(trimmed.slice(1).trim());
        return `<span class="stage-cue-line">${note}</span>`;
      }
      const safeLine = escapeHtml(transposeChordText(line, semi, useFlats));
      return safeLine.replace(CHORD_REGEX, (match, prefix, chordToken) => {
        return `${prefix}<span class="chord">${chordToken}</span>`;
      });
    })
    .join('\n');
}

const SECTION_KEYWORDS = /^(?:\[([^\]]+)\]|((?:Intro|Verse|Pre[- ]?Chorus|Chorus|Bridge|Outro|Tag|Ending|Interlude|Instrumental|Куплет|Припев|Предприпев|Бридж|Мост|Вступление|Кода|Տուն|Կրկներգ|Նախակրկներգ|Անցում|Կամուրջ|Ներածություն|Վերջաբան)\s*\d*\s*:?))$/i;

export function isPureChordLine(line = '') {
  const trimmed = String(line).trim();
  if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith('!')) return false;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;
  return tokens.every((tok) =>
    /^(?:[A-G](?:#|b)?(?:maj7|maj9|maj|min7|min9|min|m7b5|m7|m9|m|dim7|dim|aug(?:[0-9]+)?|\+(?:[0-9]+)?|sus2|sus4|sus7|sus|add9|add2|add4|add|no5|no3|2|4|5|6|7|9|11|13)?(?:\([#b0-9+-]+\))?(?:\/[A-G](?:#|b)?)?|[|/\\–-]+)$/.test(
      tok
    )
  );
}

/**
 * Parses pasted song text (ChordPro, Chords-above-lyrics, EasyWorship / ProPresenter plain text)
 * into clean metadata, formatted chords sheet, and clean lyrics.
 */
export function parseSmartSongText(raw = '') {
  const input = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!input) {
    return { title: '', artist: '', key: '', bpm: '', chords: '', lyrics: '', sectionCount: 0 };
  }

  let title = '';
  let artist = '';
  let key = '';
  let bpm = '';
  const bodyLines = [];

  for (const rawLine of input.split('\n')) {
    const trimmed = rawLine.trim();
    const metaMatch = trimmed.match(/^\{([a-zA-Z_]+)\s*:\s*(.+?)\}$/);
    if (metaMatch) {
      const k = metaMatch[1].toLowerCase();
      const v = metaMatch[2].trim();
      if (k === 'title' || k === 't') title = v;
      else if (k === 'artist' || k === 'subtitle' || k === 'st') artist = v;
      else if (k === 'key') key = v;
      else if (k === 'tempo' || k === 'bpm') bpm = v.replace(/\D+/g, '');
      continue;
    }

    const directiveMatch = trimmed.match(/^\{(?:c|comment|soc|eoc|sov|eov|sob|eob)\s*:?\s*(.*?)\}$/i);
    if (directiveMatch) {
      const label = directiveMatch[1].trim();
      if (label) bodyLines.push(`[${label}]`);
      else if (/^soc$/i.test(trimmed)) bodyLines.push('[Chorus]');
      continue;
    }

    bodyLines.push(rawLine);
  }

  // Convert ChordPro inline [Am]word lines -> two clean lines (chord line above lyric line)
  const normalizedChords = [];
  const cleanLyrics = [];
  let sectionCount = 0;

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      normalizedChords.push('');
      cleanLyrics.push('');
      continue;
    }

    const secMatch = trimmed.match(SECTION_KEYWORDS);
    if (secMatch) {
      const rawSec = (secMatch[1] || secMatch[2] || '').replace(/:$/, '').trim();
      const formattedSec = `[${rawSec}]`;
      normalizedChords.push(formattedSec);
      cleanLyrics.push(formattedSec);
      sectionCount += 1;
      continue;
    }

    if (trimmed.startsWith('!')) {
      normalizedChords.push(trimmed);
      continue;
    }

    if (/\[[A-G][#b]?[^\]]*\]/.test(line)) {
      let chordRow = '';
      let lyricRow = '';
      let lastIdx = 0;
      const re = /\[([A-G][#b]?[^\]]*)\]/g;
      let m;
      while ((m = re.exec(line)) !== null) {
        const textBefore = line.slice(lastIdx, m.index);
        lyricRow += textBefore;
        while (chordRow.length < lyricRow.length) chordRow += ' ';
        if (chordRow.length > lyricRow.length && !chordRow.endsWith(' ')) chordRow += ' ';
        chordRow += m[1];
        lastIdx = re.lastIndex;
      }
      lyricRow += line.slice(lastIdx);
      if (chordRow.trim()) normalizedChords.push(chordRow.replace(/\s+$/, ''));
      if (lyricRow.trim()) {
        normalizedChords.push(lyricRow);
        cleanLyrics.push(lyricRow);
      }
      continue;
    }

    normalizedChords.push(line);
    if (!isPureChordLine(line)) {
      cleanLyrics.push(line);
    }
  }

  const chordsOut = normalizedChords.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const lyricsOut = cleanLyrics.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!key) {
    const firstChordLine = chordsOut.split('\n').find((l) => isPureChordLine(l));
    if (firstChordLine) {
      const firstTok = firstChordLine.trim().split(/\s+/)[0];
      if (firstTok && /^[A-G]/.test(firstTok)) key = firstTok.replace(/[|/\\]+$/, '');
    }
  }

  return {
    title,
    artist,
    key,
    bpm,
    chords: chordsOut,
    lyrics: lyricsOut,
    sectionCount,
  };
}

/**
 * Extracts a compact Chords-Only ("Առանց բառերի") progression chart grouped by song sections.
 */
export function extractChordsOnlyChart(chordsText = '', semi = 0, useFlats = false) {
  if (!chordsText) return [];
  const transposed = semi === 0 ? String(chordsText) : transposeChordText(chordsText, semi, useFlats);
  const sections = [];
  let current = { label: 'Հիմնական', bars: [], cues: [] };

  for (const rawLine of transposed.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('!')) {
      current.cues.push(trimmed.slice(1).trim());
      continue;
    }

    const bracketHeader = trimmed.match(/^\[([^\]]+)\]$/);
    if (bracketHeader && !/^[A-G][#b]?(?:m|maj|min|dim|aug|sus|\d|\/|$)/.test(bracketHeader[1].trim())) {
      if (current.bars.length > 0 || current.cues.length > 0) {
        sections.push(current);
      }
      current = { label: bracketHeader[1].trim(), bars: [], cues: [] };
      continue;
    }

    const secMatch = trimmed.match(SECTION_KEYWORDS);
    if (secMatch) {
      if (current.bars.length > 0 || current.cues.length > 0) {
        sections.push(current);
      }
      current = { label: (secMatch[1] || secMatch[2] || '').replace(/:$/, '').trim(), bars: [], cues: [] };
      continue;
    }

    if (isPureChordLine(trimmed)) {
      const tokens = trimmed.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) current.bars.push(tokens);
      continue;
    }

    const inlineMatches = [];
    const inlineRe = /\[([A-G][#b]?[^\]]*)\]/g;
    let m;
    while ((m = inlineRe.exec(trimmed)) !== null) {
      inlineMatches.push(m[1]);
    }
    if (inlineMatches.length > 0) {
      current.bars.push(inlineMatches);
    }
  }

  if (current.bars.length > 0 || current.cues.length > 0) {
    sections.push(current);
  }
  return sections;
}
