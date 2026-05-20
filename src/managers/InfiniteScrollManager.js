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
    if (!this._hasMore || this._loading) return;

    const { totalHeight } = viewModel.getVerticalRange();
    const scrollBottom = viewModel.getScrollTop() + viewModel.getViewportHeight();
    if (totalHeight - scrollBottom > this._scrollThreshold) return;

    if (this._mode === 'server') {
      if (!this._onLoadMore) return;
      await this.loadMore();
    } else {
      this._loadClientMore();
    }
  }

  _loadClientMore() {
    if (!this._hasMore || this._loading) return;
    const nextCount = this._loadedCount + this._loadMoreSize;
    this._loadedCount = this._totalCount != null
      ? Math.min(nextCount, this._totalCount)
      : nextCount;
    if (this._totalCount != null) {
      this._hasMore = this._loadedCount < this._totalCount;
    }
    this._onChanged({ action: 'clientLoadMore' });
  }

  async loadMore() {
    if (!this._hasMore || this._loading) return;

    if (this._mode !== 'server') {
      this._loadClientMore();
      return;
    }

    if (!this._onLoadMore) {
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
