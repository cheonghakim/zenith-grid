import { describe, expect, it, beforeEach } from 'vitest';
import { SortManager } from '../src/managers/SortManager.js';

const rows = [
  { id: 3, name: 'Charlie', score: 80, createdAt: '2024-03-01' },
  { id: 1, name: 'Alice', score: 95, createdAt: '2024-01-15' },
  { id: 2, name: 'Bob', score: 80, createdAt: '2024-02-10' },
];

describe('SortManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SortManager();
  });

  describe('hasSort / clearSort', () => {
    it('hasSort returns false initially', () => {
      expect(manager.hasSort()).toBe(false);
    });

    it('hasSort returns true after setSort', () => {
      manager.setSort([{ field: 'name', direction: 'asc' }]);
      expect(manager.hasSort()).toBe(true);
    });

    it('clearSort resets to no-sort state', () => {
      manager.setSort([{ field: 'name', direction: 'asc' }]);
      manager.clearSort();
      expect(manager.hasSort()).toBe(false);
    });
  });

  describe('setSort / sort() – string', () => {
    it('sorts strings ascending', () => {
      manager.setSort([{ field: 'name', direction: 'asc' }]);
      const sorted = manager.sort([...rows]);
      expect(sorted.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts strings descending', () => {
      manager.setSort([{ field: 'name', direction: 'desc' }]);
      const sorted = manager.sort([...rows]);
      expect(sorted.map((r) => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });
  });

  describe('sort() – number', () => {
    it('sorts numbers ascending', () => {
      manager.setSort([{ field: 'score', direction: 'asc', type: 'number' }]);
      const sorted = manager.sort([...rows]);
      expect(sorted.map((r) => r.score)).toEqual([80, 80, 95]);
    });

    it('sorts numbers descending', () => {
      manager.setSort([{ field: 'id', direction: 'desc', type: 'number' }]);
      const sorted = manager.sort([...rows]);
      expect(sorted[0].id).toBe(3);
    });
  });

  describe('sort() – date', () => {
    it('sorts dates ascending', () => {
      manager.setSort([{ field: 'createdAt', direction: 'asc', type: 'date' }]);
      const sorted = manager.sort([...rows]);
      expect(sorted[0].createdAt).toBe('2024-01-15');
      expect(sorted.at(-1).createdAt).toBe('2024-03-01');
    });
  });

  describe('multi-sort (secondary sort)', () => {
    it('applies secondary sort when primary values are equal', () => {
      manager.setSort([
        { field: 'score', direction: 'asc', type: 'number' },
        { field: 'name', direction: 'asc' },
      ]);
      const sorted = manager.sort([...rows]);
      // score 80 tie (Bob, Charlie) → Bob before Charlie alphabetically; Alice (95) is last
      expect(sorted[0].name).toBe('Bob');
      expect(sorted[1].name).toBe('Charlie');
      expect(sorted[2].name).toBe('Alice');
    });
  });

  describe('toggleSort', () => {
    it('first toggle → asc', () => {
      manager.toggleSort('name', { field: 'name' });
      expect(manager.getSortForField('name')?.direction).toBe('asc');
    });

    it('second toggle → desc', () => {
      manager.toggleSort('name', { field: 'name' });
      manager.toggleSort('name', { field: 'name' });
      expect(manager.getSortForField('name')?.direction).toBe('desc');
    });

    it('third toggle → cleared (getSortForField returns null)', () => {
      manager.toggleSort('name', { field: 'name' });
      manager.toggleSort('name', { field: 'name' });
      manager.toggleSort('name', { field: 'name' });
      expect(manager.getSortForField('name')).toBeNull();
    });
  });

  describe('addSort (multi-sort)', () => {
    it('appends sort without clearing existing sorts', () => {
      manager.setSort([{ field: 'score', direction: 'asc', type: 'number' }]);
      manager.addSort('name', { field: 'name' });
      const state = manager.getState();
      expect(state.sortDefs).toHaveLength(2);
    });
  });

  describe('custom comparator', () => {
    it('uses the provided comparator function', () => {
      manager.setSort([{
        field: 'name',
        direction: 'asc',
        comparator: (a, b) => b.localeCompare(a), // reverse alpha
      }]);
      const sorted = manager.sort([...rows]);
      expect(sorted[0].name).toBe('Charlie');
    });
  });

  describe('getState / getSerializableDefs', () => {
    it('getState returns current sortDefs', () => {
      manager.setSort([{ field: 'id', direction: 'asc' }]);
      expect(manager.getState().sortDefs[0].field).toBe('id');
    });

    it('getSerializableDefs strips comparator functions', () => {
      manager.setSort([{ field: 'name', direction: 'asc', comparator: () => 0 }]);
      const defs = manager.getSerializableDefs();
      expect(defs[0]).not.toHaveProperty('comparator');
    });
  });
});
