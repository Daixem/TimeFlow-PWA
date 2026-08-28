# TimeFlow PWA

Eine lokal testbare Progressive Web App für Zeiterfassung und Dienstpläne,
zusammengeführt aus den bereitgestellten TimeFlow-Ständen.

## Online-Vorschau

Die jeweils zuletzt veröffentlichte Sprint-Version ist unter
[daixem.github.io/TimeFlow-PWA](https://daixem.github.io/TimeFlow-PWA/)
erreichbar. Änderungen auf `main` und neuen `codex/sprint-*`-Branches werden
automatisch über GitHub Pages veröffentlicht.

## In VS Code starten

1. Diesen Ordner in VS Code öffnen.
2. Im Terminal `npm run dev` ausführen.
3. Im Browser `http://127.0.0.1:4173` öffnen.

Alternativ: **Terminal → Aufgabe ausführen → TimeFlow: PWA starten**.

Es ist kein `npm install` nötig. Vorausgesetzt wird lediglich Node.js 18 oder
neuer.

## Prüfen

```text
npm run check
```

Der Check kontrolliert die benötigten App-Dateien, das Web-App-Manifest und
den Offline-App-Cache.

Weitere Hinweise stehen in [docs/README.md](docs/README.md).

## Sprint 3

Der aktuelle Entwicklungszweig ergänzt einen eigenen Chat-Bereich mit
Gesprächsliste, Suche, Filtern und lokal versendbaren Demo-Nachrichten. Das
Messenger-Konzept verbindet vertraute Chat-Bedienung mit Schichtkarten,
Bestätigungen, Tauschanfragen und schnellen Verspätungsmeldungen.
Chatnachrichten werden vorerst nur auf dem jeweiligen Gerät gespeichert; die
Server-Synchronisierung folgt später. Die persönliche Statistik wurde mit
Sprint 4 innerhalb des Profils umgesetzt.

## Sprint 4

Sprint 4 ergänzt eine vollständige Profilseite mit persönlichen Daten,
Arbeitszeitkonto sowie Wochen-, Monats- und Jahresstatistiken. Diagramme,
Zielerreichung und die Verknüpfung zum Dienstplan sind direkt bedienbar.
Profiländerungen und Einstellungen werden in der Alpha-Version lokal auf dem
Gerät gespeichert. Home dient ausschließlich als Übersicht; der zentrale
Menüpunkt „Stempeln“ öffnet eine eigenständige Zeiterfassung mit Live-Zeit,
Schichtverlauf und Ein-/Ausstempel-Aktion.

## Sprint 5

Sprint 5 ergänzt im Profil eine eigene Einstellungsseite. Dort lassen sich
Benachrichtigungswünsche, das tägliche Arbeitsziel, die automatische Pause und
reduzierte Animationen lokal konfigurieren. Arbeitsziel und Pause wirken
sofort auf Home und die Stempelansicht. Zusätzlich zeigt die Seite den
Online- und Offline-Status, prüft PWA-Updates und kann die lokalen
TimeFlow-Daten sichern oder kontrolliert zurücksetzen.

## Sprint 6

Sprint 6 ergänzt das Home-Dashboard um bedienbare Schnellaktionen für Urlaub,
Verspätung, Schichttausch und Krankmeldung. Abgesendete Vorgänge werden mit
Status und Zeitpunkt lokal gespeichert. Teamrelevante Meldungen erscheinen
zusätzlich als eigene Nachricht im Teamchat; der Verlauf lässt sich über Home
oder die Karte mit den offenen Freigaben öffnen.
