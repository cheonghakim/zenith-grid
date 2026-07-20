# ZenithGrid

ZenithGrid는 바닐라 JavaScript 기반의 데이터 그리드 라이브러리입니다.
대용량 데이터 렌더링, 가상 스크롤, 페이징, 무한 스크롤, 그룹핑, 트리 데이터, 실시간 데이터 반영, 플러그인, 셀 렌더러 같은 기능을 하나의 API로 다룰 수 있도록 설계되었습니다.

다른 언어 문서: [English Document](./README.md)

---

## Demo

📖 [예제 모음](https://cheonghakim.github.io/zenith-grid/) — 기능별 라이브 코드 예제

---


### 목차 (Table of Contents)

그리드의 수많은 기능을 체계적으로 탐색할 수 있도록 카테고리별로 구성된 가이드 목록입니다. 각 항목을 클릭하면 해당 설명으로 바로 이동합니다.

#### 1. 시작하기 & 기본 설정 (Get Started)
* [1. 소개](#1-소개)
* [2. 설치](#2-설치)
* [3. 가장 빠른 시작 예제](#3-가장-빠른-시작-예제)
* [4. 컬럼 정의](#4-컬럼-정의)
* [5. 셀 렌더러 사용법](#5-셀-렌더러-사용법)
* [6. 주요 옵션](#6-주요-옵션)
* [7. 상태 UI와 접근성 커스터마이즈](#7-상태-ui와-접근성-커스터마이즈)
* [20. 헤더 그룹 (컬럼 묶기)](#20-헤더-그룹-컬럼-묶기)
* [23. TypeScript 지원](#23-typescript)
* [27. 배포 전 확인 사항](#27-배포-전-확인-사항)
* [50. Row number 자동 번호 컬럼](#50-row-number-자동-번호-컬럼)
* [52. 컬럼별 인라인 필터 행](#52-컬럼별-인라인-필터-행-헤더-아래-입력-필드)

#### 2. 데이터 제어 및 라이브 업데이트 (Data & Live Updates)
* [8. 데이터 제어 API](#8-데이터-제어-api)
* [12. 라이브 업데이트](#12-라이브-업데이트)
* [18. 컬럼 런타임 제어](#18-컬럼-런타임-제어)
* [24. 상태 조회 API](#24-상태-조회-api)
* [30. 컬럼 집계 (상태 바)](#30-컬럼-집계-상태-바)
* [33. 행 고정](#33-행-고정)
* [40. 상태 바](#40-상태-바)
* [51. 셀 단위 flash 애니메이션](#51-셀-단위-flash-애니메이션-라이브-업데이트-변경-셀-하이라이트)

#### 3. 조회, 정렬, 필터 및 그룹핑 (Search & Grouping)
* [9. 정렬 / 필터 / 선택](#9-정렬--필터--선택)
* [10. 그룹핑과 트리](#10-그룹핑과-트리)
* [11. 페이징과 무한 스크롤](#11-페이징과-무한-스크롤)
* [31. 고급 필터 (AND/OR 트리)](#31-고급-필터-andor-트리)
* [32. 피벗 모드](#32-피벗-모드)
* [41. 마스터-디테일 (행 확장)](#41-마스터-디테일-행-확장)
* [43. 다중 컬럼 정렬 (Shift+클릭)](#43-다중-컬럼-정렬-shift클릭)
* [49. 고급 필터 GUI 빌더](#49-고급-필터-gui-빌더-사이드-패널-필터-탭)
* [57. 다중 레벨 그룹 집계](#57-다중-레벨-그룹-집계-중첩-그룹별-집계)
* [58. Web Worker 파이프라인 실제 연결](#58-web-worker-파이프라인-실제-연결-대용량-정렬필터)

#### 4. 편집, 클립보드 및 액션 (Editing & Clipboard)
* [13. 셀 편집, 검증, 클립보드](#13-셀-편집-검증-클립보드)
* [29. 커스텀 셀 편집기](#29-커스텀-셀-편집기)
* [34. 실행 취소 / 다시 실행](#34-실행-취소--다시-실행)
* [35. 행 드래그 앤 드롭](#35-행-드래그 앤 드롭)
* [36. 범위 선택](#36-범위-선택)
* [47. 클립보드 2D 사각형 범위 복사/붙여넣기](#47-클립보드-2d-사각형-범위-복사붙여넣기)
* [48. editable 함수형 지원](#48-editable-함수형-지원-행별-편집-잠금)
* [53. 키보드 탐색 완성도](#53-키보드-탐색-완성도)
* [55. 채우기 핸들](#55-채우기-핸들-셀-우하단-드래그-자동-채우기)
* [59. 기본 수식 지원 (=SUM, =AVG)](#59-기본-수식-지원-sum-avg-셀값-평가)

#### 5. 스타일, 플러그인 및 도구 (Theming & Extensions)
* [14. 이벤트](#14-이벤트)
* [15. CSV/Excel 내보내기와 컨텍스트 메뉴](#15-csvexcel-내보내기와-컨텍스트-메뉴)
* [16. 플러그인](#16-플러그인)
* [17. 컬럼 상태 저장](#17-컬럼-상태-저장)
* [19. 가변 행 높이](#19-가변-행-높이)
* [22. 테마 커스터마이징](#22-테마-커스터마이징)
* [37. 조건부 서식](#37-조건부-서식)
* [38. 스파크라인 플러그인](#38-스파크라인-플러그인-셀-내-미니-차트)
* [39. XLSX 내보내기 플러그인](#39-xlsx-내보내기-플러그인)
* [42. 인쇄](#42-인쇄)
* [54. 사이드 패널 컬럼 목록 드래그 순서 변경](#54-사이드-패널-컬럼-목록-드래그로-순서-변경)
* [56. 리치 툴팁 (HTML 팝업)](#56-리치-툴팁-커스텀-html-팝업)

#### 6. 프레임워크 지원 (Framework Integration)
* [21. Vue 3 어댑터](#21-vue-3-어댑터)
* [28. React 어댑터](#28-react-어댑터)

#### 7. 개발 및 실행 (Development)
* [25. 예제 실행](#25-예제-실행)
* [26. GitHub Pages 배포](#26-github-pages-배포)

---

### 1. 소개

ZenithGrid는 바닐라 JavaScript 기반의 데이터 그리드 라이브러리입니다.
대용량 데이터 렌더링, 가상 스크롤, 페이징, 무한 스크롤, 그룹핑, 트리 데이터, 실시간 데이터 반영, 플러그인, 셀 렌더러 같은 기능을 하나의 API로 다룰 수 있도록 설계되었습니다.

**CSS 격리:** ZenithGrid는 모든 내부 CSS 클래스에 `ck-zenith-grid-` 프리픽스를, CSS 커스텀 프로퍼티에 `--ck-zenith-grid-` 프리픽스를 사용합니다. AG-Grid 등 다른 그리드 라이브러리와 같은 페이지에서 사용해도 CSS 충돌이 발생하지 않습니다.

### 2. 설치

```bash
npm install zenith-grid
```

스타일도 함께 로드해야 합니다.

```js
import { createGrid } from "zenith-grid";
import "zenith-grid/styles/grid.css";
```

### 3. 가장 빠른 시작 예제

```html
<div id="app" style="height: 600px;"></div>
```

```js
import { createGrid } from "zenith-grid";
import "zenith-grid/styles/grid.css";

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
- `width`: 고정 너비 (픽셀 단위)
- `flex`: 비율 기반 너비 (`width` 대신 사용)
- `align`: `left`, `center`, `right`
- `type`: `number`, `date` 등 정렬/비교 힌트
- `renderer`: 사용자 셀 렌더러
- `formatter`: 값 포맷팅 함수
- `pinned`: `left` 또는 `right`
- `minWidth`, `maxWidth`: 리사이즈 범위 (`width`와 `flex` 모두에 적용)

#### Flex 컬럼 (비율 기반 너비)

`width` 대신 `flex`를 사용하면 사용 가능한 공간에 맞춰 비율로 너비가 자동 조절됩니다:

```js
const columns = [
  { id: "id", field: "id", headerName: "ID", width: 80 },        // 고정 80px
  { id: "name", field: "name", headerName: "이름", flex: 2 },    // 2배 비율
  { id: "email", field: "email", headerName: "이메일", flex: 1 }, // 1배 비율
  { id: "actions", headerName: "작업", width: 120 },             // 고정 120px
];

// 그리드 너비가 1000px일 때:
// - 고정 컬럼: 80 + 120 = 200px
// - 남은 공간: 800px
// - name 컬럼: 800 × (2/3) ≈ 533px
// - email 컬럼: 800 × (1/3) ≈ 267px
```

**Flex와 제약 조건:**

```js
{
  id: "description",
  field: "description",
  headerName: "설명",
  flex: 1,
  minWidth: 200,  // 최소 200px 이하로 줄어들지 않음
  maxWidth: 600,  // 최대 600px 이상으로 늘어나지 않음
}
```

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

ZenithGrid는 기본적으로 `role="grid"`와 셀/헤더 포커스 이동을 제공합니다. 키보드 사용자는 방향키로 헤더와 셀 사이를 이동할 수 있습니다.

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
} from "zenith-grid";

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
npm install zenith-grid
```

**컴포넌트 방식:**

```vue
<template>
  <ZenithGrid
    :columns="columns"
    :rows="rows"
    row-key="id"
    @row-click="onRowClick"
    @selection-change="onSelectionChange"
  />
</template>

<script setup>
import { ZenithGrid } from "zenith-grid/vue";
import "zenith-grid/styles/grid.css";
</script>
```

**Composable 방식:**

```vue
<template>
  <div ref="containerRef" style="height: 600px;" />
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useZenithGrid } from "zenith-grid/vue";
import "zenith-grid/styles/grid.css";

const containerRef = ref(null);
const { grid, state, init, setRows } = useZenithGrid(containerRef, {
  columns,
  rows,
});

onMounted(() => init());
</script>
```

**Vue 2 지원:**

ZenithGrid는 Vue 2.7+ 버전도 지원합니다. `zenith-grid/vue2`에서 import하세요:

```vue
<template>
  <ZenithGrid :columns="columns" :rows="rows" row-key="id" />
</template>

<script>
import { ZenithGrid } from "zenith-grid/vue2";
import "zenith-grid/styles/grid.css";

export default {
  components: { ZenithGrid },
  data() {
    return {
      columns: [
        { id: "name", field: "name", headerName: "이름", width: 180 },
        { id: "score", field: "score", headerName: "점수", width: 120 },
      ],
      rows: [
        { id: 1, name: "Alice", score: 1200 },
        { id: 2, name: "Bob", score: 980 },
      ],
    };
  },
};
</script>
```

**Vue CLI / Webpack 사용자 주의:** `Cannot find module 'zenith-grid/styles/grid.css'` 에러가 발생하면 직접 경로를 사용하세요:

```js
import "zenith-grid/src/styles/grid.css";
```

Vue 2 어댑터는 Options API를 사용하며 Vue 3와 동일한 컴포넌트 API(props, events, methods)를 제공합니다.

### 22. 테마 커스터마이징

`tokens.css`를 가져오면 CSS 변수 하나로 전체 스타일을 제어할 수 있습니다.

```js
import "zenith-grid/styles/tokens.css";
import "zenith-grid/styles/grid.css";
```

토큰 오버라이드는 `.ck-zenith-grid-root`를 직접 타겟해야 합니다. 색상 토큰은 `.ck-zenith-grid-root` 자체에 선언되어 있어 부모 셀렉터만으로는 가려집니다:

```css
/* ✅ 모든 토큰에서 작동 */
#my-grid .ck-zenith-grid-root {
  --ck-zenith-grid-accent: #7c3aed;
  --ck-zenith-grid-row-height: 48px;
  --ck-zenith-grid-font-size: 15px;
}

/* ❌ 색상 토큰은 .ck-zenith-grid-root 선언에 가려짐 (v2.x) */
#my-grid {
  --ck-zenith-grid-accent: #7c3aed;
}
```

내장 테마 프리셋:

```html
<!-- 다크 모드 -->
<div class="ck-zenith-grid-theme-dark">
  <div id="my-grid"></div>
</div>

<!-- 컴팩트 (32px 행) -->
<div class="ck-zenith-grid-theme-compact">
  <div id="my-grid"></div>
</div>

<!-- 스패이셔스 (52px 행) -->
<div class="ck-zenith-grid-theme-spacious">
  <div id="my-grid"></div>
</div>
```

### 23. TypeScript

`index.d.ts`가 포함되어 있어 별도 설치 없이 타입 추론이 됩니다.

```ts
import { createGrid, GridOptions, ColumnDef } from "zenith-grid";

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

예제 페이지에서는 ZenithGrid 데모를 열 수 있고, 우측 컨트롤 패널에서 모드 전환, 라이브 데이터, 컬럼 상태, 벤치마크를 확인할 수 있습니다.

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


### 28. React 어댑터

```bash
npm install zenith-grid
```

**Hook 방식:**

```jsx
import { useZenithGrid } from "zenith-grid/react";
import "zenith-grid/styles/grid.css";

function MyGrid() {
  const { containerRef, grid, state } = useZenithGrid({
    rowKey: "id",
    columns,
    rows,
    rowHeight: 40,
  });

  return <div ref={containerRef} style={{ height: 600 }} />;
}
```

`useZenithGrid` 반환값:

| 프로퍼티 | 타입 | 설명 |
|---|---|---|
| `containerRef` | `RefObject` | 컨테이너 `<div>`에 연결 |
| `grid` | `GridCore \| null` | 마운트 후 사용 가능한 raw 인스턴스 |
| `getGrid()` | `() => GridCore \| null` | 안정적인 ref 접근자 |
| `isReady` | `boolean` | 그리드 마운트 완료 후 `true` |
| `state` | `object` | 선택 상태 + 렌더 요약 (반응형) |

`state` 구조:

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

훅은 `setRows`, `appendRows`, `updateRows`, `patchRow`, `removeRows`, `setColumns`, `setQuickFilter`, `clearFilters`, `sortBy`, `nextPage`, `prevPage`, `usePlugin`, `liveAddRows`, `on` 등의 편의 메서드도 제공합니다. 목록에 없는 메서드는 `getGrid()`로 GridCore 인스턴스에 직접 접근하세요.

### 29. 커스텀 셀 편집기

```js
import {
  createDateEditor,
  createSelectEditor,
  createTextareaEditor,
} from "zenith-grid";
```

**DateEditor** — `<input type="date">`:

```js
{
  id: "deadline",
  field: "deadline",
  headerName: "마감일",
  editable: true,
  editor: createDateEditor,
  editorOptions: { min: "2024-01-01", max: "2030-12-31" },
}
```

**SelectEditor** — `<select>` 드롭다운:

```js
{
  id: "status",
  field: "status",
  headerName: "상태",
  editable: true,
  editor: createSelectEditor,
  options: ["Active", "Paused", "Review"],
  // label/value 객체도 가능:
  // options: [{ value: "A", label: "활성" }, { value: "P", label: "일시정지" }]
  // 또는 함수: options: ({ row }) => getOptionsForRow(row)
}
```

**TextareaEditor** — 장문 텍스트용 `<textarea>`:

```js
{
  id: "notes",
  field: "notes",
  headerName: "메모",
  editable: true,
  editor: createTextareaEditor,
  editorOptions: { rows: 4, placeholder: "메모를 입력하세요..." },
}
```

커스텀 편집기 팩토리 — `editor`는 `({ row, def, value }) => HTMLElement` 형태의 함수도 받습니다:

```js
{
  id: "score",
  field: "score",
  editable: true,
  editor: ({ value }) => {
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value ?? "");
    input.className = "ck-zenith-grid-cell-editor";
    return input;
  },
}
```

### 30. 컬럼 집계 (상태 바)

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns: [
    { id: "score",   field: "score",   headerName: "점수",  type: "number", aggregate: "avg" },
    { id: "revenue", field: "revenue", headerName: "매출",  type: "number", aggregate: "sum" },
  ],
  rows,
  statusBar: { enabled: true },
});
```

기본 `aggregate` 값: `"sum"`, `"avg"`, `"count"`, `"min"`, `"max"`.

커스텀 집계 함수:

```js
{ id: "score", field: "score", aggregate: (values) => values.reduce((a, b) => a + b, 0) / values.length }
```

런타임 제어:

```js
grid.setColumnAgg("score", "max");
grid.clearAggregates();
```

### 31. 고급 필터 (AND/OR 트리)

`setAdvancedFilter`는 **branch** 노드(`AND`/`OR`)와 **leaf** 노드로 이루어진 조건 트리를 받습니다.

```js
grid.setAdvancedFilter({
  type: "AND",
  conditions: [
    { field: "status", operator: "equals",     value: "Active", filterType: "select" },
    { field: "score",  operator: "greaterThan", value: 5000,    filterType: "number" },
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

`filterType`별 사용 가능한 `operator`:

| filterType | operators |
|---|---|
| `text` (기본값) | `contains`, `notContains`, `startsWith`, `endsWith`, `equals`, `notEquals` |
| `number` | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `between` |
| `date` | `equals`, `notEquals`, `before`, `after`, `between` |
| `select` | `equals` (단일 값 또는 배열 일치) |

### 32. 피벗 모드

```js
grid.enablePivot({
  rowFields:   ["region"],  // 행 그룹 기준 필드
  columnField: "team",      // 고유값이 컬럼으로 전환될 필드
  valueField:  "score",     // 집계할 숫자 필드
  aggFunction: "avg",       // "sum" | "avg" | "count" | "min" | "max"
});

grid.disablePivot();
```

피벗 해제 후 원본 컬럼 복원:

```js
grid.disablePivot();
grid.setColumns(originalColumns);
```

### 33. 행 고정

상단 또는 하단에 행을 고정하면 본문이 스크롤되어도 항상 표시됩니다.

```js
const firstRow = grid.getRows()[0];
grid.setPinnedTopRows([{ ...firstRow, name: "📌 " + firstRow.name }]);

grid.setPinnedBottomRows([
  { id: "total", name: "합계", score: sumAll() },
]);

// 해제
grid.setPinnedTopRows([]);
grid.setPinnedBottomRows([]);
```

### 34. 실행 취소 / 다시 실행

셀 편집은 자동으로 히스토리에 쌓입니다. 그리드에 포커스된 상태에서 `Ctrl+Z` / `Ctrl+Y` (Windows) 또는 `Cmd+Z` / `Cmd+Shift+Z` (Mac)로 사용하거나 API를 직접 호출합니다.

```js
if (grid.canUndo()) {
  const action = grid.undo();
  // action: { rowKey, colId, oldValue, newValue }
}

if (grid.canRedo()) {
  const action = grid.redo();
}
```

히스토리 깊이 설정:

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  undoRedoMaxHistory: 200, // 기본값: 100
});
```

### 35. 행 드래그 앤 드롭

`rowDragging: true`를 설정하면 드래그 핸들 컬럼이 자동으로 추가됩니다.

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns,
  rows,
  rowDragging: true,
  onRowDrop: ({ fromRowKey, toRowKey }) => {
    // 여기서 데이터 소스 순서를 변경하세요
  },
});
```

드래그 이벤트:

```js
grid.on("row-drag-start", ({ rowKey }) => console.log("드래그 시작", rowKey));
grid.on("row-drag-end",   ({ rowKey }) => console.log("드래그 종료", rowKey));
```

### 36. 범위 선택

셀을 클릭·드래그하면 직사각형 범위가 하이라이트됩니다.

```js
// 범위 초기화
grid.clearRangeSelection();

// 범위 변경 이벤트
grid.on("range-selection-change", ({ start, end }) => {
  console.log("범위:", start, "→", end);
});
```

### 37. 조건부 서식

컬럼 정의에 `conditionalFormat` 함수를 추가하면 셀마다 스타일이나 CSS 클래스를 동적으로 적용할 수 있습니다.

```js
{
  id: "score",
  field: "score",
  headerName: "점수",
  conditionalFormat: (value, row) => {
    if (value >= 8000) return { style: { color: "#16a34a", fontWeight: "bold" } };
    if (value <= 2000) return { style: { color: "#dc2626" } };
    return null;
  },
}
```

반환 객체:

- `style` — `object` — 셀 요소에 적용할 인라인 스타일
- `class` — `string | string[]` — 셀 요소에 추가할 CSS 클래스

런타임에 켜고 끄기:

```js
const updated = grid.getAllLeafColumns().map((c) => ({
  ...c.def,
  conditionalFormat: c.def.id === "score" ? myFormatFn : null,
}));
grid.setColumns(updated);
```

### 38. 스파크라인 플러그인 (셀 내 미니 차트)

스파크라인 플러그인은 셀 안에 SVG 미니 차트를 렌더링합니다. 여러 행의 추세를 한눈에 비교할 때 유용합니다.

```js
import { createGrid, createSparklinePlugin } from "zenith-grid";

const grid = createGrid(container, {
  columns: [
    { id: "id",   field: "id",   headerName: "ID" },
    { id: "name", field: "name", headerName: "이름" },
    // field는 반드시 number[] 값을 가리켜야 합니다
    {
      id: "trend",
      field: "history",
      headerName: "주간 점수 · 라인",
      width: 140,
      sparkline: { type: "line", field: "history", color: "#0f4c81" },
    },
    {
      id: "trendBar",
      field: "history",
      headerName: "주간 점수 · 바",
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

`sparkline` 컬럼 옵션:

| 옵션 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `type` | `"line" \| "bar" \| "area"` | `"line"` | 차트 유형 |
| `field` | `string` | 컬럼 `field` | `number[]` 데이터를 담은 행 프로퍼티 |
| `color` | `string` | `"#0f4c81"` | 선/채우기 색상 |
| `width` | `number` | 컬럼 너비 − 20 | SVG 너비(px) |
| `height` | `number` | `28` | SVG 높이(px) |
| `align` | `"center" \| "left" \| "right"` | `"center"` | 셀 내 가로 정렬 |

### 39. XLSX 내보내기 플러그인

플러그인을 등록하면 `downloadXlsx` 메서드가 그리드에 추가됩니다. 내부적으로 [ExcelJS](https://github.com/exceljs/exceljs)를 사용하며, npm 패키지가 없으면 CDN으로 자동 폴백합니다.

```js
import { createGrid, createXlsxExportPlugin } from "zenith-grid";

const grid = createGrid(container, {
  columns,
  rows,
  plugins: [
    { plugin: createXlsxExportPlugin({ fileName: "export.xlsx" }) },
  ],
});

grid.downloadXlsx({ fileName: "my-data.xlsx" });
// 현재 필터된 데이터만 내보내기
grid.downloadXlsx({ scope: "displayed", fileName: "filtered.xlsx" });
```

ExcelJS가 없으면 `downloadExcel`(HTML 테이블 형식)로 조용히 대체됩니다.

### 40. 상태 바

상태 바는 그리드 하단에 위치하며 행 수, 필터된 행 수, 선택 수, 컬럼 집계값을 표시합니다.

```js
const grid = createGrid(container, {
  rowKey: "id",
  columns: [
    { id: "score", field: "score", headerName: "점수", aggregate: "avg" },
  ],
  rows,
  statusBar: { enabled: true },
});
```

상태 바는 렌더링마다 자동으로 갱신됩니다. 로케일 키:

```js
const locale = {
  grid: {
    statusBar: {
      totalRows:    "{count}개 행",
      filteredRows: "전체 {total}개 중 {display}개",
      selectedRows: "{count}개 선택됨",
    },
  },
};
```

### 41. 마스터-디테일 (행 확장)

`detailRenderer`를 제공하면 각 행 아래에 확장 가능한 디테일 패널을 추가할 수 있습니다.

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

// 프로그래밍으로 토글
grid.toggleDetail(rowKey);
```

### 42. 인쇄

```js
grid.printGrid();
```

`printGrid`는 `window.print()`를 호출합니다. `@media print` CSS로 출력 레이아웃을 커스터마이즈할 수 있으며, ZenithGrid는 스크롤바와 오버레이를 자동으로 숨깁니다.

### 43. 다중 컬럼 정렬 (Shift+클릭)

복수의 컬럼 기준으로 데이터를 동시에 정렬할 수 있습니다. `Shift` (또는 `Ctrl`/`Cmd`) 키를 누른 채 헤더를 클릭하면 정렬 기준 목록에 추가되며, 정렬 방향 화살표 옆에 정렬 순서 우선순위 번호가 표시됩니다.

API로도 호출 가능합니다:
```js
grid.sortBy([
  { field: "team", direction: "asc" },
  { field: "score", direction: "desc", type: "number" }
]);
```

### 44. 컬럼 헤더 드롭다운 메뉴 (메뉴 버튼 및 우클릭)

컬럼 헤더에 마우스를 호버하면 메뉴 아이콘 버튼이 표시됩니다. 이 버튼을 클릭하거나 헤더 영역을 마우스 우클릭하면 드롭다운 컨텍스트 메뉴가 열리며, 정렬, 자동 너비 맞춤, 컬럼 고정(좌측 고정, 우측 고정, 고정 해제)을 제어할 수 있습니다.

### 45. 컬럼 자동 너비 (autoSizeColumn / autoSizeAllColumns)

셀 내용물의 길이를 HTML5 Canvas API의 텍스트 측정 기능을 활용하여 정밀하게 측정하고 컬럼 너비를 알맞게 조정합니다:

```js
// 특정 컬럼 자동 너비 맞춤
grid.autoSizeColumn("name");

// 전체 컬럼 자동 너비 맞춤
grid.autoSizeAllColumns();
```

### 46. 그룹 행 인라인 집계값 표시

데이터를 그룹화(`enableGrouping`)하면 생성되는 그룹 헤더 행에 해당 그룹 하위 데이터들의 집계값(SUM, AVG 등)이 인라인으로 즉시 렌더링됩니다.

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

### 47. 클립보드 2D 사각형 범위 복사/붙여넣기

셀 영역을 클릭 드래그하여 선택한 사각형 범위(Range Selection) 내 데이터를 엑셀(Excel)이나 구글 스프레드시트와 완벽히 호환되는 탭 구분자(`\t`) 문자열 형식으로 복사(`Ctrl+C`)하고 붙여넣기(`Ctrl+V`) 할 수 있습니다.

클립보드 API 메소드:
```js
// 선택된 범위의 데이터를 탭 구분자 텍스트로 복사
const copiedText = grid.copySelectionToClipboard();

// 특정 셀을 기준으로 탭 구분자 텍스트 붙여넣기
grid.pasteFromClipboard("값1\t값2\n값3\t값4", {
  startRowKey: "row-1",
  columns: ["col-1", "col-2"]
});
```

### 48. editable 함수형 지원 (행별 편집 잠금)

컬럼 정의의 `editable` 속성을 단순 불리언 값이 아니라 함수 형식(`(params: { row, def }) => boolean`)으로 지정하여 행 단위의 특정 조건이나 상태에 따라 편집 가부를 동적으로 결정할 수 있습니다:

```js
const columns = [
  {
    id: "name",
    field: "name",
    headerName: "Name",
    // 행의 status가 locked이면 편집 차단
    editable: ({ row, def }) => row.status !== "locked"
  }
];
```

### 49. 고급 필터 GUI 빌더 (사이드 패널 필터 탭)

사이드 설정 패널의 `Filters` 탭에서 복수 필터 규칙을 AND/OR 계층 트리 구조 조건식으로 구성하여 미세하게 필터링할 수 있는 UI 빌더 대화상자를 지원합니다.

수동 조건 설정 API:
```js
grid.setAdvancedFilter({
  type: "AND",
  conditions: [
    { field: "team", operator: "equals", value: "Red" },
    { field: "score", operator: "greaterThan", value: 1000 }
  ]
});
```

### 50. Row number 자동 번호 컬럼

행의 순차적 인덱스 번호를 1부터 시작해 순서대로 표시하는 전용 번호 컬럼을 활성화합니다. 이 번호는 정렬, 필터, 페이징에 따라 자동으로 동기화됩니다.

```js
const grid = createGrid(container, {
  rowNumbers: true,         // 행 번호 활성화
  rowNumberWidth: 50,       // 너비 설정 (기본값: 44)
  columns,
  rows
});
```

### 51. 셀 단위 flash 애니메이션 (라이브 업데이트 변경 셀 하이라이트)

실시간 데이터 업데이트 API(`liveUpdateRows`, `livePatchRow` 등)를 통해 특정 셀의 값이 변경되면 해당 셀 테두리가 녹색으로 깜빡이는 Flash 하이라이트 애니메이션이 구동되어 시각적으로 변경 내역을 전달합니다:

```js
// 변경된 셀이 자동으로 600ms 동안 녹색으로 점멸
grid.livePatchRow("row-1", { score: 9500 });
```

### 52. 컬럼별 인라인 필터 행 (헤더 아래 입력 필드)

컬럼 헤더 바로 아랫줄에 개별 컬럼별로 텍스트를 즉시 필터링할 수 있는 인라인 입력 필드 행을 노출합니다:

```js
const grid = createGrid(container, {
  filterRow: { enabled: true }, // 인라인 필터 행 활성화
  columns,
  rows
});
```

### 53. 키보드 탐색 완성도

마우스 없이 그리드를 조작할 수 있는 완성도 높은 키보드 단축키 및 탐색 동작을 제공합니다.
* `Tab` / `Shift+Tab`: 다음/이전 셀로 포커스 이동 (편집 중에는 커밋 후 이동)
* `Enter`: 셀 포커스 상태에서 편집 모드로 진입. 편집 중 입력 시 값을 반영(커밋)하고 아래 행의 셀로 포커스 이동
* `F2`: 선택된 셀의 편집 모드 시작
* `Escape`: 편집 모드 취소(이전 값 복원) 또는 범위 선택 해제
* 방향키 및 `Home` / `End`: 셀 포커스 이동 (편집 도중에는 텍스트 입력창 안에서 커서 이동으로 자동 전환)

### 54. 사이드 패널 컬럼 목록 드래그로 순서 변경

설정 사이드 패널의 `Columns` 탭에서 컬럼 이름 목록의 순서를 마우스로 드래그 앤 드롭하여 뷰포트 상의 실제 컬럼 배치 순서를 즉시 손쉽게 변경할 수 있습니다.

### 55. 채우기 핸들 (셀 우하단 드래그 자동 채우기)

포커스되거나 선택된 셀 우하단 모서리의 채우기 핸들(정사각형 마크)을 클릭하여 상/하 인접 셀로 드래그하면, 복사 또는 연쇄 값 자동 입력이 수행됩니다:

```js
const grid = createGrid(container, {
  editing: { enabled: true },
  fillHandle: true, // 채우기 핸들 사용
  columns,
  rows
});
```

### 56. 리치 툴팁 (커스텀 HTML 팝업)

마우스 호버 시 표시되는 툴팁을 일반 텍스트뿐만 아니라 복합 HTML Element로 렌더링하도록 직접 디자인하여 툴팁 레이아웃 내에 요약 메타데이터나 미니 그래프 등을 삽입할 수 있습니다:

```js
const columns = [
  {
    id: "name",
    field: "name",
    tooltipComponent: ({ value, row, def }) => {
      const el = document.createElement("div");
      el.innerHTML = `<strong>${row.name}</strong><br/>상태: ${row.status}`;
      return el; // 커스텀 Element 또는 문자열 반환
    }
  }
];
```

### 57. 다중 레벨 그룹 집계 (중첩 그룹별 집계)

여러 컬럼을 동시 그룹화(`['country', 'city', 'department']`)하는 다중 레이어 그룹화 조건에서도 각각의 중첩된 그룹 헤더 단위마다 하위 항목의 수치를 안전하게 평가하여 정확한 집계(Aggregation) 결과를 계층별로 나누어 렌더링합니다.

### 58. Web Worker 파이프라인 실제 연결 (대용량 정렬/필터)

대용량 정렬 및 필터 적용 시 렌더링 메인 스레드가 굳어 동작하지 않는 병목 현상을 해결하기 위해 데이터 연산을 백그라운드 Web Worker로 분할 처리합니다. 외부 ESM 모듈 로딩 에러나 빌드 도구 문제를 차단하기 위해 단일 번들에 포함되어 자체 구동하는 Classic 인라인 워커 구조를 채용했습니다:

```js
const grid = createGrid(container, {
  worker: { enabled: true }, // 백그라운드 병렬 처리 활성화
  columns,
  rows
});
```

### 59. 기본 수식 지원 (=SUM, =AVG 셀값 평가)

셀 값에 `=SUM(A1:B10)` 또는 `=AVG(C1:C5)`와 같이 `=`로 시작하는 엑셀 수식을 직접 입력할 수 있습니다. 좌표 범위 및 여러 인자나 숫자(예: `=SUM(A1:B1, 50)`)의 계산을 연쇄 평가하며, 캐싱(Memoization)과 순환 참조 감지(`#REF!`) 기능을 탑재했습니다. 편집 시 계산값 대신 수식 원본 문자열을 불러와 편집이 용이하도록 UX를 보완했습니다.

```js
const rows = [
  { id: 1, a: 10, b: 20, c: "=SUM(A1:B1)" }, // 30으로 평가됨
  { id: 2, a: 15, b: 25, c: "=AVG(A1:B2)" }  // 17.5로 평가됨
];
```

### 60. 수식 엔진 플러그인 (엑셀 수준 함수 지원)

위의 기본 수식 엔진은 `=SUM`, `=AVG`만 이해합니다. `createFormulaPlugin`을 설치하면 [hot-formula-parser](https://github.com/handsontable/formula-parser)를 npm에서 우선 로드하고(없으면 CDN으로 폴백) 사칙연산(`+ - * / ^`), 비교 연산, [formula.js](https://github.com/handsontable/formula.js)에 정의된 전체 함수(`MIN`, `MAX`, `IF`, `COUNT`, `VLOOKUP`, 문자열/논리 함수 등)를 그대로 쓸 수 있습니다. `row._formulas[field] = "=..."` 작성 규칙과 순환 참조 감지(`#REF!`)는 기본 엔진과 동일합니다.

```js
import { createGrid, createFormulaPlugin } from "zenith-grid";

const grid = createGrid(container, {
  columns,
  rows: [
    { id: 1, a: 10, b: 20, c: "=IF(A1>B1, A1, B1)" },
    { id: 2, a: 15, b: 25, c: "=MIN(A1:B2) + MAX(A1:B2)" },
  ],
  plugins: [{ plugin: createFormulaPlugin() }],
});
```

hot-formula-parser가 로드되는 동안(또는 로드에 실패한 경우)에는 기본 `=SUM` / `=AVG` 엔진으로 계속 계산되며, 전체 파서 준비가 끝나면 자동으로 다시 평가합니다.
