# Learnings from building these Fabric Apps

Collected while building the apps in this repo (Rayfin CLI 1.36, Node 22, Windows, October 2026). Fabric Apps is in
preview, so check the [Microsoft Learn docs](https://learn.microsoft.com/fabric/apps/overview) first.

## Create and deploy

1. `npx rayfin login` (Entra SSO in the browser).
2. `npx rayfin up --workspace-id <ws-id> --item-name "<App name>" --yes --json` creates the app item itself; no portal
   step is needed. `rayfin up` adds the hosting URL to `allowedRedirectUris` on its own.
3. Semantic model connectors (`fabric-semanticmodel`): run `npx rayfin up connector apply --name <connector>` and then
   **a second** `rayfin up`. Without it the deployed app reports „Connector '<x>' is not declared“. The message
   „0 applied, 1 skipped“ is normal.
4. Frontend only: `npx rayfin up staticapp deploy --json` (about 20 s).
5. `rayfin up` creates a SQL database named like the item if the data service is on. Apps without own datasets:
   `services.data.enabled: false` in `rayfin.yml`.

Deployed apps only know Fabric SSO; `connector invoke --transport deployed` does not work from the CLI.

## Capacity, region, tenant

- Tenant settings: **Fabric Apps (preview)** and, for semantic models, **Semantic Model Execute Queries REST API**.
- Check the [region availability](https://learn.microsoft.com/fabric/admin/region-availability) before an event.
- **F2 throttles quickly.** `CapacityLimitExceeded` shows up as 429 on queries, „socket hang up“ at the SQL endpoint,
  „SQLDatabase name temporarily unavailable“, 500 or „capacity exhausted“ on deploy. These are not app bugs; use a
  bigger F-SKU or a trial capacity.
- A demo copy of a workspace: Fabric „Branch out to another workspace“, then `rayfin up --workspace-id <new>` per app.

## Toolchain

- **npm 10 fails** in the workspace install („Cannot read properties of null (reading 'edgesOut')“). Use
  `npx -y npm@11 install`, then approve install scripts:
  `npx npm@11 install-scripts approve @swc/core esbuild keytar protobufjs @azure/msal-node-extensions` and
  `npx npm@11 rebuild`.
- **Lockfiles from Windows** only contain the Windows bindings. On Linux (CI, cloud agents) `vite build` / `vitest` fail
  with „Cannot find module @rolldown/binding-linux-x64-gnu“. Without touching the lockfile:
  `npx -y npm@11 install --no-save @rolldown/binding-linux-x64-gnu@<v> @swc/core-linux-x64-gnu@<v> @tailwindcss/oxide-linux-x64-gnu@<v> lightningcss-linux-x64-gnu@<v>`.
- **SWC does not load on Windows** („DACL grants replacement rights …“): set `SWC_NATIVE_BINDING_CACHE` to a local
  folder before build, test and deploy.
- **„Bundle not parseable JavaScript“ on deploy:** the stage 3 decorators of connector entities stay in the bundle. In
  `vite.config.ts`: `react({ useAtYourOwnRisk_mutateSwcOptions(o) { … decorators: true, decoratorVersion: '2022-03' } })`.
- Copying an app folder is faster than a fresh scaffold, but delete copied `*.tsbuildinfo`, `packages/frontend/.env.local`,
  `rayfin/.env` and `rayfin/.deployments.json` first; they point to the old app.

## Tests

- vitest with fork workers runs into timeouts: `pool: 'threads'` and limited `maxWorkers` in `vitest.config.ts`.
- Pure logic specs with `// @vitest-environment node` (jsdom start can take over 60 s under load).
- Specs with real model data: export query results once (`test/data/*.json` as `{columns, rows}`) and assert the sums
  against the model measures.
- Standard check per page: no „NaN“, „undefined“ or „Infinity“ in text and SVG attributes.

## Data and connectors

- **Load once, compute in the browser.** Two or three DAX queries fetch the data at a fine grain (10,000 to 30,000
  rows); KPIs, filters and comparisons are computed in the app. Interaction without waiting, even on small capacities.
  The trade-off: logic in the app is a second truth next to the model, so test it against the model.
- `fabric-semanticmodel` connector with `executeQuery` and delegated auth: users need Read and Build on the model.
  API limits: 100,000 rows or 1 million values, 15 MB, 120 queries per minute and user.
- Keep DAX queries as `.dax` files (`src/queries/<connector>/`, imported with `?raw`) and test them against the model.
- Text columns do not always arrive as strings: force `String()` on text and ID fields.
- Non-breaking spaces (U+00A0) in dimension values survive DAX `TRIM`; trim in JS.
- Empty columns are missing from the JSON answer entirely (no `null`); access columns by name.
- Cut date columns to 10 characters (`YYYY-MM-DD`).
- Compare actuals and plan over the same period („PL to last actual month“), otherwise the variance lies.

## Models in this repo

- **ZlatyLev Showcase:** Direct Lake on a lakehouse, built without Desktop: Parquet via `fab cp` + `fab table load`,
  TMDL skeleton via Python (`entity` partitions, `mode: directLake`, `Sql.Database(<host>, <sql endpoint id>)`,
  `schemaName: dbo`), measures via `te script`, then `fab import` and a refresh. Lakehouse column names without spaces;
  display names via `sourceColumn`. Actuals until August 2026, plan and forecast for the full years.
- **ChartKitchen byDatenWG Demo:** imports the CSV demo data from `data/chartkitchen-demo/merged/` (parameter
  `DemoPfad`); without a gateway it cannot refresh in the service from a local folder. P&L values are stored positive, signs come from `SignConvention` of the account dimension; every one of
  the 5,000 accounts has fact rows, also totals and formula rows (with 0), so filter tiles on L1. Measures [AC] and
  [PY YTD] are known to be off; prefer the GuV and scenario measures.
- **Vertriebscontrolling_Excel_based_3.0:** imports Excel demo data (parameter `Source`). The offers table stacks seven
  monthly snapshots: always filter `RELATED('Pipeline Status'[Sort Order]) = 0`, otherwise everything counts seven
  times. Few „lost“ offers after 2022, so the win rate is not meaningful there.
- **DatenWGLibrary lakehouse:** `fabric-sqlanalytics` connector with keyless entities; load tables with `.first(-1)`.
