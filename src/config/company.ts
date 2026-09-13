/**
 * Fictional company constants for the GRC Range lab.
 *
 * The lab is set inside a fictional organization ("OMARI Technologies") so
 * that students audit, map, and remediate findings against a realistic
 * enterprise backdrop. All data is synthetic and for training only.
 */

/** Fictional organization hosting the GRC Range workstation. */
export const COMPANY = {
  /** Legal/trading name of the fictional company. */
  name: 'OMARI Technologies',
  /** Active Directory domain used by the simulated workstation. */
  domain: 'omari.test',
  /** Top-level domain suffix used by the lab (RFC 6761 reserved). */
  tld: 'test',
} as const;

/** TypeScript type derived from the {@link COMPANY} constant. */
export type Company = typeof COMPANY;

/**
 * Departments recognized by the GRC Range lab. These drive which desktop
 * applications a logged-in user sees (see {@link appsForDepartment}).
 */
export const DEPARTMENTS = [
  'IT',
  'Security',
  'Audit',
  'HR',
  'Finance',
  'Operations',
] as const;

/** Union type of all department names. */
export type Department = (typeof DEPARTMENTS)[number];

/**
 * Seed administrator accounts provisioned on the simulated workstation.
 *
 * These credentials are intentionally weak and are documented in the lab
 * manual so students can log in. They are NOT an example of good practice —
 * they exist purely to bootstrap the simulation.
 */
export const SEED_ADMINS = [
  {
    username: 'admin',
    password: 'admin',
    displayName: 'Administrator',
    department: 'IT' as const,
  },
] as const;

/** TypeScript type of a single seed admin record. */
export type SeedAdmin = (typeof SEED_ADMINS)[number];
