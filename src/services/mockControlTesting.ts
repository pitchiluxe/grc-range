/**
 * Mock control-testing (audit sampling) service for the GRC Range.
 *
 * Real SOC 2 Type II and internal-audit control testing does not inspect an
 * entire population — it draws a statistically justified sample, tests each
 * sampled item, and compares the exception rate against a tolerable
 * deviation rate. None of the other GRC Range labs model a population at
 * all; every other finding is either present or absent, with no sampling
 * judgment involved.
 *
 * This service seeds one fixed population (250 new-hire access-provisioning
 * tickets over a quarter) and lets the student draw a sample, mark each
 * sampled item Pass/Fail against its case note, and see the resulting
 * exception rate. The store is a plain in-memory structure; it does not
 * persist.
 */

import type { ControlTestItem, ControlTestResult } from '../domain/types';

/** The name of the control this population exercises. */
const CONTROL_NAME = 'New-Hire Access Provisioning Requires Manager Approval';

/** Total population size (tickets in the quarter under review). */
const POPULATION_SIZE = 250;

/** The tolerable deviation rate a Type II auditor would typically apply. */
const TOLERABLE_DEVIATION_RATE = 0.05;

/** Fictional names used to build population subjects. */
const FIRST_NAMES = [
  'Alice', 'Bruno', 'Cara', 'Diego', 'Elena', 'Farah', 'Gabriel', 'Hana',
  'Ivan', 'Jordan', 'Kaya', 'Leo', 'Mira', 'Noah', 'Omar', 'Priya',
];

/** Deterministic string hash (FNV-1a). */
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a tiny deterministic PRNG, seeded by a 32-bit integer. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * In-memory mock of a control-testing population, sample, and results.
 *
 * Self-contained: generates a deterministic 250-item population at
 * construction (about 6% of which have a missing-approval case note, an
 * intentional exception rate above the 5% tolerable deviation rate so a
 * sample has a realistic chance of surfacing a genuine failure), and exposes
 * `drawSample`, `recordResult`, and `exceptionRate`.
 */
export class MockControlTesting {
  private population: ControlTestItem[] = [];
  private sample: ControlTestItem[] | undefined;
  private results: Map<string, ControlTestResult> = new Map();

  constructor() {
    this.seedPopulation();
  }

  /** The name of the control under test. */
  getControlName(): string {
    return CONTROL_NAME;
  }

  /** The tolerable deviation rate this control is judged against. */
  getTolerableDeviationRate(): number {
    return TOLERABLE_DEVIATION_RATE;
  }

  /** Total population size. */
  getPopulationSize(): number {
    return this.population.length;
  }

  /** Return a defensive copy of the currently drawn sample, if any. */
  getSample(): ControlTestItem[] | undefined {
    return this.sample ? this.sample.map((i) => ({ ...i })) : undefined;
  }

  /**
   * Draw a deterministic simple-random sample of the given size from the
   * population (without replacement). Resets any prior sample and results.
   * Returns a defensive copy of the drawn sample.
   */
  drawSample(size: number): ControlTestItem[] {
    const clamped = Math.max(1, Math.min(size, this.population.length));
    const rand = mulberry32(hashString(`sample:${clamped}`));

    // Fisher-Yates over a copy of the population's indices, deterministic
    // given the same sample size.
    const indices = this.population.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }

    const chosen = indices.slice(0, clamped).map((i) => this.population[i]!);
    this.sample = chosen;
    this.results = new Map(
      chosen.map((item) => [item.id, { itemId: item.id, outcome: 'Untested' as const }]),
    );
    return this.getSample()!;
  }

  /**
   * Record a reviewer's result for a sampled item.
   * Returns the updated result, or `undefined` if the item is not in the
   * current sample.
   */
  recordResult(itemId: string, outcome: 'Pass' | 'Fail', evidenceNote: string): ControlTestResult | undefined {
    if (!this.results.has(itemId)) return undefined;
    const result: ControlTestResult = { itemId, outcome, evidenceNote };
    this.results.set(itemId, result);
    return { ...result };
  }

  /** Return a defensive copy of every recorded result for the current sample. */
  listResults(): ControlTestResult[] {
    return Array.from(this.results.values()).map((r) => ({ ...r }));
  }

  /**
   * The exception rate among items tested so far (Fail / (Pass + Fail)).
   * Returns `undefined` if no sample has been drawn or nothing has been
   * tested yet.
   */
  exceptionRate(): number | undefined {
    const tested = this.listResults().filter((r) => r.outcome !== 'Untested');
    if (tested.length === 0) return undefined;
    const failures = tested.filter((r) => r.outcome === 'Fail').length;
    return failures / tested.length;
  }

  /**
   * Whether every item in the current sample has been marked Pass or Fail.
   */
  isSampleComplete(): boolean {
    if (!this.sample) return false;
    return this.listResults().every((r) => r.outcome !== 'Untested');
  }

  /**
   * The control-test verdict once the sample is fully tested: `'Pass'` if
   * the exception rate is at or below the tolerable deviation rate,
   * `'Fail'` otherwise. Returns `undefined` until the sample is complete.
   */
  verdict(): 'Pass' | 'Fail' | undefined {
    if (!this.isSampleComplete()) return undefined;
    const rate = this.exceptionRate() ?? 0;
    return rate <= TOLERABLE_DEVIATION_RATE ? 'Pass' : 'Fail';
  }

  /**
   * Generate a deterministic 250-item population. About 6% of items carry a
   * case note documenting a missing approval (the population's true
   * exception rate is intentionally just above the 5% tolerable deviation
   * rate — mirroring how a real control that is "mostly" operating still
   * fails a properly sampled test).
   */
  private seedPopulation(): void {
    const rand = mulberry32(hashString('control-testing-population-v1'));
    const items: ControlTestItem[] = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const subject = `${first} Omari`;
      const dayOffset = Math.floor(rand() * 90); // spread over one quarter
      const eventDate = new Date(Date.UTC(2024, 6, 1) + dayOffset * 86_400_000).toISOString().slice(0, 10);
      const missingApproval = rand() < 0.06;
      const reference = `PROV-${String(1000 + i)}`;
      const caseNote = missingApproval
        ? `Provisioning ticket ${reference} for ${subject}: account created and access granted. No manager-approval attachment or approval comment found on the ticket.`
        : `Provisioning ticket ${reference} for ${subject}: account created and access granted. Manager approval attached, dated before access was granted.`;
      items.push({
        id: `CTI-${i + 1}`,
        reference,
        subject,
        eventDate: `${eventDate}T00:00:00.000Z`,
        caseNote,
      });
    }
    this.population = items;
  }
}
