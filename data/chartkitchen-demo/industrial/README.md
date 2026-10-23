# Industriekonzern-Demodaten für „P&L Statement byDatenWG" v0.3

Realistischer Stresstest-Datensatz: diversifizierter Industriekonzern
(4 Segmente · 3 Regionen · 38 Gesellschaften), **unbalancierte Hierarchie
mit Leaf-Tiefen von 2 bis 6 Ebenen**, exakt am DataView-Limit des Visuals.

| Datei | Inhalt |
|---|---|
| `dim-konten.csv` | **5.000 Zeilen**: 4.613 Konten-Leaves, 374 Hierarchie-Knoten (für Parent-Child), 10 Formel/KPI/Separator-Zeilen, 3 Orphans |
| `fact-guv.csv` | **30.000 Zeilen** = 5.000 × 6 Monate (2026-01 … 2026-06): AC, PY, PL, FC_FY, PL_FY |
| `generate_demo_data.py` | Generator (Seed fix → reproduzierbar) |
| `reconciliation.txt` | Soll-Werte für die Abnahme |

## Beide Hierarchie-Modi in EINER Dim

- **Levels-Modus (Standard, so ist das Visual verdrahtet):** `L1…L6` zuweisen,
  `ParentAccountID` NICHT zuweisen. Knotenzeilen haben leere L-Spalten und
  werden vom Visual automatisch übersprungen; Zwischensummen entstehen aus
  den Pfaden. Äste enden unterschiedlich tief (ragged).
- **Parent-Child-Modus:** `L1…L6` entfernen, stattdessen `ParentAccountID`
  in „Parent account ID" ziehen (Name bleibt in „Account name"). Jetzt tragen
  die expliziten Knotenzeilen (RowType `Subtotal`) die Struktur.
  → Die 3 Orphan-Konten (`899001…899003-9999`, Parent `N-CONS-ELIM` existiert
  nicht) erscheinen als „Nicht zugeordnet"-Signal — gewollt!

## Eingebaute Test-Storys

- **Mobility Solutions schwächelt** (AC ~7 % unter Plan) → rote Δ-Balken,
  Energy Systems & Digital Services überkompensieren → Teal.
- **Kostenzeilen** (COGS/Opex/D&A/Tax): `SignConvention -1`,
  `DisplayInvert true`, `VarianceInvert true` → positiv angezeigt,
  „unter Plan = gut".
- **Erlösschmälerungen** innerhalb Net revenue: sign −1, werden negativ
  angezeigt (DisplayInvert false) — gemischter Block.
- **Mid-Year-Konsolidierung:** DWG Mobility Ibérica S.L. (Entity 3140) hat
  AC/PL erst ab April, PY komplett leer → Sparkline mit Lücke, M&A-Effekt.
- **115 ruhende Konten** (überall 0) → Test „Hide zero rows".
- **5 Kommentare** (①…⑤) auf Leaf-Konten: Halbleiter-Spotkäufe, Seefracht,
  Cloud-Kosten, FX-Verlust, Lizenz-Einmalerlös → Fußnoten-Sektion.
- **Formelzeilen** referenzieren über eindeutige NAMEN (funktioniert in
  beiden Modi), z. B. `[Gross profit] + [Operating expenses] + [Other operating result]`.

## Abnahmewerte (alle 6 Monate, ohne Filter, in mEUR)

| Zeile | AC | PY | PL |
|---|---:|---:|---:|
| Net revenue | 1.664,6 | 1.493,8 | 1.617,5 |
| Gross profit | 583,2 | 498,9 | 553,5 |
| EBITDA | 277,4 | 212,9 | 248,5 |
| EBIT | 204,5 | 143,8 | 176,0 |
| EBT | 181,3 | 125,1 | 156,7 |
| Net income | 135,0 | 79,7 | 109,0 |

EBITDA-Marge AC ≈ **16,7 %** (PL 15,4 %) · FY-Ausblick: EBITDA FC 559,2 vs. PL 500,0.
Feinere Werte in `reconciliation.txt`.

## Bekanntes Verhalten (kein Bug)

- DataView steht exakt bei 30.000 Zeilen (5.000 × 6) — dem Limit des Visuals.
  Je nach Desktop-Version kann die 30k-Warnung im Footer erscheinen.
- Ein Zirkelbezug (`⚠ cycle`) ist NICHT eingebaut. Zum Provozieren: in
  `dim-konten.csv` bei `F-GP` die FormulaDef auf `[EBITDA]` ändern.
- FY-Measures MÜSSEN `MAX` sein (nicht SUM), sonst 6-fach zu groß.
- `SortOrder` = 6 × Zeilenposition (gleiche Skala wie der DataView-Index,
  den das Visual für synthetische Levels-Zwischensummen nutzt). Beim
  manuellen Verdrahten das Visual nach `SortOrder` **aufsteigend** sortieren
  (im ausgelieferten Report bereits voreingestellt).
