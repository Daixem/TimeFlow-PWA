# TimeFlow Roadmap

## Alpha 0.2 – Sprint 1

- [x] Neues Dashboard
- [x] Navigation
- [x] Uhr und Datum
- [x] Einstempeln und Ausstempeln

## Alpha 0.3 – Sprint 2

- [x] Dienstpläne
- [x] Tagesansicht
- [x] Wochenansicht
- [x] Monatsansicht
- [x] Zeitraumansicht
- [x] Installierbare lokale PWA

## Alpha 0.4 – Sprint 3

- [x] Chat-Oberfläche
- [x] Lokaler UI-Prototyp und Demo-Nachrichten
- [x] Schichtkarten und arbeitsbezogene Schnellaktionen
- [x] Mobile Chat-Navigation
- [x] Sprint-3-Abschluss als funktionsfähiger Alpha-Prototyp

Echte Empfänger, Server-Synchronisierung und Benutzerkonten werden in einem
späteren Backend-Sprint umgesetzt.

## Alpha 0.5 – Sprint 4: Profil und persönliche Statistik

- [x] Funktionsfähige Profilseite
- [x] Profilbild, Name, Rolle und Abteilung
- [x] Persönliche Beschäftigungsdaten
- [x] Arbeitszeitkonto mit Überstunden, Urlaub und Krankheit
- [x] Statistik innerhalb des Profils
- [x] Wochen-, Monats- und Jahresauswertung
- [x] Diagramme und Zielerreichung
- [x] Verknüpfung zum Dienstplan
- [x] Vorbereitete Bereiche für Einstellungen und Datenschutz
- [x] Responsive Darstellung und Offline-Unterstützung

## Alpha 0.6 – Sprint 5: Einstellungen

- [x] Eigene Einstellungsseite innerhalb des Profils
- [x] Lokale Benachrichtigungswünsche
- [x] Tagesziel und automatische Pause konfigurierbar
- [x] Sofortige Übernahme in Home und Stempelansicht
- [x] Reduzierte Animationen
- [x] Online-, Offline- und PWA-Update-Status
- [x] Lokale Datensicherung als JSON
- [x] Kontrolliertes Zurücksetzen lokaler TimeFlow-Daten

## Alpha 0.7 – Sprint 6: Schnellaktionen

- [x] Zentraler Schnellaktionsbereich auf Home
- [x] Urlaubsantrag mit Zeitraum und lokalem Prüfstatus
- [x] Verspätungsmeldung mit direkter Teamchat-Verknüpfung
- [x] Schichttauschanfrage mit gewünschtem Tauschtag
- [x] Datensparsame Krankmeldung
- [x] Lokaler Verlauf mit Status und Zeitpunkt
- [x] Verknüpfung der offenen Freigaben mit dem Verlauf
- [x] Responsive und offline nutzbare Darstellung

## Alpha 0.8 – Sprint 7: Benachrichtigungen

- [x] Notification Center über die Glocke im Home-Header
- [x] Ungelesen-Zähler und Gelesen-Status
- [x] Hinweise für Freigaben, Dienstplan, Teamchat und Schnellaktionen
- [x] Explizite Browser-/PWA-Berechtigung in den Einstellungen
- [x] Testbenachrichtigung über den Service Worker
- [x] Klick auf eine Gerätebenachrichtigung öffnet TimeFlow
- [x] Lokale Speicherung und Offline-Verfügbarkeit
- [ ] Serverseitige Push-Zustellung bei geschlossener App (benötigt Backend)

## Alpha 0.9 – Sprint 8: Anmeldung und Benutzerrollen

- [x] Bestehende sichere Site-Anmeldung für die private Vorschau verwenden
- [x] Klar gekennzeichneter Demo-Login für die öffentliche GitHub-Version
- [x] Lokale Sitzung auf dem Gerät wiederherstellen
- [x] Kontrollierte Abmeldung
- [x] Benutzerübersicht mit Aktivstatus
- [x] Rollen Mitarbeiter, Teamleitung und Administrator
- [x] Lokale Bearbeitung und Zurücksetzen der Demo-Benutzer
- [ ] Zentrale Rollenberechtigungen für mehrere Betriebe

