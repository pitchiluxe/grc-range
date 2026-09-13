/**
 * Browser console window for the GRC Range desktop.
 *
 * A mock web browser that displays GRC compliance reference pages. The address
 * bar is non-functional (shows "about:grc"); a bookmarks bar provides links to
 * reference summaries for PCI-DSS, HIPAA, GDPR, ISO 27001, NIST CSF, and CIS
 * Benchmarks. Back/forward navigation is supported within the session history.
 */

import { getTheme } from '@/ui/themes';
import type { GrcServices } from '@/vm/session';

/** A single reference page shown in the mock browser. */
interface RefPage {
  /** Bookmark label. */
  title: string;
  /** HTML body content for the page. */
  html: string;
}

/** The set of GRC reference pages available in the browser. */
const PAGES: Record<string, RefPage> = {
  'pci-dss': {
    title: 'PCI-DSS Reference',
    html: `
      <h1>PCI-DSS Requirement 3 — Protect Stored Cardholder Data</h1>
      <p><strong>Requirement 3.4:</strong> Render PAN (Primary Account Number) unreadable
      anywhere it is stored by using any of the following approaches:</p>
      <ul>
        <li>One-way hashes based on strong cryptography of the entire PAN</li>
        <li>Truncation (cannot be feasible to reconstruct the full PAN)</li>
        <li>Index tokens and pads (pads must be securely stored)</li>
        <li>Strong cryptography with associated key-management processes</li>
      </ul>
      <p><strong>Lab finding:</strong> <code>credit_cards.txt</code> on Finance_Share stores
      PANs and CVVs in cleartext — a direct violation of Req 3.4.</p>
      <p><strong>Key takeaway:</strong> Never store full PAN + CVV in cleartext. Tokenize,
      truncate, or encrypt with managed keys.</p>`,
  },
  'hipaa': {
    title: 'HIPAA Reference',
    html: `
      <h1>HIPAA Security Rule — 45 CFR \u00A7 164.312</h1>
      <p><strong>(a)(1) Access Control:</strong> Implement technical policies and procedures
      for electronic information systems that maintain electronic protected health
      information (ePHI) to allow access only to those persons or software programs that
      have been granted access rights.</p>
      <p><strong>(a)(2)(iv) Encryption and Decryption:</strong> Implement a mechanism to
      encrypt and decrypt ePHI.</p>
      <p><strong>(b) Audit Controls:</strong> Implement mechanisms to record and examine
      activity in information systems that contain or use ePHI.</p>
      <p><strong>Lab finding:</strong> <code>employee_ssn.csv</code> on HR_Records stores SSNs
      and health-plan data with <code>Everyone: FullControl</code> access.</p>`,
  },
  'gdpr': {
    title: 'GDPR Reference',
    html: `
      <h1>GDPR Article 32 — Security of Processing</h1>
      <p>Controllers and processors shall implement appropriate technical and organisational
      measures to ensure a level of security appropriate to the risk, including:</p>
      <ul>
        <li>(a) Pseudonymisation and encryption of personal data</li>
        <li>(b) Ability to ensure ongoing confidentiality, integrity, availability, and
        resilience of processing systems and services</li>
        <li>(c) Ability to restore the availability and access to personal data in a timely
        manner in the event of a physical or technical incident</li>
        <li>(d) Regular testing, assessing, and evaluating the effectiveness of technical
        and organisational measures</li>
      </ul>
      <p><strong>Lab finding:</strong> PII (SSNs) stored in cleartext on an open share
      violates the confidentiality and encryption expectations of Art 32.</p>`,
  },
  'iso-27001': {
    title: 'ISO 27001 Reference',
    html: `
      <h1>ISO 27001 Control A.9 — Access Control</h1>
      <p><strong>A.9.2 User Access Management:</strong> Ensure authorized user access and to
      prevent unauthorized access to systems and services.</p>
      <ul>
        <li>A.9.2.1 User registration and de-registration</li>
        <li>A.9.2.2 User access provisioning</li>
        <li>A.9.2.3 Management of privileged access rights</li>
        <li>A.9.2.4 Management of secret authentication information</li>
        <li>A.9.2.5 Review of user access rights</li>
        <li>A.9.2.6 Removal or adjustment of access rights</li>
      </ul>
      <p><strong>A.9.4.2 Secure log-on procedures:</strong> Where required by the access
      control policy, access to all systems and applications shall be controlled by a secure
      log-on procedure.</p>
      <p><strong>Lab finding:</strong> temp_admin, intern_user, and svc_backup hold
      privileged access without justification.</p>`,
  },
  'nist-csf': {
    title: 'NIST CSF Reference',
    html: `
      <h1>NIST Cybersecurity Framework — PR.AC (Identity Management & Access Control)</h1>
      <p><strong>PR.AC-4:</strong> Access permissions and activities are managed, incorporating
      the principles of least privilege and separation of duties.</p>
      <p><strong>PR.AC-1:</strong> Identities and credentials are managed for devices and users.</p>
      <p><strong>PR.AC-7:</strong> Users, devices, and other assets are authenticated
      commensurate with the risk of the transaction.</p>
      <p><strong>DE.AE-3:</strong> Event data are collected and correlated from multiple
      sources (audit logging).</p>
      <p><strong>Lab finding:</strong> Over-permissive ACLs (Everyone: FullControl) and
      admin-group sprawl violate least privilege.</p>`,
  },
  'cis': {
    title: 'CIS Benchmarks',
    html: `
      <h1>CIS Benchmark — Windows Server 2022</h1>
      <p>The Center for Internet Security (CIS) Benchmark for Windows Server 2022 provides
      prescriptive hardening guidance. Key controls relevant to this lab:</p>
      <ul>
        <li><strong>1.1.1</strong> Ensure 'Enforce password history' is set to 24 or more</li>
        <li><strong>1.1.2</strong> Ensure 'Password must meet complexity requirements' is Enabled</li>
        <li><strong>1.2.1</strong> Ensure 'Account lockout threshold' is 5 or fewer invalid attempts</li>
        <li><strong>2.1</strong> Ensure 'Access this computer from the network' is restricted</li>
        <li><strong>9.1</strong> Ensure 'Windows Firewall: Domain: Inbound connections' is Block</li>
        <li><strong>9.3</strong> Ensure 'Windows Firewall: Public: Inbound connections' is Block</li>
      </ul>
      <p><strong>Lab finding:</strong> FTP/Telnet inbound allowed, weak password policy, and
      admin sprawl all map to CIS controls.</p>`,
  },
};

