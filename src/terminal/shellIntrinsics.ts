/**
 * Built-in shell intrinsics for the GRC Range terminal.
 *
 * "Intrinsics" are the Windows / PowerShell commands the terminal answers
 * itself, without delegating to a GRC capability service. They cover the
 * everyday shell verbs a student expects to work in any PowerShell prompt —
 * `cls`, `dir`, `cd`, `type`, `whoami`, `ipconfig`, `systeminfo`, and so on —
 * plus a small in-memory mock filesystem rooted at `C:\` so `dir`/`cd`/`type`
 * have something realistic to show.
 *
 * The mock filesystem is intentionally simple: a fixed tree seeded with the
 * `C:\GRC_Lab_Data\` structure used by the lab exercises (Finance share with
 * PCI data, HR records with PII, SIEM samples, policies, logs, tools). It is
 * not meant to be a general-purpose FS — it exists so the terminal feels
 * alive when students explore before running audit cmdlets.
 */

import { VM_HOST } from '../config/vmHost';
import { formatTable } from './format';

/** Mutable shell state threaded through intrinsic invocations. */
export interface ShellState {
  /** Current working directory as a Windows path, e.g. `C:\GRC_Lab_Data`. */
  cwd: { path: string };
}

/**
 * Create a fresh shell state rooted at `C:\GRC_Lab_Data`, the lab's working
 * directory. The terminal keeps one of these per session.
 */
export function createShellState(): ShellState {
  return { cwd: { path: 'C:\\GRC_Lab_Data' } };
}

/* -------------------------------------------------------------------------- */
/* Mock filesystem                                                             */
/* -------------------------------------------------------------------------- */

/** A directory entry in the in-memory filesystem tree. */
interface FsDir {
  /** Absolute Windows path of this directory, e.g. `C:\GRC_Lab_Data`. */
  path: string;
  /** Child directories keyed by name. */
  dirs: Map<string, FsDir>;
  /** Child files keyed by name. */
  files: Map<string, string>;
}