## Alpha 0.9 – Sprint 9: Datensynchronisierung

- [x] Benutzerbezogener Cloud-Speicher in der privaten Site
- [x] Geschützte Synchronisierungs-API mit serverseitiger Identitätsprüfung
- [x] Synchronisierung von Profil und Einstellungen
- [x] Automatische Erstsicherung auf dem ersten Gerät
- [x] Wiederherstellung auf einem weiteren angemeldeten Gerät
- [x] Revisionsstand und Zeitstempel je Benutzer
- [x] Sichtbarer Cloud-, Offline- und Fehlerstatus im Profil
- [x] Manuelle Synchronisierung
- [x] Lokaler Fallback ohne Datenverlust
- [x] Chats, Gesundheitsmeldungen und Demo-Sitzungen bewusst ausgeschlossen

## Alpha 1.0 RC – Sprint 10: Stabilisierung

- [x] Verständlicher PWA-Installationsstatus
- [x] Geführte Installation auf unterstützten Geräten
- [x] Kontrollierte Wiederherstellung lokaler Datensicherungen
- [x] Schutz von Sitzung und Cloud-Status beim Import
- [x] Bereitschaftsübersicht für App, Offline, Synchronisierung und Backup
- [x] Dienstplan startet immer mit der aktuellen Kalenderwoche
- [x] Verbesserter Tastaturzugang zum Hauptinhalt
- [x] Release-Candidate-Build mit erneuertem Offline-Cache
- [x] Technische Abnahme der Kernfunktionen

## Alpha 1.0 – Sprint 11: Privat- und Teammodus

- [x] Erstauswahl zwischen Privat- und Teammodus
- [x] Nutzungsmodus später in den Einstellungen wechselbar
- [x] Persönliche Kernfunktionen ohne Teamabhängigkeit
- [x] Teamfunktionen im Privatmodus ausgeblendet
- [x] Persönliche Urlaubs- und Krankheitseinträge
- [x] Vollständiger Teamumfang weiterhin verfügbar
- [x] Modusauswahl in der vorhandenen Einstellungssynchronisierung
- [x] Erste stabile Version 1.0.0
- [x] Technischer Gerätecheck und Testversion 1.0.1

## Version 1.0.1 – Sprint 12: Praxistest und Produktionshärtung

- [x] Geführter Geräte- und PWA-Check
- [x] Schutz persönlicher API-Antworten vor dem Offline-Cache
- [x] Laufende Zeiterfassung über Tageswechsel und App-Rückkehr
- [x] Erneuerter Offline- und Update-Cache
- [x] Automatisierte Sprint-12-Abnahme
- [ ] Installationstest auf einem realen Android-Gerät
- [ ] Installationstest auf einem realen iPhone
- [ ] Geräteübergreifender Synchronisationstest
- [ ] Backup-Wiederherstellung mit einer echten Testdatei

## Geräteübergreifende Parität – vor weiteren Funktionssprints

- [x] Verbindliche Geräte- und Betriebssystemmatrix festgelegt
- [x] Gemeinsame Plattformerkennung für iOS, iPadOS, Android, Windows, macOS und Linux
- [x] Fehlertoleranter lokaler Speicher mit Sitzungsspeicher-Fallback
- [x] Dialog-Fallback für unterschiedliche Browserimplementierungen
- [x] Dynamische Viewport-Höhe, Touch-Ziele, Hoch-/Querformat und Desktopbreiten abgesichert
- [x] Plattformspezifische Installationshinweise
- [x] Reale Abnahme auf iPhone
- [ ] Reale Abnahme auf iPad: App und Darstellung bestätigt, dauerhafte Speicherung noch offen
- [ ] Reale Abnahme auf Android-Smartphone und Android-Tablet
- [ ] Reale Abnahme unter Windows und macOS
- [ ] Reale Abnahme unter Linux

## Vorgemerkt – echte Benutzerkonten und Anmeldung

