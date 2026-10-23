// Tile B "Werttreiberbaum": tree view of the PnL custom visual. Grows left →
// right, cards with a mini monthly AC/PY chart, operator circles on the
// connectors, expand/collapse per node (Shift = whole limb), level buttons,
// re-root on a node and filter on member cards.

import { ChevronLeft } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react';

import { IbcsDefs } from '@/components/ibcs/Ibcs';
import { Switch, Tile } from '@/components/Tile';
import { useSales } from '@/hooks/sales.context';
import { fmtRel, MONTH_SHORT, relDelta } from '@/lib/sales/format';
import { KPI_BY_ID } from '@/lib/sales/kpis';
import { DIM_LABEL, type Dim } from '@/lib/sales/model';
import type { TreeMode } from '@/lib/sales/view';
import { C } from '@/lib/ibcs/notation';

import { fin, isGood } from './analyse-data';
import {
  buildRoot,
  CARD_W,
  COL_GAP,
  findNode,
  initTree,
  layoutTree,
  MAX_CARDS,
  pathLabels,
  toggleNode,
  type TreeState,
  type VNode,
} from './tree';

const MODES: { id: TreeMode; label: string; title: string }[] = [
  { id: 'formula', label: 'Formel', title: 'Auftragseingang = Aufträge × Ø Auftragswert' },
  { id: 'region', label: 'Region', title: 'Σ Bundesländer → Σ Städte' },
  { id: 'product', label: 'Produkt', title: 'Σ Produktgruppen → Σ Produkttypen' },
  { id: 'sales', label: 'Vertrieb', title: 'Σ Vertriebler → Σ Kunden' },
];

type Level = '1' | '2' | '3' | 'all';
const LEVELS: { id: Level; label: string; title: string }[] = [
  { id: '1', label: '1', title: 'Bis Ebene 1 aufklappen' },
  { id: '2', label: '2', title: 'Bis Ebene 2 aufklappen' },
  { id: '3', label: '3', title: 'Bis Ebene 3 aufklappen' },
  { id: 'all', label: 'Alle', title: 'Alle Ebenen aufklappen' },
];

const PAD = 8;
const HOVER_STROKE = 'var(--color-input)';
const CARD_STROKE = 'var(--color-border)';

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const onEnter = (e: KeyboardEvent, act: (shift: boolean) => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    act(e.shiftKey);
  }
};

/** Mini monthly chart of a full card: PY grey behind (1.25× wider, offset right), AC solid. */
function CardChart({ v, x, y, w, h }: { v: VNode; x: number; y: number; w: number; h: number }) {
  const { acM, pyM, metric } = v.node;
  const vals = [...acM, ...pyM].filter(fin);
  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const top = y + 9;
  const bottom = y + h - (min < 0 ? 9 : 0);
  const sy = (val: number) => bottom - ((val - min) / span) * (bottom - top);
  const z = sy(0);
  const colW = w / 12;
  const acW = 0.6 * colW;
  const pyW = 1.25 * acW;
  const cx = (i: number) => x + (i + 0.5) * colW;
  const finIdx = acM.map((a, i) => (fin(a) ? i : -1)).filter((i) => i >= 0);
  const first = finIdx[0];
  const last = finIdx[finIdx.length - 1];
  const ext = finIdx.reduce((b, i) => (b < 0 || Math.abs(acM[i]) > Math.abs(acM[b]) ? i : b), -1);
  const labelled = [first, last, ext].filter((i, k, arr) => i !== undefined && i >= 0 && arr.indexOf(i) === k);
  const show = labelled.filter((i) => i === first || i === last || (Math.abs(i - first) > 2 && Math.abs(i - last) > 2));
  return (
    <g>
      {pyM.map((p, i) =>
        fin(p) && p !== 0 ? <rect key={`p${i}`} x={cx(i) - acW / 2 + 0.2 * colW - (pyW - acW) / 2} y={Math.min(z, sy(p))} width={pyW} height={Math.abs(sy(p) - z)} fill={C.py} /> : null
      )}
      {acM.map((a, i) =>
        fin(a) && a !== 0 ? <rect key={`a${i}`} x={cx(i) - acW / 2} y={Math.min(z, sy(a))} width={acW} height={Math.abs(sy(a) - z)} fill={C.ac} /> : null
      )}
      {show.map((i) => (
        <text
          key={`l${i}`}
          x={Math.min(x + w, Math.max(x, cx(i)))}
          y={acM[i] >= 0 ? Math.min(sy(acM[i]), fin(pyM[i]) && pyM[i] > 0 ? sy(pyM[i]) : z) - 2 : sy(acM[i]) + 8}
          textAnchor={i === first && i <= 1 ? 'start' : i === last && i >= 10 ? 'end' : 'middle'}
          fontSize={7.5}
          fill={C.cat}
        >
          {metric.format(acM[i])}
        </text>
      ))}
      <line x1={x} x2={x + w} y1={z} y2={z} stroke={C.ac} strokeWidth={0.8} />
    </g>
  );
}

