# solbakgard-web
Webpage for the Solbak Gård venue!

A great event venue with everything you need to host a party, wedding or just get together with family or friends.

Simple html and css.
Built to be running on Cloudflare Pages.
Contact form protected by Cloudflare Turnstile and sent with Cloudflare Email Service (via a Pages Function).

## Contact form setup

The form posts to `functions/api/contact.js`, which verifies the Turnstile token and sends the mail through the Cloudflare Email Sending REST API. (Pages Functions do not support the `send_email` binding, so the REST API is used.)

1. **Email Service:** Onboard `solbakgard.no` under *Compute > Email Service > Email Sending*, and add `solbakgaard@gmail.com` as a verified destination address (sending to verified addresses is free on all plans).
2. **API token:** Create an API token with the *Email Sending: Edit* permission.
3. **Turnstile:** The widget (`data-sitekey` in `index.html`) must list `solbakgard.no` (and any preview hostnames) as allowed hostnames.
4. **Pages environment variables** (Settings > Variables and Secrets):

| Name | Type | Value |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile widget secret key |
| `CF_ACCOUNT_ID` | Text | Cloudflare account ID |
| `CF_EMAIL_API_TOKEN` | Secret | API token from step 2 |

## Booking calendar

The booking section shows free and booked dates for the next two years, read from the Solbak Gård Google Calendar. `functions/api/availability.js` fetches the calendar's secret iCal address and returns **only booked dates**: titles, times and other details never reach the browser. Any event on a day marks the whole day as booked (Norwegian time). Results are cached for 10 minutes.

The contact form sends the chosen dates in the email and warns if they collide with an existing booking.

Setup: in Google Calendar, open *Settings > (the Solbak Gård calendar) > Integrate calendar* and copy **Secret address in iCal format**. Add it in Pages as:

| Name | Type | Value |
| --- | --- | --- |
| `CALENDAR_ICS_URL` | Secret | Secret iCal address |

Limitation: recurring events only count their first occurrence. Add bookings as single events.

## Local testing

Create a `.dev.vars` file (git-ignored) and use the Turnstile testing secret:

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
CF_ACCOUNT_ID=<account id>
CF_EMAIL_API_TOKEN=<token>
```

Temporarily set `data-sitekey` to `1x00000000000000000000AA` in `index.html`, then run `npx wrangler pages dev .` and open `http://localhost:8788`. The testing secret is only accepted on `localhost`.

## Analytics

Cloudflare Web Analytics (cookieless, no consent banner needed), enabled in the Pages project under *Metrics*. No script is included in the code; Pages injects it automatically.

## Images

Gallery thumbnails live in `include/img/thumb/` (WebP, max 800px); the lightbox opens the original JPGs. To add a gallery image:

```
magick include/img/solbakgard-NAME.jpg -strip -resize "800x800>" -quality 75 include/img/thumb/solbakgard-NAME.webp
```

## Security headers

`_headers` sets the CSP and other security headers. If a new external script, font, or embed is added, add its origin to the CSP as well.
