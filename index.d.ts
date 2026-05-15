export type GridRow = Record<string, any>;
export type GridKey = string | number;
export type GridDisplayMode = 'client' | 'paginated' | 'infinite';
export type PaginationMode = 'client' | 'server';
export type InfiniteMode = 'client' | 'server';
export type SelectionMode = 'single' | 'multiple';
export type PinnedPosition = 'left' | 'right' | null;

export interface CellRendererParams<Row = GridRow> {
  value: any;
  row: Row;
  def: ColumnDef<Row>;
  state: ColumnState;
}

export interface GridRowRenderContext<Row = GridRow> {
  row: Row;
  rowElement: HTMLElement;
  rowIndex: number;
}

export interface GridCellRenderContext<Row = GridRow> {
  row: Row;
  def: ColumnDef<Row>;
  state: ColumnState;
  cell: HTMLElement;
  value: any;
}

export interface GridOverlayRenderContext {
  kind: 'loading' | 'empty' | 'error';
  message?: string;
  error?: unknown;
}

export interface RowContextMenuPayload<Row = GridRow> {
  row: Row;
  event: MouseEvent;
}

export interface CellContextMenuPayload<Row = GridRow> {
  row: Row;
  colId: string;
  value: any;
  event: MouseEvent;
}

export interface CsvExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  includeHidden?: boolean;
  onlySelected?: boolean;
  scope?: 'displayed' | 'flat' | 'all';
  columns?: string[];
  fileName?: string;
}

export interface ExcelExportOptions extends CsvExportOptions {}

export interface ClipboardOptions extends CsvExportOptions {
  startRowKey?: GridKey;
}

export interface LiveBenchmarkOptions {
  rowsPerSecond?: number;
  durationMs?: number;
  batchSize?: number;
}

export interface LiveBenchmarkResult {
  generated: number;
  elapsedMs: number;
  rowsPerSecond: number;
}

export interface CellEditParams<Row = GridRow> {
  row: Row;
  def: ColumnDef<Row>;
  value: any;
}

export interface CellValidationParams<Row = GridRow> extends CellEditParams<Row> {}

export interface ContextMenuItem<Row = GridRow> {
  label: string;
  disabled?: boolean;
  onSelect?: ((payload: {
    type: 'row' | 'cell';
    row: Row;
    colId?: string;
    value?: any;
    event: MouseEvent;
    core: GridCore<Row>;
  }) => void) | null;
}

export interface ContextMenuPluginOptions<Row = GridRow> {
  name?: string;
  getItems?: ((payload: {
    type: 'row' | 'cell';
    row: Row;
    colId?: string;
    value?: any;
    event: MouseEvent;
    core: GridCore<Row>;
  }) => ContextMenuItem<Row>[]) | null;
}

export interface CsvShortcutPluginOptions {
  name?: string;
  key?: string;
  fileName?: string;
  exportOptions?: CsvExportOptions;
}

export interface GridHooks<Row = GridRow> {
  beforeRowRender?: ((context: GridRowRenderContext<Row>) => void) | null;
  afterRowRender?: ((context: GridRowRenderContext<Row>) => void) | null;
  beforeCellRender?: ((context: GridCellRenderContext<Row>) => void) | null;
  afterCellRender?: ((context: GridCellRenderContext<Row>) => void) | null;
}

