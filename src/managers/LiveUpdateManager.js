export class LiveUpdateManager {
  constructor(options = {}) {
    this._enabled = options.enabled ?? false;
    this._batchInterval = options.batchInterval ?? 50;
    this._sortFreeze = options.sortFreeze ?? true;
    this._autoScroll = options.autoScroll ?? false;
    this._highlightDuration = options.highlightDuration ?? 2000;
    this._rowAnimationEnabled = options.rowAnimationEnabled ?? true;
    this._rowAnimationDuration = options.rowAnimationDuration ?? 700;
    this._onBatchReady = options.onBatchReady ?? (() => {});
    this._onNewDataNotification = options.onNewDataNotification ?? (() => {});

    this._batch = this._createEmptyBatch();
    this._batchTimer = null;
    this._highlightedKeys = new Map();
    this._animatedKeys = new Map();
    this._pendingNewCount = 0;
    this._paused = false;
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
    this._flushBatch();
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
    if (this._batchTimer === null && !this._isBatchEmpty()) {
      this._scheduleBatch();
    }
  }

  setSortFreeze(freeze) {
    this._sortFreeze = freeze;
  }

  setRowAnimationEnabled(enabled) {
    this._rowAnimationEnabled = Boolean(enabled);
    if (!this._rowAnimationEnabled) {
      this._animatedKeys.clear();
    }
  }

  addRow(row) {
    if (!this._enabled || this._paused) return;
    this._batch.added.push(row);
    this._scheduleBatch();
  }

  addRows(rows) {
    if (!this._enabled || this._paused) return;
    this._batch.added.push(...rows);
    this._scheduleBatch();
  }

  updateRow(row) {
    if (!this._enabled || this._paused) return;
    this._batch.updated.push(row);
    this._scheduleBatch();
  }

  updateRows(rows) {
    if (!this._enabled || this._paused) return;
    this._batch.updated.push(...rows);
    this._scheduleBatch();
  }

  patchRow(key, patch) {
    if (!this._enabled || this._paused) return;
    this._batch.patched.push({ key: String(key), patch });
    this._scheduleBatch();
  }

  upsertRow(row) {
    if (!this._enabled || this._paused) return;
    this._batch.upserted.push(row);
    this._scheduleBatch();
  }

  upsertRows(rows) {
    if (!this._enabled || this._paused) return;
    this._batch.upserted.push(...rows);
    this._scheduleBatch();
  }

  removeRow(key) {
    if (!this._enabled || this._paused) return;
    this._batch.removed.push(String(key));
    this._scheduleBatch();
  }

  _scheduleBatch() {
    if (this._batchTimer !== null) return;

    if (this._batchInterval <= 0) {
      this._flushBatch();
      return;
    }

    this._batchTimer = setTimeout(() => {
      this._batchTimer = null;
      this._flushBatch();
    }, this._batchInterval);
  }

  _flushBatch() {
    if (this._isBatchEmpty()) return;

    const batch = this._batch;
    this._batch = this._createEmptyBatch();

    this._registerAnimatedRows(batch);
    this._registerHighlights(batch);

    this._onBatchReady({
      ...batch,
      sortFreeze: this._sortFreeze,
      autoScroll: this._autoScroll,
    });
  }

  _createEmptyBatch() {
    return {
      added: [],
      updated: [],
      patched: [],
      upserted: [],
      removed: [],
      timestamp: Date.now(),
    };
  }

  _isBatchEmpty() {
    return (
      this._batch.added.length === 0 &&
      this._batch.updated.length === 0 &&
      this._batch.patched.length === 0 &&
      this._batch.upserted.length === 0 &&
      this._batch.removed.length === 0
    );
  }

  _registerHighlights(batch) {
    if (this._highlightDuration <= 0) return;

    const expiry = Date.now() + this._highlightDuration;
    const getKey = (row) => String(row?.id ?? row?._rowKey ?? '');

    for (const row of batch.added) this._highlightedKeys.set(getKey(row), expiry);
    for (const row of batch.updated) this._highlightedKeys.set(getKey(row), expiry);
    for (const { key } of batch.patched) this._highlightedKeys.set(key, expiry);
    for (const row of batch.upserted) this._highlightedKeys.set(getKey(row), expiry);

    const now = Date.now();
    for (const [key, exp] of this._highlightedKeys) {
      if (exp <= now) this._highlightedKeys.delete(key);
    }
  }

  // 셀 단위 flash 추적: rowKey → Set<fieldName>
  _flashCells = new Map();

  registerCellFlash(rowKey, fields) {
    const key = String(rowKey);
    if (!this._flashCells.has(key)) this._flashCells.set(key, new Set());
    const set = this._flashCells.get(key);
    for (const f of fields) set.add(f);
  }

  getAndClearFlashCells() {
    const snapshot = this._flashCells;
    this._flashCells = new Map();
    return snapshot;
  }

  _registerAnimatedRows(batch) {
    if (!this._rowAnimationEnabled || this._rowAnimationDuration <= 0) return;

    const expiry = Date.now() + this._rowAnimationDuration;
    const getKey = (row) => String(row?.id ?? row?._rowKey ?? '');

    for (const row of batch.added) this._animatedKeys.set(getKey(row), expiry);
    for (const row of batch.upserted) this._animatedKeys.set(getKey(row), expiry);

    this._clearExpiredAnimatedKeys();
  }

  _clearExpiredAnimatedKeys() {
    const now = Date.now();
    for (const [key, exp] of this._animatedKeys) {
      if (exp <= now) this._animatedKeys.delete(key);
    }
  }

  isHighlighted(rowKey) {
    const expiry = this._highlightedKeys.get(String(rowKey));
    if (!expiry) return false;
    if (expiry <= Date.now()) {
      this._highlightedKeys.delete(String(rowKey));
      return false;
    }
    return true;
  }

  getHighlightProgress(rowKey) {
    const expiry = this._highlightedKeys.get(String(rowKey));
    if (!expiry) return 0;
    const remaining = expiry - Date.now();
    return Math.max(0, remaining / this._highlightDuration);
  }

  shouldAnimateRow(rowKey) {
    if (!this._rowAnimationEnabled) return false;
    const expiry = this._animatedKeys.get(String(rowKey));
    if (!expiry) return false;
    if (expiry <= Date.now()) {
      this._animatedKeys.delete(String(rowKey));
      return false;
    }
    return true;
  }

  isRowAnimationEnabled() {
    return this._rowAnimationEnabled;
  }

  getRowAnimationDuration() {
    return this._rowAnimationDuration;
  }

  notifyNewData(count) {
    this._pendingNewCount += count;
    this._onNewDataNotification(this._pendingNewCount);
  }

  clearPendingCount() {
    this._pendingNewCount = 0;
    this._onNewDataNotification(0);
  }

  getPendingCount() {
    return this._pendingNewCount;
  }

  isEnabled() {
    return this._enabled;
  }

  isSortFrozen() {
    return this._sortFreeze;
  }

  destroy() {
    if (this._batchTimer !== null) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }
    this._highlightedKeys.clear();
    this._animatedKeys.clear();
    this._batch = this._createEmptyBatch();
  }
}
