import { entity, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.n_person (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class LibPerson extends Source({ schema: 'dbo', table: 'n_person', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) id?: string;
  @text({ optional: true, max: 8000 }) name?: string;
  @int({ optional: true, column: 'doc_count' }) docCount?: number;
}
