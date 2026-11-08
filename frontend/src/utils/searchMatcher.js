// Multi-language, phonetic & transliteration-aware search matching utility
// Supports relevance scoring, snippet extraction, and fuzzy Armenian transliteration

import { getLocalizedTitle } from './titleParser';

const ARM_TO_LAT_MAP = {
  'ա': 'a', 'բ': 'b', 'գ': 'g', 'դ': 'd', 'ե': 'e', 'զ': 'z', 'է': 'e', 'ը': 'e',
  'թ': 't', 'ժ': 'zh', 'ի': 'i', 'լ': 'l', 'խ': 'kh', 'ծ': 'ts', 'կ': 'k', 'հ': 'h',
  'ձ': 'dz', 'ղ': 'gh', 'ճ': 'ch', 'մ': 'm', 'յ': 'y', 'ն': 'n', 'շ': 'sh', 'ո': 'o',
  'չ': 'ch', 'պ': 'p', 'ջ': 'j', 'ռ': 'r', 'ս': 's', 'վ': 'v', 'տ': 't', 'ր': 'r',
  'ց': 'ts', 'ու': 'u', 'փ': 'p', 'ք': 'k', 'օ': 'o', 'ֆ': 'f', 'և': 'ev'
};

const LAT_TO_ARM_MAP = {
  'kh': 'խ', 'ts': 'ծ', 'zh': 'ժ', 'dz': 'ձ', 'gh': 'ղ', 'ch': 'չ', 'sh': 'շ', 'vo': 'ո', 'ye': 'ե', 'ev': 'և',
  'th': 'թ', 'ph': 'փ', 'tz': 'ծ', 'shch': 'շ',
  'a': 'ա', 'b': 'բ', 'g': 'գ', 'd': 'դ', 'e': 'ե', 'z': 'զ', 't': 'տ', 'i': 'ի',
  'l': 'լ', 'k': 'կ', 'h': 'հ', 'm': 'մ', 'y': 'յ', 'n': 'ն', 'o': 'օ', 'p': 'պ',
  'r': 'ր', 's': 'ս', 'v': 'վ', 'u': 'ու', 'f': 'ֆ', 'c': 'ց', 'j': 'ջ', 'q': 'ք', 'w': 'վ', 'x': 'խ'
};

const RU_TO_LAT_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

const COMMON_SYNONYMS = {
  'god': ['աստված', 'աստծո', 'աստծու', 'տեր'],
  'lord': ['տեր', 'տիրոջ', 'տիրոջը'],
  'jesus': ['հիսուս', 'յիսուս'],
  'ter': ['տեր', 'տիրոջ', 'տիրոջը'],
  'tiroch': ['տիրոջ', 'տիրոջը', 'տեր'],
  'տիրոջ': ['տեր', 'տիրոջը'],
  'տեր': ['տիրոջ', 'տիրոջը'],
  'աստված': ['աստծո', 'աստծու', 'աստծուն'],
  'աստծո': ['աստված', 'աստծու'],
  'աստծու': ['աստված', 'աստծո'],
  'հիսուս': ['յիսուս'],
  'յիսուս': ['հիսուս'],
  'սուրբ': ['սրբություն', 'սուրպ'],
  'ալելուիա': ['ալելույա'],
  'ալելույա': ['ալելուիա'],
  'փառք': ['փառաբանություն', 'գովաբանություն']
};

export function transliterateArmToLat(str) {
  if (!str) return '';
  return str.split('').map(ch => ARM_TO_LAT_MAP[ch] || ch).join('');
}

export function transliterateLatToArm(str) {
  if (!str) return '';
  let res = str.toLowerCase();
  res = res.replace(/shch/g, 'շ').replace(/kh/g, 'խ').replace(/ts/g, 'ծ').replace(/tz/g, 'ծ')
           .replace(/zh/g, 'ժ').replace(/dz/g, 'ձ').replace(/gh/g, 'ղ').replace(/ch/g, 'չ')
           .replace(/sh/g, 'շ').replace(/th/g, 'թ').replace(/ph/g, 'փ').replace(/vo/g, 'ո')
           .replace(/ye/g, 'ե').replace(/ev/g, 'և');
  return res.split('').map(ch => LAT_TO_ARM_MAP[ch] || ch).join('');
}

