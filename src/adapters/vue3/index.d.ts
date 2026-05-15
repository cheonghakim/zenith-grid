import type { DefineComponent, ShallowRef, Ref } from 'vue';
import type {
  GridOptions,
  GridCore,
  GridRow,
  GridKey,
  ColumnDef,
  ColumnFilterDef,
  PinnedPosition,
  GridPlugin,
} from '../../../index.js';

// ── HighGrid component ───────────────────────────────────────────────────────

export interface HighGridProps<Row = GridRow> extends GridOptions<Row> {}

export interface HighGridExposed<Row = GridRow> {
  grid: ShallowRef<GridCore<Row> | null>;
  refresh(): Promise<void>;
  setRows(rows: Row[]): void;
  appendRows(rows: Row[] | Row): void;
  updateRows(rows: Row[] | Row): void;
  patchRow(key: GridKey, patch: Partial<Row>): void;
  upsertRows(rows: Row[] | Row): void;
  removeRows(keys: GridKey[] | GridKey): void;
  setColumns(columns: ColumnDef<Row>[]): void;
  setQuickFilter(text: string, fields?: string[]): void;
  setColumnFilter(colId: string, filterDef: ColumnFilterDef): void;
  clearColumnFilter(colId: string): void;
  clearFilters(): void;
  sortBy(defs: any[]): void;
  clearSort(): void;
  setPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
  setPageSize(size: number): void;
  usePlugin(plugin: GridPlugin<Row>, options?: Record<string, any>): void;
  unusePlugin(pluginName: string): void;
  on(eventName: string, handler: (...args: any[]) => any): () => void;
  getSelectedKeys(): Set<string>;
  getSelectionState(): any;
  getPaginationState(): any;
  getColumnState(): any;
  destroy(): void;
}

export declare const HighGrid: DefineComponent<HighGridProps, HighGridExposed>;

// ── useHighGrid composable ───────────────────────────────────────────────────

export interface UseHighGridState {
  selectedKeys: Set<string>;
  selectionCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  renderInfo: any;
  paginationState: any;
}

export interface UseHighGridReturn<Row = GridRow> {
  grid: ShallowRef<GridCore<Row> | null>;
  isReady: Ref<boolean>;
  state: UseHighGridState;
  init(overrideOptions?: GridOptions<Row>): GridCore<Row> | null;
  refresh(): Promise<void>;
  setRows(rows: Row[]): void;
  appendRows(rows: Row[] | Row): void;
  updateRows(rows: Row[] | Row): void;
  patchRow(key: GridKey, patch: Partial<Row>): void;
  upsertRows(rows: Row[] | Row): void;
  removeRows(keys: GridKey[] | GridKey): void;
  setColumns(columns: ColumnDef<Row>[]): void;
  setQuickFilter(text: string, fields?: string[]): void;
  setColumnFilter(colId: string, filterDef: ColumnFilterDef): void;
  clearColumnFilter(colId: string): void;
  clearFilters(): void;
  sortBy(defs: any[]): void;
  clearSort(): void;
  setPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
  setPageSize(size: number): void;
  usePlugin(plugin: GridPlugin<Row>, options?: Record<string, any>): void;
  unusePlugin(pluginName: string): void;
  liveAddRows(rows: Row[] | Row): void;
  liveUpdateRows(rows: Row[] | Row): void;
  livePatchRow(key: GridKey, patch: Partial<Row>): void;
  liveRemoveRows(keys: GridKey[] | GridKey): void;
  getSelectedKeys(): Set<string>;
  getSelectionState(): any;
  getPaginationState(): any;
  getColumnState(): any;
  on(eventName: string, handler: (...args: any[]) => any): () => void;
}

export declare function useHighGrid<Row = GridRow>(
  containerRef: Ref<HTMLElement | null>,
  options?: GridOptions<Row>,
): UseHighGridReturn<Row>;
