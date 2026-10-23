# DatenWG Library · Fabric App

Fabric App (Rayfin) über dem Wissensgraphen der Daten-WG. Liest die Lakehouse-Tabellen
`n_*` / `e_*` / `segments` des Workspace **DatenWG Library** per `fabric-sqlanalytics`-Connector
und zeigt sie als Start-Seite, Graph, Zeitstrahl und Liste mit Detailpanel
(Kernaussagen mit Sprung ins Video auf die Sekunde, Transkript-Zitat, YouTube-Embed).

| Was | Wo |
| --- | --- |
| Fabric-Item | `Libary App` (AppBackend) im Workspace „DatenWG Library" |
| Datenquelle | Lakehouse `DatenWGLibrary`, Connector `library` (read-only, auth: application) |
| Entities | `rayfin/connectors/library/*.ts` (keyless, aus `metadata.json` generiert) |
| Datenschicht | `packages/frontend/src/lib/library.ts` (lädt alle Tabellen einmal, baut Indexe) |
| Views | `packages/frontend/src/views/` (Start, Graph, Timeline, List) |
| Detailpanel | `packages/frontend/src/components/DetailPanel.tsx` |
| Deep-Links | `#n=<knoten>&v=<view>&t=<zeitraum>&s=<quellen>&q=<suche>&f=1` |

## Befehle

```bash
npx rayfin login                      # Entra-SSO im Browser
npm run typecheck && npm run lint     # Gates
npm test                              # Vitest (46 Specs)
npm run build                         # Vite-Build (dist/)
npx rayfin up --workspace-id <workspace-id> --item-name "Libary App" --yes --json
npx rayfin up status --json
npx rayfin connector inspect --name library --entity n_claim --rows 3
```

## Fallstricke auf diesem Rechner

- **npm 10.9.2** scheitert im Workspace-Install mit `Cannot read properties of null (reading 'edgesOut')`.
  Installieren mit `npx -y npm@11 install …`. Install-Scripts einmal freigeben:
  `npx npm@11 install-scripts approve @swc/core esbuild keytar protobufjs @azure/msal-node-extensions`
  und `npx npm@11 rebuild @swc/core esbuild`.
- **SWC** lädt sein natives Binding nicht, wenn `%LOCALAPPDATA%\swc` falsche Rechte hat.
  Vor Build, Test und Deploy setzen:
  `SWC_NATIVE_BINDING_CACHE='C:\swc-cache'`.
- `rayfin up` legt eine **SQL-Datenbank mit dem Item-Namen** an. Meldung
  „item name … for type SQLDatabase is temporarily unavailable" heißt: ein paar Minuten warten, erneut deployen.
- Die Kernaussagen sind automatisch extrahiert; die App kennzeichnet das in jeder Ansicht.
- Auf der **F2** war der Workspace gedrosselt (`CapacityLimitExceeded`), dann scheitern Deploy und Abfragen mit
  irreführenden Meldungen. Der Workspace liegt seit 03.10.2026 auf der Trial-Kapazität FTL64.
- Der Vite-Build muss Stage-3-Dekoratoren absenken (`useAtYourOwnRisk_mutateSwcOptions` in `vite.config.ts`),
  sonst lehnt `rayfin up` das Bundle als „not parseable JavaScript" ab.
- Textspalten kommen über den Connector nicht garantiert als String; `src/lib/library.ts` wandelt alle Felder um.
- Nur Frontend neu ausrollen: `npx rayfin up staticapp deploy --json`.

## Ausbaustufen

- Graph-Modell „DatenWG Library Graph" per Rayfin **Function** (GQL `executeQuery`) anbinden.
- Data-Agent-Fragen aus dem Panel heraus stellen.
- Deep-Links in der Fabric-Portal-Einbettung über `@microsoft/rayfin-app-state-fabric`.
