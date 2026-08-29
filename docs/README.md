# TimeFlow PWA

TimeFlow ist eine mobile Zeiterfassungs- und Dienstplan-App. Der zusammengeführte
Stand enthält das Dashboard, eine lokal gespeicherte Stempeluhr, Tages-, Wochen-,
Monats- und Zeitraumansichten sowie einen Offline-App-Cache.

## Lokal in VS Code testen

1. Den Ordner `TimeFlow` in VS Code öffnen.
2. Node.js 18 oder neuer installieren, falls noch nicht vorhanden.
3. Im Terminal `npm run dev` ausführen.
4. `http://127.0.0.1:4173` im Browser öffnen.

Alternativ kann über **Terminal → Aufgabe ausführen** die Aufgabe
`TimeFlow: PWA starten` gewählt werden. Es sind keine Pakete und kein
`npm install` erforderlich.

Mit `npm test` werden Manifest, Offline-Cache, Sites-Build und die aktuellen
Sprint-12-Abnahmekriterien automatisch geprüft.

## Als App installieren

Auf `localhost` oder nach einer Bereitstellung über HTTPS kann TimeFlow in
aktuellen Chromium-Browsern über das Installationssymbol in der Adressleiste
installiert werden. Nach dem ersten vollständigen Laden steht die Oberfläche
auch offline zur Verfügung. Stempelzeiten bleiben lokal auf dem Gerät
gespeichert.

## Enthaltene Funktionen

- Responsives Dashboard nach der mobilen Designreferenz
- Ein- und Ausstempeln mit Tagesfortschritt
- Lokale Speicherung des aktuellen Arbeitstags
- Dienstpläne für Tag, Woche, Monat und Zeitraum
- Installierbares Web-App-Manifest
- Service Worker mit App-Shell-Cache
- VS-Code-Aufgaben zum Starten und Prüfen

## Bereitstellung und Synchronisierung

Die private Sites-Version besitzt eine kontogeschützte Synchronisierung für
Profil und Einstellungen. Die öffentliche GitHub-Version arbeitet als Demo
lokal im jeweiligen Browser. Echte Mehrbenutzerrollen, gemeinsamer Teamchat,
zentrale Dienstplanfreigaben und serverseitige Push-Zustellung bleiben spätere
Backend-Funktionen.
