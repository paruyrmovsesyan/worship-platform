const CACHE_VERSION = "worship-v361";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const OFFLINE_FALLBACK = "/offline.html";
const SONGS_SNAPSHOT_KEY = "/__offline__/songs";
const NAVIGATION_TIMEOUT_MS = 8000;
const USER_DATA_TIMEOUT_MS = 6000;
const USER_CACHE_PREFIX = `${CACHE_VERSION}-user-`;
let offlineSyncPromise = null;
let lastOfflineSyncAt = 0;
const OFFLINE_SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes minimum between syncs
const APP_CLIENT_IDS = new Set();
const CLIENT_USER_SCOPES = new Map();
const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i;
const FAVORITE_READ_ACTIONS = new Set(["get_favorites", "get_favorite"]);
const SETLIST_READ_ACTIONS = new Set([
  "get_setlists",
  "get_setlist",
  "get_setlist_items",
  "get_setlist_song_nav",
  "get_setlist_songs",
  "get_share_status"
]);

const APP_SHELL = [
  "/",
  "/index.html",
  "/setlist_public.html",
  "/page_unavailable.html",
  "/nav.css",
  "/loader.js",
  "/pwa-init.js",
  "/web-activity.js",
  "/app.js",
  "/site_guard.js",
  "/fav_bridge.js",
  "/assets/index.css?v=361",
  "/assets/index.js?v=361",
  "/manifest.json?v=10",
  "/favicon.png?v=2",
  "/apple-touch-icon-v7.png",
  "/icon-192-v7.png",
  "/icon-512-v7.png",
  "/icon-192-v5.png",
  "/icon-512-v5.png",
  "/songs-manifest.php",
  "/app-screenshot-home.svg",
  "/app-screenshot-song.svg",
  "/admin-screenshot-dashboard.svg",
  "/admin-screenshot-editor.svg",
  "/wolarm_youth.png",
  "/wolarmyouth.jpg",
  "/arial.ttf",
  "/NotoSansArmenian-normal.js",
  OFFLINE_FALLBACK
];

const OFFLINE_PAGES = [
  "/",
  "/index.html",
  "/setlist_public.html",
  "/page_unavailable.html",
  "/loginuser.php",
  "/registeruser.php",
  "/forgot_password.php",
  "/forgot_password_sent.php",
  "/reset_password.php",
  "/verify_email_confirm.php",
  "/songs.php",
  "/admin_dashboard.php",
  "/admin_updates.php",
  "/admin_stats.php",
  "/admin_clients.php",
  "/admin_news.php",
  "/admin_messages.php",
  "/admin_faq.php"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async function(cache) {
      for (const item of APP_SHELL) {
        try {
          await cache.add(item);
        } catch (e) {
          // ignore individual item failure so installation never aborts
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          const isCurrentUserCache = cacheName.startsWith(USER_CACHE_PREFIX);
          if (![STATIC_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(cacheName) && !isCurrentUserCache) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("message", function(event) {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data.type === "REGISTER_APP_CLIENT") {
    const clientId = event.source && event.source.id ? String(event.source.id) : "";
    if (clientId) {
      APP_CLIENT_IDS.add(clientId);
    }
    return;
  }

  if (event.data.type === "REGISTER_WEB_CLIENT") {
    const clientId = event.source && event.source.id ? String(event.source.id) : "";
    if (clientId) {
      APP_CLIENT_IDS.delete(clientId);
      CLIENT_USER_SCOPES.delete(clientId);
    }
    return;
  }

  if (event.data.type === "SET_USER_CACHE_SCOPE") {
    const clientId = event.source && event.source.id ? String(event.source.id) : "";
    const userId = normalizeUserId(event.data.userId);
    if (clientId && userId) {
      CLIENT_USER_SCOPES.set(clientId, userId);
    }
    return;
  }

  if (event.data.type === "CLEAR_USER_CACHE") {
    event.waitUntil(clearUserCache(event.data.userId).then(function() {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ ok: true });
      }
    }));
    return;
  }

  if (event.data.type === "SYNC_OFFLINE_LIBRARY") {
    event.waitUntil(syncOfflineLibrary());
    return;
  }
});

self.addEventListener("push", function(event) {
  event.waitUntil(handlePushEvent(event));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});

self.addEventListener("fetch", function(event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Auth PHP endpoints must bypass all SW caching and interception logic so that
  // sessions, cookies, and 302 redirects (e.g. Google OAuth, login, logout) are handled natively.
  if (
    url.pathname === "/social_auth.php" ||
    url.pathname === "/auth_me.php" ||
    url.pathname === "/auth_bootstrap.php" ||
    url.pathname === "/login_api.php" ||
    url.pathname === "/register_api.php" ||
    url.pathname === "/logout_users.php"
  ) {
    return; // Let browser handle it natively — no SW interception
  }

  if (url.pathname === "/status.php") {
    event.respondWith(handleStatusRequest(request));
    return;
  }

  if (url.pathname === "/api.php") {
    event.respondWith(handleApiRequest(event, url));
    return;
  }

  if (url.pathname === "/account_api.php") {
    event.respondWith(handleAccountRequest(request, url));
    return;
  }

  if (isUserCacheableRequest(url)) {
    event.respondWith(handleUserDataRequest(event, url));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigateRequest(event));
    return;
  }

  if (isStaticAssetRequest(url)) {
    event.respondWith(handleStaticAssetRequest(event));
    return;
  }

  event.respondWith(handleNetworkOnlyRequest(request, url));
});

