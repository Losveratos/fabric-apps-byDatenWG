// MockupKitchen filter panel (right). Collapses to a slim rail ("auf/zu").
// Period, year and member filters; filters apply to every page.

import { Check, ChevronLeft, ChevronRight, Link2, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Switch } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { MONTH_SHORT } from '@/lib/sales/format';
import { DIM_LABEL, type Dim } from '@/lib/sales/model';
import type { PeriodKind } from '@/lib/sales/view';
import { cn } from '@/lib/utils';

const FILTER_DIMS: Dim[] = ['vertriebler', 'bundesland', 'gruppe', 'typ', 'kunde'];

export function FilterPanel() {
  const { view, setView, data, year, lastClosed, filter, clearFilter } = useSales();
  const [copied, setCopied] = useState(false);
  const active = Object.values(filter).reduce((n, s) => n + (s?.length ?? 0), 0);

  if (!view.panel) {
    return (
      <aside aria-label="Filter" className="flex w-[48px] flex-col items-center gap-300 rounded-xl bg-secondary py-300">
        <button
          type="button"
          onClick={() => setView({ panel: true })}
          aria-label="Filter aufklappen"
          title="Filter aufklappen"
          className="rounded-md p-200 text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronLeft className="icon-size-200" />
        </button>
        <SlidersHorizontal className="icon-size-200 text-muted-foreground" aria-hidden="true" />
        {active > 0 && <span className="rounded-full bg-primary px-200-nudge text-100 font-semibold text-primary-foreground">{active}</span>}
      </aside>
    );
  }

  return (
    <aside aria-label="Filter" className="flex w-full flex-col gap-400 rounded-xl bg-secondary p-400 xl:w-[300px]">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-300 font-semibold">Filter</h2>
        <button
          type="button"
          onClick={() => setView({ panel: false })}
          aria-label="Filter zuklappen"
          title="Filter zuklappen"
          className="hidden rounded-md p-100 text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:block"
        >
          <ChevronRight className="icon-size-200" />
        </button>
      </div>

      <Section title="Analysejahr">
        <div className="flex flex-wrap gap-100" role="radiogroup" aria-label="Analysejahr">
          {data.years.map((y) => (
            <button
              key={y}
              type="button"
              role="radio"
              aria-checked={y === year}
              onClick={() => setView({ year: y })}
              className={cn(
                'rounded-sm px-200 py-100 text-200 font-medium focus-visible:outline-2 focus-visible:outline-ring',
                y === year ? 'bg-foreground text-background' : 'bg-card hover:bg-accent'
              )}
            >
              {y}
            </button>
          ))}
        </div>
        <p className="mt-200 text-100 text-muted-foreground">
          Vergleich immer mit dem Vorjahr (PY {year - 1}). Datenstand {data.asOf.split('-').reverse().join('.')}
          {lastClosed < 12 ? `, ${year} nur bis ${MONTH_SHORT[Math.max(0, lastClosed - 1)]} belastbar.` : '.'}
        </p>
      </Section>

      <Section title="Zeitraum">
        <Switch<PeriodKind>
          label="Zeitraum"
          value={view.period}
          onChange={(period) => setView({ period, month: period === 'month' && !view.month ? lastClosed || 12 : view.month })}
          options={[
            { id: 'fy', label: 'Jahr' },
            { id: 'ytd', label: 'YTD', title: lastClosed < 12 ? `Jan..${MONTH_SHORT[Math.max(0, lastClosed - 1)]}` : 'Jan..Dez' },
            { id: 'month', label: 'Monat' },
          ]}
        />
        {view.period === 'month' && (
          <div className="mt-200 grid grid-cols-6 gap-100" role="radiogroup" aria-label="Monat">
            {MONTH_SHORT.map((m, i) => {
              const mm = i + 1;
              const on = (view.month || lastClosed || 12) === mm;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setView({ month: mm })}
                  className={cn(
                    'rounded-sm py-100 text-100 font-medium focus-visible:outline-2 focus-visible:outline-ring',
                    on ? 'bg-foreground text-background' : 'bg-card hover:bg-accent',
                    mm > lastClosed && !on && 'text-muted-foreground italic'
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {FILTER_DIMS.map((d) => (
        <MemberFilter key={d} dim={d} />
      ))}

      <div className="flex flex-col gap-200">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              window.prompt('Link kopieren:', window.location.href);
            }
          }}
          className="inline-flex h-[36px] w-full items-center justify-center gap-200 rounded-md bg-primary text-300 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Link2 className="icon-size-200" aria-hidden="true" /> {copied ? 'Link kopiert' : 'Diese Sicht teilen'}
        </button>
        <button
          type="button"
          disabled={active === 0}
          onClick={() => clearFilter()}
          className="inline-flex h-[32px] w-full items-center justify-center gap-200 rounded-md border border-input bg-card text-200 font-medium hover:bg-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RotateCcw className="icon-size-100" aria-hidden="true" /> Alle Filter aufheben
        </button>
      </div>
    </aside>
  );
}

function MemberFilter({ dim }: { dim: Dim }) {
  const { data, filter, toggleMember, clearFilter } = useSales();
  const [open, setOpen] = useState(dim === 'vertriebler' || dim === 'gruppe');
  const [q, setQ] = useState('');
  const sel = filter[dim] ?? [];
  const list = useMemo(() => {
    const all = data.members[dim];
    const needle = q.trim().toLowerCase();
    const hits = needle ? all.filter((m) => m.toLowerCase().includes(needle)) : all;
    return hits.slice(0, 60);
  }, [data.members, dim, q]);
  const many = data.members[dim].length > 12;

  return (
    <section>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-100 font-monospace text-100 font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
        >
          <ChevronRight className={cn('icon-size-100 transition-transform', open && 'rotate-90')} aria-hidden="true" />
          {DIM_LABEL[dim]}
          {sel.length > 0 && <span className="ml-100 rounded-full bg-primary px-200-nudge text-primary-foreground normal-case">{sel.length}</span>}
        </button>
        {sel.length > 0 && (
          <button type="button" onClick={() => clearFilter(dim)} className="inline-flex items-center gap-100 text-100 text-muted-foreground hover:text-foreground">
            <X className="icon-size-100" aria-hidden="true" /> leeren
          </button>
        )}
      </div>
      {!open && sel.length > 0 && <p className="mt-100 truncate text-100 text-foreground/80">{sel.join(', ')}</p>}
      {open && (
        <div className="mt-200">
          {many && (
            <label className="relative mb-200 block">
              <Search className="pointer-events-none absolute top-1/2 left-200 icon-size-100 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`${DIM_LABEL[dim]} suchen …`}
                aria-label={`${DIM_LABEL[dim]} suchen`}
                className="h-[30px] w-full rounded-md border border-input bg-card pr-200 pl-600 text-200 focus-visible:outline-2 focus-visible:outline-ring"
              />
            </label>
          )}
          <div className={cn(many && 'max-h-[220px] overflow-auto pr-100')}>
            {list.map((m) => (
              <CheckRow key={m} label={m} checked={sel.includes(m)} onClick={() => toggleMember(dim, m)} />
            ))}
            {many && list.length === 60 && <p className="py-100 text-100 text-muted-foreground">Suche eingrenzen, um weitere zu sehen.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-200 font-monospace text-100 font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function CheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-center gap-200 rounded-sm py-[3px] text-left text-200 hover:bg-card focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span
        className={cn(
          'flex size-[14px] shrink-0 items-center justify-center rounded-sm border',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'
        )}
        aria-hidden="true"
      >
        {checked && <Check className="size-[10px]" strokeWidth={3} />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
