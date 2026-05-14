/**
 * TreeManager - 트리 구조 관리 및 flatten
 *
 * 지원 구조:
 * 1. children 방식: row.children = [...childRows]
 * 2. parentId 방식: row.parentId 기반 관계 구성
 * 3. lazy loading: children이 null이지만 hasChildren=true인 경우
 *
 * 핵심 위험 지점:
 * - lazy loaded 자식의 선택 상태
 * - 접힌 자식 행의 선택 유지
 * - parentId flat 구조에서 트리 재구성
 */
export class TreeManager {
  /**
   * @param {Object} options
   * @param {'children'|'parentId'} [options.treeMode='children']
   * @param {string} [options.childrenField='children']
   * @param {string} [options.parentIdField='parentId']
   * @param {string} [options.hasChildrenField='hasChildren']
   * @param {Function} [options.onLoadChildren] - async (row) => children[]
   * @param {Function} [options.onChanged]
   */
  constructor(options = {}) {
    this._treeMode = options.treeMode ?? 'children';
    this._childrenField = options.childrenField ?? 'children';
    this._parentIdField = options.parentIdField ?? 'parentId';
    this._hasChildrenField = options.hasChildrenField ?? 'hasChildren';
    this._onLoadChildren = options.onLoadChildren ?? null;
    this._onChanged = options.onChanged ?? (() => {});
    this._enabled = false;

    /** @type {Set<string>} 펼쳐진 row key Set */
    this._expandedKeys = new Set();

    /** @type {Set<string>} 로딩 중인 row key Set */
    this._loadingKeys = new Set();

    /** @type {Map<string, Object[]>} lazy-loaded 자식 캐시 */
    this._childrenCache = new Map();
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
    this._expandedKeys.clear();
    this._loadingKeys.clear();
    this._childrenCache.clear();
  }

  isEnabled() {
    return this._enabled;
  }

  // ─── 접기/펼치기 ────────────────────────────────────────────

  expand(rowKey) {
    this._expandedKeys.add(String(rowKey));
    this._onChanged({ action: 'expand', rowKey });
  }

  collapse(rowKey) {
    this._expandedKeys.delete(String(rowKey));
    this._onChanged({ action: 'collapse', rowKey });
  }

  toggle(rowKey) {
    if (this._expandedKeys.has(String(rowKey))) {
      this.collapse(rowKey);
    } else {
      this.expand(rowKey);
    }
  }

  expandAll(flatRows) {
    for (const row of flatRows) {
      if (row._hasChildren) {
        this._expandedKeys.add(row._rowKey);
      }
    }
    this._onChanged({ action: 'expandAll' });
  }

  collapseAll() {
    this._expandedKeys.clear();
    this._onChanged({ action: 'collapseAll' });
  }

  isExpanded(rowKey) {
    return this._expandedKeys.has(String(rowKey));
  }

  isLoading(rowKey) {
    return this._loadingKeys.has(String(rowKey));
  }

  // ─── Lazy Loading ──────────────────────────────────────────

  async loadChildren(rowKey, row) {
    if (!this._onLoadChildren) return;
    if (this._loadingKeys.has(rowKey)) return;
    if (this._childrenCache.has(rowKey)) return;

    this._loadingKeys.add(rowKey);
    this._onChanged({ action: 'loadingStart', rowKey });

    try {
      const children = await this._onLoadChildren(row);
      this._childrenCache.set(rowKey, children ?? []);
      this._loadingKeys.delete(rowKey);
      this._expandedKeys.add(rowKey);
      this._onChanged({ action: 'loadingComplete', rowKey, children });
    } catch (err) {
      this._loadingKeys.delete(rowKey);
      this._onChanged({ action: 'loadingError', rowKey, error: err.message });
      console.error(`[TreeManager] Failed to load children for "${rowKey}":`, err);
    }
  }

  // ─── Flatten ───────────────────────────────────────────────

  /**
   * 트리 구조를 flat 배열로 변환
   * @param {Object[]} rows - 원본 rows (DataStore에서 온 것)
   * @returns {FlatRow[]}
   */
  flatten(rows) {
    if (!this._enabled) {
      return rows.map((r, i) => this._toFlatRow(r, null, 0, i));
    }

    if (this._treeMode === 'parentId') {
      const tree = this._buildTreeFromParentId(rows);
      return this._flattenTree(tree, null, 0);
    }

    // children 방식
    const rootRows = rows.filter(
      (r) => !r[this._parentIdField] || this._treeMode === 'children'
    );
    return this._flattenTree(rootRows, null, 0);
  }

  _buildTreeFromParentId(rows) {
    const rowMap = new Map();
    const roots = [];

    for (const row of rows) {
      const key = this._getKey(row);
      rowMap.set(key, { ...row, _treeChildren: [] });
    }

    for (const row of rows) {
      const parentId = row[this._parentIdField];
      if (parentId != null) {
        const parent = rowMap.get(String(parentId));
        if (parent) {
          parent._treeChildren.push(rowMap.get(this._getKey(row)));
        } else {
          roots.push(rowMap.get(this._getKey(row)));
        }
      } else {
        roots.push(rowMap.get(this._getKey(row)));
      }
    }

    return roots;
  }

  _flattenTree(rows, parentKey, depth) {
    const flat = [];

    for (const row of rows) {
      const key = this._getKey(row);
      const rawChildren = this._treeMode === 'parentId'
        ? (row._treeChildren ?? [])
        : (row[this._childrenField] ?? this._childrenCache.get(key) ?? []);

      const hasChildren = rawChildren.length > 0 || row[this._hasChildrenField] === true;
      const isExpanded = this._expandedKeys.has(key);
      const isLoading = this._loadingKeys.has(key);

      const flatRow = this._toFlatRow(row, parentKey, depth, flat.length);
      flatRow._hasChildren = hasChildren;
      flatRow._isExpanded = isExpanded;
      flatRow._isLoading = isLoading;
      flatRow._isParent = hasChildren;
      flat.push(flatRow);

      if (isExpanded && rawChildren.length > 0) {
        const childFlat = this._flattenTree(rawChildren, key, depth + 1);
        flat.push(...childFlat);
      } else if (isLoading) {
        // 로딩 중 플레이스홀더
        flat.push({
          _type: 'tree-loading',
          _rowKey: `__loading__${key}`,
          _depth: depth + 1,
          _parentKey: key,
        });
      }
    }

    return flat;
  }

  _toFlatRow(row, parentKey, depth, flatIndex) {
    return {
      _type: 'tree-node',
      _flatIndex: flatIndex,
      _rowKey: this._getKey(row),
      _parentKey: parentKey,
      _depth: depth,
      _hasChildren: false,
      _isExpanded: false,
      _isParent: false,
      _children: row[this._childrenField] ?? null, // selection 전파용
      ...row,
    };
  }

  _getKey(row) {
    return String(row.id ?? row[this._parentIdField] ?? Math.random());
  }

  // ─── 상태 직렬화 ───────────────────────────────────────────

  serializeState() {
    return {
      expandedKeys: [...this._expandedKeys],
    };
  }

  applySerializedState(state) {
    if (state.expandedKeys) {
      this._expandedKeys = new Set(state.expandedKeys);
    }
  }

  getState() {
    return {
      enabled: this._enabled,
      expandedKeys: new Set(this._expandedKeys),
      loadingKeys: new Set(this._loadingKeys),
    };
  }

  destroy() {
    this._expandedKeys.clear();
    this._loadingKeys.clear();
    this._childrenCache.clear();
  }
}
