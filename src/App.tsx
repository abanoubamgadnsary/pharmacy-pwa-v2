import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout }             from './components/Layout';
import { CatalogInitializer } from './components/CatalogInitializer';
import { SalesPage }          from './pages/SalesPage';
import { InventoryPage }      from './pages/InventoryPage';
import { ReportsPage }        from './pages/ReportsPage';
import { ManagementPage }     from './pages/ManagementPage';
import { DrugFormPage }       from './pages/DrugFormPage';
import { isCatalogLoaded }    from './services/catalogLoader';
import { LanguageProvider }   from './contexts/LanguageContext';

type AppState = 'checking' | 'need_catalog' | 'ready';

function App() {
  const [appState, setAppState] = useState<AppState>('checking');

  useEffect(() => {
    isCatalogLoaded().then((loaded) =>
      setAppState(loaded ? 'ready' : 'need_catalog')
    );
  }, []);

  // FIX #1 — LanguageProvider wraps ALL states, including CatalogInitializer
  return (
    <LanguageProvider>
      {appState === 'checking' && (
        <div className="min-h-screen flex items-center justify-center bg-emerald-50">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {appState === 'need_catalog' && (
        <CatalogInitializer onDone={() => setAppState('ready')} />
      )}

      {appState === 'ready' && (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index                   element={<SalesPage />}      />
              <Route path="inventory"        element={<InventoryPage />}  />
              <Route path="reports"          element={<ReportsPage />}    />
              <Route path="management"       element={<ManagementPage />} />
              <Route path="management/add"      element={<DrugFormPage />} />
              <Route path="management/edit/:id" element={<DrugFormPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      )}
    </LanguageProvider>
  );
}

export default App;
