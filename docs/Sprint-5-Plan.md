# Sprint 5 – Einstellungen

Status: **Erste funktionsfähige Alpha-Version umgesetzt (Build 0010)**

## Ziel

Sprint 5 bündelt die persönlichen App-Einstellungen in einer eigenen Seite
innerhalb des Profils. Die wichtigsten Optionen sollen unmittelbar spürbar
sein und zugleich transparent machen, welche Daten lokal auf dem Gerät liegen.

## Umgesetzter Umfang

- Eigene Einstellungsseite mit Rückweg zum Profil
- Benachrichtigungswünsche für Dienstpläne, Chat und Freigaben
- Konfigurierbares tägliches Arbeitsziel
- Konfigurierbare automatische Pause nach sechs Stunden
- Direkte Aktualisierung von Home und Stempelansicht
- Reduzierte Animationen als Bedienungshilfe
- Online- und Offline-Status der PWA
- Manuelle Prüfung auf PWA-Updates
- Export aller lokalen TimeFlow-Daten als JSON-Datensicherung
- Geschütztes Zurücksetzen ausschließlich lokaler TimeFlow-Daten
- Responsive und offline nutzbare Darstellung

## Abgrenzung

Folgende Funktionen gehören noch nicht zu Sprint 5:

- Betriebssystemweite Push-Benachrichtigungen
- Serverseitige Benutzerkonten
- Synchronisierung und Wiederherstellung zwischen mehreren Geräten
- Zentrale Richtlinien durch einen Arbeitgeber oder Administrator

Diese Punkte benötigen Backend-, Berechtigungs- oder Push-Infrastruktur und
folgen in den dafür vorgesehenen späteren Sprints.

## Abnahmekriterien

Sprint 5 gilt in der ersten Alpha-Version als umgesetzt, wenn:

1. Einstellungen über das Profil als eigene Ansicht erreichbar sind,
2. alle Bedienelemente ihren Zustand lokal speichern,
3. Tagesziel und Pausenregel sofort in der Zeiterfassung erscheinen,
4. der lokale PWA- und Verbindungsstatus verständlich angezeigt wird,
5. lokale Daten exportiert und nur nach Bestätigung gelöscht werden können und
6. die PWA weiterhin installierbar und offline nutzbar bleibt.
