// Ledige datoer: returnerer opptatte datoer fra bookingkalenderen (ingen detaljer om hendelsene).
import { getAvailability } from '../_lib/calendar.js';

export async function onRequestGet(context) {
    try {
        const data = await getAvailability(context);
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ message: 'Kunne ikke hente ledige datoer.' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    }
}