function Card({
  v,
  focusable,
  selected,
  canReRoot,
  onCard,
  onToggle,
  onReRoot,
}: {
  v: VNode;
  focusable: boolean;
  selected: boolean;
  canReRoot: boolean;
  onCard: (() => void) | null;
  onToggle: (shift: boolean) => void;
  onReRoot: () => void;
}) {
  const [hover, setHover] = useState(false);
  const n = v.node;
  const { x, y, h } = v;
  const w = CARD_W;
  const d = n.ac - n.py;
  const rel = relDelta(n.ac, n.py);
  const good = isGood(n.metric.higherBetter, d);
  const col = !fin(d) ? C.hair : good ? C.good : C.bad;
  const relTxt = fin(rel) ? fmtRel(rel) : '';
  const tip = [
    n.label,
    `AC ${n.metric.format(n.ac)} · PY ${n.metric.format(n.py)} ${n.metric.unit}`,
    relTxt ? `ΔPY% ${relTxt}` : '',
    n.note ? `enthält: ${n.note}` : '',
    onCard ? (selected ? 'Klick: Filter aufheben' : 'Klick: als Filter setzen') : '',
  ]
    .filter(Boolean)
    .join('\n');
  const chevX = x + w - 18;
  const chevY = y + h - 15;
  const rootX = chevX - 18;
  return (
    <g onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {/* shadow slab + card */}
      <rect x={x} y={y + 1} width={w} height={h} rx={4} fill={CARD_STROKE} opacity={0.6} />
      <rect x={x} y={y} width={w} height={h} rx={4} fill="var(--color-card)" stroke={selected ? C.hilite : hover ? HOVER_STROKE : CARD_STROKE} strokeWidth={selected ? 1.5 : 1} />
      <rect x={x} y={y} width={3} height={h} fill={col} />
      {/* header */}
      <text x={x + PAD} y={y + PAD + 9} fontSize={9.5} fontWeight={600} fill="var(--color-foreground)">
        {clip(n.label, v.compact ? 24 : 14)}
      </text>
      {!v.compact && (
        <text x={x + w - PAD} y={y + PAD + 8} textAnchor="end" fontSize={7.5}>
          <tspan fill={C.sub}>{n.metric.unit}</tspan>
          {relTxt && (
            <tspan dx={4} fill={col} fontWeight={600}>
              {relTxt}
            </tspan>
          )}
        </text>
      )}
      {v.compact ? (
        <text x={x + PAD} y={y + 33} fontSize={10}>
          <tspan fontWeight={600} fill={C.ac}>
            {n.metric.format(n.ac)}
          </tspan>
          {relTxt && (
            <tspan dx={6} fontSize={7.5} fontWeight={600} fill={col}>
              {relTxt}
            </tspan>
          )}
        </text>
      ) : (
        <>
          <text x={x + PAD} y={y + 31} fontSize={11}>
            <tspan fontWeight={700} fill={C.ac}>
              {n.metric.format(n.ac)}
            </tspan>
            <tspan dx={5} fontSize={7.5} fill={C.sub}>
              PY {n.metric.format(n.py)}
            </tspan>
          </text>
          <CardChart v={v} x={x + PAD} y={y + 38} w={w - 2 * PAD} h={h - 38 - 18} />
          <text x={x + PAD} y={y + h - 6} fontSize={7} fill={C.sub}>
            {MONTH_SHORT[0]}..{MONTH_SHORT[11]}
          </text>
        </>
      )}
      {/* whole-card hit area (filter on member cards), drawn below the small controls */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill="transparent"
        role={onCard ? 'button' : 'group'}
        tabIndex={focusable && onCard ? 0 : undefined}
        aria-pressed={onCard ? selected : undefined}
        aria-label={`${n.label}: ${n.metric.format(n.ac)} ${n.metric.unit}${relTxt ? `, ΔPY ${relTxt}` : ''}${onCard ? '. Als Filter umschalten' : ''}`}
        className="outline-none focus-visible:stroke-ring focus-visible:stroke-2"
        style={{ cursor: onCard ? 'pointer' : 'default' }}
        onClick={onCard ?? undefined}
        onKeyDown={onCard ? (e) => onEnter(e, () => onCard()) : undefined}
      >
        <title>{tip}</title>
      </rect>
      {canReRoot && (
        <g>
          <rect
            x={rootX}
            y={chevY}
            width={14}
            height={11}
            rx={3}
            fill={hover ? 'var(--color-muted)' : 'transparent'}
            role="button"
            tabIndex={0}
            aria-label={`${n.label} als Wurzel anzeigen`}
            className="outline-none focus-visible:stroke-ring focus-visible:stroke-2"
            style={{ cursor: 'pointer' }}
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onReRoot();
            }}
            onKeyDown={(e) => onEnter(e, () => onReRoot())}
          >
            <title>Als Wurzel anzeigen</title>
          </rect>
          <text x={rootX + 7} y={chevY + 9} textAnchor="middle" fontSize={9} fill={C.sub} pointerEvents="none">
            ⌖
          </text>
        </g>
      )}
      {v.hasKids && (
        <g>
          <rect
            x={chevX}
            y={chevY}
            width={14}
            height={11}
            rx={3}
            fill="var(--color-muted)"
            role="button"
            tabIndex={0}
            aria-expanded={v.open}
            aria-label={`${n.label} ${v.open ? 'zuklappen' : 'aufklappen'} (Umschalt: ganzen Ast)`}
            className="outline-none focus-visible:stroke-ring focus-visible:stroke-2"
            style={{ cursor: 'pointer' }}
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onToggle(e.shiftKey);
            }}
            onKeyDown={(e) => onEnter(e, onToggle)}
          >
            <title>{v.open ? 'Zuklappen' : 'Aufklappen (Umschalt+Klick: ganzen Ast)'}</title>
          </rect>
          <text x={chevX + 7} y={chevY + 9} textAnchor="middle" fontSize={9} fill={C.cat} pointerEvents="none">
            {v.open ? '▾' : '▸'}
          </text>
        </g>
      )}
    </g>
  );
}

