export class ViewModel {
  constructor(options = {}) {
    this._rowHeight = options.rowHeight ?? 36;
    this._overscanTop = options.overscanTop ?? 3;
    this._overscanBottom = options.overscanBottom ?? 5;
    this._horizontalOverscan = options.horizontalOverscan ?? 1;
    this._variableRowHeight = options.variableRowHeight ?? false;

    this._viewportHeight = 400;
    this._viewportWidth = 800;
    this._scrollTop = 0;
    this._scrollLeft = 0;
    this._totalCount = 0;

    this._rowHeights = new Map();
    this._cumulativeHeights = [];

    this._columnWidths = [];
    this._columnCount = 0;

    this._cachedVerticalRange = null;
    this._cachedHorizontalRange = null;
  }

  setViewportSize(width, height) {
    if (this._viewportWidth !== width || this._viewportHeight !== height) {
      this._viewportWidth = width;
      this._viewportHeight = height;
      this._invalidateCache();
    }
  }

  setScrollPosition(scrollTop, scrollLeft) {
    const topChanged = this._scrollTop !== scrollTop;
    const leftChanged = this._scrollLeft !== scrollLeft;
    this._scrollTop = scrollTop;
    this._scrollLeft = scrollLeft;
    if (topChanged) this._cachedVerticalRange = null;
    if (leftChanged) this._cachedHorizontalRange = null;
  }

  setTotalCount(count) {
    if (this._totalCount !== count) {
      this._totalCount = count;
      this._invalidateCache();
    }
  }

  setRowHeight(height) {
    this._rowHeight = height;
    this._invalidateCache();
  }

  setRowHeightAt(index, height) {
    const normalizedHeight = Math.max(1, Math.ceil(height));
    const previousHeight = this._rowHeights.get(index);
    if (previousHeight === normalizedHeight) {
      return false;
    }
    this._rowHeights.set(index, normalizedHeight);
    this._rebuildCumulativeHeights();
    this._invalidateCache();
    return true;
  }

  setColumnWidths(widths) {
    this._columnWidths = widths;
    this._columnCount = widths.length;
    this._cachedHorizontalRange = null;
  }

  setVariableRowHeight(enabled) {
    if (this._variableRowHeight !== enabled) {
      this._variableRowHeight = enabled;
      this._invalidateCache();
    }
  }

  clearMeasuredRowHeights() {
    this._rowHeights.clear();
    this._cumulativeHeights = [];
    this._invalidateCache();
  }

  getVerticalRange() {
    if (this._cachedVerticalRange) {
      return this._cachedVerticalRange;
    }

    this._cachedVerticalRange = this._variableRowHeight
      ? this._calcVariableVerticalRange()
      : this._calcFixedVerticalRange();

    return this._cachedVerticalRange;
  }

  _calcFixedVerticalRange() {
    const rowHeight = this._rowHeight;
    const total = this._totalCount;

    if (total === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0, visibleCount: 0 };
    }

    const rawStart = Math.floor(this._scrollTop / rowHeight);
    const visibleCount = Math.ceil(this._viewportHeight / rowHeight);
    const startIndex = Math.max(0, rawStart - this._overscanTop);
    const endIndex = Math.min(total - 1, rawStart + visibleCount + this._overscanBottom);
    const offsetY = startIndex * rowHeight;
    const totalHeight = total * rowHeight;

