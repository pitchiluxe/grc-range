/**
 * Mock local password / lockout policy for the GRC Range workstation.
 *
 * Models the output of `net accounts` and the Local Security Policy snap-in
 * (`secpol.msc`). The seeded policy is intentionally weak (min length 4, no
 * complexity, no history) so learners can identify and remediate it.
 *
 * The store is a plain in-memory object; it does not touch the real LSA.
 */

import type { PasswordPolicy } from '../domain/types';

/** The intentionally weak policy seeded into the lab. */
const WEAK_POLICY: PasswordPolicy = {
  minLength: 4,
  complexity: false,
  minAge: 0,
  maxAge: 0,
  history: 0,
  lockoutThreshold: 0,
  lockoutDuration: 0,
};

/**
 * In-memory mock of the local password and account lockout policy.
 *
 * Self-contained: owns its own seeded policy and exposes `getPolicy` and
 * `setPolicy`.
 */
export class MockPasswordPolicy {
  /** Current policy in effect. */
  private policy: PasswordPolicy;

  constructor() {
    this.policy = { ...WEAK_POLICY };
  }

  /** Return a defensive copy of the current policy. */
  getPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  /**
   * Replace the current policy.
   * Returns a copy of the newly applied policy.
   */
  setPolicy(policy: PasswordPolicy): PasswordPolicy {
    this.policy = { ...policy };
    return this.getPolicy();
  }

  /**
   * Reset the policy back to the seeded weak baseline (used when the lab is
   * re-initialised).
   */
  reset(): PasswordPolicy {
    this.policy = { ...WEAK_POLICY };
    return this.getPolicy();
  }
}
