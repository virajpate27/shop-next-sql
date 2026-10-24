// utils/ts.js — API now returns ISO strings instead of Firestore Timestamps.
// Replace every `v?.toDate ? v.toDate().getTime() : 0` (15 places) with toMs(v).
export const toMs = (v) => { if (!v) return 0; const t = new Date(v).getTime(); return Number.isNaN(t) ? 0 : t }
