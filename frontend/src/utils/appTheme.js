export const APP_THEMES = {
  DARK: 'dark',
  LIGHT: 'light'
};

export const getStoredAppTheme = () => (
  localStorage.getItem('theme') === APP_THEMES.LIGHT
    ? APP_THEMES.LIGHT
    : APP_THEMES.DARK
);

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

  window.dispatchEvent(new CustomEvent('wp-theme-change', { detail: { theme: nextTheme } }));
  return nextTheme;
};
