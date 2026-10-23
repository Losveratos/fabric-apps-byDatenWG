// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Linie für den Absatzverlauf",
  "template": "C08",
  "group": "ChartKitchen · Zeitverlauf",
  "description": "Hält der Absatz in Hektolitern den Plan, und wie verläuft er gegenüber dem Vorjahr? Die Linie zeigt Ist, Vorjahr, Plan und Forecast im Jahresverlauf mit dem Abstand zur Vergleichsbasis darüber; ein Klick auf eine Sorte zeigt, welches Bier den Trend bestimmt.",
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
        "actual": "'Fakten'[Absatz hl AC]",
        "previousYear": "'Fakten'[Absatz hl PY bis Ist]",
        "plan": "'Fakten'[Absatz hl PL bis Ist]"
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
          "kpi": "Absatz in hl je Sorte",
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
        "[actual]": "Absatz AC",
        "[previousYear]": "Absatz PY",
        "[plan]": "Absatz PL"
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
        "category": "'Kalender'[Monatsname]",
        "actual": "'Fakten'[Absatz hl AC]",
        "previousYear": "'Fakten'[Absatz hl PY]",
        "plan": "'Fakten'[Absatz hl PL]",
        "forecast": "'Fakten'[Absatz hl FC]"
      },
      "objects": {
        "chart": {
          "template": "C08",
          "templateApplied": "C08",
          "orientation": "line",
          "comparisonMode": "auto",
          "showAbsoluteVariance": true,
          "showRelativeVariance": false,
          "dualVariance": false,
          "pinStyle": "round",
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Absatz in hl",
          "period": "2026 AC&FC und PL, ΔPL"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Kalender'[Monatsname]": "'Kalender'[Monat]"
      },
      "displayNames": {
        "[actual]": "Absatz hl AC",
        "[previousYear]": "Absatz hl PY",
        "[plan]": "Absatz hl PL",
        "[forecast]": "Absatz hl FC"
      }
    }
  ]
};
