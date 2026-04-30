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
    major: "Major Release",
    feature: "Feature Update",
    patch: "Patch Update",
    hotfix: "Hotfix",
    maintenance: "Maintenance Refresh",
    content: "Content Update"
  };

  function isStandaloneMode() {
    try {
      var source = (new URL(window.location.href).searchParams.get("source") || "").toLowerCase();
      if (source === "pwa" || source === "admin-app") {
        return true;
      }
    } catch (err) {}
    if (document.documentElement.classList.contains("wp-standalone-app")) return true;
    if (document.body && document.body.classList.contains("wp-standalone-app")) return true;
    return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }

  function refreshPage(version) {
    var url = new URL(window.location.href);
    url.searchParams.set("v", version || String(Date.now()));
    window.location.href = url.toString();
  }

  function closeModal() {
    var modal = document.getElementById("wpVersionModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.classList.remove("mode-app", "mode-web");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function ensureUpdateModal() {
    var existing = document.getElementById("wpVersionModal");
    if (existing) return existing;

    if (!document.getElementById("wpVersionModalStyles")) {
      var style = document.createElement("style");
      style.id = "wpVersionModalStyles";
      style.textContent =
        ".wp-version-modal{position:fixed!important;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,7,14,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:2147483000;isolation:isolate}" +
        ".wp-version-modal.show{display:flex}" +
        ".wp-version-card{width:min(94vw,520px);position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(10,16,30,.98),rgba(10,16,30,.94));color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:24px;box-shadow:0 28px 80px rgba(0,0,0,.42);font-family:Inter,system-ui,sans-serif}" +
        ".wp-version-card::before{content:'';position:absolute;inset:auto auto -40px -20px;width:180px;height:180px;background:radial-gradient(circle,rgba(122,162,255,.25),transparent 70%)}" +
        ".wp-version-card::after{content:'';position:absolute;inset:-50px -10px auto auto;width:220px;height:220px;background:radial-gradient(circle,rgba(255,184,77,.14),transparent 72%)}" +
        ".wp-version-head{position:relative;display:flex;gap:14px;align-items:flex-start}" +
        ".wp-version-icon{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;font-size:26px;background:linear-gradient(135deg,#4f7cff,#7aa2ff);box-shadow:0 14px 28px rgba(79,124,255,.3);flex:0 0 auto}" +
        ".wp-version-card.mode-web .wp-version-icon{background:linear-gradient(135deg,#ff9d4d,#ffd25e);box-shadow:0 14px 28px rgba(255,157,77,.26)}" +
        ".wp-version-copy{min-width:0}" +
        ".wp-version-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#dbe4ff}" +
        ".wp-version-title{margin:10px 0 0;font-size:24px;line-height:1.12}" +
        ".wp-version-text{position:relative;margin:14px 0 0;color:rgba(255,255,255,.84);line-height:1.6;font-size:15px}" +
        ".wp-version-summary{position:relative;margin-top:14px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.9);line-height:1.55;font-size:14px}" +
        ".wp-version-summary strong{display:block;margin-bottom:6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.6)}" +
        ".wp-version-meta{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}" +
        ".wp-version-stat{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}" +
        ".wp-version-stat strong{display:block;font-size:12px;color:rgba(255,255,255,.6);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}" +
        ".wp-version-stat span{display:block;font-weight:700;color:#fff;word-break:break-word}" +
        ".wp-version-actions{position:relative;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px}" +
        ".wp-version-actions button{min-height:44px;border-radius:14px;border:0;padding:12px 16px;font:700 14px/1.2 Inter,system-ui,sans-serif;cursor:pointer;transition:transform .16s ease,opacity .16s ease}" +
        ".wp-version-actions button:hover{transform:translateY(-1px)}" +
        ".wp-version-actions button:disabled{opacity:.7;cursor:default;transform:none}" +
        ".wp-version-later{background:rgba(255,255,255,.10);color:#fff}" +
        ".wp-version-update{background:linear-gradient(135deg,#4f7cff,#7aa2ff);color:#fff;box-shadow:0 14px 30px rgba(79,124,255,.28)}" +
        ".wp-version-card.mode-web .wp-version-update{background:linear-gradient(135deg,#ff9d4d,#ffd25e);box-shadow:0 14px 30px rgba(255,157,77,.24);color:#1b1400}" +
        ".wp-version-foot{position:relative;margin-top:14px;color:rgba(255,255,255,.52);font-size:12px;line-height:1.5}" +
        "body.wp-main-app .wp-version-modal{align-items:flex-end!important;justify-content:center!important;padding:16px 12px max(16px,env(safe-area-inset-bottom))}" +
        "body.wp-main-app .wp-version-card{width:min(100%,560px);border-radius:30px 30px 24px 24px;padding:22px 20px 20px;box-shadow:0 30px 80px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(13,19,36,.98),rgba(9,14,28,.96))}" +
        "body.wp-main-app .wp-version-card.mode-app{border-color:rgba(130,149,255,.2)}" +
        "body.wp-main-app .wp-version-card.mode-app::before{width:220px;height:220px;background:radial-gradient(circle,rgba(122,162,255,.3),transparent 70%)}" +
        "body.wp-main-app .wp-version-card.mode-app::after{width:260px;height:260px;background:radial-gradient(circle,rgba(255,255,255,.08),transparent 72%)}" +
        "body.wp-main-app .wp-version-card.mode-app .wp-version-icon{background:linear-gradient(135deg,rgba(121,141,255,.98),rgba(90,113,255,.75));box-shadow:0 20px 34px rgba(91,115,255,.28),inset 0 1px 0 rgba(255,255,255,.26)}" +
        "body.wp-main-app .wp-version-card.mode-app .wp-version-badge{background:rgba(130,149,255,.12);border-color:rgba(130,149,255,.18);color:#dfe6ff}" +
        "body.wp-main-app .wp-version-card.mode-app .wp-version-summary{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.09)}" +
        "body.wp-main-app .wp-version-card.mode-app .wp-version-update{background:linear-gradient(135deg,#7a95ff,#5b73ff);box-shadow:0 16px 32px rgba(91,115,255,.32)}" +
        "body.wp-main-app .wp-version-card.mode-app .wp-version-later{background:rgba(255,255,255,.08)}" +
        "@media (max-width:560px){.wp-version-card{padding:20px;border-radius:24px}.wp-version-meta{grid-template-columns:1fr}.wp-version-title{font-size:22px}.wp-version-head{align-items:center}body.wp-main-app .wp-version-modal{padding:10px 8px max(8px,env(safe-area-inset-bottom))}body.wp-main-app .wp-version-card{width:100%;border-radius:28px 28px 20px 20px;padding:18px 16px 16px}body.wp-main-app .wp-version-title{font-size:20px}body.wp-main-app .wp-version-text{font-size:14px;line-height:1.5}body.wp-main-app .wp-version-actions{flex-direction:column}body.wp-main-app .wp-version-actions button{width:100%}}";
      document.head.appendChild(style);
    }

    var modal = document.createElement("div");
    modal.id = "wpVersionModal";
    modal.className = "wp-version-modal";
    modal.innerHTML =
      '<div class="wp-version-card" role="dialog" aria-modal="true" aria-labelledby="wpVersionTitle">' +
      '  <div class="wp-version-head">' +
      '    <div id="wpVersionIcon" class="wp-version-icon">⬆</div>' +
      '    <div class="wp-version-copy">' +
      '      <div id="wpVersionBadge" class="wp-version-badge">Update</div>' +
      '      <h3 id="wpVersionTitle" class="wp-version-title">Թարմացում</h3>' +
      '    </div>' +
      '  </div>' +
      '  <p id="wpVersionMessage" class="wp-version-text"></p>' +
      '  <div id="wpVersionSummary" class="wp-version-summary" hidden><strong>Release Summary</strong><span id="wpVersionSummaryText"></span></div>' +
      '  <div class="wp-version-meta">' +
      '    <div class="wp-version-stat"><strong>Release</strong><span id="wpVersionReleaseType">—</span></div>' +
      '    <div class="wp-version-stat"><strong>Version</strong><span id="wpVersionNumber">—</span></div>' +
      '    <div class="wp-version-stat"><strong>Updated</strong><span id="wpVersionUpdated">—</span></div>' +
      '  </div>' +
      '  <div class="wp-version-actions">' +
      '    <button id="wpVersionLater" class="wp-version-later" type="button">Հետո</button>' +
      '    <button id="wpVersionUpdate" class="wp-version-update" type="button">Թարմացնել</button>' +
      '  </div>' +
      '  <div id="wpVersionFoot" class="wp-version-foot"></div>' +
      "</div>";

    modal.addEventListener("click", function(event) {
      if (event.target === modal) {
        closeModal();
      }
    });

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
    var laterBtn = modal.querySelector("#wpVersionLater");
    var updateBtn = modal.querySelector("#wpVersionUpdate");

    if (!card || !icon || !badge || !title || !message || !summary || !summaryText || !releaseType || !version || !updated || !foot || !laterBtn || !updateBtn) return;

    modal.classList.toggle("mode-app", options.mode === "app");
    modal.classList.toggle("mode-web", options.mode === "web");
    card.classList.toggle("mode-app", options.mode === "app");
    card.classList.toggle("mode-web", options.mode === "web");
    icon.textContent = options.mode === "app" ? "⌁" : "↻";
    badge.textContent = options.mode === "app" ? "Ծրագրի թարմացում" : "Կայքի թարմացում";
    title.textContent = options.title;
    message.textContent = options.message;
    summary.hidden = !options.releaseSummary;
    summaryText.textContent = options.releaseSummary || "";
    releaseType.textContent = options.releaseTypeLabel || "Թարմացում";
    version.textContent = options.version;
    updated.textContent = options.updatedAt || "հենց նոր";
    foot.textContent = options.footnote || "";
    updateBtn.textContent = options.buttonLabel;
    updateBtn.disabled = false;

    laterBtn.onclick = function() {
      closeModal();
    };

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

  function checkVersionManifest() {
    if (CHECK_IN_PROGRESS) return;
    if (!navigator.onLine) return;

    CHECK_IN_PROGRESS = true;

    fetch(MANIFEST_URL + "?_=" + Date.now(), { cache: "no-store" })
      .then(function(res) {
        if (!res.ok) throw new Error("version_manifest failed");
        return res.json();
      })
      .then(function(data) {
        if (data && data.ok) {
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
})();
