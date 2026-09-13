/**
 * Remediation Console window for the GRC Range desktop.
 *
 * The tool for fixing non-compliant findings. Lists open findings with
 * "Remediate" buttons. Each remediation action applies a specific fix:
 * Fix ACL, Disable Firewall Rule, Fix Password Policy, Remove from Admin,
 * Disable User, Enable Audit Logging. Before/after comparison is shown for
 * each remediation. A "Re-Audit" button verifies remediation, and a progress
 * indicator shows how many findings are remediated.
 */

import { getTheme } from '@/ui/themes';
import type { AclEntry, ComplianceFinding, PasswordPolicy } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/** Remediation action descriptor. */
interface RemediationAction {
  /** Finding id this action remediates. */
  findingId: string;
  /** Button label. */
  label: string;
  /** "Before" description. */
  before: string;
  /** Apply the remediation to the services. */
  apply: (services: GrcServices) => string;
}

/** The set of remediation actions keyed by finding id. */
const ACTIONS: RemediationAction[] = [
  {
    findingId: 'FND-001',
    label: 'Fix ACL',
    before: 'Finance_Share grants Everyone: FullControl',
    apply: (services) => {
      const acl: AclEntry[] = [
        { identity: 'BUILTIN\\Administrators', rights: 'FullControl', inheritance: '(CI)(OI)' },
        { identity: 'NT AUTHORITY\\SYSTEM', rights: 'FullControl', inheritance: '(CI)(OI)' },
        { identity: 'Authenticated Users', rights: 'Read', inheritance: '(CI)(OI)' },
      ];
      services.fs.setAcl('C:\\GRC_Lab_Data\\Finance_Share', acl);
      services.compliance.remediateFinding('FND-001');
      return 'Removed Everyone:FullControl; set Authenticated Users:Read';
    },
  },
  {
    findingId: 'FND-002',
    label: 'Fix ACL',
    before: 'HR_Records grants Everyone: FullControl',
    apply: (services) => {
      const acl: AclEntry[] = [
        { identity: 'BUILTIN\\Administrators', rights: 'FullControl', inheritance: '(CI)(OI)' },
        { identity: 'NT AUTHORITY\\SYSTEM', rights: 'FullControl', inheritance: '(CI)(OI)' },
        { identity: 'Authenticated Users', rights: 'Read', inheritance: '(CI)(OI)' },
      ];
      services.fs.setAcl('C:\\GRC_Lab_Data\\HR_Records', acl);
      services.compliance.remediateFinding('FND-002');
      return 'Removed Everyone:FullControl; set Authenticated Users:Read';
    },
  },
  {
    findingId: 'FND-003',
    label: 'Remove from Admin',
    before: 'Administrators: Administrator, svc_backup, temp_admin, intern_user',
    apply: (services) => {
      services.users.removeFromAdmin('temp_admin');
      services.users.removeFromAdmin('intern_user');
      services.users.removeFromAdmin('svc_backup');
      services.compliance.remediateFinding('FND-003');
      return 'Removed temp_admin, intern_user, svc_backup from Administrators';
    },
  },
  {
    findingId: 'FND-004',
    label: 'Fix Password Policy',
    before: 'min length 4, no complexity, no lockout',
    apply: (services) => {
      const policy: PasswordPolicy = {
        minLength: 14,
        complexity: true,
        minAge: 1,
        maxAge: 90,
        history: 24,
        lockoutThreshold: 5,
        lockoutDuration: 15,
      };
      services.password.setPolicy(policy);
      services.compliance.remediateFinding('FND-004');
      return 'Set min length 14, complexity on, history 24, max age 90, lockout 5/15min';
    },
  },
  {
    findingId: 'FND-005',
    label: 'Disable Firewall Rule',
    before: 'Allow-FTP-Inbound and Allow-Telnet-Inbound enabled on Any',
    apply: (services) => {
      const rules = services.firewall.listRules();
      for (const r of rules) {
        if (r.localPort === 21 || r.localPort === 23) {
          if (r.enabled) services.firewall.toggleRule(r.name);
        }
      }
      services.compliance.remediateFinding('FND-005');
      return 'Disabled Allow-FTP-Inbound and Allow-Telnet-Inbound rules';
    },
  },
  {
    findingId: 'FND-006',
    label: 'Disable Firewall Rule',
    before: 'Allow-RDP-Inbound enabled on Any profile',
    apply: (services) => {
      const rules = services.firewall.listRules();
      for (const r of rules) {
        if (r.localPort === 3389) {
          if (r.enabled) services.firewall.toggleRule(r.name);
        }
      }
      services.compliance.remediateFinding('FND-006');
      return 'Disabled Allow-RDP-Inbound rule';
    },
  },
  {
    findingId: 'FND-007',
    label: 'Disable User',
    before: 'svc_backup enabled with weak password and no expiry',
    apply: (services) => {
      services.users.toggleUser('svc_backup');
      services.compliance.remediateFinding('FND-007');
      return 'Disabled svc_backup account';
    },
  },
  {
    findingId: 'FND-008',
    label: 'Enable Audit Logging',
    before: 'Lockout threshold 0, no account lockout',
    apply: (services) => {
      const policy = services.password.getPolicy();
      policy.lockoutThreshold = 5;
      policy.lockoutDuration = 15;
      services.password.setPolicy(policy);
      services.compliance.remediateFinding('FND-008');
      return 'Set lockout threshold 5, lockout duration 15 minutes';
    },
  },
];

