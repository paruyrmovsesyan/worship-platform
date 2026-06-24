export function hasArmenianText(text) {
  return /[\u0531-\u058F]/u.test(String(text || ''));
}

export function hasCyrillicText(text) {
  return /[\u0400-\u04FF]/u.test(String(text || ''));
}

export function hasLatinText(text) {
  return /[A-Za-z]/.test(String(text || ''));
}

export function parseSongTitleVariants(text) {
  const parts = String(text || '').split(/\s*\/\s*/u).map(p => p.trim()).filter(Boolean);
  let hy = '', lat = '', ru = '', en = '';
  
  parts.forEach((part) => {
    if (!hy && hasArmenianText(part)) { 
      hy = part; 
      return; 
    }
    if (!ru && hasCyrillicText(part) && !hasArmenianText(part)) { 
      ru = part; 
      return; 
    }
    if (hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) {
      if (!lat) {
        lat = part; // First latin part goes to lat
      } else if (!en) {
        en = part; // Second latin part goes to en
      }
      return;
    }
  });

  // If we only found one latin string, and it looks like English (maybe no translit was provided)
  // we can use it as English. The fallback in getLocalizedTitle already handles this,
  // but let's be explicit if there is only one.
  if (!hy && parts.length > 0 && !lat && !ru && !en) {
    hy = parts[0]; // Ultimate fallback for hy
  }

  return { hy, lat, ru, en };
}

export function getLocalizedTitle(title, language) {
  if (!title) return '';
  const variants = parseSongTitleVariants(title);
  
  if (language === 'am' && variants.hy) return variants.hy;
  if (language === 'ru' && variants.ru) return variants.ru;
  if (language === 'en') {
    if (variants.en) return variants.en;
    if (variants.lat) return variants.lat;
  }
  
  // Ultimate fallback
  return variants.hy || variants.ru || variants.en || variants.lat || title;
}
