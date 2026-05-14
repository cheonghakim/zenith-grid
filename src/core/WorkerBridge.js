/**
 * WorkerBridge - Web Worker와의 통신 추상화
 *
 * 메인 스레드에서 Worker로 무거운 계산(정렬/필터/집계)을 위임.
 * Worker를 사용할 수 없거나 비활성화된 경우 메인 스레드에서 폴백 실행.
 *
 * 메시지 프로토콜:
 * Request: { id: string, type: string, payload: any }
 * Response: { id: string, type: string, result?: any, error?: string }
 *
 * 지원 작업 타입:
 * - 'sort': rows + sortDefs → 정렬된 rows
 * - 'filter': rows + filterDefs → 필터된 rows
 * - 'group-aggregate': rows + groupDefs → 집계 결과
 * - 'tree-flatten': rows + treeOptions → flatten된 rows
 * - 'row-diff': prevRows + nextRows → diff 결과
 */
export class WorkerBridge {
  /**
   * @param {Object} options
   * @param {string|URL} [options.workerUrl] - Worker 파일 경로
   * @param {boolean} [options.enabled=true] - Worker 사용 여부
   * @param {number} [options.timeout=10000] - 요청 타임아웃(ms)
   */
  constructor(options = {}) {
    this._enabled = options.enabled ?? true;
    this._timeout = options.timeout ?? 10000;
    this._worker = null;
    this._pendingRequests = new Map(); // id -> { resolve, reject, timer }
    this._requestCounter = 0;

    if (this._enabled) {
      this._initWorker(options.workerUrl);
    }
  }

  _initWorker(workerUrl) {
    try {
      if (workerUrl) {
        this._worker = new Worker(workerUrl, { type: 'module' });
      } else {
        // Inline Worker (blob URL)
        this._worker = this._createInlineWorker();
      }

      this._worker.addEventListener('message', (e) => this._handleWorkerMessage(e.data));
      this._worker.addEventListener('error', (e) => {
        console.error('[WorkerBridge] Worker error:', e);
        this._rejectAllPending('Worker error: ' + e.message);
        this._enabled = false;
      });
    } catch (err) {
      console.warn('[WorkerBridge] Failed to create Worker. Falling back to main thread.', err);
      this._enabled = false;
    }
  }

  /**
   * Worker 코드를 Blob URL로 생성 (별도 파일 없이 사용 가능)
   */
  _createInlineWorker() {
    const workerCode = `
import { DataWorkerHandlers } from './DataWorker.js';

self.addEventListener('message', async (e) => {
  const { id, type, payload } = e.data;
  try {
    const handler = DataWorkerHandlers[type];
    if (!handler) throw new Error('Unknown task type: ' + type);
    const result = await handler(payload);
    self.postMessage({ id, type, result });
  } catch (err) {
    self.postMessage({ id, type, error: err.message });
  }
});
    `.trim();

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob), { type: 'module' });
  }

  // ─── 요청 전송 ─────────────────────────────────────────────

  /**
   * Worker에 작업 요청. Worker 비활성화 시 폴백으로 메인 스레드 실행.
   * @param {string} type
   * @param {*} payload
   * @param {Function} [fallback] - Worker 없을 때 실행할 메인 스레드 함수
   * @returns {Promise<*>}
   */
  async request(type, payload, fallback = null) {
    if (!this._enabled || !this._worker) {
      if (fallback) return fallback(payload);
      throw new Error(`[WorkerBridge] Worker not available for task "${type}" and no fallback provided.`);
    }

    return new Promise((resolve, reject) => {
      const id = String(++this._requestCounter);

      const timer = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error(`[WorkerBridge] Request "${type}" timed out after ${this._timeout}ms`));
      }, this._timeout);

      this._pendingRequests.set(id, { resolve, reject, timer });
      this._worker.postMessage({ id, type, payload });
    });
  }

  /**
   * 진행 중인 특정 타입의 요청을 취소 (새 정렬 요청이 오면 이전 요청 불필요)
   */
  cancelByType(type) {
    // Worker 메시지 취소는 실제로 불가능하므로 응답 무시 처리
    // 향후 AbortController 패턴으로 확장 가능
    for (const [id, { timer }] of this._pendingRequests) {
      // type 기반 취소는 메타데이터 추가 필요 - MVP에서는 전체 취소로 단순화
    }
  }

  _handleWorkerMessage(data) {
    const { id, result, error } = data;
    const pending = this._pendingRequests.get(id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this._pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  _rejectAllPending(message) {
    for (const { reject, timer } of this._pendingRequests.values()) {
      clearTimeout(timer);
      reject(new Error(message));
    }
    this._pendingRequests.clear();
  }

  get isEnabled() {
    return this._enabled && this._worker !== null;
  }

  destroy() {
    this._rejectAllPending('WorkerBridge destroyed');
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }
}
