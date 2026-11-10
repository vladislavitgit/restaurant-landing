import { messages } from './localization.js';
import { initializeBookingControls } from './booking-controls.js';
import { initializePhoneInput } from './phone-input.js';
const $ = (selector) => document.querySelector(selector);
let lang = 'ru';
try {
    lang = localStorage.getItem('italiano-language') === 'en' ? 'en' : 'ru';
} catch {}
const tr = (key) => messages[key][lang === 'en' ? 1 : 0];
const form = $('#booking');
const date = $('#date');
const time = $('#time');
const phone = $('#phone');
const result = $('#booking-result');
const formError = $('#form-error');
const languageButtons = [...document.querySelectorAll('[data-lang]')];
const localizedElements = [...document.querySelectorAll('[data-i18n]')];
const placeholders = [...document.querySelectorAll('[data-placeholder]')];
const animatedText = [
    ...document.querySelectorAll('[data-i18n]:not(.calendar [data-i18n]), .calendar, .select-trigger, #summary')
];
let reservation;
function updateTimes() {
    controls.refresh();
}
function renderSummary() {
    if (!reservation) return;
    const display = new Date(`${reservation.date}T${reservation.time}`);
    const plural = new Intl.PluralRules(lang).select(Number(reservation.guests));
    const people = tr(plural === 'one' ? 'guestOne' : plural === 'few' ? 'guestFew' : 'people');
    $('#summary').textContent =
        `${reservation.name} · ${reservation.guests} ${people} · ${new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'long' }).format(display)} · ${reservation.time}`;
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let scrollFrame;
let savedScrollBehavior;
function stopScroll() {
    if (!scrollFrame) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    document.documentElement.style.scrollBehavior = savedScrollBehavior;
}
document.querySelectorAll('a[href="#menu"], a[href="#home"], a[href="#reservation"]').forEach((link) => {
    link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = document.querySelector(link.hash);
        if (!target) return;
        event.preventDefault();
        stopScroll();
        const start = window.scrollY;
        const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const maximum = document.documentElement.scrollHeight - window.innerHeight;
        const end =
            link.hash === '#home'
                ? 0
                : Math.max(0, Math.min(maximum, target.getBoundingClientRect().top + start - offset));
        if (location.hash) {
            history.replaceState(history.state, '', location.pathname + location.search);
        }
        savedScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        if (reducedMotion.matches || Math.abs(end - start) < 1) {
            window.scrollTo(0, end);
            document.documentElement.style.scrollBehavior = savedScrollBehavior;
            return;
        }
        const duration = Math.min(1400, 850 + Math.abs(end - start) * 0.12);
        const started = performance.now();
        function step(now) {
            const progress = Math.min(1, (now - started) / duration);
            const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
            window.scrollTo(0, start + (end - start) * eased);
            if (progress < 1) {
                scrollFrame = requestAnimationFrame(step);
            } else {
                stopScroll();
            }
        }
        scrollFrame = requestAnimationFrame(step);
    });
});
window.addEventListener('wheel', stopScroll, { passive: true });
window.addEventListener('touchstart', stopScroll, { passive: true });
window.addEventListener('resize', stopScroll);
document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopScroll();
});
const languageAnimations = new Map();
function applyLanguage(animate = false) {
    document.documentElement.lang = lang;
    localizedElements.forEach((e) => (e.textContent = tr(e.dataset.i18n)));
    placeholders.forEach((e) => (e.placeholder = tr(e.dataset.placeholder)));
    languageButtons.forEach((e) => e.setAttribute('aria-pressed', String(e.dataset.lang === lang)));
    document.querySelector('[data-alt=pasta]').alt =
        lang === 'ru'
            ? 'Итальянские блюда на сервированном столе'
            : 'Italian dishes on a beautifully set table';
    $('#restaurant-map').title = lang === 'ru' ? 'Расположение на Яндекс Картах' : 'Location on Yandex Maps';
    $('.back-top').setAttribute('aria-label', lang === 'ru' ? 'Наверх' : 'Back to top');
    formError.textContent = '';
    phone.setCustomValidity('');
    updateTimes();
    renderSummary();
    languageAnimations.forEach((animation) => animation.cancel());
    languageAnimations.clear();
    if (animate && !reducedMotion.matches) {
        animatedText.forEach((element) => {
            if (element.closest('[inert]')) return;
            const bounds = element.getBoundingClientRect();
            if (!bounds.width || !bounds.height || bounds.bottom < 0 || bounds.top > innerHeight) return;
            const animation = element.animate(
                [
                    { opacity: 0, filter: 'blur(5px)' },
                    { opacity: 1, filter: 'blur(0)' }
                ],
                { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' }
            );
            languageAnimations.set(element, animation);
            animation.onfinish = () => languageAnimations.delete(element);
        });
    }
}
languageButtons.forEach((b) =>
    b.addEventListener('click', () => {
        if (lang === b.dataset.lang) return;
        lang = b.dataset.lang;
        applyLanguage(true);
        try {
            localStorage.setItem('italiano-language', lang);
        } catch {}
    })
);
const phoneMask = initializePhoneInput(phone, () => {
    phone.setCustomValidity('');
    formError.textContent = '';
});
date.addEventListener('change', updateTimes);
window.addEventListener('focus', updateTimes);
form.addEventListener('submit', (e) => {
    e.preventDefault();
    phoneMask.format();
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || (digits.startsWith('7') && digits.length !== 11)) {
        phone.setCustomValidity(tr('phoneError'));
        formError.textContent = tr('phoneError');
        phone.reportValidity();
        return;
    }
    const when = new Date(`${date.value}T${time.value}`);
    if (!time.value || !Number.isFinite(when.getTime()) || when <= new Date()) {
        formError.textContent = tr('pastTime');
        updateTimes();
        document.querySelector('.calendar-days [aria-pressed=true]')?.focus();
        return;
    }
    if (!form.elements.name.value.trim()) {
        form.elements.name.value = '';
        form.elements.name.reportValidity();
        return;
    }
    stopScroll();
    reservation = Object.fromEntries(new FormData(form));
    renderSummary();
    form.hidden = true;
    result.hidden = false;
    result.focus({ preventScroll: true });
    const bounds = result.getBoundingClientRect();
    const headerOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const resultOffset = Math.max(headerOffset, (window.innerHeight - bounds.height) / 2);
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const top = Math.max(0, Math.min(maximum, window.scrollY + bounds.top - resultOffset));
    window.scrollTo({ top, behavior: 'instant' });
});
$('#again').addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    form.elements.name.focus({ preventScroll: true });
});
const controls = initializeBookingControls(() => lang, tr);
applyLanguage();
if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(
        (entries) =>
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            }),
        { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach((e) => observer.observe(e));
}
