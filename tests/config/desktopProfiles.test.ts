import { describe, it, expect } from 'vitest';
import {
  BASELINE_APPS,
  AUDIT_APPS,
  appsForDepartment,
  isIdentityAdmin,
} from '@/config/desktopProfiles';

describe('desktopProfiles', () => {
  it('IT, Security, and Audit see baseline + full audit toolset', () => {
    for (const dept of ['IT', 'Security', 'Audit']) {
      const apps = appsForDepartment(dept);
      for (const id of BASELINE_APPS) expect(apps).toContain(id);
      for (const id of AUDIT_APPS) expect(apps).toContain(id);
    }
  });

  it('HR, Finance, and Operations see only the baseline apps', () => {
    for (const dept of ['HR', 'Finance', 'Operations']) {
      const apps = appsForDepartment(dept);
      expect(apps).toHaveLength(BASELINE_APPS.length);
      for (const id of AUDIT_APPS) expect(apps).not.toContain(id);
    }
  });

  it('an unknown department falls back to baseline only', () => {
    const apps = appsForDepartment('DoesNotExist');
    expect(apps).toHaveLength(BASELINE_APPS.length);
  });

  it('de-duplicates ids and preserves baseline-first order', () => {
    const apps = appsForDepartment('IT');
    expect(new Set(apps).size).toBe(apps.length);
    expect(apps.slice(0, BASELINE_APPS.length)).toEqual([...BASELINE_APPS]);
  });

  it('isIdentityAdmin matches only IT/Security/Audit', () => {
    expect(isIdentityAdmin('IT')).toBe(true);
    expect(isIdentityAdmin('Security')).toBe(true);
    expect(isIdentityAdmin('Audit')).toBe(true);
    expect(isIdentityAdmin('HR')).toBe(false);
  });
});
