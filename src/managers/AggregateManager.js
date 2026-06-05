export class AggregateManager {
  constructor(options = {}) {
    this._columnAggs = new Map();
    this._onChanged = options.onChanged ?? null;
  }

  setColumnAgg(colId, aggType) {
    if (!aggType) {
      this._columnAggs.delete(colId);
    } else {
      this._columnAggs.set(colId, aggType);
    }
    this._onChanged?.();
  }

  clearAll() {
    this._columnAggs.clear();
    this._onChanged?.();
  }

  hasAny() {
    return this._columnAggs.size > 0;
  }

  getAggType(colId) {
    return this._columnAggs.get(colId) ?? null;
  }

  // columnDefs: array of column defs, each may have def.aggregate: 'sum'|'avg'|'count'|'min'|'max'|fn
  compute(rows, columnDefs) {
    const result = {};
    const colsWithAgg = columnDefs.filter((def) => {
      const agg = def.aggregate ?? this._columnAggs.get(def.id);
      return agg != null;
    });

    if (colsWithAgg.length === 0 || rows.length === 0) return result;

    for (const def of colsWithAgg) {
      const agg = def.aggregate ?? this._columnAggs.get(def.id);
      const values = rows
        .filter((r) => r[def.field] != null && r._type !== 'group-header' && r._type !== 'tree-loading')
        .map((r) => Number(r[def.field]))
        .filter((v) => !Number.isNaN(v));

      if (typeof agg === 'function') {
        result[def.id] = { value: agg(values, rows, def), type: 'custom' };
        continue;
      }

      const count = values.length;
      const sum = values.reduce((acc, v) => acc + v, 0);

      switch (agg) {
        case 'sum':
          result[def.id] = { value: sum, type: 'sum' };
          break;
        case 'avg':
          result[def.id] = { value: count > 0 ? sum / count : 0, type: 'avg' };
          break;
        case 'count':
          result[def.id] = { value: count, type: 'count' };
          break;
        case 'min':
          result[def.id] = { value: count > 0 ? Math.min(...values) : 0, type: 'min' };
          break;
        case 'max':
          result[def.id] = { value: count > 0 ? Math.max(...values) : 0, type: 'max' };
          break;
        default:
          break;
      }
    }

    return result;
  }

  destroy() {
    this._columnAggs.clear();
    this._onChanged = null;
  }
}
