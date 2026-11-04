# TimeFlow – Projektübergabe für Codex Cloud

**Stand:** 4. November 2026
**Repository:** `Daixem/TimeFlow-PWA`
**Verbindlicher Zweig:** `main`
**Code-Stand vor dieser Dokumentation:** `53a114a` (`Keep recovery copies during schedule sync merges`)
**App-Version im Paket:** `1.0.1`

### Nachprüfung am 4. November 2026

Nach Erstellung dieser Übergabe wurde `main` mit GitHub abgeglichen. Der
aktuelle Repository-Stand ist `28c7317`, sauber und identisch mit
`origin/main`. Zwei ältere Quellkopien wurden nach einem Vergleich unverändert
unter `TimeFlow-Legacy-Archive` außerhalb des offiziellen Repositorys
aufbewahrt. Die Details zum aktuellen Hosting-, Worker- und Backup-Stand stehen
in [docs/Status-2026-11-04.md](docs/Status-2026-11-04.md).

Diese Übergabe fasst den bisherigen Projektverlauf zusammen und gleicht ihn mit dem Repository sowie den beim letzten Abgleich erreichbaren Veröffentlichungen ab. Sie enthält bewusst keine Zugangsdaten, privaten Kontodaten, echten Dienstplandaten oder persönlichen Arbeitszeitwerte. Die Datei ist für das öffentliche Repository bestimmt.

## Arbeitsregeln und feste Nutzerwünsche

- Ausschließlich im offiziellen Repository `Daixem/TimeFlow-PWA` auf `main` arbeiten. Keine parallelen Entwicklungszweige oder alternativen Veröffentlichungsquellen aufbauen.
- `main` soll die einzige maßgebliche Quelle sein. Ziel ist, dass ein Push nach `main` automatisch Oberfläche **und** Serverfunktionen aktualisiert und alle angemeldeten Geräte denselben Stand beziehen.
- Zugangsdaten, private Schlüssel, Nutzer- und Arbeitszeitdaten gehören nie in GitHub. Sie bleiben in geschützten Hosting-Umgebungen und Datenbanken.
- Produktive Daten vor Migrationen oder Änderungen erst vollständig sichern und eine Wiederherstellung in einer getrennten Datenbank nachweisen. Ohne verifizierten Export nicht behaupten, es gebe ein vollständiges Backup.
- Der Nutzer möchte keine wiederholten allgemeinen Freigabeanfragen. Bereits erteilte Freigaben zur Veröffentlichung gelten. Kosten, echte Zugangsänderungen und nicht rückgängig zu machende Änderungen bleiben davon unberührt.
- Erklärungen sollen kurz, verständlich und ohne unnötige Fachwörter sein. Nach Arbeitsschritten kurz sagen, was geändert wurde, was neu ist und was noch aussteht.
- Keine Store-Veröffentlichung zum aktuellen Startumfang. Die App soll zunächst als PWA erreichbar sein.

## Produkt und beschlossene Richtung

TimeFlow ist für persönliche Zeiterfassung, Dienstpläne und Arbeitsabläufe gedacht. Einzelpersonen sollen eigene Dienste verwalten können; eine einzelne Person soll andere zu einem persönlichen Team einladen können. Eine Firmenverwaltung ist für den ersten offenen Start nicht vorgesehen.

Der Nutzer möchte die Beta-Sperre später entfernen und die PWA offen zugänglich machen. Das darf erst geschehen, wenn Anmeldung, Kontozuordnung, private Daten und Teamrechte sicher funktionieren. Bestehende Administratorkonten müssen dabei erhalten bleiben; Konten dürfen nicht allein anhand einer unbestätigten E-Mail-Adresse zusammengeführt werden.

