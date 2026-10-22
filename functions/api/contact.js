// Kontaktskjema: Turnstile-verifisering + utsending via Cloudflare Email Service (REST API).
// Pages Functions støtter ikke send_email-bindingen, derfor brukes REST-endepunktet.
//
// Påkrevde miljøvariabler (Pages > Settings > Variables and Secrets):
//   TURNSTILE_SECRET_KEY  (secret)  Turnstile widget secret
//   CF_ACCOUNT_ID         (text)    Cloudflare konto-ID
//   CF_EMAIL_API_TOKEN    (secret)  API-token med Email Sending: Edit

const MAIL_FROM = 'booking@solbakgard.no';
const MAIL_TO = 'solbakgaard@gmail.com';
const TURNSTILE_ACTION = 'contact';
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_PATTERN = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

function json(message, status) {
    return new Response(JSON.stringify({ message }), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function field(formData, key) {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
}

async function verifyTurnstile(token, secret, ip, requestHost) {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    body.append('idempotency_key', crypto.randomUUID());
    if (ip) body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
    });
    const outcome = await res.json();

    if (!outcome.success) {
        console.warn('Turnstile avvist:', outcome['error-codes']);
        return false;
    }

    // Testnøkkelen returnerer alltid action "test" / hostname "localhost".
    if (secret === TURNSTILE_TEST_SECRET) {
        return requestHost === 'localhost' || requestHost === '127.0.0.1';
    }

    if (outcome.action !== TURNSTILE_ACTION || outcome.hostname !== requestHost) {
        console.warn('Turnstile action/hostname stemmer ikke:', outcome.action, outcome.hostname);
        return false;
    }

    return true;
}

async function sendEmail(env, { name, email, message }) {
    const html = `
        <strong>Ny forespørsel fra nettsiden:</strong><br><br>
        <strong>Navn:</strong> ${escapeHtml(name)}<br>
        <strong>E-post:</strong> ${escapeHtml(email)}<br>
        <strong>Melding:</strong><br>
        <p>${escapeHtml(message).replace(/\r?\n/g, '<br>')}</p>
    `;
    const text = `Ny forespørsel fra nettsiden:\n\nNavn: ${name}\nE-post: ${email}\n\nMelding:\n${message}\n`;

    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.CF_EMAIL_API_TOKEN}`,
            },
            body: JSON.stringify({
                from: MAIL_FROM,
                to: [MAIL_TO],
                reply_to: email,
                subject: `Ny forespørsel fra ${name} (Solbak Gård)`,
                html,
                text,
            }),
        }
    );

    const result = await res.json().catch(() => null);
    if (!res.ok || !result?.success) {
        throw new Error(`Feil ved sending av e-post (${res.status}): ${JSON.stringify(result?.errors)}`);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        if (!env.TURNSTILE_SECRET_KEY || !env.CF_ACCOUNT_ID || !env.CF_EMAIL_API_TOKEN) {
            throw new Error('Kontaktskjemaet mangler konfigurasjon (miljøvariabler).');
        }

        const contentType = request.headers.get('Content-Type') || '';
        if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
            return json('Ugyldig forespørsel.', 415);
        }

        const formData = await request.formData();

        // Honeypot: feltet er skjult for mennesker, så bots som fyller det ut får et falskt "ok".
        if (field(formData, 'fax') !== '') {
            return json('Forespørsel sendt!', 200);
        }

        const token = field(formData, 'cf-turnstile-response');
        if (!token || token.length > 2048) {
            return json('Sikkerhetssjekken er ikke fullført. Prøv igjen.', 403);
        }

        const requestHost = new URL(request.url).hostname;
        const ip = request.headers.get('CF-Connecting-IP');
        if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip, requestHost))) {
            return json('Sikkerhetssjekken feilet. Last inn siden og prøv igjen.', 403);
        }

        // Fjern linjeskift fra navn så det ikke kan manipulere emnefeltet.
        const name = field(formData, 'name').replace(/[\r\n]+/g, ' ');
        const email = field(formData, 'email');
        const message = field(formData, 'message');

        if (!name || !email || !message) {
            return json('Fyll ut alle feltene.', 400);
        }
        if (name.length > LIMITS.name || email.length > LIMITS.email || message.length > LIMITS.message) {
            return json('En eller flere felt er for lange.', 400);
        }
        if (!EMAIL_PATTERN.test(email)) {
            return json('Ugyldig e-postadresse.', 400);
        }

        await sendEmail(env, { name, email, message });

        return json('Forespørsel sendt!', 200);

    } catch (error) {
        console.error(error);
        return json('Noe gikk galt. Prøv igjen.', 500);
    }
}
