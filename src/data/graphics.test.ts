import { describe, expect, it } from 'vitest';
import { hops, mobileHops, others, quietEdges } from './cmdbGraph';
import { desktopEdges, mobileNodes, nodes } from './workflowGraph';
import { agents, rail, wall } from './agentsDiagram';
import { ghost, palette, slots } from './rackLayout';

describe('graphic data', () => {
  it('CMDB has the four-hop answer path and four related records', () => {
    expect(hops.map((h) => h.label)).toEqual(['srv-014', 'SQL Server', 'LIC-2291', 'Microsoft']);
    expect(mobileHops.map((h) => h.y)).toEqual([36, 116, 196, 276]);
    expect(others).toHaveLength(4);
    expect(quietEdges).toHaveLength(5);
  });
  it('workflow has four nodes per layout and three edges', () => {
    expect(nodes.map((n) => n.label)).toEqual(['Trigger', 'Condition', 'Connector', 'Action']);
    expect(mobileNodes).toHaveLength(4);
    expect(desktopEdges).toHaveLength(3);
  });
  it('validator rail sits left of a wall at 97', () => {
    expect(agents.map((a) => a.name)).toEqual(['auditor', 'estimator', 'validator']);
    expect([rail, wall]).toEqual([11, 97]);
  });
  it('rack places the 2U ghost at U5', () => {
    expect(ghost).toMatchObject({ kind: 'ghost', h: 2, u: 5 });
    expect(slots.reduce((n, s) => n + s.h, 0)).toBe(12);
    expect(palette[0]).toMatchObject({ name: 'Server', size: '2U', lit: true });
  });
});
