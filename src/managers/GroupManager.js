/**
 * GroupManager - 그룹 모드 상태 및 flatten 계산
 *
 * 핵심 과제: group + virtual scroll
 * → 그룹 헤더 행 + 데이터 행을 하나의 flat 배열로 만들어야 virtual scroll이 동작
 *
 * 구조:
 * [group-header: A (3)]
 * [data: A1]
 * [data: A2]
 * [data: A3]
 * [group-header: B (2)]
 * [data: B1]
 * [data: B2]
 *
 * 접기/펼치기 상태는 groupKey Set으로 관리.
 * groupKey = 그룹 경로 (중첩 그룹 지원): "dept=eng", "dept=eng__role=fe"
 */
export class GroupManager {
  /**
   * @param {Object} options
   * @param {Function} [options.onChanged]
   */
  constructor(options = {}) {
    this._onChanged = options.onChanged ?? (() => {});
    this._enabled = false;

    /** @type {string[]} 그룹 기준 필드 배열 (순서가 중첩 순서) */
    this._groupByFields = [];

    /** @type {Set<string>} 접힌 그룹 키 Set (없으면 펼침이 기본) */
    this._collapsedGroups = new Set();

    /** @type {Map<string, AggregationDef[]>} 집계 정의 */
    this._aggregations = new Map(); // field -> [{type: 'sum'|'avg'|'count'|'custom', fn?}]

    /** @type {boolean} 그룹 row 선택 시 자식도 선택 */
    this._selectGroupSelectsChildren = false;
  }

  // ─── 설정 ──────────────────────────────────────────────────

  enable(groupByFields, options = {}) {
    if (!Array.isArray(groupByFields) || groupByFields.length === 0) {
      console.warn('[GroupManager] groupByFields must be a non-empty array.');
      return;
    }
    this._groupByFields = groupByFields;
    this._enabled = true;
    this._collapsedGroups.clear();
    if (options.aggregations) {
      this._aggregations = new Map(Object.entries(options.aggregations));
    }
    this._selectGroupSelectsChildren = options.selectGroupSelectsChildren ?? false;
    this._onChanged({ action: 'enable' });
  }

  disable() {
    this._enabled = false;
    this._groupByFields = [];
    this._collapsedGroups.clear();
    this._onChanged({ action: 'disable' });
  }

  isEnabled() {
    return this._enabled;
  }

  // ─── 접기/펼치기 ────────────────────────────────────────────

  collapseGroup(groupKey) {
    this._collapsedGroups.add(groupKey);
    this._onChanged({ action: 'collapse', groupKey });
  }

  expandGroup(groupKey) {
    this._collapsedGroups.delete(groupKey);
    this._onChanged({ action: 'expand', groupKey });
  }

  toggleGroup(groupKey) {
    if (this._collapsedGroups.has(groupKey)) {
      this.expandGroup(groupKey);
    } else {
      this.collapseGroup(groupKey);
    }
  }

  collapseAll() {
    // 실제 그룹키를 모르는 상태 - flatten 후 모든 그룹키를 받아서 collapse
    this._onChanged({ action: 'collapseAll' });
  }

  expandAll() {
    this._collapsedGroups.clear();
    this._onChanged({ action: 'expandAll' });
  }

  isCollapsed(groupKey) {
    return this._collapsedGroups.has(groupKey);
  }

  // ─── Flatten ───────────────────────────────────────────────

  /**
   * 필터된 rows를 그룹 구조의 flat 배열로 변환
   * @param {Object[]} rows - 정렬+필터된 원본 rows
   * @returns {FlatRow[]}
   */
  flatten(rows) {
    if (!this._enabled || this._groupByFields.length === 0) {
      return rows.map((r, i) => this._toDataRow(r, i, 0));
    }

    const grouped = this._groupBy(rows, this._groupByFields, 0, '');
    const flat = [];
    this._flattenGroups(grouped, flat, 0);

    // collapseAll 처리: flatten 후 발견된 모든 그룹키를 collapse
    return flat;
  }

