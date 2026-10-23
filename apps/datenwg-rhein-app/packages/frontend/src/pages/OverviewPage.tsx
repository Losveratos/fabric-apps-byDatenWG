// Überblick (Shneiderman: overview first). KPI row, then the KPI over time
// (decades or years) and per epoch side by side; a year detail on demand.

import { KpiCards } from '@/components/KpiCards';
import { EpochTile } from '@/components/overview/EpochTile';
import { TimeChart } from '@/components/overview/TimeChart';
import { YearDetail } from '@/components/overview/YearDetail';
import { useRhein } from '@/hooks/rhein.context';

export function OverviewPage() {
  const { view } = useRhein();
  return (
    <div className="flex flex-col gap-[18px]">
      <KpiCards />
      <div className="grid gap-[18px] 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TimeChart />
        <EpochTile />
      </div>
      {view.year > 0 && <YearDetail />}
    </div>
  );
}
