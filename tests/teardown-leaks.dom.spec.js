// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BodyRenderer } from '../src/renderer/BodyRenderer.js';
import { InfiniteScrollManager } from '../src/managers/InfiniteScrollManager.js';
import { WorkerBridge } from '../src/core/WorkerBridge.js';
import { createGrid } from '../src/index.js';

describe('rich tooltip teardown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function makeBody(def) {
    const rowsContainer = document.createElement('div');
    document.body.appendChild(rowsContainer);
    const column = { def, state: { width: 120 } };
    const body = new BodyRenderer(
      { updateVirtualSpace() {}, getRowsContainer: () => rowsContainer },
      { getVisibleLeafColumns: () => [column], getColumnsByPin: () => ({ left: [], center: [column], right: [] }) },
      {
        getVerticalRange: () => ({ startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 }),
        getHorizontalRange: () => ({ startColIndex: 0, endColIndex: 0 }),
        getRowHeight: () => 40,
        isVariableRowHeight: () => false,
      },
      {},
    );
    const range = {
      vertical: { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 40 },
      horizontal: { startColIndex: 0, endColIndex: 0 },
    };
    return { body, rowsContainer, range };
  }

  it('does not create the tooltip when the cell is disposed before the hover timer fires', () => {
    const tooltipComponent = vi.fn(() => 'tip');
    const { body, rowsContainer, range } = makeBody({ id: 'a', field: 'a', tooltipComponent });
    body.render([{ _rowKey: '1', a: 'x' }], range);

    const cell = rowsContainer.querySelector('.ck-zenith-grid-cell[data-col-id="a"]');
    cell.dispatchEvent(new MouseEvent('mouseenter'));
    body.clear(); // grid torn down while hovered

    vi.advanceTimersByTime(1000);
    expect(tooltipComponent).not.toHaveBeenCalled();
    expect(document.querySelector('.ck-zenith-grid-rich-tooltip')).toBeNull();
  });

  it('removes an already-visible tooltip when the cell is re-rendered', () => {
    const { body, rowsContainer, range } = makeBody({ id: 'a', field: 'a', tooltipComponent: () => 'tip' });
    const rows = [{ _rowKey: '1', a: 'x' }];
    body.render(rows, range);

    rowsContainer.querySelector('.ck-zenith-grid-cell[data-col-id="a"]').dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(500);
    expect(document.querySelectorAll('.ck-zenith-grid-rich-tooltip')).toHaveLength(1);

    body.render(rows, range); // e.g. a live update while hovered
    expect(document.querySelectorAll('.ck-zenith-grid-rich-tooltip')).toHaveLength(0);
  });
});

describe('InfiniteScrollManager destroy', () => {
  it('ignores a load-more response that arrives after destroy()', async () => {
    let resolveLoad;
    const onChanged = vi.fn();
    const manager = new InfiniteScrollManager({
      mode: 'server',
      onChanged,
      onLoadMore: () => new Promise((resolve) => { resolveLoad = resolve; }),
    });

    const pending = manager.loadMore();
    expect(onChanged).toHaveBeenCalledWith({ action: 'loadingStart' });
    onChanged.mockClear();

    manager.destroy();
    resolveLoad({ rows: [{ id: 1 }], hasMore: true });
    await pending;

    expect(onChanged).not.toHaveBeenCalled();
    expect(manager.getState().loading).toBe(false);
    expect(manager.getState().hasMore).toBe(false);
  });
});

describe('WorkerBridge blob URL', () => {
  let originalWorker;
  let originalCreate;
  let originalRevoke;

  class MockWorker {
    addEventListener() {}
    postMessage() {}
    terminate() {}
  }

  beforeEach(() => {
    originalWorker = window.Worker;
    originalCreate = window.URL.createObjectURL;
    originalRevoke = window.URL.revokeObjectURL;
    window.Worker = MockWorker;
    let n = 0;
    window.URL.createObjectURL = vi.fn(() => `blob:mock/${++n}`);
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    window.Worker = originalWorker;
    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
  });

  it('revokes the inline worker URL on destroy, once per created URL', () => {
    for (let i = 0; i < 3; i += 1) {
      const bridge = new WorkerBridge({ enabled: true });
      bridge.destroy();
      bridge.destroy(); // idempotent
    }
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(3);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(window.URL.revokeObjectURL.mock.calls.map((c) => c[0])).toEqual(
      window.URL.createObjectURL.mock.results.map((r) => r.value),
    );
  });

  it('revokes the URL when Worker construction throws', () => {
    window.Worker = class {
      constructor() {
        throw new Error('no workers here');
      }
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bridge = new WorkerBridge({ enabled: true });
    expect(bridge.isEnabled).toBe(false);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('does not touch object URLs when an explicit workerUrl is given', () => {
    const bridge = new WorkerBridge({ enabled: true, workerUrl: '/worker.js' });
    bridge.destroy();
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe('advanced filter dialog teardown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 960 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 480 });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete HTMLElement.prototype.clientWidth;
    delete HTMLElement.prototype.clientHeight;
  });

  function makeGrid() {
    const host = document.createElement('div');
    document.body.appendChild(host);
    return createGrid(host, {
      rowKey: 'id',
      rows: [{ id: 1, name: 'A' }],
      columns: [{ id: 'name', field: 'name', width: 120 }],
      sidePanel: { enabled: true, defaultOpen: true, defaultTab: 'filters' },
    });
  }

  it('removes the dialog and its document listener on grid.destroy()', () => {
    const grid = makeGrid();
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    grid._settingsPanel._openAdvancedFilterBuilder();
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.ck-zenith-grid-advanced-filter-dialog')).not.toBeNull();
    const dismiss = addSpy.mock.calls.find((c) => c[0] === 'pointerdown')?.[1];
    expect(typeof dismiss).toBe('function');

    grid.destroy();
    vi.runAllTimers();

    expect(document.querySelector('.ck-zenith-grid-advanced-filter-dialog')).toBeNull();
    expect(removeSpy.mock.calls.some((c) => c[0] === 'pointerdown' && c[1] === dismiss)).toBe(true);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('destroying before the deferred listener registration never adds it', () => {
    const grid = makeGrid();
    const addSpy = vi.spyOn(document, 'addEventListener');

    grid._settingsPanel._openAdvancedFilterBuilder();
    grid.destroy(); // dialog open, setTimeout(0) not yet fired
    vi.runAllTimers();

    expect(addSpy.mock.calls.some((c) => c[0] === 'pointerdown')).toBe(false);
    expect(document.querySelector('.ck-zenith-grid-advanced-filter-dialog')).toBeNull();
    addSpy.mockRestore();
  });

  it('cancel and outside click still close the dialog and unhook the listener', () => {
    const grid = makeGrid();
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const panel = grid._settingsPanel;

    panel._openAdvancedFilterBuilder();
    vi.advanceTimersByTime(1);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(document.querySelector('.ck-zenith-grid-advanced-filter-dialog')).toBeNull();
    expect(removeSpy.mock.calls.some((c) => c[0] === 'pointerdown')).toBe(true);

    panel._openAdvancedFilterBuilder();
    vi.advanceTimersByTime(1);
    const cancel = [...document.querySelectorAll('.ck-zenith-grid-advanced-filter-dialog button')].at(-1);
    cancel.click();
    expect(document.querySelector('.ck-zenith-grid-advanced-filter-dialog')).toBeNull();
    expect(panel._advancedFilterDismiss).toBeNull();

    grid.destroy();
    removeSpy.mockRestore();
  });
});
