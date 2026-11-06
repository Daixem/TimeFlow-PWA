"use strict";
document.addEventListener("DOMContentLoaded", async () => {
  const account = document.getElementById("setupAccount");
  const form = document.getElementById("setupForm");
  const message = document.getElementById("setupMessage");
  try {
    const [sessionResponse, accessResponse] = await Promise.all([
      fetch("/api/session", { cache: "no-store" }),
      fetch("/api/beta/access", { cache: "no-store" })
    ]);
    const session = await sessionResponse.json();
    const access = await accessResponse.json();
    if (session.authenticated && session.authProvider === "hourrise") {
      account.textContent = "Dein HourRise-Konto ist eingerichtet. Die Anmeldung erfolgt jetzt mit E-Mail und Passwort.";
      return;
    }
    if (!session.authenticated || !access.admin || session.authProvider !== "cloudflare-access") {
      account.textContent = "Bitte melde dich zuerst mit deinem bestätigten Administratorkonto an.";
      return;
    }
    account.textContent = `Angemeldet als ${session.user.email}`;
    form.hidden = false;
  } catch {
    account.textContent = "Das Konto konnte gerade nicht geprüft werden. Bitte versuche es später erneut.";
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.getElementById("password").value;
    if (password !== document.getElementById("repeat").value) { message.textContent = "Die Passwörter stimmen nicht überein."; return; }
    if ([...password].length < 12) { message.textContent = "Bitte verwende mindestens zwölf Zeichen."; return; }
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "request_failed");
      form.reset();
      form.hidden = true;
      message.textContent = "Dein Passwort ist eingerichtet. Die Anmeldung per Passwort wird nach der Umstellung des Zugangs freigeschaltet.";
    } catch (error) {
      message.textContent = error.message === "already_registered" ? "Für dieses Konto ist bereits ein Passwort eingerichtet." : "Das Einrichten hat nicht geklappt. Bitte versuche es später erneut.";
    } finally { button.disabled = false; }
  });
});
