const CACHE_VERSION = "worship-v18";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const OFFLINE_FALLBACK = "/offline.html";
const SONGS_SNAPSHOT_KEY = "/__offline__/songs";
const AUTH_STATUS_CACHE_KEY = "/__offline__/account_auth_status";
const AUTH_ME_CACHE_KEY = "/__offline__/account_me";
let offlineSyncPromise = null;
const APP_CLIENT_IDS = new Set();

const APP_SHELL = [
  "/",
  "/index.html",
  "/main.html",
  "/favorites.html",
  "/news.html",
  "/account.html",
  "/setlists.html",
  "/song_view.html",
  "/setlist_view.html",
  "/setlist_public.html",
  "/page_unavailable.html",
  "/nav.css",
  "/loader.js",
  "/pwa-init.js",
  "/app.js",
  "/site_guard.js",
  "/fav_bridge.js",
  "/manifest.json",
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
  "/main.html",
  "/favorites.html",
  "/news.html",
  "/account.html",
  "/setlists.html",
  "/song_view.html",
  "/setlist_view.html",
  "/setlist_public.html",
  "/page_unavailable.html",
  "/loginuser.php",
  "/registeruser.php",
  "/forgot_password.php",
  "/forgot_password_sent.php",
  "/reset_password.php",
  "/verify_email_confirm.php",
  "/songs.html"
];

const OPTIONAL_SYNC_ENDPOINTS = [
  "/auth_me.php",
  "/account_api.php?action=auth_status",
  "/account_api.php?action=me",
  "/favorites_api.php?action=get_favorites",
  "/user_favorites_api.php?action=get_favorites",
  "/setlists_api.php?action=get_setlists",
  "/setlists_api.php?action=get_setlists&status=active",
  "/setlists_api.php?action=get_setlists&status=archived"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (![STATIC_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(cacheName)) {
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

  if (url.pathname === "/status.php") {
    event.respondWith(handleStatusRequest(request));
    return;
  }

  if (url.pathname === "/api.php") {
    event.respondWith(handleApiRequest(request, url));
    return;
  }

  if (url.pathname === "/account_api.php") {
    event.respondWith(handleAccountRequest(request, url));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigateRequest(event));
    return;
  }

  event.respondWith(
    fetch(new Request(request, { cache: "no-store" }))
      .then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then(function(cache) {
            cache.put(request, copy);
          });
        }
        return networkResponse;
      })
      .catch(function() {
        return caches.match(request).then(function(cachedResponse) {
          return cachedResponse || caches.match(OFFLINE_FALLBACK);
        });
      })
  );
});

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
    const networkResponse = await fetch(new Request(request, { cache: "no-store" }));
    if (networkResponse && networkResponse.status === 200) {
      const copy = networkResponse.clone();
      const cache = await caches.open(RUNTIME_CACHE);
      for (const key of cacheKeys) {
        await cache.put(key, copy.clone());
      }
    }
    return networkResponse;
  } catch (err) {
    if (appNavigation) {
      for (const key of cacheKeys) {
        const cached = await caches.match(key);
        if (cached) return cached;
      }
    }

    return caches.match(OFFLINE_FALLBACK);
  }
}

async function handlePushEvent(event) {
  let payload = null;

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      try {
        payload = { title: "Worship Platform", body: event.data.text() };
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

  return self.registration.showNotification(payload.title || "Worship Platform", {
    body: payload.body || "",
    icon: payload.icon || "/wolarm_youth.png",
    badge: payload.icon || "/wolarm_youth.png",
    tag: payload.tag || "worship-general",
    data: {
      url: payload.url || "/main.html",
    },
  });
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
  const rawUrl = (event.notification && event.notification.data && event.notification.data.url) || "/main.html";
  const targetUrl = new URL(rawUrl, self.location.origin).href;
  const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of windowClients) {
    if (client.url === targetUrl && "focus" in client) {
      return client.focus();
    }
  }

  for (const client of windowClients) {
    if (client.url.startsWith(self.location.origin) && "focus" in client) {
      client.navigate(targetUrl);
      return client.focus();
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl);
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
    const response = await fetch(new Request(request, { cache: "no-store" }));
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
    const response = await fetch(new Request(request, { cache: "no-store" }));
    const cache = await caches.open(DATA_CACHE);

    if (action === "auth_status") {
      await cache.put(request.url, response.clone());
      await cache.put(AUTH_STATUS_CACHE_KEY, response.clone());
    } else if (action === "me") {
      await cache.put(request.url, response.clone());
      await cache.put(AUTH_ME_CACHE_KEY, response.clone());
    }

    return response;
  } catch (err) {
    const cache = await caches.open(DATA_CACHE);

    if (action === "auth_status") {
      const cached = await cache.match(AUTH_STATUS_CACHE_KEY) || await cache.match(request.url);
      if (cached) {
        return cached;
      }

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
      const cached = await cache.match(AUTH_ME_CACHE_KEY) || await cache.match(request.url);
      if (cached) {
        return cached;
      }

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

async function handleApiRequest(request, url) {
  const hasId = url.searchParams.has("id");
  const action = url.searchParams.get("action");
  const mode = url.searchParams.get("mode");
  const query = (url.searchParams.get("q") || "").toLowerCase();

  try {
    const networkResponse = await fetch(new Request(request, { cache: "no-store" }));

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DATA_CACHE);
      await cache.put(request.url, networkResponse.clone());

      if (!hasId && !action) {
        await cache.put(SONGS_SNAPSHOT_KEY, networkResponse.clone());
        broadcastSyncTime(new Date().toISOString());
      }
    }

    return networkResponse;
  } catch (err) {
    const cache = await caches.open(DATA_CACHE);

    const exactCached = await cache.match(request.url);
    if (exactCached) return exactCached;

    const allSongsResponse = await cache.match(SONGS_SNAPSHOT_KEY);
    if (!allSongsResponse) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    const allSongs = await allSongsResponse.clone().json().catch(function() {
      return [];
    });

    if (hasId) {
      const id = String(url.searchParams.get("id"));
      const oneSong = (allSongs || []).find(function(song) {
        return String(song.id) === id;
      });
      return new Response(JSON.stringify(oneSong || null), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    if (action === "search" && mode === "lyrics") {
      const filtered = (allSongs || []).filter(function(song) {
        const lyrics = String(song.lyrics || "").toLowerCase();
        const title = String(song.title || "").toLowerCase();
        const artist = String(song.artist || "").toLowerCase();
        const tags = String(song.tags || "").toLowerCase();
        return (
          lyrics.includes(query) ||
          title.includes(query) ||
          artist.includes(query) ||
          tags.includes(query)
        );
      }).slice(0, 200);

      return new Response(JSON.stringify(filtered), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=UTF-8" }
      });
    }

    return new Response(JSON.stringify(allSongs || []), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=UTF-8" }
    });
  }
}

async function syncOfflineLibrary() {
  if (offlineSyncPromise) return offlineSyncPromise;

  offlineSyncPromise = (async function() {
    try {
      await Promise.all([
        syncAppShell(),
        syncSongsSnapshot(),
        syncOptionalEndpoints()
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

async function syncOptionalEndpoints() {
  const cache = await caches.open(RUNTIME_CACHE);

  await Promise.all(
    OPTIONAL_SYNC_ENDPOINTS.map(function(url) {
      return refreshOptionalEndpoint(cache, url);
    })
  );
}

async function refreshOptionalEndpoint(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response || response.status !== 200) return;
    await cache.put(url, response.clone());
  } catch (err) {
    // ignore per-endpoint failures during bulk sync
  }
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
