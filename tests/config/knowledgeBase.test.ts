import { describe, it, expect } from 'vitest';
import { KNOWLEDGE_BASE, searchArticles } from '@/config/knowledgeBase';

describe('knowledgeBase', () => {
  it('every article has a unique id and non-empty body', () => {
    const ids = new Set<string>();
    for (const article of KNOWLEDGE_BASE) {
      expect(ids.has(article.id)).toBe(false);
      ids.add(article.id);
      expect(article.body.length).toBeGreaterThan(0);
    }
  });

  it('searchArticles finds the PCI-DSS article for a cardholder-data query', () => {
    const results = searchArticles('protect stored cardholder data PCI');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.id).toBe('pci-dss-req3');
  });

  it('searchArticles returns [] for a query with no matching keywords', () => {
    expect(searchArticles('the and for how')).toEqual([]);
  });

  it('searchArticles respects the limit parameter', () => {
    const results = searchArticles('access control password policy firewall', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('searchArticles ranks higher-overlap articles first', () => {
    const results = searchArticles('weak password policy hardening CIS');
    expect(results[0]!.id).toBe('weak-password-policies');
  });
});
