/** A redrawn, generic server rack layout editor: a 2U server dragged from the palette skips a 1U gap and lands in the next free 2U slot. */
export const U = 20;
export const top = 30;

export const palette = [
  { name: 'Server', size: '2U', lit: true },
  { name: 'Switch', size: '1U' },
  { name: 'UPS', size: '2U' },
  { name: 'Firewall', size: '1U' },
];

export const slots = [
  { kind: 'switch', h: 1 },
  { kind: 'gap', h: 1 },
  { kind: 'firewall', h: 1 },
  { kind: 'server', h: 2 },
  { kind: 'ghost', h: 2 },
  { kind: 'server', h: 2 },
  { kind: 'blank', h: 1 },
  { kind: 'ups', h: 2 },
].reduce<{ kind: string; h: number; u: number }[]>((placed, slot) => {
  const last = placed.at(-1);
  return [...placed, { ...slot, u: last ? last.u + last.h : 0 }];
}, []);

export const layouts = [
  { id: 'd', cls: 'hidden sm:block', width: 460, pal: 140, rackX: 250, rackW: 210, items: 4 },
  { id: 'm', cls: 'sm:hidden', width: 300, pal: 96, rackX: 122, rackW: 178, items: 3 },
];

export const ghost = slots.find((s) => s.kind === 'ghost')!;
export const height = top + slots.reduce((sum, s) => sum + s.h, 0) * U + 8;
