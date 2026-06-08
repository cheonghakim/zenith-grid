import {
  createGrid,
  uppercaseTeamPlugin,
  scorePrefixPlugin,
  createXlsxExportPlugin,
  createSparklinePlugin,
} from "../src/index.js";
import { createEchartsPlugin } from "../src/plugins/echartsPlugin.js";
import { createSvgIcon } from "../src/renderer/IconFactory.js";
import "../src/styles/grid.css";

if (!customElements.get("mdi-icon")) {
  customElements.define(
    "mdi-icon",
    class extends HTMLElement {
      static get observedAttributes() {
        return ["type", "size"];
      }

      connectedCallback() {
        this._render();
      }

      attributeChangedCallback() {
        if (this.isConnected) this._render();
      }

      _render() {
        const type = this.getAttribute("type") ?? "";
        const size = Number(this.getAttribute("size") ?? 16);
        this.replaceChildren(
          createSvgIcon(type, Number.isFinite(size) ? size : 16),
        );
      }
    },
  );
}

// ── DOM ELEMENTS BINDING ──────────────────────────────────────
const rowCountEl = document.getElementById("rowCount");
const visibleCountEl = document.getElementById("visibleCount");
const selectedCountEl = document.getElementById("selectedCount");

const modeValueEl = document.getElementById("modeValue");
const datasetValueEl = document.getElementById("datasetValue");
const groupingValueEl = document.getElementById("groupingValue");
const treeValueEl = document.getElementById("treeValue");
const treeDepthValueEl = document.getElementById("treeDepthValue");
const variableHeightValueEl = document.getElementById("variableHeightValue");
const paginationValueEl = document.getElementById("paginationValue");
const infiniteValueEl = document.getElementById("infiniteValue");
const pluginsValueEl = document.getElementById("pluginsValue");
const columnStateValueEl = document.getElementById("columnStateValue");

const eventLogEl = document.getElementById("eventLog");
const benchmarkLogEl = document.getElementById("benchmarkLog");

// Tab Buttons & Panels
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Overview Controls
const scenarioRadios = document.querySelectorAll('input[name="scenarioMode"]');
const pageSizeSelect = document.getElementById("pageSizeSelect");
const reloadButton = document.getElementById("reloadButton");
const prevPageButton = document.getElementById("prevPageButton");
const nextPageButton = document.getElementById("nextPageButton");
const loadMoreButton = document.getElementById("loadMoreButton");

// Hierarchy Controls
const structureRadios = document.querySelectorAll(
  'input[name="structureMode"]',
);
const variableHeightButton = document.getElementById("variableHeightButton");
const expandTreeButton = document.getElementById("expandTreeButton");
const collapseTreeButton = document.getElementById("collapseTreeButton");

// Local Mutation Controls (tab-live)
const appendRowsButton = document.getElementById("appendRowsButton");
const updateFirstRowButton = document.getElementById("updateFirstRowButton");
const patchFirstRowButton = document.getElementById("patchFirstRowButton");
const removeLastRowButton = document.getElementById("removeLastRowButton");

// Live Streaming Controls
const streamBurstInput = document.getElementById("streamBurstInput");
const streamIntervalInput = document.getElementById("streamIntervalInput");
const streamMaxRowsInput = document.getElementById("streamMaxRowsInput");
const liveButton = document.getElementById("liveButton");
const startStreamButton = document.getElementById("startStreamButton");
const stopStreamButton = document.getElementById("stopStreamButton");
const pauseLiveButton = document.getElementById("pauseLiveButton");
const liveAnimationButton = document.getElementById("liveAnimationButton");

const benchmarkRenderButton = document.getElementById("benchmarkRenderButton");
const benchmarkScenarioButton = document.getElementById(
  "benchmarkScenarioButton",
);
const benchmarkScrollButton = document.getElementById("benchmarkScrollButton");

// ── HELPER DATA GENERATORS ────────────────────────────────────
const TEAM_NAMES = ["Red", "Blue", "Gold", "Green"];
const STATUS_NAMES = ["Active", "Paused", "Review"];
const REGIONS = ["Seoul", "Tokyo", "Berlin", "Austin", "Dubai", "Toronto"];
const SEVERITIES = ["Critical", "High", "Medium", "Low"];
const QUEUES = ["Intake", "Analysis", "Escalation", "Containment", "Audit"];
const OWNERS = ["Ari", "Bo", "Caro", "Dain", "Eli", "Faye", "Gio"];
const LAST_ACTIONS = [
  "Reviewed alert graph",
  "Pinned follow-up",
  "Escalated runbook",
  "Merged evidence bundle",
];
const NOTE_FRAGMENTS = [
  "Correlates incident timeline against regional telemetry.",
  "Requires manual sign-off because containment touches a cross-border workflow.",
  "Includes long analyst notes so variable row height can be exercised realistically.",
  "Used to verify wrapped cells, sticky pinned columns, and horizontal virtualization together.",
];

