/**
 * Seeded, deliberately non-compliant mock data for the GRC Range lab.
 *
 * IMPORTANT — READ BEFORE USING
 * ----------------------------
 * Every record in this module is SYNTHETIC TEST DATA. Credit-card numbers
 * use public test ranges (e.g. Visa 4111..., Mastercard 5555...) that will
 * never be issued by any acquiring bank. SSNs use SSA-invalid ranges
 * (900-xx-xxxx, 000-xx-xxxx, 666-xx-xxxx) that the Social Security
 * Administration will never allocate. No record corresponds to a real person
 * or account.
 *
 * The data is intentionally seeded with PCI-DSS, HIPAA, and GDPR violations so
 * that students can discover, map, and remediate findings during the lab. Do
 * NOT copy this data into a production system.
 */

/* ------------------------------------------------------------------ *
 * Credit card records (PCI-DSS scope)
 * ------------------------------------------------------------------ */

/** A single synthetic credit-card record stored on the workstation. */
export interface MockCreditCard {
  /** Synthetic PAN using a public test card range. */
  number: string;
  /** Fictional cardholder (no real person). */
  cardholder: string;
  /** Card brand, for readability only. */
  brand: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  /** Expiry month (MM). */
  expiryMonth: string;
  /** Expiry year (YY). */
  expiryYear: string;
  /** Card verification value (synthetic). */
  cvv: string;
  /** Always `true` — flags that the record is synthetic. */
  synthetic: boolean;
}

/**
 * 25 mock credit-card records stored in a plaintext file on the workstation.
 *
 * Storing PANs (and CVVs) in cleartext is a PCI-DSS Requirement 3 violation and
 * the primary finding the student must map and remediate.
 */
export const MOCK_CREDIT_CARDS: MockCreditCard[] = [
  { number: '4111111111111111', cardholder: 'Alice Omari',     brand: 'Visa',       expiryMonth: '03', expiryYear: '27', cvv: '123', synthetic: true },
  { number: '4222222222222',    cardholder: 'Bruno Omari',      brand: 'Visa',       expiryMonth: '06', expiryYear: '26', cvv: '456', synthetic: true },
  { number: '4012888888881881', cardholder: 'Cara Omari',       brand: 'Visa',       expiryMonth: '09', expiryYear: '28', cvv: '789', synthetic: true },
  { number: '4242424242424242', cardholder: 'Diego Omari',      brand: 'Visa',       expiryMonth: '12', expiryYear: '25', cvv: '321', synthetic: true },
  { number: '4444333322221111', cardholder: 'Elena Omari',      brand: 'Visa',       expiryMonth: '01', expiryYear: '29', cvv: '654', synthetic: true },
  { number: '5555555555554444', cardholder: 'Farah Omari',      brand: 'Mastercard', expiryMonth: '04', expiryYear: '27', cvv: '147', synthetic: true },
  { number: '5105105105105100', cardholder: 'Gabe Omari',       brand: 'Mastercard', expiryMonth: '07', expiryYear: '26', cvv: '258', synthetic: true },
  { number: '5200828282828210', cardholder: 'Hana Omari',       brand: 'Mastercard', expiryMonth: '10', expiryYear: '28', cvv: '369', synthetic: true },
  { number: '5409888888888881', cardholder: 'Ivan Omari',       brand: 'Mastercard', expiryMonth: '02', expiryYear: '25', cvv: '741', synthetic: true },
  { number: '5500000000000004', cardholder: 'Jana Omari',       brand: 'Mastercard', expiryMonth: '05', expiryYear: '29', cvv: '852', synthetic: true },
  { number: '378282246310005',  cardholder: 'Karl Omari',      brand: 'Amex',       expiryMonth: '08', expiryYear: '26', cvv: '9631', synthetic: true },
  { number: '371449635398431',  cardholder: 'Leah Omari',      brand: 'Amex',       expiryMonth: '11', expiryYear: '28', cvv: '1593', synthetic: true },
  { number: '378734493671000',  cardholder: 'Mona Omari',      brand: 'Amex',       expiryMonth: '03', expiryYear: '25', cvv: '2681', synthetic: true },
  { number: '341111111111111',  cardholder: 'Nina Omari',      brand: 'Amex',       expiryMonth: '06', expiryYear: '29', cvv: '3742', synthetic: true },
  { number: '343434343434343',  cardholder: 'Omar Omari',      brand: 'Amex',       expiryMonth: '09', expiryYear: '27', cvv: '4853', synthetic: true },
  { number: '6011111111111117', cardholder: 'Pia Omari',       brand: 'Discover',   expiryMonth: '12', expiryYear: '26', cvv: '159', synthetic: true },
  { number: '6011000990139424', cardholder: 'Quin Omari',      brand: 'Discover',   expiryMonth: '01', expiryYear: '28', cvv: '267', synthetic: true },
  { number: '6011601160116611', cardholder: 'Rina Omari',      brand: 'Discover',   expiryMonth: '04', expiryYear: '25', cvv: '378', synthetic: true },
  { number: '6011000400000000', cardholder: 'Sami Omari',      brand: 'Discover',   expiryMonth: '07', expiryYear: '29', cvv: '489', synthetic: true },
  { number: '6011981111111113', cardholder: 'Tara Omari',      brand: 'Discover',   expiryMonth: '10', expiryYear: '27', cvv: '591', synthetic: true },
  { number: '4111111111111111', cardholder: 'Umar Omari',      brand: 'Visa',       expiryMonth: '02', expiryYear: '26', cvv: '612', synthetic: true },
  { number: '4222222222222',    cardholder: 'Vera Omari',      brand: 'Visa',       expiryMonth: '05', expiryYear: '28', cvv: '723', synthetic: true },
  { number: '5555555555554444', cardholder: 'Wade Omari',      brand: 'Mastercard', expiryMonth: '08', expiryYear: '25', cvv: '834', synthetic: true },
  { number: '5105105105105100', cardholder: 'Xena Omari',      brand: 'Mastercard', expiryMonth: '11', expiryYear: '29', cvv: '945', synthetic: true },
  { number: '378282246310005',  cardholder: 'Yuri Omari',      brand: 'Amex',       expiryMonth: '03', expiryYear: '27', cvv: '1561', synthetic: true },
];

