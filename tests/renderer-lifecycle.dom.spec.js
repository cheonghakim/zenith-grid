// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BodyRenderer } from '../src/renderer/BodyRenderer.js';
import { createGrid } from '../src/index.js';
import { createVueRenderer } from '../src/adapters/vue2/createVueRenderer.js';

function makeHarness({ hooks = {}, renderer } = {}) {
  const rowsContainer = document.createElement('div');
  const domRenderer = {
    updateVirtualSpace() {},
    getRowsContainer() {
      return rowsContainer;
    },
  };
  const column = { def: { id: 'score', field: 'score', renderer }, state: { width: 120 } };
  const columnModel = {
    getVisibleLeafColumns: () => [column],
    getColumnsByPin: () => ({ left: [], center: [column], right: [] }),
  };
  const viewModel = {
    getVerticalRange: () => ({ startIndex: 0, endIndex: 1, offsetY: 0, totalHeight: 80 }),
    getHorizontalRange: () => ({ startColIndex: 0, endColIndex: 0 }),
    getRowHeight: () => 40,
    isVariableRowHeight: () => false,
  };
  const body = new BodyRenderer(domRenderer, columnModel, viewModel, { hooks });
  const range = {
    vertical: { startIndex: 0, endIndex: 1, offsetY: 0, totalHeight: 80 },
    horizontal: { startColIndex: 0, endColIndex: 0 },
  };
  return { body, rowsContainer, range };
}

