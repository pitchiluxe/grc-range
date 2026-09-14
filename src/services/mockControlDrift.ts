/**
 * Mock continuous control monitoring for the GRC Range.
 *
 * Real SOC 2 / ISO 27001 controls are not tested once and forgotten — they
 * are periodically re-tested, and they rot between audits (a password policy
 * gets quietly relaxed, a firewall exception creeps back in, an admin account
 * that should have been temporary never gets removed again). None of the
 * other GRC Range services model this: every finding is fixed once and stays
 * fixed. This service adds that missing "time" dimension.
 *
 * Design choice: **discrete simulated time-jumps, not a real-time clock.**
 * Nothing else in this app mutates state on a `setInterval`, and a real timer
 * would be both harder to test and a worse fit for a turn-based training lab.
 * Instead, a student captures a baseline once their remediation work is
 * done, then explicitly "advances time" by a chosen number of days; a
 * deterministic seeded PRNG decides which baselined controls regress.
 */

import type { DriftEvent, ComplianceFinding } from '../domain/types';
import type { MockFirewall } from './mockFirewall';
import type { MockPasswordPolicy } from './mockPasswordPolicy';
import type { MockUserAccounts } from './mockUserAccounts';
import type { MockCompliance } from './mockCompliance';

/** The fixed set of controls this service watches for drift. */
const WATCHED_CONTROLS = [
  'password-min-length',
  'password-complexity',
  'ftp-rule',
  'admin-group',
] as const;
type WatchedControl = (typeof WATCHED_CONTROLS)[number];

/** A point-in-time snapshot of the watched controls. */
interface ControlSnapshot {
  passwordMinLength: number;
  passwordComplexity: boolean;
  ftpRuleEnabled: boolean;
  adminCount: number;
  capturedAt: string;
}

/** Deterministic string hash (FNV-1a) used to seed the drift PRNG. */
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a tiny deterministic PRNG, seeded by a 32-bit integer. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic roll in `[0, 1)` for a given control at a given simulated day offset. */
function rollFor(controlId: string, daysElapsed: number): number {
  return mulberry32(hashString(`${controlId}:${daysElapsed}`))();
}

/**
 * In-memory mock of continuous control monitoring.
 *
 * Unlike the other GRC Range services, this one holds references to the
 * services whose controls it watches (password policy, firewall, user
 * accounts) and to `MockCompliance` so it can raise findings for detected
 * drift. It does not self-seed — there is nothing to watch until a baseline
 * is captured.
 */
export class MockControlDrift {
  private baseline: ControlSnapshot | undefined;
  private events: Map<string, DriftEvent> = new Map();
  private daysElapsed = 0;
  private findingCounter = 0;

  constructor(
    private firewall: MockFirewall,
    private password: MockPasswordPolicy,
    private users: MockUserAccounts,
    private compliance: MockCompliance,
  ) {}

  /** Whether a baseline has been captured yet. */
  hasBaseline(): boolean {
    return this.baseline !== undefined;
  }

  /** Return a defensive copy of the captured baseline, if any. */
  getBaseline(): ControlSnapshot | undefined {
    return this.baseline ? { ...this.baseline } : undefined;
  }

  /** Total simulated days advanced since the baseline was captured. */
  getDaysElapsed(): number {
    return this.daysElapsed;
  }

  /** Return a defensive copy of every recorded drift event, newest first. */
  listDriftEvents(): DriftEvent[] {
    return Array.from(this.events.values())
      .map((e) => ({ ...e }))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  /**
   * Snapshot the current state of the watched controls as the new baseline.
   * Clears any prior drift history and resets the simulated clock to day 0.
   */
  captureBaseline(): ControlSnapshot {
    this.baseline = this.snapshot();
    this.events.clear();
    this.daysElapsed = 0;
    return { ...this.baseline };
  }

  /**
   * Advance the simulated clock by `days` and roll for drift on each watched
   * control. Returns the drift events detected on this advance (empty if no
   * baseline has been captured, or if nothing drifted).
   */
  advanceTime(days: number): DriftEvent[] {
    if (!this.baseline || days <= 0) return [];
    this.daysElapsed += days;

    const detected: DriftEvent[] = [];
    for (const controlId of WATCHED_CONTROLS) {
      if (rollFor(controlId, this.daysElapsed) < 0.5) {
        const event = this.driftControl(controlId);
        if (event) detected.push(event);
      }
    }
    return detected;
  }

  /**
   * Re-test a drifted control: restore it to its baseline value, remediate
   * the linked finding, and stamp the drift event as resolved. Returns the
   * updated event, or `undefined` if the event does not exist or is already
   * resolved.
   */
  retestControl(eventId: string): DriftEvent | undefined {
    const event = this.events.get(eventId);
    if (!event || event.resolvedAt || !this.baseline) return undefined;

    switch (event.controlId as WatchedControl) {
      case 'password-min-length': {
        const policy = this.password.getPolicy();
        policy.minLength = this.baseline.passwordMinLength;
        this.password.setPolicy(policy);
        break;
      }
      case 'password-complexity': {
        const policy = this.password.getPolicy();
        policy.complexity = this.baseline.passwordComplexity;
        this.password.setPolicy(policy);
        break;
      }
      case 'ftp-rule': {
        const rule = this.firewall.getRule('Allow-FTP-Inbound');
        if (rule && rule.enabled !== this.baseline.ftpRuleEnabled) {
          this.firewall.toggleRule('Allow-FTP-Inbound');
        }
        break;
      }
      case 'admin-group': {
        const rogue = event.currentState.match(/\(([^)]+)\)$/)?.[1];
        if (rogue) this.users.removeFromAdmin(rogue);
        break;
      }
    }

    event.resolvedAt = new Date().toISOString();
    if (event.findingId) this.compliance.remediateFinding(event.findingId);
    return { ...event };
  }

