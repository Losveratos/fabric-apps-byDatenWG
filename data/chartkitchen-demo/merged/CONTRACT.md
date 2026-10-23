# Datenkontrakt — ChartKitchen byDatenWG Demo (merged)

Alle Dateien liegen in `data/chartkitchen-demo/merged/` (Eingaben in `../industrial/` und `../sources/`).

**Globale Konventionen (verbindlich, das Semantikmodell ist genau darauf verdrahtet):**

- Trennzeichen `;`
- Encoding UTF-8 **ohne** BOM, `Encoding = 65001`
- Dezimaltrennzeichen `.` (Punkt), Typisierung in M mit Culture `"en-US"`
- Datumsspalten im ISO-Format `YYYY-MM-DD`
- Keine Tausendertrennzeichen
- Leere Zahl = leeres Feld (nicht `0`), wenn "existiert nicht" gemeint ist
- Zeilenende `\r\n`, Quoting nur wo nötig (`QuoteStyle.Csv`)
- Alle Zufälligkeit deterministisch: fixer Seed + Wärmestreifen-Serien

---

## 1. Stern „P&L" (Konzern-GuV)

### `dim-konten.csv` — UNVERÄNDERTE Kopie aus `demoData/industrial/dim-konten.csv`

16 Spalten, 5.000 Zeilen. **Nicht anfassen** — das Custom Visual
`pnlByDatenWG…` ist exakt darauf verdrahtet (Levels-Modus, SortOrder = 6 × Zeilenposition).

```
AccountID;ParentAccountID;Name;L1;L2;L3;L4;L5;L6;SortOrder;RowType;FormulaDef;SignConvention;DisplayInvert;VarianceInvert;Kommentar
```

### `fact-guv.csv` — NEU generiert

```
AccountID;Monat;Datum;AC;PY;PL;FC;FC_FY;PL_FY
```

| Spalte | Typ | Bedeutung |
|---|---|---|
| `AccountID` | text | FK → `dim-konten.AccountID`, alle 5.000 |
| `Monat` | text | `2026-01` … (Slicer-Spalte, bleibt erhalten) |
| `Datum` | date | Monatserster ISO, `2026-01-01` → Beziehung zu `Calender[Date]` |
| `AC` | number | Ist. **Leer** für Monate nach `2026-08` (YTG-Story) |
| `PY` | number | Vorjahres-Ist desselben Kontos/Monats (echte Fortschreibung) |
| `PL` | number | Plan (Monatsverteilung) |
| `FC` | number | Rolling Forecast: = AC für geschlossene Monate, Prognose danach |
| `FC_FY` | number | FY-Skalar, auf **jeder** Zeile des Jahres identisch |
| `PL_FY` | number | FY-Skalar, auf **jeder** Zeile des Jahres identisch |

- Zeitachse: **2024-01 … 2026-12 = 36 Monate** → 5.000 × 36 = **180.000 Zeilen**
- „Heute" = **2026-08-24**, letzter Ist-Monat = **2026-08**
- ⚠️ **30k-Regel:** Das Custom Visual verkraftet 30.000 DataView-Zeilen.
  Die P&L-Seite wird deshalb per Seitenfilter auf **genau 6 Monate**
  (`2026-01`…`2026-06`) fixiert — das hält auch die SortOrder-Skala
  (6 × Zeilenposition) gültig. Andere Visuals dürfen alle 36 Monate nutzen.
- Werte in **EUR** (nicht mEUR), damit die vorhandenen Abnahmewerte skalieren.
- Vorzeichen: wie in `dim-konten.SignConvention` vorgesehen — Aufwandskonten
  werden als **negative** Beträge geliefert (SignConvention −1 dreht sie im Visual).
  Genau wie im Alt-Datensatz `demoData/industrial/fact-guv.csv`.

---

## 2. Stern „Sales & Financial"

### `sales-fact.csv` — NEU generiert, **breit** (wird in M entpivotiert)

```
Date;Scenario;Product;Category;Country;Region;Revenue;Cost;COGS;Profit;Units Sold;Discount;Marketing Spend;Orders;Returned Units;New Customers;Customer Satisfaction
```

