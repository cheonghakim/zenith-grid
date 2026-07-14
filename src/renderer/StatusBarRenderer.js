export class StatusBarRenderer {
  constructor(dom, options = {}) {
    this._dom = dom;
    this._options = options;
    this._el = null;
  }

  mount() {
    const host = this._dom.getStatusBarHost();
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'ck-zenith-grid-status-bar';
    host.appendChild(el);
    this._el = el;
  }

  render({ totalCount = 0, displayCount = 0, selectedCount = 0, aggregateResult = {} } = {}) {
    if (!this._el) return;
    this._el.innerHTML = '';

    const left = document.createElement('div');
    left.className = 'ck-zenith-grid-status-bar-left';

    const getLocale = (key, fallback, params = {}) =>
      this._options.getLocaleText?.(key, fallback, params) ?? fallback;

    // 행 수 정보
    const rowInfo = document.createElement('span');
    rowInfo.className = 'ck-zenith-grid-status-bar-item';
    if (displayCount < totalCount) {
      rowInfo.textContent = getLocale(
        'grid.statusBar.filteredRows',
        '{display} of {total} rows',
        { display: displayCount, total: totalCount }
      );
    } else {
      rowInfo.textContent = getLocale(
        'grid.statusBar.totalRows',
        '{count} rows',
        { count: totalCount }
      );
    }
    left.appendChild(rowInfo);

    if (selectedCount > 0) {
      const sep = document.createElement('span');
      sep.className = 'ck-zenith-grid-status-bar-sep';
      sep.textContent = '·';
      left.appendChild(sep);

      const selInfo = document.createElement('span');
      selInfo.className = 'ck-zenith-grid-status-bar-item ck-zenith-grid-status-bar-selected';
      selInfo.textContent = getLocale(
        'grid.statusBar.selectedRows',
        '{count} selected',
        { count: selectedCount }
      );
      left.appendChild(selInfo);
    }

    this._el.appendChild(left);

    // 집계 결과
    const aggEntries = Object.entries(aggregateResult);
    if (aggEntries.length > 0) {
      const right = document.createElement('div');
      right.className = 'ck-zenith-grid-status-bar-right';

      for (const [colId, { value, type }] of aggEntries) {
        const item = document.createElement('span');
        item.className = 'ck-zenith-grid-status-bar-item ck-zenith-grid-status-bar-agg';
        const colLabel = this._options.getColumnLabel?.(colId) ?? colId;
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        const formattedValue = typeof value === 'number'
          ? value % 1 !== 0 ? value.toFixed(2) : value.toLocaleString()
          : value;
        item.textContent = `${typeLabel}(${colLabel}): ${formattedValue}`;
        right.appendChild(item);
      }

      this._el.appendChild(right);
    }
  }

  destroy() {
    this._el = null;
  }
}
