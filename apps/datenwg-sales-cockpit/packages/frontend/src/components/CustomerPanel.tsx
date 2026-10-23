// Kundensteckbrief: right-side slide-over with customer KPIs, won € per year,
// product mix, open offers and the latest won deals.

import { X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { IbcsDefs, VariancePill } from '@/components/ibcs/Ibcs';
import { Switch } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { C, makeScale } from '@/lib/ibcs/notation';
import { fmtDate, fmtEuro, fmtRel, relDelta } from '@/lib/sales/format';
import type { Deal } from '@/lib/sales/model';

const FIRST_YEAR = 2018;
const LAST_YEAR = 2024;

type MixScope = 'year' | 'all';

const topN = (m: Map<string, number>, n: number) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);

function mapSum(rows: Deal[], key: (d: Deal) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of rows) m.set(key(d), (m.get(key(d)) ?? 0) + d.summe);
  return m;
}

export function CustomerPanel() {
  const { view, openCustomer } = useSales();
  const name = view.customer;
  if (!name) return null;
  return <PanelBody key={name} name={name} onClose={() => openCustomer(null)} />;
}

function PanelBody({ name, onClose }: { name: string; onClose: () => void }) {
  const { data, year, toggleMember, openCustomer } = useSales();
  const [mix, setMix] = useState<MixScope>('all');
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const s = useMemo(() => {
    const rows = data.deals.filter((d) => d.kunde === name);
    const won = rows.filter((d) => d.status === 'gewonnen');
    const open = rows.filter((d) => d.status === 'offen');
    const lost = rows.filter((d) => d.status === 'verloren');
    const sum = (a: Deal[]) => a.reduce((x, d) => x + (Number.isFinite(d.summe) ? d.summe : 0), 0);
    const wonByYear = new Map<number, number>();
    for (const d of won) wonByYear.set(d.closeY, (wonByYear.get(d.closeY) ?? 0) + d.summe);
    const decided = won.length + lost.length;
    return {
      rows,
      won,
      open,
      sellers: topN(mapSum(rows, (d) => d.vertriebler), 3),
      places: [...new Set(rows.map((d) => [d.stadt, d.bundesland].filter(Boolean).join(', ')))].filter(Boolean).slice(0, 3),
      groups: topN(mapSum(won.length ? won : rows, (d) => d.gruppe), 4),
      wonByYear,
      wonYear: sum(won.filter((d) => d.closeY === year)),
      wonPy: sum(won.filter((d) => d.closeY === year - 1)),
      hasPy: won.some((d) => d.closeY === year - 1),
      pipeline: sum(open),
      quote: decided ? won.length / decided : NaN,
      decided,
      avg: won.length ? sum(won) / won.length : NaN,
      openList: [...open].sort((a, b) => b.summe - a.summe).slice(0, 12),
      lastWon: [...won].sort((a, b) => (a.abschluss < b.abschluss ? 1 : a.abschluss > b.abschluss ? -1 : 0)).slice(0, 10),
    };
  }, [data.deals, name, year]);

  // Escape closes; Tab is trapped inside the panel; focus returns on close.
  const closeFn = useRef(onClose);
  useEffect(() => {
    closeFn.current = onClose;
  });
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeFn.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, []);

  const mixRows = useMemo(() => {
    const src = s.won.filter((d) => mix === 'all' || d.closeY === year);
    return [...mapSum(src, (d) => d.gruppe || 'ohne Gruppe').entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [s.won, mix, year]);

  const rel = s.hasPy ? relDelta(s.wonYear, s.wonPy) : NaN;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-start justify-between gap-300 border-b border-border px-500 py-400">
          <div className="min-w-0">
            <p className="text-100 font-medium tracking-wide text-muted-foreground uppercase">Kundensteckbrief</p>
            <h2 id={titleId} className="font-heading text-500 leading-500 font-semibold break-words">
              {name}
            </h2>
            <dl className="mt-200 space-y-100 text-200">
              <Row k="Vertrieb" v={s.sellers.join(', ')} />
              <Row k="Region" v={s.places.join(' · ')} />
              <Row k="Produkte" v={s.groups.join(', ')} />
            </dl>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Kundensteckbrief schließen"
            className="rounded-md p-100 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="icon-size-300" />
          </button>
        </header>

        <div className="flex flex-col gap-500 px-500 py-400">
          <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-300">
            <Kpi label={`Gewonnen ${year}`} value={fmtEuro(s.wonYear)}>
              {s.hasPy && Number.isFinite(rel) ? (
                <VariancePill value={rel} good={rel >= 0}>
                  {fmtRel(rel)} ggü. VJ
                </VariancePill>
              ) : (
                <span className="text-100 text-muted-foreground">kein Vorjahr</span>
              )}
            </Kpi>
            <Kpi label="Offene Pipeline" value={fmtEuro(s.pipeline)}>
              <span className="text-100 text-muted-foreground">{s.open.length} offene Angebote</span>
            </Kpi>
            <Kpi label="Abschlussquote" value={Number.isFinite(s.quote) ? `${(s.quote * 100).toLocaleString('de-DE', { maximumFractionDigits: 0 })} %` : '–'}>
              <span className="text-100 text-muted-foreground">alle Jahre, {s.decided} entschieden</span>
            </Kpi>
            <Kpi label="Ø Auftragswert" value={fmtEuro(s.avg)}>
              <span className="text-100 text-muted-foreground">{s.won.length} gewonnene Deals</span>
            </Kpi>
            <Kpi label="Anzahl Angebote" value={s.rows.length.toLocaleString('de-DE')}>
              <span className="text-100 text-muted-foreground">alle Jahre</span>
            </Kpi>
          </section>

          <section aria-label="Gewonnen pro Jahr">
            <h3 className="mb-200 text-300 font-semibold">Gewonnen € pro Jahr</h3>
            <YearChart wonByYear={s.wonByYear} year={year} />
          </section>

          <section aria-label="Produktmix">
            <div className="mb-200 flex items-center justify-between gap-200">
              <h3 className="text-300 font-semibold">Produktmix (gewonnen)</h3>
              <Switch<MixScope>
                label="Zeitraum Produktmix"
                value={mix}
                onChange={setMix}
                options={[
                  { id: 'all', label: 'alle Jahre' },
                  { id: 'year', label: String(year) },
                ]}
              />
            </div>
            {mixRows.length === 0 ? (
              <p className="text-200 text-muted-foreground">Keine gewonnenen Deals im Zeitraum.</p>
            ) : (
              <ul className="space-y-100">
                {mixRows.map(([g, v]) => (
                  <li key={g} className="grid grid-cols-[120px_1fr_auto] items-center gap-200 text-200">
                    <span className="truncate" title={g}>
                      {g}
                    </span>
                    <span className="h-[10px] bg-[color:var(--ibcs-track)]" aria-hidden="true">
                      <span className="block h-full" style={{ width: `${Math.max(2, (v / mixRows[0][1]) * 100)}%`, background: C.ac }} />
                    </span>
                    <span className="tabular text-right">{fmtEuro(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Offene Angebote">
            <h3 className="mb-200 text-300 font-semibold">Offene Angebote</h3>
            {s.openList.length === 0 ? (
              <p className="text-200 text-muted-foreground">Keine offenen Angebote.</p>
            ) : (
              <table className="w-full text-200">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-100 font-medium">Topic</th>
                    <th className="py-100 font-medium">Abschluss</th>
                    <th className="py-100 text-right font-medium">Summe</th>
                    <th className="py-100 text-right font-medium">Wsk.</th>
                  </tr>
                </thead>
                <tbody>
                  {s.openList.map((d, i) => (
                    <tr key={`${d.id}-${i}`} className="border-t border-border/60">
                      <td className="max-w-[170px] truncate py-100" title={d.topic}>
                        {d.topic}
                      </td>
                      <td className="tabular py-100 whitespace-nowrap">{fmtDate(d.abschluss)}</td>
                      <td className="tabular py-100 text-right whitespace-nowrap">{fmtEuro(d.summe)}</td>
                      <td className="tabular py-100 text-right">{Number.isFinite(d.wsk) ? `${Math.round(d.wsk)} %` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="Letzte gewonnene Deals">
            <h3 className="mb-200 text-300 font-semibold">Letzte gewonnene Deals</h3>
            {s.lastWon.length === 0 ? (
              <p className="text-200 text-muted-foreground">Noch keine gewonnenen Deals.</p>
            ) : (
              <table className="w-full text-200">
                <tbody>
                  {s.lastWon.map((d, i) => (
                    <tr key={`${d.id}-${i}`} className="border-t border-border/60 first:border-t-0">
                      <td className="tabular py-100 pr-200 whitespace-nowrap">{fmtDate(d.abschluss)}</td>
                      <td className="max-w-[200px] truncate py-100" title={d.topic}>
                        {d.topic}
                      </td>
                      <td className="tabular py-100 text-right whitespace-nowrap">{fmtEuro(d.summe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <footer className="sticky bottom-0 mt-auto border-t border-border bg-card px-500 py-300">
          <button
            type="button"
            onClick={() => {
              toggleMember('kunde', name);
              openCustomer(null);
            }}
            className="w-full rounded-md bg-primary px-400 py-200 text-300 font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
          >
            Nur diesen Kunden filtern
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-200">
      <dt className="w-[64px] shrink-0 text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{v || '–'}</dd>
    </div>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted px-300 py-300">
      <p className="text-100 text-muted-foreground">{label}</p>
      <p className="tabular font-heading text-500 leading-500 font-semibold">{value}</p>
      <div className="mt-100">{children}</div>
    </div>
  );
}

function YearChart({ wonByYear, year }: { wonByYear: Map<number, number>; year: number }) {
  const uid = useId().replace(/:/g, '');
  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) if (wonByYear.has(y) && Number.isFinite(wonByYear.get(y))) years.push(y);
  if (years.length === 0) return <p className="text-200 text-muted-foreground">Keine gewonnenen Deals.</p>;

  const W = 432;
  const H = 170;
  const top = 22;
  const bottom = H - 22;
  const vals = years.map((y) => wonByYear.get(y) ?? 0);
  const sc = makeScale(vals, [bottom, top], 0.05);
  const y0 = sc(0);
  const slot = W / years.length;
  const bw = Math.min(40, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Gewonnen € pro Jahr: ${years.map((y) => `${y} ${fmtEuro(wonByYear.get(y) ?? 0)}`).join(', ')}`}>
      <IbcsDefs uid={uid} />
      {years.map((y, i) => {
        const v = wonByYear.get(y) ?? 0;
        const cx = slot * i + slot / 2;
        const yv = sc(v);
        const hi = y === year;
        const neg = v < 0;
        return (
          <g key={y}>
            <rect x={cx - bw / 2} y={Math.min(y0, yv)} width={bw} height={Math.max(1, Math.abs(yv - y0))} fill={C.ac} opacity={hi ? 1 : 0.55} />
            <text x={cx} y={neg ? yv + 12 : yv - 5} textAnchor="middle" fontSize={10} fontWeight={hi ? 700 : 500} fill={C.ac} className="tabular">
              {fmtEuro(v)}
            </text>
            <text x={cx} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={hi ? 700 : 400} fill={C.cat}>
              {y}
            </text>
          </g>
        );
      })}
      <line x1={0} x2={W} y1={y0} y2={y0} stroke={C.ac} strokeWidth={1.4} />
    </svg>
  );
}
