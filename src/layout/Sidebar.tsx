import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TOOLS, CATEGORIES } from '@/config/tools';
import { useAuth } from '@/context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const [search, setSearch] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const { profile } = useAuth();

  const accessibleTools = useMemo(() => {
    if (!profile || profile.role === 'admin') return TOOLS;
    if (!profile.allowedTools) return TOOLS;
    return TOOLS.filter((t) => profile.allowedTools!.includes(t.id));
  }, [profile]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return accessibleTools;
    return accessibleTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.includes(q)),
    );
  }, [search, accessibleTools]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof TOOLS> = {};
    for (const t of filtered) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return map;
  }, [filtered]);

  const toggleCategory = (id: string) =>
    setCollapsedCats((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          bg-oat-black border-r-2 border-oat-black
          transition-all duration-200
          ${open ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:relative lg:z-auto lg:translate-x-0
          ${collapsed ? 'lg:w-0 lg:overflow-hidden' : 'lg:w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-4 border-b-2 border-white/10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-oat-yellow rounded-full border-2 border-oat-black font-anton text-oat-black uppercase text-sm tracking-wide select-none"
            style={{ transform: 'rotate(-2deg)' }}
          >
            <span className="w-5 h-5 bg-oat-black rounded-full flex items-center justify-center text-oat-yellow text-xs">D</span>
            <span>Davido Toolkit</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b-2 border-white/10">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-2.5 w-4 h-4 text-oat-white/40"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tools…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-white/10 border-none rounded outline-none focus:ring-2 focus:ring-oat-yellow text-oat-white placeholder:text-oat-white/30"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {/* Dashboard link */}
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm font-medium mb-1 transition-colors ${
                isActive
                  ? 'bg-oat-yellow text-oat-black font-semibold'
                  : 'text-oat-white/70 hover:bg-white/10 hover:text-oat-white'
              }`
            }
          >
            <span>🏠</span> Dashboard
          </NavLink>

          {/* Categories */}
          {CATEGORIES.map((cat) => {
            const catTools = grouped[cat.id];
            if (!catTools?.length) return null;
            const isOpen = !collapsedCats[cat.id];
            const hasActive = catTools.some((t) => location.pathname === t.path);

            return (
              <div key={cat.id} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors font-anton ${
                    hasActive ? 'text-oat-yellow' : 'text-oat-white/50'
                  } hover:bg-white/10 hover:text-oat-white`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span> {cat.label}
                  </span>
                  <svg
                    className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="ml-2 mt-0.5 border-l-2 border-white/10 pl-3 space-y-0.5">
                    {catTools.map((tool) => (
                      <NavLink
                        key={tool.id}
                        to={tool.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-oat-yellow text-oat-black font-semibold'
                              : 'text-oat-white/60 hover:bg-white/10 hover:text-oat-white'
                          }`
                        }
                      >
                        <span className="text-base">{tool.icon}</span>
                        <span className="truncate">{tool.name}</span>
                        {tool.badge && (
                          <span
                            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-oat-yellow text-oat-black font-sans tracking-wide uppercase"
                            style={{ transform: 'rotate(-2deg)', display: 'inline-block', border: '2px solid #0A0A0A' }}
                          >
                            {tool.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* No results */}
          {search && Object.keys(grouped).length === 0 && (
            <p className="text-sm text-oat-white/30 px-3 py-4 text-center">No tools found</p>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t-2 border-white/10 text-xs text-oat-white/30 flex items-center justify-between">
          <span>{accessibleTools.length} tool{accessibleTools.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 hover:text-oat-yellow text-oat-white/30 transition-colors"
            title="Ẩn thanh bên"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
