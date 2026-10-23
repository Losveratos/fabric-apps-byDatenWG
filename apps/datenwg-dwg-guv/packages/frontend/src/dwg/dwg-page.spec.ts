// dwg: Tests der Seiten-Hilfsfunktionen. Von `dwg app page` geschrieben, wird bei jedem Lauf ersetzt.
import { describe, expect, it } from 'vitest';

import { daxQuery } from '../vendor/dwg-visuals/dwg-visuals.js';
import { selectionFilters, selectionLabel, tileBox, tileFilters, type DwgPageSpec } from './dwg-page';

const page: DwgPageSpec = {
  name: 'Test',
  width: 1920,
  height: 1080,
  filters: [{ column: "'Calender'[Year]", values: [2026] }],
  tiles: [
    { id: 'a', visual: 'chartkitchen', rect: [0, 0, 960, 540], bindings: { category: "'Calender'[Month Name Short]", actual: "'Sales Demo'[AC]" } },
    { id: 'b', visual: 'chartkitchen', rect: [960, 0, 960, 540], bindings: { category: "'Sales Demo'[Country]", actual: "'Sales Demo'[AC]" } },
  ],
};

describe('dwg-page', () => {
  it('macht aus einer Auswahl TREATAS-Filter je Spalte', () => {
    const f = selectionFilters({ tile: 'a', keys: [{ 'Calender[Month Name Short]': 'Mär' }, { 'Calender[Month Name Short]': 'Apr' }] });
    expect(f).toEqual([{ column: "'Calender'[Month Name Short]", values: ['Mär', 'Apr'] }]);
  });

  it('filtert nur die anderen Kacheln, die Seitenfilter gelten überall', () => {
    const sel = { tile: 'a', keys: [{ 'Calender[Month Name Short]': 'Mär' }] };
    expect(tileFilters(page, 'a', sel)).toHaveLength(1);
    expect(tileFilters(page, 'b', sel)).toHaveLength(2);
    const q = daxQuery('chartkitchen', page.tiles[1].bindings, { filters: tileFilters(page, 'b', sel) });
    expect(q.query).toContain(`TREATAS({"Mär"}, 'Calender'[Month Name Short])`);
    expect(q.query).toContain(`TREATAS({2026}, 'Calender'[Year])`);
  });

  it('nimmt eigene Kachelfilter nur in diese Kachel mit', () => {
    const p: DwgPageSpec = {
      ...page,
      tiles: [page.tiles[0], { ...page.tiles[1], filters: [{ column: "'Sales Demo'[Country]", values: ['DE', 'AT'] }] }],
    };
    expect(tileFilters(p, 'a', null)).toHaveLength(1);
    expect(tileFilters(p, 'b', null)).toEqual([...page.filters!, { column: "'Sales Demo'[Country]", values: ['DE', 'AT'] }]);
    const sel = { tile: 'a', keys: [{ 'Calender[Month Name Short]': 'Mär' }] };
    expect(tileFilters(p, 'b', sel)).toHaveLength(3);
  });

  it('beschriftet den Filter-Chip', () => {
    expect(selectionLabel({ tile: 'a', keys: [{ 'Sales Demo[Country]': 'DE' }] })).toBe('Country: DE');
    expect(selectionLabel(null)).toBe('');
  });

  it('skaliert Kacheln wie Power BI und stapelt sie auf schmalen Bildschirmen', () => {
    expect(tileBox(page.tiles[1], page, 960)).toEqual({ position: 'absolute', left: 480, top: 0, width: 480, height: 270 });
    expect(tileBox(page.tiles[1], page, 600).position).toBe('relative');
  });
});
