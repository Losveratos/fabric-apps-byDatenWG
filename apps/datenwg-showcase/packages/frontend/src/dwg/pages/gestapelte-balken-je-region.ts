// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Gestapelte Balken je Region",
  "template": "C02",
  "group": "ChartKitchen · Struktur",
  "description": "Welche Region trägt wie viel Umsatz, und über welche Kanäle wird er dort gemacht? Die gestapelten Balken zeigen Größe und Kanalmix je Region; die Sortenkarten oben filtern zum Beispiel auf Alkoholfrei.",
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
        "series": "'Kunde'[Kanal]"
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
          "template": "C02",
          "templateApplied": "C02",
          "orientation": "bars",
          "comparisonMode": "auto",
          "showAbsoluteVariance": false,
          "showRelativeVariance": false,
          "dualVariance": false,
          "waterfallStyle": false,
          "pinStyle": "round",
          "chipMenu": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Nettoumsatz in EUR nach Region und Kanal",
          "period": "Jan..Aug 2026 (YTD) AC"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Kunde'[Kanal]": "'Kunde'[Kanal Sort]"
      },
      "displayNames": {
        "[actual]": "Umsatz AC"
      }
    }
  ]
};
