/**
 * Calculator console window for the GRC Range desktop.
 *
 * A working standard calculator with digits, operators, equals, and clear.
 * The calculator is a self-contained vanilla-DOM widget that maintains its own
 * display and expression state. It mirrors the Windows Calculator look.
 */

import { getTheme } from '@/ui/themes';
import type { GrcServices } from '@/vm/session';

/** Button layout for the calculator keypad. */
const KEYS: { label: string; value: string; kind: 'num' | 'op' | 'fn' }[] = [
  { label: 'C', value: 'C', kind: 'fn' },
  { label: '\u00B1', value: 'negate', kind: 'fn' },
  { label: '%', value: '%', kind: 'op' },
  { label: '\u00F7', value: '/', kind: 'op' },
  { label: '7', value: '7', kind: 'num' },
  { label: '8', value: '8', kind: 'num' },
  { label: '9', value: '9', kind: 'num' },
  { label: '\u00D7', value: '*', kind: 'op' },
  { label: '4', value: '4', kind: 'num' },
  { label: '5', value: '5', kind: 'num' },
  { label: '6', value: '6', kind: 'num' },
  { label: '\u2212', value: '-', kind: 'op' },
  { label: '1', value: '1', kind: 'num' },
  { label: '2', value: '2', kind: 'num' },
  { label: '3', value: '3', kind: 'num' },
  { label: '+', value: '+', kind: 'op' },
  { label: '0', value: '0', kind: 'num' },
  { label: '.', value: '.', kind: 'num' },
  { label: '=', value: '=', kind: 'fn' },
];

/**
 * Render the Calculator window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (unused).
 */
export function renderCalculatorWindow(body: HTMLElement, _services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';

  // Display
  const display = document.createElement('div');
  display.style.padding = '16px 20px';
  display.style.fontSize = '36px';
  display.style.textAlign = 'right';
  display.style.background = theme.bg;
  display.style.borderBottom = `1px solid ${theme.border}`;
  display.style.fontVariantNumeric = 'tabular-nums';
  display.style.minHeight = '72px';
  display.style.display = 'flex';
  display.style.alignItems = 'flex-end';
  display.style.justifyContent = 'flex-end';
  display.style.overflow = 'hidden';

  const displayValue = document.createElement('span');
  displayValue.textContent = '0';
  display.appendChild(displayValue);
  body.appendChild(display);

  // Expression preview line
  const exprLine = document.createElement('div');
  exprLine.style.padding = '0 20px 8px';
  exprLine.style.fontSize = '13px';
  exprLine.style.textAlign = 'right';
  exprLine.style.color = theme.textDim;
  exprLine.style.background = theme.bg;
  exprLine.style.minHeight = '20px';
  body.appendChild(exprLine);

  // Keypad
  const keypad = document.createElement('div');
  keypad.style.display = 'grid';
  keypad.style.gridTemplateColumns = 'repeat(4, 1fr)';
  keypad.style.gap = '1px';
  keypad.style.flex = '1';
  keypad.style.background = theme.border;
  keypad.style.padding = '1px';

  // Calculator state
  let current = '0';
  let previous: number | null = null;
  let operator: string | null = null;
  let justEvaluated = false;

  function updateDisplay(): void {
    displayValue.textContent = current;
    if (operator && previous !== null) {
      const sym = operator === '*' ? '\u00D7' : operator === '/' ? '\u00F7' : operator === '-' ? '\u2212' : operator;
      exprLine.textContent = `${previous} ${sym}`;
    } else {
      exprLine.textContent = '';
    }
  }

  function compute(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      case '%': return (a * b) / 100;
      default: return b;
    }
  }

  function handleKey(value: string): void {
    if (value >= '0' && value <= '9') {
      if (justEvaluated) {
        current = value;
        justEvaluated = false;
      } else {
        current = current === '0' ? value : current + value;
      }
    } else if (value === '.') {
      if (justEvaluated) {
        current = '0.';
        justEvaluated = false;
      } else if (!current.includes('.')) {
        current += '.';
      }
    } else if (value === 'C') {
      current = '0';
      previous = null;
      operator = null;
      justEvaluated = false;
    } else if (value === 'negate') {
      current = String(parseFloat(current) * -1);
    } else if (value === '=') {
      if (operator !== null && previous !== null) {
        const result = compute(previous, parseFloat(current), operator);
        current = Number.isNaN(result) ? 'Error' : String(result);
        previous = null;
        operator = null;
        justEvaluated = true;
      }
    } else {
      // operator
      if (operator !== null && previous !== null && !justEvaluated) {
        const result = compute(previous, parseFloat(current), operator);
        current = Number.isNaN(result) ? 'Error' : String(result);
      }
      previous = parseFloat(current);
      operator = value;
      justEvaluated = true;
    }
    updateDisplay();
  }

  for (const key of KEYS) {
    const btn = document.createElement('button');
    btn.textContent = key.label;
    btn.style.border = 'none';
    btn.style.fontSize = '20px';
    btn.style.cursor = 'pointer';
    btn.style.fontFamily = "'Segoe UI', sans-serif";
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'background 0.1s';

    if (key.kind === 'op') {
      btn.style.background = theme.surfaceHover;
      btn.style.color = theme.accent;
    } else if (key.kind === 'fn') {
      btn.style.background = theme.bg;
      btn.style.color = theme.textDim;
    } else {
      btn.style.background = theme.surface;
      btn.style.color = theme.text;
    }

    if (key.value === '=') {
      btn.style.background = theme.accent;
      btn.style.color = '#fff';
    }
    if (key.value === '0') {
      btn.style.gridColumn = 'span 3';
      btn.style.justifyContent = 'flex-start';
      btn.style.paddingLeft = '24px';
    }

    btn.addEventListener('mouseenter', () => {
      if (key.value !== '=') btn.style.background = theme.accentHover;
    });
    btn.addEventListener('mouseleave', () => {
      if (key.kind === 'op') btn.style.background = theme.surfaceHover;
      else if (key.kind === 'fn') btn.style.background = theme.bg;
      else btn.style.background = theme.surface;
      if (key.value === '=') {
        btn.style.background = theme.accent;
        btn.style.color = '#fff';
      }
    });
    btn.addEventListener('click', () => handleKey(key.value));
    keypad.appendChild(btn);
  }

  body.appendChild(keypad);
  updateDisplay();
}