const koreanLocale = {
  sidePanel: {
    tabs: {
      columns: "컬럼",
      filters: "필터",
      plugins: "플러그인",
      view: "보기",
    },
    close: "닫기",
    noPin: "고정 안 함",
    pinLeft: "왼쪽 고정",
    pinRight: "오른쪽 고정",
    quickFilter: "빠른 필터",
    quickFilterPlaceholder: "현재 보이는 데이터 검색...",
    filterPlaceholder: "{label} 필터",
    clearAllFilters: "필터 모두 지우기",
    noPlugins: "이 그리드에는 기본 플러그인이 등록되어 있지 않습니다.",
    groupBy: "그룹 기준",
    disabled: "사용 안 함",
    treeMode: "트리 모드",
    enabled: "사용 중",
    variableRowHeight: "가변 행 높이",
    adaptive: "자동 조절",
    fixed: "고정",
    rowMotion: "행 애니메이션",
    animated: "애니메이션 켜짐",
    static: "애니메이션 꺼짐",
    on: "켜짐",
    off: "꺼짐",
  },
  grid: {
    badges: {
      group: "GROUP",
      tree: "TREE",
    },
    loading: {
      data: "데이터를 불러오는 중...",
      page: "페이지 데이터를 불러오는 중...",
      moreRows: "행을 더 불러오는 중...",
      childRows: "하위 행을 불러오는 중...",
      infiniteSpinner: "행을 더 불러오는 중",
    },
    empty: {
      noRows: "표시할 행이 없습니다.",
      processFailed: "데이터 처리 중 오류가 발생했습니다.",
    },
    live: {
      waiting:
        "새 행 {count}개가 도착했습니다. 클릭하면 현재 화면에 반영됩니다.",
    },
    pagination: {
      first: "처음",
      prev: "이전",
      next: "다음",
      last: "마지막",
      page: "{page} / {totalPages} 페이지",
      summary: "{startRow}-{endRow} / 총 {totalCount}개",
    },
  },
};

function renderStatusBadge({ value }) {
  const badge = document.createElement("span");
  badge.className = "demo-status-badge";
  badge.dataset.status = String(value ?? "").toLowerCase();
  badge.textContent = value == null ? "Unknown" : String(value);
  return badge;
}

function renderScoreCell({ value }) {
  const wrap = document.createElement("span");
  wrap.className = "demo-score-cell";

  const meter = document.createElement("span");
  meter.className = "demo-score-meter";
  meter.style.width = `${Math.max(8, Math.min(100, Math.round((Number(value) || 0) / 100)))}%`;

  const text = document.createElement("strong");
  text.textContent = value == null ? "0" : String(value);

  wrap.appendChild(meter);
  wrap.appendChild(text);
  return wrap;
}

// Columns definition for main grids
const getBaseColumns = () => [
  {
    id: "id",
    field: "id",
    header: "ID",
    width: 200,
    type: "number",
    align: "right",
  },
  {
    id: "name",
    field: "name",
    header: "Operator",
    width: 180,
    tooltip: true,
    editable: true,
  },
  {
    id: "team",
    field: "team",
    header: "Team",
    width: 120,
    filterType: "select",
    filterOptions: TEAM_NAMES,
  },
  {
    id: "status",
    field: "status",
    header: "Status",
    width: 120,
    filterType: "select",
    filterOptions: STATUS_NAMES,
    renderer: renderStatusBadge,
  },
  {
    id: "score",
    field: "score",
    header: "Score",
    width: 130,
    type: "number",
    align: "right",
    renderer: renderScoreCell,
    aggregate: "avg",
    editable: true,
  },
  {
    id: "region",
    field: "region",
    header: "Region",
    width: 140,
    filterType: "select",
    filterOptions: REGIONS,
  },
  {
    id: "severity",
    field: "severity",
    header: "Severity",
    width: 120,
    filterType: "select",
    filterOptions: SEVERITIES,
  },
  {
    id: "owner",
    field: "owner",
    header: "Owner",
    width: 130,
    filterType: "select",
    filterOptions: OWNERS,
  },
  {
    id: "queue",
    field: "queue",
    header: "Queue",
    width: 140,
    filterType: "select",
    filterOptions: QUEUES,
  },
  { id: "lastAction", field: "lastAction", header: "Last Action", width: 200 },
  { id: "notes", field: "notes", header: "Notes", width: 320, tooltip: true },
  {
    id: "updatedAt",
    field: "updatedAt",
    header: "Updated At",
    width: 160,
    type: "date",
  },
];

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toTimestamp(date) {
  return new Date(date).toISOString().slice(0, 19).replace("T", " ");
}

function createNotes(index, options = {}) {
  const base = NOTE_FRAGMENTS[index % NOTE_FRAGMENTS.length];
  const extra = index % 5 === 0 ? ` Depth validation note ${index}.` : "";
  const remoteTag = options.remote ? " Served from mock remote source." : "";
  return `${base}${extra}${remoteTag}`;
}

function createFlatRows(count = 2500, options = {}) {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `${options.prefix ?? "Operator"} ${String(id).padStart(4, "0")}`,
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
      history: Array.from({ length: 10 }, (_, i) => {
        const seed = id * 17 + i * 31;
        const sinVal = Math.sin(seed);
        return Math.abs(Math.round(2000 + sinVal * 1500));
      }),
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
    lastAction:
      overrides.lastAction ?? LAST_ACTIONS[id.length % LAST_ACTIONS.length],
    notes:
      overrides.notes ??
      `${name} keeps nested audit notes for tree depth validation.`,
    updatedAt:
      overrides.updatedAt ?? toTimestamp(Date.now() - id.length * 600_000),
    hasChildren: overrides.hasChildren ?? children.length > 0,
    children,
  };
}

function createTreeRows() {
  return [
    createTreeNode("north", "North Division", { team: "Red", score: 4200 }, [
      createTreeNode("north-ops", "North Operations", { score: 2750 }, [
        createTreeNode("north-ops-alpha", "Alpha Squad", { score: 1900 }, [
          createTreeNode("north-ops-alpha-1", "Alpha Analyst 1", {
            hasChildren: false,
            notes: "Leaf node at depth 3 with wrapped analyst notes.",
          }),
          createTreeNode("north-ops-alpha-2", "Alpha Analyst 2", {
            hasChildren: false,
            notes: "Another depth 3 leaf so expand-all works.",
          }),
        ]),
        createTreeNode(
          "north-ops-beta",
          "Beta Squad",
          { score: 1820, hasChildren: true },
          [],
        ),
      ]),
      createTreeNode(
        "north-response",
        "North Response",
        { team: "Blue", score: 2400 },
        [
          createTreeNode(
            "north-response-delta",
            "Delta Cell",
            { hasChildren: true },
            [],
          ),
        ],
      ),
    ]),
    createTreeNode(
      "south",
      "South Division",
      { team: "Gold", status: "Paused", score: 3980 },
      [
        createTreeNode("south-analysis", "South Analysis", { score: 2210 }, [
          createTreeNode("south-analysis-1", "Forensics Pod", { score: 1740 }, [
            createTreeNode("south-analysis-1-a", "Artifact Review", {
              hasChildren: false,
            }),
          ]),
        ]),
      ],
    ),
    createTreeNode(
      "expansion",
      "Expansion Program",
      {
        team: "Green",
        status: "Review",
        score: 3100,
        hasChildren: true,
        notes: "Starts collapsed with lazy children.",
      },
      [],
    ),
  ];
}

