export function initializeBookingControls(getLanguage, tr) {
    const dateInput = document.querySelector('#date');
    const timeInput = document.querySelector('#time');
    const days = document.querySelector('.calendar-days');
    const monthTitle = document.querySelector('#calendar-month');
    const previous = document.querySelector('#month-prev');
    const next = document.querySelector('#month-next');
    const selects = [...document.querySelectorAll('.custom-select')];
    const local = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const maxDate = () => {
        const d = today();
        d.setDate(d.getDate() + 90);
        return d;
    };
    const tomorrow = today();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = local(tomorrow);
    let month = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
    const locale = () => (getLanguage() === 'ru' ? 'ru-RU' : 'en-GB');
    function closeAll() {
        selects.forEach((select) => {
            select.querySelector('.select-list').hidden = true;
            select.querySelector('.select-trigger').setAttribute('aria-expanded', 'false');
        });
    }
    function fillSelect(select, values) {
        const input = select.querySelector('input');
        const list = select.querySelector('.select-list');
        const trigger = select.querySelector('.select-trigger');
        if (!values.some((v) => v.value === input.value)) input.value = values[0]?.value || '';
        list.replaceChildren();
        values.forEach(({ value, label }) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.role = 'option';
            button.tabIndex = -1;
            button.dataset.value = value;
            button.textContent = label;
            button.setAttribute('aria-selected', String(value === input.value));
            button.addEventListener('click', () => {
                input.value = value;
                list.querySelectorAll('button').forEach((b) =>
                    b.setAttribute('aria-selected', String(b === button))
                );
                trigger.firstElementChild.textContent = label;
                closeAll();
                trigger.focus();
            });
            list.append(button);
        });
        trigger.firstElementChild.textContent =
            values.find((v) => v.value === input.value)?.label || tr('noTimes');
        trigger.disabled = !values.length;
    }
    function updateTimes() {
        const now = new Date();
        const values = [];
        for (let hour = 12; hour <= 22; hour++) {
            if (dateInput.value === local(now) && hour <= now.getHours()) continue;
            values.push({ value: `${hour}:00`, label: `${hour}:00` });
        }
        fillSelect(document.querySelector('[data-select=time]'), values);
    }
    function renderCalendar(focusDate) {
        const now = today(),
            max = maxDate();
        monthTitle.textContent = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(
            month
        );
        previous.setAttribute('aria-label', tr('prevMonth'));
        next.setAttribute('aria-label', tr('nextMonth'));
        previous.disabled = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
        next.disabled = month.getFullYear() === max.getFullYear() && month.getMonth() === max.getMonth();
        const weekdays = document.querySelector('.calendar-weekdays');
        weekdays.replaceChildren();
        for (let day = 0; day < 7; day++) {
            const span = document.createElement('span');
            span.textContent = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(
                new Date(2024, 0, 1 + day)
            );
            weekdays.append(span);
        }
        days.replaceChildren();
        const offset = (month.getDay() + 6) % 7;
        for (let i = 0; i < offset; i++) {
            const empty = document.createElement('span');
            empty.setAttribute('aria-hidden', 'true');
            days.append(empty);
        }
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        for (let n = 1; n <= count; n++) {
            const d = new Date(month.getFullYear(), month.getMonth(), n),
                value = local(d);
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = n;
            button.dataset.date = value;
            button.disabled = d < now || d > max;
            button.setAttribute(
                'aria-label',
                new Intl.DateTimeFormat(locale(), { dateStyle: 'full' }).format(d)
            );
            button.setAttribute('aria-pressed', String(value === dateInput.value));
            if (value === local(now)) button.setAttribute('aria-current', 'date');
            button.tabIndex = value === dateInput.value ? 0 : -1;
            button.addEventListener('click', () => {
                dateInput.value = value;
                renderCalendar(value);
                updateTimes();
            });
            days.append(button);
        }
        if (!days.querySelector('[tabindex="0"]')) {
            const first = days.querySelector('button:not(:disabled)');
            if (first) first.tabIndex = 0;
        }
        document.querySelector('#calendar-selected').textContent = new Intl.DateTimeFormat(locale(), {
            dateStyle: 'long'
        }).format(new Date(dateInput.value + 'T12:00'));
        if (focusDate) days.querySelector(`[data-date="${focusDate}"]`)?.focus({ preventScroll: true });
    }
    previous.addEventListener('click', () => {
        month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
        renderCalendar();
    });
    next.addEventListener('click', () => {
        month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        renderCalendar();
    });
    days.addEventListener('keydown', (event) => {
        const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (!(event.key in shifts) || !event.target.dataset.date) return;
        event.preventDefault();
        const d = new Date(event.target.dataset.date + 'T12:00');
        d.setDate(d.getDate() + shifts[event.key]);
        if (d < today() || d > new Date(local(maxDate()) + 'T23:59')) return;
        month = new Date(d.getFullYear(), d.getMonth(), 1);
        renderCalendar(local(d));
    });
    selects.forEach((select) => {
        const trigger = select.querySelector('.select-trigger'),
            list = select.querySelector('.select-list');
        function open() {
            closeAll();
            list.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            (list.querySelector('[aria-selected=true]') || list.firstElementChild)?.focus({
                preventScroll: true
            });
        }
        trigger.addEventListener('click', () => {
            const wasOpen = !list.hidden;
            closeAll();
            if (!wasOpen) open();
        });
        trigger.addEventListener('keydown', (event) => {
            if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                open();
            }
        });
        list.addEventListener('keydown', (event) => {
            const options = [...list.children],
                index = options.indexOf(document.activeElement);
            if (event.key === 'Escape') {
                event.preventDefault();
                closeAll();
                trigger.focus();
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const target =
                    event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? options.length - 1
                          : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
                options[target]?.focus();
            }
        });
        select.addEventListener('focusout', (event) => {
            if (!select.contains(event.relatedTarget)) closeAll();
        });
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.custom-select')) closeAll();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAll();
    });
    return {
        refresh() {
            closeAll();
            if (dateInput.value < local(today())) dateInput.value = local(today());
            fillSelect(
                document.querySelector('[data-select=guests]'),
                Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
            );
            renderCalendar();
            updateTimes();
        }
    };
}
