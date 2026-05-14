export class BodyRenderer {
  constructor(domRenderer, columnModel, viewModel, options = {}) {
    this._dom = domRenderer;
    this._columnModel = columnModel;
    this._viewModel = viewModel;
    this._options = options;
    this._currentRows = [];
  }

  render(displayRows, verticalRange) {
    this._currentRows = displayRows;

    const startIndex = Math.max(0, verticalRange.startIndex);
    const endIndex = Math.min(displayRows.length - 1, verticalRange.endIndex);
    const rowHeight = this._viewModel.getRowHeight();
    const visibleRowCount = Math.max(0, endIndex - startIndex + 1);
    const renderedHeight = visibleRowCount * rowHeight;
    const topHeight = verticalRange.offsetY;
    const bottomHeight = Math.max(0, verticalRange.totalHeight - topHeight - renderedHeight);

    this._dom.updateVirtualSpace({
      topHeight,
      bottomHeight,
      totalHeight: verticalRange.totalHeight,
    });

    const container = this._dom.getRowsContainer();
    container.innerHTML = '';

    const columns = this._columnModel.getVisibleLeafColumns();

    for (let index = startIndex; index <= endIndex; index += 1) {
      const row = displayRows[index];
      if (!row) continue;

      const rowEl = document.createElement('div');
      rowEl.className = 'ag-row';
      rowEl.style.height = `${rowHeight}px`;
      rowEl.dataset.rowKey = row._rowKey;

      if (index % 2 === 1) {
        rowEl.classList.add('ag-row-odd');
      }

      if (this._options.selectionManager?.isSelected(row._rowKey)) {
        rowEl.classList.add('ag-row-selected');
      }

      rowEl.addEventListener('click', (event) => {
        this._options.onRowClick?.({ row, event });
      });

      for (const { def, state } of columns) {
        const cell = document.createElement('div');
        cell.className = 'ag-cell';
        cell.dataset.colId = def.id;
        cell.style.width = `${state.width}px`;
        cell.style.minWidth = `${state.width}px`;
        cell.style.textAlign = def.align ?? 'left';

        const value = row[def.field];
        const renderedValue = def.formatter
          ? def.formatter({ value, row, def })
          : value;

        if (def.renderer) {
          const rendered = def.renderer({ value, row, def, state });
          if (rendered instanceof HTMLElement) {
            cell.appendChild(rendered);
          } else if (rendered != null) {
            cell.textContent = String(rendered);
          }
        } else {
          cell.textContent = renderedValue == null ? '' : String(renderedValue);
        }

        cell.addEventListener('click', (event) => {
          event.stopPropagation();
          this._options.onCellClick?.({
            row,
            colId: def.id,
            value,
            event,
          });
        });

        rowEl.appendChild(cell);
      }

      container.appendChild(rowEl);
    }
  }

  clear() {
    const container = this._dom.getRowsContainer();
    if (container) container.innerHTML = '';
    this._currentRows = [];
  }

  destroy() {
    this.clear();
  }
}
