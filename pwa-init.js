(function() {
  if (!("serviceWorker" in navigator)) return;

  (function ensureVersionCheckScript() {
    if (document.querySelector('script[data-wp-version-check="1"]')) return;
    var script = document.createElement("script");
    script.src = "/version-check.js?v=" + Date.now();
    script.defer = true;
    script.dataset.wpVersionCheck = "1";
    document.head.appendChild(script);
  })();

  var PAGE_APP_MODES_CACHE_KEY = "wp_page_app_modes_v1";
  var pageAppModesCache = null;

  function getCurrentPath() {
    try {
      return (window.location && window.location.pathname) || "/";
    } catch (err) {
      return "/";
    }
  }

  function hasNativeStandaloneDisplayMode() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function getDeclaredAppScope() {
    try {
      var meta = document.querySelector('meta[name="wp-app-scope"]');
      var scope = meta ? String(meta.getAttribute("content") || "").trim().toLowerCase() : "";
      return scope === "admin" ? "admin" : "main";
    } catch (err) {
      return "main";
    }
  }

  function getExpectedAppSource() {
    return getDeclaredAppScope() === "admin" ? "admin-app" : "pwa";
  }

  function getActiveAppSource() {
    try {
      var source = (new URL(window.location.href).searchParams.get("source") || "").toLowerCase();
      if (source === "pwa" || source === "admin-app") {
        return source;
      }
    } catch (err) {
      // ignore URL parsing issues
    }

    if (hasNativeStandaloneDisplayMode()) {
      return getExpectedAppSource();
    }

    return "";
  }

  function getCurrentPageAppKey() {
    var path = getCurrentPath().toLowerCase();
    if (path === "/" || path === "/index.html") return "landing";
    if (path === "/main.html") return "main";
    if (path === "/song_view.html") return "song";
    if (path === "/favorites.html") return "favorites";
    if (path === "/setlists.html" || path === "/setlist_view.html" || path === "/setlist_public.html") return "setlists";
    if (path === "/account.html") return "account";
    if (path === "/news.html") return "news";
    if (
      path === "/loginuser.php" ||
      path === "/registeruser.php" ||
      path === "/forgot_password.php" ||
      path === "/forgot_password_sent.php" ||
      path === "/reset_password.php" ||
      path === "/verify_email_confirm.php"
    ) {
      return "auth";
    }
    return "";
  }

  function normalizePageAppModes(raw) {
    if (!raw || typeof raw !== "object") return null;
    var keys = ["landing", "main", "song", "favorites", "setlists", "account", "news", "auth"];
    var normalized = {};
    var hasAny = false;
    keys.forEach(function(key) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        normalized[key] = !!raw[key];
        hasAny = true;
      }
    });
    return hasAny ? normalized : null;
  }

  function readStoredPageAppModes() {
    if (pageAppModesCache !== null) {
      return pageAppModesCache;
    }

    try {
      var raw = window.localStorage.getItem(PAGE_APP_MODES_CACHE_KEY);
      pageAppModesCache = normalizePageAppModes(raw ? JSON.parse(raw) : null);
    } catch (err) {
      pageAppModesCache = null;
    }

    return pageAppModesCache;
  }

  function persistPageAppModes(raw) {
    var normalized = normalizePageAppModes(raw);
    if (!normalized) return;
    pageAppModesCache = normalized;
    try {
      window.localStorage.setItem(PAGE_APP_MODES_CACHE_KEY, JSON.stringify(normalized));
    } catch (err) {
      // ignore storage issues
    }
  }

  function refreshPageAppModesFromManifest() {
    try {
      fetch("/version_manifest.php", { credentials: "same-origin", cache: "no-store" })
        .then(function(response) {
          if (!response.ok) throw new Error("manifest");
          return response.json();
        })
        .then(function(payload) {
          persistPageAppModes(payload && payload.page_app_modes ? payload.page_app_modes : null);
          if (!isPageAppEnabled()) {
            syncManifestForPageMode();
          }
        })
        .catch(function() {
          // ignore manifest read issues
        });
    } catch (err) {
      // ignore fetch support issues
    }
  }

  function isStandaloneMode() {
    if (!isPageAppEnabled()) {
      return false;
    }
    return getActiveAppSource() !== "";
  }

  function getPageAppModeSetting() {
    try {
      var meta = document.querySelector('meta[name="wp-app-enabled"]');
      if (meta) {
        return String(meta.getAttribute("content") || "").trim().toLowerCase();
      }
    } catch (err) {
      // ignore meta issues
    }

    var storedModes = readStoredPageAppModes();
    var pageKey = getCurrentPageAppKey();
    if (storedModes && pageKey && Object.prototype.hasOwnProperty.call(storedModes, pageKey)) {
      return storedModes[pageKey] ? "on" : "off";
    }

    return "";
  }

  function isPageAppEnabled() {
    var mode = getPageAppModeSetting();
    return mode !== "off" && mode !== "false" && mode !== "0" && mode !== "disabled";
  }

  function syncManifestForPageMode() {
    if (isPageAppEnabled()) return;
    try {
      document.querySelectorAll('link[rel="manifest"]').forEach(function(link) {
        link.setAttribute('data-wp-manifest-disabled', '1');
        link.removeAttribute('href');
      });
    } catch (err) {
      // ignore manifest adjustments
    }
  }

  function isAuthProgramPage() {
    var path = getCurrentPath();
    return path === "/loginuser.php" ||
      path === "/registeruser.php" ||
      path === "/forgot_password.php" ||
      path === "/forgot_password_sent.php" ||
      path === "/reset_password.php" ||
      path === "/verify_email_confirm.php";
  }

  function getFloatingOverlayBottomOffset() {
    var safeArea = 16;
    try {
      safeArea = Math.max(16, parseInt(getComputedStyle(document.body).paddingBottom || "16", 10) || 16);
    } catch (err) {}

    var dock = document.getElementById("wpAppDock");
    if (!dock) return safeArea;

    var rect = dock.getBoundingClientRect();
    if (!rect || !rect.height) return safeArea;

    return Math.max(safeArea, Math.round(window.innerHeight - rect.top + 12));
  }

  function getAppScope() {
    return getDeclaredAppScope();
  }

  function writeAppContextCookie(value) {
    try {
      if (!value) {
        document.cookie = "wp_app_context=; path=/; max-age=0; SameSite=Lax";
        return;
      }
      document.cookie = "wp_app_context=" + encodeURIComponent(value) + "; path=/; max-age=" + (7 * 24 * 60 * 60) + "; SameSite=Lax";
    } catch (err) {
      // ignore cookie errors
    }
  }

  function syncAppContextCookie() {
    writeAppContextCookie(getActiveAppSource());
  }

  function ensureStandaloneAppChrome() {
    if (!isStandaloneMode()) return;

    var apply = function() {
      if (!document.body) return;

      var scope = getAppScope();
      var isAdmin = scope === "admin";
      document.documentElement.classList.add("wp-standalone-app");
      document.body.classList.add("wp-standalone-app", isAdmin ? "wp-admin-app" : "wp-main-app");
      document.body.dataset.wpAppScope = scope;

      if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
        var statusMeta = document.createElement("meta");
        statusMeta.name = "apple-mobile-web-app-status-bar-style";
        statusMeta.content = "black-translucent";
        document.head.appendChild(statusMeta);
      }

      var themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute("content", isAdmin ? "#0f1730" : "#0b1020");
      }

      if (document.getElementById("wpStandaloneChromeStyles")) return;
      var style = document.createElement("style");
      style.id = "wpStandaloneChromeStyles";
      style.textContent =
        "html.wp-standalone-app{background:#0b1020;color-scheme:dark}" +
        "body.wp-standalone-app{min-height:100svh;padding-top:max(10px,env(safe-area-inset-top));padding-right:max(10px,env(safe-area-inset-right));padding-bottom:max(18px,env(safe-area-inset-bottom));padding-left:max(10px,env(safe-area-inset-left));overscroll-behavior-y:contain}" +
        "body.wp-main-app{background:radial-gradient(circle at top left,rgba(107,124,255,.18),transparent 28%),radial-gradient(circle at top right,rgba(87,214,195,.14),transparent 24%),linear-gradient(180deg,#0b1020 0%,#10182f 100%)}" +
        "body.wp-admin-app{background:radial-gradient(circle at top left,rgba(107,124,255,.2),transparent 26%),radial-gradient(circle at top right,rgba(87,214,195,.1),transparent 20%),linear-gradient(180deg,#0f1730 0%,#14203f 100%)}" +
        "body.wp-standalone-app::before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 22%),radial-gradient(circle at 20% 0%,rgba(255,255,255,.05),transparent 24%);z-index:0}" +
        "body.wp-standalone-app>*{position:relative;z-index:1}" +
        "body.wp-standalone-app .container,body.wp-standalone-app .shell,body.wp-standalone-app main{max-width:min(1480px,calc(100vw - 2px));margin-inline:auto}" +
        "body.wp-standalone-app .topbar,body.wp-standalone-app .toolbar,body.wp-standalone-app .header,body.wp-standalone-app .search-card,body.wp-standalone-app .table-card,body.wp-standalone-app .panel,body.wp-standalone-app .card{backdrop-filter:blur(20px) saturate(140%)}" +
        "body.wp-standalone-app .topbar,body.wp-standalone-app .toolbar,body.wp-standalone-app .header{border:1px solid rgba(255,255,255,.07);box-shadow:0 20px 44px rgba(0,0,0,.28)}" +
        "body.wp-admin-app .topbar{background:rgba(10,16,32,.52)}" +
        "body.wp-standalone-app .section{padding-bottom:max(28px,env(safe-area-inset-bottom))}" +
        "body.wp-standalone-app #wpInstallBanner,body.wp-standalone-app .wp-install{display:none!important}" +
        "@media (max-width:720px){body.wp-standalone-app{padding-top:max(8px,env(safe-area-inset-top));padding-right:max(8px,env(safe-area-inset-right));padding-bottom:max(16px,env(safe-area-inset-bottom));padding-left:max(8px,env(safe-area-inset-left))}}";
      document.head.appendChild(style);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
  }

  syncManifestForPageMode();
  refreshPageAppModesFromManifest();
  ensureStandaloneAppChrome();
  syncAppContextCookie();
  if (isStandaloneMode()) {
    writeAppContextCookie(getActiveAppSource());
  }

  function ensureStandaloneSourceParam() {
    if (!isStandaloneMode()) return;
    try {
      var url = new URL(window.location.href);
      var expectedSource = getActiveAppSource() || getExpectedAppSource();
      if ((url.searchParams.get("source") || "").toLowerCase() === expectedSource) {
        return;
      }
      url.searchParams.set("source", expectedSource);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch (err) {
      // ignore history/url errors
    }
  }

  function announceAppClient(registration) {
    if (!isStandaloneMode()) return;
    var target = navigator.serviceWorker.controller || (registration && registration.active);
    if (!target || typeof target.postMessage !== "function") return;
    target.postMessage({ type: "REGISTER_APP_CLIENT", scope: getAppScope() || "main" });
  }

  function preserveStandaloneNavigationContext() {
    if (!isStandaloneMode()) return;

    function buildAppUrl(rawUrl) {
      var source = getActiveAppSource() || getExpectedAppSource();
      if (!source || !rawUrl) return null;
      try {
        var url = new URL(rawUrl, window.location.href);
        if (url.origin !== window.location.origin) return null;
        url.searchParams.set("source", source);
        return url;
      } catch (err) {
        return null;
      }
    }

    document.addEventListener("click", function(event) {
      var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if ((anchor.getAttribute("target") || "").toLowerCase() === "_blank") return;

      var href = anchor.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;

      var nextUrl = buildAppUrl(href);
      if (!nextUrl) return;
      anchor.href = nextUrl.toString();
    }, true);

    document.addEventListener("submit", function(event) {
      var form = event.target;
      if (!form || !form.tagName || form.tagName.toLowerCase() !== "form") return;

      var nextUrl = buildAppUrl(form.getAttribute("action") || window.location.href);
      var source = getActiveAppSource() || getExpectedAppSource();
      if (!nextUrl || !source) return;

      form.setAttribute("action", nextUrl.toString());

      var hidden = form.querySelector('input[name="source"]');
      if (!hidden) {
        hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = "source";
        form.appendChild(hidden);
      }
      hidden.value = source;
    }, true);
  }

  preserveStandaloneNavigationContext();

  function showSyncToast(syncedAt, text) {
    var id = "wpSyncToast";
    var toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = id;
      toast.style.position = "fixed";
      toast.style.left = "50%";
      toast.style.bottom = "16px";
      toast.style.transform = "translateX(-50%) translateY(10px)";
      toast.style.opacity = "0";
      toast.style.transition = "opacity .22s ease, transform .22s ease";
      toast.style.zIndex = "100003";
      toast.style.maxWidth = "min(92vw, 460px)";
      toast.style.padding = "10px 14px";
      toast.style.borderRadius = "12px";
      toast.style.background = "rgba(18,24,32,.96)";
      toast.style.color = "#fff";
      toast.style.border = "1px solid rgba(255,255,255,.14)";
      toast.style.boxShadow = "0 10px 24px rgba(0,0,0,.32)";
      toast.style.font = "700 13px/1.35 Inter,system-ui,sans-serif";
      toast.style.textAlign = "center";
      document.body.appendChild(toast);
    }

    toast.textContent = text || "";
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(window.__wpSyncToastTimer);
    window.__wpSyncToastTimer = setTimeout(function() {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(10px)";
    }, 3200);
  }

  window.addEventListener("load", function() {
    ensureStandaloneSourceParam();
    navigator.serviceWorker.register("/sw.js").then(function(reg) {
      announceAppClient(reg);

      if (navigator.onLine) reg.update();
      window.addEventListener("online", function() {
        reg.update();
        announceAppClient(reg);
      });
    }).catch(function(err) {
      console.error("Service worker registration failed", err);
    });
  });

  window.addEventListener("pageshow", function() {
    if (!isStandaloneMode()) return;
    ensureStandaloneSourceParam();
    navigator.serviceWorker.ready.then(function(reg) {
      announceAppClient(reg);
    }).catch(function() {});
  });

  navigator.serviceWorker.addEventListener("message", function(event) {
    var data = event && event.data ? event.data : null;
    var pendingVersion = null;
    var onlineTransitionAt = 0;
    var onlineTriggered = false;
    var toastKey = "";

    if (data && data.type === "DATA_SYNC" && data.synced_at) {
      try {
        localStorage.setItem("wp_last_sync_at", data.synced_at);
      } catch (e) {
        // ignore localStorage errors
      }
      if (!isStandaloneMode()) return;
      if (!data.full_library) return;

      try {
        pendingVersion = localStorage.getItem("wp_pending_app_version");
      } catch (e) {}

      try {
        onlineTransitionAt = Number(sessionStorage.getItem("wp_last_online_transition_at") || "0");
      } catch (e) {}

      onlineTriggered = !!onlineTransitionAt && (Date.now() - onlineTransitionAt) < 20000;
      if (!pendingVersion && !onlineTriggered) return;

      if (onlineTriggered) {
        try {
          sessionStorage.removeItem("wp_last_online_transition_at");
        } catch (e) {}
      }

      toastKey = "app-full-sync:" + String(data.synced_at);
      if (window.__wpLastSyncToastKey === toastKey) return;
      window.__wpLastSyncToastKey = toastKey;

      showSyncToast(data.synced_at, "Ծրագիրը ամբողջությամբ թարմացվեց օֆֆլայն աշխատանքի համար։");
    }
  });

  function getNoticeTopOffset() {
    var safeTop = 14;
    try {
      var bodyStyle = window.getComputedStyle(document.body || document.documentElement);
      var safeInset = parseFloat(bodyStyle.getPropertyValue("--wp-safe-top") || "0");
      if (Number.isFinite(safeInset) && safeInset > 0) {
        safeTop += safeInset;
      }
    } catch (e) {}

    var appPagebar = document.getElementById("wpAppPagebar");
    if (appPagebar) {
      return Math.round(appPagebar.getBoundingClientRect().bottom + 12);
    }

    return safeTop;
  }

    function ensureNotice() {
    var existing = document.getElementById("wpNetNotice");
    if (existing) return existing;

    if (!document.getElementById("wpNetNoticeStyles")) {
      var style = document.createElement("style");
      style.id = "wpNetNoticeStyles";
      style.textContent =
        "#wpNetNotice{position:fixed!important;left:50%!important;top:16px!important;bottom:auto!important;right:auto!important;transform:translateX(-50%) translateY(-10px)!important;opacity:0;z-index:2147482400!important;background:rgba(18,24,32,.96);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 14px;font:700 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 10px 24px rgba(0,0,0,.32);transition:opacity .2s ease,transform .2s ease;max-width:min(92vw,420px);width:max-content;text-align:center;pointer-events:none}" +
        "#wpNetNotice.show{opacity:1;transform:translateX(-50%) translateY(0)!important}";
      document.head.appendChild(style);
    }

      var notice = document.createElement("div");
      notice.id = "wpNetNotice";
      notice.className = "wp-net-notice";
      notice.style.top = getNoticeTopOffset() + "px";
      notice.style.bottom = "auto";
      document.body.appendChild(notice);
      return notice;
    }

  var hideTimer = null;
    function showNotice(text, autoHide) {
      var notice = ensureNotice();
      notice.style.top = getNoticeTopOffset() + "px";
      notice.style.bottom = "auto";
      notice.textContent = text;
      notice.classList.add("show");
    if (hideTimer) clearTimeout(hideTimer);
    if (autoHide) {
      hideTimer = setTimeout(function() {
        notice.classList.remove("show");
      }, 2500);
    }
  }

  function showOffline() {
    showNotice("Ինտերնետ կապը բացակայում է։ Աշխատում եք օֆֆլայն ռեժիմում։", true);
  }

  function showOnline() {
    showNotice("Ինտերնետ կապը վերականգնվել է։", true);
  }

  function markOnlineTransition() {
    try {
      sessionStorage.setItem("wp_last_online_transition_at", String(Date.now()));
    } catch (e) {
      // ignore
    }
  }

  function enforceWebsiteOfflineScreen() {
    if (isStandaloneMode()) return;
    if (navigator.onLine) return;
    if (window.location.pathname === "/offline.html") return;
    window.location.replace("/offline.html");
  }

  window.addEventListener("offline", function() {
    showOffline();
    enforceWebsiteOfflineScreen();
  });
  window.addEventListener("online", function() {
    markOnlineTransition();
    showOnline();
  });
  window.addEventListener("resize", function() {
    var notice = document.getElementById("wpNetNotice");
    if (!notice) return;
    notice.style.top = getNoticeTopOffset() + "px";
    notice.style.bottom = "auto";
  });
  if (!navigator.onLine) {
    showOffline();
    enforceWebsiteOfflineScreen();
  }

  function requestOfflineLibrarySync() {
    if (!isStandaloneMode()) return;
    if (!navigator.onLine) return;

    navigator.serviceWorker.ready.then(function(reg) {
      if (reg.active) {
        reg.active.postMessage({ type: "SYNC_OFFLINE_LIBRARY" });
      }
    }).catch(function(err) {
      console.error("Offline library sync request failed", err);
    });
  }

  window.addEventListener("load", requestOfflineLibrarySync);
  window.addEventListener("online", requestOfflineLibrarySync);

  (function setupStandaloneInstallTracking() {
    if (!("fetch" in window)) return;
    if (getAppScope() === "admin") return;

    var installScope = getDeclaredAppScope() === "admin" ? "admin" : "main";
    var scopeSuffix = installScope === "admin" ? "_admin" : "";
    var deviceKey = installScope === "admin" ? "wp_admin_install_device_id" : "wp_install_device_id";
    var deviceCookieKey = deviceKey;
    var deviceSignatureCookieKey = installScope === "admin" ? "wp_admin_install_device_sig" : "wp_install_device_sig";
    var pingKey = "wp_install_last_ping_at" + scopeSuffix;
    var confirmedKey = "wp_install_confirmed" + scopeSuffix;
    var iosIntentKey = "wp_install_ios_intent" + scopeSuffix;
    var pingInterval = 12 * 60 * 60 * 1000;

    function escapeCookieName(name) {
      return String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function readCookie(name) {
      try {
        var match = document.cookie.match(new RegExp('(?:^|; )' + escapeCookieName(name) + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : "";
      } catch (e) {
        return "";
      }
    }

    function writeCookie(name, value, days) {
      try {
        var maxAge = Math.max(1, Math.floor((days || 3650) * 24 * 60 * 60));
        document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=" + maxAge + "; SameSite=Lax";
      } catch (e) {
        // ignore cookie errors
      }
    }

    function getDeviceId() {
      try {
        var existing = localStorage.getItem(deviceKey);
        if (existing) {
          writeCookie(deviceCookieKey, existing, 3650);
          return existing;
        }
        var cookieValue = readCookie(deviceCookieKey);
        if (cookieValue) {
          localStorage.setItem(deviceKey, cookieValue);
          return cookieValue;
        }
        var next = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : ("wp-" + Math.random().toString(36).slice(2) + Date.now()));
        localStorage.setItem(deviceKey, next);
        writeCookie(deviceCookieKey, next, 3650);
        return next;
      } catch (e) {
        var fallbackCookie = readCookie(deviceCookieKey);
        if (fallbackCookie) return fallbackCookie;
        var fallback = "wp-" + Math.random().toString(36).slice(2) + Date.now();
        writeCookie(deviceCookieKey, fallback, 3650);
        return fallback;
      }
    }

    function hasConfirmedInstall() {
      try {
        if (isStandaloneMode()) {
          localStorage.setItem(confirmedKey, "1");
          localStorage.removeItem(iosIntentKey);
          return true;
        }

        return localStorage.getItem(confirmedKey) === "1";
      } catch (e) {
        return false;
      }
    }

    function shouldPing() {
      try {
        var last = Number(localStorage.getItem(pingKey) || "0");
        return !last || (Date.now() - last) > pingInterval;
      } catch (e) {
        return true;
      }
    }

    function markPinged() {
      try {
        localStorage.setItem(pingKey, String(Date.now()));
      } catch (e) {
        // ignore
      }
    }

    function getInstallSignature() {
      try {
        var screenInfo = window.screen || {};
        var nav = window.navigator || {};
        var tz = "";
        try {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        } catch (err) {}

        var signatureParts = [
          "scope:" + installScope,
          "ua:" + (nav.userAgent || ""),
          "platform:" + (nav.platform || ""),
          "lang:" + (nav.language || ""),
          "langs:" + ((nav.languages || []).join(",")),
          "touch:" + String(nav.maxTouchPoints || 0),
          "cpu:" + String(nav.hardwareConcurrency || 0),
          "mem:" + String(nav.deviceMemory || 0),
          "screen:" + [screenInfo.width || 0, screenInfo.height || 0, screenInfo.colorDepth || 0].join("x"),
          "viewport:" + [window.innerWidth || 0, window.innerHeight || 0].join("x"),
          "dpr:" + String(window.devicePixelRatio || 1),
          "tz:" + tz
        ].join("|");

        var hash = 2166136261;
        for (var i = 0; i < signatureParts.length; i++) {
          hash ^= signatureParts.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }

        var signature = ("00000000" + (hash >>> 0).toString(16)).slice(-8) + ("00000000" + signatureParts.length.toString(16)).slice(-8);
        writeCookie(deviceSignatureCookieKey, signature, 3650);
        return signature;
      } catch (err) {
        return "";
      }
    }

    function registerInstall(options) {
      options = options || {};
      var force = !!options.force;
      if (!isStandaloneMode() || !hasConfirmedInstall() || !navigator.onLine) return;
      if (!force && !shouldPing()) return;

      fetch("/install_api.php?action=register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-App-Scope": installScope,
          "X-WP-Install-Mode": "standalone"
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          scope: installScope,
          source: installScope === "admin" ? "admin-app-verified" : "main-app-verified",
          device_id: getDeviceId(),
          device_signature: getInstallSignature()
        })
      }).then(function(response) {
        if (response && response.ok) {
          markPinged();
        }
      }).catch(function() {
        // ignore network errors
      });
    }

    function syncInstallIdentity() {
      if (!isStandaloneMode() || !hasConfirmedInstall() || !navigator.onLine) return Promise.resolve(false);

      return fetch("/install_identity_api.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Install-Identity": "1"
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          source: getExpectedAppSource(),
          device_signature: getInstallSignature()
        })
      }).then(function(response) {
        if (response && response.ok) {
          markPinged();
          return true;
        }
        return false;
      }).catch(function() {
        return false;
      });
    }

    function clearInstallIdentity() {
      if (!isStandaloneMode() || !hasConfirmedInstall() || !navigator.onLine) return Promise.resolve(false);

      return fetch("/install_identity_api.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Install-Identity": "1"
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          action: "clear",
          source: getExpectedAppSource(),
          device_signature: getInstallSignature()
        })
      }).then(function(response) {
        return !!(response && response.ok);
      }).catch(function() {
        return false;
      });
    }

    function cleanupLegacyMainInstallRecord() {
      if (installScope !== "admin" || !navigator.onLine) return Promise.resolve(false);

      var cleanupKey = "wp_admin_legacy_main_cleanup_done";
      try {
        if (localStorage.getItem(cleanupKey) === "1") {
          return Promise.resolve(false);
        }
      } catch (e) {}

      var legacyDeviceId = "";
      var legacySignature = "";
      try {
        legacyDeviceId = String(localStorage.getItem("wp_install_device_id") || readCookie("wp_install_device_id") || "").trim();
      } catch (e) {}
      try {
        legacySignature = String(readCookie("wp_install_device_sig") || "").trim();
      } catch (e) {}

      if (!legacyDeviceId && !legacySignature) {
        try {
          localStorage.setItem(cleanupKey, "1");
        } catch (e) {}
        return Promise.resolve(false);
      }

      return fetch("/install_api.php?action=cleanup_legacy_main", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-App-Scope": "admin",
          "X-WP-Install-Mode": "standalone"
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          scope: "admin",
          source: "admin-app-verified",
          legacy_device_id: legacyDeviceId,
          legacy_device_signature: legacySignature
        })
      }).then(function(response) {
        if (!response || !response.ok) return false;
        try {
          localStorage.setItem(cleanupKey, "1");
        } catch (e) {}
        return true;
      }).catch(function() {
        return false;
      });
    }

    window.WPInstallTracker = window.WPInstallTracker || {};
    window.WPInstallTracker.forceSyncCurrentInstall = function() {
      syncInstallIdentity().then(function(ok) {
        if (!ok) {
          registerInstall({ force: true });
        }
      });
    };
    window.WPInstallTracker.clearCurrentInstallIdentity = function() {
      return clearInstallIdentity();
    };

    window.addEventListener("load", function() {
      setTimeout(function() {
        registerInstall({ force: true });
        cleanupLegacyMainInstallRecord();
      }, 900);
    });
    window.addEventListener("online", registerInstall);

    (function setupRealtimeInstallIdentitySync() {
      var guardKey = "__wpRealtimeInstallIdentitySyncStarted";
      if (window[guardKey]) return;
      window[guardKey] = true;

      var pollDelay = 20000;
      var timerId = 0;
      var polling = false;
      var lastAuthState = "";

      function canPoll() {
        return isStandaloneMode() && hasConfirmedInstall() && navigator.onLine && !document.hidden;
      }

      function queueNextPoll() {
        window.clearTimeout(timerId);
        if (!canPoll()) return;
        timerId = window.setTimeout(function() {
          runPoll("interval");
        }, pollDelay);
      }

      function runPoll(reason) {
        if (polling || !canPoll()) {
          queueNextPoll();
          return;
        }

        polling = true;
        fetch("/account_api.php?action=auth_status", {
          credentials: "include",
          cache: "no-store"
        }).then(function(response) {
          if (!response || !response.ok) {
            throw new Error("auth_status");
          }
          return response.json();
        }).then(function(data) {
          var isLoggedIn = !!(data && data.logged_in && data.user_id);
          var nextState = isLoggedIn ? ("user:" + String(data.user_id)) : "guest";

          if (isLoggedIn && window.WPInstallTracker && typeof window.WPInstallTracker.forceSyncCurrentInstall === "function") {
            window.WPInstallTracker.forceSyncCurrentInstall();
          } else if (nextState === "guest" && lastAuthState !== "guest" && window.WPInstallTracker && typeof window.WPInstallTracker.clearCurrentInstallIdentity === "function") {
            window.WPInstallTracker.clearCurrentInstallIdentity();
          }

          lastAuthState = nextState;
        }).catch(function() {
          // ignore auth polling errors
        }).finally(function() {
          polling = false;
          queueNextPoll();
        });
      }

      window.addEventListener("pageshow", function() {
        runPoll("pageshow");
      });
      window.addEventListener("focus", function() {
        runPoll("focus");
      });
      window.addEventListener("online", function() {
        runPoll("online");
      });
      document.addEventListener("visibilitychange", function() {
        if (!document.hidden) {
          runPoll("visible");
        } else {
          window.clearTimeout(timerId);
        }
      });

      window.setTimeout(function() {
        runPoll("boot");
      }, 1400);
    })();
  })();

  (function setupPushPrompt() {
    if (window.WPPushManager) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!isStandaloneMode()) return;

    var config = null;
    var sessionHideKey = "wp_push_prompt_hidden_session";
    var disabledKey = "wp_push_prompt_disabled";
    var accountDisabledKey = "wp_push_account_disabled";
    var autoAttemptKey = "wp_push_auto_attempted";
    var adminRemovedKey = "wp_push_admin_removed";
    var pushPromptText = "Ցանկանո՞ւմ եք միացնել Worship Platform-ի ծանուցումները, որպեսզի ստանաք նորությունները, թարմացումներն ու հայտարարությունները։";

    function ensureStyles() {
      if (document.getElementById("wpPushStyles")) return;
      var style = document.createElement("style");
      style.id = "wpPushStyles";
      style.textContent =
        ".wp-push{position:fixed;left:16px;right:16px;bottom:16px;z-index:100000;display:none;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(18,24,32,.96);color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 30px rgba(0,0,0,.35);font-family:Inter,system-ui,sans-serif}" +
        ".wp-push.show{display:flex}" +
        ".wp-push-text{font-size:13px;font-weight:700;line-height:1.35}" +
        ".wp-push-actions{display:flex;gap:8px;flex:0 0 auto}" +
        ".wp-push button{border:0;border-radius:10px;padding:8px 10px;cursor:pointer;font-weight:700;font-size:12px}" +
        ".wp-push-enable{background:linear-gradient(135deg,#18a957,#6b7cff);color:#fff}" +
        ".wp-push-close{background:rgba(255,255,255,.14);color:#fff}" +
        "@media (min-width: 860px){.wp-push{left:auto;right:16px;max-width:390px}}" +
        "body.wp-main-app .wp-push{left:50%;right:auto;transform:translateX(-50%);width:min(420px,calc(100vw - 36px));max-width:none}" +
        "body.wp-main-app .wp-push-text{flex:1 1 auto}" +
        "body.wp-main-app .wp-push-actions{align-self:flex-end}" +
        "@media (max-width:720px){body.wp-main-app .wp-push{width:min(340px,calc(100vw - 24px));padding:11px 12px;gap:8px}body.wp-main-app .wp-push-text{font-size:12px}body.wp-main-app .wp-push button{padding:8px 9px;font-size:12px}}";
      document.head.appendChild(style);
    }

    function ensureBanner() {
      var existing = document.getElementById("wpPushBanner");
      if (existing) {
        applyBannerLayout(existing);
        return existing;
      }
      ensureStyles();
      var banner = document.createElement("div");
      banner.id = "wpPushBanner";
      banner.className = "wp-push";
      banner.innerHTML =
        '<div class="wp-push-text">' + pushPromptText + "</div>" +
        '<div class="wp-push-actions">' +
        '  <button class="wp-push-close" type="button">Հետո</button>' +
        '  <button class="wp-push-enable" type="button">Միացնել</button>' +
        "</div>";
      document.body.appendChild(banner);
      applyBannerLayout(banner);
      return banner;
    }

    function applyBannerLayout(banner) {
      if (!banner) return;
      if (document.body && document.body.classList.contains("wp-main-app")) {
        var compact = !!(window.matchMedia && window.matchMedia("(max-width: 720px)").matches);
        banner.style.position = "fixed";
        banner.style.left = "50%";
        banner.style.right = "auto";
        banner.style.transform = "translateX(-50%)";
        banner.style.width = compact ? "min(340px, calc(100vw - 24px))" : "min(420px, calc(100vw - 36px))";
        banner.style.maxWidth = "none";
        banner.style.margin = "0";
      }
    }

    function setAdminRemoved(flag) {
      try {
        if (flag) {
          localStorage.setItem(adminRemovedKey, "1");
        } else {
          localStorage.removeItem(adminRemovedKey);
        }
      } catch (err) {}
    }

    function isAdminRemoved() {
      try {
        return localStorage.getItem(adminRemovedKey) === "1";
      } catch (err) {
        return false;
      }
    }

    function urlBase64ToUint8Array(base64String) {
      var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      var rawData = window.atob(base64);
      var outputArray = new Uint8Array(rawData.length);
      for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    async function fetchConfig() {
      if (config) return config;
      try {
        var res = await fetch("/push_api.php?action=config", { cache: "no-store" });
        if (!res.ok) return null;
        config = await res.json();
        return config;
      } catch (err) {
        return null;
      }
    }

    async function handleAdminDisabled(subscription) {
      try {
        if (subscription) {
          await subscription.unsubscribe();
        }
      } catch (err) {
        console.error("Push local unsubscribe failed", err);
      }

      setAdminRemoved(true);
      setUserDisabled(false);
      setSessionHidden(false);
      hideBanner();
      setTimeout(function() {
        showBannerIfNeeded();
      }, 500);
    }

    async function registerSubscription(forceEnable) {
      var currentConfig = await fetchConfig();
      if (!currentConfig || !currentConfig.enabled || !currentConfig.publicKey) return false;

      try {
        var registration = await navigator.serviceWorker.ready;
        var subscription = await registration.pushManager.getSubscription();
        if (!subscription && !forceEnable) {
          return false;
        }
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(currentConfig.publicKey)
          });
        }

        var response = await fetch("/push_api.php?action=subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            force_enable: !!forceEnable
          })
        });
        var result = null;
        try {
          result = await response.json();
        } catch (err) {}

        if (!response.ok || !result || !result.ok) {
          if (result && result.disabled_by_admin) {
            await handleAdminDisabled(subscription);
          }
          return false;
        }
        setAdminRemoved(false);
        return true;
      } catch (err) {
        console.error("Push subscribe failed", err);
        return false;
      }
    }

    async function unregisterSubscription() {
      try {
        var registration = await navigator.serviceWorker.ready;
        var subscription = await registration.pushManager.getSubscription();
        if (!subscription) return true;

        await fetch("/push_api.php?action=unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        await subscription.unsubscribe();
        return true;
      } catch (err) {
        console.error("Push unsubscribe failed", err);
        return false;
      }
    }

    function setSessionHidden(hidden) {
      try {
        if (hidden) {
          sessionStorage.setItem(sessionHideKey, "1");
        } else {
          sessionStorage.removeItem(sessionHideKey);
        }
      } catch (err) {}
    }

    function isSessionHidden() {
      try {
        return sessionStorage.getItem(sessionHideKey) === "1";
      } catch (err) {
        return false;
      }
    }

    function setUserDisabled(disabled) {
      try {
        if (disabled) {
          localStorage.setItem(disabledKey, "1");
        } else {
          localStorage.removeItem(disabledKey);
        }
      } catch (err) {}
    }

    function setAccountDisabled(disabled) {
      try {
        if (disabled) {
          localStorage.setItem(accountDisabledKey, "1");
        } else {
          localStorage.removeItem(accountDisabledKey);
        }
      } catch (err) {}
    }

    function isUserDisabled() {
      try {
        return localStorage.getItem(disabledKey) === "1";
      } catch (err) {
        return false;
      }
    }

    function isAccountDisabled() {
      try {
        return localStorage.getItem(accountDisabledKey) === "1";
      } catch (err) {
        return false;
      }
    }

    function hideBanner() {
      var banner = document.getElementById("wpPushBanner");
      if (banner) banner.classList.remove("show");
    }

    function clearPromptSuppression() {
      setSessionHidden(false);
      setUserDisabled(false);
    }

    async function restorePromptAfterExternalDisable() {
      if (Notification.permission === "denied") return;

      var hasSubscription = false;
      try {
        var registration = await navigator.serviceWorker.ready;
        hasSubscription = !!(await registration.pushManager.getSubscription());
      } catch (err) {
        hasSubscription = false;
      }

      if (hasSubscription) return;

      setAccountDisabled(false);
      setUserDisabled(false);
      setSessionHidden(false);
    }

    function clearLegacyPromptSuppressionForApp() {
      if (!isStandaloneMode()) return;
      if (isAccountDisabled()) return;
      if (Notification.permission === "denied") return;

      try {
        sessionStorage.removeItem(sessionHideKey);
      } catch (err) {}

      try {
        localStorage.removeItem(disabledKey);
      } catch (err) {}
    }

    async function getStatus() {
      var currentConfig = await fetchConfig();
      var subscription = null;

      try {
        var registration = await navigator.serviceWorker.ready;
        subscription = await registration.pushManager.getSubscription();
      } catch (err) {
        subscription = null;
      }

      return {
        supported: !!currentConfig && !!currentConfig.supported,
        enabledBySite: !!currentConfig && !!currentConfig.enabled,
        permission: Notification.permission,
        subscribed: !!subscription,
        suppressed: isSessionHidden(),
        userDisabled: isUserDisabled(),
        accountDisabled: isAccountDisabled(),
        adminRemoved: isAdminRemoved()
      };
    }

    async function enablePush(options) {
      options = options || {};
      clearPromptSuppression();

      try {
        var permission = await Notification.requestPermission();
        if (permission === "granted") {
          setAccountDisabled(false);
          var ok = await registerSubscription(true);
          if (ok) hideBanner();
          return { ok: ok, permission: permission };
        }

        if (permission === "denied") {
          setUserDisabled(true);
          hideBanner();
        } else if (options.persistOnDecline) {
          setSessionHidden(true);
          hideBanner();
        }
        return { ok: false, permission: permission };
      } catch (err) {
        console.error("Push permission request failed", err);
        return { ok: false, permission: Notification.permission, error: err };
      }
    }

    async function disablePush() {
      setAdminRemoved(false);
      setAccountDisabled(false);
      setUserDisabled(false);
      setSessionHidden(false);
      hideBanner();
      var ok = await unregisterSubscription();
      if (ok && Notification.permission !== "denied") {
        setTimeout(function() {
          showBannerIfNeeded();
        }, 600);
      }
      return { ok: ok, permission: Notification.permission };
    }

    async function showBannerIfNeeded() {
      if (isAuthProgramPage()) {
        hideBanner();
        return;
      }
      var currentConfig = await fetchConfig();
      if (!currentConfig || !currentConfig.enabled) return;
      if (Notification.permission === "denied") return;
      if (isAccountDisabled()) return;
      if (isUserDisabled()) return;
      if (isSessionHidden()) return;

      var adminRemoved = isAdminRemoved();
      var hasSubscription = false;
      try {
        var registration = await navigator.serviceWorker.ready;
        hasSubscription = !!(await registration.pushManager.getSubscription());
      } catch (err) {
        hasSubscription = false;
      }
      if (Notification.permission === "granted" && hasSubscription && !adminRemoved) return;

      var banner = ensureBanner();
      var text = banner.querySelector(".wp-push-text");
      applyBannerLayout(banner);
      banner.style.bottom = getFloatingOverlayBottomOffset() + "px";
      if (text) {
        text.textContent = pushPromptText;
      }
      banner.classList.add("show");

      var enableBtn = banner.querySelector(".wp-push-enable");
      var closeBtn = banner.querySelector(".wp-push-close");

      if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.dataset.bound = "1";
        closeBtn.onclick = function() {
          setSessionHidden(true);
          hideBanner();
        };
      }

      if (enableBtn && !enableBtn.dataset.bound) {
        enableBtn.dataset.bound = "1";
        enableBtn.onclick = async function() {
          await enablePush({ persistOnDecline: true });
        };
      }
    }

    window.addEventListener("resize", function() {
      var banner = document.getElementById("wpPushBanner");
      if (!banner) return;
      applyBannerLayout(banner);
      banner.style.bottom = getFloatingOverlayBottomOffset() + "px";
    });

    async function tryAutomaticPrompt() {
      var currentConfig = await fetchConfig();
      if (!currentConfig || !currentConfig.enabled) return;
      if (Notification.permission !== "default") return;
      if (isAccountDisabled()) return;
      if (isUserDisabled() || isSessionHidden()) return;
      if (isAdminRemoved()) return;

      try {
        var lastAttempt = Number(localStorage.getItem(autoAttemptKey) || "0");
        var retryAfter = isStandaloneMode() ? (12 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000);
        if (lastAttempt && (Date.now() - lastAttempt) < retryAfter) return;
        localStorage.setItem(autoAttemptKey, String(Date.now()));
      } catch (err) {}

      var result = await enablePush({ persistOnDecline: false });
      if (!result.ok && Notification.permission === "default") {
        setTimeout(function() {
          showBannerIfNeeded();
        }, 1200);
      }
    }

    window.WPPushManager = {
      getStatus: getStatus,
      enable: function() {
        return enablePush({ persistOnDecline: false });
      },
      disable: disablePush,
      registerSubscription: registerSubscription,
      showPrompt: showBannerIfNeeded,
      suppressPrompt: function() {
        setSessionHidden(true);
        hideBanner();
      },
      clearSuppression: clearPromptSuppression
    };

    window.addEventListener("load", async function() {
      var currentConfig = await fetchConfig();
      if (!currentConfig || !currentConfig.enabled) return;

      clearLegacyPromptSuppressionForApp();
      await restorePromptAfterExternalDisable();

      if (Notification.permission === "granted") {
        var registered = await registerSubscription(false);
        if (!registered) {
          setTimeout(function() {
            showBannerIfNeeded();
          }, 800);
        }
        return;
      }

      setTimeout(function() {
        tryAutomaticPrompt();
      }, isStandaloneMode() ? 600 : 900);

      setTimeout(function() {
        showBannerIfNeeded();
      }, isStandaloneMode() ? 1400 : 2200);
    });
  })();
})();