function normalizeUserId(value) {
  const normalized = String(value || "").trim();
  return /^\d+$/.test(normalized) && normalized !== "0" ? normalized : "";
}

function getUserCacheName(userId) {
  const normalized = normalizeUserId(userId);
  return normalized ? `${USER_CACHE_PREFIX}${normalized}` : "";
}

function getClientUserId(clientId) {
  return clientId ? (CLIENT_USER_SCOPES.get(String(clientId)) || "") : "";
}

async function clearUserCache(userId) {
  const normalized = normalizeUserId(userId);
  if (normalized) {
    await caches.delete(getUserCacheName(normalized));
  } else {
    const names = await caches.keys();
    await Promise.all(names.filter(function(name) {
      return name.startsWith(USER_CACHE_PREFIX);
    }).map(function(name) {
      return caches.delete(name);
    }));
  }

  CLIENT_USER_SCOPES.forEach(function(mappedUserId, clientId) {
    if (!normalized || mappedUserId === normalized) {
      CLIENT_USER_SCOPES.delete(clientId);
    }
  });
}

function isStaticAssetRequest(url) {
  if (url.pathname.startsWith("/uploads/news/")) return false;
  return STATIC_ASSET_PATTERN.test(url.pathname) || url.pathname === "/manifest.json";
}

function isUserCacheableRequest(url) {
  const action = url.searchParams.get("action") || "";
  if (url.pathname === "/user_favorites_api.php") {
    return FAVORITE_READ_ACTIONS.has(action);
  }
  if (url.pathname === "/setlists_api.php") {
    return SETLIST_READ_ACTIONS.has(action);
  }
  return false;
}

function fetchWithTimeout(requestOrUrl, timeoutMs) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timer = null;
  if (controller) {
    timer = setTimeout(function() {
      controller.abort();
    }, timeoutMs);
  }

  const targetUrl = typeof requestOrUrl === "string" ? requestOrUrl : (requestOrUrl && requestOrUrl.url ? requestOrUrl.url : requestOrUrl);

  return fetch(targetUrl, {
    signal: controller ? controller.signal : undefined
  }).finally(function() {
    if (timer) clearTimeout(timer);
  });
}

