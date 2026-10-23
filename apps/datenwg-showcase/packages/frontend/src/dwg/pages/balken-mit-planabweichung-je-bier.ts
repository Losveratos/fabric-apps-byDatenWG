// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Balken mit Planabweichung je Bier",
  "template": "C04",
  "group": "ChartKitchen · Struktur",
  "description": "Welche Biere liegen über, welche unter Plan, absolut und in Prozent? Die Balken vergleichen Ist und Plan über dieselben Ist-Monate, damit die Abweichung ehrlich bleibt; die Kanalkarten zeigen, wo die Lücke entsteht.",
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
          "comparisonMode": "plan",
          "cardTrendChart": "off",
          "cardSameScale": true,
          "cardBars": false
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR je Kanal",
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
        "category": "'Produkt'[Produkt]",
        "actual": "'Fakten'[Umsatz AC]",
        "plan": "'Fakten'[Umsatz PL]"
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
          "template": "C04",
          "templateApplied": "C04",
          "orientation": "bars",
          "comparisonMode": "plan",
          "showAbsoluteVariance": true,
          "showRelativeVariance": true,
          "dualVariance": false,
          "waterfallStyle": false,
          "pinStyle": "round",
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR je Bier, Ist gegen Plan",
          "period": "Jan..Aug 2026 (YTD) AC und PL, ΔPL"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Produkt'[Produkt]": "'Produkt'[Produkt Sort]"
      },
      "displayNames": {
        "[actual]": "Umsatz AC",
        "[plan]": "Umsatz PL"
      }
    }
  ]
};
