# HighGrid

HighGrid is a vanilla JavaScript data grid library.
It covers the pieces you usually need in a real table: virtual scrolling, paging, infinite loading, grouping, tree data, live updates, plugins, and custom cell rendering.

Other Languages: [한국어 문서 (Korean)](./README.ko.md)

---

## Demo

[데모 사이트(Demo site) 바로가기](https://cheonghakim.github.io/high-grid/)

---

### Table of Contents

A categorized guide map to quickly locate details about HighGrid's extensive feature set. Click on any topic to jump directly to its section.

#### 1. Setup & Fundamentals
* [1. Overview](#1-overview)
* [2. Installation](#2-installation)
* [3. Quick Start](#3-quick-start)
* [4. Column Definitions](#4-column-definitions)
* [5. Cell Renderer](#5-cell-renderer)
* [6. Core Options](#6-core-options)
* [7. Overlay States and Accessibility](#7-overlay-states-and-accessibility)
* [20. Header Groups](#20-header-groups)
* [23. TypeScript Support](#23-typescript)
* [27. Before You Ship](#27-before-you-ship)
* [50. Auto-numbering Row Column (Row number)](#50-auto-numbering-row-column-row-number)
* [52. Column Inline Filter Row](#52-column-inline-filter-row)

#### 2. Data Operations & Updates
* [8. Data Mutation API](#8-data-mutation-api)
* [12. Live Updates](#12-live-updates)
* [18. Column Runtime API](#18-column-runtime-api)
* [24. State Query API](#24-state-query-api)
* [30. Column Aggregation (Status Bar)](#30-column-aggregation-status-bar)
* [33. Row Pinning](#33-row-pinning)
* [40. Status Bar](#40-status-bar)
* [51. Cell Flash Animation](#51-cell-flash-animation-live-update-highlights)

#### 3. Filtering, Sorting & Grouping
* [9. Sorting, Filtering, Selection](#9-sorting-filtering-selection)
* [10. Grouping and Tree Data](#10-grouping-and-tree-data)
* [11. Pagination and Infinite Scroll](#11-pagination-and-infinite-scroll)
* [31. Advanced Filter (AND/OR Tree)](#31-advanced-filter-andor-tree)
* [32. Pivot Mode](#32-pivot-mode)
* [41. Master-Detail (Expandable Rows)](#41-master-detail-expandable-rows)
* [43. Multi-column Sorting (Shift+Click)](#43-multi-column-sorting-shiftclick)
* [49. Advanced Filter GUI Builder](#49-advanced-filter-gui-builder-side-panel-filter-tab)
* [57. Multi-level Group Aggregations](#57-multi-level-group-aggregations)
* [58. Web Worker Background Data Pipeline](#58-web-worker-background-data-pipeline)

#### 4. Cell Interactions & Editing
* [13. Cell Editing, Validation, and Clipboard](#13-cell-editing-validation-and-clipboard)
* [29. Custom Cell Editors](#29-custom-cell-editors)
* [34. Undo / Redo](#34-undo--redo)
* [35. Row Drag & Drop](#35-row-drag--drop)
* [36. Range Selection](#36-range-selection)
* [47. 2D Rectangular Range Copy/Paste](#47-2d-rectangular-range-copypaste)
* [48. Functional Cell Edit Locking](#48-functional-cell-edit-locking)
* [53. Keyboard Navigation Completed](#53-keyboard-navigation-completed)
* [55. Fill Handle (Cell Autofill)](#55-fill-handle-cell-autofill)
* [59. Basic Formulas (=SUM, =AVG)](#59-basic-formulas-sum-avg)

#### 5. Styling, Events & Tooling
* [14. Events](#14-events)
* [15. CSV/Excel Export and Context Menus](#15-csvexcel-export-and-context-menus)
* [16. Plugins](#16-plugins)
* [17. Persisting Column State](#17-persisting-column-state)
* [19. Variable Row Height](#19-variable-row-height)
* [22. Theming](#22-theming)
* [37. Conditional Formatting](#37-conditional-formatting)
* [38. Sparkline Plugin (Inline Charts)](#38-sparkline-plugin-inline-charts)
* [39. XLSX Export Plugin](#39-xlsx-export-plugin)
* [42. Print](#42-print)
* [54. Side Panel Drag & Drop Column Reordering](#54-side-panel-drag--drop-column-reordering)
* [56. Rich HTML Tooltip (Custom Popups)](#56-rich-html-tooltip-custom-popups)

#### 6. Framework Integrations
* [21. Vue 3 Adapter](#21-vue-3-adapter)
* [28. React Adapter](#28-react-adapter)

#### 7. Development & Running Examples
* [25. Running the Example App](#25-running-the-example-app)
* [26. GitHub Pages Deployment](#26-github-pages-deployment)

---

### 1. Overview

HighGrid is a vanilla JavaScript data grid for teams that want a solid default table without bringing in a large framework dependency.
It includes virtual scrolling, client/server pagination, infinite loading, grouping, tree data, runtime updates, plugins, custom cell renderers, and a built-in side panel.

### 2. Installation

```bash
npm install highgrid
```

Import both the library and the stylesheet.

```js
import { createGrid } from "highgrid";
import "highgrid/styles/grid.css";
```

### 3. Quick Start

```html
<div id="app" style="height: 600px;"></div>
```

```js
import { createGrid } from "highgrid";
import "highgrid/styles/grid.css";

const rows = [
  { id: 1, name: "Alice", team: "Red", score: 1200 },
  { id: 2, name: "Bob", team: "Blue", score: 980 },
];

const columns = [
  { id: "name", field: "name", headerName: "Name", width: 180 },
  { id: "team", field: "team", headerName: "Team", width: 120 },
  {
    id: "score",
    field: "score",
    headerName: "Score",
    width: 120,
    align: "right",
  },
];

const grid = createGrid("#app", {
  rowKey: "id",
  columns,
  rows,
  rowHeight: 40,
});
```

Tips:

- You can pass a selector string directly, like `createGrid('#app', options)`.
- Give the container an explicit height for virtual scrolling.
- Use a stable and unique `rowKey` whenever possible.

### 4. Column Definitions

Common column properties:

- `id`: unique column id
- `field`: row field name
- `headerName` or `header`: header label
- `width`: default width
- `align`: `left`, `center`, `right`
- `type`: sorting/comparison hint such as `number` or `date`
- `renderer`: custom cell renderer
- `formatter`: value formatter
- `pinned`: `left` or `right`
- `minWidth`, `maxWidth`: resize limits

Example:

```js
const columns = [
  { id: "name", field: "name", headerName: "Name", width: 180 },
  {
    id: "status",
    field: "status",
    headerName: "Status",
    width: 140,
    renderer: ({ value }) => {
      const badge = document.createElement("span");
      badge.textContent = value;
      badge.className = `status status-${String(value).toLowerCase()}`;
      return badge;
    },
  },
];
```

### 5. Cell Renderer

A cell renderer is called as `renderer({ value, row, def, state })`.

Return rules:

- Return an `HTMLElement` to inject real DOM content.
- Return a string or number for text rendering.
- Return `null` or `undefined` for an empty result.

```js
const scoreColumn = {
  id: "score",
  field: "score",
  headerName: "Score",
  renderer: ({ value }) => {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.justifyContent = "space-between";

    const label = document.createElement("strong");
    label.textContent = String(value);

    const meter = document.createElement("span");
    meter.style.width = `${Math.min(100, Number(value) / 20)}%`;
    meter.style.height = "6px";
    meter.style.background = "#0f4c81";
    meter.style.borderRadius = "999px";

    wrap.append(label, meter);
    return wrap;
  },
};
```

### 6. Core Options

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  rowHeight: 40,
  variableRowHeight: false,
  selectable: true,
  selectionMode: "multiple",
  tableId: "orders-grid",
  sidePanel: {
    enabled: true,
    defaultTab: "columns",
    defaultOpen: false,
    quickFilterFields: ["name", "team", "status"],
  },
  pagination: {
    mode: "client",
    pageSize: 25,
  },
  infiniteScroll: {
    mode: "client",
    initialLoadSize: 100,
    loadMoreSize: 50,
  },
  liveUpdates: {
    enabled: true,
    maxRows: 1000,
    rowAnimationEnabled: true,
  },
});
```

### 7. Overlay States and Accessibility

```js
const grid = createGrid("#app", {
  rowKey: "id",
  columns,
  rows: [],
  renderLoadingState: () => "<div>Loading...</div>",
  renderEmptyState: () => "<div>No rows yet.</div>",
  renderErrorState: ({ message }) => `<div>Error: ${message}</div>`,
});
```

HighGrid ships with a default `role="grid"` structure and basic arrow-key navigation between headers and cells.

### 8. Data Mutation API

```js
grid.setRows(rows);
grid.appendRows([{ id: 3, name: "Carol" }]);
grid.updateRows([{ id: 1, name: "Alice Updated" }]);
grid.patchRow(1, { score: 1500 });
grid.upsertRows([
  { id: 2, score: 1111 },
  { id: 4, name: "Dave" },
]);
grid.removeRows([4]);
```

### 9. Sorting, Filtering, Selection

```js
grid.sortBy([{ field: "score", direction: "desc", type: "number" }]);

grid.clearSort();
grid.setQuickFilter("alice", ["name", "team"]);
grid.setColumnFilter("status", {
  type: "text",
  field: "status",
  operator: "contains",
  value: "Active",
});
grid.clearFilters();
grid.toggleSelectAll();
grid.setRowSelected(1, true);
```

### 10. Grouping and Tree Data

```js
grid.enableGrouping(["team"]);
grid.toggleGroup("team:Red");
grid.disableGrouping();

grid.enableTree({
  treeMode: "children",
  childrenField: "children",
  hasChildrenField: "hasChildren",
  onLoadChildren: async (row) => {
    return [{ id: `${row.id}-1`, name: "Child", hasChildren: false }];
  },
});

grid.expandAllTree();
grid.collapseAllTree();
grid.disableTree();
```

### 11. Pagination and Infinite Scroll

Client mode:

```js
grid.setDisplayMode("paginated");
grid.setPageSize(50);
grid.nextPage();

grid.enableInfiniteScroll();
grid.loadMoreInfinite();
```

Server mode:

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows: [],
  pagination: {
    mode: "server",
    pageSize: 25,
    fetchPage: async ({ page, pageSize, filters, sort }) => {
      const result = await fetchPageFromServer({
        page,
        pageSize,
        filters,
        sort,
      });
      return {
        rows: result.rows,
        totalCount: result.totalCount,
      };
    },
  },
  infiniteScroll: {
    mode: "server",
    initialLoadSize: 50,
    loadMoreSize: 50,
    onLoadMore: async ({ offset, loadSize, filters, sort }) => {
      return await fetchMoreFromServer({ offset, loadSize, filters, sort });
    },
  },
});
```

### 12. Live Updates

```js
grid.liveAddRows([{ id: 1001, name: "Live Row" }]);
grid.liveUpdateRows([{ id: 1, name: "Updated in live mode" }]);
grid.livePatchRow(2, { status: "Review" });
grid.liveUpsertRows([{ id: 5, name: "Upserted" }]);
grid.liveRemoveRows([5]);

grid.pauseLiveUpdates();
grid.resumeLiveUpdates();
grid.setLiveMaxRows(2000);
grid.setLiveRowAnimationEnabled(true);

const stats = await grid.benchmarkLiveUpdates({
  rowsPerSecond: 500,
  durationMs: 3000,
});
```

### 13. Cell Editing, Validation, and Clipboard

Add `editable`, `parser`, and `validator` to columns to enable the built-in editing flow.

```js
const columns = [
  { id: "name", field: "name", headerName: "Name", editable: true },
  {
    id: "score",
    field: "score",
    headerName: "Score",
    type: "number",
    editable: true,
    validator: ({ value }) => Number(value) >= 0 || "Score must be positive.",
  },
];

grid.beginCellEdit(1, "name");
grid.setCellValue(1, "score", 120);
grid.validateRows();

const errors = grid.getValidationErrors();
```

Clipboard helpers use tab-separated text so the output works well with spreadsheets.

```js
grid.setRowSelected(1, true);

const text = grid.copySelectionToClipboard({
  columns: ["name", "score"],
});

grid.pasteFromClipboard("Alice\t140", {
  startRowKey: 1,
  columns: ["name", "score"],
});
```

### 14. Events

```js
grid.on("render", (payload) => {
  console.log("render", payload);
});

grid.on("row-click", ({ row, event }) => {
  console.log("row click", row);
});

grid.on("cell-click", ({ row, colId, value }) => {
  console.log("cell click", row, colId, value);
});

grid.on("cell-value-change", ({ rowKey, colId, value }) => {
  console.log("cell value changed", rowKey, colId, value);
});

grid.on("selection-change", (payload) => {
  console.log("selection changed", payload);
});

grid.on("state-change", ({ type }) => {
  console.log("state changed", type);
});
```

### 15. CSV/Excel Export and Context Menus

```js
const csv = grid.exportCsv({
  scope: "displayed",
  columns: ["name", "team", "score"],
});

grid.downloadCsv({
  scope: "all",
  fileName: "operators.csv",
});

const excelHtml = grid.exportExcel({
  scope: "all",
  columns: ["name", "team", "score"],
});

grid.downloadExcel({
  scope: "all",
  fileName: "operators.xls",
});
```

```js
const grid = createGrid("#app", {
  rowKey: "id",
  columns,
  rows,
  onCellContextMenu: ({ row, colId, event }) => {
    event.preventDefault();
    console.log("context menu", row, colId);
  },
});
```

### 16. Plugins

Built-in plugins include `uppercaseTeamPlugin` and `scorePrefixPlugin`.

```js
import {
  createGrid,
  uppercaseTeamPlugin,
  createContextMenuPlugin,
  createCsvShortcutPlugin,
} from "highgrid";

grid.usePlugin(uppercaseTeamPlugin);
grid.unusePlugin("uppercase-team");

grid.usePlugin(
  createCsvShortcutPlugin({
    fileName: "operators.csv",
  }),
);

grid.usePlugin(
  createContextMenuPlugin({
    getItems: ({ row, core }) => [
      {
        label: `Export ${row.name}`,
        onSelect: () => {
          core.downloadCsv({ scope: "all", fileName: `${row.name}.csv` });
        },
      },
    ],
  }),
);
```

You can also create custom hook-based plugins.

```js
const myPlugin = {
  name: "my-plugin",
  hooks: {
    afterDataProcess(result) {
      return {
        ...result,
        displayRows: result.displayRows.map((row) => ({
          ...row,
          name: `[Checked] ${row.name}`,
        })),
      };
    },
  },
};
```

### 17. Persisting Column State

When `tableId` is provided, HighGrid can persist and restore column width, visibility, and pin state.

```js
await grid.saveColumnState();
await grid.loadColumnState();
await grid.clearColumnState();
```

### 18. Column Runtime API

```js
grid.setColumnVisible("score", false);
grid.setColumnWidth("score", 160);
grid.setColumnPinned("name", "left");
grid.moveColumn("score", 2);

const allCols = grid.getAllLeafColumns();
const visibleCols = grid.getVisibleLeafColumns();
```

### 19. Variable Row Height

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  variableRowHeight: true,
  getRowHeight: (row) => (row.type === "detail" ? 80 : 40),
});
```

### 20. Header Groups

```js
const columns = [
  { id: "name", field: "name", headerName: "Name", width: 160 },
  {
    id: "location-group",
    headerName: "Location",
    children: [
      { id: "region", field: "region", headerName: "Region", width: 120 },
      { id: "country", field: "country", headerName: "Country", width: 100 },
    ],
  },
];
```

### 21. Vue 3 Adapter

```bash
npm install highgrid
```

Component usage:

```vue
<template>
  <HighGrid
    :columns="columns"
    :rows="rows"
    row-key="id"
    @row-click="onRowClick"
    @selection-change="onSelectionChange"
  />
</template>

<script setup>
import { HighGrid } from "highgrid/vue";
</script>
```

Composable usage:

```vue
<template>
  <div ref="containerRef" style="height: 600px;" />
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useHighGrid } from "highgrid/vue";

const containerRef = ref(null);
const { grid, state, init, setRows } = useHighGrid(containerRef, {
  columns,
  rows,
});

onMounted(() => init());
</script>
```

### 22. Theming

Import `tokens.css` to expose every visual property as a CSS custom property.

```js
import "highgrid/styles/tokens.css";
import "highgrid/styles/grid.css";
```

Override any token on a parent element:

```css
#my-grid {
  --ag-accent: #7c3aed;
  --ag-row-height: 48px;
  --ag-font-size: 15px;
}
```

Built-in theme presets:

```html
<!-- Dark mode -->
<div class="ag-theme-dark"><div id="my-grid"></div></div>

<!-- Compact (32 px rows) -->
<div class="ag-theme-compact"><div id="my-grid"></div></div>

<!-- Spacious (52 px rows) -->
<div class="ag-theme-spacious"><div id="my-grid"></div></div>
```

### 23. TypeScript

Type declarations are bundled — no separate `@types` package needed.

```ts
import { createGrid, GridOptions, ColumnDef } from "highgrid";

interface Row {
  id: number;
  name: string;
  score: number;
}

const columns: ColumnDef<Row>[] = [
  { id: "name", field: "name", headerName: "Name" },
  { id: "score", field: "score", headerName: "Score", type: "number" },
];

const grid = createGrid<Row>(document.getElementById("app")!, {
  rowKey: "id",
  columns,
  rows: [],
});
```

### 24. State Query API

```js
grid.getFilterState();
grid.getGroupingState();
grid.getTreeState();
grid.getColumnState();
grid.getSelectionState();
grid.getPaginationState();
grid.getRows(); // raw source rows
grid.getFlatRows(); // flattened display rows (includes group/tree nodes)
```

### 25. Running the Example App

```bash
npm install
npm run dev
```

The example app includes a floating control panel for display modes, live updates, column state, and quick benchmark actions.

### 26. GitHub Pages Deployment

GitHub Pages should serve the built demo site, not the library build entry from `src/index.js`.

```bash
npm run build:demo
```

This creates `dist-pages/index.html`. The `.github/workflows/pages.yml` workflow uploads that folder as the Pages artifact. For a repository Page, the default URL `https://<user>.github.io/<repo>/` works without a custom domain.

A custom domain is optional. If you use one, configure it in GitHub Pages settings and point DNS to GitHub Pages. It does not fix the `index.html` location by itself, so the demo build is still required.

### 27. Before You Ship

- `npm test`
- `npm run build`
- `npm run build:demo`
- manually verify scrolling, sorting, filtering, and live updates with real datasets
- validate response shapes for `fetchPage`, `onLoadMore`, and `onLoadChildren` when using server mode

### 28. React Adapter

Install HighGrid and import the React hook.

```bash
npm install highgrid
```

```jsx
import { useHighGrid } from "highgrid/react";
import "highgrid/styles/grid.css";

function MyGrid() {
  const { containerRef, grid, state } = useHighGrid({
    rowKey: "id",
    columns,
    rows,
    rowHeight: 40,
  });

  return <div ref={containerRef} style={{ height: 600 }} />;
}
```

`useHighGrid` returns:

| Property | Type | Description |
|---|---|---|
| `containerRef` | `RefObject` | Attach to the container `<div>` |
| `grid` | `GridCore \| null` | Raw instance — available after mount |
| `getGrid()` | `() => GridCore \| null` | Stable ref accessor |
| `isReady` | `boolean` | `true` after the grid has mounted |
| `state` | `object` | Reactive selection + render summary |

`state` shape:

```ts
{
  selectedKeys: Set<string>;
  selectionCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  renderInfo: RenderPayload | null;
  paginationState: PaginationState | null;
}
```

The hook also exposes convenience delegates (`setRows`, `appendRows`, `updateRows`, `patchRow`, `removeRows`, `setColumns`, `setQuickFilter`, `setColumnFilter`, `clearFilters`, `sortBy`, `nextPage`, `prevPage`, `usePlugin`, `liveAddRows`, `on`, …) that forward directly to the underlying `GridCore`. Call `getGrid()` for any method not listed.

### 29. Custom Cell Editors

Import the built-in editor factories and assign them to `editor` on a column.

```js
import {
  createDateEditor,
  createSelectEditor,
  createTextareaEditor,
} from "highgrid";
```

**DateEditor** — renders an `<input type="date">`:

```js
{
  id: "deadline",
  field: "deadline",
  headerName: "Deadline",
  editable: true,
  editor: createDateEditor,
  editorOptions: { min: "2024-01-01", max: "2030-12-31" },
}
```

**SelectEditor** — renders a `<select>` dropdown:

```js
{
  id: "status",
  field: "status",
  headerName: "Status",
  editable: true,
  editor: createSelectEditor,
  options: ["Active", "Paused", "Review"],
  // or with label/value pairs:
  // options: [{ value: "A", label: "Active" }, { value: "P", label: "Paused" }]
  // or a function: options: ({ row }) => getOptionsForRow(row)
}
```

**TextareaEditor** — renders a `<textarea>` for long text:

```js
{
  id: "notes",
  field: "notes",
  headerName: "Notes",
  editable: true,
  editor: createTextareaEditor,
  editorOptions: { rows: 4, placeholder: "Enter notes..." },
}
```

Custom editor factory — the `editor` property accepts any function with signature `({ row, def, value }) => HTMLElement`:

```js
{
  id: "score",
  field: "score",
  editable: true,
  editor: ({ value }) => {
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value ?? "");
    input.className = "ag-cell-editor";
    return input;
  },
}
```

### 30. Column Aggregation (Status Bar)

Enable the status bar and add `aggregate` to columns you want to summarise.

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns: [
    { id: "score", field: "score", headerName: "Score", type: "number",
      aggregate: "avg" },
    { id: "revenue", field: "revenue", headerName: "Revenue", type: "number",
      aggregate: "sum" },
  ],
  rows,
  statusBar: { enabled: true },
});
```

Built-in `aggregate` values: `"sum"`, `"avg"`, `"count"`, `"min"`, `"max"`.

Pass a function for custom aggregation:

```js
{ id: "score", field: "score", aggregate: (values) => Math.median(values) }
```

Control aggregation at runtime:

```js
grid.setColumnAgg("score", "max");
grid.clearAggregates();
```

### 31. Advanced Filter (AND/OR Tree)

`setAdvancedFilter` accepts a condition tree made of **branch** nodes (`AND`/`OR`) and **leaf** nodes.

```js
grid.setAdvancedFilter({
  type: "AND",
  conditions: [
    { field: "status",   operator: "equals",      value: "Active",   filterType: "select" },
    { field: "score",    operator: "greaterThan",  value: 5000,       filterType: "number" },
    {
      type: "OR",
      conditions: [
        { field: "region", operator: "equals", value: "Seoul" },
        { field: "region", operator: "equals", value: "Tokyo" },
      ],
    },
  ],
});

grid.clearAdvancedFilter();
```

Leaf node operators by `filterType`:

| filterType | operators |
|---|---|
| `text` (default) | `contains`, `notContains`, `startsWith`, `endsWith`, `equals`, `notEquals` |
| `number` | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `between` |
| `date` | `equals`, `notEquals`, `before`, `after`, `between` |
| `select` | `equals` (matches single or array of values) |

### 32. Pivot Mode

```js
grid.enablePivot({
  rowFields: ["region"],    // fields to use as row groups
  columnField: "team",      // field whose unique values become columns
  valueField: "score",      // numeric field to aggregate
  aggFunction: "avg",       // "sum" | "avg" | "count" | "min" | "max"
});

grid.disablePivot();
```

Disable pivot and restore the original columns:

```js
grid.disablePivot();
grid.setColumns(originalColumns);
```

### 33. Row Pinning

Pin rows to the top or bottom of the grid — they stay visible while the body scrolls.

```js
const firstRow = grid.getRows()[0];
grid.setPinnedTopRows([{ ...firstRow, name: "📌 " + firstRow.name }]);

grid.setPinnedBottomRows([
  { id: "total", name: "Total", score: sumAll() },
]);

// clear
grid.setPinnedTopRows([]);
grid.setPinnedBottomRows([]);
```

### 34. Undo / Redo

Undo/redo tracks every cell edit automatically. Use keyboard shortcuts `Ctrl+Z` / `Ctrl+Y` (Windows) or `Cmd+Z` / `Cmd+Shift+Z` (Mac) when the grid is focused, or call the API directly.

```js
if (grid.canUndo()) {
  const action = grid.undo();
  // action: { rowKey, colId, oldValue, newValue }
}

if (grid.canRedo()) {
  const action = grid.redo();
}
```

Configure the history depth at creation time:

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  undoRedoMaxHistory: 200, // default: 100
});
```

### 35. Row Drag & Drop

Enable row dragging with `rowDragging: true`. A drag handle column is added automatically.

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  rowDragging: true,
  onRowDrop: ({ fromRowKey, toRowKey }) => {
    // reorder your data source here
  },
});
```

Listen to drag lifecycle events:

```js
grid.on("row-drag-start", ({ rowKey }) => console.log("drag start", rowKey));
grid.on("row-drag-end",   ({ rowKey }) => console.log("drag end",   rowKey));
```

### 36. Range Selection

Click and drag across cells to highlight a rectangular range. The selection highlights automatically. To read or clear the selection programmatically:

```js
grid.clearRangeSelection();
```

Listen to range changes:

```js
grid.on("range-selection-change", ({ start, end }) => {
  console.log("range", start, "→", end);
});
```

### 37. Conditional Formatting

Add a `conditionalFormat` function to any column definition to apply per-cell styles or CSS classes.

```js
{
  id: "score",
  field: "score",
  headerName: "Score",
  conditionalFormat: (value, row) => {
    if (value >= 8000) return { style: { color: "#16a34a", fontWeight: "bold" } };
    if (value <= 2000) return { style: { color: "#dc2626" } };
    return null;
  },
}
```

The returned object may contain:

- `style` — `object` — inline styles applied to the cell element
- `class` — `string | string[]` — CSS class names added to the cell element

Apply or remove conditional formatting at runtime with `grid.setColumns(...)`:

```js
const updated = grid.getAllLeafColumns().map((c) => ({
  ...c.def,
  conditionalFormat: c.def.id === "score" ? myFormatFn : null,
}));
grid.setColumns(updated);
```

### 38. Sparkline Plugin (Inline Charts)

The sparkline plugin renders a small SVG chart directly inside a cell. It is ideal when you want to compare trends across many rows at a glance.

```js
import { createGrid, createSparklinePlugin } from "highgrid";

const grid = createGrid(container, {
  columns: [
    { id: "id",    field: "id",    headerName: "ID" },
    { id: "name",  field: "name",  headerName: "Name" },
    // sparkline columns — field must point to a number[]
    {
      id: "trend",
      field: "history",
      headerName: "Weekly Score · Line",
      width: 140,
      sparkline: { type: "line", field: "history", color: "#0f4c81" },
    },
    {
      id: "trendBar",
      field: "history",
      headerName: "Weekly Score · Bar",
      width: 140,
      sparkline: { type: "bar", field: "history", color: "#7c3aed" },
    },
  ],
  rows,
  plugins: [
    { plugin: createSparklinePlugin() },
  ],
});
```

`sparkline` options per column:

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `"line" \| "bar" \| "area"` | `"line"` | Chart shape |
| `field` | `string` | column `field` | Row property containing the `number[]` data |
| `color` | `string` | `"#0f4c81"` | Stroke / fill colour |
| `width` | `number` | column width − 20 | SVG width in px |
| `height` | `number` | `28` | SVG height in px |
| `align` | `"center" \| "left" \| "right"` | `"center"` | Horizontal alignment inside the cell |

### 39. XLSX Export Plugin

The XLSX export plugin adds a `downloadXlsx` method to the grid. It uses [ExcelJS](https://github.com/exceljs/exceljs) — loaded from npm if available, otherwise falling back to a CDN.

```js
import { createGrid, createXlsxExportPlugin } from "highgrid";

const grid = createGrid(container, {
  columns,
  rows,
  plugins: [
    { plugin: createXlsxExportPlugin({ fileName: "export.xlsx" }) },
  ],
});

// trigger download
grid.downloadXlsx({ fileName: "my-data.xlsx" });
// or with scope
grid.downloadXlsx({ scope: "displayed", fileName: "filtered.xlsx" });
```

If ExcelJS is not available, the plugin silently falls back to `downloadExcel` (HTML table format).

### 40. Status Bar

The status bar sits below the grid body and shows row count, filtered count, selected count, and column aggregates.

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns: [
    { id: "score", field: "score", headerName: "Score", aggregate: "avg" },
  ],
  rows,
  statusBar: { enabled: true },
});
```

The bar updates automatically on every render. Locale keys for the status bar text:

```js
const locale = {
  grid: {
    statusBar: {
      totalRows:    "{count} rows",
      filteredRows: "{display} of {total} rows",
      selectedRows: "{count} selected",
    },
  },
};
```

### 41. Master-Detail (Expandable Rows)

Provide a `detailRenderer` to add expandable detail panels below each row.

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  masterDetail: {
    detailRowHeight: 160,
    detailRenderer: (row) => {
      const div = document.createElement("div");
      div.style.padding = "16px";
      div.innerHTML = `<strong>${row.name}</strong><p>${row.notes}</p>`;
      return div;
    },
  },
});

// toggle programmatically
grid.toggleDetail(rowKey);
```

### 42. Print

```js
grid.printGrid();
```

`printGrid` calls `window.print()`. Style the printout with `@media print` CSS — HighGrid sets `display: none` on scrollbars and overlays automatically.

### 43. Multi-column Sorting (Shift+Click)

You can sort by multiple columns simultaneously. Hold `Shift` (or `Ctrl`/`Cmd`) and click on column headers to append them to the sorting criteria. Columns will show a sorting order priority number next to their directional arrows.

Or trigger it programmatically:
```js
grid.sortBy([
  { field: "team", direction: "asc" },
  { field: "score", direction: "desc", type: "number" }
]);
```

### 44. Column Header Dropdown Menu (Menu Button & Right-click)

Hovering over a column header reveals a menu icon button. Clicking this button or right-clicking anywhere on the header opens a context menu with options to sort, auto-size, or pin columns (Left, Right, or Unpin).

### 45. Column Auto-Sizing (autoSizeColumn / autoSizeAllColumns)

Automatically adjusts column widths based on cell content length using high-performance HTML5 Canvas measurement:

```js
// Auto-size a specific column
grid.autoSizeColumn("name");

// Auto-size all columns
grid.autoSizeAllColumns();
```

### 46. Inline Group Row Aggregations

When grouping rows, aggregate values (e.g. SUM, AVG) are evaluated and displayed inline directly within the group header row for columns configured with aggregations:

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns: [
    { id: "score", field: "score", headerName: "Score", aggregate: "sum" }
  ],
  rows
});

grid.enableGrouping(["team"]);
```

### 47. 2D Rectangular Range Copy/Paste

Select a rectangular area of cells by clicking and dragging. Copy (`Ctrl+C` / `Cmd+C`) and paste (`Ctrl+V` / `Cmd+V`) data inside the grid. The format is fully compatible with Excel and Google Sheets (tab-delimited text).

Programmatic clipboard methods:
```js
// Copy current range selection to tab-delimited text
const copiedText = grid.copySelectionToClipboard();

// Paste text into the grid starting from a specific cell
grid.pasteFromClipboard("Text1\tText2\nText3\tText4", {
  startRowKey: "row-1",
  columns: ["col-1", "col-2"]
});
```

### 48. Functional Cell Edit Locking

Customize whether specific cells are editable based on row-level conditions by providing a function to `editable` in column definitions:

```js
const columns = [
  {
    id: "name",
    field: "name",
    headerName: "Name",
    // Prevent editing if the row status is locked
    editable: ({ row, def }) => row.status !== "locked"
  }
];
```

### 49. Advanced Filter GUI Builder (Side Panel Filter Tab)

When the side panel is enabled, you can build complex filtering trees using multiple logical operators (`AND`/`OR`) and conditions in the GUI dialog under the Filters tab.

Programmatic configuration:
```js
grid.setAdvancedFilter({
  type: "AND",
  conditions: [
    { field: "team", operator: "equals", value: "Red" },
    { field: "score", operator: "greaterThan", value: 1000 }
  ]
});
```

### 50. Auto-numbering Row Column (Row number)

Display a sequential, auto-updating row number column. The numbers adjust automatically on sorting, filtering, and paging.

```js
const grid = createGrid(container, {
  rowNumbers: true,         // Enable row numbers column
  rowNumberWidth: 50,       // Optional custom width (default: 44)
  columns,
  rows
});
```

### 51. Cell Flash Animation (Live Update Highlights)

When data changes dynamically via live mutation APIs (`liveUpdateRows`, `livePatchRow`, etc.), modified cells flash with a green highlight to visually call out the updates:

```js
// Modified cells will flash automatically
grid.livePatchRow("row-1", { score: 9500 });
```

### 52. Column Inline Filter Row

Render a dedicated row of text input fields directly below column headers for quick per-column text filtering:

```js
const grid = createGrid(container, {
  filterRow: { enabled: true }, // Enable inline filter row
  columns,
  rows
});
```

### 53. Keyboard Navigation Completed

Robust keyboard support makes grid interaction fully accessible:
* `Tab` / `Shift+Tab`: Move focus to the next/previous cell. In edit mode, commits the edit and shifts focus.
* `Enter`: Focus cell and press Enter to edit. In edit mode, commits the value and shifts focus to the cell below.
* `F2`: Start editing the focused cell.
* `Escape`: Cancel editing/restore previous value, or clear range selection.
* `Arrow keys` / `Home` / `End`: Navigate focused cells. While editing, they natively move the text cursor within the input element.

### 54. Side Panel Drag & Drop Column Reordering

Reorder column visibility and sequence directly inside the settings panel. Drag and drop column list elements in the `Columns` tab of the side panel to reorder columns instantly in the viewport.

### 55. Fill Handle (Cell Autofill)

Drag the small square handle at the bottom-right of a focused cell to autofill values (duplicate or propagate) down or up adjacent cells:

```js
const grid = createGrid(container, {
  editing: { enabled: true },
  fillHandle: true, // Enable fill handle
  columns,
  rows
});
```

### 56. Rich HTML Tooltip (Custom Popups)

Render custom HTML content tooltips when hovering over cells to show complex metadata, descriptions, or inline micro-charts:

```js
const columns = [
  {
    id: "name",
    field: "name",
    tooltipComponent: ({ value, row, def }) => {
      const el = document.createElement("div");
      el.innerHTML = `<strong>${row.name}</strong><br/>Status: ${row.status}`;
      return el; // Returns custom Element or string
    }
  }
];
```

### 57. Multi-level Group Aggregations

HighGrid fully supports multi-level grouping (e.g. `['country', 'city', 'department']`). Column aggregations are automatically calculated, aggregated, and displayed in group header rows at every nested level.

### 58. Web Worker Background Data Pipeline

Offloads CPU-heavy sorting and filtering tasks to a background thread to prevent UI freezing (jank) with large datasets. It uses a self-contained inline Web Worker dynamically generated inside the bundle to avoid path resolution issues:

```js
const grid = createGrid(container, {
  worker: { enabled: true }, // Enable background worker thread
  columns,
  rows
});
```

### 59. Basic Formulas (=SUM, =AVG)

Write Excel-like formulas beginning with `=` to calculate values dynamically. Includes single-cell references, A1:B10 range definitions, circular reference detection (`#REF!`), and memoized query caching. When editing, the cell editor automatically loads the raw formula string instead of the calculated result.

```js
const rows = [
  { id: 1, a: 10, b: 20, c: "=SUM(A1:B1)" }, // Evaluates to 30
  { id: 2, a: 15, b: 25, c: "=AVG(A1:B2)" }  // Evaluates to 17.5
];
```

---
