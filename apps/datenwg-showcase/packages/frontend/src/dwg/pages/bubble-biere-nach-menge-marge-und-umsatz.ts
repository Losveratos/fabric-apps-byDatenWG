// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Bubble Biere nach Menge, Marge und Umsatz",
  "template": "C10",
  "group": "ChartKitchen · Korrelation",
  "description": "Welche Biere verbinden hohe Menge mit guter Marge, und welche verdienen trotz großem Umsatz wenig? Die Blasengröße zeigt den Umsatz, die Lage Menge und Marge; ein Klick auf einen Kanal zeigt, ob sich das Sortiment dort anders verhält.",
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
        "actual": "'Fakten'[DB-Marge % AC]",
        "xValue": "'Fakten'[Absatz hl AC]",
        "bubbleSize": "'Fakten'[Umsatz AC]"
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
          "template": "C10",
          "templateApplied": "C10",
          "orientation": "scatter",
          "comparisonMode": "auto",
          "scatterQuadrant": "mean",
          "scatterColorBy": "single",
          "scatterSizeLegend": true,
          "pinStyle": "round",
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "DB-Marge (y), Absatz in hl (x), Umsatz (Größe) je Bier",
          "period": "Jan..Aug 2026 (YTD) AC"
        },
        "labels": {
          "fontPreset": "fullhd"
        }
      },
      "sortBy": {
        "'Produkt'[Produkt]": "'Produkt'[Produkt Sort]"
      },
      "displayNames": {
        "[actual]": "DB-Marge %",
        "[xValue]": "Absatz hl",
        "[bubbleSize]": "Umsatz"
      },
      "formats": {
        "[actual]": "0.0 %"
      }
    }
  ]
};
