import { describe, it, expect } from 'vitest';
import { MockCloud } from '@/services/mockCloud';

describe('MockCloud', () => {
  it('seeds one public and one private bucket', () => {
    const cloud = new MockCloud();
    const buckets = cloud.listBuckets();
    expect(buckets.find((b) => b.name === 'omari-customer-exports')?.publicAccess).toBe(true);
    expect(buckets.find((b) => b.name === 'omari-app-static-assets')?.publicAccess).toBe(false);
  });

  it('setBucketPublicAccess flips access and returns a defensive copy', () => {
    const cloud = new MockCloud();
    const updated = cloud.setBucketPublicAccess('omari-customer-exports', false);
    expect(updated?.publicAccess).toBe(false);
    expect(cloud.getBucket('omari-customer-exports')?.publicAccess).toBe(false);
    expect(cloud.setBucketPublicAccess('does-not-exist', false)).toBeUndefined();
  });

  it('seeds an overprivileged IAM role that scopeIamPolicy can fix', () => {
    const cloud = new MockCloud();
    const role = cloud.getIamRole('omari-ec2-app-role');
    expect(role?.policy).toContain('"Action":"*"');
    const updated = cloud.scopeIamPolicy('omari-ec2-app-role', '{"Effect":"Allow","Action":"s3:GetObject"}');
    expect(updated?.policy).not.toContain('"Action":"*"');
  });

  it('seeds security-group rules open to 0.0.0.0/0 on SSH and RDP', () => {
    const cloud = new MockCloud();
    const rules = cloud.listSecurityGroupRules();
    const ssh = rules.find((r) => r.port === 22);
    const rdp = rules.find((r) => r.port === 3389);
    expect(ssh?.cidr).toBe('0.0.0.0/0');
    expect(rdp?.cidr).toBe('0.0.0.0/0');
  });

  it('restrictSecurityGroupRule narrows the CIDR', () => {
    const cloud = new MockCloud();
    const rules = cloud.listSecurityGroupRules();
    const sshId = rules.find((r) => r.port === 22)!.id;
    const updated = cloud.restrictSecurityGroupRule(sshId, '10.0.0.0/24');
    expect(updated?.cidr).toBe('10.0.0.0/24');
  });

  it('rotateAccessKey stamps lastRotatedAt', () => {
    const cloud = new MockCloud();
    expect(cloud.getBucket('does-not-exist')).toBeUndefined();
    const keys = cloud.listAccessKeys();
    const staleKey = keys.find((k) => !k.lastRotatedAt)!;
    const updated = cloud.rotateAccessKey(staleKey.id);
    expect(updated?.lastRotatedAt).toBeDefined();
  });

  it('seedFindings returns 4 findings matching the seeded misconfigurations', () => {
    const cloud = new MockCloud();
    const findings = cloud.seedFindings();
    expect(findings).toHaveLength(4);
    expect(findings.every((f) => f.id.startsWith('FND-CLOUD-'))).toBe(true);
    expect(findings.every((f) => f.status === 'Open')).toBe(true);
  });
});
