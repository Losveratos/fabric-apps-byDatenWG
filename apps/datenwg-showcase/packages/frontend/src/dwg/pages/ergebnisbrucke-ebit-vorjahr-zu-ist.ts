// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "Ergebnisbrücke EBIT Vorjahr zu Ist",
  "template": "C12",
  "group": "ChartKitchen · Brücken",
  "description": "Warum liegt das EBIT anders als im Vorjahr? Die Brücke startet beim EBIT des Vorjahres und zeigt, wie viel Nettoumsatz, Wareneinsatz, Betriebskosten und Abschreibungen jeweils beitragen, bis zum EBIT im Ist; steigende Kosten erscheinen als negativer Beitrag.",
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
          "comparisonMode": "py",
          "cardTrendChart": "off",
          "cardSameScale": true,
          "cardBars": false
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "Deckungsbeitrag in EUR je Kanal",
          "period": "Jan..Aug 2026 (YTD), AC gegen PY"
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
        "category": "'Konto'[L1]",
        "actual": "'Fakten'[GuV ± AC]",
        "previousYear": "'Fakten'[GuV ± PY]"
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
          "template": "C12",
          "templateApplied": "C12",
          "orientation": "waterfall",
          "comparisonMode": "auto",
          "showAbsoluteVariance": true,
          "showRelativeVariance": true,
          "dualVariance": false,
          "pinStyle": "round",
          "chipMenu": true,
          "bridgeBreak": true
        },
        "ibcsTitle": {
          "show": true,
          "kpi": "EBIT in EUR, Beitrag je GuV-Block",
          "period": "Jan..Aug 2026 (YTD) PY und AC, ΔPY"
        },
        "labels": {
          "fontPreset": "fullhd",
          "sumSafeRounding": true,
          "unitSuffix": false
        }
      },
      "sortBy": {
        "'Konto'[L1]": "'Konto'[L1 Sort]"
      },
      "displayNames": {
        "[actual]": "EBIT AC",
        "[previousYear]": "EBIT PY"
      }
    }
  ]
};
