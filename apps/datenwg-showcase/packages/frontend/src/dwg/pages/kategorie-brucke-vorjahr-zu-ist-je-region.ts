// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Kategorie-Brücke Vorjahr zu Ist je Region",
  "template": "C06",
  "group": "ChartKitchen · Brücken",
  "description": "Welche Region treibt die Veränderung des Umsatzes gegenüber dem Vorjahr? Die Säulenkaskade führt vom Vorjahr über den Beitrag jeder Region zum Ist, der größte Treiber ist markiert; die Sortenkarten zeigen, ob ein Bier das Bild verschiebt.",
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
      "filters": [
        {
          "column": "'Kalender'[Ist]",
          "values": [
            true
          ]
        }
      ],
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
          "period": "Jan..Aug 2026 (YTD), AC gegen PY"
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
      "visual": "chartkitchen",
      "rect": [
        327,
        275,
        1566,
        742
      ],
      "bindings": {
        "category": "'Kunde'[Region]",
        "actual": "'Fakten'[Umsatz AC]",
        "previousYear": "'Fakten'[Umsatz PY]"
      },
      "filters": [
        {
          "column": "'Kalender'[Ist]",
          "values": [
            true
          ]
        }
      ],
      "objects": {
        "chart": {
          "template": "C06",
          "templateApplied": "C06",
          "orientation": "catbridge",
          "comparisonMode": "py",
          "showAbsoluteVariance": true,
          "showRelativeVariance": true,
          "dualVariance": false,
          "bridgeOrientation": "columns",
          "pinStyle": "round",
          "chipMenu": true,
          "bridgeBreak": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR, Vorjahr zu Ist je Region",
          "period": "Jan..Aug 2026 (YTD) PY und AC, ΔPY"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false,
          "sumSafeRounding": true
        }
      },
      "displayNames": {
        "[actual]": "Umsatz AC",
        "[previousYear]": "Umsatz PY"
      }
    }
  ]
};
