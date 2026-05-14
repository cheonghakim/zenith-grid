/**
 * HeaderModel - 복잡한 다중 헤더 구조 계산
 *
 * 핵심 알고리즘:
 * 1. 컬럼 def 트리를 순회해서 헤더 행(row) 배열 생성
 * 2. 각 셀의 colspan = 하위 leaf 컬럼 수
 * 3. 각 셀의 rowspan = (maxDepth - 현재 depth) + 1 (leaf인 경우)
 *
 * 컬럼 순서 변경 시 HeaderModel을 재계산해서 헤더 구조가 깨지지 않도록 함.
 *
 * 예시:
 * columns = [
 *   { id: 'info', header: 'Personal', children: [
 *     { id: 'name', field: 'name' },
 *     { id: 'age', field: 'age' }
 *   ]},
 *   { id: 'score', field: 'score' }
 * ]
 *
 * 결과:
 * Row 0: [ {id:'info', colspan:2, rowspan:1}, {id:'score', colspan:1, rowspan:2} ]
 * Row 1: [ {id:'name', colspan:1, rowspan:1}, {id:'age', colspan:1, rowspan:1} ]
 */
export class HeaderModel {
  /**
   * @param {import('./ColumnModel.js').ColumnModel} columnModel
   */
  constructor(columnModel) {
    this._columnModel = columnModel;
    /** @type {HeaderCell[][]} 헤더 행 배열 */
    this._headerRows = [];
    this._maxDepth = 0;
    this.rebuild();
  }

  /**
   * ColumnModel 상태 변경 후 헤더 재계산
   * 컬럼 이동/추가/삭제/숨기기 시 호출 필요
   */
  rebuild() {
    const allDefs = this._columnModel.getAllDefs();
    const defMap = new Map(allDefs.map((d) => [d.id, d]));
    const visibleOrder = this._columnModel.getVisibleLeafColumns().map((c) => c.def.id);

    // 최대 depth 계산
    this._maxDepth = this._calcMaxDepth(allDefs);

    // 헤더 행 초기화
    this._headerRows = Array.from({ length: this._maxDepth }, () => []);

    // 루트 컬럼들 (parentId가 null인 것들)을 visible order 기준으로 구성
    const rootDefs = this._getOrderedRoots(allDefs, defMap, visibleOrder);
    this._buildHeaderCells(rootDefs, defMap, visibleOrder, 0);

    // 빈 헤더 행 제거 (모든 컬럼이 단일 depth인 경우 1행만 남김)
    this._headerRows = this._headerRows.filter((row) => row.length > 0);
    if (this._headerRows.length === 0) {
      this._headerRows = [[]];
    }
  }

  _calcMaxDepth(defs) {
    let max = 1;
    const calcDepth = (defId, defMap, current) => {
      const def = defMap.get(defId);
      if (!def || !def.isGroup) return current;
      let childMax = current;
      for (const childId of def.children) {
        childMax = Math.max(childMax, calcDepth(childId, defMap, current + 1));
      }
      return childMax;
    };

    const rootDefs = defs.filter((d) => !d.parentId);
    for (const def of rootDefs) {
      if (def.isGroup) {
        max = Math.max(max, calcDepth(def.id, new Map(defs.map((d) => [d.id, d])), 2));
      }
    }
    return max;
  }

  _getOrderedRoots(allDefs, defMap, visibleLeafOrder) {
    // visible leaf의 root ancestor 순서대로 root 컬럼 정렬
    const roots = allDefs.filter((d) => !d.parentId);
    const rootOrder = new Map();

    for (let i = 0; i < visibleLeafOrder.length; i++) {
      const root = this._findRoot(visibleLeafOrder[i], defMap);
      if (!rootOrder.has(root)) {
        rootOrder.set(root, rootOrder.size);
      }
    }

    return roots
      .filter((r) => rootOrder.has(r.id))
      .sort((a, b) => (rootOrder.get(a.id) ?? 0) - (rootOrder.get(b.id) ?? 0));
  }

