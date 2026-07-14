/**
 * ColumnStateManager - 컬럼 상태 영속성 관리
 *
 * tableId 기반으로 localStorage에 컬럼 상태 저장/복원.
 * 한 페이지에 여러 테이블이 있을 때 각자 독립 상태 유지.
 *
 * 저장 내용:
 * - 컬럼 너비
 * - 컬럼 보이기/숨기기
 * - 컬럼 순서
 * - 컬럼 고정(pin) 상태
 */
export class ColumnStateManager {
  /**
   * @param {string} tableId
   * @param {Object} [options]
   * @param {'localStorage'|'sessionStorage'|'memory'|'server'} [options.storage='localStorage']
   * @param {Object} [options.serverStorage] - { get(key), set(key, value) }
   */
  constructor(tableId, options = {}) {
    this._tableId = tableId;
    this._storageType = options.storage ?? 'localStorage';
    this._serverStorage = options.serverStorage ?? null;
    this._storageKey = `zenith-grid:${tableId}:columns`;
    this._memoryStore = null;
  }

  // ─── 저장 ──────────────────────────────────────────────────

  async save(columnState) {
    const data = JSON.stringify(columnState);

    switch (this._storageType) {
      case 'localStorage':
        try {
          localStorage.setItem(this._storageKey, data);
        } catch (e) {
          console.warn('[ColumnStateManager] localStorage save failed:', e);
        }
        break;
      case 'sessionStorage':
        try {
          sessionStorage.setItem(this._storageKey, data);
        } catch (e) {
          console.warn('[ColumnStateManager] sessionStorage save failed:', e);
        }
        break;
      case 'server':
        if (this._serverStorage) {
          try {
            await this._serverStorage.set(this._storageKey, columnState);
          } catch (e) {
            console.warn('[ColumnStateManager] server storage save failed:', e);
          }
        }
        break;
      case 'memory':
        this._memoryStore = columnState;
        break;
    }
  }

  // ─── 복원 ──────────────────────────────────────────────────

  async load() {
    try {
      switch (this._storageType) {
        case 'localStorage': {
          const raw = localStorage.getItem(this._storageKey);
          return raw ? JSON.parse(raw) : null;
        }
        case 'sessionStorage': {
          const raw = sessionStorage.getItem(this._storageKey);
          return raw ? JSON.parse(raw) : null;
        }
        case 'server':
          if (this._serverStorage) {
            return await this._serverStorage.get(this._storageKey);
          }
          return null;
        case 'memory':
          return this._memoryStore ?? null;
        default:
          return null;
      }
    } catch (e) {
      console.warn('[ColumnStateManager] load failed:', e);
      return null;
    }
  }

  // ─── 초기화 ────────────────────────────────────────────────

  async clear() {
    switch (this._storageType) {
      case 'localStorage':
        localStorage.removeItem(this._storageKey);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(this._storageKey);
        break;
      case 'server':
        if (this._serverStorage) {
          await this._serverStorage.set(this._storageKey, null);
        }
        break;
      case 'memory':
        this._memoryStore = null;
        break;
    }
  }

  getStorageKey() {
    return this._storageKey;
  }

  destroy() {
    this._memoryStore = null;
  }
}
