/**
 * Command dispatcher for the GRC Range terminal.
 *
 * The dispatcher is the bridge between the raw command line the student types
 * and the two execution layers behind it:
 *
 *   1. Shell intrinsics (`cls`, `dir`, `cd`, `whoami`, …) — handled entirely
 *      inside the terminal by {@link shellIntrinsics.runIntrinsic}.
 *   2. GRC capabilities (`Get-LocalUser`, `net accounts`, `icacls`, …) —
 *      routed to the mock services exposed by {@link GrcCapabilityContext}.
 *
 * It also understands enough PowerShell plumbing to feel real: statement
 * separators (`;` and `&&`) and pipelines (`|`) with the common text filters
 * (`findstr`, `select-string`, `sort`, `where`, `measure`).
 */

import { tokenize } from './tokenizer';
import { formatTable } from './format';
import {
  runIntrinsic,
  type ShellState,
  createShellState,
} from './shellIntrinsics';

/* -------------------------------------------------------------------------- */
/* Capability context                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The bundle of mock services the GRC cmdlets operate on.
 *
 * Each property is a small facade over the in-memory service state (users,
 * firewall, password policy, audit log, compliance, filesystem ACLs). The
 * dispatcher never touches the underlying stores directly — it always goes
 * through this interface so the terminal layer stays decoupled from the
 * service implementations.
 */
export interface GrcCapabilityContext {
  users: {
    listUsers: () => any[];
    getUser: (name: string) => any;
    addToAdmin: (name: string) => void;
    removeFromAdmin: (name: string) => void;
  };
  firewall: {
    listRules: () => any[];
    removeRule: (name: string) => void;
    toggleRule: (name: string) => void;
  };
  password: {
    getPolicy: () => any;
    setPolicy: (p: any) => void;
  };
  audit: {
    listEvents: () => any[];
  };
  compliance: {
    listFindings: () => any[];
    remediateFinding: (id: string) => void;
    listRisks: () => any[];
    addRisk: (r: any) => void;
  };
  fs: {
    getAcl: (path: string) => any[];
    setAcl: (path: string, acl: any[]) => void;
    readFile: (path: string) => string;
    listDir: (path: string) => any[];
  };
  cloud: {
    listBuckets: () => any[];
    setBucketPublicAccess: (name: string, publicAccess: boolean) => void;
    listIamRoles: () => any[];
    listSecurityGroupRules: () => any[];
    restrictSecurityGroupRule: (id: string, cidr: string) => void;
  };
  controlDrift: {
    hasBaseline: () => boolean;
    listDriftEvents: () => any[];
    advanceTime: (days: number) => any[];
  };
  vendorRisk: {
    listVendors: () => any[];
    decide: (id: string, status: string, note: string) => void;
  };
  accessReview: {
    listItems: () => any[];
    certify: (id: string, justification: string) => void;
    revoke: (id: string, justification: string) => void;
  };
  /** The principal running the terminal session, e.g. `omari\admin`. */
  actor: string;
}

/** Result of dispatching a full command line (possibly multiple statements). */
export interface DispatchResult {
  ok: boolean;
  output: string;
  control?: 'clear' | 'exit';
  /** Id of the GRC capability that ran, if any (for UI telemetry). */
  ranCapabilityId?: string;
}

/* -------------------------------------------------------------------------- */
/* Statement / pipeline splitting                                              */
/* -------------------------------------------------------------------------- */

/**
 * Split a command line into statements on `;` and `&&`, preserving quoted
 * segments. Returns the statements in order; the caller decides whether to
 * honour `&&` short-circuiting.
 */
function splitStatements(line: string): { text: string; shortCircuit: boolean }[] {
  const out: { text: string; shortCircuit: boolean }[] = [];
  let buf = '';
  let quote: string | null = null;
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      i++;
      continue;
    }
    if (ch === ';') {
      out.push({ text: buf, shortCircuit: false });
      buf = '';
      i++;
      continue;
    }
    if (ch === '&' && line[i + 1] === '&') {
      out.push({ text: buf, shortCircuit: true });
      buf = '';
      i += 2;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim() !== '') out.push({ text: buf, shortCircuit: false });
  return out.filter((s) => s.text.trim() !== '');
}

/**
 * Split a single statement into pipeline stages on `|`, preserving quoted
 * segments so a `|` inside a string is not treated as a pipe.
 */
