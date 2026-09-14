/**
 * Access Review console window for the GRC Range desktop.
 *
 * The quarterly user access review: certify or revoke every local account's
 * access. Unlike the review record alone, "Revoke" here performs a real
 * mutation — it disables the account (or strips Administrators membership)
 * via `MockUserAccounts` — so the console reflects the actual entitlement
 * change, not just a label. Completing the campaign remediates the
 * admin-sprawl finding (FND-003) once every item has a decision.
 */

import { getTheme } from '@/ui/themes';
import { makeHeader, makeButton, makeField, styleInput } from '@/ui/consoleHelpers';
import type { AccessReviewItem } from '@/domain/types';
import type { GrcServices } from '@/vm/session';

/**
 * Render the Access Review window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderAccessReviewWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.overflow = 'hidden';

  const { header, btnRow } = makeHeader('Access Review — Q3 Campaign');
  const completeBtn = makeButton('Complete Campaign', 'primary');
  btnRow.appendChild(completeBtn);
  body.appendChild(header);

  const summary = document.createElement('div');
  summary.style.padding = '8px 16px';
  summary.style.fontSize = '12px';
  summary.style.color = theme.textDim;
  summary.style.borderBottom = `1px solid ${theme.borderSubtle}`;
  body.appendChild(summary);

  const scroll = document.createElement('div');
  scroll.style.flex = '1';
  scroll.style.overflow = 'auto';
  scroll.style.padding = '16px';
  body.appendChild(scroll);

  function decisionColor(decision: AccessReviewItem['decision']): string {
    if (decision === 'Certified') return theme.success;
    if (decision === 'Revoke') return theme.danger;
    return theme.warning;
  }

  function promptDecision(item: AccessReviewItem, kind: 'Certified' | 'Revoke', card: HTMLElement): void {
    card.innerHTML = '';
    const field = makeField(kind === 'Certified' ? 'Justification for keeping this access' : 'Reason for revoking this access');
    const input = document.createElement('textarea');
    styleInput(input);
    input.style.minHeight = '50px';
    field.appendChild(input);
    card.appendChild(field);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    const confirmBtn = makeButton(kind === 'Certified' ? 'Confirm Certify' : 'Confirm Revoke', kind === 'Certified' ? 'primary' : 'danger');
    const cancelBtn = makeButton('Cancel', 'neutral');
    row.appendChild(confirmBtn);
    row.appendChild(cancelBtn);
    card.appendChild(row);

    cancelBtn.addEventListener('click', () => render());

    confirmBtn.addEventListener('click', () => {
      const note = input.value || (kind === 'Certified' ? 'Access confirmed as still required.' : 'Access no longer required.');
      if (kind === 'Certified') {
        services.accessReview.certify(item.id, note);
      } else {
        // Perform the real mutation: strip admin rights, and disable
        // clearly-orphaned service/temp/intern accounts outright.
        services.users.removeFromAdmin(item.username);
        if (/^(temp_|intern)/i.test(item.username)) {
          const user = services.users.getUser(item.username);
          if (user?.enabled) services.users.toggleUser(item.username);
        }
        services.accessReview.revoke(item.id, note);
      }
      render();
    });
  }

  function render(): void {
    scroll.innerHTML = '';
    const items = services.accessReview.listItems();
    const pending = items.filter((i) => i.decision === 'Pending').length;
    const certified = items.filter((i) => i.decision === 'Certified').length;
    const revoked = items.filter((i) => i.decision === 'Revoke').length;
    summary.textContent = `${items.length} accounts in scope — ${pending} pending, ${certified} certified, ${revoked} revoked.`;

    const complete = services.accessReview.isComplete();
    completeBtn.disabled = !complete;
    completeBtn.style.opacity = complete ? '1' : '0.5';
    completeBtn.style.cursor = complete ? 'pointer' : 'not-allowed';

    for (const item of items) {
      const card = document.createElement('div');
      card.style.border = `1px solid ${theme.border}`;
      card.style.borderRadius = '6px';
      card.style.padding = '12px 14px';
      card.style.marginBottom = '10px';
      card.style.background = theme.bg;

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.alignItems = 'center';

      const identity = document.createElement('div');
      const name = document.createElement('div');
      name.textContent = `${item.displayName} (${item.username})`;
      name.style.fontWeight = '600';
      name.style.fontSize = '13px';
      const meta = document.createElement('div');
      meta.textContent = `${item.role} · Manager: ${item.manager ?? 'Unassigned'}`;
      meta.style.fontSize = '11px';
      meta.style.color = theme.textDim;
      identity.appendChild(name);
      identity.appendChild(meta);
      topRow.appendChild(identity);

      const status = document.createElement('div');
      status.textContent = item.decision;
      status.style.color = decisionColor(item.decision);
      status.style.fontWeight = '700';
      status.style.fontSize = '12px';
      topRow.appendChild(status);
      card.appendChild(topRow);

      if (item.flags.length > 0) {
        const flagsRow = document.createElement('div');
        flagsRow.style.marginTop = '6px';
        for (const flag of item.flags) {
          const badge = document.createElement('span');
          badge.textContent = flag;
          badge.style.display = 'inline-block';
          badge.style.fontSize = '10px';
          badge.style.color = theme.danger;
          badge.style.border = `1px solid ${theme.danger}`;
          badge.style.borderRadius = '3px';
          badge.style.padding = '2px 6px';
          badge.style.marginRight = '6px';
          badge.style.marginTop = '4px';
          flagsRow.appendChild(badge);
        }
        card.appendChild(flagsRow);
      }

      if (item.justification) {
        const note = document.createElement('div');
        note.textContent = item.justification;
        note.style.fontSize = '11px';
        note.style.color = theme.textDim;
        note.style.marginTop = '6px';
        card.appendChild(note);
      }

      if (item.decision === 'Pending') {
        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.gap = '8px';
        actionRow.style.marginTop = '10px';
        const certifyBtn = makeButton('Certify', 'primary');
        const revokeBtn = makeButton('Revoke', 'danger');
        certifyBtn.addEventListener('click', () => promptDecision(item, 'Certified', card));
        revokeBtn.addEventListener('click', () => promptDecision(item, 'Revoke', card));
        actionRow.appendChild(certifyBtn);
        actionRow.appendChild(revokeBtn);
        card.appendChild(actionRow);
      }

      scroll.appendChild(card);
    }
  }

  completeBtn.addEventListener('click', () => {
    services.accessReview.completeCampaign();
    render();
  });

  render();
}
