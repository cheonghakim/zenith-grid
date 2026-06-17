/**
 * DateEditor - 날짜(input[type="date"]) 셀 편집기 생성기
 *
 * @param {Object} params
 * @param {Object} params.row - 편집 대상 행 데이터
 * @param {Object} params.def - 컬럼 정의
 * @param {*} params.value - 현재 셀 값
 * @returns {HTMLInputElement}
 */
export function createDateEditor({ row, def, value }) {
  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'ck-high-grid-cell-editor';

  // 값을 YYYY-MM-DD 형식으로 포맷팅
  let dateStr = '';
  if (value) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      dateStr = date.toISOString().split('T')[0];
    } else {
      dateStr = String(value);
    }
  }
  input.value = dateStr;

  // editorOptions에서 최소/최대 날짜 제한 지원
  if (def.editorOptions?.min) {
    input.min = def.editorOptions.min;
  }
  if (def.editorOptions?.max) {
    input.max = def.editorOptions.max;
  }

  return input;
}