async function handleStaticAssetRequest(event) {
  const request = event.request;
  const cached = await caches.match(request);
  const refreshPromise = fetch(request.url).then(async function(response) {
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    event.waitUntil(refreshPromise.catch(function() {}));
    return cached;
  }

  return refreshPromise.catch(function() {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  });
}

async function handleNetworkOnlyRequest(request, url) {
  try {
    return await fetch(request.url);
  } catch (err) {
    const isApi = url.pathname.endsWith(".php");
    return new Response(isApi ? JSON.stringify({ error: "Offline", offline: true }) : "Offline", {
      status: 503,
      headers: isApi ? { "Content-Type": "application/json; charset=UTF-8" } : undefined
    });
  }
}

function isAppSourceUrl(url) {
  const source = (url.searchParams.get("source") || "").toLowerCase();
  return source === "pwa" || source === "admin-app";
}

function isAppSourceString(urlString) {
  if (!urlString) return false;
  try {
    return isAppSourceUrl(new URL(urlString));
  } catch (err) {
    return false;
  }
}

async function isAppNavigation(event, url) {
  if (isAppSourceUrl(url)) {
    const targetId = event.resultingClientId || event.clientId || "";
    if (targetId) {
      APP_CLIENT_IDS.add(String(targetId));
    }
    return true;
  }

  const clientId = event.clientId || event.resultingClientId || "";
  if (clientId && APP_CLIENT_IDS.has(clientId)) {
    return true;
  }

  if (isAppSourceString(event.request && event.request.referrer)) {
    const targetId = event.resultingClientId || event.clientId || "";
    if (targetId) {
      APP_CLIENT_IDS.add(String(targetId));
    }
    return true;
  }

  if (event.clientId) {
    try {
      const client = await self.clients.get(event.clientId);
      if (client && client.url) {
        const clientUrl = new URL(client.url);
        if (isAppSourceUrl(clientUrl)) {
          APP_CLIENT_IDS.add(event.clientId);
          return true;
        }
      }
    } catch (err) {
      // ignore client lookup failures
    }
  }

  return false;
}

async function handleNavigateRequest(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cacheKeys = buildNavigationCacheKeys(url);
  const appNavigation = await isAppNavigation(event, url);
  if (appNavigation) {
    const targetId = event.resultingClientId || event.clientId || "";
    if (targetId) {
      APP_CLIENT_IDS.add(String(targetId));
    }
  }

  try {
    const networkResponse = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    if (networkResponse && networkResponse.status === 200) {
      const copy = networkResponse.clone();
      const cache = await caches.open(RUNTIME_CACHE);
      for (const key of cacheKeys) {
        await cache.put(key, copy.clone());
      }
    }
    return networkResponse;
  } catch (err) {
    for (const key of cacheKeys) {
      const cached = await caches.match(key);
      if (cached) return cached;
    }

    const shellCached = await caches.match("/") || await caches.match("/index.html");
    if (shellCached) return shellCached;

    const offlineFallback = await caches.match(OFFLINE_FALLBACK);
    if (offlineFallback) return offlineFallback;

    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function handleLogoutRequest(event) {
  const clientUserId = getClientUserId(event.clientId);
  const clearPromise = clearUserCache(clientUserId);

  try {
    const response = await fetch(event.request.url);
    await clearPromise;
    return response;
  } catch (err) {
    await clearPromise;
    return Response.redirect(new URL("/login?logged_out=1", self.location.origin).href, 302);
  }
}

async function handlePushEvent(event) {
  let payload = null;

  if (event.data) {
    try {
      payload = event.data.json();
      if (!payload || (!payload.title && !payload.body)) {
        payload = null;
      }
    } catch (err) {
      try {
        const text = event.data.text();
        if (text && text.trim() !== "" && !text.includes('"ping":')) {
          payload = { title: "Worship Platform", body: text };
        } else {
          payload = null;
        }
      } catch (innerErr) {
        payload = null;
      }
    }
  }

  if (!payload) {
    payload = await fetchQueuedPushPayload();
  }

  if (!payload) {
    payload = {
      title: "Worship Platform",
      body: "Նոր ծանուցում կա։",
      url: "/main.html",
      icon: "/wolarm_youth.png",
      tag: "worship-general",
    };
  }

  const isCall = payload.type === 'call' ||
                 (payload.url && payload.url.includes('call_id')) ||
                 (payload.title && payload.title.includes('📞'));

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/wolarm_youth.png",
    badge: payload.icon || "/wolarm_youth.png",
    tag: payload.tag || (isCall ? "worship-call-" + Date.now() : "worship-general"),
    renotify: true,
    data: {
      url: payload.url || "/main.html",
      call_id: payload.call_id || 0,
      is_call: isCall
    },
  };

  if (isCall) {
    options.requireInteraction = true;
    options.vibrate = [500, 250, 500, 250, 500, 250, 500, 250, 500];
    options.actions = [
      { action: "accept", title: "📞 Ընդունել" },
      { action: "decline", title: "❌ Մերժել" }
    ];
  }

  return self.registration.showNotification(payload.title || "Worship Platform", options);
}

async function fetchQueuedPushPayload() {
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    if (!subscription || !subscription.endpoint) {
      return null;
    }

    const response = await fetch("/push_api.php?action=pull", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(function() {
      return null;
    });

    return data && data.notification ? data.notification : null;
  } catch (err) {
    return null;
  }
}

async function handleNotificationClick(event) {
  const notification = event.notification;
  const action = event.action;
  const data = (notification && notification.data) || {};
  const isCall = data.is_call;
  const callId = data.call_id;
  const rawUrl = data.url || "/";

  notification.close();

  if (action === "decline") {
    if (callId > 0) {
      try {
        await fetch("/chat_api.php?action=respond_call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_id: callId, response: "decline" })
        });
      } catch (err) {
        console.error("Failed to decline call from push notification", err);
      }
    }
    return;
  }

  let targetUrlString = rawUrl;
  if (action === "accept" || isCall) {
    if (!targetUrlString.includes("auto_accept=1")) {
      targetUrlString += (targetUrlString.includes("?") ? "&" : "?") + "auto_accept=1";
    }
  }

  const targetUrl = new URL(targetUrlString, self.location.origin);
  const targetPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;

  const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  // Prefer an existing PWA client — send postMessage so React Router handles it (preserves history)
  for (const client of windowClients) {
    const clientUrl = new URL(client.url);
    if (clientUrl.origin === self.location.origin) {
      // Focus the existing window and tell React Router where to go
      await client.focus();
      client.postMessage({ type: "PUSH_NAVIGATE", path: targetPath, auto_accept: action === "accept" });
      return;
    }
  }

  // No existing client — open a new window (fresh PWA launch, history starts from chat)
  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl.href);
  }
}

