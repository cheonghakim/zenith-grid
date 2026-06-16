import { DefineComponent } from 'vue';
import type { GridInstance, GridOptions } from '../../index.js';

export interface HighGridProps extends Omit<GridOptions, 'container'> {}

export interface HighGridEmits {
  (e: 'ready', grid: GridInstance): void;
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

export interface HighGridMethods extends Omit<GridInstance, 'on' | 'destroy'> {
  grid: GridInstance | null;
}

export const HighGrid: DefineComponent<HighGridProps, {}, {}, {}, HighGridMethods>;