/** Normalise a Windows path to a canonical form for lookups. */
function normalise(path: string): string {
  let p = path.trim().replace(/\//g, '\\');
  // Collapse repeated backslashes, but preserve the leading `\\` UNC case is
  // not needed here — all lab paths are drive-relative.
  p = p.replace(/\\+/g, '\\');
  if (p.length > 1 && p.endsWith('\\')) p = p.slice(0, -1);
  return p;
}

/**
 * Resolve a (possibly relative) path against a base directory into an absolute
 * Windows path. Handles `.`, `..`, drive changes, and bare names.
 */
function resolve(base: string, target: string): string {
  const t = normalise(target);
  if (t === '') return base;
  if (/^[A-Za-z]:/.test(t)) return t; // absolute drive path

  const parts = normalise(base).split('\\');
  for (const seg of t.split('\\')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      // Do not pop past the drive root (`C:`).
      if (parts.length > 1) parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.join('\\');
}

/** Build the seeded filesystem tree once at module load. */
function buildTree(): FsDir {
  const root: FsDir = { path: 'C:\\', dirs: new Map(), files: new Map() };

  const lab = mkDir(root, 'GRC_Lab_Data');
  mkDir(lab, 'Finance_Share');
  mkDir(lab, 'HR_Records');
  mkDir(lab, 'Tools');
  mkDir(lab, 'Logs');
  mkDir(lab, 'Policies');
  mkDir(lab, 'SIEM_Samples');

  // Seed files with synthetic lab data (PCI / PII / event samples).
  setFile(lab, 'README.md', README_CONTENT);
  setFile(
    lab.dirs.get('Finance_Share')!,
    'credit_cards.txt',
    FINANCE_CARDS_CONTENT,
  );
  setFile(
    lab.dirs.get('HR_Records')!,
    'employee_ssn.csv',
    HR_SSN_CONTENT,
  );
  setFile(
    lab.dirs.get('SIEM_Samples')!,
    'security_events.csv',
    SIEM_EVENTS_CONTENT,
  );
  setFile(lab.dirs.get('Policies')!, 'password_policy.txt', POLICY_CONTENT);
  setFile(lab.dirs.get('Logs')!, 'setup.log', LOG_CONTENT);

  return root;
}

/** Create and attach a child directory, returning it. */
function mkDir(parent: FsDir, name: string): FsDir {
  const path = parent.path === 'C:\\' ? `C:\\${name}` : `${parent.path}\\${name}`;
  const dir: FsDir = { path, dirs: new Map(), files: new Map() };
  parent.dirs.set(name, dir);
  return dir;
}

/** Attach (or overwrite) a file under a directory. */
function setFile(dir: FsDir, name: string, content: string): void {
  dir.files.set(name, content);
}

/** Look up a directory node by absolute path, or `null` if missing. */
function findDir(absPath: string): FsDir | null {
  const p = normalise(absPath);
  if (p === 'C:\\' || p === 'C:') return TREE;

  const parts = p.split('\\').filter((s) => s !== '' && !s.endsWith(':'));
  let cur: FsDir = TREE;
  for (const part of parts) {
    const next = cur.dirs.get(part);
    if (!next) return null;
    cur = next;
  }
  return cur;
}

/** Look up a file's content by absolute path, or `null` if missing. */
function findFile(absPath: string): string | null {
  const p = normalise(absPath);
  const lastSlash = p.lastIndexOf('\\');
  if (lastSlash < 0) return null;
  const dirPath = p.slice(0, lastSlash);
  const name = p.slice(lastSlash + 1);
  const dir = findDir(dirPath);
  if (!dir) return null;
  return dir.files.get(name) ?? null;
}

/**
 * The in-memory mock filesystem exposed to the terminal layer.
 *
 * All paths are Windows-style (`C:\…`). Relative paths are resolved against
 * the current working directory tracked by the shell state.
 */
export const FS = {
  /** Return the absolute path of the current working directory. */
  getCwd(): string {
    return cwdHolder.path;
  },
  /** Set the current working directory (absolute path expected). */
  setCwd(path: string): void {
    cwdHolder.path = normalise(path);
  },
  /**
   * List the names of immediate children (dirs first, then files) of a path.
   * Returns an empty array if the path does not exist.
   */
  listDir(path: string): string[] {
    const dir = findDir(resolve(cwdHolder.path, path));
    if (!dir) return [];
    const names = [...dir.dirs.keys(), ...dir.files.keys()];
    return names.sort((a, b) => a.localeCompare(b));
  },
  /**
   * Read a file's contents. Returns the empty string if the file is missing so
   * callers can render a PowerShell-style "cannot find path" error themselves.
   */
  readFile(path: string): string {
    return findFile(resolve(cwdHolder.path, path)) ?? '';
  },
  /** True when the path resolves to an existing file or directory. */
  exists(path: string): boolean {
    const abs = resolve(cwdHolder.path, path);
    return findDir(abs) !== null || findFile(abs) !== null;
  },
};

/** Internal cwd holder shared with {@link FS}. Set via `FS.setCwd`. */
const cwdHolder: { path: string } = { path: 'C:\\GRC_Lab_Data' };

/* -------------------------------------------------------------------------- */
/* Seeded file contents                                                        */
/* -------------------------------------------------------------------------- */

const README_CONTENT = `# GRC Lab Data

This directory holds the synthetic data sets used by the GRC Range lab.
All data is fictional and for training purposes only.

Subdirectories:
  Finance_Share  - PCI-DSS cardholder data (intentionally exposed)
  HR_Records     - PII / PHI employee records (intentionally exposed)
  SIEM_Samples   - Sample Windows security event exports
  Policies       - Local security policy reference files
  Logs           - Setup and configuration logs
  Tools          - Audit helper scripts
`;

const FINANCE_CARDS_CONTENT = `# Synthetic cardholder data — PCI DSS training set
# WARNING: This file should NOT be world-readable. It is intentionally
# mis-permissioned so students can find it with icacls and remediate.
card_number,expiry,cvv,holder
4111111111111111,12/27,123,Jane Doe
5555555555554444,03/28,456,John Smith
4012888888881881,07/26,789,Akira Tanaka
`;

const HR_SSN_CONTENT = `employee_id,full_name,ssn,dob,department
E1001,Jane Doe,123-45-6789,1985-04-12,Finance
E1002,John Smith,987-65-4321,1979-11-30,HR
E1003,Akira Tanaka,555-44-3322,1990-02-18,Security
E1004,Maria Garcia,222-11-4455,1982-09-07,Operations
`;

const SIEM_EVENTS_CONTENT = `timestamp,event_id,level,account,message
2024-05-01T08:14:22,4624,Information,omari\\jdoe,An account was successfully logged on.
2024-05-01T08:15:03,4672,Information,omari\\svc_backup,Special privileges assigned to new logon.
2024-05-01T08:22:41,4625,Warning,omari\\unknown,An account failed to log on.
2024-05-01T09:01:55,4720,Information,omari\\jdoe,A user account was created.
`;

const POLICY_CONTENT = `Password must meet complexity requirements: Disabled
Minimum password length: 7
Maximum password age: 42 days
`;

const LOG_CONTENT = `2024-05-01 08:00:00 GRC-Lab setup started.
2024-05-01 08:05:00 Seeded user accounts.
2024-05-01 08:10:00 Seeded firewall rules.
2024-05-01 08:12:00 WARNING: Finance_Share permissions left open for lab.
`;

/** Root of the seeded filesystem tree, built once the content blobs exist. */
const TREE = buildTree();

/* -------------------------------------------------------------------------- */
/* Intrinsic command registry                                                  */
/* -------------------------------------------------------------------------- */

/** Result of running an intrinsic. `null` means "not an intrinsic". */
export interface IntrinsicResult {
  ok: boolean;
  output: string;
  control?: 'clear' | 'exit';
}

/**
 * Help entries for the built-in intrinsics, as `[command, description]` pairs.
 * Surfaced by the `help` intrinsic and by the dispatcher's help fallback.
 */
export const INTRINSIC_HELP: [string, string][] = [
  ['cls / clear', 'Clear the screen'],
  ['exit', 'Exit the terminal session'],
  ['help / get-help', 'Show available commands'],
  ['dir / ls / Get-ChildItem', 'List directory contents'],
  ['cd', 'Change the current directory'],
  ['pwd / Get-Location', 'Print the current directory'],
  ['type / cat / Get-Content', 'Print the contents of a file'],
  ['whoami', 'Print the current user'],
  ['hostname', 'Print the host name'],
  ['echo / Write-Host', 'Print text to the console'],
  ['ipconfig', 'Display network configuration'],
  ['systeminfo', 'Display system information'],
];

/** Current actor shown by `whoami` (overridable by the dispatcher). */
const DEFAULT_ACTOR = 'omari\\admin';

/**
 * Run a built-in shell intrinsic by name.
 *
 * Returns `null` when `name` is not a recognised intrinsic, so the dispatcher
 * can fall through to the GRC capability layer. The `ctx` argument carries the
 * GRC capability context (intrinsics ignore it except for `whoami`, which uses
 * `ctx.actor` if present) and `cwd` is the live shell working directory.
 */
export function runIntrinsic(
  name: string,
  positional: string[],
  ctx: unknown,
  cwd: { path: string },
  args: Record<string, string>,
): IntrinsicResult | null {
  // Keep the FS cwd in sync with the shell state on every call.
  FS.setCwd(cwd.path);

  const cmd = name.toLowerCase();
  const actor =
    (ctx as { actor?: string } | null)?.actor ?? DEFAULT_ACTOR;

  switch (cmd) {
    case 'cls':
    case 'clear':
      return { ok: true, output: '', control: 'clear' };

    case 'exit':
      return { ok: true, output: '', control: 'exit' };

    case 'help':
    case 'get-help': {
      const lines = [
        'GRC Range — available commands',
        '',
        'Built-in shell commands:',
        ...INTRINSIC_HELP.map(([c, d]) => `  ${c.padEnd(28)} ${d}`),
        '',
        'GRC capability cmdlets (run with -? for details):',
        '  Get-LocalUser, Get-LocalGroupMember, net accounts, icacls,',
        '  Get-NetFirewallRule, netstat -ano, auditpol, Get-Acl, Get-WinEvent,',
        '  Invoke-CISCheck, Set-LocalUser, Remove-LocalGroupMember,',
        '  Set-NetFirewallRule, secedit, Repair-GRCFinding, New-GRCRisk',
      ];
      return { ok: true, output: lines.join('\n') };
    }

    case 'dir':
    case 'ls':
    case 'get-childitem': {
      const target = positional[0] ?? '.';
      const abs = resolve(cwd.path, target);
      const dir = findDir(abs);
      if (!dir) {
        return psError(
          `Get-ChildItem`,
          `Cannot find path '${target}' because it does not exist.`,
        );
      }
      const rows: Record<string, unknown>[] = [];
      for (const [name, child] of dir.dirs) {
        rows.push({ Mode: 'd----', Name: name, Length: '' });
      }
      for (const [name, content] of dir.files) {
        rows.push({
          Mode: '-a---',
          Name: name,
          Length: content.length,
        });
      }
      const header = `\n    Directory: ${abs}\n\n`;
      return {
        ok: true,
        output: header + formatTable(rows) + `\n\n    ${
          rows.length
        } item${rows.length === 1 ? '' : 's'}`,
      };
    }

    case 'cd':
    case 'set-location': {
      const target = positional[0];
      if (!target) {
        // Bare `cd` prints the cwd like PowerShell when no home is set.
        return { ok: true, output: cwd.path };
      }
      const abs = resolve(cwd.path, target);
      if (!findDir(abs)) {
        return psError(
          'Set-Location',
          `Cannot find path '${target}' because it does not exist.`,
        );
      }
      cwd.path = abs;
      FS.setCwd(abs);
      return { ok: true, output: '' };
    }

    case 'pwd':
    case 'get-location':
      return { ok: true, output: cwd.path };

    case 'type':
    case 'cat':
    case 'get-content': {
      const target = positional[0];
      if (!target) {
        return psError('Get-Content', 'A positional parameter cannot be found that accepts argument "".');
      }
      const content = FS.readFile(target);
      if (content === '' && !FS.exists(target)) {
        return psError(
          'Get-Content',
          `Cannot find path '${target}' because it does not exist.`,
        );
      }
      return { ok: true, output: content };
    }

    case 'whoami':
      return { ok: true, output: actor };

    case 'hostname':
      return { ok: true, output: VM_HOST.hostname };

    case 'echo':
    case 'write-host':
      return { ok: true, output: positional.join(' ') };

    case 'ipconfig': {
      const out = [
        '',
        `Windows IP Configuration`,
        '',
        `Ethernet adapter Ethernet0:`,
        '',
        `   Connection-specific DNS Suffix  . : ${VM_HOST.domain}`,
        `   IPv4 Address. . . . . . . . . . . : 10.0.0.42`,
        `   Subnet Mask . . . . . . . . . . . : 255.255.255.0`,
        `   Default Gateway . . . . . . . . . : 10.0.0.1`,
        '',
      ];
      return { ok: true, output: out.join('\n') };
    }

    case 'systeminfo': {
      const out = [
        '',
        `Host Name:                 ${VM_HOST.hostname}`,
        `OS Name:                   ${VM_HOST.os}`,
        `OS Version:                10.0.${VM_HOST.build}`,
        `OS Manufacturer:           Microsoft Corporation`,
        `System Type:               x64-based PC`,
        `Domain:                    ${VM_HOST.domain}`,
        `Logged On User:            ${actor}`,
        '',
      ];
      return { ok: true, output: out.join('\n') };
    }

    default:
      return null;
  }
}

/** Format a PowerShell-style error record. */
function psError(cmdlet: string, message: string): IntrinsicResult {
  return {
    ok: false,
    output: `${cmdlet} : ${message}\n    + CategoryInfo          : ObjectNotFound: (${cmdlet}:String) [], ParentContainsErrorRecordException\n    + FullyQualifiedErrorId : PathNotFound`,
  };
}
