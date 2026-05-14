/**
 * VirtualScrollManager - 스크롤 이벤트 처리 및 DOM 스크롤 동기화
 *
 * ViewModel이 순수한 계산을 담당하고,
 * VirtualScrollManager는 DOM 이벤트와 ViewModel을 연결.
 *
 * 핵심 구조 (column pinning과 함께):
 * ┌─────────────────────────────────────────────┐
 * │  Left Pinned  │  Center (scrollable)  │ Right │
 * │  (고정, 세로스크롤만) │ (가로+세로 스크롤)  │ (고정) │
 * └─────────────────────────────────────────────┘
 *
 * 스크롤 동기화:
 * - 가로: center viewport의 scrollLeft를 header center에 동기화
 * - 세로: body viewport의 scrollTop을 ViewModel에 전달
 *
 * auto scroll (live mode):
 * - 사용자가 맨 아래 근처에 있을 때만 자동 스크롤
 * - 사용자가 위로 스크롤 중이면 일시 중지
 */
export class VirtualScrollManager {
  /**
   * @param {import('../core/ViewModel.js').ViewModel} viewModel
   * @param {Object} options
   * @param {boolean} [options.autoScroll=false] - live mode auto scroll
   * @param {number} [options.autoScrollThreshold=100] - px from bottom
   * @param {Function} [options.onScrollChanged]
   * @param {Function} [options.onRangeChanged]
   */
  constructor(viewModel, options = {}) {
    this._viewModel = viewModel;
    this._autoScroll = options.autoScroll ?? false;
    this._autoScrollThreshold = options.autoScrollThreshold ?? 100;
    this._onScrollChanged = options.onScrollChanged ?? (() => {});
    this._onRangeChanged = options.onRangeChanged ?? (() => {});

    // DOM 참조
    this._bodyViewport = null;
    this._headerCenterViewport = null;
    this._resizeObserver = null;

    // 스크롤 상태
    this._userScrolling = false;
    this._userScrollTimer = null;

    // RAF 최적화
    this._rafId = null;
    this._pendingScroll = false;

    // 이벤트 핸들러 바인딩
    this._handleBodyScroll = this._handleBodyScroll.bind(this);
    this._handleResize = this._handleResize.bind(this);
  }

  // ─── DOM 연결 ──────────────────────────────────────────────

  /**
   * @param {HTMLElement} bodyViewport - 세로+가로 스크롤 컨테이너
   * @param {HTMLElement} headerCenterViewport - 가로 스크롤 동기화 대상
   */
  mount(bodyViewport, headerCenterViewport) {
    this._bodyViewport = bodyViewport;
    this._headerCenterViewport = headerCenterViewport;

    bodyViewport.addEventListener('scroll', this._handleBodyScroll, { passive: true });

    // ResizeObserver로 뷰포트 크기 변경 감지
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(this._handleResize);
      this._resizeObserver.observe(bodyViewport);
    }

    // 초기 크기 설정
    this._updateViewportSize();
  }

  unmount() {
    if (this._bodyViewport) {
      this._bodyViewport.removeEventListener('scroll', this._handleBodyScroll);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    clearTimeout(this._userScrollTimer);
  }

  // ─── 스크롤 이벤트 처리 ────────────────────────────────────

  _handleBodyScroll() {
    if (!this._bodyViewport) return;

    // 사용자 스크롤 감지 (auto scroll 일시 중지용)
    this._userScrolling = true;
    clearTimeout(this._userScrollTimer);
    this._userScrollTimer = setTimeout(() => {
      this._userScrolling = false;
    }, 150);

    if (!this._pendingScroll) {
      this._pendingScroll = true;
      this._rafId = requestAnimationFrame(() => {
        this._processScroll();
        this._pendingScroll = false;
      });
    }
  }

  _processScroll() {
    if (!this._bodyViewport) return;

    const { scrollTop, scrollLeft } = this._bodyViewport;

    // 가로 스크롤 헤더 동기화
    if (this._headerCenterViewport && this._headerCenterViewport.scrollLeft !== scrollLeft) {
      this._headerCenterViewport.scrollLeft = scrollLeft;
    }

    const prevRange = this._viewModel.getVerticalRange();
    this._viewModel.setScrollPosition(scrollTop, scrollLeft);
    const newRange = this._viewModel.getVerticalRange();

    this._onScrollChanged({ scrollTop, scrollLeft });

    // 범위가 변경된 경우에만 rerender 트리거
    if (prevRange.startIndex !== newRange.startIndex || prevRange.endIndex !== newRange.endIndex) {
      this._onRangeChanged(newRange);
    }
  }

  _handleResize(entries) {
    this._updateViewportSize();
  }

  _updateViewportSize() {
    if (!this._bodyViewport) return;
    const { clientWidth, clientHeight } = this._bodyViewport;
    const prevRange = this._viewModel.getVerticalRange();
    this._viewModel.setViewportSize(clientWidth, clientHeight);
    const newRange = this._viewModel.getVerticalRange();

    if (prevRange.startIndex !== newRange.startIndex || prevRange.endIndex !== newRange.endIndex) {
      this._onRangeChanged(newRange);
    }
  }

  // ─── 프로그래매틱 스크롤 ──────────────────────────────────

  scrollToRow(flatIndex, options = { behavior: 'smooth' }) {
    if (!this._bodyViewport) return;

    const scrollTop = this._viewModel.getScrollTopForRow(flatIndex);
    this._bodyViewport.scrollTo({ top: scrollTop, behavior: options.behavior ?? 'smooth' });
  }

  scrollToTop() {
    if (!this._bodyViewport) return;
    this._bodyViewport.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToBottom() {
    if (!this._bodyViewport) return;
    const { totalHeight } = this._viewModel.getVerticalRange();
    this._bodyViewport.scrollTo({ top: totalHeight, behavior: 'smooth' });
  }

  // ─── Auto Scroll (Live Mode) ──────────────────────────────

  setAutoScroll(enabled) {
    this._autoScroll = enabled;
  }

  /**
   * live mode에서 새 row 추가 시 호출.
   * 사용자가 아래쪽 근처에 있을 때만 자동 스크롤.
   */
  maybeAutoScrollToBottom() {
    if (!this._autoScroll) return;
    if (this._userScrolling) return; // 사용자 스크롤 중이면 방해 안 함

    const isNearBottom = this._viewModel.isAtBottom(this._autoScrollThreshold);
    if (isNearBottom) {
      this.scrollToBottom();
    }
  }

  // ─── 조회 ──────────────────────────────────────────────────

  isUserScrolling() {
    return this._userScrolling;
  }

  destroy() {
    this.unmount();
  }
}
