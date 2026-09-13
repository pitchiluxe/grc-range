/**
 * Mock compliance findings and risk register for the GRC Range workstation.
 *
 * This service sits at the GRC layer on top of the Windows-primitive mocks.
 * It holds two collections:
 *
 *  1. **Compliance findings** — the deficiencies derived from auditing the
 *     seeded non-compliant configuration (weak password policy, open
 *     firewall, over-permissive shares, local admin sprawl, sensitive data at
 *     rest). Each finding maps to one or more control frameworks.
 *  2. **Risk register** — the risks associated with those findings, scored on
 *     a 1–5 likelihood/impact scale with a control strategy and residual
 *     risk.
 *
 * The store is a plain in-memory map keyed by id; it does not persist.
 */

import type { ComplianceFinding, RiskItem } from '../domain/types';

/**
 * In-memory mock of the compliance findings register and risk register.
 *
 * Self-contained: owns its own seeded findings and risks and exposes the
 * operations the terminal/console windows need (`listFindings`, `addFinding`,
 * `remediateFinding`, `listRisks`, `addRisk`, `updateRisk`).
 */
export class MockCompliance {
  /** Findings keyed by id. */
  private findings: Map<string, ComplianceFinding> = new Map();

  /** Risks keyed by id. */
  private risks: Map<string, RiskItem> = new Map();

  constructor() {
    this.seed();
  }

  // ---------------------------------------------------------------- findings

  /** Return a defensive copy of every compliance finding. */
  listFindings(): ComplianceFinding[] {
    return Array.from(this.findings.values()).map((finding) => ({ ...finding }));
  }

  /**
   * Look up a single finding by id.
   * Returns `undefined` if no such finding exists.
   */
  getFinding(id: string): ComplianceFinding | undefined {
    const finding = this.findings.get(id);
    return finding ? { ...finding } : undefined;
  }

  /**
   * Add a new finding. Returns `false` if a finding with the same id already
   * exists.
   */
  addFinding(finding: ComplianceFinding): boolean {
    if (this.findings.has(finding.id)) return false;
    this.findings.set(finding.id, { ...finding });
    return true;
  }

  /**
   * Mark a finding as remediated and stamp it with the current time.
   * Returns the updated finding, or `undefined` if the finding does not exist.
   */
  remediateFinding(id: string): ComplianceFinding | undefined {
    const finding = this.findings.get(id);
    if (!finding) return undefined;
    finding.status = 'Remediated';
    finding.remediatedAt = new Date().toISOString();
    return { ...finding };
  }

  // ------------------------------------------------------------------- risks

  /** Return a defensive copy of every risk register item. */
  listRisks(): RiskItem[] {
    return Array.from(this.risks.values()).map((risk) => ({ ...risk }));
  }

  /**
   * Look up a single risk by id.
   * Returns `undefined` if no such risk exists.
   */
  getRisk(id: string): RiskItem | undefined {
    const risk = this.risks.get(id);
    return risk ? { ...risk } : undefined;
  }

  /**
   * Add a new risk. Returns `false` if a risk with the same id already
   * exists.
   */
  addRisk(risk: RiskItem): boolean {
    if (this.risks.has(risk.id)) return false;
    this.risks.set(risk.id, { ...risk });
    return true;
  }

  /**
   * Replace a risk register item.
   * Returns the updated risk, or `undefined` if the risk does not exist.
   */
  updateRisk(id: string, risk: RiskItem): RiskItem | undefined {
    if (!this.risks.has(id)) return undefined;
    this.risks.set(id, { ...risk });
    return { ...risk };
  }

