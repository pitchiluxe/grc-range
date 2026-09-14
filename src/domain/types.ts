/**
 * Core domain types for the GRC Range simulated Windows workstation.
 *
 * These types model the Windows security primitives (local users, firewall
 * rules, password policy, audit events, file shares) that the simulated
 * terminal and console windows interact with, plus the GRC-layer concepts
 * (compliance findings and the risk register) that sit on top of them.
 *
 * Everything here is plain data — no behaviour. The service classes in
 * `src/services/` own the mutable in-memory state and operate on these types.
 */

/** Unique identifier for a local Windows user account. */
export type UserId = string;

/** Unique identifier for a local Windows group. */
export type GroupId = string;

/** A local Windows user account (the `net user` / Local Users and Groups view). */
export interface LocalUser {
  /** Stable unique id (not the username). */
  id: string;
  /** SAM account name, e.g. `svc_backup`. */
  username: string;
  /** Friendly display name shown in the UI. */
  displayName: string;
  /** Free-form description field from the user object. */
  description: string;
  /** Whether the account is enabled (not disabled). */
  enabled: boolean;
  /** Whether the account is a member of the Administrators group. */
  isAdmin: boolean;
  /** Plaintext password for the simulated account (lab only). */
  password: string;
  /** Whether the "Password never expires" flag is set. */
  passwordNeverExpires: boolean;
  /** Organisational department tag used for reporting. */
  department: string;
  /** ISO-8601 timestamp the account was created. */
  created: string;
}

/** A single Windows Defender Firewall rule. */
export interface FirewallRule {
  /** Stable unique id. */
  id: string;
  /** Rule name (unique within the rule set). */
  name: string;
  /** Human-readable display name. */
  displayName: string;
  /** Description shown in the firewall snap-in. */
  description: string;
  /** Traffic direction the rule applies to. */
  direction: 'Inbound' | 'Outbound';
  /** Whether to allow or block matching traffic. */
  action: 'Allow' | 'Block';
  /** Transport protocol. */
  protocol: 'TCP' | 'UDP';
  /** Local port the rule targets. */
  localPort: number;
  /** Network profile the rule is active on. */
  profile: 'Any' | 'Domain' | 'Private' | 'Public';
  /** Whether the rule is currently enabled. */
  enabled: boolean;
}

/** The local security authority password / lockout policy (`secedit` / `net accounts`). */
export interface PasswordPolicy {
  /** Minimum password length in characters. */
  minLength: number;
  /** Whether the "password must meet complexity" requirement is on. */
  complexity: boolean;
  /** Minimum password age in days. */
  minAge: number;
  /** Maximum password age in days. */
  maxAge: number;
  /** Number of passwords remembered in history. */
  history: number;
  /** Failed logon attempts before lockout. */
  lockoutThreshold: number;
  /** Lockout duration in minutes. */
  lockoutDuration: number;
}

/** A single entry from the Windows Security event log. */
export interface AuditEvent {
  /** Stable unique id. */
  id: string;
  /** ISO-8601 timestamp the event was raised. */
  timestamp: string;
  /** Windows Event ID, e.g. 4624. */
  eventId: number;
  /** Event provider / source, e.g. `Microsoft-Windows-Security-Auditing`. */
  provider: string;
  /** Severity level. */
  level: 'Information' | 'Warning' | 'Error';
  /** Human-readable event message. */
  message: string;
}

/** A Windows file share and its access control list. */
export interface FileShare {
  /** Local filesystem path backing the share. */
  path: string;
  /** Share name. */
  name: string;
  /** Access control list for the share. */
  acl: AclEntry[];
}

/** A single access-control entry on a file share or filesystem object. */
export interface AclEntry {
  /** Identity (user or group) the entry applies to. */
  identity: string;
  /** Granted rights, e.g. `FullControl`, `Read`, `Modify`. */
  rights: string;
  /** Inheritance flags, e.g. `(CI)(OI)`. */
  inheritance: string;
}

