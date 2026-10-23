// Pure logic of the deal list: filtering, sorting, summary and CSV export.

import { fmtDate } from '@/lib/sales/format';
import type { Deal, DealStatus, Dim, Filter } from '@/lib/sales/model';

export type StatusFilter = 'alle' | DealStatus;
export type Scope = 'year' | 'all';
export type SortKey = 'abschluss' | 'kunde' | 'topic' | 'vertriebler' | 'bundesland' | 'gruppe' | 'status' | 'summe' | 'gewichtet' | 'tage';
export type SortDir = 'asc' | 'desc';

export interface DealQuery {
  q: string;
  status: StatusFilter;
  /** Minimum probability (%) applied to open deals only. */
  minWsk: number;
  scope: Scope;
  year: number;
  filter: Filter;
}

/** Weighted amount: summe · wsk / 100 for open deals, else 0. */
export function weighted(d: Deal): number {
  return d.status === 'offen' ? (d.summe * d.wsk) / 100 : 0;
}

function passesMemberFilter(d: Deal, filter: Filter): boolean {
  for (const dim of Object.keys(filter) as Dim[]) {
    const sel = filter[dim];
    if (sel && sel.length && !sel.includes(d[dim])) return false;
  }
  return true;
}

/** Everything except the status chip (so chip counts can be shown). */
export function filterBase(deals: Deal[], qy: Omit<DealQuery, 'status'>): Deal[] {
  const needle = qy.q.trim().toLowerCase();
  return deals.filter((d) => {
    if (qy.scope === 'year' && d.closeY !== qy.year) return false;
    if (!passesMemberFilter(d, qy.filter)) return false;
    if (d.status === 'offen' && d.wsk < qy.minWsk) return false;
    if (needle) {
      const hay = `${d.topic} ${d.kunde} ${d.vertriebler} ${d.stadt}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export function applyStatus(rows: Deal[], status: StatusFilter): Deal[] {
  return status === 'alle' ? rows : rows.filter((d) => d.status === status);
}

const STATUS_ORDER: Record<DealStatus, number> = { gewonnen: 0, offen: 1, verloren: 2 };

function sortValue(d: Deal, key: SortKey): string | number {
  switch (key) {
    case 'abschluss':
      return d.abschluss;
    case 'kunde':
      return d.kunde.toLowerCase();
    case 'topic':
      return d.topic.toLowerCase();
    case 'vertriebler':
      return d.vertriebler.toLowerCase();
    case 'bundesland':
      return d.bundesland.toLowerCase();
    case 'gruppe':
      return `${d.gruppe} ${d.typ}`.toLowerCase();
    case 'status':
      return STATUS_ORDER[d.status] * 1000 + d.wsk;
    case 'summe':
      return d.summe;
    case 'gewichtet':
      return weighted(d);
    case 'tage':
      return d.tage;
  }
}

export function sortDeals(rows: Deal[], key: SortKey, dir: SortDir): Deal[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x < y) return -sign;
    if (x > y) return sign;
    return 0;
  });
}

export function summarize(rows: Deal[]): { n: number; summe: number; gewichtet: number } {
  let summe = 0;
  let gewichtet = 0;
  for (const d of rows) {
    summe += Number.isFinite(d.summe) ? d.summe : 0;
    gewichtet += weighted(d);
  }
  return { n: rows.length, summe, gewichtet };
}

const csvNum = (v: number) => (Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '');
const csvText = (s: string) => (/[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** CSV with ';' separator and German decimals. */
export function toCsv(rows: Deal[]): string {
  const head = ['Abschluss', 'Kunde', 'Topic', 'Vertriebler', 'Stadt', 'Bundesland', 'Produktgruppe', 'Produkttyp', 'Status', 'Wahrscheinlichkeit %', 'Summe', 'Gewichtet', 'Menge', 'Tage'];
  const lines = rows.map((d) =>
    [
      fmtDate(d.abschluss),
      csvText(d.kunde),
      csvText(d.topic),
      csvText(d.vertriebler),
      csvText(d.stadt),
      csvText(d.bundesland),
      csvText(d.gruppe),
      csvText(d.typ),
      d.status,
      String(Number.isFinite(d.wsk) ? d.wsk : ''),
      csvNum(d.summe),
      csvNum(weighted(d)),
      String(Number.isFinite(d.menge) ? d.menge : ''),
      String(Number.isFinite(d.tage) ? d.tage : ''),
    ].join(';')
  );
  return [head.join(';'), ...lines].join('\r\n');
}

export function downloadCsv(rows: Deal[], filename: string): void {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
