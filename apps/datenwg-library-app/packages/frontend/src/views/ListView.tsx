import { DataGrid, type GridColumnDef, type Row } from '@microsoft/fabric-datagrid';
import { useCssTheme } from '@microsoft/fabric-visuals';
import { useMemo } from 'react';

import { NodeLink } from '@/components/ui';
import { useApp } from '@/hooks/app.context';
import { docActive, fmtDate, speakers } from '@/lib/library';

/** Sortable, filterable list of every document in the current filter. */
export function ListView() {
  const { lib, filter } = useApp();
  const theme = useCssTheme();

  const rows: Row[] = useMemo(
    () =>
      lib.docs
        .filter((d) => docActive(d, filter))
        .map((d) => ({
          _id: d.id,
          id: d.id,
          title: d.title,
          kind: d.source === 'youtube' ? 'Folge' : 'Seite',
          published: d.published,
          speakers: speakers(lib, d.id)
            .map((x) => x.person.name)
            .join(', '),
          bucket: lib.bucketById.get(lib.bucketOfDoc.get(d.id) ?? '')?.name ?? '',
          claims: d.nClaims,
          segments: d.nSegments,
          themes: (lib.mentionsByDoc.get(d.id) ?? [])
            .slice()
            .sort((a, b) => b.segments - a.segments)
            .slice(0, 4)
            .map((m) => lib.conceptById.get(m.conceptId)?.name)
            .filter(Boolean)
            .join(', '),
        })),
    [lib, filter]
  );

  const columns: GridColumnDef[] = useMemo(
    () => [
      {
        id: 'title',
        header: 'Titel',
        width: 420,
        cellRenderer: (value, row) => (
          <NodeLink id={String(row.id)} className="line-clamp-1">
            {String(value ?? '')}
          </NodeLink>
        ),
      },
      { id: 'kind', header: 'Art', width: 80 },
      {
        id: 'published',
        header: 'Datum',
        width: 110,
        cellRenderer: (value) => <span className="font-monospace text-200">{fmtDate(String(value ?? ''))}</span>,
      },
      { id: 'speakers', header: 'Wer', width: 200 },
      { id: 'bucket', header: 'Bereich', width: 180 },
      { id: 'themes', header: 'Themen', width: 300 },
      { id: 'claims', header: 'Kernaussagen', width: 120, numericStyling: true },
      { id: 'segments', header: 'Segmente', width: 100, numericStyling: true },
    ],
    []
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-500 py-300 text-200 text-muted-foreground">
        {rows.length} Dokumente im Filter. Spalten lassen sich sortieren und filtern, Titel öffnet das Dokument.
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataGrid
          data={rows}
          columns={columns}
          theme={theme}
          defaultSort={[{ columnId: 'published', direction: 'desc' }]}
          rowHeight={36}
        />
      </div>
    </div>
  );
}