/**
 * Render the Remediation Console window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderRemediationConsoleWindow(body: HTMLElement, services: GrcServices): void {
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
  title.textContent = 'Remediation Console';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  header.appendChild(title);

  const reauditBtn = document.createElement('button');
  reauditBtn.textContent = 'Re-Audit';
  reauditBtn.style.padding = '5px 14px';
  reauditBtn.style.background = theme.accent;
  reauditBtn.style.color = '#fff';
  reauditBtn.style.border = 'none';
  reauditBtn.style.borderRadius = '4px';
  reauditBtn.style.cursor = 'pointer';
  reauditBtn.style.fontSize = '13px';
  header.appendChild(reauditBtn);

  body.appendChild(header);

  // Progress bar
  const progressSection = document.createElement('div');
  progressSection.style.padding = '12px 16px';
  progressSection.style.background = theme.bg;
  progressSection.style.borderBottom = `1px solid ${theme.border}`;

  const progressLabel = document.createElement('div');
  progressLabel.style.display = 'flex';
  progressLabel.style.justifyContent = 'space-between';
  progressLabel.style.fontSize = '13px';
  progressLabel.style.marginBottom = '6px';
  const progressText = document.createElement('span');
  progressText.textContent = 'Remediation Progress';
  const progressCount = document.createElement('span');
  progressCount.style.color = theme.accent;
  progressCount.style.fontWeight = '600';
  progressLabel.appendChild(progressText);
  progressLabel.appendChild(progressCount);
  progressSection.appendChild(progressLabel);

  const progressTrack = document.createElement('div');
  progressTrack.style.height = '8px';
  progressTrack.style.background = theme.border;
  progressTrack.style.borderRadius = '4px';
  progressTrack.style.overflow = 'hidden';
  const progressFill = document.createElement('div');
  progressFill.style.height = '100%';
  progressFill.style.background = theme.success;
  progressFill.style.borderRadius = '4px';
  progressFill.style.transition = 'width 0.3s';
  progressTrack.appendChild(progressFill);
  progressSection.appendChild(progressTrack);

  body.appendChild(progressSection);

  // Findings list
  const list = document.createElement('div');
  list.style.flex = '1';
  list.style.overflow = 'auto';
  list.style.padding = '16px';
  body.appendChild(list);

  function updateProgress(): void {
    const all = services.compliance.listFindings();
    const remediated = all.filter((f) => f.status === 'Remediated').length;
    const total = all.length;
    const pct = total > 0 ? (remediated / total) * 100 : 0;
    progressFill.style.width = `${pct}%`;
    progressCount.textContent = `${remediated} / ${total} remediated`;
  }

  function renderList(): void {
    list.innerHTML = '';
    const findings: ComplianceFinding[] = services.compliance.listFindings();

    for (const finding of findings) {
      const action = ACTIONS.find((a) => a.findingId === finding.id);
      if (!action) continue;

      const card = document.createElement('div');
      card.style.background = theme.bg;
      card.style.border = `1px solid ${theme.border}`;
      card.style.borderRadius = '8px';
      card.style.padding = '16px';
      card.style.marginBottom = '12px';

      // Top row: id, title, status
      const top = document.createElement('div');
      top.style.display = 'flex';
      top.style.justifyContent = 'space-between';
      top.style.alignItems = 'flex-start';
      top.style.marginBottom = '8px';

      const left = document.createElement('div');
      const id = document.createElement('div');
      id.textContent = finding.id;
      id.style.color = theme.textDim;
      id.style.fontSize = '12px';
      left.appendChild(id);
      const t = document.createElement('div');
      t.textContent = finding.title;
      t.style.fontWeight = '600';
      t.style.fontSize = '14px';
      left.appendChild(t);
      top.appendChild(left);

      const statusBadge = document.createElement('span');
      statusBadge.textContent = finding.status;
      statusBadge.style.padding = '3px 12px';
      statusBadge.style.borderRadius = '12px';
      statusBadge.style.fontSize = '12px';
      statusBadge.style.fontWeight = '600';
      if (finding.status === 'Open') {
        statusBadge.style.background = theme.danger;
        statusBadge.style.color = '#fff';
      } else {
        statusBadge.style.background = theme.success;
        statusBadge.style.color = '#fff';
      }
      top.appendChild(statusBadge);
      card.appendChild(top);

      // Before/after comparison
      const compare = document.createElement('div');
      compare.style.display = 'flex';
      compare.style.gap = '12px';
      compare.style.marginBottom = '12px';

      const beforeBox = document.createElement('div');
      beforeBox.style.flex = '1';
      beforeBox.style.padding = '8px 12px';
      beforeBox.style.background = theme.surface;
      beforeBox.style.borderRadius = '4px';
      beforeBox.style.borderLeft = `3px solid ${theme.danger}`;
      const beforeLabel = document.createElement('div');
      beforeLabel.textContent = 'Before';
      beforeLabel.style.fontSize = '11px';
      beforeLabel.style.color = theme.danger;
      beforeLabel.style.fontWeight = '600';
      beforeLabel.style.marginBottom = '4px';
      beforeBox.appendChild(beforeLabel);
      const beforeText = document.createElement('div');
      beforeText.textContent = action.before;
      beforeText.style.fontSize = '12px';
      beforeText.style.color = theme.textDim;
      beforeBox.appendChild(beforeText);
      compare.appendChild(beforeBox);

      const afterBox = document.createElement('div');
      afterBox.style.flex = '1';
      afterBox.style.padding = '8px 12px';
      afterBox.style.background = theme.surface;
      afterBox.style.borderRadius = '4px';
      afterBox.style.borderLeft = `3px solid ${finding.status === 'Remediated' ? theme.success : theme.border}`;
      const afterLabel = document.createElement('div');
      afterLabel.textContent = 'After';
      afterLabel.style.fontSize = '11px';
      afterLabel.style.color = finding.status === 'Remediated' ? theme.success : theme.textDim;
      afterLabel.style.fontWeight = '600';
      afterLabel.style.marginBottom = '4px';
      afterBox.appendChild(afterLabel);
      const afterText = document.createElement('div');
      afterText.textContent = finding.status === 'Remediated' ? (finding.remediatedAt ? `Remediated at ${finding.remediatedAt}` : 'Remediated') : 'Not yet remediated';
      afterText.style.fontSize = '12px';
      afterText.style.color = theme.textDim;
      afterBox.appendChild(afterText);
      compare.appendChild(afterBox);

      card.appendChild(compare);

      // Remediate button
      const remediateBtn = document.createElement('button');
      remediateBtn.textContent = action.label;
      remediateBtn.style.padding = '6px 16px';
      remediateBtn.style.border = 'none';
      remediateBtn.style.borderRadius = '4px';
      remediateBtn.style.cursor = 'pointer';
      remediateBtn.style.fontSize = '13px';
      remediateBtn.style.fontWeight = '600';

      if (finding.status === 'Open') {
        remediateBtn.style.background = theme.warning;
        remediateBtn.style.color = '#000';
        remediateBtn.addEventListener('click', () => {
          const result = action.apply(services);
          afterText.textContent = result;
          afterBox.style.borderLeftColor = theme.success;
          afterLabel.style.color = theme.success;
          statusBadge.textContent = 'Remediated';
          statusBadge.style.background = theme.success;
          remediateBtn.disabled = true;
          remediateBtn.textContent = 'Remediated';
          remediateBtn.style.background = theme.success;
          remediateBtn.style.color = '#fff';
          remediateBtn.style.cursor = 'default';
          updateProgress();
        });
      } else {
        remediateBtn.textContent = 'Remediated';
        remediateBtn.style.background = theme.success;
        remediateBtn.style.color = '#fff';
        remediateBtn.disabled = true;
        remediateBtn.style.cursor = 'default';
      }
      card.appendChild(remediateBtn);

      list.appendChild(card);
    }
  }

  reauditBtn.addEventListener('click', () => {
    renderList();
    updateProgress();
  });

  renderList();
  updateProgress();
}
