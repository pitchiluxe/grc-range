/**
 * Third-Party / Vendor Risk console window for the GRC Range desktop.
 *
 * A list of vendors + a detail panel showing a fictional SOC 2 excerpt and
 * SIG-lite questionnaire, a decision form (Approve / Conditional / Reject),
 * and a "Send to Risk Register" action that adds a `RiskItem` derived from
 * the vendor into the same shared risk register the Risk Register console
 * reads from.
 */

import { getTheme } from '@/ui/themes';
import { makeHeader, makeButton, makeField, styleInput } from '@/ui/consoleHelpers';
import type { Vendor, RiskItem } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

const STATUS_LABEL: Record<Vendor['status'], string> = {
  Approved: 'Approved',
  Conditional: 'Conditional',
  Rejected: 'Rejected',
  'Under Review': 'Under Review',
};

/**
 * Render the Vendor Risk window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderVendorRiskWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.overflow = 'hidden';

  const { header } = makeHeader('Third-Party Vendor Risk');
  body.appendChild(header);

  const layout = document.createElement('div');
  layout.style.flex = '1';
  layout.style.display = 'flex';
  layout.style.overflow = 'hidden';
  body.appendChild(layout);

  const list = document.createElement('div');
  list.style.width = '260px';
  list.style.borderRight = `1px solid ${theme.border}`;
  list.style.overflow = 'auto';
  layout.appendChild(list);

  const detail = document.createElement('div');
  detail.style.flex = '1';
  detail.style.overflow = 'auto';
  detail.style.padding = '16px';
  layout.appendChild(detail);

  function statusColor(status: Vendor['status']): string {
    if (status === 'Approved') return theme.success;
    if (status === 'Rejected') return theme.danger;
    if (status === 'Conditional') return theme.warning;
    return theme.textDim;
  }

  let selectedId = services.vendorRisk.listVendors()[0]?.id;

  function renderList(): void {
    list.innerHTML = '';
    for (const v of services.vendorRisk.listVendors()) {
      const row = document.createElement('div');
      row.style.padding = '10px 12px';
      row.style.cursor = 'pointer';
      row.style.borderBottom = `1px solid ${theme.borderSubtle}`;
      row.style.background = v.id === selectedId ? theme.surfaceHover : 'transparent';
      const name = document.createElement('div');
      name.textContent = v.name;
      name.style.fontSize = '13px';
      name.style.fontWeight = '600';
      const meta = document.createElement('div');
      meta.textContent = `${v.category} · ${v.dataAccessLevel}`;
      meta.style.fontSize = '11px';
      meta.style.color = theme.textDim;
      const status = document.createElement('div');
      status.textContent = STATUS_LABEL[v.status];
      status.style.fontSize = '11px';
      status.style.color = statusColor(v.status);
      status.style.fontWeight = '600';
      row.appendChild(name);
      row.appendChild(meta);
      row.appendChild(status);
      row.addEventListener('click', () => {
        selectedId = v.id;
        renderList();
        renderDetail();
      });
      list.appendChild(row);
    }
  }

  function detailField(label: string, value: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '10px';
    const l = document.createElement('div');
    l.textContent = label;
    l.style.fontSize = '11px';
    l.style.color = theme.textDim;
    l.style.textTransform = 'uppercase';
    l.style.letterSpacing = '0.4px';
    const v = document.createElement('div');
    v.textContent = value;
    v.style.fontSize = '13px';
    wrap.appendChild(l);
    wrap.appendChild(v);
    return wrap;
  }

  function renderDetail(): void {
    detail.innerHTML = '';
    const vendor = services.vendorRisk.listVendors().find((v) => v.id === selectedId);
    if (!vendor) return;

    const title = document.createElement('h2');
    title.textContent = `${vendor.name} (${vendor.id})`;
    title.style.color = theme.accent;
    title.style.fontSize = '17px';
    title.style.margin = '0 0 12px 0';
    detail.appendChild(title);

    detail.appendChild(detailField('Category', vendor.category));
    detail.appendChild(detailField('Data Access Level', vendor.dataAccessLevel));
    detail.appendChild(detailField('SOC 2 Excerpt', vendor.soc2Summary));
    detail.appendChild(
      detailField(
        'Questionnaire',
        `Encryption at rest: ${vendor.questionnaire.encryptionAtRest ? 'Yes' : 'No'} · ` +
          `MFA enforced: ${vendor.questionnaire.mfaEnforced ? 'Yes' : 'No'} · ` +
          `Breach history: ${vendor.questionnaire.breachHistory} · ` +
          `Subprocessors: ${vendor.questionnaire.subprocessors.join(', ')}`,
      ),
    );
    detail.appendChild(
      detailField('Inherent Risk', `Likelihood ${vendor.likelihood} x Impact ${vendor.impact} = ${vendor.inherentRisk}`),
    );

    const statusRow = document.createElement('div');
    statusRow.style.margin = '4px 0 16px 0';
    const statusBadge = document.createElement('span');
    statusBadge.textContent = STATUS_LABEL[vendor.status];
    statusBadge.style.color = statusColor(vendor.status);
    statusBadge.style.fontWeight = '700';
    statusBadge.style.fontSize = '13px';
    statusRow.appendChild(statusBadge);
    if (vendor.decisionNote) {
      const note = document.createElement('div');
      note.textContent = vendor.decisionNote;
      note.style.fontSize = '12px';
      note.style.color = theme.textDim;
      note.style.marginTop = '4px';
      statusRow.appendChild(note);
    }
    detail.appendChild(statusRow);

    // Decision form
    const decisionField = makeField('Decision');
    const select = document.createElement('select');
    styleInput(select);
    for (const s of ['Under Review', 'Approved', 'Conditional', 'Rejected'] as Vendor['status'][]) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = STATUS_LABEL[s];
      if (s === vendor.status) opt.selected = true;
      select.appendChild(opt);
    }
    decisionField.appendChild(select);
    detail.appendChild(decisionField);

    const noteField = makeField('Decision Note');
    const noteInput = document.createElement('textarea');
    styleInput(noteInput);
    noteInput.style.minHeight = '60px';
    noteInput.value = vendor.decisionNote ?? '';
    noteField.appendChild(noteInput);
    detail.appendChild(noteField);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '8px';

    const saveBtn = makeButton('Save Decision', 'primary');
    saveBtn.addEventListener('click', () => {
      services.vendorRisk.decide(vendor.id, select.value as Vendor['status'], noteInput.value || 'No note provided.');
      renderList();
      renderDetail();
    });

    const sendBtn = makeButton('Send to Risk Register', 'neutral');
    sendBtn.addEventListener('click', () => {
      const risk: RiskItem = {
        id: `RSK-VENDOR-${vendor.id}`,
        finding: `Third-party risk: ${vendor.name} (${vendor.category}, ${vendor.dataAccessLevel} data access) — ${vendor.id}`,
        likelihood: vendor.likelihood,
        impact: vendor.impact,
        inherentRisk: vendor.inherentRisk,
        controlStrategy: vendor.status === 'Rejected' ? 'Avoid' : 'Mitigate',
        residualRisk: Math.max(1, Math.round((vendor.likelihood * vendor.impact) / 2)),
        owner: 'Vendor Management',
        remediation: vendor.decisionNote || 'Review the SOC 2 report and questionnaire; document the acceptance decision.',
      };
      const added = services.compliance.addRisk(risk);
      sendBtn.textContent = added ? 'Added to Risk Register' : 'Already in Risk Register';
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
    });
    if (services.compliance.getRisk(`RSK-VENDOR-${vendor.id}`)) {
      sendBtn.textContent = 'Already in Risk Register';
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
    }

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(sendBtn);
    detail.appendChild(btnRow);
  }

  renderList();
  renderDetail();
}
