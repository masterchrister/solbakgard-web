async function parseFormData(request) {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
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

        const RESEND_API_KEY = context.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            throw new Error('Resend API Key is not configured.');
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Solbak Gård <booking@solbakgard.no>',
                to: ['marius@harestad.no'],
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