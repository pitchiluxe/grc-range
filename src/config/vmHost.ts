/**
 * VM host identity constants for the GRC Range lab.
 *
 * Describes the simulated Windows Server 2022 workstation that students audit.
 * These values are surfaced in the desktop shell (System properties, boot
 * screen, terminal prompts) and are referenced by audit/evidence tooling.
 */

/** Identity of the simulated Windows Server host. */
export const VM_HOST = {
  /** NetBIOS / hostname of the simulated server. */
  hostname: 'GRC-LAB-SRV01',
  /** Operating system edition shown in System properties. */
  os: 'Windows Server 2022 Standard',
  /** Windows build number (Server 2022 RTM baseline). */
  build: '20348',
  /** Active Directory domain the host is joined to. */
  domain: 'omari.test',
} as const;

/** TypeScript type derived from the {@link VM_HOST} constant. */
export type VmHost = typeof VM_HOST;
