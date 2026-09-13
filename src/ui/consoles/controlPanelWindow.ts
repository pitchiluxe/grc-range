/**
 * Control Panel console window for the GRC Range desktop.
 *
 * A Windows-style control panel with a grid of large icons. Categories link to
 * system info, firewall status, audit settings, user accounts, and
 * administrative tools (audit console, terminal). Clicking a category shows a
 * detail panel with the relevant system information.
 */

import { getTheme } from '@/ui/themes';
import { VM_HOST } from '@/config/vmHost';
import { PRODUCT } from '@/config/product';
import type { GrcServices } from '@/vm/session';

/** A control panel category tile. */
interface CPTile {
  /** Icon glyph shown in the tile. */
  icon: string;
  /** Tile label. */
  label: string;
  /** Detail panel renderer for this category. */
  render: (panel: HTMLElement) => void;
}

/**
 * Render the Control Panel window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle.
 */
export function renderControlPanelWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';

  // Header
  const header = document.createElement('div');
  header.style.padding = '12px 20px';
  header.style.background = theme.bg;
  header.style.borderBottom = `1px solid ${theme.border}`;
  header.style.fontSize = '18px';
  header.style.fontWeight = '600';
  header.textContent = 'All Control Panel Items';
  body.appendChild(header);

  // Main split: icon grid + detail panel
  const main = document.createElement('div');
  main.style.flex = '1';
  main.style.display = 'flex';
  main.style.overflow = 'hidden';

  // Icon grid
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
  grid.style.gap = '12px';
  grid.style.padding = '20px';
  grid.style.overflow = 'auto';
  grid.style.flex = '1';

  // Detail panel
  const detail = document.createElement('div');
  detail.style.flex = '1';
  detail.style.padding = '20px 24px';
  detail.style.overflow = 'auto';
  detail.style.background = theme.bg;
  detail.style.borderLeft = `1px solid ${theme.border}`;
  detail.style.display = 'none';
  detail.style.flexDirection = 'column';
  detail.style.gap = '12px';

  const detailTitle = document.createElement('h2');
  detailTitle.style.margin = '0';
  detailTitle.style.fontSize = '16px';
  detailTitle.style.color = theme.accent;
  detail.appendChild(detailTitle);

  const detailContent = document.createElement('div');
  detailContent.style.display = 'flex';
  detailContent.style.flexDirection = 'column';
  detailContent.style.gap = '8px';
  detail.appendChild(detailContent);

  function infoRow(label: string, value: string): HTMLElement {
    const r = document.createElement('div');
    r.style.display = 'flex';
    r.style.justifyContent = 'space-between';
    r.style.fontSize = '13px';
    r.style.padding = '6px 0';
    r.style.borderBottom = `1px solid ${theme.border}`;
    const l = document.createElement('span');
    l.textContent = label;
    l.style.color = theme.textDim;
    const v = document.createElement('span');
    v.textContent = value;
    v.style.color = theme.text;
    v.style.fontWeight = '500';
    r.appendChild(l);
    r.appendChild(v);
    return r;
  }

  const tiles: CPTile[] = [
    {
      icon: '\u{1F4BB}',
      label: 'System and Security',
      render: (panel) => {
        panel.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = 'System and Security';
        h.style.color = theme.accent;
        h.style.fontSize = '16px';
        h.style.margin = '0';
        panel.appendChild(h);
        panel.appendChild(infoRow('Hostname', VM_HOST.hostname));
        panel.appendChild(infoRow('OS', VM_HOST.os));
        panel.appendChild(infoRow('Build', VM_HOST.build));
        panel.appendChild(infoRow('Domain', VM_HOST.domain));

        const fwStatus = services.firewall.listRules().some((r) => r.enabled && r.action === 'Allow' && r.direction === 'Inbound' && (r.localPort === 21 || r.localPort === 23));
        panel.appendChild(infoRow('Firewall', fwStatus ? 'On (insecure rules detected)' : 'On'));
        panel.appendChild(infoRow('Audit Logging', 'Partial (see Audit Log)'));
      },
    },
    {
      icon: '\u{1F465}',
      label: 'User Accounts',
      render: (panel) => {
        panel.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = 'User Accounts';
        h.style.color = theme.accent;
        h.style.fontSize = '16px';
        h.style.margin = '0';
        panel.appendChild(h);
        const users = services.users.listUsers();
        for (const u of users) {
          panel.appendChild(infoRow(u.username, `${u.enabled ? 'Enabled' : 'Disabled'}${u.isAdmin ? ' (Admin)' : ''}`));
        }
        const adminH = document.createElement('div');
        adminH.textContent = 'Administrators Group';
        adminH.style.color = theme.textDim;
        adminH.style.fontSize = '13px';
        adminH.style.marginTop = '12px';
        adminH.style.fontWeight = '600';
        panel.appendChild(adminH);
        for (const m of services.users.listAdministrators()) {
          panel.appendChild(infoRow(m, 'Member'));
        }
      },
    },
    {
      icon: '\u{1F527}',
      label: 'Administrative Tools',
      render: (panel) => {
        panel.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = 'Administrative Tools';
        h.style.color = theme.accent;
        h.style.fontSize = '16px';
        h.style.margin = '0';
        panel.appendChild(h);
        const tools = [
          'Audit Console — Discover and map compliance findings',
          'Terminal — PowerShell command prompt',
          'Script Editor — PowerShell ISE',
          'Compliance Mapper — Map findings to frameworks',
          'Risk Register — Risk assessment tool',
          'Remediation Console — Fix non-compliant findings',
        ];
        for (const t of tools) {
          const row = document.createElement('div');
          row.textContent = '\u{1F4C4} ' + t;
          row.style.fontSize = '13px';
          row.style.padding = '6px 0';
          row.style.color = theme.text;
          row.style.borderBottom = `1px solid ${theme.border}`;
          panel.appendChild(row);
        }
      },
    },
    {
      icon: '\u{1F50E}',
      label: 'Audit Log',
      render: (panel) => {
        panel.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = 'Windows Audit Log';
        h.style.color = theme.accent;
        h.style.fontSize = '16px';
        h.style.margin = '0';
        panel.appendChild(h);
        const events = services.audit.listEvents();
        for (const e of events) {
          panel.appendChild(infoRow(`${e.eventId}`, e.message.slice(0, 60)));
        }
      },
    },
    {
      icon: '\u{1F578}',
      label: 'Firewall',
      render: (panel) => {
        panel.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = 'Windows Defender Firewall';
        h.style.color = theme.accent;
        h.style.fontSize = '16px';
        h.style.margin = '0';
        panel.appendChild(h);
        const rules = services.firewall.listRules();
        for (const r of rules) {
          panel.appendChild(infoRow(r.displayName, `${r.action} ${r.direction} ${r.enabled ? '(Enabled)' : '(Disabled)'}`));
        }
      },
    },
    {
      icon: '\u2139}',
      label: 'About',
      render: (panel) => {
        panel.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = 'About';
        h.style.color = theme.accent;
        h.style.fontSize = '16px';
        h.style.margin = '0';
        panel.appendChild(h);
        panel.appendChild(infoRow('Product', PRODUCT.name));
        panel.appendChild(infoRow('Version', PRODUCT.version));
        panel.appendChild(infoRow('Tagline', PRODUCT.tagline));
      },
    },
  ];

  for (const tile of tiles) {
    const btn = document.createElement('button');
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.gap = '8px';
    btn.style.padding = '16px 8px';
    btn.style.background = theme.bg;
    btn.style.border = `1px solid ${theme.border}`;
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.color = theme.text;
    btn.style.fontSize = '12px';
    btn.style.textAlign = 'center';
    btn.style.transition = 'background 0.1s';

    const icon = document.createElement('div');
    icon.textContent = tile.icon;
    icon.style.fontSize = '36px';
    btn.appendChild(icon);

    const label = document.createElement('div');
    label.textContent = tile.label;
    btn.appendChild(label);

    btn.addEventListener('mouseenter', () => { btn.style.background = theme.surfaceHover; });
    btn.addEventListener('mouseleave', () => { btn.style.background = theme.bg; });
    btn.addEventListener('click', () => {
      detail.style.display = 'flex';
      tile.render(detailContent);
    });

    grid.appendChild(btn);
  }

  main.appendChild(grid);
  main.appendChild(detail);
  body.appendChild(main);
}
