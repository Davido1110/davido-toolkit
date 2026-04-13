import { useRef, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { TOOLS } from '@/config/tools';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentTool = TOOLS.find((t) => t.path === location.pathname);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-oat-cream border-b-2 border-oat-black sticky top-0 z-10">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-oat-black hover:bg-oat-black/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {currentTool ? (
          <div>
            <h1 className="font-anton text-oat-black uppercase leading-tight text-lg tracking-wide">
              {currentTool.icon} {currentTool.name}
            </h1>
            <p className="text-xs text-oat-black/50 leading-tight font-sans">
              {currentTool.description}
            </p>
          </div>
        ) : (
          <div>
            <h1 className="font-anton text-oat-black uppercase leading-tight text-lg tracking-wide">
              Davido Toolkit
            </h1>
            <p className="text-xs text-oat-black/50 font-sans">
              Free, browser-only tools — no data leaves your device.
            </p>
          </div>
        )}
      </div>

      {/* Right: user menu */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 bg-oat-yellow rounded-full border-2 border-oat-black font-anton text-oat-black uppercase text-sm tracking-wide hover:bg-oat-black hover:text-oat-white transition-colors group"
            style={{ transform: 'rotate(-1deg)' }}
          >
            <div className="w-6 h-6 bg-oat-black rounded-full flex items-center justify-center text-oat-yellow text-xs font-semibold group-hover:bg-oat-yellow group-hover:text-oat-black transition-colors">
              {profile?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <span className="hidden sm:block max-w-[110px] truncate">
              {profile?.name}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 border-2 border-oat-black z-50" style={{ background: '#FAF7F2' }}>
              <div className="px-3 py-2.5 bg-oat-black">
                <p className="text-xs font-semibold text-oat-white truncate font-anton uppercase tracking-wide">{profile?.name}</p>
                <p className="text-[11px] text-oat-white/50 truncate font-sans">{profile?.email}</p>
              </div>
              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-oat-black hover:bg-oat-yellow transition-colors font-sans border-b border-oat-black/10"
                >
                  <span>🛡️</span> Admin panel
                </Link>
              )}
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-oat-red hover:bg-oat-red hover:text-oat-white transition-colors font-sans"
              >
                <span>→</span> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
