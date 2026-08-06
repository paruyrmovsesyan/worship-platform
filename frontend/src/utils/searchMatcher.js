// Multi-language & transliteration-aware search matching utility

const ARM_TO_LAT_MAP = {
  'ա': 'a', 'բ': 'b', 'գ': 'g', 'դ': 'd', 'ե': 'e', 'զ': 'z', 'է': 'e', 'ը': 'e',
  'թ': 't', 'ժ': 'zh', 'ի': 'i', 'լ': 'l', 'խ': 'kh', 'ծ': 'ts', 'կ': 'k', 'հ': 'h',
  'ձ': 'dz', 'ղ': 'gh', 'ճ': 'ch', 'մ': 'm', 'յ': 'y', 'ն': 'n', 'շ': 'sh', 'ո': 'o',
  'չ': 'ch', 'պ': 'p', 'ջ': 'j', 'ռ': 'r', 'ս': 's', 'վ': 'v', 'տ': 't', 'ր': 'r',
  'ց': 'ts', 'ու': 'u', 'փ': 'p', 'ք': 'k', 'օ': 'o', 'ֆ': 'f', 'և': 'ev'
};

const LAT_TO_ARM_MAP = {
  'kh': 'խ', 'ts': 'ծ', 'zh': 'ժ', 'dz': 'ձ', 'gh': 'ղ', 'ch': 'չ', 'sh': 'շ', 'vo': 'ո', 'ye': 'ե', 'ev': 'և',
  'a': 'ա', 'b': 'բ', 'g': 'գ', 'd': 'դ', 'e': 'ե', 'z': 'զ', 't': 'տ', 'i': 'ի',
  'l': 'լ', 'k': 'կ', 'h': 'հ', 'm': 'մ', 'y': 'յ', 'n': 'ն', 'o': 'օ', 'p': 'պ',
  'r': 'ր', 's': 'ս', 'v': 'վ', 'u': 'ու', 'f': 'ֆ'
};

const RU_TO_LAT_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

export function transliterateArmToLat(str) {
  if (!str) return '';
  return str.split('').map(ch => ARM_TO_LAT_MAP[ch] || ch).join('');
}

export function transliterateLatToArm(str) {
  if (!str) return '';
  let res = str;
  res = res.replace(/kh/g, 'խ').replace(/ts/g, 'ծ').replace(/zh/g, 'ժ').replace(/dz/g, 'ձ')
           .replace(/gh/g, 'ղ').replace(/ch/g, 'չ').replace(/sh/g, 'շ').replace(/vo/g, 'ո')
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
    .replace(/[՝՛՜՞․«»""''.,\-–—()!?:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Multi-language & transliteration-aware song search matcher.
 * Matches against all language fields (hy, en, ru, lat) regardless of UI language setting.
 */
export function matchSongSearch(song, query) {
  if (!query) return true;
  const qClean = normalizeSearchText(query);
  if (!qClean) return true;

  // Generate query variations
  const qArm = transliterateLatToArm(qClean);
  const qLatFromArm = transliterateArmToLat(qClean);
  const qLatFromRu = transliterateRuToLat(qClean);

  const qVariations = [qClean];
  if (qArm && qArm !== qClean) qVariations.push(qArm);
  if (qLatFromArm && qLatFromArm !== qClean) qVariations.push(qLatFromArm);
  if (qLatFromRu && qLatFromRu !== qClean) qVariations.push(qLatFromRu);

  // Collect all searchable song fields (excluding tags)
  const fields = [
    song.title,
    song.title_hy,
    song.title_ru,
    song.title_en,
    song.title_lat,
    song.artist,
    song.artist_hy,
    song.artist_ru,
    song.artist_en,
    song.lyrics,
    song.lyrics_hy,
    song.lyrics_ru,
    song.lyrics_en
  ];

  const targetTexts = [];
  for (let i = 0; i < fields.length; i++) {
    const val = fields[i];
    if (!val) continue;
    const norm = normalizeSearchText(val);
    if (!norm) continue;
    targetTexts.push(norm);
    
    // Add transliterated targets
    const normLat = transliterateArmToLat(norm);
    if (normLat && normLat !== norm) targetTexts.push(normLat);
    const normLatRu = transliterateRuToLat(norm);
    if (normLatRu && normLatRu !== norm) targetTexts.push(normLatRu);
  }

  // Perform multi-token & partial matching
  for (const qVar of qVariations) {
    const tokens = qVar.split(' ').filter(Boolean);
    if (tokens.length === 0) continue;

    const allTokensMatch = tokens.every(token => 
      targetTexts.some(target => target.includes(token))
    );

    if (allTokensMatch) {
      return true;
    }
  }

  return false;
}
