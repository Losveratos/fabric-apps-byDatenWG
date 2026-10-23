// @generated — do not edit.

// Connector: showcase (fabric-semanticmodel)

import type { ConnectorConfig } from '@microsoft/rayfin-connectors';
import type { FabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';

/**
 * Typed connector schema for "showcase" (fabric-semanticmodel).
 * Plug into your AppConnectorsSchema in your RayfinClient setup.
 */
export type ShowcaseSchema = FabricSemanticModel<'executeQuery'>;

export const connectorConfig = {
  connector: 'fabric-semanticmodel',
} as const satisfies ConnectorConfig;
