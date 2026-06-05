// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerBridge } from '../src/core/WorkerBridge.js';

describe('WorkerBridge', () => {
  let originalWorker;
  let originalCreateObjectURL;

  class MockWorker {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.listeners = {};
    }

    addEventListener(event, fn) {
      this.listeners[event] = fn;
    }

    postMessage(data) {
      const { id, type, payload } = data;
      setTimeout(() => {
        if (type === 'sort') {
          const result = [...payload.rows].reverse();
          this.listeners['message']?.({ data: { id, type, result } });
        } else if (type === 'error-task') {
          this.listeners['message']?.({ data: { id, type, error: 'Task failed' } });
        }
      }, 10);
    }

    terminate() {
      this.terminated = true;
    }
  }

  beforeEach(() => {
    originalWorker = window.Worker;
    window.Worker = MockWorker;
    originalCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = vi.fn().mockReturnValue('mock-blob-url');
  });

  afterEach(() => {
    window.Worker = originalWorker;
    window.URL.createObjectURL = originalCreateObjectURL;
  });

  it('correctly requests and receives results from the worker', async () => {
    const bridge = new WorkerBridge({ enabled: true });
    expect(bridge.isEnabled).toBe(true);

    const rows = [{ id: 1 }, { id: 2 }];
    const result = await bridge.request('sort', { rows });
    expect(result).toEqual([{ id: 2 }, { id: 1 }]);

    bridge.destroy();
  });

  it('rejects the promise if the worker returns an error', async () => {
    const bridge = new WorkerBridge({ enabled: true });
    await expect(bridge.request('error-task', {})).rejects.toThrow('Task failed');
    bridge.destroy();
  });

  it('executes fallback when worker is disabled', async () => {
    const bridge = new WorkerBridge({ enabled: false });
    expect(bridge.isEnabled).toBe(false);

    const fallback = vi.fn().mockReturnValue('fallback-result');
    const result = await bridge.request('sort', {}, fallback);

    expect(result).toBe('fallback-result');
    expect(fallback).toHaveBeenCalled();
  });

  it('timeouts if the worker does not reply in time', async () => {
    const bridge = new WorkerBridge({ enabled: true, timeout: 50 });
    // We request a task that MockWorker does not handle, so it never replies
    await expect(bridge.request('unknown-task', {})).rejects.toThrow('timed out after 50ms');
    bridge.destroy();
  });
});