  /**
   * Seed the compliance findings and risk register from the seeded
   * non-compliant configuration.
   */
  private seed(): void {
    const findings: ComplianceFinding[] = [
      {
        id: 'FND-001',
        category: 'Access Control',
        severity: 'Critical',
        title: 'Sensitive data stored on an open file share',
        description:
          'C:\\GRC_Lab_Data\\Finance_Share\\credit_cards.txt contains mock PCI cardholder data, yet the Finance_Share directory grants Everyone: FullControl. Any authenticated user (or guest, if enabled) can read or modify the file.',
        frameworks: ['PCI DSS 3.4', 'NIST 800-53 SC-28', 'ISO 27001 A.8.2', 'SOC 2 CC6.1'],
        evidence:
          'Share: Finance_Share -> ACL: Everyone: FullControl (CI)(OI); File: credit_cards.txt (4 mock card numbers).',
        status: 'Open',
      },
      {
        id: 'FND-002',
        category: 'Access Control',
        severity: 'High',
        title: 'PII/PHI data exposed via HR_Records share',
        description:
          'C:\\GRC_Lab_Data\\HR_Records\\employee_ssn.csv contains mock SSNs and health-plan data, but HR_Records is shared with Everyone: FullControl.',
        frameworks: ['HIPAA 164.312(a)(1)', 'NIST 800-53 AC-3', 'ISO 27001 A.8.2', 'SOC 2 CC6.1'],
        evidence:
          'Share: HR_Records -> ACL: Everyone: FullControl (CI)(OI); File: employee_ssn.csv (4 records).',
        status: 'Open',
      },
      {
        id: 'FND-003',
        category: 'Identity & Access Management',
        severity: 'High',
        title: 'Local Administrators group sprawl',
        description:
          'The local Administrators group contains svc_backup, temp_admin, and intern_user in addition to the built-in Administrator. Service, temporary, and intern accounts should not hold elevated rights.',
        frameworks: ['NIST 800-53 AC-2', 'CIS 2.1', 'ISO 27001 A.9.2', 'SOC 2 CC6.3'],
        evidence:
          'Administrators members: Administrator, svc_backup, temp_admin, intern_user.',
        status: 'Open',
      },
      {
        id: 'FND-004',
        category: 'Configuration Management',
        severity: 'Critical',
        title: 'Weak local password policy',
        description:
          'The local password policy allows 4-character passwords with no complexity requirement, no history, and no maximum age. Accounts can use trivial, reused passwords indefinitely.',
        frameworks: ['NIST 800-53 IA-5', 'CIS 1.1.1', 'ISO 27001 A.9.2.4', 'SOC 2 CC6.1'],
        evidence:
          'net accounts: min length 4, complexity off, history 0, max age 0, lockout threshold 0.',
        status: 'Open',
      },
      {
        id: 'FND-005',
        category: 'Network Security',
        severity: 'Critical',
        title: 'Inbound FTP and Telnet allowed on all firewall profiles',
        description:
          'The Windows Firewall has enabled inbound allow rules for FTP (TCP 21) and Telnet (TCP 23) on all profiles. Both are cleartext protocols that should never be exposed.',
        frameworks: ['NIST 800-53 SC-7', 'CIS 9.3', 'ISO 27001 A.13.1', 'PCI DSS 1.2'],
        evidence:
          'Firewall rules: Allow-FTP-Inbound (enabled, Any), Allow-Telnet-Inbound (enabled, Any).',
        status: 'Open',
      },
      {
        id: 'FND-006',
        category: 'Network Security',
        severity: 'High',
        title: 'RDP inbound allowed from any source',
        description:
          'The Windows Firewall allows inbound RDP (TCP 3389) from any address on all profiles. RDP should be restricted to specific management addresses or brokered through a gateway.',
        frameworks: ['NIST 800-53 SC-7', 'CIS 9.3', 'ISO 27001 A.13.1', 'PCI DSS 1.2'],
        evidence: 'Firewall rule: Allow-RDP-Inbound (enabled, profile Any, source Any).',
        status: 'Open',
      },
      {
        id: 'FND-007',
        category: 'Account Management',
        severity: 'Medium',
        title: 'Service account uses a weak password with no expiry',
        description:
          'The svc_backup service account uses the password "backup123" and has "Password never expires" set. Service accounts should use long, random credentials managed by a vault.',
        frameworks: ['NIST 800-53 IA-5', 'CIS 1.1.2', 'ISO 27001 A.9.2.4'],
        evidence: 'User svc_backup: passwordNeverExpires=true, weak password.',
        status: 'Open',
      },
      {
        id: 'FND-008',
        category: 'Audit & Logging',
        severity: 'Medium',
        title: 'Repeated failed logons without lockout',
        description:
          'The Security log shows three consecutive failed logon attempts for temp_admin, but the account lockout threshold is 0 so no lockout occurred. This enables password spraying.',
        frameworks: ['NIST 800-53 AC-7', 'CIS 1.2.1', 'ISO 27001 A.9.4.2'],
        evidence: 'Events 4625 x3 for temp_admin; lockoutThreshold=0.',
        status: 'Open',
      },
    ];

    for (const finding of findings) {
      this.findings.set(finding.id, { ...finding });
    }

    const risks: RiskItem[] = [
      {
        id: 'RSK-001',
        finding: 'Exposed PCI cardholder data on Finance_Share (FND-001)',
        likelihood: 5,
        impact: 5,
        inherentRisk: 25,
        controlStrategy: 'Mitigate',
        residualRisk: 5,
        owner: 'CISO',
        remediation:
          'Remove Everyone:FullControl from Finance_Share; restrict to Finance group; encrypt cardholder data at rest; purge mock data.',
      },
      {
        id: 'RSK-002',
        finding: 'Exposed PII/PHI on HR_Records share (FND-002)',
        likelihood: 4,
        impact: 5,
        inherentRisk: 20,
        controlStrategy: 'Mitigate',
        residualRisk: 4,
        owner: 'HR Director',
        remediation:
          'Restrict HR_Records ACL to HR group; enable NTFS auditing; move PHI to an encrypted store.',
      },
      {
        id: 'RSK-003',
        finding: 'Local Administrators group sprawl (FND-003)',
        likelihood: 4,
        impact: 4,
        inherentRisk: 16,
        controlStrategy: 'Mitigate',
        residualRisk: 4,
        owner: 'IT Operations',
        remediation:
          'Remove svc_backup, temp_admin, and intern_user from Administrators; delete temp_admin; review least privilege.',
      },
      {
        id: 'RSK-004',
        finding: 'Weak password policy (FND-004)',
        likelihood: 4,
        impact: 4,
        inherentRisk: 16,
        controlStrategy: 'Mitigate',
        residualRisk: 4,
        owner: 'IT Security',
        remediation:
          'Set min length 14, enable complexity, history 24, max age 90, lockout threshold 5 / 15 min.',
      },
      {
        id: 'RSK-005',
        finding: 'FTP/Telnet inbound allowed (FND-005)',
        likelihood: 5,
        impact: 4,
        inherentRisk: 20,
        controlStrategy: 'Avoid',
        residualRisk: 2,
        owner: 'Network Engineering',
        remediation:
          'Disable and remove the FTP and Telnet inbound allow rules; replace with SFTP/SSH where required.',
      },
      {
        id: 'RSK-006',
        finding: 'RDP inbound from any source (FND-006)',
        likelihood: 5,
        impact: 4,
        inherentRisk: 20,
        controlStrategy: 'Mitigate',
        residualRisk: 4,
        owner: 'Network Engineering',
        remediation:
          'Restrict RDP rule to specific management subnets; require VPN or RD Gateway; enable NLA.',
      },
      {
        id: 'RSK-007',
        finding: 'Service account weak password (FND-007)',
        likelihood: 3,
        impact: 4,
        inherentRisk: 12,
        controlStrategy: 'Mitigate',
        residualRisk: 3,
        owner: 'IT Operations',
        remediation:
          'Rotate svc_backup to a 32+ character random password managed in a vault; review expiry.',
      },
      {
        id: 'RSK-008',
        finding: 'No account lockout (FND-008)',
        likelihood: 4,
        impact: 3,
        inherentRisk: 12,
        controlStrategy: 'Mitigate',
        residualRisk: 3,
        owner: 'IT Security',
        remediation: 'Set lockout threshold 5, lockout duration 15 minutes; alert on bursts of 4625.',
      },
    ];

    for (const risk of risks) {
      this.risks.set(risk.id, { ...risk });
    }
  }
}
