/**
 * RowModel - 데이터 파이프라인의 중심
 *
 * Raw Data → Sort → Filter → Group/Tree Flatten → Paginate → FlatRows
 *
 * 핵심 설계:
 * - 각 단계는 순수 함수 (입력 → 출력, 사이드 이펙트 없음)
 * - FlatRow 구조로 통일해서 virtual scroll이 group/tree 구분 없이 동작
 * - 무거운 계산(sort/filter)은 WorkerBridge를 통해 Worker로 위임 가능
 *
 * FlatRow 타입:
 * - 'data': 일반 데이터 행
 * - 'group-header': 그룹 헤더 행
 * - 'group-footer': 그룹 집계 행 (optional)
 * - 'tree-node': 트리 노드 (data와 동일하지만 depth/expand 정보 포함)
 */
export class RowModel {
  constructor(options = {}) {
    this._options = options;

    /** @type {Object[]} DataStore의 원본 데이터 참조 */
    this._rawRows = [];

    /** @type {FlatRow[]} 파이프라인 최종 결과 */
    this._flatRows = [];

    /** @type {FlatRow[]} 페이지네이션/무한스크롤 후 화면에 표시될 행들 */
    this._displayRows = [];

    // 파이프라인 각 단계의 캐시
    this._sortedRows = null;
    this._filteredRows = null;
    this._processedRows = null; // group/tree flatten 결과

    // 외부 매니저 참조 (의존성 주입)
    this._sortManager = null;
    this._filterManager = null;
    this._groupManager = null;
    this._treeManager = null;
    this._paginationManager = null;
    this._infiniteScrollManager = null;

    /** @type {'client'|'server'|'infinite'|'virtual'} */
    this._displayMode = options.displayMode ?? 'client';

    /** @type {'none'|'group'|'tree'} */
    this._dataMode = 'none';

    /** @type {boolean} 파이프라인 재실행 필요 여부 */
    this._dirty = true;
    this._dirtySince = 'sort'; // 어느 단계부터 재계산 필요한지
  }

  // ─── 의존성 주입 ───────────────────────────────────────────

  setSortManager(m) { this._sortManager = m; }
  setFilterManager(m) { this._filterManager = m; }
  setGroupManager(m) { this._groupManager = m; this._detectDataMode(); }
  setTreeManager(m) { this._treeManager = m; this._detectDataMode(); }
  setPaginationManager(m) { this._paginationManager = m; }
  setInfiniteScrollManager(m) { this._infiniteScrollManager = m; }

  _detectDataMode() {
    if (this._treeManager?.isEnabled()) {
      this._dataMode = 'tree';
    } else if (this._groupManager?.isEnabled()) {
      this._dataMode = 'group';
    } else {
      this._dataMode = 'none';
    }
  }

  // ─── 데이터 입력 ───────────────────────────────────────────

  setRawRows(rows) {
    this._rawRows = rows;
    this._invalidate('sort');
  }

  // ─── 파이프라인 무효화 ────────────────────────────────────

  /**
   * @param {'sort'|'filter'|'group'|'paginate'} stage - 이 단계부터 재계산
   */
  _invalidate(stage) {
    this._dirty = true;
    const stageOrder = ['sort', 'filter', 'group', 'paginate'];
    const currentIdx = stageOrder.indexOf(this._dirtySince);
    const newIdx = stageOrder.indexOf(stage);
    if (newIdx < currentIdx || currentIdx === -1) {
      this._dirtySince = stage;
    }
  }

  onSortChanged() { this._invalidate('sort'); }
  onFilterChanged() { this._invalidate('filter'); }
  onGroupChanged() { this._invalidate('group'); }
  onExpandChanged() { this._invalidate('group'); }
  onPageChanged() { this._invalidate('paginate'); }

  // ─── 파이프라인 실행 ──────────────────────────────────────

  /**
   * 파이프라인을 필요한 단계부터 재실행
   * @returns {{ flatRows: FlatRow[], displayRows: FlatRow[], totalCount: number }}
   */
  process() {
    if (!this._dirty) {
      return {
        flatRows: this._flatRows,
        displayRows: this._displayRows,
        totalCount: this._flatRows.length,
      };
    }

    const stageOrder = ['sort', 'filter', 'group', 'paginate'];
    const startIdx = stageOrder.indexOf(this._dirtySince);

    if (startIdx <= 0) {
      this._sortedRows = this._runSort(this._rawRows);
    }
    if (startIdx <= 1) {
      this._filteredRows = this._runFilter(this._sortedRows);
    }
    if (startIdx <= 2) {
      this._processedRows = this._runGroupOrTree(this._filteredRows);
      this._flatRows = this._processedRows;
    }
    if (startIdx <= 3) {
      this._displayRows = this._runPaginate(this._flatRows);
    }

    this._dirty = false;
    this._dirtySince = 'sort';

    return {
      flatRows: this._flatRows,
      displayRows: this._displayRows,
      totalCount: this._flatRows.length,
    };
  }

  // ─── 파이프라인 단계 ──────────────────────────────────────

  _runSort(rows) {
    if (!this._sortManager || !this._sortManager.hasSort()) {
      return rows;
    }
    return this._sortManager.sort([...rows]);
  }

  _runFilter(rows) {
    if (!this._filterManager || !this._filterManager.hasFilter()) {
      return rows;
    }
    return this._filterManager.filter(rows);
  }

  _runGroupOrTree(rows) {
    if (this._dataMode === 'group' && this._groupManager) {
      return this._groupManager.flatten(rows);
    }
    if (this._dataMode === 'tree' && this._treeManager) {
      return this._treeManager.flatten(rows);
    }
    // 일반 모드: 단순 FlatRow 래핑
    return rows.map((row, i) => this._toFlatRow(row, i));
  }

  _runPaginate(flatRows) {
    // server-side 모드: 이미 페이지 데이터만 있음
    if (this._displayMode === 'server') {
      return flatRows;
    }

    if (this._displayMode === 'paginated' && this._paginationManager) {
      const { page, pageSize } = this._paginationManager.getState();
      const start = page * pageSize;
      const end = start + pageSize;
      return flatRows.slice(start, end);
    }

    if (this._displayMode === 'infinite' && this._infiniteScrollManager) {
      const { loadedCount } = this._infiniteScrollManager.getState();
      return flatRows.slice(0, loadedCount);
    }

    // 'virtual' 또는 'client' 모드: 전체 반환 (virtual scroll이 별도 범위 계산)
    return flatRows;
  }

  _toFlatRow(raw, index) {
    return {
      _type: 'data',
      _flatIndex: index,
      _rowKey: this._options.getRowKey ? this._options.getRowKey(raw) : String(raw.id ?? index),
      _depth: 0,
      ...raw,
    };
  }

  // ─── 조회 ──────────────────────────────────────────────────

  getFlatRows() {
    return this._flatRows;
  }

  getDisplayRows() {
    return this._displayRows;
  }

  getTotalCount() {
    return this._flatRows.length;
  }

  getFilteredCount() {
    return this._filteredRows?.length ?? this._flatRows.length;
  }

  /**
   * rowKey로 FlatRow 위치 찾기 (virtual scroll의 scrollToRow에 필요)
   * @returns {number} flatIndex, 없으면 -1
   */
  findIndexByKey(rowKey) {
    return this._flatRows.findIndex((r) => r._rowKey === String(rowKey));
  }

  destroy() {
    this._rawRows = [];
    this._flatRows = [];
    this._displayRows = [];
    this._sortedRows = null;
    this._filteredRows = null;
    this._processedRows = null;
  }
}
