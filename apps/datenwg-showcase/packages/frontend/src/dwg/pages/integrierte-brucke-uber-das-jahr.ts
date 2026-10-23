// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Integrierte Brücke über das Jahr",
  "template": "C05",
  "group": "ChartKitchen · Zeitverlauf",
  "description": "Wie kommt die Brauerei vom Umsatz des Vorjahres zum erwarteten Umsatz dieses Jahres? Die Brücke startet beim Vorjahr, kaskadiert die Abweichung Monat für Monat und endet bei Ist plus Forecast; so sieht man, welche Monate den Jahresausblick tragen.",
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
          "kpi": "Nettoumsatz in EUR je Sorte",
          "period": "2026 AC&FC gegen PY"
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
        "[actual]": "Umsatz AC&FC",
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
        "category": "'Kalender'[Monatsname]",
        "actual": "'Fakten'[Umsatz AC]",
        "previousYear": "'Fakten'[Umsatz PY]",
        "forecast": "'Fakten'[Umsatz FC]"
      },
      "objects": {
        "chart": {
          "template": "C05",
          "templateApplied": "C05",
          "orientation": "intwaterfall",
          "comparisonMode": "py",
          "showAbsoluteVariance": true,
          "showRelativeVariance": true,
          "dualVariance": false,
          "pinStyle": "round",
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR, Vorjahr zu Ist und Forecast",
          "period": "2026 PY und AC&FC, ΔPY"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false,
          "sumSafeRounding": true
        }
      },
      "sortBy": {
        "'Kalender'[Monatsname]": "'Kalender'[Monat]"
      },
      "displayNames": {
        "[actual]": "Umsatz AC",
        "[previousYear]": "Umsatz PY",
        "[forecast]": "Umsatz FC"
      }
    }
  ]
};
