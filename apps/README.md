# Fabric Apps (Rayfin) · Quellcode

Quellcode der Fabric Apps (Rayfin, React). Die Apps selbst (Item-Typ `AppBackend`) werden von der
Fabric-Git-Integration nicht synchronisiert, deshalb liegt ihr Code hier getrennt von den Item-Definitionen im
Hauptverzeichnis. Fabric ignoriert diesen Ordner. Workspace- und Modell-IDs in `rayfin/rayfin.yml` sind Platzhalter
(`<your-workspace-id>`, `<your-semantic-model-id>`), die du vor dem Deploy einsetzt.

| Ordner | App | Datenquelle |
| --- | --- | --- |
| `datenwg-library-app` | Libary App (Wissensgraph) | Lakehouse `DatenWGLibrary`, Connector `fabric-sqlanalytics` |
| `datenwg-pnl-app` | PnL App (GuV mit Simulation) | Semantikmodell `ChartKitchen byDatenWG Demo`, `fact-guv` |
| `datenwg-finance-cockpit` | Finance KPI Cockpit (AC vs PY/PL/FC) | Semantikmodell `ChartKitchen byDatenWG Demo`, `Sales Demo` |
| `datenwg-sales-cockpit` | Vertriebscontrolling (4 Seiten) | Semantikmodell `Vertriebscontrolling_Excel_based_3.0` |
| `datenwg-rhein-app` | Rhein Köln (3 Seiten: Überblick, Saison & Epochen, Niedrigwasser) | Semantikmodell `Rhein Köln Abfluss` (Direct Lake) |
| `datenwg-dwg-spike` | dwg Spike: dieselbe App-Spec wie der Bericht „dwg Spike“, Original-Visuals über [dwg-cli](https://github.com/Losveratos/dwg-cli) | Semantikmodell `ChartKitchen byDatenWG Demo` (Konnektor `guv`) |
| `datenwg-dwg-guv` | DWG GuV: GuV-Statement und Werttreiberbaum aus einer App-Spec | Semantikmodell `ChartKitchen byDatenWG Demo` (Konnektor `guv`) |
| `datenwg-showcase` | Showcase: alle 28 Templates von ChartKitchen und P&L, Filter-Panel, Navigation | Semantikmodell `ZlatyLev Showcase` (Direct Lake, `showcase/`) |

Rhein-App: Die Testdaten (GRDC-Tageswerte) sind wegen der Lizenz nicht im Repo. Neu erzeugen mit den Abfragen unter
`packages/frontend/src/queries/rhein/` und `src/test/data/{tage,station}.json` im Format `{columns, rows}`.

Nicht enthalten: `node_modules`, Build-Ausgaben, `rayfin/.env`, `rayfin/.deployments.json`,
`.env.local` und die `inspection`-Ordner mit Datenexporten. Nach dem Klonen sind diese
Dateien lokal neu zu erzeugen.

## Bauen und deployen (Windows)

```powershell
cd apps\<projekt>
npx -y npm@11 install
$env:SWC_NATIVE_BINDING_CACHE = "<lokaler Ordner>"   # nur falls SWC nicht lädt
npm run typecheck; npm run lint; npm test; npm run build
npx rayfin login
npx rayfin up --workspace-id <workspace-id> --item-name "<App-Name>" --yes --json
# Semantikmodell-Connector: einmal anwenden und ein zweites Mal deployen
npx rayfin up connector apply --name <connector>
npx rayfin up --workspace-id <workspace-id> --item-name "<App-Name>" --yes --json
```

Bekannte Stolpersteine: npm 10 bricht im Workspace-Install ab (npm 11 nehmen),
Fabric Apps nur in unterstützten Regionen, kleine F-SKUs drosseln schnell, der
Vite-Build muss Stage-3-Dekoratoren absenken (`vite.config.ts`).
