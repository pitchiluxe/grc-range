/**
 * Control Testing (Sampling) console window for the GRC Range desktop.
 *
 * Real Type II control testing does not inspect an entire population — it
 * draws a sample, tests each item against its evidence, and compares the
 * resulting exception rate to a tolerable deviation rate. This console lets
 * the student choose a sample size, draw a deterministic sample from a
 * 250-item population, read each sampled item's case note, mark Pass/Fail,
 * and see the verdict once every sampled item has been tested.
 */

import { getTheme } from '@/ui/themes';
import { makeHeader, makeButton, makeField, styleInput } from '@/ui/consoleHelpers';
import type { GrcServices } from '@/vm/session';

/**
 * Render the Control Testing window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderControlTestingWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.overflow = 'hidden';

  const { header } = makeHeader('Control Testing — Sampling');
  body.appendChild(header);

  const setupRow = document.createElement('div');
  setupRow.style.display = 'flex';
  setupRow.style.alignItems = 'flex-end';
  setupRow.style.gap = '12px';
  setupRow.style.padding = '12px 16px';
  setupRow.style.borderBottom = `1px solid ${theme.borderSubtle}`;

  const testing = services.controlTesting;

  const sizeField = makeField(`Sample size (population: ${testing.getPopulationSize()})`);
  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.min = '1';
  sizeInput.max = String(testing.getPopulationSize());
  sizeInput.value = '25';
  sizeInput.style.width = '100px';
  styleInput(sizeInput);
  sizeField.appendChild(sizeInput);
  sizeField.style.marginBottom = '0';
  setupRow.appendChild(sizeField);

  const drawBtn = makeButton('Draw Sample', 'primary');
  setupRow.appendChild(drawBtn);
  body.appendChild(setupRow);

  const summary = document.createElement('div');
  summary.style.padding = '10px 16px';
  summary.style.fontSize = '13px';
  summary.style.borderBottom = `1px solid ${theme.borderSubtle}`;
  body.appendChild(summary);

  const scroll = document.createElement('div');
  scroll.style.flex = '1';
  scroll.style.overflow = 'auto';
  scroll.style.padding = '16px';
  body.appendChild(scroll);

  function renderSummary(): void {
    const sample = testing.getSample();
    if (!sample) {
      summary.textContent = `Control: ${testing.getControlName()}. Tolerable deviation rate: ${(testing.getTolerableDeviationRate() * 100).toFixed(0)}%. No sample drawn yet.`;
      summary.style.color = theme.textDim;
      return;
    }
    const rate = testing.exceptionRate();
    const verdict = testing.verdict();
    const rateText = rate !== undefined ? `${(rate * 100).toFixed(1)}%` : 'n/a (nothing tested yet)';
    let verdictText = 'In progress';
    let color = theme.textDim;
    if (verdict === 'Pass') {
      verdictText = 'PASS — within tolerable deviation rate';
      color = theme.success;
    } else if (verdict === 'Fail') {
      verdictText = 'FAIL — exceeds tolerable deviation rate';
      color = theme.danger;
    }
    summary.innerHTML = '';
    const line1 = document.createElement('div');
    line1.textContent = `Sample: ${sample.length} of ${testing.getPopulationSize()}. Exception rate so far: ${rateText} (tolerable: ${(testing.getTolerableDeviationRate() * 100).toFixed(0)}%).`;
    const line2 = document.createElement('div');
    line2.textContent = verdictText;
    line2.style.color = color;
    line2.style.fontWeight = '700';
    line2.style.marginTop = '4px';
    summary.appendChild(line1);
    summary.appendChild(line2);
  }

  function renderSample(): void {
    scroll.innerHTML = '';
    const sample = testing.getSample();
    if (!sample) {
      const hint = document.createElement('p');
      hint.textContent = 'Choose a sample size and click "Draw Sample" to begin testing.';
      hint.style.color = theme.textDim;
      hint.style.fontSize = '13px';
      scroll.appendChild(hint);
      return;
    }

    const results = new Map(testing.listResults().map((r) => [r.itemId, r]));
    for (const item of sample) {
      const result = results.get(item.id);
      const card = document.createElement('div');
      card.style.border = `1px solid ${theme.border}`;
      card.style.borderRadius = '6px';
      card.style.padding = '10px 12px';
      card.style.marginBottom = '8px';
      card.style.background = theme.bg;

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      const ref = document.createElement('div');
      ref.textContent = `${item.reference} — ${item.subject} (${item.eventDate.slice(0, 10)})`;
      ref.style.fontWeight = '600';
      ref.style.fontSize = '13px';
      topRow.appendChild(ref);
      const status = document.createElement('div');
      status.textContent = result?.outcome ?? 'Untested';
      status.style.fontWeight = '700';
      status.style.fontSize = '12px';
      status.style.color =
        result?.outcome === 'Pass' ? theme.success : result?.outcome === 'Fail' ? theme.danger : theme.warning;
      topRow.appendChild(status);
      card.appendChild(topRow);

      const note = document.createElement('div');
      note.textContent = item.caseNote;
      note.style.fontSize = '12px';
      note.style.color = theme.textDim;
      note.style.margin = '6px 0';
      card.appendChild(note);

      if (!result || result.outcome === 'Untested') {
        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.gap = '8px';
        const passBtn = makeButton('Pass', 'primary');
        const failBtn = makeButton('Fail', 'danger');
        passBtn.style.fontSize = '11px';
        failBtn.style.fontSize = '11px';
        passBtn.addEventListener('click', () => {
          testing.recordResult(item.id, 'Pass', 'Approval evidenced on the ticket.');
          renderSample();
          renderSummary();
        });
        failBtn.addEventListener('click', () => {
          testing.recordResult(item.id, 'Fail', 'No approval evidence found on the ticket.');
          renderSample();
          renderSummary();
        });
        actionRow.appendChild(passBtn);
        actionRow.appendChild(failBtn);
        card.appendChild(actionRow);
      } else if (result.evidenceNote) {
        const evidence = document.createElement('div');
        evidence.textContent = `Evidence: ${result.evidenceNote}`;
        evidence.style.fontSize = '11px';
        evidence.style.color = theme.textDim;
        card.appendChild(evidence);
      }

      scroll.appendChild(card);
    }
  }

  drawBtn.addEventListener('click', () => {
    const size = parseInt(sizeInput.value, 10) || 25;
    testing.drawSample(size);
    renderSummary();
    renderSample();
  });

  renderSummary();
  renderSample();
}
