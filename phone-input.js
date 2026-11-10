export function initializePhoneInput(input, onEdit) {
    let digits = '7';
    let russian = true;
    const count = (value) => (value.match(/\d/g) || []).length;
    function normalize(value) {
        let next = value.replace(/\D/g, '').slice(0, 15);
        russian = !value.trim().startsWith('+') || next.startsWith('7');
        if (russian) {
            if (next.length === 11 && next.startsWith('8')) next = '7' + next.slice(1);
            else if (next.length === 10) next = '7' + next;
            else if (!next.startsWith('7')) next = '7' + next;
            next = next.slice(0, 11);
        }
        digits = next || '7';
        if (!next) russian = true;
    }
    function formatted() {
        if (!russian) return '+' + digits;
        const n = digits.slice(1);
        return (
            '+7' +
            (n ? ' (' + n.slice(0, 3) : '') +
            (n.length >= 3 ? ')' : '') +
            (n.length > 3 ? ' ' + n.slice(3, 6) : '') +
            (n.length > 6 ? '-' + n.slice(6, 8) : '') +
            (n.length > 8 ? '-' + n.slice(8, 10) : '')
        );
    }
    function paint(ordinal) {
        input.value = formatted();
        if (ordinal === undefined) return;
        let seen = 0;
        let caret = input.value.length;
        if (ordinal === 0) caret = 1;
        else
            for (let i = 0; i < input.value.length; i++) {
                if (/\d/.test(input.value[i]) && ++seen === ordinal) {
                    caret = i + 1;
                    break;
                }
            }
        input.setSelectionRange(caret, caret);
    }
    function edit(type, text = '') {
        const minimum = russian ? 1 : 0;
        let start = Math.max(minimum, count(input.value.slice(0, input.selectionStart)));
        let end = Math.max(minimum, count(input.value.slice(0, input.selectionEnd)));
        if (type.startsWith('delete')) {
            if (start === end) {
                if (type.includes('Backward')) start = Math.max(minimum, start - 1);
                else end = Math.min(digits.length, end + 1);
            }
            digits = digits.slice(0, start) + digits.slice(end);
            paint(start);
        } else {
            if (text === '+' && digits === '7') {
                russian = false;
                digits = '';
                paint(0);
                onEdit();
                return;
            }
            const inserted = text.replace(/\D/g, '');
            if (!inserted) return;
            if (
                inserted.length >= 10 &&
                (text.trim().startsWith('+') || inserted.length === 10 || inserted.startsWith('8'))
            ) {
                normalize(text);
                paint(digits.length);
            } else {
                const limit = russian ? 11 : 15;
                digits = (digits.slice(0, start) + inserted + digits.slice(end)).slice(0, limit);
                if (!russian && digits === '7') russian = true;
                paint(Math.min(start + inserted.length, digits.length));
            }
        }
        onEdit();
    }
    input.addEventListener('beforeinput', (event) => {
        if (!event.cancelable || event.isComposing) return;
        if (event.inputType.startsWith('delete') || event.inputType === 'insertText') {
            event.preventDefault();
            edit(event.inputType, event.data || '');
        }
    });
    input.addEventListener('paste', (event) => {
        event.preventDefault();
        edit('insertText', event.clipboardData.getData('text'));
    });
    input.addEventListener('input', () => {
        const ordinal = count(input.value.slice(0, input.selectionStart));
        normalize(input.value);
        paint(ordinal);
        onEdit();
    });
    input.addEventListener('change', () => {
        normalize(input.value);
        paint();
        onEdit();
    });
    input.addEventListener('focus', () => {
        if (!input.value) paint(digits.length);
    });
    input.addEventListener('blur', () => {
        if (russian && digits === '7') input.value = '';
        else {
            normalize(input.value);
            paint();
        }
    });
    input.addEventListener('keydown', (event) => {
        if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey ||
            input.selectionStart !== input.selectionEnd
        )
            return;
        const caret = input.selectionStart;
        const positions = [...input.value].flatMap((char, index) =>
            /\d/.test(char) && (!russian || index > 1) ? [index] : []
        );
        let target;
        if (event.key === 'ArrowLeft')
            target = positions.filter((index) => index < caret).at(-1) ?? (russian ? 2 : 1);
        if (event.key === 'ArrowRight')
            target = (positions.find((index) => index >= caret) ?? input.value.length - 1) + 1;
        if (event.key === 'Home') target = russian ? 2 : 1;
        if (target !== undefined) {
            event.preventDefault();
            input.setSelectionRange(target, target);
        }
    });
    return {
        format() {
            normalize(input.value);
            paint();
        }
    };
}
