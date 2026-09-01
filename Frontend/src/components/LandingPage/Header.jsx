import { useState, useEffect } from 'react';
import { Menu, X, HeartPulse, LayoutDashboard, LogIn, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' }
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'bg-white/95 shadow-sm backdrop-blur-lg' : 'bg-white/60 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <button
            type="button"
            onClick={() => go('/')}
            className="flex items-center gap-2.5"
            aria-label="CareEase home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-xl font-semibold text-slate-900">CareEase</span>
          </button>

          <div className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group relative text-sm text-slate-600 transition-colors hover:text-cyan-700"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-cyan-600 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {/* A signed-in visitor landing here is offered their dashboard rather
                than a sign-in link that would just bounce them onward. */}
            {user ? (
              <button
                type="button"
                onClick={() => go('/app/dashboard')}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => go('/login')}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-slate-700 transition-colors hover:text-cyan-700"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => go('/hospital-register')}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
                >
                  Register hospital
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white shadow-lg md:hidden">
          <div className="space-y-1 px-4 py-3">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
              >
                {link.label}
              </a>
            ))}

            <div className="space-y-2 border-t border-slate-100 pt-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => go('/app/dashboard')}
                  className="w-full rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white"
                >
                  Go to dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => go('/login')}
                    className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm text-slate-700"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => go('/hospital-register')}
                    className="w-full rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white"
                  >
                    Register hospital
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
