// "Deals & Kunden": fast deal list, details on demand.

import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { Fragment, useDeferredValue, useMemo, useState } from 'react';

import { applyStatus, downloadCsv, filterBase, sortDeals, summarize, weighted, type Scope, type SortDir, type SortKey, type StatusFilter } from '@/components/deals/dealsLogic';
import { StatusBadge } from '@/components/deals/StatusBadge';
import { Switch, Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { fmtDate, fmtEuro } from '@/lib/sales/format';
import type { Deal } from '@/lib/sales/model';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: 'abschluss', label: 'Abschluss' },
  { key: 'kunde', label: 'Kunde' },
  { key: 'topic', label: 'Topic' },
  { key: 'vertriebler', label: 'Vertriebler' },
  { key: 'bundesland', label: 'Bundesland' },
  { key: 'gruppe', label: 'Produkt' },
  { key: 'status', label: 'Status' },
  { key: 'summe', label: 'Summe', right: true },
  { key: 'gewichtet', label: 'gewichtet', right: true },
  { key: 'tage', label: 'Tage', right: true },
];

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: 'alle', label: 'alle' },
  { id: 'gewonnen', label: 'gewonnen' },
  { id: 'offen', label: 'offen' },
  { id: 'verloren', label: 'verloren' },
];

const nInt = (v: number) => (Number.isFinite(v) ? v.toLocaleString('de-DE') : '–');

