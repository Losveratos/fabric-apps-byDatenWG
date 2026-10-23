// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Wert-Kaskaden Vorjahr und Ist",
  "template": "12A",
  "group": "P&L · Report-Ansichten",
  "description": "Wie entsteht das EBIT aus Umsatz und Kosten, im Vorjahr und heute nebeneinander? Zwei Wert-Kaskaden zeigen den Weg vom Nettoumsatz zum EBIT, die Abweichungsbalken daneben, wo sich die Struktur verschoben hat.",
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
        "actual": "'Fakten'[Umsatz AC]",
        "previousYear": "'Fakten'[Umsatz PY bis Ist]",
        "plan": "'Fakten'[Umsatz PL bis Ist]"
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
          "period": "Jan..Aug 2026 (YTD), AC gegen PY"
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
        "py": "'Fakten'[GuV PY bis Ist]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "GuV in Mio. EUR, Kaskaden PY und AC",
          "periodLine": "Jan..Aug 2026 (YTD), AC gegen PY",
          "headline": true
        },
        "columns": {
          "template": "12A",
          "templateApplied": "12A",
          "minuend": "ac",
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