Mehrere Anmeldemöglichkeiten wurden gewünscht: zunächst E-Mail-Code und Google, Apple später. Im aktuellen Code ist dieser Wechsel noch nicht als abgeschlossene Anmeldung umgesetzt; die gehostete Connect-Version nutzt weiterhin die Plattform-Anmeldung. Der Phoenix bleibt das Logo, soll aber nicht den Produktnamen bestimmen. Ein neuer Name ist noch nicht beschlossen oder rechtlich freigegeben. `TimeFlow` bleibt im Code und im Branding vorerst der Arbeitsname. Kandidaten wie Shiftelo sowie Dixor/Dixora wurden diskutiert; daraus folgt keine bestätigte Markenfreigabe.

## Repository und technische Orientierung

### Zentrale Dateien

- `index.html`: App-Shell, Startansicht, Profil-/Navigationsbereiche und Modul-Einbindung.
- `js/script.js`, `js/shell.js`, `js/sprint*.js`: Home, Dashboard, Kalender, Team- und Profilabläufe.
- `js/private-schedule-import.js`: Dienstplanimport, OCR-/Textauswertung, Importprüfung, Korrekturen, persönliche und Kollegenschichten, Wochen-/Monatsansicht und Lernregeln.
- `js/stamp.js`, `js/work-time-api.js`: Stempeln und Verbindung zur Arbeitszeit-API.
- `js/sync-conflict.js`, `js/sprint9.js`: Kontosynchronisierung und Konfliktbehandlung.
- `js/private-account.js`, `js/backup-data.js`: Arbeitszeitkonto, Nutzerdaten-Export und Wiederherstellung auf App-Ebene.
- `js/private-reminders.js`, `js/sprint7.js`: Gerätebenachrichtigungen und Push-Verhalten.
- `js/private-beta-access.js`, `js/platform.js`: Plattform-Anmeldung, Beta-/Kontozugriff und Plattformanbindung.
- `scripts/build-sites.mjs`: baut das Server-Worker-Paket in `dist/server/`; dort liegen API, Synchronisierung, Autorisierung und Datenbankzugriffe.
- `scripts/build-pages.mjs`: erzeugt das statische GitHub-Pages-Paket in `_site/`.
- `sw.js`: Service Worker, Offline-App-Shell, Cache-Versionierung und Push-Empfang.
- `drizzle/*.sql`: Datenbankmigrationen. Historische Test-Restore-Nachweise stehen in `docs/D1-Backup-Restore.md`.
- `.github/workflows/deploy-pages.yml`: automatischer GitHub-Pages-Release bei Push auf `main`.
- `.openai/hosting.json`: verweist auf das bestehende ChatGPT-Sites-Projekt und dessen Datenbankbindung; keine Geheimnisse eintragen.

### Versions- und Veröffentlichungsstand

Der Arbeitsbaum war vor Erstellung dieser Datei sauber und `main` entsprach `origin/main` auf Commit `53a114a`. Die Änderungen in diesem Auftrag sollen ausschließlich `TIMEFLOW_CONTEXT.md` betreffen.

GitHub Pages veröffentlicht bei Push auf `main` automatisch die statische PWA. Der Workflow prüft in CI die App und den Build und erzeugt `version.json` mit Commit- und Buildinformation. Die Prüfung wurde für diesen Übergabeauftrag nicht ausgeführt.

Die iPhone-PWA und die Mac-PWA wurden im Gespräch beide über `https://timeflow-connect.daixem.chatgpt.site/` geöffnet. Der Sites-Worker enthält in `scripts/build-sites.mjs` `latestMainAsset()`: statische App-Dateien werden grundsätzlich von GitHub Pages (`main`) geholt; `/api/*` und `/version.json` werden davon ausgenommen. Navigation und Service-Worker-Datei werden gegen veraltete HTTP-Caches abgesichert. Das erklärt, warum die Oberfläche auf Connect schon aktuell sein kann, obwohl der Server hinter Connect älter ist.

