/**
 * Laravel-style deterministic gradient avatar from a name/seed.
 * Uses initials over a hashed multi-stop gradient (no external service).
 */
const GRADIENTS = [
  ['#f97316', '#ef4444'], // orange-red
  ['#06b6d4', '#2563eb'], // cyan-blue
  ['#8b5cf6', '#ec4899'], // violet-pink
  ['#10b981', '#0d9488'], // emerald-teal
  ['#f59e0b', '#d97706'], // amber
  ['#3b82f6', '#7c3aed'], // blue-violet
  ['#14b8a6', '#0284c8'], // teal-sky
  ['#f43f5e', '#db2777'], // rose
  ['#84cc16', '#16a34a'], // lime-green
  ['#6366f1', '#4f46e5'], // indigo
];

export function hashSeed(seed = '') {
  const s = String(seed || 'user');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function gradientForSeed(seed = '') {
  const pair = GRADIENTS[hashSeed(seed) % GRADIENTS.length];
  return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

export function initialsFromName(name = '', email = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0]) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return String(email).slice(0, 2).toUpperCase();
  return 'U';
}

/** True only for real uploaded photos / http(s)/data URLs — not emoji placeholders. */
export function isRealPhotoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const v = url.trim();
  if (!v) return false;
  if (v.startsWith('data:image/')) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (v.startsWith('blob:')) return true;
  // emoji / glyph placeholders
  if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}👨👩🌴🌺]$/u.test(v)) return false;
  if (v.length <= 4 && !v.includes('/')) return false;
  return false;
}
