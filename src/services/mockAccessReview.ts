/**
 * Mock periodic access review for the GRC Range.
 *
 * Models the quarterly "user access review" (UAR) most SOC 2 and SOX control
 * environments run: for every account, a reviewer decides whether the
 * access is still justified (Certify) or should be pulled (Revoke). The
 * campaign is seeded directly from the live `MockUserAccounts` roster at
 * construction, so it reflects whatever accounts currently exist.
 *
 * The store is a plain in-memory map keyed by id; it does not persist.
 */

import type { AccessReviewItem, LocalUser } from '../domain/types';
import type { MockUserAccounts } from './mockUserAccounts';
import type { MockCompliance } from './mockCompliance';

/** Fictional manager assigned to accounts that should have one on file. */
const MANAGER_BY_DEPARTMENT: Record<string, string> = {
  IT: 'Dana Omari (IT Operations Lead)',
  Security: 'Priya Omari (CISO)',
  Audit: 'Marcus Omari (Head of Internal Audit)',
  HR: 'Farah Omari (HR Director)',
  Finance: 'Elena Omari (Controller)',
};

/**
 * In-memory mock of a periodic access-review campaign.
 *
 * Self-contained after construction: seeds one `AccessReviewItem` per local
 * user at construction time and exposes the operations the console needs
 * (`listItems`, `certify`, `revoke`, `isComplete`, `completeCampaign`).
 */
export class MockAccessReview {
  /** Review items keyed by id. */
  private items: Map<string, AccessReviewItem> = new Map();

  constructor(
    private users: MockUserAccounts,
    private compliance: MockCompliance,
  ) {
    this.seed();
  }

  /** Return a defensive copy of every review item. */
  listItems(): AccessReviewItem[] {
    return Array.from(this.items.values()).map((i) => ({ ...i }));
  }

  /** Look up a single review item by id. Returns `undefined` if not found. */
  getItem(id: string): AccessReviewItem | undefined {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }

  /**
   * Certify an item: the access is still justified.
   * Returns the updated item, or `undefined` if it does not exist.
   */
  certify(id: string, justification: string): AccessReviewItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    item.decision = 'Certified';
    item.justification = justification;
    item.lastReviewedAt = new Date().toISOString();
    return { ...item };
  }

  /**
   * Mark an item for revocation. Does not itself mutate the underlying user
   * account — the console performs that mutation via `MockUserAccounts` so
   * the actual entitlement change and the review record stay independently
   * inspectable, then calls this to close out the review item.
   * Returns the updated item, or `undefined` if it does not exist.
   */
  revoke(id: string, justification: string): AccessReviewItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    item.decision = 'Revoke';
    item.justification = justification;
    item.lastReviewedAt = new Date().toISOString();
    return { ...item };
  }

  /** Whether every item in the campaign has a decision other than Pending. */
  isComplete(): boolean {
    return Array.from(this.items.values()).every((i) => i.decision !== 'Pending');
  }

  /**
   * Close out the campaign. If every flagged elevated-access item has been
   * decided (no longer Pending), remediates the admin-sprawl finding
   * (FND-003) raised by `MockCompliance`'s seed data, since the campaign is
   * the control that finding exists to enforce.
   * Returns `true` if the campaign was complete and closed, `false` if items
   * are still Pending.
   */
  completeCampaign(): boolean {
    if (!this.isComplete()) return false;
    const finding = this.compliance.getFinding('FND-003');
    if (finding && finding.status === 'Open') {
      this.compliance.remediateFinding('FND-003');
    }
    return true;
  }

  /**
   * Seed one review item per current local user. Accounts without a
   * department-mapped manager, and admin accounts held by service/temp/
   * intern-style users, are flagged the way a real UAR would flag them.
   */
  private seed(): void {
    for (const user of this.users.listUsers()) {
      const item = this.buildItem(user);
      this.items.set(item.id, item);
    }
  }

  /** Build a single review item, computing its automatic flags. */
  private buildItem(user: LocalUser): AccessReviewItem {
    const manager = MANAGER_BY_DEPARTMENT[user.department];
    const flags: string[] = [];
    if (!manager) flags.push('No manager on file (orphaned account)');
    if (user.isAdmin && /^(svc_|temp_|intern)/i.test(user.username)) {
      flags.push('Elevated privilege on a service/temporary/intern account');
    }
    if (!user.enabled) flags.push('Account is disabled but still present');

    return {
      id: `AR-${user.id}`,
      username: user.username,
      displayName: user.displayName,
      role: user.isAdmin ? `${user.department} (Administrator)` : user.department,
      manager,
      flags,
      decision: 'Pending',
    };
  }
}
