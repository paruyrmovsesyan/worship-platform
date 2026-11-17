export const APP_THEMES = {
  DARK: 'dark',
  LIGHT: 'light'
};

export const THEME_STYLES = {
  CLASSIC: 'classic',
  EDITORIAL: 'editorial'
};

export const getStoredAppTheme = () => (
  localStorage.getItem('theme') === APP_THEMES.LIGHT
    ? APP_THEMES.LIGHT
    : APP_THEMES.DARK
);

export const getStoredThemeStyle = () => (
  localStorage.getItem('themeStyle') === THEME_STYLES.EDITORIAL
    ? THEME_STYLES.EDITORIAL
    : THEME_STYLES.CLASSIC
);

export const applyThemeStyle = (style, { persist = true } = {}) => {
  const nextStyle = style === THEME_STYLES.EDITORIAL ? THEME_STYLES.EDITORIAL : THEME_STYLES.CLASSIC;
  const isEditorial = nextStyle === THEME_STYLES.EDITORIAL;

  if (persist) localStorage.setItem('themeStyle', nextStyle);

  document.documentElement.dataset.themeStyle = nextStyle;
  document.documentElement.classList.toggle('editorial-theme', isEditorial);
  document.body.classList.toggle('editorial-theme', isEditorial);

  window.dispatchEvent(new CustomEvent('wp-theme-style-change', { detail: { themeStyle: nextStyle } }));
  return nextStyle;
};

export const applyAppTheme = (theme, { persist = true } = {}) => {
  const nextTheme = theme === APP_THEMES.LIGHT ? APP_THEMES.LIGHT : APP_THEMES.DARK;
  const isLight = nextTheme === APP_THEMES.LIGHT;

  if (persist) localStorage.setItem('theme', nextTheme);

  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.classList.toggle('light-mode', isLight);
  document.body.classList.toggle('light-mode', isLight);

  if (isLight) {
    document.body.classList.remove('oled-mode');
  } else {
    document.body.classList.toggle('oled-mode', localStorage.getItem('oledMode') === 'true');
  }

  applyThemeStyle(getStoredThemeStyle(), { persist: false });

  window.dispatchEvent(new CustomEvent('wp-theme-change', { detail: { theme: nextTheme } }));
  return nextTheme;
};
