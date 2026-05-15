/**
 * SelectionManager - 행 선택 상태 관리
 *
 * 설계 핵심:
 * 1. 선택은 rowKey 기반 Set. 페이지 변경/정렬/필터에도 선택 유지.
 * 2. 트리 모드: 부모/자식 선택 전파 정책 설정 가능
 * 3. indeterminate 상태: 자식 중 일부만 선택된 부모
 * 4. 선택 불가 행: isSelectable(row) => boolean
 *
 * 위험 지점:
 * - lazy-loaded tree 자식의 선택: 자식이 아직 로드 안 됐을 때 부모 선택하면?
 *   → 자식 로드 완료 후 부모 선택 상태에 따라 자식 선택 적용
 * - 전체 선택의 의미: 현재 페이지? 필터 결과? 전체 데이터?
 *   → selectAllScope 옵션으로 제어
 */
export class SelectionManager {
  /**
   * @param {Object} options
   * @param {Function} [options.isSelectable] - (row) => boolean
   * @param {'single'|'multiple'} [options.mode='multiple']
   * @param {boolean} [options.propagateToChildren=false] - 트리: 부모 선택 시 자식도 선택
   * @param {boolean} [options.propagateToParent=true] - 트리: 자식 상태에 따라 부모 상태 결정
   * @param {'page'|'filtered'|'all'} [options.selectAllScope='filtered']
   * @param {Function} [options.onChanged]
   */
  constructor(options = {}) {
    this._mode = options.mode ?? 'multiple';
    this._isSelectable = options.isSelectable ?? (() => true);
    this._propagateToChildren = options.propagateToChildren ?? false;
    this._propagateToParent = options.propagateToParent ?? true;
    this._selectAllScope = options.selectAllScope ?? 'filtered';
    this._onChanged = options.onChanged ?? (() => {});

    /** @type {Set<string>} 선택된 rowKey 집합 */
    this._selectedKeys = new Set();

    /** @type {string|null} shift 선택을 위한 앵커 rowKey */
    this._anchorKey = null;

    /** @type {Map<string, 'checked'|'indeterminate'>} 트리 부모의 체크 상태 캐시 */
    this._parentCheckState = new Map();

    // 현재 표시 중인 flat rows (shift 선택, 전체 선택에 필요)
    this._currentFlatRows = [];
    this._rowKeyMap = new Map();
  }

  // ─── 현재 행 업데이트 ─────────────────────────────────────

  setCurrentRows(flatRows) {
    this._currentFlatRows = flatRows;
    this._rowKeyMap = new Map(flatRows.map((r) => [r._rowKey, r]));
  }

  // ─── 기본 선택 ─────────────────────────────────────────────

  selectRow(rowKey, options = {}) {
    const key = String(rowKey);
    const row = this._findRow(key);
    if (row && !this._isSelectable(row)) return;

    if (this._mode === 'single') {
      this._selectedKeys.clear();
    }

    this._selectedKeys.add(key);
    this._anchorKey = key;

    if (this._propagateToChildren && row) {
      this._propagateDownward(row, true);
    }
    if (this._propagateToParent) {
      this._updateParentStates();
    }

    this._onChanged(this._buildChangePayload('select', [key]));
  }

  deselectRow(rowKey) {
    const key = String(rowKey);
    this._selectedKeys.delete(key);

    const row = this._findRow(key);
    if (this._propagateToChildren && row) {
      this._propagateDownward(row, false);
    }
    if (this._propagateToParent) {
      this._updateParentStates();
    }

    this._onChanged(this._buildChangePayload('deselect', [key]));
  }

  toggleRow(rowKey) {
    const key = String(rowKey);
    if (this._selectedKeys.has(key)) {
      this.deselectRow(key);
    } else {
      this.selectRow(key);
    }
  }

  // ─── Shift / Ctrl 선택 ────────────────────────────────────