function createLazyChildren(row) {
  const depth = String(row.id).split("-").length - 1;
  return delay(180).then(() => {
    if (depth >= 3) return [];
    return Array.from({ length: 2 }, (_, index) => {
      const childId = `${row.id}-lazy-${index + 1}`;
      const willHaveChildren = depth < 2 && index === 0;
      return createTreeNode(
        childId,
        `${row.name} Lazy Child ${index + 1}`,
        {
          score: (row.score ?? 1200) - 80 + index * 45,
          notes: `${row.name} lazy child ${index + 1} at depth ${depth + 1}.`,
          hasChildren: willHaveChildren,
        },
        [],
      );
    });
  });
}

// ── SERVER-MOCK TRANSFORMS FOR PAGINATION ──────────────────────
function matchServerColumnFilter(row, filterDef) {
  const {
    type = "text",
    operator = "contains",
    value,
    field,
  } = filterDef ?? {};
  const cellValue = row?.[field];
  if (cellValue == null) return false;

  switch (type) {
    case "number": {
      const numeric = Number(cellValue);
      switch (operator) {
        case "equals":
          return numeric === Number(value);
        case "notEquals":
          return numeric !== Number(value);
        case "greaterThan":
          return numeric > Number(value);
        case "lessThan":
          return numeric < Number(value);
        default:
          return true;
      }
    }
    case "select": {
      return Array.isArray(value)
        ? value.includes(String(cellValue))
        : cellValue === value;
    }
    default: {
      const cell = String(cellValue).toLowerCase();
      const filter = String(value ?? "").toLowerCase();
      return cell.includes(filter);
    }
  }
}

function applyServerTransforms(rows, { filters, sort }) {
  let result = [...rows];
  const quickFilter = filters?.quickFilter ?? "";
  const quickFilterFields = filters?.quickFilterFields ?? [];
  if (quickFilter) {
    result = result.filter((row) =>
      quickFilterFields.some((field) => {
        const value = row[field];
        return (
          value != null && String(value).toLowerCase().includes(quickFilter)
        );
      }),
    );
  }

  const columnFilters = Object.values(filters?.columnFilters ?? {});
  if (columnFilters.length > 0) {
    result = result.filter((row) =>
      columnFilters.every((filterDef) =>
        matchServerColumnFilter(row, filterDef),
      ),
    );
  }

  if (Array.isArray(sort) && sort.length > 0) {
    result.sort((left, right) => {
      for (const definition of sort) {
        const leftValue = left[definition.field];
        const rightValue = right[definition.field];
        let compare = 0;
        if (definition.type === "number") {
          compare = Number(leftValue) - Number(rightValue);
        } else {
          compare = String(leftValue ?? "").localeCompare(
            String(rightValue ?? ""),
            undefined,
            { numeric: true },
          );
        }
        if (compare !== 0) {
          return definition.direction === "desc" ? -compare : compare;
        }
      }
      return 0;
    });
  }
  return result;
}

async function fetchServerPage({ page, pageSize, filters, sort }) {
  await delay(240);
  const filtered = applyServerTransforms(
    createFlatRows(1300, { prefix: "Remote", remote: true }),
    { filters, sort },
  );
  const start = page * pageSize;
  return {
    rows: structuredClone(filtered.slice(start, start + pageSize)),
    totalCount: filtered.length,
  };
}

async function loadMoreServerRows({ offset, loadSize, filters, sort }) {
  await delay(220);
  const filtered = applyServerTransforms(
    createFlatRows(1300, { prefix: "Remote", remote: true }),
    { filters, sort },
  );
  const rows = structuredClone(filtered.slice(offset, offset + loadSize));
  return {
    rows,
    totalCount: filtered.length,
    hasMore: offset + rows.length < filtered.length,
    cursor: rows.at(-1)?.id ?? null,
  };
}

// ── SYSTEM STATE & EVENT LOGGING ──────────────────────────────
const eventLines = [];
function logEvent(label, payload = {}) {
  const line = `[${new Date().toLocaleTimeString()}] ${label} ${JSON.stringify(payload)}`;
  eventLines.unshift(line);
  eventLogEl.textContent = eventLines.slice(0, 24).join("\n");
}

function flashActionButton(button) {
  if (!button) return;
  button.dataset.fired = "true";
  window.setTimeout(() => {
    button.dataset.fired = "false";
  }, 420);
}

function setToggleState(button, active) {
  if (!button) return;
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
}

// ── INSTANTIATING GRID 1: OVERVIEW & PAGINATION ───────────────
let paginationSource = "client";
let infiniteSource = "client";

const gridOverview = createGrid(document.getElementById("grid-overview"), {
  columns: getBaseColumns(),
  rows: createFlatRows(2500),
  rowKey: "id",
  rowHeight: 40,
  locale: koreanLocale,
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
  editing: { enabled: true },
  sidePanel: {
    enabled: true,
    quickFilterFields: ["name", "team", "status", "region", "notes"],
    defaultTab: "columns",
    defaultOpen: false,
  },
  plugins: [
    { plugin: createXlsxExportPlugin({ fileName: "overview-grid.xlsx" }) },
  ],
});

