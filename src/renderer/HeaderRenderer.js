export class HeaderRenderer {
  constructor(domRenderer, headerModel, columnModel, options = {}) {
    this._dom = domRenderer;
    this._headerModel = headerModel;
    this._columnModel = columnModel;
    this._options = options;
  }

  render() {
    this._renderContainer(
      this._dom.getHeaderLeftContainer(),
      this._columnModel.getColumnsByPin().left
    );
    this._renderContainer(
      this._dom.getHeaderCenterContainer(),
      this._columnModel.getColumnsByPin().center
    );
    this._renderContainer(
      this._dom.getHeaderRightContainer(),
      this._columnModel.getColumnsByPin().right
    );
  }

  updateSortIndicators() {
    const containers = [
      this._dom.getHeaderLeftContainer(),
      this._dom.getHeaderCenterContainer(),
      this._dom.getHeaderRightContainer(),
    ];

    for (const container of containers) {
      const cells = container.querySelectorAll('.ag-header-cell[data-col-id]');
      cells.forEach((cell) => {
        const colId = cell.getAttribute('data-col-id');
        const indicator = cell.querySelector('.ag-sort-indicator');
        if (indicator) {
          indicator.textContent = this._getSortGlyph(colId);
        }
      });
    }
  }

  _renderContainer(container, columns) {
    container.innerHTML = '';
    if (!columns.length) return;

    const row = document.createElement('div');
    row.className = 'ag-header-row';

    for (const { def, state } of columns) {
      const cell = document.createElement('div');
      cell.className = 'ag-header-cell';
      cell.setAttribute('data-col-id', def.id);
      cell.style.width = `${state.width}px`;
      cell.style.minWidth = `${state.width}px`;

      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'ag-header-cell-button';
      label.title = def.headerName;
      label.addEventListener('click', (event) => {
        if (def.sortable === false) return;
        this._options.onSortClick?.({
          colId: def.id,
          field: def.field,
          def,
          multiSort: event.ctrlKey || event.metaKey,
        });
      });

      const text = document.createElement('span');
      text.className = 'ag-header-cell-text';
      text.textContent = def.headerName;

      const indicator = document.createElement('span');
      indicator.className = 'ag-sort-indicator';
      indicator.textContent = this._getSortGlyph(def.id);

      label.appendChild(text);
      label.appendChild(indicator);
      cell.appendChild(label);
      row.appendChild(cell);
    }

    container.appendChild(row);
  }

  _getSortGlyph(colId) {
    const def = this._columnModel.getDef(colId);
    const sort = this._options.sortManager?.getSortForField(def?.field ?? colId);
    if (!sort) return '';
    return sort.direction === 'asc' ? '▲' : '▼';
  }

  destroy() {}
}
