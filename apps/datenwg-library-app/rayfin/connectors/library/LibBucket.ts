import { entity, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.n_bucket (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class LibBucket extends Source({ schema: 'dbo', table: 'n_bucket', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) id?: string;
  @text({ optional: true, max: 8000 }) name?: string;
}