/* ------------------------------------------------------------------ *
 * Employee records (HIPAA PHI / GDPR PII scope)
 * ------------------------------------------------------------------ */

/** A single synthetic employee record containing PII/PHI. */
export interface MockEmployee {
  /** Synthetic employee identifier. */
  id: string;
  /** Fictional employee name (no real person). */
  name: string;
  /** Synthetic SSN using an SSA-invalid range. */
  ssn: string;
  /** Fictional medical condition (PHI) — synthetic. */
  medicalCondition: string;
  /** Synthetic annual salary in USD. */
  salary: number;
  /** Department the fictional employee belongs to. */
  department: string;
  /** Always `true` — flags that the record is synthetic. */
  synthetic: boolean;
}

/**
 * 15 mock employee records containing SSNs and medical conditions.
 *
 * The SSNs deliberately use SSA-invalid ranges so they can never correspond to
 * a real person:
 *  - `900-xx-xxxx` : above the highest valid area number.
 *  - `000-xx-xxxx` : area number 000 is never issued.
 *  - `666-xx-xxxx` : area number 666 is never issued.
 *
 * Storing SSNs and medical conditions in cleartext triggers HIPAA Security
 * Rule and GDPR Article 32 findings.
 */
export const MOCK_EMPLOYEES: MockEmployee[] = [
  { id: 'EMP-001', name: 'Alice Omari',    ssn: '900-12-3456', medicalCondition: 'Asthma',           salary: 82000,  department: 'IT',         synthetic: true },
  { id: 'EMP-002', name: 'Bruno Omari',    ssn: '000-45-6789', medicalCondition: 'Hypertension',     salary: 91000,  department: 'Security',   synthetic: true },
  { id: 'EMP-003', name: 'Cara Omari',     ssn: '666-78-9012', medicalCondition: 'Type 2 Diabetes',  salary: 76000,  department: 'Audit',       synthetic: true },
  { id: 'EMP-004', name: 'Diego Omari',    ssn: '900-23-4567', medicalCondition: 'Migraine',         salary: 68000,  department: 'HR',          synthetic: true },
  { id: 'EMP-005', name: 'Elena Omari',    ssn: '000-56-7890', medicalCondition: 'Anxiety disorder',  salary: 112000, department: 'Finance',     synthetic: true },
  { id: 'EMP-006', name: 'Farah Omari',    ssn: '666-89-0123', medicalCondition: 'Sleep apnea',      salary: 73000,  department: 'Operations',  synthetic: true },
  { id: 'EMP-007', name: 'Gabe Omari',     ssn: '900-34-5678', medicalCondition: 'Coronary disease',  salary: 134000, department: 'IT',          synthetic: true },
  { id: 'EMP-008', name: 'Hana Omari',     ssn: '000-67-8901', medicalCondition: 'Depression',       salary: 59000,  department: 'Security',    synthetic: true },
  { id: 'EMP-009', name: 'Ivan Omari',     ssn: '666-90-1234', medicalCondition: 'Arthritis',        salary: 88000,  department: 'Audit',       synthetic: true },
  { id: 'EMP-010', name: 'Jana Omari',     ssn: '900-45-6789', medicalCondition: 'Celiac disease',    salary: 71000,  department: 'HR',          synthetic: true },
  { id: 'EMP-011', name: 'Karl Omari',     ssn: '000-78-9012', medicalCondition: 'Epilepsy',         salary: 97000,  department: 'Finance',     synthetic: true },
  { id: 'EMP-012', name: 'Leah Omari',     ssn: '666-01-2345', medicalCondition: 'PTSD',             salary: 64000,  department: 'Operations',  synthetic: true },
  { id: 'EMP-013', name: 'Mona Omari',     ssn: '900-56-7890', medicalCondition: 'COPD',             salary: 121000, department: 'IT',          synthetic: true },
  { id: 'EMP-014', name: 'Nina Omari',     ssn: '000-89-0123', medicalCondition: 'Crohn\u2019s disease', salary: 78000, department: 'Security', synthetic: true },
  { id: 'EMP-015', name: 'Omar Omari',     ssn: '666-12-3456', medicalCondition: 'Bipolar disorder',  salary: 86000,  department: 'Audit',       synthetic: true },
];

