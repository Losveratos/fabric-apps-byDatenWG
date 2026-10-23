//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ConnectorsRuntime } from '@microsoft/rayfin-connectors';

import {
  connectorConfig as libraryConfig,
  type LibrarySchema,
} from '../../../../rayfin/connectors/library/schema.js';

/** Connector keys must match `name` in rayfin/rayfin.yml. */
export type AppConnectorsSchema = {
  library: LibrarySchema;
};

export const connectorConfigs = {
  library: libraryConfig,
};

/** Category A (GraphQL entity) connectors need no runtime entry. */
export const connectorRuntimes: ConnectorsRuntime = {};