- [ ] Registrierung mit E-Mail-Adresse und Passwort
- [ ] Alternative Anmeldung über Google und Apple
- [ ] Erweiterbare OAuth-/OpenID-Connect-Anbindung für weitere vertrauenswürdige Anbieter
- [ ] Mehrere Anmeldearten sicher mit demselben TimeFlow-Konto verknüpfen
- [ ] Anmeldung und sichere Abmeldung mit eigenen TimeFlow-Zugangsdaten
- [ ] E-Mail-Adresse bestätigen
- [ ] Passwort vergessen und sicher zurücksetzen
- [ ] Passwörter ausschließlich serverseitig gehasht speichern
- [ ] Geschützte Sitzungen, Anmeldebegrenzung und Schutz vor unbefugten Versuchen
- [ ] Demo-Anmeldung der öffentlichen Vorschau später durch echte Konten ergänzen

## Vorgemerkt – Organisationsbeitritt und Teammodus

- [ ] Neue Benutzerkonten starten standardmäßig im Privatmodus
- [ ] Teammodus im Produktivbetrieb nicht frei in den Einstellungen auswählbar machen
- [ ] Teammodus erst nach Einladung oder bestätigter Zuordnung durch eine Organisation aktivieren
- [ ] Einladung per sicherem Link, E-Mail oder einmaligem Organisationscode ermöglichen
- [ ] Einladung zeigt Organisation, Standort, Abteilung und vorgesehene Rolle vor der Annahme
- [ ] Nutzer muss den Beitritt ausdrücklich bestätigen
- [ ] Rollen und Berechtigungen werden ausschließlich durch berechtigte Organisationsadministratoren vergeben
- [ ] Austritt, Entfernung und Wechsel einer Organisation mit nachvollziehbarem Status abbilden
- [ ] Beim Verlassen einer Organisation persönliche Zeitdaten erhalten und Teamdaten sauber trennen
- [ ] Freie Auswahl zwischen Privat und Team nur in Demo- und Entwicklungsständen beibehalten

## Vorgemerkt – „Für dich“ als persönlicher Posteingang

- [ ] Alle den Nutzer direkt betreffenden Ereignisse gebündelt anzeigen
- [ ] Dienstplan erstellt, geändert oder kurzfristig aktualisiert
- [ ] Urlaubsantrag genehmigt, abgelehnt oder zur Rückfrage zurückgegeben
- [ ] Schichttausch angefragt, angenommen, abgelehnt oder freigegeben
- [ ] Hinweise zu Überstunden, Pausen, fehlenden Stempelungen und Zeitkorrekturen
- [ ] Persönliche Erinnerungen und betriebliche Mitteilungen mit Nutzerbezug
- [ ] Gelesen-/Ungelesen-Status, Zeitstempel, Filter und Ereignisverlauf
- [ ] Reine Informationen öffnen nur eine Detailansicht; neue Vorgänge werden ausschließlich über Schnellaktionen erstellt
- [ ] Team-Update bleibt für allgemeine Teamereignisse wie Geburtstage, Jubiläen und Abteilungsnachrichten getrennt

## Vorgemerkt – „Team-Update“ als Veranstaltungs- und Informationsbereich

- [ ] Nächste Veranstaltung mit Titel, Datum, Uhrzeit und Veranstaltungsort anzeigen
- [ ] Firmenfeiern, Teamveranstaltungen, Schulungen, Meetings und Betriebsversammlungen ankündigen
- [ ] Formulierungen wie „Die Firmenfeier findet am 18.12.2026 um 18:30 Uhr statt“ direkt in der Übersicht darstellen
- [ ] Detailansicht mit Beschreibung, Ansprechpartner, Teilnahmehinweis und optionaler Zu-/Absage
- [ ] Abteilungs- und Unternehmensmeldungen nach Relevanz und Zeitpunkt sortieren
- [ ] Abgelaufene Veranstaltungen automatisch aus der Startansicht entfernen und im Verlauf archivieren
- [ ] Geburtstage und Jubiläen als eigene Arten von Teamereignissen beibehalten
- [ ] Keine Vermischung mit persönlichen Genehmigungen oder Dienstplanänderungen aus „Für dich“
