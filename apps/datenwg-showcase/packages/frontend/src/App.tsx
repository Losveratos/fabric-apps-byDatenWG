// DatenWG Showcase: jedes Template von ChartKitchen (C01 bis C13) und P&L Statement byDatenWG (T01A bis 12H)
// einmal, auf dem Brauerei-Datensatz „ZlatyLev Showcase“ (Konnektor showcase). Seiten, Navigation und Filter-Panel
// kommen aus der App-Spec dwg/specs/showcase.json; dieselbe Spec ergibt den Power-BI-Bericht.
// Seiten neu erzeugen:
//   node dwg/dwg.mjs app page --app apps/datenwg-showcase --spec dwg/specs/showcase.json --connector showcase \
//     --model "showcase/ZlatyLev Showcase.SemanticModel"

import { Moon, Sun } from 'lucide-react';

import { app } from './dwg/apps/chartkitchen-p-l-showcase';
import { DwgShell } from './dwg/DwgShell';
import { useTheme } from './hooks/theme.context';

function App() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <DwgShell
      app={app}
      connection="showcase"
      isDark={isDark}
      title="DatenWG Showcase"
      subtitle="Alle Templates von ChartKitchen und P&L Statement byDatenWG · Brauerei Zlatý Lev"
      actions={
        <button
          type="button"
          className="grid size-[34px] place-items-center rounded-md border border-border"
          aria-label={isDark ? 'Helles Design' : 'Dunkles Design'}
          title={isDark ? 'Helles Design' : 'Dunkles Design'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
        </button>
      }
    />
  );
}

export default App;
