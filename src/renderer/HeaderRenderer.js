export class HeaderRenderer {
  constructor(domRenderer, headerModel, columnModel, options = {}) {
    this._dom = domRenderer;
    this._headerModel = headerModel;
    this._columnModel = columnModel;
    this._options = options;

    this._activeResize = null;
    this._removeResizeListeners = null;
  }

  render(rangeBundle = null) {
    const horizontalRange = rangeBundle?.horizontal ?? null;
    const columnsByPin = this._columnModel.getColumnsByPin();

    this._renderContainer(this._dom.getHeaderLeftContainer(), columnsByPin.left, 'left', null);
    this._renderContainer(this._dom.getHeaderCenterContainer(), columnsByPin.center, 'center', horizontalRange);
    this._renderContainer(this._dom.getHeaderRightContainer(), columnsByPin.right, 'right', null);
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

  _renderContainer(container, columns, pinArea, horizontalRange) {
    container.innerHTML = '';
    if (!columns.length) {
      return;
    }

    const row = document.createElement('div');
    row.className = 'ag-header-row';

    const stickyMeta = this._buildStickyMeta(columns, pinArea);
    let renderColumns = columns;
    let leadingSpacer = 0;
    let trailingSpacer = 0;

    if (pinArea === 'center' && horizontalRange) {
      const sliced = this._sliceColumnsByRange(columns, horizontalRange);
      renderColumns = sliced.columns;
      leadingSpacer = sliced.leadingSpacer;
      trailingSpacer = sliced.trailingSpacer;
    }

    if (leadingSpacer > 0) {
      row.appendChild(this._createSpacer(leadingSpacer));
    }

    renderColumns.forEach(({ def, state }, index) => {
      const cell = document.createElement('div');
      cell.className = 'ag-header-cell';
      cell.dataset.colId = def.id;
      cell.style.width = `${state.width}px`;
      cell.style.minWidth = `${state.width}px`;

      const stickyStyle = stickyMeta.get(def.id);
      if (stickyStyle) {
        cell.classList.add('ag-header-cell-pinned');
        if (stickyStyle.left != null) {
          cell.style.left = `${stickyStyle.left}px`;
        }
        if (stickyStyle.right != null) {
          cell.style.right = `${stickyStyle.right}px`;
        }
        cell.style.zIndex = String(stickyStyle.zIndex);
      }

      if (def.reorderable !== false) {
        cell.draggable = true;
        cell.addEventListener('dragstart', (event) => {
          if (this._activeResize) {
            event.preventDefault();
            return;
          }
          event.dataTransfer?.setData('text/plain', def.id);
          cell.classList.add('ag-drag-origin');
        });
        cell.addEventListener('dragend', () => {
          cell.classList.remove('ag-drag-origin');
          container.querySelectorAll('.ag-drag-target').forEach((element) => {
            element.classList.remove('ag-drag-target');
          });
        });
        cell.addEventListener('dragover', (event) => {
          event.preventDefault();
          cell.classList.add('ag-drag-target');
        });
        cell.addEventListener('dragleave', () => {
          cell.classList.remove('ag-drag-target');
        });
        cell.addEventListener('drop', (event) => {
          event.preventDefault();
          cell.classList.remove('ag-drag-target');
          const fromColId = event.dataTransfer?.getData('text/plain');
          if (!fromColId || fromColId === def.id) {
            return;
          }
          this._options.onColumnDrop?.({
            fromColId,
            toColId: def.id,
            toVisibleIndex: index,
          });
        });
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ag-header-cell-button';
      button.title = def.headerName;
      button.addEventListener('click', (event) => {
        if (def.sortable === false || this._activeResize) {
          return;
        }
        this._options.onSortClick?.({
          colId: def.id,
          field: def.field,
          def,
          multiSort: event.ctrlKey || event.metaKey,
        });
      });

      const label = document.createElement('span');
      label.className = 'ag-header-cell-text';
      label.textContent = def.headerName;

      const indicator = document.createElement('span');
      indicator.className = 'ag-sort-indicator';
      indicator.textContent = this._getSortGlyph(def.id);

      button.appendChild(label);
      button.appendChild(indicator);
      cell.appendChild(button);

      if (def.resizable !== false) {
        const resizeHandle = document.createElement('button');
        resizeHandle.type = 'button';
        resizeHandle.className = 'ag-header-resize-handle';
        resizeHandle.setAttribute('aria-label', `${def.headerName} column width`);
        resizeHandle.addEventListener('mousedown', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._beginResize(event, { colId: def.id, width: state.width });
        });
        cell.appendChild(resizeHandle);
      }

      row.appendChild(cell);
    });

    if (trailingSpacer > 0) {
      row.appendChild(this._createSpacer(trailingSpacer));
    }

    container.appendChild(row);
  }

  _beginResize(event, column) {
    this._teardownResize();

    const startX = event.clientX;
    const startWidth = column.width ?? 0;
    this._activeResize = {
      colId: column.colId,
      startX,
      startWidth,
      lastWidth: startWidth,
    };

    document.body.classList.add('ag-column-resizing');

    const onMouseMove = (moveEvent) => {
      if (!this._activeResize) {
        return;
      }
      const delta = moveEvent.clientX - this._activeResize.startX;
      const nextWidth = this._activeResize.startWidth + delta;
      this._activeResize.lastWidth = nextWidth;
      this._options.onColumnResize?.({
        colId: this._activeResize.colId,
        width: nextWidth,
        commit: false,
      });
    };

    const onMouseUp = () => {
      if (this._activeResize) {
        this._options.onColumnResize?.({
          colId: this._activeResize.colId,
          width: this._activeResize.lastWidth,
          commit: true,
        });
      }
      this._teardownResize();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });

    this._removeResizeListeners = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  _teardownResize() {
    if (this._removeResizeListeners) {
      this._removeResizeListeners();
      this._removeResizeListeners = null;
    }
    document.body.classList.remove('ag-column-resizing');
    this._activeResize = null;
  }

  _sliceColumnsByRange(columns, horizontalRange) {
    const start = Math.max(0, horizontalRange.startColIndex);
    const end = Math.min(columns.length - 1, horizontalRange.endColIndex);

    return {
      columns: columns.slice(start, end + 1),
      leadingSpacer: columns
        .slice(0, start)
        .reduce((sum, column) => sum + (column.state.width ?? 0), 0),
      trailingSpacer: columns
        .slice(end + 1)
        .reduce((sum, column) => sum + (column.state.width ?? 0), 0),
    };
  }

  _createSpacer(width) {
    const spacer = document.createElement('div');
    spacer.className = 'ag-col-spacer';
    spacer.style.width = `${width}px`;
    spacer.style.minWidth = `${width}px`;
    return spacer;
  }

  _buildStickyMeta(columns, pinArea) {
    const stickyMeta = new Map();

    if (pinArea === 'left') {
      let offset = 0;
      for (const { def, state } of columns) {
        stickyMeta.set(def.id, { left: offset, zIndex: 6 });
        offset += state.width ?? 0;
      }
      return stickyMeta;
    }

    if (pinArea === 'right') {
      let offset = 0;
      for (let index = columns.length - 1; index >= 0; index -= 1) {
        const { def, state } = columns[index];
        stickyMeta.set(def.id, { right: offset, zIndex: 6 });
        offset += state.width ?? 0;
      }
    }

    return stickyMeta;
  }

  _getSortGlyph(colId) {
    const def = this._columnModel.getDef(colId);
    const sort = this._options.sortManager?.getSortForField(def?.field ?? colId);
    if (!sort) {
      return '';
    }
    return sort.direction === 'asc' ? '▲' : '▼';
  }

  destroy() {
    this._teardownResize();
  }
}
