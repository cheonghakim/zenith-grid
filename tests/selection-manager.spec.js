import { describe, expect, it, beforeEach } from 'vitest';
import { SelectionManager } from '../src/managers/SelectionManager.js';

function makeRows(ids) {
  return ids.map((id) => ({ id, _rowKey: String(id), _type: 'data' }));
}

describe('SelectionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SelectionManager({ rowKey: 'id' });
  });

  describe('selectRow / deselectRow / isSelected', () => {
    it('selectRow marks a row as selected', () => {
      manager.setCurrentRows(makeRows([1, 2, 3]));
      manager.selectRow('1');
      expect(manager.isSelected('1')).toBe(true);
      expect(manager.isSelected('2')).toBe(false);
    });

    it('deselectRow removes selection', () => {
      manager.setCurrentRows(makeRows([1, 2]));
      manager.selectRow('1');
      manager.deselectRow('1');
      expect(manager.isSelected('1')).toBe(false);
    });
  });

  describe('toggleRow', () => {
    it('toggles selection on and off', () => {
      manager.setCurrentRows(makeRows([1]));
      manager.toggleRow('1');
      expect(manager.isSelected('1')).toBe(true);
      manager.toggleRow('1');
      expect(manager.isSelected('1')).toBe(false);
    });
  });

  describe('selectAll / clearSelection', () => {
    it('selectAll selects all current rows', () => {
      const rows = makeRows([1, 2, 3]);
      manager.setCurrentRows(rows);
      manager.selectAll(rows);
      expect(manager.getSelectedCount()).toBe(3);
    });

    it('clearSelection removes all selections', () => {
      const rows = makeRows([1, 2]);
      manager.setCurrentRows(rows);
      manager.selectAll(rows);
      manager.clearSelection();
      expect(manager.getSelectedCount()).toBe(0);
    });
  });

  describe('shiftSelect (range selection)', () => {
    it('selects a range between two keys', () => {
      const rows = makeRows([1, 2, 3, 4, 5]);
      manager.setCurrentRows(rows);
      manager.selectRow('2');
      manager.shiftSelect('4');
      expect(manager.isSelected('2')).toBe(true);
      expect(manager.isSelected('3')).toBe(true);
      expect(manager.isSelected('4')).toBe(true);
    });
  });

  describe('getSelectedKeys / getSelectedCount / getState', () => {
    it('getSelectedKeys returns Set of selected keys', () => {
      manager.setCurrentRows(makeRows([1, 2]));
      manager.selectRow('1');
      const keys = manager.getSelectedKeys();
      expect(keys.has('1')).toBe(true);
    });

    it('getSelectedCount returns correct count', () => {
      manager.setCurrentRows(makeRows([1, 2, 3]));
      manager.selectRow('1');
      manager.selectRow('3');
      expect(manager.getSelectedCount()).toBe(2);
    });

    it('getState reflects current selection', () => {
      const rows = makeRows([1, 2]);
      manager.setCurrentRows(rows);
      manager.selectAll(rows);
      const state = manager.getState();
      expect(state.selectedCount).toBe(2);
      expect(state.allSelected).toBe(true);
    });
  });

  describe('isAllSelected / isSomeSelected', () => {
    it('isAllSelected returns true only when all rows are selected', () => {
      const rows = makeRows([1, 2]);
      manager.setCurrentRows(rows);
      manager.selectRow('1');
      expect(manager.isAllSelected(rows)).toBe(false);
      manager.selectRow('2');
      expect(manager.isAllSelected(rows)).toBe(true);
    });

    it('isSomeSelected returns true when at least one is selected', () => {
      const rows = makeRows([1, 2, 3]);
      manager.setCurrentRows(rows);
      expect(manager.isSomeSelected(rows)).toBe(false);
      manager.selectRow('2');
      expect(manager.isSomeSelected(rows)).toBe(true);
    });
  });

  describe('setRowsSelected (batch)', () => {
    it('selects multiple rows at once', () => {
      manager.setCurrentRows(makeRows([1, 2, 3]));
      manager.setRowsSelected(['1', '3'], true);
      expect(manager.isSelected('1')).toBe(true);
      expect(manager.isSelected('2')).toBe(false);
      expect(manager.isSelected('3')).toBe(true);
    });

    it('deselects multiple rows at once', () => {
      const rows = makeRows([1, 2, 3]);
      manager.setCurrentRows(rows);
      manager.selectAll(rows);
      manager.setRowsSelected(['1', '2'], false);
      expect(manager.isSelected('1')).toBe(false);
      expect(manager.isSelected('3')).toBe(true);
    });
  });
});
