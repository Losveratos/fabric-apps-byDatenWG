// erzeugt von `dwg app page` aus der App-Spec „DWG GuV“, nicht von Hand ändern.
import type { DwgPageSpec } from '../dwg-page';

export const page: DwgPageSpec = {
  "name": "GuV Statement",
  "width": 1920,
  "height": 1080,
  "background": "#F4F4F1",
  "filters": [
    {
      "column": "'Calender'[Year]",
      "values": [
        2026
      ]
    },
    {
      "column": "'Calender'[Month]",
      "values": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ]
    }
  ],
  "tiles": [
    {
      "id": "statement",
      "visual": "pnl",
      "rect": [
        24,
        24,
        1872,
        1032
      ],
      "bindings": {
        "levels": [
          "'dim-konten'[L1]",
          "'dim-konten'[L2]",
          "'dim-konten'[L3]",
          "'dim-konten'[L4]",
          "'dim-konten'[L5]",
          "'dim-konten'[L6]"
        ],
        "account": "'dim-konten'[AccountID]",
        "accountName": "'dim-konten'[Name]",
        "sortOrder": "'dim-konten'[SortOrder]",
        "rowType": "'dim-konten'[RowType]",
        "formulaDef": "'dim-konten'[FormulaDef]",
        "signConvention": "'dim-konten'[SignConvention]",
        "displayInvert": "'dim-konten'[DisplayInvert]",
        "varianceInvert": "'dim-konten'[VarianceInvert]",
        "comment": "'dim-konten'[Kommentar]",
        "ac": "'fact-guv'[GuV AC]",
        "py": "'fact-guv'[GuV PY]",
        "pl": "'fact-guv'[GuV PL]",
        "fc": "'fact-guv'[GuV FC]",
        "fcFy": "'fact-guv'[GuV FC FY]",
        "plFy": "'fact-guv'[GuV PL FY]"
      },
      "objects": {
        "titleBlock": {
          "unitLine": "Daten-WG Knowledgekitchen Group · Konzern",
          "measureLine": "GuV in Mio. EUR",
          "periodLine": "Jan bis Aug 2026 (YTD), FY-Ausblick"
        },
        "columns": {
          "preset": "acpldpl",
          "reference": "pl"
        },
        "numbers": {
          "scaling": "m"
        },
        "hierarchy": {
          "defaultLevel": 2
        },
        "toolbar": {
          "show": true,
          "showLegend": true
        },
        "style": {
          "fontPreset": "fullhd",
          "density": "compact",
          "colorMode": "teal"
        }
      }
    }
  ]
};
