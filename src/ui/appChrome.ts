/**
 * Shared window-body styling for the GRC Range desktop shell.
 *
 * Every GRC console window (audit console, compliance mapper, risk register,
 * terminal, etc.) renders its content inside a window body `<div>`. Rather
 * than each app re-defining buttons, inputs, tables, and scrollbars, this
 * module injects a single `<style>` tag with a set of scoped CSS rules that
 * all window bodies share.
 *
 * The rules use the CSS custom properties defined by {@link
 * src/ui/themes.ts} (`--grc-*`) so they automatically pick up the active
 * theme. `installAppChrome()` is idempotent — it checks for an existing
 * `<style id="grc-app-chrome">` tag before injecting.
 */

/** The id used for the injected style element (for idempotency). */
const STYLE_ID = 'grc-app-chrome';

/**
 * Inject the shared window-body CSS into the document head.
 *
 * Safe to call multiple times — subsequent calls are no-ops once the
 * `<style>` element exists. The CSS covers:
 *
 *  - Segoe UI font family for all window bodies
 *  - Dark, thin scrollbars
 *  - Common button, input, select, and textarea styles
 *  - Table styles for data grids (audit log, findings, etc.)
 *  - Heading and paragraph styles
 *  - Code / terminal monospace styles
 *  - Badge / pill styles for severity labels
 */
