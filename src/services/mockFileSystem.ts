/**
 * Mock Windows file system for the GRC Range workstation.
 *
 * Models a minimal `C:\` drive with the `GRC_Lab_Data` working directory used
 * throughout the labs. The seeded data is intentionally non-compliant:
 *
 *  - `Finance_Share\credit_cards.txt` holds mock PCI cardholder data.
 *  - `HR_Records\employee_ssn.csv` holds mock PII / PHI data.
 *  - `Finance_Share` and `HR_Records` are shared with `Everyone: FullControl`.
 *  - `SIEM_Samples\security_events.csv` holds a mock Windows event log export.
 *  - `Tools\cis-cat` holds a mock CIS benchmark checker and its report.
 *
 * All paths are case-insensitive (Windows semantics) and use backslashes. The
 * store is a plain in-memory tree; it does not touch the real disk.
 */

import type { AclEntry, FileShare } from '../domain/types';

/** A directory entry in the mock filesystem. */
interface DirectoryEntry {
  type: 'directory';
  name: string;
  children: Map<string, FileSystemNode>;
  acl: AclEntry[];
  /** Optional share name if the directory is exposed as a network share. */
  share?: string;
}

/** A file entry in the mock filesystem. */
interface FileEntry {
  type: 'file';
  name: string;
  content: string;
  acl: AclEntry[];
}

/** Union of directory and file nodes. */
type FileSystemNode = DirectoryEntry | FileEntry;

/** Result of listing a directory. */
export interface DirListing {
  name: string;
  type: 'directory' | 'file';
  size: number;
}

/**
 * In-memory mock of a Windows NTFS volume.
 *
 * The class is self-contained: it owns its own seeded tree and exposes the
 * operations the terminal/console windows need (`listDir`, `readFile`,
 * `getAcl`, `setAcl`, `exists`). No other service is required.
 */
export class MockFileSystem {
  /** Root of the `C:\` drive. */
  private readonly root: DirectoryEntry;

  constructor() {
    this.root = this.seed();
  }

  /**
   * Normalise a Windows path to a list of path segments.
   * Drive letters and leading/trailing slashes are stripped.
   */
  private splitPath(path: string): string[] {
    const cleaned = path
      .replace(/^[A-Za-z]:/, '')
      .replace(/^[\\/]+/, '')
      .replace(/[\\/]+$/, '');
    if (cleaned === '') return [];
    return cleaned.split(/[\\/]+/);
  }

  /** Case-insensitive lookup of a child node by name. */
  private findChild(dir: DirectoryEntry, name: string): FileSystemNode | undefined {
    const lower = name.toLowerCase();
    for (const [key, node] of dir.children) {
      if (key.toLowerCase() === lower) return node;
    }
    return undefined;
  }

  /**
   * Resolve a path to a node, or `undefined` if it does not exist.
   */
  private resolve(path: string): FileSystemNode | undefined {
    const segments = this.splitPath(path);
    let current: FileSystemNode = this.root;
    for (const segment of segments) {
      if (current.type !== 'directory') return undefined;
      const child = this.findChild(current, segment);
      if (!child) return undefined;
      current = child;
    }
    return current;
  }

  /**
   * Resolve a path to its parent directory and the final segment name.
   * Returns `undefined` if the parent does not exist.
   */
  private resolveParent(
    path: string,
  ): { parent: DirectoryEntry; name: string } | undefined {
    const segments = this.splitPath(path);
    if (segments.length === 0) return undefined;
    const name = segments[segments.length - 1]!;
    const parentSegments = segments.slice(0, -1);
    let current: DirectoryEntry = this.root;
    for (const segment of parentSegments) {
      const child = this.findChild(current, segment);
      if (!child || child.type !== 'directory') return undefined;
      current = child;
    }
    return { parent: current, name };
  }

  /**
   * Return `true` if the given path exists (file or directory).
   */
  exists(path: string): boolean {
    return this.resolve(path) !== undefined;
  }

