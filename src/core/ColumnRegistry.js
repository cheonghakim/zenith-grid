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

  getAllLeafColumns() {
    return this._model.getAllLeafColumns();
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

  serializeState() {
    return this._model.serializeState();
  }

  applySerializedState(state) {
    this._model.applySerializedState(state);
    this._markFirstVisibleColumn();
  }

  setVisible(colId, visible) {
    const updated = this._model.setVisible(colId, visible);
    this._markFirstVisibleColumn();
    return updated;
  }

  setPinned(colId, pin) {
    const updated = this._model.setPinned(colId, pin);
    this._markFirstVisibleColumn();
    return updated;
  }

  moveColumn(colId, toIndex, options) {
    const updated = this._model.moveColumn(colId, toIndex, options);
    this._markFirstVisibleColumn();
    return updated;
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