/** Orthogonal connectors parent → children with an operator circle. */
function Connectors({ v }: { v: VNode }) {
  if (!v.open || v.children.length === 0) return null;
  const px = v.x + CARD_W;
  const py = v.y + v.h / 2;
  const busX = px + COL_GAP * 0.62;
  const mids = v.children.map((c) => c.y + c.h / 2);
  const lo = Math.min(py, ...mids);
  const hi = Math.max(py, ...mids);
  const ops = new Set(v.children.map((c) => c.node.op).filter(Boolean));
  const op = ops.size === 1 ? [...ops][0] : null;
  const ocx = px + (busX - px) / 2;
  return (
    <g>
      <line x1={px} x2={busX} y1={py} y2={py} stroke={C.hair} strokeWidth={1} />
      <line x1={busX} x2={busX} y1={lo} y2={hi} stroke={C.hair} strokeWidth={1} />
      {v.children.map((c, i) => (
        <line key={c.node.id} x1={busX} x2={c.x} y1={mids[i]} y2={mids[i]} stroke={C.hair} strokeWidth={1} />
      ))}
      {op && (
        <g>
          <circle cx={ocx} cy={py} r={10} fill="var(--color-card)" stroke={C.ac} strokeWidth={1} />
          <text x={ocx} y={py} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ac}>
            {op}
          </text>
        </g>
      )}
    </g>
  );
}

