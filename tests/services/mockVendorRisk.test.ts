import { describe, it, expect } from 'vitest';
import { MockVendorRisk } from '@/services/mockVendorRisk';

describe('MockVendorRisk', () => {
  it('seeds 6 vendors, all Under Review', () => {
    const v = new MockVendorRisk();
    const vendors = v.listVendors();
    expect(vendors).toHaveLength(6);
    expect(vendors.every((x) => x.status === 'Under Review')).toBe(true);
  });

  it('every vendor has a computed inherentRisk consistent with likelihood x impact', () => {
    const v = new MockVendorRisk();
    for (const vendor of v.listVendors()) {
      expect(vendor.inherentRisk).toBe(vendor.likelihood * vendor.impact);
    }
  });

  it('decide records status and note, returns a defensive copy', () => {
    const v = new MockVendorRisk();
    const updated = v.decide('V-001', 'Approved', 'Clean SOC 2, approved for payment processing.');
    expect(updated?.status).toBe('Approved');
    expect(updated?.decisionNote).toContain('Clean SOC 2');
    expect(v.getVendor('V-001')?.status).toBe('Approved');

    updated!.status = 'Rejected';
    expect(v.getVendor('V-001')?.status).toBe('Approved');
  });

  it('decide returns undefined for an unknown vendor', () => {
    const v = new MockVendorRisk();
    expect(v.decide('V-999', 'Approved', 'n/a')).toBeUndefined();
  });

  it('flags the no-SOC2 vendor with weaker questionnaire answers', () => {
    const v = new MockVendorRisk();
    const insight = v.getVendor('V-005');
    expect(insight?.soc2Summary).toMatch(/No SOC 2 report available/);
    expect(insight?.questionnaire.encryptionAtRest).toBe(false);
  });
});
