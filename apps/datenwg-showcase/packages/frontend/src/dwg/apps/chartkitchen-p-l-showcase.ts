// erzeugt von `dwg app page` aus der App-Spec „ChartKitchen & P&L Showcase“, nicht von Hand ändern.
// Einbinden: <DwgShell app={app} connection="showcase" isDark={isDark} />
import type { DwgAppSpec } from '../dwg-page';
import { page as p0 } from '../pages/gestapelte-saulen';
import { page as p1 } from '../pages/saulen-mit-abweichung-zum-vorjahr';
import { page as p2 } from '../pages/integrierte-brucke-uber-das-jahr';
import { page as p3 } from '../pages/linie-fur-den-absatzverlauf';
import { page as p4 } from '../pages/small-multiples-je-kanal';
import { page as p5 } from '../pages/gestapelte-balken-je-region';
import { page as p6 } from '../pages/balken-mit-planabweichung-je-bier';
import { page as p7 } from '../pages/scatter-kunden-nach-menge-und-marge';
import { page as p8 } from '../pages/bubble-biere-nach-menge-marge-und-umsatz';
import { page as p9 } from '../pages/kategorie-brucke-vorjahr-zu-ist-je-region';
import { page as p10 } from '../pages/ergebnisbrucke-ebit-vorjahr-zu-ist';
import { page as p11 } from '../pages/regionen-mit-abweichung-zu-vorjahr-und-plan';
import { page as p12 } from '../pages/regionen-mit-zwischensummen-je-land';
import { page as p13 } from '../pages/deckungsbeitrag-mit-planabweichung-als-balken';
import { page as p14 } from '../pages/kundenranking-nach-ist';
import { page as p15 } from '../pages/bierranking-nach-planabweichung-im-monat';
import { page as p16 } from '../pages/forecast-gegen-vorjahr-je-region';
import { page as p17 } from '../pages/forecast-gegen-plan-je-kanal-und-kunde';
import { page as p18 } from '../pages/guv-mit-abweichung-zu-vorjahr-und-plan';
import { page as p19 } from '../pages/forecast-guv-mit-abweichung-zu-vorjahr-und-plan';
import { page as p20 } from '../pages/guv-mit-planabweichung-als-balken';
import { page as p21 } from '../pages/guv-mit-plan-wasserfall';
import { page as p22 } from '../pages/guv-mit-vorjahres-wasserfall';
import { page as p23 } from '../pages/forecast-guv-mit-plan-wasserfall';
import { page as p24 } from '../pages/forecast-guv-mit-vorjahres-wasserfall';
import { page as p25 } from '../pages/wert-kaskaden-vorjahr-und-ist';
import { page as p26 } from '../pages/jahresausblick';
import { page as p27 } from '../pages/planrechnung-gegen-vorjahr';

export const app: DwgAppSpec = {
  "name": "ChartKitchen & P&L Showcase",
  "about": "Showcase der Original-Visuals ChartKitchen byDatenWG und P&L Statement byDatenWG: je Template eine Seite mit Livedaten, Filter-Panel links und Querfilter per Klick. Daten: synthetischer Brauerei-Datensatz ZLATÝ LEV (Modell ZlatyLev Showcase, Direct Lake), Ist bis August 2026, Plan und Forecast für das ganze Jahr. Ist gegen Vorjahr und Plan nur über dieselben Monate: Strukturseiten filtern auf die Ist-Monate, P&L-Templates mit Periodenfeld rechnen YTD periodengleich, Forecast- und Planseiten zeigen das Gesamtjahr. Die Templates sind an IBCS angelehnt. Alle Zahlen sind Demodaten.",
  "footer": "Synthetische Demodaten (Namen aus dem Brauerei-Case Zlatý Lev). Darstellung an IBCS angelehnt; IBCS® ist eine eingetragene Marke des IBCS Institute.",
  "resolution": "fullhd",
  "visualHeaders": true,
  "chrome": {
    "header": {
      "on": true,
      "h": 64
    },
    "nav": {
      "on": false,
      "w": 64
    },
    "filter": {
      "on": true,
      "side": "left",
      "w": 200,
      "topH": 56
    },
    "footer": {
      "on": true,
      "h": 24
    }
  },
  "slicers": [
    {
      "column": "'Kalender'[Jahr]",
      "label": "Jahr",
      "default": [
        2026
      ],
      "multi": false
    },
    {
      "column": "'Kunde'[Region]",
      "label": "Region",
      "default": [],
      "multi": true
    },
    {
      "column": "'Kunde'[Kanal]",
      "label": "Kanal",
      "default": [],
      "multi": true,
      "sortBy": "'Kunde'[Kanal Sort]"
    },
    {
      "column": "'Produkt'[Sorte]",
      "label": "Sorte",
      "default": [],
      "multi": true,
      "sortBy": "'Produkt'[Sorte Sort]"
    }
  ],
  "pages": [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24, p25, p26, p27]
};
