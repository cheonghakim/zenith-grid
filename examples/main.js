import {
  createGrid,
  uppercaseTeamPlugin,
  scorePrefixPlugin,
} from '../src/index.js';
import '../src/styles/grid.css';

const rowCountEl = document.getElementById('rowCount');
const visibleCountEl = document.getElementById('visibleCount');
const selectedCountEl = document.getElementById('selectedCount');
const modeValueEl = document.getElementById('modeValue');
const datasetValueEl = document.getElementById('datasetValue');
const groupingValueEl = document.getElementById('groupingValue');
const treeValueEl = document.getElementById('treeValue');
const treeDepthValueEl = document.getElementById('treeDepthValue');
const variableHeightValueEl = document.getElementById('variableHeightValue');
const paginationValueEl = document.getElementById('paginationValue');
const infiniteValueEl = document.getElementById('infiniteValue');
const pluginsValueEl = document.getElementById('pluginsValue');
const columnStateValueEl = document.getElementById('columnStateValue');
const eventLogEl = document.getElementById('eventLog');

const datasetSelect = document.getElementById('datasetSelect');
const quickFilterInput = document.getElementById('quickFilterInput');
const statusFilterSelect = document.getElementById('statusFilterSelect');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const columnSelect = document.getElementById('columnSelect');
const pinSelect = document.getElementById('pinSelect');
const widthInput = document.getElementById('widthInput');
const visibleCheckbox = document.getElementById('visibleCheckbox');

const resetButton = document.getElementById('resetButton');
const reloadButton = document.getElementById('reloadButton');
const groupButton = document.getElementById('groupButton');
const treeButton = document.getElementById('treeButton');
const expandTreeButton = document.getElementById('expandTreeButton');
const collapseTreeButton = document.getElementById('collapseTreeButton');
const clientModeButton = document.getElementById('clientModeButton');
const paginationButton = document.getElementById('paginationButton');
const infiniteButton = document.getElementById('infiniteButton');
const nextPageButton = document.getElementById('nextPageButton');
const prevPageButton = document.getElementById('prevPageButton');
const loadMoreButton = document.getElementById('loadMoreButton');
const paginationClientButton = document.getElementById('paginationClientButton');
const paginationServerButton = document.getElementById('paginationServerButton');
const infiniteClientButton = document.getElementById('infiniteClientButton');
const infiniteServerButton = document.getElementById('infiniteServerButton');
const variableHeightButton = document.getElementById('variableHeightButton');
const appendRowsButton = document.getElementById('appendRowsButton');
const updateFirstRowButton = document.getElementById('updateFirstRowButton');
const patchFirstRowButton = document.getElementById('patchFirstRowButton');
const removeLastRowButton = document.getElementById('removeLastRowButton');
const liveButton = document.getElementById('liveButton');
const pauseLiveButton = document.getElementById('pauseLiveButton');
const resumeLiveButton = document.getElementById('resumeLiveButton');
const uppercasePluginButton = document.getElementById('uppercasePluginButton');
const scorePluginButton = document.getElementById('scorePluginButton');
const applyColumnButton = document.getElementById('applyColumnButton');
const saveColumnStateButton = document.getElementById('saveColumnStateButton');
const loadColumnStateButton = document.getElementById('loadColumnStateButton');
const clearColumnStateButton = document.getElementById('clearColumnStateButton');
const gridHost = document.getElementById('gridApp');

