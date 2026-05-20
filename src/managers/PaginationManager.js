export class PaginationManager {
  constructor(options = {}) {
    this._pageSize = options.pageSize ?? 20;
    this._page = options.page ?? 0;
    this._totalCount = options.totalCount ?? 0;
    this._mode = options.mode ?? 'client';
    this._onPageChange = options.onPageChange ?? null;
    this._onChanged = options.onChanged ?? (() => {});
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

  setPage(page) {
    const totalPages = this.getTotalPages();
    const clamped = Math.max(0, Math.min(page, totalPages - 1));

    if (this._page === clamped) {
      return;
    }

    const previousPage = this._page;
    this._page = clamped;

    if (this._onPageChange) {
      this._onPageChange({
        page: clamped,
        pageSize: this._pageSize,
        prevPage: previousPage,
      });
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
    if (size < 1) {
      return;
    }

    const previousSize = this._pageSize;
    this._pageSize = size;
    const firstVisibleIndex = this._page * previousSize;
    this._page = Math.floor(firstVisibleIndex / size);

    if (this._onPageChange) {
      this._onPageChange({
        page: this._page,
        pageSize: this._pageSize,
        prevPage: this._page,
        prevPageSize: previousSize,
      });
    }

    this._onChanged(this.getState());
  }

  setTotalCount(count, options = {}) {
    const previousTotalCount = this._totalCount;
    const previousPage = this._page;

    this._totalCount = count;

    const totalPages = this.getTotalPages();
    if (this._page >= totalPages && totalPages > 0) {
      this._page = totalPages - 1;
    }

    if (options.silent) {
      return;
    }

    if (previousTotalCount === this._totalCount && previousPage === this._page) {
      return;
    }

    this._onChanged(this.getState());
  }

  incrementTotalCount(delta = 1) {
    this._totalCount += delta;
    this._onChanged(this.getState());
  }

  getTotalPages() {
    if (this._totalCount === 0) {
      return 1;
    }
    return Math.ceil(this._totalCount / this._pageSize);
  }

  getSliceRange() {
    const start = this._page * this._pageSize;
    const end = start + this._pageSize;
    return { start, end };
  }

  getState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalCount: this._totalCount,
      totalPages: this.getTotalPages(),
      isFirst: this._page === 0,
      isLast: this._page >= this.getTotalPages() - 1,
      startRow: this._totalCount === 0 ? 0 : this._page * this._pageSize + 1,
      endRow: Math.min((this._page + 1) * this._pageSize, this._totalCount),
      mode: this._mode,
    };
  }

  serializeState() {
    return { page: this._page, pageSize: this._pageSize };
  }

  applySerializedState(state) {
    if (state.pageSize != null) {
      this._pageSize = state.pageSize;
    }
    if (state.page != null) {
      this._page = state.page;
    }
  }

  reset() {
    this._page = 0;
  }

  destroy() {
    this._page = 0;
  }
}
