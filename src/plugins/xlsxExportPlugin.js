/**
 * xlsxExportPlugin - exceljs를 동적으로 로드하여 네이티브 XLSX 내보내기를 지원하는 플러그인
 *
 * @param {Object} options
 * @param {string} [options.name='xlsx-export'] - 플러그인 이름
 * @param {string} [options.fileName='zenith-grid-export.xlsx'] - 기본 내보내기 파일명
 * @returns {Object}
 */
export function createXlsxExportPlugin(options = {}) {
  return {
    name: options.name ?? 'xlsx-export',
    install(core) {
      core.downloadXlsx = async (exportOptions = {}) => {
        let ExcelJS;
        try {
          // 1. npm 패키지 시도
          const libName = 'exceljs';
          const ExcelJSModule = await import(/* @vite-ignore */ libName);
          ExcelJS = ExcelJSModule.Workbook ? ExcelJSModule : ExcelJSModule.default;
        } catch (e) {
          try {
            // 2. 브라우저 CDN 시도
            const cdnUrl = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
            ExcelJS = await new Promise((resolve, reject) => {
              if (globalThis.ExcelJS) {
                resolve(globalThis.ExcelJS);
                return;
              }
              const script = document.createElement('script');
              script.src = cdnUrl;
              script.onload = () => {
                if (globalThis.ExcelJS) {
                  resolve(globalThis.ExcelJS);
                } else {
                  reject(new Error('ExcelJS not found on global scope after script load'));
                }
              };
              script.onerror = (err) => reject(err);
              document.head.appendChild(script);
            });
          } catch (err) {
            console.error('[XlsxExportPlugin] ExcelJS 로드 실패. 기존 Excel HTML 다운로드로 대체합니다.', err);
            core.downloadExcel(exportOptions);
            return;
          }
        }

        if (!ExcelJS) {
          core.downloadExcel(exportOptions);
          return;
        }

        try {
          const columns = core._resolveExportColumns(exportOptions);
          const rows = core._resolveCsvRows(exportOptions);

          // 헤더 행 생성
          const headers = columns.map(col => col.def.headerName ?? col.def.header ?? col.def.id);
          
          // 데이터 행 생성 (포맷터 적용 포함)
          const data = rows.map(row => {
            return columns.map(col => {
              const val = row[col.def.field];
              if (typeof col.def.formatter === 'function') {
                return col.def.formatter(val, row);
              }
              return val;
            });
          });

          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet(exportOptions.sheetName ?? 'Sheet1');

          // 컬럼 너비 설정 (그리드 width px → 엑셀 character 단위로 환산)
          worksheet.columns = columns.map(col => ({
            width: Math.round((col.state?.width ?? 120) / 7),
          }));

          // 다중 레벨 헤더 처리 (컬럼 그룹 merged cell)
          const multiHeaders = core._buildExcelHeaderRows?.(columns);
          let dataStartRow = 1;

          if (multiHeaders && multiHeaders.length > 0) {
            multiHeaders.forEach((headerLevel, levelIdx) => {
              const excelRowData = headerLevel.map(({ text }) => text);
              const excelRow = worksheet.addRow(excelRowData);
              dataStartRow++;

              if (excelRow) {
                excelRow.height = 20;
                // 병합 처리
                let colOffset = 1;
                headerLevel.forEach(({ colspan, rowspan }) => {
                  const endCol = colOffset + (colspan || 1) - 1;
                  const endRow = levelIdx + 1 + (rowspan || 1) - 1;
                  if ((colspan > 1 || rowspan > 1) && worksheet.mergeCells) {
                    try {
                      worksheet.mergeCells(levelIdx + 1, colOffset, endRow, endCol);
                    } catch {}
                  }
                  const cell = worksheet.getRow(levelIdx + 1).getCell(colOffset);
                  if (cell) {
                    cell.font = { bold: true, color: { argb: 'FF18212B' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colspan > 1 ? 'FFDAEAF8' : 'FFEEF3F8' } };
                    cell.border = {
                      top: { style: 'thin', color: { argb: 'FFD7DEE7' } },
                      bottom: { style: colspan > 1 ? 'thin' : 'medium', color: { argb: colspan > 1 ? 'FFD7DEE7' : 'FF0F4C81' } },
                      left: { style: 'thin', color: { argb: 'FFD7DEE7' } },
                      right: { style: 'thin', color: { argb: 'FFD7DEE7' } },
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
                  }
                  colOffset = endCol + 1;
                });
              }
            });
          }

          // 단일 레벨 헤더 행 추가 및 스타일 적용
          const headerRow = multiHeaders ? null : worksheet.addRow(headers);
          if (headerRow) {
            headerRow.height = 20;
            headerRow.eachCell?.((cell) => {
              if (!cell) return;
              cell.font = { bold: true, color: { argb: 'FF18212B' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3F8' } };
              cell.border = {
                top:    { style: 'thin', color: { argb: 'FFD7DEE7' } },
                bottom: { style: 'medium', color: { argb: 'FF0F4C81' } },
                left:   { style: 'thin', color: { argb: 'FFD7DEE7' } },
                right:  { style: 'thin', color: { argb: 'FFD7DEE7' } },
              };
              cell.alignment = { vertical: 'middle', wrapText: false };
            });
          }

          // 데이터 행 추가 및 스타일 적용
          const thinBorder = {
            top:    { style: 'thin', color: { argb: 'FFD7DEE7' } },
            bottom: { style: 'thin', color: { argb: 'FFD7DEE7' } },
            left:   { style: 'thin', color: { argb: 'FFD7DEE7' } },
            right:  { style: 'thin', color: { argb: 'FFD7DEE7' } },
          };

          data.forEach((rowData, rowIndex) => {
            const dataRow = worksheet.addRow(rowData);
            if (!dataRow) return;
            dataRow.height = 18;
            const isOdd = rowIndex % 2 === 1;
            dataRow.eachCell?.({ includeEmpty: true }, (cell, colNumber) => {
              if (!cell) return;
              cell.border = thinBorder;
              cell.alignment = { vertical: 'middle', wrapText: false };
              if (isOdd) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBFCFE' } };
              }
              // 숫자 컬럼 오른쪽 정렬
              const colDef = columns[colNumber - 1]?.def;
              if (colDef?.type === 'number' || colDef?.align === 'right') {
                cell.alignment = { ...cell.alignment, horizontal: 'right' };
              }
            });
          });

          const fileName = exportOptions.fileName ?? options.fileName ?? 'zenith-grid-export.xlsx';

          // Node.js (Vitest) 또는 JSDOM 등 URL.createObjectURL이 없는 환경 검사
          if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
            return await workbook.xlsx.writeBuffer();
          }

          // 브라우저 파일 쓰기
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('[XlsxExportPlugin] 엑셀 생성 또는 다운로드 중 에러가 발생하여 HTML 다운로드로 대체합니다.', err);
          core.downloadExcel(exportOptions);
        }
      };
    },
    uninstall(core) {
      if (core) {
        delete core.downloadXlsx;
      }
    }
  };
}
