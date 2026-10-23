import type { ReactNode } from 'react';

import { useApp } from '@/hooks/app.context';
import type { Concept, NodeType } from '@/lib/library';
import { TYPE_BG, TYPE_LABEL } from '@/lib/node-types';
import { nodeHref, type View } from '@/lib/route';
import { cn } from '@/lib/utils';

export function TypeBadge({ type, className }: { type: NodeType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-200-nudge py-100-nudge font-monospace text-100 font-medium uppercase tracking-wide',
        TYPE_BG[type],
        className
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

export function Badge({
  children,
  tone = 'muted',
  title,
  className,
}: {
  children: ReactNode;
  tone?: 'muted' | 'accent' | 'warm' | 'outline';
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-sm px-200-nudge py-100-nudge font-monospace text-100 font-medium',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'accent' && 'bg-accent text-accent-foreground',
        tone === 'warm' && 'bg-warm text-warm-foreground',
        tone === 'outline' && 'border border-border text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}

/** A node reference that is a real link (shareable, middle-click opens new tab). */
export function NodeLink({
  id,
  children,
  view,
  className,
}: {
  id: string;
  children: ReactNode;
  view?: View;
  className?: string;
}) {
  const { route, select } = useApp();
  return (
    <a
      href={nodeHref(route, id, view)}
      className={cn(
        'rounded-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring',
        className
      )}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) return;
        e.preventDefault();
        select(id, view);
      }}
    >
      {children}
    </a>
  );
}

export function ConceptChip({ c, count, className }: { c: Concept; count?: number; className?: string }) {
  return (
    <NodeLink
      id={c.id}
      className={cn(
        'inline-flex items-center gap-200-nudge rounded-full border border-border bg-card px-300 py-100 text-200 no-underline hover:border-primary hover:bg-accent hover:no-underline',
        className
      )}
    >
      <span
        className={cn('inline-block size-200 rounded-full', TYPE_BG[c.type])}
        aria-hidden="true"
      />
      <span>{c.name}</span>
      {count != null && (
        <span className="font-monospace text-100 text-muted-foreground">{count}</span>
      )}
    </NodeLink>
  );
}

export function Btn({
  children,
  onClick,
  active,
  tone = 'ghost',
  className,
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  tone?: 'ghost' | 'primary' | 'chip';
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-800 items-center gap-200-nudge rounded-md px-300 text-200 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50',
        tone === 'ghost' && 'border border-border bg-card text-foreground hover:bg-accent',
        tone === 'primary' && 'bg-primary text-primary-foreground hover:opacity-90',
        tone === 'chip' &&
          (active
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'),
        className
      )}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <h3 className="mt-500 mb-200 flex items-center gap-200 font-heading text-200 font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {hint}
    </h3>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-300 text-200 text-muted-foreground">{children}</p>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}
