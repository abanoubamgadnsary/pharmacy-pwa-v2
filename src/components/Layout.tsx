import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bell, ChevronDown, Database, FileText,
  Menu, Package, Search, ShoppingCart, X,
  Languages, Download, CheckCircle, Activity,
  AlertTriangle, TrendingUp,
} from 'lucide-react';
import { db, Drug } from '../db';
import { formatEgp } from '../utils/format';
import { useLang } from '../contexts/LanguageContext';

/* ── ECG / Heartbeat SVG line ─────────────────────────────────────────── */
const EcgLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 220 28" className={className} aria-hidden="true">
    <polyline
      points="0,14 28,14 36,4 42,24 50,4 58,24 64,14 88,14 96,9 104,14 220,14"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="300" strokeDashoffset="300"
      style={{ animation: 'ecgDraw 1.8s ease forwards .4s' }}
    />
  </svg>
);

/* ── Animated Medical Cross ────────────────────────────────────────────── */
const MedCross: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="1" width="6" height="22" rx="2.5" fill="currentColor" />
    <rect x="1" y="9" width="22" height="6" rx="2.5" fill="currentColor" />
  </svg>
);

/* ── Animated Pill decoration ──────────────────────────────────────────── */
const PillDecor: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg width="24" height="10" viewBox="0 0 24 10" className={className} aria-hidden="true">
    <rect x="0" y="0" width="24" height="10" rx="5" fill="currentColor" opacity=".12" />
    <rect x="0" y="0" width="12" height="10" rx="5" fill="currentColor" opacity=".22" />
  </svg>
);

