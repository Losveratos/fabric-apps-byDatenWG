// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Small Multiples je Kanal",
  "template": "C13",
  "group": "ChartKitchen · Zeitverlauf",
  "description": "Verläuft das Jahr in allen Absatzkanälen gleich, oder hängt die Gastronomie stärker am Sommer als Handel und Export? Eine Kachel je Kanal auf gleicher Skala plus eine Gesamtkachel macht Größe und Saisonmuster direkt vergleichbar.",
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
        "category": "'Kalender'[Monatsname]",
        "actual": "'Fakten'[Umsatz AC]",
        "previousYear": "'Fakten'[Umsatz PY]",
        "forecast": "'Fakten'[Umsatz FC]",
        "multiples": "'Kunde'[Kanal]"
      },
      "objects": {
        "chart": {
          "template": "C13",
          "templateApplied": "C13",
          "multiplesTotal": true,
          "multiplesSameScale": true,
          "orientation": "columns",
          "comparisonMode": "py",
          "showAbsoluteVariance": true,
          "showRelativeVariance": false,
          "pinStyle": "round",
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR je Kanal",
          "period": "2026 AC&FC und PY, ΔPY"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Kalender'[Monatsname]": "'Kalender'[Monat]",
        "'Kunde'[Kanal]": "'Kunde'[Kanal Sort]"
      },
      "displayNames": {
        "[actual]": "Umsatz AC",
        "[previousYear]": "Umsatz PY",
        "[forecast]": "Umsatz FC"
      }
    }
  ]
};
