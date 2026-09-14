/**
 * Mock cloud account for the GRC Range — an AWS-shaped inventory of cloud
 * resources sitting alongside the on-prem Windows workstation the rest of the
 * lab simulates.
 *
 * Real-world GRC/security triage today spends most of its time on cloud
 * misconfiguration (CSPM findings), not on-prem Windows Server. This service
 * seeds a small, deliberately non-compliant AWS-style account: a public S3
 * bucket, an overprivileged IAM role, an open security group, and a
 * never-rotated access key — mirroring the CIS AWS Foundations Benchmark
 * checks a real cloud security engineer runs first.
 *
 * The store is a plain in-memory map keyed by id; it does not touch any real
 * cloud provider.
 */

import type {
  CloudBucket,
  CloudIamRole,
  CloudSecurityGroupRule,
  CloudAccessKey,
  ComplianceFinding,
} from '../domain/types';

/**
 * In-memory mock of a small AWS-style cloud account.
 *
 * Self-contained: owns its own seeded buckets, IAM roles, security-group
 * rules, and access keys, and exposes the operations the terminal/console
 * windows need. {@link seedFindings} returns the `ComplianceFinding` records
 * this account's misconfigurations correspond to — the session wires these
 * into `MockCompliance` at boot so the Compliance Mapper and Risk Register
 * pick them up through the single existing findings pipeline.
 */
export class MockCloud {
  /** Buckets keyed by id. */
  private buckets: Map<string, CloudBucket> = new Map();

  /** IAM roles keyed by id. */
  private roles: Map<string, CloudIamRole> = new Map();

  /** Security-group rules keyed by id. */
  private securityGroupRules: Map<string, CloudSecurityGroupRule> = new Map();

  /** Access keys keyed by id. */
  private accessKeys: Map<string, CloudAccessKey> = new Map();

  constructor() {
    this.seed();
  }

  // ----------------------------------------------------------------- buckets

  /** Return a defensive copy of every bucket. */
  listBuckets(): CloudBucket[] {
    return Array.from(this.buckets.values()).map((b) => ({ ...b }));
  }

  /** Look up a single bucket by name. Returns `undefined` if not found. */
  getBucket(name: string): CloudBucket | undefined {
    const bucket = this.buckets.get(name);
    return bucket ? { ...bucket } : undefined;
  }

  /**
   * Set a bucket's public-access flag.
   * Returns the updated bucket, or `undefined` if the bucket does not exist.
   */
  setBucketPublicAccess(name: string, publicAccess: boolean): CloudBucket | undefined {
    const bucket = this.buckets.get(name);
    if (!bucket) return undefined;
    bucket.publicAccess = publicAccess;
    return { ...bucket };
  }

  // -------------------------------------------------------------- iam roles

  /** Return a defensive copy of every IAM role. */
  listIamRoles(): CloudIamRole[] {
    return Array.from(this.roles.values()).map((r) => ({ ...r }));
  }

  /** Look up a single IAM role by name. Returns `undefined` if not found. */
  getIamRole(name: string): CloudIamRole | undefined {
    const role = this.roles.get(name);
    return role ? { ...role } : undefined;
  }

  /**
   * Replace an IAM role's policy statement (used to scope down `*:*`).
   * Returns the updated role, or `undefined` if the role does not exist.
   */
  scopeIamPolicy(name: string, policy: string): CloudIamRole | undefined {
    const role = this.roles.get(name);
    if (!role) return undefined;
    role.policy = policy;
    return { ...role };
  }

  // --------------------------------------------------------- security groups

  /** Return a defensive copy of every security-group rule. */
  listSecurityGroupRules(): CloudSecurityGroupRule[] {
    return Array.from(this.securityGroupRules.values()).map((r) => ({ ...r }));
  }

  /**
   * Restrict a security-group rule's source CIDR away from `0.0.0.0/0`.
   * Returns the updated rule, or `undefined` if the rule does not exist.
   */
  restrictSecurityGroupRule(id: string, cidr: string): CloudSecurityGroupRule | undefined {
    const rule = this.securityGroupRules.get(id);
    if (!rule) return undefined;
    rule.cidr = cidr;
    return { ...rule };
  }

  // ------------------------------------------------------------ access keys

  /** Return a defensive copy of every access key. */
  listAccessKeys(): CloudAccessKey[] {
    return Array.from(this.accessKeys.values()).map((k) => ({ ...k }));
  }

  /**
   * Rotate an access key, stamping `lastRotatedAt` with the current time.
   * Returns the updated key, or `undefined` if the key does not exist.
   */
  rotateAccessKey(id: string): CloudAccessKey | undefined {
    const key = this.accessKeys.get(id);
    if (!key) return undefined;
    key.lastRotatedAt = new Date().toISOString();
    return { ...key };
  }

  // ----------------------------------------------------------------------

