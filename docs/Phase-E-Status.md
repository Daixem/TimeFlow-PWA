# TimeFlow Pre-Production – Phase E

Stand: 26. September 2026

Status: **IN BEOBACHTUNG**

## Umfang

Phase E prüft die Wiederherstellbarkeit der Test-D1, mobile Layouts und den
stabilen Pre-Prod-Betrieb. Ein produktiver Cutover ist nicht Bestandteil
dieser Phase.

## Test-D1-Backup und Restore

- Exportquelle: `timeflow-migration-test-20260917`
- Quell-ID: `4826b07d-8a23-4098-80d7-ee6a6469bcab`
- Frisches Restoreziel: `timeflow-phase-e-restore-20260926`
- Restore-ID: `c2e61847-7edd-40ac-89ad-57b80756a353`
- Exportgröße: `49.345` Byte
- SHA-256: `10cfdb543d6c85c173fe067ee441fb2a0eb084ad3c08128ffc87595e58254456`
- Import: 76 Abfragen erfolgreich; 206 Zeilen geschrieben

Quelle und Restoreziel haben unterschiedliche IDs. Das ältere Restoreziel
`timeflow-migration-restore-20260917` blieb unverändert. Der SQL-Export lag
nur im lokalen temporären Verzeichnis und wurde nicht versioniert.

Der Vergleich nach dem Import ergab auf beiden Seiten:

| Objekt | Anzahl |
| --- | ---: |
| Tabellen | 9 |
| Indizes | 3 |
| Trigger | 6 |
| Current-Zeilen | 8 |
| Journal-Zeilen | 34 |
| Session-Zeilen | 10 |
| Beta-Access-Zeilen | 4 |
| Sync-Zeilen | 1 |

Zusätzlich stimmen Revisionssummen, Zeitgrenzen, Offline-Ereignisse und
Session-Minuten überein. UPDATE und DELETE im Journal wurden im Restoreziel
durch die Append-only-Trigger abgewiesen. Eine doppelte Kombination aus
`user_id` und `end_revision` wurde durch die Session-Unique-Constraint
abgewiesen.

## Android-Emulation

- Smartphone-Viewport: `412 × 915`
- Tablet-Viewport: `800 × 1280`
- Geprüft: Home, Profil, Navigation, Arbeitszeitstatus und Kartenlayout
- Ergebnis: keine sichtbaren Überläufe, abgeschnittenen Bedienelemente oder
  blockierenden Layoutfehler

Die Emulation ist ein Layoutnachweis. Installation, Service-Worker-Verhalten,
Offline-Start und Betriebssystemintegration auf echter Android-Hardware bleiben
bis zu einem verfügbaren Testgerät **PARTIAL**.

## Beobachtungsphase

- Worker: `timeflow-preprod`
- Zeitraum: 26. September 2026, 00:40 Uhr bis 28. September 2026, 00:40 Uhr
  Europe/Berlin
- Automatisierung: `timeflow-phase-e-beobachten`
- Erste Stichprobe: 834 HTTP-200-Antworten, eine HTTP-404-Antwort, keine 5xx
  und ausschließlich Worker-Outcome `ok`

Die Automatisierung prüft alle sechs Stunden Worker-Fehler, 5xx, D1-Fehler,
auffällige 403/409 sowie Pending-/Reconnect-Fehler. Sie meldet sich nur bei
einer Verschlechterung oder mit dem Abschlussbericht.

## Status

| Prüfung | Status | Ergebnis |
| --- | --- | --- |
| Getrennte Quell- und Restore-D1 | **PASS** | IDs geprüft; frisches Restoreziel verwendet. |
| Vollständiger Test-D1-Export | **PASS** | Größe und SHA-256 dokumentiert; keine Ablage im Repository. |
| Remote-Restore | **PASS** | Export vollständig und ohne Fehler importiert. |
| Schema, Trigger und Zeilenzahlen | **PASS** | Quelle und Restoreziel stimmen überein. |
| Append-only und Session-Unique | **PASS** | Schreibversuche wurden erwartungsgemäß abgewiesen. |
| Android-Smartphone-Layout | **PASS** | Emulation mit 412 × 915 ohne sichtbaren Layoutfehler. |
| Android-Tablet-Layout | **PASS** | Emulation mit 800 × 1280 ohne sichtbaren Layoutfehler. |
| Echter Android-PWA-Test | **PARTIAL** | Kein Android-Testgerät verfügbar. |
| 48-Stunden-Beobachtung | **PARTIAL** | Läuft bis 28. September 2026, 00:40 Uhr. |
| Produktiver Cutover | **BLOCKED** | Retention und Organisationszuordnung sind noch nicht verbindlich festgelegt. |

Produktion, produktive D1, produktive Bindings und produktive Feature-Gates
wurden nicht verändert.
