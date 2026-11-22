import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const indexPath = resolve(process.cwd(), 'dist/index.html');
let html = await readFile(indexPath, 'utf8');

// Capacitor ships this document inside the application. Keep the shared React
// UI, but remove browser/PWA bootstrapping so the native bundle has no service
// worker, web manifest, or website update lifecycle dependency.
html = html
  .replace(/\s*<link\s+rel="manifest"[^>]*>/gi, '')
  .replace(/\s*<meta\s+name="apple-mobile-web-app-[^"]+"[^>]*>/gi, '')
  .replace(/\s*<link\s+rel="apple-touch-startup-image"[^>]*>/gi, '')
  .replace(/\s*<script\s+src="\/(?:pwa-init|version-check|site_guard|error_reporter)\.js[^>]*><\/script>/gi, '')
  .replace(/\s*<script>\s*try\s*\{(?:(?!<\/script>)[\s\S])*wp_active_app_source(?:(?!<\/script>)[\s\S])*<\/script>/i, '')
  .replace('Override pwa-init.js standalone styles', 'Legacy standalone style safeguards')
  .replace(
    '<head>',
    '<head>\n    <meta name="worship-runtime" content="native">\n    <script>window.__WORSHIP_RUNTIME__="native";document.documentElement.classList.add("wp-native-bundle");if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(items){items.forEach(function(item){item.unregister();});});}</script>',
  );

await writeFile(indexPath, html, 'utf8');

// Strip PWA-only, website-only, SEO, and legacy files from the native bundle
// (leaves frontend/public untouched for Website & PWA builds).
const nativePruneTargets = [
  'manifest.json',
  'pwa-init.js',
  'version-check.js',
  'site_guard.js',
  'error_reporter.js',
  'demo.mp4',
  'splash',
  'og-image.png',
  'user_uploaded_logo.png',
  'temp.png',
  'icon-512-v7.png',
  'icon-192-v7.png',
  'apple-touch-icon-v7.png',
];

await Promise.all(
  nativePruneTargets.map((name) =>
    rm(resolve(process.cwd(), 'dist', name), { recursive: true, force: true }),
  ),
);

if (/pwa-init\.js|version-check\.js|site_guard\.js|rel="manifest"|apple-touch-startup-image|wp_active_app_source/i.test(html)) {
  throw new Error('Native build still contains PWA-only bootstrap references.');
}

console.log('Prepared independent Capacitor bundle from the shared PWA UI.');
