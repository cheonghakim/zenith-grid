import { EventBus } from './EventBus.js';
import { DataStore } from './DataStore.js';
import { ViewModel } from './ViewModel.js';
import { WorkerBridge } from './WorkerBridge.js';
import { HeaderModel } from './HeaderModel.js';
import { ColumnRegistry } from './ColumnRegistry.js';
import { Pipeline } from './Pipeline.js';
import { SortManager } from '../managers/SortManager.js';
import { FilterManager } from '../managers/FilterManager.js';
import { SelectionManager } from '../managers/SelectionManager.js';
import { VirtualScrollManager } from '../managers/VirtualScrollManager.js';
import { GroupManager } from '../managers/GroupManager.js';
import { TreeManager } from '../managers/TreeManager.js';
import { PaginationManager } from '../managers/PaginationManager.js';
import { InfiniteScrollManager } from '../managers/InfiniteScrollManager.js';
import { LiveUpdateManager } from '../managers/LiveUpdateManager.js';
import { ColumnStateManager } from '../managers/ColumnStateManager.js';
import { PluginManager } from './PluginManager.js';
import { DOMRenderer } from '../renderer/DOMRenderer.js';
import { HeaderRenderer } from '../renderer/HeaderRenderer.js';
import { BodyRenderer } from '../renderer/BodyRenderer.js';
import { SettingsPanelRenderer } from '../renderer/SettingsPanelRenderer.js';
import { DEFAULT_LOCALE } from './defaultLocale.js';

