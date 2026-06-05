export class UndoRedoManager {
  constructor(options = {}) {
    this._maxHistory = options.maxHistory ?? 100;
    this._undoStack = [];
    this._redoStack = [];
    this._onChanged = options.onChanged ?? null;
  }

  push(action) {
    // action: { rowKey, colId, oldValue, newValue }
    this._undoStack.push(action);
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack = [];
    this._onChanged?.();
  }

  undo(applyFn) {
    if (this._undoStack.length === 0) return null;
    const action = this._undoStack.pop();
    this._redoStack.push(action);
    applyFn?.(action.rowKey, action.colId, action.oldValue);
    this._onChanged?.();
    return action;
  }

  redo(applyFn) {
    if (this._redoStack.length === 0) return null;
    const action = this._redoStack.pop();
    this._undoStack.push(action);
    applyFn?.(action.rowKey, action.colId, action.newValue);
    this._onChanged?.();
    return action;
  }

  canUndo() { return this._undoStack.length > 0; }
  canRedo() { return this._redoStack.length > 0; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._onChanged?.();
  }

  destroy() {
    this.clear();
    this._onChanged = null;
  }
}
