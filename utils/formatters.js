// src/utils/formatters.js
export function formatPrice(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount); 
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getDiscountPercent(price, comparePrice) {
  if (!comparePrice || comparePrice <= price) return null;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function truncate(str, n) {
  return str?.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function formatRating(rating) {
  return Number(rating).toFixed(1);
}
