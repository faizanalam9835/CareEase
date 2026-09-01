import { NavLink } from 'react-router-dom';
import { X, HeartPulse, Building2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navFor, ROLE_LABELS } from '../../lib/navigation';
import { Avatar } from '../ui';

const Sidebar = ({ open, onClose, onLogout }) => {
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
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white
          transition-transform duration-200 lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-cyan-600 p-1.5 text-white">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-900">CareEase</p>
              <p className="text-[11px] leading-tight text-slate-400">Hospital management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
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

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                   ${isActive
                     ? 'bg-cyan-50 text-cyan-700'
                     : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 ${
                        isActive ? 'text-cyan-600' : 'text-slate-400 group-hover:text-slate-500'
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

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
