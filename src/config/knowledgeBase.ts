/**
 * The GRC Range knowledge base.
 *
 * A static corpus of short reference articles the GRC Senior Expert tutor
 * retrieves from before answering. The tutor always searches this corpus
 * first and feeds the closest articles into the model prompt as grounding
 * material, so answers stay tied to the lab's frameworks rather than the
 * model's general training data.
 *
 * Articles are deliberately operational — they describe what to check, what
 * a violation looks like, and how to remediate — so they double as the
 * source the offline fallback quotes when Ollama is unavailable.
 */

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** A single knowledge-base article the tutor can retrieve and cite. */
export interface Article {
  /** Stable identifier (kebab-case). */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Topic tag, one of the GRC topics the lab covers. */
  topic: string;
  /** 2–4 paragraphs of operational reference material. */
  body: string;
}

/** The set of topics the knowledge base organizes articles under. */
export type KnowledgeTopic =
  | 'pci-dss'
  | 'hipaa'
  | 'gdpr'
  | 'iso27001'
  | 'nist-csf'
  | 'cis'
  | 'soc2'
  | 'access-control'
  | 'risk-assessment'
  | 'remediation'
  | 'audit-evidence'
  | 'executive-briefing'
  | 'policy-writing'
  | 'cloud-security'
  | 'continuous-monitoring'
  | 'vendor-risk-management'
  | 'quantitative-risk'
  | 'audit-sampling'
  | 'breach-notification';

/* ------------------------------------------------------------------ *
 * Corpus
 * ------------------------------------------------------------------ */

/**
 * The knowledge base.
 *
 * At least one article per topic the lab teaches, covering the frameworks
 * the seeded findings map to (PCI-DSS, HIPAA, GDPR, ISO 27001, NIST CSF,
 * CIS, SOC 2) plus the GRC skills the learner practices (access control,
 * risk assessment, remediation, audit evidence, executive briefings,
 * policy writing).
 */
