export class TreeManager {
  constructor(options = {}) {
    this._treeMode = options.treeMode ?? 'children';
    this._childrenField = options.childrenField ?? 'children';
    this._parentIdField = options.parentIdField ?? 'parentId';
    this._hasChildrenField = options.hasChildrenField ?? 'hasChildren';
    this._onLoadChildren = options.onLoadChildren ?? null;
    this._onChanged = options.onChanged ?? (() => {});
    this._enabled = false;

    this._expandedKeys = new Set();
    this._loadingKeys = new Set();
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

  async loadChildren(rowKey, row) {
    if (!this._onLoadChildren || this._loadingKeys.has(rowKey) || this._childrenCache.has(rowKey)) {
      return;
    }

    this._loadingKeys.add(rowKey);
    this._onChanged({ action: 'loadingStart', rowKey });

    try {
      const children = await this._onLoadChildren(row);
      this._childrenCache.set(rowKey, children ?? []);
      this._loadingKeys.delete(rowKey);
      this._expandedKeys.add(rowKey);
      this._onChanged({ action: 'loadingComplete', rowKey, children });
    } catch (error) {
      this._loadingKeys.delete(rowKey);
      this._onChanged({ action: 'loadingError', rowKey, error: error.message });
      console.error(`[TreeManager] Failed to load children for "${rowKey}":`, error);
    }
  }

  flatten(rows) {
    if (!this._enabled) {
      return rows.map((row, index) => this._toFlatRow(row, null, 0, index));
    }

    if (this._treeMode === 'parentId') {
      const tree = this._buildTreeFromParentId(rows);
      return this._flattenTree(tree, null, 0);
    }

    const rootRows = rows.filter((row) => !row[this._parentIdField] || this._treeMode === 'children');
    return this._flattenTree(rootRows, null, 0);
  }

  _buildTreeFromParentId(rows) {
    const rowMap = new Map();
    const roots = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = String(row.id ?? i);
      rowMap.set(key, { ...row, _treeKey: key, _treeChildren: [] });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = String(row.id ?? i);
      const parentId = row[this._parentIdField];
      const current = rowMap.get(key);
      if (parentId != null) {
        const parent = rowMap.get(String(parentId));
        if (parent) {
          parent._treeChildren.push(current);
        } else {
          roots.push(current);
        }
      } else {
        roots.push(current);
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
      flatRow._children = rawChildren;
      flatRow._descendantRowKeys = this._collectDescendantRowKeys(rawChildren);
      flat.push(flatRow);

      if (isExpanded && rawChildren.length > 0) {
        flat.push(...this._flattenTree(rawChildren, key, depth + 1));
      } else if (isLoading) {
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
      _children: row[this._childrenField] ?? null,
      _descendantRowKeys: [],
      ...row,
    };
  }

  _collectDescendantRowKeys(rows) {
    const keys = [];
    const visit = (items) => {
      for (const item of items ?? []) {
        const key = this._getKey(item);
        keys.push(key);
        const children = this._treeMode === 'parentId'
          ? (item._treeChildren ?? [])
          : (item[this._childrenField] ?? this._childrenCache.get(key) ?? []);
        if (children.length > 0) {
          visit(children);
        }
      }
    };
    visit(rows);
    return keys;
  }

  _getKey(row) {
    return String(row._treeKey ?? row.id ?? '');
  }

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
