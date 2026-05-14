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
      onChanged: (payload) => {
        this._events.emit('selection-change', payload);
        options.onSelectionChange?.(payload);
      },
    });

    this._groupManager = new GroupManager({
      onChanged: () => {
        this._emitStateChanged('group');
        void this.refresh();
      },
    });

    this._treeManager = new TreeManager({
      ...(options.tree ?? {}),
      onChanged: () => {
        this._emitStateChanged('tree');
        void this.refresh();
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
        if (payload?.action === 'loadingComplete' && Array.isArray(payload.rows)) {
          this._dataStore.appendRows(payload.rows);
          this._infiniteScrollManager.onRowsAppended(payload.rows.length);
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
            `${count} new rows are waiting. Click to apply focus.`,
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
      }
    );

    this._bodyRenderer = new BodyRenderer(
      this._dom,
      this._columns.getModel(),
      this._viewModel,
      {
        selectionManager: this._selectionManager,
        onRowClick: ({ row, event }) => {
          if (options.selectable !== false) {
            if (event.shiftKey) {
              this._selectionManager.shiftSelect(row._rowKey);
            } else {
              this._selectionManager.toggleRow(row._rowKey);
            }
            void this.refresh();
          }

          this._events.emit('row-click', { row, event });
          options.onRowClick?.({ row, event });
        },
        onCellClick: (payload) => {
          this._events.emit('cell-click', payload);
          options.onCellClick?.(payload);
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
        onRowMeasured: ({ flatIndex, height }) => {
          const changed = this._viewModel.setRowHeightAt(flatIndex, height);
          if (changed) {
            this._scheduleViewportRender();
          }
        },
        getRowHeight: options.getRowHeight ?? null,
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
    const result = await this._pipeline.process(this._dataStore.getAll());
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

    if (result.displayRows.length === 0) {
      this._bodyRenderer.clear();
      this._dom.showEmpty(this._options.emptyMessage ?? 'No rows to display.');
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
  }

  disableTree() {
    this._invalidateMeasuredRows();
    this._treeManager.disable();
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

  on(eventName, handler, options) {
    return this._events.on(eventName, handler, options);
  }

  getSelectedKeys() {
    return this._selectionManager.getSelectedKeys();
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
    this._dom.updateColumnWidths(pinnedWidths);
    const centerWidths = this._columns.getColumnsByPin().center.map((column) => column.state.width ?? 0);
    this._viewModel.setColumnWidths(centerWidths);
  }

  _emitStateChanged(type) {
    this._events.emit('state-change', { type });
  }

  _applyLiveBatch(batch) {
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

    const newCount = batch.added.length + batch.upserted.length;
    if (this._displayMode === 'paginated' && this._paginationManager.getState().page > 0 && newCount > 0) {
      this._liveUpdateManager.notifyNewData(newCount);
    }
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
    summary.textContent = `${state.startRow}-${state.endRow} of ${state.totalCount}`;

    const controls = document.createElement('div');
    controls.className = 'ag-footer-controls';

    const buttons = [
      { label: 'First', disabled: state.isFirst, onClick: () => this._paginationManager.firstPage() },
      { label: 'Prev', disabled: state.isFirst, onClick: () => this._paginationManager.prevPage() },
      { label: `Page ${state.page + 1} / ${state.totalPages}`, disabled: true, onClick: null },
      { label: 'Next', disabled: state.isLast, onClick: () => this._paginationManager.nextPage() },
      { label: 'Last', disabled: state.isLast, onClick: () => this._paginationManager.lastPage() },
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
    this._dom.showLoading('Loading page...');
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
  }

  async _loadInitialInfiniteRows() {
    const loadMore = this._options.infiniteScroll?.onLoadMore;
    if (typeof loadMore !== 'function') return;

    this._serverInfiniteRequestId += 1;
    this._invalidateMeasuredRows();
    this._dataStore.setData([]);
    this._infiniteScrollManager.reset();
    this._dom.showLoading('Loading rows...');
    await this._infiniteScrollManager.loadMore();
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
}
