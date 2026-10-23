// Pure helpers of the low-water page.

import { EPOCHS, type Epoch } from '@/lib/rhein/model';

export const TOP_N = 25;

export function epochTally(
  pool: { epoch: Epoch }[],
  top: { epoch: Epoch }[]
): { epoch: Epoch; years: number; expected: number; counted: number }[] {
  return EPOCHS.map((epoch) => {
    const years = pool.filter((p) => p.epoch === epoch).length;
    return {
      epoch,
      years,
      expected: pool.length ? (top.length * years) / pool.length : 0,
      counted: top.filter((t) => t.epoch === epoch).length,
    };
  }).filter((t) => t.years > 0);
}

export function lowestYears(pts: { key: number; ac: number; active: boolean }[], n = 10) {
  return pts
    .filter((p) => p.active && Number.isFinite(p.ac))
    .sort((a, b) => a.ac - b.ac)
    .slice(0, n);
}