- 17 Spalten. Die 6 linken sind Schlüssel, die 11 rechten werden zu `KPI`/`Value` entpivotiert.
- **`Cost` ist neu** (= COGS + Discount + Marketing Spend). Damit funktioniert die
  vorhandene Berechnungsgruppe `GuV Bruecke` (Revenue / Cost / Profit) endlich.
- `Profit` = `Revenue` − `Cost` (muss exakt aufgehen).
- Zeitachse: **2023-01 … 2026-12 = 48 Monate**, Monatserster ISO.
- Szenarien: `AC` (nur bis 2026-08), `PL1`, `PL2`, `FC1`, `FC2`, `FC3`.
  `PY` wird **nicht** als Szenario geliefert (Measure `PY` rechnet per DATEADD).
- Dimensionen: 3 Regionen · 18 Länder · 4 Kategorien · 12 Produkte.
- `Customer Satisfaction` als Zahl 0–100 mit einer Nachkommastelle.

### `dim-produkt.csv`
```
Product;ProduktID;Category;Produktlinie;Einfuehrung;Zielmarge_pct;Lebenszyklus;Farbe
```
`Product` ist eindeutig und Join-Schlüssel auf `Sales Demo[Product]`.
`Lebenszyklus` ∈ {`Launch`,`Wachstum`,`Reife`,`Auslauf`}. `Einfuehrung` ISO-Datum.

### `dim-markt.csv`
```
Country;Region;ISO2;Waehrung;Breitengrad;Laengengrad;KlimaOrt;Marktreife
```
`Country` eindeutig, Join auf `Sales Demo[Country]`.
`KlimaOrt` verweist auf `dim-ort.Ort` (Brücke zum Klima-Stern) — für jedes Land gesetzt.
`Marktreife` ∈ {`Kernmarkt`,`Wachstumsmarkt`,`Aufbaumarkt`}.

### `dim-szenario.csv`
```
Scenario;Szenario_Name;Szenario_Kurz;IBCS;Typ;Sortierung
```
`Scenario` eindeutig, Join auf `Sales Demo[Scenario]`.
`IBCS` ∈ {`AC`,`PL`,`FC`,`PY`}, `Typ` ∈ {`Ist`,`Plan`,`Forecast`}.

### `dim-kpi.csv`
```
KPI;KPI_Gruppe;Einheit;Format;HoeherIstBesser;Sortierung
```
`KPI` eindeutig, muss **exakt** die 11 entpivotierten Spaltennamen enthalten
(`Revenue`,`Cost`,`COGS`,`Profit`,`Units Sold`,`Discount`,`Marketing Spend`,
`Orders`,`Returned Units`,`New Customers`,`Customer Satisfaction`).
`HoeherIstBesser` ∈ {`true`,`false`}.

---

## 3. Stern „Klima" (Wärmestreifen)

Quelle: `../sources/waermestreifen_demo.csv` (eigene Demodaten)
(60 Orte × 176 Jahre 1850–2025, Regionen `Europa` / `Welt`).

### `dim-ort.csv`
```
OrtID;Ort;Land;Region;Breitengrad;Laengengrad;MittelC_1961_1990;Klimazone
```
60 Zeilen. `OrtID` = `O001`…`O060`, stabil nach erstem Auftreten in der Quelle.
`Klimazone` aus dem Breitengrad abgeleitet (`Tropisch`/`Subtropisch`/`Gemäßigt`/`Subpolar`/`Polar`).

### `fact-klima.csv`
```
OrtID;Jahr;AnomalieC;TemperaturC;Anomalie_gleitend_10J
```
60 × 176 = 10.560 Zeilen. `TemperaturC` = `MittelC_1961_1990` + `AnomalieC`.
`Anomalie_gleitend_10J` = zentriertes 10-Jahres-Mittel (Ränder mit kürzerem Fenster).

### `dim-jahr.csv`
```
Jahr;Dekade;Jahrhundert;Periode
```
1850–2025. `Periode` ∈ {`Vorindustriell`,`Industrialisierung`,`Nachkriegszeit`,`Moderne`,`Klimawandel`}.