describe('BodyRenderer renderer lifecycle', () => {
  it('accepts { element, destroy } from a renderer and calls destroy on re-render and clear', () => {
    const destroy = vi.fn();
    const renderer = vi.fn(({ value }) => {
      const el = document.createElement('b');
      el.textContent = String(value);
      return { element: el, destroy };
    });
    const { body, rowsContainer, range } = makeHarness({ renderer });
    const rows = [
      { _rowKey: '1', score: 1 },
      { _rowKey: '2', score: 2 },
    ];

    body.render(rows, range);
    expect(renderer).toHaveBeenCalledTimes(2);
    expect(rowsContainer.querySelectorAll('b')).toHaveLength(2);
    expect(destroy).not.toHaveBeenCalled();

    body.render(rows, range);
    // both cells from the first pass were torn down, two new ones mounted
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(renderer).toHaveBeenCalledTimes(4);

    body.clear();
    expect(destroy).toHaveBeenCalledTimes(4);

    // nothing left to dispose: idempotent
    body.clear();
    expect(destroy).toHaveBeenCalledTimes(4);
  });

  it('fires beforeCellDestroy (before the renderer destroy) and beforeRowDestroy with full context', () => {
    const order = [];
    const destroy = vi.fn(() => order.push('destroy'));
    const beforeCellDestroy = vi.fn((ctx) => order.push(`cell:${ctx.row._rowKey}:${ctx.def.id}:${ctx.value}`));
    const beforeRowDestroy = vi.fn((ctx) => order.push(`row:${ctx.row._rowKey}:${ctx.rowIndex}`));
    const renderer = () => ({ element: document.createElement('i'), destroy });
    const { body, range } = makeHarness({ renderer, hooks: { beforeCellDestroy, beforeRowDestroy } });

    body.render([{ _rowKey: 'a', score: 7 }], range);
    expect(order).toEqual([]);

    body.render([{ _rowKey: 'a', score: 7 }], range);
    expect(order).toEqual(['cell:a:score:7', 'destroy', 'row:a:0']);
    expect(beforeCellDestroy.mock.calls[0][0].cell).toBeInstanceOf(HTMLElement);
    expect(beforeRowDestroy.mock.calls[0][0].rowElement).toBeInstanceOf(HTMLElement);
  });

  it('fires beforeCellDestroy for plain cells too, and a throwing destroy does not break the render', () => {
    const beforeCellDestroy = vi.fn();
    const renderer = () => ({
      element: document.createElement('i'),
      destroy: () => {
        throw new Error('boom');
      },
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { body, rowsContainer, range } = makeHarness({ renderer, hooks: { beforeCellDestroy } });

    body.render([{ _rowKey: '1', score: 1 }], range);
    expect(() => body.render([{ _rowKey: '1', score: 1 }], range)).not.toThrow();
    expect(beforeCellDestroy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(rowsContainer.querySelectorAll('i')).toHaveLength(1);
    errorSpy.mockRestore();

    // no renderer at all: hook still mirrors beforeCellRender
    const plain = makeHarness({ hooks: { beforeCellDestroy } });
    plain.body.render([{ _rowKey: '1', score: 1 }], plain.range);
    plain.body.clear();
    expect(beforeCellDestroy).toHaveBeenCalledTimes(2);
  });

  it('disposeCell() is a no-op for unregistered elements', () => {
    const { body } = makeHarness();
    expect(() => body.disposeCell(document.createElement('div'))).not.toThrow();
  });
});

describe('GridCore renderer lifecycle', () => {
  beforeEach(() => {
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 960 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 480 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete HTMLElement.prototype.clientWidth;
    delete HTMLElement.prototype.clientHeight;
  });

  it('destroys mounted renderers on edit start, plugin hooks receive destroy events, and grid.destroy() disposes everything', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const live = new Set();
    const renderer = ({ value }) => {
      const el = document.createElement('span');
      el.textContent = String(value);
      const token = {};
      live.add(token);
      return { element: el, destroy: () => live.delete(token) };
    };
    const pluginCellDestroy = vi.fn();
    const optionRowDestroy = vi.fn();

    const grid = createGrid(host, {
      rowKey: 'id',
      rows: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      columns: [{ id: 'name', field: 'name', width: 120, editable: true, renderer }],
      editing: { enabled: true },
      hooks: { beforeRowDestroy: optionRowDestroy },
      plugins: [
        { plugin: { name: 'lifecycle-probe', hooks: { beforeCellDestroy: pluginCellDestroy } } },
      ],
    });

    await vi.waitFor(() => {
      expect(host.querySelectorAll('.ck-zenith-grid-row').length).toBe(2);
    });
    expect(live.size).toBe(2);

    // entering edit mode replaces the cell content -> renderer destroyed for that cell
    expect(grid.beginCellEdit(1, 'name')).toBe(true);
    expect(live.size).toBe(1);
    expect(pluginCellDestroy).toHaveBeenCalledTimes(1);
    expect(pluginCellDestroy.mock.calls[0][0].row.id).toBe(1);

    grid.destroy();
    expect(live.size).toBe(0);
    expect(optionRowDestroy).toHaveBeenCalled();
    expect(pluginCellDestroy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('createVueRenderer (Vue 2 bridge)', () => {
  // Minimal stand-in for a Vue.extend() constructor: new Ctor({ propsData, parent }),
  // $mount(), $el, $on(), $destroy(). Vue 2 itself is not installed in this repo.
  function makeFakeCtor(log) {
    return class FakeVm {
      constructor({ propsData, parent }) {
        this.propsData = propsData;
        this.parent = parent;
        this.listeners = {};
        this.$el = null;
        log.push('construct');
      }
      $on(event, handler) {
        this.listeners[event] = handler;
      }
      $mount() {
        this.$el = document.createElement('div');
        this.$el.textContent = `v=${this.propsData.value}`;
        log.push('mount');
        return this;
      }
      $destroy() {
        log.push('destroy');
      }
    };
  }

  it('mounts one instance per cell with default props and destroys it exactly once', () => {
    const log = [];
    const Ctor = makeFakeCtor(log);
    const parent = { id: 'parent' };
    const renderer = createVueRenderer(Ctor, { parent });

    const result = renderer({ value: 42, row: { id: 1 }, def: { id: 'x' }, state: {} });
    expect(result.element).toBeInstanceOf(HTMLElement);
    expect(result.element.textContent).toBe('v=42');
    expect(log).toEqual(['construct', 'mount']);

    const host = document.createElement('div');
    host.appendChild(result.element);
    result.destroy();
    result.destroy();
    expect(log).toEqual(['construct', 'mount', 'destroy']);
    expect(host.childNodes).toHaveLength(0);
  });

  it('supports props mapping (function and object), listeners, and Vue.extend for options objects', () => {
    const log = [];
    const Ctor = makeFakeCtor(log);
    const extend = vi.fn(() => Ctor);
    const clicked = vi.fn();

    const renderer = createVueRenderer(
      { template: '<div/>' },
      {
        Vue: { extend },
        props: ({ value, row }) => ({ label: `${row.name}:${value}` }),
        on: () => ({ click: clicked }),
      },
    );
    expect(extend).toHaveBeenCalledWith({ template: '<div/>' });

    const instances = [];
    const Tracked = class extends Ctor {
      constructor(opts) {
        super(opts);
        instances.push(this);
      }
    };
    extend.mockReturnValue(Tracked);

    // function props: replaces the defaults entirely
    const fnRenderer = createVueRenderer({ template: '<div/>' }, {
      Vue: { extend },
      props: ({ value, row }) => ({ label: `${row.name}:${value}` }),
      on: () => ({ click: clicked }),
    });
    fnRenderer({ value: 1, row: { name: 'n' }, def: {}, state: {} });
    expect(instances[0].propsData).toEqual({ label: 'n:1' });
    instances[0].listeners.click();
    expect(clicked).toHaveBeenCalledTimes(1);

    // object props: merged over the defaults
    createVueRenderer(Tracked, { props: { extra: true } })({ value: 5, row: {}, def: {}, state: {} });
    expect(instances[1].propsData).toMatchObject({ value: 5, extra: true });
  });

  it('throws a clear error for options objects when no Vue.extend is reachable', () => {
    expect(() => createVueRenderer({ template: '<div/>' })).toThrow(/Vue\.extend/);
    expect(() => createVueRenderer(null)).toThrow(TypeError);
  });

  // Mirrors Vue 2's real extend(): `const Super = this; ... Super.cid` — it throws when
  // called as a detached function. Each base gets its own cid so we can tell which one
  // the bridge actually used.
  function makeFakeVue(cid, Ctor) {
    return {
      cid,
      extend(componentOptions) {
        if (this == null || this.cid !== cid) {
          throw new TypeError("Cannot read properties of undefined (reading 'cid')");
        }
        const Sub = class extends Ctor {};
        Sub.superCid = this.cid;
        Sub.componentOptions = componentOptions;
        return Sub;
      },
    };
  }

  it('calls Vue.extend as a method so `this` is the base constructor', () => {
    const log = [];
    const Ctor = makeFakeCtor(log);
    const FakeVue = makeFakeVue(0, Ctor);
    const componentOptions = { name: 'x' };

    const renderer = createVueRenderer(componentOptions, { Vue: FakeVue });
    const out = renderer({ value: 'p', row: {}, def: {}, state: {} });
    expect(out.element.textContent).toBe('v=p');
    expect(log).toEqual(['construct', 'mount']);

    // a detached reference would have thrown inside extend()
    const detached = FakeVue.extend;
    expect(() => detached(componentOptions)).toThrow(/cid/);
  });

  it('falls back to parent.constructor.extend, then parent.$root.constructor.extend, preserving `this`', () => {
    const log = [];
    const Ctor = makeFakeCtor(log);
    const ParentCtor = makeFakeVue(7, Ctor);
    const RootCtor = makeFakeVue(9, Ctor);

    const viaParent = createVueRenderer({ name: 'x' }, { parent: { constructor: ParentCtor } });
    expect(viaParent({ value: 'p', row: {}, def: {}, state: {} }).element.textContent).toBe('v=p');

    const viaRoot = createVueRenderer({ name: 'x' }, { parent: { constructor: {}, $root: { constructor: RootCtor } } });
    expect(viaRoot({ value: 'r', row: {}, def: {}, state: {} }).element.textContent).toBe('v=r');

    // explicit Vue wins over parent
    const spyParent = { constructor: makeFakeVue(1, Ctor) };
    const explicit = makeFakeVue(2, Ctor);
    const extendSpy = vi.spyOn(explicit, 'extend');
    createVueRenderer({ name: 'x' }, { Vue: explicit, parent: spyParent });
    expect(extendSpy).toHaveBeenCalledTimes(1);
    expect(extendSpy.mock.instances[0]).toBe(explicit);
  });
});