// ── INSTANTIATING GRID 1-B: MULTI GROUP HEADER GRID ──────────
const multiHeaderColumns = [
  {
    id: "rank",
    field: "rank",
    headerName: "#",
    width: 52,
    type: "number",
    align: "right",
    sortable: true,
  },
  {
    id: "name",
    field: "name",
    headerName: "Player",
    width: 180,
    sortable: true,
  },
  {
    id: "country",
    field: "country",
    headerName: "Country",
    width: 110,
    sortable: true,
  },
  {
    id: "season",
    headerName: "Season Stats",
    children: [
      {
        id: "goals",
        field: "goals",
        headerName: "Goals",
        width: 80,
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        id: "assists",
        field: "assists",
        headerName: "Assists",
        width: 88,
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        id: "matches",
        field: "matches",
        headerName: "Matches",
        width: 92,
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        id: "rating",
        field: "rating",
        headerName: "Rating",
        width: 84,
        type: "number",
        align: "right",
        sortable: true,
      },
    ],
  },
  {
    id: "form",
    headerName: "Recent Form",
    children: [
      {
        id: "wins",
        field: "wins",
        headerName: "W",
        width: 58,
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        id: "draws",
        field: "draws",
        headerName: "D",
        width: 58,
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        id: "losses",
        field: "losses",
        headerName: "L",
        width: 58,
        type: "number",
        align: "right",
        sortable: true,
      },
      {
        id: "pts",
        field: "pts",
        headerName: "Pts",
        width: 68,
        type: "number",
        align: "right",
        sortable: true,
      },
    ],
  },
];

const COUNTRIES = [
  "Spain",
  "France",
  "England",
  "Germany",
  "Brazil",
  "Argentina",
  "Portugal",
  "Italy",
  "Netherlands",
  "Belgium",
];
const PLAYER_NAMES = [
  "Luca Moretti",
  "Kai Hoffmann",
  "Mateo Vidal",
  "Oliver Crane",
  "Hugo Renard",
  "Enzo Ferrara",
  "Daan Vermeer",
  "Samir Nasri",
  "Bruno Alves",
  "Timo Bauer",
  "Carlos Reyes",
  "James Thornton",
  "Yannick Dumont",
  "Piero Giannini",
  "Noah Schultz",
];

function createMultiHeaderRows() {
  return PLAYER_NAMES.map((name, index) => {
    const id = index + 1;
    const goals = Math.floor(Math.random() * 28);
    const assists = Math.floor(Math.random() * 18);
    const matches = 20 + Math.floor(Math.random() * 18);
    const wins = Math.floor(Math.random() * 12);
    const draws = Math.floor(Math.random() * 6);
    const losses = Math.max(0, 15 - wins - draws);
    return {
      id,
      rank: id,
      name,
      country: COUNTRIES[index % COUNTRIES.length],
      goals,
      assists,
      matches,
      rating: Number((6.0 + Math.random() * 3.5).toFixed(1)),
      wins,
      draws,
      losses,
      pts: wins * 3 + draws,
    };
  });
}

const multiHeaderGrid = createGrid(document.getElementById("multiHeaderGrid"), {
  columns: multiHeaderColumns,
  rows: createMultiHeaderRows(),
  rowKey: "id",
  rowHeight: 40,
  tableId: "multi-header-demo",
  plugins: [
    { plugin: createXlsxExportPlugin({ fileName: "multi-header-grid.xlsx" }) },
  ],
});

// ── INSTANTIATING GRID 2: HIERARCHY (TREE & GROUPING) ─────────
const gridHierarchy = createGrid(document.getElementById("grid-hierarchy"), {
  columns: getBaseColumns(),
  rows: createFlatRows(1500),
  rowKey: "id",
  rowHeight: 40,
  locale: koreanLocale,
  editing: { enabled: true },
  tree: {
    treeMode: "children",
    childrenField: "children",
    hasChildrenField: "hasChildren",
    onLoadChildren: createLazyChildren,
  },
});

// ── INSTANTIATING GRID 3: LIVE STREAM & BENCHMARK ──────────────
const gridLive = createGrid(document.getElementById("grid-live"), {
  columns: getBaseColumns(),
  rows: createFlatRows(500),
  rowKey: "id",
  rowHeight: 40,
  locale: koreanLocale,
  editing: { enabled: true },
  liveUpdates: {
    enabled: true,
    maxRows: 1000,
    rowAnimationEnabled: true,
  },
});

// ── INSTANTIATING GRID 4: ENTERPRISE FEATURES ──────────────────
const enterpriseColumns = [
  ...getBaseColumns(),
  {
    id: "trend",
    field: "history",
    header: "10-Week Score · Line",
    width: 140,
    visible: false,
    sparkline: { type: "line", field: "history", color: "#3b82f6" },
  },
  {
    id: "trendBar",
    field: "history",
    header: "10-Week Score · Bar",
    width: 140,
    visible: false,
    sparkline: { type: "bar", field: "history", color: "#8b5cf6" },
  },
  {
    id: "trendArea",
    field: "history",
    header: "10-Week Score · Area",
    width: 150,
    visible: false,
    echart: {
      type: "area",
      dataField: "history",
      color: "#10b981",
      height: 32,
    },
  },
];

const gridEnterprise = createGrid(document.getElementById("grid-enterprise"), {
  columns: enterpriseColumns,
  rows: createFlatRows(2000),
  rowKey: "id",
  rowHeight: 40,
  locale: koreanLocale,
  editing: { enabled: true },
  plugins: [
    { plugin: createXlsxExportPlugin({ fileName: "enterprise-grid.xlsx" }) },
    { plugin: createSparklinePlugin() },
    { plugin: createEchartsPlugin() },
  ],
  sidePanel: {
    enabled: true,
    quickFilterFields: ["name", "team", "status"],
    defaultTab: "columns",
    defaultOpen: false,
  },
  masterDetail: {
    detailRenderer: (row) => {
      const div = document.createElement("div");
      div.className = "demo-detail-panel";
      div.innerHTML = `
        <div class="demo-detail-summary">
          <strong>${row.name}</strong>
          <p style="margin:4px 0;">팀: ${row.team} · 지역: ${row.region}</p>
          <p style="margin:4px 0">상태: <b>${row.status}</b> · 심각도: ${row.severity}</p>
          <p style="margin:4px 0">점수: <b>${row.score?.toLocaleString()}</b></p>
        </div>
        <div class="demo-detail-notes">
          <p style="margin:4px 0">담당자: ${row.owner} (${row.queue})</p>
          <p style="margin:4px 0">최근 작업: ${row.lastAction}</p>
          <p>${row.notes}</p>
        </div>
      `;
      return div;
    },
    detailRowHeight: 150,
  },
});