---

## 4. Unveränderte Übernahmen

- `gantt.csv` — Inhalt aus `../sources/gantt_demo_daten.csv`,
  umgestellt auf den globalen Kontrakt (`;`, UTF-8 ohne BOM, ISO-Datum).
- `guv-wasserfall.csv` — Inhalt aus `../sources/guv_wasserfall_demo.csv`,
  umgestellt auf `.`-Dezimaltrennzeichen (Komma → Punkt), sonst identisch.

---

## 5. Trend-Engine (Wärmestreifen als Treiber)

Kern der Aufgabe „coole Trends simulieren": **kein weißes Rauschen.**
Die 60 Anomalie-Serien liefern echte Autokorrelation, Trendbrüche und
Volatilitäts-Cluster. Verfahren:

1. Je Ort die Serie `AnomalieC` (1850–2025) laden, **z-standardisieren**
   → 60 wiederverwendbare Signale mit realistischer Struktur.
2. Jede Business-Entität (Produkt×Land, Konto, Segment) bekommt über einen
   **deterministischen Hash** (fixer Seed `20260824`) ein Paar
   (Ort, Startjahr-Offset) zugewiesen.
3. Die letzten *N* Jahre der Serie werden auf die *N* Monate der
   Business-Zeitachse gemappt → multiplikativer Treiber
   `faktor = exp(alpha * z)` mit `alpha` je KPI-Gruppe (0.03 … 0.12).
4. Darüber gelegt: Monats-Saisonalität, Wachstumstrend, Preis-/Mengen-Split,
   Szenario-Deltas (PL glatt, FC = Ist bis Redaktionsschluss + Rest-Plan).

### Eingebaute Storys (müssen in den Daten sichtbar sein)

| # | Story | Wo |
|---|---|---|
| 1 | **Produkt-Launch** „Neuro Hub" ab 2025-07: von 0 auf Hockeystick | Sales, Produkt |
| 2 | **Lieferketten-Schock** 2024-Q3/Q4: COGS-Spike +18 %, Marge bricht ein, Erholung ab 2025-Q2 | Sales + P&L (Material) |
| 3 | **Auslaufprodukt** „Coffee Machine": Volumen −40 % über 3 Jahre, Discount steigt | Sales |
| 4 | **Turnaround Brasilien**: 2023/24 tief rot, ab 2025-Q3 über Plan | Sales, Land |
| 5 | **Mid-Year-Konsolidierung** (M&A): Gesellschaft mit AC/PL erst ab 2025-04, PY leer → Sparkline-Lücke | P&L |
| 6 | **Marketing-Push EMEA** 2026-H1: Marketing Spend +60 %, Revenue folgt mit 2 Monaten Verzug | Sales |
| 7 | **Qualitätsvorfall** 2025-11/12: Returned Units ×3, Customer Satisfaction −12 Punkte, Erholung über 5 Monate | Sales |
| 8 | **Mobility Solutions unter Plan** (~−7 %), Energy Systems + Digital Services überkompensieren | P&L (aus Alt-Datensatz beibehalten) |
| 9 | **Energiepreis-Kopplung**: Konten der Segmente reagieren sichtbar auf die Klima-Treiberserie ihrer Region | P&L ↔ Klima |
| 10 | **YTG-Lücke 2026**: AC endet 2026-08, FC füllt 09–12, PL läuft durch | Beide Sterne |

Zusätzlich beizubehalten (aus dem Alt-Datensatz): 115 ruhende Konten (überall 0),
3 Orphan-Konten, 5 Kommentar-Konten, Formel-/KPI-/Separator-Zeilen.

---

## 6. Pflicht-Artefakte des Generators

- `generate_merged_demo.py` — ein Skript, reproduzierbar, keine Netzwerkzugriffe
- `README.md` — Beschreibung aller Tabellen, Storys, Abnahmewerte
- `reconciliation.txt` — Soll-Werte (P&L-Zeilen AC/PY/PL/FC je Jahr, Sales-Summen je Szenario/Jahr)
