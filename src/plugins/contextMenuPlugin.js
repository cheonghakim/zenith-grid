function removeMenu(state) {
  state.menu?.remove();
  state.menu = null;
}

export function createContextMenuPlugin(options = {}) {
  const state = {
    menu: null,
    cleanup: [],
  };

  const closeMenu = () => {
    removeMenu(state);
  };

  const bindDismiss = () => {
    const handlePointerDown = (event) => {
      if (state.menu?.contains(event.target)) {
        return;
      }
      closeMenu();
    };
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeydown);
    state.cleanup.push(() => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeydown);
    });
  };

  const renderMenu = (core, payload, type) => {
    const items = options.getItems?.({
      ...payload,
      type,
      core,
    }) ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      closeMenu();
      return;
    }

    closeMenu();
    payload.event.preventDefault();

    const menu = document.createElement('div');
    menu.className = 'ck-zenith-grid-context-menu';
    menu.setAttribute('role', 'menu');
    menu.style.position = 'fixed';
    menu.style.left = `${payload.event.clientX}px`;
    menu.style.top = `${payload.event.clientY}px`;

    // Inherit theme class from grid root
    const gridRoot = core?._dom?.getRoot?.();
    if (gridRoot?.classList.contains('ck-zenith-grid-theme-dark')) {
      menu.classList.add('ck-zenith-grid-theme-dark');
    }

    items.forEach((item) => {
      // Handle separator
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'ck-zenith-grid-context-menu-separator';
        separator.setAttribute('role', 'separator');
        menu.appendChild(separator);
        return;
      }

      // Handle menu item
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ck-zenith-grid-context-menu-item';
      button.setAttribute('role', 'menuitem');
      button.textContent = item.label ?? 'Action';
      button.disabled = item.disabled === true;
      button.addEventListener('click', () => {
        // Support both 'action' and 'onSelect'
        const callback = item.action ?? item.onSelect;
        callback?.({
          ...payload,
          type,
          core,
        });
        closeMenu();
      });
      menu.appendChild(button);
    });

    document.body.appendChild(menu);
    state.menu = menu;
  };

  return {
    name: options.name ?? 'context-menu',
    install(core) {
      const unsubscribers = [
        core.on('row-contextmenu', (payload) => renderMenu(core, payload, 'row')),
        core.on('cell-contextmenu', (payload) => renderMenu(core, payload, 'cell')),
      ];
      bindDismiss();
      state.cleanup.push(...unsubscribers);
    },
    uninstall() {
      closeMenu();
      state.cleanup.splice(0).forEach((dispose) => dispose?.());
    },
  };
}