  /**
   * Shift 클릭: anchor ~ 현재 행 범위 선택
   */
  shiftSelect(rowKey) {
    if (this._mode === 'single') {
      this.selectRow(rowKey);
      return;
    }

    const key = String(rowKey);
    if (!this._anchorKey) {
      this.selectRow(key);
      return;
    }

    const flatRows = this._currentFlatRows;
    const anchorIdx = flatRows.findIndex((r) => r._rowKey === this._anchorKey);
    const targetIdx = flatRows.findIndex((r) => r._rowKey === key);

    if (anchorIdx === -1 || targetIdx === -1) {
      this.selectRow(key);
      return;
    }

    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    const keysToSelect = [];

    for (let i = start; i <= end; i++) {
      const row = flatRows[i];
      if (row && this._isSelectable(row)) {
        this._selectedKeys.add(row._rowKey);
        keysToSelect.push(row._rowKey);
      }
    }

    // anchor는 변경하지 않음 (연속 shift 클릭을 위해)
    if (this._propagateToParent) {
      this._updateParentStates();
    }

    this._onChanged(this._buildChangePayload('select', keysToSelect));
  }

  // ─── 전체 선택 ─────────────────────────────────────────────

  /**
   * @param {FlatRow[]} [scopeRows] - 선택할 행 범위 (없으면 selectAllScope에 따라)
   */
  selectAll(scopeRows = null) {
    const rows = scopeRows ?? this._getScopeRows();
    const added = [];

    for (const row of rows) {
      const key = row._rowKey;
      if (this._isSelectable(row) && !this._selectedKeys.has(key)) {
        this._selectedKeys.add(key);
        added.push(key);
      }
    }

    if (this._propagateToParent) {
      this._updateParentStates();
    }

    this._onChanged(this._buildChangePayload('selectAll', added));
  }

  clearSelection() {
    const removed = [...this._selectedKeys];
    this._selectedKeys.clear();
    this._parentCheckState.clear();
    this._anchorKey = null;
    this._onChanged(this._buildChangePayload('clearAll', removed));
  }

  setRowsSelected(rowKeys, selected, action = 'bulk') {
    const keys = [...new Set((Array.isArray(rowKeys) ? rowKeys : [rowKeys]).map(String))];
    const changed = [];

    if (this._mode === 'single' && selected && keys.length > 0) {
      this._selectedKeys.clear();
    }

    for (const key of keys) {
      const row = this._findRow(key);
      if (row && !this._isSelectable(row)) {
        continue;
      }

      if (selected) {
        if (!this._selectedKeys.has(key)) {
          this._selectedKeys.add(key);
          changed.push(key);
        }
      } else if (this._selectedKeys.delete(key)) {
        changed.push(key);
      }
    }

    if (changed.length === 0) {
      return;
    }

    if (this._propagateToParent) {
      this._updateParentStates();
    }

    this._onChanged(this._buildChangePayload(action, changed));
  }

  // ─── 조회 ──────────────────────────────────────────────────

  isSelected(rowKey) {
    return this._selectedKeys.has(String(rowKey));
  }

  isIndeterminate(rowKey) {
    return this._parentCheckState.get(String(rowKey)) === 'indeterminate';
  }

  isRowChecked(rowOrKey) {
    const row = typeof rowOrKey === 'object'
      ? rowOrKey
      : this._findRow(String(rowOrKey));

    if (!row) {
      return false;
    }

    if (Array.isArray(row._descendantRowKeys) && row._descendantRowKeys.length > 0) {
      return row._descendantRowKeys.every((key) => this._selectedKeys.has(String(key)));
    }

    return this._selectedKeys.has(String(row._rowKey ?? rowOrKey));
  }

  isSelectableRow(rowOrKey) {
    const row = typeof rowOrKey === 'object'
      ? rowOrKey
      : this._findRow(String(rowOrKey));

    if (!row) {
      return true;
    }

    return this._isSelectable(row);
  }

