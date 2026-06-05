// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGrid } from '../src/index.js';

describe('FormulaManager', () => {
  let container;
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 960;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return 480;
      },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete HTMLElement.prototype.clientWidth;
    delete HTMLElement.prototype.clientHeight;
  });

  const columns = [
    { id: 'colA', field: 'a', headerName: 'Col A', editable: true },
    { id: 'colB', field: 'b', headerName: 'Col B', editable: true },
    { id: 'colC', field: 'c', headerName: 'Col C', editable: true },
  ];

  it('correctly evaluates static values', async () => {
    const rows = [
      { id: '1', a: 10, b: 'static', c: null },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();

    const gridRows = grid.getRows();
    expect(gridRows[0].a).toBe(10);
    expect(gridRows[0].b).toBe('static');
    expect(gridRows[0].c).toBeNull();
  });

  it('evaluates basic SUM and AVG formulas over a range', async () => {
    const rows = [
      { id: '1', a: 10, b: 20, c: '=SUM(A1:B1)' },
      { id: '2', a: 30, b: 40, c: '=AVG(A1:B2)' },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();

    const gridRows = grid.getRows();
    // A1 = 10, B1 = 20, SUM(A1:B1) = 30
    expect(gridRows[0].c).toBe(30);

    // A1=10, B1=20, A2=30, B2=40
    // AVG(A1:B2) = (10 + 20 + 30 + 40) / 4 = 25
    expect(gridRows[1].c).toBe(25);
  });

  it('handles single cell references', async () => {
    const rows = [
      { id: '1', a: 42, b: '=A1', c: '=B1' },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();

    const gridRows = grid.getRows();
    expect(gridRows[0].b).toBe(42);
    expect(gridRows[0].c).toBe(42);
  });

  it('evaluates multiple comma-separated arguments', async () => {
    const rows = [
      { id: '1', a: 5, b: 10, c: '=SUM(A1, B1)' },
      { id: '2', a: 15, b: 20, c: '=SUM(A1:A2, B1)' },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();

    const gridRows = grid.getRows();
    // SUM(5, 10) = 15
    expect(gridRows[0].c).toBe(15);
    // SUM(A1:A2, B1) = SUM([5, 15], 10) = 30
    expect(gridRows[1].c).toBe(30);
  });

  it('handles nested multi-level formula chains', async () => {
    const rows = [
      { id: '1', a: '=B1', b: '=C1', c: 100 },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();

    const gridRows = grid.getRows();
    expect(gridRows[0].c).toBe(100);
    expect(gridRows[0].b).toBe(100);
    expect(gridRows[0].a).toBe(100);
  });

  it('detects circular references and returns #REF!', async () => {
    const rows = [
      { id: '1', a: '=B1', b: '=A1', c: 0 },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();

    const gridRows = grid.getRows();
    expect(gridRows[0].a).toBe('#REF!');
    expect(gridRows[0].b).toBe('#REF!');
  });

  it('preserves raw formulas during cell editing and updates evaluation on commit', async () => {
    const rows = [
      { id: '1', a: 10, b: 20, c: '=SUM(A1:B1)' },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();
    await flush();
    await flush();

    const gridRows = grid.getRows();
    expect(gridRows[0].c).toBe(30);

    // Simulate editing
    const cellEl = container.querySelector('.ag-row[data-row-key="1"] .ag-cell[data-col-id="colC"]');
    expect(cellEl).toBeTruthy();

    grid.beginCellEdit('1', 'colC', { cell: cellEl });
    await flush();
    const editor = cellEl.querySelector('input, textarea');
    expect(editor).toBeTruthy();
    // Editor should load raw formula, not evaluated value
    expect(editor.value).toBe('=SUM(A1:B1)');

    // Update value to a new formula
    grid.commitCellEdit('1', 'colC', '=SUM(A1:B1, 50)');
    await grid.refresh();
    await flush();

    expect(grid.getRows()[0].c).toBe(80);
  });

  it('clears formula if user commits a static value over it', async () => {
    const rows = [
      { id: '1', a: 10, b: 20, c: '=SUM(A1:B1)' },
    ];
    const grid = createGrid(container, { rows, columns });
    await grid.refresh();

    expect(grid.getRows()[0].c).toBe(30);

    grid.setCellValue('1', 'colC', 999);
    await grid.refresh();

    const gridRows = grid.getRows();
    expect(gridRows[0].c).toBe(999);
    expect(gridRows[0]._formulas?.c).toBeUndefined();
  });

  it('blocks editing on columns with sparkline or echart configuration', async () => {
    const customColumns = [
      { id: 'colA', field: 'a', editable: true },
      { id: 'colB', field: 'b', editable: true, sparkline: { type: 'line' } },
      { id: 'colC', field: 'c', editable: true, echart: { type: 'bar' } },
    ];
    const rows = [{ id: '1', a: 10, b: [1, 2, 3], c: [1, 2, 3] }];
    const grid = createGrid(container, { rows, columns: customColumns });
    await grid.refresh();
    await flush();

    const canEditA = grid.beginCellEdit('1', 'colA');
    expect(canEditA).toBe(true);
    grid.cancelCellEdit();

    const canEditB = grid.beginCellEdit('1', 'colB');
    expect(canEditB).toBe(false);

    const canEditC = grid.beginCellEdit('1', 'colC');
    expect(canEditC).toBe(false);
  });

  it('blocks editing on columns with custom renderer unless explicitly configured as editable', async () => {
    const customColumns = [
      { id: 'colA', field: 'a', renderer: () => 'custom' },
      { id: 'colB', field: 'b', editable: true, renderer: () => 'custom' },
    ];
    const rows = [{ id: '1', a: 10, b: 20 }];
    const grid = createGrid(container, { rows, columns: customColumns, editing: { enabled: true } });
    await grid.refresh();
    await flush();

    const canEditA = grid.beginCellEdit('1', 'colA');
    expect(canEditA).toBe(false);

    const canEditB = grid.beginCellEdit('1', 'colB');
    expect(canEditB).toBe(true);
  });

  it('allows writing formulas in numeric columns by rendering text inputs', async () => {
    const customColumns = [
      { id: 'colA', field: 'a', type: 'number', editable: true },
    ];
    const rows = [{ id: '1', a: 10 }];
    const grid = createGrid(container, { rows, columns: customColumns });
    await grid.refresh();
    await flush();

    const cellEl = container.querySelector('.ag-row[data-row-key="1"] .ag-cell[data-col-id="colA"]');
    grid.beginCellEdit('1', 'colA', { cell: cellEl });
    await flush();

    const editor = cellEl.querySelector('input');
    expect(editor.type).toBe('text');
  });
});
