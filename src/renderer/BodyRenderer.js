export class BodyRenderer {
  constructor(domRenderer, columnModel, viewModel, options = {}) {
    this._dom = domRenderer;
    this._columnModel = columnModel;
    this._viewModel = viewModel;
    this._options = options;
    this._currentRows = [];
  }

  render(displayRows, rangeBundle) {
    this._currentRows = displayRows;

    const verticalRange = rangeBundle?.vertical ?? rangeBundle ?? this._viewModel.getVerticalRange();
    const horizontalRange = rangeBundle?.horizontal ?? this._viewModel.getHorizontalRange();

    const startIndex = Math.max(0, verticalRange.startIndex);
    const endIndex = Math.min(displayRows.length - 1, verticalRange.endIndex);
    const rowHeight = this._viewModel.getRowHeight();
    const visibleRowCount = Math.max(0, endIndex - startIndex + 1);
    const renderedHeight = this._viewModel.isVariableRowHeight()
      ? 0
      : visibleRowCount * rowHeight;
    const topHeight = verticalRange.offsetY;
    const bottomHeight = Math.max(0, verticalRange.totalHeight - topHeight - renderedHeight);

    this._dom.updateVirtualSpace({
      topHeight,
      bottomHeight,
      totalHeight: verticalRange.totalHeight,
    });

    const container = this._dom.getRowsContainer();
    container.innerHTML = '';

    const visibleColumns = this._columnModel.getVisibleLeafColumns();
    const pinnedGroups = this._columnModel.getColumnsByPin();
    const stickyMeta = this._buildStickyMeta(pinnedGroups);
    const centerSlice = this._sliceColumnsByRange(pinnedGroups.center, horizontalRange);
    const totalWidth = visibleColumns.reduce((sum, column) => sum + (column.state.width ?? 0), 0);

    for (let index = startIndex; index <= endIndex; index += 1) {
      const row = displayRows[index];
      if (!row) {
        continue;
      }

      const rowElement = document.createElement('div');
      rowElement.className = 'ag-row';
      rowElement.dataset.rowKey = row._rowKey;

      const explicitHeight = this._options.getRowHeight?.(row) ?? row._rowHeight ?? null;
      if (this._viewModel.isVariableRowHeight()) {
        rowElement.classList.add('ag-row-variable');
        if (explicitHeight != null) {
          rowElement.style.minHeight = `${explicitHeight}px`;
        }
      } else {
        rowElement.style.height = `${rowHeight}px`;
      }

      if (index % 2 === 1) {
        rowElement.classList.add('ag-row-odd');
      }

      if (this._options.selectionManager?.isSelected(row._rowKey)) {
        rowElement.classList.add('ag-row-selected');
      }

      rowElement.addEventListener('click', (event) => {
        this._options.onRowClick?.({ row, event });
      });

      if (row._type === 'group-header') {
        rowElement.classList.add('ag-row-group');
        rowElement.appendChild(this._createGroupCell(row, totalWidth));
      } else if (row._type === 'tree-loading') {
        rowElement.classList.add('ag-row-tree-loading');
        rowElement.appendChild(this._createLoadingCell(totalWidth));
      } else {
        if (row._type === 'tree-node') {
          rowElement.classList.add('ag-row-tree');
        }

        for (const { def, state } of pinnedGroups.left) {
          rowElement.appendChild(this._createDataCell(row, def, state, stickyMeta.get(def.id)));
        }

        if (centerSlice.leadingSpacer > 0) {
          rowElement.appendChild(this._createSpacer(centerSlice.leadingSpacer));
        }

        for (const { def, state } of centerSlice.columns) {
          rowElement.appendChild(this._createDataCell(row, def, state));
        }

        if (centerSlice.trailingSpacer > 0) {
          rowElement.appendChild(this._createSpacer(centerSlice.trailingSpacer));
        }

        for (const { def, state } of pinnedGroups.right) {
          rowElement.appendChild(this._createDataCell(row, def, state, stickyMeta.get(def.id)));
        }
      }

      container.appendChild(rowElement);

      if (this._viewModel.isVariableRowHeight()) {
        requestAnimationFrame(() => {
          const measuredHeight = Math.ceil(rowElement.getBoundingClientRect().height);
          if (measuredHeight > 0) {
            this._options.onRowMeasured?.({
              row,
              flatIndex: index,
              height: measuredHeight,
            });
          }
        });
      }
    }
  }

  _sliceColumnsByRange(columns, horizontalRange) {
    if (!columns.length) {
      return { columns: [], leadingSpacer: 0, trailingSpacer: 0 };
    }

    const start = Math.max(0, horizontalRange?.startColIndex ?? 0);
    const end = Math.min(columns.length - 1, horizontalRange?.endColIndex ?? columns.length - 1);

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

  _buildStickyMeta(groups) {
    const stickyMeta = new Map();

    let leftOffset = 0;
    for (const { def, state } of groups.left) {
      stickyMeta.set(def.id, { left: leftOffset, zIndex: 4 });
      leftOffset += state.width ?? 0;
    }

    let rightOffset = 0;
    for (let index = groups.right.length - 1; index >= 0; index -= 1) {
      const { def, state } = groups.right[index];
      stickyMeta.set(def.id, { right: rightOffset, zIndex: 4 });
      rightOffset += state.width ?? 0;
    }

    return stickyMeta;
  }

  _createSpacer(width) {
    const spacer = document.createElement('div');
    spacer.className = 'ag-col-spacer';
    spacer.style.width = `${width}px`;
    spacer.style.minWidth = `${width}px`;
    return spacer;
  }

  _createGroupCell(row, totalWidth) {
    const cell = document.createElement('div');
    cell.className = 'ag-cell ag-group-cell';
    cell.style.width = `${totalWidth}px`;
    cell.style.minWidth = `${totalWidth}px`;
    cell.style.paddingLeft = `${12 + (row._groupDepth ?? 0) * 18}px`;

    const badge = document.createElement('span');
    badge.className = 'ag-row-kind-badge ag-row-kind-group';
    badge.textContent = 'GROUP';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ag-row-toggle';
    toggle.textContent = row._isExpanded ? '▼' : '▶';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      this._options.onGroupToggle?.({ groupKey: row._groupKey, row });
    });

    const label = document.createElement('span');
    label.className = 'ag-group-label';
    label.textContent = `${row._groupField}: ${row._groupValue ?? 'Empty'} (${row._childCount ?? 0})`;

    cell.appendChild(badge);
    cell.appendChild(toggle);
    cell.appendChild(label);
    return cell;
  }

  _createLoadingCell(totalWidth) {
    const cell = document.createElement('div');
    cell.className = 'ag-cell ag-loading-cell';
    cell.style.width = `${totalWidth}px`;
    cell.style.minWidth = `${totalWidth}px`;
    cell.textContent = 'Loading children...';
    return cell;
  }

  _createDataCell(row, def, state, stickyStyle = null) {
    const cell = document.createElement('div');
    cell.className = 'ag-cell';
    cell.dataset.colId = def.id;
    cell.style.width = `${state.width}px`;
    cell.style.minWidth = `${state.width}px`;
    cell.style.textAlign = def.align ?? 'left';

    if (stickyStyle) {
      cell.classList.add('ag-cell-pinned');
      if (stickyStyle.left != null) {
        cell.style.left = `${stickyStyle.left}px`;
      }
      if (stickyStyle.right != null) {
        cell.style.right = `${stickyStyle.right}px`;
      }
      cell.style.zIndex = String(stickyStyle.zIndex);
    }

    if (this._viewModel.isVariableRowHeight()) {
      cell.classList.add('ag-cell-variable');
    }

    if (row._type === 'tree-node' && def._isFirstColumn) {
      cell.style.paddingLeft = `${12 + (row._depth ?? 0) * 18}px`;

      const badge = document.createElement('span');
      badge.className = 'ag-row-kind-badge ag-row-kind-tree';
      badge.textContent = 'TREE';
      cell.appendChild(badge);

      if (row._hasChildren) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ag-row-toggle';
        toggle.textContent = row._isExpanded ? '▼' : '▶';
        toggle.addEventListener('click', (event) => {
          event.stopPropagation();
          this._options.onTreeToggle?.({ rowKey: row._rowKey, row });
        });
        cell.appendChild(toggle);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'ag-row-toggle ag-row-toggle-spacer';
        cell.appendChild(spacer);
      }
    }

    const value = row[def.field];
    const renderedValue = def.formatter ? def.formatter({ value, row, def }) : value;

    if (def.renderer) {
      const rendered = def.renderer({ value, row, def, state });
      if (rendered instanceof HTMLElement) {
        cell.appendChild(rendered);
      } else if (rendered != null) {
        const text = document.createElement('span');
        text.className = 'ag-cell-text';
        text.textContent = String(rendered);
        cell.appendChild(text);
      }
    } else {
      const text = document.createElement('span');
      text.className = 'ag-cell-text';
      text.textContent = renderedValue == null ? '' : String(renderedValue);
      cell.appendChild(text);
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

    return cell;
  }

  clear() {
    const container = this._dom.getRowsContainer();
    if (container) {
      container.innerHTML = '';
    }
    this._currentRows = [];
  }

  destroy() {
    this.clear();
  }
}
