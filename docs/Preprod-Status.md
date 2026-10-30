# TimeFlow Pre-Production – historischer Phase-D-bis-F-Testbericht

> Historischer Testbericht aus Oktober 2026. Frühere Fassungen enthielten
> ausführliche Infrastrukturkennungen und kontobezogene Testzustände. Hier
> bleibt nur die Zusammenfassung der damaligen Testbefunde; aktuelle Angaben
> stehen in [Status-2026-10-30.md](Status-2026-10-30.md).

Damals wurden auf einer getrennten Testdatenbank unter anderem Anmeldung,
Teamzugriffe, Zeiterfassung, Offline-Abgleich und Löschregeln geprüft. Die
Tests waren kein Beleg für die Sicherheit der Produktivdatenbank oder für
aktuelle Produktivfunktionen. Für den heutigen Stand wurde lediglich bestätigt,
dass `timeflow-preprod` eine Testdatenbank verwendet und durch Cloudflare
Access geschützt ist.
