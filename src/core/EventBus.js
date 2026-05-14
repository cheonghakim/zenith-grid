/**
 * EventBus - 모든 모듈 간 통신의 중심
 *
 * 설계 원칙:
 * - 동기 실행: 상태 변경 순서 보장을 위해 핸들러는 동기적으로 호출
 * - priority 지원: 렌더러가 항상 마지막에 실행되도록 보장
 * - 에러 격리: 한 핸들러 에러가 다른 핸들러 실행을 막지 않음
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Array<{handler: Function, once: boolean, priority: number}>>} */
    this._listeners = new Map();
    this._destroyed = false;
    /** @type {Set<string>} 현재 emit 중인 이벤트 (재진입 감지용) */
    this._emitting = new Set();
  }

  /**
   * @param {string} event
   * @param {Function} handler
   * @param {{once?: boolean, priority?: number}} [options]
   * @returns {Function} unsubscribe 함수
   */
  on(event, handler, options = {}) {
    if (this._destroyed) return () => {};

    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }

    const entry = {
      handler,
      once: options.once ?? false,
      priority: options.priority ?? 0,
    };

    const list = this._listeners.get(event);
    list.push(entry);
    // 높은 priority가 먼저 실행됨
    list.sort((a, b) => b.priority - a.priority);

    return () => this.off(event, handler);
  }

  /** @returns {Function} unsubscribe 함수 */
  once(event, handler, options = {}) {
    return this.on(event, handler, { ...options, once: true });
  }

  off(event, handler) {
    if (!this._listeners.has(event)) return;
    const filtered = this._listeners.get(event).filter((l) => l.handler !== handler);
    this._listeners.set(event, filtered);
  }

  /**
   * @param {string} event
   * @param {*} payload
   * @returns {boolean} 리스너가 존재했는지 여부
   */
  emit(event, payload) {
    if (this._destroyed) return false;
    if (!this._listeners.has(event)) return false;

    // 재진입 감지 - 같은 이벤트가 핸들러 내부에서 다시 emit되면 경고
    if (this._emitting.has(event)) {
      console.warn(`[EventBus] Recursive emit detected for "${event}". This may cause infinite loops.`);
    }

    this._emitting.add(event);
    // 스냅샷을 복사해서 emit 중 추가된 리스너는 이번 emit에 포함 안 됨
    const snapshot = [...this._listeners.get(event)];
    let hasListeners = false;

    for (const { handler, once } of snapshot) {
      hasListeners = true;
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Uncaught error in handler for "${event}":`, err);
      }
      if (once) this.off(event, handler);
    }

    this._emitting.delete(event);
    return hasListeners;
  }

  /** 특정 이벤트 또는 전체 리스너 제거 */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  destroy() {
    this._destroyed = true;
    this._listeners.clear();
    this._emitting.clear();
  }
}
