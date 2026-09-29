import { DefineComponent } from 'vue';
import type { CellRendererParams, CellRendererResult, GridCore, GridOptions, GridRow } from '../../index.js';

export interface CreateVueRendererOptions<Row = GridRow> {
  /**
   * Maps renderer params to `propsData`. A function receives `{ value, row, def, state }`;
   * an object is merged over those four defaults. Undeclared props are ignored by Vue.
   */
  props?: ((params: CellRendererParams<Row>) => Record<string, any>) | Record<string, any>;
  /** Parent Vue instance — wires `$parent`, `provide/inject`, `$store`, `$router`, `$i18n`. */
  parent?: any;
  /** Listeners bound with `vm.$on` after mount. */
  on?: (params: CellRendererParams<Row>) => Record<string, (...args: any[]) => void>;
  /** Vue constructor; only required for a plain options object without `parent`. */
  Vue?: any;
}

/**
 * Wraps a Vue 2 component (`Vue.extend()` constructor or options object) as a
 * ZenithGrid cell renderer. Each cell gets its own instance; the grid calls the
 * returned `destroy` (→ `vm.$destroy()`) whenever the cell element is discarded.
 */
export function createVueRenderer<Row = GridRow>(
  Component: any,
  options?: CreateVueRendererOptions<Row>,
): (params: CellRendererParams<Row>) => CellRendererResult & { element: HTMLElement; destroy: () => void };

export interface ZenithGridProps extends Omit<GridOptions, 'container'> {}

export interface ZenithGridEmits {
  (e: 'ready', grid: GridCore): void;
  (e: 'row-click', payload: any): void;
  (e: 'cell-click', payload: any): void;
  (e: 'cell-dblclick', payload: any): void;
  (e: 'row-contextmenu', payload: any): void;
  (e: 'cell-contextmenu', payload: any): void;
  (e: 'selection-change', payload: any): void;
  (e: 'group-toggle', payload: any): void;
  (e: 'tree-toggle', payload: any): void;
  (e: 'row-drag-start', payload: any): void;
  (e: 'row-drag-end', payload: any): void;
  (e: 'row-reorder', payload: any): void;
  (e: 'range-selection-change', payload: any): void;
  (e: 'detail-toggle', payload: any): void;
  (e: 'cell-value-change', payload: any): void;
  (e: 'render', payload: any): void;
  (e: 'state-change', payload: any): void;
}

export interface ZenithGridMethods extends Omit<GridCore, 'on' | 'destroy'> {
  grid: GridCore | null;
  // Vue2's DefineComponent requires its methods type param to satisfy MethodOptions,
  // which needs a string index signature.
  [key: string]: any;
}

export const ZenithGrid: DefineComponent<ZenithGridProps, {}, {}, {}, ZenithGridMethods>;
