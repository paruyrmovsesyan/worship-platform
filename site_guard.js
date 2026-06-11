// /site_guard.js
(function(){
  const OVERLAY_ID = "global-maintenance";
  const ENDPOINT = "/status.php";

  function getCurrentPageKey(){
    try{
      const path = ((window.location && window.location.pathname) || "/").toLowerCase();
      if(path === "/" || path === "/index.html") return "landing";
      if(path === "/main.html") return "main";
      if(path === "/song_view.html") return "song";
      if(path === "/favorites.html") return "favorites";
      if(path === "/setlists.html" || path === "/setlist_edit.html" || path === "/setlist_view.html" || path === "/setlist_public.html") return "setlists";
      if(path === "/account.html") return "account";
      if(path === "/news.html") return "news";
      if(
        path === "/loginuser.php" ||
        path === "/registeruser.php" ||
        path === "/forgot_password.php" ||
        path === "/forgot_password_sent.php" ||
        path === "/reset_password.php" ||
        path === "/verify_email_confirm.php"
      ) return "auth";
    }catch(e){}
    return "";
  }

  function isPageDisabledByAdmin(data){
    if(!data || !data.page_app_modes || typeof data.page_app_modes !== "object") return false;
    const key = getCurrentPageKey();
    if(!key || !Object.prototype.hasOwnProperty.call(data.page_app_modes, key)) return false;
    return data.page_app_modes[key] === false;
  }

  function isStandaloneAppContext(){
    try{
      const source = (new URL(window.location.href).searchParams.get("source") || "").toLowerCase();
      if(source === "pwa" || source === "admin-app") return true;
    }catch(e){}

    try{
      if(document.body && (document.body.classList.contains("wp-main-app") || document.body.classList.contains("wp-admin-app"))){
        return true;
      }
    }catch(e){}

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
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
  
    try{
      const r = await fetch(ENDPOINT + "?_=" + Date.now(), { cache:"no-store" });
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      const isJson = ct.includes("application/json");

      if(!r.ok){
        if (!navigator.onLine && isStandalone) return;

        if (isJson) {
          const data = await r.json().catch(function(){ return null; });
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

  // optional՝ պարբերաբար ստուգել
  setInterval(function(){
    if (!navigator.onLine) return;
    checkStatus();
  }, 30000);

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
