export class DOMRenderer {
  constructor(container, options = {}) {
    this._container = container;
    this._options = options;
    this._els = {};
    this._built = false;
  }

  build() {
    if (this._built) return;

    this._container.classList.add('ag-root');
    this._container.innerHTML = '';

    const header = this._createElement('div', 'ag-header');
    const headerLeft = this._createElement('div', 'ag-header-left-pinned');
    const headerCenterViewport = this._createElement('div', 'ag-header-center-viewport');
    const headerCenterContainer = this._createElement('div', 'ag-header-center-container');
    const headerRight = this._createElement('div', 'ag-header-right-pinned');

    headerCenterViewport.appendChild(headerCenterContainer);
    header.appendChild(headerLeft);
    header.appendChild(headerCenterViewport);
    header.appendChild(headerRight);

    const bodyViewport = this._createElement('div', 'ag-body-viewport');
    const body = this._createElement('div', 'ag-body');
    const bodyLeft = this._createElement('div', 'ag-body-left-pinned');
    const bodyCenterViewport = this._createElement('div', 'ag-body-center-viewport');
    const bodyCenterContainer = this._createElement('div', 'ag-body-center-container');
    const spacerTop = this._createElement('div', 'ag-virtual-spacer-top');
    const rows = this._createElement('div', 'ag-rows');
    const spacerBottom = this._createElement('div', 'ag-virtual-spacer-bottom');
    const bodyRight = this._createElement('div', 'ag-body-right-pinned');

    bodyCenterContainer.appendChild(spacerTop);
    bodyCenterContainer.appendChild(rows);
    bodyCenterContainer.appendChild(spacerBottom);
    bodyCenterViewport.appendChild(bodyCenterContainer);

    body.appendChild(bodyLeft);
    body.appendChild(bodyCenterViewport);
    body.appendChild(bodyRight);
    bodyViewport.appendChild(body);

    const footer = this._createElement('div', 'ag-footer');
    const overlay = this._createElement('div', 'ag-overlay');
    overlay.style.display = 'none';
    const banner = this._createElement('div', 'ag-live-banner');
    banner.style.display = 'none';
    const sidePanel = this._createElement('div', 'ag-side-panel-host');

    this._container.appendChild(banner);
    this._container.appendChild(header);
    this._container.appendChild(bodyViewport);
    this._container.appendChild(footer);
    this._container.appendChild(sidePanel);
    this._container.appendChild(overlay);

    this._els = {
      header,
      headerLeft,
      headerCenterViewport,
      headerCenterContainer,
      headerRight,
      bodyViewport,
      body,
      bodyLeft,
      bodyCenterViewport,
      bodyCenterContainer,
      rows,
      bodyRight,
      spacerTop,
      spacerBottom,
      overlay,
      banner,
      footer,
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
    this._els.bodyLeft.style.width = `${leftWidth}px`;
    this._els.headerCenterContainer.style.width = `${centerWidth}px`;
    this._els.bodyCenterContainer.style.width = `${centerWidth}px`;
    this._els.headerRight.style.width = `${rightWidth}px`;
    this._els.bodyRight.style.width = `${rightWidth}px`;
  }

  showLoading(message = 'Loading...') {
    this._els.overlay.style.display = 'flex';
    this._els.overlay.textContent = message;
  }

  showEmpty(message = 'No rows to display.') {
    this._els.overlay.style.display = 'flex';
    this._els.overlay.textContent = message;
  }

  hideOverlay() {
    this._els.overlay.style.display = 'none';
    this._els.overlay.textContent = '';
  }

  showLiveBanner(message, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ag-live-banner-button';
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

  getRoot() {
    return this._container;
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
    this._container.innerHTML = '';
    this._container.classList.remove('ag-root');
    this._els = {};
    this._built = false;
  }
}