export function transliterateRuToLat(str) {
  if (!str) return '';
  return str.split('').map(ch => RU_TO_LAT_MAP[ch] || ch).join('');
}

export function normalizeSearchText(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/[՝՛՜՞․«»""''.,\-–—()!?:;\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phonetic folding collapses homophones and ambiguous consonants/vowels
 * into canonical sound tokens for ultra-forgiving Armenian/English/Russian matching.
 */
export function normalizePhonetic(text) {
  if (!text) return '';
  let s = text.toString().toLowerCase()
    .replace(/[՝՛՜՞․«»""''.,\-–—()!?:;\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Multi-letter phonetic groups
  s = s.replace(/hallelujah|alleluia|ալելուիա/g, 'ալելույա')
       .replace(/jesus|յիսուս/g, 'հիսուս')
       .replace(/shch|щ/g, '1')
       .replace(/sh|շ/g, '1')
       .replace(/ch|ճ|չ/g, '2')
       .replace(/kh|gh|x|խ|ղ/g, '3')
       .replace(/ts|tz|dz|c|ծ|ց|ձ/g, '4')
       .replace(/zh|ժ|j|ջ/g, '5')
       .replace(/th|ph|թ|տ|փ|պ|t|p/g, m => (m === 'ph' || m === 'փ' || m === 'պ' || m === 'p' ? 'P' : 'T'))
       .replace(/k|q|ք|կ/g, 'K')
       .replace(/r|ր|ռ/g, 'R')
       .replace(/v|w|վ/g, 'V')
       .replace(/oo|ou|ու|u/g, 'U')
       .replace(/ye|vo|ev|ե|է|ը|e/g, 'E')
       .replace(/o|օ|ո/g, 'O')
       .replace(/i|y|ի|յ|и|й|ы/g, 'I')
       .replace(/a|ա|а|я/g, 'A')
       .replace(/b|բ/g, 'B')
       .replace(/g|գ/g, 'G')
       .replace(/d|դ/g, 'D')
       .replace(/z|զ/g, 'Z')
       .replace(/l|լ/g, 'L')
       .replace(/m|մ/g, 'M')
       .replace(/n|ն/g, 'N')
       .replace(/s|ս/g, 'S')
       .replace(/h|հ/g, 'H');

  return s;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts a concise, readable snippet from song lyrics matching the query.
 * Filters out standalone chord lines and chord brackets.
 */
export function extractLyricsSnippet(lyrics, query) {
  if (!lyrics || !query) return null;
  const rawQ = query.trim();
  if (rawQ.length < 2) return null;

  const lines = lyrics.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const qNorm = normalizeSearchText(rawQ);
  const qPhonetic = normalizePhonetic(rawQ);
  const qTokens = qNorm.split(' ').filter(Boolean);

  for (const line of lines) {
    // Strip inline chord brackets like [Am], [G/B]
    const cleanLine = line.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanLine || cleanLine.length < 4) continue;
    
    // Skip chord-only lines
    if (/^[A-Ga-g#b0-9\/\s\-+]+$/.test(cleanLine) && !/[\u0530-\u058F\u0400-\u04FF\w]{4,}/.test(cleanLine)) {
      continue;
    }

    const lineNorm = normalizeSearchText(cleanLine);
    const linePhonetic = normalizePhonetic(cleanLine);

    // Direct substring or phonetic match
    const isDirectMatch = lineNorm.includes(qNorm);
    const isPhoneticMatch = linePhonetic.includes(qPhonetic);
    const isTokenMatch = qTokens.length > 1 && qTokens.every(tok => lineNorm.includes(tok));

    if (isDirectMatch || isPhoneticMatch || isTokenMatch) {
      if (cleanLine.length > 70) {
        let matchIdx = -1;
        if (isDirectMatch) matchIdx = lineNorm.indexOf(qNorm);
        if (matchIdx === -1 && isTokenMatch) matchIdx = lineNorm.indexOf(qTokens[0]);
        if (matchIdx === -1) matchIdx = 0;

        const start = Math.max(0, matchIdx - 20);
        const end = Math.min(cleanLine.length, matchIdx + rawQ.length + 35);
        return (start > 0 ? '...' : '') + cleanLine.slice(start, end).trim() + (end < cleanLine.length ? '...' : '');
      }
      return cleanLine;
    }
  }

  return null;
}

/**
 * Calculates a search score for a song based on relevance ranking.
 * Higher score = more relevant.
 * Returns: { matches: boolean, score: number, snippet: string | null, matchedField: string | null }
 */
export function scoreSongSearch(song, query, language = 'am') {
  if (!query || !query.trim()) {
    return { matches: true, score: 0, snippet: null, matchedField: null };
  }

  const rawQuery = query.trim();
  const qNorm = normalizeSearchText(rawQuery);
  if (!qNorm) {
    return { matches: true, score: 0, snippet: null, matchedField: null };
  }

  const qPhonetic = normalizePhonetic(qNorm);
  const qArm = transliterateLatToArm(qNorm);
  const qLat = transliterateArmToLat(qNorm);

  const localizedTitle = getLocalizedTitle(song, language) || song.title || '';
  const titleNorm = normalizeSearchText(localizedTitle);
  const titlePhonetic = normalizePhonetic(localizedTitle);

  const allTitles = [
    song.title,
    song.title_hy,
    song.title_lat,
    song.title_en,
    song.title_ru,
    localizedTitle
  ].filter(Boolean);

  const titleObjects = allTitles.map(t => ({
    text: t,
    norm: normalizeSearchText(t),
    phonetic: normalizePhonetic(t)
  }));

  const artist = song.artist || song.artist_hy || song.artist_en || song.artist_ru || '';
  const artistNorm = normalizeSearchText(artist);
  const artistPhonetic = normalizePhonetic(artist);

  const lyrics = song.lyrics || song.lyrics_hy || song.lyrics_ru || song.lyrics_en || '';
  const tags = song.tags ? normalizeSearchText(song.tags) : '';

  let score = 0;
  let matchedField = null;
  let snippet = null;

  // 1. Primary Title Evaluation
  if (titleNorm === qNorm || titlePhonetic === qPhonetic) {
    score = Math.max(score, 1200);
    matchedField = 'title';
  } else if (titleNorm.startsWith(qNorm) || titlePhonetic.startsWith(qPhonetic)) {
    score = Math.max(score, 850 + Math.max(0, 30 - localizedTitle.length));
    matchedField = 'title';
  } else if (
    new RegExp(`(?:^|\\s)${escapeRegex(qNorm)}(?:\\s|$)`, 'i').test(titleNorm) ||
    new RegExp(`(?:^|\\s)${escapeRegex(qPhonetic)}(?:\\s|$)`, 'i').test(titlePhonetic)
  ) {
    score = Math.max(score, 650 + Math.max(0, 30 - localizedTitle.length));
    matchedField = 'title';
  } else if (titleNorm.includes(qNorm) || titlePhonetic.includes(qPhonetic)) {
    score = Math.max(score, 450 + Math.max(0, 30 - localizedTitle.length));
    matchedField = 'title';
  }

  // 2. Alternative Title Evaluation
  for (const tObj of titleObjects) {
    if (tObj.norm === qNorm || tObj.phonetic === qPhonetic) {
      score = Math.max(score, 1100);
      matchedField = matchedField || 'title';
    } else if (tObj.norm.startsWith(qNorm) || tObj.phonetic.startsWith(qPhonetic)) {
      score = Math.max(score, 800);
      matchedField = matchedField || 'title';
    } else if (tObj.norm.includes(qNorm) || tObj.phonetic.includes(qPhonetic)) {
      score = Math.max(score, 420);
      matchedField = matchedField || 'title';
    } else if (qArm && tObj.norm.includes(qArm)) {
      score = Math.max(score, 400);
      matchedField = matchedField || 'title';
    } else if (qLat && tObj.norm.includes(qLat)) {
      score = Math.max(score, 400);
      matchedField = matchedField || 'title';
    }
  }

  // 3. Artist Evaluation
  if (artistNorm) {
    if (artistNorm === qNorm || artistPhonetic === qPhonetic) {
      score = Math.max(score, 360);
      matchedField = matchedField || 'artist';
    } else if (artistNorm.startsWith(qNorm) || artistPhonetic.startsWith(qPhonetic)) {
      score = Math.max(score, 290);
      matchedField = matchedField || 'artist';
    } else if (artistNorm.includes(qNorm) || artistPhonetic.includes(qPhonetic)) {
      score = Math.max(score, 220);
      matchedField = matchedField || 'artist';
    }
  }

  // 4. Multi-word Token Matches across Title + Artist
  const qTokens = qNorm.split(' ').filter(Boolean);
  if (qTokens.length > 1) {
    const combinedNorm = `${titleNorm} ${artistNorm}`;
    const combinedPhonetic = `${titlePhonetic} ${artistPhonetic}`;
    const allTokensMatch = qTokens.every(tok => {
      const tokP = normalizePhonetic(tok);
      return combinedNorm.includes(tok) || combinedPhonetic.includes(tokP);
    });
    if (allTokensMatch) {
      score = Math.max(score, 520);
      matchedField = matchedField || 'title';
    }
  }

  // 5. Tags Evaluation
  if (tags && (tags.includes(qNorm) || normalizePhonetic(tags).includes(qPhonetic))) {
    score = Math.max(score, 180);
    matchedField = matchedField || 'tags';
  }

  // 6. Lyrics Evaluation & Snippet Extraction
  if (lyrics) {
    const lyricsSnippet = extractLyricsSnippet(lyrics, rawQuery);
    if (lyricsSnippet) {
      score = Math.max(score, 120);
      snippet = lyricsSnippet;
      matchedField = matchedField || 'lyrics';
    }
  }

  // 7. Synonyms & Religious Terminology Expansion
  if (score === 0) {
    const synList = COMMON_SYNONYMS[qNorm] || COMMON_SYNONYMS[qArm] || COMMON_SYNONYMS[qLat] || [];
    for (const syn of synList) {
      const synNorm = normalizeSearchText(syn);
      const synPhonetic = normalizePhonetic(syn);

      for (const tObj of titleObjects) {
        if (tObj.norm.includes(synNorm) || tObj.phonetic.includes(synPhonetic)) {
          score = Math.max(score, 390);
          matchedField = 'title';
          break;
        }
      }

      if (lyrics && score === 0) {
        const synSnippet = extractLyricsSnippet(lyrics, syn);
        if (synSnippet) {
          score = Math.max(score, 90);
          snippet = synSnippet;
          matchedField = 'lyrics';
          break;
        }
      }
    }
  }

  return {
    matches: score > 0,
    score,
    snippet,
    matchedField
  };
}

/**
 * Backward-compatible matcher function. Returns boolean.
 */
export function matchSongSearch(song, query, language = 'am') {
  return scoreSongSearch(song, query, language).matches;
}

/**
 * Utility to split text into highlight chunks for UI rendering
 */
export function highlightText(text, query) {
  if (!text || !query) return [{ text, highlight: false }];
  const tokens = query.trim().split(/\s+/).filter(t => t.length > 0);
  if (!tokens.length) return [{ text, highlight: false }];

  const pattern = tokens.map(t => escapeRegex(t)).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return parts.filter(Boolean).map(part => ({
    text: part,
    highlight: regex.test(part)
  }));
}
