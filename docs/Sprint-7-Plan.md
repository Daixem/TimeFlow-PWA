# Sprint 7 – Benachrichtigungen

Status: **Erste funktionsfähige Alpha-Version umgesetzt (Build 0012)**

## Ziel

TimeFlow bündelt relevante Hinweise in einem bedienbaren Notification Center
und kann nach ausdrücklicher Freigabe lokale Gerätebenachrichtigungen über die
installierte PWA ausgeben.

## Umgesetzt

- Notification Center über die Glocke auf Home
- Drei verständliche Start-Hinweise für Freigaben, Dienstplan und Teamchat
- Ungelesen-Zähler, Einzelstatus und „Alle gelesen“
- Direkte Navigation zum zugehörigen Bereich
- Lokale Speicherung der letzten 50 Hinweise
- Automatische Hinweise nach Schnellaktionen
- Berechtigungsstatus und Aktivierung in den Einstellungen
- Testbenachrichtigung über den Service Worker
- Fokus beziehungsweise Öffnen der PWA nach Klick auf eine Benachrichtigung
- Offline-Cache für alle neuen Sprint-7-Dateien

## Technische Abgrenzung

Die Alpha nutzt die standardisierte Notification API und die bestehende
Service-Worker-Registrierung. Die Berechtigung wird ausschließlich nach einer
bewussten Benutzeraktion angefragt. Für echte Push-Nachrichten aus einem
zentralen System bei geschlossener App werden später Backend, Login,
Push-Abonnements und ein Versanddienst ergänzt.