function buildNavigationCacheKeys(url) {
  const keys = [url.pathname];

  if (url.pathname === "/") {
    keys.push("/index.html");
  } else if (url.pathname === "/index.html") {
    keys.push("/");
  }

  return keys;
}

async function handleStatusRequest(request) {
  try {
    const response = await fetch(request.url);
    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ maintenance: false, offline: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      }
    );
  }
}

async function handleAccountRequest(request, url) {
  const action = url.searchParams.get("action") || "";

  try {
    return await fetch(request.url);
  } catch (err) {
    if (action === "auth_status") {
      return new Response(
        JSON.stringify({
          ok: true,
          logged_in: false,
          session_type: null,
          user_id: null,
          name: null,
          email: null,
          offline: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        }
      );
    }

    if (action === "me") {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          offline: true
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Offline",
        offline: true
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      }
    );
  }
}

async function handleApiRequest(event, url) {
  const request = event.request;
  const hasId = url.searchParams.has("id");
  const action = url.searchParams.get("action");
  const mode = url.searchParams.get("mode");
  const query = (url.searchParams.get("q") || "").toLowerCase();
  const cache = await caches.open(DATA_CACHE);

  const networkPromise = fetch(request.url).then(async function(networkResponse) {
    if (networkResponse && networkResponse.status === 200) {
      await cache.put(request.url, networkResponse.clone());

      if (!hasId && !action) {
        await cache.put(SONGS_SNAPSHOT_KEY, networkResponse.clone());
        broadcastSyncTime(new Date().toISOString());
      } else if (hasId) {
        broadcastSongDetailUpdated(url.searchParams.get("id"));
      }
    }

    return networkResponse;
  });

  const exactCached = await cache.match(request.url);
  if (exactCached) {
    event.waitUntil(networkPromise.catch(function() {}));
    return exactCached;
  }

  const allSongsResponse = await cache.match(SONGS_SNAPSHOT_KEY);
  if (allSongsResponse) {
    event.waitUntil(networkPromise.catch(function() {}));
    return buildSongsFallbackResponse(allSongsResponse, { hasId, action, mode, query, url });
  }

  try {
    return await networkPromise;
  } catch (err) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}

