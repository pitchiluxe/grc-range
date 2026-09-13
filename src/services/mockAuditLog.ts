/**
 * Mock Windows Security event log for the GRC Range workstation.
 *
 * Models the Security event log (`Microsoft-Windows-Security-Auditing`) as a
 * simple append-only list. The seeded events include the common audit event
 * IDs (4624 successful logon, 4625 failed logon, 4672 special privileges,
 * 4720 account created, 4728 member added to group, 4719 audit policy
 * changed) so learners can run `Get-EventLog` / `wevtutil` style queries
 * against realistic data.
 *
 * The store is a plain in-memory array; it does not touch the real event log.
 */

import type { AuditEvent } from '../domain/types';

/**
 * In-memory mock of the Windows Security event log.
 *
 * Self-contained: owns its own seeded events and exposes the operations the
 * terminal/console windows need (`listEvents`, `addEvent`, `clear`,
 * `getEventsByCategory`).
 */
export class MockAuditLog {
  /** Ordered list of security events (oldest first). */
  private events: AuditEvent[] = [];

  constructor() {
    this.seed();
  }

  /** Return a defensive copy of every event, oldest first. */
  listEvents(): AuditEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  /**
   * Append a new event to the log.
   * Returns the stored event.
   */
  addEvent(event: AuditEvent): AuditEvent {
    this.events.push({ ...event });
    return { ...event };
  }

  /** Remove every event from the log. */
  clear(): void {
    this.events = [];
  }

  /**
   * Return events whose message or provider matches the given category
   * keyword (case-insensitive substring match).
   */
  getEventsByCategory(category: string): AuditEvent[] {
    const lower = category.toLowerCase();
    return this.events
      .filter(
        (event) =>
          event.message.toLowerCase().includes(lower) ||
          event.provider.toLowerCase().includes(lower),
      )
      .map((event) => ({ ...event }));
  }

  /**
   * Return events with a specific Windows Event ID.
   */
  getEventsByEventId(eventId: number): AuditEvent[] {
    return this.events
      .filter((event) => event.eventId === eventId)
      .map((event) => ({ ...event }));
  }

  /**
   * Seed the log with a representative sequence of security audit events.
   */
  private seed(): void {
    this.events = [
      {
        id: 'evt-001',
        timestamp: '2024-09-13T08:01:12.000Z',
        eventId: 4624,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'An account was successfully logged on. Subject: Security ID: S-1-5-18; Account Name: WORKSTATION$; Logon Type: 5.',
      },
      {
        id: 'evt-002',
        timestamp: '2024-09-13T08:01:12.000Z',
        eventId: 4672,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'Special privileges assigned to new logon. Subject: Security ID: S-1-5-18; Account Name: SYSTEM; Privileges: SeAssignPrimaryTokenPrivilege SeTcbPrivilege.',
      },
      {
        id: 'evt-003',
        timestamp: '2024-09-13T08:15:33.000Z',
        eventId: 4720,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'A user account was created. Subject: WORKSTATION\\Administrator; New Account: intern_user.',
      },
      {
        id: 'evt-004',
        timestamp: '2024-09-13T09:02:47.000Z',
        eventId: 4625,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Error',
        message:
          'An account failed to log on. Subject: Security ID: S-1-0-0; Account Name: temp_admin; Logon Type: 2; Failure Reason: %%2313 (unknown user or bad password).',
      },
      {
        id: 'evt-005',
        timestamp: '2024-09-13T09:03:01.000Z',
        eventId: 4625,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Error',
        message:
          'An account failed to log on. Account Name: temp_admin; Logon Type: 2; Failure Reason: %%2313.',
      },
      {
        id: 'evt-006',
        timestamp: '2024-09-13T09:03:18.000Z',
        eventId: 4625,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Error',
        message:
          'An account failed to log on. Account Name: temp_admin; Logon Type: 2; Failure Reason: %%2313.',
      },
      {
        id: 'evt-007',
        timestamp: '2024-09-13T10:22:09.000Z',
        eventId: 4728,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'A member was added to a security-enabled global group. Subject: WORKSTATION\\Administrator; Group: Administrators; Member: intern_user.',
      },
      {
        id: 'evt-008',
        timestamp: '2024-09-13T11:45:30.000Z',
        eventId: 4719,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'System audit policy was changed. Subject: WORKSTATION\\Administrator; Audit Category: Account Logon.',
      },
      {
        id: 'evt-009',
        timestamp: '2024-09-13T12:10:55.000Z',
        eventId: 4624,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'An account was successfully logged on. Account Name: svc_backup; Logon Type: 3 (network).',
      },
      {
        id: 'evt-010',
        timestamp: '2024-09-13T13:30:20.000Z',
        eventId: 4724,
        provider: 'Microsoft-Windows-Security-Auditing',
        level: 'Information',
        message:
          'An attempt was made to reset an account password. Subject: WORKSTATION\\Administrator; Target: svc_backup.',
      },
    ];
  }
}
