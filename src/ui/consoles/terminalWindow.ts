/**
 * PowerShell Terminal console window for the GRC Range desktop.
 *
 * A working terminal that dispatches commands through the GRC Range
 * dispatcher. It renders a dark terminal area with Consolas monospace font, a
 * PowerShell-style command prompt showing the current path, command history
 * (up/down arrows), and an auto-scrolling output area.
 *
 * The terminal builds a {@link GrcCapabilityContext} from the live
 * {@link GrcServices} instance so commands operate on the same mock state as
 * every other console window.
 */

import { getTheme } from '@/ui/themes';
import { dispatch, type GrcCapabilityContext, type DispatchResult } from '@/terminal/dispatcher';
import { createShellState, type ShellState } from '@/terminal/shellIntrinsics';
import type { AclEntry } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/**
 * Build a GRC capability context from the live service bundle.
 *
 * The dispatcher's `fs` facade expects non-optional return types, so the mock
 * filesystem methods (which return `| undefined`) are wrapped to coerce
 * missing results into empty arrays / empty strings.
 */
function buildContext(services: GrcServices): GrcCapabilityContext {
  return {
    users: services.users,
    firewall: services.firewall,
    password: services.password,
    audit: services.audit,
    compliance: services.compliance,
    fs: {
      getAcl: (path: string) => services.fs.getAcl(path) ?? [],
      setAcl: (path: string, acl: AclEntry[]) => { services.fs.setAcl(path, acl); },
      readFile: (path: string) => services.fs.readFile(path) ?? '',
      listDir: (path: string) => services.fs.listDir(path) ?? [],
    },
    actor: 'admin',
  };
}

/**
 * Render the PowerShell Terminal window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderTerminalWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Consolas', 'Courier New', monospace";
  body.style.background = '#0c0c0c';
  body.style.color = '#cccccc';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.fontSize = '14px';
  body.style.overflow = 'hidden';

  const ctx = buildContext(services);
  const shell: ShellState = createShellState();

  // Output area
  const output = document.createElement('div');
  output.style.flex = '1';
  output.style.overflow = 'auto';
  output.style.padding = '8px 12px';
  output.style.lineHeight = '1.45';

  // Input line container
  const inputLine = document.createElement('div');
  inputLine.style.display = 'flex';
  inputLine.style.alignItems = 'center';
  inputLine.style.padding = '4px 12px 8px';
  inputLine.style.borderTop = '1px solid #1a1a1a';

  const promptSpan = document.createElement('span');
  promptSpan.style.color = '#16c60c';
  promptSpan.style.whiteSpace = 'pre';
  promptSpan.style.marginRight = '6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.autofocus = true;
  input.spellcheck = false;
  input.style.flex = '1';
  input.style.background = 'transparent';
  input.style.border = 'none';
  input.style.outline = 'none';
  input.style.color = '#cccccc';
  input.style.fontFamily = "'Consolas', 'Courier New', monospace";
  input.style.fontSize = '14px';
  input.style.caretColor = '#cccccc';

  inputLine.appendChild(promptSpan);
  inputLine.appendChild(input);

  // Command history
  const history: string[] = [];
  let historyIndex = -1;

  function updatePrompt(): void {
    promptSpan.textContent = `PS ${shell.cwd.path}>`;
  }

  function appendLine(text: string, color?: string): void {
    const line = document.createElement('div');
    line.style.whiteSpace = 'pre-wrap';
    line.style.wordBreak = 'break-word';
    if (color) line.style.color = color;
    line.textContent = text;
    output.appendChild(line);
  }

  function scrollToBottom(): void {
    output.scrollTop = output.scrollHeight;
  }

  function runCommand(line: string): void {
    // Echo the command
    const echo = document.createElement('div');
    echo.style.whiteSpace = 'pre-wrap';
    const echoPrompt = document.createElement('span');
    echoPrompt.style.color = '#16c60c';
    echoPrompt.textContent = `PS ${shell.cwd.path}>`;
    const echoSpace = document.createTextNode(' ');
    const echoText = document.createElement('span');
    echoText.style.color = '#cccccc';
    echoText.textContent = line;
    echo.appendChild(echoPrompt);
    echo.appendChild(echoSpace);
    echo.appendChild(echoText);
    output.appendChild(echo);

    if (line.trim() === '') {
      scrollToBottom();
      return;
    }

    history.push(line);
    historyIndex = history.length;

    const result: DispatchResult = dispatch(line, ctx, shell);

    if (result.control === 'clear') {
      output.innerHTML = '';
      updatePrompt();
      scrollToBottom();
      return;
    }

    if (result.control === 'exit') {
      appendLine('Closing terminal session...', '#f59e0b');
      scrollToBottom();
      // The window manager handles closing; we just stop accepting input.
      input.disabled = true;
      return;
    }

    if (result.output) {
      if (result.ok) {
        appendLine(result.output);
      } else {
        const errSpan = document.createElement('span');
        errSpan.style.color = '#e74856';
        errSpan.textContent = result.output;
        const errDiv = document.createElement('div');
        errDiv.style.whiteSpace = 'pre-wrap';
        errDiv.style.wordBreak = 'break-word';
        errDiv.appendChild(errSpan);
        output.appendChild(errDiv);
      }
    }

    updatePrompt();
    scrollToBottom();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const line = input.value;
      input.value = '';
      runCommand(line);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex] ?? '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex] ?? '';
      } else {
        historyIndex = history.length;
        input.value = '';
      }
    }
  });

  // Click anywhere in the body focuses the input
  body.addEventListener('click', () => {
    if (!input.disabled) input.focus();
  });

  body.appendChild(output);
  body.appendChild(inputLine);

  // Welcome banner
  appendLine('Windows PowerShell', '#cccccc');
  appendLine('(c) Microsoft Corporation. All rights reserved.', '#8b919e');
  appendLine('', '#8b919e');
  appendLine('GRC Range simulated terminal. Type "help" for available commands.', '#f59e0b');
  appendLine('', '#8b919e');

  updatePrompt();
  scrollToBottom();
}
