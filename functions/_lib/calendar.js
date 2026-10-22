// Leser bookingkalenderen (Google Calendar, hemmelig iCal-adresse) og returnerer kun opptatte datoer.
// Titler, tidspunkt og annen info fra kalenderen sendes aldri videre.
//
// Påkrevd miljøvariabel (Pages > Settings > Variables and Secrets):
//   CALENDAR_ICS_URL  (secret)  "Hemmelig adresse i iCal-format" for Solbak Gård-kalenderen
//
// Regel: en dag er opptatt hvis en hendelse berører dagen (norsk tid), uansett klokkeslett.
// Begrensning: gjentakende hendelser (RRULE) teller kun første forekomst.

const TIMEZONE = 'Europe/Oslo';
const DAYS_AHEAD = 730;
const CACHE_SECONDS = 600;

const osloFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export function osloDate(date) {
    return osloFormat.format(date);
}

export function addDays(iso, days) {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function isoFromCompact(value) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function parseProperty(line) {
    const colon = line.indexOf(':');
    const [name, ...params] = line.slice(0, colon).split(';');
    return {
        name: name.toUpperCase(),
        isDate: params.some(p => p.toUpperCase() === 'VALUE=DATE'),
        value: line.slice(colon + 1).trim(),
    };
}

// Returnerer { kind: 'date' | 'instant' | 'local', ... } for DTSTART/DTEND
function parseDateValue({ value, isDate }) {
    if (isDate || /^\d{8}$/.test(value)) {
        return { kind: 'date', date: isoFromCompact(value) };
    }
    const m = value.match(/^(\d{8})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if (!m) return null;
    if (m[5] === 'Z') {
        const iso = `${isoFromCompact(m[1])}T${m[2]}:${m[3]}:${m[4]}Z`;
        return { kind: 'instant', ms: Date.parse(iso) };
    }
    // TZID eller "flytende" tid: tolkes som lokal (norsk) veggklokke
    return { kind: 'local', date: isoFromCompact(m[1]), midnight: `${m[2]}${m[3]}${m[4]}` === '000000' };
}

function firstDay(start) {
    return start.kind === 'instant' ? osloDate(new Date(start.ms)) : start.date;
}

// Siste dag hendelsen berører. DTEND er eksklusiv, så slutt kl. 00:00 teller ikke neste dag.
function lastDay(start, end) {
    if (!end) return firstDay(start);
    if (end.kind === 'date') return addDays(end.date, -1);
    if (end.kind === 'instant') return osloDate(new Date(end.ms - 1000));
    return end.midnight ? addDays(end.date, -1) : end.date;
}

export function bookedDatesFromIcs(ics, from, to) {
    const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const booked = new Set();
    let event = null;

    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
            event = {};
        } else if (line === 'END:VEVENT') {
            if (event && event.start && event.status !== 'CANCELLED') {
                const first = firstDay(event.start);
                const last = lastDay(event.start, event.end);
                let day = first > from ? first : from;
                const stop = last > first ? last : first;
                for (; day <= stop && day <= to; day = addDays(day, 1)) {
                    booked.add(day);
                }
            }
            event = null;
        } else if (event) {
            const prop = parseProperty(line);
            if (prop.name === 'DTSTART') event.start = parseDateValue(prop);
            else if (prop.name === 'DTEND') event.end = parseDateValue(prop);
            else if (prop.name === 'STATUS') event.status = prop.value.toUpperCase();
        }
    }

    return [...booked].sort();
}

// Hentes med edge-cache, så Google ikke spørres ved hvert sidebesøk
export async function getAvailability(context) {
    const { env, request } = context;
    if (!env.CALENDAR_ICS_URL) {
        throw new Error('CALENDAR_ICS_URL er ikke konfigurert.');
    }

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(new URL('/api/availability', request.url).toString());
    const cached = cache && await cache.match(cacheKey);
    if (cached) return cached.json();

    const res = await fetch(env.CALENDAR_ICS_URL);
    if (!res.ok) {
        throw new Error(`Kunne ikke hente kalenderen (${res.status}).`);
    }

    const from = osloDate(new Date());
    const to = addDays(from, DAYS_AHEAD);
    const data = { from, to, booked: bookedDatesFromIcs(await res.text(), from, to) };

    if (cache) {
        const response = new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
        });
        context.waitUntil(cache.put(cacheKey, response));
    }

    return data;
}
