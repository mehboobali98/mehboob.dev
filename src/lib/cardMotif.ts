import { z } from 'astro/zod';

const agent = z.object({ name: z.string(), note: z.string() });
const bar = z.object({ label: z.string(), value: z.number().positive() });

export const cardMotif = z.discriminatedUnion('motif', [
  z.object({ motif: z.literal('path'), labels: z.tuple([z.string(), z.string(), z.string()]) }),
  z.object({ motif: z.literal('agents'), agents: z.tuple([agent, agent, agent]) }),
  z.object({ motif: z.literal('bars'), before: bar, after: bar }),
]);

export type CardMotif = z.infer<typeof cardMotif>;
