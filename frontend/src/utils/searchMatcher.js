// Multi-language, phonetic, transliteration & layout-aware search matching utility
// Advanced support for Armenian, Russian, and English songs, titles, lyrics, and artists.

import { getLocalizedTitle, parseSongTitleVariants } from './titleParser.js';

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
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

const LAT_TO_RU_MAP = {
  'a': 'а', 'b': 'б', 'v': 'в', 'w': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з',
  'i': 'и', 'j': 'й', 'y': 'и', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
  'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'ц',
  'q': 'к', 'x': 'кс'
};

// Qwerty <-> Russian keyboard layout mapping for accidental wrong-layout typing
const QWERTY_TO_RU_MAP = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ',
  'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', "'": 'э',
  'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю', '`': 'ё'
};

const RU_TO_QWERTY_MAP = {};
for (const [k, v] of Object.entries(QWERTY_TO_RU_MAP)) {
  RU_TO_QWERTY_MAP[v] = k;
}

export function convertQwertyToCyrillic(str) {
  if (!str) return '';
  return str.toLowerCase().split('').map(c => QWERTY_TO_RU_MAP[c] || c).join('');
}

export function convertCyrillicToQwerty(str) {
  if (!str) return '';
  return str.toLowerCase().split('').map(c => RU_TO_QWERTY_MAP[c] || c).join('');
}

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

export function transliterateLatToRu(str) {
  if (!str) return '';
  let s = str.toLowerCase();
  s = s.replace(/shch/g, 'щ')
       .replace(/kh/g, 'х')
       .replace(/ts/g, 'ц')
       .replace(/tz/g, 'ц')
       .replace(/ch/g, 'ч')
       .replace(/sh/g, 'ш')
       .replace(/zh/g, 'ж')
       .replace(/yu/g, 'ю')
       .replace(/ya/g, 'я')
       .replace(/yo/g, 'ё')
       .replace(/ye/g, 'е')
       .replace(/iy$/g, 'ий')
       .replace(/yi/g, 'ый');

  return s.split('').map(ch => LAT_TO_RU_MAP[ch] || ch).join('');
}

export function stemRussian(word) {
  if (!word || word.length < 4) return word;
  const w = word.toLowerCase();
  const endings = [
    'ому', 'ему', 'ыми', 'ими', 'ого', 'его', 'ому', 'ему',
    'ами', 'ями', 'ей', 'ой', 'ем', 'ом', 'ах', 'ях', 'ов', 'ев',
    'ия', 'ие', 'ии', 'ью', 'ий', 'ый', 'ой', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие',
    'ать', 'ить', 'еть', 'ешь', 'ете', 'ут', 'ют', 'ат', 'ят', 'ил', 'ла', 'ли',
    'а', 'я', 'у', 'ю', 'о', 'е', 'и', 'ы', 'ь', 'ъ'
  ];
  for (const end of endings) {
    if (w.endsWith(end) && (w.length - end.length) >= 3) {
      return w.slice(0, -end.length);
    }
  }
  return w;
}

export function stemEnglish(word) {
  if (!word || word.length < 4) return word;
  const w = word.toLowerCase().replace(/'s$/g, '');
  if (w.endsWith('ness') && w.length >= 7) return w.slice(0, -4);
  if (w.endsWith('ful') && w.length >= 6) return w.slice(0, -3);
  if (w.endsWith('ing') && w.length >= 6) return w.slice(0, -3);
  if (w.endsWith('ies') && w.length >= 6) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length >= 5) return w.slice(0, -2);
  if (w.endsWith('ed') && w.length >= 5) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length >= 4) return w.slice(0, -1);
  return w;
}