// Mapping Active Grid instances based on Active Tab
let activeGrid = gridOverview;

// ── GENERAL RUNTIME STATS SYNCING ────────────────────────────
function refreshGlobalStats() {
  if (!activeGrid) return;

  // Update Header Counters
  rowCountEl.textContent = activeGrid.getRows().length.toLocaleString();
  visibleCountEl.textContent = activeGrid.getFlatRows().length.toLocaleString();
  selectedCountEl.textContent = activeGrid.getSelectedRows
    ? activeGrid.getSelectedRows().length.toLocaleString()
    : "0";

  // Update Footer Details
  modeValueEl.textContent = activeGrid.getDisplayMode
    ? activeGrid.getDisplayMode()
    : "client";

  if (activeGrid === gridOverview) {
    datasetValueEl.textContent = "flat (2,500)";
    groupingValueEl.textContent = "off";
    treeValueEl.textContent = "off";
    treeDepthValueEl.textContent = "0";
    variableHeightValueEl.textContent = "off";

    const pag = gridOverview.getPaginationState();
    paginationValueEl.textContent = `${pag.mode} | page ${pag.page + 1}/${pag.totalPages} | size ${pag.pageSize}`;

    const inf = gridOverview.getInfiniteScrollState();
    infiniteValueEl.textContent = `${inf.mode} | loaded ${inf.loadedCount} | hasMore ${inf.hasMore}`;

    const cols = gridOverview.getColumnState();
    columnStateValueEl.textContent = `${cols.columns.length} columns`;

    const plugins = gridOverview.getInstalledPlugins();
    pluginsValueEl.textContent = plugins.length ? plugins.join(", ") : "none";
  } else if (activeGrid === gridHierarchy) {
    const isTree = gridHierarchy.isTreeEnabled && gridHierarchy.isTreeEnabled();
    const isGroup =
      gridHierarchy.isGroupingEnabled && gridHierarchy.isGroupingEnabled();

    datasetValueEl.textContent = isTree ? "tree (Division)" : "flat (1,500)";
    groupingValueEl.textContent = isGroup ? "on (team)" : "off";
    treeValueEl.textContent = isTree ? "on" : "off";

    const maxDepth = gridHierarchy
      .getFlatRows()
      .reduce((max, row) => Math.max(max, row._depth ?? 0), 0);
    treeDepthValueEl.textContent = String(maxDepth);
    variableHeightValueEl.textContent = "off";
    paginationValueEl.textContent = "n/a";
    infiniteValueEl.textContent = "n/a";
    columnStateValueEl.textContent = `${gridHierarchy.getColumnState().columns.length} columns`;
    pluginsValueEl.textContent =
      gridHierarchy.getInstalledPlugins().join(", ") || "none";
  } else if (activeGrid === gridLive) {
    datasetValueEl.textContent = "live streaming dataset";
    groupingValueEl.textContent = "off";
    treeValueEl.textContent = "off";
    treeDepthValueEl.textContent = "0";
    variableHeightValueEl.textContent = "off";
    paginationValueEl.textContent = "n/a";
    infiniteValueEl.textContent = "n/a";
    columnStateValueEl.textContent = `${gridLive.getColumnState().columns.length} columns`;
    pluginsValueEl.textContent =
      gridLive.getInstalledPlugins().join(", ") || "none";
  } else if (activeGrid === gridEnterprise) {
    datasetValueEl.textContent = "enterprise analytics dataset";
    groupingValueEl.textContent = "off";
    treeValueEl.textContent = "off";
    treeDepthValueEl.textContent = "0";
    variableHeightValueEl.textContent = "off";
    paginationValueEl.textContent = "n/a";
    infiniteValueEl.textContent = "n/a";
    columnStateValueEl.textContent = `${gridEnterprise.getColumnState().columns.length} columns`;
    pluginsValueEl.textContent =
      gridEnterprise.getInstalledPlugins().join(", ") || "none";
  }
}

// ── EVENT LOGGING ON GRIDS ───────────────────────────────────
[
  gridOverview,
  multiHeaderGrid,
  gridHierarchy,
  gridLive,
  gridEnterprise,
].forEach((g, idx) => {
  const name = ["Overview", "MultiHeader", "Hierarchy", "Live", "Enterprise"][
    idx
  ];

  g.on("render", () => {
    if (activeGrid === g) refreshGlobalStats();
  });

  g.on("selection-change", ({ selectedCount }) => {
    if (activeGrid === g) {
      selectedCountEl.textContent = selectedCount.toLocaleString();
    }
    logEvent(`${name}: selection-change`, { selectedCount });
  });

  g.on("state-change", ({ type }) => {
    if (activeGrid === g) refreshGlobalStats();
    logEvent(`${name}: state-change`, { type });
  });

  g.on("row-click", ({ row }) => {
    logEvent(`${name}: row-click`, {
      rowKey: row._rowKey,
      type: row._type,
      depth: row._depth ?? 0,
    });
  });
});

