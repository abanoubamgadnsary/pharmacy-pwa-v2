import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout }             from './components/Layout';
import { AuthGate }           from './components/AuthGate';
import { CatalogInitializer } from './components/CatalogInitializer';
import { SalesPage }          from './pages/SalesPage';
import { InventoryPage }      from './pages/InventoryPage';
import { ReportsPage }        from './pages/ReportsPage';
import { ManagementPage }     from './pages/ManagementPage';
import { DrugFormPage }       from './pages/DrugFormPage';
import { RestockPage }        from './pages/RestockPage';
import { LoginPage }          from './pages/LoginPage';
import { SetupPage }          from './pages/SetupPage';
import { isCatalogLoaded }    from './services/catalogLoader';
import { LanguageProvider, useLang } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { wasDbResetThisSession } from './db';

type AppState = 'checking' | 'need_catalog' | 'ready';

function AppRoutes() {
  const { user, loading, needsSetup } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsSetup) return <SetupPage />;
  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SalesPage />} />
          <Route element={<AuthGate />}>
            <Route path="inventory"           element={<InventoryPage />}  />
            <Route path="restock"             element={<RestockPage />}    />
            <Route path="reports"            element={<ReportsPage />}    />
            <Route path="management"         element={<ManagementPage />} />
            <Route path="management/add"     element={<DrugFormPage />}   />
            <Route path="management/edit/:id" element={<DrugFormPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function DbResetNotice() {
  const { t } = useLang();
  if (!wasDbResetThisSession()) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
      {t.dbResetNotice}
    </div>
  );
}

function App() {
  const [appState, setAppState] = useState<AppState>('checking');

  useEffect(() => {
    let cancelled = false;

    isCatalogLoaded()
      .then((loaded) => {
        if (!cancelled) setAppState(loaded ? 'ready' : 'need_catalog');
      })
      .catch((err) => {
        console.error('[App] Catalog check failed:', err);
        if (!cancelled) setAppState('need_catalog');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <DbResetNotice />
          {appState === 'checking' && (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {appState === 'need_catalog' && (
            <CatalogInitializer onDone={() => setAppState('ready')} />
          )}

          {appState === 'ready' && <AppRoutes />}
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
