/**
 * Escapes regex special characters in a string.
 * Useful for handling user input in $regex queries.
 * @param {string} string 
 * @returns {string}
 */
export const escapeRegExp = (string) => {
    if (!string || typeof string !== 'string') return '';
    // Escapes [ ] { } ( ) * + ? . \ ^ $ |
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
