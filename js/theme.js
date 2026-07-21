(function initializeTheme() {
  const THEME_KEY = "preferred-theme";
  const MODES = ["light", "dark", "system"];

  function getStoredMode() {
    try {
      const value = window.localStorage.getItem(THEME_KEY);
      return MODES.includes(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function getInitialMode() {
    const stored = getStoredMode();
    return stored || "system";
  }

  function resolveTheme(mode) {
    return mode === "system" ? getSystemTheme() : mode;
  }

  function getModeLabel(mode) {
    if (mode === "light") return "浅色模式";
    if (mode === "dark") return "暗黑模式";
    return "跟随系统";
  }

  function updateThemeControls(mode) {
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.dataset.mode = mode;
      button.title = getModeLabel(mode);
      button.setAttribute(
        "aria-label",
        `切换浅色/暗黑模式（当前为${getModeLabel(mode)}）`,
      );
    });
  }

  function applyTheme(mode, persist = false) {
    document.documentElement.dataset.theme = resolveTheme(mode);
    updateThemeControls(mode);
    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, mode);
      } catch (error) {
        // Private browsing can disable localStorage; the current page still switches theme.
      }
    }
  }

  applyTheme(getInitialMode());

  if (window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = getStoredMode();
      if (stored === "system" || stored === null) {
        document.documentElement.dataset.theme = getSystemTheme();
      }
    };
    if (media.addEventListener) {
      media.addEventListener("change", handler);
    } else if (media.addListener) {
      media.addListener(handler);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const current = button.dataset.mode || "system";
      updateThemeControls(current);
      button.addEventListener("click", () => {
        const mode = button.dataset.mode || "system";
        const nextMode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        applyTheme(nextMode, true);
      });
    });
  });
})();