**Die vollständige Veröffentlichung ist dennoch nicht vereinheitlicht:** Connect-Anmeldung, API und verwaltete Datenbank werden als ChatGPT Site separat verwaltet. Beim letzten Abruf meldete die Sites-Verwaltung Version 102, zuletzt geändert am 23. Oktober 2026; ihr Quell-Commit lag nicht im lokalen `main`. Änderungen an `scripts/build-sites.mjs` werden durch den GitHub-Pages-Workflow nicht automatisch auf diese Site veröffentlicht. Im verbundenen eigenen Cloudflare-Konto waren `timeflow-preprod`, `timeflow-push-scheduler` und ein isolierter Gate-Test-Worker vorhanden, aber kein nachgewiesener produktiver TimeFlow-Worker. Die dortigen D1-Datenbanken sind Test-/Recovery-Kopien, nicht die aktive Sites-Datenbank.

## Funktionen, die der Code bereits enthält

### PWA und Bedienoberfläche

- Installierbare PWA mit Manifest, Phoenix-Logo, Home, Dienstplänen, Schnellzugriff, Benachrichtigungen und Profil.
- Responsive Styles und gerätespezifische Anpassungen für Mobilgeräte, Tablets und Desktop.
- Einstellbare Darstellung einschließlich Hintergrund-/Theme-Farben, angepasster Schrift und reduzierter Animationen.
- Individuelle Hintergrundfarbe und Hintergrundbild sind in der Personalisierung vorgesehen; Kontrastfarben werden über Theme-Variablen angepasst.
- Arbeits- und Jugendschutz-Hinweise werden aus den Diensten vorgeprüft; der Nutzer wünschte eine kompakte, übersichtliche Darstellung statt einer langen unstrukturierten Meldungsliste.
- Support-/Feedback-Abläufe und eine Update-Übersicht sind im Code enthalten.
- Service-Worker-Cache mit Buildkennung, kontrolliertem Update und Offline-App-Shell. API-Antworten werden ausdrücklich nicht im Service-Worker-Cache gespeichert.
- App-Versionen werden in `release-notes.json` beschrieben; Benachrichtigungsdetails können geöffnet und nach dem Öffnen ausgeblendet werden.

### Dienstpläne und Erkennung

- Import unterstützt laut Code PNG, JPG, WEBP, PDF, CSV, TXT, JSON und ICS. HEIC/HEIF wird ausdrücklich nicht unterstützt und muss vorab als JPG/PNG exportiert werden.
- Bild-OCR läuft mit mitgeliefertem Tesseract und deutscher Sprache; PDF-Text wird über PDF.js gelesen.
- Es gibt getrennte Erkennungspfade für persönliche Wochenpläne und zusammengefasste Kollegentabellen. Der Import lässt Name, Schicht, Datum, Zeiten und Zuordnung „mein Dienst/Kollegenschicht“ vor der Übernahme korrigieren.
- Persönliche Dienste und Kollegenschichten werden in derselben Wochenübersicht mit Datum, Person, Schicht und Uhrzeit angezeigt.
- Import und manuelle Eingabe kennen `Frei`, `Krank` und `Urlaub`; freie Tage brauchen keine künstlichen `00:00–00:00`-Zeiten.
- Korrekturen an Kürzeln, Schichtnamen und wiederkehrenden Uhrzeiten werden als Lernregeln gespeichert. Der Schlüssel ist kontobezogen und ist in der Synchronisierung freigegeben.
- Wochenberechnung verwendet Montag als Wochenanfang. Für geplante freie Tage wurde ein Tagesziel von null ergänzt.

### Arbeitszeit und Abwesenheit

