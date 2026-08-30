(function () {
  "use strict";

  var memoryLocal = {};
  var memorySession = {};

  function createStorage(nativeStorage, memory) {
    function getItem(key) {
      try {
        var value = nativeStorage && nativeStorage.getItem(key);
        if (value !== null) memory[key] = value;
        return value !== null ? value : Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      } catch (_error) {
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      }
    }

    function setItem(key, value) {
      var text = String(value);
      memory[key] = text;
      try { if (nativeStorage) nativeStorage.setItem(key, text); } catch (_error) { /* Sitzungsspeicher bleibt aktiv. */ }
    }

    function removeItem(key) {
      delete memory[key];
      try { if (nativeStorage) nativeStorage.removeItem(key); } catch (_error) { /* Bereits entfernt. */ }
    }

    function keys() {
      var result = Object.keys(memory);
      try {
        if (nativeStorage) {
          for (var index = 0; index < nativeStorage.length; index += 1) {
            var key = nativeStorage.key(index);
            if (key !== null && result.indexOf(key) === -1) result.push(key);
          }
        }
      } catch (_error) { /* Nur Sitzungsschlüssel zurückgeben. */ }
      return result;
    }

    return { getItem: getItem, setItem: setItem, removeItem: removeItem, keys: keys };
  }

  function nativeStorage(name) {
    try { return window[name]; } catch (_error) { return null; }
  }

  var userAgent = navigator.userAgent || "";
  var touchMac = /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;
  var platform = /Android/i.test(userAgent) ? "android"
    : /iPad/i.test(userAgent) || touchMac ? "ipados"
      : /iPhone|iPod/i.test(userAgent) ? "ios"
        : /Windows/i.test(userAgent) ? "windows"
          : /Macintosh|Mac OS X/i.test(userAgent) ? "macos"
            : /Linux/i.test(userAgent) ? "linux" : "web";
  var isStandalone = Boolean(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var root = document.documentElement;

  root.classList.add("tf-platform-" + platform);
  if (navigator.maxTouchPoints > 0) root.classList.add("tf-touch");
  if (isStandalone) root.classList.add("tf-standalone");
  root.setAttribute("data-timeflow-platform", platform);

  function updateViewport() {
    var viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    if (viewportHeight) root.style.setProperty("--tf-viewport-height", Math.round(viewportHeight) + "px");
  }

  function openDialog(dialog) {
    if (!dialog) return false;
    try {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      return true;
    } catch (_error) {
      dialog.setAttribute("open", "");
      return true;
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    try {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    } catch (_error) { dialog.removeAttribute("open"); }
  }

  updateViewport();
  window.addEventListener("resize", updateViewport, { passive: true });
  window.addEventListener("orientationchange", function () { window.setTimeout(updateViewport, 120); }, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", updateViewport, { passive: true });

  window.TimeFlowPlatform = {
    name: platform,
    isStandalone: isStandalone,
    storage: createStorage(nativeStorage("localStorage"), memoryLocal),
    session: createStorage(nativeStorage("sessionStorage"), memorySession),
    dialog: { open: openDialog, close: closeDialog },
    updateViewport: updateViewport
  };
}());
