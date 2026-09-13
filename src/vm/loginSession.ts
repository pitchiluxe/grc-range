/**
 * Login session state for the GRC Range simulated workstation.
 *
 * The login session manages who is currently signed in. The login screen
 * authenticates against the mock user accounts (and the built-in seed admin)
 * and, on success, stores the authenticated principal here. The desktop
 * overlay and terminal both read the current user from this session to
 * decide which apps to show and which actor name to use in command output.
 *
 * The class is a small observable store: listeners register via
 * {@link onChange} and are notified whenever the signed-in user changes
 * (sign-in or sign-out).
 */

import type { LocalUser } from '@/domain/types';
import type { GrcServices } from './session';
import { session } from './session';
import { SEED_ADMINS } from '@/config';
import { isIdentityAdmin } from '@/config/desktopProfiles';

/** Outcome of a sign-in attempt. */
export interface SignInResult {
  /** Whether authentication succeeded. */
  ok: boolean;
  /** The authenticated user on success; `undefined` on failure. */
  user?: LocalUser;
  /** Error message on failure; `undefined` on success. */
  message?: string;
}

/**
 * Manages the currently signed-in user for the GRC Range session.
 *
 * The login screen calls {@link signIn} with credentials; on success the
 * principal is stored and all registered listeners are notified. The
 * desktop overlay calls {@link signOut} when the user logs off, which clears
 * the principal and notifies listeners again.
 */
export class LoginSession {
  /** The currently signed-in user, or `null` when signed out. */
  private current: LocalUser | null = null;

  /** Registered change listeners, notified on sign-in / sign-out. */
  private listeners = new Set<() => void>();

  constructor(private readonly services: GrcServices) {}

  /** The currently signed-in user, or `null`. */
  get user(): LocalUser | null {
    return this.current;
  }

  /** Whether a user is currently signed in. */
  get isSignedIn(): boolean {
    return this.current !== null;
  }

  /** The department of the signed-in user, or the empty string. */
  get department(): string {
    return this.current?.department ?? '';
  }

  /** Whether the signed-in user belongs to an audit-capable department. */
  get isAudit(): boolean {
    return this.current ? isIdentityAdmin(this.current.department) : false;
  }

  /**
   * Register a listener that is called whenever the signed-in user changes.
   * Returns an unsubscribe function.
   */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Notify all registered listeners of a state change. */
  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  /**
   * Attempt to authenticate a user.
   *
   * The built-in seed admin is checked first (it is documented in the lab
   * manual so students can always log in). If that fails, the mock user
   * accounts service is consulted. Only enabled accounts with a matching
   * password are accepted.
   *
   * @returns A {@link SignInResult} indicating success or failure.
   */
  signIn(username: string, password: string): SignInResult {
    // Check against SEED_ADMINS first (the built-in admin).
    for (const admin of SEED_ADMINS) {
      if (admin.username === username && admin.password === password) {
        const user: LocalUser = {
          id: 'admin',
          username: admin.username,
          displayName: admin.displayName,
          description: 'Built-in Administrator',
          enabled: true,
          isAdmin: true,
          password: admin.password,
          passwordNeverExpires: true,
          department: admin.department,
          created: new Date().toISOString(),
        };
        this.current = user;
        this.notify();
        return { ok: true, user };
      }
    }

    // Check against the mock user accounts service.
    const mockUser = this.services.users.getUser(username);
    if (mockUser && mockUser.password === password && mockUser.enabled) {
      this.current = mockUser;
      this.notify();
      return { ok: true, user: mockUser };
    }

    return { ok: false, message: 'The user name or password is incorrect.' };
  }

  /** Sign out the current user and notify listeners. */
  signOut(): void {
    this.current = null;
    this.notify();
  }

  /**
   * Return the list of accounts shown on the login screen's user picker.
   *
   * Service accounts (prefixed `svc-`) are hidden except for `svc_backup`,
   * which is surfaced because it is a key finding in the lab.
   */
  listAccounts(): LocalUser[] {
    return this.services.users
      .listUsers()
      .filter((u) => !u.username.startsWith('svc-') || u.username === 'svc_backup');
  }
}

/**
 * The singleton login session, wired to the shared {@link session}.
 *
 * Imported by the login screen and the desktop overlay.
 */
export const login = new LoginSession(session);
