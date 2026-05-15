// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGrid } from '../src/index.js';
import { uppercaseTeamPlugin } from '../src/plugins/index.js';

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
});
