/**
 * ColumnModel - 컬럼 정의 및 런타임 상태 관리
 *
 * ColumnDef (사용자 정의) vs ColumnState (런타임 상태) 분리가 핵심.
 * - ColumnDef: 불변. 컬럼이 무엇인지 정의.
 * - ColumnState: 가변. 현재 너비/보이기/순서/pin 상태.
 *
 * leaf column만 실제 데이터 컬럼. parent column은 헤더 그룹 용도.
 */
export class ColumnModel {
  /**
   * @param {Object[]} columnDefs
   * @param {Object} [initialState]
   */
  constructor(columnDefs = [], initialState = {}) {
    /** @type {Map<string, Object>} colId -> ColumnDef */
    this._defs = new Map();
    /** @type {Map<string, ColumnState>} colId -> runtime state */
    this._states = new Map();
    /** @type {string[]} leaf 컬럼들의 현재 순서 (colId 배열) */
    this._leafOrder = [];

    this._buildFromDefs(columnDefs, initialState);
  }

  // ─── 초기화 ────────────────────────────────────────────────

  _buildFromDefs(defs, initialState) {
    this._defs.clear();
    this._states.clear();
    this._leafOrder = [];

    this._traverseDefs(defs, null, 0);

    // initialState에서 저장된 상태 복원
    if (initialState.columns) {
      for (const saved of initialState.columns) {
        if (this._states.has(saved.colId)) {
          Object.assign(this._states.get(saved.colId), saved);
        }
      }
    }

    // 저장된 순서 복원
    if (initialState.columnOrder) {
      const validOrder = initialState.columnOrder.filter((id) => this._defs.has(id));
      const missing = this._leafOrder.filter((id) => !validOrder.includes(id));
      this._leafOrder = [...validOrder, ...missing];
    }
  }

  _traverseDefs(defs, parentId, depth) {
    for (const def of defs) {
      const colId = def.id ?? def.field ?? String(Math.random());
      const normalized = this._normalizeDef(def, colId, parentId, depth);
      this._defs.set(colId, normalized);

      if (def.children && def.children.length > 0) {
        // 그룹 컬럼 - leaf가 아님
        normalized.isGroup = true;
        this._traverseDefs(def.children, colId, depth + 1);
      } else {
        // leaf 컬럼
        normalized.isGroup = false;
        this._leafOrder.push(colId);
        this._states.set(colId, this._createState(colId, def));
      }
    }
  }

  _normalizeDef(def, colId, parentId, depth) {
    return {
      id: colId,
      field: def.field ?? colId,
      headerName: def.headerName ?? def.header ?? colId,
      parentId: parentId,
      depth: depth,
      isGroup: false,
      children: def.children?.map((c) => c.id ?? c.field) ?? [],
      // 렌더링
      formatter: def.formatter ?? null,
      renderer: def.renderer ?? null,
      headerRenderer: def.headerRenderer ?? null,
      // 기능 플래그
      sortable: def.sortable ?? true,
      filterable: def.filterable ?? true,
      filterType: def.filterType ?? this._inferFilterType(def),
      filterOperators: Array.isArray(def.filterOperators) ? [...def.filterOperators] : null,
      filterOptions: Array.isArray(def.filterOptions) ? [...def.filterOptions] : null,
      filterMultiple: def.filterMultiple ?? null,
      filterPlaceholder: def.filterPlaceholder ?? null,
      resizable: def.resizable ?? true,
      reorderable: def.reorderable ?? true,
      // 너비
      width: def.width ?? 150,
      minWidth: def.minWidth ?? 50,
      maxWidth: def.maxWidth ?? Infinity,
      // 기타
      type: def.type ?? 'string',
      align: def.align ?? 'left',
      cellClass: def.cellClass ?? null,
      headerClass: def.headerClass ?? null,
      // 원본 def 보존
      _raw: def,
    };
  }

  _inferFilterType(def) {
    if (Array.isArray(def.filterOptions) && def.filterOptions.length > 0) {
      return 'select';
    }

    if (def.type === 'number' || def.type === 'date') {
      return def.type;
    }

    return 'text';
  }

  _createState(colId, def) {
    return {
      colId,
      width: def.width ?? 150,
      visible: def.visible ?? true,
      pinned: def.pinned ?? null, // 'left' | 'right' | null
      order: this._leafOrder.length, // 현재 순서 (순서 배열로 관리하므로 참고용)
    };
  }

