// --- Bookingkalender ---
// Viser ledige/opptatte datoer fra /api/availability og fyller inn ønsket dato i kontaktskjemaet.
document.addEventListener('DOMContentLoaded', () => {

    const calendar = document.getElementById('booking-calendar');
    const contactForm = document.getElementById('contact-form');

    if (!calendar || !contactForm) return;

    const monthsEl = calendar.querySelector('.calendar-months');
    const prevButton = calendar.querySelector('.calendar-prev');
    const nextButton = calendar.querySelector('.calendar-next');
    const statusEl = calendar.querySelector('.calendar-status');
    const fromInput = contactForm.querySelector('#date_from');
    const toInput = contactForm.querySelector('#date_to');

    const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];
    const monthFormat = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const dayFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const wideScreen = window.matchMedia('(min-width: 768px)');

    let booked = new Set();
    let minDate = '';
    let maxDate = '';
    let view = null; // første synlige måned: { year, month }

    // Datoer håndteres som 'YYYY-MM-DD' i UTC for å unngå tidssone-forskyvning
    const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
    const toIso = (date) => date.toISOString().slice(0, 10);
    const addDays = (iso, days) => {
        const date = toDate(iso);
        date.setUTCDate(date.getUTCDate() + days);
        return toIso(date);
    };
    const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
    const formatDay = (iso) => dayFormat.format(toDate(iso));

    const hasBookedBetween = (from, to) => {
        for (let day = from; day <= to; day = addDays(day, 1)) {
            if (booked.has(day)) return true;
        }
        return false;
    };

    const monthCount = () => (wideScreen.matches ? 2 : 1);

    const showMonthOf = (iso) => {
        const date = toDate(iso);
        const count = monthCount();
        const first = Date.UTC(view.year, view.month, 1);
        const last = Date.UTC(view.year, view.month + count, 0);
        if (date < first || date > last) {
            view = { year: date.getUTCFullYear(), month: date.getUTCMonth() };
        }
    };

    function renderMonth(year, month, from, to) {
        const first = new Date(Date.UTC(year, month, 1));
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const offset = (first.getUTCDay() + 6) % 7; // mandag først

        const wrapper = document.createElement('div');
        wrapper.className = 'calendar-month';

        const title = document.createElement('h3');
        title.className = 'calendar-title';
        title.textContent = capitalize(monthFormat.format(first));
        wrapper.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        WEEKDAYS.forEach(name => {
            const cell = document.createElement('span');
            cell.className = 'calendar-weekday';
            cell.setAttribute('aria-hidden', 'true');
            cell.textContent = name;
            grid.appendChild(cell);
        });

        for (let i = 0; i < offset; i++) {
            grid.appendChild(document.createElement('span'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const iso = toIso(new Date(Date.UTC(year, month, day)));
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'calendar-day';
            button.dataset.date = iso;
            button.textContent = day;

            let state = 'ledig';
            if (iso < minDate || iso > maxDate) {
                button.disabled = true;
                button.classList.add('is-unavailable');
                state = 'ikke tilgjengelig';
            } else if (booked.has(iso)) {
                button.disabled = true;
                button.classList.add('is-booked');
                state = 'opptatt';
            }

            if (iso === minDate) button.classList.add('is-today');

            const selected = from && iso >= from && iso <= to;
            if (selected) {
                button.classList.add(iso === from || iso === to ? 'is-selected' : 'is-in-range');
            }
            if (!button.disabled) {
                button.setAttribute('aria-pressed', String(Boolean(selected)));
            }

            button.setAttribute('aria-label', `${formatDay(iso)}, ${state}`);
            grid.appendChild(button);
        }

        wrapper.appendChild(grid);
        return wrapper;
    }

    function render() {
        if (!view) return;

        const count = monthCount();
        const from = fromInput.value;
        const to = toInput.value || from;

        monthsEl.replaceChildren();
        for (let i = 0; i < count; i++) {
            const date = new Date(Date.UTC(view.year, view.month + i, 1));
            monthsEl.appendChild(renderMonth(date.getUTCFullYear(), date.getUTCMonth(), from, to));
        }

        const firstShown = toIso(new Date(Date.UTC(view.year, view.month, 1))).slice(0, 7);
        const lastShown = toIso(new Date(Date.UTC(view.year, view.month + count - 1, 1))).slice(0, 7);
        prevButton.disabled = firstShown <= minDate.slice(0, 7);
        nextButton.disabled = lastShown >= maxDate.slice(0, 7);
    }

    function updateStatus() {
        const from = fromInput.value;
        const to = toInput.value;
        statusEl.classList.remove('is-warning');

        if (!from) {
            statusEl.textContent = 'Velg en ledig dato i kalenderen. Klikk på en dato til for å velge flere dager.';
            return;
        }

        if (hasBookedBetween(from, to || from)) {
            statusEl.textContent = 'Valgt periode inneholder opptatte datoer. Velg en annen dato.';
            statusEl.classList.add('is-warning');
            return;
        }

        statusEl.textContent = to && to !== from
            ? `Valgt: ${formatDay(from)} – ${formatDay(to)}`
            : `Valgt: ${formatDay(from)}`;
    }

    function update() {
        toInput.min = fromInput.value || minDate;
        updateStatus();
        render();
    }

    monthsEl.addEventListener('click', (e) => {
        const button = e.target.closest('.calendar-day');
        if (!button || button.disabled) return;

        const day = button.dataset.date;
        const from = fromInput.value;

        if (!from || toInput.value || day < from || hasBookedBetween(from, day)) {
            // Start et nytt valg
            fromInput.value = day;
            toInput.value = '';
        } else if (day > from) {
            toInput.value = day;
        }

        update();
        monthsEl.querySelector(`[data-date="${day}"]`)?.focus();
    });

    [prevButton, nextButton].forEach(button => {
        button.addEventListener('click', () => {
            const date = new Date(Date.UTC(view.year, view.month + Number(button.dataset.dir), 1));
            view = { year: date.getUTCFullYear(), month: date.getUTCMonth() };
            render();
        });
    });

    [fromInput, toInput].forEach(input => {
        input.addEventListener('change', () => {
            if (toInput.value && fromInput.value && toInput.value < fromInput.value) {
                toInput.value = '';
            }
            if (view && input.value) showMonthOf(input.value);
            update();
        });
    });

    // Skjemaet nullstilles etter innsending; reset-eventet kommer før feltene tømmes
    contactForm.addEventListener('reset', () => setTimeout(update));

    wideScreen.addEventListener('change', render);

    calendar.hidden = false;
    statusEl.textContent = 'Henter ledige datoer…';

    fetch('/api/availability')
        .then(response => (response.ok ? response.json() : Promise.reject(response.status)))
        .then(data => {
            booked = new Set(data.booked);
            minDate = data.from;
            maxDate = data.to;
            fromInput.min = minDate;
            fromInput.max = maxDate;
            toInput.max = maxDate;

            const start = toDate(minDate);
            view = { year: start.getUTCFullYear(), month: start.getUTCMonth() };
            if (fromInput.value) showMonthOf(fromInput.value);
            update();
        })
        .catch(() => {
            calendar.classList.add('is-error');
            statusEl.textContent = 'Kunne ikke hente kalenderen akkurat nå. Du kan fortsatt sende oss en forespørsel med ønsket dato.';
        });

});
