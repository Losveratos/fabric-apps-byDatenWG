// MockupKitchen tile: title (600) and subtitle (unit · scenarios · period,
// 70 % opacity) on one header band, optional key message, toolbar slot,
// collapse (auf/zu) and zoom to a full-screen overlay (Shneiderman: zoom).

import { ChevronDown, Maximize2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

/** Content can depend on whether the tile is shown zoomed (full screen). */
export type ZoomAware = ReactNode | ((zoomed: boolean) => ReactNode);
const render = (x: ZoomAware | undefined, zoomed: boolean) => (typeof x === 'function' ? x(zoomed) : x);

export function Tile({
  title,
  sub,
  message,
  tools,
  children,
  className,
  bodyClassName,
  zoomable = true,
  collapsible = false,
  defaultCollapsed = false,
}: {
  title: ReactNode;
  sub?: ReactNode;
  message?: ReactNode;
  /** Header tools; a function receives zoomed to offer zoom-only switches. */
  tools?: ZoomAware;
  /** Body; a function receives zoomed (e.g. small multiples only when zoomed). */
  children: ZoomAware;
  className?: string;
  bodyClassName?: string;
  /** Show a zoom button that opens the tile full-screen. */
  zoomable?: boolean;
  /** Show a chevron to collapse the body. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [zoom, setZoom] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom]);

  const header = (inZoom: boolean) => (
    <header className="flex flex-wrap items-start justify-between gap-x-300 gap-y-200 px-400 pt-300">
      <div className="flex min-w-0 items-start gap-200">
        {collapsible && !inZoom && (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Aufklappen' : 'Zuklappen'}
            onClick={() => setCollapsed((c) => !c)}
            className="mt-100-nudge rounded-sm p-100-nudge text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronDown className={cn('icon-size-200 transition-transform', collapsed && '-rotate-90')} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className={cn('font-heading font-semibold', inZoom ? 'text-500 leading-500' : 'text-400 leading-400')}>{title}</h2>
          {sub && <p className="truncate text-200 text-foreground/70">{sub}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-200">
        {render(tools, inZoom)}
        {zoomable && !inZoom && (
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label="Vergrößern"
            title="Vergrößern (Esc schließt)"
            className="rounded-md p-100 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Maximize2 className="icon-size-200" />
          </button>
        )}
        {inZoom && (
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label="Schließen"
            className="rounded-md p-100 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="icon-size-300" />
          </button>
        )}
      </div>
    </header>
  );

  return (
    <>
      <section className={cn('tile', className)}>
        {header(false)}
        {!collapsed && (
          <>
            {message && <p className="px-400 pt-100 text-300 font-medium">{message}</p>}
            <div className={cn('min-h-0 flex-1 px-400 pt-200 pb-400', bodyClassName)}>{!zoom && render(children, false)}</div>
          </>
        )}
      </section>
      {zoom &&
        createPortal(
          <div className="fixed inset-0 z-50 flex bg-foreground/40 p-600 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setZoom(false)}>
            <section className="tile mx-auto w-full max-w-[1600px] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {header(true)}
              {message && <p className="px-400 pt-100 text-300 font-medium">{message}</p>}
              <div className={cn('min-h-0 flex-1 px-600 pt-300 pb-600', bodyClassName)}>{render(children, true)}</div>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}

/** Small segmented switch for chart variants inside a tile header. */
export function Switch<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md bg-muted p-100">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.title}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-sm px-200 py-100-nudge text-200 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
            value === o.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
