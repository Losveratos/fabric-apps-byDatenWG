// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Deckungsbeitrag mit Planabweichung als Balken",
  "template": "T02A",
  "group": "P&L · Struktur-Vergleich",
  "description": "Wo verfehlt der Deckungsbeitrag den Plan, im Monat und im laufenden Jahr? Die Planabweichung steht als Balken und in Prozent als Pin, gruppiert nach Land; so springt die größte Lücke sofort ins Auge.",
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
        "actual": "'Fakten'[DB AC]",
        "previousYear": "'Fakten'[DB PY bis Ist]",
        "plan": "'Fakten'[DB PL bis Ist]"
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
          "kpi": "Deckungsbeitrag in EUR je Kanal",
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
        "[actual]": "Deckungsbeitrag AC",
        "[previousYear]": "Deckungsbeitrag PY",
        "[plan]": "Deckungsbeitrag PL"
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
        "ac": "'Fakten'[DB AC]",
        "pl": "'Fakten'[DB PL]",
        "period": "'Kalender'[Periode]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Deckungsbeitrag in Mio. EUR nach Land und Region",
          "periodLine": "Aug 2026 | Jan..Aug 2026 (YTD), AC gegen PL"
        },
        "columns": {
          "template": "T02A",
          "templateApplied": "T02A",
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
          "sort": "cat",
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
