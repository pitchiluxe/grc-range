/**
 * SecOps Dashboard console window for the GRC Range desktop.
 *
 * A security operations dashboard showing summary cards (Total Findings,
 * Critical Findings, Open vs Remediated, Risk Score), bar charts of findings
 * by severity and by framework, a recent audit events list, and status
 * indicators for firewall, password policy, and audit logging.
 */

import { getTheme } from '@/ui/themes';
import { FRAMEWORKS } from '@/config/complianceFrameworks';
import type { ComplianceFinding } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/** Severity badge color. */
function sevColor(sev: string, theme: { danger: string; warning: string; success: string }): string {
  if (sev === 'Critical') return theme.danger;
  if (sev === 'High') return theme.warning;
  if (sev === 'Medium') return '#eab308';
  return theme.success;
}

/**
 * Render the SecOps Dashboard window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderSecOpsDashboardWindow(body: HTMLElement, services: GrcServices): void {
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
  header.style.padding = '8px 16px';
  header.style.background = theme.bg;
  header.style.borderBottom = `1px solid ${theme.border}`;
  header.style.fontWeight = '600';
  header.style.fontSize = '15px';
  header.textContent = 'SecOps Dashboard';
  body.appendChild(header);

  // Scrollable content
  const scroll = document.createElement('div');
  scroll.style.flex = '1';
  scroll.style.overflow = 'auto';
  scroll.style.padding = '16px';
  scroll.style.display = 'flex';
  scroll.style.flexDirection = 'column';
  scroll.style.gap = '20px';

  const findings: ComplianceFinding[] = services.compliance.listFindings();
  const open = findings.filter((f) => f.status === 'Open');
  const remediated = findings.filter((f) => f.status === 'Remediated');
  const critical = findings.filter((f) => f.severity === 'Critical');
  const risks = services.compliance.listRisks();
  const avgRisk = risks.length > 0
    ? Math.round(risks.reduce((sum, r) => sum + r.inherentRisk, 0) / risks.length)
    : 0;

  // Summary cards
  const cardsRow = document.createElement('div');
  cardsRow.style.display = 'grid';
  cardsRow.style.gridTemplateColumns = 'repeat(4, 1fr)';
  cardsRow.style.gap = '12px';

  function summaryCard(label: string, value: string, color: string): void {
    const card = document.createElement('div');
    card.style.background = theme.bg;
    card.style.border = `1px solid ${theme.border}`;
    card.style.borderRadius = '8px';
    card.style.padding = '16px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '4px';

    const v = document.createElement('div');
    v.textContent = value;
    v.style.fontSize = '28px';
    v.style.fontWeight = '700';
    v.style.color = color;
    card.appendChild(v);

    const l = document.createElement('div');
    l.textContent = label;
    l.style.fontSize = '12px';
    l.style.color = theme.textDim;
    card.appendChild(l);

    cardsRow.appendChild(card);
  }

  summaryCard('Total Findings', String(findings.length), theme.text);
  summaryCard('Critical Findings', String(critical.length), theme.danger);
  summaryCard('Open / Remediated', `${open.length} / ${remediated.length}`, theme.warning);
  summaryCard('Avg Risk Score', String(avgRisk), avgRisk >= 15 ? theme.danger : avgRisk >= 10 ? theme.warning : theme.success);

  scroll.appendChild(cardsRow);

  // Charts row
  const chartsRow = document.createElement('div');
  chartsRow.style.display = 'grid';
  chartsRow.style.gridTemplateColumns = '1fr 1fr';
  chartsRow.style.gap = '16px';

  // Findings by severity bar chart
  const sevChart = makeChart('Findings by Severity', theme);
  const sevCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const f of findings) {
    sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1;
  }
  const maxSev = Math.max(...Object.values(sevCounts), 1);
  for (const [sev, count] of Object.entries(sevCounts)) {
    sevChart.addBar(sev, count, sevColor(sev, theme), maxSev);
  }
  chartsRow.appendChild(sevChart.container);

  // Findings by framework bar chart
  const fwChart = makeChart('Findings by Framework', theme);
  const fwCounts: Record<string, number> = {};
  for (const f of findings) {
    for (const fw of f.frameworks) {
      const key = fw.split(' ')[0] ?? fw;
      fwCounts[key] = (fwCounts[key] ?? 0) + 1;
    }
  }
  const maxFw = Math.max(...Object.values(fwCounts), 1);
  for (const [fw, count] of Object.entries(fwCounts)) {
    fwChart.addBar(fw, count, theme.accent, maxFw);
  }
  chartsRow.appendChild(fwChart.container);

  scroll.appendChild(chartsRow);

  // Status indicators
  const statusSection = document.createElement('div');
  statusSection.style.display = 'flex';
  statusSection.style.gap = '16px';

  function statusIndicator(label: string, ok: boolean, detail: string): void {
    const card = document.createElement('div');
    card.style.flex = '1';
    card.style.background = theme.bg;
    card.style.border = `1px solid ${theme.border}`;
    card.style.borderRadius = '8px';
    card.style.padding = '14px 16px';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.gap = '10px';

    const dot = document.createElement('div');
    dot.style.width = '12px';
    dot.style.height = '12px';
    dot.style.borderRadius = '50%';
    dot.style.background = ok ? theme.success : theme.danger;
    dot.style.flexShrink = '0';
    card.appendChild(dot);

    const info = document.createElement('div');
    const l = document.createElement('div');
    l.textContent = label;
    l.style.fontWeight = '600';
    l.style.fontSize = '13px';
    info.appendChild(l);
    const d = document.createElement('div');
    d.textContent = detail;
    d.style.fontSize = '12px';
    d.style.color = theme.textDim;
    info.appendChild(d);
    card.appendChild(info);

    statusSection.appendChild(card);
  }

  const firewallOk = !services.firewall.listRules().some((r) =>
    r.enabled && r.action === 'Allow' && r.direction === 'Inbound' && (r.localPort === 21 || r.localPort === 23));
  const policy = services.password.getPolicy();
  const passwordOk = policy.minLength >= 14 && policy.complexity;
  const auditOk = services.audit.listEvents().length > 0;

  statusIndicator('Firewall', firewallOk, firewallOk ? 'No insecure inbound rules' : 'Insecure rules detected');
  statusIndicator('Password Policy', passwordOk, passwordOk ? 'Meets baseline' : `Min length ${policy.minLength}, complexity ${policy.complexity ? 'on' : 'off'}`);
  statusIndicator('Audit Logging', auditOk, auditOk ? 'Security log active' : 'No events logged');

  scroll.appendChild(statusSection);

  // Recent audit events
  const eventsSection = document.createElement('div');
  const eventsTitle = document.createElement('h3');
  eventsTitle.textContent = 'Recent Audit Events';
  eventsTitle.style.color = theme.accent;
  eventsTitle.style.fontSize = '15px';
  eventsTitle.style.margin = '0 0 12px 0';
  eventsSection.appendChild(eventsTitle);

  const events = services.audit.listEvents().slice(-6).reverse();
  for (const e of events) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '12px';
    row.style.padding = '8px 12px';
    row.style.background = theme.bg;
    row.style.borderRadius = '4px';
    row.style.marginBottom = '4px';
    row.style.fontSize = '13px';

    const dot = document.createElement('div');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.flexShrink = '0';
    dot.style.background = e.level === 'Error' ? theme.danger : e.level === 'Warning' ? theme.warning : theme.success;
    row.appendChild(dot);

    const ts = document.createElement('span');
    ts.textContent = e.timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');
    ts.style.color = theme.textDim;
    ts.style.fontSize = '12px';
    ts.style.minWidth = '140px';
    row.appendChild(ts);

    const id = document.createElement('span');
    id.textContent = String(e.eventId);
    id.style.color = theme.accent;
    id.style.fontWeight = '600';
    id.style.minWidth = '50px';
    row.appendChild(id);

    const msg = document.createElement('span');
    msg.textContent = e.message;
    msg.style.color = theme.text;
    msg.style.flex = '1';
    msg.style.overflow = 'hidden';
    msg.style.textOverflow = 'ellipsis';
    msg.style.whiteSpace = 'nowrap';
    row.appendChild(msg);

    eventsSection.appendChild(row);
  }

  scroll.appendChild(eventsSection);
  body.appendChild(scroll);
}

/** Create a bar chart container with an addBar method. */
function makeChart(title: string, theme: { bg: string; surface: string; border: string; text: string; textDim: string; accent: string }): {
  container: HTMLElement;
  addBar: (label: string, value: number, color: string, max: number) => void;
} {
  const container = document.createElement('div');
  container.style.background = theme.bg;
  container.style.border = `1px solid ${theme.border}`;
  container.style.borderRadius = '8px';
  container.style.padding = '16px';

  const h = document.createElement('div');
  h.textContent = title;
  h.style.fontWeight = '600';
  h.style.fontSize = '14px';
  h.style.marginBottom = '12px';
  h.style.color = theme.text;
  container.appendChild(h);

  const bars = document.createElement('div');
  bars.style.display = 'flex';
  bars.style.flexDirection = 'column';
  bars.style.gap = '8px';
  container.appendChild(bars);

  function addBar(label: string, value: number, color: string, max: number): void {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const l = document.createElement('div');
    l.textContent = label;
    l.style.minWidth = '80px';
    l.style.fontSize = '12px';
    l.style.color = theme.textDim;
    row.appendChild(l);

    const track = document.createElement('div');
    track.style.flex = '1';
    track.style.height = '20px';
    track.style.background = theme.surface;
    track.style.borderRadius = '3px';
    track.style.overflow = 'hidden';

    const fill = document.createElement('div');
    fill.style.height = '100%';
    fill.style.width = `${(value / max) * 100}%`;
    fill.style.background = color;
    fill.style.borderRadius = '3px';
    fill.style.transition = 'width 0.3s';
    track.appendChild(fill);
    row.appendChild(track);

    const v = document.createElement('div');
    v.textContent = String(value);
    v.style.minWidth = '24px';
    v.style.textAlign = 'right';
    v.style.fontSize = '12px';
    v.style.fontWeight = '600';
    v.style.color = theme.text;
    row.appendChild(v);

    bars.appendChild(row);
  }

  return { container, addBar };
}