  // ─── 조회 ──────────────────────────────────────────────────

  getDef(colId) {
    return this._defs.get(colId) ?? null;
  }

  getState(colId) {
    return this._states.get(colId) ?? null;
  }

  /** 현재 순서 + 가시성 기준 leaf 컬럼 반환 */
  getVisibleLeafColumns() {
    return this._leafOrder
      .filter((id) => this._states.get(id)?.visible !== false)
      .map((id) => ({
        def: this._defs.get(id),
        state: this._states.get(id),
      }));
  }

  /** pinned 구역별 컬럼 반환 */
  getColumnsByPin() {
    const visible = this.getVisibleLeafColumns();
    return {
      left: visible.filter((c) => c.state.pinned === 'left'),
      center: visible.filter((c) => !c.state.pinned),
      right: visible.filter((c) => c.state.pinned === 'right'),
    };
  }

  /** 모든 leaf 컬럼 (순서대로) */
  getAllLeafColumns() {
    return this._leafOrder.map((id) => ({
      def: this._defs.get(id),
      state: this._states.get(id),
    }));
  }

  /** 그룹 포함 전체 컬럼 def */
  getAllDefs() {
    return [...this._defs.values()];
  }

  // ─── 상태 변경 ─────────────────────────────────────────────

  setWidth(colId, width) {
    const state = this._states.get(colId);
    if (!state) return false;
    const def = this._defs.get(colId);
    const clamped = Math.max(def.minWidth, Math.min(def.maxWidth, width));
    state.width = clamped;
    return true;
  }

  setVisible(colId, visible) {
    const state = this._states.get(colId);
    if (!state) return false;
    state.visible = visible;
    return true;
  }

  setPinned(colId, pin) {
    const state = this._states.get(colId);
    if (!state) return false;
    if (pin !== 'left' && pin !== 'right' && pin !== null) {
      console.warn(`[ColumnModel] Invalid pin value: "${pin}". Use 'left', 'right', or null.`);
      return false;
    }
    state.pinned = pin;
    return true;
  }

  /**
   * 컬럼 이동
   * @param {string} colId - 이동할 컬럼
   * @param {number} toIndex - 목표 인덱스 (전체 leaf 기준)
   * @param {Object} [options]
   * @param {boolean} [options.restrictToGroup=true] - 같은 헤더 그룹 내로만 이동 제한
   */
  moveColumn(colId, toIndex, options = { restrictToGroup: true }) {
    const fromIndex = this._leafOrder.indexOf(colId);
    if (fromIndex === -1) return false;

    if (options.restrictToGroup) {
      const def = this._defs.get(colId);
      if (def.parentId) {
        // 같은 parentId를 가진 컬럼들 내에서만 이동 가능
        const siblings = this._leafOrder.filter(
          (id) => this._defs.get(id)?.parentId === def.parentId
        );
        const siblingIndexes = siblings.map((id) => this._leafOrder.indexOf(id));
        const minIdx = Math.min(...siblingIndexes);
        const maxIdx = Math.max(...siblingIndexes);
        toIndex = Math.max(minIdx, Math.min(maxIdx, toIndex));
      }
    }

    // 이동
    const newOrder = [...this._leafOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, colId);
    this._leafOrder = newOrder;
    return true;
  }

  // ─── 상태 직렬화/복원 ─────────────────────────────────────

  serializeState() {
    return {
      columnOrder: [...this._leafOrder],
      columns: [...this._states.values()].map((s) => ({ ...s })),
    };
  }

  applySerializedState(state) {
    if (state.columnOrder) {
      const valid = state.columnOrder.filter((id) => this._states.has(id));
      const missing = this._leafOrder.filter((id) => !valid.includes(id));
      this._leafOrder = [...valid, ...missing];
    }
    if (state.columns) {
      for (const col of state.columns) {
        if (this._states.has(col.colId)) {
          Object.assign(this._states.get(col.colId), col);
        }
      }
    }
  }

  // ─── 재정의 ────────────────────────────────────────────────

  setColumns(columnDefs, preserveState = true) {
    const prevState = preserveState ? this.serializeState() : {};
    this._buildFromDefs(columnDefs, {});
    if (preserveState) {
      this.applySerializedState(prevState);
    }
  }

  destroy() {
    this._defs.clear();
    this._states.clear();
    this._leafOrder = [];
  }
}