/** A compliance finding derived from auditing the simulated workstation. */
export interface ComplianceFinding {
  /** Stable unique id. */
  id: string;
  /** Control / check category, e.g. `Access Control`. */
  category: string;
  /** Severity rating. */
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  /** Short title of the finding. */
  title: string;
  /** Detailed description of the deficiency. */
  description: string;
  /** Frameworks the finding maps to, e.g. `["NIST 800-53", "PCI DSS"]`. */
  frameworks: string[];
  /** Evidence captured from the system (command output, paths, etc.). */
  evidence: string;
  /** Whether the finding is still open or has been remediated. */
  status: 'Open' | 'Remediated';
  /** ISO-8601 timestamp the finding was remediated, if applicable. */
  remediatedAt?: string;
}

/** A cloud object-storage bucket (S3-style) in the simulated cloud account. */
export interface CloudBucket {
  /** Stable unique id. */
  id: string;
  /** Bucket name. */
  name: string;
  /** Cloud provider the bucket belongs to. */
  provider: 'AWS' | 'Azure' | 'GCP';
  /** Whether the bucket grants public read/list access. */
  publicAccess: boolean;
  /** Whether server-side encryption at rest is enabled. */
  encrypted: boolean;
  /** Free-text description of what the bucket holds. */
  contents: string;
}

/** A cloud IAM role in the simulated cloud account. */
export interface CloudIamRole {
  /** Stable unique id. */
  id: string;
  /** Role name. */
  name: string;
  /** Attached policy statement, e.g. `"*:*"` for an overprivileged role. */
  policy: string;
  /** The resource this role is attached to, e.g. an instance name. */
  attachedTo: string;
  /** Whether MFA is required to assume this role. */
  mfaEnforced: boolean;
  /** ISO-8601 timestamp the role was last used. */
  lastUsed: string;
}

/** A cloud network security-group rule (AWS-style security group). */
export interface CloudSecurityGroupRule {
  /** Stable unique id. */
  id: string;
  /** Security group name the rule belongs to. */
  groupName: string;
  /** Traffic direction the rule applies to. */
  direction: 'Inbound' | 'Outbound';
  /** Transport protocol, or `All` for all protocols. */
  protocol: 'TCP' | 'UDP' | 'All';
  /** Port the rule applies to. */
  port: number;
  /** CIDR source/destination, e.g. `0.0.0.0/0` for "any address". */
  cidr: string;
  /** Human-readable description of what the rule is for. */
  description: string;
}

/** A cloud IAM access key. */
export interface CloudAccessKey {
  /** Stable unique id. */
  id: string;
  /** IAM identity the key belongs to. */
  owner: string;
  /** ISO-8601 timestamp the key was created. */
  createdAt: string;
  /** ISO-8601 timestamp the key was last rotated, if ever. */
  lastRotatedAt?: string;
  /** Whether the key is currently active. */
  active: boolean;
}

/**
 * A single control-drift event: a previously-baselined control found to have
 * regressed away from its compliant baseline state during a simulated
 * continuous-monitoring re-check.
 */
export interface DriftEvent {
  /** Stable unique id. */
  id: string;
  /** Identifier of the control that drifted, e.g. `password-min-length`. */
  controlId: string;
  /** Human-readable control name. */
  controlName: string;
  /** The control's value at baseline capture, as a display string. */
  baselineState: string;
  /** The control's value when the drift was detected, as a display string. */
  currentState: string;
  /** ISO-8601 simulated timestamp the drift was detected. */
  detectedAt: string;
  /** ISO-8601 timestamp the drift was re-tested and resolved, if applicable. */
  resolvedAt?: string;
  /** Id of the `ComplianceFinding` raised for this drift event, if any. */
  findingId?: string;
}

/** A vendor's answers to a lightweight (SIG-lite) security questionnaire. */
export interface VendorQuestionnaire {
  /** Whether the vendor encrypts customer data at rest. */
  encryptionAtRest: boolean;
  /** Whether the vendor enforces MFA for administrative access. */
  mfaEnforced: boolean;
  /** Free-text disclosed breach history, or "None disclosed". */
  breachHistory: string;
  /** Named subprocessors the vendor discloses using. */
  subprocessors: string[];
}

