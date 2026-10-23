// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Regionen mit Abweichung zu Vorjahr und Plan",
  "template": "T01A",
  "group": "P&L · Struktur-Vergleich",
  "description": "Wie steht jede Region im aktuellen Monat und im laufenden Jahr gegenüber Vorjahr und Plan? Die flache Tabelle zeigt PY, PL und Ist mit allen vier Abweichungen als Zahlen; Abweichungen über der Schwelle werden rot, die Fußzeile nennt die Schwelle.",
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
          "'Kunde'[Region]"
        ],
        "ac": "'Fakten'[Umsatz AC]",
        "py": "'Fakten'[Umsatz PY]",
        "pl": "'Fakten'[Umsatz PL]",
        "period": "'Kalender'[Periode]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "ZLATÝ LEV Brauerei",
          "measureLine": "Nettoumsatz in Mio. EUR je Region",
          "periodLine": "Aug 2026 | Jan..Aug 2026 (YTD), AC gegen PY und PL"
        },
        "columns": {
          "template": "T01A",
          "templateApplied": "T01A",
          "minuend": "ac",
          "showPY": true,
          "showPL": true,
          "showMinuend": true,
          "valueCascade": false,
          "dPyAbs": true,
          "dPyBar": false,
          "dPyWaterfall": false,
          "dPyPct": true,
          "dPyPin": false,
          "dPlAbs": true,
          "dPlBar": false,
          "dPlWaterfall": false,
          "dPlPct": true,
          "dPlPin": false,
          "secondBlock": true,
          "structureSubtotals": false,
          "showPctRows": true,
          "thresholds": true,
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
