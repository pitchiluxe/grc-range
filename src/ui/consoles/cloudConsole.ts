/**
 * Cloud Misconfiguration console window for the GRC Range desktop.
 *
 * Mirrors the File Explorer / Firewall consoles' table-driven UX, but for a
 * small AWS-style cloud account: S3-style buckets, IAM roles, security-group
 * rules, and access keys. Each row that represents a misconfiguration links
 * back to its `ComplianceFinding` (FND-CLOUD-00x) in the shared compliance
 * register, and remediating a row here also remediates that finding — so the
 * Compliance Mapper and Risk Register stay in sync with what the student
 * fixes in this console.
 */

import { getTheme } from '@/ui/themes';
import { makeHeader, makeButton, severityColor } from '@/ui/consoleHelpers';
import type { GrcServices } from '@/vm/session';

/** Findings raised by the cloud account, keyed by the resource they describe. */
const FINDING_BY_BUCKET: Record<string, string> = { 'omari-customer-exports': 'FND-CLOUD-001' };
const FINDING_BY_ROLE: Record<string, string> = { 'omari-ec2-app-role': 'FND-CLOUD-002' };
const FINDING_BY_SG_RULE: Record<string, string> = {
  'sg-rule-ssh': 'FND-CLOUD-003',
  'sg-rule-rdp': 'FND-CLOUD-003',
};
const FINDING_BY_KEY: Record<string, string> = { 'key-svc-deploy': 'FND-CLOUD-004' };

