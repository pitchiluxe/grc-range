/**
 * Barrel module for the GRC Range config layer.
 *
 * Import from `@/config` (or `./config`) to access product, company, host,
 * mock data, compliance mappings, and desktop profile constants without
 * reaching into individual modules.
 */

// Product branding.
export { PRODUCT } from './product';
export type { Product } from './product';

// Fictional company model.
export { COMPANY, DEPARTMENTS, SEED_ADMINS } from './company';
export type { Company, Department, SeedAdmin } from './company';

// Boot credentials (re-exported from company.ts).
export { SEED_ADMINS as CREDENTIALS } from './company';

// VM host identity.
export { VM_HOST } from './vmHost';
export type { VmHost } from './vmHost';

// Seeded, deliberately non-compliant mock data.
export {
  MOCK_CREDIT_CARDS,
  MOCK_EMPLOYEES,
  MOCK_SECURITY_EVENTS,
  MOCK_USERS,
  MOCK_FIREWALL_RULES,
  MOCK_PASSWORD_POLICY,
  MOCK_AUDIT_CATEGORIES,
} from './mockData';
export type {
  MockCreditCard,
  MockEmployee,
  MockSecurityEvent,
  MockUser,
  MockFirewallRule,
  MockPasswordPolicy,
  MockAuditCategory,
} from './mockData';

// Compliance frameworks and finding mappings.
export { FRAMEWORKS, FINDING_MAPPINGS } from './complianceFrameworks';
export type { Framework, FindingMapping } from './complianceFrameworks';

// Desktop application profiles.
export {
  BASELINE_APPS,
  AUDIT_APPS,
  EXTRA_BY_DEPARTMENT,
  appsForDepartment,
  PROFILE_SUMMARY,
} from './desktopProfiles';
export type { AppId } from './desktopProfiles';
