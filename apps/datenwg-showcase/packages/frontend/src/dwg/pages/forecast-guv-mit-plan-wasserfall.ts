// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Forecast-GuV mit Plan-Wasserfall",
  "template": "T04D",
  "group": "P&L · GuV-Statement",
  "description": "Wo verfehlt die Hochrechnung fürs Gesamtjahr den Plan, und wie viel EBIT kostet das? Der Wasserfall zeigt die Abweichung Forecast gegen Jahresplan Zeile für Zeile, schraffiert als Forecast.",
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
          "comparisonMode": "plan",
          "cardTrendChart": "off",
          "cardSameScale": true,
          "cardBars": false
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR je Kanal",
          "period": "2026 AC&FC gegen PL"
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
        "pl": "'Fakten'[GuV PL]",
        "fc": "'Fakten'[GuV FC]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Forecast-GuV in Mio. EUR, Abweichung zum Plan als Wasserfall",
          "periodLine": "2026 AC&FC gegen PL",
          "headline": true
        },
        "columns": {
          "template": "T04D",
          "templateApplied": "T04D",
          "minuend": "fc",
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
          "dPlBar": false,
          "dPlWaterfall": true,
          "dPlPct": false,
          "dPlPin": true,
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
