import { describe, expect, it, beforeEach } from 'vitest';
import { ColumnRegistry } from '../src/core/ColumnRegistry.js';

const defs = [
  { id: 'id', field: 'id', headerName: 'ID', width: 80 },
  { id: 'name', field: 'name', headerName: 'Name', width: 200 },
  { id: 'score', field: 'score', headerName: 'Score', width: 120 },
  { id: 'status', field: 'status', headerName: 'Status', width: 120 },
];

describe('ColumnRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ColumnRegistry(defs);
  });

  describe('getAllLeafColumns / getVisibleLeafColumns', () => {
    it('getAllLeafColumns returns all columns', () => {
      expect(registry.getAllLeafColumns()).toHaveLength(4);
    });

    it('getVisibleLeafColumns returns all by default', () => {
      expect(registry.getVisibleLeafColumns()).toHaveLength(4);
    });

    it('getVisibleLeafColumns excludes hidden columns', () => {
      registry.setVisible('score', false);
      expect(registry.getVisibleLeafColumns()).toHaveLength(3);
    });
  });

  describe('setVisible', () => {
    it('hides a column', () => {
      registry.setVisible('name', false);
      const visible = registry.getVisibleLeafColumns();
      expect(visible.some((c) => c.def.id === 'name')).toBe(false);
    });

    it('shows a previously hidden column', () => {
      registry.setVisible('name', false);
      registry.setVisible('name', true);
      const visible = registry.getVisibleLeafColumns();
      expect(visible.some((c) => c.def.id === 'name')).toBe(true);
    });
  });

  describe('setWidth', () => {
    it('updates the column width', () => {
      registry.setWidth('name', 300);
      const col = registry.getAllLeafColumns().find((c) => c.def.id === 'name');
      expect(col.state.width).toBe(300);
    });
  });

  describe('setPinned', () => {
    it('pins a column to the left', () => {
      registry.setPinned('id', 'left');
      const groups = registry.getColumnsByPin();
      expect(groups.left.some((c) => c.def.id === 'id')).toBe(true);
    });

    it('pins a column to the right', () => {
      registry.setPinned('status', 'right');
      const groups = registry.getColumnsByPin();
      expect(groups.right.some((c) => c.def.id === 'status')).toBe(true);
    });

    it('unpins a column', () => {
      registry.setPinned('id', 'left');
      registry.setPinned('id', null);
      const groups = registry.getColumnsByPin();
      expect(groups.left.some((c) => c.def.id === 'id')).toBe(false);
      expect(groups.center.some((c) => c.def.id === 'id')).toBe(true);
    });
  });

  describe('moveColumn', () => {
    it('reorders a column within the visible list', () => {
      // name is initially at index 1 → move to index 3
      registry.moveColumn('name', 3);
      const visible = registry.getVisibleLeafColumns();
      expect(visible[3].def.id).toBe('name');
    });
  });

  describe('getPinnedWidths', () => {
    it('returns zero width when no columns are pinned', () => {
      const { leftWidth, rightWidth } = registry.getPinnedWidths();
      expect(leftWidth).toBe(0);
      expect(rightWidth).toBe(0);
    });

    it('includes width of pinned left columns', () => {
      registry.setPinned('id', 'left');
      const { leftWidth } = registry.getPinnedWidths();
      expect(leftWidth).toBe(80);
    });
  });

  describe('serializeState / applySerializedState', () => {
    it('round-trips column state', () => {
      registry.setWidth('name', 350);
      registry.setVisible('score', false);
      const serialized = registry.serializeState();

      const registry2 = new ColumnRegistry(defs);
      registry2.applySerializedState(serialized);

      const nameCol = registry2.getAllLeafColumns().find((c) => c.def.id === 'name');
      const scoreCol = registry2.getAllLeafColumns().find((c) => c.def.id === 'score');
      expect(nameCol.state.width).toBe(350);
      expect(scoreCol.state.visible).toBe(false);
    });
  });

  describe('getDef / getState', () => {
    it('getDef returns the column definition', () => {
      expect(registry.getDef('name').headerName).toBe('Name');
    });

    it('getState returns the column state object', () => {
      registry.setWidth('name', 250);
      expect(registry.getState('name').width).toBe(250);
    });
  });
});
