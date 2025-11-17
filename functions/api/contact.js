async function parseFormData(request) {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

async function verifyTurnstile(token, secret, ip) {
    const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    formData.append('remoteip', ip);

    try {
        const response = await fetch(verifyEndpoint, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error verifying Turnstile:', error);
        return false;
    }
}
export async function onRequestPost(context) {
    try {
        const data = await parseFormData(context.request);
        
        if (data.fax && data.fax !== '') {
            return new Response(
                JSON.stringify({ message: 'Melding sendt!' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const token = data['cf-turnstile-response'];
        const secret = context.env.TURNSTILE_SECRET_KEY;
        const ip = context.request.headers.get('CF-Connecting-IP');

        if (!token || !secret) {
            throw new Error('Turnstile configuration error.');
        }

        const isHuman = await verifyTurnstile(token, secret, ip);

        if (!isHuman) {
            return new Response(
                JSON.stringify({ message: 'Bot-sjekk feilet. Prøv å last inn siden på nytt.' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // SEND E-POST (Kun dersom menneske)
        const RESEND_API_KEY = context.env.RESEND_API_KEY;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Solbak Gård <booking@solbakgard.no>',
                to: ['christer@tysd.al'], // Eller marius@harestad.no
                subject: `Ny forespørsel fra ${data.name} (Solbak Gård)`,
                html: `
                    <strong>Ny forespørsel fra nettsiden:</strong><br><br>
                    <strong>Navn:</strong> ${data.name}<br>
                    <strong>E-post:</strong> ${data.email}<br>
                    <strong>Melding:</strong><br>
                    <p>${data.message.replace(/\n/g, '<br>')}</p>
                `,
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Feil ved sending av email: ${JSON.stringify(errorData)}`);
        }

        return new Response(
            JSON.stringify({ message: 'Forespørsel sendt!' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: 'Noe gikk galt. Prøv igjen.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}