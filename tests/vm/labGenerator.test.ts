import { describe, it, expect } from 'vitest';
import {
  offlineLab,
  parseLab,
  LAB_CATEGORIES,
  type LabGenerationRequest,
  type LabCategory,
} from '@/vm/labGenerator';

const baseRequest = (category: LabCategory): LabGenerationRequest => ({
  category,
  difficulty: 'Intermediate',
  findings: [
    { id: 'FND-001', title: 'Sensitive data stored on an open file share', severity: 'Critical', status: 'Open' },
  ],
  risks: [{ id: 'RSK-001', finding: 'Exposed PCI cardholder data (FND-001)', inherentRisk: 25 }],
});

describe('offlineLab', () => {
  for (const { id } of LAB_CATEGORIES) {
    it(`returns a valid GeneratedLab for category "${id}"`, () => {
      const lab = offlineLab(baseRequest(id));
      expect(lab.category).toBe(id);
      expect(lab.source).toBe('offline');
      expect(lab.title.length).toBeGreaterThan(0);
      expect(lab.objective.length).toBeGreaterThan(0);
      expect(lab.steps.length).toBeGreaterThanOrEqual(3);
      expect(lab.deliverables.length).toBeGreaterThan(0);
      expect(lab.verificationCriteria.length).toBeGreaterThan(0);
      expect(lab.estimatedTime.length).toBeGreaterThan(0);
    });
  }

  it('still returns a usable lab when there are no findings/risks', () => {
    const lab = offlineLab({ category: 'audit', difficulty: 'Beginner', findings: [], risks: [] });
    expect(lab.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('the incident category cites concrete breach-notification deadlines', () => {
    const lab = offlineLab(baseRequest('incident'));
    const allSteps = lab.steps.join(' ');
    expect(allSteps).toContain('72 hours');
    expect(allSteps).toContain('60 days');
  });
});

describe('parseLab', () => {
  const req = baseRequest('audit');

  it('parses a well-formed Ollama-style response', () => {
    const text = [
      'TITLE: Audit the exposed finance share',
      'OBJECTIVE: Discover and document the finance share exposure.',
      'STEPS:',
      '1. Open the Audit Console.',
      '2. Run the discovery cmdlet in the Terminal.',
      '3. Document the finding.',
      'DELIVERABLES:',
      '- Evidence file',
      '- Finding record',
      'VERIFICATION:',
      '- Evidence attached',
      'TIME: 45 minutes',
    ].join('\n');

    const lab = parseLab(text, req);
    expect(lab).not.toBeNull();
    expect(lab!.title).toBe('Audit the exposed finance share');
    expect(lab!.objective).toBe('Discover and document the finance share exposure.');
    expect(lab!.steps).toHaveLength(3);
    expect(lab!.deliverables).toEqual(['Evidence file', 'Finding record']);
    expect(lab!.verificationCriteria).toEqual(['Evidence attached']);
    expect(lab!.estimatedTime).toBe('45 minutes');
    expect(lab!.source).toBe('ollama');
  });

  it('returns null when required sections are missing', () => {
    expect(parseLab('just some rambling text with no headers', req)).toBeNull();
  });

  it('returns null when fewer than 3 steps are found', () => {
    const text = ['TITLE: X', 'OBJECTIVE: Y', 'STEPS:', '1. only one step'].join('\n');
    expect(parseLab(text, req)).toBeNull();
  });

  it('falls back to default deliverables/verification when sections are absent', () => {
    const text = [
      'TITLE: Minimal lab',
      'OBJECTIVE: Do the minimal thing.',
      'STEPS:',
      '1. Step one.',
      '2. Step two.',
      '3. Step three.',
    ].join('\n');
    const lab = parseLab(text, req);
    expect(lab).not.toBeNull();
    expect(lab!.deliverables).toEqual(['A completed lab workbook.']);
    expect(lab!.verificationCriteria).toEqual(['The lab steps are completed and evidence is captured.']);
  });
});
