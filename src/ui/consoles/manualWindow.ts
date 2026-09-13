/**
 * GRC Range Manual console window for the GRC Range desktop.
 *
 * Displays the lab manual / instructions with a table of contents sidebar and
 * a content area. Sections cover the lab workflow: overview, setup, audit,
 * risk assessment, remediation, and verification commands.
 */

import { getTheme } from '@/ui/themes';
import type { GrcServices } from '@/vm/session';

/** A manual section. */
interface ManualSection {
  /** Section id used in the table of contents. */
  id: string;
  /** Section title shown in the TOC and content header. */
  title: string;
  /** HTML content for the section body. */
  html: string;
}

/** The ordered set of manual sections. */
const SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    html: `
      <h2>Overview</h2>
      <p>The <strong>GRC Range</strong> is a simulated Windows Server 2022 desktop
      designed for Governance, Risk, and Compliance (GRC) audit training. It seeds a
      deliberately non-compliant configuration containing PCI cardholder data, PII/PHI
      employee records, weak password policy, open firewall rules, and local admin sprawl.</p>
      <p>Your goal is to walk through the full GRC lifecycle:</p>
      <ol>
        <li><strong>Setup</strong> - verify the seeded non-compliant data.</li>
        <li><strong>Audit</strong> - discover findings and map them to compliance frameworks.</li>
        <li><strong>Risk Assessment</strong> - build a risk register.</li>
        <li><strong>Remediation</strong> - fix the findings and re-audit.</li>
      </ol>
      <p>All data is synthetic and for training purposes only.</p>`,
  },
  {
    id: 'phase1',
    title: 'Phase 1: Setup',
    html: `
      <h2>Phase 1: Setup</h2>
      <p>Verify the seeded non-compliant data is present on the workstation.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open <strong>File Explorer</strong> and navigate to <code>C:\\GRC_Lab_Data</code>.</li>
        <li>Confirm the <code>Finance_Share</code> and <code>HR_Records</code> directories exist.</li>
        <li>Open the <strong>Terminal</strong> and run <code>dir C:\\GRC_Lab_Data</code>.</li>
        <li>Run <code>icacls C:\\GRC_Lab_Data\\Finance_Share</code> to view the ACL.</li>
        <li>Note the <code>Everyone: FullControl</code> permission - this is a finding.</li>
        <li>Run <code>net accounts</code> to view the password policy.</li>
        <li>Run <code>Get-LocalUser</code> to list local user accounts.</li>
      </ol>`,
  },
  {
    id: 'phase2',
    title: 'Phase 2: Audit',
    html: `
      <h2>Phase 2: Audit</h2>
      <p>Discover and map findings to compliance frameworks.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open the <strong>Audit Console</strong> and review each tab:
          Users & Groups, Firewall, Password Policy, File ACLs, Audit Log, CIS Check.</li>
        <li>On the <strong>CIS Check</strong> tab, click "Run CIS Check" to see the
          benchmark results (7 FAIL / 3 PASS).</li>
        <li>For each finding, click <strong>Map to Framework</strong> to see which
          compliance controls it violates.</li>
        <li>Open the <strong>Compliance Mapper</strong> to review all findings and their
          framework mappings in one view.</li>
        <li>Use the <strong>Export</strong> button to download findings as a text report.</li>
      </ol>
      <h3>Key Findings to Discover</h3>
      <ul>
        <li>PCI cardholder data in cleartext on Finance_Share</li>
        <li>PII/PHI data in cleartext on HR_Records</li>
        <li>Everyone: FullControl on both shares</li>
        <li>Weak password policy (min length 4, no complexity)</li>
        <li>FTP/Telnet/RDP inbound allowed on all profiles</li>
        <li>Admin group sprawl (temp_admin, intern_user, svc_backup)</li>
      </ul>`,
  },
  {
    id: 'phase3',
    title: 'Phase 3: Risk Assessment',
    html: `
      <h2>Phase 3: Risk Assessment</h2>
      <p>Build a risk register to quantify and prioritize the findings.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open the <strong>Risk Register</strong> application.</li>
        <li>Review the pre-populated risk items (likelihood, impact, inherent risk).</li>
        <li>Study the 5x5 risk matrix to visualize risk levels.</li>
        <li>Click <strong>Add Risk</strong> to add a new risk for any finding not yet covered.</li>
        <li>Set the control strategy (Mitigate, Accept, Transfer, Avoid) and owner.</li>
        <li>Export the risk register as a markdown table for your evidence pack.</li>
      </ol>
      <h3>Risk Scoring</h3>
      <p>Inherent Risk = Likelihood x Impact (1-5 scale). Scores of 20-25 are
      Critical (red), 12-16 are High (orange), 6-10 are Medium (yellow), and 1-5
      are Low (green).</p>`,
  },
  {
    id: 'phase4',
    title: 'Phase 4: Remediation',
    html: `
      <h2>Phase 4: Remediation</h2>
      <p>Fix the non-compliant findings and re-audit to verify.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open the <strong>Remediation Console</strong>.</li>
        <li>For each open finding, click <strong>Remediate</strong> to apply the fix:
          <ul>
            <li><strong>Fix ACL</strong> - remove Everyone:FullControl, set Authenticated Users:Read</li>
            <li><strong>Disable Firewall Rule</strong> - disable FTP/Telnet/RDP rules</li>
            <li><strong>Fix Password Policy</strong> - set min length 14, enable complexity</li>
            <li><strong>Remove from Admin</strong> - remove temp_admin from Administrators</li>
            <li><strong>Disable User</strong> - disable svc_backup or intern_user</li>
            <li><strong>Enable Audit Logging</strong> - ensure audit categories are enabled</li>
          </ul>
        </li>
        <li>Review the before/after comparison for each remediation.</li>
        <li>Click <strong>Re-Audit</strong> to verify the remediation took effect.</li>
        <li>Check the progress indicator to see how many findings are remediated.</li>
      </ol>`,
  },
  {
    id: 'phase5',
    title: 'Phase 5: Executive Briefing',
    html: `
      <h2>Phase 5: Executive Briefing</h2>
      <p>Learn to present GRC findings to non-technical executives.</p>
      <h3>Objective</h3>
      <p>Translate technical findings into financial risk metrics an executive
      can act on, and defend a remediation budget under challenge.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open the <strong>GRC Expert</strong> and switch to <strong>"Explain the concept"</strong> mode.</li>
        <li>Ask: <code>How do I frame these findings for a CFO?</code></li>
        <li>Practice translating technical findings to financial risk metrics
          (Annualised Loss Expectancy, single-loss expectancy, remediation cost vs. expected loss).</li>
        <li>Ask the expert to challenge your budget justification as a CFO would
          — defend each line item with risk-reduction numbers.</li>
        <li>Document your executive briefing in <strong>Notepad</strong>.</li>
      </ol>
      <h3>Deliverable</h3>
      <p>An executive briefing document with financial risk framing — one page,
      headline risk first, then remediation cost, then residual risk.</p>`,
  },
  {
    id: 'phase6',
    title: 'Phase 6: Policy Writing',
    html: `
      <h2>Phase 6: Policy Writing</h2>
      <p>Write formal governance policies for the remediated environment.</p>
      <h3>Objective</h3>
      <p>Produce formal, enforceable governance documents that codify the
      controls applied during remediation.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open the <strong>GRC Expert</strong> and ask about access control policy structure
          (purpose, scope, roles, statements, enforcement, review).</li>
        <li>Draft an <strong>Access Control Policy</strong> governing data share restrictions
          — who may access Finance_Share and HR_Records, under what conditions.</li>
        <li>Draft an <strong>Acceptable Use Policy</strong> for PII/PHI handling
          — storage, transmission, retention, and disposal rules.</li>
        <li>Ask the expert to review your policy for completeness
          (missing roles, unenforceable statements, no review cycle).</li>
        <li>Save policies in the <strong>Policies</strong> directory.</li>
      </ol>
      <h3>Deliverable</h3>
      <p>Two formal policy documents (Access Control Policy and Acceptable Use
      Policy), each with purpose, scope, roles, policy statements, enforcement,
      and a review cycle.</p>`,
  },
  {
    id: 'phase7',
    title: 'Phase 7: Audit Report Generation',
    html: `
      <h2>Phase 7: Audit Report Generation</h2>
      <p>Produce a formal audit finding report and a complete audit package.</p>
      <h3>Objective</h3>
      <p>Combine findings, evidence, and the risk register into a defensible
      audit package suitable for external review.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open the <strong>Compliance Mapper</strong> and review all findings and their
          framework mappings.</li>
        <li>Use the <strong>"Generate Audit Report"</strong> button to produce the findings
          report.</li>
        <li>Open the <strong>GRC Expert</strong> and ask it to review your report.</li>
        <li>Ask: <code>What's missing from this audit report?</code></li>
        <li>Open the <strong>Evidence Pack</strong> and generate the evidence report.</li>
        <li>Combine into a complete audit package — findings report + evidence pack +
          risk register.</li>
      </ol>
      <h3>Deliverable</h3>
      <p>A complete audit package: findings report (with framework mappings),
      evidence pack (raw artefacts), and risk register (scored and prioritised).</p>`,
  },
  {
    id: 'grc-expert',
    title: 'GRC Senior Expert',
    html: `
      <h2>GRC Senior Expert</h2>
      <p>The <strong>GRC Senior Expert</strong> is an AI-powered tutor available on the
      desktop. It grounds its answers in a curated GRC knowledge base and the
      live findings in your environment.</p>
      <h3>How It Works</h3>
      <ul>
        <li>It uses a local <strong>Ollama</strong> model (<code>llama3.2</code>) for
          grounded answers when available.</li>
        <li>Three modes:
          <ul>
            <li><strong>Socratic</strong> ("Ask me questions") — the expert probes you
              to guide your reasoning.</li>
            <li><strong>Explain</strong> ("Explain the concept") — the expert teaches the
              concept directly.</li>
            <li><strong>Walkthrough</strong> ("Walk me through it") — the expert gives
              step-by-step instructions.</li>
          </ul>
        </li>
        <li>Without Ollama, it quotes the knowledge base directly so the lab still
          teaches.</li>
        <li>Each expert reply shows citation chips for the knowledge base articles
          used — click a chip to read the source.</li>
      </ul>
      <h3>Install Ollama</h3>
      <pre>ollama pull llama3.2</pre>
      <p>Once Ollama is running, the status indicator in the expert window turns
      green ("Ollama connected").</p>`,
  },
  {
    id: 'verification',
    title: 'Verification Commands',
    html: `
      <h2>Verification Commands</h2>
      <p>Use these PowerShell commands in the <strong>Terminal</strong> to verify findings
      before and after remediation.</p>
      <h3>Users & Groups</h3>
      <pre>Get-LocalUser
net localgroup Administrators</pre>
      <h3>Password Policy</h3>
      <pre>net accounts</pre>
      <h3>File ACLs</h3>
      <pre>icacls C:\\GRC_Lab_Data\\Finance_Share
icacls C:\\GRC_Lab_Data\\HR_Records</pre>
      <h3>Firewall</h3>
      <pre>Get-NetFirewallRule
netstat -ano</pre>
      <h3>Audit Log</h3>
      <pre>Get-WinEvent
auditpol /get /category:*</pre>
      <h3>CIS Benchmark</h3>
      <pre>Invoke-CISCheck</pre>
      <h3>Compliance Findings</h3>
      <pre>Repair-GRCFinding -Id FND-001</pre>`,
  },
];

