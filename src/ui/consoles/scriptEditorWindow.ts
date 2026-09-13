/**
 * PowerShell ISE (Script Editor) console window for the GRC Range desktop.
 *
 * A script editor for running multi-line PowerShell scripts. It has an
 * editable textarea for scripts at the top, an output area at the bottom, a
 * Run button (also triggered by F5), a Clear button, and a templates dropdown
 * pre-loaded with audit scripts. It uses the same dispatcher as the terminal.
 */

import { getTheme } from '@/ui/themes';
import { dispatch, type GrcCapabilityContext, type DispatchResult } from '@/terminal/dispatcher';
import { createShellState, type ShellState } from '@/terminal/shellIntrinsics';
import type { AclEntry } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/** Pre-loaded script templates. */
const TEMPLATES: { name: string; code: string }[] = [
  {
    name: 'Full Audit Script',
    code: [
      '# Full GRC Audit Script',
      '# Discovers users, password policy, ACLs, and firewall rules.',
      'Write-Host "=== Local Users ==="',
      'Get-LocalUser',
      'Write-Host ""',
      'Write-Host "=== Administrators Group ==="',
      'net localgroup Administrators',
      'Write-Host ""',
      'Write-Host "=== Password Policy ==="',
      'net accounts',
      'Write-Host ""',
      'Write-Host "=== Finance_Share ACL ==="',
      'icacls C:\\GRC_Lab_Data\\Finance_Share',
      'Write-Host ""',
      'Write-Host "=== HR_Records ACL ==="',
      'icacls C:\\GRC_Lab_Data\\HR_Records',
      'Write-Host ""',
      'Write-Host "=== Firewall Rules ==="',
      'Get-NetFirewallRule',
    ].join('\n'),
  },
  {
    name: 'CIS Benchmark Check',
    code: [
      '# CIS Benchmark Check',
      '# Runs the mock CIS benchmark and lists findings.',
      'Invoke-CISCheck',
    ].join('\n'),
  },
  {
    name: 'Remediation Script',
    code: [
      '# Remediation Script',
      '# Fixes ACLs, firewall, password policy, and admin group.',
      'Write-Host "Fixing Finance_Share ACL..."',
      'Repair-GRCFinding -Id FND-001',
      'Write-Host "Fixing HR_Records ACL..."',
      'Repair-GRCFinding -Id FND-002',
      'Write-Host "Removing temp_admin from Administrators..."',
      'Repair-GRCFinding -Id FND-003',
      'Write-Host "Fixing password policy..."',
      'Repair-GRCFinding -Id FND-004',
      'Write-Host "Disabling FTP/Telnet firewall rules..."',
      'Repair-GRCFinding -Id FND-005',
      'Write-Host "Remediation complete. Re-run Invoke-CISCheck to verify."',
    ].join('\n'),
  },
  {
    name: 'Risk Assessment Script',
    code: [
      '# Risk Assessment Script',
      '# Lists findings and calculates risk scores.',
      'Write-Host "=== Compliance Findings ==="',
      'Get-LocalUser | findstr /i "admin"',
      'Write-Host ""',
      'Write-Host "=== Audit Events ==="',
      'Get-WinEvent | select -First 5',
      'Write-Host ""',
      'Write-Host "=== CIS Check ==="',
      'Invoke-CISCheck',
    ].join('\n'),
  },
];

