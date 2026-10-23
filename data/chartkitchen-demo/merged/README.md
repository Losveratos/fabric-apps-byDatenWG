# Demodaten „ChartKitchen byDatenWG" (merged)

Erzeugt von `generate_merged_demo.py` (Seed `20260824`, nur Standardbibliothek,
kein Netzwerk, zweimaliges Ausfuehren liefert byte-identische Dateien).
Verbindlicher Kontrakt: `CONTRACT.md`.

**Globale Konventionen:** Trennzeichen `;`, UTF-8 **ohne** BOM, Dezimaltrennzeichen `.`,
ISO-Datum `YYYY-MM-DD`, keine Tausendertrennzeichen, Zeilenende `\r\n`.

## Dateien

| Datei | Zeilen | Spalten | Inhalt |
|---|---:|---:|---|
| `dim-konten.csv` | 5000 | 16 | Kontenhierarchie (Byte-Kopie) |
| `fact-guv.csv` | 180000 | 9 | GuV-Fakten 2024-01…2026-12 |
| `sales-fact.csv` | 61344 | 17 | Sales-Fakten breit, 6 Szenarien |
| `dim-produkt.csv` | 12 | 8 | Produkte |
| `dim-markt.csv` | 18 | 8 | Laender/Regionen |
| `dim-szenario.csv` | 6 | 6 | Szenarien (IBCS) |
| `dim-kpi.csv` | 11 | 6 | KPI-Metadaten |
| `dim-ort.csv` | 60 | 8 | Klima-Orte |
| `fact-klima.csv` | 10560 | 5 | Temperaturanomalien |
| `dim-jahr.csv` | 176 | 4 | Jahre 1850-2025 |
| `gantt.csv` | 27 | 11 | Projektplan |
| `guv-wasserfall.csv` | 13 | 6 | GuV-Wasserfall |

## 1. Stern „P&L" (Konzern-GuV)

* `dim-konten.csv` — **unveraenderte Byte-Kopie** aus `demoData/industrial/`.
  5.000 Zeilen, `SortOrder` = 6 x Zeilenposition, Levels-Modus (`L1`…`L6`)
  und Parent-Child-Modus (`ParentAccountID`) in einer Datei.
