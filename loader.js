// loader.js
(function(){
  (function ensureVersionCheckScript(){
    if(document.querySelector('script[data-wp-version-check="1"]')) return;
    const script = document.createElement('script');
    script.src = '/version-check.js?v=' + Date.now();
    script.defer = true;
    script.dataset.wpVersionCheck = '1';
    document.head.appendChild(script);
  })();

  (function ensureMobileFormFontRule(){
    if (document.getElementById('wp-mobile-form-font-rule')) return;
    var style = document.createElement('style');
    style.id = 'wp-mobile-form-font-rule';
    style.textContent = '@media (max-width: 900px){input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select{font-size:16px !important;}}';
    document.head.appendChild(style);
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
    return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
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
    if (path === "/setlists.html" || path === "/setlist_edit.html" || path === "/setlist_view.html" || path === "/setlist_public.html") return "setlists";
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

  function isStandaloneAppMode() {
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

  function isLikelyPhoneBrowser() {
    try {
      var ua = window.navigator.userAgent || "";
      var isPhoneUa = /iphone|ipod|android.+mobile|windows phone/i.test(ua);
      if (!isPhoneUa) return false;
      if (window.matchMedia && !window.matchMedia("(max-width: 900px)").matches) return false;
      return true;
    } catch (err) {
      return false;
    }
  }

  function ensureStandaloneAppChrome() {
    if (!isStandaloneAppMode()) return;

    var apply = function() {
      if (!document.body) return;

      document.documentElement.classList.add("wp-standalone-app");
      document.body.classList.add("wp-standalone-app", "wp-main-app");
      document.body.dataset.wpAppScope = "main";

      if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
        var statusMeta = document.createElement("meta");
        statusMeta.name = "apple-mobile-web-app-status-bar-style";
        statusMeta.content = "black-translucent";
        document.head.appendChild(statusMeta);
      }

      var themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute("content", "#0b1020");
      }

      if (document.getElementById("wpStandaloneChromeStyles")) return;
      var style = document.createElement("style");
      style.id = "wpStandaloneChromeStyles";
      style.textContent =
        "html.wp-standalone-app{background:#0b1020;color-scheme:dark}" +
        "body.wp-standalone-app{min-height:100svh;padding-top:max(10px,env(safe-area-inset-top));padding-right:max(10px,env(safe-area-inset-right));padding-bottom:max(18px,env(safe-area-inset-bottom));padding-left:max(10px,env(safe-area-inset-left));background:radial-gradient(circle at top left,rgba(107,124,255,.18),transparent 28%),radial-gradient(circle at top right,rgba(87,214,195,.14),transparent 24%),linear-gradient(180deg,#0b1020 0%,#10182f 100%);overscroll-behavior-y:contain}" +
        "body.wp-standalone-app::before{content:'';position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 22%),radial-gradient(circle at 20% 0%,rgba(255,255,255,.05),transparent 24%);z-index:0}" +
        "body.wp-standalone-app>*{position:relative;z-index:1}" +
        "body.wp-standalone-app .container,body.wp-standalone-app .shell,body.wp-standalone-app .auth-shell,body.wp-standalone-app main{max-width:min(1480px,calc(100vw - 2px));margin-inline:auto}" +
        "body.wp-standalone-app .header,body.wp-standalone-app .search-card,body.wp-standalone-app .table-card,body.wp-standalone-app .theme-btn,body.wp-standalone-app .link-modern,body.wp-standalone-app .table-header{backdrop-filter:blur(20px) saturate(140%)}" +
        "body.wp-standalone-app .header{border:1px solid rgba(255,255,255,.07);border-radius:24px;box-shadow:0 20px 44px rgba(0,0,0,.28);background:rgba(11,16,32,.28)}" +
        "body.wp-standalone-app .section{padding-bottom:max(28px,env(safe-area-inset-bottom))}" +
        "body.wp-standalone-app #wpInstallBanner,body.wp-standalone-app .wp-install{display:none!important}" +
        "@media (max-width:720px){body.wp-standalone-app{padding-top:max(8px,env(safe-area-inset-top));padding-right:max(8px,env(safe-area-inset-right));padding-bottom:max(16px,env(safe-area-inset-bottom));padding-left:max(8px,env(safe-area-inset-left))}body.wp-standalone-app .header{border-radius:18px}}";
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

  syncAppContextCookie();

  if (isStandaloneAppMode()) {
    writeAppContextCookie(getActiveAppSource());
  }

  function i18nText(key, fallback) {
    try {
      if (window.wpI18n && typeof window.wpI18n.t === "function") {
        return window.wpI18n.t(key, fallback);
      }
    } catch (err) {
      // ignore i18n lookup errors
    }
    return fallback;
  }

  function getStandalonePageMeta() {
    var path = (window.location.pathname || "/").toLowerCase();
    if (path === "/" || path === "/index.html") {
      return {
        key: "landing",
        title: i18nText("app.meta.landingTitle", "Worship ծրագիր"),
        subtitle: i18nText("app.meta.landingSubtitle", "Արագ մուտք երգերի գրադարան"),
      };
    }
    if (path === "/main.html") {
      return {
        key: "songs",
        title: i18nText("app.meta.songsTitle", "Երգերի գրադարան"),
        subtitle: i18nText("app.meta.songsSubtitle", "Որոնում, բառեր, ակորդներ և օֆֆլայն աշխատանք"),
      };
    }
    if (path === "/favorites.html") {
      return {
        key: "favorites",
        title: i18nText("app.meta.favoritesTitle", "Պահպանված երգեր"),
        subtitle: i18nText("app.meta.favoritesSubtitle", "Արագ մուտք քո ընտրված երգերին"),
      };
    }
    if (path === "/setlists.html" || path === "/setlist_edit.html" || path === "/setlist_view.html" || path === "/setlist_public.html") {
      return {
        key: "setlists",
        title: i18nText("app.meta.setlistsTitle", "Սեթլիստներ"),
        subtitle: i18nText("app.meta.setlistsSubtitle", "Ծառայության երգացանկ և աշխատանքային հերթականություն"),
      };
    }
    if (path === "/account.html") {
      return {
        key: "account",
        title: i18nText("app.meta.accountTitle", "Իմ հաշիվը"),
        subtitle: i18nText("app.meta.accountSubtitle", "Կարգավորումներ, push և պրոֆիլ"),
      };
    }
    if (
      path === "/loginuser.php" ||
      path === "/registeruser.php" ||
      path === "/forgot_password.php" ||
      path === "/forgot_password_sent.php" ||
      path === "/reset_password.php" ||
      path === "/verify_email_confirm.php"
    ) {
      return {
        key: "account",
        title: i18nText("app.meta.authTitle", "Մուտք և հաշիվ"),
        subtitle: i18nText("app.meta.authSubtitle", "Ծրագրային մուտք, գրանցում և հաշվի վերականգնում"),
      };
    }
    if (path === "/song_view.html") {
      return {
        key: "song",
        title: i18nText("app.meta.songTitle", "Երգի դիտում"),
        subtitle: i18nText("app.meta.songSubtitle", "Ակորդներ, transpose և պահպանում"),
      };
    }
    if (path === "/song_request.html") {
      return {
        key: "song-request",
        title: i18nText("app.meta.songRequestTitle", "Մոդերացիա"),
        subtitle: i18nText("app.meta.songRequestSubtitle", "Նոր երգի և խմբագրման հարցումների ուղարկում"),
      };
    }
    if (path === "/news.html") {
      return {
        key: "news",
        title: i18nText("app.meta.newsTitle", "Նորություններ"),
        subtitle: i18nText("app.meta.newsSubtitle", "Վերջին հայտարարություններն ու թարմացումները"),
      };
    }
    return {
      key: "app",
      title: i18nText("app.meta.appTitle", "Worship ծրագիր"),
      subtitle: i18nText("app.meta.appSubtitle", "Արագ և հարմար worship աշխատանքային տարածք"),
    };
  }

  function redirectStandaloneLandingToAppHome() {
    if (!isStandaloneAppMode()) return;
    var path = (window.location.pathname || "/").toLowerCase();
    if (path !== "/" && path !== "/index.html") return;
    try {
      var target = new URL("/main.html", window.location.origin);
      target.searchParams.set("source", "pwa");
      if (window.location.href !== target.toString()) {
        window.location.replace(target.toString());
      }
    } catch (err) {
      // ignore redirect errors
    }
  }

  function preserveStandaloneNavigationContext() {
    if (!isStandaloneAppMode()) return;

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

  window.WP = window.WP || {};
  window.WP.withAppSource = function(rawUrl) {
    var source = getActiveAppSource();
    if (!source || !rawUrl) return rawUrl;
    try {
      var url = new URL(rawUrl, window.location.href);
      if (url.origin !== window.location.origin) return rawUrl;
      url.searchParams.set("source", source);
      return url.toString();
    } catch (err) {
      return rawUrl;
    }
  };

  function ensureStandaloneAppInterface() {
    if (!isStandaloneAppMode()) return;

    var apply = function() {
      if (!document.body) return;

      var pageMeta = getStandalonePageMeta();
      document.body.dataset.wpAppPage = pageMeta.key;

      if (!document.getElementById("wpStandaloneAppUiStyles")) {
        var style = document.createElement("style");
        style.id = "wpStandaloneAppUiStyles";
        style.textContent =
          "body.wp-main-app nav:not(#wpAppDock){display:none!important}" +
          "body.wp-main-app #menu,body.wp-main-app .hamburger{display:none!important}" +
          "body.wp-main-app footer.worship-footer{display:none!important}" +
          "body.wp-main-app .container>br{display:none!important}" +
          "body.wp-main-app .container{padding-bottom:122px}" +
          "body.wp-main-app #wpAppPagebar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 auto 18px;max-width:min(1480px,calc(100vw - 2px));padding:20px 22px;border:1px solid rgba(255,255,255,.08);border-radius:28px;background:linear-gradient(180deg,rgba(10,16,32,.74),rgba(10,16,32,.54));box-shadow:0 24px 60px rgba(0,0,0,.26)}" +
          "body.wp-main-app .wp-app-pagebar-copy{display:flex;flex-direction:column;gap:6px;min-width:0}" +
          "body.wp-main-app .wp-app-pagebar-kicker{font:800 12px/1.1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8ea1ff}" +
          "body.wp-main-app .wp-app-pagebar-title{font:800 clamp(22px,3vw,30px)/1.05 Inter,system-ui,sans-serif;color:#eef3ff;letter-spacing:-.03em}" +
          "body.wp-main-app .wp-app-pagebar-subtitle{font:600 13px/1.45 Inter,system-ui,sans-serif;color:#9aa7bf;max-width:560px}" +
          "body.wp-main-app .wp-app-pagebar-side{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}" +
          "body.wp-main-app .wp-app-chip{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#eef3ff;font:700 12px/1 Inter,system-ui,sans-serif;white-space:nowrap}" +
          "body.wp-main-app .wp-app-chip.status-online{background:rgba(96,211,148,.14);color:#bff0cf;border-color:rgba(96,211,148,.24)}" +
          "body.wp-main-app .wp-app-chip.status-offline{background:rgba(255,107,122,.14);color:#ffd4da;border-color:rgba(255,107,122,.24)}" +
          "body.wp-main-app #wpAppDock{position:fixed;top:auto;right:auto;left:50%;bottom:max(16px,env(safe-area-inset-bottom));width:min(536px,calc(100vw - 64px));transform:translateX(-50%);z-index:100010;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;justify-content:stretch;gap:6px;padding:6px;border-radius:22px;background:linear-gradient(180deg,rgba(13,18,31,.94),rgba(9,13,23,.92));border:1px solid rgba(255,255,255,.07);box-shadow:0 20px 36px rgba(0,0,0,.3),0 6px 16px rgba(0,0,0,.16);backdrop-filter:blur(18px) saturate(124%);-webkit-backdrop-filter:blur(18px) saturate(124%);overflow:hidden;isolation:isolate;transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease}" +
          "body.wp-main-app #wpAppDock::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0));pointer-events:none;z-index:0}" +
          "body.wp-main-app #wpAppDock::after{display:none}" +
          "body.wp-main-app #wpAppDockIndicator{position:absolute;top:0;left:0;width:122px;height:56px;border-radius:17px;background:linear-gradient(180deg,rgba(104,126,255,.2),rgba(104,126,255,.1));border:1px solid rgba(122,142,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 8px 16px rgba(18,24,43,.14);transform:translate3d(0,0,0);transition:transform .16s cubic-bezier(.2,.9,.25,1),width .16s cubic-bezier(.2,.9,.25,1),height .16s cubic-bezier(.2,.9,.25,1),opacity .12s ease;opacity:0;z-index:1;pointer-events:none;overflow:hidden;will-change:transform,width,height}" +
          "body.wp-main-app #wpAppDockIndicator::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 52%);opacity:1}" +
          "body.wp-main-app #wpAppDockIndicator::after{display:none}" +
          "body.wp-main-app #wpAppDockIndicator.ready{opacity:1}" +
          "body.wp-main-app #wpAppTransitionVeil{position:fixed;inset:0;z-index:100009;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 100%,rgba(103,125,255,.12),transparent 24%),radial-gradient(circle at 50% 0%,rgba(255,255,255,.06),transparent 30%),linear-gradient(180deg,rgba(5,7,13,.02),rgba(5,7,13,.18));backdrop-filter:blur(0px) saturate(110%);-webkit-backdrop-filter:blur(0px) saturate(110%);transition:opacity .24s ease,backdrop-filter .24s ease,-webkit-backdrop-filter .24s ease}" +
          "body.wp-main-app.wp-app-transitioning #wpAppTransitionVeil{opacity:1;backdrop-filter:blur(10px) saturate(124%);-webkit-backdrop-filter:blur(10px) saturate(124%)}" +
          "body.wp-main-app #wpAppDock.dragging{transform:translateX(-50%) scale(.988);box-shadow:0 16px 30px rgba(0,0,0,.34),0 6px 14px rgba(0,0,0,.2)}" +
          "body.wp-main-app #wpAppDock.dragging #wpAppDockIndicator{transition:none;box-shadow:0 16px 26px rgba(72,93,199,.26),inset 0 1px 0 rgba(255,255,255,.1)}" +
          "body.wp-main-app.wp-app-transitioning #wpAppDock{opacity:.995;transform:translateX(-50%) translateY(2px) scale(.985)}" +
          "body.wp-main-app.wp-app-transitioning #wpAppDockIndicator{box-shadow:0 16px 26px rgba(72,93,199,.28),inset 0 1px 0 rgba(255,255,255,.1)}" +
          "body.wp-main-app .container,body.wp-main-app .wrap,body.wp-main-app .app,body.wp-main-app .auth-shell,body.wp-main-app #wpAppPagebar,body.wp-main-app #wpAppHomeHero{transition:opacity .22s ease,transform .22s ease,filter .22s ease}" +
          "body.wp-main-app.wp-app-transitioning .container,body.wp-main-app.wp-app-transitioning .wrap,body.wp-main-app.wp-app-transitioning .app,body.wp-main-app.wp-app-transitioning .auth-shell,body.wp-main-app.wp-app-transitioning #wpAppPagebar,body.wp-main-app.wp-app-transitioning #wpAppHomeHero{opacity:.92;transform:translateY(6px) scale(.996);filter:saturate(108%)}" +
          "body.wp-main-app.wp-app-entering .container,body.wp-main-app.wp-app-entering .wrap,body.wp-main-app.wp-app-entering .app,body.wp-main-app.wp-app-entering .auth-shell,body.wp-main-app.wp-app-entering #wpAppPagebar,body.wp-main-app.wp-app-entering #wpAppHomeHero{opacity:.01;transform:translateY(10px) scale(.994);filter:saturate(104%)}" +
          "body.wp-main-app .wp-app-dock-link{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:52px;padding:7px 8px 8px;border-radius:16px;color:#97a2b8;text-decoration:none;font:700 10px/1 Inter,system-ui,sans-serif;transition:color .12s ease,transform .12s ease,opacity .12s ease;transform:translateZ(0);overflow:hidden;text-align:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent}" +
          "body.wp-main-app .wp-app-dock-link::before{display:none}" +
          "body.wp-main-app .wp-app-dock-link span{display:flex;align-items:center;justify-content:center;min-height:12px;max-width:100%;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:opacity .14s ease,color .14s ease;letter-spacing:-.01em}" +
          "body.wp-main-app .wp-app-dock-label-full{display:flex!important}" +
          "body.wp-main-app .wp-app-dock-label-short{display:none!important}" +
          "body.wp-main-app .wp-app-dock-link:hover{color:#f3f6ff}" +
          "body.wp-main-app .wp-app-dock-link.active{color:#dfe6ff}" +
          "body.wp-main-app .wp-app-dock-link.is-preview{color:#dfe6ff}" +
          "body.wp-main-app .wp-app-dock-link.is-pressing{transform:scale(.965)!important}" +
          "body.wp-main-app.wp-app-transitioning .wp-app-dock-link{opacity:.9}" +
          "body.wp-main-app.wp-app-transitioning .wp-app-dock-link.active,body.wp-main-app.wp-app-transitioning .wp-app-dock-link.is-preview{opacity:1}" +
          "body.wp-main-app .wp-app-dock-link svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round;transition:transform .12s ease,stroke .12s ease,opacity .12s ease}" +
          "body.wp-main-app .wp-app-dock-link.active svg,body.wp-main-app .wp-app-dock-link.is-preview svg{transform:translateY(-1px)}" +
          "body.wp-main-app .wp-app-dock-link.active span,body.wp-main-app .wp-app-dock-link.is-preview span{opacity:1}" +
          "body.wp-main-app #wpAppHomeHero{display:grid;grid-template-columns:minmax(0,1.2fr) auto;gap:18px;align-items:end;margin:0 0 18px;padding:24px 24px 22px;border-radius:30px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(140deg,rgba(15,22,44,.92),rgba(10,16,32,.66));box-shadow:0 26px 70px rgba(0,0,0,.28)}" +
          "body.wp-main-app .wp-app-home-copy{display:flex;flex-direction:column;gap:10px}" +
          "body.wp-main-app .wp-app-home-eyebrow{font:800 12px/1.1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#f6c87a}" +
          "body.wp-main-app .wp-app-home-title{font:800 clamp(30px,4vw,46px)/.98 Inter,system-ui,sans-serif;color:#eef3ff;letter-spacing:-.05em}" +
          "body.wp-main-app .wp-app-home-text{font:600 14px/1.55 Inter,system-ui,sans-serif;color:#aab6cf;max-width:560px}" +
          "body.wp-main-app .wp-app-home-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:2px}" +
          "body.wp-main-app .wp-app-home-link{display:inline-flex;align-items:center;gap:8px;padding:12px 16px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#eef3ff;text-decoration:none;font:700 13px/1 Inter,system-ui,sans-serif}" +
          "body.wp-main-app .wp-app-home-link.primary{background:linear-gradient(135deg,#6b7cff,#8ea1ff);border-color:transparent;color:#fff;box-shadow:0 14px 30px rgba(107,124,255,.28)}" +
          "body.wp-main-app .wp-app-home-meta{display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:10px;min-width:280px}" +
          "body.wp-main-app .wp-app-home-stat{padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}" +
          "body.wp-main-app .wp-app-home-stat strong{display:block;font:800 20px/1 Inter,system-ui,sans-serif;color:#eef3ff;margin-bottom:6px}" +
          "body.wp-main-app .wp-app-home-stat span{display:block;font:700 12px/1.4 Inter,system-ui,sans-serif;color:#9aa7bf}" +
          "body.wp-main-app[data-wp-app-page='songs'] #wpAppHomeHero{display:none!important}" +
          "body.wp-main-app[data-wp-app-page='songs'] #wpAppPagebar{margin-bottom:12px}" +
          "body.wp-main-app[data-wp-app-page='songs'] .header{display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr);align-items:center;gap:16px;padding:18px 18px 12px;border-radius:24px;border:1px solid rgba(255,255,255,.06);background:rgba(9,16,32,.38);box-shadow:0 18px 50px rgba(0,0,0,.2)}" +
          "body.wp-main-app[data-wp-app-page='songs'] .brand h1{font-size:15px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#f6c87a}" +
          "body.wp-main-app[data-wp-app-page='songs'] .controls{justify-content:space-between;padding-top:0}" +
          "body.wp-main-app[data-wp-app-page='songs'] .search-card{min-width:unset;width:min(720px,100%);padding:10px 12px;border-radius:18px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.05);box-shadow:none}" +
          "body.wp-main-app[data-wp-app-page='songs'] .table-card{border-radius:28px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(11,16,32,.76),rgba(11,16,32,.58));box-shadow:0 24px 60px rgba(0,0,0,.24)}" +
          "body.wp-main-app[data-wp-app-page='songs'] .table-header{padding:18px 18px 16px}" +
          "body.wp-main-app[data-wp-app-page='songs'] .section,body.wp-main-app[data-wp-app-page='favorites'] .section{padding:12px 0 0}" +
          "body.wp-main-app[data-wp-app-page='favorites'] .header{display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr);align-items:center;gap:16px;padding:18px 18px 12px;border-radius:24px;border:1px solid rgba(255,255,255,.06);background:rgba(9,16,32,.38);box-shadow:0 18px 50px rgba(0,0,0,.2)}" +
          "body.wp-main-app[data-wp-app-page='favorites'] .brand h1{font-size:15px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#f6c87a}" +
          "body.wp-main-app[data-wp-app-page='favorites'] .controls{justify-content:space-between;padding-top:0}" +
          "body.wp-main-app[data-wp-app-page='favorites'] .search-card{min-width:unset;width:min(720px,100%);padding:10px 12px;border-radius:18px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.05);box-shadow:none}" +
          "body.wp-main-app[data-wp-app-page='favorites'] .table-card{border-radius:28px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(11,16,32,.76),rgba(11,16,32,.58));box-shadow:0 24px 60px rgba(0,0,0,.24)}" +
          "body.wp-main-app[data-wp-app-page='favorites'] .table-header{padding:18px 18px 16px}" +
          "body.wp-main-app[data-wp-app-page='account'] .container{max-width:1080px;padding:8px 0 122px}" +
          "body.wp-main-app[data-wp-app-page='account'] .grid{gap:12px}" +
          "body.wp-main-app[data-wp-app-page='account'] .card{border-radius:24px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(11,16,32,.72),rgba(11,16,32,.56));box-shadow:0 22px 54px rgba(0,0,0,.24)}" +
          "body.wp-main-app[data-wp-app-page='account'] h1{font-size:18px;margin-bottom:8px}" +
          "body.wp-main-app[data-wp-app-page='account'] .sub{font-size:12px;margin-bottom:12px}" +
          "body.wp-main-app[data-wp-app-page='account'] .panel-card,body.wp-main-app[data-wp-app-page='account'] .card{padding:16px}" +
          "body.wp-main-app[data-wp-app-page='setlists'] .wrap{padding:8px 0 122px;max-width:1320px}" +
          "body.wp-main-app[data-wp-app-page='setlists'] .hero{margin-bottom:12px}" +
          "body.wp-main-app[data-wp-app-page='setlists'] .card{border-radius:24px;background:rgba(11,16,32,.62);border:1px solid rgba(255,255,255,.07);box-shadow:0 22px 54px rgba(0,0,0,.24)}" +
          "body.wp-main-app[data-wp-app-page='setlists'] .card-body{padding:16px}" +
          "body.wp-main-app[data-wp-app-page='news'] .page-header{padding:6px 8px 18px;text-align:left}" +
          "body.wp-main-app[data-wp-app-page='news'] .page-header h1{font-size:28px;margin-bottom:8px;color:#eef3ff}" +
          "body.wp-main-app[data-wp-app-page='news'] .page-header p{font-size:14px;color:#9aa7bf}" +
          "body.wp-main-app[data-wp-app-page='news'] .news-section{padding:0 0 122px;gap:18px;max-width:1320px}" +
          "body.wp-main-app[data-wp-app-page='news'] .news-card{border-radius:24px;padding:20px;box-shadow:0 22px 54px rgba(0,0,0,.24)}" +
          "body.wp-main-app[data-wp-app-page='song'] #wpAppPagebar{display:none}" +
          "body.wp-main-app[data-wp-app-page='song'] .app{max-width:min(1320px,100%);margin:0 auto;padding:0 0 122px;min-height:auto}" +
          "body.wp-main-app[data-wp-app-page='song'] .topbar{padding:14px 14px 12px;border-radius:22px;margin:0 0 12px;background:rgba(11,16,32,.62);border:1px solid rgba(255,255,255,.07);box-shadow:0 22px 54px rgba(0,0,0,.24)}" +
          "body.wp-main-app[data-wp-app-page='song'] .main{display:grid;grid-template-columns:minmax(0,1fr) 340px;align-items:start;gap:16px;padding:0;margin:0}" +
          "body.wp-main-app[data-wp-app-page='song'] .content{min-width:0;gap:12px;width:100%}" +
          "body.wp-main-app[data-wp-app-page='song'] .content>.card{width:100%;max-width:none;margin-inline:0;padding:20px}" +
          "body.wp-main-app[data-wp-app-page='song'] .panel{width:auto;max-height:none;position:sticky;top:12px;align-self:start}" +
          "body.wp-main-app[data-wp-app-page='song'] .card,body.wp-main-app[data-wp-app-page='song'] .panel{border-radius:24px;box-shadow:0 22px 54px rgba(0,0,0,.24);background:linear-gradient(180deg,rgba(11,16,32,.76),rgba(11,16,32,.58));border:1px solid rgba(255,255,255,.07)}" +
          "body.wp-main-app[data-wp-app-page='song'] .panel.card{margin-inline:0}" +
          "body.wp-main-app[data-wp-app-page='song'] .chords{min-height:240px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)}" +
          "body.wp-main-app[data-wp-app-page='song'] .setlist-nav{margin:0 0 12px;padding:10px 12px;border-radius:18px;background:rgba(11,16,32,.62);border:1px solid rgba(255,255,255,.07)}" +
          "body.wp-main-app[data-wp-app-page='song'] .fav-nav{z-index:100008;bottom:max(calc(env(safe-area-inset-bottom) + 108px),108px)!important}" +
          "@media (max-width:980px){body.wp-main-app #wpAppPagebar{padding:18px;align-items:flex-start;flex-direction:column}body.wp-main-app .wp-app-pagebar-side{justify-content:flex-start}body.wp-main-app #wpAppHomeHero{grid-template-columns:1fr}body.wp-main-app .wp-app-home-meta{min-width:0}}" +
          "@media (max-width:720px){body.wp-main-app .container{padding-bottom:114px!important}body.wp-main-app #wpAppPagebar{gap:12px;padding:14px 14px 12px;border-radius:20px;margin-bottom:12px}body.wp-main-app .wp-app-pagebar-kicker{font-size:11px;letter-spacing:.14em}body.wp-main-app .wp-app-pagebar-title{font-size:21px;line-height:1.08}body.wp-main-app .wp-app-pagebar-subtitle{font-size:11px;line-height:1.45;max-width:none}body.wp-main-app .wp-app-pagebar-side{width:100%;gap:8px;flex-wrap:nowrap;overflow:auto;padding-bottom:2px}body.wp-main-app .wp-app-chip{padding:8px 10px;font-size:10px;flex:0 0 auto}body.wp-main-app #wpAppDock{width:min(336px,calc(100vw - 22px));gap:5px;padding:8px 8px 9px;bottom:max(10px,env(safe-area-inset-bottom));border-radius:26px;background:linear-gradient(180deg,rgba(14,19,32,.97),rgba(10,14,24,.95));border:1px solid rgba(255,255,255,.07);box-shadow:0 18px 30px rgba(0,0,0,.34),0 6px 16px rgba(0,0,0,.22);backdrop-filter:blur(18px) saturate(124%);-webkit-backdrop-filter:blur(18px) saturate(124%)}body.wp-main-app #wpAppDock::before{inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0))}body.wp-main-app #wpAppDock::after{display:none}body.wp-main-app #wpAppDockIndicator{height:58px;border-radius:18px;background:linear-gradient(180deg,rgba(104,126,255,.2),rgba(104,126,255,.1));border:1px solid rgba(122,142,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 8px 18px rgba(18,24,43,.16)}body.wp-main-app #wpAppDockIndicator::after{display:none}body.wp-main-app .wp-app-dock-link{min-width:0;min-height:58px;padding:7px 2px 8px;border-radius:18px;gap:4px;color:#a0abc0;font-size:10px;line-height:1}body.wp-main-app .wp-app-dock-label-full{display:none!important}body.wp-main-app .wp-app-dock-label-short{display:flex!important}body.wp-main-app .wp-app-dock-link span{min-height:11px;font-size:9px;line-height:1;text-align:center}body.wp-main-app .wp-app-dock-link svg{width:19px;height:19px;stroke-width:1.9}body.wp-main-app .wp-app-dock-link:hover{color:#f3f6ff;transform:none}body.wp-main-app .wp-app-dock-link.active,body.wp-main-app .wp-app-dock-link.is-preview{color:#edf2ff;transform:none}body.wp-main-app .wp-app-dock-link.active svg,body.wp-main-app .wp-app-dock-link.is-preview svg{transform:none}body.wp-main-app #wpAppHomeHero{padding:16px 14px 16px;border-radius:22px;margin-bottom:12px;gap:14px}body.wp-main-app .wp-app-home-title{font-size:24px;line-height:1.02}body.wp-main-app .wp-app-home-text{font-size:12px;line-height:1.5}body.wp-main-app .wp-app-home-actions{display:grid;grid-template-columns:1fr 1fr;width:100%;gap:8px}body.wp-main-app .wp-app-home-link{justify-content:center;padding:11px 10px;font-size:11px;border-radius:16px}body.wp-main-app .wp-app-home-meta{grid-template-columns:1fr 1fr;gap:8px}body.wp-main-app .wp-app-home-stat{padding:12px 12px;border-radius:16px}body.wp-main-app .wp-app-home-stat strong{font-size:17px}body.wp-main-app .wp-app-home-stat span{font-size:11px}body.wp-main-app[data-wp-app-page='songs'] .header,body.wp-main-app[data-wp-app-page='favorites'] .header{grid-template-columns:1fr;padding:12px;border-radius:18px;gap:12px}body.wp-main-app[data-wp-app-page='songs'] .brand h1,body.wp-main-app[data-wp-app-page='favorites'] .brand h1{font-size:12px}body.wp-main-app[data-wp-app-page='songs'] .controls,body.wp-main-app[data-wp-app-page='favorites'] .controls{gap:10px;width:100%}body.wp-main-app[data-wp-app-page='songs'] .search-card,body.wp-main-app[data-wp-app-page='favorites'] .search-card{width:100%;padding:9px 10px;border-radius:16px}body.wp-main-app[data-wp-app-page='songs'] .search-input,body.wp-main-app[data-wp-app-page='favorites'] .search-input{font-size:15px}body.wp-main-app[data-wp-app-page='songs'] .mode-switch,body.wp-main-app[data-wp-app-page='favorites'] .mode-switch{width:100%;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}body.wp-main-app[data-wp-app-page='songs'] .table-card,body.wp-main-app[data-wp-app-page='favorites'] .table-card{border-radius:20px;overflow:hidden}body.wp-main-app[data-wp-app-page='songs'] .table-header,body.wp-main-app[data-wp-app-page='favorites'] .table-header{padding:14px 14px 12px;align-items:flex-start;gap:8px;flex-direction:column}body.wp-main-app[data-wp-app-page='songs'] .table-header h2,body.wp-main-app[data-wp-app-page='favorites'] .table-header h2{font-size:15px}body.wp-main-app[data-wp-app-page='songs'] .songs-count,body.wp-main-app[data-wp-app-page='favorites'] .songs-count{font-size:12px}body.wp-main-app[data-wp-app-page='songs'] .section,body.wp-main-app[data-wp-app-page='favorites'] .section{padding:10px 0 0}body.wp-main-app[data-wp-app-page='songs'] tr,body.wp-main-app[data-wp-app-page='favorites'] tr{padding:10px;border-radius:14px;margin-bottom:10px}body.wp-main-app[data-wp-app-page='songs'] td.title-cell,body.wp-main-app[data-wp-app-page='favorites'] td.title-cell{padding:4px 4px 4px 0;gap:10px}body.wp-main-app[data-wp-app-page='account'] .container{padding:0 0 128px!important}body.wp-main-app[data-wp-app-page='account'] .grid{grid-template-columns:1fr!important;gap:10px}body.wp-main-app[data-wp-app-page='account'] .card{border-radius:18px;padding:14px}body.wp-main-app[data-wp-app-page='account'] .panel-card{padding:14px}body.wp-main-app[data-wp-app-page='account'] input{padding:11px 12px;border-radius:10px}body.wp-main-app[data-wp-app-page='setlists'] .wrap{padding:0 0 128px}body.wp-main-app[data-wp-app-page='setlists'] .grid{grid-template-columns:1fr!important;gap:10px}body.wp-main-app[data-wp-app-page='setlists'] .card{border-radius:20px}body.wp-main-app[data-wp-app-page='setlists'] .hero{gap:10px;margin-bottom:10px}body.wp-main-app[data-wp-app-page='setlists'] .hero-title{font-size:22px}body.wp-main-app[data-wp-app-page='setlists'] .top-actions{width:100%}body.wp-main-app[data-wp-app-page='setlists'] .top-actions>.btn,body.wp-main-app[data-wp-app-page='setlists'] .top-actions>button{width:100%}body.wp-main-app[data-wp-app-page='news'] .page-header{padding:0 0 14px}body.wp-main-app[data-wp-app-page='news'] .page-header h1{font-size:24px}body.wp-main-app[data-wp-app-page='news'] .page-header p{font-size:13px}body.wp-main-app[data-wp-app-page='news'] .news-section{padding:0 0 128px;grid-template-columns:1fr;gap:14px}body.wp-main-app[data-wp-app-page='news'] .news-card{padding:16px;border-radius:20px}body.wp-main-app[data-wp-app-page='song'] .app{padding:0 0 128px}body.wp-main-app[data-wp-app-page='song'] .topbar{padding:12px;border-radius:18px;margin-bottom:10px}body.wp-main-app[data-wp-app-page='song'] .topbar-controls{gap:8px;flex-wrap:wrap}body.wp-main-app[data-wp-app-page='song'] .font-panel{width:100%;justify-content:space-between}body.wp-main-app[data-wp-app-page='song'] .topbar-icons{width:100%;justify-content:space-between}body.wp-main-app[data-wp-app-page='song'] .main{display:flex;flex-direction:column;gap:12px;padding:0 0 42px}body.wp-main-app[data-wp-app-page='song'] .panel{position:static;width:100%;order:2}body.wp-main-app[data-wp-app-page='song'] .content>.card,body.wp-main-app[data-wp-app-page='song'] .panel.card{padding:14px;border-radius:20px}body.wp-main-app[data-wp-app-page='song'] .song-title{font-size:18px;line-height:1.2}body.wp-main-app[data-wp-app-page='song'] .song-artist{font-size:12px}body.wp-main-app[data-wp-app-page='song'] .info-row{gap:6px}body.wp-main-app[data-wp-app-page='song'] .info-pill{font-size:11px;padding:5px 8px}body.wp-main-app[data-wp-app-page='song'] .view-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}body.wp-main-app[data-wp-app-page='song'] .view-modes .theme-btn{width:100%;min-height:40px;padding:8px 6px;font-size:10px;line-height:1.2}body.wp-main-app[data-wp-app-page='song'] .setlist-nav{margin:0 0 10px;padding:8px;border-radius:16px}body.wp-main-app[data-wp-app-page='song'] .setlist-nav-btn{min-width:82px;height:36px;font-size:11px;padding:0 8px}body.wp-main-app[data-wp-app-page='song'] .fav-nav{left:50%;right:auto;transform:translateX(-50%);width:calc(100% - 20px);max-width:420px;bottom:max(calc(env(safe-area-inset-bottom) + 112px),112px)!important}}";
          style.textContent +=
          "body.wp-main-app #wpAppDock{width:min(374px,calc(100vw - 28px));gap:4px;padding:7px;bottom:max(11px,env(safe-area-inset-bottom));border-radius:34px;background:linear-gradient(180deg,rgba(9,10,10,.92),rgba(2,3,3,.88));border:1px solid rgba(255,255,255,.1);box-shadow:0 22px 42px rgba(0,0,0,.42),0 8px 18px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(28px) saturate(168%);-webkit-backdrop-filter:blur(28px) saturate(168%);overflow:visible;transition:transform .34s cubic-bezier(.2,1.1,.22,1),box-shadow .26s ease,opacity .2s ease}" +
          "body.wp-main-app #wpAppDock::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.018) 46%,rgba(255,255,255,0));pointer-events:none;z-index:0}" +
          "body.wp-main-app #wpAppDock::after{content:'';display:block;position:absolute;left:20px;right:20px;bottom:-10px;height:18px;border-radius:999px;background:radial-gradient(ellipse at center,rgba(0,0,0,.42),transparent 72%);filter:blur(8px);pointer-events:none;z-index:-1}" +
          "body.wp-main-app #wpAppDockIndicator{height:64px;border-radius:30px;background:radial-gradient(circle at 28% 18%,rgba(255,255,255,.22),transparent 34%),radial-gradient(circle at 78% 90%,rgba(112,135,255,.2),transparent 42%),linear-gradient(180deg,rgba(255,255,255,.135),rgba(118,135,190,.07) 46%,rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -18px 28px rgba(255,255,255,.035),0 14px 32px rgba(0,0,0,.34),0 0 0 1px rgba(126,149,255,.055);transition:transform .44s cubic-bezier(.18,1.32,.34,1),width .44s cubic-bezier(.18,1.32,.34,1),height .36s cubic-bezier(.18,1.1,.34,1),opacity .16s ease;overflow:hidden}" +
          "body.wp-main-app #wpAppDockIndicator::before{content:'';position:absolute;inset:1px;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.24),rgba(255,255,255,.035) 36%,rgba(255,255,255,0) 64%),radial-gradient(circle at 42% 12%,rgba(245,211,128,.22),transparent 30%);opacity:1}" +
          "body.wp-main-app #wpAppDockIndicator::after{content:'';display:block;position:absolute;left:18%;right:18%;bottom:7px;height:3px;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(241,205,125,.72),rgba(126,149,255,.45),transparent);opacity:.78;filter:blur(.25px)}" +
          "body.wp-main-app #wpAppDock.dragging{transform:translateX(-50%) scale(.982);box-shadow:0 18px 34px rgba(0,0,0,.46),0 6px 16px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.08)}" +
          "body.wp-main-app #wpAppDock.dragging #wpAppDockIndicator{transition:transform .08s linear,width .08s linear,height .08s linear;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 16px 30px rgba(126,149,255,.14),0 14px 28px rgba(0,0,0,.32)}" +
          "body.wp-main-app.wp-app-transitioning #wpAppDock{opacity:1;transform:translateX(-50%) translateY(1px) scale(.988)}" +
          "body.wp-main-app.wp-app-transitioning #wpAppDockIndicator{box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 18px 34px rgba(126,149,255,.16),0 14px 28px rgba(0,0,0,.32)}" +
          "body.wp-main-app .wp-app-dock-link{min-height:64px;padding:8px 3px 7px;border-radius:30px;gap:5px;color:rgba(238,243,255,.72);font-weight:800;font-size:10px;letter-spacing:-.03em;transition:color .24s ease,transform .28s cubic-bezier(.18,1.22,.34,1),opacity .2s ease;will-change:transform;color-scheme:dark}" +
          "body.wp-main-app .wp-app-dock-link span{font-size:10px;line-height:1.02;letter-spacing:-.04em;min-height:11px;text-shadow:0 1px 10px rgba(0,0,0,.28);transition:color .24s ease,opacity .2s ease,transform .28s cubic-bezier(.18,1.22,.34,1)}" +
          "body.wp-main-app .wp-app-dock-label-full{display:none!important}" +
          "body.wp-main-app .wp-app-dock-label-short{display:flex!important}" +
          "body.wp-main-app .wp-app-dock-link svg{width:22px;height:22px;stroke-width:2.05;filter:drop-shadow(0 3px 8px rgba(0,0,0,.24));transition:transform .34s cubic-bezier(.18,1.28,.34,1),stroke .24s ease,filter .24s ease,opacity .2s ease}" +
          "body.wp-main-app .wp-app-dock-link:hover{color:#f6f8ff;transform:translateY(-1px)}" +
          "body.wp-main-app .wp-app-dock-link.active,body.wp-main-app .wp-app-dock-link.is-preview{color:#f1d184;transform:translateY(-1px)}" +
          "body.wp-main-app .wp-app-dock-link.active svg,body.wp-main-app .wp-app-dock-link.is-preview svg{transform:translateY(-2px) scale(1.04);filter:drop-shadow(0 8px 16px rgba(126,149,255,.24)) drop-shadow(0 0 10px rgba(241,209,132,.16))}" +
          "body.wp-main-app .wp-app-dock-link.active span,body.wp-main-app .wp-app-dock-link.is-preview span{color:#f1d184;transform:translateY(-1px);opacity:1}" +
          "body.wp-main-app .wp-app-dock-link.is-pressing{transform:translateY(1px) scale(.94)!important}" +
          "@media (max-width:720px){body.wp-main-app .container{padding-bottom:122px!important}body.wp-main-app #wpAppDock{width:min(374px,calc(100vw - 28px));gap:4px;padding:7px;bottom:max(11px,env(safe-area-inset-bottom));border-radius:34px;background:linear-gradient(180deg,rgba(9,10,10,.92),rgba(2,3,3,.9));border:1px solid rgba(255,255,255,.1);box-shadow:0 22px 42px rgba(0,0,0,.42),0 8px 18px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(28px) saturate(168%);-webkit-backdrop-filter:blur(28px) saturate(168%)}body.wp-main-app #wpAppDockIndicator{height:64px;border-radius:30px;background:radial-gradient(circle at 28% 18%,rgba(255,255,255,.22),transparent 34%),radial-gradient(circle at 78% 90%,rgba(112,135,255,.2),transparent 42%),linear-gradient(180deg,rgba(255,255,255,.135),rgba(118,135,190,.07) 46%,rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.16)}body.wp-main-app .wp-app-dock-link{min-height:64px;padding:8px 3px 7px;border-radius:30px;gap:5px;color:rgba(238,243,255,.72);font-size:10px;line-height:1}body.wp-main-app .wp-app-dock-link span{font-size:10px;line-height:1.02;min-height:11px}body.wp-main-app .wp-app-dock-link svg{width:22px;height:22px;stroke-width:2.05}body.wp-main-app .wp-app-dock-link.active,body.wp-main-app .wp-app-dock-link.is-preview{color:#f1d184}body.wp-main-app .wp-app-dock-link.active svg,body.wp-main-app .wp-app-dock-link.is-preview svg{transform:translateY(-2px) scale(1.04)}}";
          document.head.appendChild(style);
      }

      var container =
        document.querySelector(".container") ||
        document.querySelector(".wrap") ||
        document.querySelector(".auth-shell") ||
        document.querySelector(".login-container") ||
        document.querySelector(".card") ||
        document.querySelector(".app") ||
        document.querySelector("main");

      if (container && !isAuthProgramPage() && !document.getElementById("wpAppPagebar")) {
        var pagebar = document.createElement("section");
        pagebar.id = "wpAppPagebar";
        pagebar.innerHTML =
          '<div class="wp-app-pagebar-copy">' +
          '  <span class="wp-app-pagebar-kicker">' + i18nText("app.pagebar.app", "Worship ծրագիր") + '</span>' +
          '  <strong class="wp-app-pagebar-title">' + pageMeta.title + '</strong>' +
          '  <span class="wp-app-pagebar-subtitle">' + pageMeta.subtitle + '</span>' +
          "</div>" +
          '<div class="wp-app-pagebar-side">' +
          '  <span id="wpAppLibraryChip" class="wp-app-chip">' + i18nText("app.pagebar.library", "Առցանց գրադարան") + '</span>' +
          '  <span id="wpAppOnlineChip" class="wp-app-chip ' + (navigator.onLine ? "status-online" : "status-offline") + '">' + (navigator.onLine ? i18nText("app.pagebar.online", "Առցանց") : i18nText("app.pagebar.offline", "Օֆֆլայն")) + "</span>" +
          "</div>";
        container.parentNode.insertBefore(pagebar, container);
        if (window.wpI18n && typeof window.wpI18n.apply === "function") {
          try {
            window.wpI18n.apply(window.wpI18n.getLang ? window.wpI18n.getLang() : "hy");
          } catch (err) {
            // ignore reapply issues
          }
        }
      }

      if (container && pageMeta.key === "landing" && !document.getElementById("wpAppHomeHero")) {
        var header = container.querySelector(".header");
        var hero = document.createElement("section");
        hero.id = "wpAppHomeHero";
        hero.innerHTML =
          '<div class="wp-app-home-copy">' +
          '  <span class="wp-app-home-eyebrow">' + i18nText("app.home.eyebrow", "Installed Worship App") + '</span>' +
          '  <strong class="wp-app-home-title">' + i18nText("app.home.title", "Երգերը, պահպանումը և սեթլիստները մեկ հոսքում") + '</strong>' +
          '  <span class="wp-app-home-text">' + i18nText("app.home.text", "Սա արդեն ծրագրի աշխատային տարբերակն է. արագ որոնիր երգերը, բացիր պահպանվածները, աշխատիր օֆֆլայն և կազմիր ծառայության սեթլիստները առանց կայքի ավելորդ navigation-ի։") + '</span>' +
          '  <div class="wp-app-home-actions">' +
          '    <a class="wp-app-home-link primary" href="/main.html?source=pwa">' + i18nText("app.home.openSongs", "Բացել երգերը") + '</a>' +
          '    <a class="wp-app-home-link" href="/favorites.html?source=pwa">' + i18nText("app.home.favorites", "Պահպանված") + '</a>' +
          '    <a class="wp-app-home-link" href="/setlists.html?source=pwa">' + i18nText("app.home.setlists", "Սեթլիստներ") + '</a>' +
          '    <a class="wp-app-home-link" href="/account.html?source=pwa">' + i18nText("app.home.settings", "Կարգավորումներ") + '</a>' +
          "  </div>" +
          "</div>" +
          '<div class="wp-app-home-meta">' +
          '  <div class="wp-app-home-stat"><strong>' + i18nText("app.home.offlineTitle", "Օֆֆլայն") + '</strong><span>' + i18nText("app.home.offlineText", "Երգերը հասանելի են պահված գրադարանից") + '</span></div>' +
          '  <div class="wp-app-home-stat"><strong>' + i18nText("app.home.fastTitle", "Արագ") + '</strong><span>' + i18nText("app.home.fastText", "Որոնումը և բացումը մեկ հիմնական workspace-ում") + '</span></div>' +
          '  <div class="wp-app-home-stat"><strong>' + i18nText("app.home.pushTitle", "Push") + '</strong><span>' + i18nText("app.home.pushText", "Թարմացումներ և հայտարարություններ հենց ծրագրի մեջ") + '</span></div>' +
          '  <div class="wp-app-home-stat"><strong>' + i18nText("app.home.setlistTitle", "Setlist") + '</strong><span>' + i18nText("app.home.setlistText", "Ծառայության երգացանկը միշտ հասանելի է") + '</span></div>' +
          "</div>";
        if (header) {
          container.insertBefore(hero, header);
        } else {
          container.prepend(hero);
        }
      }

      function placeDockIndicator(dock, link) {
        if (!dock || !link) return;
        var indicator = dock.querySelector("#wpAppDockIndicator");
        if (!indicator) return;
        var dockRect = dock.getBoundingClientRect();
        var linkRect = link.getBoundingClientRect();
        var isCompactMobile = window.matchMedia && window.matchMedia("(max-width:720px)").matches;
        var insetX = isCompactMobile ? 5 : 2;
        var insetY = isCompactMobile ? 6 : 2;
        var width = Math.max(24, Math.round(linkRect.width - insetX * 2));
        var height = Math.max(24, Math.round(linkRect.height - insetY * 2));
        var offsetX = Math.round(linkRect.left - dockRect.left + insetX);
        var offsetY = Math.round(linkRect.top - dockRect.top + insetY);
        indicator.style.width = width + "px";
        indicator.style.height = height + "px";
        indicator.style.transform = "translate3d(" + offsetX + "px," + offsetY + "px,0)";
      }

      function setDockPreview(dock, targetLink) {
        if (!dock) return;
        dock.querySelectorAll(".wp-app-dock-link").forEach(function(link) {
          link.classList.toggle("is-preview", link === targetLink);
        });
      }

      function updateDockIndicator(dock, currentKey) {
        if (!dock) return;
        var indicator = dock.querySelector("#wpAppDockIndicator");
        var activeLink = dock.querySelector('.wp-app-dock-link[data-dock-key="' + currentKey + '"]') || dock.querySelector(".wp-app-dock-link.active");
        if (!indicator || !activeLink) return;

        var previousKey = "";
        try {
          previousKey = localStorage.getItem("wp_app_last_dock_key") || "";
        } catch (err) {}

        var previousLink = previousKey ? dock.querySelector('.wp-app-dock-link[data-dock-key="' + previousKey + '"]') : null;

        if (previousLink && previousLink !== activeLink) {
          placeDockIndicator(dock, previousLink);
          requestAnimationFrame(function() {
            indicator.classList.add("ready");
            requestAnimationFrame(function() {
              placeDockIndicator(dock, activeLink);
            });
          });
        } else {
          placeDockIndicator(dock, activeLink);
          requestAnimationFrame(function() {
            indicator.classList.add("ready");
          });
        }

        dock.querySelectorAll(".wp-app-dock-link").forEach(function(link) {
          link.classList.toggle("active", link === activeLink);
          link.classList.remove("is-preview");
        });

        try {
          localStorage.setItem("wp_app_last_dock_key", currentKey);
        } catch (err) {}
      }

      function bindDockInteractions(dock) {
        if (!dock || dock.dataset.wpBound === "1") return;
        dock.dataset.wpBound = "1";
        var navigating = false;

        var dragState = {
          active: false,
          moved: false,
          pointerId: null,
          startX: 0,
          startLink: null,
          currentLink: null,
          suppressClick: false
        };

        function getDockLinks() {
          return Array.prototype.slice.call(dock.querySelectorAll(".wp-app-dock-link"));
        }

        function getClosestLink(clientX) {
          var links = getDockLinks();
          if (!links.length) return null;

          var closest = links[0];
          var closestDistance = Infinity;
          links.forEach(function(link) {
            var rect = link.getBoundingClientRect();
            var center = rect.left + rect.width / 2;
            var distance = Math.abs(center - clientX);
            if (distance < closestDistance) {
              closestDistance = distance;
              closest = link;
            }
          });
          return closest;
        }

        function preloadDockTargets() {
          getDockLinks().forEach(function(link) {
            var href = link.getAttribute("href") || "";
            if (!href) return;
            var absolute = new URL(href, window.location.origin).toString();
            var existing = document.querySelector('link[rel="prefetch"][href="' + absolute + '"]');
            if (existing) return;
            var prefetch = document.createElement("link");
            prefetch.rel = "prefetch";
            prefetch.href = absolute;
            prefetch.as = "document";
            document.head.appendChild(prefetch);
          });
        }

        function warmDockTarget(href) {
          if (!href || !window.fetch) return;
          try {
            fetch(href, {
              method: "GET",
              credentials: "same-origin",
              cache: "force-cache"
            }).catch(function() {});
          } catch (err) {}
        }

        function beginPageTransition(targetLink) {
          if (!targetLink) return;
          document.body.classList.add("wp-app-transitioning");
          setDockPreview(dock, targetLink);
          placeDockIndicator(dock, targetLink);
          var indicator = dock.querySelector("#wpAppDockIndicator");
          if (indicator) indicator.classList.add("ready");
        }

        function navigateToDockLink(link) {
          if (!link) return;
          if (navigating) return;
          var href = link.getAttribute("href") || "";
          if (!href) return;
          try {
            localStorage.setItem("wp_app_last_dock_key", link.getAttribute("data-dock-key") || "");
          } catch (err) {}
          if (isSamePageUrl(href)) {
            hideLoaderNow();
            return;
          }
          navigating = true;
          warmDockTarget(href);
          beginPageTransition(link);
          beginSoftNavigation(href, { loaderDelay: 50, navigationDelay: 70 });
        }

        function beginDrag(link, event) {
          if (!link || !event) return;
          if (typeof event.preventDefault === "function") event.preventDefault();
          dragState.active = true;
          dragState.moved = false;
          dragState.pointerId = event.pointerId;
          dragState.startX = event.clientX;
          dragState.startLink = link;
          dragState.currentLink = link;
          if (typeof link.setPointerCapture === "function" && event.pointerId != null) {
            try { link.setPointerCapture(event.pointerId); } catch (err) {}
          }
          dock.classList.add("dragging");
          link.classList.add("is-pressing");
          setDockPreview(dock, link);
          placeDockIndicator(dock, link);
          var indicator = dock.querySelector("#wpAppDockIndicator");
          if (indicator) indicator.classList.add("ready");
        }

        function moveDrag(clientX) {
          if (!dragState.active) return;
          if (Math.abs(clientX - dragState.startX) > 8) {
            dragState.moved = true;
          }
          var closest = getClosestLink(clientX);
          if (!closest) return;
          dragState.currentLink = closest;
          setDockPreview(dock, closest);
          placeDockIndicator(dock, closest);
        }

        function finishDrag(commit) {
          if (!dragState.active) return;
          var target = dragState.currentLink || dragState.startLink;
          var releaseTarget = dragState.startLink;
          dock.classList.remove("dragging");
          getDockLinks().forEach(function(link) {
            link.classList.remove("is-pressing");
            link.classList.remove("is-preview");
          });
          if (releaseTarget && typeof releaseTarget.releasePointerCapture === "function" && dragState.pointerId != null) {
            try { releaseTarget.releasePointerCapture(dragState.pointerId); } catch (err) {}
          }
          dragState.active = false;
          dragState.pointerId = null;
          dragState.suppressClick = true;
          if (commit && target) {
            navigateToDockLink(target);
          } else {
            updateDockIndicator(dock, pageMeta.key);
          }
        }

        dock.addEventListener("pointermove", function(event) {
          if (!dragState.active) return;
          moveDrag(event.clientX);
        });

        window.addEventListener("pointerup", function(event) {
          if (!dragState.active) return;
          if (dragState.pointerId !== null && event.pointerId !== dragState.pointerId) return;
          finishDrag(true);
        });

        window.addEventListener("pointercancel", function(event) {
          if (!dragState.active) return;
          if (dragState.pointerId !== null && event.pointerId !== dragState.pointerId) return;
          finishDrag(false);
        });

        dock.querySelectorAll(".wp-app-dock-link").forEach(function(link) {
          link.addEventListener("pointerenter", function() {
            warmDockTarget(link.getAttribute("href") || "");
          });
          link.addEventListener("focus", function() {
            warmDockTarget(link.getAttribute("href") || "");
          });
          link.addEventListener("pointerdown", function(event) {
            beginDrag(link, event);
          });
          link.addEventListener("pointerup", function(event) {
            link.classList.remove("is-pressing");
            if (!dragState.active) return;
            if (dragState.pointerId !== null && event && event.pointerId !== dragState.pointerId) return;
            finishDrag(true);
          });
          link.addEventListener("pointercancel", function() {
            link.classList.remove("is-pressing");
          });
          link.addEventListener("mouseleave", function() {
            link.classList.remove("is-pressing");
          });
          link.addEventListener("click", function(event) {
            event.preventDefault();
            if (dragState.suppressClick) {
              dragState.suppressClick = false;
              return;
            }
            navigateToDockLink(link);
          });
        });

        window.addEventListener("resize", function() {
          updateDockIndicator(dock, pageMeta.key);
        });

        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(preloadDockTargets, { timeout: 1200 });
        } else {
          setTimeout(preloadDockTargets, 300);
        }
      }

      var dock = document.getElementById("wpAppDock");
      var transitionVeil = document.getElementById("wpAppTransitionVeil");
      if (!transitionVeil) {
        transitionVeil = document.createElement("div");
        transitionVeil.id = "wpAppTransitionVeil";
        document.body.appendChild(transitionVeil);
      }
      if (!dock) {
        var links = [
          { href: "/main.html?source=pwa", key: "songs", label: i18nText("app.dock.songs", "Երգեր"), shortLabel: i18nText("app.dock.songs", "Երգեր"), icon: '<svg viewBox="0 0 24 24"><path d="M8 17.5V6.4a1 1 0 0 1 .76-.97l7.8-1.82a.8.8 0 0 1 .98.78V15"></path><path d="M8 8.2l9.5-2.2"></path><ellipse cx="6.2" cy="18.2" rx="2.7" ry="2.1"></ellipse><ellipse cx="15.8" cy="16.6" rx="2.7" ry="2.1"></ellipse></svg>' },
          { href: "/favorites.html?source=pwa", key: "favorites", label: i18nText("app.dock.favorites", "Պահպ."), shortLabel: i18nText("app.dock.favorites", "Պահպ."), icon: '<svg viewBox="0 0 24 24"><path d="M12 20.6c-.26 0-.52-.09-.72-.26C5.85 15.63 3 12.98 3 9.38 3 6.98 4.92 5 7.28 5c1.52 0 2.96.72 3.88 1.95A4.83 4.83 0 0 1 15.04 5C17.5 5 19.5 6.98 19.5 9.38c0 3.6-2.85 6.25-8.28 10.96-.2.17-.46.26-.72.26Z"></path></svg>' },
          { href: "/setlists.html?source=pwa", key: "setlists", label: i18nText("app.dock.setlists", "Ցանկեր"), shortLabel: i18nText("app.dock.setlists", "Ցանկեր"), icon: '<svg viewBox="0 0 24 24"><rect x="4.5" y="5" width="15" height="3.2" rx="1.6"></rect><rect x="4.5" y="10.4" width="15" height="3.2" rx="1.6"></rect><rect x="4.5" y="15.8" width="15" height="3.2" rx="1.6"></rect><path d="M8 6.6h7"></path><path d="M8 12h7"></path><path d="M8 17.4h7"></path></svg>' },
          { href: "/account.html?source=pwa", key: "account", label: i18nText("app.dock.account", "Հաշիվ"), shortLabel: i18nText("app.dock.account", "Հաշիվ"), icon: '<svg viewBox="0 0 24 24"><path d="M12 13.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z"></path><path d="M5 19.2c1.55-2.36 4.13-3.7 7-3.7s5.45 1.34 7 3.7"></path><path d="M19.2 7.8h.01"></path></svg>' }
        ];
        dock = document.createElement("nav");
        dock.id = "wpAppDock";
        dock.setAttribute("aria-label", "App navigation");
        dock.innerHTML = '<span id="wpAppDockIndicator" aria-hidden="true"></span>' + links.map(function(link) {
          var active = pageMeta.key === link.key ? " active" : "";
          return '<a class="wp-app-dock-link' + active + '" data-dock-key="' + link.key + '" href="' + link.href + '">' + link.icon + '<span class="wp-app-dock-label-full">' + link.label + '</span><span class="wp-app-dock-label-short">' + (link.shortLabel || link.label) + "</span></a>";
        }).join("");
        document.body.appendChild(dock);
      }

      bindDockInteractions(dock);
      updateDockIndicator(dock, pageMeta.key);

      document.body.classList.add("wp-app-entering");
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          window.setTimeout(function() {
            document.body.classList.remove("wp-app-entering");
          }, 30);
        });
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
  }

  redirectStandaloneLandingToAppHome();
  ensureStandaloneAppInterface();
  preserveStandaloneNavigationContext();

  function ensureLoaderStyles() {
    if (document.getElementById("wpPageLoaderStyles")) return;
    var style = document.createElement("style");
    style.id = "wpPageLoaderStyles";
    style.textContent =
      "#pageLoader{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147482500;background:radial-gradient(circle at 15% 0%,rgba(124,146,255,.20),transparent 32%),radial-gradient(circle at 85% 10%,rgba(72,201,176,.14),transparent 26%),linear-gradient(180deg,rgba(5,8,16,.84),rgba(5,8,16,.92));backdrop-filter:blur(16px) saturate(125%);-webkit-backdrop-filter:blur(16px) saturate(125%);transition:opacity .24s ease,visibility .24s ease}" +
      "#pageLoader.hide{opacity:0;visibility:hidden;pointer-events:none}" +
      "#pageLoader .loader-card{position:relative;width:min(430px,calc(100vw - 28px));padding:22px 18px 18px;border-radius:28px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(12,18,34,.88),rgba(10,14,27,.78));box-shadow:0 22px 70px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(16px) saturate(130%);overflow:hidden}" +
      "#pageLoader .loader-card::before{content:'';position:absolute;inset:-1px auto auto -1px;width:170px;height:170px;background:radial-gradient(circle,rgba(124,146,255,.26),transparent 68%);pointer-events:none}" +
      "#pageLoader .loader-head{display:flex;align-items:center;gap:14px;margin-bottom:16px}" +
      "#pageLoader .loader-mark{position:relative;flex:0 0 auto;width:54px;height:54px;border-radius:18px;background:linear-gradient(135deg,rgba(124,146,255,.24),rgba(124,146,255,.08));border:1px solid rgba(255,255,255,.10);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}" +
      "#pageLoader .loader-mark::before{content:'';position:absolute;inset:11px;border-radius:999px;border:2px solid rgba(255,255,255,.82);border-top-color:transparent;border-left-color:rgba(246,200,122,.92);animation:wpLoaderSpin 1s linear infinite}" +
      "#pageLoader .loader-copy{min-width:0;display:flex;flex-direction:column;gap:5px}" +
      "#pageLoader .loader-kicker{margin:0;color:#8fa2ff;font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}" +
      "#pageLoader .loader-title{margin:0;color:#fff;font:800 20px/1.08 Inter,system-ui,sans-serif;letter-spacing:-.03em}" +
      "#pageLoader .loader-text{margin:0;color:#a9b6cf;font:600 13px/1.45 Inter,system-ui,sans-serif}" +
      "#pageLoader .loader-rail{height:8px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden;position:relative;margin:2px 0 12px}" +
      "#pageLoader .loader-rail::after{content:'';position:absolute;left:-30%;top:0;height:100%;width:38%;border-radius:inherit;background:linear-gradient(90deg,rgba(246,200,122,.0),rgba(124,146,255,.92),rgba(246,200,122,.75));animation:wpLoaderRail 1.35s cubic-bezier(.4,0,.2,1) infinite}" +
      "#pageLoader .loader-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}" +
      "#pageLoader .loader-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:#eef3ff;font:700 11px/1.2 Inter,system-ui,sans-serif}" +
      "#pageLoader .loader-badge-dot{width:7px;height:7px;border-radius:999px;background:#7c92ff;box-shadow:0 0 0 6px rgba(124,146,255,.12)}" +
      "#pageLoader .loader-progress{color:#8fa0bf;font:700 11px/1 Inter,system-ui,sans-serif}" +
      "#pageLoader .loader-stack{display:grid;gap:10px}" +
      "#pageLoader .skeleton{height:12px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}" +
      "#pageLoader .skeleton::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:wpLoaderShimmer 1.1s infinite}" +
      "#pageLoader .skeleton + .skeleton{margin-top:10px}" +
      "body.wp-standalone-app #pageLoader .loader-card{width:min(410px,calc(100vw - 24px));border-radius:30px;background:linear-gradient(180deg,rgba(10,15,29,.94),rgba(8,12,23,.88));box-shadow:0 26px 78px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.05)}" +
      "body.wp-standalone-app #pageLoader .loader-kicker{color:#f6c87a}" +
      "@media (max-width:700px){#pageLoader .loader-card{padding:20px 16px 16px;border-radius:24px}#pageLoader .loader-head{gap:12px;margin-bottom:14px}#pageLoader .loader-mark{width:48px;height:48px;border-radius:16px}#pageLoader .loader-mark::before{inset:10px}#pageLoader .loader-title{font-size:18px}#pageLoader .loader-text{font-size:12px}#pageLoader .loader-meta{align-items:flex-start;flex-direction:column;margin-bottom:12px}#pageLoader .loader-progress{font-size:10px}}" +
      "@keyframes wpLoaderShimmer{to{transform:translateX(100%)}}" +
      "@keyframes wpLoaderSpin{to{transform:rotate(360deg)}}" +
      "@keyframes wpLoaderRail{0%{left:-30%}100%{left:100%}}";
    document.head.appendChild(style);
  }

  function getLoaderText() {
    return isStandaloneAppMode()
      ? "Ծրագիրը պատրաստում է քո էջը անվտանգ և արագ բացման համար։"
      : "Էջը պատրաստվում է և տվյալները բեռնվում են։";
  }

  function isSamePageUrl(rawUrl) {
    if (!rawUrl) return false;
    try {
      var next = new URL(rawUrl, window.location.href);
      var current = new URL(window.location.href);
      next.hash = "";
      current.hash = "";
      return next.toString() === current.toString();
    } catch (err) {
      return false;
    }
  }

  function mountLoader() {
    ensureLoaderStyles();
    var el = document.getElementById('pageLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pageLoader';
      el.className = 'hide';
      el.innerHTML =
        '<div class="loader-card" role="status" aria-live="polite" aria-busy="true">' +
          '<div class="loader-head">' +
            '<div class="loader-mark" aria-hidden="true"></div>' +
            '<div class="loader-copy">' +
              '<p class="loader-kicker">Worship Platform</p>' +
              '<p class="loader-title">Բեռնվում է…</p>' +
              '<p class="loader-text"></p>' +
            '</div>' +
          '</div>' +
          '<div class="loader-rail" aria-hidden="true"></div>' +
          '<div class="loader-meta">' +
            '<span class="loader-badge"><span class="loader-badge-dot"></span><span class="loader-badge-text">Ապահով բեռնում</span></span>' +
            '<span class="loader-progress">Խնդրում ենք մի փոքր սպասել</span>' +
          '</div>' +
          '<div class="loader-stack">' +
            '<div class="skeleton"></div>' +
            '<div class="skeleton" style="width:84%"></div>' +
            '<div class="skeleton" style="width:66%"></div>' +
          '</div>' +
        '</div>';
      document.body.prepend(el);
    }
    return el;
  }

  function updateLoaderCopy(el) {
    var textEl = el.querySelector('.loader-text');
    if (textEl) {
      textEl.textContent = getLoaderText();
    }
    var badgeTextEl = el.querySelector('.loader-badge-text');
    if (badgeTextEl) {
      badgeTextEl.textContent = isStandaloneAppMode() ? 'Ծրագրային բեռնում' : 'Ապահով բեռնում';
    }
  }

  function ensure(){
    window.clearTimeout(window.__wpPageLoaderShowTimer);
    var el = mountLoader();
    updateLoaderCopy(el);

    el.classList.remove('hide');
    el.dataset.mode = isStandaloneAppMode() ? 'app' : 'web';
    window.__wpLoaderShownAt = Date.now();
    return el;
  }

  function scheduleLoaderShow(delay) {
    var timeout = typeof delay === "number" ? Math.max(0, delay) : 120;
    window.clearTimeout(window.__wpPageLoaderShowTimer);

    var existing = document.getElementById('pageLoader');
    if (existing && !existing.classList.contains('hide')) {
      return existing;
    }

    mountLoader();
    window.__wpPageLoaderShowTimer = window.setTimeout(function() {
      if (window.__wpLoaderHolds && window.__wpLoaderHolds.size) {
        ensure();
        return;
      }
      ensure();
    }, timeout);

    return existing;
  }

  function hideLoaderNow() {
    window.clearTimeout(window.__wpPageLoaderShowTimer);
    if (window.__wpLoaderHolds && window.__wpLoaderHolds.size) {
      return false;
    }
    var el = document.getElementById('pageLoader');
    if (el) {
      el.classList.add('hide');
    }
    return true;
  }

  function getLoaderHoldStore() {
    if (!window.__wpLoaderHolds) {
      window.__wpLoaderHolds = new Set();
    }
    return window.__wpLoaderHolds;
  }

  function holdLoader(key) {
    var holdKey = key || ("hold-" + Date.now());
    var holds = getLoaderHoldStore();
    holds.add(String(holdKey));
    scheduleLoaderShow(120);
    return holdKey;
  }

  function beginSoftNavigation(rawUrl, opts) {
    if (!rawUrl) return false;
    if (window.__wpSoftNavigating) return true;

    var options = opts || {};
    if (isSamePageUrl(rawUrl)) {
      hideLoaderNow();
      return true;
    }

    window.__wpSoftNavigating = true;

    try {
      if (document.body && isStandaloneAppMode()) {
        document.body.classList.add("wp-app-transitioning");
      }
    } catch (err) {}

    scheduleLoaderShow(typeof options.loaderDelay === "number" ? options.loaderDelay : 60);

    window.setTimeout(function() {
      if (options.replace) {
        window.location.replace(rawUrl);
      } else {
        window.location.assign(rawUrl);
      }
    }, typeof options.navigationDelay === "number" ? options.navigationDelay : 72);

    return true;
  }

  function releaseLoader(key, delay) {
    var holds = getLoaderHoldStore();
    if (typeof key === "string" && key) {
      holds.delete(String(key));
    } else if (key == null) {
      holds.clear();
    }
    if (!holds.size) {
      hidePageLoaderSoon(typeof delay === "number" ? delay : 60);
    }
  }

  window.PageLoader = {
    show: ensure,
    showSoon: scheduleLoaderShow,
    hide: hideLoaderNow,
    hold: holdLoader,
    release: releaseLoader
  };
  window.WP = window.WP || {};
  window.WP.showLoader = ensure;
  window.WP.showLoaderSoon = scheduleLoaderShow;
  window.WP.hideLoader = hideLoaderNow;
  window.WP.holdLoader = holdLoader;
  window.WP.releaseLoader = releaseLoader;
  window.WP.navigate = beginSoftNavigation;

  function hidePageLoaderSoon(delay) {
    var minVisible = 260;
    var shownAt = Number(window.__wpLoaderShownAt || 0);
    var elapsed = shownAt ? (Date.now() - shownAt) : minVisible;
    var timeout = typeof delay === "number" ? delay : 180;
    timeout = Math.max(timeout, minVisible - elapsed, 0);
    window.clearTimeout(window.__wpPageLoaderHideTimer);
    window.__wpPageLoaderHideTimer = window.setTimeout(function() {
      if (window.__wpLoaderHolds && window.__wpLoaderHolds.size) {
        return;
      }
      window.PageLoader && typeof window.PageLoader.hide === "function" && window.PageLoader.hide();
    }, timeout);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mountLoader, { once:true });
  } else {
    mountLoader();
  }

  if (document.readyState === "complete") {
    hidePageLoaderSoon(80);
  } else {
    window.addEventListener("load", function() {
      hidePageLoaderSoon(120);
    }, { once: true });
  }

  window.addEventListener("pageshow", function() {
    hidePageLoaderSoon(80);
  });

  document.addEventListener("click", function(event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    if (anchor.hasAttribute("download")) return;
    if ((anchor.getAttribute("target") || "").toLowerCase() === "_blank") return;
    if (event.defaultPrevented) return;
    if (event.button && event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var href = anchor.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;

    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (isSamePageUrl(url.toString())) return;
      if (isStandaloneAppMode()) {
        event.preventDefault();
        beginSoftNavigation(url.toString(), { loaderDelay: 60, navigationDelay: 72 });
        return;
      }
      scheduleLoaderShow(120);
    } catch (err) {
      // ignore malformed urls
    }
  }, true);

  document.addEventListener("submit", function(event) {
    var form = event.target;
    if (!form || !form.tagName || form.tagName.toLowerCase() !== "form") return;
    if (form.hasAttribute("data-wp-no-loader") || form.hasAttribute("data-wp-ajax-form")) return;
    if (event.defaultPrevented) return;
    scheduleLoaderShow(120);
  }, true);

  if ("serviceWorker" in navigator) {
    function isStandaloneMode() {
      return isStandaloneAppMode();
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
      target.postMessage({ type: "REGISTER_APP_CLIENT", scope: "main" });
    }

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

        function activateWaitingWorker() {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }

        reg.addEventListener("updatefound", function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", function() {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              activateWaitingWorker();
            }
          });
        });

        if (navigator.onLine) reg.update();
        window.addEventListener("online", function() {
          reg.update();
          announceAppClient(reg);
        });
      }).catch(function(err) {
        console.error("Service worker registration failed", err);
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", function() {
      if (window.__wpSwReloading) return;
      window.__wpSwReloading = true;
      window.location.reload();
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
  }

  (function setupGlobalNetworkNotice() {
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

    function syncLibraryChip(mode) {
      var chip = document.getElementById("wpAppLibraryChip");
      if (!chip) return;
      chip.textContent = mode === "offline" ? "Օֆֆլայն գրադարան" : "Առցանց գրադարան";
    }

    function syncAppStatusChip(isOnline) {
      var chip = document.getElementById("wpAppOnlineChip");
      if (!chip) return;
      chip.textContent = isOnline ? "Առցանց" : "Օֆֆլայն";
      chip.classList.toggle("status-online", !!isOnline);
      chip.classList.toggle("status-offline", !isOnline);
    }

    function ensureNotice() {
      var existing = document.getElementById("wpNetNotice");
      if (existing) return existing;

      var styleId = "wpNetNoticeStyles";
      if (!document.getElementById(styleId)) {
        var style = document.createElement("style");
        style.id = styleId;
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
      syncAppStatusChip(false);
      showNotice("Ինտերնետ կապը բացակայում է։ Աշխատում եք օֆֆլայն ռեժիմում։", true);
    }

    function showOnline() {
      syncAppStatusChip(true);
      showNotice("Ինտերնետ կապը վերականգնվել է։", true);
    }

    function markOnlineTransition() {
      try {
        sessionStorage.setItem("wp_last_online_transition_at", String(Date.now()));
      } catch (e) {
        // ignore
      }
    }

    window.addEventListener("offline", showOffline);
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
    if (!navigator.onLine) showOffline();
    else syncAppStatusChip(true);

    window.WP = window.WP || {};
    window.WP.setLibraryMode = function(mode) {
      syncLibraryChip(mode);
    };
  })();


  (function setupInstalledOfflineLibrarySync() {
    function requestOfflineLibrarySync() {
      if (!("serviceWorker" in navigator)) return;
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
  })();


  (function setupInstallPrompt() {
    var deferredPrompt = null;
    var confirmedKey = "wp_install_confirmed";
    var iosIntentKey = "wp_install_ios_intent";

    function isStandaloneMode() {
      return isStandaloneAppMode();
    }

    function resetInstallPromptState() {
      try {
        localStorage.removeItem(confirmedKey);
        localStorage.removeItem(iosIntentKey);
      } catch (err) {}
    }

    window.addEventListener("beforeinstallprompt", function(e) {
      e.preventDefault();
      deferredPrompt = e;
      window.__wpDeferredInstallPrompt = e;
      resetInstallPromptState();
    });

    window.addEventListener("appinstalled", function() {
      deferredPrompt = null;
      window.__wpDeferredInstallPrompt = null;
      try {
        localStorage.setItem(confirmedKey, "1");
        localStorage.removeItem(iosIntentKey);
      } catch (err) {}
    });
  })();

  (function setupOpenInAppPrompt() {
    if (isStandaloneAppMode()) return;
    if (isAuthProgramPage()) return;
    if (!isPageAppEnabled()) return;

    var hideKey = "wp_open_app_hidden_session";
    var cacheKey = "wp_open_app_detection_cache_v1";
    var cacheTtlMs = 6 * 60 * 60 * 1000;
    var confirmedKey = "wp_install_confirmed";
    var lastStandaloneSeenKey = "wp_install_last_standalone_seen_at";
    var hintTtlMs = 45 * 24 * 60 * 60 * 1000;

    function isIosInstallMode() {
      var ua = window.navigator.userAgent || "";
      var isIos = /iphone|ipad|ipod/i.test(ua);
      var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
      return isIos && isSafari;
    }

    function getDeviceKind() {
      try {
        var ua = window.navigator.userAgent || "";
        if (/iphone|ipad|ipod/i.test(ua)) return "ios";
        if (/android/i.test(ua)) return "android";
        return "desktop";
      } catch (err) {
        return "desktop";
      }
    }

    function ensureStyles() {
      if (document.getElementById("wpOpenAppStyles")) return;
      var style = document.createElement("style");
      style.id = "wpOpenAppStyles";
      style.textContent =
        ".wp-open-app{position:fixed;left:50%;right:auto;bottom:16px;transform:translateX(-50%);width:min(460px,calc(100vw - 24px));z-index:100001;display:none;flex-direction:column;align-items:stretch;gap:12px;padding:14px;border-radius:16px;background:rgba(11,17,31,.94);color:#eef3ff;border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 34px rgba(0,0,0,.28);backdrop-filter:blur(16px) saturate(130%);-webkit-backdrop-filter:blur(16px) saturate(130%);font-family:Inter,system-ui,sans-serif}" +
        ".wp-open-app.show{display:flex}" +
        ".wp-open-app-copy{display:flex;flex-direction:column;gap:4px;min-width:0}" +
        ".wp-open-app-kicker{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8ea1ff}" +
        ".wp-open-app-text{font-size:13px;font-weight:700;line-height:1.35;color:#eef3ff}" +
        ".wp-open-app-note{font-size:11px;font-weight:600;line-height:1.35;color:#aeb8cf}" +
        ".wp-open-app-actions{display:flex;gap:8px;flex:0 0 auto;justify-content:flex-end;flex-wrap:wrap}" +
        ".wp-open-app-launch,.wp-open-app-close{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:0;border-radius:10px;padding:9px 12px;cursor:pointer;text-decoration:none;font:800 12px/1 Inter,system-ui,sans-serif;white-space:nowrap}" +
        ".wp-open-app-launch{background:linear-gradient(135deg,#6b7cff,#8ea1ff);color:#fff;box-shadow:0 10px 20px rgba(82,104,228,.24)}" +
        ".wp-open-app-close{background:rgba(255,255,255,.1);color:#eef3ff}" +
        "@media (min-width: 860px){.wp-open-app{left:auto;right:18px;transform:none;width:min(420px,calc(100vw - 36px))}}" +
        "@media (max-width: 720px){.wp-open-app{width:min(100vw - 16px,440px);padding:12px;gap:10px}.wp-open-app-text{font-size:12px}.wp-open-app-note{font-size:10px}.wp-open-app-actions{justify-content:stretch}.wp-open-app-launch,.wp-open-app-close{flex:1 1 140px;padding:8px 10px;font-size:12px}}";
      document.head.appendChild(style);
    }

    function ensureBanner() {
      var existing = document.getElementById("wpOpenAppBanner");
      if (existing) return existing;
      ensureStyles();
      var banner = document.createElement("div");
      banner.id = "wpOpenAppBanner";
      banner.className = "wp-open-app";
      banner.innerHTML =
        '<div class="wp-open-app-copy">' +
        '  <div class="wp-open-app-kicker">' + i18nText("app.openApp.app", "Worship ծրագիր") + '</div>' +
        '  <div class="wp-open-app-text">' + i18nText("app.openApp.pageText", "Այս էջը կարող ես բացել Worship ծրագրի մեջ։") + '</div>' +
        '  <div class="wp-open-app-note"></div>' +
        '</div>' +
        '<div class="wp-open-app-actions">' +
        '  <button class="wp-open-app-close" type="button">' + i18nText("app.openApp.close", "Փակել") + '</button>' +
        '  <a class="wp-open-app-launch" href="/">' + i18nText("app.openApp.openInApp", "Բացել ծրագրում") + '</a>' +
        '</div>';
      document.body.appendChild(banner);
      return banner;
    }

    function readCachedDetection() {
      try {
        var raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.expires_at || parsed.expires_at < Date.now()) return null;
        if (typeof parsed.installed === "boolean") {
          return {
            installed: parsed.installed,
            confidence: String(parsed.confidence || "unknown")
          };
        }
        if (typeof parsed.value === "boolean") {
          return {
            installed: parsed.value === true,
            confidence: parsed.value === true ? "hint" : "unknown"
          };
        }
        return null;
      } catch (err) {
        return null;
      }
    }

    function writeCachedDetection(installed, confidence) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          installed: !!installed,
          confidence: confidence || "unknown",
          expires_at: Date.now() + cacheTtlMs
        }));
      } catch (err) {
        // ignore storage issues
      }
    }

    function hasRecentStandaloneHint() {
      try {
        if (localStorage.getItem(confirmedKey) !== "1") return false;
        var lastSeen = Number(localStorage.getItem(lastStandaloneSeenKey) || "0");
        return !!lastSeen && (Date.now() - lastSeen) <= hintTtlMs;
      } catch (err) {
        return false;
      }
    }

    function hasConfirmedInstallHint() {
      try {
        return localStorage.getItem(confirmedKey) === "1";
      } catch (err) {
        return false;
      }
    }

    async function detectInstalledAppFromServer() {
      try {
        var response = await fetch("/install_api.php?action=current_device_status&scope=main", {
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!response || !response.ok) return null;
        var payload = await response.json();
        if (!payload || typeof payload !== "object") return null;
        return {
          installed: payload.installed === true,
          active: payload.active === true,
          confidence: String(payload.confidence || "server"),
          lastSeenAt: String(payload.last_seen_at || "")
        };
      } catch (err) {
        return null;
      }
    }

    function isInstalledWebAppMatch(app) {
      if (!app || typeof app !== "object") return false;
      var platform = String(app.platform || "").toLowerCase();
      var appId = String(app.id || "");
      var appUrl = String(app.url || "");
      if (platform !== "webapp") return false;
      if (appId === "/main.html?source=pwa") return true;
      return /\/manifest\.json(?:$|\?)/i.test(appUrl);
    }

    async function detectInstalledApp() {
      var serverState = await detectInstalledAppFromServer();
      if (serverState) {
        writeCachedDetection(serverState.installed, serverState.confidence);
        return serverState;
      }

      var cached = readCachedDetection();
      if (cached) return cached;

      var state = {
        installed: false,
        confidence: "unknown"
      };

      if (typeof navigator.getInstalledRelatedApps === "function") {
        try {
          var relatedApps = await navigator.getInstalledRelatedApps();
          if (Array.isArray(relatedApps) && relatedApps.some(isInstalledWebAppMatch)) {
            state.installed = true;
            state.confidence = "detected";
            writeCachedDetection(true, "detected");
            return state;
          }
          state.confidence = "checked";
        } catch (err) {
          state.confidence = "unknown";
        }
      }

      if (hasRecentStandaloneHint()) {
        state.installed = true;
        state.confidence = "recent";
        writeCachedDetection(true, "recent");
        return state;
      }

      if (hasConfirmedInstallHint()) {
        state.installed = true;
        state.confidence = "remembered";
        writeCachedDetection(true, "remembered");
        return state;
      }

      writeCachedDetection(false, state.confidence);
      return state;
    }

    function buildCanonicalAppUrl() {
      try {
        var url = new URL(window.location.href);
        url.searchParams.delete("source");
        return url.toString();
      } catch (err) {
        return window.location.href;
      }
    }

    function positionBanner(banner) {
      banner.style.bottom = getFloatingOverlayBottomOffset() + "px";
    }

    function showBanner() {
      try {
        if (sessionStorage.getItem(hideKey) === "1") return;
      } catch (err) {}

      var banner = ensureBanner();
      var launch = banner.querySelector(".wp-open-app-launch");
      var close = banner.querySelector(".wp-open-app-close");
      var text = banner.querySelector(".wp-open-app-text");
      var note = banner.querySelector(".wp-open-app-note");
      var kicker = banner.querySelector(".wp-open-app-kicker");
      if (!launch || !close || !text || !note || !kicker) return;

      var installState = window.__wpOpenAppState || {
        installed: hasConfirmedInstallHint() || hasRecentStandaloneHint(),
        confidence: "unknown"
      };
      var installed = !!installState.installed;
      var confidence = String(installState.confidence || "unknown");
      var hasInstallPrompt = !!window.__wpDeferredInstallPrompt;
      var deviceKind = getDeviceKind();
      var shouldShow = false;

      if (deviceKind === "ios") {
        shouldShow = true;
      } else if (installed || hasInstallPrompt) {
        shouldShow = true;
      }

      if (!shouldShow) {
        hideBanner();
        return;
      }

      if (installed && confidence === "server") {
        kicker.textContent = i18nText("app.openApp.installedKicker", "Ծրագիրը տեղադրված է");
        text.textContent = i18nText("app.openApp.installedText", "Այս սարքում Worship ծրագիրը արդեն տեղադրված է։");
        note.textContent = deviceKind === "ios"
          ? i18nText("app.openApp.iosInstalledNote", "iPhone-ի վրա բացիր այն ձեռքով գլխավոր էկրանից։")
          : deviceKind === "android"
            ? i18nText("app.openApp.androidInstalledNote", "Android-ի վրա բացիր այն ձեռքով գլխավոր էկրանից կամ ծրագրերի ցանկից։")
            : i18nText("app.openApp.desktopInstalledNote", "Համակարգչի վրա բացիր այն ձեռքով տեղադրված ծրագրերի ցանկից։");
        launch.textContent = i18nText("app.openApp.howToOpen", "Ինչպես բացել");
      } else if (deviceKind === "ios") {
        kicker.textContent = i18nText("app.openApp.addKicker", "Ավելացրու ծրագիրը");
        text.textContent = i18nText("app.openApp.iosAddText", "iPhone-ի վրա կարող ես Worship-ը ավելացնել որպես առանձին ծրագիր։");
        note.textContent = i18nText("app.openApp.iosAddNote", "Safari-ում սեղմիր Share, հետո ընտրիր Add to Home Screen։ Եթե արդեն տեղադրված է, բացիր այն գլխավոր էկրանից։");
        launch.textContent = i18nText("app.openApp.howToAdd", "Ինչպես ավելացնել");
      } else if (hasInstallPrompt) {
        kicker.textContent = i18nText("app.openApp.openOrAddKicker", "Բացել կամ ավելացնել");
        text.textContent = i18nText("app.openApp.openOrAddText", "Այս սարքում կարող ես բացել կամ ավելացնել Worship ծրագիրը։");
        note.textContent = deviceKind === "android"
          ? i18nText("app.openApp.androidPromptNote", "Սեղմիր ներքևի կոճակը, որպեսզի բրաուզերը ցույց տա ծրագրի ավելացման պատուհանը։")
          : i18nText("app.openApp.desktopPromptNote", "Սեղմիր ներքևի կոճակը, եթե բրաուզերը թույլ է տալիս ավելացնել ծրագիրը։");
        launch.textContent = i18nText("app.openApp.openInApp", "Բացել ծրագրում");
      } else if (installed) {
        kicker.textContent = i18nText("app.openApp.installedKicker", "Ծրագիրը տեղադրված է");
        text.textContent = i18nText("app.openApp.probablyInstalledText", "Worship ծրագիրը այս սարքում հավանաբար տեղադրված է։");
        note.textContent = deviceKind === "android"
          ? i18nText("app.openApp.androidManualNote", "Բացիր այն ձեռքով գլխավոր էկրանից կամ ծրագրերի ցանկից։")
          : i18nText("app.openApp.desktopManualNote", "Բացիր այն ձեռքով տեղադրված ծրագրերի ցանկից։");
        launch.textContent = i18nText("app.openApp.howToOpen", "Ինչպես բացել");
      } else {
        hideBanner();
        return;
      }

      launch.href = buildCanonicalAppUrl();
      positionBanner(banner);
      banner.classList.add("show");

      launch.onclick = async function(event) {
        var targetUrl = buildCanonicalAppUrl();
        var installPrompt = window.__wpDeferredInstallPrompt || null;
        var currentState = window.__wpOpenAppState || {
          installed: hasConfirmedInstallHint() || hasRecentStandaloneHint(),
          confidence: "unknown"
        };
        var likelyInstalled = !!currentState.installed;
        var confidence = String(currentState.confidence || "unknown");
        var deviceKind = getDeviceKind();

        if (likelyInstalled) {
          event.preventDefault();
          if (deviceKind === "ios") {
            window.alert("iPhone-ի վրա, եթե Worship ծրագիրը տեղադրված է, բացիր այն ձեռքով գլխավոր էկրանից։");
          } else if (deviceKind === "android") {
            window.alert("Android-ի վրա, եթե Worship ծրագիրը տեղադրված է, բացիր այն ձեռքով ծրագրերի ցանկից կամ գլխավոր էկրանից։");
          } else {
            window.alert("Սերվերի հաշվառմամբ Worship ծրագիրը տեղադրված է, բայց այս բրաուզերը կայքից չի կարող այն ավտոմատ բացել։ Բացիր ծրագիրը ձեռքով։");
          }
          return;
        }

        if (deviceKind === "ios") {
          event.preventDefault();
          window.alert("iPhone-ի վրա Safari-ում սեղմիր Share, հետո ընտրիր Add to Home Screen։ Եթե Worship-ը արդեն տեղադրված է, բացիր այն գլխավոր էկրանից։");
          return;
        }

        if (installPrompt) {
          event.preventDefault();
          try {
            installPrompt.prompt();
            if (typeof installPrompt.userChoice === "object" && installPrompt.userChoice && typeof installPrompt.userChoice.then === "function") {
              installPrompt.userChoice.finally(function() {
                window.__wpDeferredInstallPrompt = null;
              });
            } else {
              window.__wpDeferredInstallPrompt = null;
            }
          } catch (err) {
            window.alert("Այս բրաուզերը հիմա չկարողացավ ցույց տալ ծրագրի ավելացման պատուհանը։ Փորձիր բրաուզերի ընտրացանկից։");
          }
          return;
        }

        event.preventDefault();
        if (deviceKind === "android") {
          window.alert("Android-ի վրա բացիր բրաուզերի ընտրացանկը և ընտրիր Install app կամ Add to Home screen։");
        } else {
          window.alert("Այս բրաուզերում ծրագիրը ավտոմատ բացել կամ ավելացնել չի ստացվում։ Օգտվիր բրաուզերի ընտրացանկից կամ բացիր ծրագիրը ձեռքով։");
        }
      };

      close.onclick = function() {
        try {
          sessionStorage.setItem(hideKey, "1");
        } catch (err) {}
        banner.classList.remove("show");
      };
    }

    function hideBanner() {
      var banner = document.getElementById("wpOpenAppBanner");
      if (banner) {
        banner.classList.remove("show");
      }
    }

    async function refreshOpenInAppPrompt() {
      if (isStandaloneAppMode() || !isPageAppEnabled()) {
        hideBanner();
        return;
      }

      window.__wpOpenAppState = await detectInstalledApp();
      showBanner();
    }

    window.addEventListener("load", function() {
      refreshOpenInAppPrompt();
    });
    window.addEventListener("pageshow", function() {
      refreshOpenInAppPrompt();
    });
    window.addEventListener("resize", function() {
      var banner = document.getElementById("wpOpenAppBanner");
      if (banner && banner.classList.contains("show")) {
        positionBanner(banner);
      }
    });
  })();

  (function setupInstallTracking() {
    if (!("fetch" in window)) return;

    var deviceKey = "wp_install_device_id";
    var deviceCookieKey = "wp_install_device_id";
    var deviceSignatureCookieKey = "wp_install_device_sig";
    var pingKey = "wp_install_last_ping_at";
    var confirmedKey = "wp_install_confirmed";
    var iosIntentKey = "wp_install_ios_intent";
    var lastStandaloneSeenKey = "wp_install_last_standalone_seen_at";
    var pingInterval = 12 * 60 * 60 * 1000;

    function isStandaloneMode() {
      return isStandaloneAppMode();
    }

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

        if (localStorage.getItem(confirmedKey) === "1") {
          return true;
        }

        if (window.navigator.standalone === true && localStorage.getItem(iosIntentKey) === "1") {
          localStorage.setItem(confirmedKey, "1");
          localStorage.removeItem(iosIntentKey);
          return true;
        }
      } catch (e) {
        return false;
      }

      return false;
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

    function markStandaloneSeen() {
      try {
        localStorage.setItem(lastStandaloneSeenKey, String(Date.now()));
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
          "scope:main",
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
      markStandaloneSeen();
      if (!force && !shouldPing()) return;

      fetch("/install_api.php?action=register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-App-Scope": "main",
          "X-WP-Install-Mode": "standalone"
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          scope: "main",
          source: "main-app-verified",
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
          markStandaloneSeen();
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
      if (isStandaloneMode()) {
        markStandaloneSeen();
      }
      setTimeout(function() {
        registerInstall({ force: true });
      }, 900);
    });
    window.addEventListener("online", registerInstall);
    window.addEventListener("appinstalled", function() {
      setTimeout(function() {
        registerInstall({ force: true });
      }, 1200);
    });

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
          var prevState = lastAuthState;

          if (isLoggedIn && window.WPInstallTracker && typeof window.WPInstallTracker.forceSyncCurrentInstall === "function") {
            window.WPInstallTracker.forceSyncCurrentInstall();
          } else if (nextState === "guest" && lastAuthState !== "guest" && window.WPInstallTracker && typeof window.WPInstallTracker.clearCurrentInstallIdentity === "function") {
            window.WPInstallTracker.clearCurrentInstallIdentity();
          }

          lastAuthState = nextState;

          if (prevState !== nextState) {
            try {
              window.dispatchEvent(new CustomEvent("wp-auth-statechange", {
                detail: {
                  loggedIn: isLoggedIn,
                  userId: data && data.user_id ? Number(data.user_id) : null,
                  sessionType: data && data.session_type ? String(data.session_type) : null
                }
              }));
            } catch (eventError) {
              // ignore event dispatch failures
            }
          }

          if (!isLoggedIn && prevState !== "guest") {
            var path = String((window.location && window.location.pathname) || "").toLowerCase();
            if (path === "/account.html") {
              var next = (window.location.pathname || "/account.html") + (window.location.search || "") + (window.location.hash || "");
              var target = (window.WP && typeof window.WP.withAppSource === "function")
                ? window.WP.withAppSource("/loginuser.php?next=" + encodeURIComponent(next))
                : "/loginuser.php?next=" + encodeURIComponent(next);
              window.location.href = target;
              return;
            }
          }
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
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    var config = null;
    var sessionHideKey = "wp_push_prompt_hidden_session";
    var disabledKey = "wp_push_prompt_disabled";
    var accountDisabledKey = "wp_push_account_disabled";
    var autoAttemptKey = "wp_push_auto_attempted";
    var adminRemovedKey = "wp_push_admin_removed";
    var pushPromptText = "Ցանկանո՞ւմ եք միացնել Worship Platform-ի ծանուցումները, որպեսզի ստանաք նորությունները, թարմացումներն ու հայտարարությունները։";
    var appConfirmedKey = "wp_install_confirmed";

    function hasConfirmedAppInstall() {
      try {
        return isStandaloneMode() || localStorage.getItem(appConfirmedKey) === "1";
      } catch (err) {
        return isStandaloneMode();
      }
    }

    async function cleanupWebsiteOnlySubscription() {
      try {
        var registration = await navigator.serviceWorker.ready;
        var subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        await fetch("/push_api.php?action=unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        await subscription.unsubscribe();
      } catch (err) {
        console.error("Website push cleanup failed", err);
      }
    }

    if (!isStandaloneMode()) {
      if (!hasConfirmedAppInstall()) {
        window.addEventListener("load", function() {
          cleanupWebsiteOnlySubscription();
        });
      }
      return;
    }

    function ensureStyles() {
      if (document.getElementById("wpPushStyles")) return;
      var style = document.createElement("style");
      style.id = "wpPushStyles";
        style.textContent =
        ".wp-push{position:fixed;left:16px;right:16px;bottom:88px;z-index:100000;display:none;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(18,24,32,.96);color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 30px rgba(0,0,0,.35);font-family:Inter,system-ui,sans-serif}" +
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
      var registration = null;
      var subscription = null;

      try {
        registration = await navigator.serviceWorker.ready;
        subscription = await registration.pushManager.getSubscription();
      } catch (err) {
        registration = null;
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
