import { describe, expect, it } from 'vitest';
import { DataWorkerHandlers } from '../src/workers/DataWorker.js';

const { sort, filter, groupAggregate, rowDiff } = DataWorkerHandlers;

describe('DataWorkerHandlers', () => {
  describe('sort', () => {
    const rows = [
      { id: 3, name: 'Charlie', score: 80 },
      { id: 1, name: 'Alice', score: 95 },
      { id: 2, name: 'Bob', score: 80 },
    ];

    it('returns original array when sortDefs is empty', () => {
      expect(sort({ rows, sortDefs: [] })).toHaveLength(3);
    });

    it('sorts strings ascending', () => {
      const result = sort({ rows, sortDefs: [{ field: 'name', direction: 'asc', type: 'string' }] });
      expect(result.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts strings descending', () => {
      const result = sort({ rows, sortDefs: [{ field: 'name', direction: 'desc', type: 'string' }] });
      expect(result[0].name).toBe('Charlie');
    });

    it('sorts numbers ascending', () => {
      const result = sort({ rows, sortDefs: [{ field: 'id', direction: 'asc', type: 'number' }] });
      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('applies secondary sort on tie', () => {
      const result = sort({
        rows,
        sortDefs: [
          { field: 'score', direction: 'asc', type: 'number' },
          { field: 'name', direction: 'asc', type: 'string' },
        ],
      });
      expect(result[0].name).toBe('Bob');   // score 80, 'Bob' before 'Charlie'
      expect(result[1].name).toBe('Charlie');
    });

    it('handles null values by putting them last (asc)', () => {
      const withNull = [{ id: 2, name: 'Bob' }, { id: 1, name: null }];
      const result = sort({ rows: withNull, sortDefs: [{ field: 'name', direction: 'asc' }] });
      expect(result[0].name).toBe('Bob');
    });

    it('does not mutate the original array', () => {
      const original = [...rows];
      sort({ rows, sortDefs: [{ field: 'name', direction: 'asc' }] });
      expect(rows).toEqual(original);
    });
  });

  describe('filter', () => {
    const rows = [
      { id: 1, name: 'Alice Johnson', team: 'red', score: 95, status: 'Active' },
      { id: 2, name: 'Bob Smith', team: 'blue', score: 60, status: 'Paused' },
      { id: 3, name: 'Charlie Doe', team: 'red', score: 78, status: 'Active' },
    ];

    it('quickFilter – matches across specified fields (case-insensitive)', () => {
      const result = filter({ rows, quickFilter: 'alice', quickFilterFields: ['name'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('quickFilter – searches all fields when quickFilterFields is empty', () => {
      const result = filter({ rows, quickFilter: 'red', quickFilterFields: [] });
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });

    it('columnFilter – select single value', () => {
      const result = filter({
        rows,
        columnFilters: { status: { type: 'select', field: 'status', value: 'Active' } },
      });
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });

    it('columnFilter – select array of values', () => {
      const result = filter({
        rows,
        columnFilters: { status: { type: 'select', field: 'status', value: ['Active', 'Paused'] } },
      });
      expect(result).toHaveLength(3);
    });

    it('columnFilter – text contains', () => {
      const result = filter({
        rows,
        columnFilters: { name: { type: 'text', field: 'name', operator: 'contains', value: 'doe' } },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Charlie Doe');
    });

    it('columnFilter – text startsWith', () => {
      const result = filter({
        rows,
        columnFilters: { name: { type: 'text', field: 'name', operator: 'startsWith', value: 'bob' } },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('columnFilter – number greaterThan', () => {
      const result = filter({
        rows,
        columnFilters: { score: { type: 'number', field: 'score', operator: 'greaterThan', value: 75 } },
      });
      expect(result.every((r) => r.score > 75)).toBe(true);
    });

    it('columnFilter – number between', () => {
      const result = filter({
        rows,
        columnFilters: { score: { type: 'number', field: 'score', operator: 'between', value: [60, 80] } },
      });
      expect(result.map((r) => r.id)).toEqual([2, 3]);
    });

    it('columnFilter – text notEquals', () => {
      const result = filter({
        rows,
        columnFilters: { status: { type: 'text', field: 'status', operator: 'notEquals', value: 'paused' } },
      });
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });

    it('columnFilter – date before', () => {
      const datedRows = [
        { id: 1, updatedAt: '2026-05-01' },
        { id: 2, updatedAt: '2026-05-10' },
      ];
      const result = filter({
        rows: datedRows,
        columnFilters: { updatedAt: { type: 'date', field: 'updatedAt', operator: 'before', value: '2026-05-05' } },
      });
      expect(result.map((r) => r.id)).toEqual([1]);
    });

    it('quickFilter + columnFilter AND logic', () => {
      const result = filter({
        rows,
        quickFilter: 'red',
        quickFilterFields: ['team'],
        columnFilters: { status: { type: 'select', field: 'status', value: 'Active' } },
      });
      expect(result.every((r) => r.team === 'red' && r.status === 'Active')).toBe(true);
    });

    it('returns all rows when no filters provided', () => {
      expect(filter({ rows })).toHaveLength(rows.length);
    });
  });

  describe('groupAggregate', () => {
    // DataWorker의 calcGroupAggregations은 집계 타입을 문자열 배열로 받는다.
    // e.g. { score: ['sum', 'avg'] }  — GroupManager의 객체 포맷과 다름
    const rows = [
      { id: 1, team: 'red', score: 90 },
      { id: 2, team: 'red', score: 80 },
      { id: 3, team: 'blue', score: 60 },
    ];

    it('computes sum', () => {
      const result = groupAggregate({ rows, groupByFields: ['team'], aggregations: { score: ['sum'] } });
      expect(result.__agg_score_sum).toBe(230);
    });

    it('computes avg', () => {
      const result = groupAggregate({ rows, groupByFields: ['team'], aggregations: { score: ['avg'] } });
      expect(result.__agg_score_avg).toBeCloseTo(76.67, 1);
    });

    it('computes count', () => {
      const result = groupAggregate({ rows, groupByFields: ['team'], aggregations: { score: ['count'] } });
      expect(result.__agg_score_count).toBe(3);
    });

    it('computes min and max', () => {
      const result = groupAggregate({
        rows,
        groupByFields: ['team'],
        aggregations: { score: ['min', 'max'] },
      });
      expect(result.__agg_score_min).toBe(60);
      expect(result.__agg_score_max).toBe(90);
    });
  });

  describe('rowDiff', () => {
    it('detects added keys', () => {
      const result = rowDiff({ prevKeys: ['a', 'b'], nextKeys: ['a', 'b', 'c'] });
      expect(result.added).toEqual(['c']);
    });

    it('detects removed keys', () => {
      const result = rowDiff({ prevKeys: ['a', 'b', 'c'], nextKeys: ['a', 'c'] });
      expect(result.removed).toEqual(['b']);
    });

    it('reports unchanged keys', () => {
      const result = rowDiff({ prevKeys: ['a', 'b'], nextKeys: ['a', 'b', 'c'] });
      expect(result.unchanged).toEqual(['a', 'b']);
    });

    it('handles fully replaced set', () => {
      const result = rowDiff({ prevKeys: ['x', 'y'], nextKeys: ['a', 'b'] });
      expect(result.added).toEqual(['a', 'b']);
      expect(result.removed).toEqual(['x', 'y']);
      expect(result.unchanged).toEqual([]);
    });
  });
});
