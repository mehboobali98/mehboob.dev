export interface Point {
  x: number;
  y: number;
}

export interface WorkNode extends Point {
  label: string;
  note: string;
  href: string;
  dx: number;
  dy: number;
  anchor: 'start' | 'end';
}

/** The four things built, in career order, in the 624 x 470 graph viewBox. */
export const work: WorkNode[] = [
  { x: 118, y: 322, label: 'sync', note: '12-15h to <1h', href: '#sync', dx: 18, dy: -4, anchor: 'start' },
  { x: 244, y: 208, label: 'CMDB', note: 'n-level traversal', href: '#cmdb', dx: -18, dy: -26, anchor: 'end' },
  { x: 366, y: 274, label: 'rmine', note: 'Go, open source', href: '#open-source', dx: 18, dy: -4, anchor: 'start' },
  { x: 452, y: 150, label: 'workflow', note: 'node canvas', href: '#workflow', dx: 18, dy: -4, anchor: 'start' },
];

/** Where the career path begins. */
export const start: Point = { x: 18, y: 392 };

/** The quiet mesh: everything else in five years that isn't one of the four. */
export const mesh: [number, number, number, number][] = [
  [140, 180, 96, 96], [60, 250, 20, 170], [140, 180, 232, 118],
  [232, 118, 300, 60], [300, 60, 404, 84], [186, 402, 268, 430], [268, 430, 360, 396],
  [360, 396, 452, 424], [404, 84, 500, 52], [452, 424, 520, 356], [96, 96, 176, 40],
  [232, 118, 244, 208], [404, 84, 452, 150], [186, 402, 118, 322], [520, 356, 452, 150],
];

export const meshNodes: [number, number][] = [
  [60, 250], [140, 180], [96, 96], [20, 170], [232, 118], [300, 60], [404, 84],
  [186, 402], [268, 430], [360, 396], [452, 424], [500, 52], [520, 356], [176, 40],
];
