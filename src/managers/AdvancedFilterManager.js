/**
 * AdvancedFilterManager - AND/OR 조건 트리 기반 필터
 *
 * 필터 트리 형식:
 *   Branch: { type: 'AND'|'OR', conditions: [...] }
 *   Leaf:   { field, operator, value, filterType? }
 */
export class AdvancedFilterManager {
  constructor(options = {}) {
    this._filter = null;
    this._onChanged = options.onChanged ?? null;
  }

  setFilter(filterTree) {
    this._filter = filterTree ?? null;
    this._onChanged?.(this.getState());
  }

  clearFilter() {
    this._filter = null;
    this._onChanged?.(this.getState());
  }

  hasFilter() {
    return this._filter != null;
  }

  getState() {
    return { filter: this._filter ? JSON.parse(JSON.stringify(this._filter, (k, v) => typeof v === 'function' ? undefined : v)) : null };
  }

  evaluate(row) {
    if (!this._filter) return true;
    return this._evaluateNode(row, this._filter);
  }

  _evaluateNode(row, node) {
    if (!node) return true;

    if (node.type === 'AND') {
      return (node.conditions ?? []).every((c) => this._evaluateNode(row, c));
    }
    if (node.type === 'OR') {
      return (node.conditions ?? []).some((c) => this._evaluateNode(row, c));
    }

    // Leaf condition
    return this._evaluateLeaf(row, node);
  }

  _evaluateLeaf(row, leaf) {
    const { field, operator, value, filterType = 'text' } = leaf;
    const cellValue = row[field];

    if (cellValue == null) return operator === 'empty' || operator === 'notEquals';
    if (typeof leaf.fn === 'function') return leaf.fn(cellValue, row, leaf);

    switch (filterType) {
      case 'number': {
        const num = Number(cellValue);
        switch (operator) {
          case 'equals': return num === Number(value);
          case 'notEquals': return num !== Number(value);
          case 'greaterThan': return num > Number(value);
          case 'greaterThanOrEqual': return num >= Number(value);
          case 'lessThan': return num < Number(value);
          case 'lessThanOrEqual': return num <= Number(value);
          case 'between': return Array.isArray(value) && num >= Number(value[0]) && num <= Number(value[1]);
          default: return true;
        }
      }
      case 'date': {
        const d = new Date(cellValue);
        const fd = new Date(value);
        switch (operator) {
          case 'equals': return d.toDateString() === fd.toDateString();
          case 'before': return d < fd;
          case 'after': return d > fd;
          case 'between': return Array.isArray(value) && d >= new Date(value[0]) && d <= new Date(value[1]);
          default: return true;
        }
      }
      case 'select': {
        if (Array.isArray(value)) return value.some((v) => String(v) === String(cellValue));
        return String(value) === String(cellValue);
      }
      default: {
        const cell = String(cellValue).toLowerCase();
        const filter = String(value ?? '').toLowerCase();
        switch (operator) {
          case 'contains': return cell.includes(filter);
          case 'notContains': return !cell.includes(filter);
          case 'equals': return cell === filter;
          case 'notEquals': return cell !== filter;
          case 'startsWith': return cell.startsWith(filter);
          case 'endsWith': return cell.endsWith(filter);
          case 'empty': return cell.trim() === '';
          case 'notEmpty': return cell.trim() !== '';
          default: return cell.includes(filter);
        }
      }
    }
  }

  destroy() {
    this._filter = null;
    this._onChanged = null;
  }
}
