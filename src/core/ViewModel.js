/**
 * ViewModel - Virtual Scroll 범위 계산 및 뷰 상태 관리
 *
 * 역할:
 * - 스크롤 위치 → 렌더링 범위(startIndex~endIndex) 계산
 * - row height 고정/가변 모두 지원
 * - 컬럼 가상화 범위 계산 (horizontal virtual scroll)
 * - overscan 버퍼로 스크롤 시 공백 방지
 *
 * 수직 가상화 흐름:
 *   scrollTop → startIndex = floor(scrollTop / rowHeight)
 *   visibleCount = ceil(viewportHeight / rowHeight)
 *   endIndex = startIndex + visibleCount + overscanBottom
 *   offsetY = startIndex * rowHeight (spacer 높이)
 *   totalHeight = totalCount * rowHeight (스크롤 컨테이너 높이)
 */
export class ViewModel {
  /**
   * @param {Object} options
   * @param {number} [options.rowHeight=36] - 기본 행 높이 (px)
   * @param {number} [options.overscanTop=3] - 위쪽 버퍼 행 수
   * @param {number} [options.overscanBottom=5] - 아래쪽 버퍼 행 수
   * @param {boolean} [options.variableRowHeight=false] - 가변 높이 모드
   */
  constructor(options = {}) {
    this._rowHeight = options.rowHeight ?? 36;
    this._overscanTop = options.overscanTop ?? 3;
    this._overscanBottom = options.overscanBottom ?? 5;
    this._variableRowHeight = options.variableRowHeight ?? false;

    // 뷰포트 크기 (ResizeObserver로 업데이트)
    this._viewportHeight = 400;
    this._viewportWidth = 800;

    // 스크롤 위치
    this._scrollTop = 0;
    this._scrollLeft = 0;

    // 총 행 수
    this._totalCount = 0;

    // 가변 높이 모드: rowKey -> height 캐시
    this._rowHeights = new Map();
    /** @type {number[]} 누적 offset 배열 (가변 높이 모드) */
    this._cumulativeHeights = [];

    // 컬럼 가상화
    this._columnWidths = [];
    this._columnCount = 0;

    // 계산된 범위 캐시
    this._cachedVerticalRange = null;
    this._cachedHorizontalRange = null;
  }

  // ─── 설정 업데이트 ─────────────────────────────────────────

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

  /** 가변 높이 모드에서 특정 행의 높이 설정 */
  setRowHeightAt(index, height) {
    // 가변 높이는 향후 확장용 - MVP에서는 고정 높이 사용
    this._rowHeights.set(index, height);
    this._rebuildCumulativeHeights();
    this._invalidateCache();
  }

  setColumnWidths(widths) {
    this._columnWidths = widths;
    this._columnCount = widths.length;
    this._cachedHorizontalRange = null;
  }

  // ─── 수직 범위 계산 ────────────────────────────────────────

  /**
   * @returns {{
   *   startIndex: number,
   *   endIndex: number,
   *   offsetY: number,
   *   totalHeight: number,
   *   visibleCount: number
   * }}
   */
  getVerticalRange() {
    if (this._cachedVerticalRange) return this._cachedVerticalRange;

    if (this._variableRowHeight) {
      this._cachedVerticalRange = this._calcVariableVerticalRange();
    } else {
      this._cachedVerticalRange = this._calcFixedVerticalRange();
    }
    return this._cachedVerticalRange;
  }

  _calcFixedVerticalRange() {
    const rh = this._rowHeight;
    const total = this._totalCount;

    if (total === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0, visibleCount: 0 };
    }

    const rawStart = Math.floor(this._scrollTop / rh);
    const visibleCount = Math.ceil(this._viewportHeight / rh);

    const startIndex = Math.max(0, rawStart - this._overscanTop);
    const endIndex = Math.min(total - 1, rawStart + visibleCount + this._overscanBottom);
    const offsetY = startIndex * rh;
    const totalHeight = total * rh;

