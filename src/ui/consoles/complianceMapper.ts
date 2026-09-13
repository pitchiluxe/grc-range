/**
 * Compliance Framework Mapper console window for the GRC Range desktop.
 *
 * Maps technical findings to compliance frameworks. The left panel lists
 * findings (from the compliance service); the right panel shows framework
 * mappings for the selected finding. Each finding displays a severity badge,
 * description, evidence, and status. Filters by framework and severity are
 * provided. A "Generate Audit Report" button creates a formatted report.
 */

import { getTheme } from '@/ui/themes';
import { FRAMEWORKS } from '@/config/complianceFrameworks';
import type { ComplianceFinding } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/** Severity badge color mapping. */
function severityColor(sev: string, theme: { danger: string; warning: string; success: string }): string {
  if (sev === 'Critical') return theme.danger;
  if (sev === 'High') return theme.warning;
  if (sev === 'Medium') return '#eab308';
  return theme.success;
}

/**
 * Render the Compliance Mapper window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderComplianceMapperWindow(body: HTMLElement, services: GrcServices): void {
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
  title.textContent = 'Compliance Framework Mapper';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  header.appendChild(title);

  const reportBtn = document.createElement('button');
  reportBtn.textContent = 'Generate Audit Report';
  reportBtn.style.padding = '5px 14px';
  reportBtn.style.background = theme.accent;
  reportBtn.style.color = '#fff';
  reportBtn.style.border = 'none';
  reportBtn.style.borderRadius = '4px';
  reportBtn.style.cursor = 'pointer';
  reportBtn.style.fontSize = '13px';
  header.appendChild(reportBtn);

  body.appendChild(header);

  // Filter bar
  const filterBar = document.createElement('div');
  filterBar.style.display = 'flex';
  filterBar.style.alignItems = 'center';
  filterBar.style.gap = '12px';
  filterBar.style.padding = '8px 16px';
  filterBar.style.background = theme.bg;
  filterBar.style.borderBottom = `1px solid ${theme.border}`;

  const fwLabel = document.createElement('label');
  fwLabel.textContent = 'Framework:';
  fwLabel.style.fontSize = '13px';
  fwLabel.style.color = theme.textDim;

  const fwSelect = document.createElement('select');
  fwSelect.style.padding = '4px 8px';
  fwSelect.style.background = theme.surface;
  fwSelect.style.color = theme.text;
  fwSelect.style.border = `1px solid ${theme.border}`;
  fwSelect.style.borderRadius = '4px';
  fwSelect.style.fontSize = '13px';
  const allFwOpt = document.createElement('option');
  allFwOpt.textContent = 'All Frameworks';
  allFwOpt.value = '';
  fwSelect.appendChild(allFwOpt);
  for (const fw of FRAMEWORKS) {
    const opt = document.createElement('option');
    opt.textContent = fw.name;
    opt.value = fw.id;
    fwSelect.appendChild(opt);
  }

  const sevLabel = document.createElement('label');
  sevLabel.textContent = 'Severity:';
  sevLabel.style.fontSize = '13px';
  sevLabel.style.color = theme.textDim;

  const sevSelect = document.createElement('select');
  sevSelect.style.padding = '4px 8px';
  sevSelect.style.background = theme.surface;
  sevSelect.style.color = theme.text;
  sevSelect.style.border = `1px solid ${theme.border}`;
  sevSelect.style.borderRadius = '4px';
  sevSelect.style.fontSize = '13px';
  for (const s of ['All', 'Critical', 'High', 'Medium', 'Low']) {
    const opt = document.createElement('option');
    opt.textContent = s;
    opt.value = s === 'All' ? '' : s;
    sevSelect.appendChild(opt);
  }

  filterBar.appendChild(fwLabel);
  filterBar.appendChild(fwSelect);
  filterBar.appendChild(sevLabel);
  filterBar.appendChild(sevSelect);
  body.appendChild(filterBar);

  // Main split
  const main = document.createElement('div');
  main.style.flex = '1';
  main.style.display = 'flex';
  main.style.overflow = 'hidden';

  // Left panel: findings list
  const leftPanel = document.createElement('div');
  leftPanel.style.width = '360px';
  leftPanel.style.flexShrink = '0';
  leftPanel.style.overflow = 'auto';
  leftPanel.style.background = theme.bg;
  leftPanel.style.borderRight = `1px solid ${theme.border}`;
  leftPanel.style.padding = '8px';

  // Right panel: finding detail
  const rightPanel = document.createElement('div');
  rightPanel.style.flex = '1';
  rightPanel.style.overflow = 'auto';
  rightPanel.style.padding = '20px 24px';

  let selectedId: string | null = null;

  function getFilteredFindings(): ComplianceFinding[] {
    let findings = services.compliance.listFindings();
    const fwVal = fwSelect.value;
    const sevVal = sevSelect.value;
    if (fwVal) {
      const fw = FRAMEWORKS.find((f) => f.id === fwVal);
      if (fw) {
        findings = findings.filter((f) => f.frameworks.some((fwName) => fwName.includes(fw.name.split(' ')[0] ?? '')));
      }
    }
    if (sevVal) {
      findings = findings.filter((f) => f.severity === sevVal);
    }
    return findings;
  }

  function renderFindingsList(): void {
    leftPanel.innerHTML = '';
    const findings = getFilteredFindings();
    if (findings.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No findings match the current filters.';
      empty.style.color = theme.textDim;
      empty.style.padding = '16px';
      empty.style.fontSize = '13px';
      leftPanel.appendChild(empty);
      return;
    }
    for (const f of findings) {
      const card = document.createElement('div');
      card.style.padding = '10px 12px';
      card.style.background = selectedId === f.id ? theme.surfaceHover : 'transparent';
      card.style.border = `1px solid ${selectedId === f.id ? theme.accent : theme.border}`;
      card.style.borderRadius = '6px';
      card.style.marginBottom = '6px';
      card.style.cursor = 'pointer';

      const top = document.createElement('div');
      top.style.display = 'flex';
      top.style.justifyContent = 'space-between';
      top.style.alignItems = 'center';
      top.style.marginBottom = '4px';

      const id = document.createElement('span');
      id.textContent = f.id;
      id.style.color = theme.textDim;
      id.style.fontSize = '11px';
      top.appendChild(id);

      const badge = document.createElement('span');
      badge.textContent = f.severity;
      badge.style.background = severityColor(f.severity, theme);
      badge.style.color = '#fff';
      badge.style.padding = '2px 8px';
      badge.style.borderRadius = '10px';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '600';
      top.appendChild(badge);
      card.appendChild(top);

      const t = document.createElement('div');
      t.textContent = f.title;
      t.style.fontSize = '13px';
      t.style.fontWeight = '500';
      t.style.marginBottom = '4px';
      card.appendChild(t);

      const status = document.createElement('div');
      status.style.display = 'flex';
      status.style.alignItems = 'center';
      status.style.gap = '6px';
      const dot = document.createElement('span');
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.background = f.status === 'Open' ? theme.danger : theme.success;
      status.appendChild(dot);
      const statusText = document.createElement('span');
      statusText.textContent = f.status;
      statusText.style.fontSize = '11px';
      statusText.style.color = theme.textDim;
      status.appendChild(statusText);
      card.appendChild(status);

      card.addEventListener('click', () => {
        selectedId = f.id;
        renderFindingsList();
        renderDetail(f);
      });
      leftPanel.appendChild(card);
    }
  }

  function renderDetail(f: ComplianceFinding): void {
    rightPanel.innerHTML = '';

    const id = document.createElement('div');
    id.textContent = `${f.id} - ${f.category}`;
    id.style.color = theme.textDim;
    id.style.fontSize = '13px';
    id.style.marginBottom = '4px';
    rightPanel.appendChild(id);

    const title = document.createElement('h2');
    title.textContent = f.title;
    title.style.color = theme.text;
    title.style.fontSize = '18px';
    title.style.margin = '0 0 12px 0';
    rightPanel.appendChild(title);

    // Severity + status badges
    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.gap = '8px';
    badges.style.marginBottom = '16px';

    const sevBadge = document.createElement('span');
    sevBadge.textContent = f.severity;
    sevBadge.style.background = severityColor(f.severity, theme);
    sevBadge.style.color = '#fff';
    sevBadge.style.padding = '3px 12px';
    sevBadge.style.borderRadius = '12px';
    sevBadge.style.fontSize = '12px';
    sevBadge.style.fontWeight = '600';
    badges.appendChild(sevBadge);

    const statusBadge = document.createElement('span');
    statusBadge.textContent = f.status;
    statusBadge.style.background = f.status === 'Open' ? theme.danger : theme.success;
    statusBadge.style.color = '#fff';
    statusBadge.style.padding = '3px 12px';
    statusBadge.style.borderRadius = '12px';
    statusBadge.style.fontSize = '12px';
    statusBadge.style.fontWeight = '600';
    badges.appendChild(statusBadge);
    rightPanel.appendChild(badges);

    // Description
    const descH = document.createElement('div');
    descH.textContent = 'Description';
    descH.style.fontWeight = '600';
    descH.style.marginBottom = '4px';
    descH.style.fontSize = '14px';
    rightPanel.appendChild(descH);
    const desc = document.createElement('p');
    desc.textContent = f.description;
    desc.style.color = theme.textDim;
    desc.style.fontSize = '13px';
    desc.style.lineHeight = '1.6';
    desc.style.margin = '0 0 16px 0';
    rightPanel.appendChild(desc);

    // Evidence
    const evH = document.createElement('div');
    evH.textContent = 'Evidence';
    evH.style.fontWeight = '600';
    evH.style.marginBottom = '4px';
    evH.style.fontSize = '14px';
    rightPanel.appendChild(evH);
    const ev = document.createElement('pre');
    ev.textContent = f.evidence;
    ev.style.background = theme.bg;
    ev.style.padding = '12px';
    ev.style.borderRadius = '6px';
    ev.style.border = `1px solid ${theme.border}`;
    ev.style.fontSize = '12px';
    ev.style.fontFamily = "'Consolas', monospace";
    ev.style.color = theme.text;
    ev.style.margin = '0 0 20px 0';
    ev.style.whiteSpace = 'pre-wrap';
    rightPanel.appendChild(ev);

    // Framework mappings
    const mapH = document.createElement('div');
    mapH.textContent = 'Framework Mappings';
    mapH.style.fontWeight = '600';
    mapH.style.marginBottom = '8px';
    mapH.style.fontSize = '14px';
    rightPanel.appendChild(mapH);

    for (const fwName of f.frameworks) {
      const card = document.createElement('div');
      card.style.background = theme.bg;
      card.style.border = `1px solid ${theme.border}`;
      card.style.borderRadius = '6px';
      card.style.padding = '12px 16px';
      card.style.marginBottom = '8px';

      const name = document.createElement('div');
      name.textContent = fwName;
      name.style.color = theme.accent;
      name.style.fontWeight = '600';
      name.style.fontSize = '13px';
      name.style.marginBottom = '4px';
      card.appendChild(name);

      // Find matching framework
      const match = FRAMEWORKS.find((fw) => fwName.includes(fw.name.split(' ')[0] ?? ''));
      if (match) {
        const fwDesc = document.createElement('div');
        fwDesc.textContent = match.description;
        fwDesc.style.color = theme.textDim;
        fwDesc.style.fontSize = '12px';
        card.appendChild(fwDesc);
      }
      rightPanel.appendChild(card);
    }
  }

  fwSelect.addEventListener('change', renderFindingsList);
  sevSelect.addEventListener('change', renderFindingsList);

  // Generate audit report
  reportBtn.addEventListener('click', () => {
    const findings = services.compliance.listFindings();
    const lines: string[] = [
      '# GRC Range - Audit Finding Report',
      '',
      `**Generated:** ${new Date().toISOString()}`,
      `**Total Findings:** ${findings.length}`,
      `**Open:** ${findings.filter((f) => f.status === 'Open').length}`,
      `**Remediated:** ${findings.filter((f) => f.status === 'Remediated').length}`,
      '',
      '---',
      '',
    ];
    for (const f of findings) {
      lines.push(`## ${f.id}: ${f.title}`);
      lines.push('');
      lines.push(`- **Severity:** ${f.severity}`);
      lines.push(`- **Category:** ${f.category}`);
      lines.push(`- **Status:** ${f.status}`);
      lines.push(`- **Description:** ${f.description}`);
      lines.push(`- **Evidence:** ${f.evidence}`);
      lines.push(`- **Frameworks:** ${f.frameworks.join(', ')}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    downloadText('grc-audit-report.md', lines.join('\n'));
  });

  main.appendChild(leftPanel);
  main.appendChild(rightPanel);
  body.appendChild(main);

  renderFindingsList();
  // Select the first finding by default
  const first = getFilteredFindings()[0];
  if (first) {
    selectedId = first.id;
    renderFindingsList();
    renderDetail(first);
  } else {
    rightPanel.innerHTML = '<div style="color:#8b919e">Select a finding to view details.</div>';
  }
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
