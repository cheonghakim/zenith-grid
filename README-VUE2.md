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

## Requirements

- **Vue 2**: Requires Vue 2.7.10 or higher (for Composition API support)
- **Vue 3**: Requires Vue 3.3.0 or higher

## Bundle Sizes

- Vue 3 adapter: ~309 KB (ES), 68 KB gzipped
- Vue 2 adapter: ~308 KB (ES), 68 KB gzipped
- Core grid is shared between both versions
