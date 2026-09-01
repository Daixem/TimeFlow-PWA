# TimeFlow Einzelnutzung – Beta-Freigabe

## Für den Test freigegeben

- Eigener Dienstplan per Bild, PDF, CSV, Text, JSON oder Kalenderdatei
- Prüfen, Korrigieren und ausdrücklich Bestätigen vor der Übernahme
- Manuelle Dienstplaneingabe und mehrere aufeinanderfolgende Importe
- Freie Tage und Abwesenheiten mit leerem Feld, A, F, Frei, Off, U/Urlaub und K/Krank
- Tages-, Wochen- und Zeitraumansicht einschließlich Nachtschichten
- Ein- und Ausstempeln mit Sicherheitsabfrage und optionalem Pausenstatus
- Monatliche Sollstunden je Nutzer und Monatsarchiv
- Automatisches Monatsplus oder -minus aus Stempelungen und Korrekturen
- Korrigieren und Löschen von Arbeitszeiten mit Änderungsverlauf
- CSV- und druckbarer PDF-Export
- Geschützte Kontosynchronisierung, Datensicherung und Löschung synchronisierter App-Daten
- Schicht- und Ausstempelerinnerungen bei aktiver oder erneut geöffneter PWA
- Teammodus ausschließlich nach serverseitig geprüfter Unternehmenseinladung

## Bewusste technische Grenzen der Testphase

- Bilderkennung ist eine Hilfsfunktion. Jeder erkannte Eintrag muss vor der Übernahme kontrolliert werden.
- Eine vollständig beendete iOS-PWA kann ohne externen Push-Dienst keine garantierte zeitgesteuerte Meldung erhalten.
- Anmeldung und Geräteschutz erfolgen in der geschützten Beta über die Hosting-Plattform und die dort verfügbaren Konto- beziehungsweise Geräteverfahren. Eine eigene TimeFlow-Anmeldung mit separaten Google-, Apple- und Passkey-Schlüsseln ist ein späterer Infrastrukturschritt.
- Diese Beta-Hinweise ersetzen keine abschließende juristische Prüfung für einen öffentlichen Produktbetrieb.

## Empfohlene Testfälle

1. PWA auf iPhone, iPad, Android, Windows und macOS installieren beziehungsweise im Browser öffnen.
2. Einen Dienstplan als Foto und einen weiteren als PDF importieren und beide vor der Übernahme korrigieren.
3. Freie Tage, Urlaub, Krankheit und eine Nachtschicht kontrollieren.
4. Ein- und ausstempeln, eine Pause starten und beenden sowie einen Eintrag korrigieren.
5. Monatssoll ändern und Monatsplus beziehungsweise -minus prüfen.
6. CSV und PDF exportieren, anschließend ein zweites Gerät synchronisieren.
7. Lokale Datensicherung erstellen und Cloud-Datenlöschung prüfen.
8. Sicherstellen, dass Teamfunktionen ohne Unternehmenseinladung nicht erreichbar sind.