  /**
   * List the contents of a directory.
   * Returns `undefined` if the path is missing or not a directory.
   */
  listDir(path: string): DirListing[] | undefined {
    const node = this.resolve(path);
    if (!node || node.type !== 'directory') return undefined;
    const entries: DirListing[] = [];
    for (const [, child] of node.children) {
      entries.push({
        name: child.name,
        type: child.type,
        size: child.type === 'file' ? child.content.length : 0,
      });
    }
    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Read the textual contents of a file.
   * Returns `undefined` if the path is missing or not a file.
   */
  readFile(path: string): string | undefined {
    const node = this.resolve(path);
    if (!node || node.type !== 'file') return undefined;
    return node.content;
  }

  /**
   * Get the ACL for a path.
   * Returns `undefined` if the path does not exist.
   */
  getAcl(path: string): AclEntry[] | undefined {
    const node = this.resolve(path);
    if (!node) return undefined;
    return node.acl.map((entry) => ({ ...entry }));
  }

  /**
   * Replace the ACL on a path.
   * Returns `true` on success, `false` if the path does not exist.
   */
  setAcl(path: string, acl: AclEntry[]): boolean {
    const node = this.resolve(path);
    if (!node) return false;
    node.acl = acl.map((entry) => ({ ...entry }));
    return true;
  }

  /**
   * Create a new directory. Returns `false` if the parent is missing or the
   * name already exists.
   */
  createDirectory(path: string): boolean {
    const resolved = this.resolveParent(path);
    if (!resolved) return false;
    if (this.findChild(resolved.parent, resolved.name)) return false;
    resolved.parent.children.set(resolved.name, {
      type: 'directory',
      name: resolved.name,
      children: new Map(),
      acl: [{ identity: 'BUILTIN\\Administrators', rights: 'FullControl', inheritance: '(CI)(OI)' }],
    });
    return true;
  }

  /**
   * Write a file, creating it if it does not exist.
   * Returns `false` if the parent directory is missing.
   */
  writeFile(path: string, content: string): boolean {
    const resolved = this.resolveParent(path);
    if (!resolved) return false;
    const existing = this.findChild(resolved.parent, resolved.name);
    if (existing && existing.type === 'file') {
      existing.content = content;
      return true;
    }
    if (existing) return false;
    resolved.parent.children.set(resolved.name, {
      type: 'file',
      name: resolved.name,
      content,
      acl: [{ identity: 'BUILTIN\\Administrators', rights: 'FullControl', inheritance: '(CI)(OI)' }],
    });
    return true;
  }

  /**
   * Remove a file or directory. Returns `false` if it does not exist.
   */
  remove(path: string): boolean {
    const resolved = this.resolveParent(path);
    if (!resolved) return false;
    const child = this.findChild(resolved.parent, resolved.name);
    if (!child) return false;
    return resolved.parent.children.delete(child.name);
  }

  /**
   * Mark a directory as a network share with the given name.
   * Returns `false` if the path is not a directory.
   */
  shareDirectory(path: string, shareName: string): boolean {
    const node = this.resolve(path);
    if (!node || node.type !== 'directory') return false;
    node.share = shareName;
    return true;
  }

  /**
   * List all directories that have been marked as shares.
   */
  listShares(): FileShare[] {
    const shares: FileShare[] = [];
    const walk = (dir: DirectoryEntry, prefix: string) => {
      const fullPath = prefix ? `${prefix}\\${dir.name}` : dir.name;
      if (dir.share) {
        shares.push({
          path: `C:\\${fullPath}`,
          name: dir.share,
          acl: dir.acl.map((entry) => ({ ...entry })),
        });
      }
      for (const [, child] of dir.children) {
        if (child.type === 'directory') walk(child, fullPath);
      }
    };
    for (const [, child] of this.root.children) {
      if (child.type === 'directory') walk(child, '');
    }
    return shares;
  }

  /**
   * Build the seeded, intentionally non-compliant filesystem tree.
   */
  private seed(): DirectoryEntry {
    const everyoneFull: AclEntry = {
      identity: 'Everyone',
      rights: 'FullControl',
      inheritance: '(CI)(OI)',
    };
    const adminsFull: AclEntry = {
      identity: 'BUILTIN\\Administrators',
      rights: 'FullControl',
      inheritance: '(CI)(OI)',
    };
    const systemFull: AclEntry = {
      identity: 'NT AUTHORITY\\SYSTEM',
      rights: 'FullControl',
      inheritance: '(CI)(OI)',
    };

    const file = (name: string, content: string, acl: AclEntry[]): FileEntry => ({
      type: 'file',
      name,
      content,
      acl,
    });

    const dir = (name: string, acl: AclEntry[]): DirectoryEntry => ({
      type: 'directory',
      name,
      children: new Map(),
      acl,
    });

    const root: DirectoryEntry = dir('C:\\', [adminsFull, systemFull]);

    // C:\GRC_Lab_Data
    const labData = dir('GRC_Lab_Data', [adminsFull, systemFull]);
    root.children.set('GRC_Lab_Data', labData);

    // Finance_Share — over-permissive share with PCI data.
    const financeShare = dir('Finance_Share', [everyoneFull, adminsFull]);
    financeShare.share = 'Finance_Share';
    labData.children.set('Finance_Share', financeShare);
    financeShare.children.set(
      'credit_cards.txt',
      file(
        'credit_cards.txt',
        [
          '# Mock PCI cardholder data — GRC Range lab fixture',
          '# Format: card_number,expiry,cvv,cardholder',
          '4111-1111-1111-1111,12/27,123,John Doe',
          '5454-5454-5454-5454,03/26,456,Jane Smith',
          '3782-822463-10005,07/25,7891,Acme Corp',
          '4012-8888-8888-1882,11/28,321,Bob Johnson',
        ].join('\n'),
        [everyoneFull, adminsFull],
      ),
    );

    // HR_Records — over-permissive share with PII / PHI data.
    const hrRecords = dir('HR_Records', [everyoneFull, adminsFull]);
    hrRecords.share = 'HR_Records';
    labData.children.set('HR_Records', hrRecords);
    hrRecords.children.set(
      'employee_ssn.csv',
      file(
        'employee_ssn.csv',
        [
          'employee_id,full_name,ssn,dob,health_plan',
          '1001,John Doe,123-45-6789,1981-04-12,BlueCross PPO',
          '1002,Jane Smith,987-65-4321,1990-09-30,Kaiser HMO',
          '1003,Bob Johnson,555-44-3322,1978-12-01,Aetna POS',
          '1004,Alice Williams,111-22-3333,1995-06-18,United PPO',
        ].join('\n'),
        [everyoneFull, adminsFull],
      ),
    );

    // Tools\cis-cat — mock CIS benchmark tooling.
    const tools = dir('Tools', [adminsFull, systemFull]);
    labData.children.set('Tools', tools);
    const cisCat = dir('cis-cat', [adminsFull, systemFull]);
    tools.children.set('cis-cat', cisCat);
    cisCat.children.set(
      'Invoke-CISCheck.ps1',
      file(
        'Invoke-CISCheck.ps1',
        [
          '# Mock CIS Benchmark checker for the GRC Range lab.',
          '# Invokes a series of checks against the simulated Windows host.',
          'param([string]$Path = "C:\\GRC_Lab_Data")',
          'Write-Host "Running CIS Level 1 benchmark checks..."',
          '# Check: password policy complexity',
          '# Check: firewall profile state',
          '# Check: local Administrators group membership',
          '# Check: file share ACLs',
          'Write-Host "CIS check complete. See report.md for findings."',
        ].join('\n'),
        [adminsFull, systemFull],
      ),
    );
    cisCat.children.set(
      'report.md',
      file(
        'report.md',
        [
          '# CIS Benchmark Report — GRC Range',
          '',
          '## Summary',
          '- Overall score: **42 / 100** (Non-compliant)',
          '',
          '## Failed Controls',
          '1. **Account password policy** — min length 4, no complexity (CIS 1.1.1)',
          '2. **Firewall: FTP inbound allowed** — Telnet/FTP open on all profiles (CIS 9.3)',
          '3. **Share permissions** — Finance_Share grants Everyone:FullControl (CIS 9.1)',
          '4. **Local admin sprawl** — temp_admin, intern_user in Administrators (CIS 2.1)',
          '',
          '## Passed Controls',
          '1. Windows Defender running',
          '2. UAC enabled',
        ].join('\n'),
        [adminsFull, systemFull],
      ),
    );

    // Logs — general log directory.
    const logs = dir('Logs', [adminsFull, systemFull]);
    labData.children.set('Logs', logs);
    logs.children.set(
      'setup.log',
      file(
        'setup.log',
        [
          '[INFO] GRC Range lab initialised.',
          '[INFO] Seeded non-compliant configuration for training.',
          '[WARN] File shares configured with Everyone:FullControl.',
          '[WARN] Weak password policy applied.',
        ].join('\n'),
        [adminsFull, systemFull],
      ),
    );

    // Policies — written policy documents.
    const policies = dir('Policies', [adminsFull, systemFull]);
    labData.children.set('Policies', policies);
    policies.children.set(
      'Acceptable_Use_Policy.md',
      file(
        'Acceptable_Use_Policy.md',
        [
          '# Acceptable Use Policy',
          '',
          'All users of the GRC Range workstation must use company assets solely',
          'for authorised business purposes. Sensitive data (PCI, PII, PHI) must',
          'not be stored on open file shares.',
        ].join('\n'),
        [adminsFull, systemFull],
      ),
    );

    // SIEM_Samples — mock event log export.
    const siemSamples = dir('SIEM_Samples', [adminsFull, systemFull]);
    labData.children.set('SIEM_Samples', siemSamples);
    siemSamples.children.set(
      'security_events.csv',
      file(
        'security_events.csv',
        [
          'timestamp,event_id,provider,level,message',
          '2024-09-13T08:01:12,4624,Microsoft-Windows-Security-Auditing,Information,An account was successfully logged on.',
          '2024-09-13T08:01:12,4672,Microsoft-Windows-Security-Auditing,Information,Special privileges assigned to new logon.',
          '2024-09-13T08:15:33,4720,Microsoft-Windows-Security-Auditing,Information,A user account was created.',
          '2024-09-13T09:02:47,4625,Microsoft-Windows-Security-Auditing,Error,An account failed to log on.',
          '2024-09-13T09:03:01,4625,Microsoft-Windows-Security-Auditing,Error,An account failed to log on.',
          '2024-09-13T09:03:18,4625,Microsoft-Windows-Security-Auditing,Error,An account failed to log on.',
          '2024-09-13T10:22:09,4728,Microsoft-Windows-Security-Auditing,Information,A member was added to a security-enabled global group.',
          '2024-09-13T11:45:30,4719,Microsoft-Windows-Security-Auditing,Information,System audit policy was changed.',
        ].join('\n'),
        [adminsFull, systemFull],
      ),
    );

    return root;
  }
}