* `fact-guv.csv` — 5.000 Konten x 36 Monate (**2024-01 … 2026-12**) = **180.000 Zeilen**.
  Spalten `AccountID;Monat;Datum;AC;PY;PL;FC;FC_FY;PL_FY`, Werte in **EUR**.
  * Zeilenreihenfolge = Dim-Reihenfolge (SortOrder) x Monat aufsteigend.
    Im Seitenfilter **2026-01 … 2026-06** entspricht der DataView-Index damit
    exakt der `SortOrder`-Skala (6 x Zeilenposition) — das Custom Visual sortiert korrekt.
  * `AC` ist **leer** ab 2026-09 (Redaktionsschluss „heute" = 2026-08-24), `FC` fuellt auf.
  * `FC_FY` / `PL_FY` sind Jahres-Skalare, auf jeder Monatszeile des Jahres identisch
    (Measure muss `MAX` sein, nicht `SUM`).
  * Knoten-, Formel-, KPI- und Separator-Zeilen bekommen Faktzeilen mit 0, damit
    sie nicht aus dem DataView fallen.

## 2. Stern „Sales & Financial"

* `sales-fact.csv` — breit, 17 Spalten; die 11 rechten werden in M entpivotiert
  (`KPI` / `Value`). `Cost` = `COGS` + `Discount` + `Marketing Spend`,
  `Profit` = `Revenue` - `Cost` (zeilenweise exakt auf 2 Nachkommastellen).
  12 Produkte x 18 Laender x 48 Monate (2023-01 … 2026-12) x 6 Szenarien;
  `AC` endet mit 2026-08.
* `dim-produkt.csv` (12) · `dim-markt.csv` (18) · `dim-szenario.csv` (6) · `dim-kpi.csv` (11).
* `dim-markt.KlimaOrt` ist die Bruecke zum Klima-Stern (`dim-ort.Ort`).

## 3. Stern „Klima" (Waermestreifen)

* `dim-ort.csv` (60) · `fact-klima.csv` (10.560 = 60 x 176) · `dim-jahr.csv` (176, 1850-2025).
* `TemperaturC` = `MittelC_1961_1990` + `AnomalieC`;
  `Anomalie_gleitend_10J` = zentriertes 10-Jahres-Mittel (Raender mit kuerzerem Fenster).

## 4. Uebernahmen

* `gantt.csv` und `guv-wasserfall.csv` — Inhalte der Quelldateien, umgestellt auf
  `;`, UTF-8 ohne BOM, ISO-Datum und `.` als Dezimaltrennzeichen. Spaltennamen unveraendert.

## Trend-Engine

Kein weisses Rauschen: 60 z-standardisierte Temperaturanomalie-Reihen (1850-2025)
liefern Autokorrelation, Trendbrueche und Volatilitaets-Cluster. Jede Business-Entitaet
bekommt per `sha256(SEED|key)` deterministisch (Ort, Startjahr-Offset); die letzten 48
Jahre der Reihe werden auf die 48 Monate der Business-Zeitachse gelegt und als
`faktor = exp(alpha * z)` multiplikativ ueberlagert (`alpha` 0.03 … 0.12 je KPI-Gruppe).
Segment-, Regions- und Einzelsignal werden gewichtet gemischt — deshalb reagieren alle
Konten eines Segments sichtbar auf „ihre" Klimareihe (Story 9). Details im Skript-Docstring.

## Eingebaute Storys

| # | Story | Wo |
|---|---|---|
| 1 | Produkt-Launch „Neuro Hub" ab 2025-07, Hockeystick | Sales |
| 2 | Lieferketten-Schock 2024-Q3/Q4, COGS-Quote +18 %, Erholung ab 2025-Q2 | Sales + P&L |
| 3 | Auslaufprodukt „Coffee Machine": Volumen -40 %, Rabatt steigt | Sales |
| 4 | Turnaround Brasilien: 2023/24 tief rot, ab 2025-Q3 ueber Plan | Sales |
| 5 | Mid-Year-Konsolidierung (Entity 3140) ab 2025-04, PY leer | P&L |
| 6 | Marketing-Push EMEA 2026-H1 (+60 %), Revenue folgt mit 2 Monaten Verzug | Sales |
| 7 | Qualitaetsvorfall 2025-11/12: Retouren x3, CSAT -12 Punkte | Sales |
| 8 | Mobility Solutions ~-7 % unter Plan, Energy + Digital kompensieren | P&L |
| 9 | Energiepreis-Kopplung: Segment-Konten folgen der Klima-Treiberserie | P&L <-> Klima |
| 10 | YTG-Luecke 2026: AC endet 2026-08, FC fuellt 09-12, PL laeuft durch | beide Sterne |

Ausserdem erhalten: 115 ruhende Konten (ueberall 0), 3 Orphan-Konten
(`899001…899003-9999`, Parent `N-CONS-ELIM` existiert nicht), Kommentar-Konten,
Formel-/KPI-/Separator-Zeilen.

## Abnahmewerte 2026-01 … 2026-06 (mEUR)

| Zeile | AC | PY | PL | Alt-Datensatz AC |
|---|---:|---:|---:|---:|
| Net revenue | 1679.3 | 1445.7 | 1630.8 | 1664.6 |
| Cost of goods sold | -1094.3 | -967.5 | -1075.1 | -1081.4 |
| Gross profit | 584.9 | 478.2 | 555.7 | 583.2 |
| Operating expenses | -317.0 | -289.9 | -314.1 | -316.7 |
| Other operating result | 10.8 | 9.0 | 9.1 | 10.9 |
| EBITDA | 278.8 | 197.3 | 250.7 | 277.4 |
| Depreciation & amortization | -72.9 | -68.5 | -72.5 | -72.9 |
| EBIT | 205.9 | 128.8 | 178.2 | 204.5 |
| Financial result | -23.2 | -19.8 | -19.3 | -23.2 |
| EBT | 182.8 | 108.9 | 158.9 | 181.3 |
| Income taxes | -46.2 | -44.7 | -47.7 | -46.3 |
| Net income | 136.5 | 64.2 | 111.1 | 135.0 |

Vollstaendige Soll-Werte (je Jahr, je Szenario, je Region/Kategorie) und das
Ergebnis aller 22 Selbstpruefungen: `reconciliation.txt` (22/22 OK).

## Abweichungen vom Kontrakt (bewusst, mit Begruendung)

1. **`dim-ort.Ort` — 3 Namen disambiguiert.** In `waermestreifen_demo.csv` kommen
   *Berlin*, *London* und *Moskau* jeweils zweimal vor (Region `Europa` **und** `Welt`).
   Bei 60 Zeilen waere `Ort` damit kein eindeutiger Schluessel und die im Kontrakt
   geforderte Beziehung `dim-markt.KlimaOrt` -> `dim-ort.Ort` liesse sich in Power BI
   nicht anlegen. Das zweite Auftreten heisst deshalb `Berlin (Welt)`, `London (Welt)`,
   `Moskau (Welt)`. `OrtID`, Zeilenzahl (60) und alle Werte bleiben unveraendert;
   `dim-markt.KlimaOrt` referenziert ausschliesslich eindeutige Namen.
2. **Kommentar-Konten: 3 statt 5.** `dim-konten.csv` ist eine Byte-Kopie — die
   Alt-Datei enthaelt tatsaechlich nur 3 befuellte `Kommentar`-Felder (Halbleiter-
   Spotkaeufe, Seefracht, FX-Verlust). Der Kontrakt nennt 5. Nicht korrigierbar,
   ohne die Byte-Kopie zu verletzen.
3. **Story 6 „Marketing Spend +60 %".** Die +60 % sind als **Marketing-Quote**
   (Spend je EUR Umsatz, EMEA 2026-H1 vs. 2025-H1) umgesetzt — das ist der Push
   selbst. Absolut steigt der Spend staerker (~+125 %), weil der Neuro-Hub-Ramp
   parallel Umsatz und damit Marketingbudget bringt. Beide Zahlen stehen in
   `reconciliation.txt`.
4. **Neuro Hub vor dem Launch.** Zeilen vor 2025-07 existieren (fuer den
   Hockeystick ab 0), alle Betraege/Mengen sind `0`, nur `Customer Satisfaction`
   ist **leer** — sonst wuerde ein AVERAGE-Measure durch Nullen verzerrt.
5. **0-Zeilen nach 2026-08.** Knoten-, Formel-, KPI-, Separator- und die 115
   ruhenden Konten fuehren `AC = 0` auch fuer 2026-09..12 (statt leer), damit sie
   nicht aus dem DataView fallen bzw. „ueberall 0" bleiben. Alle echten,
   bebuchten Konten haben dort korrekt ein **leeres** `AC` (YTG-Luecke).
6. **Sales-Zeitachse.** Der Kontrakt nennt 2023-01 … 2026-12; die GuV startet
   laut Kontrakt bei 2024-01. Intern laeuft die Trend-Engine fuer beide Sterne
   ueber dieselben 48 Monate ab 2023-01 — das Schattenjahr 2023 liefert die
   `PY`-Werte fuer 2024 und wird in `fact-guv.csv` **nicht** ausgegeben.