- Stempelablauf mit rotem/grünem Status, automatischer Pause, Live-Zeit und Verbindung zum Arbeitszeitkonto.
- Arbeitszeitkonto enthält Zeitkonto-/Korrekturdaten und eine serverseitige Arbeitszeitstruktur mit aktuellem Stand, Journal und Sessions.
- Es gibt JSON-Sicherungen/Wiederherstellung für App-Daten sowie CSV-/PDF-Ausgabe im Arbeitszeitkonto.
- Fachliche Regeln für Krankheit, Urlaub, Feiertage, Sollzeit und Minusstunden müssen verlässlich und transparent umgesetzt sein. Einträge `Frei/Krank/Urlaub` sind im Import vorhanden; die vollständige fachliche Abnahme ihrer Anrechnung ist nicht nachgewiesen.
- Arbeitszeit- und Aufbewahrungsanforderungen sind weiterhin kein Ersatz für eine verbindliche Lohnabrechnung. Gesetzliche Retention, Löschung und Anonymisierung sind als eigene Entscheidungen zu behandeln.

### Teams und Kommunikation

- Der Team-/Organisationscode enthält Einladungen, Mitgliedschaften/Rollen, getrennte Organisationsdaten, Teamchat, Chat-Lesezustände und gemeinsame Schichtdaten.
- Der persönliche Modus konzentriert sich auf die eigenen Dienste; Kollegenschichten werden kontobezogen zusammen mit dem eigenen Dienstplan dargestellt.
- Nutzer wollten dieselben personenbezogenen Daten auf Mac, iPhone und iPad sehen. Persönlicher Dienstplan, Kollegenschichten und Lernregeln sind in der Sync-Whitelist.
- Team- und persönliche Daten müssen serverseitig voneinander getrennt bleiben. Eine bestätigte Einladung/Mitgliedschaft ist maßgeblich, nicht der Clientmodus.
- Der Startumfang soll persönliche Teams mit Einladungen erlauben; eine umfangreiche Firmenverwaltung ist vorerst nicht gewünscht.

### Benachrichtigungen

- Lokale Hinweise, Benachrichtigungskategorien und Detailansichten sind vorhanden.
- Web Push ist im Service Worker eingebaut. Servercode enthält Versand-/Registrierungswege für Teamchat, Dienstplanänderungen, Update-Hinweise und Schichterinnerungen.
- Schichterinnerungen sind für 30 Minuten vor Dienstbeginn angelegt. Der Push-Scheduler läuft minütlich; Zeitzone soll aus dem Dienstplan kommen, und fehlende Zeitzonen dürfen nicht stillschweigend als UTC behandelt werden.
- Der Nutzer bestätigte, dass ein Push-Test ankam, als der Fokusmodus ausgeschaltet war. Eine frühere Schichterinnerung kam verspätet an; später wurde berichtet, dass die PWA die Erinnerung korrekt eine halbe Stunde vorher anzeigt. Eine lückenlose reale Zustellprüfung für Chat, Dienstplanänderung und mehrere Geräte ist nicht bestätigt.
- Einstellungen sollen alle Pushs ausschalten oder nur ausgewählte Kategorien zulassen. Der Nutzer möchte Hinweise beim Dienstbeginn, bei Chatnachrichten, Dienstplanänderungen und App-Updates.

### Kontosynchronisierung und lokale Daten

- Der Server synchronisiert ausdrücklich freigegebene Schlüssel pro authentifiziertem Konto; Team-/Arbeitszeit-APIs nutzen serverseitige Nutzer- und Organisationsprüfungen.
- Der Client kann Konflikte über einen Drei-Wege-Abgleich für persönliche Dienste und zusammengeführte Kollegenschichten auflösen.
- Bis zu drei frühere persönliche/kollegiale Dienstplanstände werden im synchronisierten Wiederherstellungsschlüssel aufbewahrt.
- Die Synchronisierung ist **nicht** gleichbedeutend mit „keine lokalen Daten“: Die App nutzt weiterhin Browser-/PWA-Speicher als Arbeits- und Offline-Kopie. Der Nutzer wünscht, dass Kontodaten auf allen Geräten automatisch gleich sind und lokal höchstens bis zur nächsten Internetverbindung warten. Eine dauerhafte, konfliktfreie Gleichheit auf allen Geräten ist nicht nachgewiesen.
- Es gab wiederholt den Hinweis „Daten auf einem anderen Gerät geändert“ und auf dem iPhone fehlende bzw. alte Einträge. Der Mac zeigte beim letzten UI-Abgleich in KW 45 die kombinierte Wochenübersicht; das iPhone konnte in dieser Sitzung nicht direkt überprüft werden.

