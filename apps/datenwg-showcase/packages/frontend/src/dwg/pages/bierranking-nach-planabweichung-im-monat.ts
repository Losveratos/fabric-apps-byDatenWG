// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Bierranking nach Planabweichung im Monat",
  "template": "T02C",
  "group": "P&L · Struktur-Vergleich",
  "description": "Welche Biere verfehlen im letzten Ist-Monat den Absatzplan am stärksten? Die Biere sind nach der Monatsabweichung sortiert, der YTD-Block daneben zeigt, ob es ein Ausreißer oder ein Trend ist; die Kanalkarten filtern.",
  "width": 1920,
  "height": 1080,
  "background": "#F4F4F1",
  "zones": {
    "header": {
      "x": 0,
      "y": 0,
      "w": 1920,
      "h": 96
    },
    "filter": {
      "x": 0,
      "y": 96,
      "w": 300,
      "h": 948
    },
    "footer": {
      "x": 0,
      "y": 1044,
      "w": 1920,
      "h": 36
    },
    "content": {
      "x": 327,
      "y": 123,
      "w": 1566,
      "h": 894
    }
  },
  "filters": [],
  "tiles": [
    {
      "id": "karten",
      "visual": "chartkitchen",
      "rect": [
        327,
        123,
        1566,
        134
      ],
      "bindings": {
        "category": "'Kunde'[Kanal]",
        "actual": "'Fakten'[Absatz hl AC]",
        "previousYear": "'Fakten'[Absatz hl PY bis Ist]",
        "plan": "'Fakten'[Absatz hl PL bis Ist]"
      },
      "objects": {
        "chart": {
          "orientation": "cards",
          "comparisonMode": "plan",
          "cardTrendChart": "off",
          "cardSameScale": true,
          "cardBars": false
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Absatz in hl je Kanal",
          "period": "Jan..Aug 2026 (YTD), AC gegen PL"
        },
        "labels": {
          "fontPreset": "compact",
          "fontScale": 125,
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Kunde'[Kanal]": "'Kunde'[Kanal Sort]"
      },
      "displayNames": {
        "[actual]": "Absatz AC",
        "[previousYear]": "Absatz PY",
        "[plan]": "Absatz PL"
      }
    },
    {
      "id": "vorlage",
      "visual": "pnl",
      "rect": [
        327,
        275,
        1566,
        742
      ],
      "bindings": {
        "levels": [
          "'Produkt'[Produkt]"
        ],
        "ac": "'Fakten'[Absatz hl AC]",
        "pl": "'Fakten'[Absatz hl PL]",
        "period": "'Kalender'[Periode]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Absatz in Tsd. hl je Bier, sortiert nach Planabweichung im Monat",
          "periodLine": "Aug 2026 | Jan..Aug 2026 (YTD), AC gegen PL"
        },
        "columns": {
          "template": "T02C",
          "templateApplied": "T02C",
          "minuend": "ac",
          "showPY": false,
          "showPL": true,
          "showMinuend": true,
          "valueCascade": false,
          "dPyAbs": false,
          "dPyBar": false,
          "dPyWaterfall": false,
          "dPyPct": false,
          "dPyPin": false,
          "dPlAbs": false,
          "dPlBar": true,
          "dPlWaterfall": false,
          "dPlPct": false,
          "dPlPin": true,
          "secondBlock": true,
          "structureSubtotals": true,
          "showPctRows": true,
          "thresholds": false,
          "scenarioMarks": true,
          "chartLabels": true,
          "capBars": false,
          "sort": "delta",
          "sortBlock": "period",
          "blockKind": "ytd",
          "leftBlockKind": "month",
          "pctRevenue": false
        },
        "numbers": {
          "scaling": "k",
          "decimals": 2,
          "pctDecimals": 1,
          "unitText": "hl"
        },
        "hierarchy": {
          "defaultLevel": 2
        },
        "toolbar": {
          "show": true,
          "showLegend": true,
          "foldable": true,
          "startFolded": true
        },
        "style": {
          "fontPreset": "fullhd",
          "density": "compact"
        }
      },
      "sortBy": {
        "'Produkt'[Produkt]": "'Produkt'[Produkt Sort]"
      }
    }
  ]
};