/* ------------------------------------------------------------------ *
 * Windows Security event-log entries
 * ------------------------------------------------------------------ */

/** A single mock Windows Security event-log entry. */
export interface MockSecurityEvent {
  /** Windows event identifier. */
  eventId: number;
  /** ISO-8601 timestamp of the event. */
  timestamp: string;
  /** Human-readable event message. */
  message: string;
}

/**
 * 8 mock Windows Security event-log entries.
 *
 * The event IDs correspond to the auditpol categories enabled in
 * {@link MOCK_AUDIT_CATEGORIES} and surface during the lab's audit phase.
 */
export const MOCK_SECURITY_EVENTS: MockSecurityEvent[] = [
  { eventId: 4624, timestamp: '2024-06-01T08:01:14', message: 'An account was successfully logged on (svc_backup).', },
  { eventId: 4672, timestamp: '2024-06-01T08:01:14', message: 'Special privileges assigned to new logon (temp_admin).', },
  { eventId: 4720, timestamp: '2024-06-01T09:22:47', message: 'A user account was created (intern_user).', },
  { eventId: 4732, timestamp: '2024-06-01T09:23:05', message: 'A member was added to a security-enabled local group (temp_admin \u2192 Administrators).', },
  { eventId: 4688, timestamp: '2024-06-01T10:14:33', message: 'A new process has been created (cmd.exe \u2192 net share).', },
  { eventId: 4625, timestamp: '2024-06-01T11:45:02', message: 'An account failed to log on (unknown: bad password, 5 attempts).', },
  { eventId: 4698, timestamp: '2024-06-01T12:00:00', message: 'A scheduled task was created (BackupJob, runs as svc_backup).', },
  { eventId: 5140, timestamp: '2024-06-01T12:30:11', message: 'A network share object was accessed (\\\\GRC-LAB-SRV01\\FinanceShare).', },
];

/* ------------------------------------------------------------------ *
 * Local user accounts
 * ------------------------------------------------------------------ */

/** A single mock local user account on the workstation. */
export interface MockUser {
  /** Local account username. */
  username: string;
  /** Plaintext password (intentionally weak, for the lab only). */
  password: string;
  /** Human-readable description of the account and its weakness. */
  description: string;
  /** Whether the account is a member of the local Administrators group. */
  isAdmin: boolean;
}

