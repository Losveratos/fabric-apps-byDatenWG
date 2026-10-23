import { entity, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.n_concept (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class LibConcept extends Source({ schema: 'dbo', table: 'n_concept', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) id?: string;
  @text({ optional: true, max: 8000 }) name?: string;
  @text({ optional: true, max: 8000 }) kind?: string;
  @text({ optional: true, max: 8000 }) aliases?: string;
  @int({ optional: true, column: 'doc_count' }) docCount?: number;
}
