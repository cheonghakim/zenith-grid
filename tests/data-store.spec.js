import { describe, expect, it, beforeEach } from 'vitest';
import { DataStore } from '../src/core/DataStore.js';

describe('DataStore', () => {
  let store;

  beforeEach(() => {
    store = new DataStore({ rowKey: 'id' });
  });

  describe('setData', () => {
    it('replaces all rows and rebuilds the index', () => {
      store.setData([{ id: 1 }, { id: 2 }]);
      expect(store.size).toBe(2);
      expect(store.getByKey(1)).toMatchObject({ id: 1 });
    });

    it('clears previous data', () => {
      store.setData([{ id: 1 }]);
      store.setData([{ id: 9 }]);
      expect(store.size).toBe(1);
      expect(store.has(1)).toBe(false);
      expect(store.has(9)).toBe(true);
    });
  });

  describe('appendRows / prependRows', () => {
    it('appendRows adds to the end', () => {
      store.setData([{ id: 1 }]);
      store.appendRows([{ id: 2 }, { id: 3 }]);
      const all = store.getAll();
      expect(all.at(-1).id).toBe(3);
      expect(store.size).toBe(3);
    });

    it('prependRows adds to the front', () => {
      store.setData([{ id: 3 }]);
      store.prependRows([{ id: 1 }, { id: 2 }]);
      expect(store.getAll()[0].id).toBe(1);
      expect(store.size).toBe(3);
    });
  });

  describe('updateRow / updateRows', () => {
    it('updateRow replaces the matching row entirely', () => {
      store.setData([{ id: 1, name: 'A', score: 10 }]);
      store.updateRow({ id: 1, name: 'B' });
      expect(store.getByKey(1)).toEqual({ id: 1, name: 'B' });
    });

    it('updateRows handles multiple replacements', () => {
      store.setData([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
      store.updateRows([{ id: 1, v: 'x' }, { id: 2, v: 'y' }]);
      expect(store.getByKey(1).v).toBe('x');
      expect(store.getByKey(2).v).toBe('y');
    });

    it('ignores rows that do not exist', () => {
      store.setData([{ id: 1 }]);
      expect(() => store.updateRow({ id: 99 })).not.toThrow();
      expect(store.size).toBe(1);
    });
  });

  describe('patchRow / patchRows', () => {
    it('patchRow merges fields into existing row', () => {
      store.setData([{ id: 1, name: 'A', status: 'active' }]);
      store.patchRow(1, { status: 'done' });
      expect(store.getByKey(1)).toMatchObject({ id: 1, name: 'A', status: 'done' });
    });

    it('patchRows applies multiple patches', () => {
      store.setData([{ id: 1, v: 0 }, { id: 2, v: 0 }]);
      store.patchRows([{ key: 1, patch: { v: 10 } }, { key: 2, patch: { v: 20 } }]);
      expect(store.getByKey(1).v).toBe(10);
      expect(store.getByKey(2).v).toBe(20);
    });
  });

  describe('upsertRow / upsertRows', () => {
    it('inserts a row that does not exist', () => {
      store.setData([]);
      store.upsertRow({ id: 5, name: 'New' });
      expect(store.has(5)).toBe(true);
      expect(store.size).toBe(1);
    });

    it('updates a row that already exists', () => {
      store.setData([{ id: 5, name: 'Old' }]);
      store.upsertRow({ id: 5, name: 'Updated' });
      expect(store.size).toBe(1);
      expect(store.getByKey(5).name).toBe('Updated');
    });

    it('upsertRows handles a mix of inserts and updates', () => {
      store.setData([{ id: 1, v: 'old' }]);
      store.upsertRows([{ id: 1, v: 'new' }, { id: 2, v: 'fresh' }]);
      expect(store.size).toBe(2);
      expect(store.getByKey(1).v).toBe('new');
      expect(store.has(2)).toBe(true);
    });
  });

  describe('removeRow / removeRows', () => {
    it('removeRow deletes the row and its index entry', () => {
      store.setData([{ id: 1 }, { id: 2 }]);
      store.removeRow(1);
      expect(store.has(1)).toBe(false);
      expect(store.size).toBe(1);
    });

    it('removeRows deletes multiple rows', () => {
      store.setData([{ id: 1 }, { id: 2 }, { id: 3 }]);
      store.removeRows([1, 3]);
      expect(store.size).toBe(1);
      expect(store.has(2)).toBe(true);
    });

    it('ignores unknown keys silently', () => {
      store.setData([{ id: 1 }]);
      expect(() => store.removeRows([99, 100])).not.toThrow();
      expect(store.size).toBe(1);
    });
  });

  describe('trimToMax', () => {
    it('removes rows from the front when size exceeds cap', () => {
      store.setData(Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })));
      store.trimToMax(6);
      expect(store.size).toBe(6);
      expect(store.getAll()[0].id).toBe(5);
    });

    it('does nothing when size is within cap', () => {
      store.setData([{ id: 1 }, { id: 2 }]);
      store.trimToMax(10);
      expect(store.size).toBe(2);
    });
  });

  describe('getAll / getByKey / has / size', () => {
    it('getAll returns a copy of all rows', () => {
      store.setData([{ id: 1 }, { id: 2 }]);
      const all = store.getAll();
      expect(all).toHaveLength(2);
    });

    it('getByKey returns null for missing keys', () => {
      store.setData([]);
      expect(store.getByKey(99)).toBeNull();
    });

    it('has returns true for existing keys', () => {
      store.setData([{ id: 7 }]);
      expect(store.has(7)).toBe(true);
      expect(store.has(8)).toBe(false);
    });
  });

  describe('change tracking', () => {
    it('tracks added keys after appendRows (keys are stored as strings)', () => {
      store.setData([{ id: 1 }]);
      store.clearChangeTracking();
      store.appendRows([{ id: 2 }]);
      expect([...store.getAddedKeys()]).toContain('2');
    });

    it('tracks changed keys after patchRow (keys are stored as strings)', () => {
      store.setData([{ id: 1, v: 0 }]);
      store.clearChangeTracking();
      store.patchRow(1, { v: 1 });
      expect([...store.getChangedKeys()]).toContain('1');
    });

    it('tracks removed keys after removeRow (keys are stored as strings)', () => {
      store.setData([{ id: 1 }, { id: 2 }]);
      store.clearChangeTracking();
      store.removeRow(2);
      expect([...store.getRemovedKeys()]).toContain('2');
    });

    it('clears tracking after clearChangeTracking', () => {
      store.setData([{ id: 1 }]);
      store.patchRow(1, { v: 1 });
      store.clearChangeTracking();
      expect(store.getChangedKeys().size).toBe(0);
    });
  });
});
