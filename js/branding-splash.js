(function () {
  "use strict";
  const splash = document.getElementById("brandSplash");
  if (!splash) return;

  const close = () => {
    splash.classList.add("is-leaving");
    window.setTimeout(() => splash.remove(), 480);
  };

  // Keep the branding visible, without making it feel like a second app start.
  document.addEventListener("DOMContentLoaded", () => window.setTimeout(close, 520), { once: true });
  window.setTimeout(close, 1800);
})();