function splitPipeline(statement: string): string[] {
  const out: string[] = [];
  let buf = '';
  let quote: string | null = null;
  for (const ch of statement) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '|') {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  out.push(buf);
  return out.map((s) => s.trim()).filter((s) => s !== '');
}

/* -------------------------------------------------------------------------- */
/* Pipeline filters                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Apply a pipeline filter stage (`findstr`, `select-string`, `sort`, …) to the
 * text output of the previous stage. Returns the filtered text, or `null` if
 * the stage is not a recognised filter (so the dispatcher can treat it as a
 * regular command instead).
 */
function runFilter(
  stage: string,
  input: string,
): string | null {
  const { cmdlet, positional, args } = tokenize(stage);
  const lines = input.split('\n');

  switch (cmdlet) {
    case 'findstr': {
      // findstr <pattern> — case-insensitive substring match by default.
      const pattern = positional[0] ?? '';
      if (!pattern) return input;
      const re = new RegExp(escapeRegex(pattern), 'i');
      return lines.filter((l) => re.test(l)).join('\n');
    }

    case 'select-string': {
      // -Pattern is the canonical form; bare positional also accepted.
      const pattern = args['pattern'] ?? positional[0] ?? '';
      if (!pattern) return input;
      const flags = args['casesensitive'] === 'true' ? '' : 'i';
      const re = new RegExp(escapeRegex(pattern), flags);
      return lines.filter((l) => re.test(l)).join('\n');
    }

    case 'sort':
    case 'sort-object':
      return [...lines].sort().join('\n');

    case 'where':
    case 'where-object': {
      // Very small subset: `where { $_ -match 'x' }` or `where 'x'`.
      const literal = positional[0];
      if (literal) {
        const re = new RegExp(escapeRegex(literal), 'i');
        return lines.filter((l) => re.test(l)).join('\n');
      }
      const match = stage.match(/\$_\s*-match\s*['"]([^'"]+)['"]/);
      if (match) {
        const re = new RegExp(escapeRegex(match[1]!), 'i');
        return lines.filter((l) => re.test(l)).join('\n');
      }
      return input;
    }

    case 'measure':
    case 'measure-object': {
      const count = lines.filter((l) => l.trim() !== '').length;
      return `Count: ${count}`;
    }

    case 'select':
    case 'select-object': {
      // `select -First N` / `select -Last N` / `select -Skip N`.
      const first = parseInt(args['first'] ?? '', 10);
      const last = parseInt(args['last'] ?? '', 10);
      if (!Number.isNaN(first)) return lines.slice(0, first).join('\n');
      if (!Number.isNaN(last)) return lines.slice(-last).join('\n');
      return input;
    }

    default:
      return null;
  }
}

/** Escape a string for use in a RegExp literal. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* -------------------------------------------------------------------------- */
/* GRC capability handlers                                                     */
/* -------------------------------------------------------------------------- */

/** Outcome of a single GRC capability handler. */
interface CapResult {
  ok: boolean;
  output: string;
  /** Capability id surfaced back to the UI as `ranCapabilityId`. */
  id?: string;
}

/**
 * Dispatch a single tokenized command to the matching GRC capability.
 * Returns `null` when the cmdlet is not a recognised capability so the caller
 * can surface a "not recognized" error.
 */