export function normalizeSearchText(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/[՝՛՜՞․«»""''.,\-–—()!?:;\/\\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Multi-lingual phonetic folding collapsing Armenian, Russian, and English
 * into canonical sound tokens for forgiving cross-language matching.
 */
export function normalizePhonetic(text) {
  if (!text) return '';
  let s = text.toString().toLowerCase()
    .replace(/[՝՛՜՞․«»""''.,\-–—()!?:;\/\\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Multi-letter religious aliases & phonetic groups
  s = s.replace(/hallelujah|alleluia|аллилуйя|ալելուիա/g, 'ալելույա')
       .replace(/jesus|иисус|յիսուս/g, 'հիսուս')
       .replace(/ya|я/g, 'ia')
       .replace(/yu|ю/g, 'iu')
       .replace(/yo|ё/g, 'io')
       .replace(/shch|щ/g, '1')
       .replace(/sh|ш|շ/g, '1')
       .replace(/ch|ч|ճ|չ/g, '2')
       .replace(/kh|gh|x|х|խ|ղ/g, '3')
       .replace(/ts|tz|dz|c|ц|ծ|ց|ձ/g, '4')
       .replace(/zh|ж|ժ|j|ջ/g, '5')
       .replace(/th|ph|թ|տ|փ|պ|t|p|т|п|ф/g, m => (m === 'ph' || m === 'փ' || m === 'պ' || m === 'p' || m === 'п' || m === 'ф' ? 'P' : 'T'))
       .replace(/k|q|ქ|կ|к/g, 'K')
       .replace(/r|ր|ռ|р/g, 'R')
       .replace(/v|w|վ|в/g, 'V')
       .replace(/oo|ou|ու|u|у/g, 'U')
       .replace(/ye|vo|ev|ե|է|ը|e|е|э/g, 'E')
       .replace(/o|օ|ո|о/g, 'O')
       .replace(/i|y|ի|յ|и|й|ы/g, 'I')
       .replace(/a|ա|а/g, 'A')
       .replace(/b|բ|б/g, 'B')
       .replace(/g|գ|г/g, 'G')
       .replace(/d|դ|д/g, 'D')
       .replace(/z|զ|з/g, 'Z')
       .replace(/l|լ|л/g, 'L')
       .replace(/m|մ|м/g, 'M')
       .replace(/n|ն|н/g, 'N')
       .replace(/s|ս|с/g, 'S')
       .replace(/h|հ/g, 'H')
       .replace(/[ьъ]/g, '');

  return s;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts all title variations from a song object:
 * - full title string
 * - separate language fields (hy, lat, en, ru)
 * - slash-separated and pipe-separated sub-parts
 * - parenthetical notes (e.g. "(Bless The Lord)")
 * - number variations (e.g. "10,000" vs "10000")
 */
export function extractTitleCandidates(song) {
  if (!song) return [];
  const rawList = [
    song.title,
    song.song_title,
    song.title_hy,
    song.title_lat,
    song.title_en,
    song.title_ru
  ].filter(Boolean);

  const candidates = new Set();

  for (const raw of rawList) {
    const s = String(raw).trim();
    if (!s) continue;
    candidates.add(s);

    // Split by slash, pipe, semicolon
    const slashParts = s.split(/[\/\|;]/).map(p => p.trim()).filter(Boolean);
    for (const p of slashParts) {
      candidates.add(p);
    }

    // Extract without parentheses
    const withoutParens = s.replace(/\([^)]+\)|\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutParens && withoutParens !== s) {
      candidates.add(withoutParens);
    }

    // Extract inner parentheses like (Bless The Lord)
    const parenMatches = s.match(/\(([^)]+)\)|\[([^\]]+)\]/g);
    if (parenMatches) {
      for (const pm of parenMatches) {
        const inner = pm.slice(1, -1).trim();
        if (inner && inner.length >= 2) {
          candidates.add(inner);
        }
      }
    }

    // Numbers without commas (10,000 -> 10000)
    if (/\d+,\d+/.test(s)) {
      candidates.add(s.replace(/,/g, ''));
    }
  }

  // Also include variants parsed by titleParser
  if (song.title) {
    const variants = parseSongTitleVariants(song.title);
    if (variants.hy) candidates.add(variants.hy);
    if (variants.en) candidates.add(variants.en);
    if (variants.ru) candidates.add(variants.ru);
    if (variants.lat) candidates.add(variants.lat);
  }

  return Array.from(candidates);
}

// Comprehensive cross-lingual worship terminology and song title synonyms
const COMMON_SYNONYMS = {
  // God / Lord
  'god': ['աստված', 'աստծո', 'աստծու', 'տեր', 'бог', 'бога', 'богу', 'господь', 'lord'],
  'lord': ['տեր', 'տիրոջ', 'տիրոջը', 'աստված', 'господь', 'бог', 'god'],
  'jesus': ['հիսուս', 'յիսուս', 'քրիստոս', 'иисус', 'иисуса', 'христос', 'christ'],
  'christ': ['քրիստոս', 'հիսուս', 'христос', 'иисус', 'jesus'],
  'бог': ['աստված', 'աստծո', 'господь', 'бога', 'богу', 'god', 'lord'],
  'господь': ['տեր', 'տիրոջ', 'бог', 'господа', 'lord', 'god'],
  'иисус': ['հիսուս', 'յիսուս', 'христос', 'jesus', 'christ'],
  'христос': ['քրիստոս', 'հիսուս', 'christ', 'jesus', 'иисус'],
  'տեր': ['տիրոջ', 'տիրոջը', 'աստված', 'lord', 'god', 'господь'],
  'տիրոջ': ['տեր', 'տիրոջը', 'lord'],
  'աստված': ['աստծո', 'աստծու', 'տեր', 'god', 'lord', 'бог'],
  'աստծո': ['աստված', 'աստծու', 'god'],
  'հիսուս': ['յիսուս', 'քրիստոս', 'jesus', 'иисус'],
  'քրիստոս': ['հիսուս', 'christ', 'христос'],

  // Holy / Spirit
  'holy': ['սուրբ', 'սրբություն', 'святой', 'святого', 'дух', 'spirit'],
  'spirit': ['հոգի', 'սուրբ հոգի', 'дух', 'святой дух', 'holy spirit'],
  'holy spirit': ['սուրբ հոգի', 'святой дух'],
  'սուրբ': ['սրբություն', 'սուրպ', 'holy', 'святой', 'святого'],
  'հոգի': ['սուրբ հոգի', 'spirit', 'дух'],
  'սուրբ հոգի': ['holy spirit', 'святой дух'],
  'святой': ['սուրբ', 'holy', 'дух', 'святого', 'святому', 'святым'],
  'дух': ['հոգի', 'spirit', 'святой дух', 'духа'],
  'святой дух': ['սուրբ հոգի', 'holy spirit'],

  // Praise / Worship / Glory / Bless
  'praise': ['փառք', 'փառաբանություն', 'գովաբանություն', 'хвала', 'хвалы', 'поклонение', 'worship'],
  'worship': ['երկրպագություն', 'փառաբանություն', 'поклонение', 'хвала', 'praise'],
  'glory': ['փառք', 'слава', 'славы', 'хвала'],
  'bless': ['օրհնել', 'օրհնիր', 'օրհնյալ', 'благослови', 'благословен', 'blessing'],
  'blessed': ['օրհնյալ', 'օրհնված', 'благословен', 'bless'],
  'փառք': ['փառաբանություն', 'գովաբանություն', 'glory', 'praise', 'слава', 'хвала'],
  'երկրպագություն': ['worship', 'поклонение', 'փառաբանություն'],
  'օրհնիր': ['օրհնել', 'օրհնյալ', 'bless', 'благослови'],
  'օրհնյալ': ['օրհնված', 'blessed', 'благословен'],
  'хвала': ['փառք', 'praise', 'поклонение', 'слава', 'хвалы'],
  'поклонение': ['երկրպագություն', 'worship', 'хвала'],
  'слава': ['փառք', 'glory', 'хвала', 'славы'],
  'благослови': ['օրհնիր', 'bless', 'благословен'],
  'благословен': ['օրհնյալ', 'blessed', 'благослови'],

  // Love / Grace / Mercy / Heart / Life
  'love': ['սեր', 'սիրո', 'любовь', 'любви', 'любовью'],
  'grace': ['շնորհք', 'благодать', 'благодати'],
  'heart': ['սիրտ', 'սրտի', 'сердце', 'сердца'],
  'life': ['կյանք', 'կյանքի', 'жизнь', 'живой'],
  'hope': ['հույս', 'надежда', 'надежды'],
  'faith': ['հավատք', 'вера', 'веры'],
  'սեր': ['սիրո', 'սիրով', 'love', 'любовь'],
  'շնորհք': ['grace', 'благодать'],
  'սիրտ': ['սրտի', 'heart', 'сердце'],
  'կյանք': ['life', 'жизнь'],
  'հույս': ['hope', 'надежда'],
  'հավատք': ['faith', 'вера'],
  'любовь': ['սեր', 'love', 'любви', 'любовью'],
  'благодать': ['շնորհք', 'grace'],
  'сердце': ['սիրտ', 'heart', 'сердца', 'сердцу'],
  'жизнь': ['կյանք', 'life', 'живой'],
  'надежда': ['հույս', 'hope'],
  'вера': ['հավատք', 'faith'],

  // Hallelujah
  'hallelujah': ['ալելույա', 'ալելուիա', 'аллилуйя', 'alleluia'],
  'alleluia': ['ալելույա', 'hallelujah', 'аллилуйя'],
  'ալելույա': ['ալելուիա', 'hallelujah', 'аллилуйя'],
  'аллилуйя': ['ալելույա', 'hallelujah'],

  // Famous Global Worship Songs Cross-References
  'way maker': ['ուղի բացող', 'путь укажет он'],
  'ուղի բացող': ['way maker', 'путь укажет он'],
  'путь укажет он': ['way maker', 'ուղի բացող'],
  'oceans': ['օվկիանոսներ', 'океаны'],
  'океаны': ['oceans', 'օվկիանոսներ'],
  'օվկիանոսներ': ['oceans', 'океаны'],
  '10000 reasons': ['10000 причин', 'օրհնիր տիրոջը', 'bless the lord'],
  '10,000 reasons': ['10000 причин', 'օրհնիր տիրոջը', 'bless the lord'],
  '10000 причин': ['10,000 reasons', '10000 reasons', 'bless the lord'],
  'goodness of god': ['благость божья', 'աստծո բարությունը'],
  'благость божья': ['goodness of god'],
  'living hope': ['живая надежда', 'կենդանի հույս'],
  'живая надежда': ['living hope'],
  'reckless love': ['безудержная любовь', 'անսահման սեր'],
  'holy forever': ['святой навсегда', 'հավերժ սուրբ'],
  'святой навсегда': ['holy forever']
};

/**
 * Extracts a concise snippet from song lyrics matching the query.
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
  const qRu = transliterateLatToRu(qNorm);
  const qArm = transliterateLatToArm(qNorm);

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

    const isDirectMatch = lineNorm.includes(qNorm);
    const isPhoneticMatch = qPhonetic.length >= 3 && linePhonetic.includes(qPhonetic);
    const isTokenMatch = qTokens.length > 1 && qTokens.every(tok => lineNorm.includes(tok));
    const isTranslitMatch = (qRu && qRu.length >= 3 && lineNorm.includes(qRu)) ||
                            (qArm && qArm.length >= 3 && lineNorm.includes(qArm));

    if (isDirectMatch || isPhoneticMatch || isTokenMatch || isTranslitMatch) {
      if (cleanLine.length > 70) {
        let matchIdx = -1;
        if (isDirectMatch) matchIdx = lineNorm.indexOf(qNorm);
        if (matchIdx === -1 && isTokenMatch) matchIdx = lineNorm.indexOf(qTokens[0]);
        if (matchIdx === -1 && isTranslitMatch && qRu) matchIdx = lineNorm.indexOf(qRu);
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
 * Returns: { matches: boolean, score: number, snippet: string | null, matchedField: string | null, matchedTitle: string | null }
 */
export function scoreSongSearch(song, query, language = 'am') {
  if (!query || !query.trim()) {
    return { matches: true, score: 0, snippet: null, matchedField: null, matchedTitle: null };
  }

  const rawQuery = query.trim();
  const qNorm = normalizeSearchText(rawQuery);
  if (!qNorm) {
    return { matches: true, score: 0, snippet: null, matchedField: null, matchedTitle: null };
  }

  const qPhonetic = normalizePhonetic(qNorm);
  const qArm = transliterateLatToArm(qNorm);
  const qLat = transliterateArmToLat(qNorm);
  const qRu = transliterateLatToRu(qNorm);
  const qRuLat = transliterateRuToLat(qNorm);

  // Keyboard layout switch equivalents
  const qQwertyToRu = convertQwertyToCyrillic(qNorm);
  const qRuToQwerty = convertCyrillicToQwerty(qNorm);

  const localizedTitle = getLocalizedTitle(song, language) || song.title || '';
  const localizedTitleNorm = normalizeSearchText(localizedTitle);
  const localizedTitlePhonetic = normalizePhonetic(localizedTitle);

  // Extract all title variants (English, Russian, Armenian, subtitles, parentheses)
  const allTitleCandidates = extractTitleCandidates(song);
  if (!allTitleCandidates.includes(localizedTitle) && localizedTitle) {
    allTitleCandidates.unshift(localizedTitle);
  }

  const titleObjects = allTitleCandidates.map(t => {
    const norm = normalizeSearchText(t);
    return {
      raw: t,
      norm,
      phonetic: normalizePhonetic(t),
      stemmedRu: norm.split(' ').map(stemRussian).join(' '),
      stemmedEn: norm.split(' ').map(stemEnglish).join(' ')
    };
  });

  const artist = song.artist || song.artist_hy || song.artist_en || song.artist_ru || '';
  const artistNorm = normalizeSearchText(artist);
  const artistPhonetic = normalizePhonetic(artist);

  const lyrics = song.lyrics || song.lyrics_hy || song.lyrics_ru || song.lyrics_en || '';
  const tags = song.tags ? normalizeSearchText(song.tags) : '';

  let score = 0;
  let matchedField = null;
  let matchedTitle = null;
  let snippet = null;

  // Query variations to test against titles
  const queryVariants = [
    { text: qNorm, phonetic: qPhonetic, weight: 1.0, type: 'direct' },
    (qQwertyToRu && qQwertyToRu !== qNorm) ? { text: qQwertyToRu, phonetic: normalizePhonetic(qQwertyToRu), weight: 0.95, type: 'layout' } : null,
    (qRuToQwerty && qRuToQwerty !== qNorm) ? { text: qRuToQwerty, phonetic: normalizePhonetic(qRuToQwerty), weight: 0.95, type: 'layout' } : null,
    (qRu && qRu !== qNorm) ? { text: qRu, phonetic: normalizePhonetic(qRu), weight: 0.9, type: 'translit' } : null,
    (qRuLat && qRuLat !== qNorm) ? { text: qRuLat, phonetic: normalizePhonetic(qRuLat), weight: 0.9, type: 'translit' } : null,
    (qArm && qArm !== qNorm) ? { text: qArm, phonetic: normalizePhonetic(qArm), weight: 0.9, type: 'translit' } : null,
    (qLat && qLat !== qNorm) ? { text: qLat, phonetic: normalizePhonetic(qLat), weight: 0.9, type: 'translit' } : null
  ].filter(Boolean);

  // 1. Evaluate Title Candidates across all query variants
  for (const qv of queryVariants) {
    for (const tObj of titleObjects) {
      if (!tObj.norm) continue;

      let itemScore = 0;

      // Exact full match
      if (tObj.norm === qv.text || (qv.phonetic && tObj.phonetic === qv.phonetic)) {
        itemScore = 1200 * qv.weight;
      }
      // Prefix match
      else if (tObj.norm.startsWith(qv.text) || (qv.phonetic && tObj.phonetic.startsWith(qv.phonetic))) {
        itemScore = (850 + Math.max(0, 30 - tObj.raw.length)) * qv.weight;
      }
      // Whole word / boundary match
      else if (
        new RegExp(`(?:^|\\s)${escapeRegex(qv.text)}(?:\\s|$)`, 'i').test(tObj.norm) ||
        (qv.phonetic && new RegExp(`(?:^|\\s)${escapeRegex(qv.phonetic)}(?:\\s|$)`, 'i').test(tObj.phonetic))
      ) {
        itemScore = (650 + Math.max(0, 30 - tObj.raw.length)) * qv.weight;
      }
      // Substring match
      else if (tObj.norm.includes(qv.text) || (qv.phonetic && qv.phonetic.length >= 3 && tObj.phonetic.includes(qv.phonetic))) {
        itemScore = (450 + Math.max(0, 30 - tObj.raw.length)) * qv.weight;
      }
      // Russian & English Stem matching
      else {
        const qStemRu = qv.text.split(' ').map(stemRussian).join(' ');
        const qStemEn = qv.text.split(' ').map(stemEnglish).join(' ');
        if (qStemRu && tObj.stemmedRu.includes(qStemRu)) {
          itemScore = 480 * qv.weight;
        } else if (qStemEn && tObj.stemmedEn.includes(qStemEn)) {
          itemScore = 480 * qv.weight;
        }
      }

      if (itemScore > score) {
        score = itemScore;
        matchedField = 'title';
        matchedTitle = tObj.raw;
      }
    }
  }

  // 2. Artist Evaluation
  if (artistNorm) {
    for (const qv of queryVariants) {
      let aScore = 0;
      if (artistNorm === qv.text || (qv.phonetic && artistPhonetic === qv.phonetic)) {
        aScore = 360 * qv.weight;
      } else if (artistNorm.startsWith(qv.text) || (qv.phonetic && artistPhonetic.startsWith(qv.phonetic))) {
        aScore = 290 * qv.weight;
      } else if (artistNorm.includes(qv.text) || (qv.phonetic && artistPhonetic.includes(qv.phonetic))) {
        aScore = 220 * qv.weight;
      }

      if (aScore > score) {
        score = aScore;
        matchedField = matchedField || 'artist';
      }
    }
  }

  // 3. Multi-word Token Matches across Title + Artist
  const qTokens = qNorm.split(' ').filter(Boolean);
  if (qTokens.length > 1) {
    const combinedNorm = `${localizedTitleNorm} ${allTitleCandidates.join(' ')} ${artistNorm}`.toLowerCase();
    const combinedPhonetic = `${localizedTitlePhonetic} ${artistPhonetic}`;

    const allTokensMatch = qTokens.every(tok => {
      const tokP = normalizePhonetic(tok);
      const tokRu = transliterateLatToRu(tok);
      const tokArm = transliterateLatToArm(tok);
      const tokLayout = convertQwertyToCyrillic(tok);

      return combinedNorm.includes(tok) ||
             (tokP && combinedPhonetic.includes(tokP)) ||
             (tokRu && combinedNorm.includes(tokRu)) ||
             (tokArm && combinedNorm.includes(tokArm)) ||
             (tokLayout && combinedNorm.includes(tokLayout));
    });

    if (allTokensMatch && score < 560) {
      score = 560;
      matchedField = matchedField || 'title';
    }
  }

  // 4. Tags Evaluation
  if (tags && (tags.includes(qNorm) || normalizePhonetic(tags).includes(qPhonetic))) {
    if (score < 180) {
      score = 180;
      matchedField = matchedField || 'tags';
    }
  }

  // 5. Lyrics Evaluation & Snippet Extraction
  if (lyrics) {
    const lyricsSnippet = extractLyricsSnippet(lyrics, rawQuery);
    if (lyricsSnippet) {
      if (score < 140) {
        score = 140;
        matchedField = matchedField || 'lyrics';
      }
      snippet = lyricsSnippet;
    }
  }

  // 6. Synonyms & Cross-Lingual Worship Terminology
  if (score === 0) {
    const synCandidates = [qNorm, qArm, qLat, qRu, qRuLat, qQwertyToRu, qRuToQwerty].filter(Boolean);
    const checkedSyns = new Set();

    for (const term of synCandidates) {
      const synList = COMMON_SYNONYMS[term] || [];
      for (const syn of synList) {
        if (checkedSyns.has(syn)) continue;
        checkedSyns.add(syn);

        const synNorm = normalizeSearchText(syn);
        const synPhonetic = normalizePhonetic(syn);

        for (const tObj of titleObjects) {
          if (tObj.norm.includes(synNorm) || (synPhonetic && tObj.phonetic.includes(synPhonetic))) {
            score = Math.max(score, 400);
            matchedField = 'title';
            matchedTitle = tObj.raw;
            break;
          }
        }

        if (lyrics && score === 0) {
          const synSnippet = extractLyricsSnippet(lyrics, syn);
          if (synSnippet) {
            score = Math.max(score, 100);
            snippet = synSnippet;
            matchedField = 'lyrics';
            break;
          }
        }
      }
      if (score > 0) break;
    }
  }

  return {
    matches: score > 0,
    score,
    snippet,
    matchedField,
    matchedTitle: (matchedTitle && matchedTitle !== localizedTitle) ? matchedTitle : null
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

  // Expand tokens with Russian / translit equivalents for highlighting
  const expandedTokens = new Set(tokens);
  for (const t of tokens) {
    const ru = transliterateLatToRu(t);
    if (ru && ru !== t) expandedTokens.add(ru);
    const arm = transliterateLatToArm(t);
    if (arm && arm !== t) expandedTokens.add(arm);
    const qw = convertQwertyToCyrillic(t);
    if (qw && qw !== t) expandedTokens.add(qw);
  }

  const pattern = Array.from(expandedTokens).map(t => escapeRegex(t)).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return parts.filter(Boolean).map(part => ({
    text: part,
    highlight: regex.test(part)
  }));
}
