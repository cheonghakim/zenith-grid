// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGrid } from '../src/index.js';
import { createContextMenuPlugin, uppercaseTeamPlugin, createXlsxExportPlugin } from '../src/plugins/index.js';

// Hoisted mock functions for exceljs
const mockAddRow = vi.fn();
const mockWriteBuffer = vi.fn().mockResolvedValue(Buffer.from([]));
const mockAddWorksheet = vi.fn().mockReturnValue({
  addRow: mockAddRow,
});
const mockWorkbookInstance = {
  addWorksheet: mockAddWorksheet,
  xlsx: {
    writeBuffer: mockWriteBuffer,
  }
};

vi.mock('exceljs', () => {
  const WorkbookMock = vi.fn().mockImplementation(() => mockWorkbookInstance);
  return {
    Workbook: WorkbookMock,
    default: {
      Workbook: WorkbookMock,
    }
  };
});


function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GridCore DOM smoke', () => {
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
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete HTMLElement.prototype.clientWidth;
    delete HTMLElement.prototype.clientHeight;
  });

  it('renders rows, supports HTMLElement cell renderers, and updates the side panel state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, team: 'red', name: 'Alpha', score: 42 },
        { id: 2, team: 'blue', name: 'Beta', score: 84 },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 120 },
        { id: 'team', field: 'team', headerName: 'Team', width: 120 },
        { id: 'score', field: 'score', headerName: 'Score', width: 120 },
      ],
      availablePlugins: [{ plugin: uppercaseTeamPlugin }],
      sidePanel: {
        enabled: true,
        defaultOpen: true,
        defaultTab: 'view',
      },
      liveUpdates: {
        enabled: true,
        rowAnimationEnabled: true,
      },
    });

    await flush();
    await flush();
    await vi.waitFor(() => {
      expect(host.querySelectorAll('.ag-row').length).toBeGreaterThan(0);
    });

    expect(host.textContent).toContain('Row Motion');
    expect(host.textContent).toContain('Animated');

    grid.setLiveRowAnimationEnabled(false);
    await flush();

    expect(grid.isLiveRowAnimationEnabled()).toBe(false);
    expect(host.textContent).toContain('Static');

    grid.usePlugin(uppercaseTeamPlugin);
    await flush();

    expect(grid.getRows()[0].team).toBe('RED');

    grid.destroy();
  });

  it('accepts a selector string container and keeps grid accessibility metadata in sync', async () => {
    const host = document.createElement('div');
    host.id = 'grid-host';
    document.body.appendChild(host);

    const grid = createGrid('#grid-host', {
      rowKey: 'id',
      rows: [
        { id: 1, name: 'Alpha', team: 'Red' },
        { id: 2, name: 'Beta', team: 'Blue' },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 180 },
        { id: 'team', field: 'team', headerName: 'Team', width: 140 },
      ],
    });

    await flush();
    await flush();

    expect(host.getAttribute('role')).toBe('grid');
    expect(host.getAttribute('aria-rowcount')).toBe('2');
    expect(host.getAttribute('aria-colcount')).toBe('3');

    grid.destroy();
  });

  it('shows tree toggles immediately when tree mode is enabled', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        {
          id: 'north',
          name: 'North',
          children: [
            { id: 'north-1', name: 'Child 1' },
          ],
          hasChildren: true,
        },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 180 },
      ],
      tree: {
        treeMode: 'children',
        childrenField: 'children',
        hasChildrenField: 'hasChildren',
      },
    });

    grid.enableTree({
      treeMode: 'children',
      childrenField: 'children',
      hasChildrenField: 'hasChildren',
    });

    await flush();
    await flush();

    await vi.waitFor(() => {
      expect(host.querySelector('.ag-row-tree .ag-row-toggle')).not.toBeNull();
    });

    expect(host.querySelector('.ag-row-kind-tree')).not.toBeNull();

    grid.destroy();
  });

  it('lets callers disable row selection and decorate rows through simple options', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      selectable: true,
      isRowSelectable: (row) => row.locked !== true,
      getRowClassName: (row) => (row.locked ? 'is-locked' : null),
      getRowStyle: (row) => (row.locked ? { opacity: '0.7' } : null),
      hooks: {
        afterCellRender: ({ row, cell }) => {
          if (row.locked) {
            cell.dataset.locked = 'true';
          }
        },
      },
      rows: [
        { id: 'open', name: 'Open row', locked: false },
        { id: 'locked', name: 'Locked row', locked: true },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 180 },
      ],
    });

    await flush();
    await flush();

    const lockedRow = host.querySelector('.ag-row[data-row-key="locked"]');
    const lockedCheckbox = lockedRow?.querySelector('.ag-selection-checkbox');

    expect(lockedRow?.classList.contains('is-locked')).toBe(true);
    expect(lockedRow?.style.opacity).toBe('0.7');
    expect(lockedRow?.querySelector('[data-locked="true"]')).not.toBeNull();
    expect(lockedCheckbox?.disabled).toBe(true);

    lockedRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(grid.getSelectedKeys().size).toBe(0);

    grid.destroy();
  });

  it('renders richer per-column filter controls and marks filtered headers', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, status: 'Active', score: 50 },
        { id: 2, status: 'Paused', score: 80 },
      ],
      columns: [
        { id: 'status', field: 'status', headerName: 'Status', width: 160, filterType: 'select', filterOptions: ['Active', 'Paused'] },
        { id: 'score', field: 'score', headerName: 'Score', width: 160, type: 'number' },
      ],
      sidePanel: {
        enabled: true,
        defaultOpen: true,
        defaultTab: 'filters',
      },
    });

    await flush();
    await flush();

    expect(host.querySelector('.ag-side-panel-select-multiple')).not.toBeNull();
    expect(grid.getColumnFilterChoices('status').map((entry) => entry.value)).toEqual(['Active', 'Paused']);
    expect(host.querySelector('.ag-header-filter-button')).not.toBeNull();

    grid.setColumnFilter('status', { type: 'select', field: 'status', operator: 'in', value: ['Active'] });
    await flush();

    expect(host.querySelector('.ag-header-cell-filtered[data-col-id="status"]')).not.toBeNull();

    grid.destroy();
  });

  it('opens a header filter popover from the column action button', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, name: 'Alpha' },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 160 },
      ],
    });

    await flush();
    await flush();

    host.querySelector('.ag-header-filter-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(document.body.querySelector('.ag-header-filter-popover')).not.toBeNull();

    grid.destroy();
  });

  it('renders custom loading, empty, and error overlays', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ rows: [], totalCount: 0 })
      .mockRejectedValueOnce(new Error('remote failed'));

    const grid = createGrid(host, {
      rowKey: 'id',
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 160 },
      ],
      rows: [],
      displayMode: 'paginated',
      pagination: {
        mode: 'server',
        pageSize: 10,
        fetchPage,
      },
      renderLoadingState: ({ kind }) => {
        const el = document.createElement('div');
        el.dataset.overlayKind = kind;
        el.textContent = 'loading overlay';
        return el;
      },
      renderEmptyState: ({ kind }) => {
        const el = document.createElement('div');
        el.dataset.overlayKind = kind;
        el.textContent = 'empty overlay';
        return el;
      },
      renderErrorState: ({ kind }) => {
        const el = document.createElement('div');
        el.dataset.overlayKind = kind;
        el.textContent = 'error overlay';
        return el;
      },
    });

    await vi.waitFor(() => {
      expect(fetchPage).toHaveBeenCalledTimes(1);
      expect(host.querySelector('[data-overlay-kind="empty"]')).not.toBeNull();
    });

    fetchPage.mockRejectedValueOnce(new Error('retry failed'));
    await grid._loadServerPage(1, 10);

    await vi.waitFor(() => {
      expect(host.querySelector('[data-overlay-kind="error"]')).not.toBeNull();
      expect(host.querySelector('.ag-overlay-action')?.textContent).toBe('Retry');
    });

    grid.destroy();
  });

  it('supports basic keyboard navigation between header and cells', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, name: 'Alpha', team: 'Red' },
        { id: 2, name: 'Beta', team: 'Blue' },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 160 },
        { id: 'team', field: 'team', headerName: 'Team', width: 140 },
      ],
    });

    await flush();
    await flush();

    const firstHeader = host.querySelector('[data-grid-focusable="header"][data-col-index="0"]');
    expect(firstHeader).not.toBeNull();

    firstHeader.focus();
    grid._moveHeaderFocus(firstHeader, 'ArrowDown', { preventDefault() {} });
    await flush();
    expect(document.activeElement?.getAttribute('data-grid-focusable')).toBe('cell');
    expect(document.activeElement?.getAttribute('data-row-index')).toBe('0');
    expect(document.activeElement?.getAttribute('data-col-index')).toBe('0');

    grid._moveCellFocus(document.activeElement, 'ArrowRight', { preventDefault() {} });
    await flush();
    expect(document.activeElement?.getAttribute('data-col-index')).toBe('1');

    grid._moveCellFocus(document.activeElement, 'ArrowDown', { preventDefault() {} });
    await flush();
    expect(document.activeElement?.getAttribute('data-row-index')).toBe('1');

    grid._moveCellFocus(document.activeElement, 'ArrowUp', { preventDefault() {} });
    await flush();
    expect(document.activeElement?.getAttribute('data-row-index')).toBe('0');
    expect(document.activeElement?.getAttribute('data-col-index')).toBe('1');

    grid._moveCellFocus(document.activeElement, 'ArrowLeft', { preventDefault() {} });
    await flush();
    expect(document.activeElement?.getAttribute('data-col-index')).toBe('0');

    grid._moveCellFocus(document.activeElement, 'ArrowUp', { preventDefault() {} });
    await flush();
    expect(document.activeElement?.getAttribute('data-grid-focusable')).toBe('header');

    grid.destroy();
  });

  it('keeps filter popovers scoped to the correct grid and closes them on escape', async () => {
    const firstHost = document.createElement('div');
    const secondHost = document.createElement('div');
    document.body.append(firstHost, secondHost);

    const options = {
      rowKey: 'id',
      rows: [{ id: 1, name: 'Alpha' }],
      columns: [{ id: 'name', field: 'name', headerName: 'Name', width: 160 }],
    };

    const firstGrid = createGrid(firstHost, options);
    const secondGrid = createGrid(secondHost, options);

    await flush();
    await flush();

    secondHost.querySelector('.ag-header-filter-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    const popover = document.body.querySelector('.ag-header-filter-popover');
    expect(popover).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flush();

    expect(document.body.querySelector('.ag-header-filter-popover')).toBeNull();

    firstGrid.destroy();
    secondGrid.destroy();
  });

  it('exports visible rows to csv and supports context-menu plugins', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const menuPlugin = createContextMenuPlugin({
      getItems: ({ row }) => [
        {
          label: `Inspect ${row.name}`,
          onSelect: () => {},
        },
      ],
    });

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, name: 'Alpha', team: 'Red' },
        { id: 2, name: 'Beta', team: 'Blue' },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 160 },
        { id: 'team', field: 'team', headerName: 'Team', width: 140 },
      ],
      plugins: [menuPlugin],
    });

    await flush();
    await flush();

    const csv = grid.exportCsv({ scope: 'all', columns: ['name', 'team'] });
    expect(csv).toContain('Name,Team');
    expect(csv).toContain('Alpha,Red');

    host.querySelector('.ag-cell[data-col-id="name"]')?.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 80,
    }));
    await flush();

    expect(document.body.querySelector('.ag-context-menu-item')?.textContent).toContain('Inspect Alpha');

    grid.destroy();
  });

  it('edits cells, validates values, and exposes clipboard/export helpers', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      editing: { enabled: true },
      rows: [
        { id: 1, name: 'Alpha', score: 10 },
        { id: 2, name: 'Beta', score: 20 },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 160, editable: true },
        {
          id: 'score',
          field: 'score',
          headerName: 'Score',
          width: 120,
          type: 'number',
          editable: true,
          validator: ({ value }) => Number(value) >= 0 || 'Score must be positive',
        },
      ],
    });

    await flush();
    await flush();

    expect(grid.setCellValue(1, 'name', 'Alpha Edited')).toBe(true);
    await flush();
    expect(grid.getRows()[0].name).toBe('Alpha Edited');

    expect(grid.setCellValue(1, 'score', -1)).toBe(false);
    await flush();
    expect(grid.getCellValidationError(1, 'score')).toBe('Score must be positive');
    expect(host.querySelector('.ag-cell-invalid[data-col-id="score"]')).not.toBeNull();

    expect(grid.setCellValue(1, 'score', 30)).toBe(true);
    await flush();
    expect(grid.getValidationErrors()).toEqual([]);

    grid.setRowSelected(1, true);
    await flush();
    const clipboard = grid.copySelectionToClipboard({ columns: ['name', 'score'] });
    expect(clipboard).toContain('Alpha Edited\t30');

    expect(grid.pasteFromClipboard('Gamma\t40', { startRowKey: 2, columns: ['name', 'score'] })).toBe(2);
    await flush();
    expect(grid.getRows()[1].name).toBe('Gamma');
    expect(grid.getRows()[1].score).toBe(40);

    expect(grid.exportExcel({ scope: 'all', columns: ['name', 'score'] })).toContain('<table>');

    const stats = await grid.benchmarkLiveUpdates({ rowsPerSecond: 5, durationMs: 120, batchSize: 1 });
    expect(stats.generated).toBeGreaterThan(0);

    grid.destroy();
  });

  it('renders select, date, and textarea editors and supports autoSizeColumn/autoSizeAllColumns', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      editing: { enabled: true },
      rows: [
        { id: 1, team: 'Red', joined: '2026-06-05', note: 'Hello world' },
      ],
      columns: [
        { id: 'team', field: 'team', headerName: 'Team', width: 120, editable: true, editor: 'select', options: ['Red', 'Blue'] },
        { id: 'joined', field: 'joined', headerName: 'Joined Date', width: 120, editable: true, editor: 'date' },
        { id: 'note', field: 'note', headerName: 'Note', width: 120, editable: true, editor: 'textarea' },
      ],
    });

    await flush();
    await flush();

    // 1. Verify editor rendering
    grid.beginCellEdit(1, 'team');
    await flush();
    let cell = host.querySelector('.ag-cell[data-col-id="team"]');
    let editor = cell?.querySelector('.ag-cell-editor');
    expect(editor?.tagName).toBe('SELECT');
    expect(editor?.value).toBe('Red');

    // Finish team edit
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    await flush();

    grid.beginCellEdit(1, 'joined');
    await flush();
    cell = host.querySelector('.ag-cell[data-col-id="joined"]');
    editor = cell?.querySelector('.ag-cell-editor');
    expect(editor?.tagName).toBe('INPUT');
    expect(editor?.type).toBe('date');

    // Finish joined edit
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    await flush();

    grid.beginCellEdit(1, 'note');
    await flush();
    cell = host.querySelector('.ag-cell[data-col-id="note"]');
    editor = cell?.querySelector('.ag-cell-editor');
    expect(editor?.tagName).toBe('TEXTAREA');
    expect(editor?.value).toBe('Hello world');

    // Finish note edit
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    await flush();

    // 2. Verify autoSizeColumn
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const el = originalCreateElement.call(document, tagName);
      if (tagName.toLowerCase() === 'canvas') {
        el.getContext = (type) => {
          if (type === '2d') {
            return {
              font: '',
              measureText: (text) => ({ width: text.length * 10 }),
            };
          }
          return null;
        };
      }
      return el;
    };

    grid.autoSizeColumn('team');
    await flush();
    expect(grid.getColumnState().columns.find(c => c.colId === 'team').width).toBe(76);

    grid.autoSizeAllColumns();
    await flush();
    expect(grid.getColumnState().columns.find(c => c.colId === 'joined').width).toBe(146);

    document.createElement = originalCreateElement;
    grid.destroy();
  });

  it('renders Set Filter checkbox list with search and filters rows accordingly', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, team: 'Red' },
        { id: 2, team: 'Blue' },
        { id: 3, team: 'Green' },
      ],
      columns: [
        { id: 'team', field: 'team', headerName: 'Team', width: 120, filterType: 'set' },
      ],
    });

    await flush();
    await flush();

    // Open filter popover
    host.querySelector('.ag-header-filter-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    const popover = document.body.querySelector('.ag-header-filter-popover');
    expect(popover).not.toBeNull();

    // Check that there is a search box, select all, and the checkboxes for Red, Blue, Green
    const searchInput = popover.querySelector('input[type="search"]');
    const selectAllCheck = popover.querySelector('.ag-filter-checkbox'); // first one is Select All
    const checkboxes = popover.querySelectorAll('.ag-filter-list-container .ag-filter-checkbox');
    
    expect(searchInput).not.toBeNull();
    expect(selectAllCheck).not.toBeNull();
    expect(checkboxes.length).toBe(3); // Red, Blue, Green

    // Ticking Blue and Green
    const blueCheck = [...popover.querySelectorAll('.ag-filter-checkbox-label')].find(el => el.textContent === 'Blue')?.querySelector('input');
    const greenCheck = [...popover.querySelectorAll('.ag-filter-checkbox-label')].find(el => el.textContent === 'Green')?.querySelector('input');
    
    expect(blueCheck).not.toBeUndefined();
    expect(greenCheck).not.toBeUndefined();

    // Check Blue and Green
    blueCheck.checked = true;
    blueCheck.dispatchEvent(new Event('change', { bubbles: true }));
    greenCheck.checked = true;
    greenCheck.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    await flush();

    // The grid should now only contain Blue and Green
    expect(grid.getRows().length).toBe(2);
    expect(grid.getRows().map(r => r.team)).toEqual(['Blue', 'Green']);

    // Now test search input inside filter popover
    searchInput.value = 're';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    // Under search query 're', only Red and Green should be listed in the checkboxes list
    const visibleLabels = [...popover.querySelectorAll('.ag-filter-checkbox-label')].map(el => el.textContent);
    expect(visibleLabels).toContain('Red');
    expect(visibleLabels).toContain('Green');
    expect(visibleLabels).not.toContain('Blue');

    grid.destroy();
  });

  it('exports to XLSX using xlsxExportPlugin and falls back correctly', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    vi.clearAllMocks();

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, name: 'Alpha', score: 100 },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 120 },
        { id: 'score', field: 'score', headerName: 'Score', width: 100 },
      ],
      plugins: [createXlsxExportPlugin({ fileName: 'test.xlsx' })],
    });

    await flush();
    await flush();

    // Trigger downloadXlsx
    await grid.downloadXlsx({ fileName: 'override.xlsx' });

    expect(mockAddWorksheet).toHaveBeenCalledWith('Sheet1');
    expect(mockAddRow).toHaveBeenCalledWith(['Name', 'Score']);
    expect(mockAddRow).toHaveBeenCalledWith(['Alpha', 100]);
    expect(mockWriteBuffer).toHaveBeenCalled();

    grid.destroy();
  });

  it('supports row dragging and cell spanning (rowSpan/colSpan)', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      rowDragging: true,
      rows: [
        { id: 1, name: 'Alpha', score: 100, merge: true },
        { id: 2, name: 'Beta', score: 200, merge: false },
        { id: 3, name: 'Gamma', score: 300, merge: false },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 120, rowDrag: true },
        {
          id: 'score',
          field: 'score',
          headerName: 'Score',
          width: 100,
          rowSpan: ({ row }) => row.merge ? 2 : 1,
          colSpan: ({ row }) => row.merge ? 2 : 1,
        },
      ],
    });

    await flush();
    await flush();

    // 1. Verify row drag handle rendering
    const dragHandle = host.querySelector('.ag-cell[data-col-id="name"] .ag-row-drag-handle');
    expect(dragHandle).not.toBeNull();

    // 2. Verify row reordering on drop
    const firstRowEl = host.querySelector('.ag-row[data-row-key="1"]');
    const thirdRowEl = host.querySelector('.ag-row[data-row-key="3"]');
    
    // Simulate drag start on first row and drop on third row
    const dragStartEvent = new MouseEvent('dragstart', { bubbles: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: {
        setData: vi.fn(),
        getData: () => '1',
      }
    });
    dragHandle.dispatchEvent(dragStartEvent);
    
    const dropEvent = new MouseEvent('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: () => '1',
      }
    });
    thirdRowEl.dispatchEvent(dropEvent);
    await flush();
    await flush();

    // Verify reordered rows
    expect(grid.getRows().map(r => r.id)).toEqual([2, 3, 1]);

    // Recreate grid to check spanning
    grid.destroy();
    
    const gridSpanning = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 10, name: 'A', score: 10, merge: true },
        { id: 20, name: 'B', score: 20, merge: false },
      ],
      columns: [
        { id: 'name', field: 'name', headerName: 'Name', width: 120 },
        {
          id: 'score',
          field: 'score',
          headerName: 'Score',
          width: 100,
          rowSpan: ({ row }) => row.merge ? 2 : 1,
        },
      ],
    });

    gridSpanning._viewModel.setViewportSize(960, 480);
    await gridSpanning.refresh();

    const cellSpanned = host.querySelector('.ag-row[data-row-key="10"] .ag-cell[data-col-id="score"]');
    const cellSkipped = host.querySelector('.ag-row[data-row-key="20"] .ag-cell[data-col-id="score"]');
    
    expect(cellSpanned).not.toBeNull();
    // rowSpan is 2 -> height should be 36 * 2 = 72px
    expect(cellSpanned.style.height).toBe('72px');
    expect(cellSkipped).toBeNull(); // Skipped due to span

    gridSpanning.destroy();
  });

  it('blocks editing on primary key column and ignores arrow keys in editor', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const grid = createGrid(host, {
      rowKey: 'id',
      editing: { enabled: true },
      rows: [
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Beta' },
      ],
      columns: [
        { id: 'id', field: 'id', headerName: 'ID', width: 80 },
        { id: 'name', field: 'name', headerName: 'Name', width: 160, editable: true },
      ],
    });

    await flush();
    await flush();

    // 1. Try to edit 'id' cell (should be blocked)
    const canEditId = grid.beginCellEdit(1, 'id');
    expect(canEditId).toBe(false);

    // 2. Edit 'name' cell
    const canEditName = grid.beginCellEdit(1, 'name');
    expect(canEditName).toBe(true);

    const cell = host.querySelector('.ag-cell[data-col-id="name"]');
    const editor = cell?.querySelector('.ag-cell-editor');
    expect(editor).not.toBeNull();

    // Focus editor
    editor.focus();

    // Dispatch ArrowDown event on editor (should not call _moveCellFocus / blur editor)
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    editor.dispatchEvent(arrowDownEvent);
    await flush();

    // Verify cell is still in editing mode
    expect(cell.classList.contains('ag-cell-editing')).toBe(true);
    expect(cell.querySelector('.ag-cell-editor')).not.toBeNull();

    // Clean up
    grid.destroy();
  });
});
