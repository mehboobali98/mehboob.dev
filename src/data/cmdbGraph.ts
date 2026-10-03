/** The highlighted traversal: server to its software, to the licence, to the vendor. */
export const hops = [
  { x: 44, y: 148, label: 'srv-014', tier: 'ASSET' },
  { x: 168, y: 176, label: 'SQL Server', tier: 'LEVEL 1' },
  { x: 300, y: 202, label: 'LIC-2291', tier: 'LEVEL 2' },
  { x: 424, y: 236, label: 'Microsoft', tier: 'LEVEL 3' },
];

/** Related records off the highlighted path, each a real CI type. */
export const others = [
  { x: 158, y: 66, label: 'm.ali', type: 'member' },
  { x: 292, y: 44, label: 'INC-4821', type: 'ticket' },
  { x: 132, y: 258, label: 'HQ-Lahore', type: 'location' },
  { x: 408, y: 118, label: 'CTR-77', type: 'contract' },
];

export const quietEdges = [
  [44, 148, 158, 66],
  [158, 66, 292, 44],
  [44, 148, 132, 258],
  [300, 202, 408, 118],
  [168, 176, 132, 258],
];

export const pathD = hops.map((h, i) => `${i === 0 ? 'M' : 'L'}${h.x},${h.y}`).join(' ');

/** The traversal stacked for phones, with one related record off the asset and the licence. */
export const mobileHops = hops.map((h, i) => ({ ...h, y: 36 + i * 80 }));

export const mobileRelated = [
  { hop: 0, label: 'INC-4821', type: 'ticket' },
  { hop: 2, label: 'CTR-77', type: 'contract' },
].map((r) => ({ ...r, y: mobileHops[r.hop].y + 11, from: 44 + mobileHops[r.hop].label.length * 9 }));
