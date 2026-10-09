(function () {
  "use strict";
  if (!/\.chatgpt\.site$/i.test(location.hostname)) return;
  document.documentElement.classList.add("beta-access-pending");
  let finishAccessCheck;
  window.TimeFlowBetaAccessReady = new Promise((resolve) => { finishAccessCheck = resolve; });
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options) => {
    const requestUrl = new URL(typeof input === "string" ? input : input.url, location.href);
    if (requestUrl.origin === location.origin && requestUrl.pathname.startsWith("/api/") && !requestUrl.pathname.startsWith("/api/beta/")) {
      return window.TimeFlowBetaAccessReady.then(() => originalFetch(input, options));
    }
    return originalFetch(input, options);
  };
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const request = async (path, options = {}) => { const response = await fetch(new URL(path, document.baseURI), { cache: "no-store", headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) }, ...options }); const result = await response.json().catch(() => ({})); return { response, result }; };
  document.addEventListener("DOMContentLoaded", async () => {
    document.body.insertAdjacentHTML("afterbegin", `<section class="beta-access-gate" id="betaAccessGate" aria-live="polite"><div><span><i class="fa-solid fa-user-shield"></i></span><small>TIMEFLOW EINZEL-BETA</small><h1>Zugang wird geprüft</h1><p>Bitte einen Moment warten.</p><section data-beta-gate-action></section></div></section>`);
    const gate = document.getElementById("betaAccessGate"); const title = gate.querySelector("h1"); const copy = gate.querySelector("p"); const action = gate.querySelector("[data-beta-gate-action]"); const token = new URLSearchParams(location.search).get("invite");
    const unlock = (access) => { gate.remove(); document.documentElement.classList.remove("beta-access-pending"); window.TimeFlowBetaAccess = access; finishAccessCheck(access); document.dispatchEvent(new CustomEvent("timeflow:beta-access-ready", { detail: access })); if (access.allowed) installTeamInvite(); if (access.admin) installAdmin(); };
    async function installAdmin() {
      const settings = document.querySelector("#settingsPage .settings-layout"); if (!settings || document.querySelector(".beta-invite-admin")) return window.setTimeout(installAdmin, 300);
      settings.insertAdjacentHTML("afterbegin", `<section class="settings-card beta-invite-admin"><header><span class="settings-card-icon blue"><i class="fa-solid fa-user-plus"></i></span><div><small>Betatest</small><h2>Person einladen</h2></div></header><p class="settings-card-copy">Erstelle pro Person einen einmaligen Link. Nach der Anmeldung wird er fest an ihr Konto gebunden.</p><form><label>Name oder Bezeichnung<input name="label" maxlength="80" required placeholder="z. B. iPhone-Test"></label><label>Gültigkeit<select name="days"><option value="3">3 Tage</option><option value="7" selected>7 Tage</option><option value="14">14 Tage</option><option value="30">30 Tage</option></select></label><button type="submit"><i class="fa-solid fa-link"></i> Einladungslink erstellen</button></form><div data-beta-invite-result hidden><input readonly><button type="button" data-copy-invite>Link kopieren</button><button type="button" data-share-invite>Teilen</button></div></section>`);
      const card = document.querySelector(".beta-invite-admin"); const form = card.querySelector("form"); const resultBox = card.querySelector("[data-beta-invite-result]");
      form.addEventListener("submit", async (event) => { event.preventDefault(); const { response, result } = await request("api/beta/invites", { method: "POST", body: JSON.stringify({ label: form.elements.label.value, expiresDays: Number(form.elements.days.value) }) }); if (!response.ok) return; resultBox.hidden = false; resultBox.querySelector("input").value = result.invitation.url; });
      card.querySelector("[data-copy-invite]").addEventListener("click", () => navigator.clipboard.writeText(resultBox.querySelector("input").value));
      card.querySelector("[data-share-invite]").addEventListener("click", async () => { const url = resultBox.querySelector("input").value; if (navigator.share) await navigator.share({ title: "TimeFlow Beta-Einladung", text: "Hier ist dein persönlicher TimeFlow-Beta-Link. Der Link ist nur einmal nutzbar.", url }); else await navigator.clipboard.writeText(url); });
    }
    async function installTeamInvite() {
      const settings = document.querySelector("#settingsPage .settings-layout"); if (!settings || document.querySelector(".team-invite-admin")) return window.setTimeout(installTeamInvite, 300);
      settings.insertAdjacentHTML("afterbegin", `<section class="settings-card team-invite-admin"><header><span class="settings-card-icon mint"><i class="fa-solid fa-people-group"></i></span><div><small>TEAM EINLADUNGEN</small><h2>Eigenes Team erstellen</h2></div></header><p class="settings-card-copy">Person zum Team einladen: ein kleines Team für Familie, Projekte oder Selbstständigkeit – ohne Unternehmen.</p><ol class="team-invite-steps"><li><b>1</b><span>Team benennen</span></li><li><b>2</b><span>E-Mail eintragen</span></li><li><b>3</b><span>Einladung teilen</span></li></ol><form><label>Teamname<input name="teamName" maxlength="80" required placeholder="z. B. Projektteam"></label><label>E-Mail-Adresse<input name="email" type="email" maxlength="254" required placeholder="name@beispiel.de"></label><button type="submit"><i class="fa-solid fa-user-plus"></i> Zum Team einladen</button></form><div data-team-invite-result hidden><p></p><button type="button" data-share-team-invite>Einladung teilen</button></div></section>`);
      const teamCard = document.querySelector(".team-invite-admin"); const teamForm = teamCard.querySelector("form"); const teamResult = teamCard.querySelector("[data-team-invite-result]");
      teamForm.addEventListener("submit", async (event) => { event.preventDefault(); const { response, result } = await request("api/team-invites", { method: "POST", body: JSON.stringify({ teamName: teamForm.elements.teamName.value, email: teamForm.elements.email.value }) }); if (!response.ok) { teamResult.hidden = false; teamResult.querySelector("p").textContent = result.error === "invitation_already_pending" ? "Für diese E-Mail-Adresse liegt bereits eine Einladung vor." : "Die Einladung konnte nicht erstellt werden."; return; } teamResult.hidden = false; teamResult.querySelector("p").textContent = `${result.invitation.email} ist zu deinem Team eingeladen. Teile jetzt den TimeFlow-Link mit dieser Person.`; teamResult.dataset.url = result.invitation.url; if (result.membership) document.dispatchEvent(new CustomEvent("timeflow:team-access", { detail: { allowed: true, membership: result.membership } })); });
      teamCard.querySelector("[data-share-team-invite]").addEventListener("click", async () => { const url = teamResult.dataset.url; if (!url) return; const text = "Du wurdest zu meinem TimeFlow-Team eingeladen. Öffne TimeFlow und melde dich mit der eingeladenen E-Mail-Adresse an."; if (navigator.share) await navigator.share({ title: "TimeFlow Team-Einladung", text, url }); else await navigator.clipboard.writeText(`${text} ${url}`); });
    }
    const access = await request("api/beta/access");
    if (access.response.ok && access.result.allowed) { unlock(access.result); return; }
    if (access.response.status === 401) { finishAccessCheck({ allowed: false }); title.textContent = "Anmelden, um fortzufahren"; copy.textContent = token ? "Dieser persönliche Einladungslink wird nach der Anmeldung an dein Konto gebunden." : "Für TimeFlow benötigst du einen persönlichen Einladungslink."; const returnTo = `${location.pathname}${location.search}`; action.innerHTML = `<a href="/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}" target="_top"><i class="fa-solid fa-right-to-bracket"></i> Sicher anmelden</a>`; return; }
    if (token) {
      const invitation = await request(`api/beta/invite?token=${encodeURIComponent(token)}`);
      if (invitation.response.ok && invitation.result.valid) {
        const label = escapeHtml(invitation.result.invitation.label);
        let claiming = false;
        const claimInvitation = async () => {
          if (claiming) return;
          claiming = true;
          title.textContent = "Einladung wird aktiviert";
          copy.innerHTML = `Die Einladung <strong>${label}</strong> wird jetzt sicher mit deinem Konto verbunden.`;
          action.innerHTML = `<span class="beta-claim-progress" role="status"><i class="fa-solid fa-spinner fa-spin"></i> Zugang wird eingerichtet …</span>`;
          try {
            const claimed = await request(`api/beta/invite?token=${encodeURIComponent(token)}`, { method: "POST", body: "{}" });
            if (!claimed.response.ok) throw new Error(claimed.result.error || `HTTP ${claimed.response.status}`);
            history.replaceState({}, "", location.pathname);
            location.reload();
          } catch (error) {
            claiming = false;
            title.textContent = "Verbindung nicht abgeschlossen";
            copy.textContent = "Die Einladung konnte noch nicht übernommen werden. Bitte prüfe die Internetverbindung und versuche es erneut.";
            action.innerHTML = `<button type="button" data-claim-beta><i class="fa-solid fa-rotate-right"></i> Erneut versuchen</button><small class="beta-claim-error">${escapeHtml(error.message)}</small>`;
            action.querySelector("button").addEventListener("click", claimInvitation, { once: true });
          }
        };
        await claimInvitation();
        return;
      }
    }
    finishAccessCheck({ allowed: false });
    title.textContent = "Kein Beta-Zugang"; copy.textContent = "Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen persönlichen Link an.";
  });
}());