const TEAM_NAMES = ['Red', 'Blue', 'Gold', 'Green'];
const STATUS_NAMES = ['Active', 'Paused', 'Review'];
const REGIONS = ['Seoul', 'Tokyo', 'Berlin', 'Austin', 'Dubai', 'Toronto'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const QUEUES = ['Intake', 'Analysis', 'Escalation', 'Containment', 'Audit'];
const OWNERS = ['Ari', 'Bo', 'Caro', 'Dain', 'Eli', 'Faye', 'Gio'];
const LAST_ACTIONS = ['Reviewed alert graph', 'Pinned follow-up', 'Escalated runbook', 'Merged evidence bundle'];
const NOTE_FRAGMENTS = [
  'Correlates incident timeline against regional telemetry.',
  'Requires manual sign-off because containment touches a cross-border workflow.',
  'Includes long analyst notes so variable row height can be exercised realistically.',
  'Used to verify wrapped cells, sticky pinned columns, and horizontal virtualization together.',
];

const columns = [
  { id: 'id', field: 'id', header: 'ID', width: 84, type: 'number', align: 'right' },
  { id: 'name', field: 'name', header: 'Operator', width: 220 },
  { id: 'team', field: 'team', header: 'Team', width: 140 },
  { id: 'status', field: 'status', header: 'Status', width: 120 },
  { id: 'score', field: 'score', header: 'Score', width: 120, type: 'number', align: 'right' },
  { id: 'region', field: 'region', header: 'Region', width: 160 },
  { id: 'severity', field: 'severity', header: 'Severity', width: 140 },
  { id: 'owner', field: 'owner', header: 'Owner', width: 150 },
  { id: 'queue', field: 'queue', header: 'Queue', width: 160 },
  { id: 'lastAction', field: 'lastAction', header: 'Last Action', width: 220 },
  { id: 'notes', field: 'notes', header: 'Notes', width: 420 },
  { id: 'updatedAt', field: 'updatedAt', header: 'Updated At', width: 180, type: 'date' },
];

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function toTimestamp(date) {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

function createNotes(index, options = {}) {
  const base = NOTE_FRAGMENTS[index % NOTE_FRAGMENTS.length];
  const extra = index % 5 === 0
    ? ` Depth validation note ${index}. ${NOTE_FRAGMENTS[(index + 2) % NOTE_FRAGMENTS.length]}`
    : '';
  const remoteTag = options.remote ? ' Served from mock remote source.' : '';
  return `${base}${extra}${remoteTag}`;
}

function createFlatRows(count = 2500, options = {}) {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `${options.prefix ?? 'Operator'} ${String(id).padStart(4, '0')}`,
      team: TEAM_NAMES[index % TEAM_NAMES.length],
      status: STATUS_NAMES[index % STATUS_NAMES.length],
      score: 1000 + ((id * 37) % 9000),
      region: REGIONS[index % REGIONS.length],
      severity: SEVERITIES[index % SEVERITIES.length],
      owner: OWNERS[index % OWNERS.length],
      queue: QUEUES[index % QUEUES.length],
      lastAction: LAST_ACTIONS[index % LAST_ACTIONS.length],
      notes: createNotes(index, options),
      updatedAt: toTimestamp(Date.now() - index * 2_700_000),
    };
  });
}

function createTreeNode(id, name, overrides = {}, children = []) {
  return {
    id,
    name,
    team: overrides.team ?? TEAM_NAMES[id.length % TEAM_NAMES.length],
    status: overrides.status ?? STATUS_NAMES[id.length % STATUS_NAMES.length],
    score: overrides.score ?? 1500 + id.length * 111,
    region: overrides.region ?? REGIONS[id.length % REGIONS.length],
    severity: overrides.severity ?? SEVERITIES[id.length % SEVERITIES.length],
    owner: overrides.owner ?? OWNERS[id.length % OWNERS.length],
    queue: overrides.queue ?? QUEUES[id.length % QUEUES.length],
    lastAction: overrides.lastAction ?? LAST_ACTIONS[id.length % LAST_ACTIONS.length],
    notes: overrides.notes ?? `${name} keeps nested audit notes for tree depth validation.`,
    updatedAt: overrides.updatedAt ?? toTimestamp(Date.now() - id.length * 600_000),
    hasChildren: overrides.hasChildren ?? children.length > 0,
    children,
  };
}

