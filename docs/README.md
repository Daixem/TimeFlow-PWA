# TimeFlow Connect / TimeFlow PWA

TimeFlow ist eine mobile Zeiterfassungs- und Dienstplan-App. Der Stand enthält
private Zeiterfassung und Dienstpläne, persönliche Einstellungen, lokale
Sicherungen, Kontosynchronisierung und – im geschützten Connect-Angebot –
Teamfunktionen. GitHub Pages ist die öffentliche, lokale PWA-Vorschau; sie hat
keinen Zugriff auf Konten, Teamdaten oder die geschützte API.

## Lokal in VS Code testen

1. Den Ordner `TimeFlow` in VS Code öffnen.
2. Node.js 18 oder neuer installieren, falls noch nicht vorhanden.
3. Im Terminal `npm run dev` ausführen.
4. `http://127.0.0.1:4173` im Browser öffnen.

Alternativ kann über **Terminal → Aufgabe ausführen** die Aufgabe
`TimeFlow: PWA starten` gewählt werden. Es sind keine Pakete und kein
`npm install` erforderlich.

Mit `npm test` werden Client, API, Berechtigungen, Synchronisierung,
Sicherheitsregeln, Import, Offline-Cache und Produktionsbuild automatisch
geprüft. Die Tests ersetzen keine Prüfung auf echten iOS- und Android-Geräten
oder mit realen Dienstplanbildern.

Die Sicherheits-, Backup- und Wiederherstellungsstrategie steht in
[Sicherheit-und-Backup.md](Sicherheit-und-Backup.md).

## Als App installieren

Auf `localhost` oder nach einer Bereitstellung über HTTPS kann TimeFlow in
aktuellen Chromium-Browsern über das Installationssymbol in der Adressleiste
installiert werden. Nach dem ersten vollständigen Laden steht die Oberfläche
auch offline zur Verfügung. Die private Zeiterfassung kann lokale Buchungen
zwischenpuffern; Wiederverbindung und serverseitige Bestätigung sind für die
Cloud-Speicherung weiterhin erforderlich.

## Enthaltene Funktionen

- Responsives Dashboard nach der mobilen Designreferenz
- Ein- und Ausstempeln mit Tagesfortschritt
- Zeiterfassung mit lokaler Offline-Warteschlange und Serverabgleich, wenn der
  geschützte Arbeitszeitdienst für das Konto freigeschaltet ist
- Dienstpläne für Tag, Woche, Monat und Zeitraum
- Dienstplanimport aus Bildern und PDFs mit Korrektur vor dem Speichern
- Kontogebundenes Lernen von erkannten Dienstplan-Kürzeln und Schichtmustern
- Konfliktanzeige beim Synchronisieren; Nutzer können den Serverstand wählen
  oder eigene Änderungen auf den aktuellen Stand anwenden
- Installierbares Web-App-Manifest
- Service Worker mit App-Shell-Cache
- VS-Code-Aufgaben zum Starten und Prüfen

## Bereitstellung und Synchronisierung

Die geschützte Connect-Version synchronisiert freigegebene Profil- und
Einstellungsdaten kontobezogen. Teamchat und Push-Versand sind im Worker
implementiert; externe Push-Zustellung funktioniert aber erst mit gültigen
VAPID-Einstellungen und muss auf einem realen Gerät bestätigt werden. Lokale
Browserhinweise belegen keine externe Zustellung. Details stehen in
[Push-Benachrichtigungen.md](Push-Benachrichtigungen.md).

Der Dienstplanimport und das Lernen wiederkehrender Zeiten werden automatisiert
mit Testdaten geprüft. Eine belastbare Erkennungsquote mit realen
Dienstplan-Screenshots ist nicht nachgewiesen. Erkannte Einträge müssen vor
Übernahme kontrolliert und können bearbeitet werden. Die App ist daher nicht
als vollständig fehlerfrei oder unabhängig zertifiziert zu verstehen.
