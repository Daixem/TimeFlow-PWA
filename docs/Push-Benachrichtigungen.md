# Push-Benachrichtigungen

Die PWA kann Push-Nachrichten bereits im Service Worker empfangen und nach Zustimmung ein Gerät registrieren. Die Registrierung wird pro Konto in D1 gespeichert.

Für den echten Versand bei geschlossener App fehlen noch die Cloudflare-Konfiguration und ein Versandprozess:

1. VAPID-Schlüssel erzeugen.
2. Den öffentlichen Schlüssel als `TIMEFLOW_VAPID_PUBLIC_KEY` hinterlegen.
3. Den privaten Schlüssel ausschließlich als Wrangler-Secret hinterlegen.
4. Einen Worker- oder Queue-Versand für Dienstplan-, Chat- und Arbeitszeitereignisse anschließen.

Ohne diese vier Schritte bleiben Benachrichtigungen lokal und es wird kein unsicherer Scheinversand aktiviert. Die Funktion bleibt jederzeit über die Geräteeinstellung abschaltbar.
