# Solbak Gård – nettside

Nettsiden til Solbak Gård, selskapslokale i Randaberg: **https://solbakgard.no**

Et lokale med alt du trenger for fest, bryllup, konfirmasjon eller bare et hyggelig samvær med familie og venner.

## Oppbygging

- Ren HTML, CSS og JavaScript. Ingen rammeverk, ingen byggesteg og ingen npm-avhengigheter.
- Hostes på **Cloudflare Pages**. Kontaktskjemaet kjøres som en **Pages Function**.
- E-post sendes med **Cloudflare Email Service**, og skjemaet er beskyttet med **Cloudflare Turnstile**.

```
index.html                  Hele siden (én side med seksjoner)
include/css/style.css       All styling
include/script/script.js    Meny, galleri/lightbox og innsending av skjema
include/img/                Bilder (JPG-originaler og WebP-versjoner)
include/img/thumb/          Miniatyrbilder til galleriet
functions/api/contact.js    Kontaktskjema: Turnstile-sjekk og utsending av e-post
_headers                    Sikkerhetshoder og Content Security Policy
robots.txt, sitemap.xml     For søkemotorer
```

## Publisering

- Push til `main` publiseres automatisk til **solbakgard.no**.
- Push til andre brancher gir en forhåndsvisning på `https://<branch>.solbakgard-web.pages.dev`. Test der før du merger til `main`.
- Endringer i miljøvariabler i Cloudflare tar først effekt ved neste deploy.

## Endre innhold

Alt innhold ligger i `index.html`:

| Hva | Hvor |
| --- | --- |
| Priser og tilleggstjenester | Seksjonen `id="priser"` |
| Tekst om lokalet | Seksjonen `id="omoss"` |
| Fasiliteter (200 kvm, scene osv.) | Listen `venue-facts` i seksjonen `id="galleri"` |
| Adresse, telefon og e-post | Footeren og JSON-LD-blokken i `<head>` |

Mottakeradressen for kontaktskjemaet settes i `MAIL_TO` i `functions/api/contact.js`.

## Bilder

Galleriet viser miniatyrbilder (WebP, maks 800 px) fra `include/img/thumb/`. Klikker man på et bilde, åpnes original-JPG-en i en lightbox.

Slik legger du til et nytt galleribilde (krever [ImageMagick](https://imagemagick.org)):

1. Legg originalen i `include/img/` som `solbakgard-NAVN.jpg`.
2. Lag miniatyrbildet:
   ```
   magick include/img/solbakgard-NAVN.jpg -strip -resize "800x800>" -quality 75 include/img/thumb/solbakgard-NAVN.webp
   ```
3. Legg til bildet i galleriet i `index.html`. Bruk faktisk bredde og høyde på miniatyrbildet, og en beskrivende alt-tekst:
   ```html
   <a href="include/img/solbakgard-NAVN.jpg" class="gallery-item">
       <img src="include/img/thumb/solbakgard-NAVN.webp" alt="Beskrivelse av bildet" width="800" height="800" loading="lazy" decoding="async">
   </a>
   ```

## Kontaktskjema

Skjemaet sender til `functions/api/contact.js`, som:

1. Stopper roboter med et skjult honeypot-felt og verifiserer Turnstile-tokenet (action og hostname sjekkes).
2. Validerer feltene (påkrevd, maks lengde, gyldig e-post).
3. Sender e-posten via Cloudflare Email Sending REST API, med avsenders adresse som svaradresse (*Reply-To*).

All brukerinput escapes før den settes inn i e-posten. Pages Functions støtter ikke `send_email`-bindingen, derfor brukes REST API-et.

### Oppsett i Cloudflare

1. **Email Service:** Legg til `solbakgard.no` under *Compute > Email Service > Email Sending > Onboard Domain*.
2. **Mottaker:** Legg til og verifiser `solbakgaard@gmail.com` under *Email Routing > Destination Addresses*. Sending til verifiserte adresser er gratis.
3. **API-token:** Lag et API-token med tilgangen *Email Sending: Edit*.
4. **Turnstile:** Widgeten (`data-sitekey` i `index.html`) må ha `solbakgard.no` og `solbakgard-web.pages.dev` som tillatte hostnavn.
5. **Miljøvariabler** i Pages-prosjektet (*Settings > Variables and Secrets*), for både Production og Preview:

| Navn | Type | Verdi |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Hemmelig nøkkel fra Turnstile-widgeten |
| `CF_ACCOUNT_ID` | Text | Cloudflare konto-ID |
| `CF_EMAIL_API_TOKEN` | Secret | API-tokenet fra steg 3 |

## Sikkerhet

`_headers` setter Content Security Policy (CSP), HSTS og andre sikkerhetshoder for alle sider. CSP-en tillater kun det siden faktisk bruker: Google Fonts, Google Maps-kartet, Turnstile og Cloudflare Web Analytics.

Legger du til et nytt eksternt script, en font eller en innebygd tjeneste, må domenet også legges til i CSP-en. Ellers blokkeres det av nettleseren.

## Analyse

Besøksstatistikk samles med **Cloudflare Web Analytics**. Den bruker ikke informasjonskapsler (cookies), så det trengs ikke samtykkebanner. Analysen slås på i Pages-prosjektet under *Metrics*, og Cloudflare legger inn scriptet automatisk. Det ligger ingen analysekode i repoet.

## Lokal utvikling

Lag en `.dev.vars`-fil i rotmappen (den er ignorert av git) med Turnstiles testnøkkel:

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
CF_ACCOUNT_ID=<konto-id>
CF_EMAIL_API_TOKEN=<token>
```

Bytt midlertidig `data-sitekey` i `index.html` til testnøkkelen `1x00000000000000000000AA`. Kjør deretter:

```
npx wrangler pages dev .
```

Åpne `http://localhost:8788`. Testnøkkelen godtas kun på `localhost`, så den kan ikke misbrukes i produksjon. Husk å sette tilbake den ekte `data-sitekey` før du committer.
