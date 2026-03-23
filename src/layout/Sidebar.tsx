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
  }, [search]);

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
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transition-all duration-200
          ${open ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:relative lg:z-auto lg:translate-x-0
          ${collapsed ? 'lg:w-0 lg:overflow-hidden' : 'lg:w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-9 h-9 bg-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white leading-tight">Davido</div>
            <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold tracking-widest uppercase">
              Toolkit
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
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
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-200 placeholder:text-gray-400"
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
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    hasActive
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-gray-700 dark:text-gray-300'
                  } hover:bg-gray-100 dark:hover:bg-gray-800`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span> {cat.label}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="ml-2 mt-0.5 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-0.5">
                    {catTools.map((tool) => (
                      <NavLink
                        key={tool.id}
                        to={tool.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-900/40 dark:text-brand-300'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`
                        }
                      >
                        <span className="text-base">{tool.icon}</span>
                        <span className="truncate">{tool.name}</span>
                        {tool.badge && (
                          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded">
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
            <p className="text-sm text-gray-400 px-3 py-4 text-center">No tools found</p>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center justify-between">
          <span>{accessibleTools.length} tool{accessibleTools.length !== 1 ? 's' : ''} available</span>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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