// ── TAB TRANSITION LOGIC ──────────────────────────────────────
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;

    // Toggle Tab Button Active Class
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Toggle Content Display
    tabContents.forEach((content) => {
      if (content.id === `tab-${tabId}`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // Cleanup Live streaming timer if exiting Live tab
    if (tabId !== "live") {
      stopStream();
    }

    // Switch Active Grid Reference & Force Layout recalculation
    if (tabId === "overview") {
      activeGrid = gridOverview;
      gridOverview.refresh();
      multiHeaderGrid.refresh();
    } else if (tabId === "hierarchy") {
      activeGrid = gridHierarchy;
      gridHierarchy.refresh();
    } else if (tabId === "live") {
      activeGrid = gridLive;
      gridLive.refresh();
    } else if (tabId === "enterprise") {
      activeGrid = gridEnterprise;
      gridEnterprise.refresh();
    }

    refreshGlobalStats();
    logEvent("tab-change", { activeTab: tabId });
  });
});

// ── OVERVIEW TAB CONTROLS BINDING ────────────────────────────
scenarioRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (!e.target.checked) return;
    const scenario = e.target.value;

    if (scenario === "client") {
      gridOverview.setDisplayMode("client");
    } else if (scenario.startsWith("paginated")) {
      const mode = scenario.split("-")[1]; // client / server
      gridOverview.setPaginationMode(mode);
      gridOverview.setDisplayMode("paginated");
    } else if (scenario.startsWith("infinite")) {
      const mode = scenario.split("-")[1]; // client / server
      gridOverview.setInfiniteScrollMode(mode);
      gridOverview.enableInfiniteScroll();
    }
    refreshGlobalStats();
    logEvent("Overview: scenario-change", { scenario });
  });
});

pageSizeSelect.addEventListener("change", () => {
  gridOverview.setPageSize(Number(pageSizeSelect.value));
  logEvent("Overview: page-size", { size: Number(pageSizeSelect.value) });
});

reloadButton.addEventListener("click", () => {
  gridOverview.setData(createFlatRows(2500));
  flashActionButton(reloadButton);
  logEvent("Overview: reload");
});

prevPageButton.addEventListener("click", () => {
  gridOverview.prevPage();
  flashActionButton(prevPageButton);
});

nextPageButton.addEventListener("click", () => {
  gridOverview.nextPage();
  flashActionButton(nextPageButton);
});

loadMoreButton.addEventListener("click", async () => {
  if (gridOverview.getDisplayMode() !== "infinite") {
    flashActionButton(loadMoreButton);
    logEvent("Overview: loadMore-skipped", {
      reason: "not in infinite scroll mode",
    });
    return;
  }
  await gridOverview.loadMoreInfinite();
  flashActionButton(loadMoreButton);
});

// Overview Excel/CSV Downloads
document
  .getElementById("downloadMainCsvButton")
  .addEventListener("click", () => {
    gridOverview.downloadCsv({ fileName: "overview-grid.csv" });
  });

document
  .getElementById("downloadMainExcelButton")
  .addEventListener("click", () => {
    if (typeof gridOverview.downloadXlsx === "function") {
      gridOverview.downloadXlsx({ fileName: "overview-grid.xlsx" });
    } else {
      gridOverview.downloadExcel({ fileName: "overview-grid.xls" });
    }
  });

document
  .getElementById("downloadMainSelectedCsvButton")
  .addEventListener("click", () => {
    gridOverview.downloadCsv({
      fileName: "overview-grid-selected.csv",
      onlySelected: true,
    });
  });

document
  .getElementById("downloadMultiCsvButton")
  .addEventListener("click", () => {
    multiHeaderGrid.downloadCsv({ fileName: "multi-header.csv" });
  });

document
  .getElementById("downloadMultiExcelButton")
  .addEventListener("click", () => {
    if (typeof multiHeaderGrid.downloadXlsx === "function") {
      multiHeaderGrid.downloadXlsx({ fileName: "multi-header.xlsx" });
    } else {
      multiHeaderGrid.downloadExcel({ fileName: "multi-header.xls" });
    }
  });

// ── HIERARCHY TAB CONTROLS BINDING ───────────────────────────
structureRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (!e.target.checked) return;
    const mode = e.target.value;

    gridHierarchy.disableGrouping();
    gridHierarchy.disableTree();

    if (mode === "flat") {
      gridHierarchy.setData(createFlatRows(1500));
    } else if (mode === "grouped") {
      gridHierarchy.setData(createFlatRows(1500));
      gridHierarchy.enableGrouping(["team"], {
        aggregations: {
          score: [{ type: "avg" }],
        },
      });
    } else if (mode === "tree") {
      gridHierarchy.setData(createTreeRows());
      gridHierarchy.enableTree({
        treeMode: "children",
        childrenField: "children",
        hasChildrenField: "hasChildren",
        onLoadChildren: createLazyChildren,
      });
    }
    refreshGlobalStats();
    logEvent("Hierarchy: structure-mode-change", { mode });
  });
});

expandTreeButton.addEventListener("click", () => {
  if (typeof gridHierarchy.expandAllTree === "function") {
    gridHierarchy.expandAllTree();
    logEvent("Hierarchy: expand-all");
  }
  flashActionButton(expandTreeButton);
});

collapseTreeButton.addEventListener("click", () => {
  if (typeof gridHierarchy.collapseAllTree === "function") {
    gridHierarchy.collapseAllTree();
    logEvent("Hierarchy: collapse-all");
  }
  flashActionButton(collapseTreeButton);
});

let variableRowHeightEnabled = false;
variableHeightButton.addEventListener("click", () => {
  variableRowHeightEnabled = !variableRowHeightEnabled;
  setToggleState(variableHeightButton, variableRowHeightEnabled);
  gridHierarchy.setVariableRowHeight(variableRowHeightEnabled);
  logEvent("Hierarchy: variable-height-toggle", {
    enabled: variableRowHeightEnabled,
  });
});

// ── LIVE STREAMING & BENCHMARK BINDING ─────────────────────────
let streamTimer = null;
let streamRowCounter = 0;
let streamRunning = false;
let livePaused = false;
let liveRowAnimationEnabled = true;

