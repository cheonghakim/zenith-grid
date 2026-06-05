/**
 * TextareaEditor - 장문 텍스트(textarea) 셀 편집기 생성기
 *
 * @param {Object} params
 * @param {Object} params.row - 편집 대상 행 데이터
 * @param {Object} params.def - 컬럼 정의
 * @param {*} params.value - 현재 셀 값
 * @returns {HTMLTextAreaElement}
 */
export function createTextareaEditor({ row, def, value }) {
  const textarea = document.createElement('textarea');
  textarea.className = 'ag-cell-editor';
  textarea.style.resize = 'vertical';
  textarea.style.minHeight = '60px';

  textarea.value = value === null || value === undefined ? '' : String(value);

  if (def.editorOptions?.rows) {
    textarea.rows = def.editorOptions.rows;
  }
  if (def.editorOptions?.placeholder) {
    textarea.placeholder = def.editorOptions.placeholder;
  }

  return textarea;
}