/** Ordered bookmark keys for the bookmarks bar. */
const BOOKMARKS: { key: string; label: string }[] = [
  { key: 'pci-dss', label: 'PCI-DSS Reference' },
  { key: 'hipaa', label: 'HIPAA Reference' },
  { key: 'gdpr', label: 'GDPR Reference' },
  { key: 'iso-27001', label: 'ISO 27001 Reference' },
  { key: 'nist-csf', label: 'NIST CSF Reference' },
  { key: 'cis', label: 'CIS Benchmarks' },
];

/**
 * Render the Browser window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (unused).
 */
export function renderBrowserWindow(body: HTMLElement, _services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';

  // Navigation bar
  const navBar = document.createElement('div');
  navBar.style.display = 'flex';
  navBar.style.alignItems = 'center';
  navBar.style.gap = '6px';
  navBar.style.padding = '6px 10px';
  navBar.style.background = theme.bg;
  navBar.style.borderBottom = `1px solid ${theme.border}`;

  const backBtn = document.createElement('button');
  backBtn.textContent = '\u2190';
  backBtn.style.fontSize = '16px';
  backBtn.style.padding = '4px 10px';
  backBtn.style.background = theme.surfaceHover;
  backBtn.style.color = theme.text;
  backBtn.style.border = `1px solid ${theme.border}`;
  backBtn.style.borderRadius = '4px';
  backBtn.style.cursor = 'pointer';

  const fwdBtn = document.createElement('button');
  fwdBtn.textContent = '\u2192';
  fwdBtn.style.fontSize = '16px';
  fwdBtn.style.padding = '4px 10px';
  fwdBtn.style.background = theme.surfaceHover;
  fwdBtn.style.color = theme.text;
  fwdBtn.style.border = `1px solid ${theme.border}`;
  fwdBtn.style.borderRadius = '4px';
  fwdBtn.style.cursor = 'pointer';

  const addrBar = document.createElement('input');
  addrBar.type = 'text';
  addrBar.value = 'about:grc';
  addrBar.readOnly = true;
  addrBar.style.flex = '1';
  addrBar.style.padding = '5px 10px';
  addrBar.style.background = theme.surface;
  addrBar.style.color = theme.textDim;
  addrBar.style.border = `1px solid ${theme.border}`;
  addrBar.style.borderRadius = '4px';
  addrBar.style.fontSize = '13px';

  navBar.appendChild(backBtn);
  navBar.appendChild(fwdBtn);
  navBar.appendChild(addrBar);
  body.appendChild(navBar);

  // Bookmarks bar
  const bookmarkBar = document.createElement('div');
  bookmarkBar.style.display = 'flex';
  bookmarkBar.style.alignItems = 'center';
  bookmarkBar.style.gap = '4px';
  bookmarkBar.style.padding = '4px 10px';
  bookmarkBar.style.background = theme.bg;
  bookmarkBar.style.borderBottom = `1px solid ${theme.border}`;
  bookmarkBar.style.fontSize = '12px';
  bookmarkBar.style.flexWrap = 'wrap';

  body.appendChild(bookmarkBar);

  // Content area
  const content = document.createElement('div');
  content.style.flex = '1';
  content.style.overflow = 'auto';
  content.style.padding = '24px 32px';
  content.style.background = theme.surface;
  content.style.lineHeight = '1.6';
  content.style.fontSize = '14px';
  body.appendChild(content);

  // Navigation history
  const history: string[] = [];
  let historyIndex = -1;

  function navigate(key: string): void {
    const page = PAGES[key];
    if (!page) return;
    // Truncate forward history
    history.splice(historyIndex + 1);
    history.push(key);
    historyIndex = history.length - 1;
    renderPage(key);
  }

  function renderPage(key: string): void {
    const page = PAGES[key];
    if (!page) return;
    addrBar.value = `about:grc/${key}`;
    content.innerHTML = `<div style="max-width:720px">${page.html}</div>`;
    // Style injected HTML elements
    content.querySelectorAll('h1').forEach((h) => {
      (h as HTMLElement).style.color = theme.accent;
      (h as HTMLElement).style.fontSize = '22px';
      (h as HTMLElement).style.marginBottom = '16px';
    });
    content.querySelectorAll('p, li').forEach((p) => {
      (p as HTMLElement).style.margin = '8px 0';
    });
    content.querySelectorAll('code').forEach((c) => {
      (c as HTMLElement).style.background = theme.bg;
      (c as HTMLElement).style.padding = '2px 6px';
      (c as HTMLElement).style.borderRadius = '3px';
      (c as HTMLElement).style.fontFamily = "'Consolas', monospace";
      (c as HTMLElement).style.fontSize = '13px';
      (c as HTMLElement).style.color = theme.warning;
    });
    content.querySelectorAll('strong').forEach((s) => {
      (s as HTMLElement).style.color = theme.text;
    });
    content.querySelectorAll('ul').forEach((u) => {
      (u as HTMLElement).style.paddingLeft = '24px';
    });
  }

  backBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      renderPage(history[historyIndex]!);
    }
  });
  fwdBtn.addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      renderPage(history[historyIndex]!);
    }
  });

  for (const bm of BOOKMARKS) {
    const link = document.createElement('button');
    link.textContent = bm.label;
    link.style.background = 'transparent';
    link.style.border = 'none';
    link.style.color = theme.accent;
    link.style.cursor = 'pointer';
    link.style.padding = '4px 8px';
    link.style.fontSize = '12px';
    link.style.borderRadius = '3px';
    link.addEventListener('mouseenter', () => { link.style.background = theme.surfaceHover; });
    link.addEventListener('mouseleave', () => { link.style.background = 'transparent'; });
    link.addEventListener('click', () => navigate(bm.key));
    bookmarkBar.appendChild(link);
  }

  // Default landing page
  content.innerHTML = `<div style="max-width:600px;text-align:center;margin-top:60px">
    <h1 style="color:${theme.accent};font-size:28px">GRC Reference Browser</h1>
    <p style="color:${theme.textDim}">Select a bookmark above to view compliance framework references.</p>
  </div>`;
}