  /**
   * The `ComplianceFinding` records corresponding to this account's seeded
   * misconfigurations. Called once from `GrcSession.boot()` and pushed into
   * `MockCompliance` so cloud findings live in the same register as every
   * other finding.
   */
  seedFindings(): ComplianceFinding[] {
    return [
      {
        id: 'FND-CLOUD-001',
        category: 'Cloud Configuration',
        severity: 'Critical',
        title: 'S3 bucket grants public read access to customer exports',
        description:
          'The "omari-customer-exports" S3 bucket has public read/list access enabled and holds a customer data export. Anyone with the bucket URL can enumerate and download the objects.',
        frameworks: ['CIS AWS 2.1.5', 'NIST 800-53 SC-28', 'SOC 2 CC6.1', 'PCI DSS 3.4'],
        evidence:
          'aws s3api get-bucket-acl --bucket omari-customer-exports -> Grantee: AllUsers, Permission: READ.',
        status: 'Open',
      },
      {
        id: 'FND-CLOUD-002',
        category: 'Cloud Configuration',
        severity: 'High',
        title: 'IAM role grants unrestricted administrative access',
        description:
          'The "omari-ec2-app-role" IAM role is attached to a production EC2 instance and has an inline policy granting Action: "*" on Resource: "*" — full administrative access to the AWS account from a single compromised instance.',
        frameworks: ['CIS AWS 1.16', 'NIST 800-53 AC-6', 'ISO 27001 A.9.2', 'SOC 2 CC6.3'],
        evidence: 'IAM policy for omari-ec2-app-role: {"Effect":"Allow","Action":"*","Resource":"*"}.',
        status: 'Open',
      },
      {
        id: 'FND-CLOUD-003',
        category: 'Cloud Configuration',
        severity: 'Critical',
        title: 'Security group allows SSH and RDP from the entire internet',
        description:
          'The "omari-app-sg" security group allows inbound TCP 22 (SSH) and TCP 3389 (RDP) from 0.0.0.0/0. Management ports should never be exposed to the entire internet.',
        frameworks: ['CIS AWS 5.2', 'NIST 800-53 SC-7', 'ISO 27001 A.13.1'],
        evidence: 'Security group omari-app-sg: Inbound TCP 22 0.0.0.0/0; Inbound TCP 3389 0.0.0.0/0.',
        status: 'Open',
      },
      {
        id: 'FND-CLOUD-004',
        category: 'Cloud Configuration',
        severity: 'Medium',
        title: 'IAM access key has not been rotated in over a year',
        description:
          'The access key for svc-omari-deploy has not been rotated since creation. Long-lived, unrotated keys increase the blast radius of a leaked credential.',
        frameworks: ['CIS AWS 1.14', 'NIST 800-53 IA-5'],
        evidence: 'aws iam list-access-keys --user-name svc-omari-deploy -> CreateDate 400+ days ago, no rotation.',
        status: 'Open',
      },
    ];
  }

  /**
   * Seed a small AWS-style account: one public bucket and one properly
   * private bucket (for contrast), one overprivileged role and one scoped
   * role, an open security group, and one stale + one rotated access key.
   */
  private seed(): void {
    const buckets: CloudBucket[] = [
      {
        id: 'bucket-customer-exports',
        name: 'omari-customer-exports',
        provider: 'AWS',
        publicAccess: true,
        encrypted: false,
        contents: 'Nightly customer data export (CSV) including contact and billing records.',
      },
      {
        id: 'bucket-app-assets',
        name: 'omari-app-static-assets',
        provider: 'AWS',
        publicAccess: false,
        encrypted: true,
        contents: 'Public-facing static web assets (images, CSS, JS) for the marketing site.',
      },
    ];
    for (const b of buckets) this.buckets.set(b.name, { ...b });

    const roles: CloudIamRole[] = [
      {
        id: 'role-ec2-app',
        name: 'omari-ec2-app-role',
        policy: '{"Effect":"Allow","Action":"*","Resource":"*"}',
        attachedTo: 'i-0a1b2c3d4e5f6prod01 (app-server-prod-01)',
        mfaEnforced: false,
        lastUsed: '2024-09-10T14:22:00.000Z',
      },
      {
        id: 'role-ci-deploy',
        name: 'omari-ci-deploy-role',
        policy: '{"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::omari-app-static-assets/*"}',
        attachedTo: 'ci-pipeline (github-actions)',
        mfaEnforced: true,
        lastUsed: '2024-09-12T09:05:00.000Z',
      },
    ];
    for (const r of roles) this.roles.set(r.name, { ...r });

    const rules: CloudSecurityGroupRule[] = [
      {
        id: 'sg-rule-ssh',
        groupName: 'omari-app-sg',
        direction: 'Inbound',
        protocol: 'TCP',
        port: 22,
        cidr: '0.0.0.0/0',
        description: 'SSH management access — currently open to the internet.',
      },
      {
        id: 'sg-rule-rdp',
        groupName: 'omari-app-sg',
        direction: 'Inbound',
        protocol: 'TCP',
        port: 3389,
        cidr: '0.0.0.0/0',
        description: 'RDP management access — currently open to the internet.',
      },
      {
        id: 'sg-rule-https',
        groupName: 'omari-app-sg',
        direction: 'Inbound',
        protocol: 'TCP',
        port: 443,
        cidr: '0.0.0.0/0',
        description: 'HTTPS application traffic — intentionally public.',
      },
    ];
    for (const rule of rules) this.securityGroupRules.set(rule.id, { ...rule });

    const keys: CloudAccessKey[] = [
      {
        id: 'key-svc-deploy',
        owner: 'svc-omari-deploy',
        createdAt: '2023-08-01T00:00:00.000Z',
        active: true,
      },
      {
        id: 'key-svc-backup',
        owner: 'svc-omari-backup',
        createdAt: '2024-06-01T00:00:00.000Z',
        lastRotatedAt: '2024-09-01T00:00:00.000Z',
        active: true,
      },
    ];
    for (const k of keys) this.accessKeys.set(k.id, { ...k });
  }
}
