// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { BodyRenderer } from '../src/renderer/BodyRenderer.js';

describe('BodyRenderer', () => {
  it('uses column renderer output when provided', () => {
    const rowsContainer = document.createElement('div');
    const rendererSpy = vi.fn(({ value }) => {
      const el = document.createElement('strong');
      el.className = 'score-pill';
      el.textContent = `score:${value}`;
      return el;
    });

    const domRenderer = {
      updateVirtualSpace() {},
      getRowsContainer() {
        return rowsContainer;
      },
    };

    const columnModel = {
      getVisibleLeafColumns() {
        return [{ def: { id: 'score', field: 'score' }, state: { width: 120 } }];
      },
      getColumnsByPin() {
        return {
          left: [],
          center: [{ def: { id: 'score', field: 'score' }, state: { width: 120 } }],
          right: [],
        };
      },
    };

    const viewModel = {
      getVerticalRange() {
        return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 };
      },
      getHorizontalRange() {
        return { startColIndex: 0, endColIndex: 0 };
      },
      getRowHeight() {
        return 40;
      },
      isVariableRowHeight() {
        return false;
      },
    };

    const bodyRenderer = new BodyRenderer(domRenderer, columnModel, viewModel, {});

    bodyRenderer.render(
      [{ _rowKey: '1', score: 42 }],
      {
        vertical: { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 },
        horizontal: { startColIndex: 0, endColIndex: 0 },
      }
    );

    expect(rendererSpy).not.toHaveBeenCalled();

    const rendererBody = new BodyRenderer(domRenderer, columnModel, viewModel, {});
    columnModel.getColumnsByPin = () => ({
      left: [],
      center: [{ def: { id: 'score', field: 'score', renderer: rendererSpy }, state: { width: 120 } }],
      right: [],
    });

    rendererBody.render(
      [{ _rowKey: '2', score: 84 }],
      {
        vertical: { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 },
        horizontal: { startColIndex: 0, endColIndex: 0 },
      }
    );

    expect(rendererSpy).toHaveBeenCalled();
    expect(rowsContainer.querySelector('.score-pill')?.textContent).toBe('score:84');
  });

  it('supports row and cell hooks plus row-level selection disabling', () => {
    const rowsContainer = document.createElement('div');
    const beforeRowRender = vi.fn(({ rowElement }) => {
      rowElement.dataset.hooked = 'true';
    });
    const afterCellRender = vi.fn(({ cell }) => {
      cell.dataset.afterCell = 'done';
    });

    const domRenderer = {
      updateVirtualSpace() {},
      getRowsContainer() {
        return rowsContainer;
      },
    };

    const columnModel = {
      getVisibleLeafColumns() {
        return [{ def: { id: 'name', field: 'name' }, state: { width: 120 } }];
      },
      getColumnsByPin() {
        return {
          left: [],
          center: [{ def: { id: 'name', field: 'name' }, state: { width: 120 } }],
          right: [],
        };
      },
    };

    const viewModel = {
      getVerticalRange() {
        return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 };
      },
      getHorizontalRange() {
        return { startColIndex: 0, endColIndex: 0 };
      },
      getRowHeight() {
        return 40;
      },
      isVariableRowHeight() {
        return false;
      },
    };

    const bodyRenderer = new BodyRenderer(domRenderer, columnModel, viewModel, {
      selectionEnabled: true,
      isRowSelectable: () => false,
      selectionManager: {
        isRowChecked: () => false,
        isRowIndeterminate: () => false,
      },
      hooks: {
        beforeRowRender,
        afterCellRender,
      },
    });

    bodyRenderer.render(
      [{ _rowKey: '1', name: 'Alpha' }],
      {
        vertical: { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 },
        horizontal: { startColIndex: 0, endColIndex: 0 },
      }
    );

    expect(beforeRowRender).toHaveBeenCalled();
    expect(afterCellRender).toHaveBeenCalled();
    expect(rowsContainer.querySelector('.ck-zenith-grid-row')?.dataset.hooked).toBe('true');
    expect(rowsContainer.querySelector('.ck-zenith-grid-cell[data-after-cell="done"]')).not.toBeNull();
    expect(rowsContainer.querySelector('.ck-zenith-grid-selection-checkbox')?.disabled).toBe(true);
  });
});