/** A third-party vendor under GRC review. */
export interface Vendor {
  /** Stable unique id. */
  id: string;
  /** Vendor company name. */
  name: string;
  /** Service category, e.g. `Payment Processor`. */
  category: string;
  /** Sensitivity of the data this vendor can access. */
  dataAccessLevel: 'None' | 'Limited' | 'Sensitive' | 'Critical';
  /** Short fictional excerpt from the vendor's SOC 2 Type II report. */
  soc2Summary: string;
  /** The vendor's SIG-lite questionnaire responses. */
  questionnaire: VendorQuestionnaire;
  /** Likelihood score (1-5) used for the inherent risk calculation. */
  likelihood: number;
  /** Impact score (1-5) used for the inherent risk calculation. */
  impact: number;
  /** Inherent risk score = likelihood x impact. */
  inherentRisk: number;
  /** Current review decision. */
  status: 'Approved' | 'Conditional' | 'Rejected' | 'Under Review';
  /** Reviewer's note explaining the decision. */
  decisionNote?: string;
}

/** A single item in a control-testing population (e.g. one provisioning ticket). */
export interface ControlTestItem {
  /** Stable unique id. */
  id: string;
  /** Ticket/reference number, e.g. `PROV-0147`. */
  reference: string;
  /** Subject of the item, e.g. the employee the ticket provisioned access for. */
  subject: string;
  /** ISO-8601 date the underlying event occurred. */
  eventDate: string;
  /** Case-file note a reviewer reads to judge whether the control operated. */
  caseNote: string;
}

/** A reviewer's recorded result for one sampled `ControlTestItem`. */
export interface ControlTestResult {
  /** Id of the `ControlTestItem` this result is for. */
  itemId: string;
  /** The reviewer's judgement. */
  outcome: 'Pass' | 'Fail' | 'Untested';
  /** Evidence note supporting the judgement. */
  evidenceNote?: string;
}

/**
 * A single entitlement under review in a periodic access-review campaign
 * (the quarterly "who still needs this access" exercise real SOC 2 / SOX
 * environments run).
 */
export interface AccessReviewItem {
  /** Stable unique id. */
  id: string;
  /** Username of the local account under review. */
  username: string;
  /** Display name shown in the review UI. */
  displayName: string;
  /** Department / role the account belongs to. */
  role: string;
  /** Manager accountable for the access, or `undefined` if orphaned. */
  manager?: string;
  /** Flags raised automatically when the campaign was generated. */
  flags: string[];
  /** ISO-8601 timestamp the item was last reviewed, if ever. */
  lastReviewedAt?: string;
  /** Reviewer's decision. */
  decision: 'Pending' | 'Certified' | 'Revoke';
  /** Reviewer's justification for the decision. */
  justification?: string;
}

/** An item in the risk register. */
export interface RiskItem {
  /** Stable unique id. */
  id: string;
  /** Description of the risk / finding. */
  finding: string;
  /** Likelihood score (1–5). */
  likelihood: number;
  /** Impact score (1–5). */
  impact: number;
  /** Inherent risk score = likelihood × impact. */
  inherentRisk: number;
  /** Chosen control strategy. */
  controlStrategy: 'Mitigate' | 'Accept' | 'Transfer' | 'Avoid';
  /** Residual risk score after controls. */
  residualRisk: number;
  /** Owner accountable for the risk. */
  owner: string;
  /** Remediation / treatment plan. */
  remediation: string;
  /**
   * FAIR-lite quantitative fields (optional). When both are set, the risk
   * can be expressed as an Annualized Loss Expectancy for budget/executive
   * conversations, alongside the qualitative 1-5 likelihood/impact score.
   */
  /** Estimated frequency of a loss event, in occurrences per year. */
  lossEventFrequency?: number;
  /** Estimated loss magnitude per event, in USD. */
  lossMagnitude?: number;
  /** Annualized Loss Expectancy (USD/year) = lossEventFrequency x lossMagnitude. */
  annualizedLossExpectancy?: number;
}
