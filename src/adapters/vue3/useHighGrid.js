import { shallowRef, ref, reactive, onUnmounted, toRaw } from 'vue';
import { createGrid } from '../../index.js';

/**
 * Composable that creates and manages a GridCore instance.
 *
 * Usage:
 *   const containerRef = ref(null);
 *   const { grid, state, init } = useHighGrid(containerRef, { columns, rows });
 *   onMounted(() => init());
 *
 * @param {import('vue').Ref<HTMLElement|null>} containerRef
 * @param {import('highgrid').GridOptions} [options]
 */
export function useHighGrid(containerRef, options = {}) {
  const grid    = shallowRef(null);
  const isReady = ref(false);

  const state = reactive({
    selectedKeys:    new Set(),
    selectionCount:  0,
    isAllSelected:   false,
    isSomeSelected:  false,
    renderInfo:      null,
    paginationState: null,
  });

  /**
   * Instantiate the grid. Call this inside onMounted or when containerRef is ready.
   * Passing overrideOptions merges with the options given to useHighGrid.
   *
   * @param {import('highgrid').GridOptions} [overrideOptions]
   * @returns {import('highgrid').GridCore}
   */
  function init(overrideOptions = {}) {
    if (!containerRef.value) {
      console.warn('[useHighGrid] containerRef.value is null — call init() after mount.');
      return null;
    }

    if (grid.value) {
      grid.value.destroy();
      grid.value = null;
    }

    const merged = { ...toRaw(options), ...toRaw(overrideOptions) };
    const g = createGrid(containerRef.value, merged);

    g.on('selection-change', (p) => {
      state.selectedKeys   = p.selectedKeys ?? new Set();
      state.selectionCount = p.count        ?? 0;
      state.isAllSelected  = p.isAll        ?? false;
      state.isSomeSelected = p.isSome       ?? false;
    });

    g.on('render', (p) => {
      state.renderInfo = p;
      if (p.paginationState) state.paginationState = p.paginationState;
    });

    grid.value = g;
    isReady.value = true;

    return g;
  }

  onUnmounted(() => {
    grid.value?.destroy();
    grid.value    = null;
    isReady.value = false;
  });

  return {
    /** The raw GridCore instance (ShallowRef). */
    grid,
    /** True once init() has been called successfully. */
    isReady,
    /** Reactive summary of selection and render state. */
    state,
    /** Initialise (or re-initialise) the grid on the given container. */
    init,

    // ── Convenience delegates ───────────────────────────────────────
    refresh:           (...a) => grid.value?.refresh(...a),
    setRows:           (...a) => grid.value?.setRows(...a),
    appendRows:        (...a) => grid.value?.appendRows(...a),
    updateRows:        (...a) => grid.value?.updateRows(...a),
    patchRow:          (...a) => grid.value?.patchRow(...a),
    upsertRows:        (...a) => grid.value?.upsertRows(...a),
    removeRows:        (...a) => grid.value?.removeRows(...a),
    setColumns:        (...a) => grid.value?.setColumns(...a),
    setQuickFilter:    (...a) => grid.value?.setQuickFilter(...a),
    setColumnFilter:   (...a) => grid.value?.setColumnFilter(...a),
    clearColumnFilter: (...a) => grid.value?.clearColumnFilter(...a),
    clearFilters:      (...a) => grid.value?.clearFilters(...a),
    sortBy:            (...a) => grid.value?.sortBy(...a),
    clearSort:         (...a) => grid.value?.clearSort(...a),
    setPage:           (...a) => grid.value?.setPage(...a),
    nextPage:          (...a) => grid.value?.nextPage(...a),
    prevPage:          (...a) => grid.value?.prevPage(...a),
    setPageSize:       (...a) => grid.value?.setPageSize(...a),
    usePlugin:         (...a) => grid.value?.usePlugin(...a),
    unusePlugin:       (...a) => grid.value?.unusePlugin(...a),
    liveAddRows:       (...a) => grid.value?.liveAddRows(...a),
    liveUpdateRows:    (...a) => grid.value?.liveUpdateRows(...a),
    livePatchRow:      (...a) => grid.value?.livePatchRow(...a),
    liveRemoveRows:    (...a) => grid.value?.liveRemoveRows(...a),
    getSelectedKeys:    ()    => grid.value?.getSelectedKeys(),
    getSelectedRows:    ()    => grid.value?.getSelectedRows(),
    getSelectionState:  ()    => grid.value?.getSelectionState(),
    getPaginationState: ()    => grid.value?.getPaginationState(),
    getColumnState:     ()    => grid.value?.getColumnState(),
    on:                (...a) => grid.value?.on(...a),
  };
}
