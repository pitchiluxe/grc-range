/**
 * Continuous Control Monitoring console window for the GRC Range desktop.
 *
 * Models the biggest realism gap in the rest of the lab: every other console
 * treats a fix as permanent. In practice, SOC 2 / ISO 27001 controls are
 * periodically re-tested and rot between audits. Here the student captures a
 * baseline of a handful of controls (once they believe those controls are
 * compliant), then advances a simulated clock by 30 or 90 days; a subset of
 * baselined controls may drift back toward non-compliance, each raising a
 * linked finding in the shared compliance register. "Re-test" restores the
 * control and remediates the finding.
 */

import { getTheme } from '@/ui/themes';
import { makeHeader, makeButton, severityColor } from '@/ui/consoleHelpers';
import type { GrcServices } from '@/vm/session';

/**
 * Render the Continuous Monitoring window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderContinuousMonitoringWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.overflow = 'hidden';

  const { header, btnRow } = makeHeader('Continuous Control Monitoring');
  const captureBtn = makeButton('Capture Baseline', 'primary');
  const advance30Btn = makeButton('Advance +30 Days', 'neutral');
  const advance90Btn = makeButton('Advance +90 Days', 'neutral');
  btnRow.appendChild(captureBtn);
  btnRow.appendChild(advance30Btn);
  btnRow.appendChild(advance90Btn);
  body.appendChild(header);

  const scroll = document.createElement('div');
  scroll.style.flex = '1';
  scroll.style.overflow = 'auto';
  scroll.style.padding = '16px';
  body.appendChild(scroll);

  function statusRow(label: string, value: string, warn: boolean): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 0';
    row.style.borderBottom = `1px solid ${theme.borderSubtle}`;
    row.style.fontSize = '13px';
    const l = document.createElement('span');
    l.textContent = label;
    l.style.color = theme.textDim;
    const v = document.createElement('span');
    v.textContent = value;
    v.style.color = warn ? theme.danger : theme.text;
    v.style.fontWeight = warn ? '700' : '400';
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }

  function render(): void {
    scroll.innerHTML = '';
    const drift = services.controlDrift;
    const baseline = drift.getBaseline();

    advance30Btn.disabled = !baseline;
    advance90Btn.disabled = !baseline;
    advance30Btn.style.opacity = baseline ? '1' : '0.5';
    advance90Btn.style.opacity = baseline ? '1' : '0.5';
    advance30Btn.style.cursor = baseline ? 'pointer' : 'not-allowed';
    advance90Btn.style.cursor = baseline ? 'pointer' : 'not-allowed';

    const baselineTitle = document.createElement('h3');
    baselineTitle.textContent = baseline ? `Baseline (captured day 0, now day ${drift.getDaysElapsed()})` : 'No baseline captured yet';
    baselineTitle.style.color = theme.accent;
    baselineTitle.style.fontSize = '14px';
    baselineTitle.style.margin = '0 0 8px 0';
    scroll.appendChild(baselineTitle);

    if (!baseline) {
      const hint = document.createElement('p');
      hint.textContent =
        'Remediate the password policy, FTP firewall rule, and Administrators group elsewhere in the lab, then click "Capture Baseline" to start monitoring for drift.';
      hint.style.color = theme.textDim;
      hint.style.fontSize = '13px';
      scroll.appendChild(hint);
      return;
    }

    scroll.appendChild(statusRow('Password minimum length', `${baseline.passwordMinLength} characters`, false));
    scroll.appendChild(statusRow('Password complexity required', baseline.passwordComplexity ? 'Yes' : 'No', false));
    scroll.appendChild(statusRow('Allow-FTP-Inbound rule', baseline.ftpRuleEnabled ? 'Enabled' : 'Disabled', false));
    scroll.appendChild(statusRow('Administrators group size', `${baseline.adminCount} members`, false));

    const eventsTitle = document.createElement('h3');
    eventsTitle.textContent = 'Drift Events';
    eventsTitle.style.color = theme.accent;
    eventsTitle.style.fontSize = '14px';
    eventsTitle.style.margin = '18px 0 8px 0';
    scroll.appendChild(eventsTitle);

    const events = drift.listDriftEvents();
    if (events.length === 0) {
      const none = document.createElement('p');
      none.textContent = 'No drift detected yet. Advance the simulated clock to re-check the baselined controls.';
      none.style.color = theme.textDim;
      none.style.fontSize = '13px';
      scroll.appendChild(none);
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const h of ['Detected', 'Control', 'Baseline', 'Drifted To', 'Status', '']) {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.textAlign = 'left';
      th.style.padding = '6px 10px';
      th.style.background = theme.bg;
      th.style.color = theme.textDim;
      th.style.borderBottom = `2px solid ${theme.border}`;
      th.style.fontSize = '11px';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    for (const event of events) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = `1px solid ${theme.border}`;
      const finding = event.findingId ? services.compliance.getFinding(event.findingId) : undefined;

      const cells = [
        event.detectedAt.slice(0, 10),
        event.controlName,
        event.baselineState,
        event.currentState,
      ];
      for (const text of cells) {
        const td = document.createElement('td');
        td.textContent = text;
        td.style.padding = '6px 10px';
        tr.appendChild(td);
      }

      const statusTd = document.createElement('td');
      statusTd.style.padding = '6px 10px';
      statusTd.textContent = event.resolvedAt ? 'Resolved' : 'Open';
      statusTd.style.color = event.resolvedAt
        ? theme.success
        : finding
          ? severityColor(finding.severity)
          : theme.danger;
      statusTd.style.fontWeight = '600';
      tr.appendChild(statusTd);

      const actionTd = document.createElement('td');
      actionTd.style.padding = '6px 10px';
      if (!event.resolvedAt) {
        const retestBtn = makeButton('Re-test & Restore', 'primary');
        retestBtn.style.fontSize = '11px';
        retestBtn.style.padding = '3px 10px';
        retestBtn.addEventListener('click', () => {
          drift.retestControl(event.id);
          render();
        });
        actionTd.appendChild(retestBtn);
      }
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    }
    scroll.appendChild(table);
  }

  captureBtn.addEventListener('click', () => {
    services.controlDrift.captureBaseline();
    render();
  });
  advance30Btn.addEventListener('click', () => {
    services.controlDrift.advanceTime(30);
    render();
  });
  advance90Btn.addEventListener('click', () => {
    services.controlDrift.advanceTime(90);
    render();
  });

  render();
}
