function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatIsoDateLocal(dateObj) {
  const year = dateObj.getFullYear();
  const month = pad2(dateObj.getMonth() + 1);
  const day = pad2(dateObj.getDate());
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate, days = 1) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return formatIsoDateLocal(d);
}

export function getNextSundayDate() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const addDays = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + addDays);
  return formatIsoDateLocal(d);
}

export function getNextWeekendDates() {
  const sat = new Date();
  const day = sat.getDay(); // 0 = Sun, ..., 6 = Sat
  const daysToSat = day === 6 ? 0 : (day === 0 ? 6 : 6 - day);
  sat.setDate(sat.getDate() + daysToSat);
  const sun = new Date(sat.getTime());
  sun.setDate(sun.getDate() + 1);
  return {
    start: formatIsoDateLocal(sat),
    end: formatIsoDateLocal(sun),
  };
}

/**
 * Formats YYYY-MM-DD as DD.MM.YY (e.g. 2026-11-28 -> 28.11.26)
 */
export function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const clean = String(isoDate).slice(0, 10);
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return clean;
  return `${m[3]}.${m[2]}.${m[1].slice(2)}`;
}

/**
 * Formats a setlist date or 2-day date range for display.
 * When both dates are set and distinct, formats as `DD.MM.YY-DD.MM.YY` (e.g. `28.11.26-29.11.26`).
 */
export function formatSetlistDate(serviceDate, serviceDateEnd = null) {
  const start = serviceDate ? String(serviceDate).slice(0, 10) : '';
  const end = serviceDateEnd ? String(serviceDateEnd).slice(0, 10) : '';
  if (!start) return '';
  if (end && end !== start) {
    const [first, second] = end < start ? [end, start] : [start, end];
    return `${formatShortDate(first)}-${formatShortDate(second)}`;
  }
  return start;
}

/**
 * Returns the effective end date used for upcoming/past comparisons.
 */
export function getEffectiveEndDate(serviceDate, serviceDateEnd = null) {
  const start = serviceDate ? String(serviceDate).slice(0, 10) : '';
  const end = serviceDateEnd ? String(serviceDateEnd).slice(0, 10) : '';
  if (!start) return '';
  if (end && end > start) return end;
  return start;
}

export function getRelativeDateLabel(dateStr, lang, endDateStr = null) {
  if (!dateStr) return null;
  const startClean = String(dateStr).slice(0, 10);
  const target = new Date(`${startClean}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endClean = endDateStr ? String(endDateStr).slice(0, 10) : '';
  const endTarget = endClean ? new Date(`${endClean}T00:00:00`) : null;

  const dict = {
    am: {
      today: 'Այսօր',
      tomorrow: 'Վաղը',
      yesterday: 'Երեկ',
      inDays: (n) => `${n} օրից`,
      daysAgo: (n) => `${n} օր առաջ`,
    },
    en: {
      today: 'Today',
      tomorrow: 'Tomorrow',
      yesterday: 'Yesterday',
      inDays: (n) => `in ${n}d`,
      daysAgo: (n) => `${n}d ago`,
    },
    ru: {
      today: 'Сегодня',
      tomorrow: 'Завтра',
      yesterday: 'Вчера',
      inDays: (n) => `через ${n} дн.`,
      daysAgo: (n) => `${n} дн. назад`,
    },
  }[lang] || {
    today: 'Այսօր',
    tomorrow: 'Վաղը',
    yesterday: 'Երեկ',
    inDays: (n) => `${n} օրից`,
    daysAgo: (n) => `${n} օր առաջ`,
  };

  if (
    endTarget &&
    !Number.isNaN(endTarget.getTime()) &&
    today.getTime() >= target.getTime() &&
    today.getTime() <= endTarget.getTime()
  ) {
    return { text: dict.today, tone: 'highlight' };
  }

  const refTarget =
    endTarget && !Number.isNaN(endTarget.getTime()) && today.getTime() > endTarget.getTime()
      ? endTarget
      : target;

  const diffMs = refTarget.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: dict.today, tone: 'highlight' };
  if (diffDays === 1) return { text: dict.tomorrow, tone: 'soon' };
  if (diffDays === -1) return { text: dict.yesterday, tone: 'past' };
  if (diffDays > 1 && diffDays <= 7) return { text: dict.inDays(diffDays), tone: 'soon' };
  if (diffDays < -1 && diffDays >= -7) return { text: dict.daysAgo(Math.abs(diffDays)), tone: 'past' };
  return null;
}
