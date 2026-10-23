import { entity, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.segments (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class LibSegment extends Source({ schema: 'dbo', table: 'segments', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) id?: string;
  @text({ optional: true, column: 'doc_id', max: 8000 }) docId?: string;
  @int({ optional: true }) ordinal?: number;
  @text({ optional: true, max: 8000 }) text?: string;
  @text({ optional: true, max: 8000 }) kind?: string;
  @text({ optional: true, max: 8000 }) heading?: string;
  @decimal({ optional: true, column: 'start_s' }) startS?: number;
  @decimal({ optional: true, column: 'end_s' }) endS?: number;
  @decimal({ optional: true, column: 'char_start' }) charStart?: number;
  @decimal({ optional: true, column: 'char_end' }) charEnd?: number;
  @int({ optional: true }) speaker?: number;
}
