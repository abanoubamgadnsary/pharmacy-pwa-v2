import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bell,
  ChevronDown,
  Database,
  FileText,

  Menu,
  Package,
  Search,
  ShoppingCart,
  X,
  Languages,
} from "lucide-react";
import { db, Drug } from '../db';
import { formatEgp } from '../utils/format';
import { useLang } from '../contexts/LanguageContext';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { t, lang, toggleLang, isRtl } = useLang();
  const drugs = useLiveQuery(() => db.drugs.toArray()) || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = [
    { to: '/', icon: ShoppingCart, label: t.sales },
    { to: '/inventory', icon: Package, label: t.inventory },
    { to: '/reports', icon: FileText, label: t.reports },
    { to: '/management', icon: Database, label: t.manage },
  ];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return drugs
      .filter(
        (drug) =>
          drug.name.toLowerCase().includes(q) ||
          (drug.nameAr ?? '').toLowerCase().includes(q) ||
          drug.barcode.includes(searchQuery.trim()) ||
          drug.activeIngredient.toLowerCase().includes(q) ||
          drug.company.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [drugs, searchQuery]);

  const lowStock = useMemo(() => drugs.filter((drug) => drug.stock <= 10), [drugs]);
  const expiringSoon = useMemo(() => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 30);
    return drugs.filter((drug) => {
      const expiry = new Date(drug.expiryDate);
      return expiry >= now && expiry <= future;
    });
  }, [drugs]);

  const alertCount = lowStock.length + expiringSoon.length;

  const selectDrug = (drug: Drug) => {
    setSearchQuery('');
    navigate(`/management/edit/${drug.id}`);
  };

  const closeMenus = () => {
    setShowNotifications(false);
    setShowAdminMenu(false);
    setShowMobileMenu(false);
  };

  const SidebarNav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={mobile ? 'space-y-1 px-4 py-4' : 'flex-1 space-y-1 px-4'}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={closeMenus}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#d8ff64] text-[#0d493a]'
                : 'text-white/72 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900 lg:flex" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col bg-[#0d493a] text-white">
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-white/10">
              <Package className="h-5 w-5 text-[#d8ff64]" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide">MEDISOL</p>
              <p className="text-[11px] text-white/55">Pharmacy POS</p>
            </div>
          </div>
        </div>

        <SidebarNav />


      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="relative hidden w-full max-w-md sm:block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="field-input bg-slate-50 ps-9"
                placeholder={t.searchPlaceholder}
                type="search"
              />
              {searchQuery.trim().length >= 2 && (
                <div className="absolute start-0 end-0 top-12 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  {searchResults.length > 0 ? (
                    searchResults.map((drug) => (
                      <button
                        key={drug.id}
                        onClick={() => selectDrug(drug)}
                        className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-start text-sm last:border-b-0 hover:bg-slate-50"
                      >
                        <span>
                          <span className="block font-semibold text-slate-900">{drug.name}</span>
                          <span className="block text-xs text-slate-400">{drug.barcode} · Stock {drug.stock}</span>
                        </span>
                        <span className="text-xs font-semibold text-[#0d493a]">{formatEgp(drug.price)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">{t.noResults}</div>
                  )}
                </div>
              )}
            </div>

            {/* Right-side controls */}
            <div className="ms-auto flex items-center gap-3">

              {/* ── Language Toggle Button ── */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                aria-label="Toggle language"
                title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              >
                <Languages className="h-4 w-4 text-[#0d493a]" />
                <span className="hidden sm:inline">{lang === 'en' ? 'عربي' : 'EN'}</span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications((open) => !open);
                    setShowAdminMenu(false);
                  }}
                  className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  {alertCount > 0 && (
                    <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {alertCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute end-0 top-12 z-50 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900">{t.alerts}</p>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close alerts">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {alertCount === 0 ? (
                      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{t.noAlerts}</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {lowStock.map((drug) => (
                          <button
                            key={`low-${drug.id}`}
                            onClick={() => selectDrug(drug)}
                            className="w-full rounded-lg border border-rose-100 bg-rose-50 p-3 text-start text-sm hover:bg-rose-100"
                          >
                            <span className="block font-semibold text-rose-800">{t.lowStock}: {drug.name}</span>
                            <span className="text-xs text-rose-600">{drug.stock} {t.unitsRemaining}</span>
                          </button>
                        ))}
                        {expiringSoon.map((drug) => (
                          <button
                            key={`exp-${drug.id}`}
                            onClick={() => selectDrug(drug)}
                            className="w-full rounded-lg border border-amber-100 bg-amber-50 p-3 text-start text-sm hover:bg-amber-100"
                          >
                            <span className="block font-semibold text-amber-800">{t.expiringSoon}: {drug.name}</span>
                            <span className="text-xs text-amber-600">{t.expiry} {drug.expiryDate}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Admin menu */}
              <button
                onClick={() => {
                  setShowAdminMenu((open) => !open);
                  setShowNotifications(false);
                }}
                className="relative hidden items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 sm:flex"
                aria-label="Open admin menu"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0d493a] text-xs font-bold text-white">
                  RX
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-900">{t.storeAdmin}</p>
                  <p className="text-[11px] text-slate-400">{t.online}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showAdminMenu && (
                <div className="absolute end-4 top-16 z-50 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl lg:end-8">
                  <button onClick={() => { closeMenus(); navigate('/management'); }} className="w-full rounded-lg px-3 py-2 text-start text-sm text-slate-700 hover:bg-slate-50">
                    {t.manageInventory}
                  </button>
                  <button onClick={() => { closeMenus(); navigate('/reports'); }} className="w-full rounded-lg px-3 py-2 text-start text-sm text-slate-700 hover:bg-slate-50">
                    {t.viewReports}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
            <aside className="flex h-full w-72 flex-col bg-[#0d493a] text-white">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-white/10">
                    <Package className="h-5 w-5 text-[#d8ff64]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-wide">MEDISOL</p>
                    <p className="text-[11px] text-white/55">Pharmacy POS</p>
                  </div>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarNav mobile />
            </aside>
          </div>
        )}

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
          <div className="grid grid-cols-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-[#0d493a]'
                      : 'text-slate-500 hover:text-[#0d493a]'
                  }`
                }
              >
                <item.icon className="mb-1 h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};
