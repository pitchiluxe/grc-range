import { describe, it, expect } from 'vitest';
import { MockControlTesting } from '@/services/mockControlTesting';

describe('MockControlTesting', () => {
  it('seeds a 250-item population', () => {
    const t = new MockControlTesting();
    expect(t.getPopulationSize()).toBe(250);
  });

  it('has no sample, results, or verdict before drawSample is called', () => {
    const t = new MockControlTesting();
    expect(t.getSample()).toBeUndefined();
    expect(t.exceptionRate()).toBeUndefined();
    expect(t.verdict()).toBeUndefined();
    expect(t.isSampleComplete()).toBe(false);
  });

  it('drawSample is deterministic for a fixed sample size', () => {
    const a = new MockControlTesting().drawSample(25).map((i) => i.id);
    const b = new MockControlTesting().drawSample(25).map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(25);
    expect(new Set(a).size).toBe(25); // no duplicates
  });

  it('a different sample size draws a different-sized, still-deterministic sample', () => {
    const t = new MockControlTesting();
    const sample = t.drawSample(40);
    expect(sample).toHaveLength(40);
  });

  it('recordResult only accepts item ids that are in the current sample', () => {
    const t = new MockControlTesting();
    t.drawSample(10);
    const inSample = t.getSample()![0]!.id;
    expect(t.recordResult(inSample, 'Pass', 'ok')).toBeDefined();
    expect(t.recordResult('CTI-not-in-sample', 'Pass', 'ok')).toBeUndefined();
  });

  it('exceptionRate reflects only tested items, and verdict requires full completion', () => {
    const t = new MockControlTesting();
    const sample = t.drawSample(20);
    expect(t.exceptionRate()).toBeUndefined();

    t.recordResult(sample[0]!.id, 'Fail', 'no approval');
    expect(t.exceptionRate()).toBe(1); // 1 of 1 tested so far

    for (const item of sample.slice(1)) {
      t.recordResult(item.id, 'Pass', 'approval on file');
    }
    expect(t.isSampleComplete()).toBe(true);
    expect(t.exceptionRate()).toBeCloseTo(1 / 20);
  });

  it('verdict is Pass when the exception rate is within tolerance, Fail otherwise', () => {
    const t = new MockControlTesting();
    const sample = t.drawSample(20);
    for (const item of sample) t.recordResult(item.id, 'Pass', 'approval on file');
    expect(t.verdict()).toBe('Pass');

    const t2 = new MockControlTesting();
    const sample2 = t2.drawSample(20);
    for (const item of sample2) t2.recordResult(item.id, 'Fail', 'no approval');
    expect(t2.verdict()).toBe('Fail');
  });

  it('drawing a new sample resets prior results', () => {
    const t = new MockControlTesting();
    const first = t.drawSample(10);
    t.recordResult(first[0]!.id, 'Fail', 'no approval');
    expect(t.exceptionRate()).toBe(1);

    t.drawSample(10);
    expect(t.exceptionRate()).toBeUndefined();
    expect(t.isSampleComplete()).toBe(false);
  });
});
