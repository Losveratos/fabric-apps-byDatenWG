# DatenWG Showcase · Fabric App aus einer App-Spec

Jedes Template von **ChartKitchen byDatenWG** (C01 bis C13) und **P&L Statement byDatenWG** (T01A bis 12H) einmal,
mit den Original-Visuals über `@dwg/visuals`. Daten per DAX aus dem Modell „ZlatyLev Showcase“ (Direct Lake,
Konnektor `showcase`), synthetische Zahlen aus dem Brauerei-Case Zlatý Lev
([`showcase/CONTRACT.md`](../../showcase/CONTRACT.md)). Dieselbe Spec ergibt den Power-BI-Bericht.

Erzeugt mit

```bash
node dwg/dwg.mjs app page --app apps/datenwg-showcase --spec dwg/specs/showcase.json --connector showcase \
  --model "showcase/ZlatyLev Showcase.SemanticModel"
```

(siehe [`../../dwg/README.md`](../../dwg/README.md)). `src/dwg/**` und `src/vendor/**` nicht von Hand ändern.

## Aufbau

`App.tsx` bindet `DwgShell` mit der ganzen Spec ein (`src/dwg/apps/<spec>.ts`):

- **Navigation oben:** Gruppen (z. B. „ChartKitchen · Zeitverlauf“, „P&L · GuV-Statement“), darunter die Seiten der
  Gruppe mit Template-Kennung. Link je Seite: `#c03`, `#t04b`, …
- **Filter-Panel links:** die Slicer der Spec (`slicers`), Werte per DAX aus dem Modell, Einfach- und
  Mehrfachauswahl, Zurücksetzen. Die Auswahl gilt per TREATAS für alle Kacheln aller Seiten, zusammen mit dem
  Querfilter per Klick in einer Kachel.
- **Erklärtext** je Seite über den Kacheln (`description`).
- Eine Abfrage je Kachel; Filterwechsel fragt die Kacheln der Seite neu ab, Seitenwechsel nur die neue Seite.
  Unter 900 px steht das Panel über den Kacheln.
- **Auflösung** (Schalter oben, Standard FHD): die Seite wird in 1920 px (FHD) bzw. 1280 px (HD, größere Schrift)
  aufgebaut und als Ganzes skaliert; „Fließend“ skaliert nur die Kacheln. Zonen und Kacheln nach dem
  MockupKitchen-Pixelraster (Rand 27, Zwischenraum 18), der Kopf bleibt beim Scrollen stehen.
- **Kopfzeilen** der Visuals (Titelblöcke, Bedienleisten) standardmäßig aus, per Schalter an.

## Stand (19.10.2026)

- Gerüst aus `apps/datenwg-dwg-guv` (nur versionierte Dateien), umbenannt, neue `projectOriginId`.
- Ausliefern: `npx rayfin up --workspace-id <workspace-id> --item-name "DatenWG Showcase" --yes --json`, dann
  `npx rayfin up connector apply --name showcase` und ein zweites `rayfin up`.
- Geprüft: typecheck, lint, 76 Tests, build; Browser-Durchlauf aller 28 Seiten mit dem Showcase-Datensatz
  (in dwg-cli: `npm run test:showcase`), Rahmen-Test `shell.mjs`.
- Derselbe Bericht als PBIP: `showcase/ZlatyLev Showcase.Report` (28 Seiten, Slicer links, Erklärtexte).
