<template>
  <div ref="el" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, toRaw } from 'vue';
import { createGrid } from '../../index.js';

const props = defineProps({
  rows:                   { type: Array,            default: () => [] },
  columns:                { type: Array,            default: () => [] },
  rowKey:                 { type: [String, Function], default: 'id' },
  rowHeight:              { type: Number,           default: undefined },
  getRowHeight:           { type: Function,         default: undefined },
  variableRowHeight:      { type: Boolean,          default: false },
  selectable:             { type: Boolean,          default: undefined },
  selectionMode:          { type: String,           default: undefined },
  displayMode:            { type: String,           default: 'client' },
  tableId:                { type: String,           default: undefined },
  availablePlugins:       { type: Array,            default: undefined },
  plugins:                { type: Array,            default: undefined },
  sidePanel:              { type: Object,           default: undefined },
  pagination:             { type: Object,           default: undefined },
  infiniteScroll:         { type: Object,           default: undefined },
  liveUpdates:            { type: Object,           default: undefined },
  tree:                   { type: Object,           default: undefined },
  emptyMessage:           { type: String,           default: undefined },
  columnState:            { type: Object,           default: undefined },
  columnStatePersistence: { type: Object,           default: undefined },
  overscanTop:            { type: Number,           default: undefined },
  overscanBottom:         { type: Number,           default: undefined },
  horizontalOverscan:     { type: Number,           default: undefined },
});

const emit = defineEmits([
  'ready',
  'row-click',
  'cell-click',
  'selection-change',
  'group-toggle',
  'tree-toggle',
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
  set('displayMode',            props.displayMode);
  set('tableId',                props.tableId);
  set('availablePlugins',       props.availablePlugins);
  set('plugins',                props.plugins);
  set('sidePanel',              props.sidePanel);
  set('pagination',             props.pagination);
  set('infiniteScroll',         props.infiniteScroll);
  set('liveUpdates',            props.liveUpdates);
  set('tree',                   props.tree);
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

  g.on('row-click',        (p) => emit('row-click', p));
  g.on('cell-click',       (p) => emit('cell-click', p));
  g.on('selection-change', (p) => emit('selection-change', p));
  g.on('group-toggle',     (p) => emit('group-toggle', p));
  g.on('tree-toggle',      (p) => emit('tree-toggle', p));
  g.on('render',           (p) => emit('render', p));
  g.on('state-change',     (p) => emit('state-change', p));

  emit('ready', g);
});

watch(() => props.rows,    (v) => grid.value?.setRows(toRaw(v)),    { deep: false });
watch(() => props.columns, (v) => grid.value?.setColumns(toRaw(v)), { deep: false });

onBeforeUnmount(() => {
  grid.value?.destroy();
  grid.value = null;
});

defineExpose({
  grid,
  refresh:          (...a) => grid.value?.refresh(...a),
  setRows:          (...a) => grid.value?.setRows(...a),
  appendRows:       (...a) => grid.value?.appendRows(...a),
  updateRows:       (...a) => grid.value?.updateRows(...a),
  patchRow:         (...a) => grid.value?.patchRow(...a),
  upsertRows:       (...a) => grid.value?.upsertRows(...a),
  removeRows:       (...a) => grid.value?.removeRows(...a),
  setColumns:       (...a) => grid.value?.setColumns(...a),
  setQuickFilter:   (...a) => grid.value?.setQuickFilter(...a),
  setColumnFilter:  (...a) => grid.value?.setColumnFilter(...a),
  clearColumnFilter:(...a) => grid.value?.clearColumnFilter(...a),
  clearFilters:     (...a) => grid.value?.clearFilters(...a),
  sortBy:           (...a) => grid.value?.sortBy(...a),
  clearSort:        (...a) => grid.value?.clearSort(...a),
  setPage:          (...a) => grid.value?.setPage(...a),
  nextPage:         (...a) => grid.value?.nextPage(...a),
  prevPage:         (...a) => grid.value?.prevPage(...a),
  setPageSize:      (...a) => grid.value?.setPageSize(...a),
  usePlugin:        (...a) => grid.value?.usePlugin(...a),
  unusePlugin:      (...a) => grid.value?.unusePlugin(...a),
  on:               (...a) => grid.value?.on(...a),
  getSelectedKeys:   ()    => grid.value?.getSelectedKeys(),
  getSelectionState: ()    => grid.value?.getSelectionState(),
  getPaginationState:()    => grid.value?.getPaginationState(),
  getColumnState:    ()    => grid.value?.getColumnState(),
  destroy:           ()    => grid.value?.destroy(),
});
</script>