export const KNOWLEDGE_BASE: Article[] = [
  {
    id: 'pci-dss-req3',
    title: 'PCI-DSS Requirement 3 — Protect Stored Cardholder Data',
    topic: 'pci-dss',
    body: [
      'PCI-DSS Requirement 3 mandates that cardholder data — primarily the Primary Account Number (PAN), but also the cardholder name, expiration date, and service code — be protected wherever it is stored. The core rule is that PAN must be rendered unreadable anywhere it is stored, including logs, databases, and flat files. Acceptable methods are strong one-way hashing, truncation, index tokens and pads, and strong cryptography with associated key management.',
      'A violation is straightforward: any file, share, or database that stores a readable PAN without one of those protections is a finding. In the GRC Range, a credit_cards.txt file containing mock card numbers in cleartext on an open share is a textbook Requirement 3.4 violation. Storing the CVV or full track data after authorization is always prohibited regardless of encryption.',
      'To remediate, first remove the data if it is not needed — you cannot breach what you do not store. If it must be kept, tokenize or encrypt the PAN at rest using managed keys, restrict the file share to the Finance group, and verify with a follow-up scan that no cleartext PAN remains. Document the before state (the cleartext file and the open ACL) and the after state (encrypted store, restricted ACL) as audit evidence.',
    ].join('\n\n'),
  },
  {
    id: 'hipaa-security-rule',
    title: 'HIPAA Security Rule 45 CFR — Technical Safuards',
    topic: 'hipaa',
    body: [
      'The HIPAA Security Rule (45 CFR 164.312) requires technical safeguards for electronic Protected Health Information (ePHI). The four addressable standards are access control, audit controls, integrity, and transmission security, plus the required encryption/decryption and automatic logoff standards. "Addressable" does not mean optional — it means the covered entity must either implement the control or document why an equivalent measure is in place.',
      'Access control (164.312(a)(1)) means unique user identification, emergency access, and automatic logoff. Audit controls (164.312(b)) require examining ePHI access. In the GRC Range, an HR_Records share granting Everyone: FullControl over a file containing SSNs and health-plan data violates access control, and the absence of NTFS auditing violates audit controls.',
      'Breach notification under the HITECH-amended Breach Notification Rule requires notifying affected individuals within 60 days of discovery when unsecured PHI is breached. "Unsecured" means not rendered unusable through encryption or destruction. Remediation: restrict the share ACL to the HR group, enable NTFS auditing on the folder, move PHI to an encrypted store, and preserve the before/after evidence for the breach risk assessment.',
    ].join('\n\n'),
  },
  {
    id: 'gdpr-article-32',
    title: 'GDPR Article 32 — Security of Processing',
    topic: 'gdpr',
    body: [
      'GDPR Article 32 requires data controllers and processors to implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk. The article names pseudonymisation and encryption explicitly, along with confidentiality, integrity, availability, and resilience. "Appropriate" is risk-based: higher-risk processing demands stronger controls.',
      'The measures must account for the risks of accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. In the GRC Range, storing SSNs and health data in cleartext on an Everyone:FullControl share is a clear failure to provide appropriate confidentiality. Pseudonymization (replacing identifiers with tokens) and encryption at rest are the named controls the article expects.',
      'The fine structure is tiered: up to 10 million EUR or 2% of global annual turnover under Article 83(4) for the Article 32 obligations, and up to 20 million EUR or 4% under Article 83(5) for the core data-protection principles in Article 5. Remediation framing for executives: the cost of encryption and access control is trivially small compared to a 4% fine plus breach response.',
    ].join('\n\n'),
  },
  {
    id: 'iso27001-a9',
    title: 'ISO 27001 Control A.9 — Access Control',
    topic: 'iso27001',
    body: [
      'ISO 27001 Annex A.9 covers access control. The objective is to ensure access to information is restricted to authorized users. A.9.1 is the access control policy (business requirements), A.9.2 is user access management (registration, privilege, password), A.9.3 is user responsibilities, and A.9.4 is system and application access control (information access restriction, secure log-on, privilege management).',
      'The guiding principles are least privilege and need-to-know: a user gets only the access required for their role. In the GRC Range, the local Administrators group containing svc_backup, temp_admin, and intern_user violates A.9.2 (user access management) — service, temporary, and intern accounts should not hold elevated rights without justification.',
      'To remediate, remove the unjustified accounts from Administrators, delete temp_admin, and document a periodic access review. A.9.4.2 requires secure log-on procedures, which ties into the weak password policy finding: a 4-character minimum with no complexity does not meet A.9.2.4 (use of secret authentication information). Evidence: before/after `net localgroup Administrators` output and the updated password policy.',
    ].join('\n\n'),
  },
  {
    id: 'nist-csf-prac',
    title: 'NIST CSF PR.AC — Access Control Category',
    topic: 'nist-csf',
    body: [
      'The NIST Cybersecurity Framework "Protect" function contains the PR.AC (Access Control) category. PR.AC-1 covers identity and credential management, PR.AC-3 is remote access, PR.AC-4 is access permissions managed and verified, PR.AC-5 is network integrity, PR.AC-6 is least privilege, and PR.AC-7 is least functionality. The CSF is outcome-based, so it maps cleanly onto the other frameworks.',
      'PR.AC-4 (access permissions) is the control the GRC Range shares violate: Everyone:FullControl on Finance_Share and HR_Records means permissions are not managed or verified. PR.AC-6 (least privilege) is violated by the Administrators group sprawl. PR.AC-1 is violated by the weak password policy and the service account with a static weak password.',
      'To check PR.AC-4, list the share ACLs and confirm each grants the minimum rights to the minimum set of identities. To check PR.AC-6, enumerate local group membership and justify every elevated account. Remediation evidence is the same before/after ACL and group membership captures, cross-referenced to the CSF sub-category so the executive briefing can cite the framework.',
    ].join('\n\n'),
  },
  {
    id: 'cis-win2022-benchmark',
    title: 'CIS Windows Server 2022 Benchmark — Key Controls',
    topic: 'cis',
    body: [
      'The CIS Benchmark for Windows Server 2022 is a hardening configuration guide. The sections most relevant to the GRC Range are 1.x (Account / Password Policy), 2.x (Local Users and Groups), 9.x (Windows Firewall), and 16.x (Audit Policy). Each control gives a recommended setting and a way to check it.',
      'Password policy (CIS 1.1.1): minimum length 14, complexity enabled, history 24, maximum age 90 (or fewer) days. Check with `net accounts` or `secedit /export`. The GRC Range seeds min length 4, complexity off, history 0 — a direct violation. Firewall (CIS 9.3): inbound FTP/Telnet/RDP from any source on all profiles fails the benchmark; cleartext protocols should be disabled and RDP restricted.',
      'Audit logging (CIS 16.x): the benchmark specifies which advanced audit subcategories to enable (Privilege Use, Policy Change, Logon). Check with `auditpol /get /category:*`. User management (CIS 2.1): enumerate Administrators membership and remove unjustified accounts with `net localgroup Administrators`. File permissions: verify share ACLs do not grant Everyone elevated rights.',
    ].join('\n\n'),
  },
  {
    id: 'soc2-type2',
    title: 'SOC 2 Type II — Trust Services Criteria',
    topic: 'soc2',
    body: [
      'SOC 2 Type II reports on the design and operating effectiveness of controls over a period. The Trust Services Criteria (TSC) the GRC Range focuses on are Security (Common Criteria CC1–CC9) and Confidentiality. CC6 is logical and physical access, which is where the share and account findings land. CC7 is system operations, CC8 is change management, and CC9 is risk mitigation.',
      'CC6.1 requires logical access security controls over information to protect it from unauthorized access. Everyone:FullControl on a share holding cardholder or PHI data is a CC6.1 failure. CC6.3 requires authorization and authentication for access — the Administrators group sprawl and weak password policy are CC6.3 findings.',
      'Evidence requirements for a Type II are heavier than Type I: the auditor needs a population of the control operating over the observation period, not a single point-in-time screenshot. For the lab, capture the before/after ACL, the group membership, the password policy, and the audit log showing the control in operation. Each piece of evidence should map to a specific TSC so the report is traceable.',
    ].join('\n\n'),
  },
  {
    id: 'access-control-best-practices',
    title: 'Access Control Best Practices',
    topic: 'access-control',
    body: [
      'The four pillars of access control are least privilege, separation of duties, privileged access management, and periodic access reviews. Least privilege means an account has only the rights its task requires. Separation of duties means no single person can complete a sensitive end-to-end process (e.g., create and approve a payment).',
      'Privileged access management (PAM) means elevated accounts are vaulted, time-boxed, and session-recorded. In the GRC Range, a service account living permanently in Administrators with a static weak password is the anti-pattern PAM exists to fix. Periodic access reviews (quarterly or on role change) catch drift like temp_admin never being removed.',
      'To operationalize: enumerate local Administrators (`net localgroup Administrators`), justify each member, remove those without a current business need, and schedule a recurring review. For shares, list ACLs and confirm each identity still needs the granted rights. Document the review with a signed access matrix as evidence for ISO 27001 A.9.2.5 and SOC 2 CC6.3.',
    ].join('\n\n'),
  },
  {
    id: 'periodic-access-reviews',
    title: 'Periodic User Access Reviews',
    topic: 'access-control',
    body: [
      'A periodic (typically quarterly) user access review — sometimes called a UAR or entitlement review — is the control that catches the access-control failures a one-time audit misses: the temp account that was never removed, the admin rights granted for a migration that outlived the migration, the account whose manager left and no one reassigned it. Access control policy sets the rule; the review is what proves the rule is actually being followed over time.',
      'Every account in scope gets one of two decisions: Certify (the access is still justified — keep it) or Revoke (no longer justified — remove it). A reviewer who rubber-stamps every account as Certified without checking is not performing the control; auditors specifically sample UARs for evidence that individual decisions were actually made, not defaulted.',
      'Flag accounts automatically where possible: no manager on file (orphaned — nobody is accountable for recertifying it), service/temporary/intern accounts holding admin rights (privilege that should have a documented, time-boxed justification), and disabled accounts still present in the group they should have been removed from. Revoking access should be a real mutation — remove the group membership or disable the account — not just a note in a spreadsheet; the evidence auditors sample is the entitlement matrix and log showing the access was actually pulled.',
    ].join('\n\n'),
  },
  {
    id: 'risk-assessment-methodology',
    title: 'Risk Assessment Methodology',
    topic: 'risk-assessment',
    body: [
      'A standard risk score is likelihood (1–5) multiplied by impact (1–5), giving an inherent risk from 1 to 25. Inherent risk is the risk before controls; residual risk is what remains after controls are applied. The difference is the control effectiveness. A 5x5 risk matrix plots likelihood against impact to prioritize.',
      'The four control strategies are mitigate (reduce likelihood or impact), accept (tolerate the risk), transfer (insurance or contract), and avoid (eliminate the activity). In the GRC Range, the exposed cardholder data is likelihood 5, impact 5, inherent 25 — mitigate by restricting the share and encrypting the data, dropping residual to ~5. FTP/Telnet is better handled by avoid: remove the service entirely.',
      'To run the assessment: for each finding, assign likelihood and impact, compute the score, choose a strategy, set an owner, and define the residual. Record it in the risk register. The residual risk is what you brief executives on — it is the risk the organization has agreed to carry after treatment.',
    ].join('\n\n'),
  },
  {
    id: 'quantitative-risk-fair',
    title: 'Quantitative Risk Scoring — FAIR-Lite and Annualized Loss Expectancy',
    topic: 'quantitative-risk',
    body: [
      'The 1-5 likelihood x impact matrix is fast but ordinal — a 20 is not literally "twice as bad" as a 10, and a CFO cannot budget against a number with no currency attached. Factor Analysis of Information Risk (FAIR) is the standard framework for expressing cyber risk in financial terms instead. A simplified ("FAIR-lite") version usable without the full FAIR taxonomy needs two estimates per risk: Loss Event Frequency (how many times per year the event is expected to occur) and Loss Magnitude (the dollar cost per occurrence, including response, fines, and downtime).',
      'Multiply them: Annualized Loss Expectancy (ALE) = Loss Event Frequency x Loss Magnitude. A finding with a 0.5/year chance of a $500,000 incident has the same ALE as one with a 5/year chance of a $50,000 incident — both are $250,000/year — even though their qualitative severity labels might differ. ALE is what lets you compare a compliance finding directly against the cost of the fix: "the control costs $8,000/year; the risk it reduces is $250,000/year in expected loss" is a sentence a CFO can act on.',
      'Do not present a single point estimate as false precision — use a range (low/likely/high) for both frequency and magnitude where the data supports it, and say so explicitly. Quantitative and qualitative scoring are not mutually exclusive: keep the 1-5 matrix for fast triage and prioritization across many findings, and reach for FAIR-lite ALE specifically when a risk needs to be defended in a budget conversation — this is exactly the skill the executive-briefing / CFO-roleplay exercise practices.',
    ].join('\n\n'),
  },
  {
    id: 'remediation-planning',
    title: 'Remediation Planning',
    topic: 'remediation',
    body: [
      'Prioritize remediation by risk score, not severity label alone. A Critical finding with inherent risk 25 comes before a Medium at 12. Within the same score, prefer findings that are quick wins (low effort, high risk reduction) to build momentum. Assign each remediation an owner and a timeline tied to the risk level — Critical in days, High in weeks, Medium in a quarter.',
      'Verification is mandatory: a finding is not closed because the change was made, it is closed because the change was proven. Re-run the same command used to discover it (`net accounts`, `net localgroup`, the firewall rule list, the share ACL) and confirm the output reflects the fix. Capture the after screenshot alongside the before.',
      'Re-audit closes the loop. After verification, re-score the residual risk and update the risk register. If residual is still above tolerance, iterate. The evidence pack for each finding is: the original finding, the before evidence, the remediation action with timestamp, the after evidence, and the updated risk register entry.',
    ].join('\n\n'),
  },
  {
    id: 'audit-sampling-methodology',
    title: 'Audit Sampling Methodology',
    topic: 'audit-sampling',
    body: [
      'A SOC 2 Type II or internal-audit control test almost never inspects an entire population — for a control that operated 250 times over the audit period, the auditor tests a sample and infers the control\'s operating effectiveness for the whole population from it. This is standard practice (AICPA sampling guidance), not a shortcut: a properly drawn sample gives a statistically defensible conclusion at a fraction of the cost of full inspection.',
      'Sample size depends on population size, the desired confidence level, and the tolerable deviation rate (the maximum exception rate the auditor will accept and still call the control effective) — for common audit confidence levels, sample sizes in the 25-60 range are typical for populations in the hundreds, not a fixed percentage of the population. The sample itself should be drawn by simple random or systematic selection, not judgmentally picked — cherry-picking "easy" items to test defeats the purpose and is itself an audit finding if discovered.',
      'Once tested, compute the exception rate: failures divided by items tested. Compare it to the tolerable deviation rate set before testing began (commonly 5-9% depending on the control\'s risk). If the sample exception rate is at or below tolerance, the control passes; if above, the control fails for the period, regardless of how "close" it was — the whole point of a pre-set tolerance is to remove after-the-fact rationalization from the verdict.',
    ].join('\n\n'),
  },
  {
    id: 'audit-evidence-collection',
    title: 'Audit Evidence Collection',
    topic: 'audit-evidence',
    body: [
      'Audit evidence must be sufficient, contemporaneous, and attributable. Capture the command, the full output, the timestamp, and the analyst. For the GRC Range, that means running `net accounts`, `net localgroup Administrators`, `auditpol /get /category:*`, and the firewall/ACL listings, and saving the output verbatim — not a paraphrase.',
      'Chain of custody matters even in a lab: each artifact should be labeled with the finding id, the date, and who collected it. Screenshots should show the full console including the prompt and timestamp where possible; if a screenshot is used, the corresponding text output should be preserved too so it is searchable.',
      'Log preservation: export the Security event log (`wevtutil epl Security ...`) before making changes so the pre-remediation state is immutable. After remediation, export again. Store before and after together keyed by finding id. This is the evidence an auditor (or a SOC 2 Type II examiner) will sample to confirm the control operated.',
    ].join('\n\n'),
  },
  {
    id: 'executive-briefing-techniques',
    title: 'Executive Briefing Techniques',
    topic: 'executive-briefing',
    body: [
      'Executives do not want control citations; they want business risk and cost. Translate each finding into: what is exposed, who could exploit it, what it would cost (fine, breach response, downtime), and what the fix costs. Lead with the residual risk after remediation so the conversation is about the risk being carried, not the history.',
      'Financial framing: a GDPR exposure can mean up to 4% of global turnover; a PCI breach triggers card brand fines and forensic costs. Frame the remediation cost (a few hours of admin time, a license) against that exposure. For the CFO who challenges the budget, use the risk register: "We are carrying a residual risk of X; the control that reduces it costs Y; the expected loss it averts is Z."',
      'Structure the briefing: one page, top three risks, each with the finding, the business impact, the remediation status, and the residual risk. Avoid jargon — "Everyone can read the card numbers" lands better than "CC6.1 control deficiency." End with the ask: budget, sign-off, or a decision on accepted risks.',
    ].join('\n\n'),
  },
  {
    id: 'policy-writing',
    title: 'Policy Writing',
    topic: 'policy-writing',
    body: [
      'A policy states what must be true; a procedure states how it is achieved. The access control policy should state least privilege, unique IDs, periodic reviews, and privileged access management as requirements. The Acceptable Use Policy (AUP) defines permitted and prohibited use of systems, data, and accounts.',
      'The data classification policy defines the tiers (e.g., Public, Internal, Confidential, Restricted) and the handling rules for each — who can access, whether encryption is required, whether it may be emailed. In the GRC Range, the cardholder data is Restricted and the PHI is Confidential or Restricted; the policy should require encryption at rest and restricted access for those tiers.',
      'The incident response policy defines roles, the severity scale, and the notification timeline (e.g., HIPAA 60 days). Each policy should have an owner, a review date, and a version. Keep policies short and operational — a policy no one reads is not a control. Evidence of policy is the document plus the sign-off and the date it was communicated to staff.',
    ].join('\n\n'),
  },
  {
    id: 'breach-notification-timelines',
    title: 'Breach Notification Timelines — GDPR, HIPAA, and U.S. State Laws',
    topic: 'breach-notification',
    body: [
      'The notification clock starts at discovery, not at the moment the breach actually occurred — "discovery" is when the organization knew or reasonably should have known. Getting this start date right matters: every deadline below is measured from it, and getting it wrong (starting the clock late) is itself a compliance failure independent of the underlying breach.',
      'GDPR Article 33 requires notifying the relevant supervisory authority within 72 hours of becoming aware of a personal-data breach, unless the breach is unlikely to result in a risk to individuals. If individuals are at high risk, Article 34 also requires notifying them directly, without undue delay. HIPAA\'s Breach Notification Rule (45 CFR 164.404) requires notifying affected individuals within 60 days of discovering a breach of unsecured PHI, and notifying HHS — immediately for breaches affecting 500+ individuals, or annually for smaller ones.',
      'U.S. state breach-notification laws (all 50 states have one) vary in exact wording but commonly require notice "in the most expedient time possible and without unreasonable delay," with a growing number of states now specifying a hard outer limit (commonly 30-45 days) — California and several others cap it. When multiple laws apply (e.g. a healthcare vendor with customers in several states, holding both PHI and general PII), the shortest applicable deadline governs the response timeline, not the average or the most lenient one.',
    ].join('\n\n'),
  },
  {
    id: 'weak-password-policies',
    title: 'Weak Password Policies — Diagnosis and Hardening',
    topic: 'cis',
    body: [
      'A password policy is weak when it permits short, simple, reused credentials and does not lock accounts after failures. The GRC Range seeds a minimum length of 4, complexity off, history 0, maximum age 0, and lockout threshold 0 — every dimension is below baseline. The result is trivial passwords that never expire and unlimited guessing.',
      'CIS recommends minimum length 14, complexity enabled, history 24, maximum age 90 days or fewer, and a lockout threshold of no more than 5 attempts with a 15-minute lockout duration. Check the current state with `net accounts` or by exporting the security policy with `secedit /export` and inspecting the PasswordPolicy and AccountLockout sections.',
      'To harden, edit the local policy via `secedit` or the Group Policy snap-in: set the values to the CIS recommendations, then run `gpupdate /force` and re-check with `net accounts`. Capture the before and after `net accounts` output as evidence. Note that changing the policy does not change existing passwords — require a reset, and for service accounts rotate to a vaulted 32+ character credential.',
    ].join('\n\n'),
  },
  {
    id: 'firewall-hardening',
    title: 'Firewall Hardening — Closing Unnecessary Ports',
    topic: 'cis',
    body: [
      'Every open inbound port is an attack surface. The GRC Range seeds inbound allow rules for FTP (TCP 21), Telnet (TCP 23), and RDP (TCP 3389) on all profiles. FTP and Telnet are cleartext protocols that should never be exposed inbound — credentials and data traverse the wire unencrypted. RDP from any source enables brute-force.',
      'CIS firewall guidance: disable and remove inbound allow rules for FTP and Telnet entirely (avoid the service). For RDP, restrict the rule to specific management subnets or broker through an RD Gateway, and require Network Level Authentication (NLA). Use profile-based rules — a rule on "Any" profile is active on Public networks, which is rarely intended.',
      'To check, list rules with `netsh advfirewall firewall show rule name=all` or the firewall snap-in and identify enabled inbound allow rules for those ports. To remediate, disable the FTP/Telnet rules and restrict the RDP rule remote address. Verify with the same command listing. Evidence: the before rule list showing the open rules and the after list showing them disabled or scoped.',
    ].join('\n\n'),
  },
  {
    id: 'cis-aws-foundations',
    title: 'CIS AWS Foundations Benchmark — Key Controls',
    topic: 'cloud-security',
    body: [
      'The CIS AWS Foundations Benchmark is the cloud analogue of the Windows Server benchmark: a hardening checklist for an AWS account. The sections most relevant to day-to-day GRC triage are 1.x (IAM), 2.x (Storage/S3, encryption), and 5.x (Networking/security groups). Cloud misconfiguration, not on-prem Windows misconfiguration, is where most real-world security triage time goes today.',
      'IAM (CIS 1.16): no IAM policy should grant `"Action": "*"` on `"Resource": "*"` — that is full administrative access from whatever principal holds it. Access keys (CIS 1.14) should be rotated at most every 90 days; a key that has never been rotated is a standing credential-leak risk. Storage (CIS 2.1.5): S3 buckets must not grant public read/list access unless the bucket is deliberately public (e.g. static web assets), and should be encrypted at rest.',
      'Networking (CIS 5.2): security groups should never allow inbound TCP 22 (SSH) or TCP 3389 (RDP) from `0.0.0.0/0` — management access should come from a VPN CIDR or bastion, not the open internet. To check: `aws iam get-account-authorization-details`, `aws s3api get-bucket-acl`, `aws ec2 describe-security-groups`. Remediation: scope IAM policies to least privilege, block public bucket access, rotate keys, and restrict security-group source CIDRs.',
    ].join('\n\n'),
  },
  {
    id: 'cloud-shared-responsibility',
    title: 'The Cloud Shared Responsibility Model',
    topic: 'cloud-security',
    body: [
      'Every major cloud provider operates under a shared responsibility model: the provider secures the infrastructure ("security OF the cloud" — physical data centers, hypervisor, managed-service internals), while the customer secures what they put on it ("security IN the cloud" — IAM configuration, data encryption, network rules, OS patching on unmanaged compute). Almost every cloud breach in the real world is a customer-side misconfiguration, not a provider failure.',
      'This is why CSPM (Cloud Security Posture Management) findings dominate modern GRC and security work: a public S3 bucket, an overprivileged IAM role, or an open security group are all customer-responsibility failures that a provider will never flag or fix for you. They also tend to be instantly and remotely exploitable, unlike an on-prem finding that requires network access to the workstation.',
      'When mapping a cloud finding to a framework, use the same controls as any access-control or data-protection finding (ISO 27001 A.9, NIST CSF PR.AC, SOC 2 CC6.1) — the frameworks are provider-agnostic. The evidence just looks different: an `aws` CLI command or console screenshot instead of `net accounts` or `icacls`.',
    ].join('\n\n'),
  },
  {
    id: 'continuous-control-monitoring',
    title: 'Continuous Control Monitoring and Control Drift',
    topic: 'continuous-monitoring',
    body: [
      'A control passing an audit today says nothing about whether it is still passing next quarter. "Control drift" is the gradual regression of a previously-compliant control back toward non-compliance — a password policy quietly relaxed for a vendor integration, a firewall exception opened "temporarily" for a migration and never closed, an admin account added for a project and never removed. SOC 2 Type II and ISO 27001 surveillance audits exist specifically because point-in-time compliance is not the same as operating effectiveness over a period.',
      'Continuous Control Monitoring (CCM) is the practice of re-testing controls on a recurring cadence instead of only at audit time — automated where possible (a scheduled script re-checking password policy, firewall rules, group membership) and manual where not. SOC 2 CC7.2 (monitoring for anomalies) and ISO 27001 A.18.2.3 (technical compliance review) both expect this cadence to exist, not just a single control test.',
      'When a re-check finds a control has drifted: treat it like any other finding — record the baseline state, the current state, and the detection date, raise it at the correct severity, and remediate by restoring the control (not just the immediate symptom). Then ask the harder question a one-time fix never answers: why did this drift, and does the fix need a control around the control (e.g. change management approval for firewall rules) so it does not drift again.',
    ].join('\n\n'),
  },
  {
    id: 'vendor-risk-assessment',
    title: 'Third-Party Vendor Risk Assessment',
    topic: 'vendor-risk-management',
    body: [
      'Vendor risk assessment answers one question: how much risk does this vendor add to our organization, given what data or systems they can reach? Start with data access level, not vendor size or spend — a small analytics vendor with read access to customer PII can carry more risk than a large vendor with no data access at all.',
      'The two standard inputs are the vendor\'s SOC 2 Type II report (or Type I if that is all they have — note the gap, Type I only covers control design, not operating effectiveness) and a security questionnaire (a lightweight SIG, or "SIG-lite"). Read the SOC 2 report for exceptions, not just the auditor\'s opinion — an exception with a documented remediation is very different from an unaddressed one. Check the observation period: a fresh vendor may only have a 3-6 month Type II, which is weaker evidence than a full 12 months.',
      'Decide using a simple framework: Approve (no material gaps, data access proportionate to controls), Conditional (approve with a compensating control or a re-review date, e.g. "approve for 6 months, re-assess after their next SOC 2"), or Reject (no SOC 2, undisclosed subprocessors, or unresolved exceptions for Critical-data-access vendors). Record the decision and the rationale — the SOC 2 exceptions or questionnaire gaps that drove it — as the audit evidence for the vendor management control (ISO 27001 A.15, SOC 2 CC9.2).',
    ].join('\n\n'),
  },
  {
    id: 'reading-a-soc2-report',
    title: 'How to Read a Vendor\'s SOC 2 Report',
    topic: 'vendor-risk-management',
    body: [
      'A SOC 2 report has four parts worth reading in order: (1) the auditor\'s opinion (unqualified = clean, qualified = something is wrong), (2) management\'s description of the system, (3) the Trust Services Criteria and controls tested, and (4) the exceptions — the section everyone skips and shouldn\'t. An exception means a control did not operate as described for at least part of the period.',
      'Not every exception is disqualifying. Weigh severity (a single missed quarterly review vs. a systemic access-control failure), whether it is remediated by report date, and whether it touches the data this vendor will actually hold for you. A payment processor with an access-review exception on an unrelated internal system is lower risk than the same processor with an exception in the payment-card-data environment itself.',
      'Also check the Trust Services Criteria scope: Security is baseline, but Confidentiality and Availability matter for a vendor holding sensitive data or running a system you depend on for uptime. A vendor who only scoped Security into their SOC 2 while handling sensitive PII is a gap worth asking about directly, not assuming away.',
    ].join('\n\n'),
  },
];

