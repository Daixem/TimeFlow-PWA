(function () {
  "use strict";

  var modes = ["schedule-mode", "chat-mode", "profile-mode", "clock-mode", "settings-mode"];
  var pages = {
    schedule: "schedulePage",
    chat: "chatPage",
    profile: "profilePage",
    clock: "clockPage",
    settings: "settingsPage"
  };

  function navTarget(node) {
    while (node && node !== document) {
      if (node.classList && node.classList.contains("nav-item") && node.getAttribute("data-target")) return node.getAttribute("data-target");
      node = node.parentNode;
    }
    return null;
  }

  function currentPage() {
    var active = document.querySelector(".nav-item.active[data-target]");
    return document.documentElement.getAttribute("data-timeflow-page") || (active && active.getAttribute("data-target")) || "home";
  }

  function repair(requested) {
    var dashboard = document.getElementById("dashboard");
    var app = document.querySelector(".app");
    if (!dashboard || !app) return;

    var page = requested || "home";
    var target = page === "home" ? null : document.getElementById(pages[page]);
    if (page !== "home" && (!target || !target.children.length)) page = "home";

    for (var modeIndex = 0; modeIndex < modes.length; modeIndex += 1) dashboard.classList.remove(modes[modeIndex]);
    if (page !== "home") dashboard.classList.add(page + "-mode");

    for (var name in pages) {
      if (!Object.prototype.hasOwnProperty.call(pages, name)) continue;
      var pageElement = document.getElementById(pages[name]);
      if (!pageElement) continue;
      if (name === page) pageElement.classList.remove("hidden");
      else pageElement.classList.add("hidden");
    }

    if (page === "home") {
      app.classList.remove("subpage-mode");
      var header = app.querySelector(".header");
      if (header) header.style.removeProperty("display");
      var children = dashboard.children;
      for (var childIndex = 0; childIndex < children.length; childIndex += 1) {
        var child = children[childIndex];
        var dynamicPage = child.classList.contains("app-page") || child.id === "schedulePage" || child.id === "chatPage";
        if (!dynamicPage) {
          child.classList.remove("hidden");
          child.style.removeProperty("display");
          child.style.removeProperty("visibility");
          child.style.removeProperty("opacity");
        }
      }
    } else {
      app.classList.add("subpage-mode");
    }

    var navItems = document.querySelectorAll(".nav-item[data-target]");
    for (var navIndex = 0; navIndex < navItems.length; navIndex += 1) {
      var selected = navItems[navIndex].getAttribute("data-target") === page;
      if (selected) {
        navItems[navIndex].classList.add("active");
        navItems[navIndex].setAttribute("aria-current", "page");
      } else {
        navItems[navIndex].classList.remove("active");
        navItems[navIndex].removeAttribute("aria-current");
      }
    }

    document.documentElement.setAttribute("data-timeflow-page", page);
    document.documentElement.setAttribute("data-timeflow-shell", "0040");
    // A shell repair may run after visibility changes or recoverable script errors.
    // It must never move the user's current reading position.
  }

  var repairQueued = false;
  var queuedPage = null;

  // Several lifecycle events can happen together when an installed PWA opens.
  // Queue one repair instead of rebuilding the view for each event.
  function scheduleRepair(page) {
    queuedPage = page || queuedPage || currentPage();
    if (repairQueued) return;
    repairQueued = true;
    window.requestAnimationFrame(function () {
      repairQueued = false;
      var pageToRepair = queuedPage;
      queuedPage = null;
      repair(pageToRepair);
    });
  }

  document.addEventListener("click", function (event) {
    var target = navTarget(event.target);
    if (target) scheduleRepair(target);
  }, false);

  document.addEventListener("DOMContentLoaded", function () { scheduleRepair(currentPage()); });
  window.addEventListener("pageshow", function (event) {
    // The first pageshow follows DOMContentLoaded; repair only bfcache returns.
    if (event.persisted) scheduleRepair(currentPage());
  });
  window.addEventListener("error", function (event) {
    if (event && event.filename && event.filename.indexOf("/js/") !== -1) scheduleRepair(currentPage());
  }, true);

  window.TimeFlowShell = { repair: repair };
}());
