/**
 * helpers.js — Pure utility functions for Logistics Helper v3
 */

/** Generate a unique ID for items */
export const generateId = () => {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

/** Format currency for display */
export const formatCurrency = (amount, currency = 'RM') => {
    if (amount === null || amount === undefined || isNaN(amount)) return `${currency} 0.00`;
    return `${currency} ${Number(amount).toFixed(2)}`;
};

/** Format number with thousand separators */
export const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString();
};

/** Debounce function for search inputs */
export const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/** Clamp a number between min and max */
export const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

/** Short human date for display ("12 Sept 2026"); '' on invalid input. */
export const formatShortDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Stable presentation order: displayOrder ascending, legacy nulls last. */
export const byDisplayOrder = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const x = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const y = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    return x - y;
  });

/** Round to specified decimal places */
export const roundTo = (num, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
};
