export class SettingsPanelRenderer {
  constructor(domRenderer, core, options = {}) {
    this._dom = domRenderer;
    this._core = core;
    this._options = options;
    this._activeTab = options.defaultTab ?? 'columns';
    this._open = options.defaultOpen ?? false;
    this._host = null;
    this._shell = null;
  }

  mount() {
    this._host = this._dom.getSidePanelHost();
    if (!this._host) {
      return;
    }

    this._dom.getRoot()?.classList.add('ag-has-side-panel');
    this._shell = document.createElement('div');
    this._shell.className = 'ag-side-panel';
    this._host.appendChild(this._shell);
    this.render();
  }

  render() {
    if (!this._shell) {
      return;
    }

    this._shell.innerHTML = '';
    this._shell.dataset.open = this._open ? 'true' : 'false';

    const rail = document.createElement('div');
    rail.className = 'ag-side-panel-rail';

    const tabs = [
      { id: 'columns', label: 'Columns' },
      { id: 'filters', label: 'Filters' },
      { id: 'plugins', label: 'Plugins' },
      { id: 'view', label: 'View' },
    ];

    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ag-side-panel-tab';
      button.dataset.active = this._open && this._activeTab === tab.id ? 'true' : 'false';
      button.textContent = tab.label;
      button.addEventListener('click', () => {
        if (this._open && this._activeTab === tab.id) {
          this._open = false;
        } else {
          this._open = true;
          this._activeTab = tab.id;
        }
        this.render();
      });
      rail.appendChild(button);
    });

    const card = document.createElement('aside');
    card.className = 'ag-side-panel-card';

    const header = document.createElement('div');
    header.className = 'ag-side-panel-header';

    const title = document.createElement('h3');
    title.textContent = tabs.find((tab) => tab.id === this._activeTab)?.label ?? 'Settings';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'ag-side-panel-close';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
      this._open = false;
      this.render();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'ag-side-panel-body';

    if (this._activeTab === 'columns') {
      body.appendChild(this._renderColumnsSection());
    } else if (this._activeTab === 'filters') {
      body.appendChild(this._renderFiltersSection());
    } else if (this._activeTab === 'plugins') {
      body.appendChild(this._renderPluginsSection());
    } else {
      body.appendChild(this._renderViewSection());
    }

    card.appendChild(body);
    this._shell.appendChild(rail);
    this._shell.appendChild(card);
  }

  _renderColumnsSection() {
    const section = document.createElement('div');
    section.className = 'ag-side-panel-section';

    const columns = this._core.getAllLeafColumns();
    columns.forEach((column) => {
      const row = document.createElement('div');
      row.className = 'ag-side-panel-row';

      const top = document.createElement('div');
      top.className = 'ag-side-panel-row-top';

      const label = document.createElement('label');
      label.className = 'ag-side-panel-checkbox';

      const visible = document.createElement('input');
      visible.type = 'checkbox';
      visible.checked = column.state.visible !== false;
      visible.addEventListener('change', () => {
        this._core.setColumnVisible(column.def.id, visible.checked);
      });

      const text = document.createElement('span');
      text.textContent = column.def.headerName;

      label.appendChild(visible);
      label.appendChild(text);

      const pinSelect = document.createElement('select');
      pinSelect.className = 'ag-side-panel-select';
      ['none', 'left', 'right'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value === 'none' ? '' : value;
        option.textContent = value === 'none' ? 'No Pin' : `Pin ${value}`;
        if ((column.state.pinned ?? '') === option.value) {
          option.selected = true;
        }
        pinSelect.appendChild(option);
      });
      pinSelect.addEventListener('change', () => {
        this._core.setColumnPinned(column.def.id, pinSelect.value || null);
      });

      top.appendChild(label);
      top.appendChild(pinSelect);

      const rangeWrap = document.createElement('div');
      rangeWrap.className = 'ag-side-panel-range-wrap';

      const range = document.createElement('input');
      range.type = 'range';
      range.min = String(column.def.minWidth ?? 50);
      range.max = String(Number.isFinite(column.def.maxWidth) ? column.def.maxWidth : 480);
      range.step = '10';
      range.value = String(column.state.width ?? 150);
      range.addEventListener('input', () => {
        this._core.setColumnWidth(column.def.id, Number(range.value));
      });

      const widthValue = document.createElement('span');
      widthValue.className = 'ag-side-panel-range-value';
      widthValue.textContent = `${column.state.width ?? 150}px`;

      rangeWrap.appendChild(range);
      rangeWrap.appendChild(widthValue);

      row.appendChild(top);
      row.appendChild(rangeWrap);
      section.appendChild(row);
    });

    return section;
  }

  _renderFiltersSection() {
    const section = document.createElement('div');
    section.className = 'ag-side-panel-section';

    const state = this._core.getFilterState();

    const quickWrap = document.createElement('div');
    quickWrap.className = 'ag-side-panel-block';

    const quickLabel = document.createElement('label');
    quickLabel.className = 'ag-side-panel-field';

    const quickText = document.createElement('span');
    quickText.textContent = 'Quick Filter';

    const quickInput = document.createElement('input');
    quickInput.type = 'search';
    quickInput.placeholder = 'Search visible data...';
    quickInput.value = state.quickFilter ?? '';
    quickInput.addEventListener('input', () => {
      this._core.setQuickFilter(quickInput.value, this._options.quickFilterFields ?? []);
    });

    quickLabel.appendChild(quickText);
    quickLabel.appendChild(quickInput);
    quickWrap.appendChild(quickLabel);
    section.appendChild(quickWrap);

    const visibleColumns = this._core.getVisibleLeafColumns();
    visibleColumns.forEach((column) => {
      const filter = state.columnFilters?.[column.def.id];
      const field = document.createElement('label');
      field.className = 'ag-side-panel-field';

      const label = document.createElement('span');
      label.textContent = column.def.headerName;

      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = `Filter ${column.def.headerName}`;
      input.value = filter?.value ?? '';
      input.addEventListener('change', () => {
        this._core.setColumnFilter(column.def.id, {
          type: 'text',
          field: column.def.field,
          operator: 'contains',
          value: input.value,
        });
      });

      field.appendChild(label);
      field.appendChild(input);
      section.appendChild(field);
    });

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'ag-side-panel-action';
    clearButton.textContent = 'Clear All Filters';
    clearButton.addEventListener('click', () => {
      this._core.clearFilters();
    });
    section.appendChild(clearButton);

    return section;
  }

  _renderPluginsSection() {
    const section = document.createElement('div');
    section.className = 'ag-side-panel-section';

    const plugins = this._core.getAvailablePlugins();
    if (plugins.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'ag-side-panel-empty';
      empty.textContent = 'No built-in plugins were provided for this grid instance.';
      section.appendChild(empty);
      return section;
    }

    plugins.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'ag-side-panel-row';

      const top = document.createElement('div');
      top.className = 'ag-side-panel-row-top';

      const copy = document.createElement('div');
      copy.className = 'ag-side-panel-copy';

      const title = document.createElement('strong');
      title.textContent = entry.label ?? entry.name;

      const meta = document.createElement('span');
      meta.textContent = entry.description ?? entry.name;

      copy.appendChild(title);
      copy.appendChild(meta);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'ag-side-panel-toggle';
      const installed = this._core.hasPlugin(entry.name);
      toggle.dataset.active = installed ? 'true' : 'false';
      toggle.textContent = installed ? 'On' : 'Off';
      toggle.addEventListener('click', () => {
        if (this._core.hasPlugin(entry.name)) {
          this._core.unusePlugin(entry.name);
        } else if (entry.plugin) {
          this._core.usePlugin(entry.plugin, entry.options ?? {});
        }
      });

      top.appendChild(copy);
      top.appendChild(toggle);
      row.appendChild(top);
      section.appendChild(row);
    });

    return section;
  }

  _renderViewSection() {
    const section = document.createElement('div');
    section.className = 'ag-side-panel-section';

    const grouping = this._core.getGroupingState();
    const tree = this._core.getTreeState();

    const groupField = document.createElement('label');
    groupField.className = 'ag-side-panel-field';
    const groupLabel = document.createElement('span');
    groupLabel.textContent = 'Group By';
    const groupSelect = document.createElement('select');
    groupSelect.className = 'ag-side-panel-select';

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'Disabled';
    groupSelect.appendChild(noneOption);

    this._core.getAllLeafColumns().forEach((column) => {
      const option = document.createElement('option');
      option.value = column.def.field;
      option.textContent = column.def.headerName;
      if (grouping.enabled && grouping.groupByFields?.[0] === column.def.field) {
        option.selected = true;
      }
      groupSelect.appendChild(option);
    });

    groupSelect.addEventListener('change', () => {
      if (!groupSelect.value) {
        this._core.disableGrouping();
      } else {
        this._core.enableGrouping([groupSelect.value]);
      }
    });

    groupField.appendChild(groupLabel);
    groupField.appendChild(groupSelect);
    section.appendChild(groupField);

    const treeRow = document.createElement('div');
    treeRow.className = 'ag-side-panel-row';

    const treeCopy = document.createElement('div');
    treeCopy.className = 'ag-side-panel-copy';
    const treeTitle = document.createElement('strong');
    treeTitle.textContent = 'Tree Mode';
    const treeMeta = document.createElement('span');
    treeMeta.textContent = tree.enabled ? 'Enabled' : 'Disabled';
    treeCopy.appendChild(treeTitle);
    treeCopy.appendChild(treeMeta);

    const treeToggle = document.createElement('button');
    treeToggle.type = 'button';
    treeToggle.className = 'ag-side-panel-toggle';
    treeToggle.dataset.active = tree.enabled ? 'true' : 'false';
    treeToggle.textContent = tree.enabled ? 'On' : 'Off';
    treeToggle.addEventListener('click', () => {
      if (tree.enabled) {
        this._core.disableTree();
      } else {
        this._core.enableTree();
      }
    });

    treeRow.appendChild(treeCopy);
    treeRow.appendChild(treeToggle);
    section.appendChild(treeRow);

    const variableRow = document.createElement('div');
    variableRow.className = 'ag-side-panel-row';

    const variableCopy = document.createElement('div');
    variableCopy.className = 'ag-side-panel-copy';
    const variableTitle = document.createElement('strong');
    variableTitle.textContent = 'Variable Row Height';
    const variableMeta = document.createElement('span');
    variableMeta.textContent = this._core.isVariableRowHeight() ? 'Adaptive' : 'Fixed';
    variableCopy.appendChild(variableTitle);
    variableCopy.appendChild(variableMeta);

    const variableToggle = document.createElement('button');
    variableToggle.type = 'button';
    variableToggle.className = 'ag-side-panel-toggle';
    variableToggle.dataset.active = this._core.isVariableRowHeight() ? 'true' : 'false';
    variableToggle.textContent = this._core.isVariableRowHeight() ? 'On' : 'Off';
    variableToggle.addEventListener('click', () => {
      this._core.setVariableRowHeight(!this._core.isVariableRowHeight());
    });

    variableRow.appendChild(variableCopy);
    variableRow.appendChild(variableToggle);
    section.appendChild(variableRow);

    return section;
  }

  destroy() {
    this._dom.getRoot()?.classList.remove('ag-has-side-panel');
    if (this._host) {
      this._host.innerHTML = '';
    }
    this._host = null;
    this._shell = null;
  }
}
