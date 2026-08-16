import { AccentKey } from '../types';

export interface Accent {
  /** Saturated fill for avatars and badges */
  solid: string;
  /** Tinted surface for bubbles, chips and highlights */
  soft: string;
  /** Readable text colour on a soft surface */
  text: string;
  /** Hairline border matching the accent */
  border: string;
  /** Focus / selection ring */
  ring: string;
}

export const ACCENTS: Record<AccentKey, Accent> = {
  indigo: {
    solid: 'bg-indigo-600',
    soft: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    ring: 'ring-indigo-500',
  },
  rose: {
    solid: 'bg-rose-500',
    soft: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'ring-rose-500',
  },
  amber: {
    solid: 'bg-amber-500',
    soft: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-500',
  },
  emerald: {
    solid: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500',
  },
  sky: {
    solid: 'bg-sky-500',
    soft: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    ring: 'ring-sky-500',
  },
  violet: {
    solid: 'bg-violet-500',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    ring: 'ring-violet-500',
  },
};

const ACCENT_KEYS: AccentKey[] = ['indigo', 'emerald', 'violet', 'amber', 'sky', 'rose'];

export function accentOf(key?: AccentKey, id?: string): Accent {
  if (key && ACCENTS[key]) {
    return ACCENTS[key];
  }
  if (id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % ACCENT_KEYS.length;
    return ACCENTS[ACCENT_KEYS[index]];
  }
  return ACCENTS.indigo;
}

export function nowLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
