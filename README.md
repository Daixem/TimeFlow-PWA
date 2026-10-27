# TimeFlow PWA

Eine lokal testbare Progressive Web App für Zeiterfassung und Dienstpläne,
zusammengeführt aus den bereitgestellten TimeFlow-Ständen.

## Online-Vorschau

Die jeweils zuletzt veröffentlichte Sprint-Version ist unter
[daixem.github.io/TimeFlow-PWA](https://daixem.github.io/TimeFlow-PWA/)
erreichbar. Änderungen auf `main` werden automatisch über GitHub Pages
veröffentlicht. `main` ist die einzige verbindliche Quell- und Release-Version.
Feature- und Cloud-Arbeitsbranches werden erst nach einem Merge nach `main`
veröffentlicht.

### TimeFlow Connect und Beta-Zugang

`timeflow-connect.daixem.chatgpt.site` stellt zusätzlich die Anmeldung,
Einladungen, API und eine verwaltete Datenbank bereit. Die App verlangt dort
weiterhin die Plattform-Anmeldung und eine Beta-Freigabe. Der Sites-Stand ist
derzeit älter als `main`; er wird durch den GitHub-Pages-Workflow nicht
automatisch aktualisiert.

Der Push nach `main` veröffentlicht die statische PWA über GitHub Pages.
Serveränderungen am Sites-Projekt und Cloudflare-Worker benötigen derzeit eine
separate Veröffentlichung. Die Veröffentlichungswege sind noch nicht
zusammengeführt. Den überprüften Stand und die offenen Abweichungen beschreibt
[der aktuelle Gesamtstand](docs/Status-2026-10-27.md).

Jeder Produktions-Build erzeugt `_site/version.json` mit vollem Commit-SHA,
eindeutiger Build-ID und UTC-Buildzeit. Der Build stoppt, wenn `GITHUB_SHA`
nicht dem ausgecheckten Commit entspricht, Platzhalter übrig bleiben oder
referenzierte Dateien fehlen. Gleichzeitige Pages-Läufe verwenden eine
gemeinsame Concurrency-Gruppe; ein neuerer `main`-Lauf ersetzt einen älteren.

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

## Benachrichtigungen

Die Glocke öffnet eine lokale Mitteilungsübersicht. Browser-Berechtigung,
Gerätebenachrichtigung und externer Server-Push sind unterschiedliche Dinge.
Der Worker enthält einen Push-Test und einen Teamchat-Versandweg, aber externe
Zustellung ist erst bestätigt, wenn Cloudflare-Schlüssel eingerichtet sind und
eine Nachricht auf einem realen Gerät ankommt. Siehe
[Push-Benachrichtigungen](docs/Push-Benachrichtigungen.md).

## Anmeldung und lokale Offline-Nutzung

Die geschützte Connect-Version verwendet die Plattform-Anmeldung. Ein zuletzt
bestätigtes Konto kann bei fehlender Verbindung bis zu 24 Stunden für den
lokalen Offlinezugriff zwischengespeichert bleiben. Das ist keine erneute
Online-Verifizierung; geschützte Serveraktionen benötigen weiterhin eine
Verbindung. Die öffentliche GitHub-Vorschau bleibt lokal.

## Synchronisierung und Datensicherung

Die geschützte Connect-Version synchronisiert freigegebene Profildaten und
Einstellungen kontobezogen. Konflikte werden angezeigt; eigene Änderungen
werden gezielt mit dem aktuellen Serverstand zusammengeführt. JSON-Sicherungen
schließen Anmeldesitzungen und Synchronisierungsmarker aus. Der Restore fragt
bei vorhandenem Cloudstand ausdrücklich, ob Sicherung oder Cloudstand gelten
soll. Die öffentliche GitHub-Vorschau synchronisiert keine Kontodaten.

## Sprint 10

Sprint 10 stabilisiert TimeFlow als Alpha-1.0-Release-Candidate. In den
Einstellungen lässt sich der Installationsstatus erkennen und die PWA auf
unterstützten Geräten direkt installieren. Lokale JSON-Datensicherungen können
nach einer Struktur- und Sicherheitsprüfung kontrolliert wiederhergestellt
werden; Sitzung und Cloud-Revisionsstand bleiben dabei geschützt. Eine neue
Bereitschaftskarte im Profil fasst Installation, Offline-Modus,
Synchronisierung und Backup zusammen. Der Dienstplan springt beim Öffnen
automatisch in die aktuelle Kalenderwoche und verwendet dasselbe Tagesdatum
wie der Home-Bildschirm.

## Sprint 11

Sprint 11 macht TimeFlow sowohl für Einzelpersonen als auch für Unternehmen
nutzbar. Beim ersten Start wird zwischen „Privat / Einzelperson“ und „Team /
Unternehmen“ gewählt; der Modus bleibt später in den Einstellungen wechselbar.
Der Privatmodus konzentriert sich auf Zeiterfassung, Überstunden, Pausen,
Statistik, persönlichen Dienstplan, eigene Urlaubs- und Krankheitseinträge,
Offline-Nutzung und Backups. Teamchat, Rollen, Freigaben und gemeinsame
Schichtprozesse werden dort ausgeblendet. Der Teammodus behält den vollständigen
bisherigen Funktionsumfang. Sprint 11 veröffentlicht TimeFlow als stabile
Version 1.0.0.

## Sprint 12

Sprint 12 bereitet Version 1.0.1 für den Praxiseinsatz vor. Ein geführter
Gerätecheck prüft direkt im Profil den sicheren App-Kontext, Offline-Betrieb,
lokalen Speicher, mobile Darstellung, Nutzungsmodus, Backup, Synchronisierung
und Verbindung. Persönliche Synchronisierungsantworten werden ausdrücklich vom
PWA-Cache ausgeschlossen. Eine laufende Zeiterfassung bleibt außerdem bei
einem Tageswechsel und nach der Rückkehr aus dem Hintergrund erhalten. Die
abschließende Sprint-Freigabe erfolgt nach Tests auf realen Android- und
iOS-Geräten.