export function DealsPage() {
  const ctx = useSales();
  const { data, year, filter, openCustomer } = ctx;

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('alle');
  const [minWsk, setMinWsk] = useState(0);
  const [scope, setScope] = useState<Scope>('year');
  const [sortKey, setSortKey] = useState<SortKey>('summe');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Deal | null>(null);

  const dq = useDeferredValue(q);

  const base = useMemo(() => filterBase(data.deals, { q: dq, minWsk, scope, year, filter }), [data.deals, dq, minWsk, scope, year, filter]);
  const counts = useMemo(() => {
    const c = { alle: base.length, gewonnen: 0, offen: 0, verloren: 0 };
    for (const d of base) c[d.status] += 1;
    return c;
  }, [base]);
  const rows = useMemo(() => sortDeals(applyStatus(base, status), sortKey, sortDir), [base, status, sortKey, sortDir]);
  const sum = useMemo(() => summarize(rows), [rows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pageCount - 1);
  const slice = rows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'summe' || key === 'gewichtet' || key === 'tage' || key === 'abschluss' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const hasMemberFilter = Object.values(filter).some((s) => s && s.length);

  return (
    <div className="flex flex-col gap-400">
      <Tile
        title="Deals & Kunden"
        sub={`${scope === 'year' ? `Abschlussjahr ${year}` : 'alle Jahre'} · ${nInt(rows.length)} Angebote${hasMemberFilter ? ' · Filter aktiv' : ''}`}
        zoomable={false}
        tools={
          <Switch<Scope>
            label="Zeitraum"
            value={scope}
            onChange={(v) => {
              setScope(v);
              setPage(0);
            }}
            options={[
              { id: 'year', label: 'Analysejahr' },
              { id: 'all', label: 'alle Jahre' },
            ]}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-300">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Suche in Topic, Kunde, Vertriebler, Stadt</span>
            <Search className="icon-size-200 pointer-events-none absolute top-1/2 left-300 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Suche: Topic, Kunde, Vertriebler, Stadt"
              className="w-full rounded-md border border-input bg-card py-200 pr-300 pl-[36px] text-300 focus-visible:outline-2 focus-visible:outline-ring"
            />
          </label>

          <div role="group" aria-label="Status" className="flex flex-wrap gap-100">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={status === c.id}
                onClick={() => {
                  setStatus(c.id);
                  setPage(0);
                }}
                className={cn(
                  'rounded-full border px-300 py-100-nudge text-200 font-medium focus-visible:outline-2 focus-visible:outline-ring',
                  status === c.id ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {c.label} <span className="tabular opacity-70">{nInt(counts[c.id])}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-200 text-200 text-muted-foreground">
            <span>Wsk. offen ab</span>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={minWsk}
              aria-label="Mindest-Wahrscheinlichkeit offener Deals in Prozent"
              onChange={(e) => {
                setMinWsk(Number(e.target.value));
                setPage(0);
              }}
              className="w-[110px] accent-[color:var(--color-primary)]"
            />
            <span className="tabular w-[36px] text-foreground">{minWsk} %</span>
          </label>

          <button
            type="button"
            onClick={() => downloadCsv(rows, `deals-${scope === 'year' ? year : 'alle'}.csv`)}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-200 rounded-md border border-border px-300 py-200 text-200 font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
          >
            <Download className="icon-size-200" aria-hidden="true" />
            CSV exportieren
          </button>
        </div>

        <div className="mt-300 flex flex-wrap items-baseline gap-x-600 gap-y-100 rounded-md bg-muted px-400 py-200 text-300" aria-live="polite">
          <span>
            <span className="tabular font-semibold">{nInt(sum.n)}</span> Angebote
          </span>
          <span>
            Σ Summe <span className="tabular font-semibold">{fmtEuro(sum.summe)}</span>
          </span>
          <span>
            Σ gewichtet (offen) <span className="tabular font-semibold">{fmtEuro(sum.gewichtet)}</span>
          </span>
          <span>
            davon gewonnen <span className="tabular font-semibold">{fmtEuro(sumWon(rows))}</span>
          </span>
          <span className="text-200 text-muted-foreground">Beträge im Quellmodell synthetisch verrauscht</span>
        </div>

        <div className="mt-300 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-200">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className={cn('px-200 py-200 font-medium', c.right && 'text-right')} aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className={cn('inline-flex items-center gap-100 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring', sortKey === c.key && 'text-foreground')}
                    >
                      {c.label}
                      {sortKey === c.key && (sortDir === 'asc' ? <ArrowUp className="icon-size-100" aria-hidden="true" /> : <ArrowDown className="icon-size-100" aria-hidden="true" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((d, i) => {
                const isSel = selected === d;
                const g = weighted(d);
                return (
                  <Fragment key={`${d.id}-${d.topic}-${cur * PAGE_SIZE + i}`}>
                    <tr
                      onClick={() => setSelected(isSel ? null : d)}
                      aria-selected={isSel}
                      className={cn('cursor-pointer border-b border-border/60 hover:bg-hover', isSel && 'bg-accent')}
                    >
                      <td className="tabular px-200 py-100-nudge whitespace-nowrap">
                        <button
                          type="button"
                          aria-expanded={isSel}
                          aria-label={`Details ${d.kunde}, ${d.topic}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(isSel ? null : d);
                          }}
                          className="focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {fmtDate(d.abschluss)}
                        </button>
                      </td>
                      <td className="px-200 py-100-nudge">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomer(d.kunde);
                          }}
                          className="text-left font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {d.kunde}
                        </button>
                      </td>
                      <td className="max-w-[260px] truncate px-200 py-100-nudge" title={d.topic}>
                        {d.topic}
                      </td>
                      <td className="px-200 py-100-nudge whitespace-nowrap">{d.vertriebler}</td>
                      <td className="px-200 py-100-nudge whitespace-nowrap">{d.bundesland}</td>
                      <td className="px-200 py-100-nudge whitespace-nowrap">
                        {d.gruppe}
                        <span className="text-muted-foreground"> · {d.typ}</span>
                      </td>
                      <td className="px-200 py-100-nudge">
                        <StatusBadge deal={d} />
                      </td>
                      <td className="tabular px-200 py-100-nudge text-right whitespace-nowrap" style={d.summe < 0 ? { color: 'var(--ibcs-bad)' } : undefined}>
                        {fmtEuro(d.summe)}
                      </td>
                      <td className="tabular px-200 py-100-nudge text-right whitespace-nowrap text-muted-foreground">{d.status === 'offen' ? fmtEuro(g) : '–'}</td>
                      <td className="tabular px-200 py-100-nudge text-right">{nInt(d.tage)}</td>
                    </tr>
                    {isSel && (
                      <tr className="border-b border-border bg-accent/50">
                        <td colSpan={COLUMNS.length} className="px-400 py-300">
                          <DealDetail deal={d} onCustomer={() => openCustomer(d.kunde)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-200 py-600 text-center text-300 text-muted-foreground">
                    Keine Angebote für diese Auswahl.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav aria-label="Seiten" className="mt-300 flex items-center justify-between gap-300 text-200">
          <span className="text-muted-foreground tabular">
            {rows.length === 0 ? '0 Angebote' : `${nInt(cur * PAGE_SIZE + 1)}–${nInt(Math.min(rows.length, (cur + 1) * PAGE_SIZE))} von ${nInt(rows.length)}`}
          </span>
          <div className="flex items-center gap-200">
            <button
              type="button"
              onClick={() => setPage(cur - 1)}
              disabled={cur <= 0}
              className="rounded-md border border-border px-300 py-100-nudge font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
            >
              Zurück
            </button>
            <span className="tabular">
              Seite {cur + 1} von {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(cur + 1)}
              disabled={cur >= pageCount - 1}
              className="rounded-md border border-border px-300 py-100-nudge font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
            >
              Weiter
            </button>
          </div>
        </nav>
      </Tile>
    </div>
  );
}

function sumWon(rows: Deal[]): number {
  let s = 0;
  for (const d of rows) if (d.status === 'gewonnen' && Number.isFinite(d.summe)) s += d.summe;
  return s;
}

function DealDetail({ deal: d, onCustomer }: { deal: Deal; onCustomer: () => void }) {
  const items: [string, string][] = [
    ['Topic', d.topic],
    ['Kunde', d.kunde],
    ['Vertriebler', d.vertriebler],
    ['Stadt', d.stadt || '–'],
    ['Bundesland', d.bundesland || '–'],
    ['Produktgruppe', d.gruppe || '–'],
    ['Produkttyp', d.typ || '–'],
    ['Menge', nInt(d.menge)],
    ['Summe', fmtEuro(d.summe)],
    ['Status', d.status === 'offen' ? `offen · ${nInt(d.wsk)} %` : d.status],
    ['Angelegt', fmtDate(d.anlage)],
    ['Abschluss', fmtDate(d.abschluss)],
    ['Dauer', `${nInt(d.tage)} Tage`],
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-600 gap-y-200 text-200 md:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onCustomer} className="mt-300 rounded-md bg-primary px-300 py-100-nudge text-200 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
        Kundensteckbrief öffnen
      </button>
    </div>
  );
}
