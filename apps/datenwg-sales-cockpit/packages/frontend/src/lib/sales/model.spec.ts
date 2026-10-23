// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { makeCompute } from './compute';
import { KPI_BY_ID } from './kpis';
import { buildSales, type QueryTableLike } from './load';
import { lastClosedMonth } from './model';

const insp = resolve(__dirname, '../../../../../inspection');
const has = ['angebote', 'forecast', 'dims'].every((n) => existsSync(resolve(insp, `${n}.result.json`)));
const read = (n: string): QueryTableLike => {
  const j = JSON.parse(readFileSync(resolve(insp, `${n}.result.json`), 'utf8'));
  return (j.result ?? j).table;
};

describe.skipIf(!has)('sales model on real data', () => {
  const data = has ? buildSales({ angebote: read('angebote'), forecast: read('forecast'), dims: read('dims') }) : null!;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const c = has ? makeCompute(data, { year: 2022, months, filter: {} }) : null!;

  it('loads all offers and forecast deals', () => {
    expect(data.deals.length).toBeGreaterThan(9000);
    expect(data.forecast.length).toBe(3362);
    expect(data.members.bundesland.every((b) => !/^\s|^\u00a0/.test(b))).toBe(true);
    expect(lastClosedMonth(data, 2022)).toBe(12);
    expect(lastClosedMonth(data, 2023)).toBe(4);
  });

  it('matches the profiled yearly figures', () => {
    // Profile (snapshot 2023-04-30): won 2022 60.16 Mio / 1,321 deals, 2021 45.33 Mio / 1,027.
    expect(c.total(KPI_BY_ID.won) / 1e6).toBeCloseTo(60.16, 1);
    expect(c.total(KPI_BY_ID.wonN)).toBe(1321);
    expect(c.total(KPI_BY_ID.won, { year: 2021 }) / 1e6).toBeCloseTo(45.33, 1);
    expect(c.total(KPI_BY_ID.cycle)).toBeCloseTo(129.2, 0);
    expect(c.total(KPI_BY_ID.fc, { year: 2023 }) / 1e6).toBeCloseTo(40.17, 1);
  });

  it('member values add up to the total for additive KPIs', () => {
    const rows = c.byMember(KPI_BY_ID.won, 'vertriebler');
    const sum = rows.reduce((a, r) => a + r.ac, 0);
    expect(sum).toBeCloseTo(c.total(KPI_BY_ID.won), 0);
    const top = rows.sort((a, b) => b.ac - a.ac)[0];
    expect(top.member).toBe('Michael');
  });

  it('respects member filters', () => {
    const f = { vertriebler: ['Michael'] };
    expect(c.total(KPI_BY_ID.won, { filter: f }) / 1e6).toBeCloseTo(13.65, 1);
  });
});
