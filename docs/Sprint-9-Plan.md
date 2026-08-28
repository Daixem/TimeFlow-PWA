# Sprint 9 – Sichere Datensynchronisierung

Status: **Erste funktionsfähige Cloud-Alpha umgesetzt (Build 0014)**

## Ziel

Angemeldete Benutzer der privaten TimeFlow-Site sollen ihre wichtigsten
persönlichen Einstellungen geräteübergreifend sichern und wiederherstellen
können, ohne sensible Arbeitsinhalte unnötig in die Cloud zu übertragen.

## Umgesetzt

- Verwaltete Datenbankbindung der privaten Site
- Benutzerbezogener Datensatz mit Revision und Änderungszeitpunkt
- Serverseitig geschützte Lese- und Schreibschnittstelle
- Automatische Erstsicherung von Profil und Einstellungen
- Wiederherstellung eines neueren Cloud-Stands auf weiteren Geräten
- Automatische Sicherung nach Profil- oder Einstellungsänderungen
- Manuelle Synchronisierung im Profil
- Sichtbare Zustände für Cloud, lokal, Offline, Fehler und laufenden Abgleich
- Lokaler Betrieb ohne Datenverlust bei fehlender Verbindung
- Datenbankschema und reproduzierbare Migration

## Synchronisierte Daten

- Persönliches TimeFlow-Profil
- App- und Arbeitszeiteinstellungen
- Benachrichtigungswünsche

## Bewusst lokal

- Teamchats und selbst geschriebene Nachrichten
- Krankmeldungen und andere potenziell sensible Schnellaktionen
- Demo-Benutzer und Demo-Sitzungen der öffentlichen GitHub-Vorschau
- Browserbezogene Status- und Cacheinformationen

## Technische Abgrenzung

Die geschützte private Site verwendet die von der Plattform bereitgestellte
Benutzeridentität als Besitzschlüssel. Die statische GitHub-Version hat keine
sichere serverseitige Identität und führt deshalb keinen Cloud-Abgleich aus.
Zentrale Rollenrechte, mehrere Betriebe und serverseitige Chats bleiben ein
späterer Entwicklungsschritt.
