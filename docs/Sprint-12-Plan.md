# Sprint 12 – Praxistest und Produktionshärtung

Status: **Technische Testversion 1.0.1 umgesetzt (Build 0032)**

## Ziel

TimeFlow wird auf reale mobile Nutzung vorbereitet. Der Sprint macht den
Gerätezustand sichtbar, schützt sensible Synchronisierungsantworten vor dem
PWA-Cache und bewahrt eine laufende Zeiterfassung auch bei Tageswechsel oder
nach dem Wiederöffnen der App.

## Umgesetzt

- Geführter Geräte- und PWA-Check im Profil
- Prüfung von sicherem Kontext, Offline-App, lokalem Speicher und Darstellung
- Sichtbarer Status für Nutzungsmodus, Backup, Synchronisierung und Verbindung
- Keine Zwischenspeicherung benutzerbezogener API-Antworten im Service Worker
- Aktualisierung des App-Shell-Caches auf Build 0032
- Wiederherstellung eines konsistenten Seitenzustands auf Tablets und nach App-Rückkehr
- Früher kompatibler Shell-Wächter stellt Home oder die gewählte Seite auch nach einem Teilausfall einzelner Skripte sichtbar wieder her
- Laufende Nachtschichten bleiben über den Tageswechsel erhalten
- Erneute Zustandsprüfung nach Rückkehr aus dem Hintergrund
- Automatisierte Sprint-12-Abnahme für Build, PWA, Backup und Synchronisierung

## Noch durch den Nutzer zu prüfen

- Dauerhafte lokale Speicherung in der installierten PWA auf dem realen iPad
- Installation und Start als PWA auf einem realen Android-Gerät
- Offline-Start nach vorherigem vollständigem Laden
- Synchronisierung desselben Profils auf zwei angemeldeten Geräten
- Backup-Export und kontrollierte Wiederherstellung einer Testdatei

Sprint 12 gilt nach diesen realen Gerätetests und der Behebung möglicher
geräteabhängiger Fehler als vollständig abgeschlossen.