  /**
   * 재귀적 그룹핑
   * @returns {{ key: string, value: any, rows: Object[], subGroups: Map|null, depth: number }[]}
   */
  _groupBy(rows, fields, depth, parentKey) {
    if (fields.length === 0) return null;

    const field = fields[0];
    const remaining = fields.slice(1);
    const groups = new Map(); // value -> rows

    for (const row of rows) {
      const val = row[field] ?? '__null__';
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val).push(row);
    }

    const result = [];
    for (const [value, groupRows] of groups) {
      const groupKey = parentKey ? `${parentKey}__${field}=${value}` : `${field}=${value}`;
      result.push({
        key: groupKey,
        field,
        value: value === '__null__' ? null : value,
        rows: groupRows,
        subGroups: remaining.length > 0 ? this._groupBy(groupRows, remaining, depth + 1, groupKey) : null,
        depth,
      });
    }

    return result;
  }

  /**
   * 그룹 구조를 flat 배열로 펼침
   */
  _flattenGroups(groups, flat, depth) {
    if (!groups) return;

    for (const group of groups) {
      const aggregations = this._calcAggregations(group.rows);

      const headerRow = {
        _type: 'group-header',
        _rowKey: `__group__${group.key}`,
        _groupKey: group.key,
        _groupField: group.field,
        _groupValue: group.value,
        _groupDepth: depth,
        _depth: depth,
        _childCount: group.rows.length,
        _isExpanded: !this._collapsedGroups.has(group.key),
        _aggregations: aggregations,
        // 그룹 헤더 행에 집계값도 표시 가능하도록 포함
        [group.field]: group.value,
        ...aggregations,
      };

      flat.push(headerRow);

      if (!this._collapsedGroups.has(group.key)) {
        if (group.subGroups) {
          // 중첩 그룹
          this._flattenGroups(group.subGroups, flat, depth + 1);
        } else {
          // 데이터 행
          for (let i = 0; i < group.rows.length; i++) {
            flat.push(this._toDataRow(group.rows[i], flat.length, depth + 1));
          }
        }
      }
    }
  }

  // ─── 집계 계산 ─────────────────────────────────────────────

  _calcAggregations(rows) {
    if (this._aggregations.size === 0) return {};

    const result = {};
    for (const [field, aggDefs] of this._aggregations) {
      const values = rows.map((r) => r[field]).filter((v) => v != null);
      for (const aggDef of aggDefs) {
        const key = `__agg_${field}_${aggDef.type}`;
        result[key] = this._calcAgg(values, aggDef);
      }
    }
    return result;
  }

  _calcAgg(values, aggDef) {
    if (aggDef.type === 'custom' && aggDef.fn) {
      return aggDef.fn(values);
    }
    if (values.length === 0) return null;

    switch (aggDef.type) {
      case 'count': return values.length;
      case 'sum': return values.reduce((a, b) => a + Number(b), 0);
      case 'avg': {
        const sum = values.reduce((a, b) => a + Number(b), 0);
        return sum / values.length;
      }
      case 'min': return Math.min(...values.map(Number));
      case 'max': return Math.max(...values.map(Number));
      default: return null;
    }
  }

  _toDataRow(raw, flatIndex, depth) {
    return {
      _type: 'data',
      _flatIndex: flatIndex,
      _rowKey: raw._rowKey ?? String(raw.id ?? flatIndex),
      _depth: depth,
      ...raw,
    };
  }

  // ─── 상태 직렬화 ───────────────────────────────────────────

  serializeState() {
    return {
      groupByFields: [...this._groupByFields],
      collapsedGroups: [...this._collapsedGroups],
    };
  }

  applySerializedState(state) {
    if (state.groupByFields) this._groupByFields = state.groupByFields;
    if (state.collapsedGroups) {
      this._collapsedGroups = new Set(state.collapsedGroups);
    }
  }

  getState() {
    return {
      enabled: this._enabled,
      groupByFields: this._groupByFields,
      collapsedGroups: new Set(this._collapsedGroups),
    };
  }

  destroy() {
    this._collapsedGroups.clear();
    this._aggregations.clear();
  }
}
