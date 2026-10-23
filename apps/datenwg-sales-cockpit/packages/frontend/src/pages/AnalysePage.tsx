// Analyse page (Shneiderman: overview first, zoom and filter, details on
// demand): KPI picker, time analysis (overview or small multiples) and the
// value driver tree.

import { DriverTree } from '@/components/analyse/DriverTree';
import { KpiPicker } from '@/components/analyse/KpiPicker';
import { TimeAnalysis } from '@/components/analyse/TimeAnalysis';

export function AnalysePage() {
  return (
    <div className="flex min-w-0 flex-col gap-400">
      <KpiPicker />
      <TimeAnalysis />
      <DriverTree />
    </div>
  );
}

export default AnalysePage;
