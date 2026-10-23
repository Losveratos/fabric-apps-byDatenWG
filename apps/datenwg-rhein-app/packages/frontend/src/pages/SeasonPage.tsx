// Page "Saison & Epochen": monthly profile of the selected KPI against
// REF 1817 bis 1920 (integrated variance chart, small multiples in zoom),
// the shift of the seasons across the three epochs, and an epoch × month
// heat table. Every click filters (month toggle, epoch, cell = month+epoch).

import { useId, useState } from 'react';

import { ScenarioTag } from '@/components/ibcs/Ibcs';
import { EpochHeat, type HeatRow } from '@/components/season/EpochHeat';
import { heatMessage, monthMessage, profileMessage } from '@/components/season/messages';
import { MonthMultiples, type MultCard } from '@/components/season/MonthMultiples';
import { MonthVarChart } from '@/components/season/MonthVarChart';
import { SeasonProfile, type ProfileLine } from '@/components/season/SeasonProfile';
import { BIG, buildRows, LINE_STYLE, monthsLabel, REF_TEXT, type BandData } from '@/components/season/varint';
import { Switch, Tile } from '@/components/Tile';
import { useRhein } from '@/hooks/rhein.context';
import { relDelta, unitLabel } from '@/lib/rhein/format';
import { EPOCHS, epochOf, type Epoch } from '@/lib/rhein/model';

function MonthTile() {
  const ctx = useRhein();
  const { kpi, view, setView, toggleMonth, toggleEpoch, byMonth, total, ref, stats, selectionText } = ctx;
  const uid = 'sv' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hiDecade, setHiDecade] = useState<number | null>(null);

  const values = byMonth(kpi, { epochs: view.epochs });
  const rows = buildRows(kpi, values, view.months);
  const band: BandData = { tot: total(kpi), refTot: ref(kpi), label: monthsLabel(view.months) };
  const allSel = !view.months.length;
  const message = monthMessage(kpi, rows, view.epochs);
  const refM = values.map((v) => v.ref);

  const cards = (): MultCard[] => {
    if (view.multDim === 'epoch')
      return EPOCHS.map((e) => ({
        key: e,
        label: e,
        ac: total(kpi, { epochs: [e] }),
        ref: ref(kpi),
        acM: byMonth(kpi, { epochs: [e] }).map((v) => v.ac),
        refM,
        selected: view.epochs.includes(e),
      }));
    const sel = stats();
    const decades = [...new Set(sel.map((s) => s.decade))].sort((a, b) => a - b);
    const perMonth = Array.from({ length: 12 }, (_, i) => stats([i + 1]));
    return decades.map((dec) => ({
      key: String(dec),
      label: `${dec}er`,
      ac: kpi.ofYears(sel.filter((s) => s.decade === dec)),
      ref: ref(kpi),
      acM: perMonth.map((st) => kpi.ofYears(st.filter((s) => s.decade === dec))),
      refM,
      selected: hiDecade === dec,
    }));
  };

  const onPick = (key: string) => {
    if (view.multDim === 'epoch') toggleEpoch(key as Epoch);
    else setHiDecade((h) => (h === Number(key) ? null : Number(key)));
  };

  return (
    <Tile
      title="Monatsprofil gegen REF 1817 bis 1920"
      sub={`${kpi.label} · ${unitLabel(kpi)} · AC gegen ${REF_TEXT}, gleiche Monate · ${selectionText}`}
      message={message}
      tools={(zoomed) =>
        zoomed ? (
          <>
            <Switch
              label="Small Multiples nach"
              value={view.multDim}
              onChange={(v) => setView({ multDim: v })}
              options={[
                { id: 'epoch', label: 'Epochen' },
                { id: 'decade', label: 'Jahrzehnte' },
              ]}
            />
            <Switch
              label="Skala"
              value={view.multScale}
              onChange={(v) => setView({ multScale: v })}
              options={[
                { id: 'shared', label: 'Gemeinsame Skala' },
                { id: 'own', label: 'Eigene Skala' },
              ]}
            />
          </>
        ) : (
          <span className="flex items-center gap-200">
            <ScenarioTag code="AC" />
            <ScenarioTag code="PY">REF</ScenarioTag>
          </span>
        )
      }
    >
      {(zoomed) => (
        <div className="flex flex-col gap-400">
          <MonthVarChart uid={uid} kpi={kpi} rows={rows} band={band} geom={BIG} allSel={allSel} onToggle={toggleMonth} />
          <p className="text-100 text-muted-foreground">
            Klick auf einen Monat filtert ihn (Mehrfachauswahl). Die Kennzahl ist nicht additiv: Δ je Monat, keine Brücke. Vergrößern zeigt Small Multiples.
          </p>
          {zoomed && (
            <MonthMultiples
              list={cards()}
              kpi={kpi}
              shared={view.multScale === 'shared'}
              months={view.months}
              pickHint={view.multDim === 'epoch' ? 'filtert die Epoche' : 'hebt das Jahrzehnt hervor'}
              onPick={onPick}
            />
          )}
        </div>
      )}
    </Tile>
  );
}

function ProfileTile() {
  const { data, profile, view, toggleMonth } = useRhein();
  const lines: ProfileLine[] = EPOCHS.map((e) => ({ epoch: e, values: profile(data.years.filter((y) => epochOf(y) === e)) }));
  const old = lines[0].values;
  const now = lines[2].values;
  return (
    <Tile
      title="Verschiebung der Jahreszeiten"
      sub="Mittlerer Tagesabfluss je Monat · m³/s · drei Epochen"
      message={profileMessage(old, now)}
      tools={
        <span className="flex flex-wrap items-center gap-300 text-100">
          {EPOCHS.map((e) => (
            <span key={e} className="inline-flex items-center gap-100">
              <svg width="18" height="8" aria-hidden="true">
                <line x1="0" x2="18" y1="4" y2="4" stroke={LINE_STYLE[e].stroke} strokeWidth={LINE_STYLE[e].width} strokeDasharray={LINE_STYLE[e].dash} />
              </svg>
              {e}
            </span>
          ))}
        </span>
      }
    >
      <SeasonProfile lines={lines} months={view.months} onToggle={toggleMonth} />
      <p className="pt-200 text-100 text-muted-foreground">
        Immer Mittelwasser, unabhängig von der gewählten Kennzahl. „vor 1920“ entspricht fast der Referenz {REF_TEXT}. Klick auf einen Monat filtert ihn.
      </p>
    </Tile>
  );
}

function HeatTile() {
  const { kpi, byMonth, view, setView } = useRhein();
  const rows: HeatRow[] = EPOCHS.map((e) => ({
    epoch: e,
    cells: byMonth(kpi, { epochs: [e] }).map((v) => ({ ac: v.ac, ref: v.ref, d: v.ac - v.ref, rel: relDelta(v.ac, v.ref) })),
  }));
  return (
    <Tile title="Epochen × Monate" sub={`${kpi.label} · ΔREF% gegen ${REF_TEXT} · alle Epochen und Monate`} message={heatMessage(kpi, rows)}>
      <EpochHeat rows={rows} kpi={kpi} months={view.months} epochs={view.epochs} onPick={(m, e) => setView({ months: [m], epochs: [e] })} />
    </Tile>
  );
}

export function SeasonPage() {
  return (
    <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
      <div className="xl:col-span-2">
        <MonthTile />
      </div>
      <ProfileTile />
      <HeatTile />
    </div>
  );
}
