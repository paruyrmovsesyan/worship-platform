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
  
  const latinParts = parts.filter(part => hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part));
  const cyrillicParts = parts.filter(part => hasCyrillicText(part) && !hasArmenianText(part));

  if (parts.length >= 3 && hasArmenianText(parts[0])) {
    hy = parts[0] || '';
    if (latinParts.length >= 2) {
      lat = latinParts[0] || '';
      en = latinParts[latinParts.length - 1] || '';
    } else if (latinParts.length === 1 && parts.length === 2) {
      en = latinParts[0] || '';
    }
    ru = cyrillicParts[0] || '';
    return { hy, lat, ru, en };
  }

  parts.forEach((part) => {
    if (!hy && hasArmenianText(part)) { hy = part; return; }
    if (!ru && hasCyrillicText(part) && !hasArmenianText(part)) { ru = part; return; }
    if (!lat && hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) { lat = part; return; }
    if (!en && hasLatinText(part) && !hasArmenianText(part) && !hasCyrillicText(part)) { en = part; }
  });

  if (!hy && parts.length) hy = parts[0];
  if (!en && !ru && lat && parts.length === 2 && hy) {
    en = lat;
    lat = '';
  }

  return { hy, lat, ru, en };
}

export function getLocalizedTitle(title, language) {
  if (!title) return '';
  const variants = parseSongTitleVariants(title);
  
  if (language === 'am' && variants.hy) return variants.hy;
  if (language === 'ru' && variants.ru) return variants.ru;
  if (language === 'en' && variants.en) return variants.en;
  
  // Fallbacks if requested language is not found
  if (language === 'en' && variants.lat) return variants.lat;
  
  // Ultimate fallback
  return variants.hy || variants.ru || variants.en || variants.lat || title;
}
