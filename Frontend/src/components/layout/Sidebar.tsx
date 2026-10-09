import { NavLink } from 'react-router-dom';
import { X, Building2, LogOut } from 'lucide-react';
import Logo from '../shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { navFor, ROLE_LABELS } from '../../lib/navigation';
import { Avatar } from '../ui';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Sidebar = ({ open, onClose, onLogout }: SidebarProps) => {
  const { user, roles } = useAuth();
  // Derived directly from the user's roles - no memo needed, and the previous
  // `useMemo([hasRole])` never recomputed because the function identity changed
  // on every render anyway.
  const items = navFor(roles);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 p-3 transition-transform duration-300 lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="glass flex h-full flex-col overflow-hidden rounded-3xl">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-10 w-10" />
            <div>
              <p className="text-base font-bold leading-tight tracking-tight text-slate-900">CareEase</p>
              <p className="text-[11px] leading-tight text-slate-400">Hospital management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-900/5 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-3 py-3 shadow-[inset_0_1px_0_white] ring-1 ring-slate-900/5">
            <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {ROLE_LABELS[roles[0]] || roles[0]}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150
                   ${isActive
                     ? 'liquid'
                     : 'text-slate-600 hover:translate-x-0.5 hover:bg-white/70 hover:text-slate-900'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-500'
                      }`}
                      style={{ width: 18, height: 18 }}
                      aria-hidden="true"
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/50 px-3 py-2.5 ring-1 ring-slate-900/5">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-700">
                {user?.hospitalName || 'CareEase Hospital'}
              </p>
              <p className="truncate font-mono text-[11px] text-slate-400">{user?.tenantId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50/80 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
