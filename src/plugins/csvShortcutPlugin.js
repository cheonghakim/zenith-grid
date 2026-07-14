export function createCsvShortcutPlugin(options = {}) {
  let handleKeydown = null;
  let host = null;

  return {
    name: options.name ?? 'csv-shortcut',
    install(core) {
      host = core?._dom?.getRoot?.() ?? null;
      if (!(host instanceof HTMLElement)) {
        return;
      }

      handleKeydown = (event) => {
        const triggerKey = (options.key ?? 'e').toLowerCase();
        if (!event.ctrlKey || !event.shiftKey || String(event.key).toLowerCase() !== triggerKey) {
          return;
        }
        event.preventDefault();
        core.downloadCsv({
          fileName: options.fileName ?? 'zenith-grid-export.csv',
          ...options.exportOptions,
        });
      };

      host.addEventListener('keydown', handleKeydown);
    },
    uninstall() {
      if (host && handleKeydown) {
        host.removeEventListener('keydown', handleKeydown);
      }
      handleKeydown = null;
      host = null;
    },
  };
}
