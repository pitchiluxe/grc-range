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
}
