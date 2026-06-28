import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, Building2,
  Wallet, FileText, Settings, LogOut, ChevronLeft, ChevronRight, X, Menu,
  ClipboardList, PhoneCall, Banknote
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/',          label: 'Дашборд',       icon: LayoutDashboard },
  { path: '/orders',    label: 'Заявки',         icon: ClipboardList },
  { path: '/checkin',   label: 'Прозвон',        icon: PhoneCall },
  { path: '/shifts',    label: 'Смены',          icon: CalendarDays },
  { path: '/employees', label: 'Сотрудники',     icon: Users },
  { path: '/clients',   label: 'Заказчики',      icon: Building2 },
  { path: '/finance',   label: 'Финансы',        icon: Wallet },
  { path: '/payouts',   label: 'Выплаты',        icon: Banknote },
  { path: '/reports',   label: 'Аналитика',      icon: FileText },
  { path: '/settings',  label: 'Настройки',      icon: Settings },
];

/* ─── Mobile bottom tab bar (shown on sm screens) ─── */
function MobileNav() {
  const location = useLocation();
  // show only the first 5 items in the bottom bar
  const mainItems = navItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 flex md:hidden safe-area-bottom">
      {mainItems.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive ? 'text-amber-400' : 'text-zinc-500'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── Desktop sidebar ─── */
export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-screen bg-zinc-900 text-zinc-100 flex-col transition-all duration-300 z-50 border-r border-zinc-800 ${
          collapsed ? 'w-[64px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-zinc-800 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base">W</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight">Workarena</h1>
              <p className="text-xs text-zinc-500">CRM временного персонала</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-4 space-y-1 border-t border-zinc-800 pt-3">
          {!collapsed && user && (
            <div className="px-3 py-2 text-xs text-zinc-500 truncate">{user.email}</div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 shrink-0" />
            ) : (
              <ChevronLeft className="w-5 h-5 shrink-0" />
            )}
            {!collapsed && <span className="text-sm">Свернуть</span>}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-zinc-400 hover:bg-red-900/40 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm">Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <MobileNav />
    </>
  );
}
