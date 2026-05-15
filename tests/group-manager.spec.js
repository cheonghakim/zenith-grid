import { describe, expect, it, beforeEach } from 'vitest';
import { GroupManager } from '../src/managers/GroupManager.js';
/* eslint-disable no-unused-vars */

const rows = [
  { id: 1, team: 'red', score: 90 },
  { id: 2, team: 'blue', score: 70 },
  { id: 3, team: 'red', score: 80 },
  { id: 4, team: 'blue', score: 60 },
  { id: 5, team: 'gold', score: 50 },
];

describe('GroupManager', () => {
  let manager;

  beforeEach(() => {
    manager = new GroupManager();
  });

  describe('enable / disable / isEnabled', () => {
    it('isEnabled returns false initially', () => {
      expect(manager.isEnabled()).toBe(false);
    });

    it('isEnabled returns true after enable', () => {
      manager.enable(['team']);
      expect(manager.isEnabled()).toBe(true);
    });

    it('disable sets isEnabled to false', () => {
      manager.enable(['team']);
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('flatten – basic grouping', () => {
    it('inserts group-header rows before data rows', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const headers = flat.filter((r) => r._type === 'group-header');
      expect(headers.length).toBe(3); // red, blue, gold
    });

    it('group-header contains the correct group value', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const header = flat.find((r) => r._type === 'group-header' && r._groupValue === 'red');
      expect(header).toBeDefined();
      expect(header._childCount).toBe(2);
    });

    it('data rows under a group have _depth: 1', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const dataRows = flat.filter((r) => r._type !== 'group-header');
      expect(dataRows.every((r) => r._depth === 1)).toBe(true);
    });

    it('returns plain rows when disabled', () => {
      const flat = manager.flatten([...rows]);
      expect(flat.every((r) => !r._type || r._type === 'data')).toBe(true);
    });
  });

  describe('collapseGroup / expandGroup / isCollapsed / toggleGroup', () => {
    it('collapseGroup hides child rows', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const redHeader = flat.find((r) => r._type === 'group-header' && r._groupValue === 'red');
      manager.collapseGroup(redHeader._groupKey);
      const flatAfter = manager.flatten([...rows]);
      const redData = flatAfter.filter((r) => r._type !== 'group-header' && r.team === 'red');
      expect(redData).toHaveLength(0);
    });

    it('expandGroup restores child rows', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const redHeader = flat.find((r) => r._type === 'group-header' && r._groupValue === 'red');
      manager.collapseGroup(redHeader._groupKey);
      manager.expandGroup(redHeader._groupKey);
      const flatAfter = manager.flatten([...rows]);
      const redData = flatAfter.filter((r) => r._type !== 'group-header' && r.team === 'red');
      expect(redData).toHaveLength(2);
    });

    it('toggleGroup alternates collapsed state', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const key = flat.find((r) => r._type === 'group-header')._groupKey;
      expect(manager.isCollapsed(key)).toBe(false);
      manager.toggleGroup(key);
      expect(manager.isCollapsed(key)).toBe(true);
      manager.toggleGroup(key);
      expect(manager.isCollapsed(key)).toBe(false);
    });
  });

  describe('collapseAll / expandAll', () => {
    it('collapseAll fires a collapseAll event (groups must be collapsed individually)', () => {
      // collapseAll()은 GridCore에 이벤트를 발행하며, 실제 그룹키를 모르는 상태에서
      // 직접 _collapsedGroups를 수정하지 않는다. flatten() 후 그룹키를 알 수 있다.
      const events = [];
      const mgr = new GroupManager({ onChanged: (e) => events.push(e) });
      mgr.enable(['team']);
      mgr.collapseAll();
      expect(events.at(-1).action).toBe('collapseAll');
    });

    it('individual collapseGroup calls hide their respective data rows', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const keys = flat.filter((r) => r._type === 'group-header').map((r) => r._groupKey);
      keys.forEach((k) => manager.collapseGroup(k));
      const collapsedFlat = manager.flatten([...rows]);
      const data = collapsedFlat.filter((r) => r._type !== 'group-header');
      expect(data).toHaveLength(0);
    });

    it('expandAll clears all collapsed state', () => {
      manager.enable(['team']);
      const flat = manager.flatten([...rows]);
      const keys = flat.filter((r) => r._type === 'group-header').map((r) => r._groupKey);
      keys.forEach((k) => manager.collapseGroup(k));
      manager.expandAll();
      const expandedFlat = manager.flatten([...rows]);
      const data = expandedFlat.filter((r) => r._type !== 'group-header');
      expect(data).toHaveLength(rows.length);
    });
  });

  describe('aggregations', () => {
    it('computes avg aggregation on a numeric field', () => {
      manager.enable(['team'], {
        aggregations: { score: [{ type: 'avg' }] },
      });
      const flat = manager.flatten([...rows]);
      const redHeader = flat.find((r) => r._type === 'group-header' && r._groupValue === 'red');
      expect(redHeader.__agg_score_avg).toBeCloseTo(85);
    });

    it('computes sum aggregation', () => {
      manager.enable(['team'], {
        aggregations: { score: [{ type: 'sum' }] },
      });
      const flat = manager.flatten([...rows]);
      const blueHeader = flat.find((r) => r._type === 'group-header' && r._groupValue === 'blue');
      expect(blueHeader.__agg_score_sum).toBe(130);
    });
  });

  describe('getState', () => {
    it('returns enabled and groupByFields', () => {
      manager.enable(['team']);
      const state = manager.getState();
      expect(state.enabled).toBe(true);
      expect(state.groupByFields).toContain('team');
    });
  });
});
