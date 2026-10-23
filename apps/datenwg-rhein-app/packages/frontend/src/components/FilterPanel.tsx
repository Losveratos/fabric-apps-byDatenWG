// MockupKitchen filter panel (right), collapses to a slim rail. Months
// (toggles plus season quick picks), epochs, time axis of the overview chart,
// share link and reset. Filters apply to every page.

import { ChevronLeft, ChevronRight, Link2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { REF_LABEL } from '@/components/overview/shared';
import { Switch } from '@/components/Tile';
import { useRhein } from '@/hooks/rhein.context';
import type { Grain } from '@/lib/rhein/compute';
import { fmtDate } from '@/lib/rhein/format';
import { EPOCHS, MONTHS } from '@/lib/rhein/model';
import { cn } from '@/lib/utils';

const QUICK: { label: string; months: number[]; title: string }[] = [
  { label: 'Sommer Jun bis Aug', months: [6, 7, 8], title: 'Juni, Juli, August' },
  { label: 'Spätsommer Aug, Sep', months: [8, 9], title: 'August und September, die Niedrigwasserzeit' },
  { label: 'Winter Dez bis Feb', months: [12, 1, 2], title: 'Dezember, Januar, Februar' },
  { label: 'ganzes Jahr', months: [], title: 'Alle Monate' },
];

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

const toggleCls = (on: boolean) =>
  cn(
    'rounded-sm py-100 text-100 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
    on ? 'bg-foreground text-background' : 'bg-card hover:bg-accent'
  );

export function FilterPanel() {
  const { view, setView, data, toggleMonth, toggleEpoch, clearFilter } = useRhein();
  const [copied, setCopied] = useState(false);
  const active = view.months.length + view.epochs.length;

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

  const first = data.years[0];
  const last = data.years[data.years.length - 1];

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

      <Section title="Monate">
        <div className="grid grid-cols-4 gap-100" role="group" aria-label="Monate">
          {MONTHS.map((m, i) => {
            const on = view.months.includes(i + 1);
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => toggleMonth(i + 1)} className={toggleCls(on)}>
                {m}
              </button>
            );
          })}
        </div>
        <div className="mt-200 flex flex-wrap gap-100" role="group" aria-label="Schnellauswahl Monate">
          {QUICK.map((q) => {
            const on = sameSet(view.months, q.months);
            return (
              <button
                key={q.label}
                type="button"
                title={q.title}
                aria-pressed={on}
                onClick={() => setView({ months: [...q.months].sort((a, b) => a - b) })}
                className={cn(
                  'rounded-full border px-200 py-100-nudge text-100 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card hover:bg-accent'
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>
        <p className="mt-200 text-100 text-muted-foreground">Keine Auswahl = ganzes Jahr. REF nutzt immer dieselben Monate.</p>
      </Section>

      <Section title="Epochen">
        <div className="grid grid-cols-1 gap-100" role="group" aria-label="Epochen">
          {EPOCHS.map((e) => {
            const on = view.epochs.includes(e);
            return (
              <button key={e} type="button" aria-pressed={on} onClick={() => toggleEpoch(e)} className={cn(toggleCls(on), 'px-200 text-left')}>
                {e}
              </button>
            );
          })}
        </div>
        <p className="mt-200 text-100 text-muted-foreground">
          Keine Auswahl = alle Jahre {first} bis {last}. Vergleich immer mit {REF_LABEL}.
        </p>
      </Section>

      <Section title="Zeitachse">
        <Switch<Grain>
          label="Zeitachse"
          value={view.grain}
          onChange={(g) => setView({ grain: g })}
          options={[
            { id: 'decade', label: 'Dekaden', title: 'Eine Säule je Dekade' },
            { id: 'year', label: 'Jahre', title: 'Eine Säule je Jahr' },
          ]}
        />
        <p className="mt-200 text-100 text-muted-foreground">Gilt für das Zeitdiagramm im Überblick. Datenstand {fmtDate(data.asOf)}.</p>
      </Section>

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-200 font-monospace text-100 font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}