function createTreeRows() {
  return [
    createTreeNode('north', 'North Division', { team: 'Red', score: 4200 }, [
      createTreeNode('north-ops', 'North Operations', { score: 2750 }, [
        createTreeNode('north-ops-alpha', 'Alpha Squad', { score: 1900 }, [
          createTreeNode('north-ops-alpha-1', 'Alpha Analyst 1', { hasChildren: false, notes: 'Leaf node at depth 3 with wrapped analyst notes for row height checks.' }),
          createTreeNode('north-ops-alpha-2', 'Alpha Analyst 2', { hasChildren: false, notes: 'Another depth 3 leaf so expand-all visibly shows multiple levels.' }),
        ]),
        createTreeNode('north-ops-beta', 'Beta Squad', { score: 1820, hasChildren: true }, []),
      ]),
      createTreeNode('north-response', 'North Response', { team: 'Blue', score: 2400 }, [
        createTreeNode('north-response-delta', 'Delta Cell', { hasChildren: true }, []),
      ]),
    ]),
    createTreeNode('south', 'South Division', { team: 'Gold', status: 'Paused', score: 3980 }, [
      createTreeNode('south-analysis', 'South Analysis', { score: 2210 }, [
        createTreeNode('south-analysis-1', 'Forensics Pod', { score: 1740 }, [
          createTreeNode('south-analysis-1-a', 'Artifact Review', { hasChildren: false }),
        ]),
      ]),
    ]),
    createTreeNode('expansion', 'Expansion Program', {
      team: 'Green',
      status: 'Review',
      score: 3100,
      hasChildren: true,
      notes: 'Starts collapsed with lazy children so you can confirm dynamic depth expansion.',
    }, []),
  ];
}

function createLazyChildren(row) {
  const depth = String(row.id).split('-').length - 1;
  return delay(180).then(() => {
    if (depth >= 3) {
      return [];
    }

    return Array.from({ length: 2 }, (_, index) => {
      const childId = `${row.id}-lazy-${index + 1}`;
      const willHaveChildren = depth < 2 && index === 0;
      return createTreeNode(
        childId,
        `${row.name} Lazy Child ${index + 1}`,
        {
          score: (row.score ?? 1200) - 80 + index * 45,
          notes: `${row.name} lazy child ${index + 1} validates async tree loading at depth ${depth + 1}. ${NOTE_FRAGMENTS[(depth + index) % NOTE_FRAGMENTS.length]}`,
          hasChildren: willHaveChildren,
        },
        []
      );
    });
  });
}

function cloneRows(rows) {
  return structuredClone(rows);
}

function applyServerTransforms(rows, { filters, sort }) {
  let result = [...rows];

  const quickFilter = filters?.quickFilter ?? '';
  const quickFilterFields = filters?.quickFilterFields ?? [];
  if (quickFilter) {
    result = result.filter((row) => quickFilterFields.some((field) => {
      const value = row[field];
      return value != null && String(value).toLowerCase().includes(quickFilter);
    }));
  }

  const statusFilter = filters?.columnFilters?.status?.value;
  if (statusFilter) {
    const acceptedValues = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
    result = result.filter((row) => acceptedValues.includes(row.status));
  }

  if (Array.isArray(sort) && sort.length > 0) {
    result.sort((left, right) => {
      for (const definition of sort) {
        const leftValue = left[definition.field];
        const rightValue = right[definition.field];
        let compare = 0;

        if (definition.type === 'number') {
          compare = Number(leftValue) - Number(rightValue);
        } else if (definition.type === 'date') {
          compare = new Date(leftValue) - new Date(rightValue);
        } else {
          compare = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        }

        if (compare !== 0) {
          return definition.direction === 'desc' ? -compare : compare;
        }
      }
      return 0;
    });
  }

  return result;
}

async function fetchServerPage({ page, pageSize, filters, sort }) {
  await delay(240);
  const filtered = applyServerTransforms(createFlatRows(1300, { prefix: 'Remote', remote: true }), { filters, sort });
  const start = page * pageSize;
  const end = start + pageSize;
  return {
    rows: cloneRows(filtered.slice(start, end)),
    totalCount: filtered.length,
  };
}

async function loadMoreServerRows({ offset, loadSize, filters, sort }) {
  await delay(220);
  const filtered = applyServerTransforms(createFlatRows(1300, { prefix: 'Remote', remote: true }), { filters, sort });
  const rows = cloneRows(filtered.slice(offset, offset + loadSize));
  return {
    rows,
    totalCount: filtered.length,
    hasMore: offset + rows.length < filtered.length,
    cursor: rows.at(-1)?.id ?? null,
  };
}

