# TimeFlow-Versionierung

Der Code- und Release-Stand ist ausschließlich der aktuelle Commit auf
`Daixem/TimeFlow-PWA:main`. Es gibt keine manuell zu pflegende Build-Nummer.

Jeder Produktions-Build erstellt eine maschinenlesbare `version.json` mit:

- vollständigem Commit-SHA
- Build-ID aus Kurz-SHA und UTC-Buildzeit
- UTC-Buildzeit

Die Anzeige „1.0.1 / Build 0040“ bleibt als historische Produktbezeichnung
bestehen; sie steuert weder Caches noch Deployment oder Versionsprüfung.
