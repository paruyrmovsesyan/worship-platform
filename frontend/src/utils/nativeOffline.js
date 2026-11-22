import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const CACHE_DIRECTORY = 'worship-native-cache';
const QUEUE_KEY = 'wp_native_mutation_queue_v1';
const CACHEABLE_PATHS = [
  '/api.php',
  '/setlists_api.php',
  '/favorites_api.php',
  '/user_favorites_api.php',
  '/account_api.php',
  '/bible_api.php',
  '/news_api.php',
  '/church_api.php',
  '/media_api.php',
  '/friends_api.php',
  '/worship_roles_api.php',
  '/today_api.php',
  '/service_planner_api.php',
];

const VOLATILE_QUERY_PARAMS = ['t', '_t', 'ts', 'cb', 'nocache', '_'];

export function normalizeNativeCacheUrl(url) {
  try {
    const parsed = new URL(url, 'https://worship.pmstudio.am');
    for (const key of VOLATILE_QUERY_PARAMS) {
      parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url || '');
  }
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function canCacheNativeRequest(url, method = 'GET') {
  if (!Capacitor.isNativePlatform() || method.toUpperCase() !== 'GET') return false;
  try {
    const parsed = new URL(url, 'https://worship.pmstudio.am');
    return (
      CACHEABLE_PATHS.includes(parsed.pathname) &&
      !/logout|delete|remove|send|create|update|poll|signal|call|badge_summary|search_users/i.test(parsed.search)
    );
  } catch {
    return false;
  }
}

export async function writeNativeResponseCache(url, payload) {
  if (!canCacheNativeRequest(url)) return;
  const key = normalizeNativeCacheUrl(url);
  await Filesystem.writeFile({
    path: `${CACHE_DIRECTORY}/${stableHash(key)}.json`,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
    data: JSON.stringify({ ...payload, cachedAt: Date.now() }),
  });
}

export async function readNativeResponseCache(url) {
  if (!canCacheNativeRequest(url)) return null;
  const key = normalizeNativeCacheUrl(url);
  try {
    const result = await Filesystem.readFile({
      path: `${CACHE_DIRECTORY}/${stableHash(key)}.json`,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(String(result.data || ''));
  } catch {
    return null;
  }
}

async function readQueue() {
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    const queue = JSON.parse(value || '[]');
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

export async function enqueueNativeMutation(request) {
  const queue = await readQueue();
  const item = {
    ...request,
    id: request.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: Date.now(),
  };
  queue.push(item);
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue.slice(-100)) });
  window.dispatchEvent(new CustomEvent('wp-native-sync-queued', { detail: item }));
  return item;
}

export async function flushNativeMutationQueue(sender) {
  if (!Capacitor.isNativePlatform() || typeof sender !== 'function') return { sent: 0, pending: 0 };
  const queue = await readQueue();
  const pending = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const ok = await sender(item);
      if (ok) sent += 1;
      else pending.push(item);
    } catch {
      pending.push(item);
    }
  }

  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(pending) });
  window.dispatchEvent(new CustomEvent('wp-native-sync-finished', { detail: { sent, pending: pending.length } }));
  return { sent, pending: pending.length };
}