function makeLiveRows(count) {
  return Array.from({ length: count }, () => {
    const id = ++streamRowCounter + 100000;
    return {
      id,
      name: `Stream Op ${String(id).padStart(6, "0")}`,
      team: TEAM_NAMES[id % TEAM_NAMES.length],
      status: STATUS_NAMES[id % STATUS_NAMES.length],
      score: 3000 + ((id * 9) % 9000),
      region: REGIONS[id % REGIONS.length],
      severity: SEVERITIES[id % SEVERITIES.length],
      owner: OWNERS[id % OWNERS.length],
      queue: QUEUES[id % QUEUES.length],
      lastAction: "Queued as live arrival",
      notes: `Stream row ${streamRowCounter}. ${createNotes(id)}`,
      updatedAt: toTimestamp(Date.now()),
    };
  });
}

liveButton.addEventListener("click", () => {
  const rows = makeLiveRows(3);
  gridLive.liveAddRows(rows);
  flashActionButton(liveButton);
  logEvent("Live: burst-added-rows", { count: rows.length });
});

function stopStream() {
  if (streamTimer !== null) {
    window.clearInterval(streamTimer);
    streamTimer = null;
  }
  streamRunning = false;
  setToggleState(startStreamButton, false);
  logEvent("Live: stream-stopped", { totalPushed: streamRowCounter });
}

startStreamButton.addEventListener("click", () => {
  if (streamRunning) {
    stopStream();
    return;
  }

  const maxRows = Number(streamMaxRowsInput.value) || 1000;
  gridLive.setLiveMaxRows(maxRows);
  streamRunning = true;
  setToggleState(startStreamButton, true);
  logEvent("Live: stream-started", { maxRows });

  streamTimer = window.setInterval(
    () => {
      const burst = Math.max(1, Number(streamBurstInput.value) || 10);
      const rows = makeLiveRows(burst);
      gridLive.liveAddRows(rows);
    },
    Math.max(50, Number(streamIntervalInput.value) || 200),
  );
});

stopStreamButton.addEventListener("click", () => {
  stopStream();
});

pauseLiveButton.addEventListener("click", () => {
  livePaused = !livePaused;
  setToggleState(pauseLiveButton, livePaused);
  if (livePaused) {
    gridLive.pauseLiveUpdates();
  } else {
    gridLive.resumeLiveUpdates();
  }
  logEvent("Live: paused-state-toggle", { paused: livePaused });
});

liveAnimationButton.addEventListener("click", () => {
  liveRowAnimationEnabled = !liveRowAnimationEnabled;
  setToggleState(liveAnimationButton, liveRowAnimationEnabled);
  gridLive.setLiveRowAnimationEnabled(liveRowAnimationEnabled);
  logEvent("Live: cell-animation-toggle", { enabled: liveRowAnimationEnabled });
});

appendRowsButton.addEventListener("click", () => {
  const currentLen = gridLive.getRows().length;
  const rows = Array.from({ length: 5 }, (_, index) => {
    const id = currentLen + 10000 + index;
    return {
      id,
      name: `Appended Operator ${String(id).padStart(4, "0")}`,
      team: TEAM_NAMES[id % TEAM_NAMES.length],
      status: STATUS_NAMES[id % STATUS_NAMES.length],
      score: 2000 + id * 5,
      region: REGIONS[id % REGIONS.length],
      severity: SEVERITIES[id % SEVERITIES.length],
      owner: OWNERS[id % OWNERS.length],
      queue: QUEUES[id % QUEUES.length],
      lastAction: "Appended manually",
      notes: `Manually appended row ${id}.`,
      updatedAt: toTimestamp(Date.now()),
    };
  });
  gridLive.appendRows(rows);
  flashActionButton(appendRowsButton);
  logEvent("Live: append-rows", { count: rows.length });
});

updateFirstRowButton.addEventListener("click", () => {
  const rows = gridLive.getRows();
  const first = rows[0];
  if (!first) return;
  const updated = {
    ...first,
    name: `${first.name} Updated`,
    lastAction: "Updated manually",
    updatedAt: toTimestamp(Date.now()),
  };
  gridLive.updateRows([updated]);
  flashActionButton(updateFirstRowButton);
  logEvent("Live: update-row", { id: updated.id });
});

patchFirstRowButton.addEventListener("click", () => {
  const rows = gridLive.getRows();
  const first = rows[0];
  if (!first) return;
  const nextStatus = first.status === "Active" ? "Review" : "Active";
  gridLive.patchRow(first.id, {
    status: nextStatus,
    updatedAt: toTimestamp(Date.now()),
    notes: `Patched status to ${nextStatus}.`,
  });
  flashActionButton(patchFirstRowButton);
  logEvent("Live: patch-row", { id: first.id });
});

removeLastRowButton.addEventListener("click", () => {
  const rows = gridLive.getRows();
  const last = rows.at(-1);
  if (!last) return;
  gridLive.removeRows([last.id]);
  flashActionButton(removeLastRowButton);
  logEvent("Live: remove-row", { id: last.id });
});

// Benchmarking handlers
function logBenchmark(label, duration, details = "") {
  const line = `${label}: ${duration.toFixed(1)}ms${details ? ` | ${details}` : ""}`;
  const existingLines = benchmarkLogEl.textContent
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !item.startsWith("벤치마크"));

  benchmarkLogEl.textContent = [line, ...existingLines].slice(0, 6).join("\n");
}

benchmarkRenderButton.addEventListener("click", async () => {
  const start = performance.now();

  // Setup render lock promise
  const renderPromise = new Promise((res) => {
    gridLive.on("render", res, { once: true });
  });

  gridLive.setData(createFlatRows(500));
  await renderPromise;

  flashActionButton(benchmarkRenderButton);
  logBenchmark("Reload dataset", performance.now() - start, "500 rows");
});

