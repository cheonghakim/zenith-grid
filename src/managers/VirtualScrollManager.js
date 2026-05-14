export class VirtualScrollManager {
  constructor(viewModel, options = {}) {
    this._viewModel = viewModel;
    this._autoScroll = options.autoScroll ?? false;
    this._autoScrollThreshold = options.autoScrollThreshold ?? 100;
    this._onScrollChanged = options.onScrollChanged ?? (() => {});
    this._onRangeChanged = options.onRangeChanged ?? (() => {});

    this._bodyViewport = null;
    this._headerCenterViewport = null;
    this._resizeObserver = null;

    this._userScrolling = false;
    this._userScrollTimer = null;

    this._rafId = null;
    this._pendingScroll = false;

    this._handleBodyScroll = this._handleBodyScroll.bind(this);
    this._handleResize = this._handleResize.bind(this);
  }

  mount(bodyViewport, headerCenterViewport) {
    this._bodyViewport = bodyViewport;
    this._headerCenterViewport = headerCenterViewport;

    bodyViewport.addEventListener('scroll', this._handleBodyScroll, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(this._handleResize);
      this._resizeObserver.observe(bodyViewport);
    }

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

  _handleBodyScroll() {
    if (!this._bodyViewport) return;

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

    if (this._headerCenterViewport && this._headerCenterViewport.scrollLeft !== scrollLeft) {
      this._headerCenterViewport.scrollLeft = scrollLeft;
    }

    const prevVertical = this._viewModel.getVerticalRange();
    const prevHorizontal = this._viewModel.getHorizontalRange();

    this._viewModel.setScrollPosition(scrollTop, scrollLeft);

    const nextVertical = this._viewModel.getVerticalRange();
    const nextHorizontal = this._viewModel.getHorizontalRange();

    this._onScrollChanged({ scrollTop, scrollLeft });

    const verticalChanged =
      prevVertical.startIndex !== nextVertical.startIndex ||
      prevVertical.endIndex !== nextVertical.endIndex;
    const horizontalChanged =
      prevHorizontal.startColIndex !== nextHorizontal.startColIndex ||
      prevHorizontal.endColIndex !== nextHorizontal.endColIndex;

    if (verticalChanged || horizontalChanged) {
      this._onRangeChanged({
        vertical: nextVertical,
        horizontal: nextHorizontal,
      });
    }
  }

  _handleResize() {
    this._updateViewportSize();
  }

  _updateViewportSize() {
    if (!this._bodyViewport) return;

    const { clientWidth, clientHeight } = this._bodyViewport;
    const prevVertical = this._viewModel.getVerticalRange();
    const prevHorizontal = this._viewModel.getHorizontalRange();

    this._viewModel.setViewportSize(clientWidth, clientHeight);

    const nextVertical = this._viewModel.getVerticalRange();
    const nextHorizontal = this._viewModel.getHorizontalRange();

    const verticalChanged =
      prevVertical.startIndex !== nextVertical.startIndex ||
      prevVertical.endIndex !== nextVertical.endIndex;
    const horizontalChanged =
      prevHorizontal.startColIndex !== nextHorizontal.startColIndex ||
      prevHorizontal.endColIndex !== nextHorizontal.endColIndex;

    if (verticalChanged || horizontalChanged) {
      this._onRangeChanged({
        vertical: nextVertical,
        horizontal: nextHorizontal,
      });
    }
  }

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

  setAutoScroll(enabled) {
    this._autoScroll = enabled;
  }

  maybeAutoScrollToBottom() {
    if (!this._autoScroll) return;
    if (this._userScrolling) return;
    const isNearBottom = this._viewModel.isAtBottom(this._autoScrollThreshold);
    if (isNearBottom) {
      this.scrollToBottom();
    }
  }

  isUserScrolling() {
    return this._userScrolling;
  }

  destroy() {
    this.unmount();
  }
}
