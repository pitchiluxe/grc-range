/**
 * Audit Console window for the GRC Range desktop.
 *
 * The primary audit discovery tool. Provides a tabbed interface with tabs for
 * Users & Groups, Firewall, Password Policy, File ACLs, Audit Log, and CIS
 * Check. Each finding has a "Map to Framework" button showing the compliance
 * framework mapping. An export button downloads findings as a text report.
 */

import { getTheme } from '@/ui/themes';
import { FRAMEWORKS } from '@/config/complianceFrameworks';
import type { ComplianceFinding, FirewallRule, LocalUser, PasswordPolicy, AuditEvent, AclEntry } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/** Tab identifiers for the audit console. */
type TabId = 'users' | 'firewall' | 'password' | 'acls' | 'auditlog' | 'cis';

/**
 * Render the Audit Console window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderAuditConsoleWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  // Header with title and export button
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '8px 16px';
  header.style.background = theme.bg;
  header.style.borderBottom = `1px solid ${theme.border}`;

  const title = document.createElement('div');
  title.textContent = 'GRC Audit Console';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  header.appendChild(title);

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export Findings';
  exportBtn.style.padding = '5px 14px';
  exportBtn.style.background = theme.accent;
  exportBtn.style.color = '#fff';
  exportBtn.style.border = 'none';
  exportBtn.style.borderRadius = '4px';
  exportBtn.style.cursor = 'pointer';
  exportBtn.style.fontSize = '13px';
  header.appendChild(exportBtn);

  body.appendChild(header);

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.style.display = 'flex';
  tabBar.style.gap = '2px';
  tabBar.style.padding = '0 12px';
  tabBar.style.background = theme.bg;
  tabBar.style.borderBottom = `1px solid ${theme.border}`;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'users', label: 'Users & Groups' },
    { id: 'firewall', label: 'Firewall' },
    { id: 'password', label: 'Password Policy' },
    { id: 'acls', label: 'File ACLs' },
    { id: 'auditlog', label: 'Audit Log' },
    { id: 'cis', label: 'CIS Check' },
  ];

  const content = document.createElement('div');
  content.style.flex = '1';
  content.style.overflow = 'auto';
  content.style.padding = '16px';

  let activeTab: TabId = 'users';

  function renderTab(): void {
    content.innerHTML = '';
    switch (activeTab) {
      case 'users': renderUsersTab(); break;
      case 'firewall': renderFirewallTab(); break;
      case 'password': renderPasswordTab(); break;
      case 'acls': renderAclsTab(); break;
      case 'auditlog': renderAuditLogTab(); break;
      case 'cis': renderCisTab(); break;
    }
  }

  function makeTable(headers: string[]): HTMLTableElement {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    for (const h of headers) {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.textAlign = 'left';
      th.style.padding = '8px 12px';
      th.style.background = theme.bg;
      th.style.color = theme.textDim;
      th.style.borderBottom = `2px solid ${theme.border}`;
      th.style.fontSize = '12px';
      th.style.fontWeight = '600';
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);
    return table;
  }

  function makeRow(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.style.borderBottom = `1px solid ${theme.border}`;
    tr.addEventListener('mouseenter', () => { tr.style.background = theme.surfaceHover; });
    tr.addEventListener('mouseleave', () => { tr.style.background = 'transparent'; });
    return tr;
  }

  function makeCell(text: string, color?: string): HTMLTableCellElement {
    const td = document.createElement('td');
    td.textContent = text;
    td.style.padding = '8px 12px';
    if (color) td.style.color = color;
    return td;
  }

  function severityColor(sev: string): string {
    if (sev === 'Critical') return theme.danger;
    if (sev === 'High') return theme.warning;
    if (sev === 'Medium') return '#eab308';
    return theme.success;
  }

  function mapButton(finding: ComplianceFinding): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = 'Map to Framework';
    btn.style.padding = '3px 10px';
    btn.style.background = theme.surfaceHover;
    btn.style.color = theme.accent;
    btn.style.border = `1px solid ${theme.border}`;
    btn.style.borderRadius = '3px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.addEventListener('click', () => showMapping(finding));
    return btn;
  }

  function showMapping(finding: ComplianceFinding): void {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '5000';

    const card = document.createElement('div');
    card.style.background = theme.surface;
    card.style.border = `1px solid ${theme.border}`;
    card.style.borderRadius = '8px';
    card.style.padding = '24px';
    card.style.maxWidth = '500px';
    card.style.maxHeight = '70%';
    card.style.overflow = 'auto';

    const h = document.createElement('h3');
    h.textContent = finding.title;
    h.style.color = theme.accent;
    h.style.margin = '0 0 8px 0';
    h.style.fontSize = '15px';
    card.appendChild(h);

    const sev = document.createElement('div');
    sev.textContent = `Severity: ${finding.severity}`;
    sev.style.color = severityColor(finding.severity);
    sev.style.fontWeight = '600';
    sev.style.marginBottom = '12px';
    card.appendChild(sev);

    const desc = document.createElement('p');
    desc.textContent = finding.description;
    desc.style.color = theme.textDim;
    desc.style.fontSize = '13px';
    desc.style.margin = '0 0 16px 0';
    card.appendChild(desc);

    const mapTitle = document.createElement('div');
    mapTitle.textContent = 'Framework Mappings';
    mapTitle.style.fontWeight = '600';
    mapTitle.style.marginBottom = '8px';
    card.appendChild(mapTitle);

    for (const fw of finding.frameworks) {
      const fwDiv = document.createElement('div');
      fwDiv.style.padding = '8px 12px';
      fwDiv.style.background = theme.bg;
      fwDiv.style.borderRadius = '4px';
      fwDiv.style.marginBottom = '6px';
      fwDiv.style.fontSize = '13px';
      const fwName = document.createElement('div');
      fwName.textContent = fw;
      fwName.style.color = theme.accent;
      fwName.style.fontWeight = '600';
      fwDiv.appendChild(fwName);

      // Find matching framework description
      const match = FRAMEWORKS.find((f) => fw.includes(f.name.split(' ')[0] ?? ''));
      if (match) {
        const fwDesc = document.createElement('div');
        fwDesc.textContent = match.description;
        fwDesc.style.color = theme.textDim;
        fwDesc.style.fontSize = '12px';
        fwDiv.appendChild(fwDesc);
      }
      card.appendChild(fwDiv);
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '16px';
    closeBtn.style.padding = '6px 20px';
    closeBtn.style.background = theme.accent;
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => overlay.remove());
    card.appendChild(closeBtn);

    overlay.appendChild(card);
    body.appendChild(overlay);
  }

  // --- Users & Groups tab ---
  function renderUsersTab(): void {
    const users: LocalUser[] = services.users.listUsers();
    const admins: string[] = services.users.listAdministrators();

    const table = makeTable(['Username', 'Enabled', 'Is Admin', 'Description', '']);
    const tbody = document.createElement('tbody');
    for (const u of users) {
      const tr = makeRow();
      tr.appendChild(makeCell(u.username));
      tr.appendChild(makeCell(u.enabled ? 'Yes' : 'No', u.enabled ? theme.text : theme.danger));
      tr.appendChild(makeCell(u.isAdmin ? 'Yes' : 'No', u.isAdmin ? theme.danger : theme.success));

      // Map button cell
      const tdBtn = document.createElement('td');
      tdBtn.style.padding = '8px 12px';
      const finding = services.compliance.listFindings().find((f) => f.id === 'FND-003');
      if (finding && u.isAdmin && u.username !== 'Administrator') {
        tdBtn.appendChild(mapButton(finding));
      }
      tr.appendChild(tdBtn);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    content.appendChild(table);

    // Administrators group section
    const adminH = document.createElement('h3');
    adminH.textContent = 'Administrators Group Members';
    adminH.style.color = theme.accent;
    adminH.style.margin = '20px 0 8px 0';
    adminH.style.fontSize = '15px';
    content.appendChild(adminH);

    const adminList = document.createElement('div');
    adminList.style.display = 'flex';
    adminList.style.flexDirection = 'column';
    adminList.style.gap = '4px';
    for (const m of admins) {
      const row = document.createElement('div');
      row.style.padding = '8px 12px';
      row.style.background = theme.bg;
      row.style.borderRadius = '4px';
      row.style.fontSize = '13px';
      const isBad = m !== 'Administrator';
      row.textContent = m;
      if (isBad) {
        row.style.color = theme.danger;
        row.textContent = '\u26A0 ' + m + ' (unjustified admin)';
      }
      adminList.appendChild(row);
    }
    content.appendChild(adminList);
  }

  // --- Firewall tab ---
  function renderFirewallTab(): void {
    const rules: FirewallRule[] = services.firewall.listRules();
    const table = makeTable(['Name', 'Port', 'Protocol', 'Direction', 'Action', 'Profile', 'Enabled', '']);
    const tbody = document.createElement('tbody');
    for (const r of rules) {
      const insecure = r.enabled && r.action === 'Allow' && r.direction === 'Inbound' &&
        (r.localPort === 21 || r.localPort === 23 || r.localPort === 3389);
      const tr = makeRow();
      tr.appendChild(makeCell(r.displayName));
      tr.appendChild(makeCell(String(r.localPort)));
      tr.appendChild(makeCell(r.protocol));
      tr.appendChild(makeCell(r.direction));
      tr.appendChild(makeCell(r.action, r.action === 'Allow' && insecure ? theme.danger : theme.text));
      tr.appendChild(makeCell(r.profile, r.profile === 'Any' && insecure ? theme.danger : theme.text));
      tr.appendChild(makeCell(r.enabled ? 'Yes' : 'No', r.enabled && insecure ? theme.danger : theme.text));

      const tdBtn = document.createElement('td');
      tdBtn.style.padding = '8px 12px';
      if (insecure) {
        const finding = services.compliance.listFindings().find((f) =>
          (r.localPort === 21 || r.localPort === 23) ? f.id === 'FND-005' : f.id === 'FND-006');
        if (finding) tdBtn.appendChild(mapButton(finding));
      }
      tr.appendChild(tdBtn);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    content.appendChild(table);
  }

  // --- Password Policy tab ---
  function renderPasswordTab(): void {
    const policy: PasswordPolicy = services.password.getPolicy();

    const checks: { label: string; value: string; compliant: boolean; findingId?: string }[] = [
      { label: 'Minimum password length', value: String(policy.minLength), compliant: policy.minLength >= 14, findingId: 'FND-004' },
      { label: 'Password complexity', value: policy.complexity ? 'Enabled' : 'Disabled', compliant: policy.complexity, findingId: 'FND-004' },
      { label: 'Minimum password age (days)', value: String(policy.minAge), compliant: policy.minAge >= 1 },
      { label: 'Maximum password age (days)', value: String(policy.maxAge), compliant: policy.maxAge > 0 && policy.maxAge <= 90 },
      { label: 'Password history', value: String(policy.history), compliant: policy.history >= 24 },
      { label: 'Lockout threshold', value: String(policy.lockoutThreshold), compliant: policy.lockoutThreshold >= 5, findingId: 'FND-008' },
      { label: 'Lockout duration (min)', value: String(policy.lockoutDuration), compliant: policy.lockoutDuration >= 15 },
    ];

    for (const c of checks) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '10px 12px';
      row.style.background = theme.bg;
      row.style.borderRadius = '4px';
      row.style.marginBottom = '6px';
      row.style.fontSize = '13px';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';
      const icon = document.createElement('span');
      icon.textContent = c.compliant ? '\u2705' : '\u274C';
      left.appendChild(icon);
      const label = document.createElement('span');
      label.textContent = c.label;
      left.appendChild(label);
      row.appendChild(left);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '8px';
      const val = document.createElement('span');
      val.textContent = c.value;
      val.style.color = c.compliant ? theme.success : theme.danger;
      val.style.fontWeight = '600';
      right.appendChild(val);
      if (!c.compliant && c.findingId) {
        const finding = services.compliance.listFindings().find((f) => f.id === c.findingId);
        if (finding) right.appendChild(mapButton(finding));
      }
      row.appendChild(right);
      content.appendChild(row);
    }
  }

  // --- File ACLs tab ---
  function renderAclsTab(): void {
    const shares = [
      { path: 'C:\\GRC_Lab_Data\\Finance_Share', name: 'Finance_Share', findingId: 'FND-001' },
      { path: 'C:\\GRC_Lab_Data\\HR_Records', name: 'HR_Records', findingId: 'FND-002' },
    ];

    for (const share of shares) {
      const acl: AclEntry[] | undefined = services.fs.getAcl(share.path);
      const finding = services.compliance.listFindings().find((f) => f.id === share.findingId);

      const card = document.createElement('div');
      card.style.background = theme.bg;
      card.style.border = `1px solid ${theme.border}`;
      card.style.borderRadius = '8px';
      card.style.padding = '16px';
      card.style.marginBottom = '16px';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '12px';
      const name = document.createElement('h3');
      name.textContent = share.name;
      name.style.color = theme.accent;
      name.style.margin = '0';
      name.style.fontSize = '15px';
      header.appendChild(name);
      if (finding) header.appendChild(mapButton(finding));
      card.appendChild(header);

      if (!acl || acl.length === 0) {
        const msg = document.createElement('div');
        msg.textContent = 'No ACL data.';
        msg.style.color = theme.textDim;
        card.appendChild(msg);
      } else {
        const table = makeTable(['Identity', 'Rights', 'Inheritance']);
        const tbody = document.createElement('tbody');
        for (const entry of acl) {
          const isEveryone = entry.identity === 'Everyone';
          const tr = makeRow();
          tr.appendChild(makeCell(entry.identity, isEveryone ? theme.danger : theme.text));
          tr.appendChild(makeCell(entry.rights, isEveryone ? theme.danger : theme.text));
          tr.appendChild(makeCell(entry.inheritance));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        card.appendChild(table);
      }
      content.appendChild(card);
    }
  }

  // --- Audit Log tab ---
  function renderAuditLogTab(): void {
    const events: AuditEvent[] = services.audit.listEvents();
    const table = makeTable(['Timestamp', 'Event ID', 'Level', 'Message']);
    const tbody = document.createElement('tbody');
    for (const e of events) {
      const tr = makeRow();
      tr.appendChild(makeCell(e.timestamp.replace('T', ' ').replace(/\.\d+Z$/, '')));
      tr.appendChild(makeCell(String(e.eventId)));
      tr.appendChild(makeCell(e.level, e.level === 'Error' ? theme.danger : e.level === 'Warning' ? theme.warning : theme.text));
      tr.appendChild(makeCell(e.message));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    content.appendChild(table);
  }

  // --- CIS Check tab ---
  function renderCisTab(): void {
    const runBtn = document.createElement('button');
    runBtn.textContent = 'Run CIS Check';
    runBtn.style.padding = '8px 20px';
    runBtn.style.background = theme.accent;
    runBtn.style.color = '#fff';
    runBtn.style.border = 'none';
    runBtn.style.borderRadius = '4px';
    runBtn.style.cursor = 'pointer';
    runBtn.style.fontSize = '14px';
    runBtn.style.marginBottom = '16px';
    content.appendChild(runBtn);

    const results = document.createElement('div');
    content.appendChild(results);

    runBtn.addEventListener('click', () => {
      const findings: ComplianceFinding[] = services.compliance.listFindings();
      const open = findings.filter((f) => f.status === 'Open');
      const remediated = findings.filter((f) => f.status === 'Remediated');

      results.innerHTML = '';
      const summary = document.createElement('div');
      summary.style.fontSize = '16px';
      summary.style.marginBottom = '16px';
      summary.innerHTML = '';
      const failSpan = document.createElement('span');
      failSpan.textContent = `${open.length} FAIL`;
      failSpan.style.color = theme.danger;
      failSpan.style.fontWeight = '700';
      const passSpan = document.createElement('span');
      passSpan.textContent = `  /  ${remediated.length + 3} PASS`;
      passSpan.style.color = theme.success;
      passSpan.style.fontWeight = '700';
      summary.appendChild(failSpan);
      summary.appendChild(passSpan);
      results.appendChild(summary);

      const table = makeTable(['ID', 'Severity', 'Title', 'Status', '']);
      const tbody = document.createElement('tbody');
      for (const f of open) {
        const tr = makeRow();
        tr.appendChild(makeCell(f.id));
        tr.appendChild(makeCell(f.severity, severityColor(f.severity)));
        tr.appendChild(makeCell(f.title));
        tr.appendChild(makeCell('FAIL', theme.danger));
        const tdBtn = document.createElement('td');
        tdBtn.style.padding = '8px 12px';
        tdBtn.appendChild(mapButton(f));
        tr.appendChild(tdBtn);
        tbody.appendChild(tr);
      }
      // Pass rows
      const passItems = [
        { id: 'PASS-1', title: 'Windows Defender running', severity: 'Low' as const },
        { id: 'PASS-2', title: 'UAC enabled', severity: 'Low' as const },
        { id: 'PASS-3', title: 'BitLocker volume encryption', severity: 'Low' as const },
      ];
      for (const p of passItems) {
        const tr = makeRow();
        tr.appendChild(makeCell(p.id));
        tr.appendChild(makeCell(p.severity, theme.success));
        tr.appendChild(makeCell(p.title));
        tr.appendChild(makeCell('PASS', theme.success));
        tr.appendChild(makeCell(''));
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      results.appendChild(table);
    });

    // Auto-run on first view
    runBtn.click();
  }

  // Export findings
  exportBtn.addEventListener('click', () => {
    const findings: ComplianceFinding[] = services.compliance.listFindings();
    const lines: string[] = [
      'GRC Range - Audit Findings Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Total Findings: ${findings.length}`,
      `Open: ${findings.filter((f) => f.status === 'Open').length}`,
      `Remediated: ${findings.filter((f) => f.status === 'Remediated').length}`,
      '',
      '='.repeat(60),
      '',
    ];
    for (const f of findings) {
      lines.push(`ID: ${f.id}`);
      lines.push(`Title: ${f.title}`);
      lines.push(`Severity: ${f.severity}`);
      lines.push(`Category: ${f.category}`);
      lines.push(`Status: ${f.status}`);
      lines.push(`Description: ${f.description}`);
      lines.push(`Evidence: ${f.evidence}`);
      lines.push(`Frameworks: ${f.frameworks.join(', ')}`);
      lines.push('');
      lines.push('-'.repeat(60));
      lines.push('');
    }
    downloadText('grc-audit-findings.txt', lines.join('\n'));
  });

  // Build tab bar
  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.style.padding = '8px 16px';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.borderBottom = '2px solid transparent';
    btn.style.color = theme.textDim;
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '13px';
    btn.addEventListener('click', () => {
      activeTab = tab.id;
      tabBar.querySelectorAll('button').forEach((b) => {
        (b as HTMLElement).style.borderBottomColor = 'transparent';
        (b as HTMLElement).style.color = theme.textDim;
      });
      btn.style.borderBottomColor = theme.accent;
      btn.style.color = theme.text;
      renderTab();
    });
    tabBar.appendChild(btn);
  }

  body.appendChild(tabBar);
  body.appendChild(content);

  // Activate the first tab
  const firstBtn = tabBar.querySelector('button');
  if (firstBtn) (firstBtn as HTMLElement).click();
}

/** Trigger a text file download in the browser. */
function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