    return { startIndex, endIndex, offsetY, totalHeight, visibleCount };
  }

  _calcVariableVerticalRange() {
    // 가변 높이: 이진 탐색으로 startIndex 찾기
    const total = this._totalCount;
    if (total === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0, visibleCount: 0 };
    }

    const cumHeights = this._getCumulativeHeights();
    const totalHeight = cumHeights[total] ?? total * this._rowHeight;

    // 이진 탐색
    const rawStart = this._binarySearch(cumHeights, this._scrollTop);
    const visibleBottom = this._scrollTop + this._viewportHeight;
    const rawEnd = this._binarySearch(cumHeights, visibleBottom);

    const startIndex = Math.max(0, rawStart - this._overscanTop);
    const endIndex = Math.min(total - 1, rawEnd + this._overscanBottom);
    const offsetY = cumHeights[startIndex] ?? startIndex * this._rowHeight;

    return { startIndex, endIndex, offsetY, totalHeight, visibleCount: rawEnd - rawStart + 1 };
  }

  _getCumulativeHeights() {
    if (this._cumulativeHeights.length === this._totalCount + 1) {
      return this._cumulativeHeights;
    }
    this._rebuildCumulativeHeights();
    return this._cumulativeHeights;
  }

  _rebuildCumulativeHeights() {
    const cum = [0];
    for (let i = 0; i < this._totalCount; i++) {
      const h = this._rowHeights.get(i) ?? this._rowHeight;
      cum.push(cum[i] + h);
    }
    this._cumulativeHeights = cum;
  }

  _binarySearch(arr, target) {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - 1);
  }

  // ─── 수평 범위 계산 (컬럼 가상화) ─────────────────────────

  /**
   * @returns {{
   *   startColIndex: number,
   *   endColIndex: number,
   *   offsetX: number,
   *   totalWidth: number
   * }}
   */
  getHorizontalRange() {
    if (this._cachedHorizontalRange) return this._cachedHorizontalRange;

    if (this._columnCount === 0) {
      return { startColIndex: 0, endColIndex: 0, offsetX: 0, totalWidth: 0 };
    }

    let cumWidth = 0;
    let startColIndex = 0;
    let endColIndex = this._columnCount - 1;
    const colCumWidths = [0];

    for (let i = 0; i < this._columnWidths.length; i++) {
      cumWidth += this._columnWidths[i];
      colCumWidths.push(cumWidth);
    }

    const totalWidth = cumWidth;
    const scrollRight = this._scrollLeft + this._viewportWidth;

    // startColIndex: scrollLeft보다 큰 첫 컬럼
    for (let i = 0; i < colCumWidths.length - 1; i++) {
      if (colCumWidths[i + 1] > this._scrollLeft) {
        startColIndex = i;
        break;
      }
    }

    // endColIndex: scrollRight를 포함하는 마지막 컬럼
    for (let i = colCumWidths.length - 1; i >= 0; i--) {
      if (colCumWidths[i] <= scrollRight) {
        endColIndex = Math.min(i, this._columnCount - 1);
        break;
      }
    }

    const offsetX = colCumWidths[startColIndex];

    this._cachedHorizontalRange = { startColIndex, endColIndex, offsetX, totalWidth };
    return this._cachedHorizontalRange;
  }

  // ─── 스크롤 목표 계산 ─────────────────────────────────────

  /**
   * 특정 flatIndex의 행으로 스크롤하기 위한 scrollTop 계산
   */
  getScrollTopForRow(flatIndex) {
    if (this._variableRowHeight) {
      const cum = this._getCumulativeHeights();
      return cum[flatIndex] ?? flatIndex * this._rowHeight;
    }
    return flatIndex * this._rowHeight;
  }

  // ─── 조회 ──────────────────────────────────────────────────

  getScrollTop() { return this._scrollTop; }
  getScrollLeft() { return this._scrollLeft; }
  getViewportHeight() { return this._viewportHeight; }
  getViewportWidth() { return this._viewportWidth; }
  getRowHeight() { return this._rowHeight; }

  /** 현재 뷰포트에 완전히 보이는 행 수 */
  getVisibleRowCount() {
    return Math.floor(this._viewportHeight / this._rowHeight);
  }

  /** 사용자가 맨 아래에 스크롤했는지 */
  isAtBottom(threshold = 50) {
    const { totalHeight } = this.getVerticalRange();
    return totalHeight - this._scrollTop - this._viewportHeight <= threshold;
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
