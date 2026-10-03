/** The workflow canvas's four nodes: a trigger, a condition, and two branching actions. */
export const nodes = [
  { x: 8, y: 62, w: 136, label: 'Trigger', sub: 'member.offboarded', kind: 'lit' },
  { x: 176, y: 62, w: 124, label: 'Condition', sub: 'status = inactive', kind: 'quiet' },
  { x: 332, y: 20, w: 132, label: 'Connector', sub: 'Entra: update user', kind: 'lit' },
  { x: 332, y: 104, w: 132, label: 'Action', sub: 'open ticket', kind: 'quiet' },
];

/** The same four nodes stacked for phones, sized to render at 12px or more. */
export const mobileNodes = [
  { ...nodes[0], x: 0, y: 0, w: 244 },
  { ...nodes[1], x: 0, y: 82, w: 244 },
  { ...nodes[2], x: 40, y: 170, w: 260 },
  { ...nodes[3], x: 40, y: 252, w: 260 },
];

/** The connector lines between desktop nodes: trigger to condition, then to each branch. */
export const desktopEdges = ['M144,86 L176,86', 'M300,86 C318,86 318,44 332,44', 'M300,86 C318,86 318,128 332,128'];

/** The connector lines between phone nodes, stacked vertically. */
export const mobileEdges = ['M24,54 L24,82', 'M24,136 L24,185 Q24,197 36,197 L40,197', 'M24,136 L24,267 Q24,279 36,279 L40,279'];