function getDefaultFlatRows() {
  return createFlatRows(2500);
}

let currentDataset = 'flat';
let currentRows = getDefaultFlatRows();
let groupingEnabled = false;
let treeEnabled = false;
let livePaused = false;
let variableRowHeightEnabled = false;
let paginationSource = 'client';
let infiniteSource = 'client';
const eventLines = [];

const grid = createGrid(gridHost, {
  columns,
  rows: currentRows,
  rowKey: 'id',
  rowHeight: 40,
  variableRowHeight: variableRowHeightEnabled,
  tableId: 'awesome-grid-testbench',
  pagination: {
    mode: paginationSource,
    pageSize: Number(pageSizeSelect.value),
    fetchPage: fetchServerPage,
  },
  infiniteScroll: {
    mode: infiniteSource,
    initialLoadSize: 60,
    loadMoreSize: 40,
    onLoadMore: loadMoreServerRows,
  },
  liveUpdates: {
    enabled: true,
  },
  availablePlugins: [
    {
      plugin: uppercaseTeamPlugin,
      label: 'Uppercase Team',
      description: 'Converts the team cell text to uppercase after data processing.',
    },
    {
      plugin: scorePrefixPlugin,
      label: 'Score Prefix',
      description: 'Decorates numeric score cells with a PTS prefix.',
    },
  ],
  sidePanel: {
    enabled: true,
    quickFilterFields: ['name', 'team', 'status', 'region', 'notes'],
    defaultTab: 'columns',
    defaultOpen: false,
  },
  tree: {
    treeMode: 'children',
    childrenField: 'children',
    hasChildrenField: 'hasChildren',
    onLoadChildren: createLazyChildren,
  },
  getRowHeight: (row) => {
    if (!variableRowHeightEnabled) {
      return null;
    }
    if (row._type === 'group-header') {
      return 44;
    }
    const noteLength = String(row.notes ?? '').length;
    return noteLength > 150 ? 86 : noteLength > 95 ? 64 : 44;
  },
});

const modeButtons = {
  client: clientModeButton,
  paginated: paginationButton,
  infinite: infiniteButton,
};

function logEvent(label, payload = {}) {
  const line = `[${new Date().toLocaleTimeString()}] ${label} ${JSON.stringify(payload)}`;
  eventLines.unshift(line);
  eventLogEl.textContent = eventLines.slice(0, 24).join('\n');
}

function flashActionButton(button) {
  button.dataset.fired = 'true';
  window.setTimeout(() => {
    button.dataset.fired = 'false';
  }, 420);
}

