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

## Sprint 7

Sprint 7 macht die Glocke im Home-Header zum vollständigen Notification Center.
Hinweise für Freigaben, Dienstpläne, Teamchat und Schnellaktionen besitzen einen
Ungelesen-Status und bleiben lokal auf dem Gerät gespeichert. In den
Einstellungen kann die Browser-/PWA-Berechtigung bewusst aktiviert und mit
einer Testbenachrichtigung geprüft werden. Echte serverseitige Push-Nachrichten
bei vollständig geschlossener App benötigen später die Benutzerverwaltung und
das Backend.

## Sprint 8

Sprint 8 ergänzt Anmeldung, Sitzungsstatus und eine erste Benutzerverwaltung.
Die private TimeFlow-Site verwendet die vorhandene geschützte Site-Anmeldung
und zeigt das verifizierte Konto im Profil. Die öffentliche GitHub-Vorschau
nutzt stattdessen bewusst gekennzeichnete Demo-Konten ohne Passwort. Rollen,
Aktivstatus und Demo-Benutzer lassen sich lokal verwalten. Zentrale Konten,
echte Berechtigungen und geräteübergreifende Synchronisierung folgen mit dem
Backend.

## Sprint 9

Sprint 9 verbindet die private TimeFlow-Site mit einem benutzerbezogenen
Cloud-Speicher. Profil und Einstellungen werden nach der Anmeldung automatisch
gesichert und können auf einem weiteren Gerät wiederhergestellt werden. Ein
Statusbereich im Profil zeigt Synchronisierung, Offline-Betrieb und den letzten
Abgleich. Die öffentliche GitHub-Vorschau bleibt vollständig lokal. Chats,
Krankmeldungen und andere sensible Schnellaktionen werden in diesem Sprint
bewusst nicht in die Cloud übertragen.

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
