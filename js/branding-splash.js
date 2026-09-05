(function () {
  "use strict";
  const splash = document.getElementById("brandSplash");
  if (!splash) return;

  const close = () => {
    splash.classList.add("is-leaving");
    window.setTimeout(() => splash.remove(), 480);
  };

  window.addEventListener("load", () => window.setTimeout(close, 1450), { once: true });
  window.setTimeout(close, 3500);
})();
