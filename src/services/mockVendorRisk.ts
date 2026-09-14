/**
 * Mock third-party / vendor risk register for the GRC Range.
 *
 * A large share of real-world GRC work is vendor risk assessment: reviewing
 * a vendor's SOC 2 report and a SIG-lite questionnaire, and deciding whether
 * to approve, conditionally approve, or reject the relationship based on the
 * data they'll touch. None of the other GRC Range labs model an external
 * party at all — everything else is internal to the simulated workstation.
 *
 * The store is a plain in-memory map keyed by id; it does not touch any real
 * vendor data.
 */

import type { Vendor } from '../domain/types';

/**
 * In-memory mock of a third-party vendor risk register.
 *
 * Self-contained: owns its own seeded vendors and exposes the operations the
 * console needs (`listVendors`, `getVendor`, `decide`).
 */
export class MockVendorRisk {
  /** Vendors keyed by id. */
  private vendors: Map<string, Vendor> = new Map();

  constructor() {
    this.seed();
  }

  /** Return a defensive copy of every vendor. */
  listVendors(): Vendor[] {
    return Array.from(this.vendors.values()).map((v) => ({ ...v }));
  }

  /** Look up a single vendor by id. Returns `undefined` if not found. */
  getVendor(id: string): Vendor | undefined {
    const vendor = this.vendors.get(id);
    return vendor ? { ...vendor } : undefined;
  }

  /**
   * Record a review decision for a vendor.
   * Returns the updated vendor, or `undefined` if the vendor does not exist.
   */
  decide(id: string, status: Vendor['status'], note: string): Vendor | undefined {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;
    vendor.status = status;
    vendor.decisionNote = note;
    return { ...vendor };
  }

  /** Seed six fictional vendors spanning the categories a real org depends on. */
  private seed(): void {
    const vendors: Vendor[] = [
      {
        id: 'V-001',
        name: 'PaySecure Payments',
        category: 'Payment Processor',
        dataAccessLevel: 'Critical',
        soc2Summary:
          'SOC 2 Type II (Security, Availability, Confidentiality), 12-month period. Two exceptions noted: (1) two terminated employees retained VPN access for 9 days past offboarding; (2) quarterly access review was not evidenced for Q2. Both marked remediated by report date.',
        questionnaire: {
          encryptionAtRest: true,
          mfaEnforced: true,
          breachHistory: 'None disclosed.',
          subprocessors: ['AWS (hosting)', 'Twilio (SMS 2FA)'],
        },
        likelihood: 3,
        impact: 5,
        inherentRisk: 15,
        status: 'Under Review',
      },
      {
        id: 'V-002',
        name: 'CloudVault Backup',
        category: 'Cloud Backup Provider',
        dataAccessLevel: 'Critical',
        soc2Summary:
          'SOC 2 Type II (Security only), 6-month period (first-year report). No exceptions noted. Auditor notes the observation period is shorter than the standard 12 months.',
        questionnaire: {
          encryptionAtRest: true,
          mfaEnforced: true,
          breachHistory: 'None disclosed.',
          subprocessors: ['Google Cloud Platform (storage)'],
        },
        likelihood: 2,
        impact: 5,
        inherentRisk: 10,
        status: 'Under Review',
      },
      {
        id: 'V-003',
        name: 'PeopleHR Suite',
        category: 'HR SaaS',
        dataAccessLevel: 'Sensitive',
        soc2Summary:
          'SOC 2 Type I only (design, not operating effectiveness) — no Type II report available on request. Vendor states a Type II is "planned for next year".',
        questionnaire: {
          encryptionAtRest: true,
          mfaEnforced: false,
          breachHistory: 'One disclosed incident (2023): a misconfigured export left a partner-facing report link accessible without authentication for 4 days. No confirmed data access.',
          subprocessors: ['Azure (hosting)', 'SendGrid (email)'],
        },
        likelihood: 4,
        impact: 4,
        inherentRisk: 16,
        status: 'Under Review',
      },
      {
        id: 'V-004',
        name: 'NetGuard MSP',
        category: 'Managed Service Provider',
        dataAccessLevel: 'Critical',
        soc2Summary:
          'SOC 2 Type II (Security), 12-month period. No exceptions noted. MSP holds privileged remote-access credentials to customer environments as part of its service.',
        questionnaire: {
          encryptionAtRest: true,
          mfaEnforced: true,
          breachHistory: 'None disclosed.',
          subprocessors: ['ConnectWise (RMM tooling)'],
        },
        likelihood: 3,
        impact: 5,
        inherentRisk: 15,
        status: 'Under Review',
      },
      {
        id: 'V-005',
        name: 'InsightAnalytics',
        category: 'Marketing Analytics',
        dataAccessLevel: 'Limited',
        soc2Summary: 'No SOC 2 report available. Vendor points to a self-attested security whitepaper instead.',
        questionnaire: {
          encryptionAtRest: false,
          mfaEnforced: false,
          breachHistory: 'Unknown — vendor did not respond to this question.',
          subprocessors: ['Unknown — not disclosed'],
        },
        likelihood: 4,
        impact: 2,
        inherentRisk: 8,
        status: 'Under Review',
      },
      {
        id: 'V-006',
        name: 'MailRelay Pro',
        category: 'Transactional Email Provider',
        dataAccessLevel: 'Limited',
        soc2Summary:
          'SOC 2 Type II (Security, Confidentiality), 12-month period. No exceptions noted.',
        questionnaire: {
          encryptionAtRest: true,
          mfaEnforced: true,
          breachHistory: 'None disclosed.',
          subprocessors: ['AWS (hosting)'],
        },
        likelihood: 2,
        impact: 2,
        inherentRisk: 4,
        status: 'Under Review',
      },
    ];

    for (const v of vendors) this.vendors.set(v.id, { ...v });
  }
}
