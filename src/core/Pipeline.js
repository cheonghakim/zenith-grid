export class Pipeline {
  constructor(options = {}) {
    this._sortManager = options.sortManager;
    this._filterManager = options.filterManager;
    this._workerBridge = options.workerBridge ?? null;
    this._getRowKey = options.getRowKey ?? ((row, index) => String(row.id ?? index));
  }

  async process(rows) {
    let current = [...rows];

    if (this._filterManager?.hasFilter()) {
      current = await this._runFilter(current);
    }

    if (this._sortManager?.hasSort()) {
      current = await this._runSort(current);
    }

    return current.map((row, index) => ({
      ...row,
      _type: 'data',
      _flatIndex: index,
      _rowKey: String(this._getRowKey(row, index)),
      _depth: 0,
    }));
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
