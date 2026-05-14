import { GridCore } from './core/GridCore.js';

export function createGrid(container, options = {}) {
  return new GridCore(container, options);
}

export { GridCore } from './core/GridCore.js';
export { DataStore } from './core/DataStore.js';
export { ViewModel } from './core/ViewModel.js';
export { ColumnRegistry } from './core/ColumnRegistry.js';
export { Pipeline } from './core/Pipeline.js';
