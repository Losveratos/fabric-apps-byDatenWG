import type { Deal } from '@/lib/sales/model';

/** Small status badge: gewonnen teal, verloren red, offen neutral with probability. */
export function StatusBadge({ deal }: { deal: Pick<Deal, 'status' | 'wsk'> }) {
  const base = 'inline-flex items-center rounded-full border px-200 py-100-nudge text-100 font-semibold whitespace-nowrap';
  if (deal.status === 'gewonnen')
    return (
      <span className={base} style={{ color: 'var(--ibcs-good)', borderColor: 'var(--ibcs-good)' }}>
        gewonnen
      </span>
    );
  if (deal.status === 'verloren')
    return (
      <span className={base} style={{ color: 'var(--ibcs-bad)', borderColor: 'var(--ibcs-bad)' }}>
        verloren
      </span>
    );
  const w = Number.isFinite(deal.wsk) ? Math.round(deal.wsk) : null;
  return <span className={`${base} border-border text-muted-foreground`}>{w === null ? 'offen' : `offen · ${w} %`}</span>;
}
