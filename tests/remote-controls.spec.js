import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const htmlPath = path.join(rootDir, 'examples', 'index.html');
const mainPath = path.join(rootDir, 'examples', 'main.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const main = fs.readFileSync(mainPath, 'utf8');

function findIds(source) {
  return [...source.matchAll(/getElementById\('([^']+)'\)/g)].map((match) => match[1]);
}

describe('example remote controls', () => {
  it('keeps all required main.js controls in index.html', () => {
    const ids = [...new Set(findIds(main))];
    const optionalIds = new Set(['resetButton']);
    const missing = ids.filter((id) => !optionalIds.has(id) && !html.includes(`id="${id}"`));

    expect(missing).toEqual([]);
  });

  it('includes the compact remote-control actions we expose in the demo', () => {
    const requiredIds = [
      'reloadButton',
      'expandTreeButton',
      'collapseTreeButton',
      'nextPageButton',
      'prevPageButton',
      'loadMoreButton',
      'variableHeightButton',
      'appendRowsButton',
      'updateFirstRowButton',
      'patchFirstRowButton',
      'removeLastRowButton',
      'liveButton',
      'startStreamButton',
      'stopStreamButton',
      'pauseLiveButton',
      'liveAnimationButton',
      'benchmarkRenderButton',
      'benchmarkScenarioButton',
      'benchmarkScrollButton',
    ];

    for (const id of requiredIds) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
