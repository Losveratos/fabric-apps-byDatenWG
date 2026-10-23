import { entity, decimal, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.e_explains (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class EdgeExplains extends Source({ schema: 'dbo', table: 'e_explains', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) src?: string;
  @text({ optional: true, max: 8000 }) dst?: string;
  @decimal({ optional: true }) weight?: number;
  @text({ optional: true, max: 8000 }) evidence?: string;
  @text({ optional: true, column: 'doc_id', max: 8000 }) docId?: string;
  @decimal({ optional: true }) share?: number;
  @int({ optional: true }) segments?: number;
  @text({ optional: true, max: 8000 }) role?: string;
}
