<template>
  <div ref="el" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, toRaw } from 'vue';
import { createGrid } from '../../index.js';

const props = defineProps({
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
});

const emit = defineEmits([
  'ready',
  'row-click',
  'cell-click',
  'cell-dblclick',
  'row-contextmenu',
  'cell-contextmenu',
  'selection-change',
  'group-toggle',
  'tree-toggle',
  'row-drag-start',
  'row-drag-end',
  'row-reorder',
  'range-selection-change',
  'detail-toggle',
  'cell-value-change',
  'render',
  'state-change',
]);

const el = ref(null);
const grid = shallowRef(null);

function buildOptions() {
  const raw = {};
  const set = (key, val) => { if (val !== undefined) raw[key] = toRaw(val); };

  set('rows',                   props.rows);
  set('columns',                props.columns);
  set('rowKey',                 props.rowKey);
  set('rowHeight',              props.rowHeight);
  set('getRowHeight',           props.getRowHeight);
  set('variableRowHeight',      props.variableRowHeight);
  set('selectable',             props.selectable);
  set('selectionMode',          props.selectionMode);
  set('isRowSelectable',        props.isRowSelectable);
  set('rowDragging',            props.rowDragging);
  set('displayMode',            props.displayMode);
  set('tableId',                props.tableId);
  set('availablePlugins',       props.availablePlugins);
  set('plugins',                props.plugins);
  set('sidePanel',              props.sidePanel);
  set('pagination',             props.pagination);
  set('infiniteScroll',         props.infiniteScroll);
  set('liveUpdates',            props.liveUpdates);
  set('editing',                props.editing);
  set('tree',                   props.tree);
  set('masterDetail',           props.masterDetail);
  set('statusBar',              props.statusBar);
  set('worker',                 props.worker);
  set('hooks',                  props.hooks);
  set('pinnedTopRows',          props.pinnedTopRows);
  set('pinnedBottomRows',       props.pinnedBottomRows);
  set('getRowClassName',        props.getRowClassName);
  set('getRowStyle',            props.getRowStyle);
  set('emptyMessage',           props.emptyMessage);
  set('columnState',            props.columnState);
  set('columnStatePersistence', props.columnStatePersistence);
  set('overscanTop',            props.overscanTop);
  set('overscanBottom',         props.overscanBottom);
  set('horizontalOverscan',     props.horizontalOverscan);

  return raw;
}

onMounted(() => {
  const g = createGrid(el.value, buildOptions());
  grid.value = g;

  g.on('row-click',               (p) => emit('row-click', p));
  g.on('cell-click',              (p) => emit('cell-click', p));
  g.on('cell-dblclick',           (p) => emit('cell-dblclick', p));
  g.on('row-contextmenu',         (p) => emit('row-contextmenu', p));
  g.on('cell-contextmenu',        (p) => emit('cell-contextmenu', p));
  g.on('selection-change',        (p) => emit('selection-change', p));
  g.on('group-toggle',            (p) => emit('group-toggle', p));
  g.on('tree-toggle',             (p) => emit('tree-toggle', p));
  g.on('row-drag-start',          (p) => emit('row-drag-start', p));
  g.on('row-drag-end',            (p) => emit('row-drag-end', p));
  g.on('row-reorder',             (p) => emit('row-reorder', p));
  g.on('range-selection-change',  (p) => emit('range-selection-change', p));
  g.on('detail-toggle',           (p) => emit('detail-toggle', p));
  g.on('cell-value-change',       (p) => emit('cell-value-change', p));
  g.on('render',                  (p) => emit('render', p));
  g.on('state-change',            (p) => emit('state-change', p));

  emit('ready', g);
});

watch(() => props.rows,           (v) => grid.value?.setRows(toRaw(v)),           { deep: false });
watch(() => props.columns,        (v) => grid.value?.setColumns(toRaw(v)),        { deep: false });
watch(() => props.pinnedTopRows,  (v) => grid.value?.setPinnedTopRows(toRaw(v)),  { deep: false });
watch(() => props.pinnedBottomRows,(v) => grid.value?.setPinnedBottomRows(toRaw(v)),{ deep: false });

onBeforeUnmount(() => {
  grid.value?.destroy();
  grid.value = null;
});