/* ── Sidebar Nav Item ──────────────────────────────────────────────────── */
interface NavItemProps {
  to: string; icon: React.ElementType; label: string;
  end?: boolean; badge?: number; onClick?: () => void;
}
const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, end, badge, onClick }) => (
  <NavLink
    to={to} end={end} onClick={onClick}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium
       transition-all duration-200 select-none overflow-hidden
       ${isActive
         ? 'text-[#c8ff5e]'
         : 'text-white/55 hover:text-white/90 hover:bg-white/7'
       }`
    }
  >
    {({ isActive }) => (
      <>
        {/* Active background glow */}
        {isActive && (
          <span
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(135deg,rgba(0,200,150,.18),rgba(200,255,94,.08))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)',
            }}
          />
        )}
        {/* Active left border */}
        {isActive && (
          <span className="absolute start-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full"
            style={{ background: 'linear-gradient(to bottom,#c8ff5e,#00c896)' }} />
        )}

        <Icon className={`relative h-4 w-4 shrink-0 transition-transform duration-200
          ${isActive ? 'text-[#c8ff5e] scale-110' : 'group-hover:scale-110'}`} />

        <span className="relative flex-1">{label}</span>

        {badge && badge > 0 && (
          <span className="relative notif-ring static h-5 min-w-5 rounded-full text-[10px] font-bold text-white
            grid place-items-center ms-auto" style={{ background: '#e53e3e', animation: 'badgePop .3s ease' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

/* ════════════════════════════════════════════════════════════════════════
   LAYOUT
════════════════════════════════════════════════════════════════════════ */
export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { t, lang, toggleLang, isRtl } = useLang();
  const drugs = useLiveQuery(() => db.drugs.toArray()) || [];

  const [searchQuery,        setSearchQuery]        = useState('');
  const [showNotifications,  setShowNotifications]  = useState(false);
  const [showAdminMenu,      setShowAdminMenu]       = useState(false);
  const [showMobileMenu,     setShowMobileMenu]      = useState(false);
  const [canInstall,         setCanInstall]          = useState(false);
  const [installPrompt,      setInstallPrompt]       = useState<Event | null>(null);
  const [installed,          setInstalled]           = useState(false);
  const [timeStr,            setTimeStr]             = useState('');

  /* PWA install prompt */
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setCanInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* Live clock */
  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
    tick(); const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [lang]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt();
    setCanInstall(false); setInstallPrompt(null);
  };

  const navItems = [
    { to: '/',           icon: ShoppingCart, label: t.sales,     end: true },
    { to: '/inventory',  icon: Package,      label: t.inventory             },
    { to: '/reports',    icon: FileText,     label: t.reports               },
    { to: '/management', icon: Database,     label: t.manage                },
  ];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return drugs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.nameAr ?? '').toLowerCase().includes(q) ||
      d.barcode.includes(searchQuery.trim()) ||
      d.activeIngredient.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [drugs, searchQuery]);

  const lowStock    = useMemo(() => drugs.filter(d => d.stock > 0 && d.stock <= 10), [drugs]);
  const outOfStock  = useMemo(() => drugs.filter(d => d.stock === 0), [drugs]);
  const expiringSoon = useMemo(() => {
    const limit = new Date(); limit.setDate(limit.getDate() + 30);
    return drugs.filter(d => { const e = new Date(d.expiryDate); return e >= new Date() && e <= limit; });
  }, [drugs]);
  const alertCount = lowStock.length + outOfStock.length + expiringSoon.length;

  const selectDrug = (drug: Drug) => {
    setSearchQuery(''); closeMenus();
    navigate(`/management/edit/${drug.id}`);
  };
  const closeMenus = () => { setShowNotifications(false); setShowAdminMenu(false); setShowMobileMenu(false); };

  /* ── Sidebar content (shared desktop/mobile) ─────────────────────────── */
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full flex-col"
      style={{ background: 'linear-gradient(175deg,#041510 0%,#072318 40%,#0a2f1e 100%)' }}>

      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-center gap-3">
          {/* Animated cross icon */}
          <div className="relative grid h-10 w-10 place-items-center rounded-2xl shrink-0"
            style={{
              background: 'linear-gradient(135deg,#0d493a,#1a6b55)',
              boxShadow: '0 4px 16px rgba(0,200,150,.35), inset 0 1px 0 rgba(255,255,255,.1)',
            }}>
            <span className="text-[#c8ff5e] anim-heartbeat">
              <MedCross size={18} />
            </span>
            {/* Glow ring */}
            <span className="absolute inset-0 rounded-2xl anim-glow-pulse"
              style={{ boxShadow: '0 0 0 3px rgba(0,200,150,.2)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold tracking-widest text-white uppercase leading-none">
              MEDISOL
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(200,255,94,.55)' }}>
              Pharmacy POS
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors rounded-lg p-1">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ECG line decoration */}
        <div className="mt-4 overflow-hidden" style={{ color: 'rgba(0,200,150,.5)' }}>
          <EcgLine />
        </div>
      </div>

      {/* Live clock + date */}
      <div className="mx-4 mb-3 rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold" style={{ color: '#00c896' }}>{timeStr}</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 anim-glow-pulse" />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,.4)' }}>
              {lang === 'ar' ? 'نشط' : 'Online'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {/* Section label */}
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,.22)' }}>
          {lang === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
        </p>

        {navItems.map((item, i) => (
          <div key={item.to} className={`anim-slide-left d-${(i + 1) * 100}`}>
            <NavItem
              to={item.to} icon={item.icon} label={item.label} end={item.end}
              badge={item.to === '/inventory' ? alertCount : 0}
              onClick={onClose}
            />
          </div>
        ))}

        {/* Alerts summary */}
        {alertCount > 0 && (
          <div className="mt-3 rounded-xl p-3 anim-fade d-400"
            style={{ background: 'rgba(229,62,62,.08)', border: '1px solid rgba(229,62,62,.2)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300 font-medium">
                {outOfStock.length > 0 && `${outOfStock.length} ${lang === 'ar' ? 'نفذ' : 'out of stock'} · `}
                {lowStock.length > 0 && `${lowStock.length} ${lang === 'ar' ? 'منخفض' : 'low'} · `}
                {expiringSoon.length > 0 && `${expiringSoon.length} ${lang === 'ar' ? 'تنتهي قريباً' : 'expiring'}`}
              </p>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 anim-fade d-500">
          <div className="rounded-xl p-2.5 text-center"
            style={{ background: 'rgba(0,200,150,.07)', border: '1px solid rgba(0,200,150,.12)' }}>
            <p className="text-sm font-bold" style={{ color: '#00c896' }}>{drugs.length}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,.35)' }}>
              {lang === 'ar' ? 'صنف' : 'Items'}
            </p>
          </div>
          <div className="rounded-xl p-2.5 text-center"
            style={{ background: 'rgba(200,255,94,.07)', border: '1px solid rgba(200,255,94,.12)' }}>
            <TrendingUp className="h-3.5 w-3.5 mx-auto mb-0.5" style={{ color: '#c8ff5e' }} />
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,.35)' }}>
              {lang === 'ar' ? 'نشط' : 'Active'}
            </p>
          </div>
        </div>

        {/* Decorative pills */}
        <div className="mt-4 flex gap-2 px-1 opacity-20">
          {[0, 1, 2].map(i => (
            <PillDecor key={i} className={`text-[#00c896] anim-float-pill d-${i * 150}`} />
          ))}
        </div>
      </nav>

      {/* Install PWA button */}
      {(canInstall || installed) && (
        <div className="px-3 pb-2">
          <button
            onClick={installed ? undefined : handleInstall}
            disabled={installed}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold
              transition-all duration-200"
            style={installed
              ? { background: 'rgba(0,200,150,.08)', color: '#00c896', border: '1px solid rgba(0,200,150,.2)' }
              : { background: 'rgba(200,255,94,.08)', color: '#c8ff5e', border: '1px solid rgba(200,255,94,.2)' }
            }
          >
            {installed
              ? <><CheckCircle className="h-3.5 w-3.5" />{lang === 'ar' ? 'تم التثبيت ✓' : 'Installed ✓'}</>
              : <><Download className="h-3.5 w-3.5 anim-float" />{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</>
            }
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="border-t px-4 py-3"
        style={{ borderColor: 'rgba(255,255,255,.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#0d493a,#1a6b55)' }}>
            <span className="text-xs font-bold text-[#c8ff5e]">
              <MedCross size={12} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/70 truncate">
              {lang === 'ar' ? 'الصيدلية' : 'Pharmacy'}
            </p>
          </div>
          {/* Lang toggle */}
          <button onClick={toggleLang}
            className="rounded-lg px-2 py-1 text-[10px] font-bold transition-colors"
            style={{ background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)' }}>
            {lang === 'ar' ? 'EN' : 'عر'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 lg:flex"
      style={{ background: 'var(--ph-bg)' }}
      dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0">
        <div className="sticky top-0 h-screen overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade"
            onClick={() => setShowMobileMenu(false)} />
          <aside className="absolute start-0 top-0 h-full w-72 anim-slide-left" style={{ zIndex: 51 }}>
            <SidebarContent onClose={() => setShowMobileMenu(false)} />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex min-h-screen flex-1 flex-col min-w-0">

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md"
          style={{
            borderBottom: '1px solid var(--ph-border)',
            boxShadow: '0 1px 0 rgba(0,0,0,.04), 0 4px 16px rgba(13,73,58,.05)',
          }}>
          {/* Top accent line */}
          <div className="h-0.5 w-full"
            style={{ background: 'linear-gradient(90deg,#0d493a,#00c896,#c8ff5e,#0d493a)' }} />

          <div className="flex h-15 items-center gap-3 px-4 lg:px-6 py-3">
            {/* Hamburger */}
            <button onClick={() => setShowMobileMenu(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border transition-colors
                hover:bg-slate-50 lg:hidden"
              style={{ borderColor: 'var(--ph-border)' }}>
              <Menu className="h-4 w-4 text-slate-500" />
            </button>

            {/* Search */}
            <div className="relative hidden w-full max-w-sm sm:block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4
                -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="field-input bg-slate-50/80 ps-9 text-sm"
                placeholder={t.searchPlaceholder}
                type="search"
              />
              {/* Search dropdown */}
              {searchQuery.trim().length >= 2 && (
                <div className="absolute start-0 end-0 top-12 z-50 anim-slide-down
                  overflow-hidden rounded-2xl border bg-white"
                  style={{ borderColor: 'var(--ph-border)', boxShadow: 'var(--shadow-lg)' }}>
                  {searchResults.length > 0 ? searchResults.map((drug, i) => (
                    <button key={drug.id} onClick={() => selectDrug(drug)}
                      className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3
                        text-start text-sm last:border-b-0 transition-colors hover:bg-emerald-50/50
                        anim-slide-up d-${i * 50}`}
                      style={{ borderColor: 'var(--ph-border)' }}>
                      <span>
                        <span className="block font-semibold" style={{ color: 'var(--ph-text)' }}>{drug.name}</span>
                        <span className="block text-xs" style={{ color: 'var(--ph-sub)' }}>
                          {drug.barcode} · {lang === 'ar' ? 'المخزون' : 'Stock'} {drug.stock}
                        </span>
                      </span>
                      <span className="text-xs font-bold" style={{ color: 'var(--ph-mint)' }}>
                        {formatEgp(drug.price)}
                      </span>
                    </button>
                  )) : (
                    <div className="px-4 py-3 text-sm" style={{ color: 'var(--ph-sub)' }}>{t.noResults}</div>
                  )}
                </div>
              )}
            </div>

            <div className="ms-auto flex items-center gap-2">

              {/* Language toggle */}
              <button onClick={toggleLang}
                className="flex items-center gap-1.5 rounded-xl border px-3 py-2
                  text-xs font-bold transition-all duration-200 hover:shadow-sm"
                style={{ borderColor: 'var(--ph-border)', color: 'var(--ph-green)' }}>
                <Languages className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'عر'}</span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(o => !o); setShowAdminMenu(false); }}
                  className="relative grid h-9 w-9 place-items-center rounded-xl border
                    transition-all hover:bg-slate-50 hover:border-emerald-300"
                  style={{ borderColor: 'var(--ph-border)' }}>
                  <Bell className={`h-4 w-4 text-slate-500 ${alertCount > 0 ? 'anim-heartbeat' : ''}`} />
                  {alertCount > 0 && (
                    <span className="notif-ring notif-pulse" style={{ position: 'absolute', top: '-4px', insetInlineEnd: '-4px' }}>
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute end-0 top-12 z-50 w-80 anim-slide-down rounded-2xl border bg-white p-3"
                    style={{ borderColor: 'var(--ph-border)', boxShadow: 'var(--shadow-lg)' }}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" style={{ color: 'var(--ph-mint)' }} />
                        <p className="text-sm font-bold">{t.alerts}</p>
                      </div>
                      <button onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {alertCount === 0 ? (
                      <div className="rounded-xl p-4 text-center text-sm"
                        style={{ background: 'var(--ph-bg)', color: 'var(--ph-sub)' }}>
                        ✓ {t.noAlerts}
                      </div>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {outOfStock.slice(0, 3).map((drug, i) => (
                          <button key={`out-${drug.id}`} onClick={() => selectDrug(drug)}
                            className={`w-full rounded-xl border p-3 text-start text-sm
                              transition-colors hover:opacity-90 anim-slide-up d-${i * 50}`}
                            style={{ borderColor: '#fed7d7', background: '#fff5f5' }}>
                            <span className="block font-semibold" style={{ color: '#742a2a' }}>
                              🚫 {lang === 'ar' ? 'نفذ:' : 'Out:'} {drug.name}
                            </span>
                          </button>
                        ))}
                        {lowStock.slice(0, 4).map((drug, i) => (
                          <button key={`low-${drug.id}`} onClick={() => selectDrug(drug)}
                            className={`w-full rounded-xl border p-3 text-start text-sm
                              transition-colors hover:opacity-90 anim-slide-up d-${i * 50}`}
                            style={{ borderColor: '#fbd38d', background: '#fffbeb' }}>
                            <span className="block font-semibold" style={{ color: '#744210' }}>
                              ⚠ {t.lowStock}: {drug.name}
                            </span>
                            <span className="text-xs" style={{ color: '#97481e' }}>
                              {drug.stock} {t.unitsRemaining}
                            </span>
                          </button>
                        ))}
                        {expiringSoon.slice(0, 3).map((drug, i) => (
                          <button key={`exp-${drug.id}`} onClick={() => selectDrug(drug)}
                            className={`w-full rounded-xl border p-3 text-start text-sm
                              transition-colors hover:opacity-90 anim-slide-up d-${i * 50}`}
                            style={{ borderColor: '#bee3f8', background: '#ebf8ff' }}>
                            <span className="block font-semibold" style={{ color: '#2a4365' }}>
                              📅 {t.expiringSoon}: {drug.name}
                            </span>
                            <span className="text-xs" style={{ color: '#2c5282' }}>
                              {t.expiry} {drug.expiryDate}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Admin menu */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => { setShowAdminMenu(o => !o); setShowNotifications(false); }}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2
                    transition-all hover:bg-slate-50"
                  style={{ borderColor: 'var(--ph-border)' }}>
                  <div className="grid h-7 w-7 place-items-center rounded-lg"
                    style={{ background: 'linear-gradient(135deg,#0d493a,#1a6b55)' }}>
                    <MedCross size={10} />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold" style={{ color: 'var(--ph-text)' }}>{t.storeAdmin}</p>
                    <p className="text-[10px]" style={{ color: 'var(--ph-mint)' }}>{t.online}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {showAdminMenu && (
                  <div className="absolute end-0 top-12 z-50 w-52 anim-slide-down rounded-2xl border bg-white p-2"
                    style={{ borderColor: 'var(--ph-border)', boxShadow: 'var(--shadow-lg)' }}>
                    {[
                      { label: t.manageInventory, to: '/management' },
                      { label: t.viewReports, to: '/reports' },
                    ].map(item => (
                      <button key={item.to}
                        onClick={() => { closeMenus(); navigate(item.to); }}
                        className="w-full rounded-xl px-3 py-2.5 text-start text-sm font-medium
                          transition-colors hover:bg-emerald-50"
                        style={{ color: 'var(--ph-text)' }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="sticky bottom-0 z-30 border-t bg-white/95 backdrop-blur-md lg:hidden"
          style={{ borderColor: 'var(--ph-border)', boxShadow: '0 -4px 20px rgba(13,73,58,.08)' }}>
          <div className="grid grid-cols-4">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `relative flex flex-col items-center py-3 text-xs font-medium transition-colors
                  ${isActive ? 'text-[#0d493a]' : 'text-slate-400 hover:text-[#0d493a]'}`
                }>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                        style={{ background: 'linear-gradient(90deg,#0d493a,#00c896)' }} />
                    )}
                    <item.icon className={`mb-1 h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    <span className="text-[10px]">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};