  /** Snapshot the current live state of every watched control. */
  private snapshot(): ControlSnapshot {
    const policy = this.password.getPolicy();
    const ftpRule = this.firewall.getRule('Allow-FTP-Inbound');
    const adminCount = this.users.listAdministrators().length;
    return {
      passwordMinLength: policy.minLength,
      passwordComplexity: policy.complexity,
      ftpRuleEnabled: ftpRule?.enabled ?? false,
      adminCount,
      capturedAt: new Date().toISOString(),
    };
  }

  /** Compute the simulated timestamp for the current `daysElapsed` offset. */
  private simulatedNow(): string {
    const base = new Date(this.baseline!.capturedAt).getTime();
    return new Date(base + this.daysElapsed * 86_400_000).toISOString();
  }

  /**
   * Attempt to drift a single control away from its baseline value. Returns
   * `undefined` if the control has no further room to drift (e.g. it is
   * already at its weakest state, or already has an open, unresolved drift
   * event).
   */
  private driftControl(controlId: WatchedControl): DriftEvent | undefined {
    const baseline = this.baseline!;
    const alreadyOpen = Array.from(this.events.values()).some(
      (e) => e.controlId === controlId && !e.resolvedAt,
    );
    if (alreadyOpen) return undefined;

    let controlName = '';
    let baselineState = '';
    let currentState = '';
    let severity: ComplianceFinding['severity'] = 'Medium';

    switch (controlId) {
      case 'password-min-length': {
        if (baseline.passwordMinLength <= 4) return undefined;
        const weakened = Math.max(4, baseline.passwordMinLength - 8);
        if (weakened >= baseline.passwordMinLength) return undefined;
        const policy = this.password.getPolicy();
        policy.minLength = weakened;
        this.password.setPolicy(policy);
        controlName = 'Local password policy — minimum length';
        baselineState = `${baseline.passwordMinLength} characters`;
        currentState = `${weakened} characters`;
        severity = 'High';
        break;
      }
      case 'password-complexity': {
        if (!baseline.passwordComplexity) return undefined;
        const policy = this.password.getPolicy();
        policy.complexity = false;
        this.password.setPolicy(policy);
        controlName = 'Local password policy — complexity requirement';
        baselineState = 'Enabled';
        currentState = 'Disabled';
        severity = 'Medium';
        break;
      }
      case 'ftp-rule': {
        if (baseline.ftpRuleEnabled) return undefined;
        const rule = this.firewall.getRule('Allow-FTP-Inbound');
        if (!rule || rule.enabled) return undefined;
        this.firewall.toggleRule('Allow-FTP-Inbound');
        controlName = 'Firewall rule — Allow-FTP-Inbound';
        baselineState = 'Disabled';
        currentState = 'Re-enabled (inbound, all profiles)';
        severity = 'Critical';
        break;
      }
      case 'admin-group': {
        const currentCount = this.users.listAdministrators().length;
        if (currentCount > baseline.adminCount) return undefined;
        const rogueName = `contractor_${this.daysElapsed}d`;
        this.users.addUser({
          id: `user-drift-${rogueName}`,
          username: rogueName,
          displayName: 'Contractor (undocumented)',
          description: 'Added without a documented access request — detected via drift monitoring.',
          enabled: true,
          isAdmin: true,
          password: 'Contractor2024!',
          passwordNeverExpires: false,
          department: 'Operations',
          created: this.simulatedNow(),
        });
        controlName = 'Local Administrators group membership';
        baselineState = `${baseline.adminCount} members`;
        currentState = `${baseline.adminCount + 1} members (${rogueName})`;
        severity = 'Critical';
        break;
      }
    }

    this.findingCounter += 1;
    const findingId = `FND-DRIFT-${this.findingCounter}`;
    const detectedAt = this.simulatedNow();

    this.compliance.addFinding({
      id: findingId,
      category: 'Control Drift',
      severity,
      title: `Control drift detected: ${controlName}`,
      description: `${controlName} was baselined at "${baselineState}" but a continuous-monitoring re-check on day ${this.daysElapsed} found it at "${currentState}". Controls that pass an audit are not guaranteed to stay compliant.`,
      frameworks: ['SOC 2 CC7.2', 'ISO 27001 A.18.2.3', 'NIST 800-53 CA-7'],
      evidence: `Baseline (day 0): ${baselineState}. Re-check (day ${this.daysElapsed}): ${currentState}.`,
      status: 'Open',
    });

    const event: DriftEvent = {
      id: `DRIFT-${this.findingCounter}`,
      controlId,
      controlName,
      baselineState,
      currentState,
      detectedAt,
      findingId,
    };
    this.events.set(event.id, event);
    return { ...event };
  }
}
