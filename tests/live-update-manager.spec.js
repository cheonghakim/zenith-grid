import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveUpdateManager } from '../src/managers/LiveUpdateManager.js';

describe('LiveUpdateManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes queued rows and marks new rows for animation by default', () => {
    const batches = [];
    const manager = new LiveUpdateManager({
      enabled: true,
      batchInterval: 25,
      onBatchReady: (batch) => batches.push(batch),
    });

    manager.addRows([{ id: 1 }, { id: 2 }]);
    expect(batches).toHaveLength(0);

    vi.advanceTimersByTime(25);

    expect(batches).toHaveLength(1);
    expect(batches[0].added).toHaveLength(2);
    expect(manager.shouldAnimateRow(1)).toBe(true);
    expect(manager.shouldAnimateRow(2)).toBe(true);
  });

  it('clears animated state when row animation is disabled', () => {
    const manager = new LiveUpdateManager({
      enabled: true,
      batchInterval: 0,
    });

    manager.addRow({ id: 7 });
    expect(manager.shouldAnimateRow(7)).toBe(true);

    manager.setRowAnimationEnabled(false);

    expect(manager.isRowAnimationEnabled()).toBe(false);
    expect(manager.shouldAnimateRow(7)).toBe(false);
  });

  it('does not queue rows while paused and resumes batching afterwards', () => {
    const batches = [];
    const manager = new LiveUpdateManager({
      enabled: true,
      batchInterval: 10,
      onBatchReady: (batch) => batches.push(batch),
    });

    manager.pause();
    manager.addRow({ id: 11 });
    vi.advanceTimersByTime(20);
    expect(batches).toHaveLength(0);

    manager.resume();
    manager.addRow({ id: 12 });
    vi.advanceTimersByTime(10);

    expect(batches).toHaveLength(1);
    expect(batches[0].added.map((row) => row.id)).toEqual([12]);
  });
});
