import { FormulaManager } from '../managers/FormulaManager.js';

/**
 * formulaPlugin - hot-formula-parser(MIT)를 동적으로 로드하여 완전한 Excel 수식 엔진을 지원하는 플러그인
 *
 * 코어의 기본 FormulaManager는 `=SUM(...)`, `=AVG(...)`와 단일 셀 참조만 이해합니다.
 * 이 플러그인을 설치하면 모든 수식 평가를 hot-formula-parser로 위임해서 사칙연산(+,-,*,/,^),
 * 비교/논리 연산, formula.js에 정의된 전체 Excel 함수(MIN, MAX, IF, COUNT, VLOOKUP 등)를
 * 그대로 쓸 수 있습니다. `row._formulas[field] = "=..."` 작성 규칙과 순환 참조 감지(#REF!)는
 * 기본 엔진과 동일하게 유지됩니다.
 */

const CDN_URL = 'https://cdn.jsdelivr.net/npm/hot-formula-parser@4.0.0/dist/formula-parser.min.js';

// The built-in FormulaManager accepts `=AVG(...)` as an alias, but
// hot-formula-parser / formula.js only recognize `AVERAGE`. Rewrite the
// alias so formulas authored for the basic engine keep working once this
// plugin is installed.
function normalizeFormula(expr) {
  return expr.replace(/\bAVG\s*\(/gi, 'AVERAGE(');
}

function loadParserClass() {
  // Literal specifier (no @vite-ignore, no variable indirection) so bundlers
  // that scan dynamic import() calls — Vite's optimizeDeps included — can
  // find and pre-bundle the real installed package. With a variable or
  // @vite-ignore, the specifier is invisible to that scan, the import
  // silently fails at runtime, and every load falls through to the CDN
  // fallback below even when the package is installed.
  return import('hot-formula-parser')
    .then((mod) => mod.Parser ?? null)
    .catch(
      () =>
        new Promise((resolve, reject) => {
          if (globalThis.formulaParser?.Parser) {
            resolve(globalThis.formulaParser.Parser);
            return;
          }
          const script = document.createElement('script');
          script.src = CDN_URL;
          script.onload = () => resolve(globalThis.formulaParser?.Parser ?? null);
          script.onerror = () => reject(new Error('Failed to load hot-formula-parser from CDN'));
          document.head.appendChild(script);
        })
    );
}

class AdvancedFormulaManager {
  constructor(grid) {
    this._grid = grid;
    // Serves formulas while the parser is still loading, and stays as the
    // permanent fallback if it never loads (offline / blocked CDN).
    this._basic = new FormulaManager(grid);
    this._ParserClass = null;

    loadParserClass()
      .then((ParserClass) => {
        if (!ParserClass) throw new Error('Parser export not found in hot-formula-parser');
        this._ParserClass = ParserClass;
        if (!grid._destroyed) {
          void grid.refresh();
        }
      })
      .catch((err) => {
        console.error(
          '[FormulaPlugin] hot-formula-parser 로드 실패. 기본 SUM/AVG 엔진을 그대로 사용합니다.',
          err
        );
      });
  }

  evaluateAll() {
    if (!this._ParserClass) {
      this._basic.evaluateAll();
      return;
    }

    const rows = this._grid._dataStore.getAll();
    const memo = new Map(); // "rowKey::colId" -> evaluated value
    const parser = new this._ParserClass();

    const resolveCoordinates = (colIndex, rowIndex) => {
      const leafColumns = this._grid._columns.getAllLeafColumns();
      if (colIndex < 0 || colIndex >= leafColumns.length) return null;
      const colId = leafColumns[colIndex].def.id;

      const allRows = this._grid._dataStore.getAll();
      if (rowIndex < 0 || rowIndex >= allRows.length) return null;
      const row = allRows[rowIndex];
      const rowKey = this._grid._dataStore.getRowKey(row);

      return { rowKey, colId };
    };

    const evaluateCell = (rowKey, colId, visiting) => {
      const cellKey = `${rowKey}::${colId}`;
      if (memo.has(cellKey)) {
        return memo.get(cellKey);
      }

      if (visiting.has(cellKey)) {
        console.warn(`[FormulaPlugin] Circular reference detected at: ${cellKey}`);
        return '#REF!';
      }

      const row = this._grid._dataStore.getByKey(rowKey);
      if (!row) return 0;

      const column = this._grid._columns.getDef(colId);
      if (!column) return 0;
      const field = column.field;

      const formula = row._formulas?.[field];
      if (!formula) {
        const val = row[field];
        if (val == null) return 0;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }

      visiting.add(cellKey);
      try {
        const { result, error } = parser.parse(normalizeFormula(formula.slice(1).trim()));
        const value = error ?? (result == null ? 0 : result);
        memo.set(cellKey, value);
        return value;
      } catch (err) {
        console.error(`[FormulaPlugin] Error evaluating cell ${cellKey}:`, err);
        return '#ERROR!';
      } finally {
        visiting.delete(cellKey);
      }
    };

    // 현재 최상위 수식 평가 체인의 방문 집합 — callCellValue/callRangeValue
    // 핸들러는 parser.parse() 호출 도중 동기적으로 실행되므로 클로저로 공유한다.
    let currentVisiting = new Set();

    parser.on('callCellValue', (cellCoord, done) => {
      const target = resolveCoordinates(cellCoord.column.index, cellCoord.row.index);
      done(target ? evaluateCell(target.rowKey, target.colId, currentVisiting) : 0);
    });

    parser.on('callRangeValue', (startCellCoord, endCellCoord, done) => {
      const matrix = [];
      for (let r = startCellCoord.row.index; r <= endCellCoord.row.index; r += 1) {
        const rowValues = [];
        for (let c = startCellCoord.column.index; c <= endCellCoord.column.index; c += 1) {
          const target = resolveCoordinates(c, r);
          rowValues.push(target ? evaluateCell(target.rowKey, target.colId, currentVisiting) : null);
        }
        matrix.push(rowValues);
      }
      done(matrix);
    });

    for (const row of rows) {
      if (!row._formulas) continue;
      const rowKey = this._grid._dataStore.getRowKey(row);
      for (const field of Object.keys(row._formulas)) {
        const column = this._grid._columns
          .getAllLeafColumns()
          .find((c) => c.def.field === field || c.def.id === field);
        if (!column) continue;
        const colId = column.def.id;
        currentVisiting = new Set();
        row[field] = evaluateCell(rowKey, colId, currentVisiting);
      }
    }
  }
}

/**
 * @param {Object} options
 * @param {string} [options.name='formula-engine'] - 플러그인 이름
 * @returns {Object}
 */
export function createFormulaPlugin(options = {}) {
  return {
    name: options.name ?? 'formula-engine',
    install(core) {
      core._formulaManager = new AdvancedFormulaManager(core);
    },
    uninstall(core) {
      if (core) {
        core._formulaManager = new FormulaManager(core);
      }
    },
  };
}
