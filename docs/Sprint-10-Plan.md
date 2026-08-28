# Sprint 10 – Alpha-1.0-Stabilisierung

Status: **Release Candidate umgesetzt (Build 0015)**

## Ziel

TimeFlow soll nach den Funktionssprints als verlässliche, installierbare PWA
verständlich abschließen. Der Schwerpunkt liegt auf Datenhoheit,
Installationsbereitschaft, Offline-Nutzung und einem klaren Systemstatus.

## Umgesetzt

- Installationsstatus und geführte PWA-Installation in den Einstellungen
- Verständlicher Hinweis auf die manuelle Browser-Installation, wenn kein
  direkter Installationsdialog verfügbar ist
- Kontrollierte Wiederherstellung einer lokalen TimeFlow-Datensicherung
- Prüfung von Dateityp, Struktur, Größe und TimeFlow-Schlüsseln vor dem Import
- Schutz von Sitzung und Cloud-Revisionsstand vor einer Backup-Übernahme
- Zusammenfassung und ausdrückliche Bestätigung vor dem Überschreiben
- Bereitschaftsübersicht für App, Offline-Modus, Synchronisierung und Backup
- Dienstpläne öffnen automatisch in der aktuellen Kalenderwoche
- Tages-, Wochen-, Monats- und Zeitraumdaten folgen dem aktuellen Home-Datum
- Tastatur-Sprunglink zum Hauptinhalt
- Release-Candidate-Version mit erneuertem Offline-App-Cache

## Datenschutz

Der Import findet vollständig im Browser statt. Die ausgewählte Datei wird
nicht hochgeladen. Chats und sensible Schnellaktionen werden durch Sprint 10
nicht zusätzlich synchronisiert. Die private Cloud-Sicherung bleibt auf Profil
und Einstellungen begrenzt.

## Abschlusskriterien für Alpha 1.0

- Installation auf unterstützten Geräten prüfen
- Offline-Start und Updatewechsel prüfen
- Backup-Export und Wiederherstellung prüfen
- Private Synchronisierung mit einem zweiten angemeldeten Gerät prüfen
- Rückmeldungen aus der praktischen Nutzung sammeln
