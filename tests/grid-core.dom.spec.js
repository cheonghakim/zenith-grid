// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGrid } from '../src/index.js';
import { createContextMenuPlugin, uppercaseTeamPlugin } from '../src/plugins/index.js';

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
});
