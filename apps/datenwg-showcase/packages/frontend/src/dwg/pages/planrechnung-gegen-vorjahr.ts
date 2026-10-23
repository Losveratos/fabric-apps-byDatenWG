// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Planrechnung gegen Vorjahr",
  "template": "12H",
  "group": "P&L · Report-Ansichten",
  "description": "Wie ehrgeizig ist der Plan fürs Gesamtjahr gegenüber dem Vorjahr? Plan-Kaskade und Abweichungen zum Vorjahr sind umrandet, damit klar bleibt: das ist Planung, kein Ist. Kaskade und Abweichung stehen in derselben Skala.",
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
        "actual": "'Fakten'[Umsatz PL]",
        "previousYear": "'Fakten'[Umsatz PY]"
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
          "period": "2026 PL und PY, ΔPY"
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
        "[actual]": "Umsatz PL",
        "[previousYear]": "Umsatz PY"
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
        "pl": "'Fakten'[GuV PL]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Planrechnung in Mio. EUR",
          "periodLine": "PL 2026 gegen PY 2025",
          "headline": true
        },
        "columns": {
          "template": "12H",
          "templateApplied": "12H",
          "minuend": "pl",
          "showPY": true,
          "showPL": false,
          "showMinuend": true,
          "valueCascade": true,
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
          "secondBlock": false,
          "structureSubtotals": true,
          "showPctRows": false,
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
          "fixedMax": "45m",
          "fixedVarMax": "4m"
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
