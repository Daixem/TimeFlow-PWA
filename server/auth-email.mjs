// The caller must apply account and network rate limits before sending.
// Do not log the request, API key, recipient, or recovery code.
async function sendCodeEmail({ apiKey, recipient, code, fetchImpl = fetch }, purpose) {
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("Email service unavailable");
  if (typeof recipient !== "string" || recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Invalid recipient");
  if (typeof code !== "string" || !/^\d{8}$/.test(code)) throw new Error("Invalid recovery code");
  const description = purpose === "registration" ? "zum Bestätigen deiner Registrierung" : "zum Zurücksetzen deines Passworts";
  const text = `Dein HourRise-Code ${description}:\n\n${code}\n\nDer Code ist zehn Minuten gültig und kann nur einmal verwendet werden. Wenn du diesen Code nicht angefordert hast, ignoriere diese Nachricht und teile ihn nicht mit anderen.`;
  let response;
  try {
    response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "HourRise <code@hourrise.de>", to: [recipient], subject: "Dein HourRise-Bestätigungscode", text })
    });
  } catch {
    throw new Error("Email service unavailable");
  }
  // A provider's acceptance does not prove delivery. Never expose its error
  // body, which can include private information, to an application client.
  if (!response.ok) throw new Error("Email service unavailable");
  return { accepted: true };
}

export function sendRecoveryEmail(options) {
  return sendCodeEmail(options, "recovery");
}

export function sendVerificationEmail(options) {
  return sendCodeEmail(options, "registration");
}
