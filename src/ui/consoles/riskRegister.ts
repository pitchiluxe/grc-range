/**
 * Risk Register console window for the GRC Range desktop.
 *
 * The risk assessment tool. Displays a table of risk items with likelihood,
 * impact, inherent risk (color-coded), control strategy, residual risk,
 * owner, and remediation. An "Add Risk" button opens a form. A 5x5 risk
 * matrix visualization is shown with color-coded cells. Clicking a risk
 * opens an edit form. The register can be exported as a markdown table.
 */

import { getTheme } from '@/ui/themes';
import type { RiskItem } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/** Color for a risk score based on the 1-25 scale. */
function riskColor(score: number, theme: { success: string; warning: string; danger: string }): string {
  if (score >= 20) return theme.danger;
  if (score >= 12) return '#f97316';
  if (score >= 6) return theme.warning;
  return theme.success;
}

/** Risk level label for a score. */
function riskLabel(score: number): string {
  if (score >= 20) return 'Critical';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

/**
 * Render the Risk Register window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderRiskRegisterWindow(body: HTMLElement, services: GrcServices): void {
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
  title.textContent = 'Risk Register';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  header.appendChild(title);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';

  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Add Risk';
  addBtn.style.padding = '5px 14px';
  addBtn.style.background = theme.accent;
  addBtn.style.color = '#fff';
  addBtn.style.border = 'none';
  addBtn.style.borderRadius = '4px';
  addBtn.style.cursor = 'pointer';
  addBtn.style.fontSize = '13px';

  let quantMode = false;
  const viewToggleBtn = document.createElement('button');
  viewToggleBtn.textContent = 'View: Qualitative';
  viewToggleBtn.style.padding = '5px 14px';
  viewToggleBtn.style.background = theme.surfaceHover;
  viewToggleBtn.style.color = theme.text;
  viewToggleBtn.style.border = `1px solid ${theme.border}`;
  viewToggleBtn.style.borderRadius = '4px';
  viewToggleBtn.style.cursor = 'pointer';
  viewToggleBtn.style.fontSize = '13px';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export Markdown';
  exportBtn.style.padding = '5px 14px';
  exportBtn.style.background = theme.surfaceHover;
  exportBtn.style.color = theme.text;
  exportBtn.style.border = `1px solid ${theme.border}`;
  exportBtn.style.borderRadius = '4px';
  exportBtn.style.cursor = 'pointer';
  exportBtn.style.fontSize = '13px';

  btnRow.appendChild(addBtn);
  btnRow.appendChild(viewToggleBtn);
  btnRow.appendChild(exportBtn);
  header.appendChild(btnRow);
  body.appendChild(header);

  // Content scroll area
  const scroll = document.createElement('div');
  scroll.style.flex = '1';
  scroll.style.overflow = 'auto';
  scroll.style.padding = '16px';

  // Risk matrix
  const matrixSection = document.createElement('div');
  matrixSection.style.marginBottom = '24px';

  const matrixTitle = document.createElement('h3');
  matrixTitle.textContent = 'Risk Matrix (5x5)';
  matrixTitle.style.color = theme.accent;
  matrixTitle.style.fontSize = '15px';
  matrixTitle.style.margin = '0 0 12px 0';
  matrixSection.appendChild(matrixTitle);

  const matrixWrap = document.createElement('div');
  matrixWrap.style.display = 'flex';
  matrixWrap.style.gap = '12px';

  // Y-axis label
  const yLabel = document.createElement('div');
  yLabel.style.display = 'flex';
  yLabel.style.flexDirection = 'column';
  yLabel.style.justifyContent = 'center';
  yLabel.style.alignItems = 'center';
  yLabel.style.fontSize = '11px';
  yLabel.style.color = theme.textDim;
  yLabel.style.writingMode = 'vertical-rl';
  yLabel.style.transform = 'rotate(180deg)';
  yLabel.textContent = 'Impact \u2192';
  matrixWrap.appendChild(yLabel);

  // Matrix grid
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'auto repeat(5, 56px)';
  grid.style.gridTemplateRows = 'auto repeat(5, 48px)';
  grid.style.gap = '2px';

  // Top-left corner
  grid.appendChild(makeCell('', theme.bg, theme.textDim));

  // X-axis labels (Likelihood 1-5)
  for (let l = 1; l <= 5; l++) {
    grid.appendChild(makeCell(`L=${l}`, theme.bg, theme.textDim));
  }

  // Rows: Impact 5 (top) to 1 (bottom)
  const risks = services.compliance.listRisks();
  for (let i = 5; i >= 1; i--) {
    grid.appendChild(makeCell(`I=${i}`, theme.bg, theme.textDim));
    for (let l = 1; l <= 5; l++) {
      const score = l * i;
      const matching = risks.filter((r) => r.likelihood === l && r.impact === i);
      const cell = makeCell('', riskColor(score, theme), '#fff');
      cell.style.fontSize = '11px';
      cell.style.textAlign = 'center';
      cell.style.display = 'flex';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';
      cell.style.flexDirection = 'column';
      cell.textContent = String(score);
      if (matching.length > 0) {
        cell.style.fontWeight = '700';
        const dot = document.createElement('div');
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        dot.style.background = '#fff';
        dot.style.marginTop = '2px';
        cell.appendChild(dot);
        cell.title = matching.map((r) => r.finding).join('\n');
      }
      grid.appendChild(cell);
    }
  }
  matrixWrap.appendChild(grid);

  // X-axis label
  const xLabel = document.createElement('div');
  xLabel.style.fontSize = '11px';
  xLabel.style.color = theme.textDim;
  xLabel.style.textAlign = 'center';
  xLabel.style.paddingTop = '4px';
  xLabel.textContent = 'Likelihood \u2192';
  matrixWrap.appendChild(xLabel);

  matrixSection.appendChild(matrixWrap);
  scroll.appendChild(matrixSection);

  // Risk table
  const tableTitle = document.createElement('h3');
  tableTitle.textContent = 'Risk Items';
  tableTitle.style.color = theme.accent;
  tableTitle.style.fontSize = '15px';
  tableTitle.style.margin = '0 0 12px 0';
  scroll.appendChild(tableTitle);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';

  const thead = document.createElement('thead');
  table.appendChild(thead);

  function buildHead(): void {
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    const cols = quantMode
      ? ['Finding', 'L', 'I', 'Inherent', 'Strategy', 'Residual', 'Loss Freq/yr', 'Loss Magnitude', 'ALE ($/yr)', 'Owner']
      : ['Finding', 'L', 'I', 'Inherent', 'Strategy', 'Residual', 'Owner', 'Remediation'];
    for (const h of cols) {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.textAlign = 'left';
      th.style.padding = '8px 10px';
      th.style.background = theme.bg;
      th.style.color = theme.textDim;
      th.style.borderBottom = `2px solid ${theme.border}`;
      th.style.fontSize = '11px';
      th.style.fontWeight = '600';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
  }

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  scroll.appendChild(table);

  body.appendChild(scroll);

  function formatUsd(n: number): string {
    return `$${Math.round(n).toLocaleString('en-US')}`;
  }

  function renderTable(): void {
    buildHead();
    tbody.innerHTML = '';
    const allRisks = services.compliance.listRisks();
    for (const r of allRisks) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = `1px solid ${theme.border}`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('mouseenter', () => { tr.style.background = theme.surfaceHover; });
      tr.addEventListener('mouseleave', () => { tr.style.background = 'transparent'; });
      tr.addEventListener('click', () => openRiskForm(r));

      appendCell(tr, r.finding);
      appendCell(tr, String(r.likelihood));
      appendCell(tr, String(r.impact));
      appendCell(tr, `${r.inherentRisk} (${riskLabel(r.inherentRisk)})`, riskColor(r.inherentRisk, theme));
      appendCell(tr, r.controlStrategy);
      appendCell(tr, `${r.residualRisk} (${riskLabel(r.residualRisk)})`, riskColor(r.residualRisk, theme));
      if (quantMode) {
        appendCell(tr, r.lossEventFrequency !== undefined ? `${r.lossEventFrequency}/yr` : '—');
        appendCell(tr, r.lossMagnitude !== undefined ? formatUsd(r.lossMagnitude) : '—');
        appendCell(
          tr,
          r.annualizedLossExpectancy !== undefined ? formatUsd(r.annualizedLossExpectancy) : '—',
          r.annualizedLossExpectancy !== undefined ? theme.danger : undefined,
        );
        appendCell(tr, r.owner);
      } else {
        appendCell(tr, r.owner);
        appendCell(tr, r.remediation.length > 40 ? r.remediation.slice(0, 40) + '...' : r.remediation);
      }
      tbody.appendChild(tr);
    }
  }

  function appendCell(tr: HTMLTableRowElement, text: string, color?: string): void {
    const td = document.createElement('td');
    td.textContent = text;
    td.style.padding = '8px 10px';
    if (color) {
      td.style.color = color;
      td.style.fontWeight = '600';
    }
    tr.appendChild(td);
  }

  function openRiskForm(existing?: RiskItem): void {
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
    card.style.width = '440px';
    card.style.maxHeight = '80%';
    card.style.overflow = 'auto';

    const h = document.createElement('h3');
    h.textContent = existing ? 'Edit Risk' : 'Add Risk';
    h.style.color = theme.accent;
    h.style.margin = '0 0 16px 0';
    h.style.fontSize = '16px';
    card.appendChild(h);

    // Finding dropdown
    const findings = services.compliance.listFindings();
    const findingField = makeField('Finding');
    const findingSelect = document.createElement('select');
    findingSelect.style.width = '100%';
    findingSelect.style.padding = '6px 8px';
    findingSelect.style.background = theme.bg;
    findingSelect.style.color = theme.text;
    findingSelect.style.border = `1px solid ${theme.border}`;
    findingSelect.style.borderRadius = '4px';
    findingSelect.style.fontSize = '13px';
    for (const f of findings) {
      const opt = document.createElement('option');
      opt.textContent = `${f.id}: ${f.title}`;
      opt.value = f.id;
      findingSelect.appendChild(opt);
    }
    if (existing) {
      const opt = document.createElement('option');
      opt.textContent = existing.finding;
      opt.value = existing.finding;
      opt.selected = true;
      findingSelect.appendChild(opt);
    }
    findingField.appendChild(findingSelect);
    card.appendChild(findingField);

    // Likelihood slider
    const lkField = makeField('Likelihood (1-5)');
    const lkSlider = makeSlider(existing?.likelihood ?? 3);
    lkField.appendChild(lkSlider.slider);
    lkField.appendChild(lkSlider.label);
    card.appendChild(lkField);

    // Impact slider
    const imField = makeField('Impact (1-5)');
    const imSlider = makeSlider(existing?.impact ?? 3);
    imField.appendChild(imSlider.slider);
    imField.appendChild(imSlider.label);
    card.appendChild(imField);

    // Control strategy
    const stratField = makeField('Control Strategy');
    const stratSelect = document.createElement('select');
    stratSelect.style.width = '100%';
    stratSelect.style.padding = '6px 8px';
    stratSelect.style.background = theme.bg;
    stratSelect.style.color = theme.text;
    stratSelect.style.border = `1px solid ${theme.border}`;
    stratSelect.style.borderRadius = '4px';
    stratSelect.style.fontSize = '13px';
    for (const s of ['Mitigate', 'Accept', 'Transfer', 'Avoid']) {
      const opt = document.createElement('option');
      opt.textContent = s;
      opt.value = s;
      if (existing && existing.controlStrategy === s) opt.selected = true;
      stratSelect.appendChild(opt);
    }
    stratField.appendChild(stratSelect);
    card.appendChild(stratField);

    // Owner
    const ownerField = makeField('Owner');
    const ownerInput = document.createElement('input');
    ownerInput.type = 'text';
    ownerInput.value = existing?.owner ?? '';
    ownerInput.style.width = '100%';
    ownerInput.style.padding = '6px 8px';
    ownerInput.style.background = theme.bg;
    ownerInput.style.color = theme.text;
    ownerInput.style.border = `1px solid ${theme.border}`;
    ownerInput.style.borderRadius = '4px';
    ownerInput.style.fontSize = '13px';
    ownerField.appendChild(ownerInput);
    card.appendChild(ownerField);

    // Remediation
    const remField = makeField('Remediation Plan');
    const remInput = document.createElement('textarea');
    remInput.value = existing?.remediation ?? '';
    remInput.style.width = '100%';
    remInput.style.padding = '6px 8px';
    remInput.style.background = theme.bg;
    remInput.style.color = theme.text;
    remInput.style.border = `1px solid ${theme.border}`;
    remInput.style.borderRadius = '4px';
    remInput.style.fontSize = '13px';
    remInput.style.minHeight = '60px';
    remInput.style.resize = 'vertical';
    remField.appendChild(remInput);
    card.appendChild(remField);

    // Quantitative (FAIR-lite) — optional
    const quantHeading = document.createElement('div');
    quantHeading.textContent = 'Quantitative (optional)';
    quantHeading.style.fontSize = '12px';
    quantHeading.style.color = theme.textDim;
    quantHeading.style.margin = '4px 0 8px 0';
    card.appendChild(quantHeading);

    const freqField = makeField('Loss Event Frequency (times/year)');
    const freqInput = document.createElement('input');
    freqInput.type = 'number';
    freqInput.min = '0';
    freqInput.step = 'any';
    freqInput.value = existing?.lossEventFrequency !== undefined ? String(existing.lossEventFrequency) : '';
    freqInput.style.width = '100%';
    freqInput.style.padding = '6px 8px';
    freqInput.style.background = theme.bg;
    freqInput.style.color = theme.text;
    freqInput.style.border = `1px solid ${theme.border}`;
    freqInput.style.borderRadius = '4px';
    freqInput.style.fontSize = '13px';
    freqField.appendChild(freqInput);
    card.appendChild(freqField);

    const magField = makeField('Loss Magnitude per event ($)');
    const magInput = document.createElement('input');
    magInput.type = 'number';
    magInput.min = '0';
    magInput.step = 'any';
    magInput.value = existing?.lossMagnitude !== undefined ? String(existing.lossMagnitude) : '';
    magInput.style.width = '100%';
    magInput.style.padding = '6px 8px';
    magInput.style.background = theme.bg;
    magInput.style.color = theme.text;
    magInput.style.border = `1px solid ${theme.border}`;
    magInput.style.borderRadius = '4px';
    magInput.style.fontSize = '13px';
    magField.appendChild(magInput);
    card.appendChild(magField);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '16px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '6px 16px';
    cancelBtn.style.background = theme.surfaceHover;
    cancelBtn.style.color = theme.text;
    cancelBtn.style.border = `1px solid ${theme.border}`;
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.padding = '6px 16px';
    saveBtn.style.background = theme.accent;
    saveBtn.style.color = '#fff';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.cursor = 'pointer';

    saveBtn.addEventListener('click', () => {
      const likelihood = lkSlider.value();
      const impact = imSlider.value();
      const findingText = findingSelect.value;
      const finding = findings.find((f) => f.id === findingText);
      const findingLabel = finding ? `${finding.id}: ${finding.title}` : findingText;
      const lossEventFrequency = freqInput.value.trim() ? parseFloat(freqInput.value) : undefined;
      const lossMagnitude = magInput.value.trim() ? parseFloat(magInput.value) : undefined;
      const annualizedLossExpectancy =
        lossEventFrequency !== undefined && lossMagnitude !== undefined
          ? lossEventFrequency * lossMagnitude
          : undefined;
      const risk: RiskItem = {
        id: existing?.id ?? `RSK-${Date.now().toString(36).toUpperCase()}`,
        finding: findingLabel,
        likelihood,
        impact,
        inherentRisk: likelihood * impact,
        controlStrategy: stratSelect.value as RiskItem['controlStrategy'],
        residualRisk: Math.max(1, Math.round((likelihood * impact) / 2)),
        owner: ownerInput.value || 'Unassigned',
        remediation: remInput.value || 'TBD',
        lossEventFrequency,
        lossMagnitude,
        annualizedLossExpectancy,
      };
      if (existing) {
        services.compliance.updateRisk(existing.id, risk);
      } else {
        services.compliance.addRisk(risk);
      }
      overlay.remove();
      renderTable();
      // Rebuild matrix
      scroll.removeChild(matrixSection);
      scroll.insertBefore(matrixSection, scroll.firstChild);
      body.removeChild(scroll);
      body.appendChild(scroll);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    card.appendChild(btnRow);

    overlay.appendChild(card);
    body.appendChild(overlay);
  }

  function makeField(label: string): HTMLElement {
    const field = document.createElement('div');
    field.style.marginBottom = '12px';
    const l = document.createElement('label');
    l.textContent = label;
    l.style.display = 'block';
    l.style.fontSize = '13px';
    l.style.color = theme.textDim;
    l.style.marginBottom = '4px';
    field.appendChild(l);
    return field;
  }

  function makeSlider(initial: number): { slider: HTMLInputElement; label: HTMLSpanElement; value: () => number } {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '5';
    slider.value = String(initial);
    slider.style.width = '100%';
    const label = document.createElement('span');
    label.textContent = String(initial);
    label.style.marginLeft = '8px';
    label.style.color = theme.accent;
    label.style.fontWeight = '600';
    slider.addEventListener('input', () => { label.textContent = slider.value; });
    return { slider, label, value: () => parseInt(slider.value, 10) };
  }

  addBtn.addEventListener('click', () => openRiskForm());

  viewToggleBtn.addEventListener('click', () => {
    quantMode = !quantMode;
    viewToggleBtn.textContent = quantMode ? 'View: Quantitative' : 'View: Qualitative';
    renderTable();
  });

  exportBtn.addEventListener('click', () => {
    const risks = services.compliance.listRisks();
    const lines: string[] = [
      '# Risk Register',
      '',
      '| Finding | Likelihood | Impact | Inherent Risk | Strategy | Residual Risk | Owner | Remediation |',
      '|---------|-----------|--------|--------------|----------|--------------|-------|-------------|',
    ];
    for (const r of risks) {
      lines.push(`| ${r.finding} | ${r.likelihood} | ${r.impact} | ${r.inherentRisk} (${riskLabel(r.inherentRisk)}) | ${r.controlStrategy} | ${r.residualRisk} (${riskLabel(r.residualRisk)}) | ${r.owner} | ${r.remediation} |`);
    }
    downloadText('risk-register.md', lines.join('\n'));
  });

  renderTable();
}

/** Create a grid cell with background and text color. */
function makeCell(text: string, bg: string, color: string): HTMLElement {
  const cell = document.createElement('div');
  cell.textContent = text;
  cell.style.background = bg;
  cell.style.color = color;
  cell.style.padding = '4px';
  cell.style.borderRadius = '3px';
  cell.style.display = 'flex';
  cell.style.alignItems = 'center';
  cell.style.justifyContent = 'center';
  cell.style.fontSize = '11px';
  return cell;
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
