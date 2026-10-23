// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Scatter Kunden nach Menge und Marge",
  "template": "C09",
  "group": "ChartKitchen · Korrelation",
  "description": "Welche Kunden nehmen viel Bier ab, bringen aber wenig Deckungsbeitrag je Euro Umsatz? Jeder Punkt ist ein Kunde, die Quadranten am Mittelwert trennen große und kleine, margenstarke und margenschwache Kunden; die Pfeile zeigen die Bewegung seit dem Vorjahr.",
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
        "actual": "'Fakten'[DB AC]",
        "previousYear": "'Fakten'[DB PY bis Ist]",
        "plan": "'Fakten'[DB PL bis Ist]"
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
          "kpi": "Deckungsbeitrag in EUR je Sorte",
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
        "[actual]": "Deckungsbeitrag AC",
        "[previousYear]": "Deckungsbeitrag PY",
        "[plan]": "Deckungsbeitrag PL"
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
        "category": "'Kunde'[Kunde]",
        "actual": "'Fakten'[DB-Marge % AC]",
        "previousYear": "'Fakten'[DB-Marge % PY]",
        "xValue": "'Fakten'[Absatz hl AC]",
        "xPrevious": "'Fakten'[Absatz hl PY]"
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
          "template": "C09",
          "templateApplied": "C09",
          "orientation": "scatter",
          "comparisonMode": "auto",
          "scatterQuadrant": "mean",
          "scatterColorBy": "single",
          "pinStyle": "round",
          "scatterArrows": true,
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "DB-Marge (y) gegen Absatz in hl (x) je Kunde",
          "period": "Jan..Aug 2026 (YTD) AC und PY"
        },
        "labels": {
          "fontPreset": "fullhd"
        }
      },
      "displayNames": {
        "[actual]": "DB-Marge %",
        "[previousYear]": "DB-Marge % PY",
        "[xValue]": "Absatz hl",
        "[xPrevious]": "Absatz hl PY"
      },
      "formats": {
        "[actual]": "0.0 %",
        "[previousYear]": "0.0 %"
      }
    }
  ]
};
