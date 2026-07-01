import { useRef, useEffect, useState, useCallback } from 'react';
import { createGrid } from '../../index.js';

/**
 * useHighGrid - React hook for HighGrid
 *
 * Usage:
 *   const { containerRef, grid, state } = useHighGrid({ columns, rows });
 *   return <div ref={containerRef} style={{ height: 400 }} />;
 *
 * @param {import('../../index.js').GridOptions} [options]
 */
export function useHighGrid(options = {}) {
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState({
    selectedKeys: new Set(),
    selectionCount: 0,
    isAllSelected: false,
    isSomeSelected: false,
    renderInfo: null,
    paginationState: null,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const grid = createGrid(containerRef.current, optionsRef.current);
    gridRef.current = grid;

    grid.on('selection-change', (p) => {
      setState((prev) => ({
        ...prev,
        selectedKeys: p.selectedKeys ?? new Set(),
        selectionCount: p.count ?? 0,
        isAllSelected: p.isAll ?? false,
        isSomeSelected: p.isSome ?? false,
      }));
    });

    grid.on('render', (p) => {
      setState((prev) => ({
        ...prev,
        renderInfo: p,
        paginationState: p.paginationState ?? prev.paginationState,
      }));
    });

    setIsReady(true);

    return () => {
      grid.destroy();
      gridRef.current = null;
      setIsReady(false);
    };
  }, []); // intentionally empty — grid is created once; use imperative API for updates

  const getGrid = useCallback(() => gridRef.current, []);

  return {
    /** Attach to your container div: <div ref={containerRef} /> */
    containerRef,
    /** The raw GridCore instance (null until mounted). */
    grid: gridRef.current,
    getGrid,
    isReady,
    /** Reactive selection + render summary. */
    state,

    // ── Convenience delegates ─────────────────────────────────────────
    refresh:           (...a) => gridRef.current?.refresh(...a),
    setRows:           (...a) => gridRef.current?.setRows(...a),
    appendRows:        (...a) => gridRef.current?.appendRows(...a),
    updateRows:        (...a) => gridRef.current?.updateRows(...a),
    patchRow:          (...a) => gridRef.current?.patchRow(...a),
    upsertRows:        (...a) => gridRef.current?.upsertRows(...a),
    removeRows:        (...a) => gridRef.current?.removeRows(...a),
    setColumns:        (...a) => gridRef.current?.setColumns(...a),
    setQuickFilter:    (...a) => gridRef.current?.setQuickFilter(...a),
    setColumnFilter:   (...a) => gridRef.current?.setColumnFilter(...a),
    clearColumnFilter: (...a) => gridRef.current?.clearColumnFilter(...a),
    clearFilters:      (...a) => gridRef.current?.clearFilters(...a),
    sortBy:            (...a) => gridRef.current?.sortBy(...a),
    clearSort:         (...a) => gridRef.current?.clearSort(...a),
    setPage:           (...a) => gridRef.current?.setPage(...a),
    nextPage:          (...a) => gridRef.current?.nextPage(...a),
    prevPage:          (...a) => gridRef.current?.prevPage(...a),
    setPageSize:       (...a) => gridRef.current?.setPageSize(...a),
    usePlugin:         (...a) => gridRef.current?.usePlugin(...a),
    unusePlugin:       (...a) => gridRef.current?.unusePlugin(...a),
    liveAddRows:       (...a) => gridRef.current?.liveAddRows(...a),
    liveUpdateRows:    (...a) => gridRef.current?.liveUpdateRows(...a),
    livePatchRow:      (...a) => gridRef.current?.livePatchRow(...a),
    liveRemoveRows:    (...a) => gridRef.current?.liveRemoveRows(...a),
    on:                (...a) => gridRef.current?.on(...a),
    getSelectedKeys:    ()   => gridRef.current?.getSelectedKeys(),
    getSelectedRows:    ()   => gridRef.current?.getSelectedRows(),
    getColumnState:     ()   => gridRef.current?.getColumnState(),
    getPaginationState: ()   => gridRef.current?.getPaginationState(),
  };
}
