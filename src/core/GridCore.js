import { EventBus } from './EventBus.js';
import { DataStore } from './DataStore.js';
import { ViewModel } from './ViewModel.js';
import { WorkerBridge } from './WorkerBridge.js';
import { HeaderModel } from './HeaderModel.js';
import { ColumnRegistry } from './ColumnRegistry.js';
import { Pipeline } from './Pipeline.js';
import { SortManager } from '../managers/SortManager.js';
import { FilterManager } from '../managers/FilterManager.js';
import { SelectionManager } from '../managers/SelectionManager.js';
import { VirtualScrollManager } from '../managers/VirtualScrollManager.js';
import { DOMRenderer } from '../renderer/DOMRenderer.js';
import { HeaderRenderer } from '../renderer/HeaderRenderer.js';
import { BodyRenderer } from '../renderer/BodyRenderer.js';

export class GridCore {
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('[GridCore] A valid container element is required.');
    }

    this._container = container;
    this._options = options;
    this._events = new EventBus();
    this._renderVersion = 0;
    this._destroyed = false;

    this._getRowKey = this._createRowKeyGetter(options.rowKey);

    this._columns = new ColumnRegistry(options.columns ?? [], options.columnState ?? {});
    this._headerModel = new HeaderModel(this._columns.getModel());
    this._viewModel = new ViewModel({
      rowHeight: options.rowHeight ?? 36,
      overscanTop: options.overscanTop ?? 4,
      overscanBottom: options.overscanBottom ?? 6,
    });

    this._sortManager = new SortManager({
      onChanged: () => {
        this._emitStateChanged('sort');
        void this.refresh();
      },
    });

    this._filterManager = new FilterManager({
      onChanged: () => {
        this._emitStateChanged('filter');
        void this.refresh();
      },
    });

    this._selectionManager = new SelectionManager({
      mode: options.selectionMode ?? 'multiple',
      onChanged: (payload) => {
        this._events.emit('selection-change', payload);
        options.onSelectionChange?.(payload);
      },
    });

    const workerEnabled = Boolean(options.worker?.enabled && options.worker?.url);
    this._workerBridge = new WorkerBridge({
      enabled: workerEnabled,
      workerUrl: options.worker?.url,
      timeout: options.worker?.timeout ?? 10000,
    });

    this._pipeline = new Pipeline({
      sortManager: this._sortManager,
      filterManager: this._filterManager,
      workerBridge: this._workerBridge,
      getRowKey: this._getRowKey,
    });

    this._dom = new DOMRenderer(container, options);
    this._dom.build();

    this._headerRenderer = new HeaderRenderer(
      this._dom,
      this._headerModel,
      this._columns.getModel(),
      {
        sortManager: this._sortManager,
        onSortClick: ({ field, def, multiSort }) => {
          if (multiSort) {
            this._sortManager.addSort(field, def);
          } else {
            this._sortManager.toggleSort(field, def);
          }
        },
      }
    );

    this._bodyRenderer = new BodyRenderer(
      this._dom,
      this._columns.getModel(),
      this._viewModel,
      {
        selectionManager: this._selectionManager,
        onRowClick: ({ row, event }) => {
          if (options.selectable !== false) {
            if (event.shiftKey) {
              this._selectionManager.shiftSelect(row._rowKey);
            } else {
              this._selectionManager.toggleRow(row._rowKey);
            }
            void this.refresh();
          }

          this._events.emit('row-click', { row, event });
          options.onRowClick?.({ row, event });
        },
        onCellClick: (payload) => {
          this._events.emit('cell-click', payload);
          options.onCellClick?.(payload);
        },
      }
    );

    this._virtualScrollManager = new VirtualScrollManager(this._viewModel, {
      onRangeChanged: (range) => {
        if (this._displayRows) {
          this._bodyRenderer.render(this._displayRows, range);
        }
      },
    });

    this._virtualScrollManager.mount(
      this._dom.getBodyViewport(),
      this._dom.getHeaderCenterViewport()
    );

    this._dataStore = new DataStore({
      rowKey: options.rowKey ?? 'id',
      onChanged: () => {
        void this.refresh();
      },
    });

    this._displayRows = [];

    if (Array.isArray(options.rows)) {
      this._dataStore.setData(options.rows);
    } else {
      void this.refresh();
    }
  }

  async refresh() {
    if (this._destroyed) return;

    const version = ++this._renderVersion;
    const rows = await this._pipeline.process(this._dataStore.getAll());
    if (this._destroyed || version !== this._renderVersion) return;

    this._displayRows = rows;
    this._selectionManager.setCurrentRows(rows);
    this._viewModel.setTotalCount(rows.length);
    this._headerModel.rebuild();

    this._syncColumnWidths();
    this._headerRenderer.render();
    this._headerRenderer.updateSortIndicators();

    if (rows.length === 0) {
      this._bodyRenderer.clear();
      this._dom.showEmpty(this._options.emptyMessage ?? 'No rows to display.');
    } else {
      this._dom.hideOverlay();
      this._bodyRenderer.render(rows, this._viewModel.getVerticalRange());
    }

    this._events.emit('render', {
      rows,
      totalCount: rows.length,
    });
  }

  setRows(rows) {
    this._dataStore.setData(Array.isArray(rows) ? rows : []);
  }

  setData(rows) {
    this.setRows(rows);
  }

  setColumns(columns) {
    this._columns.setColumns(columns, true);
    this._headerModel.rebuild();
    this._syncColumnWidths();
    void this.refresh();
  }

  setQuickFilter(text, fields = []) {
    this._filterManager.setQuickFilter(text, fields);
  }

  clearFilters() {
    this._filterManager.clearAllFilters();
  }

  sortBy(defs) {
    this._sortManager.setSort(defs);
  }

  clearSort() {
    this._sortManager.clearSort();
  }

  on(eventName, handler, options) {
    return this._events.on(eventName, handler, options);
  }

  getSelectedKeys() {
    return this._selectionManager.getSelectedKeys();
  }

  destroy() {
    this._destroyed = true;
    this._virtualScrollManager.destroy();
    this._bodyRenderer.destroy();
    this._headerRenderer.destroy();
    this._dom.destroy();
    this._dataStore.destroy();
    this._selectionManager.destroy();
    this._filterManager.destroy();
    this._sortManager.destroy();
    this._workerBridge.destroy();
    this._columns.destroy();
    this._headerModel.destroy();
    this._viewModel.destroy();
    this._events.destroy();
  }

  _syncColumnWidths() {
    this._dom.updateColumnWidths(this._columns.getPinnedWidths());
  }

  _emitStateChanged(type) {
    this._events.emit('state-change', { type });
  }

  _createRowKeyGetter(rowKey) {
    if (typeof rowKey === 'function') {
      return rowKey;
    }

    const field = rowKey ?? 'id';
    return (row, index) => {
      const value = row?.[field];
      return value == null ? String(index) : String(value);
    };
  }
}
