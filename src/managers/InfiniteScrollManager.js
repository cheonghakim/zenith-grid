export class InfiniteScrollManager {
  constructor(options = {}) {
    this._initialLoadSize = options.initialLoadSize ?? 50;
    this._loadMoreSize = options.loadMoreSize ?? 50;
    this._scrollThreshold = options.scrollThreshold ?? 200;
    this._onLoadMore = options.onLoadMore ?? null;
    this._onChanged = options.onChanged ?? (() => {});
    this._mode = options.mode ?? 'client';

    this._loadedCount = 0;
    this._totalCount = null;
    this._hasMore = true;
    this._loading = false;
    this._cursor = null;
    this._error = null;
    this._requestToken = 0;
  }

  getState() {
    return {
      loadedCount: this._loadedCount,
      totalCount: this._totalCount,
      hasMore: this._hasMore,
      loading: this._loading,
      cursor: this._cursor,
      error: this._error,
      mode: this._mode,
    };
  }

  getMode() {
    return this._mode;
  }

  setMode(mode) {
    if (mode !== 'client' && mode !== 'server') {
      return;
    }
    if (this._mode === mode) {
      return;
    }
    this._mode = mode;
    this._onChanged(this.getState());
  }

  setLoadedCount(count) {
    this._loadedCount = count;
  }

  getInitialLoadSize() {
    return this._initialLoadSize;
  }

  setTotalCount(count) {
    this._totalCount = count;
    this._hasMore = this._loadedCount < count;
  }

  async maybeLoadMore(viewModel) {
    if (!this._hasMore || this._loading || !this._onLoadMore) {
      return;
    }

    const { totalHeight } = viewModel.getVerticalRange();
    const scrollBottom = viewModel.getScrollTop() + viewModel.getViewportHeight();
    const distanceFromBottom = totalHeight - scrollBottom;

    if (distanceFromBottom > this._scrollThreshold) {
      return;
    }

    await this.loadMore();
  }

  async loadMore() {
    if (!this._hasMore || this._loading || !this._onLoadMore) {
      return;
    }

    const requestToken = ++this._requestToken;
    this._loading = true;
    this._error = null;
    this._onChanged({ action: 'loadingStart' });

    try {
      const result = await this._onLoadMore({
        offset: this._loadedCount,
        cursor: this._cursor,
        loadSize: this._loadMoreSize,
      });
      if (requestToken !== this._requestToken) {
        return;
      }

      this._cursor = result.cursor ?? null;
      this._hasMore = result.hasMore ?? (result.rows?.length === this._loadMoreSize);

      if (result.totalCount != null) {
        this._totalCount = result.totalCount;
      }

      this._loading = false;
      this._onChanged({
        action: 'loadingComplete',
        rows: result.rows,
        hasMore: this._hasMore,
        totalCount: this._totalCount,
      });
    } catch (error) {
      if (requestToken !== this._requestToken) {
        return;
      }
      this._loading = false;
      this._error = error.message;
      this._onChanged({ action: 'loadingError', error: error.message });
      console.error('[InfiniteScrollManager] loadMore failed:', error);
    }
  }

  reset() {
    this._requestToken += 1;
    this._loadedCount = 0;
    this._totalCount = null;
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
