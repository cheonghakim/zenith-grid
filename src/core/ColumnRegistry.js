import { ColumnModel } from './ColumnModel.js';

export class ColumnRegistry {
  constructor(columnDefs = [], initialState = {}) {
    this._model = new ColumnModel(columnDefs, initialState);
    this._markFirstVisibleColumn();
  }

  setColumns(columnDefs, preserveState = true) {
    this._model.setColumns(columnDefs, preserveState);
    this._markFirstVisibleColumn();
  }

  getModel() {
    return this._model;
  }

  getDef(colId) {
    return this._model.getDef(colId);
  }

  getState(colId) {
    return this._model.getState(colId);
  }

  getVisibleLeafColumns() {
    return this._model.getVisibleLeafColumns();
  }

  getColumnsByPin() {
    return this._model.getColumnsByPin();
  }

  getPinnedWidths() {
    const groups = this.getColumnsByPin();
    return {
      leftWidth: this._sumWidths(groups.left),
      centerWidth: this._sumWidths(groups.center),
      rightWidth: this._sumWidths(groups.right),
    };
  }

  setWidth(colId, width) {
    const updated = this._model.setWidth(colId, width);
    this._markFirstVisibleColumn();
    return updated;
  }

  _sumWidths(columns) {
    return columns.reduce((total, column) => total + (column.state.width ?? 0), 0);
  }

  _markFirstVisibleColumn() {
    const visible = this._model.getVisibleLeafColumns();
    for (const column of this._model.getAllLeafColumns()) {
      column.def._isFirstColumn = false;
    }
    if (visible.length > 0) {
      visible[0].def._isFirstColumn = true;
    }
  }

  destroy() {
    this._model.destroy();
  }
}
