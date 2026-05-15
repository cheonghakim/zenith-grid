export class BodyRenderer {
  constructor(domRenderer, columnModel, viewModel, options = {}) {
    this._dom = domRenderer;
    this._columnModel = columnModel;
    this._viewModel = viewModel;
    this._options = options;
    this._currentRows = [];
    this._lastRenderAt = 0;
  }

  render(displayRows, rangeBundle) {
    this._currentRows = displayRows;

    const verticalRange = rangeBundle?.vertical ?? rangeBundle ?? this._viewModel.getVerticalRange();
    const horizontalRange = rangeBundle?.horizontal ?? this._viewModel.getHorizontalRange();
    const startIndex = Math.max(0, verticalRange.startIndex);
    const endIndex = Math.min(displayRows.length - 1, verticalRange.endIndex);
    const rowHeight = this._viewModel.getRowHeight();
    const visibleRowCount = Math.max(0, endIndex - startIndex + 1);
    const renderedHeight = this._viewModel.isVariableRowHeight() ? 0 : visibleRowCount * rowHeight;
    const topHeight = verticalRange.offsetY;
    const bottomHeight = Math.max(0, verticalRange.totalHeight - topHeight - renderedHeight);

    this._dom.updateVirtualSpace({
      topHeight,
      bottomHeight,
      totalHeight: verticalRange.totalHeight,
    });

    const container = this._dom.getRowsContainer();
    const now = performance.now?.() ?? Date.now();
    container.style.position = 'relative';
    const previousRows = Array.from(container.querySelectorAll('.ag-row')).map((element) => ({
      key: element.dataset.rowKey,
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
      element,
    }));
    const previousByKey = new Map(previousRows.map((entry) => [entry.key, entry]));
    container.innerHTML = '';

    const visibleColumns = this._columnModel.getVisibleLeafColumns();
    const pinnedGroups = this._columnModel.getColumnsByPin();
    const stickyMeta = this._buildStickyMeta(pinnedGroups);
    const centerSlice = this._sliceColumnsByRange(pinnedGroups.center, horizontalRange);
    const totalWidth = visibleColumns.reduce((sum, column) => sum + (column.state.width ?? 0), 0);

    for (let index = startIndex; index <= endIndex; index += 1) {
      const row = displayRows[index];
      if (!row) continue;

      const rowElement = document.createElement('div');
      rowElement.className = 'ag-row';
      rowElement.dataset.rowKey = row._rowKey;
      this._applyClassNames(rowElement, this._options.getRowClassName?.(row));
      this._applyInlineStyles(rowElement, this._options.getRowStyle?.(row));

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

      if (this._options.selectionManager?.isSelected?.(row._rowKey)) {
        rowElement.classList.add('ag-row-selected');
      }

      this._options.hooks?.beforeRowRender?.({ row, rowElement, rowIndex: index });

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

        if (this._options.selectionEnabled) {
          rowElement.appendChild(this._createSelectionCell(row));
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
      this._options.hooks?.afterRowRender?.({ row, rowElement, rowIndex: index });

      if (this._viewModel.isVariableRowHeight()) {
        requestAnimationFrame(() => {
          const measuredHeight = Math.ceil(rowElement.getBoundingClientRect().height);
          if (measuredHeight > 0) {
            this._options.onRowMeasured?.({ row, flatIndex: index, height: measuredHeight });
          }
        });
      }
    }

    const nextRows = Array.from(container.querySelectorAll('.ag-row')).map((element) => ({
      key: element.dataset.rowKey,
      top: element.offsetTop,
      element,
    }));
    const addedRows = nextRows.filter((entry) => !previousByKey.has(entry.key));
    const removedRows = previousRows.filter((entry) => entry.key && !nextRows.some((row) => row.key === entry.key));
    const allowDecorativeAnimations = this._shouldRunDecorativeAnimations({
      addedCount: addedRows.length,
      removedCount: removedRows.length,
      now,
    });

    nextRows.forEach((entry) => {
      const previous = previousByKey.get(entry.key);
      if (!previous) {
        if (allowDecorativeAnimations && typeof entry.element.animate === 'function') {
          entry.element.animate(
            [
              { opacity: 0, transform: 'translateX(18px)' },
              { opacity: 1, transform: 'translateX(0)' },
            ],
            {
              duration: Math.min(this._options.getRowAnimationDuration?.() ?? 260, 320),
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }
          );
        }
        return;
      }

      const deltaY = previous.top - entry.top;
      if (deltaY === 0 || !allowDecorativeAnimations) {
        return;
      }

      if (typeof entry.element.animate === 'function') {
        entry.element.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: 'translateY(0)' },
          ],
          {
            duration: 180,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      }
    });

    removedRows.forEach((entry) => {
      const ghost = entry.element.cloneNode(true);
      ghost.classList.add('ag-row-exit-ghost');
      ghost.style.position = 'absolute';
      ghost.style.left = '0';
      ghost.style.top = `${entry.top}px`;
      ghost.style.width = `${entry.width}px`;
      ghost.style.height = `${entry.height}px`;
      ghost.style.pointerEvents = 'none';
      container.appendChild(ghost);

      if (allowDecorativeAnimations && typeof ghost.animate === 'function') {
        const animation = ghost.animate(
          [
            { opacity: 1, transform: 'translateX(0) scale(1)' },
            { opacity: 0, transform: 'translateX(-22px) scale(0.98)' },
          ],
          {
            duration: 180,
            easing: 'ease-out',
            fill: 'forwards',
          }
        );
        animation.addEventListener('finish', () => ghost.remove(), { once: true });
      } else {
        ghost.remove();
      }
    });

    this._lastRenderAt = now;
  }

  _createSelectionCell(row) {
    const width = this._options.selectionColumnWidth ?? 44;
    const cell = document.createElement('div');
    cell.className = 'ag-cell ag-selection-cell ag-cell-pinned';
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.left = '0px';
    cell.style.zIndex = '5';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ag-selection-checkbox';
    checkbox.checked = this._options.selectionManager?.isRowChecked?.(row) ?? false;
    checkbox.indeterminate = this._options.selectionManager?.isRowIndeterminate?.(row) ?? false;
    checkbox.disabled = this._options.isRowSelectable?.(row) === false;
    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener('change', () => {
      this._options.onRowSelectionToggle?.({ row, checked: checkbox.checked });
    });

    cell.appendChild(checkbox);
    return cell;
  }

  _sliceColumnsByRange(columns, horizontalRange) {
    if (!columns.length) {
      return { columns: [], leadingSpacer: 0, trailingSpacer: 0 };
    }

    const start = Math.max(0, horizontalRange?.startColIndex ?? 0);
    const end = Math.min(columns.length - 1, horizontalRange?.endColIndex ?? columns.length - 1);

    return {
      columns: columns.slice(start, end + 1),
      leadingSpacer: columns.slice(0, start).reduce((sum, column) => sum + (column.state.width ?? 0), 0),
      trailingSpacer: columns.slice(end + 1).reduce((sum, column) => sum + (column.state.width ?? 0), 0),
    };
  }

  _buildStickyMeta(groups) {
    const stickyMeta = new Map();
    const selectionOffset = this._options.selectionEnabled ? (this._options.selectionColumnWidth ?? 44) : 0;

    let leftOffset = selectionOffset;
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
    badge.textContent = this._getLocaleText('grid.badges.group', 'GROUP');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ag-row-toggle';
    toggle.appendChild(this._createIcon(row._isExpanded ? 'chevronDown' : 'chevronRight'));
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      this._options.onGroupToggle?.({ groupKey: row._groupKey, row });
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ag-selection-checkbox';
    checkbox.checked = this._options.selectionManager?.isRowChecked?.(row) ?? false;
    checkbox.indeterminate = this._options.selectionManager?.isRowIndeterminate?.(row) ?? false;
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      this._options.onRowSelectionToggle?.({ row, checked: checkbox.checked });
    });

    const label = document.createElement('span');
    label.className = 'ag-group-label';
    label.textContent = `${row._groupField}: ${row._groupValue ?? 'Empty'} (${row._childCount ?? 0})`;

    cell.appendChild(badge);
    cell.appendChild(checkbox);
    cell.appendChild(toggle);
    cell.appendChild(label);
    return cell;
  }

  _createLoadingCell(totalWidth) {
    const cell = document.createElement('div');
    cell.className = 'ag-cell ag-loading-cell';
    cell.style.width = `${totalWidth}px`;
    cell.style.minWidth = `${totalWidth}px`;
    cell.textContent = this._getLocaleText('grid.loading.childRows', 'Loading child rows...');
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
      if (stickyStyle.left != null) cell.style.left = `${stickyStyle.left}px`;
      if (stickyStyle.right != null) cell.style.right = `${stickyStyle.right}px`;
      cell.style.zIndex = String(stickyStyle.zIndex);
    }

    if (this._viewModel.isVariableRowHeight()) {
      cell.classList.add('ag-cell-variable');
    }

    if (row._type === 'tree-node' && def._isFirstColumn) {
      cell.style.paddingLeft = `${12 + (row._depth ?? 0) * 18}px`;

      const badge = document.createElement('span');
      badge.className = 'ag-row-kind-badge ag-row-kind-tree';
      badge.textContent = this._getLocaleText('grid.badges.tree', 'TREE');
      cell.appendChild(badge);

      if (row._hasChildren) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ag-row-toggle';
        toggle.appendChild(this._createIcon(row._isExpanded ? 'chevronDown' : 'chevronRight'));
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
    this._options.hooks?.beforeCellRender?.({ row, def, state, cell, value });

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
      this._options.onCellClick?.({ row, colId: def.id, value, event });
    });

    this._options.hooks?.afterCellRender?.({ row, def, state, cell, value });

    return cell;
  }

  _createIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('ag-icon');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', 'currentColor');
    polyline.setAttribute('stroke-width', '2');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.setAttribute('points', type === 'chevronDown' ? '6 9 12 15 18 9' : '9 6 15 12 9 18');
    svg.appendChild(polyline);
    return svg;
  }

  clear() {
    const container = this._dom.getRowsContainer();
    if (container) container.innerHTML = '';
    this._currentRows = [];
  }

  destroy() {
    this.clear();
  }

  _getLocaleText(key, fallback, params = {}) {
    const getter = this._options.getLocaleText;
    if (typeof getter !== 'function') {
      return fallback;
    }
    return getter(key, fallback, params);
  }

  _applyClassNames(element, value) {
    if (!value) {
      return;
    }

    const classNames = Array.isArray(value) ? value : String(value).split(/\s+/);
    classNames
      .map((name) => String(name).trim())
      .filter(Boolean)
      .forEach((name) => element.classList.add(name));
  }

  _applyInlineStyles(element, styles) {
    if (!styles || typeof styles !== 'object') {
      return;
    }

    Object.entries(styles).forEach(([property, value]) => {
      if (value == null) {
        return;
      }
      element.style[property] = String(value);
    });
  }

  _shouldRunDecorativeAnimations({ addedCount, removedCount, now }) {
    const changedCount = addedCount + removedCount;
    const renderGap = now - this._lastRenderAt;

    if (changedCount === 0) {
      return renderGap > 90;
    }

    if (changedCount > 6) {
      return false;
    }

    return renderGap > 140;
  }
}
