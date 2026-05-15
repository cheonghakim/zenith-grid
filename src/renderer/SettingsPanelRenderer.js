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
      { id: 'columns', label: this._t('sidePanel.tabs.columns', 'Columns') },
      { id: 'filters', label: this._t('sidePanel.tabs.filters', 'Filters') },
      { id: 'plugins', label: this._t('sidePanel.tabs.plugins', 'Plugins') },
      { id: 'view', label: this._t('sidePanel.tabs.view', 'View') },
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
    closeButton.textContent = this._t('sidePanel.close', 'Close');
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
        option.textContent = value === 'none'
          ? this._t('sidePanel.noPin', 'No Pin')
          : value === 'left'
            ? this._t('sidePanel.pinLeft', 'Pin left')
            : this._t('sidePanel.pinRight', 'Pin right');
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
    quickText.textContent = this._t('sidePanel.quickFilter', 'Quick Filter');

    const quickInput = document.createElement('input');
    quickInput.type = 'search';
    quickInput.placeholder = this._t('sidePanel.quickFilterPlaceholder', 'Search visible data...');
    quickInput.value = state.quickFilter ?? '';
    quickInput.addEventListener('input', () => {
      this._core.setQuickFilter(quickInput.value, this._options.quickFilterFields ?? []);
    });

    quickLabel.appendChild(quickText);
    quickLabel.appendChild(quickInput);
    quickWrap.appendChild(quickLabel);
    section.appendChild(quickWrap);

    const visibleColumns = this._core.getVisibleLeafColumns().filter((column) => column.def.filterable !== false);
    visibleColumns.forEach((column) => {
      section.appendChild(this._renderColumnFilterField(column, state.columnFilters?.[column.def.id] ?? null));
    });

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'ag-side-panel-action';
    clearButton.textContent = this._t('sidePanel.clearAllFilters', 'Clear All Filters');
    clearButton.addEventListener('click', () => {
      this._core.clearFilters();
    });
    section.appendChild(clearButton);

    return section;
  }

  _renderColumnFilterField(column, filter) {
    const field = document.createElement('div');
    field.className = 'ag-side-panel-field';

    const label = document.createElement('span');
    label.textContent = column.def.headerName;
    field.appendChild(label);

    const meta = this._resolveFilterMeta(column);
    const currentOperator = filter?.operator ?? meta.defaultOperator;
    const currentValue = filter?.value ?? (currentOperator === 'between' ? ['', ''] : meta.type === 'select' ? [] : '');

    if (meta.type !== 'select') {
      const operatorSelect = document.createElement('select');
      operatorSelect.className = 'ag-side-panel-select';
      meta.operators.forEach((operator) => {
        const option = document.createElement('option');
        option.value = operator;
        option.textContent = this._getOperatorLabel(operator);
        option.selected = operator === currentOperator;
        operatorSelect.appendChild(option);
      });
      field.appendChild(operatorSelect);

      const valueEditor = this._createFilterValueEditor(meta, currentOperator, currentValue, (value) => {
        this._core.setColumnFilter(column.def.id, {
          type: meta.type,
          field: column.def.field,
          operator: operatorSelect.value,
          value,
        });
      });

      operatorSelect.addEventListener('change', () => {
        const nextValue = operatorSelect.value === 'between' ? ['', ''] : '';
        this._core.setColumnFilter(column.def.id, {
          type: meta.type,
          field: column.def.field,
          operator: operatorSelect.value,
          value: nextValue,
        });
        this.render();
      });

      field.appendChild(valueEditor);
    } else {
      const selectValues = Array.isArray(currentValue)
        ? currentValue.map(String)
        : currentValue == null || currentValue === ''
          ? []
          : [String(currentValue)];

      const select = document.createElement('select');
      select.className = 'ag-side-panel-select ag-side-panel-select-multiple';
      select.multiple = meta.multiple;
      select.size = Math.min(Math.max(meta.choices.length, 3), 6);

      meta.choices.forEach((choice) => {
        const option = document.createElement('option');
        option.value = String(choice.value);
        option.textContent = choice.label;
        option.selected = selectValues.includes(String(choice.value));
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const selectedValues = [...select.selectedOptions].map((option) => option.value);
        this._core.setColumnFilter(column.def.id, {
          type: 'select',
          field: column.def.field,
          operator: 'in',
          value: meta.multiple ? selectedValues : selectedValues[0] ?? '',
        });
      });

      field.appendChild(select);

      if (meta.choices.length === 0) {
        const hint = document.createElement('small');
        hint.className = 'ag-side-panel-help';
        hint.textContent = this._t(
          'sidePanel.noFilterChoices',
          'No filter choices are available yet. Provide filterOptions for remote datasets.'
        );
        field.appendChild(hint);
      }
    }

    const actions = document.createElement('div');
    actions.className = 'ag-side-panel-inline-actions';

    const summary = document.createElement('small');
    summary.className = 'ag-side-panel-help';
    summary.textContent = filter
      ? this._t('sidePanel.filterActive', 'Filter active')
      : this._t('sidePanel.filterInactive', 'No filter set');

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'ag-side-panel-action ag-side-panel-action-inline';
    clear.textContent = this._t('sidePanel.clearFilter', 'Clear');
    clear.disabled = !filter;
    clear.addEventListener('click', () => {
      this._core.clearColumnFilter(column.def.id);
    });

    actions.appendChild(summary);
    actions.appendChild(clear);
    field.appendChild(actions);

    return field;
  }

  _createFilterValueEditor(meta, operator, value, onCommit) {
    if (operator === 'between') {
      const wrap = document.createElement('div');
      wrap.className = 'ag-side-panel-split-inputs';

      const startInput = this._createPrimitiveFilterInput(meta, Array.isArray(value) ? value[0] ?? '' : '', () => {
        onCommit([startInput.value, endInput.value]);
      });
      const endInput = this._createPrimitiveFilterInput(meta, Array.isArray(value) ? value[1] ?? '' : '', () => {
        onCommit([startInput.value, endInput.value]);
      });

      startInput.placeholder = this._t('sidePanel.rangeStart', 'From');
      endInput.placeholder = this._t('sidePanel.rangeEnd', 'To');

      wrap.appendChild(startInput);
      wrap.appendChild(endInput);
      return wrap;
    }

    const input = this._createPrimitiveFilterInput(meta, Array.isArray(value) ? value[0] ?? '' : value ?? '', () => {
      onCommit(input.value);
    });
    return input;
  }

  _createPrimitiveFilterInput(meta, value, onCommit) {
    const input = document.createElement('input');
    input.type = meta.inputType;
    input.value = value ?? '';
    input.placeholder = meta.placeholder;

    let timer = null;
    const commit = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        onCommit();
      }, meta.inputType === 'search' ? 160 : 0);
    };

    input.addEventListener(meta.inputType === 'search' ? 'input' : 'change', commit);
    if (meta.inputType !== 'search') {
      input.addEventListener('input', commit);
    }
    return input;
  }

  _resolveFilterMeta(column) {
    const type = column.def.filterType ?? this._inferFilterType(column.def);
    const operators = Array.isArray(column.def.filterOperators) && column.def.filterOperators.length > 0
      ? column.def.filterOperators
      : this._getDefaultOperators(type);

    return {
      type,
      operators,
      defaultOperator: operators[0],
      multiple: column.def.filterMultiple ?? true,
      inputType: type === 'number' ? 'number' : type === 'date' ? 'date' : 'search',
      placeholder: column.def.filterPlaceholder ?? this._t('sidePanel.filterPlaceholder', 'Filter {label}', {
        label: column.def.headerName,
      }),
      choices: type === 'select' ? this._core.getColumnFilterChoices(column.def.id) : [],
    };
  }

  _inferFilterType(def) {
    if (Array.isArray(def.filterOptions) && def.filterOptions.length > 0) {
      return 'select';
    }
    if (def.type === 'number' || def.type === 'date') {
      return def.type;
    }
    return 'text';
  }

  _getDefaultOperators(type) {
    switch (type) {
      case 'number':
        return ['equals', 'notEquals', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'between'];
      case 'date':
        return ['equals', 'notEquals', 'before', 'after', 'between'];
      case 'select':
        return ['in'];
      default:
        return ['contains', 'startsWith', 'endsWith', 'equals', 'notContains', 'notEquals'];
    }
  }

  _getOperatorLabel(operator) {
    const labels = {
      contains: this._t('sidePanel.operators.contains', 'Contains'),
      startsWith: this._t('sidePanel.operators.startsWith', 'Starts With'),
      endsWith: this._t('sidePanel.operators.endsWith', 'Ends With'),
      equals: this._t('sidePanel.operators.equals', 'Equals'),
      notEquals: this._t('sidePanel.operators.notEquals', 'Does Not Equal'),
      notContains: this._t('sidePanel.operators.notContains', 'Does Not Contain'),
      greaterThan: this._t('sidePanel.operators.greaterThan', 'Greater Than'),
      greaterThanOrEqual: this._t('sidePanel.operators.greaterThanOrEqual', 'Greater Or Equal'),
      lessThan: this._t('sidePanel.operators.lessThan', 'Less Than'),
      lessThanOrEqual: this._t('sidePanel.operators.lessThanOrEqual', 'Less Or Equal'),
      before: this._t('sidePanel.operators.before', 'Before'),
      after: this._t('sidePanel.operators.after', 'After'),
      between: this._t('sidePanel.operators.between', 'Between'),
      in: this._t('sidePanel.operators.in', 'Includes'),
    };
    return labels[operator] ?? operator;
  }

  _renderPluginsSection() {
    const section = document.createElement('div');
    section.className = 'ag-side-panel-section';

    const plugins = this._core.getAvailablePlugins();
    if (plugins.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'ag-side-panel-empty';
      empty.textContent = this._t('sidePanel.noPlugins', 'No built-in plugins were provided for this grid instance.');
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
    groupLabel.textContent = this._t('sidePanel.groupBy', 'Group By');
    const groupSelect = document.createElement('select');
    groupSelect.className = 'ag-side-panel-select';

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = this._t('sidePanel.disabled', 'Disabled');
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
    treeTitle.textContent = this._t('sidePanel.treeMode', 'Tree Mode');
    const treeMeta = document.createElement('span');
    treeMeta.textContent = tree.enabled
      ? this._t('sidePanel.enabled', 'Enabled')
      : this._t('sidePanel.disabled', 'Disabled');
    treeCopy.appendChild(treeTitle);
    treeCopy.appendChild(treeMeta);

    const treeToggle = document.createElement('button');
    treeToggle.type = 'button';
    treeToggle.className = 'ag-side-panel-toggle';
    treeToggle.dataset.active = tree.enabled ? 'true' : 'false';
    treeToggle.textContent = tree.enabled
      ? this._t('sidePanel.on', 'On')
      : this._t('sidePanel.off', 'Off');
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
    variableTitle.textContent = this._t('sidePanel.variableRowHeight', 'Variable Row Height');
    const variableMeta = document.createElement('span');
    variableMeta.textContent = this._core.isVariableRowHeight()
      ? this._t('sidePanel.adaptive', 'Adaptive')
      : this._t('sidePanel.fixed', 'Fixed');
    variableCopy.appendChild(variableTitle);
    variableCopy.appendChild(variableMeta);

    const variableToggle = document.createElement('button');
    variableToggle.type = 'button';
    variableToggle.className = 'ag-side-panel-toggle';
    variableToggle.dataset.active = this._core.isVariableRowHeight() ? 'true' : 'false';
    variableToggle.textContent = this._core.isVariableRowHeight()
      ? this._t('sidePanel.on', 'On')
      : this._t('sidePanel.off', 'Off');
    variableToggle.addEventListener('click', () => {
      this._core.setVariableRowHeight(!this._core.isVariableRowHeight());
    });

    variableRow.appendChild(variableCopy);
    variableRow.appendChild(variableToggle);
    section.appendChild(variableRow);

    const liveAnimationRow = document.createElement('div');
    liveAnimationRow.className = 'ag-side-panel-row';

    const liveAnimationCopy = document.createElement('div');
    liveAnimationCopy.className = 'ag-side-panel-copy';
    const liveAnimationTitle = document.createElement('strong');
    liveAnimationTitle.textContent = this._t('sidePanel.rowMotion', 'Row Motion');
    const liveAnimationMeta = document.createElement('span');
    liveAnimationMeta.textContent = this._core.isLiveRowAnimationEnabled()
      ? this._t('sidePanel.animated', 'Animated')
      : this._t('sidePanel.static', 'Static');
    liveAnimationCopy.appendChild(liveAnimationTitle);
    liveAnimationCopy.appendChild(liveAnimationMeta);

    const liveAnimationToggle = document.createElement('button');
    liveAnimationToggle.type = 'button';
    liveAnimationToggle.className = 'ag-side-panel-toggle';
    liveAnimationToggle.dataset.active = this._core.isLiveRowAnimationEnabled() ? 'true' : 'false';
    liveAnimationToggle.textContent = this._core.isLiveRowAnimationEnabled()
      ? this._t('sidePanel.on', 'On')
      : this._t('sidePanel.off', 'Off');
    liveAnimationToggle.addEventListener('click', () => {
      this._core.setLiveRowAnimationEnabled(!this._core.isLiveRowAnimationEnabled());
    });

    liveAnimationRow.appendChild(liveAnimationCopy);
    liveAnimationRow.appendChild(liveAnimationToggle);
    section.appendChild(liveAnimationRow);

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

  _t(key, fallback, params = {}) {
    return this._core.getLocaleText?.(key, fallback, params) ?? fallback;
  }
}