/**
 * Render the Manual window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (unused).
 */
export function renderManualWindow(body: HTMLElement, _services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.padding = '0';

  // Sidebar (table of contents)
  const sidebar = document.createElement('div');
  sidebar.style.width = '200px';
  sidebar.style.flexShrink = '0';
  sidebar.style.background = theme.bg;
  sidebar.style.borderRight = `1px solid ${theme.border}`;
  sidebar.style.padding = '12px 0';
  sidebar.style.overflow = 'auto';

  const tocTitle = document.createElement('div');
  tocTitle.textContent = 'Contents';
  tocTitle.style.padding = '8px 16px';
  tocTitle.style.fontWeight = '600';
  tocTitle.style.fontSize = '11px';
  tocTitle.style.color = theme.textDim;
  tocTitle.style.textTransform = 'uppercase';
  tocTitle.style.letterSpacing = '0.5px';
  sidebar.appendChild(tocTitle);

  // Content area
  const content = document.createElement('div');
  content.style.flex = '1';
  content.style.overflow = 'auto';
  content.style.padding = '24px 32px';
  content.style.fontSize = '14px';
  content.style.lineHeight = '1.7';

  function showSection(id: string): void {
    const section = SECTIONS.find((s) => s.id === id);
    if (!section) return;
    content.innerHTML = section.html;
    styleContent();
    // Highlight active TOC item
    sidebar.querySelectorAll('button').forEach((b) => {
      b.style.background = 'transparent';
      b.style.color = theme.text;
    });
    const active = sidebar.querySelector(`button[data-id="${id}"]`);
    if (active) {
      (active as HTMLElement).style.background = theme.surfaceHover;
      (active as HTMLElement).style.color = theme.accent;
    }
  }

  function styleContent(): void {
    content.querySelectorAll('h2').forEach((h) => {
      (h as HTMLElement).style.color = theme.accent;
      (h as HTMLElement).style.fontSize = '20px';
      (h as HTMLElement).style.margin = '0 0 12px 0';
    });
    content.querySelectorAll('h3').forEach((h) => {
      (h as HTMLElement).style.color = theme.text;
      (h as HTMLElement).style.fontSize = '15px';
      (h as HTMLElement).style.margin = '16px 0 8px 0';
    });
    content.querySelectorAll('p').forEach((p) => {
      (p as HTMLElement).style.margin = '8px 0';
    });
    content.querySelectorAll('ul, ol').forEach((u) => {
      (u as HTMLElement).style.paddingLeft = '24px';
      (u as HTMLElement).style.margin = '8px 0';
    });
    content.querySelectorAll('li').forEach((l) => {
      (l as HTMLElement).style.margin = '4px 0';
    });
    content.querySelectorAll('code').forEach((c) => {
      (c as HTMLElement).style.background = theme.bg;
      (c as HTMLElement).style.padding = '2px 6px';
      (c as HTMLElement).style.borderRadius = '3px';
      (c as HTMLElement).style.fontFamily = "'Consolas', monospace";
      (c as HTMLElement).style.fontSize = '13px';
      (c as HTMLElement).style.color = theme.warning;
    });
    content.querySelectorAll('pre').forEach((p) => {
      (p as HTMLElement).style.background = theme.bg;
      (p as HTMLElement).style.padding = '12px 16px';
      (p as HTMLElement).style.borderRadius = '6px';
      (p as HTMLElement).style.border = `1px solid ${theme.border}`;
      (p as HTMLElement).style.overflow = 'auto';
      (p as HTMLElement).style.fontFamily = "'Consolas', monospace";
      (p as HTMLElement).style.fontSize = '13px';
      (p as HTMLElement).style.color = theme.text;
      (p as HTMLElement).style.margin = '8px 0';
    });
    content.querySelectorAll('pre code').forEach((c) => {
      (c as HTMLElement).style.background = 'transparent';
      (c as HTMLElement).style.padding = '0';
      (c as HTMLElement).style.color = theme.text;
    });
    content.querySelectorAll('strong').forEach((s) => {
      (s as HTMLElement).style.color = theme.text;
    });
  }

  for (const section of SECTIONS) {
    const btn = document.createElement('button');
    btn.setAttribute('data-id', section.id);
    btn.textContent = section.title;
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.padding = '8px 16px';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = theme.text;
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '13px';
    btn.addEventListener('mouseenter', () => { btn.style.background = theme.surfaceHover; });
    btn.addEventListener('mouseleave', () => {
      if (btn.style.color !== theme.accent) btn.style.background = 'transparent';
    });
    btn.addEventListener('click', () => showSection(section.id));
    sidebar.appendChild(btn);
  }

  body.appendChild(sidebar);
  body.appendChild(content);

  // Show the first section by default
  showSection(SECTIONS[0]!.id);
}