export interface ColumnDef<Row = GridRow> {
  id?: string;
  field?: keyof Row | string;
  headerName?: string;
  header?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  type?: 'string' | 'number' | 'date' | 'auto' | string;
  visible?: boolean;
  pinned?: PinnedPosition;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'date' | 'select' | 'custom';
  filterOperators?: string[] | null;
  filterOptions?: Array<{ label?: string; value: any }> | any[] | null;
  filterMultiple?: boolean | null;
  filterPlaceholder?: string | null;
  resizable?: boolean;
  reorderable?: boolean;
  formatter?: ((value: any, row: Row) => any) | null;
  renderer?: ((params: CellRendererParams<Row>) => HTMLElement | string | number | null | undefined) | null;
  editable?: boolean | ((params: { row: Row; def: ColumnDef<Row> }) => boolean);
  editor?: ((params: CellEditParams<Row>) => HTMLElement | null | undefined) | null;
  parser?: ((params: CellEditParams<Row>) => any) | null;
  validator?: ((params: CellValidationParams<Row>) => true | string | null | undefined) | null;
  headerRenderer?: ((def: ColumnDef<Row>) => HTMLElement | string | null | undefined) | null;
  comparator?: ((a: any, b: any, rowA?: Row, rowB?: Row) => number) | null;
  cellClass?: string | null;
  headerClass?: string | null;
  children?: ColumnDef<Row>[];
}

export interface ColumnState {
  colId: string;
  width: number;
  visible: boolean;
  pinned: PinnedPosition;
  order: number;
}

export interface ColumnSnapshot<Row = GridRow> {
  def: ColumnDef<Row>;
  state: ColumnState;
}

export interface GridPlugin<Row = GridRow> {
  name: string;
  label?: string;
  description?: string;
  hooks?: Record<string, (...args: any[]) => any>;
}

export interface GridAvailablePlugin<Row = GridRow> {
  plugin: GridPlugin<Row>;
  label?: string;
  description?: string;
  options?: Record<string, any>;
}

export interface ColumnFilterDef {
  type?: string;
  field?: string;
  operator?: string;
  value?: any;
  fn?: ((value: any, row: GridRow) => boolean) | null;
}

export interface PaginationFetchPayload {
  page: number;
  pageSize: number;
  filters?: any;
  sort?: any;
  displayMode?: GridDisplayMode;
}

export interface PaginationFetchResult<Row = GridRow> {
  rows: Row[];
  totalCount: number;
}

export interface InfiniteLoadPayload {
  offset: number;
  loadSize: number;
  filters?: any;
  sort?: any;
  displayMode?: GridDisplayMode;
}

export interface InfiniteLoadResult<Row = GridRow> {
  rows: Row[];
  cursor?: string | null;
  hasMore?: boolean;
  totalCount?: number | null;
}

export interface TreeOptions<Row = GridRow> {
  treeMode?: 'children' | 'parentId';
  childrenField?: string;
  parentIdField?: string;
  hasChildrenField?: string;
  onLoadChildren?: ((row: Row) => Promise<Row[]> | Row[]) | null;
}

export interface SidePanelOptions {
  enabled?: boolean;
  defaultTab?: 'columns' | 'filters' | 'plugins' | 'view' | string;
  defaultOpen?: boolean;
  quickFilterFields?: string[];
}

export interface PaginationOptions<Row = GridRow> {
  mode?: PaginationMode;
  pageSize?: number;
  page?: number;
  totalCount?: number;
  fetchPage?: ((payload: PaginationFetchPayload) => Promise<PaginationFetchResult<Row>> | PaginationFetchResult<Row>) | null;
}

export interface InfiniteScrollOptions<Row = GridRow> {
  mode?: InfiniteMode;
  initialLoadSize?: number;
  loadMoreSize?: number;
  scrollThreshold?: number;
  onLoadMore?: ((payload: InfiniteLoadPayload) => Promise<InfiniteLoadResult<Row>> | InfiniteLoadResult<Row>) | null;
}

export interface LiveUpdatesOptions {
  enabled?: boolean;
  batchInterval?: number;
  sortFreeze?: boolean;
  autoScroll?: boolean;
  autoScrollThreshold?: number;
  highlightDuration?: number;
  rowAnimationEnabled?: boolean;
  rowAnimationDuration?: number;
  maxRows?: number;
}

export interface EditingOptions {
  enabled?: boolean;
}