/**
 * Build a GRC capability context from the live service bundle.
 *
 * Same adapter used by the terminal window: the mock filesystem methods return
 * `| undefined`, but the dispatcher's `fs` facade expects non-optional values.
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
 * Render the Script Editor (PowerShell ISE) window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderScriptEditorWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.gap = '8px';
  toolbar.style.padding = '6px 12px';
  toolbar.style.background = theme.bg;
  toolbar.style.borderBottom = `1px solid ${theme.border}`;

  const runBtn = document.createElement('button');
  runBtn.textContent = '\u25B6 Run (F5)';
  runBtn.style.padding = '5px 14px';
  runBtn.style.background = theme.success;
  runBtn.style.color = '#fff';
  runBtn.style.border = 'none';
  runBtn.style.borderRadius = '4px';
  runBtn.style.cursor = 'pointer';
  runBtn.style.fontSize = '13px';
  runBtn.style.fontWeight = '600';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.style.padding = '5px 14px';
  clearBtn.style.background = theme.surfaceHover;
  clearBtn.style.color = theme.text;
  clearBtn.style.border = `1px solid ${theme.border}`;
  clearBtn.style.borderRadius = '4px';
  clearBtn.style.cursor = 'pointer';
  clearBtn.style.fontSize = '13px';

  const templateLabel = document.createElement('label');
  templateLabel.textContent = 'Templates:';
  templateLabel.style.fontSize = '13px';
  templateLabel.style.color = theme.textDim;

  const templateSelect = document.createElement('select');
  templateSelect.style.padding = '4px 8px';
  templateSelect.style.background = theme.surface;
  templateSelect.style.color = theme.text;
  templateSelect.style.border = `1px solid ${theme.border}`;
  templateSelect.style.borderRadius = '4px';
  templateSelect.style.fontSize = '13px';

  const defaultOpt = document.createElement('option');
  defaultOpt.textContent = '-- Select a template --';
  defaultOpt.value = '';
  templateSelect.appendChild(defaultOpt);

  for (const tpl of TEMPLATES) {
    const opt = document.createElement('option');
    opt.textContent = tpl.name;
    opt.value = tpl.name;
    templateSelect.appendChild(opt);
  }

  toolbar.appendChild(runBtn);
  toolbar.appendChild(clearBtn);
  toolbar.appendChild(templateLabel);
  toolbar.appendChild(templateSelect);
  body.appendChild(toolbar);

  // Editor pane
  const editor = document.createElement('textarea');
  editor.style.height = '40%';
  editor.style.width = '100%';
  editor.style.resize = 'none';
  editor.style.border = 'none';
  editor.style.borderBottom = `1px solid ${theme.border}`;
  editor.style.outline = 'none';
  editor.style.padding = '12px';
  editor.style.background = theme.bg;
  editor.style.color = theme.text;
  editor.style.fontFamily = "'Consolas', 'Courier New', monospace";
  editor.style.fontSize = '13px';
  editor.style.lineHeight = '1.5';
  editor.spellcheck = false;
  editor.placeholder = '# Type or load a PowerShell script, then press Run (F5)';
  body.appendChild(editor);

  // Output pane
  const outputLabel = document.createElement('div');
  outputLabel.style.padding = '4px 12px';
  outputLabel.style.background = theme.bg;
  outputLabel.style.fontSize = '12px';
  outputLabel.style.color = theme.textDim;
  outputLabel.style.borderBottom = `1px solid ${theme.border}`;
  outputLabel.textContent = 'Output';
  body.appendChild(outputLabel);

  const output = document.createElement('div');
  output.style.flex = '1';
  output.style.overflow = 'auto';
  output.style.padding = '8px 12px';
  output.style.background = '#0c0c0c';
  output.style.color = '#cccccc';
  output.style.fontFamily = "'Consolas', 'Courier New', monospace";
  output.style.fontSize = '13px';
  output.style.lineHeight = '1.45';
  output.style.whiteSpace = 'pre-wrap';
  output.style.wordBreak = 'break-word';
  body.appendChild(output);

  const ctx = buildContext(services);
  const shell: ShellState = createShellState();

  function appendOutput(text: string, color?: string): void {
    const line = document.createElement('div');
    line.style.whiteSpace = 'pre-wrap';
    line.style.wordBreak = 'break-word';
    if (color) line.style.color = color;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function runScript(): void {
    const code = editor.value;
    if (code.trim() === '') {
      appendOutput('No script to run.', '#f59e0b');
      return;
    }
    appendOutput('PS > Running script...', '#16c60c');

    // Split into lines and run each non-empty, non-comment line.
    // For multi-line scripts, we run each statement through the dispatcher.
    const lines = code.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;

      const result: DispatchResult = dispatch(trimmed, ctx, shell);
      if (result.output) {
        if (result.ok) {
          appendOutput(result.output, '#cccccc');
        } else {
          appendOutput(result.output, '#e74856');
        }
      }
      if (result.control === 'clear') {
        output.innerHTML = '';
      }
    }
    appendOutput('PS > Script complete.', '#16c60c');
  }

  runBtn.addEventListener('click', runScript);
  clearBtn.addEventListener('click', () => {
    output.innerHTML = '';
  });

  templateSelect.addEventListener('change', () => {
    const name = templateSelect.value;
    if (!name) return;
    const tpl = TEMPLATES.find((t) => t.name === name);
    if (tpl) {
      editor.value = tpl.code;
    }
  });

  // F5 to run
  body.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      runScript();
    }
  });

  // Load the first template by default
  editor.value = TEMPLATES[0]!.code;
}
