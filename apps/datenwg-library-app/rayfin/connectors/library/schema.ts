import type { GraphQLBackedConnector } from '@microsoft/rayfin-connector-fabric-graphql';
import type { ConnectorConfig } from '@microsoft/rayfin-connectors';

import { EdgeAbout } from './EdgeAbout.js';
import { EdgeExplains } from './EdgeExplains.js';
import { EdgeInBucket } from './EdgeInBucket.js';
import { EdgeMentions } from './EdgeMentions.js';
import { EdgeRelatesTo } from './EdgeRelatesTo.js';
import { EdgeSpeaksIn } from './EdgeSpeaksIn.js';
import { LibBucket } from './LibBucket.js';
import { LibClaim } from './LibClaim.js';
import { LibConcept } from './LibConcept.js';
import { LibDocument } from './LibDocument.js';
import { LibPerson } from './LibPerson.js';
import { LibSegment } from './LibSegment.js';

export { EdgeAbout } from './EdgeAbout.js';
export { EdgeExplains } from './EdgeExplains.js';
export { EdgeInBucket } from './EdgeInBucket.js';
export { EdgeMentions } from './EdgeMentions.js';
export { EdgeRelatesTo } from './EdgeRelatesTo.js';
export { EdgeSpeaksIn } from './EdgeSpeaksIn.js';
export { LibBucket } from './LibBucket.js';
export { LibClaim } from './LibClaim.js';
export { LibConcept } from './LibConcept.js';
export { LibDocument } from './LibDocument.js';
export { LibPerson } from './LibPerson.js';
export { LibSegment } from './LibSegment.js';

// `as const satisfies` keeps the literal connector/operations for the marker type.
export const connectorConfig = {
  connector: 'fabric-sqlanalytics',
  operations: ['read'],
  entities: { EdgeAbout, EdgeExplains, EdgeInBucket, EdgeMentions, EdgeRelatesTo, EdgeSpeaksIn, LibBucket, LibClaim, LibConcept, LibDocument, LibPerson, LibSegment },
} as const satisfies ConnectorConfig;

export type LibrarySchema = GraphQLBackedConnector<
  { EdgeAbout: typeof EdgeAbout; EdgeExplains: typeof EdgeExplains; EdgeInBucket: typeof EdgeInBucket; EdgeMentions: typeof EdgeMentions; EdgeRelatesTo: typeof EdgeRelatesTo; EdgeSpeaksIn: typeof EdgeSpeaksIn; LibBucket: typeof LibBucket; LibClaim: typeof LibClaim; LibConcept: typeof LibConcept; LibDocument: typeof LibDocument; LibPerson: typeof LibPerson; LibSegment: typeof LibSegment },
  typeof connectorConfig
>;
