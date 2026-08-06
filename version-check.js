(function() {
  if (window.__wpVersionCheckBooted) return;
  window.__wpVersionCheckBooted = true;

  var MANIFEST_URL = "/version_manifest.php";
  var APP_KEY = "wp_seen_app_version";
  var WEB_KEY = "wp_seen_web_version";
  var APP_STAMP_KEY = "wp_seen_app_release_stamp";
  var WEB_STAMP_KEY = "wp_seen_web_release_stamp";
  var PENDING_APP_KEY = "wp_pending_app_version";
  var PENDING_APP_STAMP_KEY = "wp_pending_app_release_stamp";
  var CHECK_IN_PROGRESS = false;
  var RELEASE_TYPE_LABELS = {
    major: "Մեծ թարմացում",
    feature: "Նոր հնարավորություններ",
    patch: "Փոքր ուղղումներ",
    hotfix: "Արագ շտկում",
    maintenance: "Տեխնիկական թարմացում",
    content: "Բովանդակության թարմացում"
  };

  function isStandaloneMode() {
    if (window.matchMedia && window.matchMedia("(display-mode: browser)").matches) return false;
    return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true ||
      document.referrer.indexOf("android-app://") !== -1;
  }

  function refreshPage(version) {
    var url = new URL(window.location.href);
    url.searchParams.set("v", version || String(Date.now()));
    window.location.href = url.toString();
  }

  function detectOS() {
    var userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) return "android";
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return "ios";
    if (/Mac OS X/.test(userAgent) && !/iPhone|iPad|iPod/.test(userAgent)) return "macos";
    if (/Win/.test(userAgent)) return "windows";
    if (/Linux/.test(userAgent)) return "linux";
    return "unknown";
  }

  function isOSBlocked(data) {
    if (!data || !data.blocked_os_list || !Array.isArray(data.blocked_os_list)) return false;
    var os = detectOS();
    return data.blocked_os_list.indexOf(os) !== -1;
  }

  function closeModal() {
    var modal = document.getElementById("wpVersionModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.classList.remove("mode-app", "mode-web");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function formatUpdateDate(dateStr) {
    if (!dateStr) return "Հենց նոր";
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var months = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի", "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];
      var day = d.getDate();
      var month = months[d.getMonth()];
      var year = d.getFullYear();
      var hours = String(d.getHours()).padStart(2, '0');
      var mins = String(d.getMinutes()).padStart(2, '0');
      return day + " " + month + " " + year + ", " + hours + ":" + mins;
    } catch (e) {
      return dateStr;
    }
  }

  function ensureUpdateModal() {
    var existing = document.getElementById("wpVersionModal");
    if (existing) return existing;

    if (!document.getElementById("wpVersionModalStyles")) {
      var style = document.createElement("style");
      style.id = "wpVersionModalStyles";
      style.textContent =
        ".wp-version-modal{position:fixed!important;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,7,14,.76);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:2147483000;isolation:isolate}" +
        ".wp-version-modal.show{display:flex}" +
        ".wp-version-card{width:min(94vw,520px);max-height:90vh;overflow-y:auto;position:relative;background:linear-gradient(180deg,rgba(14,20,38,.98),rgba(10,15,30,.96));color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:28px;padding:24px;box-shadow:0 28px 80px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif}" +
        ".wp-version-card::-webkit-scrollbar{display:none}" +
        ".wp-version-card::before{content:'';position:absolute;inset:auto auto -40px -20px;width:200px;height:200px;background:radial-gradient(circle,rgba(0,212,255,.25),transparent 70%);pointer-events:none}" +
        ".wp-version-card::after{content:'';position:absolute;inset:-50px -10px auto auto;width:240px;height:240px;background:radial-gradient(circle,rgba(58,45,255,.2),transparent 72%);pointer-events:none}" +
        ".wp-version-head{position:relative;display:flex;gap:14px;align-items:center}" +
        ".wp-version-icon{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,#3a2dff,#00d4ff);box-shadow:0 14px 28px rgba(0,212,255,.25);flex:0 0 auto;color:#fff}" +
        ".wp-version-card.mode-web .wp-version-icon{background:linear-gradient(135deg,#ff9d4d,#ffd25e);box-shadow:0 14px 28px rgba(255,157,77,.26)}" +
        ".wp-version-copy{min-width:0}" +
        ".wp-version-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.25);font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#00d4ff}" +
        ".wp-version-title{margin:6px 0 0;font-size:22px;font-weight:800;line-height:1.2;color:#ffffff}" +
        ".wp-version-text{position:relative;margin:12px 0 0;color:rgba(255,255,255,.84);line-height:1.6;font-size:14px}" +
        ".wp-version-summary{position:relative;margin-top:14px;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.92);line-height:1.55;font-size:14px}" +
        ".wp-version-summary strong{display:block;margin-bottom:6px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.6);font-weight:700}" +
        ".wp-version-meta{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}" +
        ".wp-version-stat{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}" +
        ".wp-version-stat strong{display:block;font-size:11px;color:rgba(255,255,255,.55);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;font-weight:700}" +
        ".wp-version-stat span{display:block;font-weight:700;color:#fff;font-size:13px;word-break:break-word}" +
        ".wp-version-actions{position:relative;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px}" +
        ".wp-version-actions button{min-height:46px;border-radius:14px;border:0;padding:12px 18px;font:700 14px/1.2 Inter,system-ui,sans-serif;cursor:pointer;transition:transform .16s ease,opacity .16s ease}" +
        ".wp-version-actions button:hover{transform:translateY(-1px)}" +
        ".wp-version-actions button:disabled{opacity:.7;cursor:default;transform:none}" +
        ".wp-version-later{background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.12)}" +
        ".wp-version-update{background:linear-gradient(135deg,#3a2dff,#00d4ff);color:#fff;box-shadow:0 12px 28px rgba(0,212,255,.28)}" +
        ".wp-version-card.mode-web .wp-version-update{background:linear-gradient(135deg,#ff9d4d,#ffd25e);box-shadow:0 14px 30px rgba(255,157,77,.24);color:#1b1400}" +
        ".wp-version-foot{position:relative;margin-top:14px;color:rgba(255,255,255,.52);font-size:12px;line-height:1.5}" +
        "@media (max-width:560px){.wp-version-card{padding:20px;border-radius:24px}.wp-version-meta{grid-template-columns:1fr}.wp-version-title{font-size:20px}.wp-version-head{align-items:center}.wp-version-actions{flex-direction:column}.wp-version-actions button{width:100%}}";
      document.head.appendChild(style);
    }

    var modal = document.createElement("div");
    modal.id = "wpVersionModal";
    modal.className = "wp-version-modal";
    modal.innerHTML =
      '<div class="wp-version-card" role="dialog" aria-modal="true" aria-labelledby="wpVersionTitle">' +
      '  <div class="wp-version-head">' +
      '    <div id="wpVersionIcon" class="wp-version-icon">⚡</div>' +
      '    <div class="wp-version-copy">' +
      '      <div id="wpVersionBadge" class="wp-version-badge">ԾՐԱԳՐԻ ԹԱՐՄԱՑՈՒՄ</div>' +
      '      <h3 id="wpVersionTitle" class="wp-version-title">Ծրագրի նոր տարբերակ</h3>' +
      '    </div>' +
      '  </div>' +
      '  <p id="wpVersionMessage" class="wp-version-text"></p>' +
      '  <div id="wpVersionSummary" class="wp-version-summary" hidden><strong>ԹԱՐՄԱՑՄԱՆ ԱՄՓՈՓՈՒՄ</strong><span id="wpVersionSummaryText"></span></div>' +
      '  <div class="wp-version-meta">' +
      '    <div class="wp-version-stat"><strong>ՏԵՍԱԿԸ</strong><span id="wpVersionReleaseType">—</span></div>' +
      '    <div class="wp-version-stat"><strong>ՏԱՐԲԵՐԱԿ</strong><span id="wpVersionNumber">—</span></div>' +
      '    <div class="wp-version-stat"><strong>ԱՄՍԱԹԻՎ</strong><span id="wpVersionUpdated">—</span></div>' +
      '  </div>' +
      '  <div class="wp-version-actions">' +
      '    <button id="wpVersionUpdate" class="wp-version-update" type="button">Թարմացնել ծրագիրը</button>' +
      '  </div>' +
      '  <div id="wpVersionFoot" class="wp-version-foot"></div>' +
      "</div>";

    document.body.appendChild(modal);
    return modal;
  }

  function showUpdateModal(options) {
    var legacyModal = document.getElementById("updateModal");
    if (legacyModal) {
      legacyModal.style.display = "none";
      legacyModal.setAttribute("hidden", "hidden");
    }

    var modal = ensureUpdateModal();
    var card = modal.querySelector(".wp-version-card");
    var icon = modal.querySelector("#wpVersionIcon");
    var badge = modal.querySelector("#wpVersionBadge");
    var title = modal.querySelector("#wpVersionTitle");
    var message = modal.querySelector("#wpVersionMessage");
    var summary = modal.querySelector("#wpVersionSummary");
    var summaryText = modal.querySelector("#wpVersionSummaryText");
    var releaseType = modal.querySelector("#wpVersionReleaseType");
    var version = modal.querySelector("#wpVersionNumber");
    var updated = modal.querySelector("#wpVersionUpdated");
    var foot = modal.querySelector("#wpVersionFoot");
    var updateBtn = modal.querySelector("#wpVersionUpdate");

    if (!card || !icon || !badge || !title || !message || !summary || !summaryText || !releaseType || !version || !updated || !foot || !updateBtn) return;

    modal.classList.toggle("mode-app", options.mode === "app");
    modal.classList.toggle("mode-web", options.mode === "web");
    card.classList.toggle("mode-app", options.mode === "app");
    card.classList.toggle("mode-web", options.mode === "web");
    icon.textContent = options.mode === "app" ? "⚡" : "🌐";
    badge.textContent = options.mode === "app" ? "ԾՐԱԳՐԻ ԹԱՐՄԱՑՈՒՄ" : "ԿԱՅՔԻ ԹԱՐՄԱՑՈՒՄ";
    title.textContent = options.title || "Ծրագրի նոր տարբերակ";

    if (options.message && options.message.trim() !== (options.title || "").trim()) {
      message.textContent = options.message;
      message.style.display = "block";
    } else {
      message.textContent = "";
      message.style.display = "none";
    }

    summary.hidden = !options.releaseSummary;
    summaryText.textContent = options.releaseSummary || "";
    releaseType.textContent = options.releaseTypeLabel || "Թարմացում";
    version.textContent = options.version || "—";
    updated.textContent = formatUpdateDate(options.updatedAt);
    foot.textContent = options.footnote || "";
    updateBtn.textContent = options.buttonLabel;
    updateBtn.disabled = false;

    updateBtn.onclick = function() {
      updateBtn.disabled = true;
      updateBtn.textContent = options.progressLabel;
      options.onConfirm(updateBtn);
    };

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    modal.style.zIndex = "2147483000";
    modal.classList.add("show");
  }

  function handleAppUpdate(version, releaseStamp, button) {
    try {
      localStorage.setItem(PENDING_APP_KEY, version);
      localStorage.setItem(PENDING_APP_STAMP_KEY, releaseStamp || version);
    } catch (e) {}

    if (!("serviceWorker" in navigator) || !navigator.onLine) {
      try {
        localStorage.setItem(APP_KEY, version);
        localStorage.setItem(APP_STAMP_KEY, releaseStamp || version);
        localStorage.removeItem(PENDING_APP_KEY);
        localStorage.removeItem(PENDING_APP_STAMP_KEY);
      } catch (e) {}
      closeModal();
      refreshPage(version);
      return;
    }

    navigator.serviceWorker.ready.then(function(reg) {
      if (reg.update) reg.update();

      if (reg.active) {
        reg.active.postMessage({ type: "SYNC_OFFLINE_LIBRARY" });
        return;
      }

      try {
        localStorage.setItem(APP_KEY, version);
        localStorage.setItem(APP_STAMP_KEY, releaseStamp || version);
        localStorage.removeItem(PENDING_APP_KEY);
        localStorage.removeItem(PENDING_APP_STAMP_KEY);
      } catch (e) {}
      closeModal();
      refreshPage(version);
    }).catch(function() {
      try {
        localStorage.setItem(APP_KEY, version);
        localStorage.setItem(APP_STAMP_KEY, releaseStamp || version);
        localStorage.removeItem(PENDING_APP_KEY);
        localStorage.removeItem(PENDING_APP_STAMP_KEY);
      } catch (e) {}
      closeModal();
      refreshPage(version);
    });

    if (button) {
      button.textContent = "Թարմացվում է...";
    }
  }

  function handleWebUpdate(version, releaseStamp) {
    try {
      localStorage.setItem(WEB_KEY, version);
      localStorage.setItem(WEB_STAMP_KEY, releaseStamp || version);
    } catch (e) {}
    closeModal();
    refreshPage(version);
  }

  function applyVersionManifest(data) {
    var standalone = isStandaloneMode();
    var mode = standalone ? "app" : "web";
    var storageKey = standalone ? APP_KEY : WEB_KEY;
    var stampKey = standalone ? APP_STAMP_KEY : WEB_STAMP_KEY;
    var remoteVersion = standalone ? data.app_version : data.web_version;
    var remoteStamp = standalone
      ? (data.app_release_stamp || data.app_version || "")
      : (data.web_release_stamp || data.web_version || "");
    var releaseType = standalone ? data.app_release_type : data.web_release_type;
    var releaseSummary = standalone ? data.app_release_summary : data.web_release_summary;
    var title = standalone ? data.app_title : data.web_title;
    var message = standalone ? data.app_message : data.web_message;
    var seenVersion = null;
    var seenStamp = null;
    var remoteToken = remoteStamp || data.updated_at || remoteVersion;
    var localToken = "";

    if (!remoteVersion) return;

    try {
      seenVersion = localStorage.getItem(storageKey);
      seenStamp = localStorage.getItem(stampKey);
    } catch (e) {}

    if (!seenVersion) {
      try {
        localStorage.setItem(storageKey, remoteVersion);
        localStorage.setItem(stampKey, remoteToken);
      } catch (e) {}
      return;
    }

    localToken = seenStamp || seenVersion;

    if (seenVersion === remoteVersion && localToken === remoteToken) {
      return;
    }

    showUpdateModal({
      mode: mode,
      title: title || "Նոր տարբերակ",
      message: message || "Հասանելի է նոր տարբերակ։",
      releaseTypeLabel: RELEASE_TYPE_LABELS[releaseType] || "Update",
      releaseSummary: releaseSummary || "",
      version: remoteVersion,
      updatedAt: data.updated_at || "",
      buttonLabel: standalone ? "Թարմացնել ծրագիրը" : "Թարմացնել կայքը",
      progressLabel: standalone ? "Թարմացվում է..." : "Վերբեռնվում է...",
      footnote: standalone
        ? "Թարմացնելուց հետո ծրագիրը նորից կսինխրոնացնի օֆֆլայն բովանդակությունը։"
        : "Թարմացնելուց հետո browser-ը կբացի կայքի նոր տարբերակը։",
      onConfirm: function(button) {
        if (standalone) {
          handleAppUpdate(remoteVersion, remoteStamp, button);
        } else {
          handleWebUpdate(remoteVersion, remoteStamp);
        }
      }
    });
  }

  var _lastVersionCheckAt = 0;
  var VERSION_CHECK_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

  function checkVersionManifest() {
    if (CHECK_IN_PROGRESS) return;
    if (!navigator.onLine) return;

    var now = Date.now();
    if (now - _lastVersionCheckAt < VERSION_CHECK_THROTTLE_MS) return; // throttle
    _lastVersionCheckAt = now;

    CHECK_IN_PROGRESS = true;

    fetch(MANIFEST_URL + "?_=" + now, { cache: "no-store" })
      .then(function(res) {
        if (!res.ok) throw new Error("version_manifest failed");
        return res.json();
      })
      .then(function(data) {
        if (data && data.ok) {
          if (isOSBlocked(data)) {
            if (window.location.pathname !== "/maintenance.html") {
              var msg = encodeURIComponent("Ձեր օպերացիոն համակարգի համար մուտքը ժամանակավորապես փակ է։");
              window.location.replace("/maintenance.html?message=" + msg);
            }
            return;
          }
          applyVersionManifest(data);
        }
      })
      .catch(function(err) {
        console.error("Version manifest check failed", err);
      })
      .finally(function() {
        CHECK_IN_PROGRESS = false;
      });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function(event) {
      var data = event && event.data ? event.data : null;
      var pendingVersion = null;

      if (!data || data.type !== "DATA_SYNC" || !data.full_library) return;

      try {
        pendingVersion = localStorage.getItem(PENDING_APP_KEY);
      } catch (e) {}

      if (!pendingVersion) return;
      var pendingStamp = null;
      try {
        pendingStamp = localStorage.getItem(PENDING_APP_STAMP_KEY);
      } catch (e) {}

      try {
        localStorage.setItem(APP_KEY, pendingVersion);
        localStorage.setItem(APP_STAMP_KEY, pendingStamp || pendingVersion);
        localStorage.removeItem(PENDING_APP_KEY);
        localStorage.removeItem(PENDING_APP_STAMP_KEY);
      } catch (e) {}

      closeModal();
      refreshPage(pendingVersion);
    });
  }

  if (document.readyState === "complete") {
    checkVersionManifest();
  } else {
    window.addEventListener("load", checkVersionManifest);
  }

  window.addEventListener("online", checkVersionManifest);
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
      checkVersionManifest();
    }
  });
})();
