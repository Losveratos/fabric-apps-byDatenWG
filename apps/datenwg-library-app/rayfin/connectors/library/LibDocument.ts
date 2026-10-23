import { entity, int, text, role } from '@microsoft/rayfin-core';
import { Source } from '@microsoft/rayfin-connectors';

/** Lakehouse table dbo.n_document (read-only, keyless). */
@role('authenticated', ['read'])
@entity()
export class LibDocument extends Source({ schema: 'dbo', table: 'n_document', primaryKey: [] }) {
  @text({ optional: true, max: 8000 }) id?: string;
  @text({ optional: true, max: 8000 }) title?: string;
  @text({ optional: true, max: 8000 }) source?: string;
  @text({ optional: true, max: 8000 }) published?: string;
  @text({ optional: true, max: 8000 }) url?: string;
  @text({ optional: true, max: 8000 }) coverage?: string;
  @text({ optional: true, max: 8000 }) format?: string;
  @text({ optional: true, max: 8000 }) bucket?: string;
  @int({ optional: true, column: 'n_claims' }) nClaims?: number;
  @int({ optional: true, column: 'n_segments' }) nSegments?: number;
}
