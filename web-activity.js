(function() {
  "use strict";

  if (window.__wpWebActivityStarted) return;
  window.__wpWebActivityStarted = true;

  var timerId = null;
  var sending = false;
  var lastSentAt = 0;
  var intervalMs = 5000;
  var minimumGapMs = 4000;

  function canSend() {
    return !document.hidden && navigator.onLine !== false;
  }

  function activitySource() {
    if (window.matchMedia && window.matchMedia("(display-mode: browser)").matches) {
      return "web";
    }

    var standalone = window.matchMedia &&
      (window.matchMedia("(display-mode: standalone)").matches ||
       window.matchMedia("(display-mode: fullscreen)").matches);
    var activeSource = "";
    try {
      activeSource = String(window.sessionStorage.getItem("wp_active_app_source") || "").toLowerCase();
    } catch (e) {}

    var nativeApp = standalone ||
      window.navigator.standalone === true ||
      document.referrer.indexOf("android-app://") !== -1;
    return nativeApp && activeSource === "pwa" ? "app" : "web";
  }

  function schedule() {
    window.clearTimeout(timerId);
    if (!canSend()) return;
    timerId = window.setTimeout(sendHeartbeat, intervalMs);
  }

  function sendHeartbeat() {
    if (sending || !canSend()) {
      schedule();
      return;
    }
    if (Date.now() - lastSentAt < minimumGapMs) {
      schedule();
      return;
    }

    sending = true;
    lastSentAt = Date.now();
    fetch("/web_activity_api.php", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname || "/",
        source: activitySource(),
        presenceVersion: 4
      })
    }).catch(function() {
      // Activity reporting must never interrupt the website.
    }).finally(function() {
      sending = false;
      schedule();
    });
  }

  window.addEventListener("pageshow", sendHeartbeat);
  window.addEventListener("focus", sendHeartbeat);
  window.addEventListener("online", sendHeartbeat);
  document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
      window.clearTimeout(timerId);
      return;
    }
    lastSentAt = 0;
    sendHeartbeat();
  });

  sendHeartbeat();
})();
