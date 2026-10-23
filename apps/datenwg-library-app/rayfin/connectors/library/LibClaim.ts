import { entity, decimal, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.n_claim (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class LibClaim extends Source({ schema: 'dbo', table: 'n_claim', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) id?: string;
  @text({ optional: true, max: 8000 }) text?: string;
  @text({ optional: true, max: 8000 }) kind?: string;
  @text({ optional: true, column: 'doc_id', max: 8000 }) docId?: string;
  @decimal({ optional: true, column: 'start_s' }) startS?: number;
  @text({ optional: true, max: 8000 }) precision?: string;
  @text({ optional: true, max: 8000 }) anchor?: string;
  @decimal({ optional: true, column: 'anchor_score' }) anchorScore?: number;
}
