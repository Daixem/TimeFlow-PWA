# Sicherheit, Backup und Wiederherstellung

Stand: September 2026. Diese Anleitung enthält keine Zugangsdaten und ersetzt keine rechtliche Datenschutzberatung.

## Sicherheitsarchitektur

- **GitHub Pages** ist eine öffentliche, rein lokale Demo. Dort werden keine D1- oder Beta-Daten bereitgestellt.
- **TimeFlow Connect** ist die produktive Beta. Die Plattform-Anmeldung liefert den Nutzerkontext; alle serverseitigen API-Routen prüfen die Anmeldung.
- Geschützte Routen prüfen zusätzlich Beta-Zugang oder Administratorstatus. Der Browser entscheidet nie allein über eine Berechtigung.
- D1-Abfragen verwenden gebundene Parameter. Daten werden nach Nutzer-ID, Einladung oder Organisationsmitgliedschaft abgegrenzt.
- Einladungen sind zufällige, einmalige Tokens; in D1 liegt nur ihr SHA-256-Hash. Erstellen, Einlösen, Support und Synchronisierung haben serverseitige Begrenzungen pro angemeldetem Nutzer.
- API-Antworten werden nicht im Service-Worker-Cache abgelegt. Lokale Browserdaten sind Komfort-/Offline-Daten, aber kein Backup.
- Die Beta setzt CSP, `nosniff`, Referrer-, Permissions- und HSTS-Header. Die CSP erlaubt nur die eigenen Dateien sowie die bewusst eingebundenen Google-Fonts und Font Awesome.

## Verbleibende Grenzen

Die Ratenbegrenzung läuft im bestehenden Worker und ist daher eine zusätzliche Schutzschicht, kein Ersatz für einen zentralen WAF-/Rate-Limit-Dienst. Eine vollständige D1-Sicherung oder ein datenbankweiter Restore ist über die in diesem Projekt verfügbare Sites-Schnittstelle **nicht automatisierbar**. Vor einem Produktivbetrieb mit sensiblen Daten muss die Hosting-Plattform eine dokumentierte D1-Export- und Restore-Funktion bereitstellen.

## Was gesichert wird

| Bereich | Primäre Sicherung | Zusätzliche Sicherung |
| --- | --- | --- |
| Quellcode und Historie | GitHub `Daixem/TimeFlow-PWA` | verschlüsseltes Git-Bundle auf SSD/USB oder iCloud-Vault |
| Nicht geheime Konfiguration | versioniert im Repository | im Git-Bundle enthalten |
| D1, Profile, Einladungen, Synchronisierungsdaten | Hosting-Plattform | Export nur über eine verifizierte Plattformfunktion |
| Lokale PWA-Daten | Nutzerexport innerhalb der App | nicht als zentrale Sicherung geeignet |
| Secrets | Secret-/Kontoverwaltung der jeweiligen Plattform | nie im Repository oder Bundle |

`node_modules`, Build-Ausgaben, Caches, Debug-Artefakte und `.env`-Dateien werden bewusst nicht gesichert: sie sind reproduzierbar oder dürfen nicht in ein normales Backup gelangen.

## Portables Code-Backup

1. Zuerst alle beabsichtigten Änderungen committen und zu GitHub pushen.
2. Einen Zielordner auf externer SSD, USB oder in einem **verschlüsselten** iCloud-Drive-Vault auswählen.
3. Aus dem Projektordner ausführen:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-timeflow-source.ps1 -Destination "D:\TimeFlow-Backups"
```

Das Ergebnis `TimeFlow-backup-YYYY-MM-DD-HHMMSSZ` enthält ein vollständiges Git-Bundle, einen Manifest-Eintrag und eine SHA-256-Prüfsumme. Das aktive Arbeitsverzeichnis darf nicht direkt aus einem synchronisierten iCloud-Ordner betrieben werden; iCloud/USB ist nur die zusätzliche Backup-Kopie.

**Empfehlung:** täglich nach Änderungen ein Bundle erzeugen; 14 tägliche, 8 wöchentliche und 12 monatliche Kopien getrennt aufbewahren. Alte Kopien erst nach einer erfolgreichen Prüfwiederherstellung entfernen. Tragbare Datenträger mit BitLocker To Go (Windows) oder einem etablierten verschlüsselten Vault wie Cryptomator schützen. Schlüssel/Recovery-Key getrennt vom Datenträger verwahren.

## Wiederherstellung

### Neuer PC oder verlorener Rechner

1. Git, Node.js und einen Passwortmanager installieren.
2. Repository von GitHub klonen: `git clone https://github.com/Daixem/TimeFlow-PWA.git`.
3. `npm test` ausführen. Abhängigkeiten werden nicht aus einem alten `node_modules` übernommen.
4. Für die Beta im selben OpenAI/ChatGPT-Workspace anmelden. Das bestehende Sites-Projekt bleibt über `.openai/hosting.json` referenziert; niemals ein neues Projekt als Ersatz anlegen.

Falls GitHub nicht erreichbar ist, zuerst das Bundle prüfen und wiederherstellen:

```text
git clone TimeFlow-source.bundle TimeFlow
cd TimeFlow
git remote add origin https://github.com/Daixem/TimeFlow-PWA.git
git fsck --full
```

Danach nur nach Prüfung mit dem wieder erreichbaren Repository verbinden.

### Fehlerhafter Release

Den letzten bekannten guten Commit in GitHub auswählen, in einem Arbeitsbranch testen und als neuen, nachvollziehbaren Commit nach `main` übernehmen. Kein `reset --hard` auf dem gemeinsamen Branch und keine Überschreibung eines neueren Releases.

### Beschädigte produktive Daten / D1

Sofort schreibende Zugänge begrenzen, Zeitpunkt und betroffene Konten protokollieren und **keine** automatischen Backups überschreiben. Ein Restore ist erst möglich, wenn ein verifizierter D1-Export und die offizielle Hosting-Import-/Restore-Funktion vorliegen. Diese Plattformfunktion ist in der aktuellen Umgebung nicht verfügbar und wurde deshalb nicht erfunden.

## Disaster Recovery und Kontoabsicherung

- GitHub: einzigartiges Passwort, Passkey oder MFA, Recovery-Codes offline, mindestens ein zweiter Repository-Administrator und geschützte `main`-Regeln/Reviews aktivieren.
- OpenAI/Codex: MFA oder die optionale Advanced Account Security aktivieren; zwei Passkeys/Sicherheitsschlüssel sowie Recovery-Material getrennt sichern. Die Einstellung schützt die gemeinsame ChatGPT-/Codex-Anmeldung.
- Hosting: nur erforderliche Administratoren, Secrets ausschließlich in der Hosting-Secretverwaltung, Zugriffsprotokolle prüfen.
- iCloud/Apple: Apple-ID mit MFA, Wiederherstellungskontakt und getrenntem verschlüsseltem Vault. Codex hat keinen direkten iCloud-Drive-Zugriff.
- Bei veröffentlichtem Secret: Zugang sofort in der jeweiligen Plattform widerrufen/rotieren, Logs und Git-Historie prüfen, betroffene Deployment-Berechtigungen erneut ausstellen. Das Secret nie in einen Commit schreiben.

## Regelmäßige Prüfung

`npm test` enthält Sicherheitschecks für Zugangsschutz, Header, Rate Limits, Cache-Grenzen und bekannte Secret-Muster in der Git-Historie. Der Test ist kein vollständiger Penetrationstest. Vor einer breiteren Produktion empfiehlt sich eine unabhängige Security- und Datenschutzprüfung sowie ein dokumentierter D1-Backup/Restore-Test.
