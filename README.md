# Gezinspunten PWA

Eerste werkende versie van de gezins-puntenapp. Werkt lokaal in de browser en bewaart gegevens op het apparaat via localStorage.

## Functies
- Profielen voor Sem en Lisa (testnamen)
- Dagelijkse taken indienen
- Ouder-PIN (standaard 1234)
- Goedkeuren/afkeuren
- Bonuspunten en puntenaftrek
- Beloningen aanvragen en goedkeuren
- Puntenhistorie
- PWA manifest + service worker

## Lokaal starten
Start vanuit deze map een simpele webserver, bijvoorbeeld:
`python3 -m http.server 8080`
Open daarna `http://localhost:8080`.

## Belangrijk
Deze versie synchroniseert nog niet tussen apparaten. De volgende stap is cloudopslag/authenticatie (bijvoorbeeld Supabase) en publicatie op een HTTPS URL.
