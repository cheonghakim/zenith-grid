export const uppercaseTeamPlugin = {
  name: 'uppercase-team',
  hooks: {
    afterDataProcess(result) {
      const decorateRow = (row) => {
        if (row.team == null) return row;
        return {
          ...row,
          team: String(row.team).toUpperCase(),
        };
      };

      return {
        ...result,
        flatRows: result.flatRows.map(decorateRow),
        displayRows: result.displayRows.map(decorateRow),
      };
    },
  },
};

export const scorePrefixPlugin = {
  name: 'score-prefix',
  hooks: {
    afterDataProcess(result) {
      const decorateRow = (row) => {
        if (row.score == null || row._type === 'group-header' || row._type === 'tree-loading') {
          return row;
        }

        const value = typeof row.score === 'number'
          ? row.score.toLocaleString()
          : String(row.score);

        return {
          ...row,
          score: `PTS ${value}`,
        };
      };

      return {
        ...result,
        flatRows: result.flatRows.map(decorateRow),
        displayRows: result.displayRows.map(decorateRow),
      };
    },
  },
};

export { createContextMenuPlugin } from './contextMenuPlugin.js';
export { createCsvShortcutPlugin } from './csvShortcutPlugin.js';
export { createXlsxExportPlugin } from './xlsxExportPlugin.js';
export { createSparklinePlugin } from './sparklinePlugin.js';
// createEchartsPlugin: echarts 패키지 필요 → 직접 import 사용
// export { createEchartsPlugin } from './echartsPlugin.js';