function setToggleState(button, active) {
  if (!button) {
    return;
  }
  button.dataset.active = active ? 'true' : 'false';
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function syncModeButtons() {
  const mode = grid.getDisplayMode();
  Object.entries(modeButtons).forEach(([key, button]) => {
    setToggleState(button, key === mode);
  });
}

function syncPluginButtons() {
  setToggleState(uppercasePluginButton, grid.hasPlugin('uppercase-team'));
  setToggleState(scorePluginButton, grid.hasPlugin('score-prefix'));
}

function syncSourceButtons() {
  setToggleState(paginationClientButton, paginationSource === 'client');
  setToggleState(paginationServerButton, paginationSource === 'server');
  setToggleState(infiniteClientButton, infiniteSource === 'client');
  setToggleState(infiniteServerButton, infiniteSource === 'server');
}

function syncToggleButtons() {
  setToggleState(groupButton, groupingEnabled);
  setToggleState(treeButton, treeEnabled);
  setToggleState(pauseLiveButton, livePaused);
  setToggleState(variableHeightButton, variableRowHeightEnabled);
  syncModeButtons();
  syncPluginButtons();
  syncSourceButtons();
}

function getMaxTreeDepth(rows = grid.getFlatRows()) {
  return rows.reduce((maxDepth, row) => Math.max(maxDepth, row._depth ?? 0), 0);
}

function refreshInspector() {
  modeValueEl.textContent = grid.getDisplayMode();
  datasetValueEl.textContent = currentDataset;
  groupingValueEl.textContent = groupingEnabled ? 'on' : 'off';
  treeValueEl.textContent = treeEnabled ? 'on' : 'off';
  treeDepthValueEl.textContent = String(getMaxTreeDepth());
  variableHeightValueEl.textContent = variableRowHeightEnabled ? 'on' : 'off';

  const pagination = grid.getPaginationState();
  paginationValueEl.textContent = `${pagination.mode} · ${pagination.page + 1}/${pagination.totalPages} · size ${pagination.pageSize} · total ${pagination.totalCount}`;

  const infinite = grid.getInfiniteScrollState();
  infiniteValueEl.textContent = `${infinite.mode} · loaded ${infinite.loadedCount} · total ${infinite.totalCount ?? 'unknown'} · hasMore ${String(infinite.hasMore)}`;

  const columnState = grid.getColumnState();
  columnStateValueEl.textContent = `${columnState.columns.length} columns tracked`;

  const installedPlugins = grid.getInstalledPlugins();
  pluginsValueEl.textContent = installedPlugins.length ? installedPlugins.join(', ') : 'none';

  syncToggleButtons();
}

function syncColumnControls() {
  const state = grid.getColumnState();
  const target = state.columns.find((column) => column.colId === columnSelect.value);
  if (!target) {
    return;
  }
  widthInput.value = target.width;
  pinSelect.value = target.pinned ?? '';
  visibleCheckbox.checked = target.visible !== false;
}

function applyActiveFilters() {
  grid.clearFilters();
  if (quickFilterInput.value) {
    grid.setQuickFilter(quickFilterInput.value, ['name', 'team', 'status', 'region', 'notes']);
  }
  if (statusFilterSelect.value) {
    grid.setColumnFilter('status', {
      type: 'select',
      field: 'status',
      value: statusFilterSelect.value,
    });
  }
}

function isServerBackedActive() {
  return (
    (grid.getDisplayMode() === 'paginated' && paginationSource === 'server') ||
    (grid.getDisplayMode() === 'infinite' && infiniteSource === 'server')
  );
}

function ensureFlatDatasetForRemote(reason) {
  if (currentDataset === 'flat') {
    return;
  }
  datasetSelect.value = 'flat';
  setDataset('flat');
  logEvent('dataset-auto-switch', { reason, dataset: 'flat' });
}

function setDataset(kind) {
  currentDataset = kind;
  groupingEnabled = false;
  treeEnabled = false;
  grid.disableGrouping();
  grid.disableTree();
  grid.setDisplayMode('client');

  currentRows = kind === 'tree' ? createTreeRows() : getDefaultFlatRows();
  grid.setData(currentRows);

  if (kind === 'tree') {
    grid.enableTree({
      treeMode: 'children',
      childrenField: 'children',
      hasChildrenField: 'hasChildren',
      onLoadChildren: createLazyChildren,
    });
    treeEnabled = true;
  }

  applyActiveFilters();
  refreshInspector();
  logEvent('dataset-change', { kind });
}

function guardFlatClientMutation(button, label) {
  if (currentDataset === 'tree') {
    flashActionButton(button);
    logEvent(`${label}-skipped`, { reason: 'tree dataset is excluded from flat mutation shortcuts' });
    return false;
  }
  if (isServerBackedActive()) {
    flashActionButton(button);
    logEvent(`${label}-skipped`, { reason: 'remote demo mode is read-only for direct local mutations' });
    return false;
  }
  return true;
}

grid.on('render', ({ totalCount, visibleCount, displayMode }) => {
  rowCountEl.textContent = totalCount.toLocaleString();
  visibleCountEl.textContent = visibleCount.toLocaleString();
  modeValueEl.textContent = displayMode;
  refreshInspector();
});

grid.on('selection-change', ({ selectedCount }) => {
  selectedCountEl.textContent = selectedCount.toLocaleString();
  logEvent('selection-change', { selectedCount });
});

grid.on('state-change', ({ type }) => {
  refreshInspector();
  logEvent('state-change', { type });
});

grid.on('row-click', ({ row }) => {
  logEvent('row-click', { rowKey: row._rowKey, type: row._type, depth: row._depth ?? 0 });
});

grid.on('cell-click', ({ colId, row }) => {
  logEvent('cell-click', { colId, rowKey: row._rowKey });
});

datasetSelect.addEventListener('change', (event) => {
  setDataset(event.target.value);
});

quickFilterInput.addEventListener('input', () => {
  applyActiveFilters();
});

statusFilterSelect.addEventListener('change', () => {
  applyActiveFilters();
});

resetButton?.addEventListener('click', () => {
  quickFilterInput.value = '';
  statusFilterSelect.value = '';
  applyActiveFilters();
  selectedCountEl.textContent = '0';
  flashActionButton(resetButton);
  logEvent('filters-reset');
});

reloadButton.addEventListener('click', () => {
  setDataset(currentDataset);
  flashActionButton(reloadButton);
});

groupButton.addEventListener('click', () => {
  groupingEnabled = !groupingEnabled;
  if (groupingEnabled) {
    treeEnabled = false;
    grid.disableTree();
    grid.enableGrouping(['team'], {
      aggregations: {
        score: [{ type: 'avg' }],
      },
    });
  } else {
    grid.disableGrouping();
  }
  refreshInspector();
  logEvent('group-toggle', { enabled: groupingEnabled });
});

treeButton.addEventListener('click', () => {
  treeEnabled = !treeEnabled;
  if (treeEnabled) {
    groupingEnabled = false;
    grid.disableGrouping();
    if (currentDataset !== 'tree') {
      datasetSelect.value = 'tree';
      setDataset('tree');
    } else {
      grid.enableTree({
        treeMode: 'children',
        childrenField: 'children',
        hasChildrenField: 'hasChildren',
        onLoadChildren: createLazyChildren,
      });
    }
  } else {
    grid.disableTree();
  }
  refreshInspector();
  logEvent('tree-toggle', { enabled: treeEnabled });
});

expandTreeButton.addEventListener('click', () => {
  if (!treeEnabled) {
    flashActionButton(expandTreeButton);
    logEvent('tree-expand-skipped', { reason: 'tree mode is not active' });
    return;
  }
  grid.expandAllTree();
  flashActionButton(expandTreeButton);
  logEvent('tree-expand-all');
});

collapseTreeButton.addEventListener('click', () => {
  if (!treeEnabled) {
    flashActionButton(collapseTreeButton);
    logEvent('tree-collapse-skipped', { reason: 'tree mode is not active' });
    return;
  }
  grid.collapseAllTree();
  flashActionButton(collapseTreeButton);
  logEvent('tree-collapse-all');
});

clientModeButton.addEventListener('click', () => {
  grid.setDisplayMode('client');
  refreshInspector();
  logEvent('mode-change', { mode: 'client' });
});

paginationButton.addEventListener('click', () => {
  if (paginationSource === 'server') {
    ensureFlatDatasetForRemote('server-pagination');
  }
  grid.setDisplayMode('paginated');
  refreshInspector();
  logEvent('mode-change', { mode: 'paginated', source: paginationSource });
});

infiniteButton.addEventListener('click', () => {
  if (infiniteSource === 'server') {
    ensureFlatDatasetForRemote('server-infinite');
  }
  grid.enableInfiniteScroll();
  refreshInspector();
  logEvent('mode-change', { mode: 'infinite', source: infiniteSource });
});

nextPageButton.addEventListener('click', () => {
  grid.nextPage();
  flashActionButton(nextPageButton);
  logEvent('page-next');
});

prevPageButton.addEventListener('click', () => {
  grid.prevPage();
  flashActionButton(prevPageButton);
  logEvent('page-prev');
});

loadMoreButton.addEventListener('click', async () => {
  if (grid.getDisplayMode() !== 'infinite') {
    flashActionButton(loadMoreButton);
    logEvent('load-more-skipped', { reason: 'infinite mode is not active' });
    return;
  }
  await grid.loadMoreInfinite();
  flashActionButton(loadMoreButton);
  logEvent('load-more');
});

pageSizeSelect.addEventListener('change', () => {
  grid.setPageSize(Number(pageSizeSelect.value));
  logEvent('page-size', { size: Number(pageSizeSelect.value) });
});

paginationClientButton.addEventListener('click', () => {
  paginationSource = 'client';
  grid.setPaginationMode('client');
  refreshInspector();
  logEvent('pagination-source', { source: 'client' });
});

paginationServerButton.addEventListener('click', () => {
  ensureFlatDatasetForRemote('server-pagination');
  paginationSource = 'server';
  grid.setPaginationMode('server');
  refreshInspector();
  logEvent('pagination-source', { source: 'server' });
});

infiniteClientButton.addEventListener('click', () => {
  infiniteSource = 'client';
  grid.setInfiniteScrollMode('client');
  refreshInspector();
  logEvent('infinite-source', { source: 'client' });
});

infiniteServerButton.addEventListener('click', () => {
  ensureFlatDatasetForRemote('server-infinite');
  infiniteSource = 'server';
  grid.setInfiniteScrollMode('server');
  refreshInspector();
  logEvent('infinite-source', { source: 'server' });
});

variableHeightButton?.addEventListener('click', () => {
  variableRowHeightEnabled = !variableRowHeightEnabled;
  grid.setVariableRowHeight(variableRowHeightEnabled);
  refreshInspector();
  logEvent('variable-height-toggle', { enabled: variableRowHeightEnabled });
});

appendRowsButton.addEventListener('click', () => {
  if (!guardFlatClientMutation(appendRowsButton, 'append')) {
    return;
  }

  const nextId = currentRows.length + 1;
  const rows = Array.from({ length: 5 }, (_, index) => {
    const id = nextId + index;
    return {
      id,
      name: `Appended Operator ${String(id).padStart(4, '0')}`,
      team: TEAM_NAMES[id % TEAM_NAMES.length],
      status: STATUS_NAMES[id % STATUS_NAMES.length],
      score: 2000 + id * 5,
      region: REGIONS[id % REGIONS.length],
      severity: SEVERITIES[id % SEVERITIES.length],
      owner: OWNERS[id % OWNERS.length],
      queue: QUEUES[id % QUEUES.length],
      lastAction: LAST_ACTIONS[id % LAST_ACTIONS.length],
      notes: `Appended row ${id}. ${createNotes(id)}`,
      updatedAt: toTimestamp(Date.now()),
    };
  });

  currentRows = [...currentRows, ...rows];
  grid.appendRows(rows);
  flashActionButton(appendRowsButton);
  logEvent('append-rows', { count: rows.length });
});

updateFirstRowButton.addEventListener('click', () => {
  if (!guardFlatClientMutation(updateFirstRowButton, 'update')) {
    return;
  }

  const [first] = currentRows;
  if (!first) {
    return;
  }

  const updated = {
    ...first,
    name: `${first.name} Updated`,
    lastAction: 'Reviewed escalation path',
    updatedAt: toTimestamp(Date.now()),
  };

  currentRows = [updated, ...currentRows.slice(1)];
  grid.updateRows([updated]);
  flashActionButton(updateFirstRowButton);
  logEvent('update-row', { id: updated.id });
});

patchFirstRowButton.addEventListener('click', () => {
  if (!guardFlatClientMutation(patchFirstRowButton, 'patch')) {
    return;
  }

  const [first] = currentRows;
  if (!first) {
    return;
  }

  const nextStatus = first.status === 'Active' ? 'Review' : 'Active';
  grid.patchRow(first.id, {
    status: nextStatus,
    updatedAt: toTimestamp(Date.now()),
    notes: `${first.notes} Status patched on demand.`,
  });

  currentRows = currentRows.map((row, index) => (
    index === 0
      ? {
          ...row,
          status: nextStatus,
          updatedAt: toTimestamp(Date.now()),
          notes: `${row.notes} Status patched on demand.`,
        }
      : row
  ));

  flashActionButton(patchFirstRowButton);
  logEvent('patch-row', { id: first.id });
});

removeLastRowButton.addEventListener('click', () => {
  if (!guardFlatClientMutation(removeLastRowButton, 'remove')) {
    return;
  }

  const last = currentRows.at(-1);
  if (!last) {
    return;
  }

  currentRows = currentRows.slice(0, -1);
  grid.removeRows([last.id]);
  flashActionButton(removeLastRowButton);
  logEvent('remove-row', { id: last.id });
});

liveButton.addEventListener('click', () => {
  if (!guardFlatClientMutation(liveButton, 'live')) {
    return;
  }

  const nextId = currentRows.length + 1;
  const rows = Array.from({ length: 3 }, (_, offset) => {
    const id = nextId + offset;
    return {
      id,
      name: `Live Operator ${String(id).padStart(4, '0')}`,
      team: TEAM_NAMES[id % TEAM_NAMES.length],
      status: STATUS_NAMES[id % STATUS_NAMES.length],
      score: 3000 + id * 9,
      region: REGIONS[id % REGIONS.length],
      severity: SEVERITIES[id % SEVERITIES.length],
      owner: OWNERS[id % OWNERS.length],
      queue: QUEUES[id % QUEUES.length],
      lastAction: 'Queued as live arrival',
      notes: `Live stream row ${id}. ${createNotes(id)}`,
      updatedAt: toTimestamp(Date.now()),
    };
  });

  currentRows = [...currentRows, ...rows];
  grid.liveAddRows(rows);
  flashActionButton(liveButton);
  logEvent('live-add', { count: rows.length });
});

pauseLiveButton.addEventListener('click', () => {
  livePaused = !livePaused;
  if (livePaused) {
    grid.pauseLiveUpdates();
  } else {
    grid.resumeLiveUpdates();
  }
  refreshInspector();
  logEvent('live-toggle', { paused: livePaused });
});

resumeLiveButton.addEventListener('click', () => {
  livePaused = false;
  grid.resumeLiveUpdates();
  flashActionButton(resumeLiveButton);
  refreshInspector();
  logEvent('live-resume');
});

uppercasePluginButton.addEventListener('click', () => {
  if (grid.hasPlugin('uppercase-team')) {
    grid.unusePlugin('uppercase-team');
  } else {
    grid.usePlugin(uppercaseTeamPlugin);
  }
  refreshInspector();
  logEvent('plugin-toggle', { plugin: 'uppercase-team', enabled: grid.hasPlugin('uppercase-team') });
});

scorePluginButton.addEventListener('click', () => {
  if (grid.hasPlugin('score-prefix')) {
    grid.unusePlugin('score-prefix');
  } else {
    grid.usePlugin(scorePrefixPlugin);
  }
  refreshInspector();
  logEvent('plugin-toggle', { plugin: 'score-prefix', enabled: grid.hasPlugin('score-prefix') });
});

columnSelect.addEventListener('change', () => {
  syncColumnControls();
});

applyColumnButton.addEventListener('click', () => {
  const colId = columnSelect.value;
  grid.setColumnWidth(colId, Number(widthInput.value));
  grid.setColumnPinned(colId, pinSelect.value || null);
  grid.setColumnVisible(colId, visibleCheckbox.checked);
  syncColumnControls();
  flashActionButton(applyColumnButton);
  logEvent('column-apply', {
    colId,
    width: Number(widthInput.value),
    pin: pinSelect.value || null,
    visible: visibleCheckbox.checked,
  });
});

saveColumnStateButton.addEventListener('click', async () => {
  await grid.saveColumnState();
  flashActionButton(saveColumnStateButton);
  refreshInspector();
  logEvent('column-state-save');
});

loadColumnStateButton.addEventListener('click', async () => {
  await grid.loadColumnState();
  syncColumnControls();
  flashActionButton(loadColumnStateButton);
  refreshInspector();
  logEvent('column-state-load');
});

clearColumnStateButton.addEventListener('click', async () => {
  await grid.clearColumnState();
  flashActionButton(clearColumnStateButton);
  refreshInspector();
  logEvent('column-state-clear');
});

syncColumnControls();
refreshInspector();
logEvent('ready', { dataset: currentDataset, mode: grid.getDisplayMode() });
