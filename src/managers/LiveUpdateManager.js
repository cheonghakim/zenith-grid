/**
 * LiveUpdateManager - 실시간 데이터 업데이트 처리
 *
 * 핵심 충돌 해결:
 *
 * 1. live + sort:
 *    - sortFreeze=true: 새 데이터가 들어와도 현재 정렬 위치 유지 (행이 갑자기 이동 안 함)
 *    - sortFreeze=false: 새 데이터를 정렬된 위치에 삽입
 *    - 추천: sortFreeze=true + 변경 행 하이라이트 + "정렬 새로고침" 버튼 제공
 *
 * 2. live + pagination:
 *    - 현재 페이지가 1페이지이면 자동 반영
 *    - 다른 페이지에 있으면 "N건의 새 데이터" 배너 표시
 *    - total count 자동 업데이트
 *
 * 3. throttle/debounce/batch:
 *    - batchInterval: N ms 동안 수집 후 한번에 적용 (기본 50ms)
 *    - 너무 짧으면 렌더링 부하, 너무 길면 데이터 지연
 */
export class LiveUpdateManager {
  /**
   * @param {Object} options
   * @param {boolean} [options.enabled=false]
   * @param {number} [options.batchInterval=50] - ms
   * @param {boolean} [options.sortFreeze=true]
   * @param {boolean} [options.autoScroll=false]
   * @param {number} [options.highlightDuration=2000] - 변경 행 하이라이트 유지 시간 ms
   * @param {Function} [options.onBatchReady] - (batch) => void
   * @param {Function} [options.onNewDataNotification] - (count) => void (다른 페이지에 있을 때)
   */
  constructor(options = {}) {
    this._enabled = options.enabled ?? false;
    this._batchInterval = options.batchInterval ?? 50;
    this._sortFreeze = options.sortFreeze ?? true;
    this._autoScroll = options.autoScroll ?? false;
    this._highlightDuration = options.highlightDuration ?? 2000;
    this._onBatchReady = options.onBatchReady ?? (() => {});
    this._onNewDataNotification = options.onNewDataNotification ?? (() => {});

    /** @type {LiveUpdateBatch} 현재 수집 중인 배치 */
    this._batch = this._createEmptyBatch();

    /** @type {number|null} 배치 타이머 */
    this._batchTimer = null;

    /** @type {Map<string, number>} rowKey -> highlight 만료 시간 */
    this._highlightedKeys = new Map();

    /** @type {number} 현재 페이지에 반영 안 된 새 데이터 수 */
    this._pendingNewCount = 0;

    /** @type {boolean} 일시 중지 상태 */
    this._paused = false;
  }

  // ─── 제어 ──────────────────────────────────────────────────

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

  // ─── 업데이트 수신 API ────────────────────────────────────

  /** 새 row 추가 */
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

  /** row 전체 교체 */
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

  /** 부분 필드 업데이트 */
  patchRow(key, patch) {
    if (!this._enabled || this._paused) return;
    this._batch.patched.push({ key: String(key), patch });
    this._scheduleBatch();
  }

  /** upsert */
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

  /** 삭제 */
  removeRow(key) {
    if (!this._enabled || this._paused) return;
    this._batch.removed.push(String(key));
    this._scheduleBatch();
  }

  // ─── 배치 처리 ─────────────────────────────────────────────

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

    // 하이라이트 등록
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

  // ─── 하이라이트 ────────────────────────────────────────────

  _registerHighlights(batch) {
    if (this._highlightDuration <= 0) return;

    const expiry = Date.now() + this._highlightDuration;
    const getKey = (row) => String(row?.id ?? row?._rowKey ?? '');

    for (const row of batch.added) this._highlightedKeys.set(getKey(row), expiry);
    for (const row of batch.updated) this._highlightedKeys.set(getKey(row), expiry);
    for (const { key } of batch.patched) this._highlightedKeys.set(key, expiry);
    for (const row of batch.upserted) this._highlightedKeys.set(getKey(row), expiry);

    // 만료된 하이라이트 정리
    const now = Date.now();
    for (const [key, exp] of this._highlightedKeys) {
      if (exp <= now) this._highlightedKeys.delete(key);
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

  // ─── 페이지 알림 (pagination + live) ─────────────────────

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

  // ─── 조회/상태 ─────────────────────────────────────────────

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
    this._batch = this._createEmptyBatch();
  }
}
