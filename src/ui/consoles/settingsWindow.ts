/**
 * Settings console window for the GRC Range desktop.
 *
 * Shows product identity (name, version, description), VM host info
 * (hostname, OS, domain, build), theme info, and a "Reset Lab" button that
 * calls `services.reset()` to restore the seeded non-compliant baseline.
 */

import { getTheme } from '@/ui/themes';
import { PRODUCT } from '@/config/product';
import { VM_HOST } from '@/config/vmHost';
import { COMPANY } from '@/config/company';
import type { GrcServices } from '@/vm/session';

/**
 * Render the Settings window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (used for the reset action).
 */
export function renderSettingsWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'auto';

  const scroll = document.createElement('div');
  scroll.style.padding = '24px 32px';
  scroll.style.display = 'flex';
  scroll.style.flexDirection = 'column';
  scroll.style.gap = '24px';

  function section(title: string): { card: HTMLElement; list: HTMLElement } {
    const card = document.createElement('div');
    card.style.background = theme.bg;
    card.style.border = `1px solid ${theme.border}`;
    card.style.borderRadius = '8px';
    card.style.padding = '20px 24px';

    const h = document.createElement('h2');
    h.textContent = title;
    h.style.margin = '0 0 16px 0';
    h.style.fontSize = '16px';
    h.style.fontWeight = '600';
    h.style.color = theme.accent;
    card.appendChild(h);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '10px';
    card.appendChild(list);

    scroll.appendChild(card);
    return { card, list };
  }

  function row(label: string, value: string): void {
    const r = document.createElement('div');
    r.style.display = 'flex';
    r.style.justifyContent = 'space-between';
    r.style.alignItems = 'center';
    r.style.fontSize = '14px';

    const l = document.createElement('span');
    l.textContent = label;
    l.style.color = theme.textDim;
    r.appendChild(l);

    const v = document.createElement('span');
    v.textContent = value;
    v.style.color = theme.text;
    v.style.fontWeight = '500';
    r.appendChild(v);
    list.appendChild(r);
  }

  // About section
  let { list } = section('About');
  row('Product', PRODUCT.name);
  row('Tagline', PRODUCT.tagline);
  row('Version', PRODUCT.version);
  row('Description', 'A simulated Windows Server 2022 desktop for GRC audit training. Discover, map, and remediate compliance findings.');

  // VM Info section
  ({ list } = section('VM Info'));
  row('Hostname', VM_HOST.hostname);
  row('Operating System', VM_HOST.os);
  row('Build', VM_HOST.build);
  row('Domain', VM_HOST.domain);
  row('Organization', COMPANY.name);

  // Theme section
  ({ list } = section('Theme'));
  row('Active Theme', theme.name);
  row('Mode', 'Dark');
  row('Accent Color', theme.accent);

  // Reset section
  const resetCard = document.createElement('div');
  resetCard.style.background = theme.bg;
  resetCard.style.border = `1px solid ${theme.border}`;
  resetCard.style.borderRadius = '8px';
  resetCard.style.padding = '20px 24px';

  const resetH = document.createElement('h2');
  resetH.textContent = 'Lab Management';
  resetH.style.margin = '0 0 16px 0';
  resetH.style.fontSize = '16px';
  resetH.style.fontWeight = '600';
  resetH.style.color = theme.accent;
  resetCard.appendChild(resetH);

  const resetDesc = document.createElement('p');
  resetDesc.textContent = 'Reset all mock services back to the seeded non-compliant baseline. This discards any remediation you have applied during the session.';
  resetDesc.style.color = theme.textDim;
  resetDesc.style.fontSize = '13px';
  resetDesc.style.margin = '0 0 16px 0';
  resetCard.appendChild(resetDesc);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset Lab';
  resetBtn.style.padding = '8px 24px';
  resetBtn.style.background = theme.danger;
  resetBtn.style.color = '#fff';
  resetBtn.style.border = 'none';
  resetBtn.style.borderRadius = '4px';
  resetBtn.style.cursor = 'pointer';
  resetBtn.style.fontSize = '14px';
  resetBtn.style.fontWeight = '600';

  const statusMsg = document.createElement('span');
  statusMsg.style.marginLeft = '12px';
  statusMsg.style.fontSize = '13px';
  statusMsg.style.color = theme.success;

  resetBtn.addEventListener('click', () => {
    services.reset();
    statusMsg.textContent = 'Lab reset to baseline.';
    resetBtn.textContent = 'Reset Lab';
    setTimeout(() => { statusMsg.textContent = ''; }, 2500);
  });

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.alignItems = 'center';
  btnRow.appendChild(resetBtn);
  btnRow.appendChild(statusMsg);
  resetCard.appendChild(btnRow);

  scroll.appendChild(resetCard);
  body.appendChild(scroll);
}
