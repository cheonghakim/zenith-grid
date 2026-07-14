export class DOMRenderer {
  constructor(container, options = {}) {
    this._container = container;
    this._options = options;
    this._els = {};
    this._built = false;
    this._overlayActionHandler = null;
  }

  build() {
    if (this._built) return;

    this._container.classList.add('zenith-grid', 'ck-zenith-grid-root');
    this._container.setAttribute('role', 'grid');
    this._container.setAttribute('aria-rowcount', '0');
    this._container.setAttribute('aria-colcount', '0');
    this._container.setAttribute('aria-busy', 'false');
    this._container.innerHTML = '';

    const header = this._createElement('div', 'ck-zenith-grid-header');
    header.setAttribute('role', 'rowgroup');
    const headerLeft = this._createElement('div', 'ck-zenith-grid-header-left-pinned');
    const headerCenterViewport = this._createElement('div', 'ck-zenith-grid-header-center-viewport');
    const headerCenterContainer = this._createElement('div', 'ck-zenith-grid-header-center-container');
    const headerRight = this._createElement('div', 'ck-zenith-grid-header-right-pinned');

    headerCenterViewport.appendChild(headerCenterContainer);
    header.appendChild(headerLeft);
    header.appendChild(headerCenterViewport);
    header.appendChild(headerRight);

    const bodyViewport = this._createElement('div', 'ck-zenith-grid-body-viewport');
    bodyViewport.setAttribute('role', 'presentation');

    const pinnedTopRows = this._createElement('div', 'ck-zenith-grid-pinned-top-rows');
    pinnedTopRows.setAttribute('role', 'rowgroup');
    pinnedTopRows.style.display = 'none';

    const body = this._createElement('div', 'ck-zenith-grid-body');
    body.setAttribute('role', 'rowgroup');
    const bodyLeft = this._createElement('div', 'ck-zenith-grid-body-left-pinned');
    const bodyCenterViewport = this._createElement('div', 'ck-zenith-grid-body-center-viewport');
    const bodyCenterContainer = this._createElement('div', 'ck-zenith-grid-body-center-container');
    const spacerTop = this._createElement('div', 'ck-zenith-grid-virtual-spacer-top');
    const rows = this._createElement('div', 'ck-zenith-grid-rows');
    rows.setAttribute('role', 'presentation');
    const spacerBottom = this._createElement('div', 'ck-zenith-grid-virtual-spacer-bottom');
    const bodyRight = this._createElement('div', 'ck-zenith-grid-body-right-pinned');

    const pinnedBottomRows = this._createElement('div', 'ck-zenith-grid-pinned-bottom-rows');
    pinnedBottomRows.setAttribute('role', 'rowgroup');
    pinnedBottomRows.style.display = 'none';

    bodyCenterContainer.appendChild(spacerTop);
    bodyCenterContainer.appendChild(rows);
    bodyCenterContainer.appendChild(spacerBottom);
    bodyCenterViewport.appendChild(bodyCenterContainer);

    body.appendChild(bodyLeft);
    body.appendChild(bodyCenterViewport);
    body.appendChild(bodyRight);
    bodyViewport.appendChild(pinnedTopRows);
    bodyViewport.appendChild(body);
    bodyViewport.appendChild(pinnedBottomRows);

    const infiniteLoader = this._createElement('div', 'ck-zenith-grid-infinite-loader');
    infiniteLoader.style.display = 'none';
    const infiniteSpinner = this._createElement('span', 'ck-zenith-grid-infinite-loader-spinner');
    const infiniteLabel = this._createElement('span', 'ck-zenith-grid-infinite-loader-label');
    infiniteLabel.textContent = this._getLocaleText('grid.loading.infiniteSpinner', 'Loading more rows');
    infiniteLoader.appendChild(infiniteSpinner);
    infiniteLoader.appendChild(infiniteLabel);
    bodyViewport.appendChild(infiniteLoader);

    const footer = this._createElement('div', 'ck-zenith-grid-footer');
    const statusBar = this._createElement('div', 'ck-zenith-grid-status-bar-host');
    statusBar.style.display = 'none';
    const overlay = this._createElement('div', 'ck-zenith-grid-overlay');
    overlay.style.display = 'none';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    const overlayCard = this._createElement('div', 'ck-zenith-grid-overlay-card');
    const overlayTitle = this._createElement('strong', 'ck-zenith-grid-overlay-title');
    const overlayMessage = this._createElement('p', 'ck-zenith-grid-overlay-message');
    const overlayCustom = this._createElement('div', 'ck-zenith-grid-overlay-custom');
    overlayCustom.style.display = 'none';
    const overlayAction = this._createElement('button', 'ck-zenith-grid-overlay-action');
    overlayAction.type = 'button';
    overlayAction.style.display = 'none';
    const overlaySkeleton = this._createElement('div', 'ck-zenith-grid-overlay-skeleton');
    overlaySkeleton.style.display = 'none';
    for (let index = 0; index < 5; index += 1) {
      const line = this._createElement('span', 'ck-zenith-grid-overlay-skeleton-line');
      overlaySkeleton.appendChild(line);
    }
    overlayCard.appendChild(overlayTitle);
    overlayCard.appendChild(overlayMessage);
    overlayCard.appendChild(overlayCustom);
    overlayCard.appendChild(overlaySkeleton);
    overlayCard.appendChild(overlayAction);
    overlay.appendChild(overlayCard);
    const banner = this._createElement('div', 'ck-zenith-grid-live-banner');
    banner.style.display = 'none';
    const sidePanel = this._createElement('div', 'ck-zenith-grid-side-panel-host');

    bodyViewport.appendChild(overlay);

    this._container.appendChild(banner);
    this._container.appendChild(header);
    this._container.appendChild(bodyViewport);
    this._container.appendChild(footer);
    this._container.appendChild(statusBar);
    this._container.appendChild(sidePanel);

    this._els = {
      header,
      headerLeft,
      headerCenterViewport,
      headerCenterContainer,
      headerRight,
      bodyViewport,
      pinnedTopRows,
      body,
      bodyLeft,
      bodyCenterViewport,
      bodyCenterContainer,
      rows,
      bodyRight,
      pinnedBottomRows,
      infiniteLoader,
      spacerTop,
      spacerBottom,
      overlay,
      overlayCard,
      overlayTitle,
      overlayMessage,
      overlayCustom,
      overlayAction,
      overlaySkeleton,
      banner,
      footer,
      statusBar,
      sidePanel,
    };

    this._built = true;
  }

  updateVirtualSpace({ topHeight = 0, bottomHeight = 0, totalHeight = 0 }) {
    this._els.spacerTop.style.height = `${Math.max(0, topHeight)}px`;
    this._els.spacerBottom.style.height = `${Math.max(0, bottomHeight)}px`;
    this._els.bodyCenterContainer.style.minHeight = `${Math.max(0, totalHeight)}px`;
  }

  updateColumnWidths({ leftWidth = 0, centerWidth = 0, rightWidth = 0 }) {
    this._els.headerLeft.style.width = `${leftWidth}px`;
    this._els.bodyLeft.style.width = '0px';
    this._els.headerCenterContainer.style.width = `${centerWidth}px`;
    this._els.bodyCenterContainer.style.width = `${leftWidth + centerWidth + rightWidth}px`;
    this._els.headerRight.style.width = `${rightWidth}px`;
    this._els.bodyRight.style.width = '0px';
  }

  showLoading(message = 'Loading data...', options = {}) {
    this.showOverlay({
      kind: 'loading',
      title: options.title ?? this._getLocaleText('grid.loading.title', 'Loading'),
      message,
      showSkeleton: options.showSkeleton ?? false,
      content: options.content ?? null,
    });
  }

  showEmpty(message = 'No rows available.', options = {}) {
    this.showOverlay({
      kind: 'empty',
      title: options.title ?? this._getLocaleText('grid.empty.title', 'No Data'),
      message,
      content: options.content ?? null,
    });
  }

  showError(message = 'Something went wrong.', options = {}) {
    this.showOverlay({
      kind: 'error',
      title: options.title ?? this._getLocaleText('grid.error.title', 'Something Went Wrong'),
      message,
      actionLabel: options.actionLabel ?? null,
      onAction: options.onAction ?? null,
      content: options.content ?? null,
    });
  }

  showOverlay({
    kind = 'info',
    title = '',
    message = '',
    actionLabel = null,
    onAction = null,
    showSkeleton = false,
    content = null,
  } = {}) {
    const overlay = this._els.overlay;
    const action = this._els.overlayAction;
    overlay.style.display = 'flex';
    overlay.dataset.kind = kind;
    overlay.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    this._container.setAttribute('aria-busy', kind === 'loading' ? 'true' : 'false');
    this._els.overlayTitle.textContent = title;
    this._els.overlayMessage.textContent = message;
    this._els.overlayCustom.innerHTML = '';
    this._els.overlayCustom.style.display = content ? 'block' : 'none';
    if (content instanceof HTMLElement) {
      this._els.overlayCustom.appendChild(content);
    } else if (content != null) {
      this._els.overlayCustom.innerHTML = String(content);
    }
    this._els.overlaySkeleton.style.display = showSkeleton ? 'grid' : 'none';
    if (this._overlayActionHandler) {
      action.removeEventListener('click', this._overlayActionHandler);
      this._overlayActionHandler = null;
    }
    if (actionLabel && typeof onAction === 'function') {
      action.textContent = actionLabel;
      action.style.display = 'inline-flex';
      this._overlayActionHandler = onAction;
      action.addEventListener('click', this._overlayActionHandler);
    } else {
      action.style.display = 'none';
      action.textContent = '';
    }
  }

  hideOverlay() {
    this._els.overlay.style.display = 'none';
    this._els.overlay.dataset.kind = '';
    this._els.overlayTitle.textContent = '';
    this._els.overlayMessage.textContent = '';
    this._els.overlayCustom.innerHTML = '';
    this._els.overlayCustom.style.display = 'none';
    this._els.overlaySkeleton.style.display = 'none';
    this._els.overlayAction.style.display = 'none';
    this._els.overlayAction.textContent = '';
    if (this._overlayActionHandler) {
      this._els.overlayAction.removeEventListener('click', this._overlayActionHandler);
      this._overlayActionHandler = null;
    }
    this._container.setAttribute('aria-busy', 'false');
  }

  showLiveBanner(message, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ck-zenith-grid-live-banner-button';
    button.textContent = message;
    if (typeof onClick === 'function') {
      button.addEventListener('click', onClick, { once: true });
    }

    this._els.banner.innerHTML = '';
    this._els.banner.appendChild(button);
    this._els.banner.style.display = 'block';
  }

  hideLiveBanner() {
    this._els.banner.style.display = 'none';
    this._els.banner.innerHTML = '';
  }

  setFooterContent(content) {
    this._els.footer.innerHTML = '';
    if (!content) {
      this._els.footer.style.display = 'none';
      return;
    }

    this._els.footer.style.display = 'flex';
    if (content instanceof HTMLElement) {
      this._els.footer.appendChild(content);
    } else {
      this._els.footer.innerHTML = String(content);
    }
  }

  getBodyViewport() {
    return this._els.bodyViewport;
  }

  getHeaderCenterViewport() {
    return this._els.headerCenterViewport;
  }

  getRowsContainer() {
    return this._els.rows;
  }

  getHeaderLeftContainer() {
    return this._els.headerLeft;
  }

  getHeaderCenterContainer() {
    return this._els.headerCenterContainer;
  }

  getHeaderRightContainer() {
    return this._els.headerRight;
  }

  getBodyLeftContainer() {
    return this._els.bodyLeft;
  }

  getBodyRightContainer() {
    return this._els.bodyRight;
  }

  getFooter() {
    return this._els.footer;
  }

  showInfiniteLoader() {
    if (!this._els.infiniteLoader) return;
    clearTimeout(this._loaderHideTimer);
    this._loaderHideTimer = null;
    this._loaderShownAt = Date.now();
    const el = this._els.infiniteLoader;
    el.style.transition = 'none';
    el.style.display = 'inline-flex';
    el.style.opacity = '1';
  }

  hideInfiniteLoader(minMs = 700) {
    if (!this._els.infiniteLoader) return;
    const elapsed = Date.now() - (this._loaderShownAt ?? 0);
    const delay = Math.max(0, minMs - elapsed);
    clearTimeout(this._loaderHideTimer);
    this._loaderHideTimer = setTimeout(() => {
      const el = this._els.infiniteLoader;
      if (!el) return;
      el.style.transition = '';
      el.style.opacity = '0';
      this._loaderHideTimer = setTimeout(() => {
        el.style.display = 'none';
        el.style.opacity = '1';
      }, 220);
    }, delay);
  }

  _getLocaleText(key, fallback, params = {}) {
    const getter = this._options.getLocaleText;
    if (typeof getter !== 'function') {
      return fallback;
    }
    return getter(key, fallback, params);
  }

  getRoot() {
    return this._container;
  }

  getPinnedTopRowsContainer() {
    return this._els.pinnedTopRows;
  }

  getPinnedBottomRowsContainer() {
    return this._els.pinnedBottomRows;
  }

  getStatusBarHost() {
    const host = this._els.statusBar;
    if (host) host.style.display = 'block';
    return host;
  }

  getSidePanelHost() {
    return this._els.sidePanel;
  }

  _createElement(tag, className) {
    const el = document.createElement(tag);
    el.className = className;
    return el;
  }

  destroy() {
    clearTimeout(this._loaderHideTimer);
    this._loaderHideTimer = null;
    if (this._overlayActionHandler && this._els.overlayAction) {
      this._els.overlayAction.removeEventListener('click', this._overlayActionHandler);
    }
    this._overlayActionHandler = null;
    this._container.innerHTML = '';
    this._container.classList.remove('zenith-grid', 'ck-zenith-grid-root');
    this._container.removeAttribute('role');
    this._container.removeAttribute('aria-rowcount');
    this._container.removeAttribute('aria-colcount');
    this._container.removeAttribute('aria-busy');
    this._els = {};
    this._built = false;
  }

  setAccessibilityMeta({ rowCount = 0, colCount = 0 } = {}) {
    this._container.setAttribute('aria-rowcount', String(Math.max(0, rowCount)));
    this._container.setAttribute('aria-colcount', String(Math.max(0, colCount)));
  }
}
