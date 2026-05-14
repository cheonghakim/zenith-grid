import { GridCore } from './core/GridCore.js';

export function createGrid(container, options = {}) {
  return new GridCore(container, options);
}

export { GridCore } from './core/GridCore.js';
export { DataStore } from './core/DataStore.js';
export { ViewModel } from './core/ViewModel.js';
export { ColumnRegistry } from './core/ColumnRegistry.js';
export { Pipeline } from './core/Pipeline.js';
export { GroupManager } from './managers/GroupManager.js';
export { TreeManager } from './managers/TreeManager.js';
export { PaginationManager } from './managers/PaginationManager.js';
export { InfiniteScrollManager } from './managers/InfiniteScrollManager.js';
export { LiveUpdateManager } from './managers/LiveUpdateManager.js';
export { PluginManager } from './core/PluginManager.js';
export { uppercaseTeamPlugin, scorePrefixPlugin } from './plugins/index.js';