### Sicherheit und Datenaufbewahrung

- Plattformidentität, Administratorstatus, Teammitgliedschaft und Beta-Zugriff werden serverseitig geprüft; API nutzt gebundene Datenbankparameter.
- Einladungs-Tokens werden gehasht gespeichert. Berechtigungen werden nicht allein aus lokalem Browserzustand abgeleitet.
- Service-Worker speichert keine persönlichen API-Antworten.
- Für wiederherstellbare Arbeitszeitdaten bestehen Tabellen/Migrationen, Retention- und Account-Löschregeln sind aber noch nicht vollständig für den späteren öffentlichen Produktbetrieb freigegeben.
- Niemals echte Zeitpläne, Chatnachrichten, E-Mail-Adressen, Account-IDs, Fingerprints, Push-Token, VAPID-/Cron-Secrets oder OAuth-Daten in diese Datei oder sonstige öffentliche Git-Dateien übernehmen.

## Bekannte Fehler und offene Nutzerberichte

Die folgenden Punkte sind **Nutzerberichte**, keine bestätigte Aussage, dass der aktuelle Code sie noch immer reproduziert. Sie dürfen erst nach einem realen Geräte- oder End-to-End-Nachweis als behoben markiert werden.

1. **iPhone zeigt alten/falschen Dienstplan:** berichtete alte Tabellenansicht, keine Kollegenschichten, persönliche Tage fälschlich als frei und Kalender springt nicht zur aktuellen Woche. Mac und iPhone verwenden denselben Connect-Link; Mac zeigte im letzten Zugriff die neue kombinierte Tabelle. iPhone-Fix ist nicht verifiziert.
2. **Dienstplanimport übersieht Dienste:** trotz digital lesbarem Plan fehlten insbesondere Wochenanfangstage bzw. Kollegendienste; Samstag konnte beim freien Wochenende fehlen. OCR muss alle sieben Datumsfelder und alle Person-/Schichtzeilen korrekt zuordnen und Unsicherheit sichtbar machen, statt still Dienste zu verwerfen.
3. **Frei-/Abwesenheitserkennung:** leere Felder, freie Tage, Krankheit und Urlaub müssen klar unterschieden werden. Ein fehlender Eintrag darf nicht ohne sichere Regel in einen Dienst oder in eine falsche Arbeitszeit umgerechnet werden.
4. **Arbeitszeitkonto/Tagesziel:** der Nutzer meldete eine fehlerhafte Berechnung nach Stempelkorrektur sowie einen aktiven Tageszielwert an einem freien Tag. Es gab zusätzlich einen Fall mit einem unerklärten sehr kurzen Stempelvorgang an einem freien Tag. Keine individuellen Zeiten stehen hier aus Datenschutzgründen. Die Anwendung muss sicherstellen, dass nicht ohne bewusste Nutzeraktion gestempelt wird und dass freie Tage kein falsches Tagesziel erzeugen.
5. **Gleichheit der Kontodaten:** Änderungen am Mac waren dort und zeitweise auf dem iPhone unterschiedlich sichtbar; Konfliktbehandlung und Neuabgleich wurden in `fc232cc`/`53a114a` ergänzt, aber das konkrete iPhone-Problem ist offen.
6. **Externe Pushs:** Fokusmodus verhinderte eine beobachtete Zustellung; nach Deaktivierung kam der Push-Test an. Verspätete Erinnerungszustellung wurde ebenfalls gemeldet. Versandantwort des Servers ist kein Zustellbeweis; reale Anzeigezeit und geplanter Zeitpunkt müssen geprüft werden.
7. **PWA-Start/Update:** doppeltes Phoenix-/Homescreen-Starten wurde berichtet. Der Startablauf hat Code und eine Testdatei; erneute Abnahme auf iOS ist offen.
8. **Geräteübergreifende Darstellung:** responsive Anpassungen existieren, aber keine aktuelle vollständige Abnahme auf iPhone, iPad, Android, macOS, Windows und Linux liegt für den jetzigen Stand vor.
9. **PDF-Export unter macOS:** wurde mit einer macOS-Fehlermeldung beim Öffnen eines Programms gemeldet. Druck-/PDF-Ausgabe muss auf Safari/macOS geprüft werden; die frühere Behebung ist nicht in dieser Übergabe erneut validiert.
10. **Design:** Nutzer verlangt ein einheitliches Theme über alle Dialoge, Karten, Tabellen, Buttons und Benachrichtigungen. Bestehende Theme-Token und Korrekturen sind vorhanden, aber vollständige Sichtprüfung aller Ansichten ist nicht abgeschlossen. Der kräftige rote/grüne Stempelbutton soll ausdrücklich erhalten bleiben.