/**
 * Render the Cloud Misconfiguration window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderCloudConsoleWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.overflow = 'hidden';

  const { header, btnRow } = makeHeader('Cloud Misconfiguration — omari-prod (AWS)');
  const refreshBtn = makeButton('Refresh', 'neutral');
  btnRow.appendChild(refreshBtn);
  body.appendChild(header);

  const scroll = document.createElement('div');
  scroll.style.flex = '1';
  scroll.style.overflow = 'auto';
  scroll.style.padding = '16px';
  body.appendChild(scroll);

  function section(title: string): HTMLElement {
    const h = document.createElement('h3');
    h.textContent = title;
    h.style.color = theme.accent;
    h.style.fontSize = '14px';
    h.style.margin = '18px 0 8px 0';
    scroll.appendChild(h);
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    table.style.marginBottom = '4px';
    scroll.appendChild(table);
    return table;
  }

  function headRow(table: HTMLElement, cols: string[]): void {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    for (const c of cols) {
      const th = document.createElement('th');
      th.textContent = c;
      th.style.textAlign = 'left';
      th.style.padding = '6px 10px';
      th.style.background = theme.bg;
      th.style.color = theme.textDim;
      th.style.borderBottom = `2px solid ${theme.border}`;
      th.style.fontSize = '11px';
      th.style.fontWeight = '600';
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  function cell(tr: HTMLTableRowElement, text: string, color?: string): HTMLElement {
    const td = document.createElement('td');
    td.textContent = text;
    td.style.padding = '6px 10px';
    if (color) {
      td.style.color = color;
      td.style.fontWeight = '600';
    }
    tr.appendChild(td);
    return td;
  }

  function render(): void {
    scroll.innerHTML = '';

    // --- Buckets -----------------------------------------------------
    const bucketTable = section('S3 Buckets');
    headRow(bucketTable, ['Bucket', 'Public Access', 'Encrypted', 'Contents', '']);
    const bucketBody = document.createElement('tbody');
    bucketTable.appendChild(bucketBody);
    for (const bucket of services.cloud.listBuckets()) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = `1px solid ${theme.border}`;
      cell(tr, bucket.name);
      cell(tr, bucket.publicAccess ? 'Public' : 'Private', bucket.publicAccess ? theme.danger : theme.success);
      cell(tr, bucket.encrypted ? 'Yes' : 'No', bucket.encrypted ? theme.success : theme.warning);
      cell(tr, bucket.contents);
      const actionTd = document.createElement('td');
      if (bucket.publicAccess) {
        const fixBtn = makeButton('Block Public Access', 'primary');
        fixBtn.style.fontSize = '11px';
        fixBtn.style.padding = '3px 10px';
        fixBtn.addEventListener('click', () => {
          services.cloud.setBucketPublicAccess(bucket.name, false);
          const findingId = FINDING_BY_BUCKET[bucket.name];
          if (findingId) services.compliance.remediateFinding(findingId);
          render();
        });
        actionTd.appendChild(fixBtn);
      }
      tr.appendChild(actionTd);
      bucketBody.appendChild(tr);
    }

    // --- IAM roles -----------------------------------------------------
    const roleTable = section('IAM Roles');
    headRow(roleTable, ['Role', 'Policy', 'Attached To', 'MFA', '']);
    const roleBody = document.createElement('tbody');
    roleTable.appendChild(roleBody);
    for (const role of services.cloud.listIamRoles()) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = `1px solid ${theme.border}`;
      const overprivileged = role.policy.includes('"Action":"*"');
      cell(tr, role.name);
      cell(tr, role.policy, overprivileged ? theme.danger : undefined);
      cell(tr, role.attachedTo);
      cell(tr, role.mfaEnforced ? 'Enforced' : 'Not enforced', role.mfaEnforced ? theme.success : theme.warning);
      const actionTd = document.createElement('td');
      if (overprivileged) {
        const fixBtn = makeButton('Scope to Least Privilege', 'primary');
        fixBtn.style.fontSize = '11px';
        fixBtn.style.padding = '3px 10px';
        fixBtn.addEventListener('click', () => {
          services.cloud.scopeIamPolicy(
            role.name,
            '{"Effect":"Allow","Action":["s3:GetObject","logs:PutLogEvents"],"Resource":"arn:aws:s3:::omari-app-static-assets/*"}',
          );
          const findingId = FINDING_BY_ROLE[role.name];
          if (findingId) services.compliance.remediateFinding(findingId);
          render();
        });
        actionTd.appendChild(fixBtn);
      }
      tr.appendChild(actionTd);
      roleBody.appendChild(tr);
    }

    // --- Security groups -------------------------------------------------
    const sgTable = section('Security Group: omari-app-sg');
    headRow(sgTable, ['Direction', 'Protocol', 'Port', 'Source', 'Description', '']);
    const sgBody = document.createElement('tbody');
    sgTable.appendChild(sgBody);
    for (const rule of services.cloud.listSecurityGroupRules()) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = `1px solid ${theme.border}`;
      const open = rule.cidr === '0.0.0.0/0' && rule.port !== 443;
      cell(tr, rule.direction);
      cell(tr, rule.protocol);
      cell(tr, String(rule.port));
      cell(tr, rule.cidr, open ? theme.danger : undefined);
      cell(tr, rule.description);
      const actionTd = document.createElement('td');
      if (open) {
        const fixBtn = makeButton('Restrict to VPN CIDR', 'primary');
        fixBtn.style.fontSize = '11px';
        fixBtn.style.padding = '3px 10px';
        fixBtn.addEventListener('click', () => {
          services.cloud.restrictSecurityGroupRule(rule.id, '10.0.99.0/24');
          const findingId = FINDING_BY_SG_RULE[rule.id];
          if (findingId) {
            const stillOpen = services.cloud
              .listSecurityGroupRules()
              .some((r) => r.cidr === '0.0.0.0/0' && r.port !== 443 && FINDING_BY_SG_RULE[r.id] === findingId);
            if (!stillOpen) services.compliance.remediateFinding(findingId);
          }
          render();
        });
        actionTd.appendChild(fixBtn);
      }
      tr.appendChild(actionTd);
      sgBody.appendChild(tr);
    }

    // --- Access keys -------------------------------------------------
    const keyTable = section('IAM Access Keys');
    headRow(keyTable, ['Owner', 'Created', 'Last Rotated', '']);
    const keyBody = document.createElement('tbody');
    keyTable.appendChild(keyBody);
    const now = Date.now();
    for (const key of services.cloud.listAccessKeys()) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = `1px solid ${theme.border}`;
      const ageDays = Math.floor((now - new Date(key.createdAt).getTime()) / 86_400_000);
      const stale = !key.lastRotatedAt && ageDays > 90;
      cell(tr, key.owner);
      cell(tr, key.createdAt.slice(0, 10));
      cell(tr, key.lastRotatedAt ? key.lastRotatedAt.slice(0, 10) : 'Never', stale ? theme.danger : undefined);
      const actionTd = document.createElement('td');
      if (stale) {
        const fixBtn = makeButton('Rotate Key', 'primary');
        fixBtn.style.fontSize = '11px';
        fixBtn.style.padding = '3px 10px';
        fixBtn.addEventListener('click', () => {
          services.cloud.rotateAccessKey(key.id);
          const findingId = FINDING_BY_KEY[key.id];
          if (findingId) services.compliance.remediateFinding(findingId);
          render();
        });
        actionTd.appendChild(fixBtn);
      }
      tr.appendChild(actionTd);
      keyBody.appendChild(tr);
    }

    // --- Linked findings summary -----------------------------------------
    const findingsTitle = document.createElement('h3');
    findingsTitle.textContent = 'Linked Compliance Findings';
    findingsTitle.style.color = theme.accent;
    findingsTitle.style.fontSize = '14px';
    findingsTitle.style.margin = '18px 0 8px 0';
    scroll.appendChild(findingsTitle);

    const cloudFindings = services.compliance
      .listFindings()
      .filter((f) => f.id.startsWith('FND-CLOUD-'));
    const list = document.createElement('div');
    for (const f of cloudFindings) {
      const row = document.createElement('div');
      row.style.padding = '6px 0';
      row.style.borderBottom = `1px solid ${theme.borderSubtle}`;
      row.style.fontSize = '12px';
      const badge = document.createElement('span');
      badge.textContent = f.severity;
      badge.style.color = severityColor(f.severity);
      badge.style.fontWeight = '700';
      badge.style.marginRight = '8px';
      row.appendChild(badge);
      const statusBadge = document.createElement('span');
      statusBadge.textContent = f.status;
      statusBadge.style.color = f.status === 'Open' ? theme.danger : theme.success;
      statusBadge.style.marginRight = '8px';
      row.appendChild(statusBadge);
      row.appendChild(document.createTextNode(`${f.id}: ${f.title}`));
      list.appendChild(row);
    }
    scroll.appendChild(list);
  }

  refreshBtn.addEventListener('click', render);
  render();
}
