# Changelog

## [1.3.0] - 2026-06-17

### Breaking Changes

#### CSS class prefix changed: `ag-` → `ck-high-grid-`

All internal CSS class names have been renamed from the `ag-` prefix to `ck-high-grid-` to prevent conflicts with AG-Grid and other grid libraries that use the same prefix.

**Before:**
```html
<div class="ag-theme-dark">
  <div id="grid"></div>
</div>
```

**After:**
```html
<div class="ck-high-grid-theme-dark">
  <div id="grid"></div>
</div>
```

---

#### CSS custom property prefix changed: `--ag-` → `--ck-high-grid-`

All CSS design tokens have been renamed from `--ag-` to `--ck-high-grid-`.

**Before:**
```css
#my-grid {
  --ag-accent: #7c3aed;
  --ag-font-size: 15px;
  --ag-row-height: 48px;
}
```

**After:**
```css
#my-grid {
  --ck-high-grid-accent: #7c3aed;
  --ck-high-grid-font-size: 15px;
  --ck-high-grid-row-height: 48px;
}
```

---

### Migration Guide

#### 1. Theme classes

| Before | After |
|---|---|
| `ag-theme-dark` | `ck-high-grid-theme-dark` |
| `ag-theme-compact` | `ck-high-grid-theme-compact` |
| `ag-theme-spacious` | `ck-high-grid-theme-spacious` |

#### 2. CSS custom properties (commonly used)

| Before | After |
|---|---|
| `--ag-accent` | `--ck-high-grid-accent` |
| `--ag-surface` | `--ck-high-grid-surface` |
| `--ag-ink` | `--ck-high-grid-ink` |
| `--ag-border` | `--ck-high-grid-border` |
| `--ag-font-size` | `--ck-high-grid-font-size` |
| `--ag-row-height` | `--ck-high-grid-row-height` |
| `--ag-header-bg` | `--ck-high-grid-header-bg` |
| `--ag-row-hover-bg` | `--ck-high-grid-row-hover-bg` |
| `--ag-row-selected-bg` | `--ck-high-grid-row-selected-bg` |

#### 3. Custom cell editor class names

If you are using internal class names inside custom cell editors or renderers, update them as well:

**Before:**
```js
input.className = "ag-cell-editor";
```

**After:**
```js
input.className = "ck-high-grid-cell-editor";
```

#### 4. Custom CSS overrides

If you have written custom CSS targeting HighGrid's internal classes, update all selectors:

**Before:**
```css
.ag-row-selected { background: #e0f0ff; }
.ag-header-cell { font-weight: 700; }
.ag-cell-pinned { background: #f8fafc; }
```

**After:**
```css
.ck-high-grid-row-selected { background: #e0f0ff; }
.ck-high-grid-header-cell { font-weight: 700; }
.ck-high-grid-cell-pinned { background: #f8fafc; }
```

#### 5. JavaScript classList manipulation

If you toggle dark mode programmatically:

**Before:**
```js
container.classList.add('ag-theme-dark');
container.classList.remove('ag-theme-dark');
container.classList.toggle('ag-theme-dark');
```

**After:**
```js
container.classList.add('ck-high-grid-theme-dark');
container.classList.remove('ck-high-grid-theme-dark');
container.classList.toggle('ck-high-grid-theme-dark');
```

---

### Why this change?

AG-Grid also uses the `ag-` prefix for its CSS classes and `--ag-` for its design tokens. When both libraries are loaded on the same page, styles bleed into each other and cause visual corruption. The `ck-high-grid-` prefix is unique to HighGrid and eliminates this conflict entirely.

---

## [1.2.1] - 2026-06-05

- Fix: style path resolution

## [1.2.0] - 2026-06-05

- Enterprise features: RowDragManager, AggregateManager, RangeSelectionManager, StatusBarRenderer, conditional formatting, row pinning, print support

## [1.0.0] - Initial Release

- Virtual scrolling, pagination, infinite scroll
- Grouping, tree data, live updates
- Side panel, plugins, custom cell renderers
