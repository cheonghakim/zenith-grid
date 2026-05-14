/**
 * PaginationManager - 페이지네이션 상태 관리
 *
 * 모드 충돌 정책:
 * - pagination vs infinite scroll: MUTUALLY EXCLUSIVE
 *   → TableCore에서 displayMode enum으로 강제
 *   → 둘 다 설정 시 에러 throw
 *
 * server-side pagination:
 * - totalCount를 외부에서 받아야 함
 * - 페이지 변경 시 onPageChange 콜백으로 서버 요청
 *
 * live mode + pagination:
 * - 현재 페이지에만 live update 반영
 * - 1페이지가 아닌 경우 배너로 새 데이터 알림
 * - total count 변경 시 페이지 수 재계산 (page drift 방지)
 */
export class PaginationManager {
  /**
   * @param {Object} options
   * @param {number} [options.pageSize=20]
   * @param {number} [options.page=0] - 0-based
   * @param {number} [options.totalCount=0] - server-side 시 필요
   * @param {'client'|'server'} [options.mode='client']
   * @param {Function} [options.onPageChange] - ({ page, pageSize }) => void
   * @param {Function} [options.onChanged]
   */
  constructor(options = {}) {
    this._pageSize = options.pageSize ?? 20;
    this._page = options.page ?? 0;
    this._totalCount = options.totalCount ?? 0;
    this._mode = options.mode ?? 'client';
    this._onPageChange = options.onPageChange ?? null;
    this._onChanged = options.onChanged ?? (() => {});
  }

  // ─── 페이지 이동 ───────────────────────────────────────────

  setPage(page) {
    const totalPages = this.getTotalPages();
    const clamped = Math.max(0, Math.min(page, totalPages - 1));

    if (this._page === clamped) return;

    const prev = this._page;
    this._page = clamped;

    if (this._onPageChange) {
      this._onPageChange({ page: clamped, pageSize: this._pageSize, prevPage: prev });
    }

    this._onChanged(this.getState());
  }

  nextPage() {
    this.setPage(this._page + 1);
  }

  prevPage() {
    this.setPage(this._page - 1);
  }

  firstPage() {
    this.setPage(0);
  }

  lastPage() {
    this.setPage(this.getTotalPages() - 1);
  }

  setPageSize(size) {
    if (size < 1) return;
    const prevSize = this._pageSize;
    this._pageSize = size;

    // 현재 보던 첫 번째 행이 새 페이지 크기에서 몇 페이지인지 계산
    const firstVisibleIndex = this._page * prevSize;
    this._page = Math.floor(firstVisibleIndex / size);

    this._onChanged(this.getState());
  }

  // ─── server-side 지원 ─────────────────────────────────────

  setTotalCount(count) {
    this._totalCount = count;
    // page drift 방지: 현재 페이지가 유효한지 확인
    const totalPages = this.getTotalPages();
    if (this._page >= totalPages && totalPages > 0) {
      this._page = totalPages - 1;
    }
    this._onChanged(this.getState());
  }

  // live mode에서 새 데이터 추가 시 total count 업데이트
  incrementTotalCount(delta = 1) {
    this._totalCount += delta;
    this._onChanged(this.getState());
  }

  // ─── 계산 ──────────────────────────────────────────────────

  getTotalPages() {
    if (this._totalCount === 0) return 1;
    return Math.ceil(this._totalCount / this._pageSize);
  }

  getSliceRange() {
    const start = this._page * this._pageSize;
    const end = start + this._pageSize;
    return { start, end };
  }

  // ─── 조회 ──────────────────────────────────────────────────

  getState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalCount: this._totalCount,
      totalPages: this.getTotalPages(),
      isFirst: this._page === 0,
      isLast: this._page >= this.getTotalPages() - 1,
      startRow: this._page * this._pageSize + 1,
      endRow: Math.min((this._page + 1) * this._pageSize, this._totalCount),
    };
  }

  // ─── 상태 직렬화 ───────────────────────────────────────────

  serializeState() {
    return { page: this._page, pageSize: this._pageSize };
  }

  applySerializedState(state) {
    if (state.pageSize != null) this._pageSize = state.pageSize;
    if (state.page != null) this._page = state.page;
  }

  destroy() {
    this._page = 0;
  }
}