    return { startIndex, endIndex, offsetY, totalHeight, visibleCount };
  }

  _calcVariableVerticalRange() {
    const total = this._totalCount;
    if (total === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0, visibleCount: 0 };
    }

    const cumulativeHeights = this._getCumulativeHeights();
    const totalHeight = cumulativeHeights[total] ?? total * this._rowHeight;
    const rawStart = this._binarySearch(cumulativeHeights, this._scrollTop);
    const visibleBottom = this._scrollTop + this._viewportHeight;
    const rawEnd = this._binarySearch(cumulativeHeights, visibleBottom);

    const startIndex = Math.max(0, rawStart - this._overscanTop);
    const endIndex = Math.min(total - 1, rawEnd + this._overscanBottom);
    const offsetY = cumulativeHeights[startIndex] ?? startIndex * this._rowHeight;

    return {
      startIndex,
      endIndex,
      offsetY,
      totalHeight,
      visibleCount: rawEnd - rawStart + 1,
    };
  }

  _getCumulativeHeights() {
    if (this._cumulativeHeights.length === this._totalCount + 1) {
      return this._cumulativeHeights;
    }
    this._rebuildCumulativeHeights();
    return this._cumulativeHeights;
  }

  _rebuildCumulativeHeights() {
    const cumulative = [0];
    for (let index = 0; index < this._totalCount; index += 1) {
      const height = this._rowHeights.get(index) ?? this._rowHeight;
      cumulative.push(cumulative[index] + height);
    }
    this._cumulativeHeights = cumulative;
  }

  _binarySearch(values, target) {
    let low = 0;
    let high = values.length - 1;

    while (low < high) {
      const mid = (low + high) >> 1;
      if (values[mid] < target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return Math.max(0, low - 1);
  }

  getHorizontalRange() {
    if (this._cachedHorizontalRange) {
      return this._cachedHorizontalRange;
    }

    if (this._columnCount === 0) {
      return { startColIndex: 0, endColIndex: 0, offsetX: 0, totalWidth: 0 };
    }

    let cumulativeWidth = 0;
    let startColIndex = 0;
    let endColIndex = this._columnCount - 1;
    const cumulativeWidths = [0];

    for (let index = 0; index < this._columnWidths.length; index += 1) {
      cumulativeWidth += this._columnWidths[index];
      cumulativeWidths.push(cumulativeWidth);
    }

    const totalWidth = cumulativeWidth;
    const scrollRight = this._scrollLeft + this._viewportWidth;

    for (let index = 0; index < cumulativeWidths.length - 1; index += 1) {
      if (cumulativeWidths[index + 1] > this._scrollLeft) {
        startColIndex = index;
        break;
      }
    }

    for (let index = cumulativeWidths.length - 1; index >= 0; index -= 1) {
      if (cumulativeWidths[index] <= scrollRight) {
        endColIndex = Math.min(index, this._columnCount - 1);
        break;
      }
    }

    const overscannedStart = Math.max(0, startColIndex - this._horizontalOverscan);
    const overscannedEnd = Math.min(this._columnCount - 1, endColIndex + this._horizontalOverscan);

    this._cachedHorizontalRange = {
      startColIndex: overscannedStart,
      endColIndex: overscannedEnd,
      offsetX: cumulativeWidths[overscannedStart],
      totalWidth,
    };

    return this._cachedHorizontalRange;
  }

  getScrollTopForRow(flatIndex) {
    if (this._variableRowHeight) {
      const cumulativeHeights = this._getCumulativeHeights();
      return cumulativeHeights[flatIndex] ?? flatIndex * this._rowHeight;
    }
    return flatIndex * this._rowHeight;
  }

  getScrollTop() {
    return this._scrollTop;
  }

  getScrollLeft() {
    return this._scrollLeft;
  }

  getViewportHeight() {
    return this._viewportHeight;
  }

  getViewportWidth() {
    return this._viewportWidth;
  }

  getRowHeight() {
    return this._rowHeight;
  }

  isVariableRowHeight() {
    return this._variableRowHeight;
  }

  getVisibleRowCount() {
    return Math.floor(this._viewportHeight / this._rowHeight);
  }

  isAtBottom(threshold = 50) {
    const { totalHeight } = this.getVerticalRange();
    return totalHeight - this._scrollTop - this._viewportHeight <= threshold;
  }

  getHeightBeforeIndex(index) {
    const safeIndex = Math.max(0, index);
    if (!this._variableRowHeight) {
      return safeIndex * this._rowHeight;
    }

    const cumulativeHeights = this._getCumulativeHeights();
    return cumulativeHeights[safeIndex] ?? safeIndex * this._rowHeight;
  }

  _invalidateCache() {
    this._cachedVerticalRange = null;
    this._cachedHorizontalRange = null;
  }

  destroy() {
    this._rowHeights.clear();
    this._cumulativeHeights = [];
    this._columnWidths = [];
    this._invalidateCache();
  }
}
