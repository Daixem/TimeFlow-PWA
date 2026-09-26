# TimeFlow – Phase F: Retention-Entwurf

Stand: 26. September 2026

Status: **ZUR FACHLICHEN FREIGABE – NICHT IMPLEMENTIERT**

## Zweck

Dieser Entwurf legt eine einheitliche Aufbewahrungs- und Löschregel für die
serverseitige Arbeitszeit fest. Bis zur Freigabe werden weder Migrationen noch
Löschläufe ausgeführt. Produktion und produktive Daten bleiben unverändert.

## Empfohlene Regel

### Organisationsgebundene Arbeitszeit

- `timeflow_work_time_sessions` und die zugehörigen Journal-Ereignisse bleiben
  bis zum Ende des 24. Monats nach dem jeweiligen Arbeitszeitdatum
  identifizierbar gespeichert.
- Danach werden die Daten innerhalb von 30 Tagen gelöscht.
- Eine längere Speicherung ist nur mit einem dokumentierten Grund und einem
  konkreten Enddatum zulässig, etwa für einen Rechtsstreit oder eine behördliche
  Prüfung. Ein solcher Legal Hold sperrt nur die betroffenen Datensätze.
- Kontolöschung oder Organisationsaustritt beendet den normalen Kontozugriff,
  löscht aber noch aufbewahrungspflichtige Team-Arbeitszeiten nicht vorzeitig.
- Nach Ablauf der Frist werden Current-State, Sessions und Journal gemeinsam
  bereinigt. Verwaiste Journal- oder Session-Datensätze sind unzulässig.

Das Arbeitszeitgesetz verlangt für die dort erfassten Nachweise mindestens zwei
Jahre Aufbewahrung. Für bestimmte Beschäftigte und Branchen nennt auch das
Mindestlohngesetz mindestens zwei Jahre. Die vorgeschlagene Monatsgrenze macht
den Löschtermin vorhersehbar, ohne eine unbegrenzte Speicherung einzuführen.

### Private Arbeitszeit

- Solange das private Konto aktiv ist, bleiben die Daten für die vom Nutzer
  angeforderte Zeiterfassung verfügbar.
- Bei einer Cloud-Kontolöschung werden Current-State, Sessions, Journal und die
  direkte Kontozuordnung innerhalb von 30 Tagen gelöscht.
- Besteht ausnahmsweise ein dokumentierter Legal Hold, wird die Löschung nur für
  die konkret betroffenen Datensätze und nur bis zu dessen Enddatum ausgesetzt.
- Lokale Daten auf dem Endgerät werden getrennt behandelt und nur durch eine
  ausdrücklich ausgelöste lokale Löschfunktion entfernt.

Für rein private Daten besteht im Produkt keine Arbeitgeber-Aufbewahrung. Die
DSGVO-Speicherbegrenzung spricht deshalb gegen eine pauschale zweijährige
Weiterhaltung nach der Kontolöschung.

### Current-State

- Ein laufender Current-State bleibt erhalten, solange eine Schicht offen ist.
- Nach `CLOCK_OUT` bleibt er als Lesemodell verfügbar, solange das Konto aktiv
  ist und die zugehörigen Sessions noch innerhalb ihrer Frist liegen.
- Bei Löschung wird Current-State erst entfernt, nachdem eine offene Schicht
  eindeutig abgeschlossen oder als Abbruch protokolliert wurde.

### Backups und Exporte

- D1 Time Travel folgt der vom Cloudflare-Tarif vorgegebenen Frist; aktuell sind
  das bis zu 30 Tage im Paid- und 7 Tage im Free-Tarif.
- Manuelle SQL-Exporte werden verschlüsselt, zugriffsbeschränkt und spätestens
  nach 30 Tagen gelöscht, sofern sie nicht zu einem dokumentierten Restore-Test
  mit kürzerem Enddatum gehören.
- Ein Restore darf gelöschte Datensätze nicht dauerhaft wieder aktivieren. Nach
  einem Restore muss der Löschlauf anhand seiner Protokolle erneut ausgeführt
  werden.

## Technische Konsequenzen

1. Jeder Arbeitszeitdatensatz benötigt einen Modus `private` oder `organization`.
2. Teamdaten benötigen eine echte `organization_id`; private Daten behalten
   `organization_id = NULL`.
3. Für Teamdaten ist zusätzlich eine organisationsinterne, stabile
   Personenreferenz nötig. Eine erfundene Default-Organisation ist verboten.
4. Legal Holds benötigen Grund, Ersteller, Start- und Endzeit; offene Holds ohne
   Enddatum sind unzulässig.
5. Der normale Worker darf das Journal weiterhin weder ändern noch löschen.
   Ein separater, serverseitig autorisierter Retention-Lauf darf ausschließlich
   fällige Datensätze nach dokumentierter Prüfung bereinigen.
6. `DELETE /api/account-data` muss künftig zwischen privaten Daten und noch
   aufbewahrungspflichtigen Teamdaten unterscheiden und das Ergebnis sichtbar
   zurückgeben.
7. Jeder Löschlauf benötigt ein minimales, personenbezugsfreies Protokoll mit
   Lauf-ID, Regelversion, Zeitraum, Anzahl und Ergebnis.

## Freigabekriterien

- Die 24-Monats-Regel und die 30-Tage-Ausführungsfrist sind fachlich bestätigt.
- Abweichende Branchen- oder Tarifregeln können organisationsbezogen ergänzt
  werden, ohne die globale Mindestregel still zu verändern.
- Datenschutzinformation und Auftragsverarbeitung beschreiben Verantwortliche,
  Zweck, Frist, Löschung, Legal Hold und Backups konsistent.
- Erst danach dürfen Tenant- und Retention-Migration als Testentwurf entstehen.

## Quellenbasis

- [§ 16 Abs. 2 Arbeitszeitgesetz](https://www.gesetze-im-internet.de/arbzg/__16.html):
  mindestens zwei Jahre für die dort genannten Arbeitszeitnachweise.
- [§ 17 Abs. 1 Mindestlohngesetz](https://www.gesetze-im-internet.de/milog/__17.html):
  mindestens zwei Jahre für die dort erfassten Beschäftigten und Branchen.
- [Art. 5 Abs. 1 Buchstabe e DSGVO](https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=CELEX%3A32016R0679):
  personenbezogene Daten nicht länger als für den Zweck erforderlich
  identifizierbar speichern.
- [Art. 17 DSGVO](https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=CELEX%3A32016R0679):
  Löschung bei erfülltem Zweck, vorbehaltlich fortbestehender Rechtsgrundlagen
  und Ausnahmen.
- [Cloudflare D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/):
  30 Tage im Workers-Paid- und 7 Tage im Free-Tarif.
