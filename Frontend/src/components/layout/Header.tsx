import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  UserCog,
  LogOut,
  Stethoscope,
  Users,
  Receipt,
  AlertTriangle,
  Info,
  CircleAlert
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { metaService, dashboardService } from '../../services';
import { Avatar, Badge, Spinner } from '../ui';
import { ROLE_LABELS } from '../../lib/navigation';
import type { Tone } from '../ui';
import type { AlertSeverity, DashboardAlert, SearchResult, SearchResultType } from '../../types';

const RESULT_ICONS: Record<SearchResultType, LucideIcon> = {
  patient: Stethoscope,
  staff: Users,
  invoice: Receipt
};
const ALERT_ICONS: Record<AlertSeverity, LucideIcon> = {
  critical: CircleAlert,
  warning: AlertTriangle,
  info: Info
};
const ALERT_TONES: Record<AlertSeverity, Tone> = { critical: 'red', warning: 'amber', info: 'blue' };

/** Closes a popover when the user clicks anywhere outside it. */
const useOutsideClick = (onOutside: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
};

interface HeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
}

const Header = ({ onToggleSidebar, onLogout }: HeaderProps) => {
  const { user, roles } = useAuth();
  const isPlatform = roles.includes('SUPER_ADMIN');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const searchRef = useOutsideClick(() => setSearchOpen(false));
  const alertsRef = useOutsideClick(() => setAlertsOpen(false));
  const menuRef = useOutsideClick(() => setMenuOpen(false));

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return undefined;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await metaService.search(term);
        setResults(data.results || []);
        setSearchOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isPlatform) return;
    dashboardService
      .alerts()
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => setAlerts([]));
  }, [isPlatform]);

  const openResult = (result: SearchResult) => {
    setSearchOpen(false);
    setQuery('');
    navigate(result.link);
  };

  return (
    <header className="relative z-20 px-3 pt-3 sm:px-4 lg:pl-0 lg:pr-6">
      <div className="glass flex h-16 items-center gap-3 rounded-2xl px-3 sm:px-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
          className="rounded-xl p-2 text-slate-500 hover:bg-white/70 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Search */}
        <div ref={searchRef} className={`relative max-w-md flex-1 ${isPlatform ? 'invisible' : ''}`}>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => results.length && setSearchOpen(true)}
            placeholder="Search patients, staff, invoices"
            aria-label="Search"
            className="w-full rounded-xl border border-white/80 bg-white/60 py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)] transition-all focus:border-cyan-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-100"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4" />
            </span>
          )}

          {searchOpen && query.trim().length >= 2 && (
            <div className="glass-strong absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  {searching ? 'Searching…' : `Nothing found for "${query}"`}
                </p>
              ) : (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {results.map((result) => {
                    const Icon = RESULT_ICONS[result.type] || Search;
                    return (
                      <li key={`${result.type}-${result.id}`}>
                        <button
                          type="button"
                          onClick={() => openResult(result)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="rounded-lg bg-slate-100 p-1.5 text-slate-500">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {result.title}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {result.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Alerts */}
          <div ref={alertsRef} className={`relative ${isPlatform ? 'hidden' : ''}`}>
            <button
              type="button"
              onClick={() => setAlertsOpen((open) => !open)}
              aria-label={`Alerts${alerts.length ? ` (${alerts.length})` : ''}`}
              className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/70"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {alerts.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>

            {alertsOpen && (
              <div className="glass-strong absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Needs attention</p>
                </div>
                {alerts.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    Nothing needs your attention right now.
                  </p>
                ) : (
                  <ul className="max-h-96 divide-y divide-slate-50 overflow-y-auto">
                    {alerts.map((alert, index) => {
                      const Icon = ALERT_ICONS[alert.severity] || Info;
                      return (
                        <li key={`${alert.title}-${index}`}>
                          <Link
                            to={alert.link || '/app/dashboard'}
                            onClick={() => setAlertsOpen(false)}
                            className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                          >
                            <Icon
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                alert.severity === 'critical'
                                  ? 'text-red-500'
                                  : alert.severity === 'warning'
                                    ? 'text-amber-500'
                                    : 'text-blue-500'
                              }`}
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {alert.title}
                                </span>
                                <Badge tone={ALERT_TONES[alert.severity]}>{alert.category}</Badge>
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                                {alert.message}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Account */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-white/70"
            >
              <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} size="sm" />
              <span className="hidden text-left md:block">
                <span className="block text-sm font-medium leading-tight text-slate-900">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-xs leading-tight text-slate-500">
                  {ROLE_LABELS[roles[0]] || roles[0]}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className="glass-strong absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl py-1">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="cyan">{user?.department}</Badge>
                    <Badge tone="slate">{user?.tenantId}</Badge>
                  </p>
                </div>
                <Link
                  to="/app/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <UserCog className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  My account
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
