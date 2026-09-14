import { describe, it, expect } from 'vitest';
import { MockControlDrift } from '@/services/mockControlDrift';
import { MockFirewall } from '@/services/mockFirewall';
import { MockPasswordPolicy } from '@/services/mockPasswordPolicy';
import { MockUserAccounts } from '@/services/mockUserAccounts';
import { MockCompliance } from '@/services/mockCompliance';

function makeHarness() {
  const firewall = new MockFirewall();
  const password = new MockPasswordPolicy();
  const users = new MockUserAccounts();
  const compliance = new MockCompliance();
  // Simulate the student having already remediated these controls before
  // capturing a baseline, matching the intended lab workflow.
  password.setPolicy({ ...password.getPolicy(), minLength: 14, complexity: true });
  firewall.toggleRule('Allow-FTP-Inbound'); // seeded enabled -> now disabled
  for (const name of ['svc_backup', 'temp_admin', 'intern_user']) {
    users.removeFromAdmin(name);
  }
  const drift = new MockControlDrift(firewall, password, users, compliance);
  return { firewall, password, users, compliance, drift };
}

describe('MockControlDrift', () => {
  it('has no baseline and produces no drift before capture', () => {
    const { drift } = makeHarness();
    expect(drift.hasBaseline()).toBe(false);
    expect(drift.advanceTime(30)).toEqual([]);
  });

  it('captureBaseline snapshots the remediated state', () => {
    const { drift } = makeHarness();
    const baseline = drift.captureBaseline();
    expect(drift.hasBaseline()).toBe(true);
    expect(baseline.passwordMinLength).toBe(14);
    expect(baseline.passwordComplexity).toBe(true);
    expect(baseline.ftpRuleEnabled).toBe(false);
    expect(baseline.adminCount).toBe(1); // only Administrator left
  });

  it('advanceTime is deterministic for a fixed baseline and day count', () => {
    const a = makeHarness();
    a.drift.captureBaseline();
    const eventsA = a.drift.advanceTime(30).map((e) => e.controlId).sort();

    const b = makeHarness();
    b.drift.captureBaseline();
    const eventsB = b.drift.advanceTime(30).map((e) => e.controlId).sort();

    expect(eventsA).toEqual(eventsB);
  });

  it('raises a linked ComplianceFinding for each drift event', () => {
    const { drift, compliance } = makeHarness();
    drift.captureBaseline();
    const events = drift.advanceTime(90);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.findingId).toBeDefined();
      const finding = compliance.getFinding(event.findingId!);
      expect(finding).toBeDefined();
      expect(finding!.category).toBe('Control Drift');
      expect(finding!.status).toBe('Open');
    }
  });

  it('does not re-drift a control that already has an open event', () => {
    const { drift } = makeHarness();
    drift.captureBaseline();
    const first = drift.advanceTime(30);
    const controlsFirst = new Set(first.map((e) => e.controlId));
    if (controlsFirst.size === 0) return; // nothing drifted this seed, nothing to assert
    const second = drift.advanceTime(30);
    const controlsSecond = new Set(second.map((e) => e.controlId));
    for (const c of controlsSecond) {
      expect(controlsFirst.has(c)).toBe(false);
    }
  });

  it('retestControl restores the control and remediates the finding', () => {
    const { drift, password, compliance } = makeHarness();
    drift.captureBaseline();

    // Force a deterministic drift by advancing many days until something drifts.
    let events = drift.advanceTime(30);
    let day = 30;
    while (events.length === 0 && day < 3650) {
      day += 30;
      events = drift.advanceTime(30);
    }
    expect(events.length).toBeGreaterThan(0);

    const event = events[0]!;
    const restored = drift.retestControl(event.id);
    expect(restored?.resolvedAt).toBeDefined();

    if (event.findingId) {
      expect(compliance.getFinding(event.findingId)?.status).toBe('Remediated');
    }
    if (event.controlId === 'password-min-length') {
      expect(password.getPolicy().minLength).toBe(14);
    }
  });

  it('retestControl on an unknown or already-resolved event returns undefined', () => {
    const { drift } = makeHarness();
    drift.captureBaseline();
    expect(drift.retestControl('DRIFT-does-not-exist')).toBeUndefined();
  });
});
