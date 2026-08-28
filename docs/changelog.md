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

---

## Alpha 0.8 – Sprint 7

### Hinzugefügt

- Eigenständiges Notification Center über die Glocke im Home-Header
- Ungelesen-Zähler, Einzelstatus und Funktion „Alle gelesen“
- Lokale Hinweise für Freigaben, Dienstplan, Teamchat und Schnellaktionen
- Explizite Gerätefreigabe für Browser- und PWA-Benachrichtigungen
- Testbenachrichtigung über die aktive Service-Worker-Registrierung
- Verknüpfung von Hinweisen mit Dienstplan, Teamchat und Schnellaktionsverlauf
- Geräte-Berechtigungsstatus direkt in den Profileinstellungen

### Verbessert

- Neu erfasste Schnellaktionen erzeugen automatisch einen passenden Hinweis
- Klick auf eine Gerätebenachrichtigung fokussiert oder öffnet TimeFlow
- PWA-App-Cache und Versionsbindung wurden auf Build 0012 aktualisiert

### Abgrenzung

- Lokale Benachrichtigungen funktionieren nach ausdrücklicher Freigabe im Browser
- Serverseitige Push-Zustellung bei vollständig geschlossener App benötigt ein Backend, Benutzerkonten und Push-Abonnements

---

## Alpha 0.9 – Sprint 8

### Hinzugefügt

- Geschützte Kontoerkennung über die bestehende Anmeldung der privaten Site
- Klar gekennzeichneter Demo-Login für die öffentliche GitHub-Vorschau
- Drei lokale Demo-Konten für Mitarbeiter, Teamleitung und Administration
- Wiederherstellung der lokalen Demo-Sitzung auf demselben Gerät
- Sitzungsstatus mit Kontoquelle direkt im Profil
- Kontrollierte Abmeldung für private und öffentliche Vorschau
- Lokale Benutzerverwaltung mit Rolle und Aktivstatus
- Zurücksetzen der Demo-Belegschaft auf den Ausgangsstand

### Sicherheit

- TimeFlow speichert keine Passwörter oder Zugangsdaten
- Die private Site übernimmt die vorhandene Site-Authentifizierung
- Die öffentliche Version bezeichnet lokale Konten ausdrücklich als Demo
- Der Identitätsendpunkt wird nicht zwischengespeichert

### Verbessert

- PWA-App-Cache und Versionsbindung wurden auf Build 0013 aktualisiert
- Der Site-Build stellt den angemeldeten Besucher datensparsam für die Oberfläche bereit

### Abgrenzung

- Rollenänderungen und Aktivstatus gelten in dieser Alpha nur im aktuellen Browser
- Zentrale Benutzerkonten, echte serverseitige Rollenprüfung und Synchronisierung folgen mit dem Backend

---

## Alpha 0.9 – Sprint 9

### Hinzugefügt

- Verwalteter Cloud-Speicher für benutzerbezogene TimeFlow-Daten
- Geschützte Synchronisierungs-API mit serverseitiger Identitätsprüfung
- Automatische Erstsicherung von Profil und Einstellungen
- Wiederherstellung eines vorhandenen Cloud-Stands auf einem weiteren Gerät
- Revisionsnummer und Zeitstempel für jeden gespeicherten Benutzerstand
- Cloud-Statuskarte im Profil mit manueller Synchronisierung
- Verständliche Zustände für Synchronisierung, Offline-Betrieb und Fehler
- Lokaler Fallback, wenn die Cloud vorübergehend nicht erreichbar ist

### Datenschutz und Sicherheit

- Ausschließlich Profil und Einstellungen werden synchronisiert
- Teamchats, Krankmeldungen, Schnellaktionen und Demo-Sitzungen bleiben lokal
- Lese- und Schreibzugriffe benötigen eine serverseitig geprüfte Benutzeridentität
- Fremde Ursprünge dürfen keine Synchronisierungsdaten schreiben
- Datenpakete werden in Größe und Struktur begrenzt

### Verbessert

- Datenschutzhinweis im Profil unterscheidet jetzt lokale und synchronisierte Daten
- PWA-App-Cache und Versionsbindung wurden auf Build 0014 aktualisiert

### Abgrenzung

- Die öffentliche GitHub-Version besitzt keinen Cloud-Speicher und bleibt ein lokaler Demo-Modus
- Zentrale Rollenverwaltung, Betriebsmandanten und serverseitige Chats folgen in späteren Ausbaustufen

---

## Alpha 1.0 RC – Sprint 10

### Hinzugefügt

- Sichtbarer Installationsstatus in den App-Einstellungen
- Direkter PWA-Installationsdialog auf unterstützten Geräten
- Verständliche Anleitung zur Installation über das Browsermenü
- Kontrollierte Wiederherstellung einer lokalen JSON-Datensicherung
- Prüfung von Format, Größe und enthaltenen TimeFlow-Daten vor dem Import
- Bestätigungsübersicht mit Datum und Anzahl der wiederherstellbaren Datensätze
- Bereitschaftskarte im Profil für App, Offline-Modus, Synchronisierung und Backup
- Sprunglink für Tastaturnutzer zum Hauptinhalt

### Sicherheit und Datenschutz

- Lokale Sitzungen und Cloud-Revisionsstände werden nicht aus Backups übernommen
- Unbekannte Schlüssel und ungültige Dateien werden beim Import abgewiesen
- Die Backup-Datei bleibt vollständig auf dem Gerät
- Der Cloud-Umfang bleibt auf Profil und Einstellungen begrenzt

### Verbessert

- PWA-App-Cache und Versionsbindung wurden auf Build 0015 aktualisiert
- Version wurde auf `1.0.0-rc.1` angehoben
