import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewModel } from '../src/core/ViewModel.js';
import { VirtualScrollManager } from '../src/managers/VirtualScrollManager.js';
import { InfiniteScrollManager } from '../src/managers/InfiniteScrollManager.js';

describe('ViewModel', () => {
  it('calculates height before index for fixed rows', () => {
    const viewModel = new ViewModel({ rowHeight: 40 });

    expect(viewModel.getHeightBeforeIndex(0)).toBe(0);
    expect(viewModel.getHeightBeforeIndex(3)).toBe(120);
  });

  it('calculates height before index for variable rows', () => {
    const viewModel = new ViewModel({ rowHeight: 40, variableRowHeight: true });

    viewModel.setTotalCount(4);
    viewModel.setRowHeightAt(1, 60);
    viewModel.setRowHeightAt(2, 90);

    expect(viewModel.getHeightBeforeIndex(0)).toBe(0);
    expect(viewModel.getHeightBeforeIndex(2)).toBe(100);
    expect(viewModel.getHeightBeforeIndex(3)).toBe(190);
  });
});

describe('VirtualScrollManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete globalThis.ResizeObserver;
  });

  it('does not auto-scroll while the user is actively scrolling', () => {
    const viewModel = new ViewModel({ rowHeight: 40 });
    viewModel.setTotalCount(50);
    viewModel.setViewportSize(600, 200);
    viewModel.setScrollPosition(1700, 0);

    const manager = new VirtualScrollManager(viewModel, {
      autoScroll: true,
      autoScrollThreshold: 200,
    });

    let scrollToCalls = 0;
    const viewport = {
      scrollTop: 1700,
      scrollLeft: 0,
      clientWidth: 600,
      clientHeight: 200,
      addEventListener() {},
      removeEventListener() {},
      scrollTo() {
        scrollToCalls += 1;
      },
    };

    manager.mount(viewport, { scrollLeft: 0 });
    manager._userScrolling = true;
    manager.maybeAutoScrollToBottom();

    expect(scrollToCalls).toBe(0);
  });

  it('auto-scrolls to bottom when enabled and near the end', () => {
    const viewModel = new ViewModel({ rowHeight: 40 });
    viewModel.setTotalCount(50);
    viewModel.setViewportSize(600, 200);
    viewModel.setScrollPosition(1760, 0);

    const manager = new VirtualScrollManager(viewModel, {
      autoScroll: true,
      autoScrollThreshold: 80,
    });

    const calls = [];
    const viewport = {
      scrollTop: 1760,
      scrollLeft: 0,
      clientWidth: 600,
      clientHeight: 200,
      addEventListener() {},
      removeEventListener() {},
      scrollTo(options) {
        calls.push(options);
      },
    };

    manager.mount(viewport, { scrollLeft: 0 });
    manager.maybeAutoScrollToBottom();

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ behavior: 'auto' });
  });
});

describe('InfiniteScrollManager', () => {
  it('does not call remote loading callbacks in client mode', async () => {
    const onLoadMore = vi.fn(async () => ({
      rows: [{ id: 1 }],
      hasMore: false,
    }));
    const manager = new InfiniteScrollManager({
      mode: 'client',
      onLoadMore,
    });

    await manager.loadMore();

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