/**
 * 3 vulnerable local user accounts seeded on the workstation.
 *
 * Each account embodies a distinct access-control weakness the student must
 * discover and remediate (weak password, unjustified admin, etc.).
 */
export const MOCK_USERS: MockUser[] = [
  { username: 'svc_backup', password: 'Password123', description: 'Mock service account (weak password)',     isAdmin: false },
  { username: 'temp_admin', password: 'Welcome1',     description: 'Mock temp admin (unjustified admin)',     isAdmin: true  },
  { username: 'intern_user', password: 'Password123', description: 'Mock intern account (weak password)',     isAdmin: false },
];

/* ------------------------------------------------------------------ *
 * Firewall rules
 * ------------------------------------------------------------------ */

/** A single mock Windows Defender Firewall rule. */
export interface MockFirewallRule {
  /** Display name of the firewall rule. */
  name: string;
  /** Local TCP/UDP port the rule targets. */
  port: number;
  /** Transport protocol. */
  protocol: 'TCP' | 'UDP';
  /** Traffic direction. */
  direction: 'Inbound' | 'Outbound';
  /** Allow / Block action. */
  action: 'Allow' | 'Block';
  /** Windows firewall profile the rule applies to. */
  profile: 'Domain' | 'Private' | 'Public' | 'Any';
  /** Human-readable description of the rule and why it was seeded. */
  description: string;
}

/**
 * 3 vulnerable firewall rules seeded on the workstation.
 *
 * FTP, Telnet, and RDP are left open on all profiles so the student can map
 * an "open insecure services" finding to CIS / NIST / ISO controls.
 */
export const MOCK_FIREWALL_RULES: MockFirewallRule[] = [
  { name: 'GRC-Lab-FTP-Insecure',    port: 21,   protocol: 'TCP', direction: 'Inbound', action: 'Allow', profile: 'Any', description: 'INTENTIONAL: FTP open for GRC audit finding' },
  { name: 'GRC-Lab-Telnet-Insecure', port: 23,   protocol: 'TCP', direction: 'Inbound', action: 'Allow', profile: 'Any', description: 'INTENTIONAL: Telnet open for GRC audit finding' },
  { name: 'GRC-Lab-RDP-Insecure',    port: 3389, protocol: 'TCP', direction: 'Inbound', action: 'Allow', profile: 'Any', description: 'INTENTIONAL: RDP open on all profiles for GRC audit finding' },
];

/* ------------------------------------------------------------------ *
 * Password policy
 * ------------------------------------------------------------------ */

/**
 * Weak local password / account policy seeded on the workstation.
 *
 * Every value is deliberately non-compliant (min length 4, no complexity,
 * no lockout) so students can remediate toward CIS / PCI-DSS baselines.
 */
export const MOCK_PASSWORD_POLICY = {
  /** Minimum password length (intentionally too low). */
  minLength: 4,
  /** Whether complexity requirements are enforced. */
  complexity: false,
  /** Minimum password age in days. */
  minAge: 0,
  /** Maximum password age in days. */
  maxAge: 42,
  /** Number of passwords remembered in history. */
  history: 0,
  /** Number of failed attempts before account lockout (0 = no lockout). */
  lockoutThreshold: 0,
} as const;

/** TypeScript type derived from {@link MOCK_PASSWORD_POLICY}. */
export type MockPasswordPolicy = typeof MOCK_PASSWORD_POLICY;

/* ------------------------------------------------------------------ *
 * Audit-policy categories
 * ------------------------------------------------------------------ */

/**
 * auditpol categories that are enabled on the workstation.
 *
 * These mirror the event IDs in {@link MOCK_SECURITY_EVENTS} and seed the
 * "audit logging" finding: some categories are on, but coverage is incomplete
 * (e.g. no Privilege Use / Policy Change auditing).
 */
export const MOCK_AUDIT_CATEGORIES = [
  'Logon',
  'Logoff',
  'AccountLockout',
  'UserAccountManagement',
  'SecurityGroupManagement',
  'ProcessCreation',
  'FileShareAccess',
  'ObjectAccess',
] as const;

/** Union type of the enabled auditpol category names. */
export type MockAuditCategory = (typeof MOCK_AUDIT_CATEGORIES)[number];
