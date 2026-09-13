/**
 * Mock local user accounts for the GRC Range workstation.
 *
 * Models the Local Users and Groups snap-in (`lusrmgr.msc`) plus the
 * Administrators group membership. The seeded accounts are intentionally
 * non-compliant:
 *
 *  - `svc_backup`  — service account with a weak password and admin rights.
 *  - `temp_admin`  — a "temporary" admin that was never removed.
 *  - `intern_user` — an intern who was granted admin rights.
 *  - `Administrator` — the built-in admin account.
 *
 * The store is a plain in-memory map keyed by username; it does not touch the
 * real SAM database.
 */

import type { LocalUser } from '../domain/types';

/** The well-known name of the local Administrators group. */
const ADMINISTRATORS_GROUP = 'Administrators';

/**
 * In-memory mock of local user accounts and the Administrators group.
 *
 * Self-contained: owns its own seeded users and exposes the operations the
 * terminal/console windows need (`listUsers`, `getUser`, `addUser`,
 * `removeUser`, `addToAdmin`, `removeFromAdmin`, `toggleUser`).
 */
export class MockUserAccounts {
  /** Users keyed by (case-insensitive) username. */
  private users: Map<string, LocalUser> = new Map();

  /** Members of the Administrators group (case-insensitive usernames). */
  private administrators: Set<string> = new Set();

  constructor() {
    this.seed();
  }

  /** Return a defensive copy of every local user. */
  listUsers(): LocalUser[] {
    return Array.from(this.users.values()).map((user) => ({ ...user }));
  }

  /**
   * Look up a single user by username (case-insensitive).
   * Returns `undefined` if no such user exists.
   */
  getUser(name: string): LocalUser | undefined {
    const user = this.users.get(name.toLowerCase());
    return user ? { ...user } : undefined;
  }

  /**
   * Add a new user. Returns `false` if a user with the same username already
   * exists.
   */
  addUser(user: LocalUser): boolean {
    const key = user.username.toLowerCase();
    if (this.users.has(key)) return false;
    const stored: LocalUser = { ...user, isAdmin: false };
    this.users.set(key, stored);
    if (user.isAdmin) this.addToAdmin(user.username);
    return true;
  }

  /**
   * Remove a user by username. Also removes them from the Administrators
   * group if present. Returns `true` if a user was removed.
   */
  removeUser(name: string): boolean {
    const key = name.toLowerCase();
    const removed = this.users.delete(key);
    if (removed) this.administrators.delete(key);
    return removed;
  }

  /**
   * Add a user to the Administrators group.
   * Returns `true` on success, `false` if the user does not exist.
   */
  addToAdmin(name: string): boolean {
    const key = name.toLowerCase();
    const user = this.users.get(key);
    if (!user) return false;
    this.administrators.add(key);
    user.isAdmin = true;
    return true;
  }

  /**
   * Remove a user from the Administrators group.
   * Returns `true` on success, `false` if the user does not exist.
   */
  removeFromAdmin(name: string): boolean {
    const key = name.toLowerCase();
    const user = this.users.get(key);
    if (!user) return false;
    this.administrators.delete(key);
    user.isAdmin = false;
    return true;
  }

  /**
   * Toggle the `enabled` flag on a user account.
   * Returns the updated user, or `undefined` if the user does not exist.
   */
  toggleUser(name: string): LocalUser | undefined {
    const key = name.toLowerCase();
    const user = this.users.get(key);
    if (!user) return undefined;
    user.enabled = !user.enabled;
    return { ...user };
  }

  /** Return the (case-preserved) usernames of Administrators group members. */
  listAdministrators(): string[] {
    const members: string[] = [];
    for (const key of this.administrators) {
      const user = this.users.get(key);
      if (user) members.push(user.username);
    }
    return members;
  }

  /** Return the well-known name of the Administrators group. */
  getAdministratorsGroupName(): string {
    return ADMINISTRATORS_GROUP;
  }

  /**
   * Seed the local user database with the built-in Administrator and the
   * three intentionally vulnerable accounts.
   */
  private seed(): void {
    const now = '2024-09-13T08:00:00.000Z';

    const users: LocalUser[] = [
      {
        id: 'user-administrator',
        username: 'Administrator',
        displayName: 'Built-in Administrator',
        description: 'Built-in account for administering the computer/domain.',
        enabled: true,
        isAdmin: true,
        password: 'P@ssw0rd123!',
        passwordNeverExpires: true,
        department: 'IT',
        created: now,
      },
      {
        id: 'user-svc-backup',
        username: 'svc_backup',
        displayName: 'Backup Service Account',
        description: 'Service account used by the nightly backup job.',
        enabled: true,
        isAdmin: true,
        password: 'backup123',
        passwordNeverExpires: true,
        department: 'IT',
        created: now,
      },
      {
        id: 'user-temp-admin',
        username: 'temp_admin',
        displayName: 'Temporary Administrator',
        description: 'Temporary admin account created for a migration. Should have been removed.',
        enabled: true,
        isAdmin: true,
        password: 'Temp2024!',
        passwordNeverExpires: false,
        department: 'IT',
        created: now,
      },
      {
        id: 'user-intern',
        username: 'intern_user',
        displayName: 'Summer Intern',
        description: 'Intern account. Granted admin rights to "help with a project".',
        enabled: true,
        isAdmin: true,
        password: 'intern',
        passwordNeverExpires: false,
        department: 'Operations',
        created: now,
      },
    ];

    for (const user of users) {
      this.users.set(user.username.toLowerCase(), { ...user });
      if (user.isAdmin) this.administrators.add(user.username.toLowerCase());
    }
  }
}
