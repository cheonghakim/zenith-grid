export class HeaderRenderer {
  constructor(domRenderer, headerModel, columnModel, options = {}) {
    this._dom = domRenderer;
    this._headerModel = headerModel;
    this._columnModel = columnModel;
    this._options = options;

    this._activeResize = null;
    this._removeResizeListeners = null;
    this._filterPopover = null;
    this._openFilterColId = null;
    this._handleDocumentPointerDown = this._handleDocumentPointerDown.bind(this);
    this._handleViewportReposition = this._positionFilterPopover.bind(this);
  }

  render(rangeBundle = null) {
    const horizontalRange = rangeBundle?.horizontal ?? null;
    const columnsByPin = this._columnModel.getColumnsByPin();

    this._renderContainer(this._dom.getHeaderLeftContainer(), columnsByPin.left, 'left', null);
    this._renderContainer(this._dom.getHeaderCenterContainer(), columnsByPin.center, 'center', horizontalRange);
    this._renderContainer(this._dom.getHeaderRightContainer(), columnsByPin.right, 'right', null);
    this._syncOpenFilterPopover();

    if (this._options.filterRowEnabled) {
      this._renderFilterRow(this._dom.getHeaderLeftContainer(), columnsByPin.left, 'left', null);
      this._renderFilterRow(this._dom.getHeaderCenterContainer(), columnsByPin.center, 'center', horizontalRange);
      this._renderFilterRow(this._dom.getHeaderRightContainer(), columnsByPin.right, 'right', null);
    }
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

  _renderContainer(container, leafColumns, pinArea, horizontalRange) {
    container.innerHTML = '';

    const headerRows = this._headerModel.getHeaderRows();

    if (headerRows.length > 1) {
      this._renderMultiLevel(container, leafColumns, pinArea, horizontalRange, headerRows);
      return;
    }

    // ── Single-level (original code) ──────────────────────────
    const row = document.createElement('div');
    row.className = 'ag-header-row';
    row.setAttribute('role', 'row');

    if (pinArea === 'left' && this._options.rowNumbers) {
      row.appendChild(this._createRowNumberHeaderCell());
    }
    if (pinArea === 'left' && this._options.selectionEnabled) {
      row.appendChild(this._createSelectionHeaderCell());
    }

    if (!leafColumns.length && pinArea !== 'left') {
      return;
    }

    const stickyMeta = this._buildStickyMeta(leafColumns, pinArea);
    let renderColumns = leafColumns;
    let leadingSpacer = 0;
    let trailingSpacer = 0;

    if (pinArea === 'center' && horizontalRange) {
      const sliced = this._sliceColumnsByRange(leafColumns, horizontalRange);
      renderColumns = sliced.columns;
      leadingSpacer = sliced.leadingSpacer;
      trailingSpacer = sliced.trailingSpacer;
    }

    if (leadingSpacer > 0) {
      row.appendChild(this._createSpacer(leadingSpacer));
    }

    renderColumns.forEach(({ def, state }, index) => {
      row.appendChild(this._buildSingleLevelCell(def, state, index, stickyMeta, leafColumns));
    });

    if (trailingSpacer > 0) {
      row.appendChild(this._createSpacer(trailingSpacer));
    }

    container.appendChild(row);
  }

  // ── Multi-level rendering ────────────────────────────────────

  _renderMultiLevel(container, leafColumns, pinArea, horizontalRange, headerRows) {
    if (!leafColumns.length && pinArea !== 'left') return;

    const pinLeafIds = new Set(leafColumns.map(({ def }) => def.id));
    const leafWidthMap = new Map(leafColumns.map(({ def, state }) => [def.id, state.width ?? 0]));
    const rowHeight = this._options.rowHeight ?? 40;
    const totalDepths = headerRows.length;
    const selWidth = this._options.selectionColumnWidth ?? 44;

    let visibleLeafIds = null;
    if (pinArea === 'center' && horizontalRange) {
      const sliced = this._sliceColumnsByRange(leafColumns, horizontalRange);
      visibleLeafIds = new Set(sliced.columns.map(({ def }) => def.id));
    }

    for (let depthIdx = 0; depthIdx < totalDepths; depthIdx++) {
      const row = document.createElement('div');
      row.className = 'ag-header-row ag-header-row-depth';
      row.setAttribute('role', 'row');

      if (pinArea === 'left' && this._options.selectionEnabled) {
        if (depthIdx === 0) {
          row.appendChild(this._createSelectionHeaderCell());
        } else {
          const ph = this._createSpacer(selWidth);
          ph.style.opacity = '0';
          ph.style.pointerEvents = 'none';
          row.appendChild(ph);
        }
      }

      // Build the ordered cell sequence for this depth, including span-placeholders
      const orderedCells = this._buildDepthRowSequence(depthIdx, headerRows, pinLeafIds);

      if (pinArea === 'center' && visibleLeafIds) {
        const { leading, trailing, visible } = this._virtualizeDepthRow(
          orderedCells, visibleLeafIds, pinLeafIds, leafWidthMap
        );
        if (leading > 0) row.appendChild(this._createSpacer(leading));
        for (const cell of visible) {
          row.appendChild(this._buildMultiLevelCell(cell, pinLeafIds, leafWidthMap, rowHeight));
        }
        if (trailing > 0) row.appendChild(this._createSpacer(trailing));
      } else {
        for (const cell of orderedCells) {
          row.appendChild(this._buildMultiLevelCell(cell, pinLeafIds, leafWidthMap, rowHeight));
        }
      }

      container.appendChild(row);
    }
  }

  /**
   * Build the ordered sequence of cells for depth row `d`, interleaving
   * span-placeholders for standalone leaf columns from earlier rows.
   */
  _buildDepthRowSequence(depthIdx, headerRows, pinLeafIds) {
    if (depthIdx === 0) {
      return headerRows[0].filter((cell) => this._cellBelongsToArea(cell, pinLeafIds));
    }

    const result = [];
    const prevSeq = this._buildDepthRowSequence(depthIdx - 1, headerRows, pinLeafIds);

    // Map cells at this depth by parentId for quick lookup
    const byParent = new Map();
    for (const cell of headerRows[depthIdx]) {
      if (!this._cellBelongsToArea(cell, pinLeafIds)) continue;
      const pid = cell.def.parentId ?? '__root__';
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(cell);
    }

    for (const parentCell of prevSeq) {
      if (parentCell._isSpanPlaceholder) {
        // Cascade the placeholder if it spans into this depth
        if (parentCell.depth + parentCell.rowspan > depthIdx) {
          result.push({ ...parentCell, _isSpanPlaceholder: true });
        }
        continue;
      }
      if (parentCell.isGroup) {
        const children = byParent.get(parentCell.colId) ?? [];
        result.push(...children);
      } else {
        // Standalone leaf spanning into this depth row
        result.push({ ...parentCell, _isSpanPlaceholder: true });
      }
    }

    return result;
  }

  _cellBelongsToArea(cell, pinLeafIds) {
    if (cell._isSpanPlaceholder || !cell.isGroup) return pinLeafIds.has(cell.colId);
    return this._groupLeafIds(cell.def).some((id) => pinLeafIds.has(id));
  }

  _cellIsVisible(cell, visibleLeafIds) {
    if (cell._isSpanPlaceholder || !cell.isGroup) return visibleLeafIds.has(cell.colId);
    return this._groupLeafIds(cell.def).some((id) => visibleLeafIds.has(id));
  }

  _groupLeafIds(def) {
    if (!def.isGroup) return [def.id];
    return (def.children ?? []).flatMap((childId) => {
      const childDef = this._columnModel.getDef(childId);
      return childDef ? this._groupLeafIds(childDef) : [];
    });
  }

  _cellWidth(cell, pinLeafIds, leafWidthMap) {
    if (!cell.isGroup) return leafWidthMap.get(cell.colId) ?? 0;
    return this._groupLeafIds(cell.def)
      .filter((id) => pinLeafIds.has(id))
      .reduce((sum, id) => sum + (leafWidthMap.get(id) ?? 0), 0);
  }

  _virtualizeDepthRow(cells, visibleLeafIds, pinLeafIds, leafWidthMap) {
    let leading = 0;
    let trailing = 0;
    let foundVisible = false;
    const visible = [];

    for (const cell of cells) {
      const w = this._cellWidth(cell, pinLeafIds, leafWidthMap);
      if (this._cellIsVisible(cell, visibleLeafIds)) {
        foundVisible = true;
        visible.push(cell);
      } else if (!foundVisible) {
        leading += w;
      } else {
        trailing += w;
      }
    }

    return { leading, trailing, visible };
  }

  _buildMultiLevelCell(cell, pinLeafIds, leafWidthMap, rowHeight) {
    const width = this._cellWidth(cell, pinLeafIds, leafWidthMap);

    const domCell = document.createElement('div');
    domCell.className = 'ag-header-cell';
    domCell.setAttribute('role', cell.isGroup ? 'presentation' : 'columnheader');
    domCell.dataset.colId = cell.colId;
    domCell.style.width = `${width}px`;
    domCell.style.minWidth = `${width}px`;
    domCell.style.height = `${rowHeight}px`;

      if (cell._isSpanPlaceholder) {
        domCell.classList.add('ag-header-span-placeholder');
        return domCell;
      }

      if (cell.isGroup) domCell.classList.add('ag-header-group-cell');
      if (!cell.isGroup && this._options.getColumnFilter?.(cell.colId)) {
        domCell.classList.add('ag-header-cell-filtered');
      }

    if (cell.isGroup) {
      const label = document.createElement('span');
      label.className = 'ag-header-cell-text';
      label.textContent = cell.headerName;
      domCell.appendChild(label);
      return domCell;
    }

    // Leaf cell: sort button + resize handle
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ag-header-cell-button';
    button.title = cell.headerName;
    button.style.height = '100%';
    button.dataset.gridFocusable = 'header';
    button.dataset.colIndex = String(this._getVisibleColumnIndex(cell.colId));
    button.addEventListener('click', (event) => {
      if (cell.def.sortable === false || this._activeResize) return;
      this._options.onSortClick?.({
        colId: cell.colId,
        field: cell.def.field,
        def: cell.def,
        multiSort: event.ctrlKey || event.metaKey || event.shiftKey,
      });
    });

    const labelEl = document.createElement('span');
    labelEl.className = 'ag-header-cell-text';
    labelEl.textContent = cell.headerName;

    const indicator = document.createElement('span');
    indicator.className = 'ag-sort-indicator';
    indicator.textContent = this._getSortGlyph(cell.colId);

    const titleWrap = document.createElement('span');
    titleWrap.className = 'ag-header-title-wrap';
    titleWrap.appendChild(labelEl);
    titleWrap.appendChild(indicator);

    const filterIndicator = document.createElement('span');
    filterIndicator.className = 'ag-filter-indicator';
    const activeFilter = this._options.getColumnFilter?.(cell.colId);
    if (activeFilter) {
      filterIndicator.textContent = this._getLocaleText('grid.filter.active', 'Filtered');
    }

    button.appendChild(titleWrap);
    if (activeFilter) {
      button.appendChild(filterIndicator);
    }
    domCell.appendChild(button);
    if (cell.def.filterable !== false) {
      domCell.appendChild(this._createFilterAction(cell.colId, cell.def, domCell));
    }

    const state = this._columnModel.getState(cell.colId);
    if (cell.def.resizable !== false) {
      const resizeHandle = document.createElement('button');
      resizeHandle.type = 'button';
      resizeHandle.className = 'ag-header-resize-handle';
      resizeHandle.setAttribute('aria-label', `${cell.headerName} column width`);
      resizeHandle.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._beginResize(event, { colId: cell.colId, width: state?.width ?? 0 });
      });
      domCell.appendChild(resizeHandle);
    }

    domCell.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._showHeaderContextMenu(cell.colId, cell.def, event);
    });

    return domCell;
  }

  // ── Single-level cell builder ─────────────────────────────────

  _buildSingleLevelCell(def, state, index, stickyMeta, allColumns) {
    const cell = document.createElement('div');
    cell.className = 'ag-header-cell';
    cell.setAttribute('role', 'columnheader');
    cell.dataset.colId = def.id;
    cell.style.width = `${state.width}px`;
    cell.style.minWidth = `${state.width}px`;

    const stickyStyle = stickyMeta.get(def.id);
    if (stickyStyle) {
      cell.classList.add('ag-header-cell-pinned');
      if (stickyStyle.left != null) cell.style.left = `${stickyStyle.left}px`;
      if (stickyStyle.right != null) cell.style.right = `${stickyStyle.right}px`;
      cell.style.zIndex = String(stickyStyle.zIndex);
    }

    if (this._options.getColumnFilter?.(def.id)) {
      cell.classList.add('ag-header-cell-filtered');
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
        const container = cell.closest('.ag-header-left-pinned, .ag-header-center-container, .ag-header-right-pinned');
        container?.querySelectorAll('.ag-drag-target').forEach((el) => el.classList.remove('ag-drag-target'));
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
        if (!fromColId || fromColId === def.id) return;
        this._options.onColumnDrop?.({
          fromColId,
          toColId: def.id,
          toVisibleIndex: index,
        });
      });
    }

    // WCAG: aria-sort
    const sortDef = this._options.sortManager?.getSortForField?.(def.field);
    if (def.sortable !== false) {
      cell.setAttribute('aria-sort', sortDef
        ? (sortDef.direction === 'asc' ? 'ascending' : 'descending')
        : 'none'
      );
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ag-header-cell-button';
    button.title = def.headerName;
    button.setAttribute('aria-label', `${def.headerName}${sortDef ? `, sorted ${sortDef.direction}ending` : ''}`);
    button.dataset.gridFocusable = 'header';
    button.dataset.colIndex = String(this._getVisibleColumnIndex(def.id));
    button.addEventListener('click', (event) => {
      if (def.sortable === false || this._activeResize) return;
      this._options.onSortClick?.({
        colId: def.id,
        field: def.field,
        def,
        multiSort: event.ctrlKey || event.metaKey || event.shiftKey,
      });
    });

    const label = document.createElement('span');
    label.className = 'ag-header-cell-text';
    label.textContent = def.headerName;

    const indicator = document.createElement('span');
    indicator.className = 'ag-sort-indicator';
    indicator.textContent = this._getSortGlyph(def.id);

    const titleWrap = document.createElement('span');
    titleWrap.className = 'ag-header-title-wrap';
    titleWrap.appendChild(label);
    titleWrap.appendChild(indicator);

    const filterIndicator = document.createElement('span');
    filterIndicator.className = 'ag-filter-indicator';
    const activeFilter = this._options.getColumnFilter?.(def.id);
    if (activeFilter) {
      filterIndicator.textContent = this._getLocaleText('grid.filter.active', 'Filtered');
    }

    button.appendChild(titleWrap);
    if (activeFilter) {
      button.appendChild(filterIndicator);
    }
    cell.appendChild(button);
    if (def.filterable !== false) {
      cell.appendChild(this._createFilterAction(def.id, def, cell));
    }

    // ⋮ hover menu button
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'ag-header-menu-btn';
    menuBtn.setAttribute('aria-label', `${def.headerName} column menu`);
    menuBtn.textContent = '⋮';
    menuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this._showHeaderContextMenu(def.id, def, event);
    });
    cell.appendChild(menuBtn);

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

    cell.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._showHeaderContextMenu(def.id, def, event);
    });

    return cell;
  }

  // ── Shared helpers ────────────────────────────────────────────

  _createRowNumberHeaderCell() {
    const width = this._options.rowNumberWidth ?? 44;
    const cell = document.createElement('div');
    cell.className = 'ag-header-cell ag-row-number-header ag-header-cell-pinned';
    cell.setAttribute('role', 'columnheader');
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.left = '0px';
    cell.style.zIndex = '8';
    cell.textContent = '#';
    return cell;
  }

  _createSelectionHeaderCell() {
    const width = this._options.selectionColumnWidth ?? 44;
    const cell = document.createElement('div');
    cell.className = 'ag-header-cell ag-header-selection-cell ag-header-cell-pinned';
    cell.setAttribute('role', 'columnheader');
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.left = '0px';
    cell.style.zIndex = '8';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ag-selection-checkbox';
    checkbox.setAttribute('aria-label', this._getLocaleText('grid.selection.toggleAll', 'Select all rows'));
    checkbox.checked = Boolean(this._options.isAllSelected?.());
    checkbox.indeterminate = !checkbox.checked && Boolean(this._options.isSomeSelected?.());
    checkbox.addEventListener('change', () => {
      this._options.onToggleSelectAll?.();
    });

    cell.appendChild(checkbox);
    return cell;
  }

  _createFilterAction(colId, def, anchorCell) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ag-header-filter-button';
    button.setAttribute('aria-label', `${def.headerName} filter`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', this._openFilterColId === colId ? 'true' : 'false');
    button.appendChild(this._createFilterIcon());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._toggleFilterPopover(colId, def, anchorCell, button);
    });
    return button;
  }

  _beginResize(event, column) {
    this._teardownResize();
    this._activeResize = {
      colId: column.colId,
      startX: event.clientX,
      startWidth: column.width ?? 0,
      lastWidth: column.width ?? 0,
    };

    document.body.classList.add('ag-column-resizing');

    const onMouseMove = (moveEvent) => {
      if (!this._activeResize) return;
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
      leadingSpacer: columns.slice(0, start).reduce((sum, column) => sum + (column.state.width ?? 0), 0),
      trailingSpacer: columns.slice(end + 1).reduce((sum, column) => sum + (column.state.width ?? 0), 0),
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
    const selectionOffset = pinArea === 'left' && this._options.selectionEnabled
      ? (this._options.selectionColumnWidth ?? 44)
      : 0;

    if (pinArea === 'left') {
      let offset = selectionOffset;
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
    const sortManager = this._options.sortManager;
    if (!sortManager) return '';
    const sort = sortManager.getSortForField(def?.field ?? colId);
    if (!sort) return '';
    const glyph = sort.direction === 'asc' ? '↑' : '↓';
    const state = sortManager.getState();
    const priority = state.sortDefs.length > 1
      ? String(state.sortDefs.findIndex((s) => s.field === (def?.field ?? colId)) + 1)
      : '';
    return glyph + priority;
  }

  _renderFilterRow(container, leafColumns, pinArea, horizontalRange) {
    const existing = container.querySelector('.ag-filter-row');
    if (existing) existing.remove();
    if (!leafColumns.length && pinArea !== 'left') return;

    const row = document.createElement('div');
    row.className = 'ag-filter-row';
    row.setAttribute('role', 'row');

    // spacer for row-number and selection columns
    const extraWidth = (this._options.rowNumbers ? (this._options.rowNumberWidth ?? 44) : 0)
      + (this._options.selectionEnabled ? (this._options.selectionColumnWidth ?? 44) : 0);
    if (pinArea === 'left' && extraWidth > 0) {
      const spacer = document.createElement('div');
      spacer.className = 'ag-filter-cell ag-filter-cell-spacer';
      spacer.style.width = `${extraWidth}px`;
      spacer.style.minWidth = `${extraWidth}px`;
      row.appendChild(spacer);
    }

    let renderColumns = leafColumns;
    if (pinArea === 'center' && horizontalRange) {
      renderColumns = this._sliceColumnsByRange(leafColumns, horizontalRange).columns;
    }

    for (const { def, state } of renderColumns) {
      const cell = document.createElement('div');
      cell.className = 'ag-filter-cell';
      cell.style.width = `${state.width}px`;
      cell.style.minWidth = `${state.width}px`;

      if (def.filterable !== false) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ag-filter-row-input';
        input.placeholder = def.headerName;
        const current = this._options.getColumnFilter?.(def.id);
        if (current?.value) input.value = String(current.value);

        let debounceTimer = null;
        input.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const v = input.value.trim();
            if (v) {
              this._options.onColumnFilterChange?.(def.id, {
                type: def.filterType ?? 'text',
                field: def.field,
                operator: 'contains',
                value: v,
              });
            } else {
              this._options.onColumnFilterClear?.(def.id);
            }
          }, 220);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { input.value = ''; this._options.onColumnFilterClear?.(def.id); }
        });
        cell.appendChild(input);
      }
      row.appendChild(cell);
    }
    container.appendChild(row);
  }

  _toggleFilterPopover(colId, def, anchorCell, trigger) {
    if (this._openFilterColId === colId) {
      this._closeFilterPopover();
      return;
    }

    this._openFilterColId = colId;
    this._renderFilterPopover(colId, def, anchorCell, trigger);
  }

  _renderFilterPopover(colId, def, anchorCell, trigger) {
    this._closeFilterPopover({ preserveOpenId: true });

    const popover = document.createElement('div');
    popover.className = 'ag-header-filter-popover';
    popover.dataset.colId = colId;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.tabIndex = -1;

    const meta = this._resolveFilterMeta(def, colId);
    const activeFilter = this._options.getColumnFilter?.(colId);
    const operator = activeFilter?.operator ?? meta.defaultOperator;
    const value = activeFilter?.value ?? (operator === 'between' ? ['', ''] : meta.type === 'select' ? [] : '');

    const title = document.createElement('div');
    title.className = 'ag-header-filter-popover-title';
    title.textContent = def.headerName;
    popover.appendChild(title);

    if (meta.type !== 'select' && meta.type !== 'set') {
      const operatorSelect = document.createElement('select');
      operatorSelect.className = 'ag-header-filter-select';
      meta.operators.forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry;
        option.textContent = this._getOperatorLabel(entry);
        option.selected = entry === operator;
        operatorSelect.appendChild(option);
      });
      popover.appendChild(operatorSelect);

      const editor = this._createFilterEditor(meta, operator, value, (nextValue) => {
        this._options.onColumnFilterChange?.(colId, {
          type: meta.type,
          field: def.field,
          operator: operatorSelect.value,
          value: nextValue,
        });
      });
      popover.appendChild(editor);

      operatorSelect.addEventListener('change', () => {
        this._options.onColumnFilterChange?.(colId, {
          type: meta.type,
          field: def.field,
          operator: operatorSelect.value,
          value: operatorSelect.value === 'between' ? ['', ''] : '',
        });
        this._renderFilterPopover(colId, def, anchorCell, trigger);
      });
    } else {
      // 엑셀식 세트/선택 필터 UI: 검색 입력창 + 전체선택 체크박스 + 스크롤 가능한 체크박스 목록
      const container = document.createElement('div');
      container.className = 'ag-header-filter-set-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.padding = '4px 0';
      container.style.width = '200px';

      // 1. 검색창
      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.className = 'ag-header-filter-input';
      searchInput.placeholder = this._getLocaleText('grid.filter.search', 'Search...');
      searchInput.style.marginBottom = '4px';
      container.appendChild(searchInput);

      // 2. 전체선택 체크박스
      const selectAllWrap = document.createElement('label');
      selectAllWrap.className = 'ag-filter-checkbox-label';
      selectAllWrap.style.display = 'flex';
      selectAllWrap.style.alignItems = 'center';
      selectAllWrap.style.gap = '6px';
      selectAllWrap.style.fontWeight = 'bold';
      selectAllWrap.style.cursor = 'pointer';

      const selectAllCheck = document.createElement('input');
      selectAllCheck.type = 'checkbox';
      selectAllCheck.className = 'ag-filter-checkbox';
      selectAllWrap.appendChild(selectAllCheck);
      
      const selectAllText = document.createElement('span');
      selectAllText.textContent = this._getLocaleText('grid.filter.selectAll', '(Select All)');
      selectAllWrap.appendChild(selectAllText);
      container.appendChild(selectAllWrap);

      // 3. 스크롤 가능한 항목 컨테이너
      const listContainer = document.createElement('div');
      listContainer.className = 'ag-filter-list-container';
      listContainer.style.maxHeight = '150px';
      listContainer.style.overflowY = 'auto';
      listContainer.style.display = 'flex';
      listContainer.style.flexDirection = 'column';
      listContainer.style.gap = '4px';
      listContainer.style.padding = '4px';
      listContainer.style.border = '1px solid var(--ag-border, #e2e8f0)';
      listContainer.style.borderRadius = '4px';
      container.appendChild(listContainer);

      const selectedValues = new Set(
        Array.isArray(value)
          ? value.map(String)
          : value == null || value === ''
            ? []
            : [String(value)]
      );

      const commitChange = () => {
        const selected = [...selectedValues];
        this._options.onColumnFilterChange?.(colId, {
          type: meta.type,
          field: def.field,
          operator: 'in',
          value: meta.multiple ? selected : selected[0] ?? '',
        });
      };

      const updateSelectAllState = () => {
        const visibleChecks = [...listContainer.querySelectorAll('.ag-filter-checkbox')];
        if (visibleChecks.length === 0) {
          selectAllCheck.checked = false;
          selectAllCheck.indeterminate = false;
          return;
        }
        const checkedCount = visibleChecks.filter(c => c.checked).length;
        selectAllCheck.checked = checkedCount === visibleChecks.length;
        selectAllCheck.indeterminate = checkedCount > 0 && checkedCount < visibleChecks.length;
      };

      const renderList = (filterText = '') => {
        listContainer.innerHTML = '';
        const query = filterText.toLowerCase();
        
        const filteredChoices = meta.choices.filter((choice) =>
          String(choice.label).toLowerCase().includes(query)
        );

        filteredChoices.forEach((choice) => {
          const itemWrap = document.createElement('label');
          itemWrap.className = 'ag-filter-checkbox-label';
          itemWrap.style.display = 'flex';
          itemWrap.style.alignItems = 'center';
          itemWrap.style.gap = '6px';
          itemWrap.style.cursor = 'pointer';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'ag-filter-checkbox';
          checkbox.value = String(choice.value);
          checkbox.checked = selectedValues.has(String(choice.value));

          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              selectedValues.add(checkbox.value);
            } else {
              selectedValues.delete(checkbox.value);
            }
            updateSelectAllState();
            commitChange();
          });

          const text = document.createElement('span');
          text.textContent = choice.label;

          itemWrap.appendChild(checkbox);
          itemWrap.appendChild(text);
          listContainer.appendChild(itemWrap);
        });
      };

      selectAllCheck.addEventListener('change', () => {
        const visibleChecks = [...listContainer.querySelectorAll('.ag-filter-checkbox')];
        visibleChecks.forEach((checkbox) => {
          checkbox.checked = selectAllCheck.checked;
          if (selectAllCheck.checked) {
            selectedValues.add(checkbox.value);
          } else {
            selectedValues.delete(checkbox.value);
          }
        });
        commitChange();
      });

      searchInput.addEventListener('input', () => {
        renderList(searchInput.value);
        updateSelectAllState();
      });

      renderList();
      updateSelectAllState();
      popover.appendChild(container);
    }

    const actions = document.createElement('div');
    actions.className = 'ag-header-filter-actions';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'ag-header-filter-action';
    clearButton.textContent = this._getLocaleText('sidePanel.clearFilter', 'Clear');
    clearButton.addEventListener('click', () => {
      this._options.onColumnFilterClear?.(colId);
      this._closeFilterPopover();
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'ag-header-filter-action';
    closeButton.textContent = this._getLocaleText('sidePanel.close', 'Close');
    closeButton.addEventListener('click', () => {
      this._closeFilterPopover();
    });

    actions.appendChild(clearButton);
    actions.appendChild(closeButton);
    popover.appendChild(actions);

    document.body.appendChild(popover);
    this._filterPopover = { element: popover, trigger, anchorCell, colId, def };
    document.addEventListener('pointerdown', this._handleDocumentPointerDown);
    document.addEventListener('keydown', this._handleDocumentPointerDown);
    window.addEventListener('resize', this._handleViewportReposition);
    window.addEventListener('scroll', this._handleViewportReposition, true);
    this._positionFilterPopover();
    queueMicrotask(() => {
      const firstFocusable = popover.querySelector('input, select, button');
      if (firstFocusable instanceof HTMLElement) {
        firstFocusable.focus();
      }
    });
  }

  _syncOpenFilterPopover() {
    if (!this._openFilterColId || !this._filterPopover) {
      return;
    }

    const anchorCell = this._dom.getRoot()?.querySelector(`.ag-header-cell[data-col-id="${this._openFilterColId}"]`);
    if (!anchorCell) {
      this._closeFilterPopover();
      return;
    }

    this._filterPopover.anchorCell = anchorCell;
    this._positionFilterPopover();
  }

  _positionFilterPopover() {
    if (!this._filterPopover?.element || !this._filterPopover.anchorCell) {
      return;
    }

    const rect = this._filterPopover.anchorCell.getBoundingClientRect();
    const popover = this._filterPopover.element;
    const top = rect.bottom + window.scrollY + 8;
    const left = Math.max(12, Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - popover.offsetWidth - 12));
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  _handleDocumentPointerDown(event) {
    if (!this._filterPopover) {
      return;
    }

    if (event instanceof KeyboardEvent) {
      if (event.key === 'Escape') {
        this._closeFilterPopover({ restoreFocus: true });
      }
      return;
    }

    const target = event.target;
    if (this._filterPopover.element.contains(target) || this._filterPopover.trigger?.contains(target)) {
      return;
    }

    this._closeFilterPopover();
  }

  _closeFilterPopover(options = {}) {
    document.removeEventListener('pointerdown', this._handleDocumentPointerDown);
    document.removeEventListener('keydown', this._handleDocumentPointerDown);
    window.removeEventListener('resize', this._handleViewportReposition);
    window.removeEventListener('scroll', this._handleViewportReposition, true);
    const trigger = this._filterPopover?.trigger;
    if (this._filterPopover?.element) {
      this._filterPopover.element.remove();
    }
    this._filterPopover = null;
    if (!options.preserveOpenId) {
      this._openFilterColId = null;
    }
    if (options.restoreFocus && trigger instanceof HTMLElement) {
      trigger.focus();
    }
  }

  _createFilterEditor(meta, operator, value, onCommit) {
    if (operator === 'between') {
      const wrap = document.createElement('div');
      wrap.className = 'ag-header-filter-split';

      const startInput = this._createFilterInput(meta, Array.isArray(value) ? value[0] ?? '' : '', () => {
        onCommit([startInput.value, endInput.value]);
      });
      const endInput = this._createFilterInput(meta, Array.isArray(value) ? value[1] ?? '' : '', () => {
        onCommit([startInput.value, endInput.value]);
      });
      startInput.placeholder = this._getLocaleText('sidePanel.rangeStart', 'From');
      endInput.placeholder = this._getLocaleText('sidePanel.rangeEnd', 'To');
      wrap.appendChild(startInput);
      wrap.appendChild(endInput);
      return wrap;
    }

    const input = this._createFilterInput(meta, Array.isArray(value) ? value[0] ?? '' : value ?? '', () => {
      onCommit(input.value);
    });
    return input;
  }

  _createFilterInput(meta, value, onCommit) {
    const input = document.createElement('input');
    input.className = 'ag-header-filter-input';
    input.type = meta.inputType;
    input.value = value ?? '';
    input.placeholder = meta.placeholder;

    let timer = null;
    const commit = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(onCommit, meta.inputType === 'search' ? 140 : 0);
    };

    input.addEventListener(meta.inputType === 'search' ? 'input' : 'change', commit);
    if (meta.inputType !== 'search') {
      input.addEventListener('input', commit);
    }
    return input;
  }

  _resolveFilterMeta(def, colId) {
    const type = def.filterType ?? (Array.isArray(def.filterOptions) && def.filterOptions.length > 0
      ? 'select'
      : def.type === 'number' || def.type === 'date'
        ? def.type
        : 'text');
    const operators = Array.isArray(def.filterOperators) && def.filterOperators.length > 0
      ? def.filterOperators
      : this._getDefaultOperators(type);

    return {
      type,
      operators,
      defaultOperator: operators[0],
      multiple: def.filterMultiple ?? true,
      inputType: type === 'number' ? 'number' : type === 'date' ? 'date' : 'search',
      placeholder: def.filterPlaceholder ?? this._getLocaleText('sidePanel.filterPlaceholder', 'Filter {label}', {
        label: def.headerName,
      }),
      choices: type === 'select' || type === 'set' ? (this._options.getColumnFilterChoices?.(colId) ?? []) : [],
    };
  }

  _getDefaultOperators(type) {
    switch (type) {
      case 'number':
        return ['equals', 'notEquals', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'between'];
      case 'date':
        return ['equals', 'notEquals', 'before', 'after', 'between'];
      case 'select':
      case 'set':
        return ['in'];
      default:
        return ['contains', 'startsWith', 'endsWith', 'equals', 'notContains', 'notEquals'];
    }
  }

  _getOperatorLabel(operator) {
    const labels = {
      contains: this._getLocaleText('sidePanel.operators.contains', 'Contains'),
      startsWith: this._getLocaleText('sidePanel.operators.startsWith', 'Starts With'),
      endsWith: this._getLocaleText('sidePanel.operators.endsWith', 'Ends With'),
      equals: this._getLocaleText('sidePanel.operators.equals', 'Equals'),
      notEquals: this._getLocaleText('sidePanel.operators.notEquals', 'Does Not Equal'),
      notContains: this._getLocaleText('sidePanel.operators.notContains', 'Does Not Contain'),
      greaterThan: this._getLocaleText('sidePanel.operators.greaterThan', 'Greater Than'),
      greaterThanOrEqual: this._getLocaleText('sidePanel.operators.greaterThanOrEqual', 'Greater Or Equal'),
      lessThan: this._getLocaleText('sidePanel.operators.lessThan', 'Less Than'),
      lessThanOrEqual: this._getLocaleText('sidePanel.operators.lessThanOrEqual', 'Less Or Equal'),
      before: this._getLocaleText('sidePanel.operators.before', 'Before'),
      after: this._getLocaleText('sidePanel.operators.after', 'After'),
      between: this._getLocaleText('sidePanel.operators.between', 'Between'),
      in: this._getLocaleText('sidePanel.operators.in', 'Includes'),
    };
    return labels[operator] ?? operator;
  }

  _createFilterIcon() {
    const span = document.createElement('span');
    span.className = 'ag-icon';
    span.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" style="display: block; fill: currentColor;">
        <path d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z" />
      </svg>
    `;
    return span;
  }

  _getVisibleColumnIndex(colId) {
    const columns = this._columnModel.getVisibleLeafColumns();
    return columns.findIndex((column) => column.def.id === colId);
  }

  _getLocaleText(key, fallback, params = {}) {
    const getter = this._options.getLocaleText;
    if (typeof getter !== 'function') {
      return fallback;
    }
    return getter(key, fallback, params);
  }

  _showHeaderContextMenu(colId, def, event) {
    this._closeHeaderContextMenu();

    const menu = document.createElement('div');
    menu.className = 'ag-context-menu ag-header-context-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    const addItem = (label, action, disabled = false) => {
      const item = document.createElement('div');
      item.className = 'ag-context-menu-item' + (disabled ? ' ag-context-menu-item-disabled' : '');
      item.textContent = label;
      if (!disabled) {
        item.addEventListener('click', () => {
          this._closeHeaderContextMenu();
          action();
        });
      }
      menu.appendChild(item);
    };

    const addSep = () => {
      const sep = document.createElement('div');
      sep.className = 'ag-context-menu-separator';
      menu.appendChild(sep);
    };

    const t = (key, fb) => this._getLocaleText(key, fb);

    // 정렬
    if (def.sortable !== false) {
      addItem(t('grid.header.menu.sortAsc', 'Sort Ascending'), () =>
        this._options.onSortClick?.({ colId, field: def.field, def, multiSort: false, direction: 'asc' })
      );
      addItem(t('grid.header.menu.sortDesc', 'Sort Descending'), () =>
        this._options.onSortClick?.({ colId, field: def.field, def, multiSort: false, direction: 'desc' })
      );
      addItem(t('grid.header.menu.clearSort', 'Clear Sort'), () =>
        this._options.onClearSort?.(colId)
      );
      addSep();
    }

    // 자동 크기 조정
    addItem(t('grid.header.menu.autoSize', 'Auto-size Column'), () =>
      this._options.onAutoSizeColumn?.(colId)
    );
    addItem(t('grid.header.menu.autoSizeAll', 'Auto-size All Columns'), () =>
      this._options.onAutoSizeAllColumns?.()
    );
    addSep();

    // 핀 고정
    const state = this._columnModel.getState(colId);
    if (state?.pinned !== 'left') {
      addItem(t('grid.header.menu.pinLeft', 'Pin Left'), () =>
        this._options.onColumnPin?.(colId, 'left')
      );
    }
    if (state?.pinned !== 'right') {
      addItem(t('grid.header.menu.pinRight', 'Pin Right'), () =>
        this._options.onColumnPin?.(colId, 'right')
      );
    }
    if (state?.pinned) {
      addItem(t('grid.header.menu.unpin', 'Unpin'), () =>
        this._options.onColumnPin?.(colId, null)
      );
    }
    addSep();

    // 컬럼 숨기기
    addItem(t('grid.header.menu.hideColumn', 'Hide Column'), () =>
      this._options.onColumnVisibilityChange?.(colId, false)
    );

    document.body.appendChild(menu);
    this._activeHeaderContextMenu = menu;

    const dismiss = (e) => {
      if (!menu.contains(e.target)) {
        this._closeHeaderContextMenu();
        document.removeEventListener('pointerdown', dismiss, true);
      }
    };
    document.addEventListener('pointerdown', dismiss, true);
    this._dismissHeaderContextMenu = dismiss;
  }

  _closeHeaderContextMenu() {
    if (this._activeHeaderContextMenu) {
      this._activeHeaderContextMenu.remove();
      this._activeHeaderContextMenu = null;
    }
    if (this._dismissHeaderContextMenu) {
      document.removeEventListener('pointerdown', this._dismissHeaderContextMenu, true);
      this._dismissHeaderContextMenu = null;
    }
  }

  destroy() {
    this._closeFilterPopover();
    this._closeHeaderContextMenu();
    this._teardownResize();
  }
}