async function buildSongsFallbackResponse(snapshotResponse, options) {
  const allSongs = await snapshotResponse.clone().json().catch(function() {
    return [];
  });

  if (options.hasId) {
    const id = String(options.url.searchParams.get("id"));
    const oneSong = (allSongs || []).find(function(song) {
      return String(song.id) === id;
    });
    return jsonResponse(oneSong || null);
  }

  if (options.action === "search" && options.mode === "lyrics") {
    const filtered = (allSongs || []).filter(function(song) {
      const lyrics = String(song.lyrics || "").toLowerCase();
      const title = String(song.title || "").toLowerCase();
      const artist = String(song.artist || "").toLowerCase();
      const tags = String(song.tags || "").toLowerCase();
      return lyrics.includes(options.query) ||
        title.includes(options.query) ||
        artist.includes(options.query) ||
        tags.includes(options.query);
    }).slice(0, 200);
    return jsonResponse(filtered);
  }

  return jsonResponse(allSongs || []);
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=UTF-8" }
  });
}

async function handleUserDataRequest(event, url) {
  const userId = getClientUserId(event.clientId);
  if (!userId) {
    return handleNetworkOnlyRequest(event.request, url);
  }

  const cache = await caches.open(getUserCacheName(userId));
  try {
    const response = await fetchWithTimeout(event.request, USER_DATA_TIMEOUT_MS);
    if (response && response.status === 200) {
      await cache.put(event.request.url, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(event.request.url);
    if (cached) return cached;
    return jsonResponse({ error: "Offline", offline: true }, 503);
  }
}

async function syncOfflineLibrary() {
  if (offlineSyncPromise) return offlineSyncPromise;

  const now = Date.now();
  if (now - lastOfflineSyncAt < OFFLINE_SYNC_THROTTLE_MS) {
    return; // throttled — too soon since last sync
  }
  lastOfflineSyncAt = now;

  offlineSyncPromise = (async function() {
    try {
      await Promise.all([
        syncAppShell(),
        syncSongsSnapshot()
      ]);

      broadcastSyncTime(new Date().toISOString(), { full_library: true });
    } catch (err) {
      console.error("syncOfflineLibrary failed", err);
    } finally {
      offlineSyncPromise = null;
    }
  })();

  return offlineSyncPromise;
}

async function syncAppShell() {
  const cache = await caches.open(STATIC_CACHE);

  await Promise.all(
    APP_SHELL.map(function(url) {
      return refreshStaticResource(cache, url);
    })
  );

  await Promise.all(
    OFFLINE_PAGES.map(function(url) {
      return refreshOfflinePage(cache, url);
    })
  );
}

async function refreshStaticResource(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response || response.status !== 200) return;
    await cache.put(url, response.clone());
  } catch (err) {
    // ignore per-resource failures during bulk sync
  }
}

async function refreshOfflinePage(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response || response.status !== 200) return;

    const keys = buildNavigationCacheKeys(new URL(url, self.location.origin));
    for (const key of keys) {
      await cache.put(key, response.clone());
    }
  } catch (err) {
    // ignore per-page failures during bulk sync
  }
}

async function syncSongsSnapshot() {
  const response = await fetch("/api.php", { cache: "no-store" });
  if (!response || response.status !== 200) return;

  const cache = await caches.open(DATA_CACHE);
  await cache.put("/api.php", response.clone());
  await cache.put(SONGS_SNAPSHOT_KEY, response.clone());
}

function broadcastSyncTime(syncedAt, extraData) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage(Object.assign({
        type: "DATA_SYNC",
        synced_at: syncedAt
      }, extraData || {}));
    });
  });
}

function broadcastSongDetailUpdated(songId) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({
        type: "SONG_DETAIL_UPDATED",
        song_id: String(songId)
      });
    });
  });
}