export class GridCore {
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('[GridCore] A valid container element is required.');
    }

    this._container = container;
    this._options = options;
    this._events = new EventBus();
    this._renderVersion = 0;
    this._destroyed = false;
    this._displayMode = options.displayMode ?? 'client';
    this._rowMeasureFrame = null;
    this._serverPageRequestId = 0;
    this._serverInfiniteRequestId = 0;
    this._suspendDataStoreRefresh = false;
    this._pendingDataStoreRefresh = false;
    this._pendingLiveViewportAdjustment = null;
    this._locale = this._mergeLocale(DEFAULT_LOCALE, options.locale ?? {});
    this._activeCellColIndex = 0;
    this._handleKeydown = this._handleKeydown.bind(this);

    this._getRowKey = this._createRowKeyGetter(options.rowKey);
    this._pluginManager = new PluginManager(this);
    this._availablePlugins = this._normalizeAvailablePlugins(
      options.availablePlugins ?? options.plugins ?? []
    );

    this._columns = new ColumnRegistry(options.columns ?? [], options.columnState ?? {});
    this._columnStateManager = options.tableId
      ? new ColumnStateManager(options.tableId, options.columnStatePersistence ?? {})
      : null;
    this._headerModel = new HeaderModel(this._columns.getModel());
    this._viewModel = new ViewModel({
      rowHeight: options.rowHeight ?? 36,
      overscanTop: options.overscanTop ?? 4,
      overscanBottom: options.overscanBottom ?? 6,
      horizontalOverscan: options.horizontalOverscan ?? 1,
      variableRowHeight: options.variableRowHeight ?? false,
    });

    this._sortManager = new SortManager({
      onChanged: () => {
        this._emitStateChanged('sort');
        if (this._reloadActiveRemoteData()) {
          return;
        }
        void this.refresh();
      },
    });

    this._filterManager = new FilterManager({
      onChanged: () => {
        this._emitStateChanged('filter');
        if (this._reloadActiveRemoteData()) {
          return;
        }
        void this.refresh();
      },
    });

    this._selectionManager = new SelectionManager({
      mode: options.selectionMode ?? 'multiple',
      isSelectable: options.isRowSelectable ?? (() => true),
      onChanged: (payload) => {
        this._events.emit('selection-change', payload);
        options.onSelectionChange?.(payload);
      },
    });

    this._groupManager = new GroupManager({
      onChanged: () => {
        this._emitStateChanged('group');
        this._refreshFlatten();
      },
    });

    this._treeManager = new TreeManager({
      ...(options.tree ?? {}),
      onChanged: () => {
        this._emitStateChanged('tree');
        this._refreshFlatten();
      },
    });

    this._paginationManager = new PaginationManager({
      ...(options.pagination ?? {}),
      onPageChange: async (payload) => {
        await options.pagination?.onPageChange?.(payload);
        if (this._paginationManager.getMode() === 'server') {
          await this._loadServerPage(payload.page, payload.pageSize);
        }
      },
      onChanged: () => {
        this._emitStateChanged('pagination');
        void this.refresh();
      },
    });

    this._infiniteScrollManager = new InfiniteScrollManager({
      ...(options.infiniteScroll ?? {}),
      onLoadMore: async (payload) => options.infiniteScroll?.onLoadMore?.({
        ...payload,
        filters: this._filterManager.getWorkerPayload(),
        sort: this._sortManager.getState().sortDefs,
        displayMode: this._displayMode,
      }),
      onChanged: (payload) => {
        if (payload?.action === 'loadingStart' && this._displayMode === 'infinite') {
          this._dom.showInfiniteLoader();
        }
        if (payload?.action === 'loadingComplete' && Array.isArray(payload.rows)) {
          const addedCount = this._dataStore.appendRows(payload.rows);
          this._infiniteScrollManager.onRowsAppended(addedCount);
          this._dom.hideInfiniteLoader();
        } else if (payload?.action === 'loadingError') {
          this._dom.hideInfiniteLoader();
          const message = this.getLocaleText('grid.error.moreRowsFailed', 'Failed to load rows.');
          this._dom.showError(
            message,
            {
              content: this._renderOverlayState('error', { message, error: payload.error }),
              actionLabel: this.getLocaleText('grid.error.retry', 'Retry'),
              onAction: () => {
                void this._infiniteScrollManager.loadMore();
              },
            }
          );
        }
        this._emitStateChanged('infinite-scroll');
        void this.refresh();
      },
    });

    const workerEnabled = Boolean(options.worker?.enabled && options.worker?.url);
    this._workerBridge = new WorkerBridge({
      enabled: workerEnabled,
      workerUrl: options.worker?.url,
      timeout: options.worker?.timeout ?? 10000,
    });

    this._pipeline = new Pipeline({
      sortManager: this._sortManager,
      filterManager: this._filterManager,
      groupManager: this._groupManager,
      treeManager: this._treeManager,
      paginationManager: this._paginationManager,
      infiniteScrollManager: this._infiniteScrollManager,
      pluginManager: this._pluginManager,
      workerBridge: this._workerBridge,
      getRowKey: this._getRowKey,
      displayMode: this._displayMode,
    });

    this._liveUpdateManager = new LiveUpdateManager({
      ...(options.liveUpdates ?? {}),
      onBatchReady: (batch) => {
        this._applyLiveBatch(batch);
      },
      onNewDataNotification: (count) => {
        if (count > 0) {
          this._dom.showLiveBanner(
            this.getLocaleText(
              'grid.live.waiting',
              '{count} new rows are waiting. Click to review.',
              { count }
            ),
            () => {
              this._liveUpdateManager.clearPendingCount();
              this._dom.hideLiveBanner();
              void this.refresh();
            }
          );
        } else {
          this._dom.hideLiveBanner();
        }
      },
    });

    this._dom = new DOMRenderer(container, options);
    this._dom.build();
    this._dom.getRoot()?.addEventListener('keydown', this._handleKeydown);
    this._settingsPanel = new SettingsPanelRenderer(this._dom, this, {
      quickFilterFields: options.sidePanel?.quickFilterFields ?? [],
      defaultTab: options.sidePanel?.defaultTab ?? 'columns',
      defaultOpen: options.sidePanel?.defaultOpen ?? false,
    });
    if (options.sidePanel?.enabled !== false) {
      this._settingsPanel.mount();
    }

    this._headerRenderer = new HeaderRenderer(
      this._dom,
      this._headerModel,
      this._columns.getModel(),
      {
        sortManager: this._sortManager,
        onSortClick: ({ field, def, multiSort }) => {
          if (multiSort) {
            this._sortManager.addSort(field, def);
          } else {
            this._sortManager.toggleSort(field, def);
          }
        },
        onColumnDrop: ({ fromColId, toColId }) => {
          const leafColumns = this._columns.getAllLeafColumns();
          const targetIndex = leafColumns.findIndex((column) => column.def.id === toColId);
          if (targetIndex === -1) return;
          this.moveColumn(fromColId, targetIndex, { restrictToGroup: true });
        },
        onColumnResize: ({ colId, width, commit }) => {
          this._applyColumnResize(colId, width, { commit });
        },
        getColumnFilter: (colId) => this._filterManager.getColumnFilter(colId),
        onColumnFilterChange: (colId, filterDef) => {
          this.setColumnFilter(colId, filterDef);
        },
        onColumnFilterClear: (colId) => {
          this.clearColumnFilter(colId);
        },
        getColumnFilterChoices: (colId) => this.getColumnFilterChoices(colId),
        getLocaleText: (key, fallback, params) => this.getLocaleText(key, fallback, params),
        rowHeight: options.rowHeight ?? 40,
        selectionEnabled: options.selectable !== false,
        selectionColumnWidth: 44,
        isAllSelected: () => this._selectionManager.isAllSelected(this._displayRows),
        isSomeSelected: () => this._selectionManager.isSomeSelected(this._displayRows),
        onToggleSelectAll: () => {
          this.toggleSelectAll();
        },
      }
    );

    this._bodyRenderer = new BodyRenderer(
      this._dom,
      this._columns.getModel(),
      this._viewModel,
      {
        selectionManager: this._selectionManager,
        selectionEnabled: options.selectable !== false,
        selectionColumnWidth: 44,
        onRowClick: ({ row, event }) => {
          if (options.selectable !== false && this._selectionManager.isSelectableRow(row)) {
            if (event.shiftKey) {
              this._selectionManager.shiftSelect(row._rowKey);
            } else {
              this._selectionManager.toggleRow(row._rowKey);
            }
            this._refreshSelection();
          }

          this._events.emit('row-click', { row, event });
          options.onRowClick?.({ row, event });
        },
        onCellClick: (payload) => {
          this._events.emit('cell-click', payload);
          options.onCellClick?.(payload);
        },
        onRowContextMenu: ({ row, event }) => {
          this._events.emit('row-contextmenu', { row, event });
          options.onRowContextMenu?.({ row, event });
        },
        onCellContextMenu: (payload) => {
          this._events.emit('cell-contextmenu', payload);
          options.onCellContextMenu?.(payload);
        },
        onGroupToggle: ({ groupKey, row }) => {
          this._groupManager.toggleGroup(groupKey);
          this._events.emit('group-toggle', { groupKey, row });
        },
        onTreeToggle: ({ rowKey, row }) => {
          if (row._hasChildren && row._isExpanded) {
            this._treeManager.collapse(rowKey);
          } else if (row._hasChildren) {
            const rawChildren = row[this._treeManager._childrenField] ?? [];
            if (rawChildren.length === 0 && row[this._treeManager._hasChildrenField]) {
              void this._treeManager.loadChildren(rowKey, row);
            }
            this._treeManager.expand(rowKey);
          }
          this._events.emit('tree-toggle', { rowKey, row });
        },
        onRowSelectionToggle: ({ row, checked }) => {
          this.setRowSelected(row._rowKey, checked, { includeDescendants: true });
        },
        onRowMeasured: ({ flatIndex, height }) => {
          const changed = this._viewModel.setRowHeightAt(flatIndex, height);
          if (changed) {
            this._scheduleViewportRender();
          }
        },
        getRowHeight: options.getRowHeight ?? null,
        isRowSelectable: (row) => this._selectionManager.isSelectableRow(row),
        getRowClassName: options.getRowClassName ?? null,
        getRowStyle: options.getRowStyle ?? null,
        hooks: options.hooks ?? {},
        shouldAnimateRow: (rowKey) => this._liveUpdateManager.shouldAnimateRow(rowKey),
        getRowAnimationDuration: () => this._liveUpdateManager.getRowAnimationDuration(),
        getLocaleText: (key, fallback, params) => this.getLocaleText(key, fallback, params),
      }
    );

    this._virtualScrollManager = new VirtualScrollManager(this._viewModel, {
      onScrollChanged: async () => {
        if (this._displayMode === 'infinite') {
          await this._infiniteScrollManager.maybeLoadMore(this._viewModel);
        }
      },
      onRangeChanged: (range) => {
        this._currentRangeBundle = range;
        if (this._displayRows) {
          this._headerRenderer.render(range);
          this._bodyRenderer.render(this._displayRows, range);
        }
      },
    });

    this._virtualScrollManager.mount(
      this._dom.getBodyViewport(),
      this._dom.getHeaderCenterViewport()
    );

    this._dataStore = new DataStore({
      rowKey: options.rowKey ?? 'id',
      onChanged: () => {
        if (this._suspendDataStoreRefresh) {
          this._pendingDataStoreRefresh = true;
          return;
        }
        void this.refresh();
      },
    });

    this._displayRows = [];
    this._flatRows = [];
    this._currentRangeBundle = {
      vertical: this._viewModel.getVerticalRange(),
      horizontal: this._viewModel.getHorizontalRange(),
    };

    if (Array.isArray(options.rows)) {
      this._dataStore.setData(options.rows);
    } else {
      void this.refresh();
    }

    if (Array.isArray(options.plugins)) {
      for (const pluginEntry of options.plugins) {
        if (pluginEntry?.plugin) {
          this.usePlugin(pluginEntry.plugin, pluginEntry.options ?? {});
        } else if (pluginEntry) {
          this.usePlugin(pluginEntry, {});
        }
      }
    }

    void this._restoreColumnState();
    void this._initializeRemoteData();
  }

  async refresh() {
    if (this._destroyed) return;

    const version = ++this._renderVersion;
    let result;
    try {
      result = await this._pipeline.process(this._dataStore.getAll());
    } catch (error) {
      console.error('[GridCore] Pipeline processing failed:', error);
      if (!this._destroyed && version === this._renderVersion) {
        const message = this.getLocaleText('grid.error.processFailed', 'Failed to process data.');
        this._dom.showError(
          message,
          {
            content: this._renderOverlayState('error', { message, error }),
            actionLabel: this.getLocaleText('grid.error.retry', 'Retry'),
            onAction: () => {
              void this.refresh();
            },
          }
        );
        this._dom.hideInfiniteLoader();
      }
      return;
    }
    if (this._destroyed || version !== this._renderVersion) return;

    this._flatRows = result.flatRows;
    this._displayRows = result.displayRows;
    this._selectionManager.setCurrentRows(result.displayRows);
    this._viewModel.setTotalCount(result.displayRows.length);
    this._headerModel.rebuild();
    this._currentRangeBundle = {
      vertical: this._viewModel.getVerticalRange(),
      horizontal: this._viewModel.getHorizontalRange(),
    };

    this._pluginManager.callHook('beforeRender', result);
    this._syncColumnWidths();
    this._headerRenderer.render(this._currentRangeBundle);
    this._headerRenderer.updateSortIndicators();
    this._renderFooter();
    this._dom.setAccessibilityMeta({
      rowCount: result.totalCount ?? result.displayRows.length,
      colCount: this._columns.getVisibleLeafColumns().length + (this._options.selectable === false ? 0 : 1),
    });

    if (result.displayRows.length === 0) {
      this._bodyRenderer.clear();
      const message = this._options.emptyMessage ?? this.getLocaleText('grid.empty.noRows', 'No rows available.');
      this._dom.showEmpty(message, {
        content: this._renderOverlayState('empty', { message }),
      });
      this._dom.hideInfiniteLoader();
    } else {
      this._dom.hideOverlay();
      if (!(this._displayMode === 'infinite' && this._infiniteScrollManager.getState().loading)) {
        this._dom.hideInfiniteLoader();
      }
      this._bodyRenderer.render(result.displayRows, this._currentRangeBundle);
    }

    this._applyPendingLiveViewportAdjustment();

    this._events.emit('render', {
      rows: result.displayRows,
      flatRows: result.flatRows,
      totalCount: result.totalCount,
      visibleCount: result.displayRows.length,
      displayMode: this._displayMode,
    });
    this._pluginManager.callHook('afterRender', result);
    this._settingsPanel?.render();
  }

  setRows(rows) {
    this._invalidateMeasuredRows();
    this._dataStore.setData(Array.isArray(rows) ? rows : []);
  }

  setData(rows) {
    this.setRows(rows);
  }

  appendRows(rows) {
    this._dataStore.appendRows(Array.isArray(rows) ? rows : [rows]);
  }

  updateRows(rows) {
    this._dataStore.updateRows(Array.isArray(rows) ? rows : [rows]);
  }

  patchRow(key, patch) {
    this._dataStore.patchRow(key, patch);
  }

  upsertRows(rows) {
    this._dataStore.upsertRows(Array.isArray(rows) ? rows : [rows]);
  }

  removeRows(keys) {
    this._dataStore.removeRows(Array.isArray(keys) ? keys : [keys]);
  }

  setColumns(columns) {
    this._columns.setColumns(columns, true);
    this._headerModel.rebuild();
    this._invalidateMeasuredRows();
    this._syncColumnWidths();
    void this.saveColumnState();
    void this.refresh();
  }

  setQuickFilter(text, fields = []) {
    this._filterManager.setQuickFilter(text, fields);
  }

  setColumnFilter(colId, filterDef) {
    this._filterManager.setColumnFilter(colId, filterDef);
  }

  clearColumnFilter(colId) {
    this._filterManager.clearColumnFilter(colId);
  }

  clearFilters() {
    this._filterManager.clearAllFilters();
  }

  enableGrouping(groupByFields, options = {}) {
    if (this._treeManager.isEnabled()) {
      this._treeManager.disable();
    }
    this._invalidateMeasuredRows();
    this._groupManager.enable(groupByFields, options);
  }

  toggleGroup(groupKey) {
    this._groupManager.toggleGroup(groupKey);
  }

  disableGrouping() {
    this._invalidateMeasuredRows();
    this._groupManager.disable();
  }

  enableTree(options = {}) {
    if (this._groupManager.isEnabled()) {
      this._groupManager.disable();
    }
    Object.assign(this._treeManager, {
      _treeMode: options.treeMode ?? this._treeManager._treeMode,
      _childrenField: options.childrenField ?? this._treeManager._childrenField,
      _parentIdField: options.parentIdField ?? this._treeManager._parentIdField,
      _hasChildrenField: options.hasChildrenField ?? this._treeManager._hasChildrenField,
      _onLoadChildren: options.onLoadChildren ?? this._treeManager._onLoadChildren,
    });
    this._invalidateMeasuredRows();
    this._treeManager.enable();
    void this.refresh();
  }

  disableTree() {
    this._invalidateMeasuredRows();
    this._treeManager.disable();
    void this.refresh();
  }

  toggleTreeRow(rowKey) {
    this._treeManager.toggle(rowKey);
  }

  expandAllTree() {
    this._treeManager.expandAll(this._flatRows);
  }

  collapseAllTree() {
    this._treeManager.collapseAll();
  }

  sortBy(defs) {
    this._sortManager.setSort(defs);
  }

  clearSort() {
    this._sortManager.clearSort();
  }

  toggleSelectAll() {
    const keys = this._displayRows.flatMap((row) => this._collectSelectionKeysForRow(row));
    const selectedKeys = this._selectionManager.getSelectedKeys();
    const allSelected = keys.length > 0 && keys.every((key) => selectedKeys.has(String(key)));

    if (allSelected) {
      this._selectionManager.clearSelection();
    } else {
      this._selectionManager.setRowsSelected(keys, true, 'selectAll');
    }
    this._refreshSelection();
  }

  setRowSelected(rowKey, selected, options = {}) {
    const row = this._flatRows.find((item) => item._rowKey === String(rowKey));
    const keys = this._collectSelectionKeysForRow(row, options);
    this._selectionManager.setRowsSelected(keys, selected, selected ? 'select' : 'deselect');
    this._refreshSelection();
  }

  on(eventName, handler, options) {
    return this._events.on(eventName, handler, options);
  }

  getSelectedKeys() {
    return this._selectionManager.getSelectedKeys();
  }

  getSelectionState() {
    return this._selectionManager.getState();
  }

  getDisplayMode() {
    return this._displayMode;
  }

  getPaginationState() {
    return this._paginationManager.getState();
  }

  getInfiniteScrollState() {
    return this._infiniteScrollManager.getState();
  }

  isVariableRowHeight() {
    return this._viewModel.isVariableRowHeight();
  }

  getColumnState() {
    return this._columns.serializeState();
  }

  getAllLeafColumns() {
    return this._columns.getAllLeafColumns().map((column) => ({
      def: { ...column.def },
      state: { ...column.state },
    }));
  }

  getVisibleLeafColumns() {
    return this._columns.getVisibleLeafColumns().map((column) => ({
      def: { ...column.def },
      state: { ...column.state },
    }));
  }

  getFilterState() {
    return this._filterManager.getState();
  }

  getColumnFilterChoices(colId) {
    const def = this._columns.getDef(colId);
    if (!def) {
      return [];
    }

    const configured = def.filterOptions ?? def._raw?.filterOptions;
    if (Array.isArray(configured) && configured.length > 0) {
      return configured.map((option) => (
        option && typeof option === 'object' && 'value' in option
          ? {
            value: option.value,
            label: option.label ?? String(option.value),
          }
          : {
            value: option,
            label: String(option),
          }
      ));
    }

    const values = new Map();
    for (const row of this._dataStore.getAll()) {
      const value = row?.[def.field];
      if (value == null) {
        continue;
      }

      const key = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (!values.has(key)) {
        values.set(key, {
          value,
          label: String(value),
        });
      }
    }

    return [...values.values()];
  }

  getGroupingState() {
    return this._groupManager.getState();
  }

  getTreeState() {
    return this._treeManager.getState();
  }

  getRows() {
    return [...this._displayRows];
  }

  getFlatRows() {
    return [...this._flatRows];
  }

  usePlugin(plugin, options = {}) {
    this._pluginManager.use(plugin, options);
    void this.refresh();
  }

  unusePlugin(pluginName) {
    this._pluginManager.unuse(pluginName);
    void this.refresh();
  }

  hasPlugin(pluginName) {
    return this._pluginManager.has(pluginName);
  }

  getInstalledPlugins() {
    return this._pluginManager.getInstalledNames();
  }

  getAvailablePlugins() {
    return this._availablePlugins.map((entry) => ({ ...entry }));
  }

  setVariableRowHeight(enabled) {
    this._viewModel.setVariableRowHeight(Boolean(enabled));
    this._invalidateMeasuredRows();
    void this.refresh();
  }

  setPaginationMode(mode) {
    this._paginationManager.setMode(mode);
    if (this._displayMode === 'paginated' && mode === 'server') {
      void this._loadServerPage(this._paginationManager.getState().page, this._paginationManager.getState().pageSize);
      return;
    }
    void this.refresh();
  }

  setInfiniteScrollMode(mode) {
    this._infiniteScrollManager.setMode(mode);
    if (this._displayMode === 'infinite' && mode === 'server') {
      void this._loadInitialInfiniteRows();
      return;
    }
    void this.refresh();
  }

  setDisplayMode(mode) {
    const modeChanged = this._displayMode !== mode;
    if (mode === 'paginated') {
      this._infiniteScrollManager.reset();
    }
    if (mode === 'infinite') {
      this._paginationManager.setPage(0);
    }
    this._displayMode = mode;
    this._pipeline._displayMode = mode;
    this._invalidateMeasuredRows();
    if (modeChanged && mode === 'paginated' && this._paginationManager.getMode() === 'server') {
      void this._loadServerPage(this._paginationManager.getState().page, this._paginationManager.getState().pageSize);
      return;
    }
    if (modeChanged && mode === 'infinite' && this._infiniteScrollManager.getMode() === 'server') {
      void this._loadInitialInfiniteRows();
      return;
    }
    void this.refresh();
  }

  setPage(page) {
    this._displayMode = 'paginated';
    this._pipeline._displayMode = 'paginated';
    this._paginationManager.setPage(page);
  }

  nextPage() {
    this.setDisplayMode('paginated');
    this._paginationManager.nextPage();
  }

  prevPage() {
    this.setDisplayMode('paginated');
    this._paginationManager.prevPage();
  }

  setPageSize(size) {
    this.setDisplayMode('paginated');
    this._paginationManager.setPageSize(size);
  }

  enableInfiniteScroll() {
    this.setDisplayMode('infinite');
  }

  disableInfiniteScroll() {
    this.setDisplayMode('client');
  }

  loadMoreInfinite() {
    return this._infiniteScrollManager.loadMore();
  }

  liveAddRows(rows) {
    this._liveUpdateManager.enable();
    this._liveUpdateManager.addRows(Array.isArray(rows) ? rows : [rows]);
  }

  liveUpdateRows(rows) {
    this._liveUpdateManager.enable();
    this._liveUpdateManager.updateRows(Array.isArray(rows) ? rows : [rows]);
  }

  livePatchRow(key, patch) {
    this._liveUpdateManager.enable();
    this._liveUpdateManager.patchRow(key, patch);
  }

  liveUpsertRows(rows) {
    this._liveUpdateManager.enable();
    this._liveUpdateManager.upsertRows(Array.isArray(rows) ? rows : [rows]);
  }

  liveRemoveRows(keys) {
    this._liveUpdateManager.enable();
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => this._liveUpdateManager.removeRow(key));
  }

  pauseLiveUpdates() {
    this._liveUpdateManager.pause();
  }

  resumeLiveUpdates() {
    this._liveUpdateManager.resume();
  }

  setLiveRowAnimationEnabled(enabled) {
    const normalized = Boolean(enabled);
    this._options.liveUpdates = {
      ...(this._options.liveUpdates ?? {}),
      rowAnimationEnabled: normalized,
    };
    this._liveUpdateManager.setRowAnimationEnabled(normalized);
    void this.refresh();
  }

  isLiveRowAnimationEnabled() {
    return this._liveUpdateManager.isRowAnimationEnabled();
  }

  setLocale(locale = {}) {
    this._locale = this._mergeLocale(DEFAULT_LOCALE, locale);
    this._settingsPanel?.render();
    this._renderFooter();
    void this.refresh();
  }

  exportCsv(options = {}) {
    const delimiter = options.delimiter ?? ',';
    const includeHeaders = options.includeHeaders !== false;
    const columns = this._resolveCsvColumns(options);
    const rows = this._resolveCsvRows(options);
    const lines = [];

    if (includeHeaders) {
      lines.push(columns.map((column) => this._escapeCsvValue(column.def.headerName ?? column.def.header ?? column.def.id, delimiter)).join(delimiter));
    }

    rows.forEach((row) => {
      lines.push(columns.map(({ def }) => {
        const value = row?.[def.field];
        return this._escapeCsvValue(value, delimiter);
      }).join(delimiter));
    });

    const csv = lines.join('\n');
    this._pluginManager.callHook('afterCsvExport', {
      csv,
      rows,
      columns,
      options,
    });
    return csv;
  }

  downloadCsv(options = {}) {
    const csv = this.exportCsv(options);
    if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') {
      return csv;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = options.fileName ?? 'highgrid-export.csv';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return csv;
  }

  getLocaleText(key, fallback, params = {}) {
    const value = key.split('.').reduce((current, part) => current?.[part], this._locale);
    const template = typeof value === 'string' ? value : fallback;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`));
  }

  async saveColumnState() {
    if (!this._columnStateManager) return;
    await this._columnStateManager.save(this._columns.serializeState());
  }

  async loadColumnState() {
    await this._restoreColumnState();
  }

  async clearColumnState() {
    if (!this._columnStateManager) return;
    await this._columnStateManager.clear();
  }

  setColumnWidth(colId, width) {
    this._columns.setWidth(colId, width);
    this._invalidateMeasuredRows();
    this._syncColumnWidths();
    void this.saveColumnState();
    void this.refresh();
  }

  setColumnVisible(colId, visible) {
    this._columns.setVisible(colId, visible);
    this._invalidateMeasuredRows();
    void this.saveColumnState();
    void this.refresh();
  }

  setColumnPinned(colId, pin) {
    this._columns.setPinned(colId, pin);
    this._invalidateMeasuredRows();
    void this.saveColumnState();
    void this.refresh();
  }

  moveColumn(colId, toIndex, options = { restrictToGroup: true }) {
    this._columns.moveColumn(colId, toIndex, options);
    this._invalidateMeasuredRows();
    void this.saveColumnState();
    void this.refresh();
  }

  destroy() {
    this._destroyed = true;
    if (this._rowMeasureFrame) {
      cancelAnimationFrame(this._rowMeasureFrame);
      this._rowMeasureFrame = null;
    }
    this._dom.getRoot()?.removeEventListener('keydown', this._handleKeydown);
    void this.saveColumnState();
    this._virtualScrollManager.destroy();
    this._bodyRenderer.destroy();
    this._headerRenderer.destroy();
    this._dom.destroy();
    this._dataStore.destroy();
    this._selectionManager.destroy();
    this._filterManager.destroy();
    this._sortManager.destroy();
    this._groupManager.destroy();
    this._treeManager.destroy();
    this._paginationManager.destroy();
    this._infiniteScrollManager.destroy();
    this._liveUpdateManager.destroy();
    this._columnStateManager?.destroy();
    this._workerBridge.destroy();
    this._pluginManager.callHook('onDestroy', this);
    this._pluginManager.destroy();
    this._settingsPanel?.destroy();
    this._columns.destroy();
    this._headerModel.destroy();
    this._viewModel.destroy();
    this._events.destroy();
  }

  _syncColumnWidths() {
    const pinnedWidths = this._columns.getPinnedWidths();
    const selectionWidth = this._options.selectable === false ? 0 : 44;
    this._dom.updateColumnWidths({
      leftWidth: pinnedWidths.leftWidth + selectionWidth,
      centerWidth: pinnedWidths.centerWidth,
      rightWidth: pinnedWidths.rightWidth,
    });
    const centerWidths = this._columns.getColumnsByPin().center.map((column) => column.state.width ?? 0);
    this._viewModel.setColumnWidths(centerWidths);
  }

  _emitStateChanged(type) {
    this._events.emit('state-change', { type });
  }

  _applyLiveBatch(batch) {
    const maxRows = this._options.liveUpdates?.maxRows ?? 1000;
    const viewportAdjustment = this._captureLiveViewportAdjustment(batch, maxRows);

    this._suspendDataStoreRefresh = true;
    this._pendingDataStoreRefresh = false;

    if (batch.added.length > 0) {
      this._dataStore.appendRows(batch.added);
    }
    if (batch.updated.length > 0) {
      this._dataStore.updateRows(batch.updated);
    }
    if (batch.patched.length > 0) {
      this._dataStore.patchRows(batch.patched);
    }
    if (batch.upserted.length > 0) {
      this._dataStore.upsertRows(batch.upserted);
    }
    if (batch.removed.length > 0) {
      this._dataStore.removeRows(batch.removed);
    }

    if (maxRows > 0) {
      this._dataStore.trimToMax(maxRows);
    }

    this._suspendDataStoreRefresh = false;
    if (viewportAdjustment) {
      this._pendingLiveViewportAdjustment = viewportAdjustment;
    }

    const newCount = batch.added.length + batch.upserted.length;
    if (this._displayMode === 'paginated' && this._paginationManager.getState().page > 0 && newCount > 0) {
      this._liveUpdateManager.notifyNewData(newCount);
    }

    if (this._pendingDataStoreRefresh) {
      this._pendingDataStoreRefresh = false;
      void this.refresh();
    }
  }

  setLiveMaxRows(n) {
    this._options.liveUpdates = { ...(this._options.liveUpdates ?? {}), maxRows: n };
  }

  async _restoreColumnState() {
    if (!this._columnStateManager) return;
    const state = await this._columnStateManager.load();
    if (!state) return;
    this._columns.applySerializedState(state);
    this._headerModel.rebuild();
    this._syncColumnWidths();
    await this.refresh();
  }

  _renderFooter() {
    if (this._displayMode !== 'paginated') {
      this._dom.setFooterContent(null);
      return;
    }

    const state = this._paginationManager.getState();
    const footer = document.createElement('div');
    footer.className = 'ag-footer-bar';

    const summary = document.createElement('div');
    summary.className = 'ag-footer-summary';
    summary.textContent = this.getLocaleText(
      'grid.pagination.summary',
      '{startRow}-{endRow} of {totalCount}',
      state
    );

    const controls = document.createElement('div');
    controls.className = 'ag-footer-controls';

    const buttons = [
      { label: this.getLocaleText('grid.pagination.first', 'First'), disabled: state.isFirst, onClick: () => this._paginationManager.firstPage() },
      { label: this.getLocaleText('grid.pagination.prev', 'Prev'), disabled: state.isFirst, onClick: () => this._paginationManager.prevPage() },
      {
        label: this.getLocaleText(
          'grid.pagination.page',
          'Page {page} / {totalPages}',
          { page: state.page + 1, totalPages: state.totalPages }
        ),
        disabled: true,
        onClick: null,
      },
      { label: this.getLocaleText('grid.pagination.next', 'Next'), disabled: state.isLast, onClick: () => this._paginationManager.nextPage() },
      { label: this.getLocaleText('grid.pagination.last', 'Last'), disabled: state.isLast, onClick: () => this._paginationManager.lastPage() },
    ];

    buttons.forEach((config) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ag-footer-button';
      button.textContent = config.label;
      button.disabled = config.disabled;
      if (config.onClick) {
        button.addEventListener('click', config.onClick);
      }
      controls.appendChild(button);
    });

    footer.appendChild(summary);
    footer.appendChild(controls);
    this._dom.setFooterContent(footer);
  }

  async _initializeRemoteData() {
    if (this._paginationManager.getMode() === 'server' && this._displayMode === 'paginated') {
      await this._loadServerPage(this._paginationManager.getState().page, this._paginationManager.getState().pageSize);
    }

    if (this._infiniteScrollManager.getMode() === 'server' && this._displayMode === 'infinite') {
      await this._loadInitialInfiniteRows();
    }
  }

  async _loadServerPage(page, pageSize) {
    const fetchPage = this._options.pagination?.fetchPage;
    if (typeof fetchPage !== 'function') return;

    const requestId = ++this._serverPageRequestId;
    this._dom.showLoading(this.getLocaleText('grid.loading.page', 'Loading page data...'), {
      showSkeleton: true,
      content: this._renderOverlayState('loading', {
        message: this.getLocaleText('grid.loading.page', 'Loading page data...'),
      }),
    });
    try {
      const result = await fetchPage({
        page,
        pageSize,
        filters: this._filterManager.getWorkerPayload(),
        sort: this._sortManager.getState().sortDefs,
        displayMode: this._displayMode,
      });
      if (requestId !== this._serverPageRequestId || this._destroyed) {
        return;
      }
      this._invalidateMeasuredRows();
      this._paginationManager.setTotalCount(result.totalCount ?? 0, { silent: true });
      this._dataStore.setData(result.rows ?? []);
    } catch (error) {
      if (requestId !== this._serverPageRequestId || this._destroyed) {
        return;
      }
      console.error('[GridCore] Failed to load server page:', error);
      const message = this.getLocaleText('grid.error.pageLoadFailed', 'Failed to load page data.');
      this._dom.showError(
        message,
        {
          content: this._renderOverlayState('error', { message, error }),
          actionLabel: this.getLocaleText('grid.error.retry', 'Retry'),
          onAction: () => {
            void this._loadServerPage(page, pageSize);
          },
        }
      );
    }
  }

  async _loadInitialInfiniteRows() {
    const loadMore = this._options.infiniteScroll?.onLoadMore;
    if (typeof loadMore !== 'function') return;

    this._serverInfiniteRequestId += 1;
    this._invalidateMeasuredRows();
    this._dataStore.setData([]);
    this._infiniteScrollManager.reset();
    this._dom.showLoading(this.getLocaleText('grid.loading.moreRows', 'Loading more rows...'), {
      showSkeleton: true,
      content: this._renderOverlayState('loading', {
        message: this.getLocaleText('grid.loading.moreRows', 'Loading more rows...'),
      }),
    });
    try {
      await this._infiniteScrollManager.loadMore();
    } catch (error) {
      console.error('[GridCore] Failed to initialize infinite rows:', error);
      const message = this.getLocaleText('grid.error.moreRowsFailed', 'Failed to load rows.');
      this._dom.showError(
        message,
        {
          content: this._renderOverlayState('error', { message, error }),
          actionLabel: this.getLocaleText('grid.error.retry', 'Retry'),
          onAction: () => {
            void this._loadInitialInfiniteRows();
          },
        }
      );
    }
  }

  _mergeLocale(base, overrides) {
    if (!overrides || typeof overrides !== 'object') {
      return structuredClone(base);
    }

    const merge = (left, right) => {
      const result = { ...left };
      for (const [key, value] of Object.entries(right)) {
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          left?.[key] &&
          typeof left[key] === 'object' &&
          !Array.isArray(left[key])
        ) {
          result[key] = merge(left[key], value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return merge(base, overrides);
  }

  _reloadActiveRemoteData() {
    if (this._displayMode === 'paginated' && this._paginationManager.getMode() === 'server') {
      void this._loadServerPage(this._paginationManager.getState().page, this._paginationManager.getState().pageSize);
      return true;
    }

    if (this._displayMode === 'infinite' && this._infiniteScrollManager.getMode() === 'server') {
      void this._loadInitialInfiniteRows();
      return true;
    }

    return false;
  }

  _invalidateMeasuredRows() {
    this._viewModel.clearMeasuredRowHeights();
    this._currentRangeBundle = {
      vertical: this._viewModel.getVerticalRange(),
      horizontal: this._viewModel.getHorizontalRange(),
    };
  }

  _scheduleViewportRender() {
    if (this._rowMeasureFrame || this._destroyed) {
      return;
    }
    this._rowMeasureFrame = requestAnimationFrame(() => {
      this._rowMeasureFrame = null;
      if (this._destroyed || !this._displayRows) {
        return;
      }
      this._currentRangeBundle = {
        vertical: this._viewModel.getVerticalRange(),
        horizontal: this._viewModel.getHorizontalRange(),
      };
      this._headerRenderer.render(this._currentRangeBundle);
      this._headerRenderer.updateSortIndicators();
      this._bodyRenderer.render(this._displayRows, this._currentRangeBundle);
    });
  }

  _applyColumnResize(colId, width, options = {}) {
    const updated = this._columns.setWidth(colId, width);
    if (!updated) {
      return;
    }

    this._invalidateMeasuredRows();
    this._syncColumnWidths();
    this._headerModel.rebuild();
    this._headerRenderer.render(this._currentRangeBundle);
    this._headerRenderer.updateSortIndicators();

    if (this._displayRows.length > 0) {
      this._bodyRenderer.render(this._displayRows, this._currentRangeBundle);
    }

    if (options.commit) {
      void this.saveColumnState();
      this._emitStateChanged('column-resize');
    }
    this._settingsPanel?.render();
  }

  _normalizeAvailablePlugins(entries) {
    return entries
      .map((entry) => {
        if (!entry) return null;
        if (entry.plugin) {
          return {
            name: entry.plugin.name,
            label: entry.label ?? entry.plugin.label ?? entry.plugin.name,
            description: entry.description ?? entry.plugin.description ?? entry.plugin.name,
            plugin: entry.plugin,
            options: entry.options ?? {},
          };
        }
        return {
          name: entry.name,
          label: entry.label ?? entry.name,
          description: entry.description ?? entry.name,
          plugin: entry,
          options: {},
        };
      })
      .filter(Boolean);
  }

  _collectSelectionKeysForRow(row, options = {}) {
    if (!row) {
      return [];
    }

    const includeDescendants = options.includeDescendants !== false;
    const keys = row._type === 'group-header' ? [] : [row._rowKey];

    if (includeDescendants && Array.isArray(row._descendantRowKeys) && row._descendantRowKeys.length > 0) {
      keys.push(...row._descendantRowKeys);
    }

    return [...new Set(keys)];
  }

  // 선택 상태만 변경 시: 파이프라인 재실행 없이 헤더/바디만 재렌더링
  // Re-render the header and body when only selection state changed.
  _refreshSelection() {
    if (this._destroyed || !this._displayRows) return;
    ++this._renderVersion;
    this._headerRenderer.render(this._currentRangeBundle);
    this._bodyRenderer.render(this._displayRows, this._currentRangeBundle);
  }

  // 그룹/트리 토글 시: filter/sort를 건너뛰고 flatten+paginate만 재실행
  _refreshFlatten() {
    if (this._destroyed) return;

    const result = this._pipeline.flattenFromLastBase();
    if (!result) {
      void this.refresh();
      return;
    }

    ++this._renderVersion;
    this._flatRows = result.flatRows;
    this._displayRows = result.displayRows;
    this._selectionManager.setCurrentRows(result.displayRows);
    this._viewModel.setTotalCount(result.displayRows.length);
    this._headerModel.rebuild();
    this._currentRangeBundle = {
      vertical: this._viewModel.getVerticalRange(),
      horizontal: this._viewModel.getHorizontalRange(),
    };

    this._pluginManager.callHook('beforeRender', result);
    this._syncColumnWidths();
    this._headerRenderer.render(this._currentRangeBundle);
    this._headerRenderer.updateSortIndicators();
    this._renderFooter();
    this._dom.setAccessibilityMeta({
      rowCount: result.totalCount ?? result.displayRows.length,
      colCount: this._columns.getVisibleLeafColumns().length + (this._options.selectable === false ? 0 : 1),
    });

    if (result.displayRows.length === 0) {
      this._bodyRenderer.clear();
      const message = this._options.emptyMessage ?? this.getLocaleText('grid.empty.noRows', 'No rows available.');
      this._dom.showEmpty(message, {
        content: this._renderOverlayState('empty', { message }),
      });
    } else {
      this._dom.hideOverlay();
      this._bodyRenderer.render(result.displayRows, this._currentRangeBundle);
    }

    this._events.emit('render', {
      rows: result.displayRows,
      flatRows: result.flatRows,
      totalCount: result.totalCount,
      visibleCount: result.displayRows.length,
      displayMode: this._displayMode,
    });
    this._pluginManager.callHook('afterRender', result);
    this._settingsPanel?.render();
  }

  _applyPendingLiveViewportAdjustment() {
    const pending = this._pendingLiveViewportAdjustment;
    if (!pending) {
      return;
    }

    this._pendingLiveViewportAdjustment = null;

    if (pending.type === 'preserve') {
      this._virtualScrollManager.setScrollTop(pending.scrollTop);
      return;
    }

    if (pending.type === 'bottom') {
      this._virtualScrollManager.scrollToBottom({ behavior: 'auto' });
    }
  }

  _captureLiveViewportAdjustment(batch, maxRows) {
    const liveOptions = this._options.liveUpdates ?? {};
    const autoScrollEnabled = liveOptions.autoScroll ?? false;
    const autoScrollThreshold = liveOptions.autoScrollThreshold ?? 100;
    const wasNearBottom = this._viewModel.isAtBottom(autoScrollThreshold);
    const isUserScrolling = this._virtualScrollManager.isUserScrolling();

    if (isUserScrolling) {
      return null;
    }

    if (autoScrollEnabled && wasNearBottom) {
      return { type: 'bottom' };
    }

    if (maxRows <= 0) {
      return null;
    }

    const trimmedCount = this._estimateTrimmedRowCount(batch, maxRows);
    if (trimmedCount <= 0) {
      return null;
    }

    const trimmedHeight = this._viewModel.getHeightBeforeIndex(trimmedCount);
    return {
      type: 'preserve',
      scrollTop: Math.max(0, this._viewModel.getScrollTop() - trimmedHeight),
    };
  }

  _estimateTrimmedRowCount(batch, maxRows) {
    const existingKeys = new Set(this._dataStore.getAll().map((row) => this._dataStore.getRowKey(row)));
    let projectedSize = this._dataStore.size;

    for (const key of batch.removed) {
      const normalized = String(key);
      if (existingKeys.delete(normalized)) {
        projectedSize -= 1;
      }
    }

    for (const row of batch.added) {
      const key = this._dataStore.getRowKey(row);
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        projectedSize += 1;
      }
    }

    for (const row of batch.upserted) {
      const key = this._dataStore.getRowKey(row);
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        projectedSize += 1;
      }
    }

    return Math.max(0, projectedSize - maxRows);
  }

  _createRowKeyGetter(rowKey) {
    if (typeof rowKey === 'function') {
      return rowKey;
    }

    const field = rowKey ?? 'id';
    return (row, index) => {
      const value = row?.[field];
      return value == null ? String(index) : String(value);
    };
  }

  _renderOverlayState(kind, context = {}) {
    const rendererMap = {
      loading: this._options.renderLoadingState,
      empty: this._options.renderEmptyState,
      error: this._options.renderErrorState,
    };
    const renderer = rendererMap[kind];
    if (typeof renderer !== 'function') {
      return null;
    }
    try {
      return renderer({
        kind,
        ...context,
      });
    } catch (error) {
      console.error(`[GridCore] Failed to render ${kind} overlay:`, error);
      return null;
    }
  }

  _handleKeydown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !this._container.contains(target)) {
      return;
    }

    const focusable = target.closest('[data-grid-focusable]');
    if (!(focusable instanceof HTMLElement)) {
      return;
    }

    const key = event.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      return;
    }

    const kind = focusable.dataset.gridFocusable;
    if (kind === 'header') {
      this._moveHeaderFocus(focusable, key, event);
      return;
    }

    if (kind === 'cell') {
      this._moveCellFocus(focusable, key, event);
    }
  }

  _moveHeaderFocus(current, key, event) {
    const currentCol = Number(current.dataset.colIndex ?? 0);
    const headerButtons = [...this._container.querySelectorAll('[data-grid-focusable="header"]')];
    if (headerButtons.length === 0) {
      return;
    }

    let nextCol = currentCol;
    if (key === 'ArrowRight') nextCol += 1;
    if (key === 'ArrowLeft') nextCol -= 1;
    if (key === 'Home') nextCol = 0;
    if (key === 'End') nextCol = headerButtons.length - 1;
    if (key === 'ArrowDown') {
      const firstCell = this._container.querySelector(`[data-grid-focusable="cell"][data-col-index="${currentCol}"]`);
      if (firstCell instanceof HTMLElement) {
        event.preventDefault();
        firstCell.focus();
      }
      return;
    }

    const next = headerButtons.find((element) => Number(element.dataset.colIndex ?? -1) === nextCol);
    if (next instanceof HTMLElement) {
      event.preventDefault();
      next.focus();
    }
  }

  _moveCellFocus(current, key, event) {
    const rowIndex = Number(current.dataset.rowIndex ?? 0);
    const colIndex = Number(current.dataset.colIndex ?? 0);
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (key === 'ArrowUp') nextRow -= 1;
    if (key === 'ArrowDown') nextRow += 1;
    if (key === 'ArrowLeft') nextCol -= 1;
    if (key === 'ArrowRight') nextCol += 1;
    if (key === 'Home') nextCol = 0;
    if (key === 'End') {
      nextCol = this._columns.getVisibleLeafColumns().length + (this._options.selectable === false ? -1 : 0);
    }

    if (key === 'ArrowUp' && nextRow < 0) {
      const headerTarget = this._container.querySelector(`[data-grid-focusable="header"][data-col-index="${colIndex}"]`);
      if (headerTarget instanceof HTMLElement) {
        event.preventDefault();
        headerTarget.focus();
      }
      return;
    }

    const next = this._container.querySelector(
      `[data-grid-focusable="cell"][data-row-index="${nextRow}"][data-col-index="${nextCol}"]`
    );
    if (next instanceof HTMLElement) {
      event.preventDefault();
      next.focus();
    }
  }

  _resolveCsvColumns(options = {}) {
    const requested = Array.isArray(options.columns) && options.columns.length > 0
      ? new Set(options.columns.map(String))
      : null;
    const source = options.includeHidden === true
      ? this._columns.getAllLeafColumns()
      : this._columns.getVisibleLeafColumns();

    return requested
      ? source.filter((column) => requested.has(column.def.id))
      : source;
  }

  _resolveCsvRows(options = {}) {
    if (options.onlySelected === true) {
      const selected = this._selectionManager.getSelectedKeys();
      return this.getFlatRows().filter((row) => row?._type == null && selected.has(String(row._rowKey)));
    }

    const scope = options.scope ?? 'displayed';
    if (scope === 'all') {
      return this._dataStore.getAll();
    }
    if (scope === 'flat') {
      return this.getFlatRows().filter((row) => row?._type == null);
    }
    return this.getRows().filter((row) => row?._type == null);
  }

  _escapeCsvValue(value, delimiter) {
    if (value == null) {
      return '';
    }
    const normalized = typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
    if (normalized.includes('"') || normalized.includes('\n') || normalized.includes('\r') || normalized.includes(delimiter)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  }
}