/* ------------------------------------------------------------------ *
 * Retrieval
 * ------------------------------------------------------------------ */

/** Normalize a string for keyword matching: lowercase, collapse non-word runs. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Tokenize a query into individual search keywords (length > 2). */
function keywords(query: string): string[] {
  const STOP = new Set([
    'the', 'and', 'for', 'how', 'what', 'why', 'with', 'that', 'this',
    'from', 'into', 'does', 'are', 'can', 'you', 'your', 'about', 'have',
    'these', 'those', 'should', 'would', 'could', 'will', 'our', 'their',
  ]);
  return normalize(query)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Search the knowledge base by simple keyword matching.
 *
 * Matches are case-insensitive and scored by the number of distinct query
 * keywords that appear in the article's title, topic, or body. Articles with
 * no matches are excluded. Results are sorted by descending score, then by
 * title for deterministic ordering.
 *
 * @param query  Free-text question or search string.
 * @param limit  Optional maximum number of articles to return.
 * @returns      Best-matching articles, highest relevance first.
 */
export function searchArticles(query: string, limit?: number): Article[] {
  const terms = keywords(query);
  if (terms.length === 0) return [];

  const scored = KNOWLEDGE_BASE.map((article) => {
    const haystack = normalize(`${article.title} ${article.topic} ${article.body}`);
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += 1;
    }
    return { article, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .slice(0, limit)
    .map((entry) => entry.article);
}
