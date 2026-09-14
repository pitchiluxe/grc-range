/**
 * Desktop application profiles per department.
 *
 * The GRC Range shell shows a different set of desktop icons / Start-menu
 * entries depending on the logged-in user's department. Audit, IT, and
 * Security users get the full GRC toolset; everyone else sees the baseline
 * productivity apps only.
 */

/** Baseline applications available to every user. */
export const BASELINE_APPS = [
  'explorer',
  'notepad',
  'browser',
  'settings',
  'control-panel',
  'manual',
  'recycle-bin',
  'calculator',
  'grc-expert',
] as const;

/** GRC audit applications available to audit-capable departments. */
export const AUDIT_APPS = [
  'audit-console',
  'compliance-mapper',
  'risk-register',
  'terminal',
  'script-editor',
  'remediation-console',
  'evidence-pack',
  'secops-dashboard',
  'lab-generator',
  'cloud-console',
  'continuous-monitoring',
  'vendor-risk',
  'access-review',
  'control-testing',
] as const;

/** Union type of every recognized application id. */
export type AppId = (typeof BASELINE_APPS)[number] | (typeof AUDIT_APPS)[number];

/**
 * Extra applications granted per department, on top of the baseline.
 *
 * IT, Security, and Audit receive the full GRC toolset (IT additionally
 * always has the terminal). All other departments receive no extras.
 */
export const EXTRA_BY_DEPARTMENT: Readonly<Record<string, readonly AppId[]>> = {
  IT: [...AUDIT_APPS, 'terminal'] as AppId[],
  Security: [...AUDIT_APPS] as AppId[],
  Audit: [...AUDIT_APPS] as AppId[],
  HR: [] as AppId[],
  Finance: [] as AppId[],
  Operations: [] as AppId[],
};

/**
 * Returns the full, de-duplicated list of application ids a department sees.
 *
 * The baseline apps are always included; extras are appended for
 * audit-capable departments. Order is preserved with baseline first.
 *
 * @param department - The department name (see {@link DEPARTMENTS}).
 * @returns A readonly array of application ids.
 */
export function appsForDepartment(department: string): readonly AppId[] {
  const extras = EXTRA_BY_DEPARTMENT[department] ?? [];
  const seen = new Set<AppId>();
  const result: AppId[] = [];
  for (const app of BASELINE_APPS) {
    if (!seen.has(app)) {
      seen.add(app);
      result.push(app);
    }
  }
  for (const app of extras) {
    if (!seen.has(app)) {
      seen.add(app);
      result.push(app);
    }
  }
  return result;
}

/** Human-readable summary of which departments get which apps. */
export const PROFILE_SUMMARY: Readonly<Record<string, string>> = {
  IT: 'Baseline + full GRC audit toolset (terminal always available).',
  Security: 'Baseline + full GRC audit toolset.',
  Audit: 'Baseline + full GRC audit toolset.',
  HR: 'Baseline productivity apps only.',
  Finance: 'Baseline productivity apps only.',
  Operations: 'Baseline productivity apps only.',
};

/**
 * Departments that are considered "identity admins" — i.e. audit-capable
 * roles that receive the full GRC toolset and whose sign-in grants elevated
 * visibility in the desktop shell.
 */
const IDENTITY_ADMIN_DEPARTMENTS: ReadonlySet<string> = new Set([
  'IT',
  'Security',
  'Audit',
]);

/**
 * Return `true` when the given department is an audit-capable / identity-admin
 * department (IT, Security, or Audit).
 *
 * @param department - The department name to check.
 */
export function isIdentityAdmin(department: string): boolean {
  return IDENTITY_ADMIN_DEPARTMENTS.has(department);
}