  _findRoot(colId, defMap) {
    let def = defMap.get(colId);
    while (def?.parentId) {
      def = defMap.get(def.parentId);
    }
    return def?.id ?? colId;
  }

  /**
   * @param {Object[]} defs - 이 수준의 컬럼 def 배열
   * @param {Map} defMap
   * @param {string[]} visibleLeafOrder
   * @param {number} depth - 현재 깊이 (0부터 시작)
   */
  _buildHeaderCells(defs, defMap, visibleLeafOrder, depth) {
    for (const def of defs) {
      if (def.isGroup) {
        // 그룹 헤더: colspan = visible leaf 자식 수
        const visibleLeaves = this._getVisibleLeaves(def.id, defMap, visibleLeafOrder);
        if (visibleLeaves.length === 0) continue; // 모든 자식이 숨겨진 경우 스킵

        const cell = {
          colId: def.id,
          headerName: def.headerName,
          colspan: visibleLeaves.length,
          rowspan: 1, // 그룹은 항상 1 rowspan
          depth: depth,
          isGroup: true,
          def,
        };
        this._headerRows[depth].push(cell);

        // 자식 처리 - visible order에 따라 순서 유지
        const orderedChildren = this._getOrderedChildren(def, defMap, visibleLeafOrder);
        this._buildHeaderCells(orderedChildren, defMap, visibleLeafOrder, depth + 1);
      } else {
        // Leaf 컬럼: rowspan = maxDepth - depth (남은 행 모두 차지)
        const cell = {
          colId: def.id,
          headerName: def.headerName,
          colspan: 1,
          rowspan: this._maxDepth - depth,
          depth: depth,
          isGroup: false,
          def,
          state: this._columnModel.getState(def.id),
        };
        this._headerRows[depth].push(cell);
      }
    }
  }

  _getVisibleLeaves(groupId, defMap, visibleLeafOrder) {
    const visibleSet = new Set(visibleLeafOrder);
    const collect = (id) => {
      const def = defMap.get(id);
      if (!def) return [];
      if (!def.isGroup) return visibleSet.has(id) ? [id] : [];
      return def.children.flatMap((childId) => collect(childId));
    };
    return collect(groupId);
  }

  _getOrderedChildren(groupDef, defMap, visibleLeafOrder) {
    // children을 visibleLeafOrder 기준으로 정렬
    const children = groupDef.children
      .map((id) => defMap.get(id))
      .filter(Boolean);

    const getFirstLeafIndex = (def) => {
      if (!def.isGroup) return visibleLeafOrder.indexOf(def.id);
      for (const childId of def.children) {
        const child = defMap.get(childId);
        const idx = getFirstLeafIndex(child);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    return children
      .filter((def) => {
        if (!def.isGroup) return visibleLeafOrder.includes(def.id);
        return this._getVisibleLeaves(def.id, defMap, visibleLeafOrder).length > 0;
      })
      .sort((a, b) => getFirstLeafIndex(a) - getFirstLeafIndex(b));
  }

  // ─── 조회 ──────────────────────────────────────────────────

  /** @returns {HeaderCell[][]} */
  getHeaderRows() {
    return this._headerRows;
  }

  /** @returns {number} 헤더 행 수 */
  getDepth() {
    return this._headerRows.length;
  }

  /**
   * 컬럼 이동이 허용되는지 검사
   * restrictToGroup=true일 때 같은 그룹 외부로 이동 불가
   */
  canMoveColumn(fromColId, toColId, options = { restrictToGroup: true }) {
    if (!options.restrictToGroup) return true;

    const fromDef = this._columnModel.getDef(fromColId);
    const toDef = this._columnModel.getDef(toColId);

    if (!fromDef || !toDef) return false;

    // 같은 parentId면 허용
    if (fromDef.parentId === toDef.parentId) return true;

    // 둘 다 root level이면 허용
    if (!fromDef.parentId && !toDef.parentId) return true;

    return false;
  }

  destroy() {
    this._headerRows = [];
  }
}
