/**
 * Evidence Pack console window for the GRC Range desktop.
 *
 * Collects audit evidence for the portfolio. Displays a checklist of evidence
 * items to capture (screenshots of directory structure, ACLs, open ports, weak
 * password policy, admin group members, compliance findings, risk register,
 * and remediation results). A "Generate Evidence Report" button creates a
 * formatted markdown report, and an "Export to Clipboard" button copies it.
 */

import { getTheme } from '@/ui/themes';
import { VM_HOST } from '@/config/vmHost';
import { PRODUCT } from '@/config/product';
import type { GrcServices } from '@/vm/session';

/** An evidence checklist item. */
interface EvidenceItem {
  /** Unique id. */
  id: string;
  /** Display label. */
  label: string;
  /** Description of what to capture. */
  description: string;
  /** Whether the item has been captured (checked). */
  captured: boolean;
}

/**
 * Render the Evidence Pack window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderEvidencePackWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  // Header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '8px 16px';
  header.style.background = theme.bg;
  header.style.borderBottom = `1px solid ${theme.border}`;

  const title = document.createElement('div');
  title.textContent = 'Evidence Pack';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  header.appendChild(title);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';

  const genBtn = document.createElement('button');
  genBtn.textContent = 'Generate Evidence Report';
  genBtn.style.padding = '5px 14px';
  genBtn.style.background = theme.accent;
  genBtn.style.color = '#fff';
  genBtn.style.border = 'none';
  genBtn.style.borderRadius = '4px';
  genBtn.style.cursor = 'pointer';
  genBtn.style.fontSize = '13px';

  const clipBtn = document.createElement('button');
  clipBtn.textContent = 'Export to Clipboard';
  clipBtn.style.padding = '5px 14px';
  clipBtn.style.background = theme.surfaceHover;
  clipBtn.style.color = theme.text;
  clipBtn.style.border = `1px solid ${theme.border}`;
  clipBtn.style.borderRadius = '4px';
  clipBtn.style.cursor = 'pointer';
  clipBtn.style.fontSize = '13px';

  btnRow.appendChild(genBtn);
  btnRow.appendChild(clipBtn);
  header.appendChild(btnRow);
  body.appendChild(header);

  // Progress
  const progressSection = document.createElement('div');
  progressSection.style.padding = '12px 16px';
  progressSection.style.background = theme.bg;
  progressSection.style.borderBottom = `1px solid ${theme.border}`;
  progressSection.style.fontSize = '13px';
  progressSection.style.color = theme.textDim;
  body.appendChild(progressSection);

  // Checklist
  const list = document.createElement('div');
  list.style.flex = '1';
  list.style.overflow = 'auto';
  list.style.padding = '16px';
  body.appendChild(list);

  const items: EvidenceItem[] = [
    { id: 'dir-structure', label: 'Screenshot of directory structure', description: 'Capture the C:\\GRC_Lab_Data directory tree in File Explorer.', captured: false },
    { id: 'acls', label: 'Screenshot of ACLs (Everyone: FullControl)', description: 'Run icacls on Finance_Share and HR_Records showing the over-permissive ACL.', captured: false },
    { id: 'open-ports', label: 'Screenshot of open ports', description: 'Run netstat -ano or Get-NetFirewallRule showing FTP/Telnet/RDP open.', captured: false },
    { id: 'password-policy', label: 'Screenshot of weak password policy', description: 'Run net accounts showing min length 4, no complexity.', captured: false },
    { id: 'admin-group', label: 'Screenshot of admin group members', description: 'Run net localgroup Administrators showing temp_admin, intern_user, svc_backup.', captured: false },
    { id: 'compliance-findings', label: 'Screenshot of compliance findings', description: 'Capture the Audit Console or Compliance Mapper showing all findings.', captured: false },
    { id: 'risk-register', label: 'Screenshot of risk register', description: 'Capture the Risk Register showing the 5x5 matrix and risk items.', captured: false },
    { id: 'remediation', label: 'Screenshot of remediation results', description: 'Capture the Remediation Console showing before/after comparisons.', captured: false },
  ];

  function updateProgress(): void {
    const captured = items.filter((i) => i.captured).length;
    progressSection.textContent = `Evidence captured: ${captured} / ${items.length}`;
  }

  function renderList(): void {
    list.innerHTML = '';
    for (const item of items) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'flex-start';
      row.style.gap = '12px';
      row.style.padding = '12px 16px';
      row.style.background = theme.bg;
      row.style.border = `1px solid ${theme.border}`;
      row.style.borderRadius = '6px';
      row.style.marginBottom = '8px';
      row.style.cursor = 'pointer';

      const checkbox = document.createElement('div');
      checkbox.style.width = '20px';
      checkbox.style.height = '20px';
      checkbox.style.borderRadius = '4px';
      checkbox.style.border = `2px solid ${item.captured ? theme.success : theme.border}`;
      checkbox.style.background = item.captured ? theme.success : 'transparent';
      checkbox.style.display = 'flex';
      checkbox.style.alignItems = 'center';
      checkbox.style.justifyContent = 'center';
      checkbox.style.flexShrink = '0';
      checkbox.style.fontSize = '14px';
      checkbox.style.color = '#fff';
      if (item.captured) checkbox.textContent = '\u2713';

      const content = document.createElement('div');
      content.style.flex = '1';
      const label = document.createElement('div');
      label.textContent = item.label;
      label.style.fontWeight = '600';
      label.style.fontSize = '14px';
      if (item.captured) label.style.color = theme.success;
      content.appendChild(label);
      const desc = document.createElement('div');
      desc.textContent = item.description;
      desc.style.color = theme.textDim;
      desc.style.fontSize = '12px';
      desc.style.marginTop = '2px';
      content.appendChild(desc);

      row.appendChild(checkbox);
      row.appendChild(content);

      row.addEventListener('click', () => {
        item.captured = !item.captured;
        renderList();
        updateProgress();
      });
      list.appendChild(row);
    }
  }

  function generateReport(): string {
    const findings = services.compliance.listFindings();
    const risks = services.compliance.listRisks();
    const users = services.users.listUsers();
    const admins = services.users.listAdministrators();
    const rules = services.firewall.listRules();
    const policy = services.password.getPolicy();
    const events = services.audit.listEvents();

    const lines: string[] = [
      '# GRC Range - Evidence Pack Report',
      '',
      `**Host:** ${VM_HOST.hostname} (${VM_HOST.os})`,
      `**Product:** ${PRODUCT.name} v${PRODUCT.version}`,
      `**Generated:** ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '## Evidence Checklist',
      '',
    ];
    for (const item of items) {
      lines.push(`- [${item.captured ? 'x' : ' '}] ${item.label}`);
      lines.push(`  - ${item.description}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Audit Findings Summary');
    lines.push('');
    lines.push(`| ID | Severity | Title | Status |`);
    lines.push(`|----|----------|-------|--------|`);
    for (const f of findings) {
      lines.push(`| ${f.id} | ${f.severity} | ${f.title} | ${f.status} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Local Users');
    lines.push('');
    lines.push(`| Username | Enabled | Is Admin | Description |`);
    lines.push(`|----------|---------|----------|-------------|`);
    for (const u of users) {
      lines.push(`| ${u.username} | ${u.enabled ? 'Yes' : 'No'} | ${u.isAdmin ? 'Yes' : 'No'} | ${u.description} |`);
    }
    lines.push('');
    lines.push(`**Administrators group:** ${admins.join(', ')}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Password Policy');
    lines.push('');
    lines.push(`- Min length: ${policy.minLength}`);
    lines.push(`- Complexity: ${policy.complexity ? 'Enabled' : 'Disabled'}`);
    lines.push(`- Max age: ${policy.maxAge} days`);
    lines.push(`- History: ${policy.history}`);
    lines.push(`- Lockout threshold: ${policy.lockoutThreshold}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Firewall Rules (Enabled Inbound Allow)');
    lines.push('');
    lines.push(`| Name | Port | Protocol | Profile |`);
    lines.push(`|------|------|----------|---------|`);
    for (const r of rules) {
      if (r.enabled && r.action === 'Allow' && r.direction === 'Inbound') {
        lines.push(`| ${r.displayName} | ${r.localPort} | ${r.protocol} | ${r.profile} |`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Risk Register Summary');
    lines.push('');
    lines.push(`| Finding | Inherent Risk | Residual Risk | Owner |`);
    lines.push(`|---------|--------------|---------------|-------|`);
    for (const r of risks) {
      lines.push(`| ${r.finding} | ${r.inherentRisk} | ${r.residualRisk} | ${r.owner} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Recent Audit Events');
    lines.push('');
    for (const e of events.slice(-5)) {
      lines.push(`- ${e.timestamp} | Event ${e.eventId} | ${e.message}`);
    }
    lines.push('');
    return lines.join('\n');
  }

  genBtn.addEventListener('click', () => {
    const report = generateReport();
    downloadText('grc-evidence-pack.md', report);
  });

  clipBtn.addEventListener('click', async () => {
    const report = generateReport();
    try {
      await navigator.clipboard.writeText(report);
      clipBtn.textContent = 'Copied!';
      setTimeout(() => { clipBtn.textContent = 'Export to Clipboard'; }, 2000);
    } catch {
      clipBtn.textContent = 'Copy failed';
      setTimeout(() => { clipBtn.textContent = 'Export to Clipboard'; }, 2000);
    }
  });

  renderList();
  updateProgress();
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
