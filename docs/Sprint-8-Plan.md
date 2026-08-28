# Sprint 8 – Anmeldung und Benutzerrollen

Status: **Erste funktionsfähige Alpha-Version umgesetzt (Build 0013)**

## Ziel

TimeFlow erhält einen verständlichen Einstieg mit sichtbarem Sitzungsstatus und
einer ersten Benutzer- und Rollenverwaltung, ohne unsichere Passwörter in der
PWA zu speichern.

## Umgesetzt

- Private Vorschau nutzt die bestehende geschützte Site-Anmeldung
- Öffentliche GitHub-Version nutzt klar gekennzeichnete Demo-Konten
- Lokale Wiederherstellung und kontrollierte Abmeldung der Demo-Sitzung
- Konto- und Sicherheitsstatus im Profil
- Benutzerliste mit Abteilung, Personalnummer, Rolle und Aktivstatus
- Rollen Mitarbeiter, Teamleitung und Administrator
- Lokales Speichern und Zurücksetzen der Demo-Verwaltung
- Identitätsendpunkt mit deaktiviertem Browser-Cache
- Offline-Cache für alle neuen Sprint-8-Dateien

## Technische Abgrenzung

Die private Site wird bereits durch die Plattform geschützt und stellt die
angemeldete Identität serverseitig bereit. Die GitHub-Seite kann als statische
Vorschau keine sichere Anmeldung anbieten und verwendet deshalb ausschließlich
lokale Demo-Sitzungen. Echte Rollenberechtigungen, zentrale Konten und
Datensynchronisierung werden erst mit einem Backend verbindlich umgesetzt.
