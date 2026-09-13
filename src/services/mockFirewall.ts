/**
 * Mock Windows Defender Firewall for the GRC Range workstation.
 *
 * The seeded rule set is intentionally non-compliant: three legacy,
 * cleartext / high-risk services (FTP, Telnet, RDP) are exposed as enabled
 * inbound allow rules on all profiles. The default Windows rules are also
 * modelled so the firewall snap-in and `netsh advfirewall` commands have
 * realistic baseline output.
 *
 * The store is a plain in-memory map keyed by rule name; it does not touch the
 * real Windows firewall.
 */

import type { FirewallRule } from '../domain/types';

/**
 * In-memory mock of the Windows Defender Firewall rule set.
 *
 * Self-contained: owns its own seeded rules and exposes the operations the
 * terminal/console windows need (`listRules`, `getRule`, `addRule`,
 * `removeRule`, `toggleRule`).
 */
export class MockFirewall {
  /** Rules keyed by (case-insensitive) rule name. */
  private rules: Map<string, FirewallRule> = new Map();

  constructor() {
    this.seed();
  }

  /** Return a defensive copy of every firewall rule. */
  listRules(): FirewallRule[] {
    return Array.from(this.rules.values()).map((rule) => ({ ...rule }));
  }

  /**
   * Look up a single rule by name (case-insensitive).
   * Returns `undefined` if no rule with that name exists.
   */
  getRule(name: string): FirewallRule | undefined {
    const rule = this.rules.get(name.toLowerCase());
    return rule ? { ...rule } : undefined;
  }

  /**
   * Add a new rule. Returns `false` if a rule with the same name already
   * exists.
   */
  addRule(rule: FirewallRule): boolean {
    const key = rule.name.toLowerCase();
    if (this.rules.has(key)) return false;
    this.rules.set(key, { ...rule });
    return true;
  }

  /**
   * Remove a rule by name. Returns `true` if a rule was removed.
   */
  removeRule(name: string): boolean {
    return this.rules.delete(name.toLowerCase());
  }

  /**
   * Toggle the `enabled` flag on a rule.
   * Returns the updated rule, or `undefined` if the rule does not exist.
   */
  toggleRule(name: string): FirewallRule | undefined {
    const key = name.toLowerCase();
    const rule = this.rules.get(key);
    if (!rule) return undefined;
    rule.enabled = !rule.enabled;
    return { ...rule };
  }

  /**
   * Seed the firewall with the default Windows rules plus the three
   * intentionally vulnerable inbound allow rules.
   */
  private seed(): void {
    const vulnerable: FirewallRule[] = [
      {
        id: 'fw-ftp-21',
        name: 'Allow-FTP-Inbound',
        displayName: 'Allow FTP (Inbound)',
        description:
          'Allows inbound FTP traffic on TCP 21. Cleartext protocol — should be blocked.',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'TCP',
        localPort: 21,
        profile: 'Any',
        enabled: true,
      },
      {
        id: 'fw-telnet-23',
        name: 'Allow-Telnet-Inbound',
        displayName: 'Allow Telnet (Inbound)',
        description:
          'Allows inbound Telnet traffic on TCP 23. Legacy cleartext protocol — should be blocked.',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'TCP',
        localPort: 23,
        profile: 'Any',
        enabled: true,
      },
      {
        id: 'fw-rdp-3389',
        name: 'Allow-RDP-Inbound',
        displayName: 'Allow RDP (Inbound)',
        description:
          'Allows inbound RDP traffic on TCP 3389 from any source. Should be restricted to specific addresses.',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'TCP',
        localPort: 3389,
        profile: 'Any',
        enabled: true,
      },
    ];

    const defaults: FirewallRule[] = [
      {
        id: 'fw-core-1',
        name: 'Core Networking - Dynamic Host Configuration Protocol (DHCP-In)',
        displayName: 'Core Networking - DHCP (Inbound)',
        description: 'Inbound DHCP request (UDP 67).',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'UDP',
        localPort: 67,
        profile: 'Domain',
        enabled: true,
      },
      {
        id: 'fw-core-2',
        name: 'Core Networking - DNS (UDP-In)',
        displayName: 'Core Networking - DNS (Inbound)',
        description: 'Inbound DNS query (UDP 53).',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'UDP',
        localPort: 53,
        profile: 'Private',
        enabled: true,
      },
      {
        id: 'fw-core-3',
        name: 'Core Networking - ICMPv4 (Ping-In)',
        displayName: 'Core Networking - ICMPv4 Ping (Inbound)',
        description: 'Inbound ICMPv4 echo request.',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'UDP',
        localPort: 0,
        profile: 'Public',
        enabled: false,
      },
      {
        id: 'fw-core-4',
        name: 'Windows Management Instrumentation (WMI-In)',
        displayName: 'WMI (Inbound)',
        description: 'Inbound WMI traffic for remote management.',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'TCP',
        localPort: 135,
        profile: 'Domain',
        enabled: true,
      },
      {
        id: 'fw-core-5',
        name: 'File and Printer Sharing (SMB-In)',
        displayName: 'File and Printer Sharing - SMB (Inbound)',
        description: 'Inbound SMB traffic on TCP 445.',
        direction: 'Inbound',
        action: 'Allow',
        protocol: 'TCP',
        localPort: 445,
        profile: 'Private',
        enabled: true,
      },
    ];

    for (const rule of [...defaults, ...vulnerable]) {
      this.rules.set(rule.name.toLowerCase(), { ...rule });
    }
  }
}
