import { z } from 'astro/zod';

/** Share-card accents: amber for the brand and AI work, otherwise the colour of the technology a card is about. */
export const accents = {
  signal: '#E0A84E',
  mysql: '#3FA7C0',
  react: '#61DAFB',
  ruby: '#E0463C',
  go: '#00ADD8',
  cloudflare: '#F38020',
  javascript: '#F7DF1E',
  node: '#6CC24A',
  homeassistant: '#18BCF2',
} as const;

type AccentName = keyof typeof accents;

const accent = z.enum(Object.keys(accents) as [AccentName, ...AccentName[]]);
const agent = z.object({ name: z.string(), note: z.string() });
const bar = z.object({ label: z.string(), value: z.number().positive() });
const chip = z.object({ label: z.string(), accent: accent.optional() });
const flag = z.object({ name: z.string(), on: z.boolean() });
const line = z.object({ text: z.string(), tone: z.enum(['plain', 'quiet', 'accent', 'struck']).default('plain') });

export const cardMotif = z.discriminatedUnion('motif', [
  z.object({ motif: z.literal('path'), accent: accent.optional(), labels: z.tuple([z.string(), z.string(), z.string()]) }),
  z.object({ motif: z.literal('agents'), accent: accent.optional(), agents: z.tuple([agent, agent, agent]) }),
  z.object({ motif: z.literal('bars'), accent: accent.optional(), before: bar, after: bar }),
  z.object({ motif: z.literal('fan'), accent: accent.optional(), hub: z.string().optional(), chips: z.array(chip).min(2).max(5) }),
  z.object({ motif: z.literal('bits'), accent: accent.optional(), call: z.string(), column: z.string(), flags: z.array(flag).min(1).max(8) }),
  z.object({ motif: z.literal('log'), accent: accent.optional(), lines: z.array(line).min(2).max(7) }),
]);

export type CardMotif = z.input<typeof cardMotif>;
