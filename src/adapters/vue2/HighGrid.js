import { createGrid } from '../../index.js';

export default {
  name: 'HighGrid',
  props: {
    rows:                   { type: Array,              default: () => [] },
    columns:                { type: Array,              default: () => [] },
    rowKey:                 { type: [String, Function], default: 'id' },
    rowHeight:              { type: Number,             default: undefined },
    getRowHeight:           { type: Function,           default: undefined },
    variableRowHeight:      { type: Boolean,            default: false },
    selectable:             { type: Boolean,            default: undefined },
    selectionMode:          { type: String,             default: undefined },
    isRowSelectable:        { type: Function,           default: undefined },
    rowDragging:            { type: Boolean,            default: false },
    displayMode:            { type: String,             default: 'client' },
    tableId:                { type: String,             default: undefined },
    availablePlugins:       { type: Array,              default: undefined },
    plugins:                { type: Array,              default: undefined },
    sidePanel:              { type: Object,             default: undefined },
    pagination:             { type: Object,             default: undefined },
    infiniteScroll:         { type: Object,             default: undefined },
    liveUpdates:            { type: Object,             default: undefined },
    editing:                { type: Object,             default: undefined },
    tree:                   { type: Object,             default: undefined },
    masterDetail:           { type: Object,             default: undefined },
    statusBar:              { type: Object,             default: undefined },
    worker:                 { type: Object,             default: undefined },
    hooks:                  { type: Object,             default: undefined },
    pinnedTopRows:          { type: Array,              default: undefined },
    pinnedBottomRows:       { type: Array,              default: undefined },
    getRowClassName:        { type: Function,           default: undefined },
    getRowStyle:            { type: Function,           default: undefined },
    emptyMessage:           { type: String,             default: undefined },
    columnState:            { type: Object,             default: undefined },
    columnStatePersistence: { type: Object,             default: undefined },
    overscanTop:            { type: Number,             default: undefined },
    overscanBottom:         { type: Number,             default: undefined },
    horizontalOverscan:     { type: Number,             default: undefined },
  },
  data() {
    return {
      grid: null,
    };
  },
  watch: {
    rows(v) {
      this.grid?.setRows(v);
    },
    columns(v) {
      this.grid?.setColumns(v);
    },
    pinnedTopRows(v) {
      this.grid?.setPinnedTopRows(v);
    },
    pinnedBottomRows(v) {
      this.grid?.setPinnedBottomRows(v);
    },
  },
  mounted() {
    const options = this.buildOptions();
    const g = createGrid(this.$refs.el, options);
    this.grid = g;

    g.on('row-click',               (p) => this.$emit('row-click', p));
    g.on('cell-click',              (p) => this.$emit('cell-click', p));
    g.on('cell-dblclick',           (p) => this.$emit('cell-dblclick', p));
    g.on('row-contextmenu',         (p) => this.$emit('row-contextmenu', p));
    g.on('cell-contextmenu',        (p) => this.$emit('cell-contextmenu', p));
    g.on('selection-change',        (p) => this.$emit('selection-change', p));
    g.on('group-toggle',            (p) => this.$emit('group-toggle', p));
    g.on('tree-toggle',             (p) => this.$emit('tree-toggle', p));
    g.on('row-drag-start',          (p) => this.$emit('row-drag-start', p));
    g.on('row-drag-end',            (p) => this.$emit('row-drag-end', p));
    g.on('row-reorder',             (p) => this.$emit('row-reorder', p));
    g.on('range-selection-change',  (p) => this.$emit('range-selection-change', p));
    g.on('detail-toggle',           (p) => this.$emit('detail-toggle', p));
    g.on('cell-value-change',       (p) => this.$emit('cell-value-change', p));
    g.on('render',                  (p) => this.$emit('render', p));
    g.on('state-change',            (p) => this.$emit('state-change', p));

    this.$emit('ready', g);
  },
  beforeDestroy() {
    this.grid?.destroy();
    this.grid = null;
  },
  methods: {
    buildOptions() {
      const raw = {};
      const set = (key, val) => { if (val !== undefined) raw[key] = val; };

      set('rows',                   this.rows);
      set('columns',                this.columns);
      set('rowKey',                 this.rowKey);
      set('rowHeight',              this.rowHeight);
      set('getRowHeight',           this.getRowHeight);
      set('variableRowHeight',      this.variableRowHeight);
      set('selectable',             this.selectable);
      set('selectionMode',          this.selectionMode);
      set('isRowSelectable',        this.isRowSelectable);
      set('rowDragging',            this.rowDragging);
      set('displayMode',            this.displayMode);
      set('tableId',                this.tableId);
      set('availablePlugins',       this.availablePlugins);
      set('plugins',                this.plugins);
      set('sidePanel',              this.sidePanel);
      set('pagination',             this.pagination);
      set('infiniteScroll',         this.infiniteScroll);
      set('liveUpdates',            this.liveUpdates);
      set('editing',                this.editing);
      set('tree',                   this.tree);
      set('masterDetail',           this.masterDetail);
      set('statusBar',              this.statusBar);
      set('worker',                 this.worker);
      set('hooks',                  this.hooks);
      set('pinnedTopRows',          this.pinnedTopRows);
      set('pinnedBottomRows',       this.pinnedBottomRows);
      set('getRowClassName',        this.getRowClassName);
      set('getRowStyle',            this.getRowStyle);
      set('emptyMessage',           this.emptyMessage);
      set('columnState',            this.columnState);
      set('columnStatePersistence', this.columnStatePersistence);
      set('overscanTop',            this.overscanTop);
      set('overscanBottom',         this.overscanBottom);
      set('horizontalOverscan',     this.horizontalOverscan);

      return raw;
    },

    refresh(...a)            { return this.grid?.refresh(...a); },
    setRows(...a)            { return this.grid?.setRows(...a); },
    appendRows(...a)         { return this.grid?.appendRows(...a); },
    updateRows(...a)         { return this.grid?.updateRows(...a); },
    patchRow(...a)           { return this.grid?.patchRow(...a); },
    upsertRows(...a)         { return this.grid?.upsertRows(...a); },
    removeRows(...a)         { return this.grid?.removeRows(...a); },
    setColumns(...a)         { return this.grid?.setColumns(...a); },
    setColumnWidth(...a)     { return this.grid?.setColumnWidth(...a); },
    setColumnVisible(...a)   { return this.grid?.setColumnVisible(...a); },
    setColumnPinned(...a)    { return this.grid?.setColumnPinned(...a); },
    moveColumn(...a)         { return this.grid?.moveColumn(...a); },
    autoSizeColumn(...a)     { return this.grid?.autoSizeColumn(...a); },
    autoSizeAllColumns()     { return this.grid?.autoSizeAllColumns(); },
    setQuickFilter(...a)     { return this.grid?.setQuickFilter(...a); },
    setColumnFilter(...a)    { return this.grid?.setColumnFilter(...a); },
    clearColumnFilter(...a)  { return this.grid?.clearColumnFilter(...a); },
    clearFilters()           { return this.grid?.clearFilters(); },
    setAdvancedFilter(...a)  { return this.grid?.setAdvancedFilter(...a); },
    clearAdvancedFilter()    { return this.grid?.clearAdvancedFilter(); },
    sortBy(...a)             { return this.grid?.sortBy(...a); },
    clearSort()              { return this.grid?.clearSort(); },
    enableGrouping(...a)     { return this.grid?.enableGrouping(...a); },
    disableGrouping()        { return this.grid?.disableGrouping(); },
    isGroupingEnabled()      { return this.grid?.isGroupingEnabled(); },
    toggleGroup(...a)        { return this.grid?.toggleGroup(...a); },
    enableTree(...a)         { return this.grid?.enableTree(...a); },
    disableTree()            { return this.grid?.disableTree(); },
    isTreeEnabled()          { return this.grid?.isTreeEnabled(); },
    toggleTreeRow(...a)      { return this.grid?.toggleTreeRow(...a); },
    expandAllTree()          { return this.grid?.expandAllTree(); },
    collapseAllTree()        { return this.grid?.collapseAllTree(); },
    setPage(...a)            { return this.grid?.setPage(...a); },
    nextPage()               { return this.grid?.nextPage(); },
    prevPage()               { return this.grid?.prevPage(); },
    setPageSize(...a)        { return this.grid?.setPageSize(...a); },
    toggleSelectAll()        { return this.grid?.toggleSelectAll(); },
    setRowSelected(...a)     { return this.grid?.setRowSelected(...a); },
    getSelectedKeys()        { return this.grid?.getSelectedKeys(); },
    getSelectedRows()        { return this.grid?.getSelectedRows(); },
    getSelectionState()      { return this.grid?.getSelectionState(); },
    liveAddRows(...a)        { return this.grid?.liveAddRows(...a); },
    liveUpdateRows(...a)     { return this.grid?.liveUpdateRows(...a); },
    livePatchRow(...a)       { return this.grid?.livePatchRow(...a); },
    liveUpsertRows(...a)     { return this.grid?.liveUpsertRows(...a); },
    liveRemoveRows(...a)     { return this.grid?.liveRemoveRows(...a); },
    pauseLiveUpdates()       { return this.grid?.pauseLiveUpdates(); },
    resumeLiveUpdates()      { return this.grid?.resumeLiveUpdates(); },
    beginCellEdit(...a)      { return this.grid?.beginCellEdit(...a); },
    setCellValue(...a)       { return this.grid?.setCellValue(...a); },
    undo()                   { return this.grid?.undo(); },
    redo()                   { return this.grid?.redo(); },
    canUndo()                { return this.grid?.canUndo(); },
    canRedo()                { return this.grid?.canRedo(); },
    moveRow(...a)            { return this.grid?.moveRow(...a); },
    setPinnedTopRows(...a)   { return this.grid?.setPinnedTopRows(...a); },
    setPinnedBottomRows(...a){ return this.grid?.setPinnedBottomRows(...a); },
    toggleDetail(...a)       { return this.grid?.toggleDetail(...a); },
    isDetailExpanded(...a)   { return this.grid?.isDetailExpanded(...a); },
    setColumnAggregate(...a) { return this.grid?.setColumnAggregate(...a); },
    clearColumnAggregate(...a){ return this.grid?.clearColumnAggregate(...a); },
    getAggregateResult()     { return this.grid?.getAggregateResult(); },
    clearRangeSelection()    { return this.grid?.clearRangeSelection(); },
    copyRangeToClipboard()   { return this.grid?.copyRangeToClipboard(); },
    enablePivot(...a)        { return this.grid?.enablePivot(...a); },
    disablePivot()           { return this.grid?.disablePivot(); },
    isPivotEnabled()         { return this.grid?.isPivotEnabled(); },
    exportCsv(...a)          { return this.grid?.exportCsv(...a); },
    downloadCsv(...a)        { return this.grid?.downloadCsv(...a); },
    downloadExcel(...a)      { return this.grid?.downloadExcel(...a); },
    downloadXlsx(...a)       { return this.grid?.downloadXlsx?.(...a); },
    printGrid()              { return this.grid?.printGrid(); },
    setLocale(...a)          { return this.grid?.setLocale(...a); },
    usePlugin(...a)          { return this.grid?.usePlugin(...a); },
    unusePlugin(...a)        { return this.grid?.unusePlugin(...a); },
    on(...a)                 { return this.grid?.on(...a); },
    getColumnState()         { return this.grid?.getColumnState(); },
    getPaginationState()     { return this.grid?.getPaginationState(); },
    getFilterState()         { return this.grid?.getFilterState(); },
    getGroupingState()       { return this.grid?.getGroupingState(); },
    getTreeState()           { return this.grid?.getTreeState(); },
    getRows()                { return this.grid?.getRows(); },
    getFlatRows()            { return this.grid?.getFlatRows(); },
    getAllLeafColumns()      { return this.grid?.getAllLeafColumns(); },
    getVisibleLeafColumns()  { return this.grid?.getVisibleLeafColumns(); },
    destroy()                { return this.grid?.destroy(); },
  },
  render(h) {
    return h('div', { ref: 'el' });
  },
};