  isRowIndeterminate(rowOrKey) {
    const row = typeof rowOrKey === 'object'
      ? rowOrKey
      : this._findRow(String(rowOrKey));

    if (!row) {
      return false;
    }

    if (Array.isArray(row._descendantRowKeys) && row._descendantRowKeys.length > 0) {
      const total = row._descendantRowKeys.length;
      const selected = row._descendantRowKeys.filter((key) => this._selectedKeys.has(String(key))).length;
      return selected > 0 && selected < total;
    }

    return this.isIndeterminate(String(row._rowKey ?? rowOrKey));
  }

  getSelectedKeys() {
    return new Set(this._selectedKeys);
  }

  getSelectedRows() {
    const rows = [];
    for (const row of this._currentFlatRows) {
      if (this._selectedKeys.has(row._rowKey)) {
        rows.push(row);
      }
    }
    return rows;
  }

  getSelectedCount() {
    return this._selectedKeys.size;
  }

  getState() {
    return {
      selectedKeys: new Set(this._selectedKeys),
      selectedCount: this._selectedKeys.size,
      allSelected: this.isAllSelected(),
      someSelected: this.isSomeSelected(),
    };
  }

  isAllSelected(scopeRows = null) {
    const rows = scopeRows ?? this._getScopeRows();
    const selectable = rows.filter((r) => this._isSelectable(r));
    if (selectable.length === 0) return false;
    return selectable.every((r) => this._selectedKeys.has(r._rowKey));
  }

  isSomeSelected(scopeRows = null) {
    const rows = scopeRows ?? this._getScopeRows();
    return rows.some((r) => this._selectedKeys.has(r._rowKey));
  }

  // ─── 트리 선택 전파 ────────────────────────────────────────

  _propagateDownward(parentRow, selected) {
    if (!parentRow._children) return;
    for (const child of parentRow._children) {
      if (this._isSelectable(child)) {
        if (selected) {
          this._selectedKeys.add(child._rowKey);
        } else {
          this._selectedKeys.delete(child._rowKey);
        }
      }
      this._propagateDownward(child, selected);
    }
  }

  _updateParentStates() {
    this._parentCheckState.clear();
    // flat rows에서 _type='tree-node'인 부모 행들을 찾아 상태 계산
    for (const row of this._currentFlatRows) {
      if (row._isParent && row._children) {
        const state = this._calcParentCheckState(row);
        if (state) {
          this._parentCheckState.set(row._rowKey, state);
        }
      }
    }
  }

  _calcParentCheckState(parentRow) {
    const allDescendants = this._collectDescendantKeys(parentRow);
    if (allDescendants.length === 0) return null;

    const selectedCount = allDescendants.filter((k) => this._selectedKeys.has(k)).length;
    if (selectedCount === 0) return null;
    if (selectedCount === allDescendants.length) return 'checked';
    return 'indeterminate';
  }

  _collectDescendantKeys(row) {
    const keys = [];
    const collect = (r) => {
      if (!r._children) return;
      for (const child of r._children) {
        keys.push(child._rowKey);
        collect(child);
      }
    };
    collect(row);
    return keys;
  }

  _getScopeRows() {
    // selectAllScope에 따라 범위 결정
    // 'page': 현재 표시된 행만
    // 'filtered': 필터 결과 전체 (virtual scroll에서도 전체 선택)
    // 'all': 모든 데이터
    return this._currentFlatRows;
  }

  _findRow(key) {
    return this._rowKeyMap.get(key) ?? null;
  }

  _buildChangePayload(action, keys) {
    return {
      action,
      keys,
      selectedKeys: new Set(this._selectedKeys),
      selectedCount: this._selectedKeys.size,
    };
  }

  // ─── 상태 직렬화 ───────────────────────────────────────────

  serializeState() {
    return { selectedKeys: [...this._selectedKeys] };
  }

  applySerializedState(state) {
    if (state.selectedKeys) {
      this._selectedKeys = new Set(state.selectedKeys.map(String));
    }
  }

  destroy() {
    this._selectedKeys.clear();
    this._parentCheckState.clear();
    this._currentFlatRows = [];
    this._rowKeyMap.clear();
  }
}