export interface GridOptions<Row = GridRow> {
  rowKey?: keyof Row | string | ((row: Row) => GridKey);
  rows?: Row[];
  columns?: ColumnDef<Row>[];
  rowHeight?: number;
  getRowHeight?: ((row: Row) => number | null | undefined) | null;
  variableRowHeight?: boolean;
  overscanTop?: number;
  overscanBottom?: number;
  horizontalOverscan?: number;
  selectable?: boolean;
  selectionMode?: SelectionMode;
  isRowSelectable?: ((row: Row) => boolean) | null;
  displayMode?: GridDisplayMode;
  tableId?: string;
  getRowClassName?: ((row: Row) => string | string[] | null | undefined) | null;
  getRowStyle?: ((row: Row) => Record<string, string | number | null | undefined> | null | undefined) | null;
  hooks?: GridHooks<Row>;
  availablePlugins?: GridAvailablePlugin<Row>[];
  plugins?: GridAvailablePlugin<Row>[];
  sidePanel?: SidePanelOptions;
  pagination?: PaginationOptions<Row>;
  infiniteScroll?: InfiniteScrollOptions<Row>;
  liveUpdates?: LiveUpdatesOptions;
  editing?: EditingOptions;
  tree?: TreeOptions<Row>;
  onLoadChildren?: TreeOptions<Row>['onLoadChildren'];
  onRowClick?: ((payload: { row: Row; event: MouseEvent }) => void) | null;
  onCellClick?: ((payload: { row: Row; colId: string; value: any; event: MouseEvent }) => void) | null;
  onCellDoubleClick?: ((payload: { row: Row; colId: string; value: any; cell: HTMLElement; event: MouseEvent }) => void) | null;
  onRowContextMenu?: ((payload: RowContextMenuPayload<Row>) => void) | null;
  onCellContextMenu?: ((payload: CellContextMenuPayload<Row>) => void) | null;
  emptyMessage?: string;
  renderLoadingState?: ((context: GridOverlayRenderContext) => HTMLElement | string | null | undefined) | null;
  renderEmptyState?: ((context: GridOverlayRenderContext) => HTMLElement | string | null | undefined) | null;
  renderErrorState?: ((context: GridOverlayRenderContext) => HTMLElement | string | null | undefined) | null;
  columnState?: any;
  columnStatePersistence?: Record<string, any>;
}

export interface GridFilterChoice {
  value: any;
  label: string;
}

