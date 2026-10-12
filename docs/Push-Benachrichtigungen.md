# Push-Benachrichtigungen

Der Service Worker kann Web-Push empfangen. Ein Gerät kann nach Zustimmung über die geschützte API registriert und pro Konto in D1 gespeichert werden. Der Worker enthält außerdem den Versandweg für Teamchat-Nachrichten und einen Test-Endpunkt.

Für eine echte Zustellung bei geschlossener App muss die Zielumgebung vollständig konfiguriert und die Zustellung auf einem realen Gerät geprüft sein:

1. VAPID-Schlüssel erzeugen.
2. Den öffentlichen Schlüssel als `TIMEFLOW_VAPID_PUBLIC_KEY` hinterlegen.
3. Den privaten Schlüssel ausschließlich als Wrangler-Secret hinterlegen.
4. Für weitere Ereignisse (Dienstplan, Arbeitszeit und Freigaben) den passenden Auslöser ergänzen. Der vorhandene Versandweg löst derzeit nur beim Teamchat aus.

Fehlt eine dieser Einstellungen, meldet der Server-Test `push_not_configured`; eine lokale Gerätebenachrichtigung ist kein Nachweis für externen Versand. Auch eine erfolgreiche Serverantwort ist erst dann ein Zustellnachweis, wenn die Nachricht tatsächlich auf dem Zielgerät angekommen ist. Die Funktion bleibt über Geräte- und Benachrichtigungseinstellungen abschaltbar.
