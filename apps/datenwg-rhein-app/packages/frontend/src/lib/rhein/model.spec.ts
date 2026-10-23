// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { makeTestData } from '@/test/rhein-fixture';

import { makeCompute } from './compute';
import { KPI_BY_ID } from './kpis';

describe('Rhine model', () => {
  const data = makeTestData();
  const all = makeCompute(data, { months: [], epochs: [] });

  it('loads every day and the complete years', () => {
    expect(data.days.length).toBe(76397);
    expect(data.years[0]).toBe(1817);
    expect(data.years[data.years.length - 1]).toBe(2025);
    expect(data.years.length).toBe(209);
  });

  it('matches the semantic model', () => {
    // model: [Altes P05 Aug-Sep] = 1090, Aug/Sep share vor 1920 = 5.03 %, ab 1996 = 16.39 %
    expect(data.p05).toBeCloseTo(1090, 0);
    const augSep = makeCompute(data, { months: [8, 9], epochs: [] });
    expect(augSep.total(KPI_BY_ID.below, { epochs: ['vor 1920'] })).toBeCloseTo(0.0503, 3);
    expect(augSep.total(KPI_BY_ID.below, { epochs: ['ab 1996'] })).toBeCloseTo(0.1639, 3);
    // model: [NM7Q] of 1947 = 545.714 (complete years only, 1816 excluded)
    const y1947 = all.stats().find((s) => s.year === 1947);
    expect(y1947?.nm7q).toBeCloseTo(545.714, 2);
  });

  it('builds decade and year series against the reference 1817..1920', () => {
    const dec = all.series(KPI_BY_ID.mq, 'decade');
    expect(dec[0].label).toBe('1810er');
    expect(dec.length).toBe(22);
    for (const p of dec) {
      expect(Number.isFinite(p.ac)).toBe(true);
      expect(Number.isFinite(p.ref)).toBe(true);
    }
    expect(all.series(KPI_BY_ID.hq, 'year').length).toBe(209);
    expect(all.byEpoch(KPI_BY_ID.mq).length).toBe(3);
    expect(all.byMonth(KPI_BY_ID.mq).length).toBe(12);
  });

  it('ranks the driest years by NM7Q', () => {
    const r = all.ranking(KPI_BY_ID.nm7q, 'asc', 5);
    expect(r.length).toBe(5);
    expect(r[0].value).toBeLessThanOrEqual(r[4].value);
  });
});