defineExpose({
  grid,

  // Data
  refresh:            (...a) => grid.value?.refresh(...a),
  setRows:            (...a) => grid.value?.setRows(...a),
  appendRows:         (...a) => grid.value?.appendRows(...a),
  updateRows:         (...a) => grid.value?.updateRows(...a),
  patchRow:           (...a) => grid.value?.patchRow(...a),
  upsertRows:         (...a) => grid.value?.upsertRows(...a),
  removeRows:         (...a) => grid.value?.removeRows(...a),

  // Columns
  setColumns:         (...a) => grid.value?.setColumns(...a),
  setColumnWidth:     (...a) => grid.value?.setColumnWidth(...a),
  setColumnVisible:   (...a) => grid.value?.setColumnVisible(...a),
  setColumnPinned:    (...a) => grid.value?.setColumnPinned(...a),
  moveColumn:         (...a) => grid.value?.moveColumn(...a),
  autoSizeColumn:     (...a) => grid.value?.autoSizeColumn(...a),
  autoSizeAllColumns: ()     => grid.value?.autoSizeAllColumns(),

  // Filter
  setQuickFilter:     (...a) => grid.value?.setQuickFilter(...a),
  setColumnFilter:    (...a) => grid.value?.setColumnFilter(...a),
  clearColumnFilter:  (...a) => grid.value?.clearColumnFilter(...a),
  clearFilters:       ()     => grid.value?.clearFilters(),
  setAdvancedFilter:  (...a) => grid.value?.setAdvancedFilter(...a),
  clearAdvancedFilter:()     => grid.value?.clearAdvancedFilter(),

  // Sort
  sortBy:             (...a) => grid.value?.sortBy(...a),
  clearSort:          ()     => grid.value?.clearSort(),

  // Grouping
  enableGrouping:     (...a) => grid.value?.enableGrouping(...a),
  disableGrouping:    ()     => grid.value?.disableGrouping(),
  toggleGroup:        (...a) => grid.value?.toggleGroup(...a),

  // Tree
  enableTree:         (...a) => grid.value?.enableTree(...a),
  disableTree:        ()     => grid.value?.disableTree(),
  toggleTreeRow:      (...a) => grid.value?.toggleTreeRow(...a),
  expandAllTree:      ()     => grid.value?.expandAllTree(),
  collapseAllTree:    ()     => grid.value?.collapseAllTree(),

  // Pagination
  setPage:            (...a) => grid.value?.setPage(...a),
  nextPage:           ()     => grid.value?.nextPage(),
  prevPage:           ()     => grid.value?.prevPage(),
  setPageSize:        (...a) => grid.value?.setPageSize(...a),

  // Selection
  toggleSelectAll:    ()     => grid.value?.toggleSelectAll(),
  setRowSelected:     (...a) => grid.value?.setRowSelected(...a),
  getSelectedKeys:    ()     => grid.value?.getSelectedKeys(),
  getSelectionState:  ()     => grid.value?.getSelectionState(),

  // Live updates
  liveAddRows:        (...a) => grid.value?.liveAddRows(...a),
  liveUpdateRows:     (...a) => grid.value?.liveUpdateRows(...a),
  livePatchRow:       (...a) => grid.value?.livePatchRow(...a),
  liveUpsertRows:     (...a) => grid.value?.liveUpsertRows(...a),
  liveRemoveRows:     (...a) => grid.value?.liveRemoveRows(...a),
  pauseLiveUpdates:   ()     => grid.value?.pauseLiveUpdates(),
  resumeLiveUpdates:  ()     => grid.value?.resumeLiveUpdates(),

  // Editing
  beginCellEdit:      (...a) => grid.value?.beginCellEdit(...a),
  setCellValue:       (...a) => grid.value?.setCellValue(...a),

  // Undo/Redo
  undo:               ()     => grid.value?.undo(),
  redo:               ()     => grid.value?.redo(),
  canUndo:            ()     => grid.value?.canUndo(),
  canRedo:            ()     => grid.value?.canRedo(),

  // Row features
  moveRow:            (...a) => grid.value?.moveRow(...a),
  setPinnedTopRows:   (...a) => grid.value?.setPinnedTopRows(...a),
  setPinnedBottomRows:(...a) => grid.value?.setPinnedBottomRows(...a),
  toggleDetail:       (...a) => grid.value?.toggleDetail(...a),
  isDetailExpanded:   (...a) => grid.value?.isDetailExpanded(...a),

  // Aggregate
  setColumnAggregate: (...a) => grid.value?.setColumnAggregate(...a),
  clearColumnAggregate:(...a)=> grid.value?.clearColumnAggregate(...a),
  getAggregateResult: ()     => grid.value?.getAggregateResult(),

  // Range selection
  clearRangeSelection:()     => grid.value?.clearRangeSelection(),
  copyRangeToClipboard:()    => grid.value?.copyRangeToClipboard(),

  // Pivot
  enablePivot:        (...a) => grid.value?.enablePivot(...a),
  disablePivot:       ()     => grid.value?.disablePivot(),

  // Export
  exportCsv:          (...a) => grid.value?.exportCsv(...a),
  downloadCsv:        (...a) => grid.value?.downloadCsv(...a),
  downloadExcel:      (...a) => grid.value?.downloadExcel(...a),
  downloadXlsx:       (...a) => grid.value?.downloadXlsx?.(...a),

  // Misc
  printGrid:          ()     => grid.value?.printGrid(),
  setLocale:          (...a) => grid.value?.setLocale(...a),
  usePlugin:          (...a) => grid.value?.usePlugin(...a),
  unusePlugin:        (...a) => grid.value?.unusePlugin(...a),
  on:                 (...a) => grid.value?.on(...a),

  // State
  getColumnState:     ()     => grid.value?.getColumnState(),
  getPaginationState: ()     => grid.value?.getPaginationState(),
  getFilterState:     ()     => grid.value?.getFilterState(),
  getGroupingState:   ()     => grid.value?.getGroupingState(),
  getTreeState:       ()     => grid.value?.getTreeState(),
  getRows:            ()     => grid.value?.getRows(),
  getFlatRows:        ()     => grid.value?.getFlatRows(),
  getAllLeafColumns:   ()     => grid.value?.getAllLeafColumns(),
  getVisibleLeafColumns: ()  => grid.value?.getVisibleLeafColumns(),

  destroy:            ()     => grid.value?.destroy(),
});
</script>