function runCapability(
  cmd: string,
  positional: string[],
  args: Record<string, string>,
  ctx: GrcCapabilityContext,
): CapResult | null {
  switch (cmd) {
    /* ------------------------- read-only queries ------------------------- */
    case 'get-localuser': {
      const users = ctx.users.listUsers();
      const rows = users.map((u: any) => ({
        Name: u.username,
        Enabled: u.enabled,
        FullName: u.displayName,
        Description: u.description,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-localuser' };
    }

    case 'get-localgroupmember':
    case 'net': {
      // `net localgroup Administrators` — the only `net` form we treat as a
      // capability is `localgroup`; `net accounts` is handled below.
      if (cmd === 'net') {
        const sub = positional[0]?.toLowerCase();
        if (sub === 'localgroup') {
          const group = positional[1] ?? 'Administrators';
          if (group.toLowerCase() !== 'administrators') {
            return {
              ok: false,
              output: `net : The group '${group}' is not tracked by this lab.`,
            };
          }
          const admins = ctx.users.listUsers().filter((u: any) => u.isAdmin);
          const rows = admins.map((u: any) => ({
            Name: u.username,
            PrincipalSource: 'Local',
            ObjectClass: 'User',
          }));
          return {
            ok: true,
            output: formatTable(rows),
            id: 'get-localgroupmember',
          };
        }
        if (sub === 'accounts') {
          return netAccounts(positional, args, ctx);
        }
        return null; // unknown `net` verb — let intrinsic layer refuse
      }
      // Direct Get-LocalGroupMember -Group "Administrators"
      const group = args['group'] ?? positional[0] ?? 'Administrators';
      if (group.toLowerCase() !== 'administrators') {
        return {
          ok: false,
          output: `Get-LocalGroupMember : Group '${group}' not found.`,
        };
      }
      const admins = ctx.users.listUsers().filter((u: any) => u.isAdmin);
      const rows = admins.map((u: any) => ({
        Name: u.username,
        PrincipalSource: 'Local',
        ObjectClass: 'User',
      }));
      return { ok: true, output: formatTable(rows), id: 'get-localgroupmember' };
    }

    case 'icacls': {
      const path = positional[0];
      if (!path) {
        return {
          ok: false,
          output: "icacls : The path is missing. Usage: icacls <path>",
        };
      }
      const acl = ctx.fs.getAcl(path);
      if (!acl || acl.length === 0) {
        return {
          ok: false,
          output: `icacls : ${path} - The system cannot find the file specified.`,
        };
      }
      const lines = [`${path}`];
      for (const entry of acl) {
        lines.push(
          `  ${entry.identity}:(${entry.rights})${entry.inheritance ?? ''}`,
        );
      }
      lines.push('Successfully processed 1 files; Failed processing 0 files');
      return { ok: true, output: lines.join('\n'), id: 'icacls' };
    }

    case 'get-acl': {
      const path = positional[0] ?? args['path'];
      if (!path) {
        return {
          ok: false,
          output: "Get-Acl : A positional parameter cannot be found that accepts argument ''.",
        };
      }
      const acl = ctx.fs.getAcl(path);
      if (!acl || acl.length === 0) {
        return {
          ok: false,
          output: `Get-Acl : Cannot find path '${path}' because it does not exist.`,
        };
      }
      const lines = [
        `Path   : ${path}`,
        `Owner  : BUILTIN\\Administrators`,
        `Access :`,
      ];
      for (const entry of acl) {
        lines.push(
          `         ${entry.identity} Allow  ${entry.rights}  ${entry.inheritance ?? ''}`,
        );
      }
      return { ok: true, output: lines.join('\n'), id: 'get-acl' };
    }

    case 'get-netfirewallrule': {
      let rules = ctx.firewall.listRules();
      const displayName = args['displayname'];
      if (displayName) {
        const re = new RegExp(escapeRegex(displayName), 'i');
        rules = rules.filter((r: any) => re.test(r.displayName ?? r.name));
      }
      const rows = rules.map((r: any) => ({
        DisplayName: r.displayName,
        Enabled: r.enabled,
        Direction: r.direction,
        Action: r.action,
        Profile: r.profile,
      }));
      return {
        ok: true,
        output: formatTable(rows),
        id: 'get-netfirewallrule',
      };
    }

    case 'netstat': {
      // Simulate `netstat -ano` listening ports.
      const rules = ctx.firewall.listRules();
      const rows = rules
        .filter((r: any) => r.enabled && r.localPort)
        .map((r: any) => ({
          Proto: r.protocol,
          'Local Address': `0.0.0.0:${r.localPort}`,
          'Foreign Address': '0.0.0.0:*',
          State: 'LISTENING',
          PID: '4',
        }));
      return { ok: true, output: formatTable(rows), id: 'netstat' };
    }

    case 'auditpol': {
      // `auditpol /get /category:*` — list audit policy categories.
      const events = ctx.audit.listEvents();
      const categories = [
        'Logon/Logoff',
        'Object Access',
        'Privilege Use',
        'Policy Change',
        'Account Management',
      ];
      const rows = categories.map((c) => {
        const matching = events.filter(
          (e: any) => e.category === c || c === 'Object Access',
        );
        return {
          'Category/Subcategory': c,
          'Inclusion Setting': matching.length > 0 ? 'Success and Failure' : 'No Auditing',
        };
      });
      return { ok: true, output: formatTable(rows), id: 'auditpol' };
    }

    case 'get-content': {
      // GRC-aware Get-Content: read via the capability fs facade so the
      // compliance layer can flag sensitive data, falling back to the shell FS.
      const path = positional[0] ?? args['path'];
      if (!path) {
        return {
          ok: false,
          output: "Get-Content : A positional parameter cannot be found.",
        };
      }
      let content = '';
      try {
        content = ctx.fs.readFile(path);
      } catch {
        content = '';
      }
      if (!content) {
        return {
          ok: false,
          output: `Get-Content : Cannot find path '${path}' because it does not exist.`,
        };
      }
      return { ok: true, output: content, id: 'get-content' };
    }

    case 'get-childitem': {
      const path = positional[0] ?? '.';
      const items = ctx.fs.listDir(path);
      if (!items || items.length === 0) {
        return {
          ok: false,
          output: `Get-ChildItem : Cannot find path '${path}' because it does not exist.`,
        };
      }
      const rows = items.map((it: any) => ({
        Mode: it.isDirectory ? 'd----' : '-a---',
        Name: it.name,
        Length: it.size ?? '',
      }));
      return { ok: true, output: formatTable(rows), id: 'get-childitem' };
    }

    case 'get-winevent': {
      const events = ctx.audit.listEvents();
      const rows = events.map((e: any) => ({
        TimeCreated: e.timestamp,
        Id: e.eventId,
        LevelDisplayName: e.level,
        Message: e.message,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-winevent' };
    }

    case 'invoke-cischeck': {
      // Run a mock CIS benchmark check: derive findings from current state.
      const findings = ctx.compliance.listFindings();
      const open = findings.filter((f: any) => f.status === 'Open');
      const rows = open.map((f: any) => ({
        Id: f.id,
        Severity: f.severity,
        Title: f.title,
        Status: 'FAIL',
      }));
      const header =
        `CIS Benchmark (mock) — ${open.length} failed check(s)\n\n`;
      return {
        ok: true,
        output: header + formatTable(rows),
        id: 'invoke-cischeck',
      };
    }

    case 'get-s3bucket': {
      const rows = ctx.cloud.listBuckets().map((b: any) => ({
        Name: b.name,
        PublicAccess: b.publicAccess,
        Encrypted: b.encrypted,
        Contents: b.contents,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-s3bucket' };
    }

    case 'get-iamrole': {
      const rows = ctx.cloud.listIamRoles().map((r: any) => ({
        Name: r.name,
        Policy: r.policy,
        AttachedTo: r.attachedTo,
        MfaEnforced: r.mfaEnforced,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-iamrole' };
    }

    case 'get-securitygroup': {
      const rows = ctx.cloud.listSecurityGroupRules().map((r: any) => ({
        Group: r.groupName,
        Direction: r.direction,
        Protocol: r.protocol,
        Port: r.port,
        Cidr: r.cidr,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-securitygroup' };
    }

    case 'get-controldrift': {
      if (!ctx.controlDrift.hasBaseline()) {
        return {
          ok: true,
          output: 'No baseline captured yet. Open the Continuous Monitoring console and click "Capture Baseline".',
          id: 'get-controldrift',
        };
      }
      const rows = ctx.controlDrift.listDriftEvents().map((e: any) => ({
        Control: e.controlName,
        Baseline: e.baselineState,
        Current: e.currentState,
        Detected: e.detectedAt,
        Status: e.resolvedAt ? 'Resolved' : 'Open',
      }));
      return {
        ok: true,
        output: rows.length > 0 ? formatTable(rows) : 'No drift detected yet.',
        id: 'get-controldrift',
      };
    }

    case 'get-vendor': {
      const rows = ctx.vendorRisk.listVendors().map((v: any) => ({
        Id: v.id,
        Name: v.name,
        Category: v.category,
        DataAccess: v.dataAccessLevel,
        InherentRisk: v.inherentRisk,
        Status: v.status,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-vendor' };
    }

    case 'get-accessreview': {
      const rows = ctx.accessReview.listItems().map((i: any) => ({
        Id: i.id,
        Username: i.username,
        Role: i.role,
        Manager: i.manager ?? 'Unassigned',
        Flags: i.flags.length,
        Decision: i.decision,
      }));
      return { ok: true, output: formatTable(rows), id: 'get-accessreview' };
    }

    /* --------------------------- mutations ------------------------------- */
    case 'approve-access': {
      const id = args['id'] ?? positional[0];
      if (!id) return { ok: false, output: 'Approve-Access : -Id is required.' };
      const item = ctx.accessReview.listItems().find((i: any) => i.id === id);
      if (!item) return { ok: false, output: `Approve-Access : Item '${id}' not found.` };
      ctx.accessReview.certify(id, args['note'] ?? 'Access confirmed as still required (terminal).');
      return { ok: true, output: `Access review item ${id} certified.`, id: 'approve-access' };
    }

    case 'revoke-access': {
      const id = args['id'] ?? positional[0];
      if (!id) return { ok: false, output: 'Revoke-Access : -Id is required.' };
      const item = ctx.accessReview.listItems().find((i: any) => i.id === id);
      if (!item) return { ok: false, output: `Revoke-Access : Item '${id}' not found.` };
      ctx.users.removeFromAdmin(item.username);
      ctx.accessReview.revoke(id, args['note'] ?? 'Access no longer required (terminal).');
      return { ok: true, output: `Access review item ${id} revoked; ${item.username} removed from Administrators.`, id: 'revoke-access' };
    }

    case 'approve-vendor': {
      const id = args['id'] ?? positional[0];
      if (!id) {
        return { ok: false, output: 'Approve-Vendor : -Id is required.' };
      }
      const vendor = ctx.vendorRisk.listVendors().find((v: any) => v.id === id);
      if (!vendor) {
        return { ok: false, output: `Approve-Vendor : Vendor '${id}' not found.` };
      }
      ctx.vendorRisk.decide(id, 'Approved', args['note'] ?? 'Approved via terminal.');
      return { ok: true, output: `Vendor ${id} approved.`, id: 'approve-vendor' };
    }

    case 'invoke-controlrecheck': {
      if (!ctx.controlDrift.hasBaseline()) {
        return {
          ok: false,
          output: 'Invoke-ControlRecheck : No baseline captured. Capture a baseline in the Continuous Monitoring console first.',
        };
      }
      const days = parseInt(args['days'] ?? positional[0] ?? '30', 10);
      const events = ctx.controlDrift.advanceTime(days);
      return {
        ok: true,
        output:
          events.length > 0
            ? `Advanced ${days} day(s). ${events.length} control(s) drifted:\n` +
              formatTable(events.map((e: any) => ({ Control: e.controlName, Current: e.currentState })))
            : `Advanced ${days} day(s). No drift detected.`,
        id: 'invoke-controlrecheck',
      };
    }

    case 'repair-s3bucket': {
      const name = args['name'] ?? positional[0];
      if (!name) {
        return {
          ok: false,
          output: 'Repair-S3Bucket : -Name is required.',
        };
      }
      const bucket = ctx.cloud.listBuckets().find((b: any) => b.name === name);
      if (!bucket) {
        return {
          ok: false,
          output: `Repair-S3Bucket : Bucket '${name}' not found.`,
        };
      }
      ctx.cloud.setBucketPublicAccess(name, false);
      return {
        ok: true,
        output: `Bucket '${name}' public access blocked.`,
        id: 'repair-s3bucket',
      };
    }

    case 'set-localuser': {
      const name = args['name'] ?? positional[0];
      if (!name) {
        return {
          ok: false,
          output: 'Set-LocalUser : -Name is required.',
        };
      }
      const user = ctx.users.getUser(name);
      if (!user) {
        return {
          ok: false,
          output: `Set-LocalUser : User '${name}' not found.`,
        };
      }
      if (args['enabled'] !== undefined) {
        const enabled = parseBool(args['enabled']);
        // Mutate via addToAdmin/removeFromAdmin is not the right hook; the
        // capability context exposes enable/disable through setPolicy-style
        // calls, so we reflect the change in the user object directly.
        (user as any).enabled = enabled;
      }
      return {
        ok: true,
        output: `Set-LocalUser : User '${name}' updated.`,
        id: 'set-localuser',
      };
    }

    case 'remove-localgroupmember': {
      const group = args['group'] ?? positional[0] ?? 'Administrators';
      const member = args['member'] ?? positional[1];
      if (!member) {
        return {
          ok: false,
          output: 'Remove-LocalGroupMember : -Member is required.',
        };
      }
      if (group.toLowerCase() !== 'administrators') {
        return {
          ok: false,
          output: `Remove-LocalGroupMember : Group '${group}' not found.`,
        };
      }
      ctx.users.removeFromAdmin(member);
      return {
        ok: true,
        output: `Removed '${member}' from the ${group} group.`,
        id: 'remove-localgroupmember',
      };
    }

    case 'set-netfirewallrule': {
      const displayName = args['displayname'] ?? positional[0];
      if (!displayName) {
        return {
          ok: false,
          output: 'Set-NetFirewallRule : -DisplayName is required.',
        };
      }
      if (args['enabled'] !== undefined) {
        const enabled = parseBool(args['enabled']);
        // toggleRule flips; we only want to set, so align first.
        const rule = ctx.firewall
          .listRules()
          .find((r: any) => r.displayName === displayName || r.name === displayName);
        if (!rule) {
          return {
            ok: false,
            output: `Set-NetFirewallRule : Rule '${displayName}' not found.`,
          };
        }
        if ((rule as any).enabled !== enabled) ctx.firewall.toggleRule(displayName);
      }
      return {
        ok: true,
        output: `Firewall rule '${displayName}' updated.`,
        id: 'set-netfirewallrule',
      };
    }

    case 'secedit': {
      // `secedit /configure` — toggle password complexity on.
      if (positional.includes('/configure')) {
        const policy = ctx.password.getPolicy();
        (policy as any).complexity = true;
        ctx.password.setPolicy(policy);
        return {
          ok: true,
          output:
            'The task has completed successfully.\nPassword complexity is now enabled.',
          id: 'secedit',
        };
      }
      return {
        ok: false,
        output: 'secedit : Unsupported arguments. Use /configure.',
      };
    }

    case 'repair-grcfinding': {
      const id = args['id'] ?? positional[0];
      if (!id) {
        return {
          ok: false,
          output: 'Repair-GRCFinding : -Id is required.',
        };
      }
      const finding = ctx.compliance
        .listFindings()
        .find((f: any) => f.id === id);
      if (!finding) {
        return {
          ok: false,
          output: `Repair-GRCFinding : Finding '${id}' not found.`,
        };
      }
      ctx.compliance.remediateFinding(id);
      return {
        ok: true,
        output: `Finding ${id} remediated.`,
        id: 'repair-grcfinding',
      };
    }

    case 'new-grcrisk': {
      const finding = args['finding'] ?? positional[0] ?? 'Unspecified risk';
      const likelihood = parseInt(args['likelihood'] ?? '3', 10);
      const impact = parseInt(args['impact'] ?? '3', 10);
      const strategy =
        (args['strategy'] as any) ?? 'Mitigate';
      const owner = args['owner'] ?? ctx.actor;
      const remediation = args['remediation'] ?? 'TBD';
      const risk = {
        id: `R-${Date.now().toString(36).toUpperCase()}`,
        finding,
        likelihood,
        impact,
        inherentRisk: likelihood * impact,
        controlStrategy: strategy,
        residualRisk: Math.max(1, Math.round((likelihood * impact) / 2)),
        owner,
        remediation,
      };
      ctx.compliance.addRisk(risk);
      return {
        ok: true,
        output: `Risk ${risk.id} added to the register.`,
        id: 'new-grcrisk',
      };
    }

    default:
      return null;
  }
}

/** Handle `net accounts` (show) and `net accounts /minpwlen:N` (set). */
function netAccounts(
  positional: string[],
  _args: Record<string, string>,
  ctx: GrcCapabilityContext,
): CapResult {
  const minPwArg = positional.find((p) => p.toLowerCase().startsWith('/minpwlen:'));
  if (minPwArg) {
    const n = parseInt(minPwArg.split(':')[1] ?? '', 10);
    if (Number.isNaN(n) || n < 0) {
      return {
        ok: false,
        output: 'net accounts : Invalid minimum password length.',
      };
    }
    const policy = ctx.password.getPolicy();
    (policy as any).minLength = n;
    ctx.password.setPolicy(policy);
    return {
      ok: true,
      output: `The command completed successfully.\nMinimum password length set to ${n}.`,
      id: 'net-accounts-set',
    };
  }

  const p = ctx.password.getPolicy();
  const lines = [
    '',
    'Force user logoff how long after time expires?:       Never',
    `Minimum password length (0-14):                      ${p.minLength}`,
    `Minimum password age (days):                         ${p.minAge}`,
    `Maximum password age (days):                         ${p.maxAge}`,
    `Password unique length (history):                     ${p.history}`,
    `Lockout threshold (attempts):                         ${p.lockoutThreshold}`,
    `Lockout duration (minutes):                           ${p.lockoutDuration}`,
    `Password complexity requirements:                     ${p.complexity ? 'Enabled' : 'Disabled'}`,
    '',
    'The command completed successfully.',
  ];
  return { ok: true, output: lines.join('\n'), id: 'net-accounts' };
}

/** Parse a PowerShell boolean literal (`$true` / `$false` / true / false). */
function parseBool(v: string): boolean {
  const s = v.toLowerCase().replace(/^\$/, '');
  return s === 'true' || s === '1' || s === 'yes';
}

/* -------------------------------------------------------------------------- */
/* Public dispatcher                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Dispatch a full command line.
 *
 * The line may contain multiple statements separated by `;` or `&&` (the
 * latter short-circuits on failure) and each statement may contain a pipeline
 * of commands joined by `|`. The first stage of a pipeline is routed to an
 * intrinsic or GRC capability; subsequent stages are text filters
 * (`findstr`, `select-string`, `sort`, …) applied to the previous stage's
 * output.
 *
 * @param line   The raw command line typed by the student.
 * @param ctx    The GRC capability context (mock services).
 * @param shell  Optional shell state; a fresh one is created when omitted.
 */
export function dispatch(
  line: string,
  ctx: GrcCapabilityContext,
  shell?: ShellState,
): DispatchResult {
  const state = shell ?? createShellState();
  const statements = splitStatements(line);

  const outputs: string[] = [];
  let ok = true;
  let control: 'clear' | 'exit' | undefined;
  let ranCapabilityId: string | undefined;

  for (const stmt of statements) {
    if (!ok && stmt.shortCircuit) {
      // `&&` short-circuit: skip the rest after a failure.
      break;
    }

    const stages = splitPipeline(stmt.text);
    if (stages.length === 0) continue;

    // Run the first stage as a real command.
    const first = runCommand(stages[0]!, ctx, state);
    if (first.control) control = first.control;
    if (first.ranCapabilityId) ranCapabilityId = first.ranCapabilityId;
    ok = first.ok;

    let stageOutput = first.output;

    // Feed the output through any remaining pipeline filter stages.
    for (let i = 1; i < stages.length; i++) {
      const filtered = runFilter(stages[i]!, stageOutput);
      if (filtered === null) {
        // Not a filter — try running it as a real command (rare in the lab).
        const nested = runCommand(stages[i]!, ctx, state);
        stageOutput = nested.output;
        if (nested.control) control = nested.control;
        if (nested.ranCapabilityId) ranCapabilityId = nested.ranCapabilityId;
        if (!nested.ok) ok = false;
      } else {
        stageOutput = filtered;
      }
    }

    if (stageOutput !== '') outputs.push(stageOutput);
  }

  return {
    ok,
    output: outputs.join('\n'),
    control,
    ranCapabilityId,
  };
}

/**
 * Run a single (non-pipeline) command stage: tokenize, try intrinsics, then
 * GRC capabilities, then surface a "not recognized" error.
 */
function runCommand(
  stage: string,
  ctx: GrcCapabilityContext,
  state: ShellState,
): DispatchResult {
  const { cmdlet, positional, args } = tokenize(stage);
  if (cmdlet === '') return { ok: true, output: '' };

  // 1. Shell intrinsics (cls, dir, cd, whoami, …).
  const intrinsic = runIntrinsic(cmdlet, positional, ctx, state.cwd, args);
  if (intrinsic !== null) {
    return {
      ok: intrinsic.ok,
      output: intrinsic.output,
      control: intrinsic.control,
    };
  }

  // 2. GRC capabilities (Get-LocalUser, net accounts, icacls, …).
  const cap = runCapability(cmdlet, positional, args, ctx);
  if (cap !== null) {
    return {
      ok: cap.ok,
      output: cap.output,
      ranCapabilityId: cap.id,
    };
  }

  // 3. Unknown command — mimic PowerShell's red error text.
  return {
    ok: false,
    output: `${cmdlet} : The term '${cmdlet}' is not recognized as the name of a cmdlet, function, or program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`,
  };
}
