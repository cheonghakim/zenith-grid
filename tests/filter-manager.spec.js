import { describe, expect, it, beforeEach } from 'vitest';
import { FilterManager } from '../src/managers/FilterManager.js';

const rows = [
  { id: 1, name: 'Alice Johnson', team: 'red', score: 95, status: 'Active' },
  { id: 2, name: 'Bob Smith', team: 'blue', score: 60, status: 'Paused' },
  { id: 3, name: 'Charlie Doe', team: 'red', score: 78, status: 'Active' },
  { id: 4, name: 'Diana Prince', team: 'gold', score: 40, status: 'Review' },
];

describe('FilterManager', () => {
  let manager;

  beforeEach(() => {
    manager = new FilterManager();
  });

  describe('hasFilter / clearFilters', () => {
    it('hasFilter returns false initially', () => {
      expect(manager.hasFilter()).toBe(false);
    });

    it('hasFilter returns true after setQuickFilter', () => {
      manager.setQuickFilter('alice', ['name']);
      expect(manager.hasFilter()).toBe(true);
    });

    it('clearAllFilters resets everything', () => {
      manager.setQuickFilter('test', ['name']);
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: 'Active' });
      manager.clearAllFilters();
      expect(manager.hasFilter()).toBe(false);
    });
  });

  describe('quickFilter', () => {
    it('returns rows matching the search text (case-insensitive)', () => {
      manager.setQuickFilter('alice', ['name']);
      const result = manager.filter([...rows]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('searches across multiple fields', () => {
      manager.setQuickFilter('red', ['name', 'team']);
      const result = manager.filter([...rows]);
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });

    it('returns all rows when quick filter is cleared', () => {
      manager.setQuickFilter('alice', ['name']);
      manager.clearQuickFilter();
      expect(manager.filter([...rows])).toHaveLength(rows.length);
    });

    it('returns empty array when no rows match', () => {
      manager.setQuickFilter('zzz_no_match', ['name']);
      expect(manager.filter([...rows])).toHaveLength(0);
    });
  });

  describe('column filter – text (contains)', () => {
    it('filters by partial string match', () => {
      manager.setColumnFilter('name', { type: 'text', field: 'name', operator: 'contains', value: 'doe' });
      const result = manager.filter([...rows]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Charlie Doe');
    });
  });

  describe('column filter – select', () => {
    it('filters by exact value', () => {
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: 'Active' });
      const result = manager.filter([...rows]);
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });

    it('filters by array of values', () => {
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: ['Active', 'Paused'] });
      const result = manager.filter([...rows]);
      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
    });
  });

  describe('column filter – number', () => {
    it('greaterThan operator', () => {
      manager.setColumnFilter('score', { type: 'number', field: 'score', operator: 'greaterThan', value: 75 });
      const result = manager.filter([...rows]);
      expect(result.every((r) => r.score > 75)).toBe(true);
    });

    it('clears a between filter when both range values are empty', () => {
      manager.setColumnFilter('score', { type: 'number', field: 'score', operator: 'between', value: ['', ''] });
      expect(manager.hasFilter()).toBe(false);
    });
  });

  describe('column filter – date', () => {
    it('supports before operator', () => {
      const datedRows = [
        { id: 1, updatedAt: '2026-05-01' },
        { id: 2, updatedAt: '2026-05-10' },
      ];
      manager.setColumnFilter('updatedAt', { type: 'date', field: 'updatedAt', operator: 'before', value: '2026-05-05' });
      expect(manager.filter([...datedRows]).map((row) => row.id)).toEqual([1]);
    });
  });

  describe('combined filters', () => {
    it('quickFilter and columnFilter work together (AND logic)', () => {
      manager.setQuickFilter('red', ['team']);
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: 'Active' });
      const result = manager.filter([...rows]);
      // Both Alice and Charlie are in red, but only Active ones
      expect(result.every((r) => r.team === 'red' && r.status === 'Active')).toBe(true);
    });
  });

  describe('clearColumnFilter', () => {
    it('removes only the specified column filter', () => {
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: 'Active' });
      manager.setColumnFilter('team', { type: 'select', field: 'team', value: 'red' });
      manager.clearColumnFilter('status');
      // Now only team filter active
      const result = manager.filter([...rows]);
      expect(result.every((r) => r.team === 'red')).toBe(true);
    });
  });

  describe('getState / getWorkerPayload', () => {
    it('getState reflects current filters', () => {
      manager.setQuickFilter('bob', ['name']);
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: 'Paused' });
      const state = manager.getState();
      expect(state.quickFilter).toBe('bob');
      expect(state.columnFilters.status).toBeDefined();
    });

    it('getWorkerPayload includes column filters (DataWorker ignores fn for custom type)', () => {
      manager.setColumnFilter('status', { type: 'select', field: 'status', value: 'Active' });
      const payload = manager.getWorkerPayload();
      expect(payload.columnFilters?.status).toBeDefined();
      expect(payload.quickFilter).toBeDefined();
    });
  });
});
