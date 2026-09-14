/**
 * Small DOM helpers shared by the newer GRC Range console windows (Cloud,
 * Continuous Monitoring, Vendor Risk, Access Review, Control Testing).
 *
 * The original consoles (Risk Register, Compliance Mapper, ...) each hand-roll
 * their own copies of these same helpers inline. Rather than paste the same
 * ~40 lines into five more files, this module centralizes them for every
 * console added from here on. Existing consoles are left untouched.
 */

import { getTheme } from '@/ui/themes';

/** Color for a severity label, using the active theme's palette. */
export function severityColor(
  severity: 'Critical' | 'High' | 'Medium' | 'Low',
): string {
  const theme = getTheme();
  switch (severity) {
    case 'Critical':
      return theme.danger;
    case 'High':
      return '#f97316';
    case 'Medium':
      return theme.warning;
    case 'Low':
      return theme.success;
  }
}

/** Build a labeled form field wrapper (`<label>` + slot for the input). */
export function makeField(label: string): HTMLElement {
  const theme = getTheme();
  const field = document.createElement('div');
  field.style.marginBottom = '12px';
  const l = document.createElement('label');
  l.textContent = label;
  l.style.display = 'block';
  l.style.fontSize = '13px';
  l.style.color = theme.textDim;
  l.style.marginBottom = '4px';
  field.appendChild(l);
  return field;
}

/** Apply the shared themed look to a text/select/textarea form control. */
export function styleInput(el: HTMLElement): void {
  const theme = getTheme();
  el.style.width = '100%';
  el.style.padding = '6px 8px';
  el.style.background = theme.bg;
  el.style.color = theme.text;
  el.style.border = `1px solid ${theme.border}`;
  el.style.borderRadius = '4px';
  el.style.fontSize = '13px';
  (el as HTMLElement).style.boxSizing = 'border-box';
}

/** Trigger a text file download in the browser. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build the standard console header bar (title + right-aligned action buttons). */
export function makeHeader(title: string): { header: HTMLElement; btnRow: HTMLElement } {
  const theme = getTheme();
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '8px 16px';
  header.style.background = theme.bg;
  header.style.borderBottom = `1px solid ${theme.border}`;

  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.fontWeight = '600';
  titleEl.style.fontSize = '15px';
  header.appendChild(titleEl);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';
  header.appendChild(btnRow);

  return { header, btnRow };
}

/** Build a themed action button. `variant` picks accent/danger/neutral styling. */
export function makeButton(
  label: string,
  variant: 'primary' | 'danger' | 'neutral' = 'neutral',
): HTMLButtonElement {
  const theme = getTheme();
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.padding = '5px 14px';
  btn.style.border = variant === 'neutral' ? `1px solid ${theme.border}` : 'none';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '13px';
  if (variant === 'primary') {
    btn.style.background = theme.accent;
    btn.style.color = '#fff';
  } else if (variant === 'danger') {
    btn.style.background = theme.danger;
    btn.style.color = '#fff';
  } else {
    btn.style.background = theme.surfaceHover;
    btn.style.color = theme.text;
  }
  return btn;
}
