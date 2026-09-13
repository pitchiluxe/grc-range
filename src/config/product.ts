/**
 * Product branding constants for the GRC Range application.
 *
 * These values identify the simulated Windows desktop product and are
 * surfaced in the UI shell (taskbar, about dialog, boot screen, etc.).
 */

/** Top-level product identity for the GRC Range workstation. */
export const PRODUCT = {
  /** Human-readable product name shown in the shell UI. */
  name: 'GRC Range',
  /** Short marketing/positioning tagline. */
  tagline: 'Compliance Audit Workstation',
  /** Semantic version of the GRC Range build. */
  version: '0.1.0',
} as const;

/** TypeScript type derived from the {@link PRODUCT} constant. */
export type Product = typeof PRODUCT;
