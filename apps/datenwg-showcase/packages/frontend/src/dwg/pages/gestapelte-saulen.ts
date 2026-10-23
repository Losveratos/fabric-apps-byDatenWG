// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Gestapelte Säulen",
  "template": "C01",
  "group": "ChartKitchen · Zeitverlauf",
  "description": "Wie verteilt sich der monatliche Absatz auf die vier Sorten, und wie stark schwankt er über das Jahr? Die gestapelten Säulen zeigen Saison und Sortenmix in einem Bild; ein Klick auf einen Kanal oben zeigt, ob der Sommer in der Gastronomie anders aussieht als im Handel.",
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
          "kpi": "Absatz in hl je Kanal",
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
        "series": "'Produkt'[Sorte]"
      },
      "objects": {
        "chart": {
          "template": "C01",
          "templateApplied": "C01",
          "orientation": "columns",
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
          "kpi": "Absatz in hl nach Sorte",
          "period": "Jan..Aug 2026 AC"
        },
        "labels": {
          "fontPreset": "fullhd",
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Kalender'[Monatsname]": "'Kalender'[Monat]",
        "'Produkt'[Sorte]": "'Produkt'[Sorte Sort]"
      },
      "displayNames": {
        "[actual]": "Absatz hl"
      }
    }
  ]
};
