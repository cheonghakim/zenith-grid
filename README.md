# HighGrid

HighGrid is a vanilla JavaScript data grid library.
It covers the pieces you usually need in a real table: virtual scrolling, paging, infinite loading, grouping, tree data, live updates, plugins, and custom cell rendering.

---

## Demo

[데모 사이트(Demo site) 바로가기](https://cheonghakim.github.io/high-grid/)

---

## 한국어

### 1. 소개

HighGrid는 바닐라 JavaScript 기반의 데이터 그리드 라이브러리입니다.
대용량 데이터 렌더링, 가상 스크롤, 페이징, 무한 스크롤, 그룹핑, 트리 데이터, 실시간 데이터 반영, 플러그인, 셀 렌더러 같은 기능을 하나의 API로 다룰 수 있도록 설계되었습니다.

### 2. 설치

```bash
npm install highgrid
```

스타일도 함께 로드해야 합니다.

```js
import { createGrid } from "highgrid";
import "highgrid/styles/grid.css";
```

### 3. 가장 빠른 시작 예제

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

팁:

- `createGrid('#app', options)`처럼 selector 문자열도 바로 받을 수 있습니다.
- 컨테이너에는 높이가 있어야 가상 스크롤이 제대로 동작합니다.
- `rowKey`는 중복되지 않는 값을 쓰는 편이 안전합니다.

### 4. 컬럼 정의

기본적으로 컬럼은 아래 속성을 자주 사용합니다.

- `id`: 컬럼 고유 ID
- `field`: row 객체에서 값을 읽을 필드명
- `headerName` 또는 `header`: 헤더 텍스트
- `width`: 기본 너비
- `align`: `left`, `center`, `right`
- `type`: `number`, `date` 등 정렬/비교 힌트
- `renderer`: 사용자 셀 렌더러
- `formatter`: 값 포맷팅 함수
- `pinned`: `left` 또는 `right`
- `minWidth`, `maxWidth`: 리사이즈 범위

예시:

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

### 5. 셀 렌더러 사용법

셀 렌더러는 `renderer({ value, row, def, state })` 형태로 호출됩니다.

반환값 규칙:

- `HTMLElement`를 반환하면 그대로 셀에 삽입됩니다.
- 문자열이나 숫자를 반환하면 텍스트로 렌더링됩니다.
- `null` 또는 `undefined`면 빈 값처럼 처리됩니다.

예시:

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

### 6. 주요 옵션

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

### 7. 상태 UI와 접근성 커스터마이즈

로딩, 빈 상태, 에러 상태를 각각 따로 렌더링할 수 있습니다.

```js
const grid = createGrid("#app", {
  rowKey: "id",
  columns,
  rows: [],
  renderLoadingState: () => "<div>불러오는 중...</div>",
  renderEmptyState: () => "<div>표시할 데이터가 없습니다.</div>",
  renderErrorState: ({ message }) => `<div>오류: ${message}</div>`,
});
```

HighGrid는 기본적으로 `role="grid"`와 셀/헤더 포커스 이동을 제공합니다. 키보드 사용자는 방향키로 헤더와 셀 사이를 이동할 수 있습니다.

### 8. 데이터 제어 API

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

### 9. 정렬 / 필터 / 선택

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

### 10. 그룹핑과 트리

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

### 11. 페이징과 무한 스크롤

클라이언트 모드:

```js
grid.setDisplayMode("paginated");
grid.setPageSize(50);
grid.nextPage();

grid.enableInfiniteScroll();
grid.loadMoreInfinite();
```

서버 모드:

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

### 12. 라이브 업데이트

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

### 13. 셀 편집, 검증, 클립보드

컬럼에 `editable`, `parser`, `validator`를 넣으면 기본 셀 편집을 사용할 수 있습니다.

```js
const columns = [
  { id: "name", field: "name", headerName: "이름", editable: true },
  {
    id: "score",
    field: "score",
    headerName: "점수",
    type: "number",
    editable: true,
    validator: ({ value }) =>
      Number(value) >= 0 || "점수는 0 이상이어야 합니다.",
  },
];

grid.beginCellEdit(1, "name");
grid.setCellValue(1, "score", 120);
grid.validateRows();

const errors = grid.getValidationErrors();
```

선택된 행을 스프레드시트에 붙여넣기 좋은 TSV로 복사하거나, TSV 텍스트를 기존 행에 붙여넣을 수 있습니다.

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

### 14. 이벤트

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

### 15. CSV/Excel 내보내기와 컨텍스트 메뉴

현재 보이는 데이터, 전체 데이터, 선택된 행만 CSV 또는 Excel 호환 HTML로 내보낼 수 있습니다.

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

행/셀 우클릭 이벤트도 바로 받을 수 있습니다.

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

### 16. 플러그인

내장 플러그인은 `uppercaseTeamPlugin`, `scorePrefixPlugin`가 있습니다.

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

커스텀 플러그인은 hook 기반 객체로 만들 수 있습니다.

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

### 17. 컬럼 상태 저장

`tableId`를 주면 컬럼 너비/가시성/핀 상태를 저장하고 다시 불러올 수 있습니다.

```js
await grid.saveColumnState();
await grid.loadColumnState();
await grid.clearColumnState();
```

### 18. 컬럼 런타임 제어

```js
grid.setColumnVisible("score", false);
grid.setColumnWidth("score", 160);
grid.setColumnPinned("name", "left");
grid.moveColumn("score", 2);

const allCols = grid.getAllLeafColumns();
const visibleCols = grid.getVisibleLeafColumns();
```

### 19. 가변 행 높이

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  variableRowHeight: true,
  getRowHeight: (row) => {
    if (row.type === "detail") return 80;
    return 40;
  },
});
```

### 20. 헤더 그룹 (컬럼 묶기)

```js
const columns = [
  { id: "name", field: "name", headerName: "이름", width: 160 },
  {
    id: "location-group",
    headerName: "위치",
    children: [
      { id: "region", field: "region", headerName: "지역", width: 120 },
      { id: "country", field: "country", headerName: "국가", width: 100 },
    ],
  },
];
```

### 21. Vue 3 어댑터

```bash
npm install highgrid
```

컴포넌트 방식:

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

Composable 방식:

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

### 22. 테마 커스터마이징

`tokens.css`를 가져오면 CSS 변수 하나로 전체 스타일을 제어할 수 있습니다.

```js
import "highgrid/styles/tokens.css";
import "highgrid/styles/grid.css";
```

```css
/* 특정 그리드만 테마 변경 */
#my-grid {
  --ag-accent: #7c3aed;
  --ag-row-height: 48px;
  --ag-font-size: 15px;
}
```

내장 테마 프리셋:

```html
<!-- 다크 모드 -->
<div class="ag-theme-dark">
  <div id="my-grid"></div>
