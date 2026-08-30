# TimeFlow – Geräte- und Betriebssystem-Kompatibilität

Stand: Version 1.0.1, Build 0034

Realer Gerätestatus: **iPhone vollständig abgenommen. Auf dem iPad funktionieren App und Darstellung; die dauerhafte lokale Speicherung muss im installierten PWA-Kontext noch bestätigt werden.**

## Unterstützte Plattformen

| Geräteklasse | Betriebssystem | Browser / Nutzung | Zielstatus |
| --- | --- | --- | --- |
| Smartphone | iOS / iPhoneOS | Safari und installierte PWA | Voller aktueller Funktionsstand |
| Tablet | iPadOS | Safari und installierte PWA | Voller aktueller Funktionsstand |
| Smartphone / Tablet | Android | Chrome, Edge und installierte PWA | Voller aktueller Funktionsstand |
| Desktop / Notebook | Windows | Edge, Chrome und installierte PWA | Voller aktueller Funktionsstand |
| Desktop / Notebook | macOS | Safari, Chrome, Edge und installierte PWA | Voller aktueller Funktionsstand |
| Desktop / Notebook | Linux | Chrome, Edge oder Firefox im Browser | Voller aktueller Funktionsstand; Installation abhängig vom Browser |

Unterstützt werden die jeweils aktuellen stabilen Hauptversionen der genannten
Betriebssysteme und Browser sowie deren unmittelbare Vorgängerversion. Sehr alte
Browser ohne moderne PWA-, Service-Worker- oder Dialog-Unterstützung gehören
nicht zur verbindlichen Zielmatrix.

## Verbindliche Funktionsgleichheit

Auf allen Zielplattformen werden geprüft:

- Start, Anmeldung beziehungsweise Demo-Sitzung und Modusauswahl
- Home, Dienstpläne, Stempeln, Chat und Profil
- Privat- und Teammodus
- lokale Speicherung mit sicherem Sitzungsspeicher-Fallback
- Touch-, Maus- und Tastaturbedienung
- Hoch- und Querformat von Smartphone und Tablet
- Offline-App-Shell, Updatewechsel und Rückkehr aus dem Hintergrund
- Installation beziehungsweise plattformspezifische Installationsanleitung
- sichere Bereiche, Bildschirmtastatur und responsive Dialoge

## Plattformbedingte Unterschiede

- iOS und iPadOS zeigen keinen automatischen Installationsdialog. Die
  Installation erfolgt in Safari über **Teilen → Zum Home-Bildschirm**.
- Firefox kann die Web-App vollständig ausführen; eine eigenständige
  PWA-Installation hängt von Betriebssystem und Browserversion ab.
- Gerätebenachrichtigungen benötigen immer die ausdrückliche Berechtigung des
  Nutzers und können durch Betriebssystemrichtlinien eingeschränkt sein.
- Ohne verfügbaren dauerhaften Browserspeicher bleibt TimeFlow in der aktuellen
  Sitzung nutzbar; dauerhafte Daten benötigen dann Backup oder Cloud-Abgleich.

## Freigaberegel

Neue Funktionen dürfen erst nach einem erfolgreichen Test der gesamten
Gerätematrix als abgeschlossen gelten. Ein bestandener iPhone-Test allein reicht
nicht mehr für die Sprint-Abnahme.
