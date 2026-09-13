/**
 * Compliance framework definitions and finding-to-framework mappings.
 *
 * The GRC Range lab teaches students to translate raw technical findings into
 * the language of compliance. This module defines the frameworks the lab
 * recognizes and maps each seeded finding type to the control(s) it violates.
 */

/* ------------------------------------------------------------------ *
 * Frameworks
 * ------------------------------------------------------------------ */

/** A compliance / control framework recognized by the GRC Range lab. */
export interface Framework {
  /** Stable identifier used in code and mappings. */
  id: string;
  /** Human-readable framework name. */
  name: string;
  /** Short description of the framework's scope. */
  description: string;
}

/**
 * Compliance frameworks the GRC Range lab maps findings against.
 *
 * The set spans payment-card (PCI-DSS), healthcare (HIPAA), privacy (GDPR),
 * information-security management (ISO 27001), the NIST Cybersecurity
 * Framework, the CIS Windows Server 2022 Benchmark, and SOC 2.
 */
export const FRAMEWORKS: Framework[] = [
  {
    id: 'pci-dss-req3',
    name: 'PCI-DSS Requirement 3',
    description: 'Protect stored cardholder data (encryption, masking, key management).',
  },
  {
    id: 'hipaa-45-cfr',
    name: 'HIPAA Security Rule 45 CFR',
    description: 'Technical security controls for electronic protected health information (ePHI).',
  },
  {
    id: 'gdpr-art-32',
    name: 'GDPR Article 32',
    description: 'Security of processing — pseudonymisation, encryption, confidentiality and integrity.',
  },
  {
    id: 'iso-27001-a9',
    name: 'ISO 27001 Control A.9',
    description: 'Access control — user access management, privileges, and password management.',
  },
  {
    id: 'nist-csf-pr-ac-4',
    name: 'NIST CSF PR.AC-4',
    description: 'Access control — access permissions and activities are managed and verified.',
  },
  {
    id: 'cis-win2022',
    name: 'CIS Benchmark (Windows Server 2022)',
    description: 'Center for Internet Security hardening benchmark for Windows Server 2022.',
  },
  {
    id: 'soc2-type2',
    name: 'SOC 2 Type II',
    description: 'Trust Services Criteria for Security and Confidentiality.',
  },
];

/* ------------------------------------------------------------------ *
 * Finding → framework mappings
 * ------------------------------------------------------------------ */

/** A mapping from a finding type to the frameworks it violates. */
export interface FindingMapping {
  /** Machine-readable finding identifier. */
  finding: string;
  /** Human-readable description of the finding. */
  description: string;
  /** Framework identifiers (see {@link FRAMEWORKS}) the finding maps to. */
  frameworks: string[];
}

/**
 * Maps each seeded finding type to the compliance frameworks it violates.
 *
 * Students use this table in the Compliance Mapper application to translate
 * raw audit output into control citations for their evidence pack.
 */
export const FINDING_MAPPINGS: FindingMapping[] = [
  {
    finding: 'plaintext-credit-cards',
    description: 'Cardholder data (PAN/CVV) stored in cleartext on the workstation.',
    frameworks: ['PCI-DSS Req 3', 'SOC 2', 'ISO 27001 A.8'],
  },
  {
    finding: 'plaintext-pii-phi',
    description: 'SSNs and medical conditions stored in cleartext (PII/PHI at rest).',
    frameworks: ['HIPAA 45 CFR', 'GDPR Art 32', 'SOC 2'],
  },
  {
    finding: 'everyone-full-control-acl',
    description: 'Network share ACL grants Everyone full control.',
    frameworks: ['ISO 27001 A.9', 'NIST CSF PR.AC-4', 'CIS'],
  },
  {
    finding: 'open-ftp-telnet-rdp',
    description: 'Insecure services (FTP/Telnet/RDP) open on all firewall profiles.',
    frameworks: ['CIS', 'NIST CSF PR.AC-5', 'ISO 27001 A.13'],
  },
  {
    finding: 'weak-password-policy',
    description: 'Password policy below baseline (min length 4, no complexity, no lockout).',
    frameworks: ['CIS', 'ISO 27001 A.9', 'PCI-DSS Req 8'],
  },
  {
    finding: 'unjustified-admin',
    description: 'Temporary account granted local administrator without justification.',
    frameworks: ['ISO 27001 A.9', 'CIS', 'NIST CSF PR.AC-4'],
  },
  {
    finding: 'no-audit-logging',
    description: 'Audit-policy coverage incomplete (missing Privilege Use / Policy Change).',
    frameworks: ['PCI-DSS Req 10', 'ISO 27001 A.12', 'SOC 2', 'NIST CSF DE.AE-3'],
  },
];
