// KPI chips of the Analyse page; the selection drives both tiles.

import { useSales } from '@/hooks/sales.context';
import { KPIS } from '@/lib/sales/kpis';
import { cn } from '@/lib/utils';

export function KpiPicker() {
  const { view, setView } = useSales();
  return (
    <div role="radiogroup" aria-label="Kennzahl" className="flex flex-wrap items-center gap-200">
      {KPIS.map((k) => {
        const on = view.kpi === k.id;
        return (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={k.info + (k.warning ? `\n⚠ ${k.warning}` : '')}
            onClick={() => setView({ kpi: k.id })}
            className={cn(
              'inline-flex items-center gap-100 rounded-full border px-300 py-100 text-200 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-input hover:text-foreground'
            )}
          >
            {k.label}
            {k.warning && (
              <span className={cn('text-100', on ? 'text-primary-foreground' : 'text-warm')} title={k.warning} aria-label={`Hinweis: ${k.warning}`}>
                ⚠
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
