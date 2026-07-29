// /site_guard.js
(function(){
  const OVERLAY_ID = "global-maintenance";
  const ENDPOINT = "/status.php";

  function getCurrentPageKey(){
    try{
      const path = ((window.location && window.location.pathname) || "/").toLowerCase();
      if(path === "/" || path === "/index.html") return "landing";
      if(path === "/songs" || path.startsWith("/songs") || path === "/transpose" || path === "/main.html") return "main";
      if(path.startsWith("/song/") || path === "/song_view.html") return "song";
      if(path === "/favorites" || path === "/favorites.html") return "favorites";
      if(path === "/setlists" || path.startsWith("/setlists") || path === "/setlists.html" || path === "/setlist_view.html" || path === "/setlist_public.html") return "setlists";
      if(path === "/news" || path.startsWith("/news") || path === "/news.html") return "news";
      if(path === "/teams" || path.startsWith("/teams")) return "teams";
      if(path === "/community") return "community";
      if(path === "/pricing") return "pricing";
      if(path === "/resources") return "resources";
      if(path === "/song-request") return "song_request";
      if(path === "/profile" || path === "/settings" || path === "/account" || path === "/account.html") return "account";
      if(
        path === "/loginuser.php" ||
        path === "/registeruser.php" ||
        path === "/forgot_password.php" ||
        path === "/forgot_password_sent.php" ||
        path === "/reset_password.php" ||
        path === "/verify_email_confirm.php" ||
        path === "/login" ||
        path === "/register"
      ) return "auth";
    }catch(e){}
    return "";
  }

  function isPageDisabledByAdmin(data){
    if(!data) return false;
    const isApp = isStandaloneAppContext();
    const key = getCurrentPageKey();
    if(!key) return false;

    const appModes = data.page_app_modes || {};
    const webModes = data.page_web_modes || {};

    if (isApp) {
      if (Object.prototype.hasOwnProperty.call(appModes, key) && appModes[key] === false) {
        return true;
      }
    } else {
      if (Object.prototype.hasOwnProperty.call(webModes, key) && webModes[key] === false) {
        return true;
      }
    }

    if (appModes[key] === false && webModes[key] === false) {
      return true;
    }

    return false;
  }

  function applyDynamicMenuHiding(modesObj){
    if(!modesObj || typeof modesObj !== "object") return;
    const keyToHrefs = {
      "landing": ["/", "/index.html"],
      "main": ["/songs", "/songs.php", "/transpose"],
      "favorites": ["/favorites"],
      "setlists": ["/setlists"],
      "account": ["/profile", "/settings"],
      "news": ["/news"],
      "teams": ["/teams"],
      "community": ["/community"],
      "pricing": ["/pricing"],
      "resources": ["/resources"],
      "song_request": ["/song-request"]
    };
    let css = "";
    for(const key in modesObj){
      if(Object.prototype.hasOwnProperty.call(modesObj, key) && modesObj[key] === false){
        const hrefs = keyToHrefs[key] || [];
        hrefs.forEach(href => {
          if(href === "/"){
            css += `a.nav-item[href="/"] { display: none !important; }\n`;
          } else {
            css += `a[href="${href}"], a[href^="${href}?"] { display: none !important; }\n`;
          }
        });
      }
    }
    let styleEl = document.getElementById("wp-dynamic-menu-hider");
    if(!styleEl){
      styleEl = document.createElement("style");
      styleEl.id = "wp-dynamic-menu-hider";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  function isStandaloneAppContext(){
    if(window.matchMedia("(display-mode: browser)").matches){
      return false;
    }
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.indexOf("android-app://") !== -1;
  }

  function getDockBottomInset(){
    const dock = document.getElementById("wpAppDock");
    if(dock){
      const rect = dock.getBoundingClientRect();
      if(rect && rect.height){
        return Math.max(88, Math.round(window.innerHeight - rect.top + 10));
      }
    }
    return window.matchMedia("(max-width: 720px)").matches ? 92 : 104;
  }

  function detectOS() {
    const userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) return "android";
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return "ios";
    if (/Mac OS X/.test(userAgent) && !/iPhone|iPad|iPod/.test(userAgent)) return "macos";
    if (/Win/.test(userAgent)) return "windows";
    if (/Linux/.test(userAgent)) return "linux";
    return "unknown";
  }

  function isOSBlocked(data) {
    if (!data || !data.blocked_os_list || !Array.isArray(data.blocked_os_list)) return false;
    const os = detectOS();
    return data.blocked_os_list.includes(os);
  }

  function buildPageUnavailableUrl(message){
    const params = new URLSearchParams();
    const key = getCurrentPageKey();
    if(key) params.set("page", key);
    if(message) params.set("message", message);

    if(isStandaloneAppContext()){
      params.set("mode", "app");
      try{
        const source = (new URL(window.location.href).searchParams.get("source") || "").toLowerCase();
        if(source === "pwa" || source === "admin-app"){
          params.set("source", source);
        }else{
          params.set("source", "pwa");
        }
      }catch(e){
        params.set("source", "pwa");
      }
    }else{
      params.set("mode", "web");
    }

    return "/page_unavailable.html?" + params.toString();
  }

  function ensureOverlay(){
    if(document.getElementById(OVERLAY_ID)) return;

    const wrap = document.createElement("div");
    wrap.id = OVERLAY_ID;
    wrap.style.cssText = `
      position:fixed; inset:0; z-index:999999;
      display:none; align-items:center; justify-content:center;
      background:rgba(10,15,25,.92);
      color:#fff; padding:24px; text-align:center;
      font-family: Inter, system-ui, sans-serif;
    `;
    wrap.innerHTML = `
      <div id="gm_card" style="max-width:520px;border:1px solid rgba(255,255,255,.12);
                  background:rgba(255,255,255,.06);border-radius:18px;
                  padding:22px;backdrop-filter: blur(10px);">
        <div id="gm_title" style="font-size:22px;font-weight:800;margin-bottom:10px;">⚠ Տեխնիկական աշխատանքներ</div>
        <div id="gm_text" style="opacity:.85;line-height:1.5;font-size:14px;">
          Կայքը ժամանակավորապես անհասանելի է։
        </div>
        <button id="gm_retry"
          style="margin-top:16px;padding:10px 14px;border-radius:12px;border:none;
                 cursor:pointer;font-weight:800;color:#fff;
                 background:linear-gradient(135deg,#3367ff,#2247d6);">
          Փորձել նորից
        </button>
      </div>
    `;
    document.body.appendChild(wrap);
    document.getElementById("gm_retry").onclick = () => location.reload();
  }

  function hideOverlay(){
    const el = document.getElementById(OVERLAY_ID);
    if(!el) return;
    el.style.display = "none";
    el.style.bottom = "0";
    el.style.paddingBottom = "24px";
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function showOverlay(options){
    ensureOverlay();
    const el = document.getElementById(OVERLAY_ID);
    const title = document.getElementById("gm_title");
    const t = document.getElementById("gm_text");
    const retry = document.getElementById("gm_retry");
    const card = document.getElementById("gm_card");
    const next = typeof options === "string" ? { message: options } : (options || {});
    if(title) title.textContent = next.title || "⚠ Տեխնիկական խնդիր";
    if(t && next.message) t.textContent = next.message;
    if(retry) retry.style.display = next.hideRetry ? "none" : "inline-flex";

    if(isStandaloneAppContext()){
      const dockInset = getDockBottomInset();
      el.style.bottom = dockInset + "px";
      el.style.paddingBottom = "24px";
      if(card){
        card.style.pointerEvents = "auto";
      }
    }else{
      el.style.bottom = "0";
      el.style.paddingBottom = "24px";
    }

    el.style.display = "flex";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  async function checkStatus(){
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const activitySurface = isStandaloneAppContext() ? "app" : "web";
    const activityPath = (window.location && window.location.pathname) || "/";
  
    try{
      const params = new URLSearchParams({
        surface: activitySurface,
        path: activityPath,
        _: String(Date.now())
      });
      const r = await fetch(ENDPOINT + "?" + params.toString(), {
        cache:"no-store",
        credentials:"same-origin"
      });
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      const isJson = ct.includes("application/json");

      if(!r.ok){
        if (!navigator.onLine && isStandalone) return;

        if (isJson) {
          const data = await r.json().catch(function(){ return null; });
          
          if (isOSBlocked(data)) {
            if (window.location.pathname !== "/maintenance.html") {
              const msg = encodeURIComponent("Ձեր օպերացիոն համակարգի համար մուտքը ժամանակավորապես փակ է։");
              window.location.replace("/maintenance.html?message=" + msg);
            }
            return;
          }
          
          if (data && data.maintenance) {
            if (window.location.pathname !== "/maintenance.html") {
              const msg = encodeURIComponent(data.message || "");
              window.location.replace("/maintenance.html" + (msg ? "?message=" + msg : ""));
            }
            return;
          }

          showOverlay({
            title: "⚠ Տեխնիկական խնդիր",
            message: (data && data.message) || ("Կայքը ժամանակավորապես անհասանելի է (Server " + r.status + ").")
          });
          return;
        }

        showOverlay({
          title: "⚠ Տեխնիկական խնդիր",
          message: "Կայքը ժամանակավորապես անհասանելի է (Server " + r.status + ")."
        });
        return;
      }

      if(!isJson){
        if (!navigator.onLine && isStandalone) return;
        showOverlay({
          title: "⚠ Տեխնիկական խնդիր",
          message: "Սերվերը սխալ պատասխան է վերադարձնում։"
        });
        return;
      }
  
      const data = await r.json();
      
      const isApp = isStandaloneAppContext();
      const modesObj = isApp ? data.page_app_modes : data.page_web_modes;
      applyDynamicMenuHiding(modesObj);

      if(isPageDisabledByAdmin(data)){
        const target = buildPageUnavailableUrl(data.message || "Այս էջը ժամանակավորապես անջատված է տեխնիկական աշխատանքների պատճառով։");
        if(window.location.pathname !== "/page_unavailable.html"){
          window.location.replace(target);
          return;
        }
        showOverlay({
          title: "⚠ Տեխնիկական աշխատանքներ",
          message: data.message || "Այս էջը ժամանակավորապես անջատված է տեխնիկական աշխատանքների պատճառով։",
          hideRetry: false
        });
        return;
      }
      if(isOSBlocked(data)) {
        if (window.location.pathname !== "/maintenance.html") {
          const msg = encodeURIComponent("Ձեր օպերացիոն համակարգի համար մուտքը ժամանակավորապես փակ է։");
          window.location.replace("/maintenance.html?message=" + msg);
        }
        return;
      }

      if(data && data.maintenance){
        if (window.location.pathname !== "/maintenance.html") {
          const msg = encodeURIComponent(data.message || "");
          window.location.replace("/maintenance.html" + (msg ? "?message=" + msg : ""));
        }
        return;
      }

      hideOverlay();
    }catch(e){
      if (!navigator.onLine && isStandalone) {
        return;
      }
      showOverlay({
        title: "⚠ Տեխնիկական խնդիր",
        message: "Չհաջողվեց կապ հաստատել սերվերի հետ։"
      });
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", checkStatus);
  }else{
    checkStatus();
  }

  // Intercept SPA navigation so route changes re-trigger maintenance check
  window.addEventListener("popstate", checkStatus);

  const _pushState = history.pushState;
  if (typeof _pushState === "function") {
    history.pushState = function() {
      const res = _pushState.apply(this, arguments);
      setTimeout(checkStatus, 10);
      return res;
    };
  }

  const _replaceState = history.replaceState;
  if (typeof _replaceState === "function") {
    history.replaceState = function() {
      const res = _replaceState.apply(this, arguments);
      setTimeout(checkStatus, 10);
      return res;
    };
  }

  // optional՝ պարբերաբար ստուգել
  setInterval(function(){
    if (!navigator.onLine) return;
    checkStatus();
  }, 5000);

  // common JSON error fallback (օր. html է գալիս)
  window.addEventListener("unhandledrejection", (e)=>{
    const msg = String(e.reason || "");
    if(msg.includes("Unexpected token '<'")){
      showOverlay({
        title: "⚠ Տեխնիկական խնդիր",
        message: "Կայքը ժամանակավորապես անհասանելի է։"
      });
    }
  });
})();