</div>

<!-- 컴팩트 (32px 행) -->
<div class="ag-theme-compact">
  <div id="my-grid"></div>
</div>

<!-- 스패이셔스 (52px 행) -->
<div class="ag-theme-spacious">
  <div id="my-grid"></div>
</div>
```

### 23. TypeScript

`index.d.ts`가 포함되어 있어 별도 설치 없이 타입 추론이 됩니다.

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

### 24. 상태 조회 API

```js
grid.getFilterState(); // 현재 필터 상태
grid.getGroupingState(); // 그룹핑 상태
grid.getTreeState(); // 트리 상태
grid.getColumnState(); // 컬럼 너비/핀/순서 상태
grid.getSelectionState(); // 선택 상태
grid.getPaginationState(); // 페이징 상태
grid.getRows(); // 전체 원본 행
grid.getFlatRows(); // 평탄화된 표시 행 (그룹/트리 포함)
```

### 25. 예제 실행

```bash
npm install
npm run dev
```

예제 페이지에서는 HighGrid 데모를 열 수 있고, 우측 컨트롤 패널에서 모드 전환, 라이브 데이터, 컬럼 상태, 벤치마크를 확인할 수 있습니다.

### 26. GitHub Pages 배포

GitHub Pages에는 라이브러리 번들(`src/index.js` entry)이 아니라 데모 페이지(`examples/index.html`)를 빌드한 결과물을 올려야 합니다.

```bash
npm run build:demo
```

이 명령은 `dist-pages/index.html`을 만들고, `.github/workflows/pages.yml`은 이 폴더를 Pages 아티팩트로 배포합니다. repository Pages라면 custom domain이 없어도 `https://<user>.github.io/<repo>/`에서 동작합니다.

custom domain은 선택 사항입니다. 도메인을 쓰려면 GitHub Pages 설정에서 domain을 등록하고 DNS를 연결하면 됩니다. 단, custom domain은 `index.html` 위치 문제를 해결하지 않으므로 데모 빌드는 그대로 필요합니다.

### 27. 배포 전 확인 사항

- `npm test`
- `npm run build`
- `npm run build:demo`
- 실제 데이터셋으로 스크롤, 정렬, 필터, 라이브 업데이트 수동 점검
- 서버 모드 사용 시 `fetchPage`, `onLoadMore`, `onLoadChildren` 응답 구조 확인

---

## English

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
