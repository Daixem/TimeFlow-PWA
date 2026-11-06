"use strict";
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.hostname !== "hourrise.de") return;
  const gate = document.getElementById("authGate");
  const box = document.getElementById("authDemoUsers");
  if (!gate || !box) return;
  gate.querySelector("header small").textContent = "HourRise";
  gate.querySelector("header strong").textContent = "Deine Zeit. Dein Überblick.";
  gate.querySelector(".auth-intro p").textContent = "Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.";
  box.innerHTML = `
    <form id="hourriseLoginForm" class="hourrise-login-form">
      <label for="hourriseEmail">E-Mail-Adresse</label>
      <input id="hourriseEmail" name="email" type="email" autocomplete="username" required>
      <label for="hourrisePassword">Passwort</label>
      <input id="hourrisePassword" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Anmelden</button>
      <button type="button" id="hourriseForgot">Passwort vergessen?</button>
    </form>
    <form id="hourriseForgotForm" class="hourrise-login-form" hidden>
      <h2>Passwort zurücksetzen</h2>
      <p>Gib deine E-Mail-Adresse ein. Wenn es dafür ein Konto gibt, erhältst du einen einmaligen Code.</p>
      <label for="hourriseRecoveryEmail">E-Mail-Adresse</label>
      <input id="hourriseRecoveryEmail" type="email" autocomplete="username" required>
      <button type="submit">Code anfordern</button>
      <button type="button" class="hourriseBack">Zur Anmeldung</button>
    </form>
    <form id="hourriseResetForm" class="hourrise-login-form" hidden>
      <h2>Neues Passwort</h2>
      <p>Der Code ist zehn Minuten gültig und kann nur einmal verwendet werden.</p>
      <label for="hourriseCode">Code aus der E-Mail</label>
      <input id="hourriseCode" type="text" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" autocomplete="one-time-code" required>
      <label for="hourriseNewPassword">Neues Passwort (mindestens zwölf Zeichen)</label>
      <input id="hourriseNewPassword" type="password" minlength="12" autocomplete="new-password" required>
      <button type="submit">Passwort ändern</button>
      <button type="button" class="hourriseBack">Zur Anmeldung</button>
    </form>
    <p id="hourriseAuthMessage" role="status" aria-live="polite"></p>`;
  gate.querySelector(".auth-security-note small").textContent = "Dein Passwort und deine Daten bleiben geschützt. Neue Konten werden derzeit noch nicht freigeschaltet.";
  const login = document.getElementById("hourriseLoginForm");
  const forgot = document.getElementById("hourriseForgotForm");
  const reset = document.getElementById("hourriseResetForm");
  const message = document.getElementById("hourriseAuthMessage");
  let challengeId = null;
  let recoveryEmail = null;
  const show = target => { for (const form of [login, forgot, reset]) form.hidden = form !== target; message.textContent = ""; target.querySelector("input")?.focus(); };
  const post = async (path, data) => {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(data) });
    return { response, result: await response.json() };
  };
  login.addEventListener("submit", async event => {
    event.preventDefault();
    const button = login.querySelector("button[type=submit]");
    button.disabled = true;
    message.textContent = "Anmeldung wird geprüft …";
    try {
      const { response } = await post("/api/auth/login", { email: login.querySelector("[name=email]").value, password: login.querySelector("[name=password]").value });
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch { message.textContent = "Anmeldung fehlgeschlagen. Prüfe deine Angaben und versuche es erneut."; }
    finally { button.disabled = false; }
  });
  document.getElementById("hourriseForgot").addEventListener("click", () => {
    document.getElementById("hourriseRecoveryEmail").value = login.querySelector("[name=email]").value;
    show(forgot);
  });
  for (const button of gate.querySelectorAll(".hourriseBack")) button.addEventListener("click", () => show(login));
  forgot.addEventListener("submit", async event => {
    event.preventDefault();
    const button = forgot.querySelector("button[type=submit]");
    button.disabled = true;
    recoveryEmail = document.getElementById("hourriseRecoveryEmail").value;
    try {
      const { response, result } = await post("/api/auth/forgot", { email: recoveryEmail });
      if (!response.ok) throw new Error();
      challengeId = result.challengeId;
      show(reset);
      message.textContent = "Falls ein Konto vorhanden ist, wurde ein Code verschickt. Prüfe auch den Spamordner.";
    } catch { message.textContent = "Der Code konnte gerade nicht angefordert werden. Bitte versuche es später erneut."; }
    finally { button.disabled = false; }
  });
  reset.addEventListener("submit", async event => {
    event.preventDefault();
    const button = reset.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const { response } = await post("/api/auth/reset", { email: recoveryEmail, challengeId, code: document.getElementById("hourriseCode").value, password: document.getElementById("hourriseNewPassword").value });
      if (!response.ok) throw new Error();
      reset.reset();
      show(login);
      message.textContent = "Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.";
    } catch { message.textContent = "Code ungültig oder abgelaufen. Bitte fordere bei Bedarf einen neuen Code an."; }
    finally { button.disabled = false; }
  });
});
