/**
 * Credentials re-export.
 *
 * The canonical seed-admin definitions live in {@link ./company.ts} (next to
 * the rest of the fictional company model). This module re-exports them under
 * the `credentials` path so callers can import boot credentials without
 * pulling in the broader company model.
 */

export { SEED_ADMINS } from './company';
export type { SeedAdmin } from './company';