## Datenbanksicherung und Migrationsstatus (kritischer Blocker)

- Die aktive Connect-Datenbank ist an das ChatGPT-Sites-Projekt gebunden und nicht identisch mit der Test-D1 `timeflow-preprod`.
- Der ChatGPT-Sites-Bereich **Sites → TimeFlow Connect → Weitere Aktionen → Einstellungen → Datenbank** zeigt Tabellen und Seitenwechsel, aber keinen vollständigen SQL-Exportknopf.
- Die verfügbare Datenzeilen-Schnittstelle liefert begrenzte Seiten. Beim Test der großen `timeflow_user_sync`-Nutzlast wurde ein Feld abgeschnitten und war kein gültiges vollständiges JSON. Ein Export über diese Ansicht wäre daher nicht zuverlässig.
- In der eigenen Cloudflare-Umgebung existieren ältere Recovery-/Testdatenbanken. Ihre Tabellenausstattung ist nicht deckungsgleich mit der aktiven Sites-Datenbank; sie sind kein aktuelles vollständiges Backup.
- `docs/D1-Backup-Restore.md` belegt einen erfolgreichen Export-/Import-/Restore-Test mit synthetischen Test-D1s im September. **Das ist kein Produktiv-Backup und kein Wiederherstellungsnachweis für die aktive Connect-Datenbank.**
- Beim letzten Check war weder ein vollständiger Export der aktiven Datenbank noch ein Restore davon in einer getrennten Datenbank belegt. Produktivdaten wurden für diese Prüfung nicht geändert.
- Ein möglicher nächster technischer Weg ist ein zeitlich begrenzter, streng admin-geschützter Export der kompletten Live-Datenbank in einen privaten Cloudflare-Speicher mit anschließendem Restore-Test. Dafür müssen Authentisierung, Berechtigung, Größenbegrenzung, Integritätsnachweis und Abschaltung des Exportwegs geplant werden. Die Exportfunktion darf keine öffentlichen Daten ausgeben und keine Secrets in GitHub benötigen.

## Veröffentlichungsziel und notwendiger Cutover

Ziel ist ein gemeinsamer offizieller Weg:

1. Eine Änderung wird ausschließlich im offiziellen Repository auf `main` übernommen.
2. CI erstellt und prüft genau diesen Commit.
3. Derselbe Release aktualisiert App-Oberfläche **und** Server-API/Worker.
4. Zugangsdaten und Nutzerdaten bleiben in Cloudflare/Hosting-Secrets und privaten Datenbanken.
5. Alle Installationen laden den neuen Stand automatisch; bei geschlossener PWA zeigt ein Push-Update-Hinweis, sobald nötig.

