/**
 * The running GRC environment for the GRC Range simulated workstation.
 *
 * The session owns every mock service instance and is the single entry point
 * for the rest of the application (UI shell, terminal, console windows) to
 * reach the simulated Windows state. It is modeled on the IAM Range's
 * `VmSession` pattern: one class that boots all services, exposes them as
 * properties, and can be reset back to the seeded baseline at any time.
 *
 * Each service self-seeds with deliberately non-compliant data in its own
 * constructor, so simply creating fresh instances restores the lab to its
 * initial state.
 */

import {
  MockFileSystem,
  MockFirewall,
  MockUserAccounts,
  MockPasswordPolicy,
  MockAuditLog,
  MockCompliance,
} from '@/services';

/**
 * The bundle of mock services the GRC Range operates on.
 *
 * Every consumer (login session, desktop overlay, terminal dispatcher, GRC
 * console windows) receives this interface rather than the concrete
 * `GrcSession` class, so the dependency surface stays narrow and testable.
 */
export interface GrcServices {
  /** Mock NTFS filesystem with seeded PCI / PII data and shares. */
  fs: MockFileSystem;
  /** Mock Windows Defender Firewall with seeded vulnerable rules. */
  firewall: MockFirewall;
  /** Mock local user accounts and Administrators group. */
  users: MockUserAccounts;
  /** Mock local password / lockout policy. */
  password: MockPasswordPolicy;
  /** Mock Windows Security event log. */
  audit: MockAuditLog;
  /** Mock compliance findings and risk register. */
  compliance: MockCompliance;
  /** Reset every service back to the seeded baseline. */
  reset(): void;
}

/**
 * The core GRC session that owns all mock service instances.
 *
 * Constructing a `GrcSession` immediately boots all services (they self-seed
 * with non-compliant data). Calling {@link reset} re-creates every service,
 * discarding any mutations the student made during the session.
 */
export class GrcSession implements GrcServices {
  fs!: MockFileSystem;
  firewall!: MockFirewall;
  users!: MockUserAccounts;
  password!: MockPasswordPolicy;
  audit!: MockAuditLog;
  compliance!: MockCompliance;

  constructor() {
    this.boot();
  }

  /**
   * Create fresh instances of all services.
   *
   * Each service seeds itself in its own constructor, so this restores the
   * full non-compliant baseline.
   */
  boot(): void {
    this.audit = new MockAuditLog();
    this.fs = new MockFileSystem();
    this.firewall = new MockFirewall();
    this.users = new MockUserAccounts();
    this.password = new MockPasswordPolicy();
    this.compliance = new MockCompliance();
  }

  /** Reset every service back to the seeded baseline. */
  reset(): void {
    this.boot();
  }
}

/**
 * The singleton session used throughout the application.
 *
 * Imported by the login screen, desktop overlay, terminal, and console
 * windows. The singleton is intentional: the GRC Range models a single
 * workstation, and all UI surfaces share the same underlying state.
 */
export const session = new GrcSession();
