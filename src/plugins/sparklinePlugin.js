/**
 * createSparklinePlugin - 순수 SVG 기반 셀 내 스파크라인 플러그인
 *
 * ColumnDef에 sparkline 옵션 추가:
 *   { id: 'trend', sparkline: { type: 'line'|'bar'|'area', field: 'history', color: '#0f4c81' } }
 *
 * row.history 는 숫자 배열이어야 합니다: [10, 20, 15, 30, 25]
 */

function renderSparklineSvg(values, { type = 'line', color = '#0f4c81', width = 80, height = 28 } = {}) {
  if (!Array.isArray(values) || values.length === 0) return null;

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
  svg.style.overflow = 'visible';

  const xStep = nums.length > 1 ? w / (nums.length - 1) : w;
  const toX = (i) => pad + (nums.length > 1 ? i * xStep : w / 2);
  const toY = (v) => pad + h - ((v - min) / range) * h;

  if (type === 'bar') {
    const barW = Math.max(1, xStep * 0.7);
    nums.forEach((v, i) => {
      const barH = ((v - min) / range) * h || 1;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(toX(i) - barW / 2));
      rect.setAttribute('y', String(pad + h - barH));
      rect.setAttribute('width', String(barW));
      rect.setAttribute('height', String(barH));
      rect.setAttribute('fill', color);
      rect.setAttribute('rx', '1');
      svg.appendChild(rect);
    });
  } else {
    // line or area
    const points = nums.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

    if (type === 'area') {
      const areaPoints = [
        `${toX(0)},${pad + h}`,
        ...nums.map((v, i) => `${toX(i)},${toY(v)}`),
        `${toX(nums.length - 1)},${pad + h}`,
      ].join(' ');
      const area = document.createElementNS(ns, 'polygon');
      area.setAttribute('points', areaPoints);
      area.setAttribute('fill', color);
      area.setAttribute('fill-opacity', '0.18');
      area.setAttribute('stroke', 'none');
      svg.appendChild(area);
    }

    const polyline = document.createElementNS(ns, 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', color);
    polyline.setAttribute('stroke-width', '1.5');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(polyline);

    // Highlight last point
    const lastX = toX(nums.length - 1);
    const lastY = toY(nums[nums.length - 1]);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', String(lastX));
    dot.setAttribute('cy', String(lastY));
    dot.setAttribute('r', '2.5');
    dot.setAttribute('fill', color);
    svg.appendChild(dot);
  }

  return svg;
}

export function createSparklinePlugin(options = {}) {
  return {
    name: options.name ?? 'sparkline',
    hooks: {
      afterCellRender({ row, def, cell }) {
        const cfg = def.sparkline;
        if (!cfg) return;

        const field = cfg.field ?? def.field;
        const values = row[field];
        if (!Array.isArray(values)) return;

        cell.innerHTML = '';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = cfg.align ?? 'center';

        const svg = renderSparklineSvg(values, {
          type: cfg.type ?? 'line',
          color: cfg.color ?? '#0f4c81',
          width: cfg.width ?? (def.state?.width ? def.state.width - 20 : 80),
          height: cfg.height ?? 28,
        });

        if (svg) cell.appendChild(svg);
      },
    },
  };
}
