/**
 * theme.js
 * Applies the business configuration (colors, typography, favicon, title)
 * to the document as CSS custom properties. Pure side-effect module.
 */

const GOOGLE_FONT_STACKS = {
  'Poppins': "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'Fraunces': "'Fraunces', Georgia, serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
  'Manrope': "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  'DM Sans': "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  'Nunito': "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
};

function loadGoogleFont(familyName) {
  if (!familyName) return;
  const existing = document.getElementById('dx-google-font');
  if (existing) existing.remove();

  const link = document.createElement('link');
  link.id = 'dx-google-font';
  link.rel = 'stylesheet';
  const family = familyName.trim().replace(/\s+/g, '+');
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function setFavicon(href) {
  if (!href) return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = href.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  link.href = href;
}

function setMetaThemeColor(color) {
  let meta = document.querySelector("meta[name='theme-color']");
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

/**
 * Applies the config object to the document.
 * @param {object} config
 */
export function applyTheme(config) {
  const root = document.documentElement;

  const vars = {
    '--primary': config.primaryColor,
    '--secondary': config.secondaryColor,
    '--background': config.backgroundColor,
    '--surface': config.surfaceColor,
    '--text': config.textColor,
    '--muted': config.mutedColor,
  };

  Object.entries(vars).forEach(([key, value]) => {
    if (value) root.style.setProperty(key, value);
  });

  const fontStack = GOOGLE_FONT_STACKS[config.fontFamily] || `'${config.fontFamily}', sans-serif`;
  root.style.setProperty('--font', fontStack);
  loadGoogleFont(config.fontFamily);

  document.title = config.businessName
    ? `${config.businessName} · ${config.tagline || ''}`.trim().replace(/·\s*$/, '').trim()
    : 'DOMINDEX Platform';

  setFavicon(config.faviconOverride || 'assets/favicon.svg');
  setMetaThemeColor(config.primaryColor || '#7C3AED');

  // Respect the system's dark-mode preference with a light, non-intrusive
  // adjustment: only nudges surface/background if the business hasn't set
  // an explicit dark palette already. This is intentionally subtle.
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dx-system-dark', !!prefersDark);
}
