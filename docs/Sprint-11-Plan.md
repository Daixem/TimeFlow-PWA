# Sprint 11 – Nutzungsmodi und Alpha-1.0-Abnahme

Status: **Alpha 1.0 umgesetzt (Build 0016)**

## Ziel

TimeFlow soll sowohl für einzelne Personen als auch für Teams verständlich
nutzbar sein. Einzelpersonen erhalten eine ruhige persönliche Arbeitszeit-App,
während Unternehmen weiterhin auf Zusammenarbeit und Freigabeprozesse
zugreifen können.

## Umgesetzt

- Auswahl beim ersten Start zwischen „Privat / Einzelperson“ und
  „Team / Unternehmen“
- Dauerhaft wechselbarer Nutzungsmodus in den Einstellungen
- Synchronisierung der Modusauswahl als Teil der bestehenden Einstellungen
- Privatmodus mit Zeiterfassung, Pausenautomatik, Überstunden, Statistik,
  persönlichem Dienstplan, Urlaub, Krankheit, Offline-Nutzung und Backups
- Ausblendung von Chat, Freigaben, Rollenverwaltung, Teamlisten,
  Verspätungsmeldung und Schichttausch im Privatmodus
- Persönliche Formulierungen und lokaler Status für Urlaub und Krankheit
- Teammodus mit dem vollständigen bisherigen Funktionsumfang
- Erneuerter Offline-App-Cache und stabile Version 1.0.0
- Wiederholbarer automatischer Abnahmetest für beide Modi, PWA-Dateien,
  Wochenberechnung und geschützte Synchronisierung

## Datenschutz

Die Modusauswahl enthält keine sensiblen Angaben und wird innerhalb der
bereits geschützten TimeFlow-Einstellungen synchronisiert. Chats,
Zeiterfassung, Krankheits- und Urlaubseinträge werden durch diese Änderung
nicht zusätzlich in die Cloud übertragen.

## Abnahme

- Modusauswahl erscheint nur, solange noch keine Wahl gespeichert ist
- Umschalten verändert sofort Navigation, Home, Dienstplan und Einstellungen
- Persönliche Einträge funktionieren ohne Teamchat oder Freigabeprozess
- Teammodus stellt sämtliche Teamfunktionen wieder her
- Installation, Offline-App-Cache, Backup und Cloud-Synchronisierung bleiben
  in beiden Modi verfügbar
