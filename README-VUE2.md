# ZenithGrid Vue2 Support

ZenithGrid supports both Vue 2.7+ and Vue 3.3+.

## Installation

```bash
npm install zenith-grid
```

## Vue 3 Usage

```vue
<script setup>
import { ZenithGrid } from 'zenith-grid/vue';
import 'zenith-grid/styles/grid.css';

const columns = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: 'Name', width: 200 },
];

const rows = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
</script>

<template>
  <ZenithGrid :rows="rows" :columns="columns" />
</template>
```

## Vue 2 Usage

```vue
<template>
  <ZenithGrid :rows="rows" :columns="columns" />
</template>

<script>
import { ZenithGrid } from 'zenith-grid/vue2';
import 'zenith-grid/styles/grid.css';

export default {
  components: { ZenithGrid },
  data() {
    return {
      columns: [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Name', width: 200 },
      ],
      rows: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };
  },
};
</script>
```

## API Reference

Both Vue 2 and Vue 3 adapters expose the same API:

### Props
All ZenithGrid options are available as props (rows, columns, pagination, etc.)

### Events
- `@ready` - Grid instance is ready
- `@row-click` - Row clicked
- `@cell-click` - Cell clicked
- `@selection-change` - Selection changed
- And more...

### Methods (via ref)
```vue
<template>
  <ZenithGrid ref="gridRef" :rows="rows" :columns="columns" />
</template>

<script>
export default {
  mounted() {
    // Vue 2
    this.$refs.gridRef.setRows(newRows);
    
    // Vue 3
    // gridRef.value.setRows(newRows);
  }
}
</script>
```

## Vue Components as Cell Renderers (Vue 2)

A ZenithGrid `renderer` is a plain function that returns DOM. To use an existing Vue 2 component (a `Vue.extend(...)` constructor or a component options object) as a cell renderer, wrap it with `createVueRenderer`:

```js
import { ZenithGrid, createVueRenderer } from 'zenith-grid/vue2';
import StatusBadge from './StatusBadge.vue'; // or a Vue.extend() constructor

export default {
  components: { ZenithGrid },
  data() {
    return {
      columns: [
        { field: 'name', headerName: 'Name', width: 200 },
        {
          field: 'status',
          headerName: 'Status',
          width: 140,
          // one component instance per cell; props default to { value, row, def, state }
          renderer: createVueRenderer(StatusBadge, { parent: this }),
        },
      ],
    };
  },
};
```

The wrapper mounts a fresh instance for each cell and returns `{ element, destroy }`. ZenithGrid rebuilds every visible row on each render pass (scroll, sort, filter, edit commit), so it calls `destroy` (→ `vm.$destroy()`) as soon as the cell element is discarded. Without this bridge, a bare `vm.$el` would be dropped from the DOM without its instance ever being destroyed.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `props` | `(params) => object` or `object` | Maps `{ value, row, def, state }` to `propsData`. A function replaces the defaults; an object is merged over them. Props the component does not declare are ignored. |
| `parent` | Vue instance | Sets `$parent`, so `provide/inject`, `$store`, `$router` and `$i18n` resolve. Pass the page component (`this`). Also used to reach `Vue.extend` for options objects. |
| `on` | `(params) => { event: handler }` | Listeners bound with `vm.$on` after mount, e.g. to react to `$emit('select', …)` from the cell. |
| `Vue` | Vue constructor | Only needed when `Component` is a plain options object and no `parent` is given. |

```js
renderer: createVueRenderer(PriceCell, {
  parent: this,
  props: ({ value, row }) => ({ amount: value, currency: row.currency }),
  on: ({ row }) => ({ select: () => this.openDetail(row) }),
}),
```

Cells inside the grid are outside the wrapper's template, so `$refs`/slots from the page do not reach them. Pass what a cell needs through `props`.

To watch cells being mounted or torn down from the outside (for instance to wire a tooltip library), use the grid `hooks` prop with `afterCellRender` / `beforeCellDestroy`.

## Requirements

- **Vue 2**: Requires Vue 2.7.10 or higher (for Composition API support)
- **Vue 3**: Requires Vue 3.3.0 or higher

## Bundle Sizes

- Vue 3 adapter: ~309 KB (ES), 68 KB gzipped
- Vue 2 adapter: ~308 KB (ES), 68 KB gzipped
- Core grid is shared between both versions
