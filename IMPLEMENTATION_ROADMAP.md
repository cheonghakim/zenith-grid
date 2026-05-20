# HighGrid Implementation Roadmap

이 문서는 엔터프라이즈급 DataGrid/Table 라이브러리 설계 프롬프트를 실제 구현 작업으로 옮기기 위한 실전형 로드맵이다. 현재 저장소에 이미 존재하는 코어 클래스 초안을 기준으로, MVP에서 반드시 닫아야 할 범위와 이후 확장 범위를 분리한다.

## 1. 구현 원칙

- 코어는 `framework-agnostic` 이어야 한다.
- 데이터 처리와 렌더링을 분리한다.
- 고비용 연산은 Web Worker로 위임하되, 항상 메인 스레드 fallback을 제공한다.
- 기능은 "동시에 모두 켜는 것"보다 "충돌 가능한 조합을 예측 가능한 정책으로 제한하는 것"을 우선한다.
- 첫 번째 목표는 "대용량 데이터에서도 안정적으로 스크롤되는 그리드"다.

## 2. 기능 우선순위

### Phase 1: Core MVP

이 단계가 끝나면 사용자는 컬럼 정의와 row 데이터만으로 동작하는 가상 스크롤 그리드를 사용할 수 있어야 한다.

- 컬럼 모델
- 데이터 저장소
- 정렬
- 필터
- 수직 가상 스크롤
- 기본 DOM 렌더러
- 헤더/바디 렌더링
- 선택 상태
- 이벤트 시스템
- Worker fallback 포함 데이터 처리 파이프라인

### Phase 2: Pro Features

- 컬럼 리사이즈
- 컬럼 reorder
- pinned columns
- pagination
- infinite scroll
- column state persistence
- row patch/live update

### Phase 3: Advanced Data Features

- grouping
- aggregation
- tree data
- variable row height
- horizontal virtualization

### Phase 4: Integration and DX

- Vue 3 adapter
- plugin API stabilization
- theme tokens
- test matrix expansion
- examples and documentation

## 3. 기능 조합 정책

초기 구현에서는 아래 조합 규칙을 명시적으로 둔다.

- `pagination` 과 `infiniteScroll` 은 동시에 활성화하지 않는다.
- `treeData` 와 `grouping` 은 동시에 켜지지 않도록 제한한다.
- `variableRowHeight` 는 `horizontal virtualization` 보다 늦게 넣지 말고, 오히려 더 늦게 넣는다. 복잡도가 훨씬 크다.
- `pinned columns` 는 수평 가상화가 안정화되기 전까지 center 영역만 가상화한다.
- `live update` 는 정렬/필터 적용 중에도 동작해야 하지만, 기본 정책은 "배치 반영 + 최소 repaint" 로 둔다.

## 4. 권장 폴더 구조

현재 구조를 크게 뒤엎지 않고, 아래 구조로 정리하는 것이 좋다.

```txt
src/
  core/
    GridCore.js
    EventBus.js
    DataStore.js
    ViewModel.js
    ColumnRegistry.js
    WorkerBridge.js
    Pipeline.js
  models/
    ColumnModel.js
    RowModel.js
    HeaderModel.js
  managers/
    SortManager.js
    FilterManager.js
    SelectionManager.js
    ColumnStateManager.js
    PaginationManager.js
    InfiniteScrollManager.js
    LiveUpdateManager.js
    GroupManager.js
    TreeManager.js
    VirtualScrollManager.js
  renderer/
    DOMRenderer.js
    HeaderRenderer.js
    BodyRenderer.js
    cell/
      DefaultCellRenderer.js
  workers/
    DataWorker.js
  adapters/
    vue3/
      HighGrid.vue
      useHighGrid.js
  styles/
    grid.css
    tokens.css
  plugins/
    index.js
  utils/
    invariant.js
    shallowEqual.js
    scheduler.js
  index.js

tests/
  unit/
  integration/
  worker/
  adapters/

examples/
  basic/
  large-dataset/
  vue3/
```

## 5. 핵심 클래스와 책임

### `GridCore`

라이브러리의 오케스트레이터다.

- 옵션 정규화
- manager 생성 및 연결
- render trigger 관리
- public API 제공
- lifecycle 관리

### `Pipeline`

데이터 처리 순서를 고정하는 모듈이다.

권장 순서:

```txt
raw rows
-> filter
-> sort
-> group/tree flatten
-> paginate or infinite slice
-> visible rows for render
```

이 순서를 별도 모듈로 분리해야 기능 충돌 시 규칙을 통제하기 쉽다.

### `ColumnRegistry`

현재 `ColumnModel` 이 단일 컬럼 정의에 가까우므로, 컬럼 컬렉션을 다루는 레이어가 하나 더 필요하다.

- column id index
- visible column 계산
- pinned left/center/right 분리
- width 합산
- header metadata 생성

### `DOMRenderer`

레이아웃 셸만 담당한다.

- viewport 구조 생성
- overlay/banner/footer 관리
- scroll container 노출
- virtual spacer 반영

### `HeaderRenderer`

- 헤더 셀 DOM 생성
- sort indicator
- resize handle
- pinned 구역별 헤더 렌더링

### `BodyRenderer`

- visible row DOM 생성
- row key 기반 최소 업데이트
- selection class 반영
- cell renderer 위임

## 6. 첫 구현에서 반드시 정리할 파일 목록

현재 저장소 기준으로, 아래 파일이 MVP 핵심 경로다.

- `src/core/DataStore.js`
- `src/core/ViewModel.js`
- `src/core/EventBus.js`
- `src/core/WorkerBridge.js`
- `src/managers/SortManager.js`
- `src/managers/FilterManager.js`
- `src/managers/SelectionManager.js`
- `src/managers/VirtualScrollManager.js`
- `src/renderer/DOMRenderer.js`
- `src/renderer/HeaderRenderer.js`
- `src/renderer/BodyRenderer.js`
- `src/workers/DataWorker.js`

