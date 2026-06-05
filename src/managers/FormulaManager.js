/**
 * FormulaManager - 기본 수식(=SUM, =AVG, 셀 참조) 평가 엔진
 *
 * 이 매니저는 그리드 데이터 스토어 내의 수식 문자열을 파싱하고,
 * 각 셀 간의 종속성을 재귀적으로 평가하여 결과를 산출합니다.
 * 순환 참조 감지 및 계산 결과 캐싱(Memoization)을 적용하여 안전하고 빠른 계산을 수행합니다.
 */
export class FormulaManager {
  constructor(grid) {
    this._grid = grid;
  }

  /**
   * 그리드 내 모든 수식 셀을 다시 평가하여 row 객체의 실제 필드값을 업데이트합니다.
   */
  evaluateAll() {
    const rows = this._grid._dataStore.getAll();
    const memo = new Map(); // "rowKey::colId" -> evaluated value

    // 특정 셀의 수식을 재귀적으로 평가하는 함수 (순환 참조 추적 및 메모이제이션 탑재)
    const evaluateCell = (rowKey, colId, visiting = new Set()) => {
      const cellKey = `${rowKey}::${colId}`;
      if (memo.has(cellKey)) {
        return memo.get(cellKey);
      }

      if (visiting.has(cellKey)) {
        console.warn(`[FormulaManager] Circular reference detected at: ${cellKey}`);
        return '#REF!';
      }

      const row = this._grid._dataStore.getByKey(rowKey);
      if (!row) return 0;

      const column = this._grid._columns.getDef(colId);
      if (!column) return 0;
      const field = column.field;

      const formula = row._formulas?.[field];
      if (!formula) {
        // 일반 정적 값 반환
        const val = row[field];
        if (val == null) return 0;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }

      visiting.add(cellKey);
      try {
        const result = executeFormula(formula, visiting);
        memo.set(cellKey, result);
        return result;
      } catch (err) {
        console.error(`[FormulaManager] Error evaluating cell ${cellKey}:`, err);
        return '#ERROR!';
      } finally {
        visiting.delete(cellKey);
      }
    };

    // 수식 구문 해석 및 수행
    const executeFormula = (formula, visiting) => {
      const formulaRegex = /^=(SUM|AVG)\s*\((.*)\)\s*$/i;
      const match = formula.match(formulaRegex);
      if (!match) {
        // 일반 셀 단일 참조(예: =A1) 처리
        const cellRefMatch = formula.slice(1).trim().match(/^([A-Z]+)([0-9]+)$/i);
        if (cellRefMatch) {
          const coord = parseCellCoordinate(formula.slice(1).trim());
          if (coord) {
            const target = resolveCoordinates(coord.colIndex, coord.rowIndex);
            if (target) {
              return evaluateCell(target.rowKey, target.colId, visiting);
            }
          }
        }
        return '#VALUE!';
      }

      const fnName = match[1].toUpperCase();
      const argsStr = match[2];
      const args = argsStr.split(',').map((s) => s.trim()).filter(Boolean);

      const values = [];
      for (const arg of args) {
        if (arg.includes(':')) {
          // 범위 참조 (예: A1:B10)
          const coords = parseRange(arg);
          for (const coord of coords) {
            const target = resolveCoordinates(coord.colIndex, coord.rowIndex);
            if (target) {
              const val = evaluateCell(target.rowKey, target.colId, visiting);
              if (typeof val === 'number') {
                values.push(val);
              }
            }
          }
        } else {
          const num = Number(arg);
          if (!isNaN(num)) {
            values.push(num);
          } else {
            // 단일 참조 (예: C5)
            const coord = parseCellCoordinate(arg);
            if (coord) {
              const target = resolveCoordinates(coord.colIndex, coord.rowIndex);
              if (target) {
                const val = evaluateCell(target.rowKey, target.colId, visiting);
                if (typeof val === 'number') {
                  values.push(val);
                }
              }
            }
          }
        }
      }

      if (fnName === 'SUM') {
        return values.reduce((sum, val) => sum + val, 0);
      } else if (fnName === 'AVG') {
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      }

      return '#NAME?';
    };

    // 0-based index 컬럼/로우 번호를 실제 colId 및 rowKey로 치환
    const resolveCoordinates = (colIndex, rowIndex) => {
      const leafColumns = this._grid._columns.getAllLeafColumns();
      if (colIndex < 0 || colIndex >= leafColumns.length) return null;
      const colId = leafColumns[colIndex].def.id;

      const rows = this._grid._dataStore.getAll();
      if (rowIndex < 0 || rowIndex >= rows.length) return null;
      const row = rows[rowIndex];
      const rowKey = this._grid._dataStore.getRowKey(row);

      return { rowKey, colId };
    };

    // A1 -> { colIndex: 0, rowIndex: 0 } 형태로 변환
    const parseCellCoordinate = (coord) => {
      const cellRegex = /^([A-Z]+)([0-9]+)$/i;
      const match = coord.toUpperCase().match(cellRegex);
      if (!match) return null;
      const colLetter = match[1];
      const rowNumber = parseInt(match[2], 10);

      let colIndex = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
      }
      colIndex -= 1;
      const rowIndex = rowNumber - 1;
      return { colIndex, rowIndex };
    };

    // A1:B10 -> [{colIndex, rowIndex}, ...] 형태로 변환
    const parseRange = (rangeStr) => {
      const parts = rangeStr.split(':');
      if (parts.length === 1) {
        const coord = parseCellCoordinate(parts[0]);
        if (!coord) return [];
        return [coord];
      } else if (parts.length === 2) {
        const start = parseCellCoordinate(parts[0]);
        const end = parseCellCoordinate(parts[1]);
        if (!start || !end) return [];

        const cells = [];
        const minCol = Math.min(start.colIndex, end.colIndex);
        const maxCol = Math.max(start.colIndex, end.colIndex);
        const minRow = Math.min(start.rowIndex, end.rowIndex);
        const maxRow = Math.max(start.rowIndex, end.rowIndex);

        for (let r = minRow; r <= maxRow; r += 1) {
          for (let c = minCol; c <= maxCol; c += 1) {
            cells.push({ colIndex: c, rowIndex: r });
          }
        }
        return cells;
      }
      return [];
    };

    // 모든 수식 대상 셀들을 순회하며 캐시값을 반영
    for (const row of rows) {
      if (row._formulas) {
        const rowKey = this._grid._dataStore.getRowKey(row);
        for (const field of Object.keys(row._formulas)) {
          const column = this._grid._columns
            .getAllLeafColumns()
            .find((c) => c.def.field === field || c.def.id === field);
          if (column) {
            const colId = column.def.id;
            const evaluated = evaluateCell(rowKey, colId);
            row[field] = evaluated;
          }
        }
      }
    }
  }
}
