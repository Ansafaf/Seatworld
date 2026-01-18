
export const escapeRegExp = (string) => {
    if (!string || typeof string !== 'string') return '';
    // Escapes [ ] { } ( ) * + ? . \ ^ $ |
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