Derzeit funktioniert Schritt 2/3 automatisch für GitHub Pages und das PWA-Paket. Connect leitet statische Dateien an Pages weiter. Die Connect-API, Sign-in-Konfiguration und Sites-Datenbank werden nicht durch den Pages-Workflow aktualisiert. Der neue Produktionsworker und die produktive Datenbank in der eigenen Cloudflare-Umgebung wurden nicht nachgewiesen. Eine Umstellung ohne sicheren Datenexport würde das Risiko von Datenverlust oder Kontenverlust erzeugen.

## Empfohlene Reihenfolge für die nächsten Arbeiten

1. **Vollständiges Live-Backup ermöglichen:** geschützten, vollständigen Exportweg für die Connect-Sites-Datenbank bestimmen; privaten Speicherort in Cloudflare auswählen; Schema, Tabellen, Zeilenanzahlen und Prüfsummen erfassen.
2. **Wiederherstellung tatsächlich prüfen:** Export in eine neue, getrennte Cloudflare-D1 laden. Schema, Indizes, Trigger, Zeilenanzahlen sowie repräsentative, vertrauliche Prüfwerte intern vergleichen. Keine Dateninhalte in Chat oder GitHub ausgeben.
3. **Zielarchitektur festlegen:** produktiven Cloudflare-Worker und produktive D1 als Serverziel einrichten. Bestehende Plattform-Anmeldung sicher ersetzen oder weiterführen; E-Mail-Code/Google, Adminerhalt und sichere Kontoverknüpfung ausdrücklich planen.
4. **GitHub-CI vereinheitlichen:** Build aus `main` automatisch zu einem Release-Paket für PWA und Worker machen. Cloudflare-Zugang nur als geschütztes CI-Secret; kein privater Nutzerdatenbestand im Git-Artefakt.
5. **Daten und Kontoübernahme:** erst nach verifiziertem Backup/Restore kontrollierte, idempotente Migration mit Rückfallweg; Nutzer-/Teamgrenzen erhalten.
6. **Ende-zu-Ende prüfen:** Mac/iPhone/iPad mit demselben Konto, persönlicher und Kollegendienstplan, Konflikt-/Reconnect, aktuelle Woche, freier Tag, Krank/Urlaub, Zeiterfassung, Chat, Dienstplanänderung, Update und Push bei geschlossener PWA.
7. **Offene Praxisprüfung:** realer Android-Test und Import des nächsten echten Dienstplans.
8. **Beta aus dem Nutzerweg nehmen:** erst nach bestandenen Zugriffs-, Daten- und Geräteprüfungen. Dann offizielle PWA ohne Store bereitstellen.
9. **Namen entscheiden:** finalen Produktnamen auswählen und vor breiter Verbreitung umfassend in DPMA, EUIPO/TMview und WIPO sowie App-Stores, Web und Domains prüfen. Phoenix-Logo bleibt unabhängig davon.

## Dokumentations- und Prüfhinweise

Einige ältere Dokumente im Repository sind historische Momentaufnahmen (z. B. `docs/Status-2026-10-30.md`, `docs/Phase-F-Produktivstatus.md`). Sie nennen frühere Commits, Site-Versionen oder Zustände und dürfen nicht als heutiger Live-Nachweis gelesen werden. `README.md` und `docs/Deployment.md` beschreiben den getrennten Site-/Pages-Weg, sind aber ebenfalls vor diesem Abgleich geschrieben. Diese Übergabe hält den geprüften Stand vom 4. November fest; sie ersetzt nicht die künftig nötige Aktualisierung dieser Statusdokumente.

**Für diese Übergabe:** Repository-Dateien und vorhandene Statusdokumente wurden gelesen; aktuelle Metadaten von GitHub Pages, ChatGPT Sites und dem verbundenen Cloudflare-Konto wurden im Verlauf geprüft. Kein Anwendungscode geändert. Keine produktiven Daten verändert. Keine Tests oder vollständige Geräteabnahme in diesem Auftrag ausgeführt.
