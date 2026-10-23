# Push-Benachrichtigungen

Der Service Worker kann Web-Push empfangen. Ein Gerät kann nach Zustimmung über die geschützte API registriert und pro Konto in D1 gespeichert werden. Der Worker versendet externe Push-Mitteilungen für Teamchat-Nachrichten, Änderungen am synchronisierten Dienstplan, Schichterinnerungen 30 Minuten vor Beginn und neue veröffentlichte App-Versionen. Die Kategorien lassen sich in den Benachrichtigungseinstellungen steuern.

Der Minuten-Cron prüft `version.json` der verbindlichen GitHub-Pages-Version. Beim ersten erfolgreichen Check speichert er nur den Ausgangsstand. Bei einem späteren neuen Commit sendet er einmalig „TimeFlow wurde aktualisiert“ an registrierte Geräte, sofern Gerätebenachrichtigungen und Systemhinweise eingeschaltet sind. Der Hinweis bleibt bis zu 24 Stunden beim Push-Dienst abrufbar. Ein geschlossenes Gerät kann die App-Dateien nicht selbst installieren; der Hinweis führt zurück zur PWA, wo der Service Worker die neue Version automatisch lädt.

Für eine echte Zustellung bei geschlossener App muss die Zielumgebung vollständig konfiguriert und die Zustellung auf einem realen Gerät geprüft sein:

1. VAPID-Schlüssel erzeugen.
2. Den öffentlichen Schlüssel als `TIMEFLOW_VAPID_PUBLIC_KEY` hinterlegen.
3. Den privaten Schlüssel ausschließlich als geheime Produktionsvariable hinterlegen.
4. Für Schichterinnerungen ruft ein separater Cron-Worker den geschützten Endpunkt `/api/internal/push-reminders` jede Minute auf. Dafür müssen `TIMEFLOW_PUSH_CRON_TOKEN` in der App und derselbe Wert als Secret im Cron-Worker gesetzt sein. Die aktuelle Zeitzone wird beim Synchronisieren des Dienstplans mitgespeichert; ohne gültige Zeitzone wird kein UTC-Ersatzplan angelegt. Erinnerungen werden pro Schicht nur einmal ausgelöst, mit hoher Zustellpriorität und zehn Minuten Gültigkeit an den Push-Dienst übergeben.

Fehlt eine dieser Einstellungen, meldet der Server-Test `push_not_configured`; eine lokale Gerätebenachrichtigung ist kein Nachweis für externen Versand. Auch eine erfolgreiche Serverantwort ist erst dann ein Zustellnachweis, wenn die Nachricht tatsächlich auf dem Zielgerät angekommen ist. Die Funktion bleibt über Geräte- und Benachrichtigungseinstellungen abschaltbar.

## Schichterinnerung verspätet

- **Gemeldet am:** 19. Oktober 2026
- **Dienstbeginn:** 14:00 Uhr
- **Push auf dem Gerät angekommen:** 15:30 Uhr (90 Minuten zu spät)
- **Befund:** Der Cron-Worker ist auf einen Aufruf pro Minute eingestellt; die protokollierten Aufrufe des geschützten Endpunkts wurden mit HTTP 200 beantwortet. Das belegt den Serveraufruf, aber nicht den Zeitpunkt der Geräteanzeige.
- **Änderung:** Fehlende Zeitzonen werden nicht mehr stillschweigend als UTC verwendet. Diensterinnerungen werden mit hoher Priorität und zehn Minuten Gültigkeit versendet. Der Server protokolliert beim Versand Zeit, gespeicherte Zeitzone und geplanten Beginn.
- **Status:** Serverkorrektur umgesetzt; Geräteankunft muss mit einer kommenden Schicht noch bestätigt werden.

Beim nächsten realen Versand die Serverprotokolle mit der angezeigten Uhrzeit
vergleichen. So lässt sich erkennen, ob die Zeitzone oder die Versandzeit falsch
ist oder ob der Push-Dienst beziehungsweise das Gerät die Meldung verspätet
anzeigt. Die Abnahme gilt erst nach einem realen Test mit einer bekannten
Schichtzeit und nachvollziehbaren Zeitstempeln als bestanden.