benchmarkScenarioButton.addEventListener("click", async () => {
  const start = performance.now();
  const renderPromise = new Promise((res) => {
    gridLive.on("render", res, { once: true });
  });

  const nextMode =
    gridLive.getDisplayMode() === "client" ? "paginated" : "client";
  gridLive.setDisplayMode(nextMode);
  await renderPromise;

  flashActionButton(benchmarkScenarioButton);
  logBenchmark(
    "Switch scenario",
    performance.now() - start,
    `mode=${nextMode}`,
  );
});

benchmarkScrollButton.addEventListener("click", async () => {
  const viewport =
    document.getElementById("grid-live").querySelector(".ag-body-viewport") ||
    document
      .getElementById("grid-live")
      .querySelector(".highgrid-body-viewport");
  if (!viewport) {
    logBenchmark("Scroll Step", 0, "failed: viewport not found");
    return;
  }
  const start = performance.now();
  viewport.scrollTop = Math.min(
    viewport.scrollTop + 320,
    viewport.scrollHeight,
  );
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  flashActionButton(benchmarkScrollButton);
  logBenchmark(
    "Scroll step",
    performance.now() - start,
    `top=${Math.round(viewport.scrollTop)}`,
  );
});

// ── ENTERPRISE TAB CONTROLS BINDING ──────────────────────────
let conditionalFormatActive = false;
document
  .getElementById("conditionalFormatButton")
  ?.addEventListener("click", function () {
    conditionalFormatActive = !conditionalFormatActive;
    setToggleState(this, conditionalFormatActive);

    const updated = gridEnterprise.getAllLeafColumns().map((c) => {
      if (c.def.id !== "score") return c.def;
      return {
        ...c.def,
        conditionalFormat: conditionalFormatActive
          ? (v) => {
              if (v >= 8000)
                return { style: { color: "#34d399", fontWeight: "bold" } };
              if (v <= 2000) return { style: { color: "#f87171" } };
              return null;
            }
          : null,
      };
    });
    gridEnterprise.setColumns(updated);
    logEvent("Enterprise: conditional-format", {
      active: conditionalFormatActive,
    });
  });

let sparklineActive = false;
document
  .getElementById("sparklineButton")
  ?.addEventListener("click", function () {
    sparklineActive = !sparklineActive;
    setToggleState(this, sparklineActive);
    gridEnterprise.setColumnVisible("trend", sparklineActive);
    gridEnterprise.setColumnVisible("trendBar", sparklineActive);
    gridEnterprise.setColumnVisible("trendArea", sparklineActive);
    logEvent("Enterprise: sparkline-toggle", { active: sparklineActive });
  });

let pivotActive = false;
document.getElementById("pivotButton")?.addEventListener("click", function () {
  pivotActive = !pivotActive;
  setToggleState(this, pivotActive);
  if (pivotActive) {
    gridEnterprise.enablePivot({
      rowFields: ["region"],
      columnField: "team",
      valueField: "score",
      aggFunction: "avg",
    });
    logEvent("Enterprise: pivot-enabled", {
      row: "region",
      col: "team",
      agg: "avg",
    });
  } else {
    gridEnterprise.disablePivot();
    gridEnterprise.setColumns(enterpriseColumns);
    logEvent("Enterprise: pivot-disabled");
  }
});

document
  .getElementById("pinnedRowButton")
  ?.addEventListener("click", function () {
    const firstRow = gridEnterprise.getRows()[0];
    if (firstRow) {
      gridEnterprise.setPinnedTopRows([
        { ...firstRow, name: "[Pinned] " + firstRow.name },
      ]);
      logEvent("Enterprise: row-pinned", { key: firstRow._rowKey });
    }
    flashActionButton(this);
  });

document
  .getElementById("clearPinnedButton")
  ?.addEventListener("click", function () {
    gridEnterprise.setPinnedTopRows([]);
    gridEnterprise.setPinnedBottomRows([]);
    logEvent("Enterprise: pin-cleared");
    flashActionButton(this);
  });

document.getElementById("undoButton")?.addEventListener("click", function () {
  if (!gridEnterprise.canUndo()) {
    logEvent("Enterprise: undo-failed", { reason: "no undo history" });
    return;
  }
  const result = gridEnterprise.undo();
  logEvent("Enterprise: undo-success", result);
  flashActionButton(this);
});

document.getElementById("redoButton")?.addEventListener("click", function () {
  if (!gridEnterprise.canRedo()) {
    logEvent("Enterprise: redo-failed", { reason: "no redo history" });
    return;
  }
  const result = gridEnterprise.redo();
  logEvent("Enterprise: redo-success", result);
  flashActionButton(this);
});

document.getElementById("printButton")?.addEventListener("click", () => {
  gridEnterprise.printGrid();
});

// ── THEME SWITCHING ───────────────────────────────────────────
const themeToggleBtn = document.getElementById("themeToggleBtn");
let currentTheme = localStorage.getItem("highgrid-demo-theme") || "dark";

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  const gridHosts = [
    document.getElementById("grid-overview"),
    document.getElementById("multiHeaderGrid"),
    document.getElementById("grid-hierarchy"),
    document.getElementById("grid-live"),
    document.getElementById("grid-enterprise"),
  ];
  gridHosts.forEach((host) => {
    if (!host) return;
    if (theme === "dark") {
      host.classList.add("ag-theme-dark");
    } else {
      host.classList.remove("ag-theme-dark");
    }
  });
}

// Initialize theme
applyTheme(currentTheme);

themeToggleBtn.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
  localStorage.setItem("highgrid-demo-theme", currentTheme);
  logEvent("theme-change", { theme: currentTheme });
});

// ── INITIAL SYSTEM SYNCS ──────────────────────────────────────
setToggleState(liveAnimationButton, true);
refreshGlobalStats();
logEvent("dashboard-initialized", { ready: true });
