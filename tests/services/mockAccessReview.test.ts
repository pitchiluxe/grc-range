import { describe, it, expect } from 'vitest';
import { MockAccessReview } from '@/services/mockAccessReview';
import { MockUserAccounts } from '@/services/mockUserAccounts';
import { MockCompliance } from '@/services/mockCompliance';

function makeHarness() {
  const users = new MockUserAccounts();
  const compliance = new MockCompliance();
  const review = new MockAccessReview(users, compliance);
  return { users, compliance, review };
}

describe('MockAccessReview', () => {
  it('seeds one Pending item per seeded local user', () => {
    const { review, users } = makeHarness();
    const items = review.listItems();
    expect(items).toHaveLength(users.listUsers().length);
    expect(items.every((i) => i.decision === 'Pending')).toBe(true);
  });

  it('flags admin service/temp/intern accounts and orphaned accounts', () => {
    const { review } = makeHarness();
    const items = review.listItems();
    const svcBackup = items.find((i) => i.username === 'svc_backup');
    const intern = items.find((i) => i.username === 'intern_user');
    expect(svcBackup?.flags.some((f) => f.includes('Elevated privilege'))).toBe(true);
    // intern_user is in Operations, which has no manager mapping -> orphaned.
    expect(intern?.flags.some((f) => f.includes('No manager on file'))).toBe(true);
  });

  it('certify records a decision without mutating user accounts', () => {
    const { review, users } = makeHarness();
    const item = review.listItems().find((i) => i.username === 'svc_backup')!;
    const updated = review.certify(item.id, 'Still required for nightly backups.');
    expect(updated?.decision).toBe('Certified');
    expect(users.getUser('svc_backup')?.isAdmin).toBe(true);
  });

  it('isComplete is false until every item is decided', () => {
    const { review } = makeHarness();
    expect(review.isComplete()).toBe(false);
    for (const item of review.listItems()) {
      review.certify(item.id, 'ok');
    }
    expect(review.isComplete()).toBe(true);
  });

  it('completeCampaign remediates FND-003 once complete, no-ops otherwise', () => {
    const { review, compliance } = makeHarness();
    expect(compliance.getFinding('FND-003')?.status).toBe('Open');
    expect(review.completeCampaign()).toBe(false);
    expect(compliance.getFinding('FND-003')?.status).toBe('Open');

    for (const item of review.listItems()) {
      review.certify(item.id, 'ok');
    }
    expect(review.completeCampaign()).toBe(true);
    expect(compliance.getFinding('FND-003')?.status).toBe('Remediated');
  });

  it('revoke returns undefined for an unknown item', () => {
    const { review } = makeHarness();
    expect(review.revoke('AR-does-not-exist', 'n/a')).toBeUndefined();
  });
});
