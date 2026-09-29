/**
 * Bridges a Vue 2 component (a `Vue.extend(...)` constructor or a plain component
 * options object) into a ZenithGrid cell renderer.
 *
 * The returned renderer mounts a fresh component instance per cell and hands the
 * grid `{ element, destroy }`. ZenithGrid rebuilds every visible row on each render
 * pass (scroll, sort, filter, edit commit, …) and there is no DOM recycling, so a
 * bare `vm.$el` would be dropped without `$destroy()` and leak the instance, its
 * watchers and any store subscriptions. The `destroy` callback closes that gap:
 * the grid invokes it right before the cell element is discarded.
 *
 * @param {Function|Object} Component  `Vue.extend()` constructor or component options.
 * @param {Object} [options]
 * @param {Function|Object} [options.props]  Maps renderer params `{ value, row, def, state }`
 *   to `propsData`. Default passes those four keys through (undeclared props are ignored
 *   by Vue). An object is used as static `propsData` merged over the defaults.
 * @param {Object} [options.parent]  Parent Vue instance (usually the ZenithGrid wrapper
 *   or the page component). Wires up `$parent`, `provide/inject`, `$store`, `$router`, `$i18n`.
 * @param {Function} [options.on]  `(params) => ({ eventName: handler })` — listeners bound
 *   via `vm.$on` after mount.
 * @param {Function} [options.Vue]  Vue constructor, only needed when `Component` is a plain
 *   options object and no `parent` is given (used for `Vue.extend`).
 * @returns {(params: { value: any, row: any, def: any, state: any }) => { element: HTMLElement, destroy: () => void }}
 */
export function createVueRenderer(Component, options = {}) {
  const Ctor = resolveConstructor(Component, options);
  const { parent, on } = options;

  return function vueCellRenderer(params) {
    const propsData = buildProps(options.props, params);
    const vm = new Ctor({ parent, propsData });

    if (typeof on === "function") {
      const listeners = on(params) || {};
      for (const [event, handler] of Object.entries(listeners)) {
        if (typeof handler === "function") vm.$on(event, handler);
      }
    }

    vm.$mount();

    let destroyed = false;
    return {
      element: vm.$el,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        vm.$destroy();
        // $destroy() does not detach the root element; do it so nothing keeps a
        // reference to the stale DOM subtree via the (now dead) instance.
        if (vm.$el?.parentNode) vm.$el.parentNode.removeChild(vm.$el);
      },
    };
  };
}

function resolveConstructor(Component, options) {
  if (typeof Component === "function") return Component;
  if (!Component || typeof Component !== "object") {
    throw new TypeError(
      "[zenith-grid/vue2] createVueRenderer expects a Vue.extend() constructor or a component options object",
    );
  }
  // Vue.extend() reads `this` (Super.cid, Super.options, …), so it must be invoked as
  // a method on the base constructor — never as a detached function reference.
  const base = [options.Vue, options.parent?.constructor, options.parent?.$root?.constructor].find(
    (candidate) => typeof candidate?.extend === "function",
  );
  if (!base) {
    throw new TypeError(
      "[zenith-grid/vue2] createVueRenderer received component options but cannot find Vue.extend — pass `{ Vue }` or `{ parent }`",
    );
  }
  return base.extend(Component);
}

function buildProps(mapProps, params) {
  const defaults = {
    value: params.value,
    row: params.row,
    def: params.def,
    state: params.state,
  };
  if (typeof mapProps === "function") return mapProps(params) ?? {};
  if (mapProps && typeof mapProps === "object") return { ...defaults, ...mapProps };
  return defaults;
}
