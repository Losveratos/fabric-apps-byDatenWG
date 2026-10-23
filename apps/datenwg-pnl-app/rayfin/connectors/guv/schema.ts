// @generated — do not edit.

// Connector: guv (fabric-semanticmodel)

import type { ConnectorConfig } from '@microsoft/rayfin-connectors';
import type { FabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';

/**
 * Typed connector schema for "guv" (fabric-semanticmodel).
 * Plug into your AppConnectorsSchema in your RayfinClient setup.
 */
export type GuvSchema = FabricSemanticModel<'executeQuery'>;

export const connectorConfig = {
  connector: 'fabric-semanticmodel',
} as const satisfies ConnectorConfig;
