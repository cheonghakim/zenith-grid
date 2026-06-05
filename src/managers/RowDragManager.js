export class RowDragManager {
  constructor(options = {}) {
    this._onRowDragStart = options.onRowDragStart ?? null;
    this._onRowDragEnd = options.onRowDragEnd ?? null;
    this._onRowDrop = options.onRowDrop ?? null;
    this._dragRowKey = null;
  }

  get isDragging() {
    return this._dragRowKey !== null;
  }

  get draggingRowKey() {
    return this._dragRowKey;
  }

  handleDragStart(rowKey) {
    this._dragRowKey = rowKey;
    this._onRowDragStart?.({ rowKey });
  }

  handleDragEnd() {
    const rowKey = this._dragRowKey;
    this._dragRowKey = null;
    this._onRowDragEnd?.({ rowKey });
  }

  handleDrop(fromRowKey, toRowKey) {
    if (!fromRowKey || fromRowKey === toRowKey) return;
    this._dragRowKey = null;
    this._onRowDrop?.({ fromRowKey, toRowKey });
  }

  destroy() {
    this._dragRowKey = null;
    this._onRowDragStart = null;
    this._onRowDragEnd = null;
    this._onRowDrop = null;
  }
}
