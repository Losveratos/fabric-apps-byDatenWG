// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Kundenranking nach Ist",
  "template": "T02B",
  "group": "P&L · Struktur-Vergleich",
  "description": "Welche Kunden sind im laufenden Jahr die größten, und erreichen gerade die großen ihren Plan? Die Kunden stehen nach Ist absteigend, daneben die Planabweichung als Balken und Pin; die Sortenkarten oben zeigen das Ranking je Sorte.",
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
        "actual": "'Fakten'[Umsatz AC]",
        "previousYear": "'Fakten'[Umsatz PY bis Ist]",
        "plan": "'Fakten'[Umsatz PL bis Ist]"
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
          "kpi": "Nettoumsatz in EUR je Sorte",
          "period": "Jan..Aug 2026 (YTD), AC gegen PL"
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
        "[actual]": "Umsatz AC",
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
          "'Kunde'[Kunde]"
        ],
        "ac": "'Fakten'[Umsatz AC]",
        "pl": "'Fakten'[Umsatz PL]",
        "period": "'Kalender'[Periode]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Nettoumsatz in Mio. EUR je Kunde, sortiert nach Ist",
          "periodLine": "Aug 2026 | Jan..Aug 2026 (YTD), AC gegen PL"
        },
        "columns": {
          "template": "T02B",
          "templateApplied": "T02B",
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
          "sort": "min",
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
