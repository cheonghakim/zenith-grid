export class RangeSelectionManager {
  constructor(options = {}) {
    this._start = null;
    this._end = null;
    this._onChanged = options.onChanged ?? null;
    this._isSelecting = false;
  }

  startRange(rowKey, colId) {
    this._start = { rowKey: String(rowKey), colId };
    this._end = { rowKey: String(rowKey), colId };
    this._isSelecting = true;
    this._onChanged?.();
  }

  extendRange(rowKey, colId) {
    if (!this._start) return;
    this._end = { rowKey: String(rowKey), colId };
    this._onChanged?.();
  }

  endSelection() {
    this._isSelecting = false;
  }

  clearRange() {
    this._start = null;
    this._end = null;
    this._isSelecting = false;
    this._onChanged?.();
  }

  hasRange() {
    return this._start !== null && this._end !== null;
  }

  isInRange(rowKey, colId, displayRows, columnDefs) {
    if (!this._start || !this._end) return false;

    const rowKeyStr = String(rowKey);
    const rowKeys = displayRows
      .filter((r) => r._type !== 'group-header' && r._type !== 'tree-loading')
      .map((r) => String(r._rowKey));

    const colIds = columnDefs.map((d) => d.id);

    const startRowIdx = rowKeys.indexOf(String(this._start.rowKey));
    const endRowIdx = rowKeys.indexOf(String(this._end.rowKey));
    const startColIdx = colIds.indexOf(this._start.colId);
    const endColIdx = colIds.indexOf(this._end.colId);

    if (startRowIdx === -1 || endRowIdx === -1 || startColIdx === -1 || endColIdx === -1) return false;

    const currentRowIdx = rowKeys.indexOf(rowKeyStr);
    const currentColIdx = colIds.indexOf(colId);

    if (currentRowIdx === -1 || currentColIdx === -1) return false;

    const minRow = Math.min(startRowIdx, endRowIdx);
    const maxRow = Math.max(startRowIdx, endRowIdx);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    return (
      currentRowIdx >= minRow &&
      currentRowIdx <= maxRow &&
      currentColIdx >= minCol &&
      currentColIdx <= maxCol
    );
  }

  getRangeData(displayRows, columnDefs) {
    if (!this._start || !this._end) return [];

    const rowKeys = displayRows
      .filter((r) => r._type !== 'group-header' && r._type !== 'tree-loading')
      .map((r) => String(r._rowKey));

    const colIds = columnDefs.map((d) => d.id);

    const startRowIdx = rowKeys.indexOf(String(this._start.rowKey));
    const endRowIdx = rowKeys.indexOf(String(this._end.rowKey));
    const startColIdx = colIds.indexOf(this._start.colId);
    const endColIdx = colIds.indexOf(this._end.colId);

    if (startRowIdx === -1 || endRowIdx === -1) return [];

    const minRow = Math.min(startRowIdx, endRowIdx);
    const maxRow = Math.max(startRowIdx, endRowIdx);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    const selectedCols = columnDefs.slice(minCol, maxCol + 1);

    const dataRows = displayRows.filter(
      (r) => r._type !== 'group-header' && r._type !== 'tree-loading'
    );

    return dataRows.slice(minRow, maxRow + 1).map((row) =>
      selectedCols.map((def) => {
        const val = row[def.field];
        if (typeof def.formatter === 'function') return def.formatter(val, row);
        return val ?? '';
      })
    );
  }

  copyToClipboard(displayRows, columnDefs) {
    const data = this.getRangeData(displayRows, columnDefs);
    if (data.length === 0) return;
    const text = data.map((row) => row.join('\t')).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
  }

  getState() {
    return { start: this._start ? { ...this._start } : null, end: this._end ? { ...this._end } : null };
  }

  destroy() {
    this._start = null;
    this._end = null;
    this._onChanged = null;
  }
}
