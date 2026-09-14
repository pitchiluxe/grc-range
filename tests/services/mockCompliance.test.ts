import { describe, it, expect } from 'vitest';
import { MockCompliance } from '@/services/mockCompliance';
import type { ComplianceFinding, RiskItem } from '@/domain/types';

describe('MockCompliance', () => {
  it('seeds 8 open findings and 8 risks', () => {
    const c = new MockCompliance();
    const findings = c.listFindings();
    const risks = c.listRisks();
    expect(findings).toHaveLength(8);
    expect(risks).toHaveLength(8);
    expect(findings.every((f) => f.status === 'Open')).toBe(true);
  });

  it('returns defensive copies from listFindings', () => {
    const c = new MockCompliance();
    const findings = c.listFindings();
    findings[0]!.title = 'mutated';
    expect(c.getFinding(findings[0]!.id)?.title).not.toBe('mutated');
  });

  it('remediateFinding sets status and stamps remediatedAt', () => {
    const c = new MockCompliance();
    const before = c.getFinding('FND-001');
    expect(before?.status).toBe('Open');
    expect(before?.remediatedAt).toBeUndefined();

    const updated = c.remediateFinding('FND-001');
    expect(updated?.status).toBe('Remediated');
    expect(updated?.remediatedAt).toBeDefined();
    expect(() => new Date(updated!.remediatedAt!).toISOString()).not.toThrow();
  });

  it('remediateFinding returns undefined for an unknown id', () => {
    const c = new MockCompliance();
    expect(c.remediateFinding('FND-999')).toBeUndefined();
  });

  it('addFinding rejects duplicate ids', () => {
    const c = new MockCompliance();
    const dup: ComplianceFinding = { ...c.getFinding('FND-001')! };
    expect(c.addFinding(dup)).toBe(false);
    expect(c.addFinding({ ...dup, id: 'FND-CUSTOM-1' })).toBe(true);
    expect(c.listFindings()).toHaveLength(9);
  });

  it('addRisk / updateRisk round-trip', () => {
    const c = new MockCompliance();
    const risk: RiskItem = {
      id: 'RSK-TEST-1',
      finding: 'Test finding',
      likelihood: 3,
      impact: 4,
      inherentRisk: 12,
      controlStrategy: 'Mitigate',
      residualRisk: 6,
      owner: 'Test Owner',
      remediation: 'Do the thing',
    };
    expect(c.addRisk(risk)).toBe(true);
    expect(c.addRisk(risk)).toBe(false);

    const updated = c.updateRisk('RSK-TEST-1', { ...risk, owner: 'New Owner' });
    expect(updated?.owner).toBe('New Owner');
    expect(c.updateRisk('RSK-DOES-NOT-EXIST', risk)).toBeUndefined();
  });

  it('round-trips optional FAIR-lite quantitative fields, including their ALE product', () => {
    const c = new MockCompliance();
    const lossEventFrequency = 2.5;
    const lossMagnitude = 40_000;
    const risk: RiskItem = {
      id: 'RSK-QUANT-1',
      finding: 'Test quantitative finding',
      likelihood: 4,
      impact: 4,
      inherentRisk: 16,
      controlStrategy: 'Mitigate',
      residualRisk: 8,
      owner: 'Test Owner',
      remediation: 'Do the thing',
      lossEventFrequency,
      lossMagnitude,
      annualizedLossExpectancy: lossEventFrequency * lossMagnitude,
    };
    expect(c.addRisk(risk)).toBe(true);
    const stored = c.getRisk('RSK-QUANT-1');
    expect(stored?.annualizedLossExpectancy).toBe(lossEventFrequency * lossMagnitude);
    expect(stored?.annualizedLossExpectancy).toBe(100_000);
  });

  it('leaves FAIR-lite fields undefined when not provided (qualitative-only risk)', () => {
    const c = new MockCompliance();
    const risks = c.listRisks();
    expect(risks[0]!.lossEventFrequency).toBeUndefined();
    expect(risks[0]!.annualizedLossExpectancy).toBeUndefined();
  });
});
