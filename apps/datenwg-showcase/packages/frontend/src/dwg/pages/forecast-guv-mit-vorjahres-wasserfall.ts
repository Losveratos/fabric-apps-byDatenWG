// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Forecast-GuV mit Vorjahres-Wasserfall",
  "template": "T04E",
  "group": "P&L · GuV-Statement",
  "description": "Wird das Gesamtjahr besser oder schlechter als das Vorjahr, und welche Zeilen entscheiden das? Der Wasserfall zeigt die Abweichung Forecast gegen das ganze Vorjahr.",
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
          "kpi": "Nettoumsatz in EUR je Kanal",
          "period": "2026 AC&FC gegen PY"
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
          "'Konto'[L1]",
          "'Konto'[L2]"
        ],
        "account": "'Konto'[KontoID]",
        "accountName": "'Konto'[Konto]",
        "sortOrder": "'Konto'[SortOrder]",
        "rowType": "'Konto'[RowType]",
        "formulaDef": "'Konto'[FormulaDef]",
        "signConvention": "'Konto'[SignConvention]",
        "displayInvert": "'Konto'[DisplayInvert]",
        "varianceInvert": "'Konto'[VarianceInvert]",
        "comment": "'Konto'[Kommentar]",
        "ac": "'Fakten'[GuV AC]",
        "py": "'Fakten'[GuV PY]",
        "fc": "'Fakten'[GuV FC]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Forecast-GuV in Mio. EUR, Abweichung zum Vorjahr als Wasserfall",
          "periodLine": "2026 AC&FC gegen PY",
          "headline": true
        },
        "columns": {
          "template": "T04E",
          "templateApplied": "T04E",
          "minuend": "fc",
          "showPY": true,
          "showPL": false,
          "showMinuend": true,
          "valueCascade": false,
          "dPyAbs": false,
          "dPyBar": false,
          "dPyWaterfall": true,
          "dPyPct": false,
          "dPyPin": true,
          "dPlAbs": false,
          "dPlBar": false,
          "dPlWaterfall": false,
          "dPlPct": false,
          "dPlPin": false,
          "secondBlock": false,
          "structureSubtotals": true,
          "showPctRows": true,
          "thresholds": false,
          "scenarioMarks": true,
          "chartLabels": true,
          "capBars": false,
          "sort": "cat",
          "sortBlock": "ytd",
          "blockKind": "ytd",
          "leftBlockKind": "month"
        },
        "numbers": {
          "scaling": "m",
          "decimals": 2,
          "pctDecimals": 1,
          "fixedVarMax": "2,5m"
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
      "showItemsWithNoData": true
    }
  ]
};
