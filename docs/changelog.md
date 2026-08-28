# Changelog

## Alpha 0.1
### Hinzugefügt
- Erstes GitHub-Projekt erstellt
- GitHub Pages eingerichtet
- Erster Dashboard-Prototyp
- Live-Uhr
- Einstempeln-Button

---

## Alpha 0.2
### Hinzugefügt
- Vollständiges, responsives Dashboard
- Live-Datum, Live-Uhr und tägliches Motivationszitat
- Ein- und Ausstempeln mit lokaler Sitzungswiederherstellung
- Arbeitszeit-, Pausen-, Überstunden- und Zielfortschrittsanzeige
- Bediente Navigation mit Rückmeldung für kommende Bereiche
- Urlaubscountdown, Team-Updates und zugängliche Statusmeldungen

---

## Alpha 0.3 – Sprint 2

### Hinzugefügt

- Dienstpläne mit Tages-, Wochen-, Monats- und Zeitraumansicht
- Installierbares Web-App-Manifest
- Service Worker mit Offline-App-Cache
- PWA-Icons in 192 und 512 Pixeln sowie Maskable Icon
- Lokaler Entwicklungsserver ohne zusätzliche Abhängigkeiten
- VS-Code-Aufgaben zum Starten und Prüfen

### Verbessert

- Mobile Darstellung an den bereitgestellten Referenzbildern ausgerichtet
- Navigation zwischen Dashboard und Dienstplänen korrigiert
- Profilbild-Platzhalter durch robuste Initialenanzeige ersetzt

---

## Alpha 0.4 – Sprint 3

### Hinzugefügt

- Eigener Chat-Bereich anstelle der Statistik in der Hauptnavigation
- Gesprächsliste mit Suche sowie Filtern für ungelesene Nachrichten und Gruppen
- Umschaltbare Einzel- und Gruppenchats
- Nachrichten-Prototyp über die Team-Updates
- Lokale Speicherung selbst geschriebener Demo-Nachrichten
- Mobile Listen- und Gesprächsansicht mit vertrauter Messenger-Bedienung
- Schichtkarten, Schichtbestätigung, Tauschanfragen und Verspätungsmeldungen direkt im Chat
- Schnellantworten, Lesestatus, Team-Präsenz und Dialog für neue Unterhaltungen

### Noch offen

- Serverseitige Chats und Synchronisierung zwischen Benutzern

---

## Alpha 0.5 – Sprint 4

### Hinzugefügt

- Vollständige Profilseite mit Rolle, Abteilung und persönlichen Beschäftigungsdaten
- Lokal bearbeitbare Profildaten
- Arbeitszeitkonto mit Sollzeit, Überstunden, Urlaub und Krankheit
- Umschaltbare Wochen-, Monats- und Jahresstatistik
- Dynamische Arbeitszeitdiagramme und persönliche Zielerreichung
- Direkte Verknüpfung vom Profil zum Dienstplan
- Lokal gespeicherte Benachrichtigungseinstellungen
- Vorbereiteter Datenschutzbereich und Offline-Anzeige
- Eigenständige Stempelansicht getrennt vom Home-Dashboard
- Live-Arbeitszeit, Schichtverlauf und Tagesübersicht in der Stempelansicht

### Verbessert

- Der Home-Stempelstatus öffnet jetzt die Zeiterfassung, statt direkt ein- oder auszustempeln
- Der zentrale Menüpunkt „Stempeln“ besitzt einen eigenen Bildschirm und eine eindeutige Funktion
- Versionsgebundene PWA-Dateien verhindern Mischstände aus altem Cache und neuer Oberfläche
- Ein aktualisierter Service Worker lädt neue App-Versionen automatisch vollständig neu

### Abgrenzung

- Profildaten und Einstellungen werden in der Alpha-Version nur lokal gespeichert
- Serverseitige Benutzerkonten und Synchronisierung folgen in einem späteren Sprint

---

## Alpha 0.6 – Sprint 5 (in Entwicklung)

### Hinzugefügt

- Eigene Einstellungsseite innerhalb des Profils
- Lokal gespeicherte Benachrichtigungswünsche für Dienstplan, Chat und Freigaben
- Einstellbares tägliches Arbeitsziel von 6 bis 10 Stunden
- Einstellbare automatische Pause nach sechs Stunden Arbeitszeit
- Direkte Übernahme von Arbeitsziel und Pause in Home und Stempelansicht
- Optional reduzierte Animationen in der gesamten PWA
- Sichtbarer Online-, Offline- und Service-Worker-Status
- Manuelle Prüfung auf eine neue PWA-Version
- Lokale Datensicherung aller TimeFlow-Daten als JSON-Datei
- Bestätigtes Zurücksetzen ausschließlich lokaler TimeFlow-Daten

### Abgrenzung

- Benachrichtigungswünsche werden lokal gespeichert; echte Push-Nachrichten folgen in Alpha 0.8
- Synchronisierung und Wiederherstellung über mehrere Geräte folgen mit dem Backend

---

## Alpha 0.7 – Sprint 6 (in Entwicklung)

### Hinzugefügt

- Zentraler Schnellaktionsbereich auf dem Home-Dashboard
- Urlaubsantrag mit Zeitraum, Urlaubsart und lokalem Prüfstatus
- Verspätungsmeldung mit Angabe der erwarteten Minuten
- Schichttauschanfrage für geplante Schichten und gewünschte Tauschtage
- Datensparsame Krankmeldung ohne Diagnose- oder Dokumentenupload
- Lokaler Verlauf der letzten 30 Schnellaktionen
- Status, Zusammenfassung und Zeitpunkt für jeden Vorgang
- Automatische Ablage teamrelevanter Meldungen im bestehenden Teamchat

### Verbessert

- Die Karte mit offenen Freigaben öffnet jetzt den Schnellaktionsverlauf
- Die vorhandenen Urlaubshinweise öffnen direkt den Urlaubsantrag
- PWA-App-Cache und Versionsbindung wurden auf Build 0011 aktualisiert

### Abgrenzung

- Anträge und Meldungen werden in der Alpha-Version nur auf dem Gerät gespeichert
- Serverseitige Freigaben, Dokumentenuploads und echte Personalprozesse folgen mit dem Backend