export function installAppChrome(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** The shared CSS text, kept as a constant for readability. */
const CSS = `
/* ---- GRC Range shared window-body styles -------------------------------- */

.grc-window-body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  font-size: 13px;
  color: var(--grc-text, #e6edf3);
  background: var(--grc-surface, #161b22);
  padding: 16px;
  overflow: auto;
  box-sizing: border-box;
  line-height: 1.55;
  letter-spacing: 0.01em;
}

.grc-window-body * {
  box-sizing: border-box;
}

/* ---- Scrollbars --------------------------------------------------------- */

.grc-window-body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.grc-window-body::-webkit-scrollbar-track {
  background: var(--grc-bg, #0d1117);
  border-left: 1px solid var(--grc-border-subtle, #21262d);
}
.grc-window-body::-webkit-scrollbar-thumb {
  background: var(--grc-border, #30363d);
  border-radius: 5px;
  border: 2px solid var(--grc-bg, #0d1117);
}
.grc-window-body::-webkit-scrollbar-thumb:hover {
  background: var(--grc-text-dim, #8b949e);
}
.grc-window-body::-webkit-scrollbar-corner {
  background: var(--grc-bg, #0d1117);
}

/* ---- Headings ----------------------------------------------------------- */

.grc-window-body h1,
.grc-window-body h2,
.grc-window-body h3,
.grc-window-body h4 {
  margin: 0 0 10px 0;
  font-weight: 600;
  color: var(--grc-text, #e6edf3);
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.grc-window-body h1 { font-size: 20px; letter-spacing: -0.02em; }
.grc-window-body h2 { font-size: 17px; }
.grc-window-body h3 { font-size: 15px; }
.grc-window-body h4 { font-size: 13px; color: var(--grc-text-dim, #8b949e); text-transform: uppercase; letter-spacing: 0.06em; }

.grc-window-body p {
  margin: 0 0 10px 0;
  line-height: 1.6;
}

/* ---- Buttons ------------------------------------------------------------ */

.grc-window-body button,
.grc-window-body .grc-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 7px 16px;
  border: 1px solid var(--grc-border, #30363d);
  border-radius: 6px;
  background: var(--grc-surface-elevated, #1c2330);
  color: var(--grc-text, #e6edf3);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
  outline: none;
}
.grc-window-body button:hover,
.grc-window-body .grc-btn:hover {
  background: var(--grc-surface-hover, #21283a);
  border-color: var(--grc-text-dim, #8b949e);
}
.grc-window-body button:active,
.grc-window-body .grc-btn:active {
  background: var(--grc-surface-hover, #21283a);
  transform: translateY(1px);
}
.grc-window-body button:focus-visible,
.grc-window-body .grc-btn:focus-visible {
  border-color: var(--grc-accent, #2f81f7);
  box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.25);
}
.grc-window-body button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.grc-window-body .grc-btn-primary {
  background: var(--grc-accent, #2f81f7);
  border-color: var(--grc-accent, #2f81f7);
  color: #fff;
  font-weight: 600;
}
.grc-window-body .grc-btn-primary:hover {
  background: var(--grc-accent-hover, #1f6feb);
  border-color: var(--grc-accent-hover, #1f6feb);
}
.grc-window-body .grc-btn-primary:active {
  background: var(--grc-accent-hover, #1f6feb);
}

.grc-window-body .grc-btn-danger {
  background: transparent;
  border-color: var(--grc-danger, #f85149);
  color: var(--grc-danger, #f85149);
}
.grc-window-body .grc-btn-danger:hover {
  background: var(--grc-danger, #f85149);
  color: #fff;
}

/* ---- Inputs ------------------------------------------------------------- */

.grc-window-body input[type="text"],
.grc-window-body input[type="password"],
.grc-window-body input[type="number"],
.grc-window-body select,
.grc-window-body textarea {
  font-family: inherit;
  font-size: 13px;
  padding: 7px 11px;
  border: 1px solid var(--grc-border, #30363d);
  border-radius: 6px;
  background: var(--grc-bg, #0d1117);
  color: var(--grc-text, #e6edf3);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.grc-window-body input::placeholder,
.grc-window-body textarea::placeholder {
  color: var(--grc-text-dim, #8b949e);
  opacity: 0.55;
}
.grc-window-body input:focus,
.grc-window-body select:focus,
.grc-window-body textarea:focus {
  border-color: var(--grc-accent, #2f81f7);
  box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.18);
}
.grc-window-body textarea {
  resize: vertical;
  min-height: 60px;
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
}

/* ---- Tables ------------------------------------------------------------- */

.grc-window-body table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  border: 1px solid var(--grc-border-subtle, #21262d);
  border-radius: 6px;
  overflow: hidden;
}
.grc-window-body th,
.grc-window-body td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--grc-border-subtle, #21262d);
}
.grc-window-body th {
  font-weight: 600;
  color: var(--grc-text-dim, #8b949e);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
  position: sticky;
  top: 0;
  background: var(--grc-surface-elevated, #1c2330);
  z-index: 1;
  border-bottom: 1px solid var(--grc-border, #30363d);
}
.grc-window-body tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}
.grc-window-body tbody tr:hover {
  background: var(--grc-surface-hover, #21283a);
}
.grc-window-body tbody tr:last-child td {
  border-bottom: none;
}

/* ---- Code / terminal ---------------------------------------------------- */

.grc-window-body code,
.grc-window-body pre,
.grc-window-body .grc-mono {
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
}
.grc-window-body pre {
  margin: 0;
  padding: 12px 14px;
  background: var(--grc-bg, #0d1117);
  border: 1px solid var(--grc-border-subtle, #21262d);
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
.grc-window-body code {
  background: var(--grc-bg, #0d1117);
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid var(--grc-border-subtle, #21262d);
}

/* ---- Badges / pills ----------------------------------------------------- */

.grc-window-body .grc-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}
.grc-window-body .grc-badge-critical {
  background: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
  border-color: rgba(248, 81, 73, 0.35);
}
.grc-window-body .grc-badge-high {
  background: rgba(251, 146, 60, 0.15);
  color: #ffa657;
  border-color: rgba(251, 146, 60, 0.35);
}
.grc-window-body .grc-badge-medium {
  background: rgba(210, 153, 34, 0.15);
  color: #e3b341;
  border-color: rgba(210, 153, 34, 0.35);
}
.grc-window-body .grc-badge-low {
  background: rgba(63, 185, 80, 0.15);
  color: #56d364;
  border-color: rgba(63, 185, 80, 0.35);
}
.grc-window-body .grc-badge-open {
  background: rgba(248, 81, 73, 0.15);
  color: #ff7b72;
  border-color: rgba(248, 81, 73, 0.35);
}
.grc-window-body .grc-badge-remediated {
  background: rgba(63, 185, 80, 0.15);
  color: #56d364;
  border-color: rgba(63, 185, 80, 0.35);
}

/* ---- Utility ----------------------------------------------------------- */

.grc-window-body .grc-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.grc-window-body .grc-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.grc-window-body .grc-spacer {
  flex: 1;
}
.grc-window-body .grc-muted {
  color: var(--grc-text-dim, #8b919e);
}
.grc-window-body .grc-danger-text {
  color: var(--grc-danger, #ef4444);
}
.grc-window-body .grc-success-text {
  color: var(--grc-success, #22c55e);
}
.grc-window-body .grc-warning-text {
  color: var(--grc-warning, #f59e0b);
}
`;
