# Rhein Köln · Build brief for agents

Project: `apps/datenwg-rhein-app` (Rayfin Fabric App, React + TS + Tailwind, Vite).
Frontend code: `packages/frontend/src`. All UI text German. No em dashes or en dashes in UI text.

## Goal
A modern, IBCS-inspired app (ChartKitchen visuals, MockupKitchen page frame) about 209 years of Rhine discharge at Cologne,
same look and interaction model as the other DatenWG apps. The previous app's code is parked as reference in
`packages/frontend/_ref_util/` (Auslastung app: App shell, FilterPanel, KpiCards, Tile, VarIntChart, StructureBridge,
SmallMultiples, MemberMultiples, EmployeeRanking …). Port from there, do not import from there.
Shneiderman mantra: overview first, zoom and filter, details on demand. Three pages:
`overview` (Überblick), `season` (Saison & Epochen), `lowwater` (Niedrigwasser).

## Data (fixed contract, do not change these files)
- `lib/rhein/model.ts`: Day, RheinData (days, years 1817..2025 complete only, station, p05 ≈ 1.090 m³/s, asOf), YearStat,
  Epoch ('vor 1920' | '1920 bis 1995' | 'ab 1996'), EPOCHS, REF_FROM/REF_TO (1817..1920), MONTHS, yearStats, percentileInc, monthProfile.
- `lib/rhein/kpis.ts`: KpiDef {id, label, short, unit 'm3s'|'pct'|'days', higherBetter, info, ofYear, ofYears}, KPIS
  (mq, nq, hq, nm7q, below), KPI_BY_ID, favourable. Polarity: more water at low flow = good (teal), larger floods (hq) and
  more days below P05 = bad (red).
- `lib/rhein/format.ts`: fmt, fmtDelta, fmtRel, relDelta, fmtNum, fmtDate, unitLabel.
- `lib/rhein/compute.ts`: makeCompute → stats(months), total(kpi,{months,epochs}), ref(kpi,{months}) (= same months 1817..1920),
  series(kpi, 'decade'|'year') → Point {key,label,epoch,ac,ref,active,years}, byEpoch(kpi), byMonth(kpi,{epochs}),
  profile(years) (12 monthly means), ranking(kpi,'asc'|'desc',n).
- `lib/rhein/view.ts`: View (page, kpi, months[], epochs[], grain, multDim 'epoch'|'decade', multScale, year, panel), toHash/fromHash.
- `hooks/rhein.context.ts`: `useRhein()` = all of the above plus data, view, setView, kpi, selectionText, toggleMonth,
  toggleEpoch, clearFilter, openYear.
- `hooks/rhein-provider.ts`: `useRheinContextValue(data, view, setView, update)`; `hooks/use-rhein-data.ts`: `useRheinData()`.
- Tests: `test/rhein-fixture.tsx` → `<RheinTestProvider view={...}>` with the REAL daily data (76,397 days). Use it in specs.

Facts: 1816-11-01..2025-12-31, complete years 1817..2025, 22 decades (1810er..2020er). There is no plan or forecast.
The comparison is **REF = reference period 1817..1920 for the same months**, drawn grey like PY and always labelled "REF 1817–1920"
is not allowed (no dashes): write "REF 1817 bis 1920". Licence: GRDC raw data, internal use only; the app shows it only to
signed-in users. Footer: "Daten: GRDC (BfG), Rohdaten WSV · nur interne Nutzung".

## Design rules (ChartKitchen, IBCS-inspired)
- AC solid dark #404040, REF grey #a8a8a8 (PY style, label REF). Good = Kitchen teal #117865, bad = #c0392b, via `favourable`.
- Reuse `components/Tile.tsx`, `components/ibcs/Ibcs.tsx`, `lib/ibcs/notation.ts` (owned by agent A; B and C must not edit them).
- Integrated variance charts (Δ% pins, Δ columns, AC vs REF), small multiples in zoom, filter chips above the page, dark mode,
  view in the URL hash. No variance bridges that sum: these KPIs are not additive, show Δ per bucket and say so.
- Each tile has a short Kernaussage computed from the data (e.g. "Seit 1996 liegt das Augustwasser 15 % unter der Referenz").
- Tabular numbers, German number format, m³/s as unit label.

## Working rules
- Only edit/create the files you own. Never touch `lib/rhein/*`, `hooks/rhein*`, `queries/*`, `rayfin/*`, `test/data/*`.
- Check: `cd packages/frontend`, `npx tsc -p tsconfig.json --noEmit` (ignore errors in files of others still in progress),
  `npx eslint <your files>`, `npx vitest run <your specs>`. Env: `$env:SWC_NATIVE_BINDING_CACHE='C:\swc-cache'`.
  Use PowerShell; write files with the Write tool. Logic specs with `// @vitest-environment node`.
- Specs: render with real data, assert no "NaN|undefined|Infinity" in text and SVG attributes, plus key interactions.
- Do not deploy, do not run `rayfin up`, do not touch git.
