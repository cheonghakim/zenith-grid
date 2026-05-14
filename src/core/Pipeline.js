export class Pipeline {
  constructor(options = {}) {
    this._sortManager = options.sortManager;
    this._filterManager = options.filterManager;
    this._groupManager = options.groupManager ?? null;
    this._treeManager = options.treeManager ?? null;
    this._paginationManager = options.paginationManager ?? null;
    this._infiniteScrollManager = options.infiniteScrollManager ?? null;
    this._pluginManager = options.pluginManager ?? null;
    this._workerBridge = options.workerBridge ?? null;
    this._getRowKey = options.getRowKey ?? ((row, index) => String(row.id ?? index));
    this._displayMode = options.displayMode ?? 'client';
  }

  async process(rows) {
    let current = [...rows];

    if (this._pluginManager) {
      current = this._pluginManager.runHook('beforeDataProcess', current);
    }

    if (this._filterManager?.hasFilter()) {
      current = await this._runFilter(current);
    }

    if (this._sortManager?.hasSort()) {
      current = await this._runSort(current);
    }

    let flatRows = current.map((row, index) => ({
      ...row,
      _type: 'data',
      _flatIndex: index,
      _rowKey: String(this._getRowKey(row, index)),
      _depth: 0,
    }));

    if (this._groupManager?.isEnabled()) {
      flatRows = this._groupManager.flatten(flatRows);
    } else if (this._treeManager?.isEnabled()) {
      flatRows = this._treeManager.flatten(current);
    }

    flatRows = flatRows.map((row, index) => ({
      ...row,
      _flatIndex: index,
    }));

    const paginationState = this._paginationManager?.getState?.() ?? null;
    const paginationMode = this._paginationManager?.getMode?.() ?? 'client';
    const infiniteState = this._infiniteScrollManager?.getState?.() ?? null;
    const infiniteMode = this._infiniteScrollManager?.getMode?.() ?? 'client';

    let displayRows = flatRows;
    let totalCount = flatRows.length;

    if (this._displayMode === 'paginated' && this._paginationManager) {
      if (paginationMode === 'server') {
        totalCount = paginationState?.totalCount ?? flatRows.length;
        displayRows = flatRows;
      } else {
        totalCount = flatRows.length;
        this._paginationManager.setTotalCount(totalCount, { silent: true });
        const { start, end } = this._paginationManager.getSliceRange();
        displayRows = flatRows.slice(start, end);
      }
    } else if (this._displayMode === 'infinite' && this._infiniteScrollManager) {
      if (infiniteMode === 'server') {
        this._infiniteScrollManager.setLoadedCount(flatRows.length);
        if (infiniteState?.totalCount != null) {
          this._infiniteScrollManager.setTotalCount(infiniteState.totalCount);
          totalCount = infiniteState.totalCount;
        } else {
          totalCount = flatRows.length;
        }
        displayRows = flatRows;
      } else {
        const targetCount = infiniteState?.loadedCount > 0
          ? infiniteState.loadedCount
          : Math.min(flatRows.length, this._infiniteScrollManager.getInitialLoadSize());
        this._infiniteScrollManager.setLoadedCount(targetCount);
        this._infiniteScrollManager.setTotalCount(flatRows.length);
        displayRows = flatRows.slice(0, targetCount);
        totalCount = flatRows.length;
      }
    }

    const result = {
      flatRows,
      displayRows,
      totalCount,
    };

    if (this._pluginManager) {
      return this._pluginManager.runHook('afterDataProcess', result);
    }

    return result;
  }

  async _runFilter(rows) {
    const payload = this._filterManager.getWorkerPayload();
    if (this._workerBridge?.isEnabled) {
      return this._workerBridge.request(
        'filter',
        { rows, ...payload },
        () => this._filterManager.filter(rows)
      );
    }
    return this._filterManager.filter(rows);
  }

  async _runSort(rows) {
    const sortDefs = this._sortManager.getSerializableDefs();
    if (this._workerBridge?.isEnabled) {
      return this._workerBridge.request(
        'sort',
        { rows, sortDefs },
        () => this._sortManager.sort(rows)
      );
    }
    return this._sortManager.sort(rows);
  }
}
