// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Forecast gegen Vorjahr je Region",
  "template": "T02E",
  "group": "P&L · Struktur-Vergleich",
  "description": "Wo landen die Regionen im Gesamtjahr gegenüber dem Vorjahr, wenn der Forecast eintritt? Der Forecast (Ist bis August plus Hochrechnung) steht schraffiert gegen das ganze Vorjahr, sortiert nach der Abweichung.",
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
        "category": "'Produkt'[Sorte]",
        "actual": "'Fakten'[Umsatz FC]",
        "previousYear": "'Fakten'[Umsatz PY]",
        "plan": "'Fakten'[Umsatz PL]"
      },
      "objects": {
        "chart": {
          "orientation": "cards",
          "comparisonMode": "py",
          "cardTrendChart": "off",
          "cardSameScale": true,
          "cardBars": false
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR je Sorte",
          "period": "2026 AC&FC gegen PY"
        },
        "labels": {
          "fontPreset": "compact",
          "fontScale": 125,
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Produkt'[Sorte]": "'Produkt'[Sorte Sort]"
      },
      "displayNames": {
        "[actual]": "Umsatz AC&FC",
        "[previousYear]": "Umsatz PY",
        "[plan]": "Umsatz PL"
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
          "'Kunde'[Land]",
          "'Kunde'[Region]"
        ],
        "ac": "'Fakten'[Umsatz AC]",
        "py": "'Fakten'[Umsatz PY]",
        "fc": "'Fakten'[Umsatz FC]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Nettoumsatz in Mio. EUR nach Land und Region, Forecast gegen Vorjahr",
          "periodLine": "2026 AC&FC gegen PY"
        },
        "columns": {
          "template": "T02E",
          "templateApplied": "T02E",
          "minuend": "fc",
          "showPY": true,
          "showPL": false,
          "showMinuend": true,
          "valueCascade": false,
          "dPyAbs": false,
          "dPyBar": true,
          "dPyWaterfall": false,
          "dPyPct": false,
          "dPyPin": true,
          "dPlAbs": false,
          "dPlBar": false,
          "dPlWaterfall": false,
          "dPlPct": false,
          "dPlPin": false,
          "secondBlock": true,
          "structureSubtotals": true,
          "showPctRows": true,
          "thresholds": false,
          "scenarioMarks": true,
          "chartLabels": true,
          "capBars": false,
          "sort": "delta",
          "sortBlock": "ytd",
          "blockKind": "ytd",
          "leftBlockKind": "month",
          "pctRevenue": false
        },
        "numbers": {
          "scaling": "m",
          "decimals": 2,
          "pctDecimals": 1
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
      }
    }
  ]
};
