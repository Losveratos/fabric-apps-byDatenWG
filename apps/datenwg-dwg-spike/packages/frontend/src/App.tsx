// dwg Spike: Seiten aus App-Specs, gerendert mit den Original-Visuals ChartKitchen und P&L über @dwg/visuals.
// - Demo-Modell: specs/spike.json aus dwg-cli (Konnektor guv), dieselbe Spec ergibt den Power-BI-Bericht „dwg Spike“
// Seiten neu erzeugen (im Repo dwg-cli): node dwg.mjs app page --app <pfad>/apps/datenwg-dwg-spike --spec specs/spike.json --connector guv

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DwgPage } from './dwg/DwgPage';
import type { DwgPageSpec } from './dwg/dwg-page';
import { page as demo } from './dwg/pages/dwg-spike';
import { useTheme } from './hooks/theme.context';

const PAGES: { id: string; label: string; page: DwgPageSpec; connection: string }[] = [
  { id: 'demo', label: 'Demo-Modell', page: demo, connection: 'guv' },
];

const pageFromHash = () => PAGES.find((p) => `#${p.id}` === window.location.hash) ?? PAGES[0];

function App() {
  const { isDark, toggleTheme } = useTheme();
  const [current, setCurrent] = useState(pageFromHash);

  useEffect(() => {
    const onHash = () => setCurrent(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <header role="banner" className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-400 px-600 py-300">
          <div>
            <h1 className="font-heading text-500 leading-500 font-bold tracking-tight">dwg Spike</h1>
            <p className="text-200 text-foreground/70">
              Eine Definition für Fabric App und Power BI · ChartKitchen und P&amp;L byDatenWG
            </p>
          </div>
          <nav aria-label="Seiten" className="flex gap-200">
            {PAGES.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                aria-current={p.id === current.id ? 'page' : undefined}
                className={
                  p.id === current.id
                    ? 'rounded-md bg-primary px-300 py-100 text-200 text-primary-foreground'
                    : 'rounded-md border border-border px-300 py-100 text-200'
                }
              >
                {p.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="ml-auto grid size-[34px] place-items-center rounded-md border border-border"
            aria-label={isDark ? 'Helles Design' : 'Dunkles Design'}
            title={isDark ? 'Helles Design' : 'Dunkles Design'}
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1920px] flex-1 px-600 py-400">
        <DwgPage key={current.id} page={current.page} connection={current.connection} isDark={isDark} />
      </main>
      <footer className="px-600 pb-400 text-100 text-foreground/60">
        Demodaten. IBCS® ist eine eingetragene Marke des IBCS Institute.
      </footer>
    </div>
  );
}

export default App;