그리고 다음 파일은 새로 추가하는 것을 권장한다.

- `src/core/GridCore.js`
- `src/core/Pipeline.js`
- `src/core/ColumnRegistry.js`
- `src/index.js`
- `src/styles/grid.css`

## 7. 첫 번째 커밋 범위

첫 커밋은 "많은 기능"이 아니라 "수직으로 잘라서 완결된 동작"이어야 한다.

### 목표

브라우저에서 아래 코드가 동작해야 한다.

```js
import { createGrid } from "highgrid";

const grid = createGrid(document.getElementById("app"), {
  columns: [
    { id: "id", field: "id", title: "ID", width: 80 },
    { id: "name", field: "name", title: "Name", width: 180 },
    { id: "status", field: "status", title: "Status", width: 120 },
  ],
  rowKey: "id",
  rows: largeRows,
});
```

### 포함 범위

- `createGrid(container, options)` 진입점
- `GridCore` 생성/파괴
- 컬럼 정규화
- `DataStore.setData`
- `FilterManager`
- `SortManager`
- `ViewModel` 기반 수직 가상 스크롤
- 기본 헤더 렌더
- 기본 바디 렌더
- scroll event 연결
- empty/loading overlay

### 제외 범위

- tree
- grouping
- aggregation
- infinite scroll
- pagination
- live update batching
- pinned columns
- Vue adapter
- plugin API 확장

## 8. 첫 커밋에서 추가할 최소 코드 범위

아래 정도면 "보여줄 수 있는 최소 제품"이 된다.

### 새 파일

- `src/index.js`
- `src/core/GridCore.js`
- `src/core/Pipeline.js`
- `src/core/ColumnRegistry.js`
- `src/styles/grid.css`

### 기존 파일 보완

- `src/renderer/DOMRenderer.js`
  - class name 체계 점검
  - overlay 문구 인코딩 깨짐 정리
- `src/renderer/HeaderRenderer.js`
  - 기본 헤더 셀 생성
  - 정렬 토글 이벤트
- `src/renderer/BodyRenderer.js`
  - visible rows 렌더
  - row/cell 기본 텍스트 렌더
- `src/managers/VirtualScrollManager.js`
  - `ViewModel` 과 DOM scroll 연결
- `src/workers/DataWorker.js`
  - `sort`, `filter` 작업명과 `WorkerBridge` 프로토콜 일치 검증

## 9. 실제 구현 순서

1. `src/index.js` 와 `GridCore.js` 를 추가해 라이브러리 진입점을 만든다.
2. `ColumnRegistry.js` 로 컬럼 배열 정규화와 visible column 계산을 닫는다.
3. `Pipeline.js` 에 filter/sort 순서를 고정한다.
4. `DOMRenderer`, `HeaderRenderer`, `BodyRenderer` 를 연결해 첫 화면 렌더를 만든다.
5. `ViewModel` + `VirtualScrollManager` 로 스크롤 시 visible row 재계산을 붙인다.
6. `WorkerBridge` 를 filter/sort 파이프라인에 연결하되 fallback 경로를 동시에 유지한다.
7. 기본 CSS 를 추가해 헤더 고정, row 높이, 스크롤 동작을 안정화한다.
8. large dataset 예제를 만들어 성능 기준선을 잡는다.

## 10. 테스트 전략

### Unit

- `DataStore` CRUD
- `SortManager` comparator rules
- `FilterManager` operators
- `ViewModel` visible range math
- `ColumnRegistry` visible/pinned width 계산

### Integration

- 데이터 주입 후 첫 렌더
- 스크롤 시 row window 변경
- sort 클릭 후 렌더 갱신
- filter 적용 후 visible rows 갱신

### Worker

- worker enabled
- worker disabled fallback
- timeout/error handling

### Adapter

- Vue prop 변경 시 core update
- event emit 동기화
- unmount 시 destroy 호출

## 11. 지금 코드베이스에서 바로 보이는 리스크

- `package.json` 의 `main` 이 `src/index.js` 를 가리키지만 해당 파일이 아직 없다.
- 코어 오케스트레이터가 없어 manager, renderer, worker 가 아직 한 흐름으로 묶이지 않았다.
- 일부 파일 주석 문자열이 깨져 있어 인코딩 정리가 필요하다.
- `WorkerBridge` 의 inline worker import 방식은 번들러 환경에서 깨질 가능성이 있어, 실제 배포 전에는 별도 worker entry 방식으로 바꾸는 편이 안전하다.
- `groupAggregate` 는 현재 스켈레톤 수준이라 실제 grouping 결과 구조를 다시 정의해야 한다.

## 12. 다음 작업 제안

가장 좋은 다음 단계는 문서만 더 쓰는 것이 아니라, 바로 첫 커밋 범위를 구현 가능한 상태로 만드는 것이다.

추천 작업 순서:

1. `src/index.js`, `GridCore.js`, `Pipeline.js`, `ColumnRegistry.js` 추가
2. 기본 CSS 추가
3. 간단한 예제 페이지 추가
4. `DataStore`, `SortManager`, `FilterManager`, `ViewModel` 에 대한 단위 테스트 추가

## 13. 설계 프롬프트에 추가하면 좋은 문장

아래 문장을 설계 프롬프트 마지막에 붙이면, 결과가 훨씬 구현 친화적으로 바뀐다.

```txt
추가로, 설계 결과를 실제 구현 순서로 옮길 수 있도록 폴더 구조, 핵심 클래스/파일 목록, 첫 번째 커밋에서 구현할 최소 코드 범위까지 제안해줘.
```