export function DriverTree() {
  const ctx = useSales();
  const { view, setView, kpi, periodText, filter, toggleMember } = ctx;
  const mode = view.treeMode;
  const uid = 'dt' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [stored, setStored] = useState<TreeState>(() => initTree(mode));
  const st = stored.mode === mode ? stored : initTree(mode);
  const update = (next: TreeState) => setStored(next);

  const root = buildRoot(ctx, mode, kpi);
  const reRooted = st.rootId ? findNode(root, st.rootId) : null;
  const start = reRooted ?? root;
  const layout = layoutTree(start, st);
  const crumbs = reRooted && st.rootId ? pathLabels(root, st.rootId) : [];

  const structural = mode !== 'formula';
  const note = structural && !kpi.additive ? `${kpi.label} ist nicht summierbar; der Baum zeigt deshalb ${KPI_BY_ID.won.label}.` : null;
  const level: Level = st.base === Infinity ? 'all' : (String(Math.min(3, Math.max(1, st.base))) as Level);

  const dAll = root.ac - root.py;
  const relAll = relDelta(root.ac, root.py);
  const kids = layout.root.children.filter((c) => c.node.member);
  const top = kids.length ? kids.reduce((b, c) => (Math.abs(c.node.ac - c.node.py) > Math.abs(b.node.ac - b.node.py) ? c : b)) : null;
  const message = fin(relAll) ? (
    <>
      {root.label} {periodText}{' '}
      <span style={{ color: isGood(root.metric.higherBetter, dAll) ? C.good : C.bad }}>{fmtRel(relAll)}</span> gegenüber PY
      {top && fin(top.node.ac - top.node.py) && !st.rootId ? <>; größte Veränderung: {top.node.label}</> : null}
    </>
  ) : undefined;

  const tools = (
    <>
      <Switch<TreeMode> label="Baumart" value={mode} options={MODES} onChange={(v) => setView({ treeMode: v })} />
      <span className="flex items-center gap-100 text-200 text-muted-foreground">
        Bis Ebene
        <Switch<Level>
          label="Aufklappen bis Ebene"
          value={level}
          options={LEVELS}
          onChange={(l) => update({ ...st, base: l === 'all' ? Infinity : Number(l), open: [], closed: [], deep: [] })}
        />
      </span>
    </>
  );

  const filtered = (dim: Dim, member: string) => (filter[dim] ?? []).includes(member);

  return (
    <Tile title="Werttreiberbaum" sub={`${root.metric.unit} · AC vs PY · ${periodText}`} message={message} tools={tools}>
      {note && <p className="pb-200 text-200 text-muted-foreground">⚠ {note}</p>}
      {st.rootId && (
        <nav aria-label="Baum-Pfad" className="flex flex-wrap items-center gap-100 pb-200 text-200">
          <button
            type="button"
            onClick={() => update({ ...st, rootId: null })}
            className="inline-flex items-center gap-100 rounded-sm px-100 font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronLeft className="icon-size-100" aria-hidden="true" />
            Zurück zum Gesamtbaum
          </button>
          {crumbs.length > 0 && <span className="text-muted-foreground">{[root.label, ...crumbs].join(' › ')}</span>}
          {!reRooted && <span className="text-muted-foreground">(Knoten in der aktuellen Auswahl nicht vorhanden)</span>}
        </nav>
      )}
      <div className="max-h-[70vh] overflow-auto rounded-md">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block"
          role="group"
          aria-label={`Werttreiberbaum ${MODES.find((m) => m.id === mode)?.label ?? ''}`}
        >
          <IbcsDefs uid={uid} />
          {layout.all.map((v) => (
            <Connectors key={`c${v.node.id}`} v={v} />
          ))}
          {layout.all.map((v) => {
            const m = v.node.member;
            const sel = m ? filtered(m.dim, m.member) : false;
            return (
              <Card
                key={v.node.id}
                v={v}
                focusable
                selected={sel}
                canReRoot={v.depth > 0 && v.hasKids}
                onCard={structural && m ? () => toggleMember(m.dim, m.member) : null}
                onToggle={(shift) => update(toggleNode(st, v.node.id, v.open, shift))}
                onReRoot={() => update({ ...st, rootId: v.node.id })}
              />
            );
          })}
        </svg>
      </div>
      <p className="pt-200 text-100 text-muted-foreground">
        {structural ? 'Klick auf eine Karte setzt sie als Filter' : 'Formelbaum: Werte multiplizieren sich entlang der Äste'} · ▸ klappt auf, Umschalt+Klick den ganzen Ast · ⌖
        zeigt den Knoten als Wurzel
        {layout.truncated ? ` · Anzeige auf ${MAX_CARDS} Karten begrenzt` : ''}
        {structural && layout.root.children[0]?.node.member ? ` · Ebene 1: ${DIM_LABEL[layout.root.children[0].node.member.dim]}` : ''}
      </p>
    </Tile>
  );
}
