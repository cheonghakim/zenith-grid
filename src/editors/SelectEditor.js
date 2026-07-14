/**
 * SelectEditor - 드롭다운(select) 셀 편집기 생성기
 *
 * @param {Object} params
 * @param {Object} params.row - 편집 대상 행 데이터
 * @param {Object} params.def - 컬럼 정의
 * @param {*} params.value - 현재 셀 값
 * @returns {HTMLSelectElement}
 */
export function createSelectEditor({ row, def, value }) {
  const select = document.createElement('select');
  select.className = 'ck-zenith-grid-cell-editor';

  // 컬럼 정의 또는 editorOptions에서 옵션 배열 추출
  const rawOptions = def.editorOptions?.options ?? def.options ?? [];
  const options = typeof rawOptions === 'function' ? rawOptions({ row, def }) : rawOptions;

  if (Array.isArray(options)) {
    for (const option of options) {
      const optEl = document.createElement('option');
      if (typeof option === 'object' && option !== null) {
        optEl.value = option.value !== undefined ? String(option.value) : '';
        optEl.textContent = option.label !== undefined ? String(option.label) : optEl.value;
      } else {
        optEl.value = String(option);
        optEl.textContent = String(option);
      }
      select.appendChild(optEl);
    }
  }

  select.value = value === null || value === undefined ? '' : String(value);
  return select;
}
