/**
 * The signed-in user's profile. Today it's a local, device-stored account
 * (no backend), which is enough for testers to create a user and start using
 * the app; it's shaped to swap for real auth (email/OAuth + server) later.
 */

export type Profile = {
  name: string;
  handle: string;
  cityId: string;
  initials: string;
  color: string; // avatar color (design-system var)
  passportNo: number;
  joined: string; // "JUL 2026"
};

export const AVATAR_COLORS = [
  'var(--sun-500)',
  'var(--ink-400)',
  'var(--stamp-green)',
  'var(--stamp-blue)',
  'var(--stamp-pink)',
];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function suggestHandle(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  return clean ? '@' + clean.slice(0, 16) : '';
}

export function makeProfile(input: { name: string; handle: string; cityId: string; color: string }): Profile {
  const d = new Date();
  const name = input.name.trim() || 'New Nomad';
  return {
    name,
    handle: input.handle.trim() || suggestHandle(name),
    cityId: input.cityId,
    initials: initialsOf(name),
    color: input.color,
    passportNo: 1000 + Math.floor(Math.random() * 8999),
    joined: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
  };
}

/** Demo identity used as a fallback before an account exists. */
export const DEFAULT_IDENTITY = {
  name: 'June Ozawa',
  handle: '@june',
  initials: 'JO',
  color: 'var(--sun-400)',
  passportNo: 4102,
  joined: 'MAR 2026',
  cityId: 'cdmx',
};

export function identity(p: Profile | null) {
  return p ?? DEFAULT_IDENTITY;
}
