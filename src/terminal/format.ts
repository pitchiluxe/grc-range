/**
 * Text-table formatting helpers for the GRC Range terminal.
 *
 * The simulated terminal renders structured command output (user lists,
 * firewall rules, audit events, …) as aligned text tables so it looks like the
 * output of `Format-Table` in a real PowerShell console. This module owns that
 * rendering: it derives a column set from the rows, computes per-column widths,
 * and pads every cell so the headers and values line up with spaces — matching
 * PowerShell's default `Format-Table` style (no `|` separators).
 */

/** Union of value types that can appear in a table cell. */
type CellValue = string | number | boolean | null | undefined;

/**
 * Render a value for tabular display. Objects and arrays are JSON-stringified
 * so complex cells do not blow up the layout; everything else uses its natural
 * string form. `null`/`undefined` render as an empty cell.
 */
function toCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Format an array of objects as an aligned text table, PowerShell-style.
 *
 * The column set is the union of keys across all rows, preserving first-seen
 * order so callers control column ordering by structuring the first row. Each
 * column is sized to its widest cell (capped to keep very long fields from
 * wrecking the layout), headers are upper-cased like `Format-Table`, and
 * columns are separated by two spaces. An empty input yields an empty string.
 *
 * @example
 * formatTable([{ Name: 'svc_backup', Enabled: true }])
 * // => "Name       Enabled\n----       -------\nsvc_backup  True"
 */
export function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  // Collect the ordered union of keys across all rows.
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  if (keys.length === 0) return '';

  // Pre-render every cell so widths are measured against final strings.
  const headerCells = keys.map((k) => k.toUpperCase());
  const bodyCells = rows.map((row) => keys.map((k) => toCell(row[k])));

  // Cap column width so a single huge cell does not stretch the whole table.
  const MAX_COL = 48;
  const widths = keys.map((_, col) => {
    let w = headerCells[col]!.length;
    for (const cells of bodyCells) {
      const cell = cells[col] ?? '';
      w = Math.max(w, cell.length);
    }
    return Math.min(w, MAX_COL);
  });

  const pad = (s: string, col: number): string => {
    const width = widths[col]!;
    return s.length > width ? s.slice(0, width) : s.padEnd(width, ' ');
  };

  // Header row, separator row, then one row per record — two-space gutters.
  const gutter = '  ';
  const lines: string[] = [];
  lines.push(headerCells.map((h, c) => pad(h, c)).join(gutter));
  lines.push(keys.map((_, c) => '-'.repeat(widths[c]!)).join(gutter));
  for (const cells of bodyCells) {
    lines.push(cells.map((cell, c) => pad(cell, c)).join(gutter));
  }

  return lines.join('\n');
}
