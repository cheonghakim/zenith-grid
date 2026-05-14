/**
 * PluginManager - 플러그인 라이프사이클 관리
 *
 * Plugin interface:
 * {
 *   name: string,           // 고유 식별자
 *   version?: string,
 *   deps?: string[],        // 의존하는 다른 플러그인 이름들
 *   install(core, options): void,   // 설치 훅
 *   uninstall?(core): void,         // 제거 훅
 *   hooks?: {               // TableCore가 호출하는 훅 포인트
 *     beforeDataProcess?: (rows) => rows,
 *     afterDataProcess?: (rows) => rows,
 *     beforeRender?: () => void,
 *     afterRender?: () => void,
 *     onDestroy?: () => void,
 *   }
 * }
 */
export class PluginManager {
  constructor(core) {
    this._core = core;
    /** @type {Map<string, {plugin: Object, options: Object}>} */
    this._installed = new Map();
    /** @type {Map<string, Function[]>} hook name -> handlers */
    this._hooks = new Map();
  }

  /**
   * 플러그인 설치
   * @param {Object} plugin - Plugin interface를 구현한 객체
   * @param {Object} [options] - 플러그인별 설정
   */
  use(plugin, options = {}) {
    if (!plugin || !plugin.name) {
      throw new Error('[PluginManager] Plugin must have a "name" property.');
    }

    if (this._installed.has(plugin.name)) {
      console.warn(`[PluginManager] Plugin "${plugin.name}" is already installed. Skipping.`);
      return this;
    }

    // 의존성 검사
    if (plugin.deps) {
      for (const dep of plugin.deps) {
        if (!this._installed.has(dep)) {
          throw new Error(
            `[PluginManager] Plugin "${plugin.name}" requires "${dep}" to be installed first.`
          );
        }
      }
    }

    // install 실행
    if (typeof plugin.install === 'function') {
      plugin.install(this._core, options);
    }

    // hooks 등록
    if (plugin.hooks) {
      for (const [hookName, fn] of Object.entries(plugin.hooks)) {
        if (typeof fn === 'function') {
          this._registerHook(hookName, fn);
        }
      }
    }

    this._installed.set(plugin.name, { plugin, options });
    return this;
  }

  /**
   * 플러그인 제거
   */
  unuse(pluginName) {
    const entry = this._installed.get(pluginName);
    if (!entry) return;

    const { plugin } = entry;

    // hooks 해제
    if (plugin.hooks) {
      for (const [hookName, fn] of Object.entries(plugin.hooks)) {
        this._unregisterHook(hookName, fn);
      }
    }

    if (typeof plugin.uninstall === 'function') {
      plugin.uninstall(this._core);
    }

    this._installed.delete(pluginName);
  }

  /** @returns {boolean} */
  has(pluginName) {
    return this._installed.has(pluginName);
  }

  /** @returns {Object|null} */
  get(pluginName) {
    return this._installed.get(pluginName)?.plugin ?? null;
  }

  /**
   * 훅 실행 - 체이닝 방식으로 데이터 변환
   * @param {string} hookName
   * @param {*} initialValue
   * @returns {*} 변환된 값
   */
  runHook(hookName, initialValue) {
    const handlers = this._hooks.get(hookName);
    if (!handlers || handlers.length === 0) return initialValue;

    return handlers.reduce((acc, fn) => {
      try {
        const result = fn(acc);
        return result !== undefined ? result : acc;
      } catch (err) {
        console.error(`[PluginManager] Error in hook "${hookName}":`, err);
        return acc;
      }
    }, initialValue);
  }

  /**
   * 훅 실행 - 단순 통지 방식 (반환값 무시)
   */
  callHook(hookName, ...args) {
    const handlers = this._hooks.get(hookName);
    if (!handlers) return;
    handlers.forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[PluginManager] Error in hook "${hookName}":`, err);
      }
    });
  }

  _registerHook(hookName, fn) {
    if (!this._hooks.has(hookName)) {
      this._hooks.set(hookName, []);
    }
    this._hooks.get(hookName).push(fn);
  }

  _unregisterHook(hookName, fn) {
    if (!this._hooks.has(hookName)) return;
    const filtered = this._hooks.get(hookName).filter((h) => h !== fn);
    this._hooks.set(hookName, filtered);
  }

  getInstalledNames() {
    return [...this._installed.keys()];
  }

  destroy() {
    for (const name of [...this._installed.keys()]) {
      this.unuse(name);
    }
    this._hooks.clear();
  }
}
