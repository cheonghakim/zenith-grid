/**
 * InfiniteScrollManager - 무한 스크롤 상태 관리
 *
 * pagination과 MUTUALLY EXCLUSIVE:
 * - displayMode='infinite'로만 활성화
 * - pagination이 설정되면 에러
 *
 * server-side 무한스크롤:
 * - cursor 기반 또는 offset 기반
 * - onLoadMore 콜백으로 다음 페이지 로드
 */
export class InfiniteScrollManager {
  /**
   * @param {Object} options
   * @param {number} [options.initialLoadSize=50]
   * @param {number} [options.loadMoreSize=50]
   * @param {number} [options.scrollThreshold=200] - px from bottom
   * @param {Function} [options.onLoadMore] - async ({ offset, cursor, loadSize }) => { rows, hasMore, cursor? }
   * @param {Function} [options.onChanged]
   */
  constructor(options = {}) {
    this._initialLoadSize = options.initialLoadSize ?? 50;
    this._loadMoreSize = options.loadMoreSize ?? 50;
    this._scrollThreshold = options.scrollThreshold ?? 200;
    this._onLoadMore = options.onLoadMore ?? null;
    this._onChanged = options.onChanged ?? (() => {});

    this._loadedCount = 0;
    this._totalCount = null; // null = 알 수 없음
    this._hasMore = true;
    this._loading = false;
    this._cursor = null; // cursor-based pagination
    this._error = null;
  }

  // ─── 상태 ──────────────────────────────────────────────────

  getState() {
    return {
      loadedCount: this._loadedCount,
      totalCount: this._totalCount,
      hasMore: this._hasMore,
      loading: this._loading,
      cursor: this._cursor,
    };
  }

  setLoadedCount(count) {
    this._loadedCount = count;
  }

  setTotalCount(count) {
    this._totalCount = count;
    this._hasMore = this._loadedCount < count;
  }

  // ─── 로드 트리거 ───────────────────────────────────────────

  /**
   * VirtualScrollManager에서 스크롤 위치가 threshold에 도달하면 호출
   */
  async maybeLoadMore(viewModel) {
    if (!this._hasMore || this._loading || !this._onLoadMore) return;

    const { totalHeight } = viewModel.getVerticalRange();
    const scrollBottom = viewModel.getScrollTop() + viewModel.getViewportHeight();
    const distanceFromBottom = totalHeight - scrollBottom;

    if (distanceFromBottom > this._scrollThreshold) return;

    await this.loadMore();
  }

  async loadMore() {
    if (!this._hasMore || this._loading || !this._onLoadMore) return;

    this._loading = true;
    this._error = null;
    this._onChanged({ action: 'loadingStart' });

    try {
      const result = await this._onLoadMore({
        offset: this._loadedCount,
        cursor: this._cursor,
        loadSize: this._loadMoreSize,
      });

      this._cursor = result.cursor ?? null;
      this._hasMore = result.hasMore ?? (result.rows?.length === this._loadMoreSize);

      if (result.totalCount != null) {
        this._totalCount = result.totalCount;
      }

      this._loading = false;
      this._onChanged({ action: 'loadingComplete', rows: result.rows, hasMore: this._hasMore });
    } catch (err) {
      this._loading = false;
      this._error = err.message;
      this._onChanged({ action: 'loadingError', error: err.message });
      console.error('[InfiniteScrollManager] loadMore failed:', err);
    }
  }

  reset() {
    this._loadedCount = 0;
    this._hasMore = true;
    this._loading = false;
    this._cursor = null;
    this._error = null;
  }

  onRowsAppended(count) {
    this._loadedCount += count;
    if (this._totalCount != null) {
      this._hasMore = this._loadedCount < this._totalCount;
    }
  }

  destroy() {
    this._loading = false;
  }
}
