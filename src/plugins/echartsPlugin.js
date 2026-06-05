/**
 * echartsPlugin - Apache ECharts 셀 내 미니 차트 플러그인
 *
 * 사용법:
 *   grid.usePlugin(createEchartsPlugin());
 *   column: { id: 'trend', echart: { type: 'area', dataField: 'history', color: '#0f4c81' } }
 *
 * echart.type: 'line' | 'area' | 'bar' | 'scatter' | 'pie'
 */

let _echarts = null;
let _loadPromise = null;

/** ECharts 로드 실패 시 순수 SVG 폴백 */
function _svgFallback(values, color, width, height) {
  const nums = values.map(Number).filter((v) => !Number.isNaN(v));
  if (nums.length === 0) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.style.display = 'block';
  const xStep = nums.length > 1 ? w / (nums.length - 1) : w;
  const toX = (i) => pad + (nums.length > 1 ? i * xStep : w / 2);
  const toY = (v) => pad + h - ((v - min) / range) * h;
  const points = nums.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const poly = document.createElementNS(ns, 'polyline');
  poly.setAttribute('points', points);
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', color);
  poly.setAttribute('stroke-width', '1.5');
  poly.setAttribute('stroke-linecap', 'round');
  svg.appendChild(poly);
  return svg;
}

function _loadECharts() {
  if (_echarts) return Promise.resolve(_echarts);
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    // 1. npm 패키지 (Vite pre-bundled)
    try {
      const mod = await import('echarts');
      _echarts = mod.default ?? mod;
      return _echarts;
    } catch { /* npm 없음 */ }

    // 2. 이미 전역에 로드된 경우
    if (globalThis.echarts) {
      _echarts = globalThis.echarts;
      return _echarts;
    }

    // 3. CDN 폴백
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
      script.onload = () => {
        if (globalThis.echarts) { _echarts = globalThis.echarts; resolve(_echarts); }
        else reject(new Error('[echartsPlugin] ECharts not found on global after CDN load'));
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  })();

  return _loadPromise;
}

function _buildOption(cfg, data) {
  const color = cfg.color ?? '#0f4c81';
  const type = cfg.type ?? 'line';

  if (type === 'bar') {
    return {
      grid: { top: 2, bottom: 2, left: 2, right: 2 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', show: false },
      series: [{ type: 'bar', data, itemStyle: { color, borderRadius: 1 }, barCategoryGap: '20%' }],
    };
  }

  if (type === 'pie') {
    return {
      series: [{
        type: 'pie', radius: ['30%', '80%'],
        data: data.map((v, i) => ({ value: v, name: String(i) })),
        label: { show: false }, emphasis: { disabled: true },
      }],
    };
  }

  if (type === 'scatter') {
    return {
      grid: { top: 2, bottom: 2, left: 2, right: 2 },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'value', show: false },
      series: [{ type: 'scatter', data: data.map((v, i) => [i, v]), symbolSize: 4, itemStyle: { color } }],
    };
  }

  // line / area (default)
  const isArea = type === 'area';
  return {
    grid: { top: 2, bottom: 2, left: 2, right: 2 },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line', data, smooth: true, symbol: 'none',
      lineStyle: { color, width: 1.5 },
      areaStyle: isArea ? { color, opacity: 0.15 } : undefined,
    }],
  };
}

function _renderChart(ec, container, cfg, data) {
  const chart = ec.init(container, null, { renderer: 'svg' });
  chart.setOption(_buildOption(cfg, data));

  // 셀이 DOM에서 제거되면 차트 정리
  const observer = new MutationObserver(() => {
    if (!container.isConnected) { chart.dispose(); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function createEchartsPlugin(options = {}) {
  return {
    name: options.name ?? 'echarts',

    /**
     * 플러그인 설치 시 ECharts를 즉시 프리로드.
     * 셀 렌더링 전에 로드를 완료하여 afterCellRender에서 동기적으로 사용.
     */
    install(core) {
      _loadECharts()
        .then(() => {
          // ECharts 로드 완료 → 이미 렌더된 셀에 차트 적용하기 위해 재렌더
          void core.refresh();
        })
        .catch((err) => {
          console.warn('[echartsPlugin] ECharts 로드 실패, SVG 폴백 사용:', err);
          void core.refresh();
        });
    },

    hooks: {
      afterCellRender({ row, def, cell }) {
        const cfg = def.echart;
        if (!cfg) return;

        const dataField = cfg.dataField ?? def.field;
        const data = row[dataField];
        if (!Array.isArray(data) || data.length === 0) return;

        const cellWidth = parseInt(cell.style.width) || 120;
        const cellHeight = cfg.height ?? 32;

        const container = document.createElement('div');
        container.style.width = `${cellWidth - 8}px`;
        container.style.height = `${cellHeight}px`;
        container.style.margin = '0 4px';

        cell.innerHTML = '';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.appendChild(container);

        if (_echarts) {
          // ECharts 이미 로드됨 → 동기적으로 바로 렌더링
          _renderChart(_echarts, container, cfg, data);
        } else {
          // 아직 로딩 중 → SVG 폴백 표시 (install의 refresh()가 나중에 대체)
          const fallback = _svgFallback(data, cfg.color ?? '#0f4c81', cellWidth - 8, cellHeight);
          if (fallback) container.appendChild(fallback);
        }
      },
    },
  };
}