export declare class GridCore<Row = GridRow> {
  constructor(container: HTMLElement, options?: GridOptions<Row>);
  refresh(): Promise<void>;
  setRows(rows: Row[]): void;
  setData(rows: Row[]): void;
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
  enableGrouping(groupByFields: string[], options?: Record<string, any>): void;
  toggleGroup(groupKey: string): void;
  disableGrouping(): void;
  enableTree(options?: TreeOptions<Row>): void;
  disableTree(): void;
  toggleTreeRow(rowKey: GridKey): void;
  expandAllTree(): void;
  collapseAllTree(): void;
  sortBy(defs: any[]): void;
  clearSort(): void;
  toggleSelectAll(): void;
  setRowSelected(rowKey: GridKey, selected: boolean, options?: Record<string, any>): void;
  on(eventName: string, handler: (...args: any[]) => any, options?: Record<string, any>): () => void;
  getSelectedKeys(): Set<string>;
  getSelectionState(): any;
  getDisplayMode(): GridDisplayMode;
  getPaginationState(): any;
  getInfiniteScrollState(): any;
  isVariableRowHeight(): boolean;
  getColumnState(): any;
  getAllLeafColumns(): ColumnSnapshot<Row>[];
  getVisibleLeafColumns(): ColumnSnapshot<Row>[];
  getFilterState(): any;
  getColumnFilterChoices(colId: string): GridFilterChoice[];
  getGroupingState(): any;
  getTreeState(): any;
  getRows(): Row[];
  getFlatRows(): Row[];
  usePlugin(plugin: GridPlugin<Row>, options?: Record<string, any>): void;
  unusePlugin(pluginName: string): void;
  hasPlugin(pluginName: string): boolean;
  getInstalledPlugins(): string[];
  getAvailablePlugins(): GridAvailablePlugin<Row>[];
  setVariableRowHeight(enabled: boolean): void;
  setPaginationMode(mode: PaginationMode): void;
  setInfiniteScrollMode(mode: InfiniteMode): void;
  setDisplayMode(mode: GridDisplayMode): void;
  setPage(page: number): void;
  nextPage(): void;
  prevPage(): void;
  setPageSize(size: number): void;
  enableInfiniteScroll(): void;
  disableInfiniteScroll(): void;
  loadMoreInfinite(): Promise<any>;
  liveAddRows(rows: Row[] | Row): void;
  liveUpdateRows(rows: Row[] | Row): void;
  livePatchRow(key: GridKey, patch: Partial<Row>): void;
  liveUpsertRows(rows: Row[] | Row): void;
  liveRemoveRows(keys: GridKey[] | GridKey): void;
  pauseLiveUpdates(): void;
  resumeLiveUpdates(): void;
  setLiveRowAnimationEnabled(enabled: boolean): void;
  isLiveRowAnimationEnabled(): boolean;
  setLocale(locale: Record<string, any>): void;
  beginCellEdit(rowKey: GridKey, colId: string, options?: { cell?: HTMLElement }): boolean;
  setCellValue(rowKey: GridKey, colId: string, rawValue: any): boolean;
  validateRows(rows?: Row[]): Array<{ rowKey: string; colId: string; message: string }>;
  getValidationErrors(): Array<{ rowKey: string; colId: string; message: string }>;
  getCellValidationError(rowKey: GridKey, colId: string): string | null;
  exportCsv(options?: CsvExportOptions): string;
  downloadCsv(options?: CsvExportOptions): string;
  exportExcel(options?: ExcelExportOptions): string;
  downloadExcel(options?: ExcelExportOptions): string;
  copySelectionToClipboard(options?: ClipboardOptions): string;
  pasteFromClipboard(text: string, options?: ClipboardOptions): number;
  benchmarkLiveUpdates(options?: LiveBenchmarkOptions): Promise<LiveBenchmarkResult>;
  saveColumnState(): Promise<void>;
  loadColumnState(): Promise<void>;
  clearColumnState(): Promise<void>;
  setColumnWidth(colId: string, width: number): void;
  setColumnVisible(colId: string, visible: boolean): void;
  setColumnPinned(colId: string, pin: PinnedPosition): void;
  moveColumn(colId: string, toIndex: number, options?: { restrictToGroup?: boolean }): void;
  setLiveMaxRows(n: number): void;
  destroy(): void;
}

export declare class DataStore<Row = GridRow> {}
export declare class ViewModel<Row = GridRow> {}
export declare class ColumnRegistry<Row = GridRow> {}
export declare class Pipeline<Row = GridRow> {}
export declare class GroupManager<Row = GridRow> {}
export declare class TreeManager<Row = GridRow> {}
export declare class PaginationManager<Row = GridRow> {}
export declare class InfiniteScrollManager<Row = GridRow> {}
export declare class LiveUpdateManager<Row = GridRow> {}
export declare class PluginManager<Row = GridRow> {}

export declare function createGrid<Row = GridRow>(container: HTMLElement | string, options?: GridOptions<Row>): GridCore<Row>;

export declare const uppercaseTeamPlugin: GridPlugin;
export declare const scorePrefixPlugin: GridPlugin;
export declare function createContextMenuPlugin<Row = GridRow>(options?: ContextMenuPluginOptions<Row>): GridPlugin<Row>;
export declare function createCsvShortcutPlugin(options?: CsvShortcutPluginOptions): GridPlugin;
