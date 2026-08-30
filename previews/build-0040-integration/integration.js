"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dailyMotivations = [
    "Fortschritt entsteht, wenn du heute den nächsten Schritt gehst.",
    "Beständigkeit bringt dich weiter als ein kurzer Moment der Perfektion.",
    "Du musst nicht alles schaffen – nur das Richtige beginnen.",
    "Jede erledigte Aufgabe schafft Platz für etwas Neues.",
    "Ein ruhiger Fokus ist oft stärker als hektischer Ehrgeiz.",
    "Heute zählt nicht das Tempo, sondern die Richtung.",
    "Aus kleinen Verbesserungen entsteht nachhaltiger Erfolg.",
    "Dein Einsatz von heute ist die Grundlage für morgen.",
    "Gute Arbeit beginnt mit einem klaren ersten Schritt.",
    "Du darfst langsam vorankommen, solange du nicht stehen bleibst.",
    "Konzentriere dich auf das, was du beeinflussen kannst.",
    "Auch ein anspruchsvoller Tag kann ein erfolgreicher Tag sein.",
    "Mach es Schritt für Schritt – so wird Großes überschaubar.",
    "Deine Aufmerksamkeit ist wertvoll: Setze sie bewusst ein.",
    "Ein klarer Plan macht aus Absicht echten Fortschritt.",
    "Heute ist eine neue Gelegenheit, es ein wenig besser zu machen.",
    "Erfolg wächst dort, wo Geduld und Einsatz zusammenkommen.",
    "Du bist weiter, als es sich an manchen Tagen anfühlt.",
    "Pausen sind kein Stillstand, sondern Teil guter Leistung.",
    "Was du regelmäßig tust, verändert mehr als das, was du selten perfekt machst.",
    "Beginne mit dem Wichtigsten – der Rest wird leichter.",
    "Mut zeigt sich oft in einem kleinen Schritt nach vorn.",
    "Dein heutiger Fokus entscheidet über dein Gefühl am Feierabend.",
    "Gib deinem Ziel Zeit und deinem Weg Vertrauen.",
    "Eine gute Entscheidung kann den ganzen Tag verändern.",
    "Du brauchst keinen perfekten Moment, um anzufangen.",
    "Jede Herausforderung trägt eine Möglichkeit zur Verbesserung in sich.",
    "Arbeite mit Ruhe, entscheide mit Klarheit und bleib bei dir.",
    "Ein Schritt nach dem anderen ist immer noch Vorwärtsbewegung.",
    "Heute darfst du stolz auf das sein, was du bereits geschafft hast.",
    "Kleine Erfolge verdienen genauso Aufmerksamkeit wie große Ziele.",
    "Klarheit entsteht oft erst, wenn du den ersten Schritt machst.",
    "Deine Energie folgt deiner Aufmerksamkeit.",
    "Ein guter Tag beginnt nicht perfekt, sondern bewusst.",
    "Du kannst jederzeit neu entscheiden, wie du weitermachst.",
    "Ausdauer bedeutet, auch an gewöhnlichen Tagen dranzubleiben.",
    "Mach heute etwas, für das dein zukünftiges Ich dankbar ist.",
    "Vertraue dem Prozess, auch wenn das Ergebnis noch nicht sichtbar ist.",
    "Eine Aufgabe wird leichter, sobald du sie beginnst.",
    "Deine Grenzen von gestern müssen nicht die Grenzen von heute sein.",
    "Gelassenheit und Leistung dürfen gleichzeitig existieren.",
    "Heute ist genug Zeit für einen sinnvollen Fortschritt.",
    "Nicht jeder Tag muss groß sein, um wichtig zu sein.",
    "Du kannst mehr bewegen, wenn du deine Kraft gezielt einsetzt.",
    "Ordnung im Kopf beginnt oft mit einer klaren Priorität.",
    "Ein bewusstes Nein schafft Raum für ein wichtiges Ja.",
    "Erfolg ist die Summe vieler unscheinbarer Entscheidungen.",
    "Bleib neugierig – in jeder Aufgabe steckt etwas Lernenswertes.",
    "Dein Weg darf anders aussehen als der anderer Menschen.",
    "Gute Ergebnisse brauchen Aufmerksamkeit, nicht ständigen Druck.",
    "Heute zählt, was du aus deinen Möglichkeiten machst.",
    "Du musst den ganzen Weg nicht kennen, um loszugehen.",
    "Wachstum beginnt dort, wo du dir selbst etwas zutraust.",
    "Ein konzentrierter Anfang ist stärker als langes Zögern.",
    "Fortschritt darf leise sein und trotzdem Bedeutung haben.",
    "Deine Arbeit hat Wert, auch wenn nicht jeder Schritt sichtbar ist.",
    "Löse zuerst das Nächste, nicht alles auf einmal.",
    "Wer sich Zeit zum Denken nimmt, arbeitet später klarer.",
    "Heute kannst du aus Erfahrung eine Stärke machen.",
    "Du bist nicht deine To-do-Liste – achte auch auf deine Energie.",
    "Ein realistisches Ziel ist besser als ein perfekter Vorsatz.",
    "Jeder neue Versuch beginnt mit mehr Erfahrung als der vorherige.",
    "Bleib freundlich zu dir, während du an dir arbeitest.",
    "Ein guter Rhythmus trägt weiter als dauerhafte Höchstleistung.",
    "Deine Entscheidung dranzubleiben ist bereits ein Erfolg.",
    "Wenn du Prioritäten setzt, wird aus Zeit echte Wirkung.",
    "Der nächste kleine Schritt ist oft die beste Antwort.",
    "Du darfst neu anfangen, ohne wieder bei null zu sein.",
    "Aus Fehlern werden Wegweiser, wenn du aus ihnen lernst.",
    "Heute kannst du zeigen, was in deiner Ruhe steckt.",
    "Verlässlichkeit ist eine stille Form von Stärke.",
    "Manchmal ist weniger gleichzeitig zu tun der schnellste Weg.",
    "Dein Fortschritt muss niemandem außer dir gerecht werden.",
    "Ein klarer Abschluss ist genauso wertvoll wie ein guter Anfang.",
    "Du kannst nicht jeden Tag kontrollieren, aber deinen nächsten Schritt.",
    "Leistung beginnt mit Energie – gehe achtsam mit ihr um.",
    "Heute ist ein guter Tag, um eine Sache wirklich gut zu machen.",
    "Geduld bedeutet nicht warten, sondern sinnvoll weiterarbeiten.",
    "Aus einem entschlossenen Anfang kann ein starker Tag entstehen.",
    "Deine Fähigkeiten wachsen mit jeder Herausforderung.",
    "Ein Moment der Klarheit kann Stunden der Unruhe sparen.",
    "Du musst nicht schneller sein – nur konsequent bleiben.",
    "Erkenne deinen Fortschritt, bevor du das nächste Ziel setzt.",
    "Gute Gewohnheiten tragen dich auch durch schwierige Tage.",
    "Wenn etwas wichtig ist, verdient es deine ungeteilte Aufmerksamkeit.",
    "Heute darf Arbeit auch leicht von der Hand gehen.",
    "Dein Beitrag zählt, selbst wenn er im Hintergrund entsteht.",
    "Eine bewusste Pause kann der produktivste Teil des Tages sein.",
    "Vergleiche dich mit deinem gestrigen Stand, nicht mit fremden Wegen.",
    "Du kannst den Tag nicht verlängern, aber sinnvoll gestalten.",
    "Aus Klarheit entsteht Ruhe, aus Ruhe entsteht gute Arbeit.",
    "Jeder Tag bietet eine neue Chance für eine gute Entscheidung.",
    "Bleib deinem Ziel treu und deinem Weg gegenüber flexibel.",
    "Ein erledigter kleiner Schritt ist mehr wert als ein perfekter Plan.",
    "Heute kannst du beweisen, dass Beständigkeit wirkt.",
    "Deine Zeit ist begrenzt – deine Möglichkeiten sind es nicht.",
    "Gib dem Wesentlichen zuerst deine beste Energie.",
    "Du darfst zufrieden sein und trotzdem weiter wachsen.",
    "Ein sinnvoller Arbeitstag braucht auch einen klaren Feierabend.",
    "Was heute schwierig ist, kann morgen schon Erfahrung sein."
  ];
  const quoteEpochDay = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
  const dailyQuote = document.getElementById("dailyQuote");
  if (dailyQuote) dailyQuote.textContent = dailyMotivations[quoteEpochDay % dailyMotivations.length];

  document.body.insertAdjacentHTML("afterbegin", '<div class="integration-ribbon"><strong>TIMEFLOW TEST-BUILD</strong><span>Konzeptversion · Original-Build 0040 bleibt unverändert</span></div>');
  document.body.insertAdjacentHTML("beforeend", `
    <nav class="quick-access-nav" aria-label="Hauptnavigation der Konzeptvorschau">
      <button class="active" type="button" data-quick-target="home"><i class="fa-solid fa-house"></i><span>Home</span></button>
      <button type="button" data-quick-target="schedule"><i class="fa-regular fa-calendar"></i><span>Dienstpläne</span></button>
      <button class="quick-access-main" type="button" data-open-quick-access><i class="fa-solid fa-plus"></i><span>Schnellzugriff</span></button>
      <button type="button" data-quick-target="profile"><i class="fa-regular fa-user"></i><span>Profil</span></button>
    </nav>
    <dialog class="operations-modal" id="quickAccessModal">
      <header><div><small>SCHNELLZUGRIFF</small><h2>Was möchtest du öffnen?</h2><p>Stempeln bleibt bewusst auf dem Home-Screen.</p></div><button type="button" data-close-quick-access aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
      <section class="quick-access-menu">
        <button type="button" data-quick-action="chat"><i class="fa-regular fa-comments"></i><span><small>TEAM & DIREKTNACHRICHTEN</small><strong>Chat öffnen</strong></span><em>›</em></button>
        <button type="button" data-quick-action="inbox"><i class="fa-regular fa-bell"></i><span><small>DIENSTPLAN, ZEITEN & DOKUMENTE</small><strong>Mitteilungen</strong></span><em>›</em></button>
        <button type="button" data-quick-action="documents"><i class="fa-regular fa-file-lines"></i><span><small>NUR IM TEAMMODUS</small><strong>Dokumente</strong></span><em>›</em></button>
        <button type="button" data-quick-action="availability"><i class="fa-regular fa-heart"></i><span><small>PLANUNGSHILFE</small><strong>Wunschzeiten</strong></span><em>›</em></button>
      </section>
    </dialog>`);
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;
  const clockButton = document.getElementById("clockButton");
  if (clockButton) {
    clockButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.dispatchEvent(new CustomEvent("timeflow:toggle-clock"));
    }, true);
    clockButton.insertAdjacentHTML("afterend", `
      <section class="home-clock-details" aria-label="Arbeitszeitdetails für heute">
        <div class="home-clock-head"><div><small>HEUTE IM ÜBERBLICK · ZEITERFASSUNG</small><strong>Deine heutige Schicht</strong></div><span id="homeClockState">Bereit</span></div>
        <div class="home-clock-timeline"><span><small>BEGONNEN</small><strong id="homeClockStart">--:--</strong></span><span><small>PAUSE</small><strong id="homeClockBreak">30 Min.</strong></span><span><small>GEPLANT BIS</small><strong>15:00</strong></span></div>
        <div class="home-clock-summary"><span><i class="fa-solid fa-hourglass-half"></i><div><small>NETTOZEIT</small><b id="homeClockNet">0 h 0 min</b></div></span><span><i class="fa-solid fa-mug-hot"></i><div><small>PAUSE</small><b id="homeClockBreakSummary">0 min</b></div></span><span><i class="fa-solid fa-bullseye"></i><div><small>TAGESZIEL</small><b id="homeClockTarget">8 h 0 min</b></div></span></div>
      </section>`);
  }
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const formatMinutes = (minutes) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  function renderHomeClockDetails() {
    let workday = null; let settings = null;
    try { workday = JSON.parse(window.TimeFlowPlatform.storage.getItem("timeflow-workday-v2")); } catch { /* Demo-Fallback */ }
    try { settings = JSON.parse(window.TimeFlowPlatform.storage.getItem("timeflow-settings-v1")); } catch { /* Demo-Fallback */ }
    const targetMinutes = number(settings?.dailyTargetMinutes, 480);
    const breakAfter = number(settings?.autoBreakAfterMinutes, 360);
    const breakMinutes = number(settings?.autoBreakMinutes, 30);
    const start = workday?.workStart ? new Date(workday.workStart) : null;
    const end = workday?.isWorking ? new Date() : workday?.workEnd ? new Date(workday.workEnd) : null;
    const gross = start && end ? Math.max(0, Math.floor((end - start) / 60000)) : 0;
    const appliedBreak = gross >= breakAfter ? breakMinutes : 0;
    const net = Math.max(0, gross - appliedBreak);
    document.getElementById("homeClockStart").textContent = start ? start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    document.getElementById("homeClockBreak").textContent = `${breakMinutes} Min.`;
    document.getElementById("homeClockNet").textContent = formatMinutes(net);
    document.getElementById("homeClockBreakSummary").textContent = `${appliedBreak} min`;
    document.getElementById("homeClockTarget").textContent = formatMinutes(targetMinutes);
    const state = document.getElementById("homeClockState");
    state.textContent = workday?.isWorking ? "Im Dienst" : start ? "Dienst beendet" : "Bereit";
  }
  renderHomeClockDetails();
  document.addEventListener("timeflow:workday-updated", renderHomeClockDetails);
  document.addEventListener("timeflow:settings-updated", renderHomeClockDetails);
  window.setInterval(renderHomeClockDetails, 30000);

  // Die beiden Einsatz-Karten gehören zur heutigen Schicht und nicht ans Ende
  // des Dashboards. So bleibt der Ablauf auf Home klar lesbar.
  const clockDetails = dashboard.querySelector(".home-clock-details");
  const shiftGrid = dashboard.querySelector(".shift-grid");
  if (clockDetails && shiftGrid) clockDetails.insertAdjacentElement("afterend", shiftGrid);

  const workflow = document.createElement("section");
  workflow.className = "workflow-concept";
  workflow.innerHTML = `
    <article class="workflow-card">
      <div class="workflow-card-head"><div><small>ZEITEN · TRANSPARENT GETRENNT</small><h2>Arbeitszeitkonto</h2></div><button type="button" data-open-workflow="times">Monatsarchiv</button></div>
      <div class="account-summary"><span><small>BESTÄTIGT</small><strong>95:02 h</strong></span><span><small>IN PRÜFUNG</small><strong>08:15 h</strong></span><span><small>ZEITKONTO</small><strong class="positive">+18:08 h</strong></span></div>
    </article>
    <article class="workflow-card workflow-team-only">
      <div class="workflow-card-head"><div><small>TEAMMODUS · ORGANISATION</small><h2>Planung & Unterlagen</h2></div></div>
      <div class="concept-links"><button type="button" data-open-workflow="documents"><i class="fa-regular fa-file-lines"></i><span><small>1 UNTERSCHRIFT AUSSTEHEND</small><strong>Dokumente</strong></span><em>›</em></button><button type="button" data-open-workflow="availability"><i class="fa-regular fa-heart"></i><span><small>SEPTEMBER</small><strong>Wunschzeiten</strong></span><em>›</em></button></div>
    </article>`;
  (shiftGrid || clockDetails)?.insertAdjacentElement("afterend", workflow);

  // Der Home-Screen bleibt auf Zeit und die nächste Schicht fokussiert.
  // Planung und Unterlagen werden nur über Schnellzugriff geöffnet.
  function applyPrivateHomeMode() {
    let savedMode = null;
    try { savedMode = JSON.parse(window.TimeFlowPlatform.storage.getItem("timeflow-settings-v1") || "{}").appMode; } catch { /* Fallback auf die sichtbare App-Klasse */ }
    const isPrivate = savedMode === "private" || document.documentElement.classList.contains("timeflow-private-mode");
    workflow.classList.toggle("is-private", isPrivate);
    workflow.querySelector(".workflow-team-only")?.remove();
    dashboard.querySelectorAll(".team-card, .approval-card").forEach((card) => card.toggleAttribute("hidden", isPrivate));
    quickAccessModal?.querySelectorAll('[data-quick-action="documents"], [data-quick-action="availability"]')
      .forEach((button) => button.toggleAttribute("hidden", isPrivate));
  }

  // Der bisherige Bereich „Für dich“ wird im Konzept vollständig entfernt:
  // Persönliche Hinweise gehören künftig in das zentrale Postfach.
  const forYou = dashboard.querySelector(".for-you-card");
  forYou?.remove();

  // Team-Neuigkeiten liegen im zentralen Postfach bzw. Chat. Dadurch bleibt
  // Home auch im Teammodus auf Zeit und die nächste Schicht fokussiert.
  dashboard.querySelector(".team-card")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="operations-modal" id="operationsModal">
      <header><div><small>KONZEPT · ZENTRALES POSTFACH</small><h2>Mitteilungen & Aufgaben</h2><p>Dienstplan, Zeiterfassung, Dokumente und Team-News werden getrennt priorisiert.</p></div><button type="button" data-close-operations aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
      <nav class="operations-tabs" aria-label="Mitteilungen filtern"><button class="active" data-operation-filter="all">Alle · 5</button><button data-operation-filter="time">Zeiterfassung · 1</button><button data-operation-filter="schedule">Dienstplan · 2</button><button data-operation-filter="documents">Dokumente · 1</button><button data-operation-filter="company">Unternehmen · 1</button></nav>
      <section class="operations-list">
        <article class="operation-message unread urgent" data-operation-category="time"><i class="fa-solid fa-rotate"></i><div><small>HEUTE · 16:42</small><strong>Automatische Ausstempelung prüfen</strong><p>Die Schicht vom 28. August wurde um 20:02 Uhr automatisch beendet. Bitte bestätige die tatsächliche Endzeit.</p></div><em>Aktion nötig</em></article>
        <article class="operation-message unread" data-operation-category="schedule"><i class="fa-regular fa-calendar"></i><div><small>HEUTE · 09:34</small><strong>Neue Einsätze veröffentlicht</strong><p>Fünf neue Einsätze für den Zeitraum 31. August bis 4. September sind verfügbar.</p></div><em>Neu</em></article>
        <article class="operation-message unread" data-operation-category="documents"><i class="fa-regular fa-file-lines"></i><div><small>GESTERN · 14:10</small><strong>Arbeitszeitnachweis August bereit</strong><p>Der Nachweis kann geprüft und anschließend bestätigt werden.</p></div><em>Unterschrift</em></article>
        <article class="operation-message" data-operation-category="schedule"><i class="fa-solid fa-minus"></i><div><small>27. AUGUST · 07:51</small><strong>Einsatz wurde entfernt</strong><p>Die Frühschicht am 31. August wurde aus deinem Dienstplan entfernt.</p></div><em>Gelesen</em></article>
        <article class="operation-message" data-operation-category="company"><i class="fa-solid fa-sparkles"></i><div><small>26. AUGUST · 12:20</small><strong>Sommerfest 2026</strong><p>Das Team-Event findet am 4. September um 18:30 Uhr statt.</p></div><em>Gelesen</em></article>
      </section>
    </dialog>`);
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="operations-modal" id="workflowModal">
      <header><div><small id="workflowEyebrow">KONZEPT</small><h2 id="workflowTitle">Details</h2><p id="workflowCopy"></p></div><button type="button" data-close-workflow aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
      <section id="workflowContent"></section>
    </dialog>`);
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="operations-modal" id="operationDetailModal">
      <header><div><small id="operationDetailEyebrow">KONTEXT</small><h2 id="operationDetailTitle">Details</h2><p id="operationDetailCopy"></p></div><button type="button" data-close-operation-detail aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
      <section class="operations-list" id="operationDetailContent"></section>
    </dialog>`);
  const modal = document.getElementById("operationsModal");
  const open = () => window.TimeFlowPlatform?.dialog?.open(modal) || modal.showModal();
  document.querySelector('[data-action="notifications"]')?.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); open(); }, true);
  const quickAccessModal = document.getElementById("quickAccessModal");
  applyPrivateHomeMode();
  document.addEventListener("timeflow:mode-changed", applyPrivateHomeMode);
  new MutationObserver(applyPrivateHomeMode).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(applyPrivateHomeMode).observe(document.body, { attributes: true, attributeFilter: ["data-app-mode"] });
  document.querySelector("[data-open-quick-access]").addEventListener("click", () => window.TimeFlowPlatform?.dialog?.open(quickAccessModal) || quickAccessModal.showModal());
  quickAccessModal.querySelector("[data-close-quick-access]").addEventListener("click", () => quickAccessModal.close());
  quickAccessModal.addEventListener("click", (event) => { if (event.target === quickAccessModal) quickAccessModal.close(); });
  document.querySelectorAll("[data-quick-target]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-quick-target]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector(`.bottom-nav [data-target="${button.dataset.quickTarget}"]`)?.click();
  }));
  modal.querySelector("[data-close-operations]").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
  modal.querySelectorAll("[data-operation-filter]").forEach((button) => button.addEventListener("click", () => {
    modal.querySelectorAll("[data-operation-filter]").forEach((tab) => tab.classList.toggle("active", tab === button));
    modal.querySelectorAll("[data-operation-category]").forEach((entry) => { entry.hidden = button.dataset.operationFilter !== "all" && entry.dataset.operationCategory !== button.dataset.operationFilter; });
  }));

  const detailModal = document.getElementById("operationDetailModal");
  const details = {
    time: {
      eyebrow: "ZEITERFASSUNG · AKTION NÖTIG", title: "Ausstempelung prüfen", copy: "Diese Buchung braucht deine Bestätigung, bevor sie in die Arbeitszeit übernommen wird.",
      content: '<article class="operation-message urgent"><i class="fa-solid fa-rotate"></i><div><small>FREITAG · 28. AUGUST · 20:02</small><strong>Automatisch ausgestempelt</strong><p>Deine Schicht wurde nach der hinterlegten Regel beendet. Im echten Ausbau würdest du hier die tatsächliche Endzeit bestätigen oder eine Korrektur anfragen.</p></div><em>Prüfung</em></article><article class="operation-message"><i class="fa-regular fa-clock"></i><div><small>FOLGEAKTION</small><strong>Arbeitszeitkonto bleibt vorläufig</strong><p>Bis zur Bestätigung wird diese Buchung getrennt als „In Prüfung“ geführt.</p></div><em>Vorgemerkt</em></article>'
    },
    schedule: {
      eyebrow: "DIENSTPLAN · NEU", title: "Neue Einsätze", copy: "Die folgenden Änderungen wurden für dich veröffentlicht.",
      content: '<article class="operation-message unread"><i class="fa-regular fa-calendar"></i><div><small>DIENSTAG · 01. SEPTEMBER</small><strong>Frühschicht · 07:30 – 15:00</strong><p>Restaurant · 30 Minuten Pause · 7:00 Stunden geplant</p></div><em>Neu</em></article><article class="operation-message unread"><i class="fa-regular fa-calendar"></i><div><small>MITTWOCH · 02. SEPTEMBER</small><strong>Frühschicht · 07:30 – 15:00</strong><p>Restaurant · 30 Minuten Pause · 7:00 Stunden geplant</p></div><em>Neu</em></article><article class="operation-message"><i class="fa-solid fa-list-check"></i><div><small>NÄCHSTER SCHRITT</small><strong>Vollständigen Dienstplan öffnen</strong><p>Im produktiven Ausbau führt diese Aktion direkt zur Wochenansicht.</p></div><em>Vorschau</em></article>'
    },
    documents: {
      eyebrow: "DOKUMENT · UNTERSCHRIFT", title: "Arbeitszeitnachweis August", copy: "Ein Dokument wartet auf deine Prüfung und Bestätigung.",
      content: '<article class="operation-message unread"><i class="fa-regular fa-file-lines"></i><div><small>ARBEITSZEITNACHWEIS · AUGUST 2026</small><strong>Bereit zur Prüfung</strong><p>Bereitgestellt am 30.08.2026 · Im echten Ausbau würde sich hier die sichere Dokumentvorschau öffnen.</p></div><em>Unterschrift bis 03.09.</em></article><article class="operation-message"><i class="fa-solid fa-shield-halved"></i><div><small>DATENSCHUTZ</small><strong>Dokumente nur im Teammodus</strong><p>Der private Modus blendet diesen Bereich vollständig aus.</p></div><em>Geschützt</em></article>'
    }
  };
  document.querySelectorAll("[data-open-operation-detail]").forEach((button) => button.addEventListener("click", () => {
    const detail = details[button.dataset.openOperationDetail];
    if (!detail) return;
    document.getElementById("operationDetailEyebrow").textContent = detail.eyebrow;
    document.getElementById("operationDetailTitle").textContent = detail.title;
    document.getElementById("operationDetailCopy").textContent = detail.copy;
    document.getElementById("operationDetailContent").innerHTML = detail.content;
    window.TimeFlowPlatform?.dialog?.open(detailModal) || detailModal.showModal();
  }));
  detailModal.querySelector("[data-close-operation-detail]").addEventListener("click", () => detailModal.close());
  detailModal.addEventListener("click", (event) => { if (event.target === detailModal) detailModal.close(); });

  const workflowModal = document.getElementById("workflowModal");
  const workflows = {
    times: {
      eyebrow: "ZEITEN · MONATSARCHIV", title: "Arbeitszeitkonto", copy: "Bestätigte und vorläufige Arbeitszeit bleiben nachvollziehbar getrennt.",
      content: '<section class="workflow-detail-grid"><article><small>BESTÄTIGT · AUGUST</small><strong>95:02 h</strong><p>Für das Zeitkonto berücksichtigt</p></article><article class="pending"><small>NOCH IN PRÜFUNG</small><strong>08:15 h</strong><p>Zwei Buchungen offen</p></article><article class="positive"><small>STAND · 30.08.</small><strong>+18:08 h</strong><p>Arbeitszeitkonto</p></article></section><section class="workflow-list"><button type="button"><span><small>AUGUST 2026</small><strong>13 Arbeitstage · 2 Buchungen in Prüfung</strong></span><strong>103:17 h</strong><em>›</em></button><button type="button"><span><small>JULI 2026</small><strong>15 Arbeitstage · abgeschlossen</strong></span><strong>101:34 h</strong><em>›</em></button><button type="button"><span><small>JUNI 2026</small><strong>22 Arbeitstage · abgeschlossen</strong></span><strong>170:53 h</strong><em>›</em></button></section>'
    },
    documents: {
      eyebrow: "DOKUMENTE · TEAMMODUS", title: "Dokumente & Nachweise", copy: "Unterlagen sind mit klaren Status, Fristen und sicheren Folgeaktionen organisiert.",
      content: '<section class="workflow-list"><button type="button"><span><small>ARBEITSZEITNACHWEIS · AUGUST 2026</small><strong>Bereit zur Prüfung und Unterschrift</strong></span><strong>03.09.</strong><em>›</em></button><button type="button"><span><small>LOHNABRECHNUNG · JULI 2026</small><strong>Gelesen und sicher archiviert</strong></span><strong>PDF</strong><em>›</em></button><button type="button"><span><small>HYGIENE-UNTERWEISUNG</small><strong>Neue Version zum Lesen bereit</strong></span><strong>Neu</strong><em>›</em></button></section>'
    },
    availability: {
      eyebrow: "WUNSCHZEITEN · PLANUNGSHILFE", title: "Verfügbarkeit im September", copy: "Wunschzeiten helfen bei der Dienstplanung. Verbindlich wird ein Einsatz erst mit der Freigabe im Dienstplan.",
      content: '<section class="availability-days"><span>Mo<small>Flexibel</small></span><span>Di<small>Ab 07:00</small></span><span>Mi<small>Bis 16:00</small></span><span>Do<small>Frei</small></span><span>Fr<small>Flexibel</small></span></section><section class="workflow-list"><button type="button"><span><small>WUNSCH</small><strong>Donnerstag als freier Tag hinterlegt</strong></span><strong>Aktiv</strong><em>›</em></button><button type="button"><span><small>HINWEIS</small><strong>Diese Angaben sind noch keine genehmigten Abwesenheiten.</strong></span><strong>Info</strong><em>›</em></button></section>'
    }
  };
  quickAccessModal.querySelectorAll("[data-quick-action]").forEach((button) => button.addEventListener("click", () => {
    quickAccessModal.close();
    const action = button.dataset.quickAction;
    if (action === "chat") document.querySelector('.bottom-nav [data-target="chat"]')?.click();
    if (action === "inbox") open();
    if (action === "documents" || action === "availability") {
      const workflow = workflows[action];
      document.getElementById("workflowEyebrow").textContent = workflow.eyebrow;
      document.getElementById("workflowTitle").textContent = workflow.title;
      document.getElementById("workflowCopy").textContent = workflow.copy;
      document.getElementById("workflowContent").innerHTML = workflow.content;
      window.TimeFlowPlatform?.dialog?.open(workflowModal) || workflowModal.showModal();
    }
  }));
  document.querySelectorAll("[data-open-workflow]").forEach((button) => button.addEventListener("click", () => {
    const workflow = workflows[button.dataset.openWorkflow];
    if (!workflow) return;
    document.getElementById("workflowEyebrow").textContent = workflow.eyebrow;
    document.getElementById("workflowTitle").textContent = workflow.title;
    document.getElementById("workflowCopy").textContent = workflow.copy;
    document.getElementById("workflowContent").innerHTML = workflow.content;
    window.TimeFlowPlatform?.dialog?.open(workflowModal) || workflowModal.showModal();
  }));
  workflowModal.querySelector("[data-close-workflow]").addEventListener("click", () => workflowModal.close());
  workflowModal.addEventListener("click", (event) => { if (event.target === workflowModal) workflowModal.close(); });
});
