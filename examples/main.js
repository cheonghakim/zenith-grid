import { createGrid } from '../src/index.js';
import '../src/styles/grid.css';

const rowCountEl = document.getElementById('rowCount');
const selectedCountEl = document.getElementById('selectedCount');
const quickFilterInput = document.getElementById('quickFilterInput');
const statusFilterSelect = document.getElementById('statusFilterSelect');
const resetButton = document.getElementById('resetButton');
const reloadButton = document.getElementById('reloadButton');
const gridHost = document.getElementById('gridApp');

const columns = [
  { id: 'id', field: 'id', header: 'ID', width: 84, type: 'number', align: 'right' },
  { id: 'name', field: 'name', header: 'Operator', width: 220 },
  { id: 'team', field: 'team', header: 'Team', width: 160 },
  { id: 'status', field: 'status', header: 'Status', width: 120 },
  {
    id: 'score',
    field: 'score',
    header: 'Score',
    width: 120,
    type: 'number',
    align: 'right',
    formatter: ({ value }) => value.toLocaleString(),
  },
  { id: 'updatedAt', field: 'updatedAt', header: 'Updated At', width: 180, type: 'date' },
];

function createRows(count = 2500) {
  const statuses = ['Active', 'Paused', 'Review'];
  const teams = ['Red', 'Blue', 'Gold', 'Green'];

  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const status = statuses[index % statuses.length];
    const team = teams[index % teams.length];
    const updatedAt = new Date(Date.now() - index * 3600_000).toISOString().slice(0, 19).replace('T', ' ');

    return {
      id,
      name: `Operator ${String(id).padStart(4, '0')}`,
      team,
      status,
      score: 1000 + ((id * 37) % 9000),
      updatedAt,
    };
  });
}

let currentRows = createRows();

const grid = createGrid(gridHost, {
  columns,
  rows: currentRows,
  rowKey: 'id',
  rowHeight: 40,
});

grid.on('render', ({ totalCount }) => {
  rowCountEl.textContent = totalCount.toLocaleString();
});

grid.on('selection-change', ({ selectedCount }) => {
  selectedCountEl.textContent = selectedCount.toLocaleString();
});

quickFilterInput.addEventListener('input', (event) => {
  grid.setQuickFilter(event.target.value, ['name', 'team', 'status']);
});

statusFilterSelect.addEventListener('change', (event) => {
  const value = event.target.value;
  if (!value) {
    grid.clearFilters();
    grid.setQuickFilter(quickFilterInput.value, ['name', 'team', 'status']);
    return;
  }

  grid.clearFilters();
  grid.setQuickFilter(quickFilterInput.value, ['name', 'team', 'status']);
  grid._filterManager.setColumnFilter('status', {
    type: 'select',
    field: 'status',
    value,
  });
});

resetButton.addEventListener('click', () => {
  quickFilterInput.value = '';
  statusFilterSelect.value = '';
  grid.clearFilters();
  selectedCountEl.textContent = '0';
});

reloadButton.addEventListener('click', () => {
  currentRows = createRows();
  grid.setData(currentRows);
});
